import type { Metadata } from "next";
import { getViewer } from "@/lib/server/session";
import { parseFilters } from "@/lib/catalog-params";
import { CatalogView } from "@/components/catalog/catalog-view";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: "New Arrivals — This Fortnight",
  description: "Fresh kurti and suit-set designs added this fortnight. Min 3 pcs per design · Wholesale only.",
  path: "/new-arrivals",
});

export default async function NewArrivalsPage({ searchParams }: PageProps<"/new-arrivals">) {
  const viewer = await getViewer();
  return (
    <CatalogView
      viewer={viewer}
      filters={{ ...parseFilters(await searchParams), newOnly: true }}
      basePath="/new-arrivals"
      title="New arrivals"
      crumbs={[{ href: "/", label: "Home" }, { label: "New arrivals" }]}
    />
  );
}
