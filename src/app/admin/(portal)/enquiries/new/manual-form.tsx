"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createEnquiryAction } from "@/app/admin/_actions/enquiries";
import { btnPrimary, btnSecondary, input, label } from "@/components/admin/ui";

export function ManualEnquiryForm() {
  const router = useRouter();
  const [f, setF] = useState({ shop: "", name: "", city: "", phone: "", note: "" });
  const [lines, setLines] = useState([{ code: "", qty: "3" }]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createEnquiryAction({
      ...f,
      lines: lines.filter((l) => l.code.trim()).map((l) => ({ code: l.code, qty: l.qty })),
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push(`/admin/enquiries?ref=${res.ref}`);
  }

  const field = (k: keyof typeof f, text: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={k} className={label}>
        {text}
      </label>
      <input id={k} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={input} {...props} />
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {field("shop", "Shop name", { required: true })}
        {field("name", "Contact person")}
        {field("city", "City")}
        {field("phone", "WhatsApp number", { inputMode: "tel", placeholder: "98765 43210" })}
      </div>
      <div>
        <p className={label}>Designs</p>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={l.code}
                onChange={(e) => setLines(lines.map((x, n) => (n === i ? { ...x, code: e.target.value } : x)))}
                placeholder="SN-101"
                aria-label={`Design code ${i + 1}`}
                autoCapitalize="characters"
                className={`${input} flex-1`}
              />
              <input
                value={l.qty}
                onChange={(e) => setLines(lines.map((x, n) => (n === i ? { ...x, qty: e.target.value } : x)))}
                inputMode="numeric"
                aria-label={`Quantity ${i + 1}`}
                className={`${input} w-24`}
              />
              <button
                type="button"
                onClick={() => setLines(lines.length > 1 ? lines.filter((_, n) => n !== i) : lines)}
                className={`${btnSecondary} w-10 px-0`}
                aria-label="Remove line"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setLines([...lines, { code: "", qty: "3" }])}
          className="mt-2 text-[14px] font-semibold text-maroon"
        >
          + Add design
        </button>
      </div>
      <div>
        <label htmlFor="note" className={label}>
          Retailer&apos;s note
        </label>
        <textarea
          id="note"
          value={f.note}
          onChange={(e) => setF({ ...f, note: e.target.value })}
          rows={2}
          className={`${input} h-auto py-2`}
        />
      </div>
      {error && <p className="text-[14px] font-medium text-maroon">{error}</p>}
      <button disabled={busy} className={btnPrimary}>
        {busy ? "Saving…" : "Save enquiry"}
      </button>
    </form>
  );
}
