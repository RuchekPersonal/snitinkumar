import "server-only";
import sharp from "sharp";

// The four stored sizes of every product photo (RFD §6).
export const VARIANTS = {
  thumb: { width: 400, height: 533, format: "webp" },
  card: { width: 800, height: 1067, format: "webp" },
  full: { width: 1200, height: 1600, format: "webp" },
  og: { width: 1200, height: 630, format: "jpeg" },
} as const;

export type Variant = keyof typeof VARIANTS;

export interface EncodedImage {
  thumb_b64: string;
  card_b64: string;
  full_b64: string;
  og_b64: string;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Turns an uploaded photo into the stored base64 variants: 3:4 WebP crops plus a 1200×630
 * JPEG (< 300 KB) for WhatsApp previews. `.rotate()` applies and strips EXIF, including GPS.
 */
export async function encodeProductImage(input: Buffer): Promise<EncodedImage> {
  const src = sharp(input, { failOn: "error" }).rotate();
  const meta = await src.metadata();

  const portrait = (v: Variant) =>
    src
      .clone()
      .resize(VARIANTS[v].width, VARIANTS[v].height, { fit: "cover", position: "attention" })
      .webp({ quality: 80 })
      .toBuffer();

  const [thumb, card, full] = await Promise.all([portrait("thumb"), portrait("card"), portrait("full")]);

  // OG: the portrait centred on a maroon card with a gold frame.
  const og = VARIANTS.og;
  const w = Math.round((og.height * 3) / 4);
  const photo = await src.clone().resize(w, og.height, { fit: "cover", position: "attention" }).toBuffer();
  const frame = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${og.width}" height="${og.height}">
    <rect width="100%" height="100%" fill="#6B1F2B"/>
    <rect x="18" y="18" width="${og.width - 36}" height="${og.height - 36}" fill="none" stroke="#CAA24B" stroke-width="3"/>
  </svg>`);
  const ogBuf = await sharp(frame)
    .composite([{ input: photo, left: Math.round((og.width - w) / 2), top: 0 }])
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();

  return {
    thumb_b64: thumb.toString("base64"),
    card_b64: card.toString("base64"),
    full_b64: full.toString("base64"),
    og_b64: ogBuf.toString("base64"),
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    bytes: input.length,
  };
}

// ---------------------------------------------------------------- site images (home hero, category covers)

export type SiteImageKind = "hero" | "category";

/** Crop sizes per slot, matched to the tiles they fill on the home page. */
function siteSizes(kind: SiteImageKind, position: number | null) {
  if (kind === "category") return { full: [800, 600], thumb: [160, 160] } as const; // tile 4:3, pill thumb square
  if (position === 0) return { full: [720, 1300], thumb: [240, 433] } as const; // tall hero tile
  return { full: [660, 594], thumb: [220, 198] } as const; // small hero tiles (10:9)
}

export interface EncodedSiteImage {
  full_b64: string;
  thumb_b64: string;
  og_b64: string | null;
  width: number;
  height: number;
  bytes: number;
}

export async function encodeSiteImage(
  input: Buffer,
  kind: SiteImageKind,
  position: number | null,
): Promise<EncodedSiteImage> {
  const src = sharp(input, { failOn: "error" }).rotate();
  const meta = await src.metadata();
  const s = siteSizes(kind, position);
  const crop = (w: number, h: number) =>
    src.clone().resize(w, h, { fit: "cover", position: "attention" }).webp({ quality: 80 }).toBuffer();
  const [full, thumb] = await Promise.all([crop(s.full[0], s.full[1]), crop(s.thumb[0], s.thumb[1])]);

  let og: Buffer | null = null;
  if (kind === "category") {
    const o = VARIANTS.og;
    const photo = await src
      .clone()
      .resize(o.width - 36, o.height - 36, { fit: "cover", position: "attention" })
      .toBuffer();
    og = await sharp({ create: { width: o.width, height: o.height, channels: 3, background: "#CAA24B" } })
      .composite([{ input: photo, left: 18, top: 18 }])
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();
  }

  return {
    full_b64: full.toString("base64"),
    thumb_b64: thumb.toString("base64"),
    og_b64: og ? og.toString("base64") : null,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    bytes: input.length,
  };
}
