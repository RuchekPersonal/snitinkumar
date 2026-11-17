import type { Metadata } from "next";
import { requireAdmin } from "@/lib/server/admin-auth";
import { db } from "@/lib/server/db";
import { AdminNav } from "@/components/admin/admin-nav";
import { countOrdersToDispatch } from "@/lib/server/admin/orders";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · S. Nitinkumar" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  const [orders, enq, cust] = await Promise.all([
    countOrdersToDispatch(),
    db().from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
    db().from("retailers").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return (
    <div className="min-h-dvh bg-cream">
      <AdminNav
        name={admin.name}
        role={admin.role}
        badges={{ orders, enquiries: enq.count ?? 0, customers: cust.count ?? 0 }}
      />
      <main className="px-4 py-6 lg:ml-60 lg:px-8 lg:py-8 print:m-0 print:p-0">{children}</main>
    </div>
  );
}
