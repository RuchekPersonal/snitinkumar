"use client";

import { btnSecondary } from "@/components/admin/ui";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={`${btnSecondary} print:hidden`}>
      {label}
    </button>
  );
}
