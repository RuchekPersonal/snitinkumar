import type { CatalogFilters, CatalogItem, CatalogPage } from "./types";

// Filtering, search, sort and paging for the catalogue. Runs in the browser over the
// items the server sent once, so changing a filter needs no request.

export const PAGE_SIZE = 24;

export function filterCatalog(all: CatalogItem[], filters: CatalogFilters, priced: boolean): CatalogPage {
  let rows = all;

  if (filters.category) rows = rows.filter((p) => p.categorySlug === filters.category);
  if (filters.fabric) rows = rows.filter((p) => p.fabric === filters.fabric);
  if (filters.colour) rows = rows.filter((p) => p.colours.includes(filters.colour!));
  if (filters.size) rows = rows.filter((p) => p.sizes.includes(filters.size!));
  if (filters.newOnly) rows = rows.filter((p) => p.isNew);
  // Guests never receive rates, so price filter/sort only apply when priced.
  if (priced && filters.maxRate) rows = rows.filter((p) => (p.ratePaise ?? 0) <= filters.maxRate! * 100);
  if (filters.q) {
    const terms = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
    rows = rows.filter((p) => {
      const hay = `${p.code} ${p.name} ${p.fabric} ${p.colours.join(" ")} ${p.categorySlug} ${p.work}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }

  const sort = filters.sort ?? "newest";
  rows = [...rows].sort((a, b) => {
    if (sort === "popular") return b.popularity - a.popularity;
    if (priced && sort === "price-asc") return (a.ratePaise ?? 0) - (b.ratePaise ?? 0);
    if (priced && sort === "price-desc") return (b.ratePaise ?? 0) - (a.ratePaise ?? 0);
    return b.createdAt.localeCompare(a.createdAt);
  });

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page ?? 1), pageCount);
  const items = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return { items, total, page, pageCount };
}
