import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/server/session";

export const metadata: Metadata = { title: "My Account", robots: { index: false } };

export default async function AccountPage() {
  const viewer = await getViewer();
  if (viewer.role === "guest") redirect("/login");

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 lg:pt-12">
      <h1 className="font-serif text-[32px] font-semibold">My account</h1>
      {viewer.role === "pending" && (
        <p className="mt-4 rounded-md border border-gold/50 bg-gold-50 p-4 text-[15px]">
          <b>Approval pending.</b> We review new shops the same day. Rates appear once approved.
        </p>
      )}
      <dl className="mt-6 grid gap-3 rounded-lg border border-line bg-surface p-5 text-[15px] sm:grid-cols-2">
        <div>
          <dt className="text-[13px] text-muted">Shop</dt>
          <dd className="font-semibold">{viewer.shopName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted">Owner</dt>
          <dd className="font-semibold">{viewer.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted">City</dt>
          <dd className="font-semibold">{viewer.city ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted">Status</dt>
          <dd className="font-semibold capitalize">{viewer.role}</dd>
        </div>
      </dl>
      <section className="mt-8">
        <h2 className="font-serif text-2xl font-semibold">Enquiry history</h2>
        <p className="mt-2 text-[15px] text-muted">
          Past enquiries, their status and one-tap repeat will appear here once accounts go live (Phase 4).
        </p>
        <Link
          href="/catalog"
          className="mt-5 inline-flex h-11 items-center rounded-md bg-maroon px-5 font-semibold text-white"
        >
          Browse catalog
        </Link>
      </section>
    </div>
  );
}
