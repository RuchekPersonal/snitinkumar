"use client";

/* eslint-disable @next/next/no-img-element -- previews are local blobs or pre-sized /api/img files */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Lookups } from "@/lib/server/admin/products";
import { saveProductAction, deleteImageAction, reorderImagesAction } from "@/app/admin/_actions/products";
import { createColourAction } from "@/app/admin/_actions/categories";
import { ColourPalette, type ColourDraft } from "@/components/admin/colour-palette";
import { shrinkImage } from "@/components/admin/shrink-image";
import { btnPrimary, btnSecondary, Card, input, label } from "@/components/admin/ui";
import { sizesLabel } from "@/lib/format";

export interface ProductFormValues {
  code: string;
  name: string;
  categoryId: string;
  fabricId: string;
  colourId: string;
  description: string;
  work: string;
  lengthIn: string;
  setIncludes: string;
  washCare: string;
  rate: string;
  mrp: string;
  moq: string;
  stock: string;
  sizeIds: number[];
  colourIds: number[];
  markNew: boolean;
  trending: boolean;
  visible: boolean;
}

interface Props {
  lookups: Lookups;
  initial: ProductFormValues;
  productId?: string;
  images: { id: string }[];
  maxPhotos: number;
}

type Photo = { kind: "saved"; id: string } | { kind: "new"; key: string; file: File; url: string };

function Field({
  name,
  text,
  error,
  children,
  className = "",
}: {
  name: string;
  text: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className={label}>
        {text}
      </label>
      {children}
      {error && <p className="mt-1 text-[12px] font-medium text-maroon">{error}</p>}
    </div>
  );
}

export function ProductForm({ lookups, initial, productId, images, maxPhotos }: Props) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [photos, setPhotos] = useState<Photo[]>(images.map((i) => ({ kind: "saved", id: i.id })));
  // Colours can be created from this form, so keep a local copy of the list.
  const [colours, setColours] = useState(lookups.colours);
  const [newColour, setNewColour] = useState<ColourDraft | null>(null);
  const [colourError, setColourError] = useState<string | null>(null);
  const [addingColour, setAddingColour] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  // Free local preview URLs when the form unmounts (removed photos are freed in remove()).
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => p.kind === "new" && URL.revokeObjectURL(p.url)), []);

  const set = <K extends keyof ProductFormValues>(k: K, val: ProductFormValues[K]) => setV((s) => ({ ...s, [k]: val }));
  const text = (k: keyof ProductFormValues) => ({
    id: k,
    value: v[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      set(k, e.target.value as never),
  });

  const sizeLabels = useMemo(
    () => lookups.sizes.filter((s) => v.sizeIds.includes(s.id)).map((s) => s.label),
    [lookups.sizes, v.sizeIds],
  );
  const previewColours = colours.filter((c) => String(c.id) === v.colourId || v.colourIds.includes(c.id));
  const fabricName = lookups.fabrics.find((f) => String(f.id) === v.fabricId)?.name ?? "Fabric";
  const cover = photos[0];

  function addFiles(files: FileList | null) {
    if (!files) return;
    const room = maxPhotos - photos.length;
    const picked = [...files].slice(0, Math.max(0, room)).map((file): Photo => ({
      kind: "new",
      key: `${file.name}-${file.size}-${Math.random()}`,
      file,
      url: URL.createObjectURL(file),
    }));
    if (files.length > room) setMessage({ kind: "error", text: `Only ${maxPhotos} photos per design.` });
    setPhotos((p) => [...p, ...picked]);
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= photos.length) return;
    const next = [...photos];
    [next[i], next[j]] = [next[j], next[i]];
    setPhotos(next);
  }

  async function remove(i: number) {
    const p = photos[i];
    if (p.kind === "saved") {
      if (!confirm("Delete this photo?")) return;
      await deleteImageAction(productId!, p.id);
    } else {
      URL.revokeObjectURL(p.url);
    }
    setPhotos((ps) => ps.filter((_, n) => n !== i));
  }

  async function save(visible: boolean) {
    setBusy(true);
    setMessage(null);
    setErrors({});
    const result = await saveProductAction({ ...v, visible, lengthIn: v.lengthIn, mrp: v.mrp }, productId);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      setMessage({ kind: "error", text: result.error });
      setBusy(false);
      return;
    }

    // Upload new photos one by one, then store the final order (first = cover).
    const order: string[] = [];
    for (const [n, p] of photos.entries()) {
      if (p.kind === "saved") {
        order.push(p.id);
        continue;
      }
      setMessage({ kind: "ok", text: `Uploading photo ${n + 1} of ${photos.length}…` });
      const body = new FormData();
      body.set("file", await shrinkImage(p.file));
      const res = await fetch(`/api/admin/products/${result.id}/images`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ kind: "error", text: `Design saved, but a photo failed: ${data.error ?? "upload error"}` });
        setBusy(false);
        router.replace(`/admin/products/${result.code}`);
        return;
      }
      order.push(data.id);
    }
    if (order.length > 1) await reorderImagesAction(result.id, order);

    photos.forEach((p) => p.kind === "new" && URL.revokeObjectURL(p.url));
    setPhotos(order.map((id) => ({ kind: "saved", id })));
    setV((s) => ({ ...s, visible }));
    setMessage({ kind: "ok", text: visible ? "Saved and published." : "Saved (hidden from store)." });
    setBusy(false);
    startTransition(() => {
      if (!productId || result.code !== initial.code) router.replace(`/admin/products/${result.code}`);
      else router.refresh();
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <Card title="Basics">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field name="code" text="Product code" error={errors.code}>
              <input {...text("code")} className={input} autoCapitalize="characters" />
            </Field>
            <Field name="name" text="Design name" error={errors.name}>
              <input {...text("name")} className={input} />
            </Field>
            <Field name="categoryId" text="Category" error={errors.categoryId}>
              <select {...text("categoryId")} className={input}>
                <option value="">Choose…</option>
                {lookups.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field name="fabricId" text="Fabric" error={errors.fabricId}>
              <select {...text("fabricId")} className={input}>
                <option value="">Choose…</option>
                {lookups.fabrics.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field name="colourId" text="Primary colour" error={errors.colourId}>
              <select {...text("colourId")} className={input}>
                <option value="">Choose…</option>
                {colours.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field name="work" text="Work (e.g. Zardozi + thread)">
              <input {...text("work")} className={input} />
            </Field>
            <Field name="lengthIn" text="Length (inches)" error={errors.lengthIn}>
              <input {...text("lengthIn")} inputMode="numeric" className={input} />
            </Field>
            <Field name="setIncludes" text="Set includes (e.g. Kurti + pant)">
              <input {...text("setIncludes")} className={input} />
            </Field>
            <Field name="washCare" text="Wash care">
              <input {...text("washCare")} className={input} />
            </Field>
            <div className="sm:col-span-2">
              <p className={label}>Available colours</p>
              <div className="flex flex-wrap gap-2">
                {colours.map((c) => {
                  const primary = String(c.id) === v.colourId;
                  const on = primary || v.colourIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={on}
                      disabled={primary}
                      title={primary ? "Primary colour is always available" : undefined}
                      onClick={() =>
                        set("colourIds", on ? v.colourIds.filter((x) => x !== c.id) : [...v.colourIds, c.id])
                      }
                      className={`flex h-10 items-center gap-2 rounded-full border pr-3.5 pl-1.5 text-[14px] ${
                        on ? "border-maroon bg-maroon-50 font-semibold text-maroon" : "border-line bg-surface"
                      }`}
                    >
                      <span
                        className="h-7 w-7 rounded-full border border-ink/10"
                        style={{ background: c.hex ?? "var(--color-sand)" }}
                        aria-hidden
                      />
                      {c.name}
                      {primary && <span className="text-[11px] font-normal">(primary)</span>}
                    </button>
                  );
                })}
                {!newColour && (
                  <button
                    type="button"
                    onClick={() => {
                      setColourError(null);
                      setNewColour({ name: "", hex: "#C0282D" });
                    }}
                    className="flex h-10 items-center gap-1.5 rounded-full border border-dashed border-maroon/60 px-3.5 text-[14px] font-semibold text-maroon hover:bg-maroon-50"
                  >
                    + Add colour
                  </button>
                )}
              </div>
              {newColour && (
                <div className="mt-3 rounded-lg border border-line bg-cream/50 p-4">
                  <p className="mb-2 text-[13px] font-semibold">New colour — tap a shade or pick any other</p>
                  <ColourPalette value={newColour} onChange={setNewColour} taken={colours.map((c) => c.name)} />
                  {colourError && <p className="mt-2 text-[13px] font-medium text-maroon">{colourError}</p>}
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={addingColour || !newColour.name.trim()}
                      onClick={async () => {
                        setAddingColour(true);
                        setColourError(null);
                        const res = await createColourAction(newColour.name, newColour.hex);
                        setAddingColour(false);
                        if (!res.ok) return setColourError(res.error);
                        const c = res.colour;
                        setColours((list) => (list.some((x) => x.id === c.id) ? list : [...list, c]));
                        setV((s) => ({
                          ...s,
                          colourId: s.colourId || String(c.id),
                          colourIds: s.colourIds.includes(c.id) ? s.colourIds : [...s.colourIds, c.id],
                        }));
                        setNewColour(null);
                      }}
                      className={btnPrimary}
                    >
                      {addingColour ? "Adding…" : "Add & select"}
                    </button>
                    <button type="button" onClick={() => setNewColour(null)} className={btnSecondary}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              <p className="mt-1.5 text-[12px] text-muted">
                Shown on the product page as colour dots. New colours are saved for all products.
              </p>
            </div>
            <Field name="description" text="Description" className="sm:col-span-2" error={errors.description}>
              <textarea {...text("description")} rows={3} className={`${input} h-auto py-2`} />
            </Field>
          </div>
        </Card>

        <Card title="Wholesale pricing & stock">
          <div className="grid gap-4 p-5 sm:grid-cols-4">
            <Field name="rate" text="Rate / pc (₹)" error={errors.rate}>
              <input {...text("rate")} inputMode="decimal" className={input} />
            </Field>
            <Field name="mrp" text="Suggested MRP (₹)" error={errors.mrp}>
              <input {...text("mrp")} inputMode="decimal" className={input} />
            </Field>
            <Field name="moq" text="Min order (pcs)" error={errors.moq}>
              <input {...text("moq")} inputMode="numeric" className={input} />
            </Field>
            <Field name="stock" text="Stock (pcs)" error={errors.stock}>
              <input {...text("stock")} inputMode="numeric" className={input} />
            </Field>
            <div className="sm:col-span-4">
              <p className={label}>Sizes available</p>
              <div className="flex flex-wrap gap-2">
                {lookups.sizes.map((s) => {
                  const on = v.sizeIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set("sizeIds", on ? v.sizeIds.filter((x) => x !== s.id) : [...v.sizeIds, s.id])}
                      className={`h-10 min-w-12 rounded-md border px-3 text-[14px] font-semibold ${
                        on ? "border-maroon bg-maroon text-white" : "border-line bg-surface"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
              {errors.sizeIds && <p className="mt-1 text-[12px] font-medium text-maroon">{errors.sizeIds}</p>}
            </div>
            <label className="flex items-center gap-2.5 text-[14px] sm:col-span-2">
              <input
                type="checkbox"
                checked={v.markNew}
                onChange={(e) => set("markNew", e.target.checked)}
                className="h-5 w-5 accent-maroon"
              />
              Mark as New arrival for 14 days
            </label>
            <label className="flex items-center gap-2.5 text-[14px] sm:col-span-2">
              <input
                type="checkbox"
                checked={v.trending}
                onChange={(e) => set("trending", e.target.checked)}
                className="h-5 w-5 accent-maroon"
              />
              Show in Trending on home
            </label>
          </div>
        </Card>

        <Card title="Photos">
          <div className="p-5">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {photos.map((p, i) => (
                <figure key={p.kind === "saved" ? p.id : p.key} className="relative">
                  <img
                    src={p.kind === "saved" ? `/api/img/${p.id}/thumb.webp` : p.url}
                    alt=""
                    className="aspect-[3/4] w-full rounded-md border border-line bg-sand object-cover"
                  />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 rounded-sm bg-gold px-1.5 py-0.5 text-[9px] font-bold text-ink">
                      COVER
                    </span>
                  )}
                  {p.kind === "new" && (
                    <span className="absolute top-1 right-1 rounded-sm bg-ink/80 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      NEW
                    </span>
                  )}
                  <figcaption className="mt-1 flex justify-between text-[13px]">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      className="px-1.5 disabled:opacity-30"
                      aria-label="Move left"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="px-1.5 text-maroon"
                      aria-label="Remove photo"
                    >
                      ✕
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === photos.length - 1}
                      className="px-1.5 disabled:opacity-30"
                      aria-label="Move right"
                    >
                      →
                    </button>
                  </figcaption>
                </figure>
              ))}
              {photos.length < maxPhotos && (
                <label className="grid aspect-[3/4] cursor-pointer place-items-center rounded-md border-2 border-dashed border-line bg-cream/50 text-center text-[13px] text-muted hover:border-gold">
                  <span>
                    <span className="block text-2xl">+</span>Add photos
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={(e) => addFiles(e.target.files)}
                  />
                </label>
              )}
            </div>
            <p className="mt-3 text-[12px] text-muted">
              3:4 portrait · JPG/PNG/WebP · up to 5 MB each · first one is the cover · max {maxPhotos}. New photos
              upload when you save.
            </p>
          </div>
        </Card>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-8 xl:self-start">
        <Card title="Storefront preview">
          <div className="p-5">
            <div className="mx-auto max-w-52">
              <div className="relative overflow-hidden rounded-md">
                {cover ? (
                  <img
                    src={cover.kind === "saved" ? `/api/img/${cover.id}/card.webp` : cover.url}
                    alt=""
                    className="aspect-[3/4] w-full bg-sand object-cover"
                  />
                ) : (
                  <div className="grid aspect-[3/4] place-items-center bg-sand text-[12px] text-muted">No photo</div>
                )}
                {v.markNew && (
                  <span className="absolute top-2 left-2 rounded-sm bg-gold px-1.5 py-0.5 text-[10px] font-bold">
                    NEW
                  </span>
                )}
              </div>
              <p className="mt-2 flex justify-between text-[11px] tracking-wider text-muted uppercase">
                <span>{v.code || "SN-…"}</span>
                <span className="text-maroon">{fabricName}</span>
              </p>
              <p className="mt-1 line-clamp-2 text-[14px] font-semibold">{v.name || "[Design name appears here]"}</p>
              {sizeLabels.length > 0 && <p className="text-[12px] text-muted">Sizes {sizesLabel(sizeLabels)}</p>}
              {previewColours.length > 1 && (
                <p className="mt-1 flex items-center gap-1" aria-label="Available colours">
                  {previewColours.map((c) => (
                    <span
                      key={c.id}
                      title={c.name}
                      className="h-3.5 w-3.5 rounded-full border border-ink/10"
                      style={{ background: c.hex ?? "var(--color-sand)" }}
                    />
                  ))}
                </p>
              )}
              <p className="mt-1 flex items-center justify-between">
                <span>
                  <b>{v.rate ? `₹${Number(v.rate).toLocaleString("en-IN")}` : "₹—"}</b>
                  <span className="text-[12px] text-muted"> / pc</span>
                </span>
                <span className="rounded bg-chip px-1.5 py-0.5 text-[11px] text-chip-ink">Min {v.moq || "—"} pcs</span>
              </p>
            </div>
            <p className="mt-4 text-[12px] text-muted">
              How approved retailers see the card. Guests see &ldquo;Log in for rate&rdquo; instead of the price.
            </p>
          </div>
        </Card>

        {message && (
          <p
            role="status"
            className={`rounded-md p-3 text-[14px] font-medium ${message.kind === "error" ? "bg-maroon-50 text-maroon" : "bg-chip text-chip-ink"}`}
          >
            {message.text}
          </p>
        )}

        <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-line bg-cream/95 p-4 backdrop-blur xl:static xl:mx-0 xl:flex-col xl:border-0 xl:bg-transparent xl:p-0">
          <button
            type="button"
            disabled={busy}
            onClick={() => save(true)}
            className={`${btnPrimary} h-11 flex-1 xl:w-full xl:flex-none`}
          >
            {busy ? "Saving…" : "Save & publish"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => save(false)}
            className={`${btnSecondary} h-11 flex-1 xl:w-full xl:flex-none`}
          >
            Save as hidden
          </button>
          <Link href="/admin/products" className={`${btnSecondary} hidden h-11 xl:inline-flex`}>
            Cancel
          </Link>
        </div>
        {productId && (
          <p className="text-[12px] text-muted">
            Currently {v.visible ? "visible in the store" : "hidden from the store"}.{" "}
            {v.visible && (
              <a href={`/product/${initial.code}`} target="_blank" className="font-semibold text-maroon underline">
                View on site ↗
              </a>
            )}
          </p>
        )}
      </aside>
    </div>
  );
}
