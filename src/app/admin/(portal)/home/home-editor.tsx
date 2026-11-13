"use client";

/* eslint-disable @next/next/no-img-element -- pre-sized images from /api/site-img and static placeholders */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { DEFAULT_HERO, DEFAULT_HERO_IMAGE, highlightText, type HomeHero } from "@/lib/home-content";
import { removeHeroImageAction, resetHomeHeroAction, saveHomeHeroAction } from "@/app/admin/_actions/site";
import { shrinkImage } from "@/components/admin/shrink-image";
import { btnPrimary, btnSecondary, Card, input, label } from "@/components/admin/ui";

function PhotoSlot({ position, id, onDone }: { position: number; id: string | null; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = `Slide ${position + 1}`;

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
    <figure className="flex flex-col">
      <div className="relative aspect-video overflow-hidden rounded-md border border-line bg-sand">
        {id ? (
          <img
            src={`/api/site-img/${id}/thumb.webp`}
            alt=""
            className={`h-full w-full object-cover ${busy ? "opacity-40" : ""}`}
          />
        ) : (
          <span className="grid h-full place-items-center text-[12px] text-muted">Empty</span>
        )}
        {busy && <span className="absolute inset-0 grid place-items-center text-[13px] font-semibold">Uploading…</span>}
      </div>
      <figcaption className="mt-1.5 text-[12px]">
        <p className="font-semibold">{name}</p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
          <label className="cursor-pointer font-semibold text-maroon underline-offset-2 hover:underline">
            {id ? "Replace" : "Upload"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={(e) => upload(e.target.files?.[0])}
              aria-label={`${id ? "Replace" : "Upload"} photo: ${name}`}
            />
          </label>
          {id && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (!confirm(`Remove the photo from ${name}? The carousel skips empty slides.`)) return;
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
  const firstSlide = slots.find(Boolean) ?? null;
  const filled = slots.filter(Boolean).length;

  const field = (k: "eyebrow" | "headline" | "body", text: string, max: number, rows = 1) => (
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
            {field("eyebrow", "Small heading above (e.g. The festive edit · 2026)", 40)}
            {field("headline", "Headline", 80)}
            {field("body", "Paragraph", 280, 3)}
            <div>
              <p className={label}>Three highlights</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {h.stats.map((s, i) => (
                  <input
                    key={i}
                    value={highlightText(s)}
                    maxLength={20}
                    aria-label={`Highlight ${i + 1}`}
                    onChange={(e) =>
                      setH({
                        ...h,
                        stats: h.stats.map((x, n) => (n === i ? { value: "", label: e.target.value } : x)),
                      })
                    }
                    className={input}
                  />
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

        <Card title="Hero photos (carousel)">
          <div className="p-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {slots.map((id, i) => (
                <PhotoSlot key={`${i}-${id}`} position={i} id={id} onDone={refresh} />
              ))}
            </div>
            <p className="mt-3 text-[12px] text-muted">
              JPG/PNG/WebP up to 5 MB. Wide landscape photos work best (16:9, at least 1920 px wide), with the people on
              the right half — the text sits on the left. The home page slides through the filled slides in order; with
              none filled it shows the standard festive photo.
            </p>
          </div>
        </Card>
      </div>

      <Card title="Preview" className="2xl:sticky 2xl:top-8 2xl:self-start">
        <div className="space-y-4 overflow-hidden p-5">
          {(
            [
              [
                "Computer screen",
                "aspect-[2.2/1] items-center",
                "bg-[linear-gradient(90deg,rgba(37,24,22,.72)_0%,rgba(54,35,30,.55)_37%,rgba(59,37,29,.03)_72%)]",
                "ml-[8%] max-w-[55%]",
              ],
              [
                "Phone",
                "aspect-[3/4] max-w-64 items-end",
                "bg-[linear-gradient(0deg,rgba(40,25,25,.85),rgba(46,30,29,.4)_60%,rgba(46,30,29,.02))]",
                "p-4",
              ],
            ] as const
          ).map(([title, box, shade, copy]) => (
            <div key={title}>
              <p className="mb-1.5 text-[12px] font-semibold text-muted">{title}</p>
              <div className={`relative flex overflow-hidden rounded-md bg-[#d7b898] ${box}`}>
                <img
                  src={firstSlide ? `/api/site-img/${firstSlide}/thumb.webp` : DEFAULT_HERO_IMAGE.src}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-[59%_center]"
                />
                <div className={`absolute inset-0 ${shade}`} />
                <div className={`relative text-white ${copy}`}>
                  <p className="text-[7px] tracking-[0.22em] text-brass-200 uppercase">{h.eyebrow}</p>
                  <p className="mt-1 font-serif text-[22px] leading-[0.99] tracking-[-0.03em]">{h.headline}</p>
                  <p className="mt-1.5 line-clamp-3 text-[8px] leading-relaxed text-[#f0e8dd]">{h.body}</p>
                  <p className="mt-1.5 flex flex-wrap gap-x-2 text-[7px] text-[#f1e7da]">
                    {h.stats
                      .map(highlightText)
                      .filter(Boolean)
                      .map((t, i) => (
                        <span key={i}>
                          <span className="text-[#d7bb80]">✳</span> {t}
                        </span>
                      ))}
                  </p>
                  <span className="mt-2 inline-block bg-brass px-2 py-1 text-[8px] font-semibold text-[#241e19]">
                    Explore the collection ↗
                  </span>
                </div>
              </div>
            </div>
          ))}
          {filled > 1 && <p className="text-[12px] text-muted">Showing slide 1 of {filled}.</p>}
        </div>
      </Card>
    </div>
  );
}
