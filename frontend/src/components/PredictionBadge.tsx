// src/components/PredictionBadge.tsx

export type PredictionValue = -1 | 0 | 1 | null;

type Props = {
  value: PredictionValue;
  compact?: boolean; // smaller text for inline use
};

export default function PredictionBadge({ value, compact }: Props) {
  const base =
    "inline-flex items-center justify-center rounded px-2 py-0.5 font-semibold";
  const size = compact ? "text-[10px]" : "text-xs";

  if (value === 1) {
    return (
      <span className={`${base} ${size} bg-green-900/50 text-green-300`}>
        UP
      </span>
    );
  }

  if (value === 0) {
    return (
      <span className={`${base} ${size} bg-red-900/50 text-red-300`}>
        DOWN
      </span>
    );
  }

  if (value === -1) {
    return (
      <span className={`${base} ${size} bg-orange-900/50 text-orange-300`}>
        LOW CONFIDENCE
      </span>
    );
  }

  return (
    <span className={`${base} ${size} bg-zinc-800 text-zinc-300`}>NO SIGNAL</span>
  );
}
