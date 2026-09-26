import Link from "next/link";
import type { CatalogFilters, Category, Viewer } from "@/lib/types";
import { filtersToQuery } from "@/lib/catalog-params";
import { canSeePrices } from "@/lib/server/session";
import { listCategories, listFacets, listProducts } from "@/lib/server/catalog";
import { ProductGrid } from "@/components/product/product-card";
import { FilterPanel, SortSelect } from "./filter-panel";

interface Props {
  viewer: Viewer;
  filters: CatalogFilters;
  basePath: string;
  title: string;
  crumbs: { href?: string; label: string }[];
  category?: Category;
}

export async function CatalogView({ viewer, filters, basePath, title, crumbs, category }: Props) {
  const priced = canSeePrices(viewer.role);
  const [page, categories, facets] = await Promise.all([
    listProducts({ ...filters, category: category?.slug }, viewer),
    listCategories(),
    listFacets(),
  ]);

  const chips: { label: string; remove: Partial<CatalogFilters> }[] = [];
  if (filters.q) chips.push({ label: `“${filters.q}”`, remove: { q: undefined } });
  if (filters.fabric) chips.push({ label: filters.fabric, remove: { fabric: undefined } });
  if (filters.colour) chips.push({ label: filters.colour, remove: { colour: undefined } });
  if (filters.size) chips.push({ label: `Size: ${filters.size}`, remove: { size: undefined } });
  if (priced && filters.maxRate)
    chips.push({ label: `Under ₹${filters.maxRate.toLocaleString("en-IN")}`, remove: { maxRate: undefined } });
  if (filters.newOnly && basePath !== "/new-arrivals")
    chips.push({ label: "New arrivals", remove: { newOnly: undefined } });

  const panelProps = {
    basePath,
    filters,
    categories,
    activeCategory: category?.slug,
    totalDesigns: facets.totalDesigns,
    fabrics: facets.fabrics,
    colours: facets.colours,
    sizes: facets.sizes,
    priced,
    activeCount: chips.length,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 lg:px-6 lg:pt-8">
      <nav aria-label="Breadcrumb" className="text-[13px] text-muted">
        {crumbs.map((c, i) => (
          <span key={c.label}>
            {i > 0 && <span className="mx-1.5">/</span>}
            {c.href ? (
              <Link href={c.href} className="hover:text-maroon">
                {c.label}
              </Link>
            ) : (
              <span className="text-ink">{c.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[30px] leading-tight font-semibold lg:text-4xl">{title}</h1>
          <p className="mt-1 text-[14px] text-muted">
            Showing {page.total} {page.total === 1 ? "design" : "designs"}
            {priced ? " · rates per piece" : " · log in to see wholesale rates"}
          </p>
        </div>
        <div className="flex gap-2">
          <FilterPanel mode="mobile" {...panelProps} />
          <SortSelect basePath={basePath} filters={filters} priced={priced} />
        </div>
      </div>

      <div className="mt-6 lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
        <div className="hidden lg:block">
          <FilterPanel mode="desktop" {...panelProps} />
        </div>
        <div>
          {chips.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {chips.map((c) => (
                <Link
                  key={c.label}
                  href={`${basePath}${filtersToQuery({ ...filters, ...c.remove, page: undefined })}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-maroon/40 bg-maroon-50 px-3 text-[13px] font-medium text-maroon"
                  aria-label={`Remove filter ${c.label}`}
                >
                  {c.label} <span aria-hidden>×</span>
                </Link>
              ))}
              <Link
                href={basePath}
                className="inline-flex h-9 items-center px-2 text-[13px] font-semibold text-muted underline"
              >
                Clear all
              </Link>
            </div>
          )}

          {page.items.length === 0 ? (
            <div className="rounded-lg border border-line bg-surface p-10 text-center">
              <p className="font-serif text-2xl font-semibold">No designs match these filters</p>
              <p className="mt-2 text-[14px] text-muted">Try removing a filter, or ask us on WhatsApp.</p>
              <Link
                href={basePath}
                className="mt-5 inline-flex h-11 items-center rounded-md bg-maroon px-5 font-semibold text-white"
              >
                Clear filters
              </Link>
            </div>
          ) : (
            <ProductGrid products={page.items} priorityCount={2} showSizes />
          )}

          {page.pageCount > 1 && (
            <nav aria-label="Pages" className="mt-10 flex flex-wrap justify-center gap-2">
              {Array.from({ length: page.pageCount }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={`${basePath}${filtersToQuery({ ...filters, page: n })}`}
                  aria-current={n === page.page ? "page" : undefined}
                  className={`grid h-11 min-w-11 place-items-center rounded-md border px-3 text-[14px] font-semibold ${
                    n === page.page ? "border-maroon bg-maroon text-white" : "border-line bg-surface"
                  }`}
                >
                  {n}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
