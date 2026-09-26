import "server-only";
import type { CatalogFilters, CatalogPage, Category, ProductCard, ProductDetail, Viewer } from "@/lib/types";
import { SIZE_ORDER } from "@/lib/format";
import { canSeePrices } from "./session";
import { categories, colours, fabrics, products, type ProductRow } from "./mock-data";

// Repository for storefront reads. Every function maps rows to DTOs and drops price
// fields unless the viewer may see them, so pages cannot leak rates by accident.

export const PAGE_SIZE = 24;

const today = () => new Date().toISOString().slice(0, 10);
const isNew = (p: ProductRow) => p.newUntil !== null && p.newUntil >= today();
const visible = () => products.filter((p) => p.isVisible);
const imageIdsFor = (p: ProductRow) =>
  Array.from({ length: p.imageCount }, (_, i) => `${p.code.toLowerCase()}-${i + 1}`);

function toCard(p: ProductRow, viewer: Viewer): ProductCard {
  const cat = categories.find((c) => c.slug === p.categorySlug)!;
  const card: ProductCard = {
    code: p.code,
    name: p.name,
    categorySlug: cat.slug,
    categoryName: cat.name,
    fabric: p.fabric,
    colour: p.colour,
    sizes: [...p.sizes].sort((a, b) => SIZE_ORDER.indexOf(a as never) - SIZE_ORDER.indexOf(b as never)),
    moq: p.moq,
    inStock: p.stockPcs > 0,
    isNew: isNew(p),
    coverImageId: imageIdsFor(p)[0] ?? null,
  };
  if (canSeePrices(viewer.role)) card.ratePaise = p.ratePaise;
  return card;
}

export async function listCategories(): Promise<Category[]> {
  const live = visible();
  return categories
    .filter((c) => c.isVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      shortName: c.shortName,
      description: c.description,
      showOnHome: c.showOnHome,
      designCount: live.filter((p) => p.categorySlug === c.slug).length,
    }));
}

export async function getCategory(slug: string): Promise<Category | null> {
  return (await listCategories()).find((c) => c.slug === slug) ?? null;
}

export async function listFacets() {
  const live = visible();
  return {
    fabrics: fabrics.filter((f) => live.some((p) => p.fabric === f)),
    colours: colours.filter((c) => live.some((p) => p.colour === c)),
    sizes: [...SIZE_ORDER],
    totalDesigns: live.length,
    newCount: live.filter(isNew).length,
  };
}

export async function listProducts(filters: CatalogFilters, viewer: Viewer): Promise<CatalogPage> {
  const priced = canSeePrices(viewer.role);
  let rows = visible();

  if (filters.category) rows = rows.filter((p) => p.categorySlug === filters.category);
  if (filters.fabric) rows = rows.filter((p) => p.fabric === filters.fabric);
  if (filters.colour) rows = rows.filter((p) => p.colour === filters.colour);
  if (filters.size) rows = rows.filter((p) => p.sizes.includes(filters.size!));
  if (filters.newOnly) rows = rows.filter(isNew);
  // Price filter/sort only for viewers allowed to see prices, otherwise it would leak rates.
  if (priced && filters.maxRate) rows = rows.filter((p) => p.ratePaise <= filters.maxRate! * 100);
  if (filters.q) {
    const terms = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
    rows = rows.filter((p) => {
      const hay = `${p.code} ${p.name} ${p.fabric} ${p.colour} ${p.categorySlug}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }

  const sort = filters.sort ?? "newest";
  rows = [...rows].sort((a, b) => {
    if (sort === "popular") return b.popularity - a.popularity;
    if (priced && sort === "price-asc") return a.ratePaise - b.ratePaise;
    if (priced && sort === "price-desc") return b.ratePaise - a.ratePaise;
    return b.createdAt.localeCompare(a.createdAt);
  });

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page ?? 1), pageCount);
  const items = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((p) => toCard(p, viewer));
  return { items, total, page, pageCount };
}

export async function listTrending(viewer: Viewer, limit = 8): Promise<ProductCard[]> {
  return visible()
    .filter((p) => p.isTrending)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit)
    .map((p) => toCard(p, viewer));
}

export async function getProduct(code: string, viewer: Viewer): Promise<ProductDetail | null> {
  const p = visible().find((r) => r.code.toLowerCase() === code.toLowerCase());
  if (!p) return null;
  return {
    ...toCard(p, viewer),
    description: p.description,
    work: p.work,
    lengthIn: p.lengthIn,
    setIncludes: p.setIncludes,
    washCare: p.washCare,
    imageIds: imageIdsFor(p),
  };
}

export async function getProductsByCodes(codes: string[], viewer: Viewer): Promise<ProductCard[]> {
  const wanted = new Set(codes.map((c) => c.toUpperCase()));
  return visible()
    .filter((p) => wanted.has(p.code))
    .map((p) => toCard(p, viewer));
}

export async function listRelated(code: string, viewer: Viewer, limit = 4): Promise<ProductCard[]> {
  const p = visible().find((r) => r.code === code);
  if (!p) return [];
  return visible()
    .filter((r) => r.categorySlug === p.categorySlug && r.code !== code)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit)
    .map((r) => toCard(r, viewer));
}

/** Exact product-code match for search ("SN-101", "sn101", "101"). */
export async function findByExactCode(q: string): Promise<string | null> {
  const m = q
    .trim()
    .toUpperCase()
    .match(/^(?:SN)?-?\s?(\d{3,})$/);
  if (!m) return null;
  const code = `SN-${m[1]}`;
  return visible().some((p) => p.code === code) ? code : null;
}

export async function listAllProductCodes(): Promise<{ code: string; updatedAt: string }[]> {
  return visible().map((p) => ({ code: p.code, updatedAt: p.createdAt }));
}

/** Lookup used only by the image route: which colour/label a placeholder should use. */
export async function productForImage(imageId: string) {
  const code = imageId.replace(/-\d+$/, "").toUpperCase();
  const p = visible().find((r) => r.code === code);
  if (!p) return null;
  const index = Number(imageId.match(/-(\d+)$/)?.[1] ?? 1);
  if (index < 1 || index > p.imageCount) return null;
  return { code: p.code, name: p.name, colour: p.colour, fabric: p.fabric, index };
}
