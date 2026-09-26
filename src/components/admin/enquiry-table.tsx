import Link from "next/link";
import type { EnquirySummary } from "@/lib/server/admin/enquiries";
import { timeAgo } from "@/lib/server/admin/util";
import { rupees } from "@/lib/format";
import { StatusChip } from "./ui";

/** Enquiry list: table on desktop, stacked cards on phones. */
export function EnquiryTable({
  rows,
  compact = false,
  activeRef,
}: {
  rows: EnquirySummary[];
  compact?: boolean;
  activeRef?: string;
}) {
  const href = (ref: string) => `/admin/enquiries?ref=${ref}`;
  return (
    <>
      <table className="hidden w-full text-[14px] md:table">
        <thead className="bg-cream/60 text-left">
          <tr className="eyebrow text-[10px] text-muted">
            <th className="px-5 py-3 font-semibold">Ref</th>
            <th className="px-3 py-3 font-semibold">Retailer</th>
            <th className="px-3 py-3 font-semibold">{compact ? "Items" : "Pcs"}</th>
            <th className="px-3 py-3 text-right font-semibold">Value</th>
            <th className="px-5 py-3 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((e) => (
            <tr key={e.ref} className={`hover:bg-cream/50 ${activeRef === e.ref ? "bg-gold-50/60" : ""}`}>
              <td className="px-5 py-3 font-bold">
                <Link href={href(e.ref)} className="hover:text-maroon">
                  {e.ref}
                </Link>
              </td>
              <td className="px-3 py-3">
                <Link href={href(e.ref)} className="block">
                  <span className="font-medium">{e.shop}</span>
                  {e.city && <span className="text-muted">, {e.city}</span>}
                  {!compact && (
                    <span className="block text-[12px] text-muted">
                      {timeAgo(e.createdAt)} · {e.source === "website" ? "Website" : "WhatsApp"}
                    </span>
                  )}
                </Link>
              </td>
              <td className="max-w-48 px-3 py-3 text-muted">{compact ? e.items : e.pcs}</td>
              <td className="px-3 py-3 text-right font-medium">{e.valuePaise === null ? "—" : rupees(e.valuePaise)}</td>
              <td className="px-5 py-3">
                <StatusChip status={e.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-line md:hidden">
        {rows.map((e) => (
          <li key={e.ref}>
            <Link
              href={href(e.ref)}
              className={`flex items-start justify-between gap-3 px-4 py-3 ${activeRef === e.ref ? "bg-gold-50/60" : ""}`}
            >
              <div className="min-w-0">
                <p className="font-bold">
                  {e.ref} <span className="font-normal text-muted">· {timeAgo(e.createdAt)}</span>
                </p>
                <p className="truncate text-[14px]">
                  {e.shop}
                  {e.city && <span className="text-muted">, {e.city}</span>}
                </p>
                <p className="truncate text-[12px] text-muted">{e.items}</p>
              </div>
              <div className="shrink-0 text-right">
                <StatusChip status={e.status} />
                <p className="mt-1 text-[13px] font-semibold">{e.valuePaise === null ? "" : rupees(e.valuePaise)}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
