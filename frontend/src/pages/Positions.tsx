// src/pages/Positions.tsx
import React from "react";
import { usePortfolio } from "../stores/portfolio";

const Positions: React.FC = () => {
  const { positions, orders, equity, cash, closePosition } = usePortfolio();

  return (
    <div className="p-4 md:p-6 space-y-6 text-sm">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">
            Positions &amp; Orders
          </h1>
          <p className="text-xs text-zinc-400">
            View your open paper positions and trade history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900/70">
            <div className="text-zinc-400 text-[11px]">Equity</div>
            <div className="text-zinc-100 font-semibold">${equity.toFixed(2)}</div>
          </div>
          <div className="px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900/70">
            <div className="text-zinc-400 text-[11px]">Cash</div>
            <div className="text-zinc-100 font-semibold">${cash.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* OPEN POSITIONS */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">Open Positions</h2>
          <span className="text-[11px] text-zinc-500">
            {positions.length} {positions.length === 1 ? "position" : "positions"}
          </span>
        </div>

        {positions.length === 0 ? (
          <div className="px-4 py-6 text-xs text-zinc-500">
            No open positions yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-zinc-900/90 border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-2 text-left text-zinc-400">Symbol</th>
                  <th className="px-4 py-2 text-right text-zinc-400">Qty</th>
                  <th className="px-4 py-2 text-right text-zinc-400">Avg Price</th>
                  <th className="px-4 py-2 text-right text-zinc-400">Stop Loss</th>
                  <th className="px-4 py-2 text-right text-zinc-400">Take Profit</th>
                  <th className="px-4 py-2 text-right text-zinc-400">Value</th>
                  <th className="px-4 py-2 text-right text-zinc-400">Actions</th>
                </tr>
              </thead>

              <tbody>
                {positions.map((p) => {
                  const value = p.qty * p.avgPrice;
                  return (
                    <tr key={p.symbol} className="border-t border-zinc-800 hover:bg-zinc-900">
                      <td className="px-4 py-2 font-semibold text-zinc-100">{p.symbol}</td>
                      <td className="px-4 py-2 text-right">{p.qty}</td>
                      <td className="px-4 py-2 text-right">${p.avgPrice.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">
                        {p.stopLoss != null ? `$${p.stopLoss.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {p.takeProfit != null ? `$${p.takeProfit.toFixed(2)}` : "—"}
                      </td>
                      <td className="px-4 py-2 text-right">${value.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => closePosition(p.symbol)}
                          className="px-2.5 py-1 rounded-md border border-zinc-700 text-[11px] hover:bg-zinc-800"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ORDER HISTORY */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">Order History</h2>
          <span className="text-[11px] text-zinc-500">
            {orders.length} {orders.length === 1 ? "order" : "orders"}
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="px-4 py-6 text-xs text-zinc-500">No orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-zinc-900/90 border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-2 text-left text-zinc-400">Time</th>
                  <th className="px-4 py-2 text-left text-zinc-400">Symbol</th>
                  <th className="px-4 py-2 text-right text-zinc-400">Side</th>
                  <th className="px-4 py-2 text-right text-zinc-400">Qty</th>
                  <th className="px-4 py-2 text-right text-zinc-400">Price</th>
                  <th className="px-4 py-2 text-right text-zinc-400">Notional</th>
                </tr>
              </thead>
              <tbody>
                {orders
                  .slice()
                  .reverse()
                  .map((o) => {
                    const dt = new Date(o.time);
                    const notional = o.qty * o.price;

                    return (
                      <tr key={o.id} className="border-t border-zinc-800 hover:bg-zinc-900">
                        <td className="px-4 py-2">{dt.toLocaleString()}</td>
                        <td className="px-4 py-2 font-semibold">{o.symbol}</td>
                        <td
                          className={`px-4 py-2 text-right ${
                            o.side === "BUY" ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          {o.side}
                        </td>
                        <td className="px-4 py-2 text-right">{o.qty}</td>
                        <td className="px-4 py-2 text-right">${o.price.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">${notional.toFixed(2)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Positions;
