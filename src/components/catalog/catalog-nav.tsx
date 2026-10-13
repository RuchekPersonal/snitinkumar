"use client";

// Catalogue filters change the URL with history.pushState: Next.js syncs usePathname and
// useSearchParams, so the browser re-filters with no server request, the link stays
// shareable and Back/Forward work. A refresh or shared link is rendered by the server as usual.

export function navigate(href: string, { scrollTop = false } = {}) {
  window.history.pushState(null, "", href);
  if (scrollTop) window.scrollTo({ top: 0 });
}

/** A real link (crawlable, opens in a new tab) that filters in place on a plain click. */
export function CatalogLink({
  href,
  scrollTop,
  onClick,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; scrollTop?: boolean }) {
  return (
    <a
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(href, { scrollTop });
      }}
      {...props}
    />
  );
}
