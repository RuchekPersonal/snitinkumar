/* eslint-disable @next/next/no-img-element -- photos are served pre-sized by /api/img */
import type { Metadata } from "next";
import Link from "next/link";
import { getPickingList, listTrips } from "@/lib/server/admin/orders";
import { btnSecondary, Card, Empty, input, PageHeader } from "@/components/admin/ui";
import { PrintButton } from "../print-button";

export const metadata: Metadata = { title: "Picking list" };

export default async function PickingPage({ searchParams }: PageProps<"/admin/orders/picking">) {
  const raw = (await searchParams).trip;
  const trip = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  const [list, trips] = await Promise.all([getPickingList(trip), listTrips()]);
  const tripName = trip === "none" ? "Orders without a trip" : trips.find((t) => t.id === trip)?.name;

  return (
    <>
      <PageHeader
        title="Picking list"
        subtitle={
          <>
            <span className="print:hidden">
              <Link href="/admin/orders" className="hover:text-maroon">
                Orders
              </Link>{" "}
              /{" "}
            </span>
            {tripName ?? "All trips"} · pieces still to dispatch, from {list.orders}{" "}
            {list.orders === 1 ? "order" : "orders"} ·{" "}
            {new Date().toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "Asia/Kolkata",
            })}
          </>
        }
        actions={<PrintButton />}
      />

      <form className="mb-4 flex flex-wrap gap-2 print:hidden">
        <select name="trip" defaultValue={trip} aria-label="Trip" className={`${input} w-auto max-w-64`}>
          <option value="">All trips</option>
          {trips.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
          <option value="none">No trip</option>
        </select>
        <button className={btnSecondary}>Show</button>
      </form>

      <Card>
        {list.designs.length === 0 ? (
          <Empty>Nothing waiting for dispatch{tripName ? " on this trip" : ""}.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead className="bg-cream/60 text-left">
                <tr className="eyebrow text-[10px] text-muted">
                  <th className="px-5 py-3 font-semibold">Design</th>
                  {list.sizes.map((s) => (
                    <th key={s} className="px-2 py-3 text-center font-semibold">
                      {s}
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right font-semibold">Total pcs</th>
                  <th className="px-5 py-3 text-right font-semibold">Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.designs.map((d) => (
                  <tr key={d.code} className="break-inside-avoid">
                    <td className="px-5 py-2">
                      <span className="flex items-center gap-3">
                        {d.coverImageId ? (
                          <img
                            src={`/api/img/${d.coverImageId}/thumb.webp`}
                            alt=""
                            width={30}
                            height={40}
                            className="h-10 w-[30px] shrink-0 rounded bg-sand object-cover"
                          />
                        ) : (
                          <span className="h-10 w-[30px] shrink-0 rounded bg-sand" />
                        )}
                        <span>
                          <b>{d.code}</b>
                          <span className="block text-[12px] text-muted">{d.name}</span>
                        </span>
                      </span>
                    </td>
                    {list.sizes.map((s) => (
                      <td
                        key={s}
                        className={`px-2 py-2 text-center ${d.perSize[s] ? "font-semibold" : "text-muted/50"}`}
                      >
                        {d.perSize[s] ?? "–"}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-bold">{d.pcs}</td>
                    <td className="px-5 py-2 text-right text-muted">{d.orders}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-line font-bold">
                  <td className="px-5 py-3">Total · {list.designs.length} designs</td>
                  {list.sizes.map((s) => (
                    <td key={s} className="px-2 py-3 text-center">
                      {list.totals[s]}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right">{list.pcs}</td>
                  <td className="px-5 py-3 text-right">{list.orders}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
