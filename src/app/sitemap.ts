import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { listAllProductCodes, listCategories } from "@/lib/server/catalog";

// Built on request (data is cached), so deployments never depend on the database being reachable.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl().origin;
  const [categories, products] = await Promise.all([listCategories(), listAllProductCodes()]);
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/catalog`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/new-arrivals`, changeFrequency: "daily", priority: 0.8 },
    ...categories.map((c) => ({ url: `${base}/catalog/${c.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...products.map((p) => ({ url: `${base}/product/${p.code}`, lastModified: p.updatedAt, priority: 0.7 })),
    ...["/terms", "/about", "/contact"].map((p) => ({ url: `${base}${p}`, priority: 0.3 })),
  ];
}
