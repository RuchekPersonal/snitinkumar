import type { Metadata } from "next";
import Link from "next/link";
import { listOrders, listTrips } from "@/lib/server/admin/orders";
import { rupees } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/order-text";
import { btnPrimary, btnSecondary, Card, Empty, input, PageHeader, StatusChip, Tabs } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const f = {
    status: one(sp.status),
    trip: one(sp.trip),
    q: one(sp.q).slice(0, 60),
    from: one(sp.from),
    to: one(sp.to),
  };
  const [{ items, counts, totals }, trips] = await Promise.all([listOrders(f), listTrips()]);

  const qs = (patch: Partial<typeof f>) => {
    const p = new URLSearchParams(Object.entries({ ...f, ...patch }).filter(([, v]) => v) as [string, string][]);
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  const tripQs = f.trip ? `?trip=${f.trip}` : "";
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle={`${counts.open} to dispatch · ${totals.sets} sets · ${totals.pcs} pcs · ${rupees(totals.valuePaise)} (not counting cancelled)`}
        actions={
          <>
            <Link href="/admin/orders/trips" className={btnSecondary}>
              Trips
            </Link>
            <Link href={`/admin/orders/picking${tripQs}`} className={btnSecondary}>
              Picking list
            </Link>
            <a href={`/api/admin/export/orders${qs({})}`} className={btnSecondary}>
              Export
            </a>
            <Link href="/admin/orders/new" className={btnPrimary}>
              + New order
            </Link>
          </>
        }
      />

      <Tabs
        tabs={[
          {
            href: `/admin/orders${qs({ status: "open" })}`,
            label: "To dispatch",
            count: counts.open,
            active: f.status === "open",
          },
          {
            href: `/admin/orders${qs({ status: "partial" })}`,
            label: "Part dispatched",
            count: counts.partial,
            active: f.status === "partial",
          },
          {
            href: `/admin/orders${qs({ status: "dispatched" })}`,
            label: "Dispatched",
            count: counts.dispatched,
            active: f.status === "dispatched",
          },
          {
            href: `/admin/orders${qs({ status: "cancelled" })}`,
            label: "Cancelled",
            count: counts.cancelled,
            active: f.status === "cancelled",
          },
          { href: `/admin/orders${qs({ status: "" })}`, label: "All", count: counts.all, active: !f.status },
        ]}
      />

      <Card>
        <form className="flex flex-wrap items-end gap-2 border-b border-line p-4" role="search">
          {f.status && <input type="hidden" name="status" value={f.status} />}
          <input
            name="q"
            defaultValue={f.q}
            placeholder="Order no., shop or city"
            aria-label="Search orders"
            className={`${input} max-w-xs flex-1 basis-48`}
          />
          <select name="trip" defaultValue={f.trip} aria-label="Trip" className={`${input} w-auto max-w-56`}>
            <option value="">All trips</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
            <option value="none">No trip</option>
          </select>
          <label className="flex items-center gap-1.5 text-[13px] text-muted">
            From
            <input type="date" name="from" defaultValue={f.from} className={`${input} w-auto`} />
          </label>
          <label className="flex items-center gap-1.5 text-[13px] text-muted">
            To
            <input type="date" name="to" defaultValue={f.to} className={`${input} w-auto`} />
          </label>
          <button className={btnSecondary}>Filter</button>
          {(f.q || f.trip || f.from || f.to) && (
            <Link
              href={`/admin/orders${f.status ? `?status=${f.status}` : ""}`}
              className="px-2 text-[13px] font-semibold text-muted underline"
            >
              Clear
            </Link>
          )}
        </form>

        {items.length === 0 ? (
          <Empty>
            {counts.all === 0 && !f.q && !f.trip && !f.from && !f.to ? (
              <>
                No orders yet.{" "}
                <Link href="/admin/orders/new" className="font-semibold text-maroon underline">
                  Take the first one
                </Link>
              </>
            ) : (
              "No orders match."
            )}
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-[14px]">
              <thead className="bg-cream/60 text-left">
                <tr className="eyebrow text-[10px] text-muted">
                  <th className="px-5 py-3 font-semibold">Order</th>
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Customer</th>
                  <th className="px-3 py-3 font-semibold">Trip</th>
                  <th className="px-3 py-3 text-right font-semibold">Designs</th>
                  <th className="px-3 py-3 text-right font-semibold">Sets / pcs</th>
                  <th className="px-3 py-3 text-right font-semibold">Value</th>
                  <th className="px-3 py-3 font-semibold">Taken by</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((o) => (
                  <tr key={o.id} className="hover:bg-cream/50">
                    <td className="px-5 py-3 font-bold">
                      <Link href={`/admin/orders/${o.ref}`} className="hover:text-maroon">
                        {o.ref}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-muted">{date(o.createdAt)}</td>
                    <td className="px-3 py-3">
                      <Link href={`/admin/orders/${o.ref}`} className="block">
                        <b className="font-medium">{o.shop}</b>
                        <span className="block text-[13px] text-muted">{o.city}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-muted">{o.trip ?? "—"}</td>
                    <td className="px-3 py-3 text-right">{o.designs}</td>
                    <td className="px-3 py-3 text-right">
                      {o.sets} / {o.pcs}
                    </td>
                    <td className="px-3 py-3 text-right font-medium">{rupees(o.valuePaise)}</td>
                    <td className="px-3 py-3 text-muted">{o.takenBy ?? "—"}</td>
                    <td className="px-5 py-3">
                      <StatusChip status={o.status} label={ORDER_STATUS_LABEL[o.status]} />
                      {o.status === "partial" && (
                        <span className="block text-[12px] text-muted">
                          {o.sentSets} of {o.sets} sets sent
                        </span>
                      )}
                      {o.dispatchedAt && (
                        <span className="block text-[12px] text-muted">
                          {o.status === "partial" ? "last " : ""}
                          {date(`${o.dispatchedAt}T00:00:00+05:30`)}
                        </span>
                      )}
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
