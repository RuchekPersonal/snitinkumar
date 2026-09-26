"use client";

import { useRef, useState, useTransition } from "react";
import {
  addAttributeAction,
  deleteAttributeAction,
  moveAttributeAction,
  setColourHexAction,
} from "@/app/admin/_actions/categories";
import { btnSecondary, input } from "@/components/admin/ui";
import { ColourPalette } from "@/components/admin/colour-palette";

interface Item {
  id: number;
  text: string;
  uses: number;
  hex?: string | null;
}

export function AttributeList({ table, items }: { table: "fabrics" | "colours" | "sizes"; items: Item[] }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useState("");
  const [hex, setHex] = useState("#C0282D");
  const isColour = table === "colours";
  // Colour pickers fire on every drag step; save once the shade settles.
  const hexTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const saveHex = (id: number, next: string) => {
    clearTimeout(hexTimers.current.get(id));
    hexTimers.current.set(
      id,
      setTimeout(() => run(() => setColourHexAction(id, next)), 600),
    );
  };
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Failed");
    });

  return (
    <div className="p-4">
      <ul className="flex flex-wrap gap-2" aria-busy={pending}>
        {items.map((it, i) => (
          <li key={it.id} className="flex items-center rounded-full border border-line bg-cream/50 text-[13px]">
            <button
              onClick={() => run(() => moveAttributeAction(table, it.id, -1))}
              disabled={pending || i === 0}
              className="px-1.5 py-1 text-muted disabled:opacity-30"
              aria-label={`Move ${it.text} earlier`}
            >
              ‹
            </button>
            {isColour && (
              <label
                className="relative mr-1.5 h-4 w-4 cursor-pointer rounded-full border border-ink/20"
                style={{ background: it.hex ?? "var(--color-sand)" }}
                title={`Change swatch for ${it.text}`}
              >
                <input
                  type="color"
                  defaultValue={it.hex ?? "#E4D5C0"}
                  onChange={(e) => saveHex(it.id, e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label={`Swatch colour for ${it.text}`}
                />
              </label>
            )}
            <span className="font-medium">{it.text}</span>
            <span className="ml-1 text-muted">· {it.uses}</span>
            <button
              onClick={() => run(() => moveAttributeAction(table, it.id, 1))}
              disabled={pending || i === items.length - 1}
              className="px-1.5 py-1 text-muted disabled:opacity-30"
              aria-label={`Move ${it.text} later`}
            >
              ›
            </button>
            {it.uses === 0 && (
              <button
                onClick={() => confirm(`Delete "${it.text}"?`) && run(() => deleteAttributeAction(table, it.id))}
                disabled={pending}
                className="pr-2.5 text-maroon"
                aria-label={`Delete ${it.text}`}
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className={isColour ? "mt-4 space-y-2 border-t border-line pt-4" : "mt-3 flex gap-2"}
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const res = await addAttributeAction(table, value, isColour ? hex : undefined);
            if (res.ok) setValue("");
            return res;
          });
        }}
      >
        {isColour ? (
          <>
            <ColourPalette
              value={{ name: value, hex }}
              onChange={(d) => {
                setValue(d.name);
                setHex(d.hex);
              }}
              taken={items.map((it) => it.text)}
            />
            <button disabled={pending || !value.trim()} className={btnSecondary}>
              + Add colour
            </button>
          </>
        ) : (
          <>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Add ${table === "sizes" ? "size" : table.slice(0, -1)}`}
              className={input}
              maxLength={30}
            />
            <button disabled={pending || !value.trim()} className={btnSecondary}>
              + Add
            </button>
          </>
        )}
      </form>
      {error && <p className="mt-2 text-[13px] font-medium text-maroon">{error}</p>}
    </div>
  );
}
