import "server-only";
import { z } from "zod";
import { db } from "../db";
import { requireAdmin } from "../admin-auth";
import { must, refreshCatalog } from "./util";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

/** Swatch shade shown next to the colour name in the admin and on product pages. */
export async function setColourHex(id: number, hex: string) {
  await requireAdmin();
  if (!HEX_RE.test(hex)) throw new Error("Pick a valid colour");
  must(await db().from("colours").update({ hex: hex.toUpperCase() }).eq("id", id), "colour hex");
  refreshCatalog();
}

export type AttributeTable = "fabrics" | "colours" | "sizes";
const ATTR_LABEL: Record<AttributeTable, "name" | "label"> = { fabrics: "name", colours: "name", sizes: "label" };

export async function getCategoriesPage() {
  await requireAdmin();
  const c = db();
  const [cats, fabrics, colours, sizes, products] = await Promise.all([
    c
      .from("categories")
      .select("id, slug, name, short_name, description, show_on_home, is_visible, sort_order")
      .order("sort_order"),
    c.from("fabrics").select("id, name, sort_order").order("sort_order"),
    c.from("colours").select("id, name, hex, sort_order").order("sort_order"),
    c.from("sizes").select("id, label, sort_order").order("sort_order"),
    c.from("products").select("category_id, fabric_id, colour_id"),
  ]);
  const prods = must(products, "products") as { category_id: number; fabric_id: number; colour_id: number }[];
  const count = (key: "category_id" | "fabric_id" | "colour_id", id: number) =>
    prods.filter((p) => p[key] === id).length;
  const sizeUse = must(await c.from("product_sizes").select("size_id"), "sizes use") as { size_id: number }[];

  return {
    categories: (
      must(cats, "categories") as {
        id: number;
        slug: string;
        name: string;
        short_name: string;
        description: string;
        show_on_home: boolean;
        is_visible: boolean;
      }[]
    ).map((x) => ({ ...x, designs: count("category_id", x.id) })),
    fabrics: (must(fabrics, "fabrics") as { id: number; name: string }[]).map((x) => ({
      ...x,
      uses: count("fabric_id", x.id),
    })),
    colours: (must(colours, "colours") as { id: number; name: string; hex: string | null }[]).map((x) => ({
      ...x,
      uses: count("colour_id", x.id),
    })),
    sizes: (must(sizes, "sizes") as { id: number; label: string }[]).map((x) => ({
      ...x,
      uses: sizeUse.filter((u) => u.size_id === x.id).length,
    })),
  };
}

export const CategoryInput = z.object({
  name: z.string().trim().min(2, "Name is required").max(60),
  shortName: z.string().trim().max(20),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug: lowercase letters, numbers and hyphens"),
  description: z.string().trim().max(300),
  showOnHome: z.boolean(),
  visible: z.boolean(),
});

export async function saveCategory(input: z.infer<typeof CategoryInput>, id?: number) {
  await requireAdmin();
  const c = db();
  const row = {
    name: input.name,
    short_name: input.shortName || input.name,
    slug: input.slug,
    description: input.description,
    show_on_home: input.showOnHome,
    is_visible: input.visible,
  };
  const { error } = id
    ? await c.from("categories").update(row).eq("id", id)
    : await c.from("categories").insert({
        ...row,
        sort_order:
          ((
            must(
              await c.from("categories").select("sort_order").order("sort_order", { ascending: false }).limit(1),
              "order",
            ) as {
              sort_order: number;
            }[]
          )[0]?.sort_order ?? 0) + 1,
      });
  if (error?.code === "23505") throw new Error(`The URL /catalog/${input.slug} is already used`);
  if (error) throw new Error(error.message);
  refreshCatalog();
}

/** Swaps sort_order with the neighbour above/below. */
async function move(table: "categories" | AttributeTable, id: number, dir: -1 | 1) {
  const c = db();
  const rows = must(await c.from(table).select("id, sort_order").order("sort_order"), table) as {
    id: number;
    sort_order: number;
  }[];
  const i = rows.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return;
  // Renumber so equal sort_orders cannot stall the swap.
  const ordered = rows.map((r) => r.id);
  [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
  for (const [n, rid] of ordered.entries())
    must(await c.from(table).update({ sort_order: n }).eq("id", rid), "reorder");
}

export async function moveCategory(id: number, dir: -1 | 1) {
  await requireAdmin();
  await move("categories", id, dir);
  refreshCatalog();
}

export async function addAttribute(table: AttributeTable, value: string, hex?: string) {
  await requireAdmin();
  const v = value.trim();
  if (!v || v.length > 30) throw new Error("Enter a name up to 30 characters");
  const c = db();
  const last = must(
    await c.from(table).select("sort_order").order("sort_order", { ascending: false }).limit(1),
    table,
  ) as {
    sort_order: number;
  }[];
  const { error } = await c.from(table).insert({
    [ATTR_LABEL[table]]: table === "sizes" ? v.toUpperCase() : v,
    sort_order: (last[0]?.sort_order ?? 0) + 1,
    ...(table === "colours" && hex && HEX_RE.test(hex) ? { hex: hex.toUpperCase() } : {}),
  });
  if (error?.code === "23505") throw new Error(`"${v}" already exists`);
  if (error) throw new Error(error.message);
  refreshCatalog();
}

export async function deleteAttribute(table: AttributeTable, id: number) {
  await requireAdmin();
  const { error } = await db().from(table).delete().eq("id", id);
  if (error?.code === "23503") throw new Error("Still used by some designs — change those designs first");
  if (error) throw new Error(error.message);
  refreshCatalog();
}

export async function moveAttribute(table: AttributeTable, id: number, dir: -1 | 1) {
  await requireAdmin();
  await move(table, id, dir);
  refreshCatalog();
}

/**
 * Creates a colour from the product form (or returns the existing one with the same name,
 * ignoring case) so it can be selected straight away.
 */
export async function createColour(
  nameRaw: string,
  hex: string,
): Promise<{ id: number; name: string; hex: string | null }> {
  await requireAdmin();
  const name = nameRaw.trim().replace(/\s+/g, " ");
  if (!name || name.length > 30) throw new Error("Enter a colour name up to 30 characters");
  if (!HEX_RE.test(hex)) throw new Error("Pick a shade");
  const c = db();
  const existing = must(await c.from("colours").select("id, name, hex").ilike("name", name).maybeSingle(), "colour");
  if (existing) return existing as { id: number; name: string; hex: string | null };
  const last = must(
    await c.from("colours").select("sort_order").order("sort_order", { ascending: false }).limit(1),
    "order",
  ) as {
    sort_order: number;
  }[];
  const created = must(
    await c
      .from("colours")
      .insert({ name, hex: hex.toUpperCase(), sort_order: (last[0]?.sort_order ?? 0) + 1 })
      .select("id, name, hex")
      .single(),
    "create colour",
  );
  refreshCatalog();
  return created as { id: number; name: string; hex: string | null };
}
