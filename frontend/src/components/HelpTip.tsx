import { useState, useRef, useEffect } from "react";
import { findGlossary } from "../data/glossaryIndex";

export default function HelpTip({ term }: { term: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const item = findGlossary(term);

  // close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  if (!item) {
    // silent fail if term not found
    return (
      <span className="ml-1 text-xs text-zinc-500 select-none">(?)</span>
    );
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-zinc-700 text-[11px] leading-none hover:bg-zinc-800"
        aria-label={`Help about ${item.term}`}
        title={`What is ${item.term}?`}
      >
        ?
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-80 max-w-[80vw] rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-lg">
          <div className="text-xs text-zinc-400 mb-1">Glossary</div>
          <div className="text-sm font-semibold text-zinc-100">{item.term}</div>
          <div className="mt-1 text-[13px] text-zinc-200">{item.short}</div>

          <div className="mt-2 text-[13px] text-zinc-300 leading-relaxed">
            {item.detail}
          </div>

          {item.usage && (
            <div className="mt-2 rounded-md border border-zinc-700/60 bg-zinc-900/80 p-2">
              <div className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wide">
                How traders actually use this
              </div>
              <div className="text-[13px] text-zinc-100 leading-relaxed">
                {item.usage}
              </div>
            </div>
          )}

          <div className="mt-2 text-[11px] text-zinc-500">
            See more in <span className="text-zinc-300">Lessons → Glossary</span>
          </div>
        </div>
      )}
    </div>
  );
}
