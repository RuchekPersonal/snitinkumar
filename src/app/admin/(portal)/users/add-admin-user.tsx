"use client";

import { useState } from "react";
import { addAdminUserAction } from "@/app/admin/_actions/users";
import { btnPrimary, btnSecondary, input, label } from "@/components/admin/ui";

const EMPTY = { name: "", email: "", password: "", confirm: "" };

export function AddAdminUser() {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await addAdminUserAction(f);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setF(EMPTY);
    setOpen(false);
  }

  const close = () => {
    setF(EMPTY);
    setError(null);
    setOpen(false);
  };

  const field = (k: keyof typeof EMPTY, text: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`a-${k}`} className={label}>
        {text}
      </label>
      <input
        id={`a-${k}`}
        value={f[k]}
        onChange={(e) => setF({ ...f, [k]: e.target.value })}
        required
        className={input}
        {...props}
      />
    </div>
  );

  return (
    <>
      <button onClick={() => setOpen(true)} className={btnPrimary}>
        + Add admin user
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Add admin user"
        >
          <form onSubmit={submit} className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg bg-surface p-6">
            <h2 className="font-serif text-2xl font-semibold">Add admin user</h2>
            <p className="mt-1 text-[13px] text-muted">
              They can log in to this admin portal straight away with this email and password, and have full access.
              Share the password with them privately; they can change it under Change password.
            </p>
            <div className="mt-4 grid gap-3">
              {field("name", "Name", { autoComplete: "off" })}
              {field("email", "Email", { type: "email", autoComplete: "off" })}
              {field("password", "Password (10+ characters)", { type: "password", autoComplete: "new-password" })}
              {field("confirm", "Repeat password", { type: "password", autoComplete: "new-password" })}
            </div>
            {error && <p className="mt-3 text-[14px] font-medium text-maroon">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={close} className={btnSecondary}>
                Cancel
              </button>
              <button disabled={busy} className={btnPrimary}>
                {busy ? "Saving…" : "Add admin user"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
