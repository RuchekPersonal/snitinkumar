import type { Metadata } from "next";
import Link from "next/link";
import { getEnquiry, listEnquiries } from "@/lib/server/admin/enquiries";
import { istDate } from "@/lib/server/admin/util";
import { rupees } from "@/lib/format";
import { btnPrimary, btnSecondary, Card, Empty, PageHeader, StatusChip, Tabs } from "@/components/admin/ui";
import { EnquiryTable } from "@/components/admin/enquiry-table";
import { EnquiryUpdateForm } from "./update-form";

export const metadata: Metadata = { title: "Enquiries" };

export default async function EnquiriesPage({ searchParams }: PageProps<"/admin/enquiries">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const status = one(sp.status);
  const ref = one(sp.ref).toUpperCase();
  const [{ items, counts }, detail] = await Promise.all([
    listEnquiries({ status }),
    /^ENQ-\d+$/.test(ref) ? getEnquiry(ref) : Promise.resolve(null),
  ]);

  const tab = (s: string, text: string, count: number) => ({
    href: `/admin/enquiries${s ? `?status=${s}` : ""}`,
    label: text,
    count,
    active: status === s,
  });

  return (
    <>
      <PageHeader
        title="Enquiries"
        subtitle={`${counts.new} new · ${counts.confirmed} confirmed · ${counts.dispatchedThisMonth} dispatched this month`}
        actions={
          <>
            {}
            <a href={`/api/admin/export/enquiries?month=${istDate().slice(0, 7)}`} className={btnSecondary}>
              Export month
            </a>
            <Link href="/admin/enquiries/new" className={btnPrimary}>
              + Enquiry from WhatsApp
            </Link>
          </>
        }
      />
      <Tabs
        tabs={[
          tab("", "All", counts.all),
          tab("new", "New", counts.new),
          tab("confirmed", "Confirmed", counts.confirmed),
          tab("dispatched", "Dispatched", counts.dispatched),
          tab("cancelled", "Cancelled", counts.cancelled),
        ]}
      />

      <div className={`grid gap-5 [&>*]:min-w-0 ${detail ? "2xl:grid-cols-[1fr_440px]" : ""}`}>
        {detail && (
          <Card
            className="print:border-0 2xl:order-2 2xl:self-start"
            title={detail.ref}
            action={<StatusChip status={detail.status} />}
          >
            <div className="space-y-5 p-5 text-[14px]">
              <p className="text-muted">
                Received{" "}
                {new Date(detail.createdAt).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: "Asia/Kolkata",
                })}{" "}
                via {detail.source === "website" ? "website" : "WhatsApp"}
              </p>
              <div>
                <p className="eyebrow text-[10px] text-muted">Retailer</p>
                <p className="mt-1 font-semibold">
                  {detail.shop}
                  {detail.person && ` — ${detail.person}`}
                </p>
                <p className="text-muted">
                  {[detail.retailer?.address, detail.city, detail.retailer?.pincode].filter(Boolean).join(", ")}
                  {detail.retailer?.gstin && ` · GSTIN ${detail.retailer.gstin}`}
                </p>
                {detail.phone && (
                  <p className="mt-1">
                    <a href={`tel:${detail.phone}`} className="font-semibold text-maroon">
                      Call {detail.phone}
                    </a>
                  </p>
                )}
                {!detail.retailer && (
                  <p className="mt-1 text-[12px] text-muted">Guest enquiry — not a registered retailer.</p>
                )}
              </div>
              <div>
                <p className="eyebrow text-[10px] text-muted">Items</p>
                <ul className="mt-1 divide-y divide-line">
                  {detail.lines.map((l) => (
                    <li key={l.code_snapshot} className="flex justify-between gap-3 py-2">
                      <span>
                        <Link href={`/admin/products/${l.code_snapshot}`} className="font-semibold hover:text-maroon">
                          {l.code_snapshot}
                        </Link>{" "}
                        {l.name_snapshot} · {l.qty} pcs
                        <span className="block text-[12px] text-muted">@ {rupees(l.rate_paise_snapshot)}/pc</span>
                      </span>
                      <b className="shrink-0">{rupees(l.rate_paise_snapshot * l.qty)}</b>
                    </li>
                  ))}
                </ul>
                <p className="flex justify-between border-t border-line pt-2 font-semibold">
                  <span>Estimated total · {detail.pcs} pcs</span>
                  <span>{detail.valuePaise === null ? "—" : rupees(detail.valuePaise)}</span>
                </p>
              </div>
              {detail.note && (
                <p className="rounded-md bg-gold-50 p-3">
                  <b>Note from retailer:</b> {detail.note}
                </p>
              )}
              <EnquiryUpdateForm
                ref_={detail.ref}
                status={detail.status}
                internalNote={detail.internalNote}
                phone={detail.phone ?? ""}
                phoneEditable={!detail.retailer}
                person={detail.person ?? detail.shop}
                items={detail.lines.map((l) => `${l.code_snapshot} ×${l.qty}`).join(", ")}
              />
              {detail.events.length > 0 && (
                <div className="print:hidden">
                  <p className="eyebrow text-[10px] text-muted">History</p>
                  <ul className="mt-1 space-y-1 text-[13px] text-muted">
                    {detail.events.map((e, i) => (
                      <li key={i}>
                        {new Date(e.created_at).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: "Asia/Kolkata",
                        })}{" "}
                        — {e.from_status ? `${e.from_status} → ` : ""}
                        <b>{e.to_status}</b>
                        {e.admins && ` by ${e.admins.name}`}
                        {e.note && ` · ${e.note}`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>
        )}

        <Card className="print:hidden 2xl:order-1">
          {items.length ? <EnquiryTable rows={items} activeRef={detail?.ref} /> : <Empty>No enquiries here yet.</Empty>}
        </Card>
      </div>
    </>
  );
}
