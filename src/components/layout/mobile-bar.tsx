"use client";

import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { CloseIcon, SearchIcon } from "@/components/icons";
import { CartButton } from "./cart-button";
import { MobileMenu } from "./mobile-menu";

/** Phone header: menu · wordmark · search and cart icons; search opens a field under the bar. */
export function MobileBar({
  accountHref,
  accountLabel,
  wordmark,
}: {
  accountHref: string;
  accountLabel: string;
  wordmark: React.ReactNode;
}) {
  const pathname = usePathname();
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close search after navigating (e.g. submitting a query).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setSearching(false);
  }

  const toggle = () => {
    if (searching) return setSearching(false);
    // Render the field and focus it inside the tap, so iOS opens the keyboard.
    flushSync(() => setSearching(true));
    inputRef.current?.focus();
  };

  return (
    <div className="border-b border-line lg:hidden">
      <div className="grid h-16 grid-cols-[92px_1fr_92px] items-center px-2">
        <MobileMenu accountHref={accountHref} accountLabel={accountLabel} />
        {wordmark}
        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            onClick={toggle}
            aria-label={searching ? "Close search" : "Search designs"}
            aria-expanded={searching}
            className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 text-ink transition-colors hover:border-gold"
          >
            {searching ? <CloseIcon width={18} height={18} /> : <SearchIcon width={19} height={19} />}
          </button>
          <CartButton />
        </div>
      </div>
      {searching && (
        <form
          action="/catalog"
          role="search"
          className="relative px-4 pb-3"
          onKeyDown={(e) => e.key === "Escape" && setSearching(false)}
        >
          <SearchIcon
            className="pointer-events-none absolute top-[22px] left-8 -translate-y-1/2 text-muted"
            width={18}
            height={18}
          />
          <input
            ref={inputRef}
            type="search"
            name="q"
            placeholder="Search name, code (SN-101), fabric"
            aria-label="Search designs"
            enterKeyHint="search"
            className="h-11 w-full rounded-full border border-ink/15 bg-surface pr-4 pl-11 text-[16px] placeholder:text-muted/80 focus:border-gold focus:outline-none"
          />
        </form>
      )}
    </div>
  );
}
