"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import type { CatalogFilters, Category } from "@/lib/types";
import { filtersToQuery } from "@/lib/catalog-params";
import { CloseIcon, FilterIcon } from "@/components/icons";

interface Props {
  basePath: string;
  filters: CatalogFilters;
  categories: Category[];
  activeCategory?: string;
  totalDesigns: number;
  fabrics: string[];
  colours: string[];
  sizes: string[];
  priced: boolean;
  activeCount: number;
  mode: "mobile" | "desktop";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-t border-line py-5 first:border-t-0 first:pt-0">
      <legend className="eyebrow float-left mb-3 w-full text-muted">{title}</legend>
      <div className="clear-left">{children}</div>
    </fieldset>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-10 min-w-11 rounded-md border px-3 text-[14px] ${
        active ? "border-maroon bg-maroon text-white" : "border-line bg-surface hover:border-gold"
      }`}
    >
      {children}
    </button>
  );
}

// Keyed on the URL value by the parent, so it resets when filters change elsewhere.
function PriceSlider({ initial, onCommit }: { initial: number; onCommit: (v: number) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <Section title={`Max price · ₹${value.toLocaleString("en-IN")} / pc`}>
      <input
        type="range"
        min={300}
        max={5000}
        step={50}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        onPointerUp={() => onCommit(value)}
        onKeyUp={() => onCommit(value)}
        className="w-full accent-maroon"
        aria-label="Maximum price per piece"
      />
      <div className="mt-1 flex justify-between text-[12px] text-muted">
        <span>₹300</span>
        <span>₹5,000</span>
      </div>
    </Section>
  );
}

export function FilterPanel(props: Props) {
  const { basePath, filters, categories, activeCategory, priced } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const apply = (patch: Partial<CatalogFilters>) => {
    const next = { ...filters, ...patch, page: undefined };
    startTransition(() => router.push(`${basePath}${filtersToQuery(next)}`, { scroll: false }));
  };
  const toggle = <K extends "fabric" | "colour" | "size">(key: K, value: string) =>
    apply({ [key]: filters[key] === value ? undefined : value } as Partial<CatalogFilters>);

  const body = (
    <div className={pending ? "opacity-60 transition-opacity" : ""}>
      <Section title="Category">
        <ul className="space-y-1 text-[15px]">
          <li>
            <Link
              href={`/catalog${filtersToQuery({ ...filters, page: undefined })}`}
              className={`block py-1.5 ${!activeCategory ? "font-semibold text-maroon" : ""}`}
            >
              All ({props.totalDesigns})
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/catalog/${c.slug}${filtersToQuery({ ...filters, page: undefined })}`}
                className={`block py-1.5 ${activeCategory === c.slug ? "font-semibold text-maroon" : ""}`}
              >
                {c.name} ({c.designCount})
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Fabric">
        <div className="flex flex-wrap gap-2">
          {props.fabrics.map((f) => (
            <Pill key={f} active={filters.fabric === f} onClick={() => toggle("fabric", f)}>
              {f}
            </Pill>
          ))}
        </div>
      </Section>
      <Section title="Colour">
        <div className="flex flex-wrap gap-2">
          {props.colours.map((c) => (
            <Pill key={c} active={filters.colour === c} onClick={() => toggle("colour", c)}>
              {c}
            </Pill>
          ))}
        </div>
      </Section>
      <Section title="Size">
        <div className="flex flex-wrap gap-2">
          {props.sizes.map((s) => (
            <Pill key={s} active={filters.size === s} onClick={() => toggle("size", s)}>
              {s}
            </Pill>
          ))}
        </div>
      </Section>
      {priced && (
        <PriceSlider
          key={filters.maxRate ?? "any"}
          initial={filters.maxRate ?? 5000}
          onCommit={(v) => apply({ maxRate: v >= 5000 ? undefined : v })}
        />
      )}
      <Section title="Other">
        <label className="flex min-h-11 items-center gap-3 text-[15px]">
          <input
            type="checkbox"
            checked={!!filters.newOnly}
            onChange={(e) => apply({ newOnly: e.target.checked || undefined })}
            className="h-5 w-5 accent-maroon"
          />
          New arrivals only
        </label>
      </Section>
    </div>
  );

  if (props.mode === "desktop") {
    return (
      <aside className="sticky top-24 rounded-lg border border-line bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold">Filters</h2>
          <Link href={basePath} className="text-[13px] font-semibold text-maroon underline underline-offset-2">
            Clear all
          </Link>
        </div>
        {body}
      </aside>
    );
  }

  return (
    <>
      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-md border border-line bg-surface px-4 text-[14px] font-semibold lg:hidden"
      >
        <FilterIcon width={18} height={18} /> Filters
        {props.activeCount > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-maroon px-1 text-[11px] text-white">
            {props.activeCount}
          </span>
        )}
      </button>

      {/* Mobile bottom sheet */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button className="absolute inset-0 bg-ink/50" aria-label="Close filters" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl bg-cream">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="font-serif text-xl font-semibold">Filters</h2>
              <div className="flex items-center gap-2">
                <Link
                  href={basePath}
                  onClick={() => setOpen(false)}
                  className="px-2 text-[14px] font-semibold text-maroon"
                >
                  Clear all
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  className="grid h-11 w-11 place-items-center"
                  aria-label="Close filters"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-5">{body}</div>
            <div className="border-t border-line p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <button
                onClick={() => setOpen(false)}
                className="h-12 w-full rounded-md bg-maroon font-semibold text-white"
              >
                Show results
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function SortSelect({
  basePath,
  filters,
  priced,
}: {
  basePath: string;
  filters: CatalogFilters;
  priced: boolean;
}) {
  const router = useRouter();
  return (
    <label className="inline-flex items-center gap-2 text-[14px]">
      <span className="hidden text-muted sm:inline">Sort by</span>
      <select
        value={filters.sort ?? "newest"}
        onChange={(e) =>
          router.push(
            `${basePath}${filtersToQuery({ ...filters, sort: e.target.value as CatalogFilters["sort"], page: undefined })}`,
          )
        }
        className="h-11 rounded-md border border-line bg-surface px-3 text-[14px] font-medium"
        aria-label="Sort designs"
      >
        <option value="newest">Newest</option>
        <option value="popular">Most popular</option>
        {priced && <option value="price-asc">Price: low to high</option>}
        {priced && <option value="price-desc">Price: high to low</option>}
      </select>
    </label>
  );
}
