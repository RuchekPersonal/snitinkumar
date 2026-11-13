import Link from "next/link";
import { site } from "@/lib/site";

export function Wordmark({ center = false }: { center?: boolean }) {
  return (
    <Link href="/" className={`block leading-none ${center ? "text-center" : ""}`} aria-label={`${site.name} home`}>
      <span className="block text-[9px] font-medium tracking-[0.28em] text-gold-600 uppercase sm:text-[11px]">
        {site.tagline}
      </span>
      <span className="mt-1.5 block font-serif text-[22px] tracking-[-0.01em] text-ink sm:text-[30px]">
        {site.name}
      </span>
    </Link>
  );
}
