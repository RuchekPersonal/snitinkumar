import "server-only";
import type { EnquiryLine, Viewer } from "@/lib/types";
import { rupees, sizesLabel } from "@/lib/format";
import { site } from "@/lib/site";
import { waLink } from "@/lib/whatsapp";
import { getEnquiryProducts } from "./catalog";
import { canSeePrices } from "./session";
import { db } from "./db";

export interface GuestContact {
  name?: string;
  shop?: string;
  city?: string;
}

/**
 * Saves an enquiry (with rate snapshots for staff) and builds the pre-filled WhatsApp
 * message. The message carries rates only when the viewer may see them (RFD Q9).
 */
export async function createEnquiry(
  lines: EnquiryLine[],
  note: string,
  contact: GuestContact,
  viewer: Viewer,
  baseUrl: string,
) {
  const products = await getEnquiryProducts(lines.map((l) => l.code));
  const byCode = new Map(products.map((p) => [p.code, p]));

  const items = lines
    .map((l) => ({ line: l, product: byCode.get(l.code.toUpperCase()) }))
    .filter((x): x is { line: EnquiryLine; product: NonNullable<typeof x.product> } => !!x.product)
    .map(({ line, product }) => ({ product, qty: Math.max(product.moq, Math.floor(line.qty)) }));

  if (items.length === 0) return { error: "None of these designs are available any more." } as const;

  const priced = canSeePrices(viewer.role);
  const pcs = items.reduce((s, i) => s + i.qty, 0);
  const value = items.reduce((s, i) => s + i.qty * i.product.ratePaise, 0);

  const shop = viewer.shopName ?? contact.shop;
  const person = viewer.name ?? contact.name;
  const city = viewer.city ?? contact.city;

  const client = db();
  const { data: enquiry, error } = await client
    .from("enquiries")
    .insert({
      // Signed-in shops are linked to their account; guests leave optional contact details.
      retailer_id: viewer.retailerId ?? null,
      guest_shop: viewer.retailerId ? null : shop || null,
      guest_name: viewer.retailerId ? null : person || null,
      guest_city: viewer.retailerId ? null : city || null,
      source: "website",
      note_from_retailer: note,
      est_value_paise: value,
      total_pcs: pcs,
    })
    .select("id, ref")
    .single();
  if (error) throw new Error(`enquiry insert failed: ${error.message}`);

  const { error: itemsError } = await client.from("enquiry_items").insert(
    items.map((i) => ({
      enquiry_id: enquiry.id,
      product_id: i.product.id,
      code_snapshot: i.product.code,
      name_snapshot: i.product.name,
      rate_paise_snapshot: i.product.ratePaise,
      qty: i.qty,
    })),
  );
  if (itemsError) {
    await client.from("enquiries").delete().eq("id", enquiry.id);
    throw new Error(`enquiry items insert failed: ${itemsError.message}`);
  }

  const msg: string[] = [];
  msg.push(`*New wholesale enquiry – ${site.name}*`);
  msg.push(`Ref: ${enquiry.ref}`);
  if (shop || person) msg.push(`From: ${[shop, person].filter(Boolean).join(" – ")}${city ? `, ${city}` : ""}`);
  msg.push("");
  items.forEach((i, n) => {
    msg.push(`${n + 1}. *${i.product.code}* – ${i.product.name}`);
    const parts = [`Qty ${i.qty} pcs`, `Sizes ${sizesLabel(i.product.sizes)}`];
    if (priced) parts.push(`${rupees(i.product.ratePaise)}/pc`);
    msg.push(`   ${parts.join(" · ")}`);
    msg.push(`   ${baseUrl}/product/${i.product.code}`);
  });
  msg.push("");
  msg.push(`Total: ${items.length} designs · ${pcs} pcs${priced ? ` · approx. ${rupees(value)}` : ""}`);
  if (note) msg.push(`Note: ${note}`);
  msg.push("");
  msg.push("Please confirm rate, availability and dispatch.");

  return { ref: enquiry.ref as string, whatsappUrl: waLink(msg.join("\n")) } as const;
}
