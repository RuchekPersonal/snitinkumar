/* eslint-disable @next/next/no-img-element -- photos are served pre-sized by /api/img */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/server/admin/orders";
import { rupees } from "@/lib/format";
import { ORDER_STATUS_LABEL, orderMessage, whatsappLink } from "@/lib/order-text";
import { Card, PageHeader, StatusChip } from "@/components/admin/ui";
import { WhatsAppIcon } from "@/components/icons";
import { PrintButton } from "../print-button";
import { OrderActions } from "./order-actions";

export async function generateMetadata({ params }: PageProps<"/admin/orders/[ref]">): Promise<Metadata> {
  return { title: (await params).ref };
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
const day = (d: string) =>
  new Date(`${d}T00:00:00+05:30`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

export default async function OrderPage({ params, searchParams }: PageProps<"/admin/orders/[ref]">) {
  const { ref } = await params;
  const placed = (await searchParams).placed === "1";
  const o = await getOrder(ref.toUpperCase());
  if (!o) notFound();

  const message = orderMessage({
    ref: o.ref,
    shop: o.customer.shop_name,
    lines: o.lines,
    sets: o.sets,
    pcs: o.pcs,
    valuePaise: o.valuePaise,
  });

  return (
    <>
      <PageHeader
        title={o.ref}
        subtitle={
          <span className="print:hidden">
            <Link href="/admin/orders" className="hover:text-maroon">
              Orders
            </Link>{" "}
            / {o.customer.shop_name}
          </span>
        }
        actions={
          <>
            <a
              href={whatsappLink(o.customer.mobile, message)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-1.5 rounded-md bg-[#1f7a4d] px-4 text-[14px] font-semibold text-white print:hidden"
            >
              <WhatsAppIcon width={18} height={18} /> Send to customer
            </a>
            <PrintButton />
          </>
        }
      />

      {placed && (
        <div
          role="status"
          className="mb-5 rounded-lg border border-chip-ink/30 bg-chip px-4 py-3 text-[14px] text-chip-ink print:hidden"
        >
          <b>Order placed.</b> Send the customer a copy on WhatsApp, or{" "}
          <Link href="/admin/orders/new" className="font-semibold underline">
            take the next order
          </Link>
          .
        </div>
      )}

      <div className="grid gap-5 [&>*]:min-w-0 xl:grid-cols-[1fr_360px]">
        <Card
          title={`${o.lines.length} ${o.lines.length === 1 ? "design" : "designs"} · ${o.sets} sets · ${o.pcs} pcs`}
          action={<StatusChip status={o.status} label={ORDER_STATUS_LABEL[o.status]} />}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[14px]">
              <thead className="bg-cream/60 text-left">
                <tr className="eyebrow text-[10px] text-muted">
                  <th className="px-5 py-3 font-semibold">Design</th>
                  <th className="px-3 py-3 font-semibold">Sizes</th>
                  <th className="px-3 py-3 text-right font-semibold">Sets</th>
                  <th className="px-3 py-3 text-right font-semibold">Pcs</th>
                  <th className="px-3 py-3 text-right font-semibold">Rate</th>
                  <th className="px-5 py-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {o.lines.map((l) => (
                  <tr key={l.code}>
                    <td className="px-5 py-2.5">
                      <span className="flex items-center gap-3">
                        {l.coverImageId ? (
                          <img
                            src={`/api/img/${l.coverImageId}/thumb.webp`}
                            alt=""
                            width={36}
                            height={48}
                            className="h-12 w-9 shrink-0 rounded bg-sand object-cover print:hidden"
                          />
                        ) : (
                          <span className="h-12 w-9 shrink-0 rounded bg-sand print:hidden" />
                        )}
                        <span>
                          {l.productId ? (
                            <Link href={`/admin/products/${l.code}`} className="font-bold hover:text-maroon">
                              {l.code}
                            </Link>
                          ) : (
                            <b>{l.code}</b>
                          )}
                          <span className="block text-[13px] text-muted">{l.name}</span>
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2.5">{l.sizes.join(" · ")}</td>
                    <td className="px-3 py-2.5 text-right">{l.sets}</td>
                    <td className="px-3 py-2.5 text-right">{l.pcs}</td>
                    <td className="px-3 py-2.5 text-right">{rupees(l.ratePaise)}</td>
                    <td className="px-5 py-2.5 text-right font-medium">{rupees(l.ratePaise * l.pcs)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line font-semibold">
                  <td className="px-5 py-3" colSpan={2}>
                    Total at listed rates
                  </td>
                  <td className="px-3 py-3 text-right">{o.sets}</td>
                  <td className="px-3 py-3 text-right">{o.pcs}</td>
                  <td />
                  <td className="px-5 py-3 text-right text-[16px]">{rupees(o.valuePaise)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        <div className="space-y-5 xl:self-start">
          <Card title="Details">
            <div className="space-y-4 p-5 text-[14px]">
              <div>
                <p className="eyebrow text-[10px] text-muted">Customer</p>
                <p className="mt-1 font-semibold">
                  {o.customer.shop_name} — {o.customer.owner_name}
                </p>
                <p className="text-muted">
                  {[o.customer.address, o.customer.city, o.customer.state, o.customer.pincode]
                    .filter(Boolean)
                    .join(", ")}
                  {o.customer.gstin && ` · GSTIN ${o.customer.gstin}`}
                </p>
                <a href={`tel:${o.customer.mobile}`} className="mt-1 inline-block font-semibold text-maroon">
                  Call {o.customer.mobile}
                </a>
              </div>
              <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5">
                <dt className="text-muted">Placed</dt>
                <dd>{when(o.createdAt)}</dd>
                <dt className="text-muted">Taken by</dt>
                <dd>{o.takenBy ?? "—"}</dd>
                <dt className="text-muted">Trip</dt>
                <dd>
                  {o.tripId ? (
                    <Link href={`/admin/orders?trip=${o.tripId}`} className="hover:text-maroon">
                      {o.trip}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
                <dt className="text-muted">Transport</dt>
                <dd>{o.transport || "—"}</dd>
                {o.status === "dispatched" && o.dispatch.date && (
                  <>
                    <dt className="text-muted">Dispatched</dt>
                    <dd>
                      {day(o.dispatch.date)}
                      {o.dispatch.transport && ` · ${o.dispatch.transport}`}
                      {o.dispatch.lr && (
                        <span className="block">
                          LR <b>{o.dispatch.lr}</b>
                        </span>
                      )}
                    </dd>
                  </>
                )}
              </dl>
              {o.note && (
                <p className="rounded-md bg-gold-50 p-3">
                  <b>Note:</b> {o.note}
                </p>
              )}
              <OrderActions id={o.id} status={o.status} transport={o.transport} />
            </div>
          </Card>

          {o.events.length > 0 && (
            <Card title="History" className="print:hidden">
              <ul className="space-y-1.5 p-5 text-[13px] text-muted">
                {o.events.map((e, i) => (
                  <li key={i}>
                    {when(e.created_at)} — {e.from_status ? `${ORDER_STATUS_LABEL[e.from_status]} → ` : ""}
                    <b className="text-ink">{e.from_status ? ORDER_STATUS_LABEL[e.to_status] : "Placed"}</b>
                    {e.admins && ` by ${e.admins.name}`}
                    {e.note && ` · ${e.note}`}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
