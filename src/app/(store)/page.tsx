import Link from "next/link";
import { site, siteUrl } from "@/lib/site";
import { getViewer } from "@/lib/server/session";
import { listCategories, listFacets, listTrending } from "@/lib/server/catalog";
import { getHomeContent } from "@/lib/server/site-content";
import { DEFAULT_HERO_IMAGE, highlightText } from "@/lib/home-content";
import { HeroCarousel, type HeroSlide } from "@/components/home/hero-carousel";
import { CategoryTile } from "@/components/home/category-tile";
import { ProductGrid } from "@/components/product/product-card";
import { BoxIcon, ChevronRightIcon, SwatchIcon, TruckIcon, WhatsAppIcon } from "@/components/icons";
import { catalogueRequestText, waLink } from "@/lib/whatsapp";

export default async function HomePage() {
  const viewer = await getViewer();
  const [categories, trending, facets, home] = await Promise.all([
    listCategories(),
    listTrending(viewer, 8),
    listFacets(),
    getHomeContent(),
  ]);
  const { hero, heroImageIds } = home;
  const homeCategories = categories.filter((c) => c.showOnHome);
  const uploaded = heroImageIds.filter((id): id is string => !!id);
  const slides: HeroSlide[] = uploaded.length
    ? uploaded.map((id) => ({ src: `/api/site-img/${id}/full.webp` }))
    : [DEFAULT_HERO_IMAGE];

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

      {/* Hero — photo carousel (Admin → Home page) with the copy on top */}
      <div className="mx-auto max-w-7xl px-3 pt-3 lg:px-6 lg:pt-8">
        <HeroCarousel slides={slides}>
          <div className="px-6 pt-10 pb-8 text-white lg:ml-[8.2%] lg:max-w-[560px] lg:px-0 lg:py-11">
            {hero.eyebrow && (
              <p className="text-[10px] font-medium tracking-[0.22em] text-brass-200 uppercase lg:text-[11px]">
                {hero.eyebrow}
              </p>
            )}
            <h1 className="mt-3 mb-3 font-serif text-[44px] leading-[0.99] tracking-[-0.035em] sm:text-[49px] lg:mt-5 lg:mb-4 lg:text-[clamp(48px,5.5vw,76px)]">
              {hero.headline}
            </h1>
            {hero.body && (
              <p className="max-w-[420px] text-[13px] leading-[1.8] text-[#f0e8dd] lg:text-[15px]">{hero.body}</p>
            )}
            <ul className="mt-5 flex flex-wrap gap-x-[22px] gap-y-2 text-[11px] text-[#f1e7da] lg:mt-6 lg:text-[13px]">
              {hero.stats
                .map(highlightText)
                .filter(Boolean)
                .map((t, i) => (
                  <li key={i}>
                    <span aria-hidden className="mr-2 text-[#d7bb80]">
                      ✳
                    </span>
                    {t}
                  </li>
                ))}
            </ul>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4 lg:mt-7">
              <Link
                href="/catalog"
                className="inline-flex h-12 items-center gap-2.5 bg-brass px-[22px] text-[14px] font-semibold text-[#241e19] transition hover:-translate-y-0.5 hover:bg-[#d2b77f] hover:shadow-[0_9px_20px_#18110e33]"
              >
                Explore the collection <span aria-hidden>↗</span>
              </Link>
              <a
                href={waLink(catalogueRequestText)}
                className="text-[14px] text-white underline decoration-brass-200 underline-offset-[5px] hover:decoration-white"
              >
                Request the wholesale rate card
              </a>
            </div>
          </div>
        </HeroCarousel>
      </div>

      {/* Categories — photo tiles in the hero's style (photos: Admin → Categories) */}
      <section className="mx-auto mt-12 max-w-7xl px-4 lg:mt-20 lg:px-6" aria-labelledby="cat-h">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <p className="text-[10px] font-medium tracking-[0.22em] text-[#9a7b4e] uppercase lg:text-[11px]">
              Shop by category
            </p>
            <h2 id="cat-h" className="mt-2 font-serif text-[30px] leading-[1.12] tracking-[-0.025em] lg:text-[42px]">
              Popular categories
            </h2>
          </div>
          <Link
            href="/catalog"
            className="border-b border-brass pb-1.5 text-[11px] tracking-[0.12em] whitespace-nowrap uppercase hover:border-ink"
          >
            All {facets.totalDesigns} designs
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5 lg:mt-7 lg:grid-cols-5 lg:gap-3.5">
          {homeCategories.map((c, i) => (
            <CategoryTile
              key={c.slug}
              href={`/catalog/${c.slug}`}
              name={c.name}
              meta={`${c.designCount} ${c.designCount === 1 ? "design" : "designs"}`}
              imageId={c.coverImageId}
              index={i}
            />
          ))}
          <Link
            href="/new-arrivals"
            className={`group relative flex h-[120px] items-end overflow-hidden rounded-md bg-maroon p-4 text-white lg:h-[270px] lg:p-6 ${
              homeCategories.length % 2 === 0 ? "col-span-2 lg:col-span-1" : ""
            }`}
          >
            <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,#caa24b33,transparent_60%)]" />
            <span className="relative">
              <span className="block font-serif text-[21px] leading-tight lg:text-[25px]">New arrivals</span>
              <span className="mt-1.5 flex items-center gap-1 text-[9px] tracking-[0.13em] text-brass-200 uppercase lg:text-[10px]">
                This fortnight
                <ChevronRightIcon width={12} height={12} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </span>
          </Link>
        </div>
      </section>

      {/* Trending */}
      <section className="mx-auto mt-10 max-w-7xl px-4 lg:mt-16 lg:px-6" aria-labelledby="trend-h">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow hidden text-maroon lg:block">Best sellers</p>
            <h2 id="trend-h" className="font-serif text-[26px] lg:mt-1 lg:text-4xl">
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
                <h3 className="font-serif text-xl sm:mt-4">{t}</h3>
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
            <h2 className="font-serif text-[26px] leading-tight lg:text-3xl">
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
