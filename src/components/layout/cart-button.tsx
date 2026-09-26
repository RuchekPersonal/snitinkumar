"use client";

import Link from "next/link";
import { useEnquiry } from "@/components/enquiry-store";
import { BagIcon } from "@/components/icons";

function Badge({ n, className = "" }: { n: number; className?: string }) {
  if (n === 0) return null;
  return (
    <span
      className={`grid min-w-5 place-items-center rounded-full bg-gold px-1.5 text-[11px] leading-5 font-bold text-ink ${className}`}
    >
      {n}
    </span>
  );
}

export function CartButton() {
  const { designs } = useEnquiry();
  return (
    <Link
      href="/enquiry"
      className="inline-flex h-11 items-center gap-2 rounded-md bg-maroon px-4 text-[15px] font-semibold text-white hover:bg-maroon-700"
    >
      Enquiry cart <Badge n={designs} />
    </Link>
  );
}

export function CartIconButton() {
  const { designs } = useEnquiry();
  return (
    <Link
      href="/enquiry"
      aria-label={`Enquiry list, ${designs} designs`}
      className="relative grid h-11 w-11 place-items-center rounded-md text-ink"
    >
      <BagIcon width={24} height={24} />
      <Badge n={designs} className="absolute top-0.5 right-0" />
    </Link>
  );
}
