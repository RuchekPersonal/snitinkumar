import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site, siteUrl } from "@/lib/site";
import { sizesLabel, SIZE_ORDER } from "@/lib/format";
import { getViewer } from "@/lib/server/session";
import { getProduct, listRelated } from "@/lib/server/catalog";
import { Gallery } from "@/components/product/gallery";
import { Rate } from "@/components/product/rate";
import { ProductActions } from "@/components/product/product-actions";
import { ProductGrid } from "@/components/product/product-card";
import { ReceiptIcon, ShieldIcon, TruckIcon } from "@/components/icons";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/product/[code]">): Promise<Metadata> {
  // Metadata is built as a guest on purpose: link previews must never contain a rate.
  const product = await getProduct((await params).code, { role: "guest" });
  if (!product) return {};
  return pageMeta({
    title: `${product.code} · ${product.name}`,
    description: `${product.fabric} · Sizes ${sizesLabel(product.sizes)} · Min ${product.moq} pcs · Wholesale only — log in for rate.`,
    path: `/product/${product.code}`,
    image: product.coverImageId
      ? { url: `/api/img/${product.coverImageId}/og.jpg`, width: 1200, height: 630, alt: product.name }
      : undefined,
  });
}

export default async function ProductPage({ params }: PageProps<"/product/[code]">) {
  const { code } = await params;
  const viewer = await getViewer();
  const product = await getProduct(code, viewer);
  if (!product) notFound();
  const related = await listRelated(product.code, viewer);
  const url = new URL(`/product/${product.code}`, siteUrl()).toString();

  const specs = [
    ["Fabric", product.fabric],
    ["Work", product.work],
    ["Length", product.lengthIn ? `${product.lengthIn} in` : ""],
    ["Set includes", product.setIncludes],
    ["Wash", product.washCare],
  ].filter(([, v]) => v);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.code,
    description: product.description,
    brand: { "@type": "Brand", name: site.name },
    color: product.availableColours.map((c) => c.name).join(", "),
    material: product.fabric,
    category: product.categoryName,
    ...(product.coverImageId && { image: new URL(`/api/img/${product.coverImageId}/card.webp`, siteUrl()).toString() }),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-4 pb-24 lg:px-6 lg:pt-8 lg:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <nav aria-label="Breadcrumb" className="text-[13px] text-muted">
        <Link href="/" className="hover:text-maroon">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/catalog" className="hover:text-maroon">
          Catalog
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={`/catalog/${product.categorySlug}`} className="hover:text-maroon">
          {product.categoryName}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink">{product.code}</span>
      </nav>

      <div className="mt-4 grid gap-6 lg:mt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12">
        <Gallery ids={product.imageIds} alt={product.name} isNew={product.isNew} />

        <div>
          <p className="text-[12px] font-medium tracking-wider text-muted uppercase">
            {product.code} ·{" "}
            <span className="text-maroon">
              {product.categoryName} · {product.fabric}
            </span>
          </p>
          <h1 className="mt-2 font-serif text-[30px] leading-tight font-semibold lg:text-[42px]">{product.name}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {product.ratePaise !== undefined ? (
              <div>
                <Rate ratePaise={product.ratePaise} size="lg" />
                <p className="text-[12px] text-muted">per piece · confirmed on WhatsApp</p>
              </div>
            ) : (
              <div className="w-full rounded-md border border-gold/50 bg-gold-50 p-4">
                <Rate size="lg" />
                <p className="mt-1 text-[13px] text-muted">
                  {viewer.role === "pending"
                    ? "Your shop is awaiting approval. Rates appear once approved — usually the same day."
                    : "Wholesale rates are shown to registered retailers. Log in or register your shop — approved the same day."}
                </p>
              </div>
            )}
            <span className={`text-[13px] font-semibold ${product.inStock ? "text-whatsapp" : "text-maroon"}`}>
              {product.inStock ? "● In stock" : "● Out of stock — ask for restock"}
            </span>
          </div>

          <p className="mt-5 text-[15px] leading-relaxed text-ink/85">{product.description}</p>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 rounded-md border border-line bg-surface p-4 text-[14px]">
            {specs.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-24 shrink-0 text-muted">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6">
            <p className="eyebrow text-muted">
              Available {product.availableColours.length === 1 ? "colour" : "colours"}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {product.availableColours.map((c) => (
                <li
                  key={c.name}
                  className="flex h-11 items-center gap-2 rounded-full border border-line bg-surface pr-4 pl-1.5 text-[14px] font-medium"
                >
                  <span
                    className="h-8 w-8 shrink-0 rounded-full border border-ink/10 shadow-inner"
                    style={{ background: c.hex ?? "var(--color-sand)" }}
                    aria-hidden
                  />
                  {c.name}
                </li>
              ))}
            </ul>
            {product.availableColours.length > 1 && (
              <p className="mt-2 text-[13px] text-muted">Mention the colours you want in your enquiry note.</p>
            )}
          </div>

          <div className="mt-6">
            <p className="eyebrow text-muted">Available sizes (per set)</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {SIZE_ORDER.map((s) => {
                const has = product.sizes.includes(s);
                return (
                  <li
                    key={s}
                    className={`grid h-11 min-w-12 place-items-center rounded-md border px-3 text-[14px] font-semibold ${
                      has ? "border-ink/70 bg-surface" : "border-line text-muted/60 line-through"
                    }`}
                    aria-label={has ? `${s} available` : `${s} not available`}
                  >
                    {s}
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[13px] text-muted">
              A set = one piece of each available size ({product.sizes.length} pcs). Single-size lots on request.
            </p>
          </div>

          <ProductActions product={product} url={url} />

          <ul className="mt-6 grid grid-cols-3 gap-2 border-t border-line pt-5 text-[12px] text-muted sm:text-[13px]">
            <li className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:text-left">
              <TruckIcon className="text-maroon" /> Dispatch in 48 hrs
            </li>
            <li className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:text-left">
              <ReceiptIcon className="text-maroon" /> GST invoice
            </li>
            <li className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:text-left">
              <ShieldIcon className="text-maroon" /> Defect replacement
            </li>
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14" aria-labelledby="rel-h">
          <h2 id="rel-h" className="font-serif text-[26px] font-semibold lg:text-3xl">
            More in {product.categoryName}
          </h2>
          <div className="mt-5">
            <ProductGrid products={related} />
          </div>
        </section>
      )}
    </div>
  );
}
