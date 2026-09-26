"use client";

import { useState } from "react";
import { addRetailerAction } from "@/app/admin/_actions/customers";
import { btnPrimary, btnSecondary, input, label } from "@/components/admin/ui";

const EMPTY = { shopName: "", ownerName: "", mobile: "", city: "", state: "", gstin: "", address: "" };

export function AddRetailer() {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await addRetailerAction(f);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setF(EMPTY);
    setOpen(false);
  }

  const field = (k: keyof typeof EMPTY, text: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`r-${k}`} className={label}>
        {text}
      </label>
      <input
        id={`r-${k}`}
        value={f[k]}
        onChange={(e) => setF({ ...f, [k]: e.target.value })}
        className={input}
        {...props}
      />
    </div>
  );

  return (
    <>
      <button onClick={() => setOpen(true)} className={btnPrimary}>
        + Add retailer
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Add retailer"
        >
          <form onSubmit={submit} className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-lg bg-surface p-6">
            <h2 className="font-serif text-2xl font-semibold">Add retailer</h2>
            <p className="mt-1 text-[13px] text-muted">
              Added retailers are approved straight away and can log in with this mobile number.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {field("shopName", "Shop name", { required: true })}
              {field("ownerName", "Owner name", { required: true })}
              {field("mobile", "Mobile", { required: true, inputMode: "tel", placeholder: "98765 43210" })}
              {field("gstin", "GSTIN (optional)", { autoCapitalize: "characters" })}
              {field("city", "City", { required: true })}
              {field("state", "State")}
              <div className="sm:col-span-2">{field("address", "Address")}</div>
            </div>
            {error && <p className="mt-3 text-[14px] font-medium text-maroon">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className={btnSecondary}>
                Cancel
              </button>
              <button disabled={busy} className={btnPrimary}>
                {busy ? "Saving…" : "Add retailer"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
