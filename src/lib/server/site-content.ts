import "server-only";
import { unstable_cache } from "next/cache";
import { DEFAULT_HERO, HERO_SLOTS, HomeHero, type HomeContent } from "@/lib/home-content";
import { CATALOG_TAG } from "./catalog";
import { db } from "./db";

// Home-page content for the storefront. Cached with the catalogue (same tag), so admin
// saves refresh both immediately.

async function fetchHomeContent(): Promise<HomeContent> {
  const client = db();
  const [setting, images] = await Promise.all([
    client.from("settings").select("value").eq("key", "home_hero").maybeSingle(),
    client.from("site_images").select("id, position").eq("kind", "hero"),
  ]);
  if (images.error) throw new Error(`home images: ${images.error.message}`);

  // Anything missing or invalid falls back to the default wording, field by field.
  const saved = HomeHero.partial().safeParse(setting.data?.value ?? {});
  const hero: HomeHero = { ...DEFAULT_HERO, ...(saved.success ? saved.data : {}) };
  if (hero.stats?.length !== 3) hero.stats = DEFAULT_HERO.stats;

  const heroImageIds: (string | null)[] = Array.from({ length: HERO_SLOTS }, () => null);
  for (const img of images.data ?? []) {
    if (img.position !== null && img.position < HERO_SLOTS) heroImageIds[img.position] = img.id;
  }
  return { hero, heroImageIds };
}

export const getHomeContent = unstable_cache(fetchHomeContent, ["home-content-v1"], {
  revalidate: 300,
  tags: [CATALOG_TAG],
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Bytes of a site image variant (full / thumb / og), or null. */
export async function getSiteImage(id: string, variant: "full" | "thumb" | "og"): Promise<Buffer | null> {
  if (!UUID_RE.test(id)) return null;
  const column = `${variant}_b64`;
  const { data, error } = await db().from("site_images").select(column).eq("id", id).maybeSingle();
  if (error) throw new Error(`site image lookup failed: ${error.message}`);
  const b64 = (data as Record<string, string | null> | null)?.[column];
  return b64 ? Buffer.from(b64, "base64") : null;
}
