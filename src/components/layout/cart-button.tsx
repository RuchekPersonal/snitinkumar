"use client";

import Link from "next/link";
import { useEnquiry } from "@/components/enquiry-store";
import { BagIcon } from "@/components/icons";

/** Round outlined header button holding the enquiry cart, with the design count. */
export function CartButton({ className = "" }: { className?: string }) {
  const { designs } = useEnquiry();
  return (
    <Link
      href="/enquiry"
      aria-label={`Enquiry cart, ${designs} ${designs === 1 ? "design" : "designs"}`}
      title="Enquiry cart"
      className={`relative grid h-11 w-11 place-items-center rounded-full border border-ink/15 text-ink transition-colors hover:border-gold lg:h-12 lg:w-12 ${className}`}
    >
      <BagIcon width={20} height={20} />
      {designs > 0 && (
        <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-maroon px-1.5 text-[11px] leading-5 font-semibold text-white">
          {designs}
        </span>
      )}
    </Link>
  );
}
