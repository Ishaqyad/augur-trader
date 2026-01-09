// src/pages/TradeView.tsx
import React, { useEffect, useState } from "react";
import PriceChart from "../components/PriceChart";
import {
  apiService,
  type RiskResponse,
  type StockData,
} from "../services/api";
import { usePortfolio, type Side } from "../stores/portfolio";

type OrderType = "MARKET" | "LIMIT";

const DEFAULT_EQUITY = 10_000; // default when user hits "Reset to 10k"

// ------------------ Small helper: label + info tooltip ------------------
type InfoLabelProps = {
  label: string;
  info: string;
};

const InfoLabel: React.FC<InfoLabelProps> = ({ label, info }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-1 relative">
      <span className="text-zinc-400 text-[11px]">{label}</span>
      <button
        type="button"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-zinc-500 text-[10px] text-zinc-300 hover:bg-zinc-700/80"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Info: ${label}`}
      >
        i
      </button>
      {open && (
        <div
          className="absolute z-20 mt-6 w-56 px-2.5 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-200 shadow-lg"
          style={{ left: 0, top: "100%" }}
        >
          {info}
        </div>
      )}
    </div>
  );
};

// ---------------------------- Main component ----------------------------
const TradeView: React.FC = () => {
  const [symbol, setSymbol] = useState("AAPL");

  // ----- portfolio store wiring -----
  const equity = usePortfolio((s) => s.equity);
  const cash = usePortfolio((s) => s.cash);
  const submitOrder = usePortfolio((s) => s.submitOrder);
  const setAccountSize = usePortfolio((s) => s.setAccountSize);

  // ----- quote -----
  const [quote, setQuote] = useState<StockData | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // ----- order state -----
  const [orderSide, setOrderSide] = useState<Side>("BUY");
  const [orderType, setOrderType] = useState<OrderType>("MARKET");
  const [orderQty, setOrderQty] = useState<string>("");
  const [entryPrice, setEntryPrice] = useState<string>("");

  const [orderMessage, setOrderMessage] = useState<string | null>(null);

  // ----- risk management -----
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);
  const [risk, setRisk] = useState<RiskResponse | null>(null);

  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [atrMultSl, setAtrMultSl] = useState<number>(1.5);
  const [atrMultTp, setAtrMultTp] = useState<number>(3.0);

  // ----- load quote whenever symbol changes -----
  useEffect(() => {
    let cancelled = false;

    async function loadQuote() {
      if (!symbol.trim()) return;
      try {
        setQuoteLoading(true);
        setQuoteError(null);
        const data = await apiService.getStockData(symbol.trim());
        if (cancelled) return;
        setQuote(data);
        setEntryPrice(data.price.toFixed(2));
      } catch (err) {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(
            err instanceof Error ? err.message : "Failed to load quote"
          );
        }
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    }

    loadQuote();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  // ----- risk handler -----
  async function handleRunRisk() {
    if (!symbol.trim()) {
      setRiskError("Enter a symbol first.");
      return;
    }
    if (!equity || equity <= 0) {
      setRiskError("Account size must be positive.");
      return;
    }
    const entry = Number(entryPrice);
    if (!entry || entry <= 0) {
      setRiskError("Entry price must be a positive number.");
      return;
    }
    if (!riskPercent || riskPercent <= 0) {
      setRiskError("Risk % must be greater than 0.");
      return;
    }

    try {
      setRiskLoading(true);
      setRiskError(null);
      setRisk(null);

      const riskPerTradeDecimal = riskPercent / 100;

      const result = await apiService.getRiskManagement(
        symbol.trim(),
        equity,
        entry,
        riskPerTradeDecimal,
        atrMultSl,
        atrMultTp
      );

      setRisk(result);

      // if (result.recommended_shares && result.recommended_shares > 0) {
      //   setOrderQty(String(result.recommended_shares));
      // }
    } catch (err) {
      setRisk(null);
      setRiskError(
        err instanceof Error ? err.message : "Failed to calculate risk"
      );
    } finally {
      setRiskLoading(false);
    }
  }

  // ----- submit order: go through portfolio store -----
  function handleSubmitOrder(e: React.FormEvent) {
    e.preventDefault();
    setOrderMessage(null);

    const qtyNum = Number(orderQty);
    const typedEntry = Number(entryPrice);

    if (!symbol.trim() || !qtyNum || qtyNum <= 0) {
      setOrderMessage("Enter a symbol and a positive quantity.");
      return;
    }

    if (orderType === "LIMIT" && (!typedEntry || typedEntry <= 0)) {
      setOrderMessage("Enter a valid limit/entry price.");
      return;
    }

    const tradePrice =
      orderType === "MARKET"
        ? quote?.price ?? typedEntry
        : typedEntry;

    if (!tradePrice || tradePrice <= 0) {
      setOrderMessage(
        "Cannot determine a trade price (no quote and no valid entry)."
      );
      return;
    }

    const cost = qtyNum * tradePrice;

    // check cash before calling submitOrder
    if (orderSide === "BUY" && cost > cash) {
      setOrderMessage(
        `Not enough cash: need $${cost.toFixed(
          2
        )}, have $${cash.toFixed(2)}.`
      );
      return;
    }

    // send to portfolio store with correct shape
    submitOrder({
      symbol: symbol.trim().toUpperCase(),
      qty: qtyNum,
      price: tradePrice,
      side: orderSide,
      stopLoss: risk?.stop_loss,
      takeProfit: risk?.take_profit,
    });

    setOrderMessage(
      `Paper ${orderSide} ${
        orderType === "MARKET" ? "MARKET" : `LIMIT @ ${tradePrice.toFixed(2)}`
      } x ${qtyNum} ${symbol.toUpperCase()} submitted.`
    );
  }

  const effectiveEntry = (() => {
    const entry = Number(entryPrice);
    if (!Number.isFinite(entry) || entry <= 0) return null;
    return entry;
  })();

  const approxPositionValue =
    effectiveEntry && orderQty
      ? effectiveEntry * Number(orderQty)
      : null;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">
            TradeView (Paper Trading)
          </h1>
          <p className="text-xs text-zinc-400">
            Practice placing trades with risk management using real market data
            and fake equity.
          </p>
        </div>

        {/* account size / fake equity */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900/70 flex items-center gap-2">
            <span className="text-zinc-400">Account size:</span>
            <input
              type="number"
              className="w-28 px-2 py-1 rounded-md bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              value={equity}
              onChange={(e) =>
                setAccountSize(
                  Number.isNaN(Number(e.target.value))
                    ? 0
                    : Number(e.target.value)
                )
              }
              min={0}
              step={100}
            />
            <span className="text-zinc-400">$</span>
            <button
              type="button"
              onClick={() => setAccountSize(DEFAULT_EQUITY)}
              className="ml-2 px-2 py-1 rounded-md border border-zinc-600 text-zinc-300 hover:bg-zinc-800/80"
            >
              Reset to 10k
            </button>
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT: chart + right side panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* left: chart */}
        <div className="lg:col-span-2 space-y-3">
          {/* symbol input */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Symbol:</span>
              <input
                type="text"
                className="w-24 px-2 py-1 rounded-md bg-zinc-950 border border-zinc-700 text-zinc-100 uppercase focus:outline-none focus:ring-1 focus:ring-sky-500"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setSymbol((s) => s.trim().toUpperCase());
              }}
              className="px-3 py-1 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800/80"
            >
              Refresh Quote
            </button>

            {quoteLoading && (
              <span className="text-[11px] text-zinc-500">Loading quote…</span>
            )}
            {quoteError && (
              <span className="text-[11px] text-amber-400">
                {quoteError}
              </span>
            )}
            {quote && (
              <span className="text-[11px] text-zinc-400">
                {quote.companyName ?? quote.name} • Last:{" "}
                <span className="text-zinc-100 font-medium">
                  ${quote.price.toFixed(2)}
                </span>
              </span>
            )}
          </div>

          <PriceChart symbol={symbol} period="6M" />
        </div>

        {/* right: order + risk */}
        <div className="space-y-4">
          {/* ORDER ENTRY (paper) */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-100">
                Paper Order Ticket
              </h2>
              <span className="text-[10px] text-zinc-500">
                Simulated only – no real trades.
              </span>
            </div>

            <form className="space-y-3" onSubmit={handleSubmitOrder}>
              {/* side & type */}
              <div className="flex flex-wrap gap-3 text-xs">
                <div className="space-y-1">
                  <div className="text-zinc-400 text-[11px]">Side</div>
                  <div className="inline-flex rounded-lg border border-zinc-700 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOrderSide("BUY")}
                      className={`px-3 py-1 ${
                        orderSide === "BUY"
                          ? "bg-emerald-600 text-white"
                          : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800/80"
                      }`}
                    >
                      Buy
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderSide("SELL")}
                      className={`px-3 py-1 border-l border-zinc-700 ${
                        orderSide === "SELL"
                          ? "bg-rose-600 text-white"
                          : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800/80"
                      }`}
                    >
                      Sell
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-zinc-400 text-[11px]">Order Type</div>
                  <div className="inline-flex rounded-lg border border-zinc-700 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOrderType("MARKET")}
                      className={`px-3 py-1 ${
                        orderType === "MARKET"
                          ? "bg-zinc-800 text-zinc-100"
                          : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800/80"
                      }`}
                    >
                      Market
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType("LIMIT")}
                      className={`px-3 py-1 border-l border-zinc-700 ${
                        orderType === "LIMIT"
                          ? "bg-zinc-800 text-zinc-100"
                          : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800/80"
                      }`}
                    >
                      Limit
                    </button>
                  </div>
                </div>
              </div>

              {/* qty & entry price */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <InfoLabel
                    label="Quantity (shares)"
                    info="Number of shares you want to buy or sell for this paper trade."
                  />
                  <input
                    type="number"
                    className="w-full px-2 py-1 rounded-md bg-zinc-950 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    value={orderQty}
                    onChange={(e) => setOrderQty(e.target.value)}
                    min={0}
                  />
                  {approxPositionValue != null && (
                    <div className="text-[10px] text-zinc-500">
                      Approx position: $
                      {approxPositionValue.toFixed(2)}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <InfoLabel
                    label="Entry / Limit Price"
                    info="Price you expect to enter the trade. For MARKET orders this is used mainly for risk sizing."
                  />
                  <input
                    type="number"
                    className="w-full px-2 py-1 rounded-md bg-zinc-950 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    step="0.01"
                    min={0}
                  />
                  <div className="text-[10px] text-zinc-500">
                    Used for risk & limit orders.
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-1 px-3 py-2 rounded-md bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500"
              >
                Place Paper Order
              </button>

              {orderMessage && (
                <div className="text-[11px] text-sky-300 bg-sky-500/10 border border-sky-500/40 rounded-md px-2.5 py-1.5">
                  {orderMessage}
                </div>
              )}
            </form>
          </div>

          {/* RISK MANAGEMENT */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-100">
                Risk Management
              </h2>
              <span className="text-[10px] text-zinc-500">
                ATR-based stop / take profit from backend.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <InfoLabel
                  label="Risk per trade (% of equity)"
                  info="How much of your account you are willing to risk if the stop loss is hit. For example, 1% on a 10k account means risking about $100."
                />
                <input
                  type="number"
                  className="w-full px-2 py-1 rounded-md bg-zinc-950 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={riskPercent}
                  onChange={(e) =>
                    setRiskPercent(
                      Number.isNaN(Number(e.target.value))
                        ? 0
                        : Number(e.target.value)
                    )
                  }
                  min={0.1}
                  step={0.1}
                />
              </div>

              <div className="space-y-1">
                <InfoLabel
                  label="ATR Stop Multiplier"
                  info="How many ATRs below the entry price to place the stop loss. Higher values = wider stop and smaller position size."
                />
                <input
                  type="number"
                  className="w-full px-2 py-1 rounded-md bg-zinc-950 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={atrMultSl}
                  onChange={(e) =>
                    setAtrMultSl(
                      Number.isNaN(Number(e.target.value))
                        ? 0
                        : Number(e.target.value)
                    )
                  }
                  step={0.1}
                />
              </div>

              <div className="space-y-1">
                <InfoLabel
                  label="ATR Take-Profit Multiplier"
                  info="How many ATRs away from entry to place the take-profit target. Larger values aim for bigger wins but may be hit less often."
                />
                <input
                  type="number"
                  className="w-full px-2 py-1 rounded-md bg-zinc-950 border border-zinc-700 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  value={atrMultTp}
                  onChange={(e) =>
                    setAtrMultTp(
                      Number.isNaN(Number(e.target.value))
                        ? 0
                        : Number(e.target.value)
                    )
                  }
                  step={0.1}
                />
              </div>

              <div className="space-y-1">
                <InfoLabel
                  label="Equity (used for risk)"
                  info="Your current simulated account equity from the portfolio. This is used together with Risk % to size positions."
                />
                <div className="px-2 py-1 rounded-md bg-zinc-950 border border-zinc-700 text-zinc-100 text-[11px]">
                  ${equity.toFixed(2)}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRunRisk}
              className="w-full mt-1 px-3 py-2 rounded-md bg-zinc-800 text-zinc-100 text-xs font-medium hover:bg-zinc-700"
            >
              {riskLoading ? "Calculating Risk…" : "Run Risk Check"}
            </button>

            {riskError && (
              <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-2.5 py-1.5">
                {riskError}
              </div>
            )}

            {risk && (
              <div className="mt-2 space-y-2 text-[11px] text-zinc-200">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <div className="text-zinc-400">Prediction</div>
                    <div
                      className={
                        risk.prediction === 1
                          ? "text-emerald-300"
                          : risk.prediction === 0
                          ? "text-rose-300"
                          : "text-sky-300"
                      }
                    >
                      {risk.prediction === 1
                        ? "Bullish (UP)"
                        : risk.prediction === 0
                        ? "Bearish (DOWN)"
                        : "Neutral"}
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-zinc-400">ATR</div>
                    <div>${risk.atr.toFixed(4)}</div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-zinc-400">Stop Loss</div>
                    <div>${risk.stop_loss.toFixed(2)}</div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-zinc-400">Take Profit</div>
                    <div>${risk.take_profit.toFixed(2)}</div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-zinc-400">Recommended Shares</div>
                    <div>{risk.recommended_shares}</div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-zinc-400">Dollar Risk</div>
                    <div>${risk.dollar_risk.toFixed(2)}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <div className="text-zinc-400">
                    Risk / trade: {(risk.risk_per_trade * 100).toFixed(2)}%
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setOrderQty(String(risk.recommended_shares ?? ""))
                    }
                    className="px-2.5 py-1 rounded-md border border-emerald-500/70 text-emerald-300 hover:bg-emerald-500/10"
                  >
                    Use recommended shares
                  </button>
                </div>
              </div>
            )}

            <div className="text-[10px] text-zinc-500 mt-1">
              This panel uses your current equity, entry price, and ATR-based
              stop/target from the backend to size the position. For education
              only – not investment advice.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeView;
