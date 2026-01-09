import { usePortfolio } from "../stores/portfolio";
import Tooltip from "../components/Tooltip";

function fmtUSD(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function Dashboard() {
  const { equity, cash, positions, reset } = usePortfolio();

  const holdingsValue = positions.reduce((sum, p) => sum + p.qty * p.avgPrice, 0);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Account Overview</h2>

      <div className="grid grid-cols-3 gap-4 max-w-3xl">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-sm text-zinc-400">
            <Tooltip
              label="Equity"
              hint="Total account value = Cash + sum of each position's shares × valuation price (here we use avg price as a placeholder)."
            />
          </div>
          <div className="text-2xl font-bold">{fmtUSD(equity)}</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-sm text-zinc-400">
            <Tooltip
              label="Cash"
              hint="Uninvested dollars available to buy. Buys reduce cash; sells increase cash."
            />
          </div>
          <div className="text-2xl font-bold">{fmtUSD(cash)}</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-sm text-zinc-400">
            <Tooltip
              label="Holdings (at avg)"
              hint="Market value of all open positions valued at their average cost. Later we’ll plug in live/last prices."
            />
          </div>
          <div className="text-2xl font-bold">{fmtUSD(holdingsValue)}</div>
        </div>
      </div>

      <div className="mt-6 text-sm text-zinc-400">
        {positions.length === 0 ? (
          <span>No positions.</span>
        ) : (
          <span>{positions.length} position{positions.length > 1 ? "s" : ""} held.</span>
        )}
      </div>

      <button
        onClick={reset}
        className="mt-6 px-3 py-2 text-sm rounded-lg border border-zinc-700 hover:bg-zinc-900"
      >
        Reset Account
      </button>
    </div>
  );
}
