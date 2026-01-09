// src/components/PriceChart.tsx
import React, { useEffect, useMemo, useState } from "react";
import { apiService } from "../services/api";

type HistoryPoint = {
  date: string; // "YYYY-MM-DD"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type HistoryResponse = {
  ticker: string;
  prices: HistoryPoint[];
};

type Props = {
  symbol: string;
  period?: string;
};

type ChartType = "candles" | "line";
type PredictionValue = -1 | 0 | 1 | null;

const TIMEFRAMES = [
  // { key: "1D", period: "1d" },
  // { key: "5D", period: "5d" },
  { key: "1M", period: "1mo" },
  { key: "3M", period: "3mo" },
  { key: "6M", period: "6mo" },
  { key: "1Y", period: "1y" },
  { key: "5Y", period: "5y" },
  { key: "MAX", period: "max" },
];

// ---------- indicator calculations ----------

function computeSMA(values: number[], length: number): (number | null)[] {
  const out: (number | null)[] = Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= length) sum -= values[i - length];
    if (i >= length - 1) out[i] = sum / length;
  }
  return out;
}

function computeEMA(values: number[], length: number): (number | null)[] {
  const out: (number | null)[] = Array(values.length).fill(null);
  if (!values.length) return out;
  const k = 2 / (length + 1);
  let ema = values[0];
  out[0] = ema;
  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    out[i] = ema;
  }
  return out;
}

type MACDResult = {
  macd: (number | null)[];
  signal: (number | null)[];
  hist: (number | null)[];
};

function computeMACD(values: number[]): MACDResult {
  const fast = computeEMA(values, 12);
  const slow = computeEMA(values, 26);
  const macd: (number | null)[] = Array(values.length).fill(null);

  for (let i = 0; i < values.length; i++) {
    if (fast[i] != null && slow[i] != null) {
      macd[i] = (fast[i] as number) - (slow[i] as number);
    }
  }

  const macdNums = macd.map((v) => (v == null ? 0 : v));
  const signal = computeEMA(macdNums, 9);
  const hist: (number | null)[] = Array(values.length).fill(null);
  for (let i = 0; i < values.length; i++) {
    if (macd[i] != null && signal[i] != null) {
      hist[i] = (macd[i] as number) - (signal[i] as number);
    }
  }

  return { macd, signal, hist };
}

// VWAP over full series
function computeVWAP(points: HistoryPoint[]): (number | null)[] {
  const out: (number | null)[] = Array(points.length).fill(null);
  let cumPV = 0;
  let cumVol = 0;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const typical = (p.high + p.low + p.close) / 3;
    cumPV += typical * p.volume;
    cumVol += p.volume;
    if (cumVol === 0) {
      out[i] = null;
    } else {
      out[i] = cumPV / cumVol;
    }
  }

  return out;
}

// RSI (Wilder) length N
function computeRSI(values: number[], length: number): (number | null)[] {
  const out: (number | null)[] = Array(values.length).fill(null);
  if (values.length < length + 1) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }

  let avgGain = gain / length;
  let avgLoss = loss / length;

  if (avgLoss === 0) {
    out[length] = 100;
  } else {
    const rs = avgGain / avgLoss;
    out[length] = 100 - 100 / (1 + rs);
  }

  for (let i = length + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (length - 1) + g) / length;
    avgLoss = (avgLoss * (length - 1) + l) / length;

    if (avgLoss === 0) {
      out[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      out[i] = 100 - 100 / (1 + rs);
    }
  }

  return out;
}

// ---------- polyline helper ----------

function buildPolylinePoints(
  values: (number | null)[],
  width: number,
  height: number,
  padding: number,
  minVal: number,
  maxVal: number
): string {
  const n = values.length;
  if (n === 0 || minVal === maxVal) return "";

  const span = maxVal - minVal;
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;

  const pts: string[] = [];

  values.forEach((v, i) => {
    if (v == null) return;
    const x =
      padding + (n === 1 ? usableW / 2 : (i / (n - 1)) * usableW);
    const y =
      padding + ((maxVal - v) / span) * usableH; // higher value => higher on screen
    pts.push(`${x},${y}`);
  });

  return pts.join(" ");
}

const PriceChart: React.FC<Props> = ({ symbol, period }) => {
  const [prices, setPrices] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chartType, setChartType] = useState<ChartType>("candles");
  const [timeframeKey, setTimeframeKey] = useState<string>(
    period ? TIMEFRAMES.find((t) => t.period === period)?.key ?? "6M" : "6M"
  );

  const [sma20On, setSma20On] = useState(true);
  const [sma50On, setSma50On] = useState(false);
  const [ema20On, setEma20On] = useState(false);
  const [vwapOn, setVwapOn] = useState(false);
  const [macdOn, setMacdOn] = useState(true);
  const [rsiOn, setRsiOn] = useState(false);

  // zoom window (index-based)
  const [viewStart, setViewStart] = useState(0);
  const [viewEnd, setViewEnd] = useState<number | null>(null);

  // model prediction overlay
  const [prediction, setPrediction] = useState<PredictionValue>(null);

  // hover / crosshair (shared between all panels)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // indicator help text
  const [indicatorHelp, setIndicatorHelp] = useState<
    "SMA20" | "SMA50" | "EMA20" | "VWAP" | "MACD" | "RSI" | null
  >(null);

  // ---------- fetch history ----------
  useEffect(() => {
    const tf = TIMEFRAMES.find((t) => t.key === timeframeKey) ?? TIMEFRAMES[3];
    const backendPeriod = tf.period;

    let cancelled = false;

    async function load() {
      if (!symbol) return;
      try {
        setLoading(true);
        setError(null);

        const data: HistoryResponse = await apiService.getStockHistory(
          symbol,
          backendPeriod
        );

        if (cancelled) return;

        const series = data.prices || [];
        setPrices(series);
        setViewStart(0);
        setViewEnd(series.length ? series.length - 1 : null);
        setHoverIndex(null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load chart data"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [symbol, timeframeKey]);

  // ---------- fetch prediction ----------
  useEffect(() => {
    let cancelled = false;
    async function loadPred() {
      try {
        const data = await apiService.getStockData(symbol);
        const val = (data as any).prediction as number;
        if (!cancelled) {
          if (val === 1 || val === 0 || val === -1) setPrediction(val);
          else setPrediction(null);
        }
      } catch {
        if (!cancelled) setPrediction(null);
      }
    }
    loadPred();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  // ---------- derived data ----------
  const closes = useMemo(() => prices.map((p) => p.close), [prices]);
  const sma20 = useMemo(() => computeSMA(closes, 20), [closes]);
  const sma50 = useMemo(() => computeSMA(closes, 50), [closes]);
  const ema20 = useMemo(() => computeEMA(closes, 20), [closes]);
  const macdAll = useMemo(() => computeMACD(closes), [closes]);
  const vwapAll = useMemo(() => computeVWAP(prices), [prices]);
  const rsi14All = useMemo(() => computeRSI(closes, 14), [closes]);

  const width = 800;
  const height = 280;
  const macdHeight = 150;
  const rsiHeight = 140;
  const pad = 32;

  const total = prices.length;
  const safeStart = total ? Math.max(0, Math.min(viewStart, total - 1)) : 0;
  const safeEnd =
    total && viewEnd != null
      ? Math.max(safeStart, Math.min(viewEnd, total - 1))
      : total
      ? total - 1
      : 0;

  const visible = prices.slice(safeStart, safeEnd + 1);
  const visClose = closes.slice(safeStart, safeEnd + 1);
  const visSma20 = sma20.slice(safeStart, safeEnd + 1);
  const visSma50 = sma50.slice(safeStart, safeEnd + 1);
  const visEma20 = ema20.slice(safeStart, safeEnd + 1);
  const visMacd = macdAll.macd.slice(safeStart, safeEnd + 1);
  const visSignal = macdAll.signal.slice(safeStart, safeEnd + 1);
  const visHist = macdAll.hist.slice(safeStart, safeEnd + 1);
  const visVwap = vwapAll.slice(safeStart, safeEnd + 1);
  const visRsi14 = rsi14All.slice(safeStart, safeEnd + 1);

  const hasData = visible.length > 0;

  // safe price range
  let yMin = 0;
  let yMax = 1;
  if (hasData) {
    const numeric = visClose.filter(
      (v) => typeof v === "number" && Number.isFinite(v)
    ) as number[];
    if (numeric.length) {
      let min = Math.min(...numeric);
      let max = Math.max(...numeric);
      if (min === max) {
        min -= 1;
        max += 1;
      }
      yMin = min;
      yMax = max;
    }
  }

  const span = yMax - yMin || 1;
  const toY = (v: number) =>
    pad + ((yMax - v) / span) * (height - pad * 2);

  // Y ticks for price
  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount }, (_, i) => {
    const t = i / (yTickCount - 1);
    const value = yMin + (yMax - yMin) * t;
    return { value, y: toY(value) };
  });

  // price polylines
  const linePoints = useMemo(
    () => buildPolylinePoints(visClose, width, height, pad, yMin, yMax),
    [visClose, width, height, pad, yMin, yMax]
  );
  const sma20Points = useMemo(
    () => buildPolylinePoints(visSma20, width, height, pad, yMin, yMax),
    [visSma20, width, height, pad, yMin, yMax]
  );
  const sma50Points = useMemo(
    () => buildPolylinePoints(visSma50, width, height, pad, yMin, yMax),
    [visSma50, width, height, pad, yMin, yMax]
  );
  const ema20Points = useMemo(
    () => buildPolylinePoints(visEma20, width, height, pad, yMin, yMax),
    [visEma20, width, height, pad, yMin, yMax]
  );
  const vwapPoints = useMemo(
    () => buildPolylinePoints(visVwap, width, height, pad, yMin, yMax),
    [visVwap, width, height, pad, yMin, yMax]
  );

  // candlesticks
  const candles = useMemo(() => {
    const n = visible.length;
    if (!n || yMin === yMax) return [];
    const usableW = width - pad * 2;
    const usableH = height - pad * 2;
    const candleW = Math.min(usableW / Math.max(n, 50), 12);

    return visible.map((p, i) => {
      const centerX =
        pad + (n === 1 ? usableW / 2 : (i / (n - 1)) * usableW);

      const valueToY = (v: number) =>
        pad + ((yMax - v) / span) * usableH;

      const openY = valueToY(p.open);
      const closeY = valueToY(p.close);
      const highY = valueToY(p.high);
      const lowY = valueToY(p.low);

      const topY = Math.min(openY, closeY);
      const bottomY = Math.max(openY, closeY);
      const bodyHeight = Math.max(bottomY - topY, 1);

      return {
        x: centerX,
        wickTop: highY,
        wickBottom: lowY,
        bodyX: centerX - candleW / 2,
        bodyY: topY,
        bodyWidth: candleW,
        bodyHeight,
        bullish: p.close >= p.open,
      };
    });
  }, [visible, width, height, pad, yMin, yMax, span]);

  // X ticks
  const xTicks = useMemo(() => {
    const n = visible.length;
    if (!n) return [];
    const usableW = width - pad * 2;
    const count = Math.min(6, n);
    const ticks: { x: number; label: string }[] = [];

    for (let i = 0; i < count; i++) {
      const idx =
        count === 1 ? 0 : Math.round(((n - 1) * i) / (count - 1));
      const p = visible[idx];
      const x =
        pad + (n === 1 ? usableW / 2 : (idx / (n - 1)) * usableW);
      ticks.push({ x, label: p.date });
    }
    return ticks;
  }, [visible, width, pad]);

  // ---------- MACD ranges ----------
  let macdMin = 0;
  let macdMax = 1;
  if (hasData) {
    const allVals = [...visMacd, ...visSignal].filter(
      (v) => v != null && Number.isFinite(v as number)
    ) as number[];
    if (allVals.length) {
      let min = Math.min(...allVals);
      let max = Math.max(...allVals);
      if (min === max) {
        min -= 1;
        max += 1;
      }
      macdMin = min;
      macdMax = max;
    }
  }
  const macdSpan = macdMax - macdMin || 1;
  const macdToY = (v: number) =>
    pad + ((macdMax - v) / macdSpan) * (macdHeight - pad * 2);

  const macdPoints = useMemo(
    () => buildPolylinePoints(visMacd, width, macdHeight, pad, macdMin, macdMax),
    [visMacd, width, macdHeight, pad, macdMin, macdMax]
  );
  const signalPoints = useMemo(
    () =>
      buildPolylinePoints(
        visSignal,
        width,
        macdHeight,
        pad,
        macdMin,
        macdMax
      ),
    [visSignal, width, macdHeight, pad, macdMin, macdMax]
  );

  const macdBars = useMemo(() => {
    const n = visHist.length;
    if (!n) return [];
    const usableW = width - pad * 2;
    const barW = Math.min(usableW / Math.max(n, 80), 6);

    return visHist
      .map((v, i) => {
        if (v == null) return null;
        const x =
          pad + (n === 1 ? usableW / 2 : (i / (n - 1)) * usableW);
        const y0 = macdToY(0);
        const y1 = macdToY(v);
        const topY = Math.min(y0, y1);
        const height = Math.max(Math.abs(y1 - y0), 1);
        const bullish = v >= 0;
        return {
          x: x - barW / 2,
          y: topY,
          width: barW,
          height,
          bullish,
        };
      })
      .filter(Boolean) as {
      x: number;
      y: number;
      width: number;
      height: number;
      bullish: boolean;
    }[];
  }, [visHist, width, pad, macdHeight, macdMin, macdMax, macdSpan]);

  // ---------- RSI ranges ----------
  const rsiMin = 0;
  const rsiMax = 100;
  const rsiToY = (v: number) =>
    pad + ((rsiMax - v) / (rsiMax - rsiMin || 1)) * (rsiHeight - pad * 2);

  const rsiPoints = useMemo(
    () =>
      buildPolylinePoints(
        visRsi14,
        width,
        rsiHeight,
        pad,
        rsiMin,
        rsiMax
      ),
    [visRsi14, width, rsiHeight, pad]
  );

  // zoom helpers
  const zoomByFactor = (factor: number) => {
    if (total <= 1) return;
    const current = safeEnd - safeStart + 1;
    const newLen = Math.max(10, Math.min(total, Math.round(current * factor)));
    const center = safeStart + current / 2;

    let newStart = Math.round(center - newLen / 2);
    let newEnd = newStart + newLen - 1;

    if (newStart < 0) {
      newStart = 0;
      newEnd = newLen - 1;
    }
    if (newEnd > total - 1) {
      newEnd = total - 1;
      newStart = total - newLen;
      if (newStart < 0) newStart = 0;
    }

    setViewStart(newStart);
    setViewEnd(newEnd);
  };

  const resetZoom = () => {
    if (!total) return;
    setViewStart(0);
    setViewEnd(total - 1);
    setHoverIndex(null);
  };

  const activeTimeframe = timeframeKey;

  // prediction styling
    // prediction styling
  // Backend contract: 1 = UP, 0 = DOWN, -1 = no signal
  let predLabel = "Model: Neutral";
  let predClass =
    "px-2 py-1 text-[11px] rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300";
  let predBannerFill: string | null = null;
  let arrowColor = "#6b7280";
  let arrowDirection: "up" | "down" | "flat" = "flat";

  if (prediction === 1) {
    // UP
    predLabel = "Model: UP";
    predClass =
      "px-2 py-1 text-[11px] rounded-full border border-emerald-500/70 bg-emerald-500/10 text-emerald-300";
    predBannerFill = "#22c55e18";
    arrowColor = "#22c55e";
    arrowDirection = "up";
  } else if (prediction === 0) {
    // DOWN
    predLabel = "Model: DOWN";
    predClass =
      "px-2 py-1 text-[11px] rounded-full border border-rose-500/70 bg-rose-500/10 text-rose-300";
    predBannerFill = "#ef444418";
    arrowColor = "#ef4444";
    arrowDirection = "down";
  } else {
    // -1 or null → no signal
    predLabel = "Model: Neutral";
    predClass =
      "px-2 py-1 text-[11px] rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300";
    predBannerFill = null;
    arrowColor = "#7dd3fc";
    arrowDirection = "flat";
  }


  // crosshair / hover info
  const nVis = visible.length;
  let hoverX: number | null = null;
  let hoverCloseY: number | null = null;
  let hoverPoint: HistoryPoint | null = null;
  let hoverSma20: number | null = null;
  let hoverSma50: number | null = null;
  let hoverEma20: number | null = null;
  let hoverVwap: number | null = null;
  let hoverMacd: number | null = null;
  let hoverSignal: number | null = null;
  let hoverHist: number | null = null;
  let hoverRsi: number | null = null;

  if (hasData && hoverIndex != null && hoverIndex >= 0 && hoverIndex < nVis) {
    const usableW = width - pad * 2;
    hoverX =
      pad +
      (nVis === 1 ? usableW / 2 : (hoverIndex / (nVis - 1)) * usableW);

    hoverPoint = visible[hoverIndex];
    const closeVal = visible[hoverIndex].close;
    hoverCloseY = toY(closeVal);

    hoverSma20 = visSma20[hoverIndex] ?? null;
    hoverSma50 = visSma50[hoverIndex] ?? null;
    hoverEma20 = visEma20[hoverIndex] ?? null;
    hoverVwap = visVwap[hoverIndex] ?? null;

    hoverMacd = visMacd[hoverIndex] ?? null;
    hoverSignal = visSignal[hoverIndex] ?? null;
    hoverHist = visHist[hoverIndex] ?? null;

    hoverRsi = visRsi14[hoverIndex] ?? null;
  }

  // indicator help text
  let indicatorHelpText = "";
  if (indicatorHelp === "SMA20") {
    indicatorHelpText =
      "SMA 20: Simple Moving Average of the last 20 closing prices. Smooths short-term noise.";
  } else if (indicatorHelp === "SMA50") {
    indicatorHelpText =
      "SMA 50: Medium-term trend. Price above SMA 50 often signals an uptrend; below may signal a downtrend.";
  } else if (indicatorHelp === "EMA20") {
    indicatorHelpText =
      "EMA 20: Exponential Moving Average with more weight on recent candles. Reacts faster than SMA.";
  } else if (indicatorHelp === "VWAP") {
    indicatorHelpText =
      "VWAP: Volume-Weighted Average Price. Tracks the average price traders actually paid, weighted by volume.";
  } else if (indicatorHelp === "MACD") {
    indicatorHelpText =
      "MACD: 12/26 EMA crossover with a 9-period signal line. Histogram shows momentum (distance between MACD and signal).";
  } else if (indicatorHelp === "RSI") {
    indicatorHelpText =
      "RSI 14: Relative Strength Index (0–100). Above 70 is often overbought; below 30 is often oversold.";
  }

  // mouse move helpers
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!hasData) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const usableW = width - pad * 2;
    if (x < pad || x > width - pad) {
      setHoverIndex(null);
      return;
    }
    const n = visible.length;
    if (!n) return;
    const t = Math.min(1, Math.max(0, (x - pad) / usableW));
    const idx = Math.round(t * (n - 1));
    setHoverIndex(idx);
  };

  const handleSharedMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    // used by MACD and RSI panels
    if (!hasData) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const usableW = width - pad * 2;
    if (x < pad || x > width - pad) {
      setHoverIndex(null);
      return;
    }
    const n = visible.length;
    if (!n) return;
    const t = Math.min(1, Math.max(0, (x - pad) / usableW));
    const idx = Math.round(t * (n - 1));
    setHoverIndex(idx);
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
      {/* header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-semibold text-zinc-100">
            {symbol.toUpperCase()} Price &amp; Volume
          </div>
          <div className="flex items-center gap-2">
            <div className="text-[11px] text-zinc-500">
              Real market data via Yahoo Finance • educational use only
            </div>
            <span className={predClass}>{predLabel}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {/* timeframes */}
          <div className="inline-flex rounded-lg border border-zinc-700 overflow-hidden">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.key}
                type="button"
                onClick={() => setTimeframeKey(tf.key)}
                className={`px-2.5 py-1 border-l border-zinc-700 first:border-l-0 ${
                  activeTimeframe === tf.key
                    ? "bg-zinc-800 text-zinc-100"
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800/80"
                }`}
              >
                {tf.key}
              </button>
            ))}
          </div>

          {/* chart type */}
          <div className="inline-flex rounded-lg border border-zinc-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setChartType("candles")}
              className={`px-3 py-1 ${
                chartType === "candles"
                  ? "bg-zinc-800 text-zinc-100"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800/80"
              }`}
            >
              Candles
            </button>
            <button
              type="button"
              onClick={() => setChartType("line")}
              className={`px-3 py-1 border-l border-zinc-700 ${
                chartType === "line"
                  ? "bg-zinc-800 text-zinc-100"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800/80"
              }`}
            >
              Line
            </button>
          </div>

          {/* indicators with tooltips */}
          <div className="inline-flex rounded-lg border border-zinc-700 overflow-hidden">
            <button
              type="button"
              title="Simple Moving Average over the last 20 closes"
              onClick={() => {
                setSma20On((v) => !v);
                setIndicatorHelp("SMA20");
              }}
              className={`px-2.5 py-1 border-r border-zinc-700 ${
                sma20On
                  ? "bg-zinc-800 text-sky-300"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800/80"
              }`}
            >
              SMA 20
            </button>
            <button
              type="button"
              title="Simple Moving Average over the last 50 closes"
              onClick={() => {
                setSma50On((v) => !v);
                setIndicatorHelp("SMA50");
              }}
              className={`px-2.5 py-1 border-r border-zinc-700 ${
                sma50On
                  ? "bg-zinc-800 text-violet-300"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800/80"
              }`}
            >
              SMA 50
            </button>
            <button
              type="button"
              title="Exponential Moving Average (more weight on recent closes)"
              onClick={() => {
                setEma20On((v) => !v);
                setIndicatorHelp("EMA20");
              }}
              className={`px-2.5 py-1 border-r border-zinc-700 ${
                ema20On
                  ? "bg-zinc-800 text-orange-300"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800/80"
              }`}
            >
              EMA 20
            </button>
            <button
              type="button"
              title="Volume-Weighted Average Price"
              onClick={() => {
                setVwapOn((v) => !v);
                setIndicatorHelp("VWAP");
              }}
              className={`px-2.5 py-1 border-r border-zinc-700 ${
                vwapOn
                  ? "bg-zinc-800 text-amber-300"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800/80"
              }`}
            >
              VWAP
            </button>
            <button
              type="button"
              title="MACD momentum"
              onClick={() => {
                setMacdOn((v) => !v);
                setIndicatorHelp("MACD");
              }}
              className={`px-2.5 py-1 border-r border-zinc-700 ${
                macdOn
                  ? "bg-zinc-800 text-emerald-300"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800/80"
              }`}
            >
              MACD
            </button>
            <button
              type="button"
              title="Relative Strength Index (0–100)"
              onClick={() => {
                setRsiOn((v) => !v);
                setIndicatorHelp("RSI");
              }}
              className={`px-2.5 py-1 ${
                rsiOn
                  ? "bg-zinc-800 text-fuchsia-300"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800/80"
              }`}
            >
              RSI
            </button>
          </div>

          {/* zoom */}
          <div className="inline-flex rounded-lg border border-zinc-700 overflow-hidden">
            <button
              type="button"
              onClick={() => zoomByFactor(0.7)}
              className="px-2.5 py-1 border-r border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            >
              Zoom In
            </button>
            <button
              type="button"
              onClick={() => zoomByFactor(1.3)}
              className="px-2.5 py-1 border-r border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            >
              Zoom Out
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="px-2.5 py-1 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {indicatorHelpText && (
        <div className="text-[11px] text-zinc-300 bg-zinc-800/60 border border-zinc-700/80 rounded-md px-3 py-2">
          {indicatorHelpText}
        </div>
      )}

      {error && (
        <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* MAIN PRICE CHART */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[320px] rounded-lg bg-zinc-950/60"
        onWheel={(e) => {
          if (e.cancelable) e.preventDefault();
          if (e.deltaY < 0) zoomByFactor(0.9);
          else zoomByFactor(1.1);
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* prediction background tint */}
        {predBannerFill && (
          <rect
            x={pad}
            y={pad}
            width={width - pad * 2}
            height={height - pad * 2}
            fill={predBannerFill}
          />
        )}

        {/* Y grid + labels */}
        {yTicks.map((t, idx) => (
          <g key={idx}>
            <line
              x1={pad}
              x2={width - pad - 40}
              y1={t.y}
              y2={t.y}
              stroke="#27272a"
              strokeWidth={0.5}
            />
            <text
              x={width - pad - 2}
              y={t.y + 3}
              textAnchor="end"
              fontSize="10"
              fill={idx === 0 || idx === yTicks.length - 1 ? "#9ca3af" : "#6b7280"}
            >
              {t.value.toFixed(2)}
            </text>
          </g>
        ))}

        {/* X ticks */}
        {xTicks.map((t, idx) => (
          <g key={idx}>
            <line
              x1={t.x}
              x2={t.x}
              y1={pad}
              y2={height - pad}
              stroke="#1f2933"
              strokeWidth={0.5}
            />
            <text
              x={t.x}
              y={height - pad + 14}
              textAnchor="middle"
              fontSize="9"
              fill="#6b7280"
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* prediction arrow on right side */}
        {hasData && (
          <g>
            {(() => {
              const arrowX = width - pad - 18;
              const midY = pad + (height - 2 * pad) / 2;
              let points = "";

              if (arrowDirection === "up") {
                points = `${arrowX},${midY - 18} ${arrowX - 8},${midY + 6} ${
                  arrowX + 8
                },${midY + 6}`;
              } else if (arrowDirection === "down") {
                points = `${arrowX},${midY + 18} ${arrowX - 8},${midY - 6} ${
                  arrowX + 8
                },${midY - 6}`;
              } else {
                points = `${arrowX - 10},${midY} ${arrowX},${
                  midY - 8
                } ${arrowX + 10},${midY} ${arrowX},${midY + 8}`;
              }

              return (
                <polygon
                  points={points}
                  fill={arrowColor}
                  opacity={0.8}
                />
              );
            })()}
          </g>
        )}

        {/* price data */}
        {hasData &&
          (chartType === "candles" ? (
            <>
              {candles.map((c, idx) => (
                <g key={idx}>
                  <line
                    x1={c.x}
                    x2={c.x}
                    y1={c.wickTop}
                    y2={c.wickBottom}
                    stroke={c.bullish ? "#22c55e" : "#ef4444"}
                    strokeWidth={1}
                  />
                  <rect
                    x={c.bodyX}
                    y={c.bodyY}
                    width={c.bodyWidth}
                    height={c.bodyHeight}
                    fill={c.bullish ? "#22c55e" : "#ef4444"}
                  />
                </g>
              ))}
            </>
          ) : (
            linePoints && (
              <polyline
                points={linePoints}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth={1.6}
              />
            )
          ))}

        {/* overlays */}
        {hasData && sma20On && sma20Points && (
          <polyline
            points={sma20Points}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={1.2}
          />
        )}
        {hasData && sma50On && sma50Points && (
          <polyline
            points={sma50Points}
            fill="none"
            stroke="#a855f7"
            strokeWidth={1.1}
          />
        )}
        {hasData && ema20On && ema20Points && (
          <polyline
            points={ema20Points}
            fill="none"
            stroke="#f97316"
            strokeWidth={1.1}
          />
        )}
        {hasData && vwapOn && vwapPoints && (
          <polyline
            points={vwapPoints}
            fill="none"
            stroke="#facc15"
            strokeWidth={1.1}
            strokeDasharray="5 3"
          />
        )}

        {/* crosshair + hover marker */}
        {hasData && hoverX != null && hoverCloseY != null && hoverPoint && (
          <>
            <line
              x1={hoverX}
              x2={hoverX}
              y1={pad}
              y2={height - pad}
              stroke="#e5e7eb"
              strokeDasharray="4 4"
              strokeWidth={0.8}
              opacity={0.7}
            />
            <circle cx={hoverX} cy={hoverCloseY} r={3} fill="#e5e7eb" />
            <g>
              <rect
                x={pad + 4}
                y={pad + 4}
                width={250}
                height={94}
                rx={6}
                ry={6}
                fill="#020617ee"
                stroke="#334155"
                strokeWidth={0.7}
              />
              <text x={pad + 12} y={pad + 18} fontSize="11" fill="#e5e7eb">
                {hoverPoint.date}
              </text>
              <text x={pad + 12} y={pad + 32} fontSize="10" fill="#9ca3af">
                O: {hoverPoint.open.toFixed(2)}  H: {hoverPoint.high.toFixed(2)}
              </text>
              <text x={pad + 12} y={pad + 45} fontSize="10" fill="#9ca3af">
                L: {hoverPoint.low.toFixed(2)}  C: {hoverPoint.close.toFixed(2)}
              </text>
              <text x={pad + 12} y={pad + 59} fontSize="10" fill="#38bdf8">
                SMA20:{" "}
                {hoverSma20 != null ? hoverSma20.toFixed(2) : "--"}
              </text>
              <text x={pad + 12} y={pad + 71} fontSize="10" fill="#a855f7">
                SMA50:{" "}
                {hoverSma50 != null ? hoverSma50.toFixed(2) : "--"}{" "}
                <tspan fill="#f97316">
                  EMA20:{" "}
                  {hoverEma20 != null ? hoverEma20.toFixed(2) : "--"}
                </tspan>
              </text>
              <text x={pad + 12} y={pad + 85} fontSize="10" fill="#facc15">
                VWAP: {hoverVwap != null ? hoverVwap.toFixed(2) : "--"}
              </text>
            </g>
          </>
        )}
      </svg>

      {/* MACD PANEL */}
      {macdOn && (
        <svg
          viewBox={`0 0 ${width} ${macdHeight}`}
          className="w-full h-[180px] rounded-lg bg-zinc-950/60"
          onWheel={(e) => {
            if (e.cancelable) e.preventDefault();
            if (e.deltaY < 0) zoomByFactor(0.9);
            else zoomByFactor(1.1);
          }}
          onMouseMove={handleSharedMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* grid line at 0 */}
          <line
            x1={pad}
            x2={width - pad}
            y1={macdToY(0)}
            y2={macdToY(0)}
            stroke="#374151"
            strokeWidth={0.8}
          />

          {/* histogram */}
          {macdBars.map((b, idx) => (
            <rect
              key={idx}
              x={b.x}
              y={b.y}
              width={b.width}
              height={b.height}
              fill={b.bullish ? "#22c55e80" : "#ef444480"}
            />
          ))}

          {/* MACD line */}
          {macdPoints && (
            <polyline
              points={macdPoints}
              fill="none"
              stroke="#22c55e"
              strokeWidth={1.2}
            />
          )}

          {/* signal line */}
          {signalPoints && (
            <polyline
              points={signalPoints}
              fill="none"
              stroke="#f97316"
              strokeWidth={1.1}
            />
          )}

          {/* crosshair & values */}
          {hasData && hoverX != null && hoverMacd != null && (
            <>
              <line
                x1={hoverX}
                x2={hoverX}
                y1={pad}
                y2={macdHeight - pad}
                stroke="#e5e7eb"
                strokeDasharray="4 4"
                strokeWidth={0.8}
                opacity={0.7}
              />
              <circle
                cx={hoverX}
                cy={macdToY(hoverMacd)}
                r={3}
                fill="#22c55e"
              />
              <g>
                <rect
                  x={pad + 4}
                  y={pad + 4}
                  width={230}
                  height={52}
                  rx={6}
                  ry={6}
                  fill="#020617ee"
                  stroke="#334155"
                  strokeWidth={0.7}
                />
                <text x={pad + 12} y={pad + 18} fontSize="10" fill="#e5e7eb">
                  MACD:{" "}
                  {hoverMacd != null ? hoverMacd.toFixed(4) : "--"}{" "}
                  <tspan fill="#f97316">
                    Signal:{" "}
                    {hoverSignal != null ? hoverSignal.toFixed(4) : "--"}
                  </tspan>
                </text>
                <text x={pad + 12} y={pad + 32} fontSize="10" fill="#9ca3af">
                  Hist: {hoverHist != null ? hoverHist.toFixed(4) : "--"}
                </text>
              </g>
            </>
          )}
        </svg>
      )}

      {/* RSI PANEL */}
      {rsiOn && (
        <svg
          viewBox={`0 0 ${width} ${rsiHeight}`}
          className="w-full h-[170px] rounded-lg bg-zinc-950/60"
          onWheel={(e) => {
            if (e.cancelable) e.preventDefault();
            if (e.deltaY < 0) zoomByFactor(0.9);
            else zoomByFactor(1.1);
          }}
          onMouseMove={handleSharedMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          {/* overbought/oversold lines */}
          <line
            x1={pad}
            x2={width - pad}
            y1={rsiToY(70)}
            y2={rsiToY(70)}
            stroke="#f97316"
            strokeDasharray="4 3"
            strokeWidth={0.8}
          />
          <line
            x1={pad}
            x2={width - pad}
            y1={rsiToY(30)}
            y2={rsiToY(30)}
            stroke="#22c55e"
            strokeDasharray="4 3"
            strokeWidth={0.8}
          />

          {/* labels */}
          <text
            x={width - pad}
            y={rsiToY(70) - 3}
            textAnchor="end"
            fontSize="9"
            fill="#f97316"
          >
            70
          </text>
          <text
            x={width - pad}
            y={rsiToY(30) + 10}
            textAnchor="end"
            fontSize="9"
            fill="#22c55e"
          >
            30
          </text>

          {/* RSI line */}
          {rsiPoints && (
            <polyline
              points={rsiPoints}
              fill="none"
              stroke="#e878f9"
              strokeWidth={1.2}
            />
          )}

          {/* crosshair & value */}
          {hasData && hoverX != null && hoverRsi != null && (
            <>
              <line
                x1={hoverX}
                x2={hoverX}
                y1={pad}
                y2={rsiHeight - pad}
                stroke="#e5e7eb"
                strokeDasharray="4 4"
                strokeWidth={0.8}
                opacity={0.7}
              />
              <circle cx={hoverX} cy={rsiToY(hoverRsi)} r={3} fill="#e878f9" />
              <g>
                <rect
                  x={pad + 4}
                  y={pad + 4}
                  width={160}
                  height={32}
                  rx={6}
                  ry={6}
                  fill="#020617ee"
                  stroke="#334155"
                  strokeWidth={0.7}
                />
                <text x={pad + 12} y={pad + 22} fontSize="10" fill="#e5e7eb">
                  RSI 14: {hoverRsi != null ? hoverRsi.toFixed(2) : "--"}
                </text>
              </g>
            </>
          )}
        </svg>
      )}

      {loading && (
        <div className="text-[11px] text-zinc-500">Loading chart data…</div>
      )}

      {!loading && !hasData && !error && (
        <div className="text-[11px] text-zinc-500">
          No price history available for this symbol / timeframe.
        </div>
      )}

      <div className="text-[11px] text-zinc-500 mt-1">
        Move your mouse over the chart to see candle details and indicator
        values. Scroll to zoom all panels together. VWAP sits on top of price;
        MACD and RSI show momentum and overbought/oversold conditions. The
        model badge and arrow indicate the latest ML prediction for this ticker.
      </div>
    </div>
  );
};

export default PriceChart;
