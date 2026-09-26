import "server-only";
import { z } from "zod";
import { db } from "../db";
import { requireAdmin } from "../admin-auth";
import { getEnquiryProducts } from "../catalog";
import { must } from "./util";

export const STATUSES = ["new", "confirmed", "dispatched", "cancelled"] as const;
export type EnquiryStatus = (typeof STATUSES)[number];

export interface EnquirySummary {
  id: string;
  ref: string;
  status: EnquiryStatus;
  source: "website" | "whatsapp" | "manual";
  shop: string;
  person: string | null;
  city: string | null;
  phone: string | null;
  pcs: number;
  valuePaise: number | null;
  items: string; // "SN-101 ×12, SN-106 ×20"
  createdAt: string;
}

const SELECT =
  "id, ref, status, source, guest_shop, guest_name, guest_city, guest_phone, total_pcs, est_value_paise, created_at, retailers(shop_name, owner_name, city, mobile), enquiry_items(code_snapshot, qty)";

type Row = {
  id: string;
  ref: string;
  status: EnquiryStatus;
  source: EnquirySummary["source"];
  guest_shop: string | null;
  guest_name: string | null;
  guest_city: string | null;
  guest_phone: string | null;
  total_pcs: number;
  est_value_paise: number | null;
  created_at: string;
  retailers: { shop_name: string; owner_name: string; city: string; mobile: string } | null;
  enquiry_items: { code_snapshot: string; qty: number }[];
};

function toSummary(r: Row): EnquirySummary {
  return {
    id: r.id,
    ref: r.ref,
    status: r.status,
    source: r.source,
    shop: r.retailers?.shop_name ?? r.guest_shop ?? "Guest",
    person: r.retailers?.owner_name ?? r.guest_name,
    city: r.retailers?.city ?? r.guest_city,
    phone: r.retailers?.mobile ?? r.guest_phone,
    pcs: r.total_pcs,
    valuePaise: r.est_value_paise,
    items: r.enquiry_items.map((i) => `${i.code_snapshot} ×${i.qty}`).join(", "),
    createdAt: r.created_at,
  };
}

export async function listEnquiries(opts: { status?: string; limit?: number }) {
  await requireAdmin();
  const c = db();
  let q = c
    .from("enquiries")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.status && (STATUSES as readonly string[]).includes(opts.status)) q = q.eq("status", opts.status);
  const rows = must(await q, "enquiries") as unknown as Row[];

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const counts = must(await c.from("enquiries").select("status, created_at"), "counts") as {
    status: EnquiryStatus;
    created_at: string;
  }[];
  const tally = { all: counts.length, new: 0, confirmed: 0, dispatched: 0, cancelled: 0, dispatchedThisMonth: 0 };
  for (const r of counts) {
    tally[r.status]++;
    if (r.status === "dispatched" && new Date(r.created_at) >= monthStart) tally.dispatchedThisMonth++;
  }
  return { items: rows.map(toSummary), counts: tally };
}

export async function getEnquiry(ref: string) {
  await requireAdmin();
  const c = db();
  const row = must(
    await c
      .from("enquiries")
      .select(
        "id, ref, status, source, guest_shop, guest_name, guest_city, guest_phone, total_pcs, est_value_paise, created_at, note_from_retailer, internal_note, retailers(shop_name, owner_name, city, mobile, gstin, address, pincode), enquiry_items(code_snapshot, name_snapshot, rate_paise_snapshot, qty)",
      )
      .eq("ref", ref.toUpperCase())
      .maybeSingle(),
    "enquiry",
  ) as unknown as
    | (Omit<Row, "retailers" | "enquiry_items"> & {
        note_from_retailer: string;
        internal_note: string;
        retailers: (Row["retailers"] & { gstin: string | null; address: string; pincode: string | null }) | null;
        enquiry_items: { code_snapshot: string; name_snapshot: string; rate_paise_snapshot: number; qty: number }[];
      })
    | null;
  if (!row) return null;
  const events = must(
    await c
      .from("enquiry_events")
      .select("from_status, to_status, note, created_at, admins(name)")
      .eq("enquiry_id", row.id)
      .order("created_at", { ascending: false }),
    "events",
  ) as unknown as {
    from_status: string | null;
    to_status: string;
    note: string;
    created_at: string;
    admins: { name: string } | null;
  }[];
  return {
    ...toSummary(row),
    note: row.note_from_retailer,
    internalNote: row.internal_note,
    retailer: row.retailers,
    lines: row.enquiry_items,
    events,
  };
}

export const UpdateEnquiry = z.object({
  status: z.enum(STATUSES),
  internalNote: z.string().trim().max(1000),
  phone: z
    .string()
    .trim()
    .max(16)
    .refine((v) => v === "" || /^\+?[0-9 ]{10,16}$/.test(v), "Phone should be 10+ digits"),
});

export async function updateEnquiry(ref: string, input: z.infer<typeof UpdateEnquiry>) {
  const admin = await requireAdmin();
  const c = db();
  const current = must(await c.from("enquiries").select("id, status, retailer_id").eq("ref", ref).single(), "enquiry");
  must(
    await c
      .from("enquiries")
      .update({
        status: input.status,
        internal_note: input.internalNote,
        ...(current.retailer_id ? {} : { guest_phone: input.phone || null }),
      })
      .eq("id", current.id),
    "update enquiry",
  );
  if (current.status !== input.status) {
    must(
      await c.from("enquiry_events").insert({
        enquiry_id: current.id,
        from_status: current.status,
        to_status: input.status,
        by_admin_id: admin.id,
        note: input.internalNote.slice(0, 200),
      }),
      "event",
    );
  }
}

export const ManualEnquiry = z.object({
  shop: z.string().trim().min(2, "Shop name is required").max(120),
  name: z.string().trim().max(80),
  city: z.string().trim().max(80),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\+?[0-9 ]{10,16}$/.test(v), "Phone should be 10+ digits"),
  note: z.string().trim().max(500),
  lines: z
    .array(z.object({ code: z.string().trim().toUpperCase(), qty: z.coerce.number().int().min(1) }))
    .min(1, "Add at least one design"),
});

/** Records an enquiry that arrived directly on WhatsApp or by phone. */
export async function createManualEnquiry(input: z.infer<typeof ManualEnquiry>): Promise<string> {
  const admin = await requireAdmin();
  const products = await getEnquiryProducts(input.lines.map((l) => l.code));
  const byCode = new Map(products.map((p) => [p.code, p]));
  const missing = input.lines.filter((l) => !byCode.has(l.code)).map((l) => l.code);
  if (missing.length) throw new Error(`Unknown or hidden design: ${missing.join(", ")}`);

  const items = input.lines.map((l) => ({ p: byCode.get(l.code)!, qty: l.qty }));
  const c = db();
  const enq = must(
    await c
      .from("enquiries")
      .insert({
        guest_shop: input.shop,
        guest_name: input.name || null,
        guest_city: input.city || null,
        guest_phone: input.phone || null,
        source: "whatsapp",
        note_from_retailer: input.note,
        total_pcs: items.reduce((s, i) => s + i.qty, 0),
        est_value_paise: items.reduce((s, i) => s + i.qty * i.p.ratePaise, 0),
      })
      .select("id, ref")
      .single(),
    "insert enquiry",
  );
  must(
    await c.from("enquiry_items").insert(
      items.map((i) => ({
        enquiry_id: enq.id,
        product_id: i.p.id,
        code_snapshot: i.p.code,
        name_snapshot: i.p.name,
        rate_paise_snapshot: i.p.ratePaise,
        qty: i.qty,
      })),
    ),
    "insert items",
  );
  must(
    await c
      .from("enquiry_events")
      .insert({ enquiry_id: enq.id, to_status: "new", by_admin_id: admin.id, note: "Entered by staff" }),
    "event",
  );
  return enq.ref;
}

export async function exportEnquiryRows(month: string) {
  await requireAdmin();
  const start = new Date(`${month}-01T00:00:00+05:30`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  const rows = must(
    await db()
      .from("enquiries")
      .select(SELECT)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .order("created_at"),
    "export",
  ) as unknown as Row[];
  return [
    ["ref", "date", "status", "source", "shop", "contact", "city", "phone", "pcs", "value_rupees", "items"],
    ...rows
      .map(toSummary)
      .map((e) => [
        e.ref,
        new Date(e.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        e.status,
        e.source,
        e.shop,
        e.person,
        e.city,
        e.phone,
        e.pcs,
        e.valuePaise === null ? "" : e.valuePaise / 100,
        e.items,
      ]),
  ];
}
