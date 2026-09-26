import Papa from "papaparse";
import { requireAdminApi } from "@/lib/server/admin-auth";
import { CSV_COLUMNS, importProductRecords } from "@/lib/server/admin/products";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 2000;

export async function POST(req: Request) {
  const auth = await requireAdminApi(req);
  if (auth instanceof Response) return auth;

  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose a CSV file" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "CSV is larger than 2 MB" }, { status: 400 });

  const text = (await file.text()).replace(/^﻿/, "");
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });
  const headers = parsed.meta.fields ?? [];
  const missing = ["code", "name", "category", "fabric", "colour", "rate", "sizes"].filter((c) => !headers.includes(c));
  if (missing.length) {
    return Response.json(
      { error: `Missing columns: ${missing.join(", ")}. Expected: ${CSV_COLUMNS.join(", ")}` },
      { status: 400 },
    );
  }
  if (parsed.data.length > MAX_ROWS)
    return Response.json({ error: `At most ${MAX_ROWS} rows per import` }, { status: 400 });

  const report = await importProductRecords(parsed.data);
  return Response.json(report);
}
