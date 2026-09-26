"use client";

/* eslint-disable @next/next/no-img-element -- pre-sized images from /api/site-img and static placeholders */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DEFAULT_HERO, HERO_PLACEHOLDERS, type HomeHero } from "@/lib/home-content";
import { removeHeroImageAction, resetHomeHeroAction, saveHomeHeroAction } from "@/app/admin/_actions/site";
import { shrinkImage } from "@/components/admin/shrink-image";
import { btnPrimary, btnSecondary, Card, input, label } from "@/components/admin/ui";

const SLOT_NAMES = ["Large tile (tall)", "Top middle", "Top right", "Bottom middle", "Bottom right"];

function PhotoSlot({ position, id, onDone }: { position: number; id: string | null; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const src = id ? `/api/site-img/${id}/thumb.webp` : HERO_PLACEHOLDERS[position];

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.set("kind", "hero");
    body.set("position", String(position));
    body.set("file", await shrinkImage(file));
    const res = await fetch("/api/admin/site-images", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Upload failed");
    onDone();
  }

  return (
    <figure className={`flex flex-col ${position === 0 ? "row-span-2" : ""}`}>
      <div className="relative flex-1 overflow-hidden rounded-md border border-line bg-sand">
        <img src={src} alt="" className={`h-full w-full object-cover ${busy ? "opacity-40" : ""}`} />
        {!id && (
          <span className="absolute top-1.5 left-1.5 rounded-sm bg-surface/90 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
            Placeholder
          </span>
        )}
        {busy && <span className="absolute inset-0 grid place-items-center text-[13px] font-semibold">Uploading…</span>}
      </div>
      <figcaption className="mt-1.5 text-[12px]">
        <p className="font-semibold">{SLOT_NAMES[position]}</p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
          <label className="cursor-pointer font-semibold text-maroon underline-offset-2 hover:underline">
            {id ? "Replace" : "Upload"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={(e) => upload(e.target.files?.[0])}
              aria-label={`${id ? "Replace" : "Upload"} photo: ${SLOT_NAMES[position]}`}
            />
          </label>
          {id && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (!confirm("Remove this photo? The placeholder pattern will show instead.")) return;
                setBusy(true);
                await removeHeroImageAction(position);
                setBusy(false);
                onDone();
              }}
              className="text-muted hover:text-maroon"
            >
              Remove
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-maroon">{error}</p>}
      </figcaption>
    </figure>
  );
}

export function HomeEditor({
  initial,
  customised,
  slots,
}: {
  initial: HomeHero;
  customised: boolean;
  slots: (string | null)[];
}) {
  const router = useRouter();
  const [h, setH] = useState(initial);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const refresh = () => router.refresh();

  const field = (k: "eyebrow" | "headline" | "body" | "mobileLine", text: string, max: number, rows = 1) => (
    <div>
      <label htmlFor={`h-${k}`} className={label}>
        {text}{" "}
        <span className="normal-case tracking-normal text-muted/70">
          ({h[k].length}/{max})
        </span>
      </label>
      {rows > 1 ? (
        <textarea
          id={`h-${k}`}
          value={h[k]}
          maxLength={max}
          rows={rows}
          onChange={(e) => setH({ ...h, [k]: e.target.value })}
          className={`${input} h-auto py-2`}
        />
      ) : (
        <input
          id={`h-${k}`}
          value={h[k]}
          maxLength={max}
          onChange={(e) => setH({ ...h, [k]: e.target.value })}
          className={input}
        />
      )}
    </div>
  );

  return (
    <div className="grid gap-5 2xl:grid-cols-[1fr_1fr]">
      <div className="space-y-5">
        <Card title="Text">
          <div className="space-y-4 p-5">
            {field("eyebrow", "Small heading above (e.g. Festive 2026 collection)", 40)}
            {field("headline", "Headline", 80)}
            {field("body", "Paragraph (computer screens)", 280, 3)}
            {field("mobileLine", "Short line (phones)", 90)}
            <div>
              <p className={label}>Three highlights</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {h.stats.map((s, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input
                      value={s.value}
                      maxLength={12}
                      aria-label={`Highlight ${i + 1} value`}
                      onChange={(e) =>
                        setH({ ...h, stats: h.stats.map((x, n) => (n === i ? { ...x, value: e.target.value } : x)) })
                      }
                      className={`${input} w-24 font-semibold`}
                    />
                    <input
                      value={s.label}
                      maxLength={20}
                      aria-label={`Highlight ${i + 1} label`}
                      onChange={(e) =>
                        setH({ ...h, stats: h.stats.map((x, n) => (n === i ? { ...x, label: e.target.value } : x)) })
                      }
                      className={input}
                    />
                  </div>
                ))}
              </div>
            </div>
            {msg && (
              <p
                role="status"
                className={`text-[14px] font-medium ${msg.kind === "ok" ? "text-whatsapp" : "text-maroon"}`}
              >
                {msg.text}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await saveHomeHeroAction(h);
                    setMsg(
                      res.ok
                        ? { kind: "ok", text: "Saved — live on the home page." }
                        : { kind: "error", text: res.error },
                    );
                  })
                }
                className={btnPrimary}
              >
                {pending ? "Saving…" : "Save text"}
              </button>
              <button
                type="button"
                disabled={pending || (!customised && JSON.stringify(h) === JSON.stringify(DEFAULT_HERO))}
                onClick={() =>
                  confirm("Go back to the original wording?") &&
                  start(async () => {
                    await resetHomeHeroAction();
                    setH(DEFAULT_HERO);
                    setMsg({ kind: "ok", text: "Reset to the original wording." });
                  })
                }
                className={btnSecondary}
              >
                Reset to default
              </button>
            </div>
          </div>
        </Card>

        <Card title="Hero photos">
          <div className="p-5">
            <div className="grid h-[420px] grid-cols-3 grid-rows-2 gap-3">
              {slots.map((id, i) => (
                <PhotoSlot key={`${i}-${id}`} position={i} id={id} onDone={refresh} />
              ))}
            </div>
            <p className="mt-3 text-[12px] text-muted">
              JPG/PNG/WebP up to 5 MB. Photos are cropped to fit each tile automatically — for the large tile use a tall
              portrait photo. Shown on computer screens; phones show the text card only.
            </p>
          </div>
        </Card>
      </div>

      <Card title="Preview (computer screen)" className="2xl:sticky 2xl:top-8 2xl:self-start">
        <div className="overflow-hidden p-5">
          <div className="grid grid-cols-[1.05fr_1fr] items-center gap-5 rounded-md bg-cream p-5">
            <div className="min-w-0">
              <p className="eyebrow text-[8px] text-gold-600">{h.eyebrow}</p>
              <p className="mt-1 font-serif text-[22px] leading-[1.05] font-semibold">{h.headline}</p>
              <p className="mt-2 line-clamp-4 text-[10px] leading-relaxed text-ink/80">{h.body}</p>
              <div className="mt-3 flex gap-1.5">
                <span className="rounded bg-maroon px-2 py-1 text-[9px] font-semibold text-white">Browse catalog</span>
                <span className="rounded border border-ink/60 px-2 py-1 text-[9px] font-semibold">
                  WhatsApp enquiry
                </span>
              </div>
              <p className="mt-3 flex gap-3 text-[9px]">
                {h.stats.map((s, i) => (
                  <span key={i}>
                    <b>{s.value}</b> {s.label}
                  </span>
                ))}
              </p>
            </div>
            <div className="grid grid-cols-3 grid-rows-2 gap-1.5">
              {slots.map((id, i) => (
                <img
                  key={i}
                  src={id ? `/api/site-img/${id}/thumb.webp` : HERO_PLACEHOLDERS[i]}
                  alt=""
                  className={`w-full rounded object-cover ${i === 0 ? "row-span-2 h-full" : "aspect-[10/9]"}`}
                />
              ))}
            </div>
          </div>
          <p className="mt-4 text-[12px] font-semibold text-muted">On phones</p>
          <div className="mt-1.5 max-w-64 rounded-md bg-maroon p-4 text-white">
            <p className="eyebrow text-[8px] text-gold">{h.eyebrow}</p>
            <p className="mt-1 font-serif text-[18px] leading-tight font-semibold">{h.headline}</p>
            <p className="mt-2 text-[10px] text-white/85">{h.mobileLine}</p>
            <span className="mt-3 inline-block rounded bg-gold px-2 py-1 text-[9px] font-semibold text-ink">
              Browse catalog
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
