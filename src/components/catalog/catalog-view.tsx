import type { Viewer } from "@/lib/types";
import { canSeePrices } from "@/lib/server/session";
import { listCatalogItems, listCategories, listFacets } from "@/lib/server/catalog";
import { CatalogBrowser } from "./catalog-browser";

// Sends the whole visible catalogue (cards only, rates only for approved retailers) once;
// CatalogBrowser filters, sorts and pages it in the browser from the URL.
export async function CatalogView({ viewer }: { viewer: Viewer }) {
  const [items, categories, facets] = await Promise.all([listCatalogItems(viewer), listCategories(), listFacets()]);
  return <CatalogBrowser items={items} categories={categories} facets={facets} priced={canSeePrices(viewer.role)} />;
}
