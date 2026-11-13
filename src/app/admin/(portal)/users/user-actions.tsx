"use client";

import { useState, useTransition } from "react";
import { removeAdminUserAction, resetAdminPasswordAction, setAdminRoleAction } from "@/app/admin/_actions/users";
import type { AdminRole } from "@/lib/server/admin/users";
import { btnPrimary, btnSecondary, input, label } from "@/components/admin/ui";

export function UserActions({ id, name, role }: { id: string; name: string; role: AdminRole }) {
  const [pending, start] = useTransition();
  const [resetOpen, setResetOpen] = useState(false);

  const act = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, ask?: string) =>
    start(async () => {
      if (ask && !confirm(ask)) return;
      const res = await fn();
      if (!res.ok) alert(res.error);
    });

  const small = "rounded-md px-2.5 py-1 text-[12px] font-semibold text-muted hover:text-maroon disabled:opacity-50";
  return (
    <div className="flex flex-wrap justify-end gap-1.5" aria-busy={pending}>
      <button
        disabled={pending}
        onClick={() =>
          act(
            () => setAdminRoleAction(id, role === "owner" ? "staff" : "owner"),
            role === "owner"
              ? `Make ${name} staff? They will no longer be able to manage admin users.`
              : `Make ${name} an owner? They will be able to add, change and remove admin users, including you.`,
          )
        }
        className={small}
      >
        {role === "owner" ? "Make staff" : "Make owner"}
      </button>
      <button disabled={pending} onClick={() => setResetOpen(true)} className={small}>
        Reset password
      </button>
      <button
        disabled={pending}
        onClick={() =>
          act(
            () => removeAdminUserAction(id),
            `Remove ${name}? They will be signed out and can no longer log in. This cannot be undone.`,
          )
        }
        className={small}
      >
        Remove
      </button>
      {resetOpen && <ResetPassword id={id} name={name} onClose={() => setResetOpen(false)} />}
    </div>
  );
}

function ResetPassword({ id, name, onClose }: { id: string; name: string; onClose: () => void }) {
  const [f, setF] = useState({ password: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await resetAdminPasswordAction(id, f);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4 text-left"
      role="dialog"
      aria-modal="true"
      aria-label={`Reset password for ${name}`}
    >
      <form onSubmit={submit} className="w-full max-w-md rounded-lg bg-surface p-6">
        <h2 className="font-serif text-2xl">Reset password</h2>
        <p className="mt-1 text-[13px] text-muted">
          Set a new password for {name}. They are signed out everywhere and any login lock is lifted. Share the new
          password with them privately.
        </p>
        <div className="mt-4 grid gap-3">
          {(
            [
              ["password", "New password (10+ characters)"],
              ["confirm", "Repeat new password"],
            ] as const
          ).map(([k, text]) => (
            <div key={k}>
              <label htmlFor={`rp-${id}-${k}`} className={label}>
                {text}
              </label>
              <input
                id={`rp-${id}-${k}`}
                type="password"
                autoComplete="new-password"
                required
                value={f[k]}
                onChange={(e) => setF({ ...f, [k]: e.target.value })}
                className={input}
              />
            </div>
          ))}
        </div>
        {error && <p className="mt-3 text-[14px] font-medium text-maroon">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button disabled={busy} className={btnPrimary}>
            {busy ? "Saving…" : "Reset password"}
          </button>
        </div>
      </form>
    </div>
  );
}
