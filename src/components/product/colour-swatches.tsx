"use client";

import { useState } from "react";

/** Colour dots only; tapping one reveals its name (phones have no hover for tooltips). */
export function ColourSwatches({ colours }: { colours: { name: string; hex: string | null }[] }) {
  const [active, setActive] = useState<string | null>(null);
  return (
    <div>
      <ul className="flex flex-wrap gap-2.5" aria-label="Available colours">
        {colours.map((c) => (
          <li key={c.name}>
            <button
              type="button"
              title={c.name}
              aria-label={c.name}
              aria-pressed={active === c.name}
              onClick={() => setActive(active === c.name ? null : c.name)}
              className={`block h-9 w-9 rounded-full border border-ink/15 shadow-inner transition-shadow ${
                active === c.name ? "ring-2 ring-maroon ring-offset-2 ring-offset-cream" : ""
              }`}
              style={{ background: c.hex ?? "var(--color-sand)" }}
            />
          </li>
        ))}
      </ul>
      <p className="mt-2 min-h-5 text-[13px] text-muted" aria-live="polite">
        {active ? (
          <>
            <b className="text-ink">{active}</b>
            {colours.length > 1 && " · mention the colours you want in your enquiry note"}
          </>
        ) : colours.length > 1 ? (
          "Tap a colour to see its name. Mention the colours you want in your enquiry note."
        ) : null}
      </p>
    </div>
  );
}
