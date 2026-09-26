import Link from "next/link";
import type { ReactNode } from "react";

// Shared admin look (PDF p.7–12): white cards on cream, maroon primary actions.

export const btn =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-md px-4 text-[14px] font-semibold transition-colors disabled:opacity-50";
export const btnPrimary = `${btn} bg-maroon text-white hover:bg-maroon-700`;
export const btnSecondary = `${btn} border border-line bg-surface text-ink hover:border-gold`;
export const btnDanger = `${btn} border border-maroon/40 bg-surface text-maroon hover:bg-maroon-50`;
export const input =
  "h-10 w-full rounded-md border border-line bg-surface px-3 text-[14px] focus:border-gold focus:outline-none disabled:bg-cream";
export const label = "eyebrow mb-1.5 block text-[10px] text-muted";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-[30px] leading-tight font-semibold">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-line bg-surface ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          {title && <h2 className="font-serif text-xl font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const statusStyles: Record<string, string> = {
  new: "bg-gold-50 text-[#8a6a1f]",
  confirmed: "bg-[#dfe7f5] text-[#2f4a7a]",
  dispatched: "bg-chip text-chip-ink",
  cancelled: "bg-maroon-50 text-maroon",
  pending: "bg-gold-50 text-[#8a6a1f]",
  approved: "bg-chip text-chip-ink",
  rejected: "bg-maroon-50 text-maroon",
  blocked: "bg-maroon-50 text-maroon",
};

export function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[12px] font-semibold capitalize ${statusStyles[status] ?? "bg-cream"}`}
    >
      {status}
    </span>
  );
}

export function Tabs({ tabs }: { tabs: { href: string; label: string; count?: number; active: boolean }[] }) {
  return (
    <nav className="no-scrollbar -mx-4 mb-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:px-0" aria-label="Filter">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.active ? "page" : undefined}
          className={`shrink-0 rounded-md px-3 py-2 text-[14px] font-medium ${
            t.active ? "bg-ink text-white" : "text-muted hover:bg-surface"
          }`}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 opacity-70">{t.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-5 py-10 text-center text-[14px] text-muted">{children}</p>;
}
