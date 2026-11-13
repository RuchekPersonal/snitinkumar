"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { CatalogFilters, CatalogItem, Category } from "@/lib/types";
import { catalogTitles, filtersToQuery, parseFilters } from "@/lib/catalog-params";
import { filterCatalog } from "@/lib/catalog-filter";
import { site } from "@/lib/site";
import { ProductGrid } from "@/components/product/product-card";
import { CatalogLink } from "./catalog-nav";
import { FilterPanel, SortSelect } from "./filter-panel";

interface Props {
  items: CatalogItem[];
  categories: Category[];
  facets: { totalDesigns: number; fabrics: string[]; colours: string[]; sizes: string[] };
  priced: boolean;
}

type Crumb = { href?: string; label: string };

// Which catalogue page the URL points at. Filter links move between /catalog,
// /catalog/<category> and /new-arrivals without a server request, so this is derived
// from the live URL rather than from the route that first rendered.
function pageFor(pathname: string, categories: Category[]) {
  const home: Crumb = { href: "/", label: "Home" };
  if (pathname === "/new-arrivals") {
    return {
      basePath: pathname,
      newOnly: true,
      heading: "New arrivals",
      docTitle: catalogTitles.newArrivals,
      crumbs: [home, { label: "New arrivals" }],
    };
  }
  const slug = pathname.startsWith("/catalog/") ? decodeURIComponent(pathname.slice("/catalog/".length)) : null;
  const category = slug ? categories.find((c) => c.slug === slug) : undefined;
  if (category) {
    return {
      basePath: `/catalog/${category.slug}`,
      newOnly: false,
      category,
      heading: category.name,
      docTitle: catalogTitles.category(category.name),
      crumbs: [home, { href: "/catalog", label: "Catalog" }, { label: category.name }],
    };
  }
  return {
    basePath: "/catalog",
    newOnly: false,
    heading: null,
    docTitle: catalogTitles.all,
    crumbs: [home, { label: "Wholesale catalog" }],
  };
}

export function CatalogBrowser({ items, categories, facets, priced }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = useMemo(() => pageFor(pathname, categories), [pathname, categories]);
  const { basePath } = view;

  const query = searchParams.toString();
  const filters: CatalogFilters = useMemo(() => {
    const parsed = parseFilters(Object.fromEntries(new URLSearchParams(query)));
    return view.newOnly ? { ...parsed, newOnly: true } : parsed;
  }, [query, view.newOnly]);
  const page = useMemo(
    () => filterCatalog(items, { ...filters, category: view.category?.slug }, priced),
    [items, filters, view.category, priced],
  );
  const title = view.heading ?? (filters.q ? `Results for “${filters.q}”` : "Product catalog");

  useEffect(() => {
    document.title = `${view.docTitle} · ${site.name}`;
  }, [view.docTitle]);

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
    activeCategory: view.category?.slug,
    totalDesigns: facets.totalDesigns,
    fabrics: facets.fabrics,
    colours: facets.colours,
    sizes: facets.sizes,
    priced,
    activeCount: chips.length,
    resultCount: page.total,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 lg:px-6 lg:pt-8">
      <nav aria-label="Breadcrumb" className="text-[13px] text-muted">
        {view.crumbs.map((c, i) => (
          <span key={c.label}>
            {i > 0 && <span className="mx-1.5">/</span>}
            {c.href === "/catalog" ? (
              <CatalogLink href={c.href} className="hover:text-maroon">
                {c.label}
              </CatalogLink>
            ) : c.href ? (
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
          <h1 className="font-serif text-[30px] leading-tight lg:text-4xl">{title}</h1>
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
                <CatalogLink
                  key={c.label}
                  href={`${basePath}${filtersToQuery({ ...filters, ...c.remove, page: undefined })}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-maroon/40 bg-maroon-50 px-3 text-[13px] font-medium text-maroon"
                  aria-label={`Remove filter ${c.label}`}
                >
                  {c.label} <span aria-hidden>×</span>
                </CatalogLink>
              ))}
              <CatalogLink
                href={basePath}
                className="inline-flex h-9 items-center px-2 text-[13px] font-semibold text-muted underline"
              >
                Clear all
              </CatalogLink>
            </div>
          )}

          {page.items.length === 0 ? (
            <div className="rounded-lg border border-line bg-surface p-10 text-center">
              <p className="font-serif text-2xl">No designs match these filters</p>
              <p className="mt-2 text-[14px] text-muted">Try removing a filter, or ask us on WhatsApp.</p>
              <CatalogLink
                href={basePath}
                className="mt-5 inline-flex h-11 items-center rounded-md bg-maroon px-5 font-semibold text-white"
              >
                Clear filters
              </CatalogLink>
            </div>
          ) : (
            <ProductGrid products={page.items} priorityCount={2} showSizes />
          )}

          {page.pageCount > 1 && (
            <nav aria-label="Pages" className="mt-10 flex flex-wrap justify-center gap-2">
              {Array.from({ length: page.pageCount }, (_, i) => i + 1).map((n) => (
                <CatalogLink
                  key={n}
                  href={`${basePath}${filtersToQuery({ ...filters, page: n })}`}
                  scrollTop
                  aria-current={n === page.page ? "page" : undefined}
                  className={`grid h-11 min-w-11 place-items-center rounded-md border px-3 text-[14px] font-semibold ${
                    n === page.page ? "border-maroon bg-maroon text-white" : "border-line bg-surface"
                  }`}
                >
                  {n}
                </CatalogLink>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
