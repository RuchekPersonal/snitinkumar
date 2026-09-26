import "server-only";
import { z } from "zod";
import { db } from "../db";
import { requireAdmin } from "../admin-auth";
import { encodeProductImage } from "../image-variants";
import { istDate, must, refreshCatalog } from "./util";

export const MAX_PHOTOS = 8;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export interface AdminProductRow {
  id: string;
  code: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  fabric: string;
  ratePaise: number;
  moq: number;
  stockPcs: number;
  lowStock: boolean;
  isVisible: boolean;
  isNew: boolean;
  coverImageId: string | null;
  photoCount: number;
}

export interface Lookups {
  categories: { id: number; slug: string; name: string }[];
  fabrics: { id: number; name: string }[];
  colours: { id: number; name: string }[];
  sizes: { id: number; label: string }[];
}

export async function getLookups(): Promise<Lookups> {
  await requireAdmin();
  const c = db();
  const [categories, fabrics, colours, sizes] = await Promise.all([
    c.from("categories").select("id, slug, name").order("sort_order"),
    c.from("fabrics").select("id, name").order("sort_order"),
    c.from("colours").select("id, name").order("sort_order"),
    c.from("sizes").select("id, label").order("sort_order"),
  ]);
  return {
    categories: must(categories, "categories"),
    fabrics: must(fabrics, "fabrics"),
    colours: must(colours, "colours"),
    sizes: must(sizes, "sizes"),
  };
}

export async function listAdminProducts(opts: { q?: string; category?: string; show?: string }) {
  await requireAdmin();
  const rows = must(
    await db()
      .from("products")
      .select(
        "id, code, name, rate_paise, moq, stock_pcs, low_stock_threshold, is_visible, new_until, created_at, categories(slug, name), fabrics(name), product_images(id, position)",
      )
      .order("code", { ascending: false }),
    "products",
  ) as unknown as {
    id: string;
    code: string;
    name: string;
    rate_paise: number;
    moq: number;
    stock_pcs: number;
    low_stock_threshold: number;
    is_visible: boolean;
    new_until: string | null;
    categories: { slug: string; name: string };
    fabrics: { name: string };
    product_images: { id: string; position: number }[];
  }[];

  const today = istDate();
  let items: AdminProductRow[] = rows.map((r) => {
    const imgs = [...r.product_images].sort((a, b) => a.position - b.position);
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      categorySlug: r.categories.slug,
      categoryName: r.categories.name,
      fabric: r.fabrics.name,
      ratePaise: r.rate_paise,
      moq: r.moq,
      stockPcs: r.stock_pcs,
      lowStock: r.stock_pcs <= r.low_stock_threshold,
      isVisible: r.is_visible,
      isNew: !!r.new_until && r.new_until >= today,
      coverImageId: imgs[0]?.id ?? null,
      photoCount: imgs.length,
    };
  });

  const total = items.length;
  const hidden = items.filter((p) => !p.isVisible).length;
  if (opts.q) {
    const q = opts.q.toLowerCase();
    items = items.filter((p) => `${p.code} ${p.name} ${p.fabric}`.toLowerCase().includes(q));
  }
  if (opts.category) items = items.filter((p) => p.categorySlug === opts.category);
  if (opts.show === "hidden") items = items.filter((p) => !p.isVisible);
  if (opts.show === "visible") items = items.filter((p) => p.isVisible);
  if (opts.show === "low") items = items.filter((p) => p.lowStock);
  if (opts.show === "nophoto") items = items.filter((p) => p.photoCount === 0);
  return { items, total, hidden };
}

export async function getAdminProduct(code: string) {
  await requireAdmin();
  const row = must(
    await db()
      .from("products")
      .select("*, product_sizes(size_id), product_images(id, position, alt)")
      .eq("code", code.toUpperCase())
      .maybeSingle(),
    "product",
  );
  if (!row) return null;
  return {
    ...row,
    sizeIds: (row.product_sizes as { size_id: number }[]).map((s) => s.size_id),
    images: (row.product_images as { id: string; position: number; alt: string }[]).sort(
      (a, b) => a.position - b.position,
    ),
  };
}

export async function suggestNextCode(): Promise<string> {
  await requireAdmin();
  const rows = must(await db().from("products").select("code"), "codes") as { code: string }[];
  const max = rows.reduce((m, r) => Math.max(m, Number(r.code.slice(3)) || 0), 100);
  return `SN-${max + 1}`;
}

const rupeesToPaise = (v: unknown) => Math.round(Number(v) * 100);

export const ProductInput = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^SN-\d{3,6}$/, "Code must look like SN-123"),
  name: z.string().trim().min(3, "Design name is required").max(120),
  categoryId: z.coerce.number().int().positive("Pick a category"),
  fabricId: z.coerce.number().int().positive("Pick a fabric"),
  colourId: z.coerce.number().int().positive("Pick a colour"),
  description: z.string().trim().max(2000).default(""),
  work: z.string().trim().max(80).default(""),
  lengthIn: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number().int().min(10).max(80).nullable(),
  ),
  setIncludes: z.string().trim().max(80).default(""),
  washCare: z.string().trim().max(80).default(""),
  rate: z.coerce.number().positive("Rate is required").max(100000),
  mrp: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().positive().max(200000).nullable()),
  moq: z.coerce.number().int().min(1).max(1000),
  stock: z.coerce.number().int().min(0).max(1_000_000),
  sizeIds: z.array(z.coerce.number().int()).min(1, "Pick at least one size"),
  markNew: z.boolean(),
  trending: z.boolean(),
  visible: z.boolean(),
});
export type ProductInput = z.infer<typeof ProductInput>;

/** Creates or updates a product by id. Returns the saved code. */
export async function saveProduct(input: ProductInput, id?: string): Promise<{ id: string; code: string }> {
  await requireAdmin();
  if (input.mrp !== null && input.mrp < input.rate) throw new Error("Suggested MRP must be at least the rate");

  const c = db();
  const clash = must(await c.from("products").select("id").eq("code", input.code).maybeSingle(), "code check");
  if (clash && clash.id !== id) throw new Error(`${input.code} is already used by another design`);

  let newUntil: string | null | undefined;
  if (input.markNew) {
    const existing = id ? must(await c.from("products").select("new_until").eq("id", id).single(), "product") : null;
    newUntil =
      existing?.new_until && existing.new_until >= istDate()
        ? existing.new_until
        : istDate(new Date(Date.now() + 14 * 86_400_000));
  } else {
    newUntil = null;
  }

  const row = {
    code: input.code,
    name: input.name,
    category_id: input.categoryId,
    fabric_id: input.fabricId,
    colour_id: input.colourId,
    description: input.description,
    work: input.work,
    length_in: input.lengthIn,
    set_includes: input.setIncludes,
    wash_care: input.washCare,
    rate_paise: rupeesToPaise(input.rate),
    mrp_paise: input.mrp === null ? null : rupeesToPaise(input.mrp),
    moq: input.moq,
    stock_pcs: input.stock,
    is_visible: input.visible,
    is_trending: input.trending,
    new_until: newUntil,
  };

  const saved = id
    ? must(await c.from("products").update(row).eq("id", id).select("id, code").single(), "update product")
    : must(await c.from("products").insert(row).select("id, code").single(), "insert product");

  must(await c.from("product_sizes").delete().eq("product_id", saved.id), "clear sizes");
  must(
    await c.from("product_sizes").insert(input.sizeIds.map((size_id) => ({ product_id: saved.id, size_id }))),
    "sizes",
  );

  refreshCatalog();
  return saved;
}

export async function setVisibility(id: string, visible: boolean) {
  await requireAdmin();
  must(await db().from("products").update({ is_visible: visible }).eq("id", id), "visibility");
  refreshCatalog();
}

// ---------------------------------------------------------------- photos

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Magic-byte check: trust the file content, not the declared type. */
function sniffImage(buf: Buffer): boolean {
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP";
  return jpeg || png || webp;
}

export async function addProductImage(productId: string, file: File): Promise<{ id: string }> {
  await requireAdmin();
  if (!IMAGE_TYPES.has(file.type)) throw new Error("Only JPG, PNG or WebP photos");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Photo is larger than 5 MB");
  const buf = Buffer.from(await file.arrayBuffer());
  if (!sniffImage(buf)) throw new Error("File is not a valid image");

  const c = db();
  const product = must(await c.from("products").select("id, name").eq("id", productId).maybeSingle(), "product");
  if (!product) throw new Error("Product not found");
  const existing = must(await c.from("product_images").select("position").eq("product_id", productId), "images") as {
    position: number;
  }[];
  if (existing.length >= MAX_PHOTOS) throw new Error(`At most ${MAX_PHOTOS} photos per design`);

  const encoded = await encodeProductImage(buf);
  const position = existing.reduce((m, r) => Math.max(m, r.position + 1), 0);
  const saved = must(
    await c
      .from("product_images")
      .insert({ product_id: productId, position, alt: product.name, ...encoded })
      .select("id")
      .single(),
    "insert image",
  );
  refreshCatalog();
  return saved;
}

export async function deleteProductImage(productId: string, imageId: string) {
  await requireAdmin();
  const c = db();
  must(await c.from("product_images").delete().eq("id", imageId).eq("product_id", productId), "delete image");
  const rest = must(
    await c.from("product_images").select("id").eq("product_id", productId).order("position"),
    "images",
  ) as { id: string }[];
  if (rest.length) {
    must(
      await c.rpc("reorder_product_images", { p_product: productId, p_ids: rest.map((r) => r.id) }),
      "compact order",
    );
  }
  refreshCatalog();
}

export async function reorderProductImages(productId: string, ids: string[]) {
  await requireAdmin();
  must(await db().rpc("reorder_product_images", { p_product: productId, p_ids: ids }), "reorder");
  refreshCatalog();
}

// ---------------------------------------------------------------- CSV

export const CSV_COLUMNS = [
  "code",
  "name",
  "category",
  "fabric",
  "colour",
  "rate",
  "mrp",
  "moq",
  "stock",
  "sizes",
  "visible",
  "trending",
  "new_until",
  "work",
  "length_in",
  "set_includes",
  "wash_care",
  "description",
] as const;

export async function exportProductRows(): Promise<(string | number | boolean | null)[][]> {
  await requireAdmin();
  const rows = must(
    await db()
      .from("products")
      .select(
        "code, name, rate_paise, mrp_paise, moq, stock_pcs, is_visible, is_trending, new_until, work, length_in, set_includes, wash_care, description, categories(slug), fabrics(name), colours(name), product_sizes(sizes(label, sort_order))",
      )
      .order("code"),
    "export",
  ) as unknown as Record<string, unknown>[];
  return [
    [...CSV_COLUMNS],
    ...rows.map((r) => {
      const sizes = (r.product_sizes as { sizes: { label: string; sort_order: number } }[])
        .map((s) => s.sizes)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((s) => s.label)
        .join("|");
      return [
        r.code as string,
        r.name as string,
        (r.categories as { slug: string }).slug,
        (r.fabrics as { name: string }).name,
        (r.colours as { name: string }).name,
        (r.rate_paise as number) / 100,
        r.mrp_paise === null ? "" : (r.mrp_paise as number) / 100,
        r.moq as number,
        r.stock_pcs as number,
        sizes,
        r.is_visible ? "yes" : "no",
        r.is_trending ? "yes" : "no",
        (r.new_until as string) ?? "",
        r.work as string,
        (r.length_in as number) ?? "",
        r.set_includes as string,
        r.wash_care as string,
        r.description as string,
      ];
    }),
  ];
}

export interface ImportReport {
  created: number;
  updated: number;
  errors: { line: number; code: string; message: string }[];
}

/** Upserts products by code from parsed CSV records (header row already mapped to keys). */
export async function importProductRecords(records: Record<string, string>[]): Promise<ImportReport> {
  await requireAdmin();
  const lookups = await getLookups();
  const bySlug = new Map(lookups.categories.map((c) => [c.slug, c.id]));
  const byCatName = new Map(lookups.categories.map((c) => [c.name.toLowerCase(), c.id]));
  const fabric = new Map(lookups.fabrics.map((f) => [f.name.toLowerCase(), f.id]));
  const colour = new Map(lookups.colours.map((c) => [c.name.toLowerCase(), c.id]));
  const size = new Map(lookups.sizes.map((s) => [s.label.toUpperCase(), s.id]));
  const existing = new Map(
    (
      must(await db().from("products").select("id, code, new_until"), "codes") as {
        id: string;
        code: string;
        new_until: string | null;
      }[]
    ).map((p) => [p.code, p]),
  );
  const yes = (v: string | undefined) => /^(yes|y|true|1)$/i.test((v ?? "").trim());

  const report: ImportReport = { created: 0, updated: 0, errors: [] };
  for (const [i, r] of records.entries()) {
    const line = i + 2;
    const code = (r.code ?? "").trim().toUpperCase();
    try {
      const sizeIds = (r.sizes ?? "")
        .split(/[|;\s]+/)
        .filter(Boolean)
        .map((s) => {
          const id = size.get(s.toUpperCase());
          if (!id) throw new Error(`unknown size "${s}"`);
          return id;
        });
      const cat = bySlug.get((r.category ?? "").trim()) ?? byCatName.get((r.category ?? "").trim().toLowerCase());
      if (!cat) throw new Error(`unknown category "${r.category}"`);
      const fab = fabric.get((r.fabric ?? "").trim().toLowerCase());
      if (!fab) throw new Error(`unknown fabric "${r.fabric}"`);
      const col = colour.get((r.colour ?? "").trim().toLowerCase());
      if (!col) throw new Error(`unknown colour "${r.colour}"`);

      const current = existing.get(code);
      const parsed = ProductInput.safeParse({
        code,
        name: r.name,
        categoryId: cat,
        fabricId: fab,
        colourId: col,
        description: r.description ?? "",
        work: r.work ?? "",
        lengthIn: r.length_in ?? "",
        setIncludes: r.set_includes ?? "",
        washCare: r.wash_care ?? "",
        rate: r.rate,
        mrp: r.mrp ?? "",
        moq: r.moq || 3,
        stock: r.stock || 0,
        sizeIds,
        markNew: !!(r.new_until && r.new_until >= istDate()) || (!current && !r.new_until),
        trending: yes(r.trending),
        visible: yes(r.visible),
      });
      if (!parsed.success) throw new Error(parsed.error.issues.map((e) => e.message).join("; "));
      await saveProduct(parsed.data, current?.id);
      if (current) report.updated++;
      else report.created++;
    } catch (err) {
      report.errors.push({ line, code: code || "—", message: (err as Error).message });
    }
  }
  return report;
}
