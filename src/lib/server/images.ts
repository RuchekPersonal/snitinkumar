import "server-only";
import sharp from "sharp";
import { colourHex } from "./mock-data";
import { productForImage } from "./catalog";

// Product images are stored as base64 text (RFD §6). In Phase 2 these come from the
// product_images table; for now placeholders are generated once and kept as base64 in
// memory so the same decode-and-serve path is exercised.

export const VARIANTS = {
  thumb: { width: 400, height: 533, format: "webp" },
  card: { width: 800, height: 1067, format: "webp" },
  full: { width: 1200, height: 1600, format: "webp" },
  og: { width: 1200, height: 630, format: "jpeg" },
} as const;

export type Variant = keyof typeof VARIANTS;

const store = new Map<string, string>(); // `${id}:${variant}` → base64

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = ch((n >> 16) & 255),
    g = ch((n >> 8) & 255),
    b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// Text-free on purpose: serverless hosts have no system fonts for SVG text.
function portraitSvg(colour: string, index: number): string {
  const base = colourHex[colour] ?? "#6B1F2B";
  const bg = "#E4D5C0";
  const light = shade(base, 0.12);
  const flip = index % 2 === 0 ? "translate(300 0) scale(-1 1)" : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="#D9C6AC"/>
    </linearGradient>
    <pattern id="z" width="12" height="12" patternUnits="userSpaceOnUse">
      <circle cx="6" cy="6" r="1.4" fill="#CAA24B" opacity=".75"/>
    </pattern>
  </defs>
  <rect width="300" height="400" fill="url(#g)"/>
  <g transform="${flip}">
    <path d="M122 48 Q150 70 178 48 L214 60 L252 130 L230 142 L206 104 L222 366 L78 366 L94 104 L70 142 L48 130 L86 60 Z" fill="${base}"/>
    <path d="M122 48 Q150 70 178 48 L214 60 L206 104 L94 104 L86 60 Z" fill="${light}"/>
    <path d="M124 52 Q150 86 176 52" fill="none" stroke="#CAA24B" stroke-width="3"/>
    <rect x="84" y="338" width="132" height="22" fill="url(#z)"/>
    <line x1="84" y1="336" x2="216" y2="336" stroke="#CAA24B" stroke-width="2"/>
  </g>
</svg>`;
}

async function render(id: string, variant: Variant): Promise<Buffer | null> {
  const product = await productForImage(id);
  if (!product) return null;
  const v = VARIANTS[variant];
  const portrait = Buffer.from(portraitSvg(product.colour, product.index));

  if (variant === "og") {
    const h = v.height;
    const w = Math.round((h * 3) / 4);
    const photo = await sharp(portrait).resize(w, h).png().toBuffer();
    const frame = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${v.width}" height="${h}">
      <rect width="100%" height="100%" fill="#6B1F2B"/>
      <rect x="18" y="18" width="${v.width - 36}" height="${h - 36}" fill="none" stroke="#CAA24B" stroke-width="3"/>
    </svg>`);
    return sharp(frame)
      .composite([{ input: photo, left: Math.round((v.width - w) / 2), top: 0 }])
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();
  }

  return sharp(portrait).resize(v.width, v.height).webp({ quality: 80 }).toBuffer();
}

/** Returns image bytes decoded from the base64 store, or null if the id is unknown. */
export async function getImage(id: string, variant: Variant): Promise<Buffer | null> {
  const key = `${id}:${variant}`;
  let b64 = store.get(key);
  if (!b64) {
    const buf = await render(id, variant);
    if (!buf) return null;
    b64 = buf.toString("base64");
    store.set(key, b64);
  }
  return Buffer.from(b64, "base64");
}

export function imageUrl(id: string, variant: Variant): string {
  return `/api/img/${id}/${variant}.${VARIANTS[variant].format === "jpeg" ? "jpg" : "webp"}`;
}
