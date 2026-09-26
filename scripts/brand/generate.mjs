// Generates the SN monogram icons and the default link-preview image.
// Run: node scripts/brand/generate.mjs   (outputs are committed; re-run only when the brand changes)
//
// Text is converted to SVG outlines with opentype.js, so output does not depend on
// fonts installed on the machine.
import sharp from "sharp";
import opentype from "opentype.js";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const out = (p) => path.join(root, p);
const load = async (f) => opentype.parse((await readFile(path.join(here, "fonts", f))).buffer);

const fonts = {
  serifBold: await load("CormorantGaramond-700.ttf"),
  serifSemi: await load("CormorantGaramond-600.ttf"),
  sansMedium: await load("PlusJakartaSans-500.ttf"),
  sansBold: await load("PlusJakartaSans-700.ttf"),
};

const MAROON = "#6B1F2B";
const GOLD = "#CAA24B";
const CREAM = "#F8F1E7";

/**
 * SVG <path> for a line of text. Glyphs are placed one by one with kerning (no OpenType
 * shaping, which plain Latin text does not need).
 * `align` positions x at the start or centre; `tracking` is extra px between glyphs.
 */
function textPath(font, str, { x, y, size, fill, align = "start", tracking = 0 }) {
  const scale = size / font.unitsPerEm;
  const glyphs = [...str].map((ch) => font.charToGlyph(ch));
  const advances = glyphs.map((g, i) => {
    const k = i < glyphs.length - 1 ? font.getKerningValue(g, glyphs[i + 1]) : 0;
    const kern = Number.isFinite(k) ? k : 0;
    return (g.advanceWidth + kern) * scale + (i < glyphs.length - 1 ? tracking : 0);
  });
  const width = advances.reduce((a, b) => a + b, 0);
  let cx = align === "center" ? x - width / 2 : x;
  // One <path> per glyph: a malformed glyph then cannot truncate the rest of the line.
  const parts = glyphs.map((g, i) => {
    const d = g.getPath(cx, y, size).toPathData(2);
    cx += advances[i];
    if (d.includes("NaN")) throw new Error(`Bad outline for "${str[i]}" in ${font.names.fullName?.en}`);
    return d ? `<path d="${d}"/>` : "";
  });
  return `<g fill="${fill}">${parts.join("")}</g>`;
}

/** Vertical centre offset so the cap height sits in the middle of the box. */
const capCenter = (font, size) =>
  (((font.tables.os2.sCapHeight || font.unitsPerEm * 0.7) / font.unitsPerEm) * size) / 2;

/** Maroon tile, thin gold inner frame, gold serif "SN". `inset` shrinks the art for maskable icons. */
function monogramSvg(s, { inset = 0, radius = 0.18, frame = true } = {}) {
  const r = Math.round(s * radius);
  const pad = s * (0.07 + inset);
  const size = s * (1 - 2 * inset) * (s <= 32 ? 0.78 : 0.56);
  const font = fonts.serifBold;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
    <rect width="${s}" height="${s}" rx="${r}" fill="${MAROON}"/>
    ${frame && s >= 48 ? `<rect x="${pad}" y="${pad}" width="${s - 2 * pad}" height="${s - 2 * pad}" rx="${Math.max(2, r - pad)}" fill="none" stroke="${GOLD}" stroke-width="${Math.max(1, s / 90)}"/>` : ""}
    ${textPath(font, "SN", { x: s / 2, y: s / 2 + capCenter(font, size), size, fill: GOLD, align: "center", tracking: s * 0.01 })}
  </svg>`;
}

const png = (svg) => sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();

/** Minimal ICO writer that embeds PNG images (supported by all current browsers). */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, buf }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size, 0);
    e.writeUInt8(size, 1);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buf.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.buf)]);
}

function ogDefaultSvg() {
  const W = 1200,
    H = 630;
  const mono = monogramSvg(230, { radius: 0.12 }).replace("<svg ", '<svg x="880" y="200" ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><pattern id="p" width="28" height="28" patternUnits="userSpaceOnUse">
      <path d="M14 2 26 14 14 26 2 14Z" fill="none" stroke="${GOLD}" stroke-opacity=".16"/></pattern></defs>
    <rect width="${W}" height="${H}" fill="${MAROON}"/>
    <rect x="800" width="400" height="${H}" fill="url(#p)"/>
    <rect x="24" y="24" width="${W - 48}" height="${H - 48}" fill="none" stroke="${GOLD}" stroke-width="3"/>
    ${textPath(fonts.sansBold, "MANUFACTURER & WHOLESALER", { x: 80, y: 140, size: 22, fill: GOLD, tracking: 4 })}
    ${textPath(fonts.serifBold, "S. Nitinkumar", { x: 76, y: 250, size: 104, fill: "#FFFFFF" })}
    ${textPath(fonts.serifSemi, "Wholesale kurtis, straight", { x: 80, y: 350, size: 58, fill: CREAM })}
    ${textPath(fonts.serifSemi, "from the maker.", { x: 80, y: 414, size: 58, fill: CREAM })}
    ${textPath(fonts.sansMedium, "Min 3 pcs per design  ·  48 hr dispatch  ·  Enquire on WhatsApp", { x: 80, y: 510, size: 25, fill: GOLD })}
    ${mono}
  </svg>`;
}

const results = {};
const save = async (p, buf) => {
  await writeFile(out(p), buf);
  results[p] = `${(buf.length / 1024).toFixed(1)} KB`;
};

await save("src/app/icon.png", await png(monogramSvg(512)));
await save("src/app/apple-icon.png", await png(monogramSvg(180, { radius: 0 })));
await save("public/icon-192.png", await png(monogramSvg(192)));
await save("public/icon-512.png", await png(monogramSvg(512)));
await save("public/icon-maskable-512.png", await png(monogramSvg(512, { inset: 0.1, radius: 0 })));
await save(
  "src/app/favicon.ico",
  ico([
    { size: 16, buf: await png(monogramSvg(16, { radius: 0.15, frame: false })) },
    { size: 32, buf: await png(monogramSvg(32, { radius: 0.15, frame: false })) },
    { size: 48, buf: await png(monogramSvg(48, { radius: 0.15 })) },
  ]),
);
await save(
  "public/og-default.jpg",
  await sharp(Buffer.from(ogDefaultSvg())).jpeg({ quality: 82, mozjpeg: true }).toBuffer(),
);
console.table(results);
