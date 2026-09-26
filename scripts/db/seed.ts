// Loads the sample catalogue into Supabase. Safe to re-run: rows are upserted by
// natural key and each product's images are replaced.
// Run: npm run db:seed
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { encodeProductImage } from "../../src/lib/server/image-variants";
import { categories, colourHex, colours, fabrics, products } from "./seed-data";

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false },
});

function check<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data;
}

// Placeholder "photo": a kurti silhouette in the product colour (real photos come via the admin portal).
function placeholderSvg(colour: string, index: number): string {
  const base = colourHex[colour] ?? "#6B1F2B";
  const flip = index % 2 === 0 ? `transform="translate(300 0) scale(-1 1)"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="1200" height="1600">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E4D5C0"/><stop offset="1" stop-color="#D9C6AC"/></linearGradient>
    <pattern id="z" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="1.4" fill="#CAA24B" opacity=".75"/></pattern>
  </defs>
  <rect width="300" height="400" fill="url(#g)"/>
  <g ${flip}>
    <path d="M122 48 Q150 70 178 48 L214 60 L252 130 L230 142 L206 104 L222 366 L78 366 L94 104 L70 142 L48 130 L86 60 Z" fill="${base}"/>
    <path d="M122 48 Q150 70 178 48 L214 60 L206 104 L94 104 L86 60 Z" fill="#ffffff" fill-opacity=".12"/>
    <path d="M124 52 Q150 86 176 52" fill="none" stroke="#CAA24B" stroke-width="3"/>
    <rect x="84" y="338" width="132" height="22" fill="url(#z)"/>
    <line x1="84" y1="336" x2="216" y2="336" stroke="#CAA24B" stroke-width="2"/>
  </g>
</svg>`;
}

async function main() {
  const sizes = ["S", "M", "L", "XL", "XXL", "3XL"];

  check(
    await db.from("categories").upsert(
      categories.map((c) => ({
        slug: c.slug,
        name: c.name,
        short_name: c.shortName,
        description: c.description,
        show_on_home: c.showOnHome,
        is_visible: c.isVisible,
        sort_order: c.sortOrder,
      })),
      { onConflict: "slug" },
    ),
    "categories",
  );
  check(
    await db.from("fabrics").upsert(
      fabrics.map((name, i) => ({ name, sort_order: i })),
      { onConflict: "name" },
    ),
    "fabrics",
  );
  check(
    await db.from("colours").upsert(
      colours.map((name, i) => ({ name, hex: colourHex[name] ?? null, sort_order: i })),
      { onConflict: "name" },
    ),
    "colours",
  );
  check(
    await db.from("sizes").upsert(
      sizes.map((label, i) => ({ label, sort_order: i })),
      { onConflict: "label" },
    ),
    "sizes",
  );

  const idMap = async (table: string, key: string) => {
    const rows = check(await db.from(table).select(`id, ${key}`), table) as unknown as Record<
      string,
      string | number
    >[];
    return new Map(rows.map((r) => [r[key] as string, r.id as number]));
  };
  const [catIds, fabricIds, colourIds, sizeIds] = await Promise.all([
    idMap("categories", "slug"),
    idMap("fabrics", "name"),
    idMap("colours", "name"),
    idMap("sizes", "label"),
  ]);

  for (const p of products) {
    const [row] = check(
      await db
        .from("products")
        .upsert(
          {
            code: p.code,
            name: p.name,
            category_id: catIds.get(p.categorySlug),
            fabric_id: fabricIds.get(p.fabric),
            colour_id: colourIds.get(p.colour),
            description: p.description,
            work: p.work,
            length_in: p.lengthIn,
            set_includes: p.setIncludes,
            wash_care: p.washCare,
            rate_paise: p.ratePaise,
            mrp_paise: p.mrpPaise,
            moq: p.moq,
            stock_pcs: p.stockPcs,
            is_visible: p.isVisible,
            is_trending: p.isTrending,
            new_until: p.newUntil,
            popularity: p.popularity,
            created_at: new Date(p.createdAt).toISOString(),
          },
          { onConflict: "code" },
        )
        .select("id"),
      `product ${p.code}`,
    )!;

    check(await db.from("product_sizes").delete().eq("product_id", row.id), "product_sizes clear");
    check(
      await db.from("product_sizes").insert(p.sizes.map((s) => ({ product_id: row.id, size_id: sizeIds.get(s) }))),
      "product_sizes",
    );

    check(await db.from("product_colours").delete().eq("product_id", row.id), "product_colours clear");
    check(
      await db
        .from("product_colours")
        .insert(
          [p.colour, ...(p.extraColours ?? [])].map((name) => ({ product_id: row.id, colour_id: colourIds.get(name) })),
        ),
      "product_colours",
    );

    check(await db.from("product_images").delete().eq("product_id", row.id), "product_images clear");
    for (let i = 0; i < p.imageCount; i++) {
      const png = await sharp(Buffer.from(placeholderSvg(p.colour, i + 1)))
        .png()
        .toBuffer();
      const encoded = await encodeProductImage(png);
      check(
        await db.from("product_images").insert({ product_id: row.id, position: i, alt: p.name, ...encoded }),
        `image ${p.code}#${i + 1}`,
      );
    }
    console.log(`✓ ${p.code} ${p.isVisible ? "" : "(hidden) "}· ${p.sizes.length} sizes · ${p.imageCount} photo(s)`);
  }
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
