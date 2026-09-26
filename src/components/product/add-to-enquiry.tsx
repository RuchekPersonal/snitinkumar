"use client";

import { useState } from "react";
import type { ProductCard } from "@/lib/types";
import { useEnquiry } from "@/components/enquiry-store";
import { CheckIcon } from "@/components/icons";

export function AddToEnquiryButton({
  product,
  qty,
  variant = "outline",
  className = "",
}: {
  product: ProductCard;
  qty?: number;
  variant?: "outline" | "solid";
  className?: string;
}) {
  const { add, lines } = useEnquiry();
  const [justAdded, setJustAdded] = useState(false);
  const inList = lines.some((l) => l.code === product.code);

  return (
    <button
      type="button"
      onClick={() => {
        add({
          code: product.code,
          qty: qty ?? product.moq,
          name: product.name,
          fabric: product.fabric,
          moq: product.moq,
          sizes: product.sizes,
          coverImageId: product.coverImageId,
        });
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1600);
      }}
      className={`inline-flex w-full items-center justify-center gap-1.5 rounded-md border font-semibold transition-colors ${
        variant === "solid"
          ? `h-12 border-maroon text-[15px] text-white ${justAdded ? "bg-maroon-700" : "bg-maroon hover:bg-maroon-700"}`
          : `h-11 text-[14px] ${justAdded ? "border-maroon bg-maroon text-white" : "border-ink/80 bg-surface text-ink hover:border-maroon hover:text-maroon"}`
      } ${className}`}
    >
      {justAdded ? (
        <>
          <CheckIcon width={18} height={18} /> Added
        </>
      ) : inList ? (
        "Add more"
      ) : variant === "solid" ? (
        "Add to enquiry list"
      ) : (
        "Add to enquiry"
      )}
    </button>
  );
}
