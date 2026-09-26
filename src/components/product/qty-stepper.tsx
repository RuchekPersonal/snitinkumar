"use client";

import { MinusIcon, PlusIcon } from "@/components/icons";

export function QtyStepper({
  value,
  min,
  onChange,
  label,
  compact = false,
}: {
  value: number;
  min: number;
  onChange: (v: number) => void;
  label: string;
  compact?: boolean;
}) {
  const h = compact ? "h-10" : "h-12";
  return (
    <div className={`inline-flex ${h} items-stretch overflow-hidden rounded-md border border-line bg-surface`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="grid w-11 place-items-center text-ink disabled:text-muted/40"
        aria-label={`Decrease ${label}`}
      >
        <MinusIcon width={18} height={18} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || min)}
        onBlur={(e) => onChange(Math.max(min, Math.floor(Number(e.target.value)) || min))}
        aria-label={label}
        className="w-14 border-x border-line text-center text-[16px] font-semibold [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="grid w-11 place-items-center text-ink"
        aria-label={`Increase ${label}`}
      >
        <PlusIcon width={18} height={18} />
      </button>
    </div>
  );
}
