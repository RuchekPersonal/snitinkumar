"use client";

import { useState } from "react";
import { cancelOrderAction, markDispatchedAction, reopenOrderAction } from "@/app/admin/_actions/orders";
import { btnDanger, btnPrimary, btnSecondary, input, label } from "@/components/admin/ui";
import type { OrderStatus } from "@/lib/server/admin/orders";

const todayIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export function OrderActions({ id, status, transport }: { id: string; status: OrderStatus; transport: string }) {
  const [mode, setMode] = useState<"idle" | "dispatch" | "cancel">("idle");
  const [f, setF] = useState({ date: todayIst(), transport, lr: "", note: "" });
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setBusy(true);
    setError(null);
    const res = await fn().catch(() => ({ ok: false as const, error: "Couldn't reach the server. Try again." }));
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setMode("idle");
  }

  if (status !== "placed") {
    return (
      <div className="print:hidden">
        <button
          disabled={busy}
          onClick={() => {
            const msg =
              status === "dispatched"
                ? "Move this order back to To dispatch? The dispatch details will be cleared."
                : "Reopen this cancelled order?";
            if (confirm(msg)) run(() => reopenOrderAction(id));
          }}
          className={btnSecondary}
        >
          {status === "dispatched" ? "Undo dispatch" : "Reopen order"}
        </button>
        {error && <p className="mt-2 text-[13px] font-medium text-maroon">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3 print:hidden">
      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setMode("dispatch")} className={btnPrimary}>
            Mark as dispatched
          </button>
          <button onClick={() => setMode("cancel")} className={btnDanger}>
            Cancel order
          </button>
        </div>
      )}

      {mode === "dispatch" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => markDispatchedAction(id, f));
          }}
          className="space-y-3 rounded-lg border border-line bg-cream/50 p-4"
        >
          <p className="font-semibold">Dispatch details</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="d-date" className={label}>
                Dispatched on
              </label>
              <input
                id="d-date"
                type="date"
                required
                value={f.date}
                max={todayIst()}
                onChange={(e) => setF({ ...f, date: e.target.value })}
                className={input}
              />
            </div>
            <div>
              <label htmlFor="d-lr" className={label}>
                LR / docket no.
              </label>
              <input
                id="d-lr"
                value={f.lr}
                maxLength={60}
                onChange={(e) => setF({ ...f, lr: e.target.value })}
                className={input}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="d-transport" className={label}>
                Transport
              </label>
              <input
                id="d-transport"
                value={f.transport}
                maxLength={120}
                onChange={(e) => setF({ ...f, transport: e.target.value })}
                className={input}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="d-note" className={label}>
                Note (optional)
              </label>
              <input
                id="d-note"
                value={f.note}
                maxLength={300}
                onChange={(e) => setF({ ...f, note: e.target.value })}
                className={input}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button disabled={busy} className={btnPrimary}>
              {busy ? "Saving…" : "Confirm dispatch"}
            </button>
            <button type="button" onClick={() => setMode("idle")} className={btnSecondary}>
              Back
            </button>
          </div>
        </form>
      )}

      {mode === "cancel" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => cancelOrderAction(id, reason));
          }}
          className="space-y-3 rounded-lg border border-maroon/30 bg-maroon-50 p-4"
        >
          <label htmlFor="c-reason" className={label}>
            Reason (optional)
          </label>
          <input
            id="c-reason"
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
            className={input}
          />
          <div className="flex gap-2">
            <button disabled={busy} className={btnDanger}>
              {busy ? "Cancelling…" : "Cancel this order"}
            </button>
            <button type="button" onClick={() => setMode("idle")} className={btnSecondary}>
              Back
            </button>
          </div>
        </form>
      )}
      {error && <p className="text-[13px] font-medium text-maroon">{error}</p>}
    </div>
  );
}
