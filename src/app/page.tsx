/* eslint-disable @next/next/no-img-element -- decorative static SVG placeholders */
import Link from "next/link";
import { site, siteUrl } from "@/lib/site";
import { getViewer } from "@/lib/server/session";
import { listCategories, listFacets, listTrending } from "@/lib/server/catalog";
import { ProductGrid } from "@/components/product/product-card";
import { BoxIcon, ChevronRightIcon, SwatchIcon, TruckIcon, WhatsAppIcon } from "@/components/icons";
import { catalogueRequestText, generalEnquiryText, waLink } from "@/lib/whatsapp";

export default async function HomePage() {
  const viewer = await getViewer();
  const [categories, trending, facets] = await Promise.all([listCategories(), listTrending(viewer, 8), listFacets()]);
  const homeCategories = categories.filter((c) => c.showOnHome);

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: siteUrl().origin,
    logo: new URL("/icon-512.png", siteUrl()).toString(),
    email: site.email,
    telephone: site.helplineTel,
    address: { "@type": "PostalAddress", streetAddress: site.address, addressCountry: "IN" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd).replace(/</g, "\\u003c") }}
      />

      {/* Hero — mobile: maroon card; desktop: copy + photo mosaic */}
      <section className="mx-auto max-w-7xl px-4 pt-4 lg:px-6 lg:pt-12">
        <div className="lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14">
          <div className="rounded-lg border border-gold/40 bg-maroon p-6 text-white lg:border-0 lg:bg-transparent lg:p-0 lg:text-ink">
            <p className="eyebrow text-gold lg:text-gold-600">Festive 2026 collection</p>
            <h1 className="mt-3 font-serif text-[34px] leading-[1.05] font-semibold sm:text-5xl lg:text-[64px]">
              Wholesale kurtis, straight from the maker.
            </h1>
            <p className="mt-4 text-[14px] text-white/85 lg:hidden">
              Min 3 pcs per design · 48 hr dispatch · GST invoiced
            </p>
            <p className="mt-5 hidden max-w-xl text-[17px] leading-relaxed text-ink/80 lg:block">
              Designer kurtis, 3-piece suit sets and rayon daily wear for retailers and boutiques across India. Factory
              prices, minimum 3 pieces per design, fresh designs every fortnight.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/catalog"
                className="inline-flex h-12 items-center rounded-md bg-gold px-6 font-semibold text-ink lg:bg-maroon lg:text-white lg:hover:bg-maroon-700"
              >
                Browse catalog
              </Link>
              <a
                href={waLink(generalEnquiryText)}
                className="hidden h-12 items-center gap-2 rounded-md border border-ink/70 px-5 font-semibold lg:inline-flex"
              >
                <WhatsAppIcon /> WhatsApp enquiry
              </a>
            </div>
            <dl className="mt-8 hidden gap-8 text-[14px] lg:flex">
              <div>
                <dt className="sr-only">Retailers</dt>
                <dd>
                  <b>1,200+</b> retailers
                </dd>
              </div>
              <div>
                <dt className="sr-only">Dispatch</dt>
                <dd>
                  <b>48 hr</b> dispatch
                </dd>
              </div>
              <div>
                <dt className="sr-only">Invoicing</dt>
                <dd>
                  <b>GST</b> invoiced
                </dd>
              </div>
            </dl>
          </div>

          <div className="hidden grid-cols-3 grid-rows-2 gap-3 lg:grid" aria-hidden>
            <img
              src="/placeholders/hero-main.svg"
              alt=""
              className="row-span-2 h-full w-full rounded-md border-2 border-gold/60 object-cover"
            />
            <img src="/placeholders/hero-2.svg" alt="" className="aspect-[10/9] w-full rounded-md object-cover" />
            <img src="/placeholders/hero-3.svg" alt="" className="aspect-[10/9] w-full rounded-md object-cover" />
            <img src="/placeholders/hero-4.svg" alt="" className="aspect-[10/9] w-full rounded-md object-cover" />
            <img src="/placeholders/hero-5.svg" alt="" className="aspect-[10/9] w-full rounded-md object-cover" />
          </div>
        </div>
      </section>

      {/* Categories — mobile pills, desktop tiles */}
      <section className="mx-auto mt-10 max-w-7xl px-4 lg:mt-16 lg:px-6" aria-labelledby="cat-h">
        <p className="eyebrow hidden text-maroon lg:block">Shop by</p>
        <h2 id="cat-h" className="font-serif text-[26px] font-semibold lg:mt-1 lg:text-4xl">
          Popular categories
        </h2>

        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
          {homeCategories.map((c, i) => (
            <Link
              key={c.slug}
              href={`/catalog/${c.slug}`}
              className={`shrink-0 rounded-full border px-4 py-2.5 text-[14px] font-medium ${
                i === 0 ? "border-ink bg-ink text-white" : "border-line bg-surface"
              }`}
            >
              {c.shortName}
            </Link>
          ))}
          <Link
            href="/new-arrivals"
            className="shrink-0 rounded-full border border-maroon px-4 py-2.5 text-[14px] font-medium text-maroon"
          >
            New arrivals
          </Link>
        </div>

        <div className="mt-6 hidden grid-cols-5 gap-4 lg:grid">
          {homeCategories.map((c) => (
            <Link
              key={c.slug}
              href={`/catalog/${c.slug}`}
              className="flex h-36 flex-col justify-end rounded-md border border-line bg-surface p-5 transition-colors hover:border-gold"
            >
              <span className="font-serif text-2xl font-semibold">{c.name}</span>
              <span className="mt-1 text-[13px] text-muted">{c.designCount} designs</span>
            </Link>
          ))}
          <Link
            href="/new-arrivals"
            className="flex h-36 flex-col justify-end rounded-md border border-gold/60 bg-maroon p-5 text-white"
          >
            <span className="font-serif text-2xl font-semibold">New arrivals</span>
            <span className="mt-1 flex items-center text-[13px] text-white/80">
              This fortnight <ChevronRightIcon width={14} height={14} />
            </span>
          </Link>
        </div>
      </section>

      {/* Trending */}
      <section className="mx-auto mt-10 max-w-7xl px-4 lg:mt-16 lg:px-6" aria-labelledby="trend-h">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow hidden text-maroon lg:block">Best sellers</p>
            <h2 id="trend-h" className="font-serif text-[26px] font-semibold lg:mt-1 lg:text-4xl">
              <span className="lg:hidden">Trending</span>
              <span className="hidden lg:inline">Trending wholesale products</span>
            </h2>
          </div>
          <Link
            href="/catalog?sort=popular"
            className="pb-1 text-[14px] font-semibold text-maroon underline underline-offset-4"
          >
            <span className="lg:hidden">View all</span>
            <span className="hidden lg:inline">View all {facets.totalDesigns} designs →</span>
          </Link>
        </div>
        <div className="mt-5">
          <ProductGrid products={trending} priorityCount={2} />
        </div>
      </section>

      {/* USPs */}
      <section className="mx-auto mt-12 max-w-7xl px-4 lg:mt-20 lg:px-6">
        <div className="grid gap-6 rounded-lg border border-line bg-surface p-6 sm:grid-cols-3 lg:p-8">
          {[
            {
              Icon: BoxIcon,
              t: "Own manufacturing unit",
              d: "Cutting, stitching and finishing in-house — no middlemen, consistent sizing, repeat orders honoured.",
            },
            {
              Icon: SwatchIcon,
              t: "Superior quality fabric",
              d: "14 kg rayon, mul cotton and Chanderi blends, pre-checked for shrinkage and colour fastness.",
            },
            {
              Icon: TruckIcon,
              t: "Pan-India dispatch",
              d: "Packed and shipped within 48 hours by surface or air; transport of your choice for bulk lots.",
            },
          ].map(({ Icon, t, d }) => (
            <div key={t} className="flex gap-4 sm:block">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/60 bg-gold-50 text-maroon">
                <Icon />
              </span>
              <div>
                <h3 className="font-serif text-xl font-semibold sm:mt-4">{t}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* WhatsApp CTA */}
      <section className="mx-auto mt-10 max-w-7xl px-4 lg:mt-12 lg:px-6">
        <div className="flex flex-col gap-5 rounded-lg bg-maroon p-6 text-white sm:flex-row sm:items-center sm:justify-between lg:p-8">
          <div>
            <h2 className="font-serif text-[26px] leading-tight font-semibold lg:text-3xl">
              Want the full catalogue PDF with rates?
            </h2>
            <p className="mt-2 text-[14px] text-white/80">
              Message us on WhatsApp with your shop name and city — we reply within business hours.
            </p>
          </div>
          <a
            href={waLink(catalogueRequestText)}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-gold px-6 font-semibold text-ink"
          >
            <WhatsAppIcon /> Chat on WhatsApp
          </a>
        </div>
      </section>
    </>
  );
}
