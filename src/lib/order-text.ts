import { rupees } from "./format";
import { site } from "./site";

export const ORDER_STATUS_LABEL: Record<string, string> = {
  placed: "To dispatch",
  partial: "Part dispatched",
  dispatched: "Dispatched",
  cancelled: "Cancelled",
};

// The order summary sent to the retailer on WhatsApp after an order is placed.

interface Line {
  code: string;
  name: string;
  sizes: string[];
  sets: number;
  pcs: number;
  ratePaise: number;
}

export function orderMessage(o: {
  ref: string;
  shop: string;
  lines: Line[];
  sets: number;
  pcs: number;
  valuePaise: number;
}) {
  return [
    `*${site.name}* · Order ${o.ref}`,
    `For: ${o.shop}`,
    "",
    ...o.lines.map(
      (l, i) =>
        `${i + 1}. ${l.code} ${l.name}\n    ${l.sizes.join(", ")} × ${l.sets} ${l.sets === 1 ? "set" : "sets"} = ${l.pcs} pcs @ ${rupees(l.ratePaise)}`,
    ),
    "",
    `Total: ${o.sets} sets · ${o.pcs} pcs · ${rupees(o.valuePaise)}`,
    "Thank you for your order!",
  ].join("\n");
}

/** wa.me link to a retailer's mobile ("+919876543210") with the text filled in. */
export function whatsappLink(mobile: string, text: string) {
  return `https://wa.me/${mobile.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}
