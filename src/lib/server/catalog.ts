import "server-only";
import { unstable_cache } from "next/cache";
import type { CatalogFilters, CatalogPage, Category, ProductCard, ProductDetail, Viewer } from "@/lib/types";
import { canSeePrices } from "./session";
import { db } from "./db";

// Repository for storefront reads. Every function maps rows to DTOs and drops price
// fields unless the viewer may see them, so pages cannot leak rates by accident.
//
// The visible catalogue (a few hundred designs, no image bytes) is loaded once and cached
// on the server under the "catalog" tag; filtering happens in memory. Admin saves call
// revalidateTag("catalog") so changes show immediately.

export const PAGE_SIZE = 24;
export const CATALOG_TAG = "catalog";

interface ProductRow {
  id: string;
  code: string;
  name: string;
  categorySlug: string;
  fabric: string;
  colour: string;
  description: string;
  work: string;
  lengthIn: number | null;
  setIncludes: string;
  washCare: string;
  ratePaise: number;
  moq: number;
  stockPcs: number;
  sizes: string[];
  isTrending: boolean;
  newUntil: string | null;
  popularity: number;
  createdAt: string;
  updatedAt: string;
  imageIds: string[];
  colours: string[]; // available colourways, primary first
}

interface CategoryRow {
  slug: string;
  name: string;
  short_name: string;
  description: string;
  show_on_home: boolean;
}

interface Snapshot {
  products: ProductRow[];
  categories: CategoryRow[];
  fabrics: string[];
  colours: string[];
  colourHex: Record<string, string | null>;
  sizes: string[];
}

async function fetchSnapshot(): Promise<Snapshot> {
  const client = db();
  const [products, categories, fabrics, colours, sizes] = await Promise.all([
    client
      .from("product_catalog")
      .select(
        "id, code, name, description, work, length_in, set_includes, wash_care, rate_paise, moq, stock_pcs, is_trending, new_until, popularity, created_at, updated_at, category_slug, fabric, colour, sizes, image_ids, colours",
      )
      .eq("is_visible", true),
    client
      .from("categories")
      .select("slug, name, short_name, description, show_on_home")
      .eq("is_visible", true)
      .order("sort_order"),
    client.from("fabrics").select("name").order("sort_order"),
    client.from("colours").select("name, hex").order("sort_order"),
    client.from("sizes").select("label").order("sort_order"),
  ]);
  for (const r of [products, categories, fabrics, colours, sizes]) {
    if (r.error) throw new Error(`catalog load failed: ${r.error.message}`);
  }

  return {
    products: products.data!.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      categorySlug: p.category_slug,
      fabric: p.fabric,
      colour: p.colour,
      description: p.description,
      work: p.work,
      lengthIn: p.length_in,
      setIncludes: p.set_includes,
      washCare: p.wash_care,
      ratePaise: p.rate_paise,
      moq: p.moq,
      stockPcs: p.stock_pcs,
      sizes: p.sizes,
      isTrending: p.is_trending,
      newUntil: p.new_until,
      popularity: p.popularity,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      imageIds: p.image_ids,
      colours: p.colours?.length ? p.colours : [p.colour],
    })),
    categories: categories.data!,
    fabrics: fabrics.data!.map((f) => f.name),
    colours: colours.data!.map((c) => c.name),
    colourHex: Object.fromEntries(colours.data!.map((c) => [c.name, c.hex])),
    sizes: sizes.data!.map((s) => s.label),
  };
}

const snapshot = unstable_cache(fetchSnapshot, ["catalog-snapshot-v2"], {
  revalidate: 300,
  tags: [CATALOG_TAG],
});

// India time, so "new for 14 days" flips at local midnight rather than UTC.
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const isNew = (p: ProductRow) => p.newUntil !== null && p.newUntil >= today();

function toCard(p: ProductRow, snap: Snapshot, viewer: Viewer): ProductCard {
  const card: ProductCard = {
    code: p.code,
    name: p.name,
    categorySlug: p.categorySlug,
    categoryName: snap.categories.find((c) => c.slug === p.categorySlug)?.name ?? "",
    fabric: p.fabric,
    colour: p.colour,
    sizes: p.sizes,
    moq: p.moq,
    inStock: p.stockPcs > 0,
    isNew: isNew(p),
    coverImageId: p.imageIds[0] ?? null,
  };
  if (canSeePrices(viewer.role)) card.ratePaise = p.ratePaise;
  return card;
}

// Products in hidden categories are not shown anywhere on the storefront.
const live = (snap: Snapshot) => snap.products.filter((p) => snap.categories.some((c) => c.slug === p.categorySlug));

export async function listCategories(): Promise<Category[]> {
  const snap = await snapshot();
  const products = live(snap);
  return snap.categories.map((c) => ({
    slug: c.slug,
    name: c.name,
    shortName: c.short_name,
    description: c.description,
    showOnHome: c.show_on_home,
    designCount: products.filter((p) => p.categorySlug === c.slug).length,
  }));
}

export async function getCategory(slug: string): Promise<Category | null> {
  return (await listCategories()).find((c) => c.slug === slug) ?? null;
}

export async function listFacets() {
  const snap = await snapshot();
  const products = live(snap);
  return {
    fabrics: snap.fabrics.filter((f) => products.some((p) => p.fabric === f)),
    colours: snap.colours.filter((c) => products.some((p) => p.colours.includes(c))),
    sizes: snap.sizes,
    totalDesigns: products.length,
    newCount: products.filter(isNew).length,
  };
}

export async function listProducts(filters: CatalogFilters, viewer: Viewer): Promise<CatalogPage> {
  const snap = await snapshot();
  const priced = canSeePrices(viewer.role);
  let rows = live(snap);

  if (filters.category) rows = rows.filter((p) => p.categorySlug === filters.category);
  if (filters.fabric) rows = rows.filter((p) => p.fabric === filters.fabric);
  if (filters.colour) rows = rows.filter((p) => p.colours.includes(filters.colour!));
  if (filters.size) rows = rows.filter((p) => p.sizes.includes(filters.size!));
  if (filters.newOnly) rows = rows.filter(isNew);
  // Price filter/sort only for viewers allowed to see prices, otherwise it would leak rates.
  if (priced && filters.maxRate) rows = rows.filter((p) => p.ratePaise <= filters.maxRate! * 100);
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
    if (priced && sort === "price-asc") return a.ratePaise - b.ratePaise;
    if (priced && sort === "price-desc") return b.ratePaise - a.ratePaise;
    return b.createdAt.localeCompare(a.createdAt);
  });

  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page ?? 1), pageCount);
  const items = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((p) => toCard(p, snap, viewer));
  return { items, total, page, pageCount };
}

export async function listTrending(viewer: Viewer, limit = 8): Promise<ProductCard[]> {
  const snap = await snapshot();
  return live(snap)
    .filter((p) => p.isTrending)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit)
    .map((p) => toCard(p, snap, viewer));
}

export async function getProduct(code: string, viewer: Viewer): Promise<ProductDetail | null> {
  const snap = await snapshot();
  const p = live(snap).find((r) => r.code.toLowerCase() === code.toLowerCase());
  if (!p) return null;
  return {
    ...toCard(p, snap, viewer),
    description: p.description,
    work: p.work,
    lengthIn: p.lengthIn,
    setIncludes: p.setIncludes,
    washCare: p.washCare,
    imageIds: p.imageIds,
    availableColours: p.colours.map((name) => ({ name, hex: snap.colourHex[name] ?? null })),
  };
}

export async function getProductsByCodes(codes: string[], viewer: Viewer): Promise<ProductCard[]> {
  const snap = await snapshot();
  const wanted = new Set(codes.map((c) => c.toUpperCase()));
  return live(snap)
    .filter((p) => wanted.has(p.code))
    .map((p) => toCard(p, snap, viewer));
}

/** Internal: ids and current rates for enquiry snapshots. Never returned to the browser. */
export async function getEnquiryProducts(codes: string[]) {
  const snap = await snapshot();
  const wanted = new Set(codes.map((c) => c.toUpperCase()));
  return live(snap)
    .filter((p) => wanted.has(p.code))
    .map((p) => ({ id: p.id, code: p.code, name: p.name, ratePaise: p.ratePaise, moq: p.moq, sizes: p.sizes }));
}

export async function listRelated(code: string, viewer: Viewer, limit = 4): Promise<ProductCard[]> {
  const snap = await snapshot();
  const products = live(snap);
  const p = products.find((r) => r.code === code);
  if (!p) return [];
  return products
    .filter((r) => r.categorySlug === p.categorySlug && r.code !== code)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit)
    .map((r) => toCard(r, snap, viewer));
}

/** Exact product-code match for search ("SN-101", "sn101", "101"). */
export async function findByExactCode(q: string): Promise<string | null> {
  const m = q
    .trim()
    .toUpperCase()
    .match(/^(?:SN)?-?\s?(\d{3,})$/);
  if (!m) return null;
  const code = `SN-${m[1]}`;
  const snap = await snapshot();
  return live(snap).some((p) => p.code === code) ? code : null;
}

export async function listAllProductCodes(): Promise<{ code: string; updatedAt: string }[]> {
  const snap = await snapshot();
  return live(snap).map((p) => ({ code: p.code, updatedAt: p.updatedAt }));
}
