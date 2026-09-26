import Link from "next/link";
import { site } from "@/lib/site";
import { generalEnquiryText, waLink } from "@/lib/whatsapp";

export function Footer() {
  return (
    <footer className="mt-16 bg-ink text-[14px] text-gold-50/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
        <div>
          <p className="font-serif text-2xl font-semibold text-white">{site.name}</p>
          <p className="mt-3 max-w-xs leading-relaxed">
            Manufacturer and wholesale supplier of women&apos;s kurtis, kurti sets and 3-piece suits for retailers
            across India.
          </p>
        </div>
        <div>
          <p className="eyebrow text-gold">Shop</p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link href="/catalog" className="hover:text-white">
                Wholesale catalog
              </Link>
            </li>
            <li>
              <Link href="/new-arrivals" className="hover:text-white">
                New arrivals
              </Link>
            </li>
            <li>
              <Link href="/catalog/kurtis" className="hover:text-white">
                Kurtis
              </Link>
            </li>
            <li>
              <Link href="/catalog/suit-sets" className="hover:text-white">
                3-Piece Suit Sets
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-gold">Wholesale terms</p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link href="/terms" className="hover:text-white">
                Minimum order &amp; enquiries
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-white">
                Our manufacturing
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-white">
                Retailer login / register
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-white">
                Privacy
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-gold">Contact</p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <a href={`tel:${site.helplineTel}`} className="hover:text-white">
                {site.helplineDisplay}
              </a>
            </li>
            <li>
              <a href={waLink(generalEnquiryText)} className="hover:text-white">
                WhatsApp us
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`} className="break-all hover:text-white">
                {site.email}
              </a>
            </li>
            <li>{site.address}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-[12px] text-gold-50/60 lg:px-6">
          © {new Date().getFullYear()} {site.name}. Wholesale only · Prices shared with registered retailers.
        </p>
      </div>
    </footer>
  );
}
