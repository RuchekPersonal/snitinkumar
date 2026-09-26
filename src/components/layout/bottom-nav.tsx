"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BagIcon, GridIcon, HomeIcon, UserIcon, WhatsAppIcon } from "@/components/icons";
import { useEnquiry } from "@/components/enquiry-store";
import { generalEnquiryText, waLink } from "@/lib/whatsapp";

export function BottomNav({ accountHref }: { accountHref: string }) {
  const pathname = usePathname();
  const { designs } = useEnquiry();

  const items = [
    { href: "/", label: "Home", Icon: HomeIcon, active: pathname === "/" },
    {
      href: "/catalog",
      label: "Catalog",
      Icon: GridIcon,
      active: pathname.startsWith("/catalog") || pathname.startsWith("/product") || pathname === "/new-arrivals",
    },
    { href: "/enquiry", label: "Enquiry", Icon: BagIcon, active: pathname === "/enquiry", badge: designs },
    {
      href: accountHref,
      label: "Account",
      Icon: UserIcon,
      active: pathname.startsWith("/account") || pathname === "/login",
    },
  ];

  // The product and enquiry pages have their own sticky action bar, so the FAB steps aside.
  const showFab = !pathname.startsWith("/product/") && pathname !== "/enquiry";

  return (
    <>
      {showFab && (
        <a
          href={waLink(generalEnquiryText)}
          aria-label="Chat on WhatsApp"
          className="fixed right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-whatsapp text-white shadow-lg lg:right-6 lg:bottom-6 bottom-[calc(5rem+env(safe-area-inset-bottom))]"
        >
          <WhatsAppIcon width={28} height={28} />
        </a>
      )}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="grid h-16 grid-cols-4">
          {items.map(({ href, label, Icon, active, badge }) => (
            <li key={label}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                  active ? "text-maroon" : "text-muted"
                }`}
              >
                <Icon width={22} height={22} />
                {label}
                {!!badge && (
                  <span className="absolute top-2 left-1/2 ml-2 grid min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] leading-4 font-bold text-ink">
                    {badge}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
