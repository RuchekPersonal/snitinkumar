import type { Metadata } from "next";
import { listCustomers } from "@/lib/server/admin/customers";
import { timeAgo } from "@/lib/server/admin/util";
import { rupees } from "@/lib/format";
import { btnSecondary, Card, Empty, input, PageHeader, StatusChip, Tabs } from "@/components/admin/ui";
import { CustomerActions } from "./customer-actions";
import { AddRetailer } from "./add-retailer";

export const metadata: Metadata = { title: "Customers" };

function lakh(paise: number) {
  const r = paise / 100;
  return r >= 100000 ? `₹${(r / 100000).toFixed(1)} L` : rupees(paise);
}

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const status = one(sp.status);
  const q = one(sp.q).slice(0, 60);
  const data = await listCustomers({ status, q });

  const tab = (s: string, text: string) => ({
    href: `/admin/customers${s ? `?status=${s}` : ""}`,
    label: text,
    active: status === s,
  });

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={`${data.total} registered retailers · ${data.pending} pending approval`}
        actions={
          <>
            {}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- CSV file download */}
            <a href="/api/admin/export/customers" className={btnSecondary}>
              Export
            </a>
            <AddRetailer />
          </>
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          ["Pending approval", data.pending],
          ["Ordered in last 90 days", data.orderedLast90],
          ["Top city", data.topCity],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-line bg-surface p-4">
            <p className="eyebrow text-[10px] text-muted">{k}</p>
            <p className="mt-1.5 truncate text-[24px] font-bold text-maroon">{v}</p>
          </div>
        ))}
      </div>

      <Tabs
        tabs={[
          tab("", "All"),
          tab("pending", "Pending"),
          tab("approved", "Approved"),
          tab("blocked", "Blocked"),
          tab("rejected", "Rejected"),
        ]}
      />

      <Card>
        <form className="flex gap-2 border-b border-line p-4" role="search">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search shop, owner, city, mobile or GSTIN"
            className={`${input} max-w-sm flex-1`}
          />
          <button className={btnSecondary}>Search</button>
        </form>

        {data.items.length === 0 ? (
          <Empty>
            {data.total === 0
              ? "No retailers yet. They appear here when shops register (Phase 4), or add one manually."
              : "No retailers match."}
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-[14px]">
              <thead className="bg-cream/60 text-left">
                <tr className="eyebrow text-[10px] text-muted">
                  <th className="px-5 py-3 font-semibold">Shop / owner</th>
                  <th className="px-3 py-3 font-semibold">City</th>
                  <th className="px-3 py-3 font-semibold">Phone</th>
                  <th className="px-3 py-3 text-right font-semibold">Enquiries</th>
                  <th className="px-3 py-3 text-right font-semibold">Lifetime value</th>
                  <th className="px-3 py-3 font-semibold">Last enquiry</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((r) => (
                  <tr key={r.id} className={r.status === "pending" ? "bg-gold-50/40" : ""}>
                    <td className="px-5 py-3">
                      <p className="font-semibold">{r.shopName}</p>
                      <p className="text-[12px] text-muted">
                        {r.ownerName} ·{" "}
                        {r.status === "pending"
                          ? `registered ${timeAgo(r.createdAt)}`
                          : (r.statusReason ?? `GSTIN ${r.gstin ?? "—"}`)}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      {r.city}
                      {r.state && `, ${r.state}`}
                    </td>
                    <td className="px-3 py-3">
                      <a
                        href={`https://wa.me/${r.mobile.replace(/\D/g, "")}`}
                        target="_blank"
                        className="hover:text-maroon"
                      >
                        {r.mobile.replace(/^\+91(\d{5})(\d{5})$/, "+91 $1 $2")}
                      </a>
                    </td>
                    <td className="px-3 py-3 text-right">{r.enquiries}</td>
                    <td className="px-3 py-3 text-right">{r.lifetimePaise ? lakh(r.lifetimePaise) : "—"}</td>
                    <td className="px-3 py-3 text-muted">{r.lastEnquiryAt ? timeAgo(r.lastEnquiryAt) : "—"}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {r.status !== "pending" && <StatusChip status={r.status} />}
                        <CustomerActions id={r.id} status={r.status} shop={r.shopName} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
