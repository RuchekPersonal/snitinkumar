import "server-only";
import { z } from "zod";
import { db } from "../db";
import { requireAdmin } from "../admin-auth";
import { listOrderableProducts } from "../catalog";
import { must } from "./util";

// Orders taken by admins, usually on a business trip, and dispatched from head office.
// A set is one piece of each chosen size: pcs = sets × sizes. Rates are the listed rate
// at the moment the order is placed, copied onto each line so later price changes or
// deleted designs never alter an order.

export const ORDER_STATUSES = ["placed", "dispatched", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const ORDER_REF_RE = /^ORD-\d+$/;

export type OrderableProduct = Awaited<ReturnType<typeof listOrderableProducts>>[number];

export interface OrderCustomer {
  id: string;
  shopName: string;
  ownerName: string;
  city: string;
  mobile: string;
  transportPref: string;
  status: "approved" | "pending";
}

export interface Trip {
  id: string;
  name: string;
}

/** Everything the order form needs, loaded once when it opens. */
export async function getOrderFormData() {
  await requireAdmin();
  const c = db();
  const [retailers, trips, products] = await Promise.all([
    c
      .from("retailers")
      .select("id, shop_name, owner_name, city, mobile, transport_pref, status")
      .in("status", ["approved", "pending"])
      .order("shop_name"),
    c.from("trips").select("id, name").order("created_at", { ascending: false }),
    listOrderableProducts(),
  ]);
  const customers: OrderCustomer[] = (
    must(retailers, "retailers") as {
      id: string;
      shop_name: string;
      owner_name: string;
      city: string;
      mobile: string;
      transport_pref: string;
      status: "approved" | "pending";
    }[]
  ).map((r) => ({
    id: r.id,
    shopName: r.shop_name,
    ownerName: r.owner_name,
    city: r.city,
    mobile: r.mobile,
    transportPref: r.transport_pref,
    status: r.status,
  }));
  return {
    customers,
    trips: must(trips, "trips") as Trip[],
    products: [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

/** Creates a trip, or returns the existing one with the same name (ignoring case and spaces). */
export async function createTrip(nameRaw: string): Promise<Trip> {
  const admin = await requireAdmin();
  const name = nameRaw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 60) throw new Error("Trip name should be 2 to 60 characters");
  const c = db();
  const all = must(await c.from("trips").select("id, name"), "trips") as Trip[];
  const existing = all.find((t) => t.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;
  return must(
    await c.from("trips").insert({ name, created_by: admin.id }).select("id, name").single(),
    "create trip",
  ) as Trip;
}

export const OrderInput = z.object({
  clientToken: z.uuid(),
  retailerId: z.uuid("Choose a customer"),
  tripId: z.uuid().nullable(),
  note: z.string().trim().max(1000),
  transport: z.string().trim().max(120),
  lines: z
    .array(
      z.object({
        productId: z.uuid(),
        sizes: z.array(z.string().max(10)).min(1, "Pick at least one size").max(20),
        sets: z.number().int().min(1, "Sets must be at least 1").max(10000),
      }),
    )
    .min(1, "Add at least one design")
    .max(500),
});
export type OrderInput = z.infer<typeof OrderInput>;

/** Places an order at today's listed rates. Safe to retry: the same clientToken returns the same order. */
export async function createOrder(input: OrderInput): Promise<{ ref: string }> {
  const admin = await requireAdmin();
  const c = db();

  const dup = must(await c.from("orders").select("ref").eq("client_token", input.clientToken).maybeSingle(), "order");
  if (dup) return dup as { ref: string };

  const retailer = must(
    await c.from("retailers").select("id, status").eq("id", input.retailerId).maybeSingle(),
    "customer",
  ) as { id: string; status: string } | null;
  if (!retailer || !["approved", "pending"].includes(retailer.status))
    throw new Error("This customer can't take orders");

  // Only designs that are live in the store right now, at their current rate and sizes.
  const products = new Map((await listOrderableProducts()).map((p) => [p.id, p]));
  const seen = new Set<string>();
  const missing: string[] = [];
  const lines = input.lines.flatMap((l, position) => {
    const p = products.get(l.productId);
    if (!p) {
      missing.push(l.productId);
      return [];
    }
    if (seen.has(p.id)) throw new Error(`${p.code} is in the order twice`);
    seen.add(p.id);
    const wanted = new Set(l.sizes);
    const sizes = p.sizes.filter((s) => wanted.has(s)); // keep the product's size order
    if (sizes.length !== wanted.size)
      throw new Error(`${p.code} doesn't come in ${[...wanted].filter((s) => !p.sizes.includes(s)).join(", ")}`);
    return [
      {
        position,
        product_id: p.id,
        code_snapshot: p.code,
        name_snapshot: p.name,
        rate_paise_snapshot: p.ratePaise,
        sizes,
        sets: l.sets,
        pcs: l.sets * sizes.length,
      },
    ];
  });
  if (missing.length) {
    throw new Error(
      `${missing.length === 1 ? "One design is" : `${missing.length} designs are`} no longer in the store. Remove ${missing.length === 1 ? "it" : "them"} from the order and try again.`,
    );
  }

  const order = must(
    await c
      .from("orders")
      .insert({
        client_token: input.clientToken,
        retailer_id: retailer.id,
        trip_id: input.tripId,
        note: input.note,
        transport: input.transport,
        total_sets: lines.reduce((s, l) => s + l.sets, 0),
        total_pcs: lines.reduce((s, l) => s + l.pcs, 0),
        total_paise: lines.reduce((s, l) => s + l.pcs * l.rate_paise_snapshot, 0),
        taken_by: admin.id,
      })
      .select("id, ref")
      .single(),
    "create order",
  ) as { id: string; ref: string };

  const items = await c.from("order_items").insert(lines.map((l) => ({ ...l, order_id: order.id })));
  if (items.error) {
    // No multi-statement transactions through the REST client: undo the half-made order.
    await c.from("orders").delete().eq("id", order.id);
    throw new Error(`Couldn't save the order lines: ${items.error.message}`);
  }
  await c.from("order_events").insert({ order_id: order.id, to_status: "placed", by_admin_id: admin.id });
  return { ref: order.ref };
}

// ---------------------------------------------------------------- reading

export interface OrderSummary {
  id: string;
  ref: string;
  status: OrderStatus;
  shop: string;
  owner: string;
  city: string;
  trip: string | null;
  tripId: string | null;
  designs: number;
  sets: number;
  pcs: number;
  valuePaise: number;
  takenBy: string | null;
  createdAt: string;
  dispatchedAt: string | null;
}

type ListRow = {
  id: string;
  ref: string;
  status: OrderStatus;
  trip_id: string | null;
  total_sets: number;
  total_pcs: number;
  total_paise: number;
  created_at: string;
  dispatched_at: string | null;
  retailers: { shop_name: string; owner_name: string; city: string };
  trips: { name: string } | null;
  admins: { name: string } | null;
  order_items: { count: number }[];
};

const LIST_SELECT =
  "id, ref, status, trip_id, total_sets, total_pcs, total_paise, created_at, dispatched_at, retailers(shop_name, owner_name, city), trips(name), admins!orders_taken_by_fkey(name), order_items(count)";

const toSummary = (r: ListRow): OrderSummary => ({
  id: r.id,
  ref: r.ref,
  status: r.status,
  shop: r.retailers.shop_name,
  owner: r.retailers.owner_name,
  city: r.retailers.city,
  trip: r.trips?.name ?? null,
  tripId: r.trip_id,
  designs: r.order_items[0]?.count ?? 0,
  sets: r.total_sets,
  pcs: r.total_pcs,
  valuePaise: Number(r.total_paise),
  takenBy: r.admins?.name ?? null,
  createdAt: r.created_at,
  dispatchedAt: r.dispatched_at,
});

export interface OrderFilters {
  status?: string;
  trip?: string;
  q?: string;
  from?: string; // YYYY-MM-DD, India time
  to?: string;
}

const istStart = (d: string) => new Date(`${d}T00:00:00+05:30`).toISOString();
const istEnd = (d: string) => new Date(new Date(`${d}T00:00:00+05:30`).getTime() + 86_400_000).toISOString();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function listOrders(f: OrderFilters) {
  await requireAdmin();
  const c = db();
  let q = c.from("orders").select(LIST_SELECT).order("created_at", { ascending: false }).limit(500);
  if (f.trip === "none") q = q.is("trip_id", null);
  else if (f.trip && z.uuid().safeParse(f.trip).success) q = q.eq("trip_id", f.trip);
  if (f.from && DATE_RE.test(f.from)) q = q.gte("created_at", istStart(f.from));
  if (f.to && DATE_RE.test(f.to)) q = q.lt("created_at", istEnd(f.to));
  let rows = (must(await q, "orders") as unknown as ListRow[]).map(toSummary);

  if (f.q) {
    const needle = f.q.toLowerCase();
    rows = rows.filter((o) => `${o.ref} ${o.shop} ${o.owner} ${o.city}`.toLowerCase().includes(needle));
  }
  // Tab counts follow the other filters, so they always add up to what the tabs show.
  const counts = { all: rows.length, placed: 0, dispatched: 0, cancelled: 0 };
  for (const o of rows) counts[o.status]++;
  const status = (ORDER_STATUSES as readonly string[]).includes(f.status ?? "") ? (f.status as OrderStatus) : null;
  const items = status ? rows.filter((o) => o.status === status) : rows;
  const live = items.filter((o) => o.status !== "cancelled");
  return {
    items,
    counts,
    totals: {
      sets: live.reduce((s, o) => s + o.sets, 0),
      pcs: live.reduce((s, o) => s + o.pcs, 0),
      valuePaise: live.reduce((s, o) => s + o.valuePaise, 0),
    },
  };
}

export async function listTrips() {
  await requireAdmin();
  return must(await db().from("trips").select("id, name").order("created_at", { ascending: false }), "trips") as Trip[];
}

/** Orders waiting for dispatch, for the sidebar badge. */
export async function countOrdersToDispatch(): Promise<number> {
  const { count } = await db().from("orders").select("id", { count: "exact", head: true }).eq("status", "placed");
  return count ?? 0;
}

export async function getOrder(ref: string) {
  await requireAdmin();
  if (!ORDER_REF_RE.test(ref)) return null;
  const c = db();
  const row = must(
    await c
      .from("orders")
      .select(
        "id, ref, status, trip_id, note, transport, total_sets, total_pcs, total_paise, created_at, dispatched_at, dispatch_transport, dispatch_lr, retailers(id, shop_name, owner_name, city, state, mobile, gstin, address, pincode), trips(name), admins!orders_taken_by_fkey(name), order_items(position, product_id, code_snapshot, name_snapshot, rate_paise_snapshot, sizes, sets, pcs, products(product_images(id, position)))",
      )
      .eq("ref", ref)
      .maybeSingle(),
    "order",
  ) as unknown as {
    id: string;
    ref: string;
    status: OrderStatus;
    trip_id: string | null;
    note: string;
    transport: string;
    total_sets: number;
    total_pcs: number;
    total_paise: number;
    created_at: string;
    dispatched_at: string | null;
    dispatch_transport: string;
    dispatch_lr: string;
    retailers: {
      id: string;
      shop_name: string;
      owner_name: string;
      city: string;
      state: string;
      mobile: string;
      gstin: string | null;
      address: string;
      pincode: string | null;
    };
    trips: { name: string } | null;
    admins: { name: string } | null;
    order_items: {
      position: number;
      product_id: string | null;
      code_snapshot: string;
      name_snapshot: string;
      rate_paise_snapshot: number;
      sizes: string[];
      sets: number;
      pcs: number;
      products: { product_images: { id: string; position: number }[] } | null;
    }[];
  } | null;
  if (!row) return null;

  const events = must(
    await c
      .from("order_events")
      .select("from_status, to_status, note, created_at, admins(name)")
      .eq("order_id", row.id)
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
    id: row.id,
    ref: row.ref,
    status: row.status,
    trip: row.trips?.name ?? null,
    tripId: row.trip_id,
    note: row.note,
    transport: row.transport,
    sets: row.total_sets,
    pcs: row.total_pcs,
    valuePaise: Number(row.total_paise),
    createdAt: row.created_at,
    takenBy: row.admins?.name ?? null,
    dispatch: { date: row.dispatched_at, transport: row.dispatch_transport, lr: row.dispatch_lr },
    customer: row.retailers,
    lines: [...row.order_items]
      .sort((a, b) => a.position - b.position)
      .map((l) => ({
        productId: l.product_id,
        code: l.code_snapshot,
        name: l.name_snapshot,
        ratePaise: l.rate_paise_snapshot,
        sizes: l.sizes,
        sets: l.sets,
        pcs: l.pcs,
        coverImageId: [...(l.products?.product_images ?? [])].sort((a, b) => a.position - b.position)[0]?.id ?? null,
      })),
    events,
  };
}
export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrder>>>;

// ---------------------------------------------------------------- status changes

export const DispatchInput = z.object({
  date: z.string().regex(DATE_RE, "Pick the dispatch date"),
  transport: z.string().trim().max(120),
  lr: z.string().trim().max(60),
  note: z.string().trim().max(300),
});

async function changeStatus(
  id: string,
  from: OrderStatus[],
  to: OrderStatus,
  patch: Record<string, unknown>,
  note: string,
) {
  const admin = await requireAdmin();
  const c = db();
  const current = must(await c.from("orders").select("status").eq("id", id).maybeSingle(), "order") as {
    status: OrderStatus;
  } | null;
  if (!current) throw new Error("Order not found");
  if (!from.includes(current.status)) throw new Error(`This order is already ${current.status}`);
  must(
    await c
      .from("orders")
      .update({ status: to, ...patch })
      .eq("id", id)
      .eq("status", current.status),
    "update order",
  );
  must(
    await c
      .from("order_events")
      .insert({ order_id: id, from_status: current.status, to_status: to, by_admin_id: admin.id, note }),
    "history",
  );
}

export async function markDispatched(id: string, d: z.infer<typeof DispatchInput>) {
  const parts = [d.transport && `via ${d.transport}`, d.lr && `LR ${d.lr}`, d.note].filter(Boolean).join(" · ");
  await changeStatus(
    id,
    ["placed"],
    "dispatched",
    { dispatched_at: d.date, dispatch_transport: d.transport, dispatch_lr: d.lr },
    parts,
  );
}

export async function cancelOrder(id: string, reason: string) {
  await changeStatus(id, ["placed"], "cancelled", {}, reason);
}

/** Undo a dispatch or a cancellation; dispatch details are cleared. */
export async function reopenOrder(id: string) {
  await changeStatus(
    id,
    ["dispatched", "cancelled"],
    "placed",
    { dispatched_at: null, dispatch_transport: "", dispatch_lr: "" },
    "",
  );
}

// ---------------------------------------------------------------- trip summary & picking list

export async function getTripSummaries() {
  await requireAdmin();
  const c = db();
  const [trips, orders] = await Promise.all([
    c.from("trips").select("id, name, created_at").order("created_at", { ascending: false }),
    c.from("orders").select("trip_id, status, total_sets, total_pcs, total_paise, retailer_id, created_at"),
  ]);
  const rows = must(orders, "orders") as {
    trip_id: string | null;
    status: OrderStatus;
    total_sets: number;
    total_pcs: number;
    total_paise: number;
    retailer_id: string;
    created_at: string;
  }[];
  const summarise = (id: string | null, name: string, createdAt: string | null) => {
    const mine = rows.filter((o) => o.trip_id === id);
    const live = mine.filter((o) => o.status !== "cancelled");
    const dates = mine.map((o) => o.created_at).sort();
    return {
      id,
      name,
      createdAt,
      orders: live.length,
      toDispatch: mine.filter((o) => o.status === "placed").length,
      dispatched: mine.filter((o) => o.status === "dispatched").length,
      cancelled: mine.length - live.length,
      customers: new Set(live.map((o) => o.retailer_id)).size,
      sets: live.reduce((s, o) => s + o.total_sets, 0),
      pcs: live.reduce((s, o) => s + o.total_pcs, 0),
      valuePaise: live.reduce((s, o) => s + Number(o.total_paise), 0),
      firstOrder: dates[0] ?? null,
      lastOrder: dates.at(-1) ?? null,
    };
  };
  const list = (must(trips, "trips") as { id: string; name: string; created_at: string }[]).map((t) =>
    summarise(t.id, t.name, t.created_at),
  );
  const untagged = summarise(null, "No trip", null);
  return untagged.orders + untagged.cancelled > 0 ? [...list, untagged] : list;
}

/**
 * Everything still to dispatch, added up by design and size: one row per design with
 * pieces per size. Optionally limited to one trip ("none" = orders without a trip).
 */
export async function getPickingList(trip?: string) {
  await requireAdmin();
  const c = db();
  let q = c
    .from("order_items")
    .select(
      "code_snapshot, name_snapshot, product_id, sizes, sets, pcs, orders!inner(ref, status, trip_id), products(product_images(id, position))",
    )
    .eq("orders.status", "placed");
  if (trip === "none") q = q.is("orders.trip_id", null);
  else if (trip && z.uuid().safeParse(trip).success) q = q.eq("orders.trip_id", trip);
  const rows = must(await q, "picking") as unknown as {
    code_snapshot: string;
    name_snapshot: string;
    product_id: string | null;
    sizes: string[];
    sets: number;
    pcs: number;
    orders: { ref: string };
    products: { product_images: { id: string; position: number }[] } | null;
  }[];

  const sizeOrder = (
    must(await c.from("sizes").select("label").order("sort_order"), "sizes") as { label: string }[]
  ).map((s) => s.label);
  const byCode = new Map<
    string,
    {
      code: string;
      name: string;
      coverImageId: string | null;
      perSize: Record<string, number>;
      pcs: number;
      orders: Set<string>;
    }
  >();
  for (const r of rows) {
    const d = byCode.get(r.code_snapshot) ?? {
      code: r.code_snapshot,
      name: r.name_snapshot,
      coverImageId: [...(r.products?.product_images ?? [])].sort((a, b) => a.position - b.position)[0]?.id ?? null,
      perSize: {},
      pcs: 0,
      orders: new Set<string>(),
    };
    for (const s of r.sizes) d.perSize[s] = (d.perSize[s] ?? 0) + r.sets;
    d.pcs += r.pcs;
    d.orders.add(r.orders.ref);
    byCode.set(r.code_snapshot, d);
  }
  const designs = [...byCode.values()]
    .map((d) => ({ ...d, orders: d.orders.size }))
    .sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true }));
  const used = new Set(designs.flatMap((d) => Object.keys(d.perSize)));
  const sizes = [...sizeOrder.filter((s) => used.has(s)), ...[...used].filter((s) => !sizeOrder.includes(s))];
  const totals = Object.fromEntries(sizes.map((s) => [s, designs.reduce((n, d) => n + (d.perSize[s] ?? 0), 0)]));
  return {
    sizes,
    designs,
    totals,
    pcs: designs.reduce((n, d) => n + d.pcs, 0),
    orders: new Set(rows.map((r) => r.orders.ref)).size,
  };
}

// ---------------------------------------------------------------- CSV

/** One row per order line, for the current list filters. */
export async function exportOrderRows(f: OrderFilters) {
  const { items } = await listOrders(f);
  const ids = items.map((o) => o.id);
  const lines = ids.length
    ? (must(
        await db()
          .from("order_items")
          .select("order_id, position, code_snapshot, name_snapshot, rate_paise_snapshot, sizes, sets, pcs")
          .in("order_id", ids),
        "lines",
      ) as {
        order_id: string;
        position: number;
        code_snapshot: string;
        name_snapshot: string;
        rate_paise_snapshot: number;
        sizes: string[];
        sets: number;
        pcs: number;
      }[])
    : [];
  const byOrder = new Map<string, typeof lines>();
  for (const l of lines) byOrder.set(l.order_id, [...(byOrder.get(l.order_id) ?? []), l]);
  const date = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return [
    [
      "order",
      "date",
      "status",
      "trip",
      "shop",
      "owner",
      "city",
      "taken_by",
      "code",
      "design",
      "sizes",
      "sets",
      "pcs",
      "rate_rupees",
      "amount_rupees",
      "dispatched_on",
    ],
    ...items.flatMap((o) =>
      (byOrder.get(o.id) ?? [])
        .sort((a, b) => a.position - b.position)
        .map((l) => [
          o.ref,
          date(o.createdAt),
          o.status,
          o.trip ?? "",
          o.shop,
          o.owner,
          o.city,
          o.takenBy ?? "",
          l.code_snapshot,
          l.name_snapshot,
          l.sizes.join("|"),
          l.sets,
          l.pcs,
          l.rate_paise_snapshot / 100,
          (l.rate_paise_snapshot * l.pcs) / 100,
          o.dispatchedAt ?? "",
        ]),
    ),
  ];
}
