import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/server/session";
import { findByExactCode, listFacets } from "@/lib/server/catalog";
import { parseFilters } from "@/lib/catalog-params";
import { CatalogView } from "@/components/catalog/catalog-view";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { totalDesigns } = await listFacets();
  return pageMeta({
    title: "Wholesale Kurti Catalogue",
    description: `${totalDesigns} designs — kurtis, kurti sets and 3-piece suits. Min 3 pcs per design · Wholesale only.`,
    path: "/catalog",
  });
}

export default async function CatalogPage({ searchParams }: PageProps<"/catalog">) {
  const filters = parseFilters(await searchParams);
  if (filters.q) {
    const code = await findByExactCode(filters.q);
    if (code) redirect(`/product/${code}`);
  }
  const viewer = await getViewer();
  return (
    <CatalogView
      viewer={viewer}
      filters={filters}
      basePath="/catalog"
      title={filters.q ? `Results for “${filters.q}”` : "Product catalog"}
      crumbs={[{ href: "/", label: "Home" }, { label: "Wholesale catalog" }]}
    />
  );
}
