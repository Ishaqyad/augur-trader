import { usePortfolio } from "../stores/portfolio";

function fmtUSD(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function fmtTime(t: number) {
  const d = new Date(t);
  return d.toLocaleString();
}

export default function TradeLog() {
  const { orders } = usePortfolio();

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Trade Log</h2>

      <div className="rounded-xl overflow-hidden border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900/60">
            <tr className="text-left">
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Side</th>
              <th className="px-4 py-2">Symbol</th>
              <th className="px-4 py-2">Qty</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Notional</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-zinc-400"
                >
                  No orders yet. Place one in{" "}
                  <span className="text-zinc-200">Trade View</span>.
                </td>
              </tr>
            ) : (
              // newest first
              [...orders].reverse().map((o) => (
                <tr key={o.id} className="border-t border-zinc-800/70">
                  <td className="px-4 py-2">{fmtTime(o.time)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded-md ${
                        o.side === "BUY"
                          ? "bg-green-600/20 text-green-400"
                          : "bg-red-600/20 text-red-400"
                      }`}
                    >
                      {o.side}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-medium">{o.symbol}</td>
                  <td className="px-4 py-2">{o.qty}</td>
                  <td className="px-4 py-2">{fmtUSD(o.price)}</td>
                  <td className="px-4 py-2">{fmtUSD(o.qty * o.price)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
