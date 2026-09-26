"use client";

/* eslint-disable @next/next/no-img-element -- images are served pre-sized by /api/img */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ProductCard, Role } from "@/lib/types";
import { rupees, sizesLabel } from "@/lib/format";
import { site } from "@/lib/site";
import { waLink } from "@/lib/whatsapp";
import { useEnquiry, type StoredLine } from "@/components/enquiry-store";
import { QtyStepper } from "@/components/product/qty-stepper";
import { CloseIcon, LockIcon, WhatsAppIcon } from "@/components/icons";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; ref: string | null; url: string }
  | { kind: "error"; message: string };

function fallbackMessage(lines: StoredLine[], note: string) {
  const out = [`*New wholesale enquiry – ${site.name}*`, ""];
  lines.forEach((l, i) => out.push(`${i + 1}. *${l.code}* – ${l.name}`, `   Qty ${l.qty} pcs`));
  if (note) out.push("", `Note: ${note}`);
  out.push("", "Please confirm rate, availability and dispatch.");
  return out.join("\n");
}

export function EnquiryList({ role, knownShop }: { role: Role; knownShop: string | null }) {
  const { lines, pieces, setQty, remove, clear } = useEnquiry();
  const [live, setLive] = useState<Map<string, ProductCard> | null>(null);
  const [note, setNote] = useState("");
  const [contact, setContact] = useState({ name: "", shop: "", city: "" });
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const codesKey = lines
    .map((l) => l.code)
    .sort()
    .join(",");

  // Refresh product details (and rates, if this viewer may see them) from the server.
  useEffect(() => {
    if (!codesKey) return;
    let cancelled = false;
    fetch("/api/products/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codes: codesKey.split(",") }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { items: ProductCard[] } | null) => {
        if (!cancelled && data) setLive(new Map(data.items.map((p) => [p.code, p])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [codesKey]);

  const priced = live ? [...live.values()].some((p) => p.ratePaise !== undefined) : false;
  const value = useMemo(
    () => (priced && live ? lines.reduce((s, l) => s + (live.get(l.code)?.ratePaise ?? 0) * l.qty, 0) : null),
    [priced, live, lines],
  );
  const unavailable = live ? lines.filter((l) => !live.has(l.code)) : [];

  async function send() {
    setStatus({ kind: "sending" });
    const payload = {
      lines: lines.map((l) => ({ code: l.code, qty: l.qty })),
      note: note.trim(),
      contact: role === "guest" ? contact : {},
    };
    const openWithoutRef = () => {
      // Server problem: still let the retailer reach us on WhatsApp, just without a reference.
      const url = waLink(fallbackMessage(lines, note.trim()));
      clear();
      setStatus({ kind: "sent", ref: null, url });
      window.location.href = url;
    };
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status >= 500) return openWithoutRef();
      const data = await res.json();
      if (!res.ok) {
        setStatus({ kind: "error", message: data.error ?? "Could not send enquiry." });
        return;
      }
      clear();
      setStatus({ kind: "sent", ref: data.ref, url: data.whatsappUrl });
      window.location.href = data.whatsappUrl;
    } catch {
      openWithoutRef();
    }
  }

  if (status.kind === "sent") {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-line bg-surface p-8 text-center">
        <p className="eyebrow text-whatsapp">Enquiry ready</p>
        <h2 className="mt-2 font-serif text-3xl font-semibold">
          {status.ref ? `Reference ${status.ref}` : "Opening WhatsApp"}
        </h2>
        <p className="mt-3 text-[15px] text-muted">
          WhatsApp should open with your list filled in. Press <b>Send</b> in WhatsApp to reach us — we reply within
          business hours.
        </p>
        <a
          href={status.url}
          className="mt-6 inline-flex h-12 items-center gap-2 rounded-md bg-whatsapp px-6 font-semibold text-white"
        >
          <WhatsAppIcon /> Open WhatsApp again
        </a>
        <p className="mt-4">
          <Link href="/catalog" className="text-[14px] font-semibold text-maroon underline">
            Continue browsing
          </Link>
        </p>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-line bg-surface p-8 text-center">
        <h2 className="font-serif text-3xl font-semibold">Your enquiry list is empty</h2>
        <p className="mt-3 text-[15px] text-muted">
          Add designs from the catalogue, then send the list to us on WhatsApp in one tap.
        </p>
        <Link
          href="/catalog"
          className="mt-6 inline-flex h-12 items-center rounded-md bg-maroon px-6 font-semibold text-white"
        >
          Browse catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-8">
      <div>
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {lines.map((l) => {
            const p = live?.get(l.code);
            const gone = live && !p;
            return (
              <li key={l.code} className={`flex gap-3 p-3 sm:gap-4 sm:p-4 ${gone ? "opacity-60" : ""}`}>
                <Link href={`/product/${l.code}`} className="w-20 shrink-0 overflow-hidden rounded sm:w-24">
                  {l.coverImageId ? (
                    <img
                      src={`/api/img/${l.coverImageId}/thumb.webp`}
                      alt=""
                      width={400}
                      height={533}
                      className="aspect-[3/4] w-full bg-sand object-cover"
                    />
                  ) : (
                    <div className="aspect-[3/4] w-full bg-sand" />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium tracking-wider text-muted uppercase">
                        {l.code} · {l.fabric}
                      </p>
                      <Link
                        href={`/product/${l.code}`}
                        className="mt-0.5 line-clamp-2 text-[14px] leading-snug font-semibold sm:text-[15px]"
                      >
                        {l.name}
                      </Link>
                      <p className="mt-0.5 text-[12px] text-muted">
                        Sizes {sizesLabel(l.sizes)} · Min {l.moq}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(l.code)}
                      className="-mt-1 -mr-1 grid h-10 w-10 shrink-0 place-items-center rounded text-muted hover:text-maroon"
                      aria-label={`Remove ${l.code}`}
                    >
                      <CloseIcon width={18} height={18} />
                    </button>
                  </div>
                  {gone ? (
                    <p className="mt-2 text-[13px] font-medium text-maroon">No longer available — please remove.</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <QtyStepper
                        value={l.qty}
                        min={l.moq}
                        onChange={(v) => setQty(l.code, v)}
                        label={`quantity for ${l.code}`}
                        compact
                      />
                      {p?.ratePaise !== undefined && (
                        <p className="text-right text-[13px] text-muted">
                          {rupees(p.ratePaise)} / pc
                          <br />
                          <b className="text-[15px] text-ink">{rupees(p.ratePaise * l.qty)}</b>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex items-center justify-between text-[14px]">
          <Link href="/catalog" className="font-semibold text-maroon">
            ← Continue browsing
          </Link>
          <button type="button" onClick={clear} className="font-medium text-muted underline">
            Clear list
          </button>
        </div>
      </div>

      <aside className="mt-6 rounded-lg border border-line bg-surface p-5 lg:sticky lg:top-24 lg:mt-0">
        <h2 className="font-serif text-2xl font-semibold">Enquiry summary</h2>
        <dl className="mt-4 space-y-2 text-[15px]">
          <div className="flex justify-between">
            <dt className="text-muted">Designs · pieces</dt>
            <dd className="font-semibold">
              {lines.length} · {pieces} pcs
            </dd>
          </div>
          {value !== null && (
            <div className="flex justify-between border-t border-line pt-2">
              <dt className="text-muted">Indicative value</dt>
              <dd className="text-lg font-bold">{rupees(value)}</dd>
            </div>
          )}
        </dl>
        {value === null && (
          <p className="mt-3 flex gap-2 rounded-md bg-gold-50 p-3 text-[13px] text-muted">
            <LockIcon width={16} height={16} className="mt-0.5 shrink-0 text-maroon" />
            <span>
              {role === "pending" ? (
                "Rates appear once your shop is approved."
              ) : (
                <>
                  Rates are shown to registered retailers.{" "}
                  <Link href="/login" className="font-semibold text-maroon underline">
                    Log in
                  </Link>{" "}
                  or send the enquiry and we&apos;ll share rates on WhatsApp.
                </>
              )}
            </span>
          </p>
        )}

        {role === "guest" && (
          <fieldset className="mt-5 space-y-2">
            <legend className="eyebrow mb-2 text-muted">Your details (optional)</legend>
            {(
              [
                ["shop", "Shop name", "organization"],
                ["name", "Your name", "name"],
                ["city", "City", "address-level2"],
              ] as const
            ).map(([k, label, ac]) => (
              <input
                key={k}
                value={contact[k]}
                onChange={(e) => setContact({ ...contact, [k]: e.target.value })}
                placeholder={label}
                aria-label={label}
                autoComplete={ac}
                maxLength={100}
                className="h-11 w-full rounded-md border border-line bg-cream/40 px-3 text-[15px] focus:border-gold focus:outline-none"
              />
            ))}
          </fieldset>
        )}
        {knownShop && (
          <p className="mt-4 text-[13px] text-muted">
            Sending as <b className="text-ink">{knownShop}</b>
          </p>
        )}

        <label className="mt-5 block">
          <span className="eyebrow text-muted">Note for us (optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="e.g. Need by 10 Oct for Navratri. Only L and XL if possible."
            className="mt-2 w-full rounded-md border border-line bg-cream/40 p-3 text-[15px] focus:border-gold focus:outline-none"
          />
        </label>

        {status.kind === "error" && (
          <p className="mt-3 text-[14px] font-medium text-maroon" role="alert">
            {status.message}
          </p>
        )}

        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-surface/95 p-3 backdrop-blur lg:static lg:mt-5 lg:border-0 lg:bg-transparent lg:p-0">
          <button
            type="button"
            onClick={send}
            disabled={status.kind === "sending" || unavailable.length === lines.length}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-whatsapp font-semibold text-white disabled:opacity-60"
          >
            <WhatsAppIcon /> {status.kind === "sending" ? "Preparing…" : "Send enquiry on WhatsApp"}
          </button>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-muted">
          Opens WhatsApp with your list pre-filled. This is an enquiry, not an order — we confirm rate, stock and
          dispatch on WhatsApp. No payment is taken online.
        </p>
      </aside>
    </div>
  );
}
