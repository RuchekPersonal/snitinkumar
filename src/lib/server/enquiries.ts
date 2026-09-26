import "server-only";
import type { EnquiryLine, Viewer } from "@/lib/types";
import { rupees, sizesLabel } from "@/lib/format";
import { site } from "@/lib/site";
import { waLink } from "@/lib/whatsapp";
import { getProductsByCodes } from "./catalog";

// Phase 1: enquiries are kept in memory. Phase 2 writes them to the enquiries tables.

interface StoredEnquiry {
  ref: string;
  createdAt: string;
  role: Viewer["role"];
  contact: GuestContact;
  lines: { code: string; name: string; qty: number; ratePaise: number | null }[];
  note: string;
}

export interface GuestContact {
  name?: string;
  shop?: string;
  city?: string;
}

const enquiries: StoredEnquiry[] = [];
let seq = 1047;

export async function createEnquiry(
  lines: EnquiryLine[],
  note: string,
  contact: GuestContact,
  viewer: Viewer,
  baseUrl: string,
) {
  const products = await getProductsByCodes(
    lines.map((l) => l.code),
    viewer,
  );
  const byCode = new Map(products.map((p) => [p.code, p]));

  const items = lines
    .map((l) => ({ line: l, product: byCode.get(l.code.toUpperCase()) }))
    .filter((x): x is { line: EnquiryLine; product: NonNullable<typeof x.product> } => !!x.product)
    .map(({ line, product }) => ({ product, qty: Math.max(product.moq, Math.floor(line.qty)) }));

  if (items.length === 0) return { error: "None of these designs are available any more." } as const;

  const ref = `ENQ-${++seq}`;
  const priced = items.every((i) => i.product.ratePaise !== undefined);
  const pcs = items.reduce((s, i) => s + i.qty, 0);
  const value = priced ? items.reduce((s, i) => s + i.qty * i.product.ratePaise!, 0) : null;

  const who = viewer.shopName ?? contact.shop;
  const person = viewer.name ?? contact.name;
  const city = viewer.city ?? contact.city;

  const msg: string[] = [];
  msg.push(`*New wholesale enquiry – ${site.name}*`);
  msg.push(`Ref: ${ref}`);
  if (who || person) msg.push(`From: ${[who, person].filter(Boolean).join(" – ")}${city ? `, ${city}` : ""}`);
  msg.push("");
  items.forEach((i, n) => {
    msg.push(`${n + 1}. *${i.product.code}* – ${i.product.name}`);
    const parts = [`Qty ${i.qty} pcs`, `Sizes ${sizesLabel(i.product.sizes)}`];
    if (i.product.ratePaise !== undefined) parts.push(`${rupees(i.product.ratePaise)}/pc`);
    msg.push(`   ${parts.join(" · ")}`);
    msg.push(`   ${baseUrl}/product/${i.product.code}`);
  });
  msg.push("");
  msg.push(`Total: ${items.length} designs · ${pcs} pcs${value !== null ? ` · approx. ${rupees(value)}` : ""}`);
  if (note) msg.push(`Note: ${note}`);
  msg.push("");
  msg.push("Please confirm rate, availability and dispatch.");

  enquiries.unshift({
    ref,
    createdAt: new Date().toISOString(),
    role: viewer.role,
    contact,
    lines: items.map((i) => ({
      code: i.product.code,
      name: i.product.name,
      qty: i.qty,
      ratePaise: i.product.ratePaise ?? null,
    })),
    note,
  });

  return { ref, whatsappUrl: waLink(msg.join("\n")) } as const;
}
