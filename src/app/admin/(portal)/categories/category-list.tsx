"use client";

import { useState, useTransition } from "react";
import { moveCategoryAction, saveCategoryAction } from "@/app/admin/_actions/categories";
import { btnPrimary, btnSecondary, input, label } from "@/components/admin/ui";
import { slugify } from "@/lib/format";
import { CategoryPhoto } from "./category-photo";

interface Category {
  id: number;
  slug: string;
  name: string;
  short_name: string;
  description: string;
  show_on_home: boolean;
  is_visible: boolean;
  cover_image_id: string | null;
  designs: number;
}

type Draft = {
  name: string;
  shortName: string;
  slug: string;
  description: string;
  showOnHome: boolean;
  visible: boolean;
};
const EMPTY: Draft = { name: "", shortName: "", slug: "", description: "", showOnHome: true, visible: true };

function CategoryEditor({ initial, id, onDone }: { initial: Draft; id?: number; onDone: () => void }) {
  const [d, setD] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(!!id);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="grid gap-3 p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveCategoryAction(d, id);
          if (res.ok) onDone();
          else setError(res.error);
        });
      }}
    >
      <div>
        <label className={label} htmlFor={`c-name-${id ?? "new"}`}>
          Name
        </label>
        <input
          id={`c-name-${id ?? "new"}`}
          value={d.name}
          onChange={(e) =>
            setD({ ...d, name: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })
          }
          className={input}
          required
        />
      </div>
      <div>
        <label className={label} htmlFor={`c-short-${id ?? "new"}`}>
          Short name (mobile pills)
        </label>
        <input
          id={`c-short-${id ?? "new"}`}
          value={d.shortName}
          onChange={(e) => setD({ ...d, shortName: e.target.value })}
          className={input}
          maxLength={20}
        />
      </div>
      <div>
        <label className={label} htmlFor={`c-slug-${id ?? "new"}`}>
          URL slug · /catalog/…
        </label>
        <input
          id={`c-slug-${id ?? "new"}`}
          value={d.slug}
          onChange={(e) => {
            setSlugTouched(true);
            setD({ ...d, slug: e.target.value });
          }}
          className={input}
          required
        />
      </div>
      <div>
        <label className={label} htmlFor={`c-desc-${id ?? "new"}`}>
          Short description
        </label>
        <input
          id={`c-desc-${id ?? "new"}`}
          value={d.description}
          onChange={(e) => setD({ ...d, description: e.target.value })}
          className={input}
          maxLength={300}
        />
      </div>
      <label className="flex items-center gap-2 text-[14px]">
        <input
          type="checkbox"
          checked={d.showOnHome}
          onChange={(e) => setD({ ...d, showOnHome: e.target.checked })}
          className="h-5 w-5 accent-maroon"
        />
        Show in &ldquo;Popular categories&rdquo; on home
      </label>
      <label className="flex items-center gap-2 text-[14px]">
        <input
          type="checkbox"
          checked={d.visible}
          onChange={(e) => setD({ ...d, visible: e.target.checked })}
          className="h-5 w-5 accent-maroon"
        />
        Visible in storefront now
      </label>
      {error && <p className="text-[13px] font-medium text-maroon sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button disabled={pending} className={btnPrimary}>
          {pending ? "Saving…" : id ? "Save" : "Create category"}
        </button>
        <button type="button" onClick={onDone} className={btnSecondary}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function CategoryList({ categories }: { categories: Category[] }) {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [pending, start] = useTransition();

  return (
    <div>
      <ul className="divide-y divide-line" aria-busy={pending}>
        {categories.map((c, i) =>
          editing === c.id ? (
            <li key={c.id} className="bg-cream/40">
              <CategoryEditor
                id={c.id}
                onDone={() => setEditing(null)}
                initial={{
                  name: c.name,
                  shortName: c.short_name,
                  slug: c.slug,
                  description: c.description,
                  showOnHome: c.show_on_home,
                  visible: c.is_visible,
                }}
              />
            </li>
          ) : (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex flex-col">
                <button
                  onClick={() => start(async () => void (await moveCategoryAction(c.id, -1)))}
                  disabled={pending || i === 0}
                  className="px-1 text-muted disabled:opacity-30"
                  aria-label={`Move ${c.name} up`}
                >
                  ▲
                </button>
                <button
                  onClick={() => start(async () => void (await moveCategoryAction(c.id, 1)))}
                  disabled={pending || i === categories.length - 1}
                  className="px-1 text-muted disabled:opacity-30"
                  aria-label={`Move ${c.name} down`}
                >
                  ▼
                </button>
              </div>
              <CategoryPhoto categoryId={c.id} name={c.name} coverId={c.cover_image_id} />
              <div className="min-w-0 flex-1">
                <p className={`font-serif text-lg font-semibold ${c.is_visible ? "" : "text-muted"}`}>{c.name}</p>
                <p className="text-[12px] text-muted">
                  /catalog/{c.slug} ·{" "}
                  {c.is_visible ? (c.show_on_home ? "shown on home" : "in catalogue only") : "hidden from store"}
                </p>
              </div>
              <span className="text-[13px] text-muted">{c.designs} designs</span>
              <button onClick={() => setEditing(c.id)} className="text-[13px] font-semibold text-maroon">
                Edit
              </button>
            </li>
          ),
        )}
      </ul>
      {editing === "new" ? (
        <div className="border-t border-line bg-cream/40">
          <CategoryEditor initial={EMPTY} onDone={() => setEditing(null)} />
        </div>
      ) : (
        <div className="border-t border-line p-4">
          <button onClick={() => setEditing("new")} className={btnSecondary}>
            + Add category
          </button>
        </div>
      )}
    </div>
  );
}
