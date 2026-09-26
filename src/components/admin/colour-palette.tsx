"use client";

import { COLOUR_PRESETS } from "@/lib/colour-presets";
import { input } from "./ui";

export interface ColourDraft {
  name: string;
  hex: string;
}

/**
 * Pick a new colour: tap a preset shade (fills the name too) or choose any shade with the
 * picker and type a name. `taken` greys out presets that already exist.
 */
export function ColourPalette({
  value,
  onChange,
  taken = [],
}: {
  value: ColourDraft;
  onChange: (v: ColourDraft) => void;
  taken?: string[];
}) {
  const takenSet = new Set(taken.map((t) => t.toLowerCase()));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="listbox" aria-label="Preset shades">
        {COLOUR_PRESETS.map((p) => {
          const exists = takenSet.has(p.name.toLowerCase());
          const selected = value.hex.toUpperCase() === p.hex && value.name === p.name;
          return (
            <button
              key={p.name}
              type="button"
              role="option"
              aria-selected={selected}
              disabled={exists}
              title={exists ? `${p.name} (already added)` : p.name}
              aria-label={p.name}
              onClick={() => onChange({ name: p.name, hex: p.hex })}
              className={`h-8 w-8 rounded-full border transition-transform disabled:cursor-not-allowed disabled:opacity-25 ${
                selected ? "scale-110 border-2 border-maroon ring-2 ring-maroon/25" : "border-ink/15 hover:scale-110"
              }`}
              style={{ background: p.hex }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <label
          className="relative h-10 w-12 shrink-0 cursor-pointer overflow-hidden rounded-md border border-line"
          title="Any other shade"
        >
          <span className="absolute inset-1 rounded" style={{ background: value.hex }} aria-hidden />
          <input
            type="color"
            value={value.hex.toLowerCase()}
            onChange={(e) => onChange({ ...value, hex: e.target.value.toUpperCase() })}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Choose any shade"
          />
        </label>
        <input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="Colour name, e.g. Rani Pink"
          maxLength={30}
          aria-label="Colour name"
          className={input}
        />
      </div>
    </div>
  );
}
