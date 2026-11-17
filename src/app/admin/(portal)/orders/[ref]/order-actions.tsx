"use client";

import { useState } from "react";
import {
  cancelOrderAction,
  dispatchOrderAction,
  reopenOrderAction,
  undoDispatchAction,
} from "@/app/admin/_actions/orders";
import { btnDanger, btnPrimary, btnSecondary, input, label } from "@/components/admin/ui";
import type { OrderStatus } from "@/lib/server/admin/orders";

const todayIst = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
type Result = { ok: true } | { ok: false; error: string };

interface Line {
  id: string;
  code: string;
  name: string;
  sizes: string[];
  sets: number;
  sentSets: number;
}

export function OrderActions({
  id,
  status,
  transport,
  lines,
}: {
  id: string;
  status: OrderStatus;
  transport: string;
  lines: Line[];
}) {
  const left = (l: Line) => l.sets - l.sentSets;
  const open = lines.filter((l) => left(l) > 0);
  const allLeft = () => Object.fromEntries(open.map((l) => [l.id, left(l)]));

  const [mode, setMode] = useState<"idle" | "dispatch" | "cancel">("idle");
  const [f, setF] = useState({ date: todayIst(), transport, lr: "", note: "" });
  const [send, setSend] = useState<Record<string, number>>(allLeft);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<Result>) {
    setBusy(true);
    setError(null);
    const res = await fn().catch(() => ({ ok: false as const, error: "Couldn't reach the server. Try again." }));
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setMode("idle");
  }

  if (status === "cancelled" || status === "dispatched") {
    if (status === "dispatched") return null; // undo is per dispatch, in the Dispatches list
    return (
      <div className="print:hidden">
        <button
          disabled={busy}
          onClick={() => confirm("Reopen this cancelled order?") && run(() => reopenOrderAction(id))}
          className={btnSecondary}
        >
          Reopen order
        </button>
        {error && <p className="mt-2 text-[13px] font-medium text-maroon">{error}</p>}
      </div>
    );
  }

  const sending = open.reduce((n, l) => n + (send[l.id] ?? 0), 0);
  const sendingPcs = open.reduce((n, l) => n + (send[l.id] ?? 0) * l.sizes.length, 0);
  const everything = open.every((l) => (send[l.id] ?? 0) === left(l));

  return (
    <div className="space-y-3 print:hidden">
      {mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setSend(allLeft());
              setMode("dispatch");
            }}
            className={btnPrimary}
          >
            {status === "partial" ? "Dispatch more" : "Dispatch"}
          </button>
          {status === "placed" && (
            <button onClick={() => setMode("cancel")} className={btnDanger}>
              Cancel order
            </button>
          )}
        </div>
      )}

      {mode === "dispatch" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() =>
              dispatchOrderAction(id, {
                ...f,
                items: open.map((l) => ({ itemId: l.id, sets: send[l.id] ?? 0 })),
              }),
            );
          }}
          className="space-y-4 rounded-lg border border-line bg-cream/50 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">What is going in this dispatch?</p>
            <span className="flex gap-3 text-[13px] font-semibold">
              <button type="button" onClick={() => setSend(allLeft())} className="text-maroon underline">
                Everything left
              </button>
              <button type="button" onClick={() => setSend({})} className="text-maroon underline">
                Clear
              </button>
            </span>
          </div>
          <ul className="divide-y divide-line rounded-md border border-line bg-surface">
            {open.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[14px]">
                <span className="min-w-0">
                  <b>{l.code}</b> <span className="text-muted">{l.name}</span>
                  <span className="block text-[12px] text-muted">
                    {l.sizes.join(" · ")} · {left(l)} of {l.sets} sets left
                  </span>
                </span>
                <label className="flex shrink-0 items-center gap-1.5 text-[13px] text-muted">
                  Send
                  <input
                    inputMode="numeric"
                    value={send[l.id] ?? 0}
                    onChange={(e) =>
                      setSend({
                        ...send,
                        [l.id]: Math.max(0, Math.min(left(l), Number(e.target.value.replace(/\D/g, "")) || 0)),
                      })
                    }
                    onFocus={(e) => e.target.select()}
                    aria-label={`Sets of ${l.code} to send now`}
                    className={`${input} w-20 text-center`}
                  />
                </label>
              </li>
            ))}
          </ul>
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
          <p className="text-[13px] text-muted">
            {sending === 0
              ? "Nothing selected yet."
              : `${sending} ${sending === 1 ? "set" : "sets"} · ${sendingPcs} pcs in this dispatch${everything ? " — completes the order." : " — the rest stays to dispatch."}`}
          </p>
          <div className="flex gap-2">
            <button disabled={busy || sending === 0} className={btnPrimary}>
              {busy ? "Saving…" : everything ? "Confirm dispatch" : "Confirm part dispatch"}
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

export function RemoveDispatch({ id, label: what }: { id: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="print:hidden">
      <button
        disabled={busy}
        onClick={async () => {
          if (!confirm(`Remove the dispatch of ${what}? Its sets go back to "to dispatch".`)) return;
          setBusy(true);
          setError(null);
          const res = await undoDispatchAction(id).catch(() => ({
            ok: false as const,
            error: "Couldn't reach the server.",
          }));
          setBusy(false);
          if (!res.ok) setError(res.error);
        }}
        className="text-[12px] font-semibold text-muted underline hover:text-maroon disabled:opacity-50"
      >
        {busy ? "Removing…" : "Remove"}
      </button>
      {error && <span className="block text-[12px] text-maroon">{error}</span>}
    </span>
  );
}
