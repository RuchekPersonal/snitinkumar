import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/server/session";
import { getCategory } from "@/lib/server/catalog";
import { catalogTitles } from "@/lib/catalog-params";
import { CatalogView } from "@/components/catalog/catalog-view";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/catalog/[category]">): Promise<Metadata> {
  const category = await getCategory((await params).category);
  if (!category) return {};
  return pageMeta({
    title: catalogTitles.category(category.name),
    description: `${category.designCount} designs · Min 3 pcs per design · Wholesale only. ${category.description}`,
    path: `/catalog/${category.slug}`,
    image: category.coverImageId
      ? { url: `/api/site-img/${category.coverImageId}/og.jpg`, width: 1200, height: 630, alt: category.name }
      : undefined,
  });
}

export default async function CategoryPage({ params }: PageProps<"/catalog/[category]">) {
  if (!(await getCategory((await params).category))) notFound();
  return <CatalogView viewer={await getViewer()} />;
}
