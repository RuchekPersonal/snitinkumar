import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/server/admin-auth";
import { getOrderFormData, getRepeatOrder, ORDER_REF_RE } from "@/lib/server/admin/orders";
import { listCategories } from "@/lib/server/catalog";
import { PageHeader } from "@/components/admin/ui";
import { OrderBuilder } from "./order-builder";

export const metadata: Metadata = { title: "New order" };

export default async function NewOrderPage({ searchParams }: PageProps<"/admin/orders/new">) {
  const admin = await requireAdmin();
  const raw = (await searchParams).repeat;
  const repeatRef = (Array.isArray(raw) ? raw[0] : (raw ?? "")).toUpperCase();
  const [data, categories, repeat] = await Promise.all([
    getOrderFormData(),
    listCategories(),
    ORDER_REF_RE.test(repeatRef) ? getRepeatOrder(repeatRef) : Promise.resolve(null),
  ]);
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
        repeat={repeat}
        customers={data.customers}
        trips={data.trips}
        products={data.products}
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
      />
    </>
  );
}
