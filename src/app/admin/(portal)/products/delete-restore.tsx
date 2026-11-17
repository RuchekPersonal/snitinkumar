"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProductAction, restoreProductAction } from "@/app/admin/_actions/products";
import { btnDanger, btnPrimary } from "@/components/admin/ui";

const small = "rounded-md px-2.5 py-1 text-[12px] font-semibold text-muted hover:text-maroon disabled:opacity-50";

/** Soft delete. On the edit page it goes back to the list afterwards; in a table row it stays put. */
export function DeleteProduct({ id, code, variant = "row" }: { id: string; code: string; variant?: "row" | "page" }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (!confirm(`Delete ${code}? It will be removed from the store. You can restore it from the Deleted tab.`))
            return;
          await deleteProductAction(id);
          if (variant === "page") router.push("/admin/products?show=deleted");
        })
      }
      className={variant === "page" ? btnDanger : small}
      aria-label={variant === "row" ? `Delete ${code}` : undefined}
    >
      {pending ? "Deleting…" : variant === "page" ? "Delete design" : "Delete"}
    </button>
  );
}

export function RestoreProduct({ id, code, variant = "row" }: { id: string; code: string; variant?: "row" | "page" }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => restoreProductAction(id))}
      className={variant === "page" ? btnPrimary : `${small} text-maroon`}
      aria-label={variant === "row" ? `Restore ${code}` : undefined}
    >
      {pending ? "Restoring…" : "Restore"}
    </button>
  );
}
