"use client";

import { useId, useState } from "react";
import { input } from "./ui";

type Option = { id: number | string; name: string };
type CreateResult = { ok: true; option: Option } | { ok: false; error: string };

const clean = (s: string) => s.trim().replace(/\s+/g, " ");

/**
 * Type-to-search picker (ARIA combobox) for a list that can grow: typing filters it, and a
 * name that is not in it can be added (e.g. a new fabric), which is saved at once and selected.
 */
export function CreatableCombobox({
  id,
  options: list,
  value,
  onChange,
  onCreate,
  noun,
  placeholder,
  maxLength = 30,
}: {
  id: string;
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  onCreate: (name: string) => Promise<CreateResult>;
  /** "fabric", "trip": used in "+ Add “…” as a new fabric". */
  noun: string;
  placeholder?: string;
  maxLength?: number;
}) {
  const listId = useId();
  const selected = list.find((f) => String(f.id) === value);
  const [query, setQuery] = useState<string | null>(null); // null = not typing, show the selection
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = clean(query ?? "");
  const matches = q ? list.filter((f) => f.name.toLowerCase().includes(q.toLowerCase())) : list;
  const canAdd = q.length > 0 && !list.some((f) => f.name.toLowerCase() === q.toLowerCase());
  const options: ({ kind: "item"; item: Option } | { kind: "add" })[] = [
    ...matches.map((item) => ({ kind: "item" as const, item })),
    ...(canAdd ? [{ kind: "add" as const }] : []),
  ];
  const optionId = (i: number) => `${listId}-${i}`;

  const close = () => {
    setOpen(false);
    setQuery(null);
  };

  async function choose(i: number) {
    const opt = options[i];
    if (!opt) return;
    if (opt.kind === "item") {
      onChange(String(opt.item.id));
      setError(null);
      close();
      return;
    }
    setBusy(true);
    setError(null);
    const res = await onCreate(q);
    setBusy(false);
    if (!res.ok) {
      setOpen(false); // keep the typed name so it can be corrected; the list would cover the message
      return setError(res.error);
    }
    onChange(String(res.option.id));
    close();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      const n = options.length;
      if (n) setActive((a) => (a + (e.key === "ArrowDown" ? 1 : -1) + n) % n);
    } else if (e.key === "Enter") {
      if (!open) return;
      e.preventDefault(); // never submit the product form from here
      void choose(active);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      close();
    }
  }

  return (
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && options.length ? optionId(active) : undefined}
        autoComplete="off"
        maxLength={maxLength}
        placeholder={placeholder ?? `Choose or type a new ${noun}…`}
        value={query ?? selected?.name ?? ""}
        readOnly={busy}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
          setError(null);
        }}
        onFocus={(e) => {
          e.target.select();
          setOpen(true);
          setActive(
            Math.max(
              0,
              list.findIndex((f) => String(f.id) === value),
            ),
          );
        }}
        onClick={() => setOpen(true)}
        onBlur={close}
        onKeyDown={onKeyDown}
        className={`${input} pr-9`}
      />
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-ink"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {open && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-line bg-surface py-1 shadow-lg"
        >
          {options.map((opt, i) => (
            <li
              key={opt.kind === "item" ? opt.item.id : "add"}
              id={optionId(i)}
              role="option"
              aria-selected={opt.kind === "item" && String(opt.item.id) === value}
              // mousedown, not click: keeps focus in the input so blur doesn't close the list first
              onMouseDown={(e) => {
                e.preventDefault();
                void choose(i);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 text-[14px] ${i === active ? "bg-maroon-50" : ""} ${
                opt.kind === "add"
                  ? "border-t border-line font-semibold text-maroon"
                  : String(opt.item.id) === value
                    ? "font-semibold"
                    : ""
              }`}
            >
              {opt.kind === "item" ? opt.item.name : `+ Add “${q}” as a new ${noun}`}
            </li>
          ))}
        </ul>
      )}
      {busy && <p className="mt-1 text-[12px] text-muted">Adding {noun}…</p>}
      {error && <p className="mt-1 text-[12px] font-medium text-maroon">{error}</p>}
    </div>
  );
}
