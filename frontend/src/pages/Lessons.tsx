import { useState, useMemo } from "react";
import { GLOSSARY, type GlossaryItem } from "../data/glossary";

// Map tags in data → nicer names in the UI
const FILTERS = [
  { key: "all", label: "All Terms" },
  { key: "indicator", label: "Indicators / Technicals" },
  { key: "risk", label: "Risk & Risk Management" },
  { key: "order", label: "Order Types / Mechanics" },
  { key: "psychology", label: "Psychology / Mindset" },
  { key: "account", label: "Account / Basics" },
];

export default function Lessons() {
  // UI state
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  // filtering logic
  const filteredTerms = useMemo(() => {
    // normalize the query once
    const q = search.trim().toLowerCase();

    return GLOSSARY.filter((item: GlossaryItem) => {
      // filter by category/tag
      if (filter !== "all") {
        // we consider a match if any tag includes the filter key
        const hasTag = item.tags?.some((t) =>
          t.toLowerCase().includes(filter.toLowerCase())
        );
        if (!hasTag) return false;
      }

      // filter by search
      if (q.length > 0) {
        const haystack = [
          item.term,
          item.short,
          item.detail,
          ...(item.tags || []),
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [search, filter]);

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Header */}
      <header>
        <h2 className="text-xl font-semibold mb-2">Lessons & Glossary</h2>
        <p className="text-sm text-zinc-400 max-w-2xl leading-relaxed">
          Start here. These are core ideas you need before risking real money:
          how orders work, how risk works, what indicators actually mean, and
          the psychology that quietly ruins most new traders.
        </p>
      </header>

      {/* Controls row */}
      <section className="flex flex-col gap-4 md:flex-row md:items-end">
        {/* Search box */}
        <div className="flex-1 max-w-md">
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Search terms
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='try "RSI", "stop loss", "risk", "VWAP"...'
            className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-zinc-100
                       outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 text-xs">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg border text-left ${
                filter === f.key
                  ? "bg-zinc-800 border-zinc-600 text-zinc-100"
                  : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* Results info */}
      <div className="text-xs text-zinc-500">
        Showing{" "}
        <span className="text-zinc-200 font-medium">
          {filteredTerms.length}
        </span>{" "}
        definition{filteredTerms.length === 1 ? "" : "s"}
        {filter !== "all" ? (
          <>
            {" "}
            in <span className="text-zinc-200 font-medium">{filter}</span>
          </>
        ) : null}
        {search ? (
          <>
            {" "}
            matching "<span className="text-zinc-200 font-medium">{search}</span>"
          </>
        ) : null}
      </div>

      {/* Glossary list */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 max-h-[60vh] overflow-y-auto">
        {filteredTerms.length === 0 ? (
          <EmptyState search={search} />
        ) : (
          <ul className="space-y-4">
            {filteredTerms.map((item) => (
              <GlossaryCard key={item.term} item={item} />
            ))}
          </ul>
        )}
      </section>

      {/* Footer / disclaimer */}
      <footer className="text-[11px] text-zinc-500 leading-relaxed max-w-2xl">
        This glossary is for education and paper trading only. Nothing here is
        financial advice. The goal is to help you survive long enough to
        actually learn.
      </footer>
    </div>
  );
}

// small component for each glossary row
function GlossaryCard({ item }: { item: GlossaryItem }) {
  return (
    <li className="rounded-lg border border-zinc-800/70 bg-zinc-900/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-base font-semibold text-zinc-100">
            {item.term}
          </div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium">
            {item.tags && item.tags.length > 0
              ? item.tags.join(" • ")
              : "general"}
          </div>
        </div>
      </div>

      <div className="mt-3 text-sm text-zinc-300 space-y-4">
        <div>
          <div className="text-zinc-400 uppercase text-[10px] font-semibold tracking-wider mb-1">
            SHORT DEFINITION
          </div>
          <div className="text-zinc-200">{item.short}</div>
        </div>

        <div>
          <div className="text-zinc-400 uppercase text-[10px] font-semibold tracking-wider mb-1">
            WHY IT MATTERS
          </div>
          <div className="text-zinc-200 leading-relaxed">{item.detail}</div>
        </div>

        {item.usage && (
          <div className="rounded-lg border border-zinc-700/60 bg-zinc-900/80 p-3">
            <div className="text-zinc-400 uppercase text-[10px] font-semibold tracking-wider mb-1">
              HOW TRADERS ACTUALLY USE THIS
            </div>
            <div className="text-zinc-100 leading-relaxed">{item.usage}</div>
            <div className="text-[10px] text-zinc-500 mt-2 italic">
              Not advice. This is just common behavior you’ll hear people talk
              about.
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

// when search/filter returns no results
function EmptyState({ search }: { search: string }) {
  return (
    <div className="text-center py-16 text-sm text-zinc-500">
      <div className="text-zinc-300 font-medium mb-2">No matching terms.</div>
      <div className="text-zinc-500">
        {search
          ? "Try a simpler keyword, like 'risk', 'RSI', or 'cash'."
          : "No items in this category yet."}
      </div>
    </div>
  );
}
