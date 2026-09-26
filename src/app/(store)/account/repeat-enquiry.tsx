"use client";

import { useRouter } from "next/navigation";
import type { ProductCard } from "@/lib/types";
import { useEnquiry } from "@/components/enquiry-store";

/** Copies a past enquiry's designs into the enquiry list (skipping designs no longer available). */
export function RepeatEnquiry({
  lines,
  products,
}: {
  lines: { code: string; qty: number }[];
  products: ProductCard[];
}) {
  const router = useRouter();
  const { add } = useEnquiry();
  const available = lines.filter((l) => products.some((p) => p.code === l.code));
  const missing = lines.length - available.length;

  return (
    <div className="mt-2 flex items-center gap-3">
      <button
        type="button"
        disabled={available.length === 0}
        onClick={() => {
          for (const l of available) {
            const p = products.find((x) => x.code === l.code)!;
            add({
              code: p.code,
              qty: Math.max(p.moq, l.qty),
              name: p.name,
              fabric: p.fabric,
              moq: p.moq,
              sizes: p.sizes,
              coverImageId: p.coverImageId,
            });
          }
          router.push("/enquiry");
        }}
        className="h-9 rounded-md border border-maroon px-3 text-[13px] font-semibold text-maroon disabled:opacity-40"
      >
        Repeat enquiry
      </button>
      {missing > 0 && (
        <span className="text-[12px] text-muted">
          {missing} design{missing > 1 ? "s" : ""} no longer available
        </span>
      )}
    </div>
  );
}
