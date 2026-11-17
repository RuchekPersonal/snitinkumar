import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/server/admin-auth";
import { getOrderFormData } from "@/lib/server/admin/orders";
import { listCategories } from "@/lib/server/catalog";
import { PageHeader } from "@/components/admin/ui";
import { OrderBuilder } from "./order-builder";

export const metadata: Metadata = { title: "New order" };

export default async function NewOrderPage() {
  const admin = await requireAdmin();
  const [data, categories] = await Promise.all([getOrderFormData(), listCategories()]);
  return (
    <>
      <PageHeader
        title="New order"
        subtitle={
          <>
            <Link href="/admin/orders" className="hover:text-maroon">
              Orders
            </Link>{" "}
            / New
          </>
        }
      />
      <OrderBuilder
        adminId={admin.id}
        customers={data.customers}
        trips={data.trips}
        products={data.products}
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
      />
    </>
  );
}
