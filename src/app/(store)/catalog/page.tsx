import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/server/session";
import { findByExactCode, listFacets } from "@/lib/server/catalog";
import { catalogTitles, parseFilters } from "@/lib/catalog-params";
import { CatalogView } from "@/components/catalog/catalog-view";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { totalDesigns } = await listFacets();
  return pageMeta({
    title: catalogTitles.all,
    description: `${totalDesigns} designs — kurtis, kurti sets and 3-piece suits. Min 3 pcs per design · Wholesale only.`,
    path: "/catalog",
  });
}

export default async function CatalogPage({ searchParams }: PageProps<"/catalog">) {
  const { q } = parseFilters(await searchParams);
  if (q) {
    const code = await findByExactCode(q);
    if (code) redirect(`/product/${code}`);
  }
  return <CatalogView viewer={await getViewer()} />;
}
