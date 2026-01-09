// src/pages/Settings.tsx
import { useEffect, useState } from "react";
import { apiService, type TrainedModelInfo } from "../services/api";

export default function Settings() {
  const [models, setModels] = useState<TrainedModelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      try {
        setLoading(true);
        setError(null);
        const data = await apiService.getModels();
        if (!cancelled) {
          setModels(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load model status.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadModels();
    return () => {
      cancelled = true;
    };
  }, []);

  function formatDate(iso?: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  }

  function formatWindow(m: TrainedModelInfo) {
    if (!m.data_start && !m.data_end) return "—";
    if (!m.data_start || !m.data_end) return m.data_start || m.data_end || "—";
    return `${m.data_start} → ${m.data_end}`;
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Page header */}
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="text-sm text-zinc-400">
          Account & app configuration, plus an overview of your trained ML models.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)]">
        {/* Left: Model Status */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                Model Status
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Shows which tickers currently have ML models trained and what data
                window they used.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  setLoading(true);
                  setError(null);
                  const data = await apiService.getModels();
                  setModels(data);
                } catch (err) {
                  setError("Failed to refresh model status.");
                } finally {
                  setLoading(false);
                }
              }}
              className="px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-200 hover:bg-zinc-800"
            >
              Refresh
            </button>
          </div>

          {loading && (
            <div className="py-6 text-sm text-zinc-400">
              Loading model metadata…
            </div>
          )}

          {!loading && error && (
            <div className="py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && models.length === 0 && (
            <div className="py-6 text-sm text-zinc-500">
              No trained models found yet.
              <br />
              As you train models for specific tickers, they’ll show up here.
            </div>
          )}

          {!loading && !error && models.length > 0 && (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="text-left py-2 pr-3 font-medium">Ticker</th>
                    <th className="text-left py-2 pr-3 font-medium">
                      Last Trained
                    </th>
                    <th className="text-left py-2 pr-3 font-medium">
                      Data Window
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((m) => (
                    <tr
                      key={m.ticker}
                      className="border-b border-zinc-900/80 hover:bg-zinc-900/60"
                    >
                      <td className="py-2 pr-3 font-semibold text-zinc-100">
                        {m.ticker.toUpperCase()}
                      </td>
                      <td className="py-2 pr-3 text-zinc-300">
                        {formatDate(m.last_trained_at)}
                      </td>
                      <td className="py-2 pr-3 text-zinc-300">
                        {formatWindow(m)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-2 text-[11px] text-zinc-500 leading-relaxed">
            Predictions in the app will only show an{" "}
            <span className="text-green-300 font-medium">UP</span> /
            <span className="text-red-300 font-medium"> DOWN</span> signal for
            tickers that have a trained model. Others will show{" "}
            <span className="text-zinc-300 font-medium">No signal</span> and can
            be trained as an add-on from the UI.
          </p>
        </section>

        {/* Right: placeholder for future account settings */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-zinc-100">
            Account & Preferences
          </h3>
          <p className="text-xs text-zinc-500">
            This section can be expanded later with user profile, default
            watchlist settings, risk preferences (default risk% per trade),
            and notification options.
          </p>
          <div className="mt-2 text-sm text-zinc-400">
            For the capstone, you can mention this as planned future work in
            your report.
          </div>
        </section>
      </div>
    </div>
  );
}
