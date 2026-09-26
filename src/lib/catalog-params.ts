import type { CatalogFilters } from "./types";

// Filters live in the URL so a filtered view can be shared on WhatsApp (RFD F2).

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const SORTS = ["newest", "popular", "price-asc", "price-desc"] as const;

export function parseFilters(sp: SP): CatalogFilters {
  const max = Number(one(sp.max));
  const page = Number(one(sp.page));
  const sort = one(sp.sort);
  return {
    fabric: one(sp.fabric)?.slice(0, 40),
    colour: one(sp.colour)?.slice(0, 40),
    size: one(sp.size)?.slice(0, 5),
    maxRate: Number.isFinite(max) && max > 0 ? Math.min(max, 100000) : undefined,
    newOnly: one(sp.new) === "1",
    q: one(sp.q)?.trim().slice(0, 80) || undefined,
    sort: SORTS.includes(sort as never) ? (sort as CatalogFilters["sort"]) : undefined,
    page: Number.isInteger(page) && page > 1 ? page : undefined,
  };
}

export function filtersToQuery(f: CatalogFilters): string {
  const q = new URLSearchParams();
  if (f.q) q.set("q", f.q);
  if (f.fabric) q.set("fabric", f.fabric);
  if (f.colour) q.set("colour", f.colour);
  if (f.size) q.set("size", f.size);
  if (f.maxRate) q.set("max", String(f.maxRate));
  if (f.newOnly) q.set("new", "1");
  if (f.sort && f.sort !== "newest") q.set("sort", f.sort);
  if (f.page && f.page > 1) q.set("page", String(f.page));
  const s = q.toString();
  return s ? `?${s}` : "";
}
