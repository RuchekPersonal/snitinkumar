"use client";

/* eslint-disable @next/next/no-img-element -- photos are served pre-sized by /api/img */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderableProduct, OrderCustomer, Trip } from "@/lib/server/admin/orders";
import {
  addOrderCustomerAction,
  createOrderAction,
  createTripAction,
  getRepeatOrderAction,
} from "@/app/admin/_actions/orders";
import { CreatableCombobox } from "@/components/admin/creatable-combobox";
import { btnPrimary, btnSecondary, Card, input, label } from "@/components/admin/ui";
import { MinusIcon, PlusIcon, SearchIcon } from "@/components/icons";
import { rupees } from "@/lib/format";

// Taking an order on the road: customer → designs → review. The order in progress is kept
// on this device after every change, so a dropped connection or a refresh never loses it,
// and its token makes a retried submit place the order only once.

type Step = "customer" | "designs" | "review";
type Line = { sizes: string[]; sets: number };

interface Draft {
  v: 1;
  token: string;
  step: Step;
  customerId: string | null;
  tripId: string;
  lines: Record<string, Line>;
  added: string[]; // product ids in the order they were added
  note: string;
  transport: string;
  savedAt: number;
}

const newDraft = (tripId = ""): Draft => ({
  v: 1,
  token: crypto.randomUUID(),
  step: "customer",
  customerId: null,
  tripId,
  lines: {},
  added: [],
  note: "",
  transport: "",
  savedAt: Date.now(),
});

const store = {
  get<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked: the order still works, it just isn't kept */
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

const pcsOf = (l: Line) => l.sets * l.sizes.length;
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const ago = (t: number) => {
  const mins = Math.round((Date.now() - t) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 24 ? `${hrs} h ago` : `${Math.round(hrs / 24)} d ago`;
};

/** A past order to copy: its customer and the lines still available in the store. */
interface Repeat {
  ref: string;
  retailerId: string;
  lines: { productId: string; sizes: string[]; sets: number }[];
  skipped: number;
}

function draftFromRepeat(r: Repeat, tripId: string, customers: OrderCustomer[]): Draft {
  const d = newDraft(tripId);
  const customer = customers.find((c) => c.id === r.retailerId);
  d.customerId = customer?.id ?? null;
  d.transport = customer?.transportPref ?? "";
  d.lines = Object.fromEntries(r.lines.map((l) => [l.productId, { sizes: l.sizes, sets: l.sets }]));
  d.added = r.lines.map((l) => l.productId);
  d.step = !customer ? "customer" : r.lines.length ? "review" : "designs";
  return d;
}

const repeatNotice = (r: Repeat) =>
  `Copied from ${r.ref}.${
    r.skipped
      ? ` ${r.skipped} ${r.skipped === 1 ? "design is" : "designs are"} no longer in the store and ${r.skipped === 1 ? "was" : "were"} left out.`
      : ""
  } Check the sizes and sets, then place the order.`;

interface Props {
  adminId: string;
  /** Set when opened from "Repeat order" on a past order. */
  repeat: Repeat | null;
  customers: OrderCustomer[];
  trips: Trip[];
  products: OrderableProduct[];
  categories: { slug: string; name: string }[];
}

export function OrderBuilder(props: Props) {
  const router = useRouter();
  const draftKey = `snk-order-draft:${props.adminId}`;
  const tripKey = `snk-order-trip:${props.adminId}`;

  const [d, setD] = useState<Draft>(() => newDraft());
  const [ready, setReady] = useState(false); // draft read from the device
  const [restored, setRestored] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [customers, setCustomers] = useState(props.customers);
  const [trips, setTrips] = useState(props.trips);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const products = useMemo(() => new Map(props.products.map((p) => [p.id, p])), [props.products]);

  // Restore an unfinished order (or at least the trip in use) once, after hydration.
  useEffect(() => {
    const saved = store.get<Draft>(draftKey);
    const tripId = store.get<string>(tripKey) ?? "";
    const knownTrip = props.trips.some((t) => t.id === tripId) ? tripId : "";
    const unfinished = saved?.v === 1 && saved.added.some((id) => (saved.lines[id]?.sets ?? 0) > 0);
    if (props.repeat && (!unfinished || confirm(`Replace your unfinished order with a copy of ${props.repeat.ref}?`))) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time setup from the URL
      setD(draftFromRepeat(props.repeat, knownTrip, props.customers));
      setNotice(repeatNotice(props.repeat));
      router.replace("/admin/orders/new", { scroll: false }); // a refresh keeps the draft, not the copy
    } else if (saved?.v === 1 && (saved.customerId || saved.added.length)) {
      const customerOk = props.customers.some((c) => c.id === saved.customerId);
      setD({ ...saved, customerId: customerOk ? saved.customerId : null, step: customerOk ? saved.step : "customer" });
      setRestored(saved.savedAt);
    } else {
      setD(newDraft(knownTrip));
    }
    setReady(true);
    // Runs once on open; later changes to these props must not reset the order in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ready) store.set(draftKey, d);
  }, [ready, d, draftKey]);

  const update = useCallback((patch: Partial<Draft> | ((d: Draft) => Partial<Draft>)) => {
    setD((cur) => ({ ...cur, ...(typeof patch === "function" ? patch(cur) : patch), savedAt: Date.now() }));
  }, []);

  const setLine = useCallback(
    (id: string, line: Line) =>
      update((cur) => ({
        lines: { ...cur.lines, [id]: line },
        added: line.sets > 0 && !cur.added.includes(id) ? [...cur.added, id] : cur.added,
      })),
    [update],
  );

  const go = (step: Step) => {
    update({ step });
    setError(null);
    topRef.current?.scrollIntoView({ block: "start" });
  };

  const customer = customers.find((c) => c.id === d.customerId) ?? null;
  const trip = trips.find((t) => t.id === d.tripId) ?? null;
  const ordered = d.added.filter((id) => (d.lines[id]?.sets ?? 0) > 0);
  const unavailable = ordered.filter((id) => !products.has(id));
  const totals = ordered.reduce(
    (t, id) => {
      const l = d.lines[id];
      const p = products.get(id);
      t.sets += l.sets;
      t.pcs += pcsOf(l);
      t.value += p ? pcsOf(l) * p.ratePaise : 0;
      return t;
    },
    { sets: 0, pcs: 0, value: 0 },
  );

  function startOver() {
    if (ordered.length && !confirm("Discard this order and start a new one?")) return;
    store.remove(draftKey);
    setD(newDraft(d.tripId));
    setRestored(null);
    setNotice(null);
    setError(null);
  }

  async function repeatFrom(ref: string) {
    if (ordered.length && !confirm(`Replace the designs in this order with the ones from ${ref}?`)) return;
    setError(null);
    const r = await getRepeatOrderAction(ref).catch(() => null);
    if (!r?.ok) return setError(r ? r.error : "Couldn't reach the server. Try again.");
    setD((cur) => ({ ...draftFromRepeat(r, cur.tripId, customers), token: cur.token }));
    setRestored(null);
    setNotice(repeatNotice(r));
    topRef.current?.scrollIntoView({ block: "start" });
  }

  async function submit() {
    if (!customer) return go("customer");
    if (unavailable.length) return setError("Remove the designs that are no longer in the store first.");
    setBusy(true);
    setError(null);
    try {
      const res = await createOrderAction({
        clientToken: d.token,
        retailerId: customer.id,
        tripId: d.tripId || null,
        note: d.note,
        transport: d.transport,
        lines: ordered.map((id) => ({ productId: id, sizes: d.lines[id].sizes, sets: d.lines[id].sets })),
      });
      if (!res.ok) {
        setBusy(false);
        return setError(res.error);
      }
      store.remove(draftKey);
      router.push(`/admin/orders/${res.ref}?placed=1`);
    } catch {
      setBusy(false);
      setError(
        "Couldn't reach the server. The order is saved on this device. Check the connection and press Place order again; it will only be placed once.",
      );
    }
  }

  if (!ready) return <p className="py-10 text-center text-muted">Loading…</p>;

  return (
    <div ref={topRef} className="scroll-mt-20 pb-28">
      <Steps step={d.step} canGo={{ designs: !!customer, review: !!customer && ordered.length > 0 }} onGo={go} />

      {restored && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gold/50 bg-gold-50 px-4 py-3 text-[14px]">
          <span>Picked up your unfinished order from this device (last change {ago(restored)}).</span>
          <button onClick={startOver} className="font-semibold text-maroon underline underline-offset-2">
            Start a new order instead
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-[#2f4a7a]/30 bg-[#dfe7f5] px-4 py-3 text-[14px] text-[#2f4a7a]"
        >
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss" className="font-bold">
            ×
          </button>
        </div>
      )}

      {d.step === "customer" && (
        <CustomerStep
          customers={customers}
          trips={trips}
          customerId={d.customerId}
          tripId={d.tripId}
          onTrip={(tripId) => {
            update({ tripId });
            store.set(tripKey, tripId);
          }}
          onCreateTrip={async (name) => {
            const res = await createTripAction(name);
            if (!res.ok) return res;
            setTrips((list) => (list.some((t) => t.id === res.trip.id) ? list : [res.trip, ...list]));
            return { ok: true, option: res.trip };
          }}
          onCustomer={(c) => {
            if (!customers.some((x) => x.id === c.id)) setCustomers((list) => [...list, c]);
            update({ customerId: c.id, transport: d.transport || c.transportPref });
          }}
          onNext={() => go("designs")}
          onRepeat={repeatFrom}
        />
      )}

      {d.step === "designs" && customer && (
        <DesignStep
          products={props.products}
          categories={props.categories}
          lines={d.lines}
          setLine={setLine}
          header={<OrderFor customer={customer} trip={trip} onChange={() => go("customer")} />}
        />
      )}

      {d.step === "review" && customer && (
        <ReviewStep
          customer={customer}
          trip={trip}
          ids={ordered}
          products={products}
          lines={d.lines}
          setLine={setLine}
          note={d.note}
          transport={d.transport}
          onField={(k, v) => update({ [k]: v })}
          onChangeCustomer={() => go("customer")}
          onRemove={(id) => update((cur) => ({ added: cur.added.filter((x) => x !== id) }))}
          totals={totals}
        />
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-md border border-maroon/30 bg-maroon-50 p-3 text-[14px] text-maroon">
          {error}
        </p>
      )}

      {d.step !== "customer" && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:left-60 lg:px-8 print:hidden">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[14px] leading-tight">
              <b>
                {ordered.length} {ordered.length === 1 ? "design" : "designs"} · {totals.sets} sets · {totals.pcs} pcs
              </b>
              <span className="block text-muted">{rupees(totals.value)} at listed rates</span>
            </p>
            {d.step === "designs" ? (
              <button disabled={ordered.length === 0} onClick={() => go("review")} className={btnPrimary}>
                Review order →
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => go("designs")} className={`${btnSecondary} hidden sm:inline-flex`}>
                  ← Add designs
                </button>
                <button disabled={busy || ordered.length === 0} onClick={submit} className={btnPrimary}>
                  {busy ? "Placing…" : "Place order"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- steps header

function Steps({
  step,
  canGo,
  onGo,
}: {
  step: Step;
  canGo: { designs: boolean; review: boolean };
  onGo: (s: Step) => void;
}) {
  const steps: { id: Step; label: string; enabled: boolean }[] = [
    { id: "customer", label: "Customer", enabled: true },
    { id: "designs", label: "Designs", enabled: canGo.designs },
    { id: "review", label: "Review", enabled: canGo.review },
  ];
  return (
    <ol className="mb-5 flex gap-1.5 text-[14px]" aria-label="Order steps">
      {steps.map((s, i) => (
        <li key={s.id} className="flex-1">
          <button
            disabled={!s.enabled}
            onClick={() => onGo(s.id)}
            aria-current={step === s.id ? "step" : undefined}
            className={`w-full rounded-md border px-3 py-2 text-left disabled:opacity-50 ${
              step === s.id ? "border-maroon bg-maroon text-white" : "border-line bg-surface"
            }`}
          >
            <span className="mr-1.5 opacity-70">{i + 1}</span>
            {s.label}
          </button>
        </li>
      ))}
    </ol>
  );
}

function OrderFor({ customer, trip, onChange }: { customer: OrderCustomer; trip: Trip | null; onChange: () => void }) {
  return (
    <p className="text-[14px]">
      Order for <b>{customer.shopName}</b>, {customer.city}
      {trip && <span className="text-muted"> · {trip.name}</span>}{" "}
      <button onClick={onChange} className="font-semibold text-maroon underline underline-offset-2">
        Change
      </button>
    </p>
  );
}

// ---------------------------------------------------------------- 1. customer

const EMPTY_CUSTOMER = { shopName: "", ownerName: "", mobile: "", city: "", state: "", gstin: "", address: "" };

function CustomerStep(props: {
  customers: OrderCustomer[];
  trips: Trip[];
  customerId: string | null;
  tripId: string;
  onTrip: (id: string) => void;
  onCreateTrip: (name: string) => Promise<{ ok: true; option: Trip } | { ok: false; error: string }>;
  onCustomer: (c: OrderCustomer) => void;
  onNext: () => void;
  onRepeat: (ref: string) => void;
}) {
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState(EMPTY_CUSTOMER);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const needle = q.trim().toLowerCase();
  const digits = needle.replace(/\D/g, "");
  const matches = props.customers.filter(
    (c) =>
      !needle ||
      `${c.shopName} ${c.ownerName} ${c.city}`.toLowerCase().includes(needle) ||
      (digits.length >= 3 && c.mobile.includes(digits)),
  );
  const selected = props.customers.find((c) => c.id === props.customerId);

  async function addCustomer(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await addOrderCustomerAction(f).catch(() => ({
      ok: false as const,
      error: "Couldn't reach the server. Try again.",
    }));
    setBusy(false);
    if (!res.ok) return setError(res.error);
    props.onCustomer({
      id: res.id,
      shopName: f.shopName.trim(),
      ownerName: f.ownerName.trim(),
      city: f.city.trim(),
      mobile: f.mobile,
      transportPref: "",
      status: "approved",
      lastOrder: null,
    });
    setF(EMPTY_CUSTOMER);
    setAdding(false);
  }

  const field = (
    k: keyof typeof EMPTY_CUSTOMER,
    text: string,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <div>
      <label htmlFor={`c-${k}`} className={label}>
        {text}
      </label>
      <input
        id={`c-${k}`}
        value={f[k]}
        onChange={(e) => setF({ ...f, [k]: e.target.value })}
        className={input}
        {...extra}
      />
    </div>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <Card title="Customer">
        <div className="p-5">
          {selected && (
            <div className="mb-4 rounded-lg border border-maroon bg-maroon-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[14px]">
                  <b>{selected.shopName}</b> — {selected.ownerName}, {selected.city}
                </span>
                <span className="flex flex-wrap gap-2">
                  {selected.lastOrder && (
                    <button onClick={() => props.onRepeat(selected.lastOrder!.ref)} className={btnSecondary}>
                      Repeat last order
                    </button>
                  )}
                  <button onClick={props.onNext} className={btnPrimary}>
                    Choose designs →
                  </button>
                </span>
              </div>
              {selected.lastOrder && (
                <p className="mt-1.5 text-[13px] text-muted">
                  Last order {selected.lastOrder.ref} on {shortDate(selected.lastOrder.createdAt)} ·{" "}
                  {selected.lastOrder.designs} {selected.lastOrder.designs === 1 ? "design" : "designs"}
                </p>
              )}
            </div>
          )}

          {!adding ? (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <SearchIcon
                    width={18}
                    height={18}
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
                  />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search shop, owner, city or mobile"
                    aria-label="Search customers"
                    className={`${input} pl-9`}
                  />
                </div>
                <button onClick={() => setAdding(true)} className={btnSecondary}>
                  + New customer
                </button>
              </div>
              <ul
                className="mt-3 max-h-[55dvh] divide-y divide-line overflow-y-auto rounded-md border border-line"
                aria-label="Customers"
              >
                {matches.slice(0, 100).map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => {
                        props.onCustomer(c);
                        // Regular customers stay here so their last order can be repeated.
                        if (!c.lastOrder) props.onNext();
                      }}
                      aria-pressed={c.id === props.customerId}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[14px] hover:bg-cream/60 ${
                        c.id === props.customerId ? "bg-maroon-50" : ""
                      }`}
                    >
                      <span className="min-w-0">
                        <b className="block truncate">{c.shopName}</b>
                        <span className="block truncate text-muted">
                          {c.ownerName} · {c.city} · {c.mobile.replace(/^\+91/, "")}
                          {c.lastOrder && ` · last order ${shortDate(c.lastOrder.createdAt)}`}
                        </span>
                      </span>
                      {c.status === "pending" && (
                        <span className="shrink-0 rounded-full bg-gold-50 px-2 py-0.5 text-[11px] font-semibold text-[#8a6a1f]">
                          Pending approval
                        </span>
                      )}
                    </button>
                  </li>
                ))}
                {matches.length === 0 && (
                  <li className="px-4 py-6 text-center text-[14px] text-muted">
                    No customer matches.{" "}
                    <button onClick={() => setAdding(true)} className="font-semibold text-maroon underline">
                      Add a new customer
                    </button>
                  </li>
                )}
              </ul>
              {matches.length > 100 && (
                <p className="mt-2 text-[12px] text-muted">Showing 100 of {matches.length}. Search to narrow down.</p>
              )}
            </>
          ) : (
            <form onSubmit={addCustomer}>
              <p className="text-[14px] text-muted">
                New customers are approved straight away and can log in to the store with this mobile number.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {field("shopName", "Shop name", { required: true, autoFocus: true })}
                {field("ownerName", "Owner name", { required: true })}
                {field("mobile", "Mobile", { required: true, inputMode: "tel", placeholder: "98765 43210" })}
                {field("city", "City", { required: true })}
                {field("state", "State")}
                {field("gstin", "GSTIN (optional)", { autoCapitalize: "characters" })}
                <div className="sm:col-span-2">{field("address", "Address")}</div>
              </div>
              {error && <p className="mt-3 text-[14px] font-medium text-maroon">{error}</p>}
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setAdding(false)} className={btnSecondary}>
                  Cancel
                </button>
                <button disabled={busy} className={btnPrimary}>
                  {busy ? "Saving…" : "Add & continue"}
                </button>
              </div>
            </form>
          )}
        </div>
      </Card>

      <Card title="Trip" className="self-start">
        <div className="p-5">
          <label htmlFor="trip" className={label}>
            Trip (optional)
          </label>
          <CreatableCombobox
            id="trip"
            noun="trip"
            maxLength={60}
            placeholder="e.g. Jaipur – Nov 2026"
            options={props.trips}
            value={props.tripId}
            onChange={props.onTrip}
            onCreate={props.onCreateTrip}
          />
          <p className="mt-2 text-[12px] text-muted">
            Remembered on this device for your next orders, so you can see each trip&apos;s orders and picking list
            together.
          </p>
          {props.tripId && (
            <button onClick={() => props.onTrip("")} className="mt-2 text-[13px] font-semibold text-maroon underline">
              No trip for this order
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- 2. designs

function DesignStep({
  products,
  categories,
  lines,
  setLine,
  header,
}: {
  products: OrderableProduct[];
  categories: { slug: string; name: string }[];
  lines: Record<string, Line>;
  setLine: (id: string, l: Line) => void;
  header: React.ReactNode;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [onlyOrdered, setOnlyOrdered] = useState(false);

  const shown = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return products.filter(
      (p) =>
        (!cat || p.categorySlug === cat) &&
        (!onlyOrdered || (lines[p.id]?.sets ?? 0) > 0) &&
        terms.every((t) => `${p.code} ${p.name} ${p.fabric} ${p.categoryName}`.toLowerCase().includes(t)),
    );
  }, [products, q, cat, onlyOrdered, lines]);
  const orderedCount = products.filter((p) => (lines[p.id]?.sets ?? 0) > 0).length;
  const usedCats = categories.filter((c) => products.some((p) => p.categorySlug === c.slug));

  const chip = (active: boolean) =>
    `h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-medium ${
      active ? "border-maroon bg-maroon text-white" : "border-line bg-surface hover:border-gold"
    }`;

  return (
    <div>
      {header}
      <div className="sticky top-14 z-20 -mx-4 mt-3 space-y-2 bg-cream/95 px-4 py-3 backdrop-blur lg:top-0 lg:mx-0 lg:px-0">
        <div className="relative">
          <SearchIcon
            width={18}
            height={18}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search code, design name or fabric"
            aria-label="Search designs"
            className={`${input} pl-9`}
          />
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          <button onClick={() => setCat("")} className={chip(!cat && !onlyOrdered)} aria-pressed={!cat && !onlyOrdered}>
            All ({products.length})
          </button>
          <button onClick={() => setOnlyOrdered((v) => !v)} className={chip(onlyOrdered)} aria-pressed={onlyOrdered}>
            In this order ({orderedCount})
          </button>
          {usedCats.map((c) => (
            <button
              key={c.slug}
              onClick={() => setCat(cat === c.slug ? "" : c.slug)}
              className={chip(cat === c.slug)}
              aria-pressed={cat === c.slug}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="py-12 text-center text-[14px] text-muted">No designs match.</p>
      ) : (
        <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {shown.map((p) => (
            <li key={p.id}>
              <DesignCard product={p} line={lines[p.id]} setLine={setLine} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SizePicker({
  product,
  line,
  onChange,
}: {
  product: OrderableProduct;
  line: Line;
  onChange: (l: Line) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label={`Sizes for ${product.code}`}>
      {product.sizes.map((s) => {
        const on = line.sizes.includes(s);
        return (
          <button
            key={s}
            type="button"
            aria-pressed={on}
            onClick={() => {
              const sizes = on
                ? line.sizes.filter((x) => x !== s)
                : product.sizes.filter((x) => x === s || line.sizes.includes(x));
              if (sizes.length) onChange({ ...line, sizes });
            }}
            className={`h-8 min-w-9 rounded border px-1.5 text-[12px] font-semibold ${
              on ? "border-ink bg-ink text-white" : "border-line bg-surface text-muted line-through"
            }`}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

function SetsStepper({ code, sets, onChange }: { code: string; sets: number; onChange: (n: number) => void }) {
  const clamp = (n: number) => Math.max(0, Math.min(10000, Math.floor(n) || 0));
  return (
    <div className="flex items-center">
      <button
        type="button"
        onClick={() => onChange(clamp(sets - 1))}
        disabled={sets === 0}
        className="grid h-10 w-10 place-items-center rounded-l-md border border-line bg-surface disabled:opacity-40"
        aria-label={`One set less of ${code}`}
      >
        <MinusIcon width={16} height={16} />
      </button>
      <input
        value={sets || ""}
        placeholder="0"
        inputMode="numeric"
        onChange={(e) => onChange(clamp(Number(e.target.value.replace(/\D/g, ""))))}
        onFocus={(e) => e.target.select()}
        className="h-10 w-full min-w-0 border-y border-line bg-surface text-center text-[15px] font-semibold focus:outline-none"
        aria-label={`Sets of ${code}`}
      />
      <button
        type="button"
        onClick={() => onChange(clamp(sets + 1))}
        className="grid h-10 w-10 place-items-center rounded-r-md border border-line bg-surface"
        aria-label={`One set more of ${code}`}
      >
        <PlusIcon width={16} height={16} />
      </button>
    </div>
  );
}

const DesignCard = memo(function DesignCard({
  product: p,
  line: saved,
  setLine,
}: {
  product: OrderableProduct;
  line: Line | undefined;
  setLine: (id: string, l: Line) => void;
}) {
  const line = saved ?? { sizes: p.sizes, sets: 0 };
  const pcs = pcsOf(line);
  const over = line.sets > 0 && pcs > p.stockPcs;
  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-lg border bg-surface ${
        line.sets > 0 ? "border-maroon ring-1 ring-maroon" : "border-line"
      }`}
    >
      <div className="relative aspect-[3/4] bg-sand">
        {p.coverImageId ? (
          <img
            src={`/api/img/${p.coverImageId}/thumb.webp`}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="grid h-full place-items-center text-[12px] text-muted">No photo</span>
        )}
        {p.isNew && (
          <span className="absolute top-2 left-2 rounded-sm bg-gold px-1.5 py-0.5 text-[10px] font-bold">NEW</span>
        )}
        {line.sets > 0 && (
          <span className="absolute top-2 right-2 rounded-full bg-maroon px-2 py-0.5 text-[12px] font-bold text-white">
            {line.sets} {line.sets === 1 ? "set" : "sets"}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <p className="text-[12px] font-semibold tracking-wide text-muted">{p.code}</p>
          <p className="line-clamp-2 text-[14px] leading-snug font-medium">{p.name}</p>
          <p className="mt-0.5 text-[13px]">
            <b>{rupees(p.ratePaise)}</b>
            <span className="text-muted">/pc · stock {p.stockPcs}</span>
          </p>
        </div>
        <SizePicker product={p} line={line} onChange={(l) => setLine(p.id, l)} />
        <div className="mt-auto space-y-1.5">
          <SetsStepper code={p.code} sets={line.sets} onChange={(sets) => setLine(p.id, { ...line, sets })} />
          <p className="min-h-[18px] text-[12px] text-muted">
            {line.sets > 0
              ? `${line.sets} × ${line.sizes.length} sizes = ${pcs} pcs · ${rupees(pcs * p.ratePaise)}`
              : `1 set = ${line.sizes.length} pcs`}
          </p>
          {over && <p className="text-[12px] font-semibold text-maroon">More than the {p.stockPcs} pcs in stock</p>}
        </div>
      </div>
    </article>
  );
});

// ---------------------------------------------------------------- 3. review

function ReviewStep(props: {
  customer: OrderCustomer;
  trip: Trip | null;
  ids: string[];
  products: Map<string, OrderableProduct>;
  lines: Record<string, Line>;
  setLine: (id: string, l: Line) => void;
  note: string;
  transport: string;
  onField: (k: "note" | "transport", v: string) => void;
  onChangeCustomer: () => void;
  onRemove: (id: string) => void;
  totals: { sets: number; pcs: number; value: number };
}) {
  const { customer, totals } = props;
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <Card title={`${props.ids.length} ${props.ids.length === 1 ? "design" : "designs"}`}>
        <ul className="divide-y divide-line">
          {props.ids.map((id) => {
            const p = props.products.get(id);
            const l = props.lines[id];
            if (!p) {
              return (
                <li key={id} className="flex items-center justify-between gap-3 bg-maroon-50 px-5 py-3 text-[14px]">
                  <span className="text-maroon">A design in this order is no longer in the store.</span>
                  <button onClick={() => props.onRemove(id)} className="font-semibold text-maroon underline">
                    Remove
                  </button>
                </li>
              );
            }
            return (
              <li key={id} className="flex gap-3 px-4 py-3 sm:px-5">
                {p.coverImageId ? (
                  <img
                    src={`/api/img/${p.coverImageId}/thumb.webp`}
                    alt=""
                    className="h-24 w-[72px] shrink-0 rounded bg-sand object-cover"
                  />
                ) : (
                  <span className="grid h-24 w-[72px] shrink-0 place-items-center rounded bg-sand text-[10px] text-muted">
                    No photo
                  </span>
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[14px] leading-snug">
                      <b>{p.code}</b> {p.name}
                      <span className="block text-[13px] text-muted">{rupees(p.ratePaise)}/pc</span>
                    </p>
                    <button
                      onClick={() => props.setLine(id, { ...l, sets: 0 })}
                      className="shrink-0 text-[13px] font-semibold text-muted hover:text-maroon"
                      aria-label={`Remove ${p.code}`}
                    >
                      Remove
                    </button>
                  </div>
                  <SizePicker product={p} line={l} onChange={(nl) => props.setLine(id, nl)} />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="w-40">
                      <SetsStepper code={p.code} sets={l.sets} onChange={(sets) => props.setLine(id, { ...l, sets })} />
                    </div>
                    <p className="text-right text-[13px]">
                      {pcsOf(l)} pcs
                      <b className="block text-[15px]">{rupees(pcsOf(l) * p.ratePaise)}</b>
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="space-y-5 xl:self-start">
        <Card title="Order">
          <div className="space-y-4 p-5 text-[14px]">
            <div>
              <p className={label}>Customer</p>
              <p>
                <b>{customer.shopName}</b> — {customer.ownerName}
                <span className="block text-muted">
                  {customer.city} · {customer.mobile}
                </span>
              </p>
              <button onClick={props.onChangeCustomer} className="mt-1 text-[13px] font-semibold text-maroon underline">
                Change customer or trip
              </button>
            </div>
            <div>
              <p className={label}>Trip</p>
              <p>{props.trip?.name ?? <span className="text-muted">None</span>}</p>
            </div>
            <div>
              <label htmlFor="transport" className={label}>
                Transport
              </label>
              <input
                id="transport"
                value={props.transport}
                onChange={(e) => props.onField("transport", e.target.value)}
                maxLength={120}
                placeholder="Transporter the shop prefers"
                className={input}
              />
            </div>
            <div>
              <label htmlFor="note" className={label}>
                Note
              </label>
              <textarea
                id="note"
                value={props.note}
                onChange={(e) => props.onField("note", e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Delivery date, packing, anything head office should know"
                className={`${input} h-auto py-2`}
              />
            </div>
            <dl className="space-y-1 border-t border-line pt-3">
              <div className="flex justify-between">
                <dt className="text-muted">Sets</dt>
                <dd>{totals.sets}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Pieces</dt>
                <dd>{totals.pcs}</dd>
              </div>
              <div className="flex justify-between text-[16px] font-semibold">
                <dt>Total at listed rates</dt>
                <dd>{rupees(totals.value)}</dd>
              </div>
            </dl>
          </div>
        </Card>
      </div>
    </div>
  );
}
