import Link from "next/link";
import { site } from "@/lib/site";

export function Wordmark({ center = false, light = false }: { center?: boolean; light?: boolean }) {
  return (
    <Link href="/" className={`block leading-none ${center ? "text-center" : ""}`} aria-label={`${site.name} home`}>
      <span className={`eyebrow block text-[9px] sm:text-[10px] ${light ? "text-gold" : "text-maroon"}`}>
        {site.tagline}
      </span>
      <span
        className={`mt-1 block font-serif text-[22px] font-semibold sm:text-2xl ${light ? "text-white" : "text-ink"}`}
      >
        {site.name}
      </span>
    </Link>
  );
}
