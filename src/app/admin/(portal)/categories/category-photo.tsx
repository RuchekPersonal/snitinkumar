"use client";

/* eslint-disable @next/next/no-img-element -- pre-sized images from /api/site-img */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeCategoryCoverAction } from "@/app/admin/_actions/site";
import { shrinkImage } from "@/components/admin/shrink-image";

/** Category photo: shown on the home page tiles, phone pills and WhatsApp link previews. */
export function CategoryPhoto({
  categoryId,
  name,
  coverId,
}: {
  categoryId: number;
  name: string;
  coverId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.set("kind", "category");
    body.set("categoryId", String(categoryId));
    body.set("file", await shrinkImage(file));
    const res = await fetch("/api/admin/site-images", { method: "POST", body });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Upload failed");
    router.refresh();
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <label
        className={`relative block h-12 w-16 cursor-pointer overflow-hidden rounded border border-line bg-sand ${busy ? "opacity-40" : ""}`}
        title={coverId ? `Replace photo for ${name}` : `Add photo for ${name}`}
      >
        {coverId ? (
          <img src={`/api/site-img/${coverId}/thumb.webp`} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full place-items-center text-[10px] font-semibold text-muted">+ Photo</span>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={busy}
          onChange={(e) => upload(e.target.files?.[0])}
          aria-label={`${coverId ? "Replace" : "Add"} photo for ${name}`}
        />
      </label>
      {coverId && !busy && (
        <button
          type="button"
          onClick={async () => {
            if (!confirm(`Remove the photo for ${name}?`)) return;
            setBusy(true);
            await removeCategoryCoverAction(categoryId);
            setBusy(false);
          }}
          className="text-[12px] text-muted hover:text-maroon"
          aria-label={`Remove photo for ${name}`}
        >
          ✕
        </button>
      )}
      {error && <span className="max-w-32 text-[11px] text-maroon">{error}</span>}
    </div>
  );
}
