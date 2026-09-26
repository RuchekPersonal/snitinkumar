/* eslint-disable @next/next/no-img-element -- images are served pre-sized by /api/img, not next/image */

// Product photos come pre-resized from /api/img (RFD §6), so a plain <img> with srcset
// avoids a second optimisation pass.
export function ProductImage({
  id,
  alt,
  sizes = "(min-width: 1024px) 25vw, 50vw",
  priority = false,
  className = "",
}: {
  id: string | null;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  if (!id) {
    return (
      <div className={`grid aspect-[3/4] place-items-center bg-sand text-[12px] text-muted ${className}`}>
        Photo coming soon
      </div>
    );
  }
  return (
    <img
      src={`/api/img/${id}/card.webp`}
      srcSet={`/api/img/${id}/thumb.webp 400w, /api/img/${id}/card.webp 800w, /api/img/${id}/full.webp 1200w`}
      sizes={sizes}
      alt={alt}
      width={800}
      height={1067}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={`aspect-[3/4] w-full bg-sand object-cover ${className}`}
    />
  );
}
