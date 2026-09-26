import "server-only";
import { revalidateTag } from "next/cache";
import { CATALOG_TAG } from "../catalog";

export function must<T>(res: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as NonNullable<T>;
}

/** Storefront catalogue cache: expire now so the next visitor sees the change. */
export function refreshCatalog() {
  revalidateTag(CATALOG_TAG, { expire: 0 });
}

/** RFC 4180 CSV with a BOM so Excel opens ₹ and Indian names correctly. */
export function toCsv(rows: (string | number | boolean | null | undefined)[][]): string {
  const cell = (v: string | number | boolean | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Leading = + - @ would run as formulas in Excel; prefix with a quote.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export const istDate = (d: Date = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? "Yesterday" : `${days} d ago`;
}
