"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateEnquiryAction } from "@/app/admin/_actions/enquiries";
import { btnPrimary, btnSecondary, input, label } from "@/components/admin/ui";
import { WhatsAppIcon } from "@/components/icons";
import { site } from "@/lib/site";

const STATUS_TEXT: Record<string, (ref: string, items: string) => string> = {
  new: (ref) => `we have received your enquiry ${ref} and will confirm rates and stock shortly.`,
  confirmed: (ref, items) => `your enquiry ${ref} is confirmed (${items}). We will dispatch within 48 hours.`,
  dispatched: (ref) => `your order for enquiry ${ref} has been dispatched.`,
  cancelled: (ref) => `we are unable to fulfil enquiry ${ref} at the moment. Please message us for alternatives.`,
};

interface Props {
  ref_: string;
  status: string;
  internalNote: string;
  phone: string;
  phoneEditable: boolean;
  person: string;
  items: string;
}

export function EnquiryUpdateForm({
  ref_,
  status: initialStatus,
  internalNote,
  phone: initialPhone,
  phoneEditable,
  person,
  items,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [note, setNote] = useState(internalNote);
  const [phone, setPhone] = useState(initialPhone);
  const [msg, setMsg] = useState<{ error?: string; ok?: string }>({});
  const [busy, setBusy] = useState(false);

  async function save(notify: boolean) {
    setBusy(true);
    setMsg({});
    // Open the WhatsApp tab synchronously so mobile browsers don't block it as a popup.
    const waWindow = notify ? window.open("", "_blank") : null;
    const res = await updateEnquiryAction(ref_, { status, internalNote: note, phone });
    setBusy(false);
    if (!res.ok) {
      waWindow?.close();
      setMsg({ error: res.error });
      return;
    }
    setMsg({ ok: "Saved." });
    router.refresh();
    if (notify) {
      const digits = phone.replace(/\D/g, "");
      const to = digits.length === 10 ? `91${digits}` : digits;
      const text = `Hello ${person}, ${STATUS_TEXT[status](ref_, items)}\n– ${site.name}`;
      const url = `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
      if (waWindow) waWindow.location.href = url;
      else window.location.href = url;
    }
  }

  return (
    <div className="space-y-3 border-t border-line pt-4 print:hidden">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="status" className={label}>
            Update status
          </label>
          <select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className={input}>
            <option value="new">New</option>
            <option value="confirmed">Confirmed</option>
            <option value="dispatched">Dispatched</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label htmlFor="phone" className={label}>
            Retailer WhatsApp
          </label>
          <input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={!phoneEditable}
            inputMode="tel"
            placeholder="98765 43210"
            className={input}
          />
        </div>
      </div>
      <div>
        <label htmlFor="note" className={label}>
          Internal note (not sent)
        </label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="e.g. LR no. 45821, VRL Logistics"
          className={`${input} h-auto py-2`}
        />
      </div>
      {msg.error && <p className="text-[14px] font-medium text-maroon">{msg.error}</p>}
      {msg.ok && <p className="text-[14px] font-medium text-whatsapp">{msg.ok}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => save(true)}
          className={`${btnPrimary} bg-whatsapp hover:bg-whatsapp/90`}
        >
          <WhatsAppIcon width={16} height={16} /> Save &amp; notify retailer
        </button>
        <button type="button" disabled={busy} onClick={() => save(false)} className={btnSecondary}>
          Save
        </button>
        <button type="button" onClick={() => window.print()} className={btnSecondary}>
          Print
        </button>
      </div>
      {!phone && <p className="text-[12px] text-muted">No number saved — WhatsApp will ask you to pick the chat.</p>}
    </div>
  );
}
