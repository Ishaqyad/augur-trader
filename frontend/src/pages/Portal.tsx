// src/pages/Portal.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiService, type StockData } from "../services/api";
import PriceChart from "../components/PriceChart";

type ViewState = "idle" | "loading" | "error";

const Portal: React.FC = () => {
  // ---- watchlist ----
  const [watchInput, setWatchInput] = useState("");
  const [watchlist, setWatchlist] = useState<StockData[]>([]);
  const [watchState, setWatchState] = useState<ViewState>("idle");
  const [watchError, setWatchError] = useState<string | null>(null);

  // ---- quick lookup / chart symbol ----
  const [lookupSymbol, setLookupSymbol] = useState("AAPL");
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");

  // ---- small status for adding a symbol ----
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Load current tracked stocks for the watchlist + Market View
  // ---------------------------------------------------------------------------
  async function loadWatchlist() {
    try {
      setWatchState("loading");
      setWatchError(null);
      const data = await apiService.getTrackedStocks();
      setWatchlist(data);
      setWatchState("idle");

      // if we don't have a selected symbol yet, pick the first tracked one
      if (data.length && !selectedSymbol) {
        setSelectedSymbol(data[0].name);
      }
    } catch (err) {
      setWatchState("error");
      setWatchError(
        err instanceof Error ? err.message : "Failed to load watchlist"
      );
    }
  }

  useEffect(() => {
    loadWatchlist();
  }, []);

  // ---------------------------------------------------------------------------
  // Add symbol (trains ML on the backend if needed, via /api/stocks)
  // ---------------------------------------------------------------------------
  async function handleAddSymbol() {
    const t = watchInput.trim().toUpperCase();
    if (!t) return;

    try {
      setAdding(true);
      setAddError(null);
      await apiService.addStock(t); // backend will train if model missing
      setWatchInput("");
      await loadWatchlist();
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Failed to add symbol"
      );
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveStock(symbol: string) {
    try {
      setWatchState("loading");
      await apiService.removeStock(symbol);
      await loadWatchlist();
      setWatchState("idle");
    } catch (err) {
      setWatchState("error");
      setWatchError(err instanceof Error ? err.message : "Failed to remove stock");
    }
  }

  async function handleRefreshAll() {
    try {
      setWatchState("loading");
      await apiService.refreshStocks();
      await loadWatchlist();
    } catch (err) {
      setWatchState("error");
      setWatchError(
        err instanceof Error ? err.message : "Failed to refresh stocks"
      );
    }
  }

  // when user clicks a row in Market View, drive the big chart
  function handleSelectSymbol(sym: string) {
    setSelectedSymbol(sym.toUpperCase());
    setLookupSymbol(sym.toUpperCase());
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* ------------------------------------------------------------------ */}
        {/* TOP: title + controls + view positions */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Trading Portal
            </h1>
            <p className="text-xs text-zinc-400 max-w-xl">
              Watchlist of tickers backed by ML predictions, live prices, and
              educational paper trading. Add tickers to train new models.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={handleRefreshAll}
              className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
            >
              Refresh All
            </button>

            <Link
              to="/positions"
              className="px-3 py-1.5 rounded-lg border border-emerald-500/70 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
            >
              View Positions &amp; Orders
            </Link>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* WATCHLIST BAR */}
        {/* ------------------------------------------------------------------ */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs font-medium text-zinc-200">
                Watchlist
              </div>
              <div className="text-[11px] text-zinc-500">
                Add symbols to train new models and mirror them in Learning
                Mode.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <input
                type="text"
                placeholder="ADD SYMBOL (E.G. AAPL)"
                className="w-44 px-2 py-1.5 rounded-md bg-zinc-950 border border-zinc-700 text-zinc-100 uppercase focus:outline-none focus:ring-1 focus:ring-sky-500"
                value={watchInput}
                onChange={(e) =>
                  setWatchInput(e.target.value.toUpperCase())
                }
              />
              <button
                type="button"
                onClick={handleAddSymbol}
                disabled={adding}
                className="px-3 py-1.5 rounded-md border border-sky-500/70 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 disabled:opacity-50"
              >
                {adding ? "Adding…" : "Add to Watchlist"}
              </button>
            </div>
          </div>

          {addError && (
            <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-1.5">
              {addError}
            </div>
          )}

          <div className="mt-2 text-[11px] text-zinc-500">
            {watchState === "loading"
              ? "Loading watchlist…"
              : watchlist.length === 0
              ? "No tracked stocks yet. Add a symbol above to start."
              : `Tracking ${watchlist.length} symbol${
                  watchlist.length === 1 ? "" : "s"
                }.`}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* QUICK LOOKUP + LEARNING MODE / MARKET VIEW CARDS */}
        {/* ------------------------------------------------------------------ */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr,1.4fr] gap-4">
          {/* LEFT: quick lookup + chart symbol input */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">
                  Quick Stock Lookup (with ML Prediction)
                </h2>
                <p className="text-[11px] text-zinc-500">
                  Type a symbol and click Lookup to update the chart below.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <input
                type="text"
                className="w-40 px-2 py-1.5 rounded-md bg-zinc-950 border border-zinc-700 text-zinc-100 uppercase focus:outline-none focus:ring-1 focus:ring-sky-500"
                value={lookupSymbol}
                onChange={(e) =>
                  setLookupSymbol(e.target.value.toUpperCase())
                }
              />
              <button
                type="button"
                onClick={() =>
                  setSelectedSymbol(lookupSymbol.trim().toUpperCase())
                }
                className="px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
              >
                Lookup
              </button>
            </div>
          </div>

          {/* RIGHT: Learning Mode + Market View mini-table */}
          <div className="space-y-4">
            {/* Learning Mode card */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
              <div className="text-xs font-semibold text-zinc-400">
                Practice / Sim Account
              </div>
              <div className="text-sm font-semibold text-zinc-100">
                Learning Mode
              </div>
              <p className="text-[11px] text-zinc-400">
                Paper trade with virtual cash. Place buys/sells, track positions,
                and review your trade history without risking real money.
              </p>
              <Link
                to="/trade"
                className="inline-flex mt-2 px-3 py-1.5 rounded-md bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-500"
              >
                Open Learning Mode →
              </Link>
            </div>

            {/* Market View mini-table */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-zinc-100">
                    Market View
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    Click a row to drive the chart with that symbol.
                  </div>
                </div>
              </div>

              {watchlist.length === 0 ? (
                <div className="text-[11px] text-zinc-500 mt-2">
                  No symbols in the watchlist yet.
                </div>
              ) : (
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full text-[11px]">
                    <thead className="border-b border-zinc-800 text-zinc-400">
                      <tr>
                        <th className="py-1 pr-2 text-left">Symbol</th>
                        <th className="py-1 px-2 text-left">Company</th>
                        <th className="py-1 px-2 text-right">Price</th>
                        <th className="py-1 pl-2 pr-1 text-right">
                          Prediction
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {watchlist.map((s) => (
                        <tr
                          key={s.name}
                          onClick={() => handleSelectSymbol(s.name)}
                          className="border-t border-zinc-900 hover:bg-zinc-800/70 cursor-pointer"
                        >
                          <td className="py-1 pr-2 font-semibold text-zinc-100">
                            {s.name}
                          </td>
                          <td className="py-1 px-2 text-zinc-300 truncate max-w-[140px]">
                            {s.companyName ?? s.name}
                          </td>
                          <td className="py-1 px-2 text-right text-zinc-100">
                            ${s.price.toFixed(2)}
                          </td>
                          <td className="py-1 pl-2 pr-1 text-right">
                            {s.prediction === 1 ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/50">
                                UP
                              </span>
                            ) : s.prediction === 0 ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/50">
                                DOWN
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/50">
                                NEUTRAL
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => handleRemoveStock(s.name)} disabled={watchState === "loading"} className="px-3 py-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed">
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* BIG PRICE CHART */}
        {/* ------------------------------------------------------------------ */}
        <PriceChart symbol={selectedSymbol} period="6M" />

        <div className="text-[11px] text-zinc-500">
          Model prediction is directional only. Use this together with risk
          management in Learning Mode before risking real capital.
        </div>
      </main>
    </div>
  );
};

export default Portal;
