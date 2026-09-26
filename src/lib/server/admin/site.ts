import "server-only";
import { DEFAULT_HERO, HERO_SLOTS, HomeHero } from "@/lib/home-content";
import { db } from "../db";
import { requireAdmin } from "../admin-auth";
import { encodeSiteImage } from "../image-variants";
import { readUploadedImage } from "./products";
import { must, refreshCatalog } from "./util";

export async function getHomeAdmin() {
  await requireAdmin();
  const c = db();
  const [setting, images] = await Promise.all([
    c.from("settings").select("value, updated_at").eq("key", "home_hero").maybeSingle(),
    c.from("site_images").select("id, position").eq("kind", "hero"),
  ]);
  const saved = HomeHero.safeParse(setting.data?.value);
  const slots: (string | null)[] = Array.from({ length: HERO_SLOTS }, () => null);
  for (const img of must(images, "hero images") as { id: string; position: number }[]) slots[img.position] = img.id;
  return { hero: saved.success ? saved.data : DEFAULT_HERO, customised: saved.success, slots };
}

export async function saveHomeHero(input: HomeHero) {
  await requireAdmin();
  must(
    await db()
      .from("settings")
      .upsert({ key: "home_hero", value: input, updated_at: new Date().toISOString() }, { onConflict: "key" }),
    "save hero",
  );
  refreshCatalog();
}

export async function resetHomeHero() {
  await requireAdmin();
  must(await db().from("settings").delete().eq("key", "home_hero"), "reset hero");
  refreshCatalog();
}

/** Puts a photo in hero slot `position` (0 = tall tile), replacing any photo already there. */
export async function setHeroImage(position: number, file: File): Promise<{ id: string }> {
  await requireAdmin();
  if (!Number.isInteger(position) || position < 0 || position >= HERO_SLOTS) throw new Error("Invalid slot");
  const encoded = await encodeSiteImage(await readUploadedImage(file), "hero", position);
  const c = db();
  must(await c.from("site_images").delete().eq("kind", "hero").eq("position", position), "clear slot");
  const saved = must(
    await c
      .from("site_images")
      .insert({ kind: "hero", position, ...encoded })
      .select("id")
      .single(),
    "save hero image",
  );
  refreshCatalog();
  return saved;
}

export async function removeHeroImage(position: number) {
  await requireAdmin();
  must(await db().from("site_images").delete().eq("kind", "hero").eq("position", position), "remove hero image");
  refreshCatalog();
}

export async function setCategoryCover(categoryId: number, file: File): Promise<{ id: string }> {
  await requireAdmin();
  const encoded = await encodeSiteImage(await readUploadedImage(file), "category", null);
  const c = db();
  const cat = must(
    await c.from("categories").select("id, cover_image_id").eq("id", categoryId).maybeSingle(),
    "category",
  );
  if (!cat) throw new Error("Category not found");
  const saved = must(
    await c
      .from("site_images")
      .insert({ kind: "category", ...encoded })
      .select("id")
      .single(),
    "save cover",
  );
  must(await c.from("categories").update({ cover_image_id: saved.id }).eq("id", categoryId), "link cover");
  if (cat.cover_image_id) must(await c.from("site_images").delete().eq("id", cat.cover_image_id), "old cover");
  refreshCatalog();
  return saved;
}

export async function removeCategoryCover(categoryId: number) {
  await requireAdmin();
  const c = db();
  const cat = must(await c.from("categories").select("cover_image_id").eq("id", categoryId).maybeSingle(), "category");
  if (cat?.cover_image_id) must(await c.from("site_images").delete().eq("id", cat.cover_image_id), "remove cover");
  refreshCatalog();
}
