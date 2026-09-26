import "server-only";
import { z } from "zod";
import { db } from "../db";
import { requireAdmin } from "../admin-auth";
import { must } from "./util";

/** "+91 98765 43210", "09876543210", "919876543210" → "+919876543210". Only strips a 91/0 prefix when it is extra. */
export function normaliseIndianMobile(raw: string): string {
  const d = raw.replace(/\D/g, "");
  const ten =
    d.length === 12 && d.startsWith("91") ? d.slice(2) : d.length === 11 && d.startsWith("0") ? d.slice(1) : d;
  return `+91${ten}`;
}

export type RetailerStatus = "pending" | "approved" | "rejected" | "blocked";

export interface CustomerRow {
  id: string;
  shopName: string;
  ownerName: string;
  gstin: string | null;
  city: string;
  state: string;
  mobile: string;
  status: RetailerStatus;
  statusReason: string | null;
  enquiries: number;
  lifetimePaise: number;
  lastEnquiryAt: string | null;
  createdAt: string;
}

export async function listCustomers(opts: { q?: string; status?: string }) {
  await requireAdmin();
  const c = db();
  const [retailers, enquiries] = await Promise.all([
    c.from("retailers").select("*").order("created_at", { ascending: false }),
    c.from("enquiries").select("retailer_id, est_value_paise, status, created_at").not("retailer_id", "is", null),
  ]);
  const enq = must(enquiries, "enquiries") as {
    retailer_id: string;
    est_value_paise: number | null;
    status: string;
    created_at: string;
  }[];

  const ninetyDaysAgo = Date.now() - 90 * 86_400_000;
  const orderedRecently = new Set<string>();
  const stats = new Map<string, { n: number; value: number; last: string | null }>();
  for (const e of enq) {
    const s = stats.get(e.retailer_id) ?? { n: 0, value: 0, last: null };
    s.n++;
    if (e.status !== "cancelled") s.value += e.est_value_paise ?? 0;
    if (!s.last || e.created_at > s.last) s.last = e.created_at;
    stats.set(e.retailer_id, s);
    if (new Date(e.created_at).getTime() > ninetyDaysAgo) orderedRecently.add(e.retailer_id);
  }

  const all: CustomerRow[] = (must(retailers, "retailers") as Record<string, string | null>[]).map((r) => {
    const s = stats.get(r.id!);
    return {
      id: r.id!,
      shopName: r.shop_name!,
      ownerName: r.owner_name!,
      gstin: r.gstin,
      city: r.city!,
      state: r.state ?? "",
      mobile: r.mobile!,
      status: r.status as RetailerStatus,
      statusReason: r.status_reason,
      enquiries: s?.n ?? 0,
      lifetimePaise: s?.value ?? 0,
      lastEnquiryAt: s?.last ?? null,
      createdAt: r.created_at!,
    };
  });

  const cityCounts = new Map<string, number>();
  for (const r of all) if (r.status === "approved") cityCounts.set(r.city, (cityCounts.get(r.city) ?? 0) + 1);
  const topCity = [...cityCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  let items = all;
  if (opts.status) items = items.filter((r) => r.status === opts.status);
  if (opts.q) {
    const q = opts.q.toLowerCase();
    items = items.filter((r) =>
      `${r.shopName} ${r.ownerName} ${r.city} ${r.mobile} ${r.gstin ?? ""}`.toLowerCase().includes(q),
    );
  }
  // Pending first so approvals are not missed.
  items = [...items].sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending"));

  return {
    items,
    total: all.length,
    pending: all.filter((r) => r.status === "pending").length,
    orderedLast90: orderedRecently.size,
    topCity,
  };
}

export async function setRetailerStatus(id: string, status: RetailerStatus, reason: string) {
  const admin = await requireAdmin();
  must(
    await db()
      .from("retailers")
      .update({
        status,
        status_reason: reason || null,
        ...(status === "approved" ? { approved_by: admin.id, approved_at: new Date().toISOString() } : {}),
      })
      .eq("id", id),
    "status",
  );
}

export const RetailerInput = z.object({
  shopName: z.string().trim().min(2, "Shop name is required").max(120),
  ownerName: z.string().trim().min(2, "Owner name is required").max(80),
  mobile: z
    .string()
    .trim()
    .transform(normaliseIndianMobile)
    .refine((v) => /^\+91[6-9][0-9]{9}$/.test(v), "Enter a 10-digit Indian mobile number"),
  city: z.string().trim().min(2, "City is required").max(80),
  state: z.string().trim().max(40),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(v), "GSTIN format looks wrong"),
  address: z.string().trim().max(300),
});

export async function addRetailer(input: z.infer<typeof RetailerInput>) {
  const admin = await requireAdmin();
  const { error } = await db()
    .from("retailers")
    .insert({
      shop_name: input.shopName,
      owner_name: input.ownerName,
      mobile: input.mobile,
      city: input.city,
      state: input.state,
      gstin: input.gstin || null,
      address: input.address,
      status: "approved",
      approved_by: admin.id,
      approved_at: new Date().toISOString(),
    });
  if (error?.code === "23505") throw new Error("A retailer with this mobile number already exists");
  if (error) throw new Error(error.message);
}

export async function exportCustomerRows() {
  const { items } = await listCustomers({});
  return [
    ["shop", "owner", "mobile", "city", "state", "gstin", "status", "enquiries", "lifetime_value_rupees", "registered"],
    ...items.map((r) => [
      r.shopName,
      r.ownerName,
      r.mobile,
      r.city,
      r.state,
      r.gstin,
      r.status,
      r.enquiries,
      r.lifetimePaise / 100,
      r.createdAt.slice(0, 10),
    ]),
  ];
}
