import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/server/session";
import { db } from "@/lib/server/db";
import { getProductsByCodes } from "@/lib/server/catalog";
import { rupees } from "@/lib/format";
import { logoutAction } from "../_actions/account";
import { RepeatEnquiry } from "./repeat-enquiry";

export const metadata: Metadata = { title: "My Account", robots: { index: false } };

const STATUS_STYLE: Record<string, string> = {
  new: "bg-gold-50 text-[#8a6a1f]",
  confirmed: "bg-[#dfe7f5] text-[#2f4a7a]",
  dispatched: "bg-chip text-chip-ink",
  cancelled: "bg-maroon-50 text-maroon",
};

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const viewer = await getViewer();
  if (!viewer.retailerId && viewer.role === "guest") redirect("/login");
  const justRegistered = (await searchParams).registered === "1";

  const enquiries = viewer.retailerId
    ? (((
        await db()
          .from("enquiries")
          .select(
            "ref, status, total_pcs, est_value_paise, created_at, enquiry_items(code_snapshot, name_snapshot, qty)",
          )
          .eq("retailer_id", viewer.retailerId)
          .order("created_at", { ascending: false })
          .limit(50)
      ).data ?? []) as {
        ref: string;
        status: string;
        total_pcs: number;
        est_value_paise: number | null;
        created_at: string;
        enquiry_items: { code_snapshot: string; name_snapshot: string; qty: number }[];
      }[])
    : [];

  const codes = [...new Set(enquiries.flatMap((e) => e.enquiry_items.map((i) => i.code_snapshot)))];
  const products = codes.length ? await getProductsByCodes(codes, viewer) : [];
  const priced = viewer.role === "approved";

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 lg:pt-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-gold-600">Trade account</p>
          <h1 className="mt-1 font-serif text-[32px] leading-tight font-semibold">{viewer.shopName ?? "My account"}</h1>
        </div>
        <form action={logoutAction}>
          <button className="h-10 rounded-md border border-line bg-surface px-4 text-[14px] font-semibold">
            Log out
          </button>
        </form>
      </div>

      {viewer.status === "pending" && (
        <p className="mt-4 rounded-md border border-gold/50 bg-gold-50 p-4 text-[15px]">
          <b>{justRegistered ? "Thanks for registering! " : ""}Approval pending.</b> We review new shops the same day.
          Wholesale rates appear here as soon as you&apos;re approved.
        </p>
      )}
      {(viewer.status === "blocked" || viewer.status === "rejected") && (
        <p className="mt-4 rounded-md border border-maroon/30 bg-maroon-50 p-4 text-[15px] text-maroon">
          Your trade account isn&apos;t active. Please message us on WhatsApp if you think this is a mistake.
        </p>
      )}

      <dl className="mt-6 grid gap-3 rounded-lg border border-line bg-surface p-5 text-[15px] sm:grid-cols-2">
        <div>
          <dt className="text-[13px] text-muted">Owner</dt>
          <dd className="font-semibold">{viewer.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted">Mobile</dt>
          <dd className="font-semibold">{viewer.phone?.replace(/^\+91(\d{5})(\d{5})$/, "+91 $1 $2") ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted">City</dt>
          <dd className="font-semibold">{viewer.city ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted">Status</dt>
          <dd className="font-semibold capitalize">{viewer.status ?? viewer.role}</dd>
        </div>
      </dl>

      <section className="mt-8">
        <h2 className="font-serif text-2xl font-semibold">Enquiry history</h2>
        {enquiries.length === 0 ? (
          <div className="mt-3 rounded-lg border border-line bg-surface p-6 text-center">
            <p className="text-[15px] text-muted">
              No enquiries yet. Your sent enquiries and their status appear here.
            </p>
            <Link
              href="/catalog"
              className="mt-4 inline-flex h-11 items-center rounded-md bg-maroon px-5 font-semibold text-white"
            >
              Browse catalog
            </Link>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
            {enquiries.map((e) => (
              <li key={e.ref} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">
                    {e.ref}{" "}
                    <span className="font-normal text-muted">
                      ·{" "}
                      {new Date(e.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        timeZone: "Asia/Kolkata",
                      })}
                    </span>
                  </p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold capitalize ${STATUS_STYLE[e.status] ?? ""}`}
                  >
                    {e.status}
                  </span>
                </div>
                <p className="mt-1 text-[14px] text-muted">
                  {e.enquiry_items.map((i) => `${i.code_snapshot} ×${i.qty}`).join(", ")} · {e.total_pcs} pcs
                  {priced && e.est_value_paise !== null && ` · approx. ${rupees(e.est_value_paise)}`}
                </p>
                <RepeatEnquiry
                  lines={e.enquiry_items.map((i) => ({ code: i.code_snapshot, qty: i.qty }))}
                  products={products.filter((p) => e.enquiry_items.some((i) => i.code_snapshot === p.code))}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
