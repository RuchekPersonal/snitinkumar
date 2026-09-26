import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/server/session";
import { EnquiryList } from "@/components/enquiry/enquiry-list";

export const metadata: Metadata = {
  title: "Your Enquiry List",
  robots: { index: false },
};

export default async function EnquiryPage() {
  const viewer = await getViewer();
  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 pb-24 lg:px-6 lg:pt-8 lg:pb-0">
      <nav aria-label="Breadcrumb" className="text-[13px] text-muted">
        <Link href="/" className="hover:text-maroon">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">Enquiry list</span>
      </nav>
      <h1 className="mt-3 font-serif text-[30px] font-semibold lg:text-4xl">Your enquiry list</h1>
      <p className="mt-1 mb-6 text-[14px] text-muted">
        We confirm rate, stock and dispatch on WhatsApp after you send the list.
      </p>
      <EnquiryList role={viewer.role} knownShop={viewer.shopName ?? null} />
    </div>
  );
}
