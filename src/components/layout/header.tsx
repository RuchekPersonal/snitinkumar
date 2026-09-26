import Link from "next/link";
import { site } from "@/lib/site";
import type { Viewer } from "@/lib/types";
import { SearchIcon } from "@/components/icons";
import { Wordmark } from "./wordmark";
import { CartButton, CartIconButton } from "./cart-button";
import { MobileMenu } from "./mobile-menu";

function SearchBar({ className = "" }: { className?: string }) {
  return (
    <form action="/catalog" role="search" className={`relative ${className}`}>
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
        width={18}
        height={18}
      />
      <input
        type="search"
        name="q"
        placeholder="Search by name, code (SN-101) or fabric"
        aria-label="Search designs"
        enterKeyHint="search"
        className="h-11 w-full rounded-lg border border-line bg-surface pr-3 pl-10 text-[15px] placeholder:text-muted/80 focus:border-gold focus:outline-none"
      />
    </form>
  );
}

export function Header({ viewer }: { viewer: Viewer }) {
  const accountHref = viewer.role === "guest" ? "/login" : "/account";
  const accountLabel = viewer.role === "guest" ? "Login" : "My account";

  return (
    <>
      <div className="bg-ink text-[12px] text-gold-50">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-center px-4 lg:justify-between">
          <p className="hidden lg:block">Direct manufacturers &amp; wholesalers of premium Indian ethnic wear</p>
          <p>
            Wholesale helpline ·{" "}
            <a href={`tel:${site.helplineTel}`} className="font-medium text-white">
              {site.helplineDisplay}
            </a>
            <span className="hidden sm:inline"> · {site.hours}</span>
          </p>
        </div>
      </div>

      {/* Only the compact brand row stays pinned, so phones keep most of the screen for products. */}
      <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/85">
        {/* Mobile: menu · wordmark · cart */}
        <div className="border-b border-line lg:hidden">
          <div className="grid h-16 grid-cols-[44px_1fr_44px] items-center px-2">
            <MobileMenu accountHref={accountHref} accountLabel={accountLabel} />
            <Wordmark center />
            <CartIconButton />
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden border-b border-line lg:block">
          <div className="mx-auto flex h-20 max-w-7xl items-center gap-8 px-6">
            <Wordmark />
            <SearchBar className="max-w-xl flex-1" />
            <nav className="ml-auto flex items-center gap-6 text-[15px] font-medium" aria-label="Main">
              <Link href="/catalog" className="hover:text-maroon">
                Catalog
              </Link>
              <Link href="/new-arrivals" className="hover:text-maroon">
                New arrivals
              </Link>
              <Link href={accountHref} className="hover:text-maroon">
                {accountLabel}
              </Link>
            </nav>
            <CartButton />
          </div>
        </div>
      </header>

      <div className="px-4 pt-3 lg:hidden">
        <SearchBar />
      </div>
    </>
  );
}
