"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { Role } from "@/lib/types";

const roles: { role: Role; label: string }[] = [
  { role: "guest", label: "Guest" },
  { role: "pending", label: "Pending retailer" },
  { role: "approved", label: "Approved retailer" },
];

// Review aid only (shown in development, or when ENABLE_DEMO_ROLES=true).
export function DemoRoleBar({ role }: { role: Role }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const next = encodeURIComponent(search ? `${pathname}?${search}` : pathname);

  return (
    <div className="border-b border-dashed border-gold bg-gold-50 text-[12px]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5 lg:px-6">
        <span className="font-semibold text-ink">Preview as:</span>
        {roles.map((r) => (
          <a
            key={r.role}
            href={`/api/dev/session?role=${r.role}&next=${next}`}
            className={
              role === r.role ? "font-bold text-maroon underline" : "text-muted underline-offset-2 hover:underline"
            }
          >
            {r.label}
          </a>
        ))}
        <span className="text-muted">(review only; replaced by real login in Phase 4)</span>
      </div>
    </div>
  );
}
