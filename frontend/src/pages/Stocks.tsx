// src/pages/Stocks.tsx
import { useState, useEffect } from "react";
import { apiService } from "../services/api";
import type { StockData } from "../services/api";
import Tooltip from "../components/Tooltip";
import PriceChart from "../components/PriceChart";

export default function Stocks() {
  const [trackedStocks, setTrackedStocks] = useState<StockData[]>([]);
  const [stockInput, setStockInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  useEffect(() => {
    loadTrackedStocks();
    const interval = setInterval(
      () => trackedStocks.length > 0 && refreshStocks(),
      60000
    );
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep selected symbol sane
  useEffect(() => {
    if (trackedStocks.length > 0 && !selectedSymbol) {
      setSelectedSymbol(trackedStocks[0].name);
    }
    if (
      selectedSymbol &&
      !trackedStocks.some((s) => s.name === selectedSymbol)
    ) {
      setSelectedSymbol(trackedStocks[0]?.name ?? null);
    }
  }, [trackedStocks, selectedSymbol]);

  const loadTrackedStocks = async () => {
    try {
      setLoading(true);
      setMsg("");
      const stocks = await apiService.getTrackedStocks();
      setTrackedStocks(stocks);
      setLastUpdated(new Date());
    } catch (err) {
      setMsg(
        err instanceof Error ? err.message : "Failed to load stocks"
      );
    } finally {
      setLoading(false);
    }
  };

  const addStock = async () => {
    const ticker = stockInput.trim().toUpperCase();
    if (!ticker) return;
    try {
      setLoading(true);
      setMsg("");
      const newStock = await apiService.addStock(ticker);
      setTrackedStocks((prev) => {
        if (prev.some((s) => s.name === newStock.name)) return prev;
        return [...prev, newStock];
      });
      setStockInput("");
      setLastUpdated(new Date());
      setSelectedSymbol(ticker);
    } catch (err) {
      setMsg(
        err instanceof Error ? err.message : "Failed to add stock"
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshStocks = async () => {
    try {
      setLoading(true);
      setMsg("");
      const updatedStocks = await apiService.refreshStocks();
      setTrackedStocks(updatedStocks);
      setLastUpdated(new Date());
    } catch (err) {
      setMsg(
        err instanceof Error ? err.message : "Failed to refresh stocks"
      );
    } finally {
      setLoading(false);
    }
  };

  const removeStock = async (ticker: string) => {
    try {
      setLoading(true);
      setMsg("");
      await apiService.removeStock(ticker);
      setTrackedStocks((prev) => prev.filter((s) => s.name !== ticker));
    } catch (err) {
      setMsg(
        err instanceof Error ? err.message : "Failed to remove stock"
      );
    } finally {
      setLoading(false);
    }
  };

  const resetAccount = async () => {
    try {
      setLoading(true);
      setMsg("");
      await apiService.removeAllStocks();
      setTrackedStocks([]);
      setSelectedSymbol(null);
      setMsg("All stocks removed");
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg(
        err instanceof Error ? err.message : "Failed to remove stocks"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshClick = async () => {
    await refreshStocks();
  };

  return (
    <div className="p-6 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Stocks Watch / Market View</h2>
          <p className="text-xs text-zinc-400">
            Track your supported ML stocks, see latest price, prediction, and
            drill into the chart below.
          </p>
        </div>
        <div className="text-xs text-zinc-500">
          {lastUpdated
            ? `Last updated: ${lastUpdated.toLocaleTimeString()}`
            : "Not updated yet"}
        </div>
      </header>

      {/* Add stock */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="flex-1">
            <label
              htmlFor="stock-search"
              className="block text-sm text-zinc-400 mb-1"
            >
              <Tooltip
                label="Stock Symbol (SUPPORTED STOCKS)"
                hint="Stocks with ML Predictions: AAPL, MSFT, NVDA, GOOGL, AMZN, TSLA, META, JPM, V, JNJ"
              />
            </label>
            <div className="flex gap-2">
              <input
                id="stock-search"
                type="text"
                value={stockInput}
                onChange={(e) => {
                  setStockInput(e.target.value);
                  setMsg("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) {
                    addStock();
                  }
                }}
                placeholder="AAPL"
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addStock}
                disabled={loading || !stockInput.trim()}
                className={`px-3 py-2 rounded-lg border border-zinc-700 text-sm hover:bg-zinc-800 ${
                  loading || !stockInput.trim()
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                Add
              </button>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              These are demo stocks where the backend has ML models trained.
            </p>
          </div>

          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={handleRefreshClick}
              disabled={loading || trackedStocks.length === 0}
              className={`px-3 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 ${
                loading || trackedStocks.length === 0
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              Refresh Prices
            </button>
          </div>
        </div>

        {msg && (
          <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
            {msg}
          </div>
        )}
      </section>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        {trackedStocks.length === 0 ? (
          <div className="text-sm text-zinc-500">
            No tracked stocks yet. Add one above to see live data and charts.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-xs text-zinc-400">
                  <th className="py-2 px-2 text-left">Symbol</th>
                  <th className="py-2 px-2 text-left">Company</th>
                  <th className="py-2 px-2 text-right">Price</th>
                  <th className="py-2 px-2 text-right">Prediction</th>
                  <th className="py-2 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trackedStocks.map((s) => (
                  <tr
                    key={s.name}
                    className={`border-t border-zinc-800/70 hover:bg-zinc-900/60 cursor-pointer ${
                      selectedSymbol === s.name ? "bg-zinc-900/60" : ""
                    }`}
                    onClick={() => setSelectedSymbol(s.name)}
                  >
                    <td className="py-2 px-2 font-mono text-xs">
                      {s.name.toUpperCase()}
                    </td>
                    <td className="py-2 px-2 text-xs text-zinc-300">
                      {s.companyName || s.name}
                    </td>
                    <td className="py-2 px-2 text-right text-zinc-100">
                      ${s.price.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span
                        className={`inline-flex items-center justify-center text-[11px] px-2 py-0.5 rounded-full ${
                          s.prediction === 1
                            ? "bg-green-500/15 text-green-300 border border-green-500/30"
                            : s.prediction === 0
                            ? "bg-red-500/15 text-red-300 border border-red-500/30"
                            : "bg-zinc-700/40 text-zinc-200 border border-zinc-600/60"
                        }`}
                      >
                        {s.prediction === 1
                          ? "UP"
                          : s.prediction === 0
                          ? "DOWN"
                          : "NO SIGNAL"}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeStock(s.name);
                        }}
                        disabled={loading}
                        className="text-xs text-red-300 hover:text-red-200"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {trackedStocks.length > 0 && (
          <button
            onClick={resetAccount}
            disabled={loading}
            className={`mt-4 px-3 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-xs ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Removing..." : "Remove All Stocks"}
          </button>
        )}
      </div>

      {/* CHART BELOW TABLE */}
      {selectedSymbol && (
        <div className="mt-4">
          <PriceChart symbol={selectedSymbol} period="6mo" />
        </div>
      )}
    </div>
  );
}
