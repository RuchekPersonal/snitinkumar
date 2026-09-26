export const SIZE_ORDER = ["S", "M", "L", "XL", "XXL", "3XL"] as const;

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function rupees(paise: number): string {
  return `₹${inr.format(Math.round(paise / 100))}`;
}

/** "S – 3XL" for a contiguous run of 4+ sizes, otherwise "M · L · XL". */
export function sizesLabel(sizes: string[]): string {
  const idx = sizes
    .map((s) => SIZE_ORDER.indexOf(s as (typeof SIZE_ORDER)[number]))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);
  if (idx.length === 0) return "";
  const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  if (contiguous && idx.length >= 4) return `${SIZE_ORDER[idx[0]]} – ${SIZE_ORDER[idx[idx.length - 1]]}`;
  return idx.map((i) => SIZE_ORDER[i]).join(" · ");
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
