"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BagIcon, BoxIcon, HomeIcon, CloseIcon, GridIcon, MenuIcon, SwatchIcon, UserIcon } from "@/components/icons";
import { logoutAction } from "@/app/admin/_actions/auth";

const items = [
  { href: "/admin", label: "Dashboard", Icon: GridIcon, exact: true },
  { href: "/admin/products", label: "Products", Icon: BoxIcon },
  { href: "/admin/home", label: "Home page", Icon: HomeIcon },
  { href: "/admin/categories", label: "Categories", Icon: SwatchIcon },
  { href: "/admin/enquiries", label: "Enquiries", Icon: BagIcon, badge: "enquiries" as const },
  { href: "/admin/customers", label: "Customers", Icon: UserIcon, badge: "customers" as const },
];

interface Props {
  name: string;
  role: string;
  badges: { enquiries: number; customers: number };
}

function Sidebar({ name, role, badges, onNavigate }: Props & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-full flex-col bg-ink text-gold-50/85">
      <div className="px-5 pt-6 pb-5">
        <p className="eyebrow text-[10px] text-gold">Admin portal</p>
        <p className="mt-1 font-serif text-2xl font-semibold text-white">S. Nitinkumar</p>
      </div>
      <nav className="flex-1 space-y-1 px-3" aria-label="Admin">
        {items.map(({ href, label, Icon, exact, badge }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          const count = badge ? badges[badge] : 0;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex h-11 items-center gap-3 rounded-md px-3 text-[15px] ${
                active ? "bg-maroon font-semibold text-white" : "hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon width={19} height={19} />
              <span className="flex-1">{label}</span>
              {count > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1.5 text-[11px] font-bold text-ink">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-5 py-4 text-[13px]">
        <Link href="/" className="block py-1 hover:text-white" target="_blank">
          ↗ View storefront
        </Link>
        <Link href="/admin/account" onClick={onNavigate} className="block py-1 hover:text-white">
          Change password
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold text-[13px] font-bold text-ink">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{name}</p>
            <form action={logoutAction}>
              <span className="capitalize">{role}</span> ·{" "}
              <button type="submit" className="underline-offset-2 hover:text-white hover:underline">
                Log out
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminNav(props: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 lg:block">
        <Sidebar {...props} />
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-2 bg-ink px-2 text-white lg:hidden">
        <button onClick={() => setOpen(true)} className="grid h-11 w-11 place-items-center" aria-label="Open menu">
          <MenuIcon width={24} height={24} />
        </button>
        <span className="font-serif text-xl font-semibold">Admin</span>
        {props.badges.enquiries > 0 && (
          <Link
            href="/admin/enquiries?status=new"
            className="ml-auto rounded-full bg-gold px-2.5 py-1 text-[12px] font-bold text-ink"
          >
            {props.badges.enquiries} new
          </Link>
        )}
      </div>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
            <button className="absolute inset-0 bg-ink/60" aria-label="Close menu" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-[82%] max-w-72">
              <button
                onClick={() => setOpen(false)}
                className="absolute top-4 right-3 z-10 grid h-10 w-10 place-items-center text-white"
                aria-label="Close menu"
              >
                <CloseIcon />
              </button>
              <Sidebar {...props} onNavigate={() => setOpen(false)} />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
