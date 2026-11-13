/* eslint-disable @next/next/no-img-element -- category photos are pre-sized by /api/site-img */
import Link from "next/link";

// Warm studio tones for tiles without a photo, echoing the hero's backdrop.
const TONES = ["#b8977a", "#9c7462", "#a88d78", "#78675c"];

// Kurta outline drawn on photo-less tiles, so they read as garments rather than empty boxes.
const KURTA = "polygon(25% 0, 75% 0, 100% 20%, 83% 33%, 79% 100%, 21% 100%, 17% 33%, 0 20%)";

/** Home category tile in the hero's style: photo (or toned backdrop), bottom shade, Georgia name. */
export function CategoryTile({
  href,
  name,
  meta,
  imageId,
  index,
  className = "",
}: {
  href: string;
  name: string;
  meta: string;
  imageId: string | null;
  index: number;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex h-[194px] items-end overflow-hidden rounded-md p-4 text-white lg:h-[270px] lg:p-6 ${className}`}
      style={imageId ? undefined : { backgroundColor: TONES[index % TONES.length] }}
    >
      {imageId ? (
        <img
          src={`/api/site-img/${imageId}/full.webp`}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <>
          <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_32%,#e9c9a355,transparent_65%)]" />
          <span
            aria-hidden
            className="absolute top-5 left-1/2 h-[128px] w-[84px] -translate-x-1/2 bg-[linear-gradient(130deg,#edd5ac66,#643e3c88)] transition-transform duration-500 group-hover:-translate-y-1.5 lg:top-7 lg:h-[160px] lg:w-[100px]"
            style={{ clipPath: KURTA }}
          />
        </>
      )}
      <span className="absolute inset-0 bg-[linear-gradient(0deg,rgba(36,25,22,.72),transparent_68%)]" />
      <span className="relative">
        <span className="block font-serif text-[21px] leading-tight lg:text-[25px]">{name}</span>
        <span className="mt-1.5 block text-[9px] tracking-[0.13em] text-brass-200 uppercase lg:text-[10px]">
          {meta}
        </span>
      </span>
    </Link>
  );
}
