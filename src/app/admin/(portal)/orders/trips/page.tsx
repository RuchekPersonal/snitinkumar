import type { Metadata } from "next";
import Link from "next/link";
import { getTripSummaries } from "@/lib/server/admin/orders";
import { rupees } from "@/lib/format";
import { Card, Empty, PageHeader } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Trips" };

const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) : "";

export default async function TripsPage() {
  const trips = await getTripSummaries();
  return (
    <>
      <PageHeader
        title="Trips"
        subtitle={
          <>
            <Link href="/admin/orders" className="hover:text-maroon">
              Orders
            </Link>{" "}
            / Trips · cancelled orders are not counted
          </>
        }
      />
      <Card>
        {trips.length === 0 ? (
          <Empty>No trips yet. Choose or type a trip name when you take an order.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-[14px]">
              <thead className="bg-cream/60 text-left">
                <tr className="eyebrow text-[10px] text-muted">
                  <th className="px-5 py-3 font-semibold">Trip</th>
                  <th className="px-3 py-3 font-semibold">Orders taken</th>
                  <th className="px-3 py-3 text-right font-semibold">Orders</th>
                  <th className="px-3 py-3 text-right font-semibold">Customers</th>
                  <th className="px-3 py-3 text-right font-semibold">Sets / pcs</th>
                  <th className="px-3 py-3 text-right font-semibold">Value</th>
                  <th className="px-3 py-3 font-semibold">Dispatch</th>
                  <th className="px-5 py-3">
                    <span className="sr-only">Links</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {trips.map((t) => {
                  const key = t.id ?? "none";
                  return (
                    <tr key={key} className="hover:bg-cream/50">
                      <td className="px-5 py-3 font-semibold">{t.name}</td>
                      <td className="px-3 py-3 text-muted">
                        {t.firstOrder
                          ? `${date(t.firstOrder)}${t.lastOrder && date(t.lastOrder) !== date(t.firstOrder) ? ` – ${date(t.lastOrder)}` : ""}`
                          : "—"}
                      </td>
                      <td className="px-3 py-3 text-right">{t.orders}</td>
                      <td className="px-3 py-3 text-right">{t.customers}</td>
                      <td className="px-3 py-3 text-right">
                        {t.sets} / {t.pcs}
                      </td>
                      <td className="px-3 py-3 text-right font-medium">{rupees(t.valuePaise)}</td>
                      <td className="px-3 py-3 text-[13px]">
                        {t.toDispatch > 0 ? (
                          <b className="text-maroon">{t.toDispatch} to dispatch</b>
                        ) : t.orders ? (
                          "All dispatched"
                        ) : (
                          "—"
                        )}
                        {t.dispatched > 0 && t.toDispatch > 0 && (
                          <span className="text-muted"> · {t.dispatched} done</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-[13px] font-semibold whitespace-nowrap">
                        <Link href={`/admin/orders?trip=${key}`} className="text-maroon hover:underline">
                          Orders
                        </Link>
                        {" · "}
                        <Link href={`/admin/orders/picking?trip=${key}`} className="text-maroon hover:underline">
                          Picking list
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
