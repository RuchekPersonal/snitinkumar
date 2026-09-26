import type { Metadata } from "next";
import Link from "next/link";
import { getDashboard } from "@/lib/server/admin/dashboard";
import { rupees } from "@/lib/format";
import { btnPrimary, Card, Empty, PageHeader, StatusChip } from "@/components/admin/ui";
import { EnquiryTable } from "@/components/admin/enquiry-table";

export const metadata: Metadata = { title: "Dashboard" };

function lakh(paise: number) {
  const r = paise / 100;
  if (r >= 100000) return `₹${(r / 100000).toFixed(1)} L`;
  return rupees(paise);
}

function Kpi({ label, value, note, up }: { label: string; value: string | number; note: string; up?: boolean | null }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4 lg:p-5">
      <p className="eyebrow text-[10px] text-muted">{label}</p>
      <p className="mt-2 text-[28px] leading-none font-bold text-maroon lg:text-[32px]">{value}</p>
      <p className="mt-2 text-[12px] text-muted">
        {up === true && <span className="text-whatsapp">▲ </span>}
        {up === false && <span className="text-maroon">▼ </span>}
        {note}
      </p>
    </div>
  );
}

export default async function DashboardPage() {
  const d = await getDashboard(30);
  const k = d.kpis;
  const maxPcs = Math.max(1, ...d.topDesigns.map((t) => t.pcs));
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={today}
        actions={
          <Link href="/admin/products/new" className={btnPrimary}>
            + Add product
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Kpi
          label="New enquiries"
          value={k.newEnquiries}
          note={`${k.newSinceYesterday} since yesterday`}
          up={k.newSinceYesterday > 0 || null}
        />
        <Kpi
          label="Enquiry value (30 d)"
          value={lakh(k.valuePaise)}
          note={k.valueChangePct === null ? "no data for prior 30 d" : `${Math.abs(k.valueChangePct)}% vs prior 30 d`}
          up={k.valueChangePct === null ? null : k.valueChangePct >= 0}
        />
        <Kpi label="Active designs" value={k.activeDesigns} note={`${k.markedNew} marked new · ${k.hidden} hidden`} />
        <Kpi
          label="Registered retailers"
          value={k.retailers}
          note={`${k.retailersThisMonth} this month${k.pendingRetailers ? ` · ${k.pendingRetailers} pending` : ""}`}
          up={k.retailersThisMonth > 0 || null}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_340px] [&>*]:min-w-0">
        <Card
          title="Recent enquiries"
          action={
            <Link
              href="/admin/enquiries"
              className="text-[14px] font-semibold text-maroon underline underline-offset-2"
            >
              See all →
            </Link>
          }
        >
          {d.recent.length ? (
            <EnquiryTable rows={d.recent} compact />
          ) : (
            <Empty>No enquiries yet. They appear here as soon as a retailer sends one.</Empty>
          )}
        </Card>

        <div className="space-y-5">
          <Card title="Top designs (30 d)">
            <div className="space-y-3 p-5">
              {d.topDesigns.length === 0 && <p className="text-[14px] text-muted">No enquiries in the last 30 days.</p>}
              {d.topDesigns.map((t) => (
                <div key={t.code}>
                  <div className="flex justify-between gap-2 text-[13px]">
                    <Link href={`/admin/products/${t.code}`} className="truncate hover:text-maroon">
                      {t.code} {t.name}
                    </Link>
                    <b className="shrink-0">{t.pcs} pcs</b>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-sand">
                    <div className="h-1.5 rounded-full bg-maroon" style={{ width: `${(t.pcs / maxPcs) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Needs attention">
            <ul className="space-y-2.5 p-5 text-[14px]">
              {d.attention.lowStock.slice(0, 4).map((p) => (
                <li key={p.code} className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                  <span>
                    <Link href={`/admin/products/${p.code}`} className="font-semibold hover:text-maroon">
                      {p.code}
                    </Link>{" "}
                    low stock — {p.stock} pcs left{p.openEnquiries ? `, ${p.openEnquiries} open enquiries` : ""}
                  </span>
                </li>
              ))}
              {d.attention.noPhoto.length > 0 && (
                <li className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                  <Link href="/admin/products?show=nophoto" className="hover:text-maroon">
                    <b>{d.attention.noPhoto.length === 1 ? "1 product" : `${d.attention.noPhoto.length} products`}</b>{" "}
                    {d.attention.noPhoto.length === 1 ? "has" : "have"} no photo uploaded
                  </Link>
                </li>
              )}
              {d.attention.staleEnquiries > 0 && (
                <li className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-maroon" />
                  <Link href="/admin/enquiries?status=new" className="hover:text-maroon">
                    <b>{d.attention.staleEnquiries === 1 ? "1 enquiry" : `${d.attention.staleEnquiries} enquiries`}</b>{" "}
                    waiting &gt; 24 h without reply
                  </Link>
                </li>
              )}
              {k.pendingRetailers > 0 && (
                <li className="flex gap-2">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-maroon" />
                  <Link href="/admin/customers?status=pending" className="hover:text-maroon">
                    <b>{k.pendingRetailers === 1 ? "1 retailer" : `${k.pendingRetailers} retailers`}</b> waiting for
                    approval <StatusChip status="pending" />
                  </Link>
                </li>
              )}
              {!d.attention.lowStock.length &&
                !d.attention.noPhoto.length &&
                !d.attention.staleEnquiries &&
                !k.pendingRetailers && <li className="text-muted">All clear.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
