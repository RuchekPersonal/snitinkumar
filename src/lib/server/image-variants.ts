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
