"use client";

import { useTransition } from "react";
import { setRetailerStatusAction } from "@/app/admin/_actions/customers";
import type { RetailerStatus } from "@/lib/server/admin/customers";

export function CustomerActions({ id, status, shop }: { id: string; status: RetailerStatus; shop: string }) {
  const [pending, start] = useTransition();

  const act = (next: RetailerStatus, ask?: string) =>
    start(async () => {
      let reason = "";
      if (ask) {
        const answer = prompt(ask);
        if (answer === null) return;
        reason = answer;
      }
      const res = await setRetailerStatusAction(id, next, reason);
      if (!res.ok) alert(res.error);
    });

  const small = "rounded-md px-2.5 py-1 text-[12px] font-semibold disabled:opacity-50";
  return (
    <div className="flex gap-1.5" aria-busy={pending}>
      {status === "pending" && (
        <>
          <button disabled={pending} onClick={() => act("approved")} className={`${small} bg-maroon text-white`}>
            Approve
          </button>
          <button
            disabled={pending}
            onClick={() => act("rejected", `Reason for rejecting ${shop}? (optional)`)}
            className={`${small} border border-line`}
            aria-label={`Reject ${shop}`}
          >
            ✕
          </button>
        </>
      )}
      {status === "approved" && (
        <button
          disabled={pending}
          onClick={() => act("blocked", `Why block ${shop}?`)}
          className={`${small} text-muted hover:text-maroon`}
        >
          Block
        </button>
      )}
      {(status === "blocked" || status === "rejected") && (
        <button disabled={pending} onClick={() => act("approved")} className={`${small} text-muted hover:text-maroon`}>
          {status === "blocked" ? "Unblock" : "Approve"}
        </button>
      )}
    </div>
  );
}
