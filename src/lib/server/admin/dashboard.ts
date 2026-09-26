import "server-only";
import { db } from "../db";
import { requireAdmin } from "../admin-auth";
import { listEnquiries } from "./enquiries";
import { istDate, must } from "./util";

const DAY = 86_400_000;

export async function getDashboard(days = 30) {
  await requireAdmin();
  const c = db();
  const now = Date.now();
  const since = new Date(now - days * DAY).toISOString();
  const prior = new Date(now - 2 * days * DAY).toISOString();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [enqRes, itemsRes, productsRes, retailersRes, recent] = await Promise.all([
    c.from("enquiries").select("status, est_value_paise, created_at").gte("created_at", prior),
    c
      .from("enquiry_items")
      .select("code_snapshot, name_snapshot, qty, enquiries!inner(status, created_at)")
      .gte("enquiries.created_at", since)
      .neq("enquiries.status", "cancelled"),
    c
      .from("products")
      .select("id, code, name, stock_pcs, low_stock_threshold, is_visible, new_until, product_images(id)"),
    c.from("retailers").select("status, created_at"),
    listEnquiries({ limit: 6 }),
  ]);

  const enq = must(enqRes, "enquiries") as { status: string; est_value_paise: number | null; created_at: string }[];
  const value = (from: number, to: number) =>
    enq
      .filter((e) => e.status !== "cancelled")
      .filter((e) => {
        const t = new Date(e.created_at).getTime();
        return t >= from && t < to;
      })
      .reduce((s, e) => s + (e.est_value_paise ?? 0), 0);
  const valueNow = value(now - days * DAY, now + 1);
  const valuePrior = value(now - 2 * days * DAY, now - days * DAY);

  const items = must(itemsRes, "items") as { code_snapshot: string; name_snapshot: string; qty: number }[];
  const top = new Map<string, { code: string; name: string; pcs: number }>();
  for (const i of items) {
    const t = top.get(i.code_snapshot) ?? { code: i.code_snapshot, name: i.name_snapshot, pcs: 0 };
    t.pcs += i.qty;
    top.set(i.code_snapshot, t);
  }

  const products = must(productsRes, "products") as {
    id: string;
    code: string;
    name: string;
    stock_pcs: number;
    low_stock_threshold: number;
    is_visible: boolean;
    new_until: string | null;
    product_images: { id: string }[];
  }[];
  const today = istDate();
  const visible = products.filter((p) => p.is_visible);

  // Open enquiries per design, to flag low stock that is already being asked for.
  const open = must(
    await c
      .from("enquiry_items")
      .select("code_snapshot, enquiries!inner(status)")
      .in("enquiries.status", ["new", "confirmed"]),
    "open items",
  ) as { code_snapshot: string }[];
  const openByCode = new Map<string, number>();
  for (const o of open) openByCode.set(o.code_snapshot, (openByCode.get(o.code_snapshot) ?? 0) + 1);

  const retailers = must(retailersRes, "retailers") as { status: string; created_at: string }[];

  return {
    kpis: {
      newEnquiries: recent.counts.new,
      newSinceYesterday: enq.filter((e) => e.status === "new" && new Date(e.created_at).getTime() > now - DAY).length,
      valuePaise: valueNow,
      valueChangePct: valuePrior > 0 ? Math.round(((valueNow - valuePrior) / valuePrior) * 100) : null,
      activeDesigns: visible.length,
      markedNew: visible.filter((p) => p.new_until && p.new_until >= today).length,
      hidden: products.length - visible.length,
      retailers: retailers.filter((r) => r.status === "approved").length,
      pendingRetailers: retailers.filter((r) => r.status === "pending").length,
      retailersThisMonth: retailers.filter((r) => r.status === "approved" && new Date(r.created_at) >= monthStart)
        .length,
    },
    recent: recent.items,
    topDesigns: [...top.values()].sort((a, b) => b.pcs - a.pcs).slice(0, 5),
    attention: {
      lowStock: visible
        .filter((p) => p.stock_pcs <= p.low_stock_threshold)
        .map((p) => ({ code: p.code, name: p.name, stock: p.stock_pcs, openEnquiries: openByCode.get(p.code) ?? 0 }))
        .sort((a, b) => b.openEnquiries - a.openEnquiries || a.stock - b.stock),
      noPhoto: products.filter((p) => p.product_images.length === 0).map((p) => p.code),
      staleEnquiries: enq.filter((e) => e.status === "new" && new Date(e.created_at).getTime() < now - DAY).length,
    },
  };
}
