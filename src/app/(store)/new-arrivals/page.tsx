import type { Metadata } from "next";
import { getViewer } from "@/lib/server/session";
import { catalogTitles } from "@/lib/catalog-params";
import { CatalogView } from "@/components/catalog/catalog-view";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: catalogTitles.newArrivals,
  description: "Fresh kurti and suit-set designs, just in from our workshop. Min 3 pcs per design · Wholesale only.",
  path: "/new-arrivals",
});

export default async function NewArrivalsPage() {
  return <CatalogView viewer={await getViewer()} />;
}
