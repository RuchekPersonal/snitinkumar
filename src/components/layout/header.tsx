import { site } from "@/lib/site";
import type { Viewer } from "@/lib/types";
import { Wordmark } from "./wordmark";
import { DesktopNav } from "./desktop-nav";
import { MobileBar } from "./mobile-bar";

export function Header({ viewer }: { viewer: Viewer }) {
  const signedIn = !!viewer.retailerId || viewer.role !== "guest";
  const accountHref = signedIn ? "/account" : "/login";
  const accountLabel = signedIn ? "My account" : "Login";

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
        {/* Mobile: menu · wordmark · search, cart */}
        <MobileBar accountHref={accountHref} accountLabel={accountLabel} wordmark={<Wordmark center />} />

        {/* Desktop: wordmark · centred links · login, search, cart */}
        <div className="hidden border-b border-line lg:block">
          <div className="mx-auto flex h-24 max-w-7xl items-center gap-8 px-6">
            <Wordmark />
            <DesktopNav accountHref={accountHref} accountLabel={accountLabel} />
          </div>
        </div>
      </header>
    </>
  );
}
