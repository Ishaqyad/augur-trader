import React from "react";

type Props = {
  label: string;          // short word shown inline (e.g., Equity)
  hint: string | React.ReactNode;  // explainer shown on hover
  className?: string;     // optional extra classes
};

export default function Tooltip({ label, hint, className }: Props) {
  return (
    <span className={`relative inline-flex items-center gap-1 ${className || ""}`}>
      <span>{label}</span>
      <span className="group inline-block">
        <span
          aria-label="info"
          className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-600 text-[10px] text-zinc-300 select-none"
        >
          i
        </span>
        {/* hover card */}
        <span className="pointer-events-none absolute left-1/2 top-full z-20 hidden w-64 -translate-x-1/2 translate-y-2 rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs text-zinc-200 shadow-xl group-hover:block">
          {hint}
        </span>
      </span>
    </span>
  );
}