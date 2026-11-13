"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CloseIcon, SearchIcon } from "@/components/icons";
import { CartButton } from "./cart-button";

const circle =
  "grid h-12 w-12 place-items-center rounded-full border border-ink/15 text-ink transition-colors hover:border-gold";

/** Desktop header: centred links, or the search field in their place while searching. */
export function DesktopNav({ accountHref, accountLabel }: { accountHref: string; accountLabel: string }) {
  const pathname = usePathname();
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searching) inputRef.current?.focus();
  }, [searching]);
  // Close search after navigating (e.g. submitting a query).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setSearching(false);
  }

  const link = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`py-2 transition-colors hover:text-ink ${
        active ? "text-ink underline decoration-gold decoration-1 underline-offset-[10px]" : "text-ink/70"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <>
      <div className="flex flex-1 justify-center">
        {searching ? (
          <form
            action="/catalog"
            role="search"
            className="relative w-full max-w-xl"
            onKeyDown={(e) => e.key === "Escape" && setSearching(false)}
          >
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted"
              width={18}
              height={18}
            />
            <input
              ref={inputRef}
              type="search"
              name="q"
              placeholder="Search by name, code (SN-101) or fabric"
              aria-label="Search designs"
              enterKeyHint="search"
              className="h-12 w-full rounded-full border border-ink/15 bg-surface pr-4 pl-11 text-[15px] placeholder:text-muted/80 focus:border-gold focus:outline-none"
            />
          </form>
        ) : (
          <nav className="flex items-center gap-11 text-[15px]" aria-label="Main">
            {link("/catalog", "Catalog", pathname.startsWith("/catalog"))}
            {link("/new-arrivals", "New arrivals", pathname === "/new-arrivals")}
          </nav>
        )}
      </div>
      <div className="flex items-center gap-4">
        <Link href={accountHref} className="mr-3 text-[15px] text-ink/70 transition-colors hover:text-ink">
          {accountLabel}
        </Link>
        <button
          type="button"
          onClick={() => setSearching((s) => !s)}
          aria-label={searching ? "Close search" : "Search designs"}
          aria-expanded={searching}
          className={circle}
        >
          {searching ? <CloseIcon width={18} height={18} /> : <SearchIcon width={19} height={19} />}
        </button>
        <CartButton />
      </div>
    </>
  );
}
