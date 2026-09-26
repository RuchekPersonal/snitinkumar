"use client";

import { useState } from "react";
import type { ProductCard } from "@/lib/types";
import { rupees } from "@/lib/format";
import { productEnquiryText, waLink } from "@/lib/whatsapp";
import { WhatsAppIcon } from "@/components/icons";
import { QtyStepper } from "./qty-stepper";
import { AddToEnquiryButton } from "./add-to-enquiry";

export function ProductActions({ product, url }: { product: ProductCard; url: string }) {
  const [qty, setQty] = useState(product.moq);
  const ask = waLink(productEnquiryText(product.code, product.name, url));
  const clamped = Math.max(product.moq, qty);

  return (
    <>
      <div className="mt-6">
        <p className="eyebrow text-muted">Quantity (pcs)</p>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <QtyStepper value={qty} min={product.moq} onChange={setQty} label="quantity" />
          <div className="text-[13px] leading-snug text-muted">
            <p>Minimum order {product.moq} pcs</p>
            {product.ratePaise !== undefined && (
              <p>
                Estimated <b className="text-ink">{rupees(product.ratePaise * clamped)}</b> for {clamped} pcs
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Desktop buttons */}
      <div className="mt-6 hidden gap-3 lg:flex">
        <AddToEnquiryButton product={product} qty={clamped} variant="solid" className="flex-1" />
        <a
          href={ask}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-md border border-ink/70 font-semibold"
        >
          <WhatsAppIcon /> Ask on WhatsApp
        </a>
      </div>

      {/* Mobile sticky action bar, sits above the bottom nav */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex gap-2 border-t border-line bg-surface/95 p-3 backdrop-blur lg:hidden">
        <a
          href={ask}
          aria-label="Ask on WhatsApp"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-whatsapp text-white"
        >
          <WhatsAppIcon width={24} height={24} />
        </a>
        <AddToEnquiryButton product={product} qty={clamped} variant="solid" className="flex-1" />
      </div>
    </>
  );
}
