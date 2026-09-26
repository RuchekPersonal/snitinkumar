"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CloseIcon, MenuIcon, WhatsAppIcon } from "@/components/icons";
import { site } from "@/lib/site";
import { generalEnquiryText, waLink } from "@/lib/whatsapp";

const links = [
  { href: "/", label: "Home" },
  { href: "/catalog", label: "Wholesale catalog" },
  { href: "/new-arrivals", label: "New arrivals" },
  { href: "/catalog/kurtis", label: "Kurtis" },
  { href: "/catalog/kurti-with-pant", label: "Kurti with Pant" },
  { href: "/catalog/kurti-with-dupatta", label: "Kurti with Dupatta" },
  { href: "/catalog/suit-sets", label: "3-Piece Suit Sets" },
  { href: "/terms", label: "Wholesale terms" },
  { href: "/contact", label: "Contact" },
];

export function MobileMenu({ accountHref, accountLabel }: { accountHref: string; accountLabel: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid h-11 w-11 place-items-center rounded-md"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <MenuIcon width={24} height={24} />
      </button>

      {/* Portalled to <body>: the sticky header's backdrop-filter would otherwise clip a fixed overlay. */}
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
            <button className="absolute inset-0 bg-ink/50" aria-label="Close menu" onClick={() => setOpen(false)} />
            {/* Any link tap closes the drawer (clicks bubble up from the anchors). */}
            <nav
              className="absolute inset-y-0 left-0 flex w-[82%] max-w-80 flex-col bg-cream shadow-xl"
              onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
            >
              <div className="flex h-16 items-center justify-between border-b border-line px-4">
                <span className="font-serif text-xl font-semibold">{site.name}</span>
                <button
                  onClick={() => setOpen(false)}
                  className="grid h-11 w-11 place-items-center"
                  aria-label="Close menu"
                >
                  <CloseIcon width={22} height={22} />
                </button>
              </div>
              <ul className="flex-1 overflow-y-auto py-2">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={`block px-5 py-3 text-[16px] ${pathname === l.href ? "font-semibold text-maroon" : ""}`}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href={accountHref} className="block px-5 py-3 text-[16px]">
                    {accountLabel}
                  </Link>
                </li>
              </ul>
              <div className="border-t border-line p-4">
                <a
                  href={waLink(generalEnquiryText)}
                  className="flex h-12 items-center justify-center gap-2 rounded-md bg-whatsapp font-semibold text-white"
                >
                  <WhatsAppIcon /> Chat on WhatsApp
                </a>
              </div>
            </nav>
          </div>,
          document.body,
        )}
    </>
  );
}
