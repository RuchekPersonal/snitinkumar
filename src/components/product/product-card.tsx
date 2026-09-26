import Link from "next/link";
import type { ProductCard as Card } from "@/lib/types";
import { sizesLabel } from "@/lib/format";
import { ProductImage } from "./product-image";
import { MoqChip, NewBadge, Rate } from "./rate";
import { AddToEnquiryButton } from "./add-to-enquiry";

export function ProductCard({
  product,
  priority = false,
  showSizes = false,
}: {
  product: Card;
  priority?: boolean;
  showSizes?: boolean;
}) {
  const href = `/product/${product.code}`;
  return (
    <article className="flex flex-col">
      <Link href={href} className="relative block overflow-hidden rounded-md">
        <ProductImage id={product.coverImageId} alt={product.name} priority={priority} />
        {product.isNew && (
          <span className="absolute top-2 left-2">
            <NewBadge />
          </span>
        )}
        {!product.inStock && (
          <span className="absolute right-0 bottom-0 left-0 bg-ink/75 py-1 text-center text-[11px] font-semibold text-white">
            Out of stock
          </span>
        )}
      </Link>
      <div className="mt-2.5 flex flex-1 flex-col">
        <p className="flex justify-between gap-2 text-[11px] font-medium tracking-wider text-muted uppercase">
          <span>{product.code}</span>
          <span className="truncate text-maroon">{product.fabric}</span>
        </p>
        <h3 className="mt-1 line-clamp-2 text-[14px] leading-snug font-semibold sm:text-[15px]">
          <Link href={href} className="hover:text-maroon">
            {product.name}
          </Link>
        </h3>
        {showSizes && <p className="mt-1 text-[12px] text-muted">Sizes {sizesLabel(product.sizes)}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-2">
          <Rate ratePaise={product.ratePaise} />
          <MoqChip moq={product.moq} />
        </div>
        <AddToEnquiryButton product={product} className="mt-3" />
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  priorityCount = 0,
  showSizes = false,
}: {
  products: Card[];
  priorityCount?: number;
  showSizes?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.code} product={p} priority={i < priorityCount} showSizes={showSizes} />
      ))}
    </div>
  );
}
