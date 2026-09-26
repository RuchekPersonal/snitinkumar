import { z } from "zod";

// Editable home-page hero (Admin → Home page). Stored in settings under "home_hero".

export const HomeHero = z.object({
  eyebrow: z.string().trim().max(40, "Eyebrow: up to 40 characters"),
  headline: z.string().trim().min(5, "Headline is required").max(80, "Headline: up to 80 characters"),
  body: z.string().trim().max(280, "Paragraph: up to 280 characters"),
  mobileLine: z.string().trim().max(90, "Mobile line: up to 90 characters"),
  stats: z
    .array(
      z.object({
        value: z.string().trim().max(12, "Stat value: up to 12 characters"),
        label: z.string().trim().max(20, "Stat label: up to 20 characters"),
      }),
    )
    .length(3),
});

export type HomeHero = z.infer<typeof HomeHero>;

export const DEFAULT_HERO: HomeHero = {
  eyebrow: "Festive 2026 collection",
  headline: "Wholesale kurtis, straight from the maker.",
  body: "Designer kurtis, 3-piece suit sets and rayon daily wear for retailers and boutiques across India. Factory prices, minimum 3 pieces per design, fresh designs every fortnight.",
  mobileLine: "Min 3 pcs per design · 48 hr dispatch · GST invoiced",
  stats: [
    { value: "1,200+", label: "retailers" },
    { value: "48 hr", label: "dispatch" },
    { value: "GST", label: "invoiced" },
  ],
};

/** Hero photo slots: 0 is the tall tile, 1–4 the small tiles. */
export const HERO_SLOTS = 5;

/** Static patterned tiles used until a photo is uploaded for a slot. */
export const HERO_PLACEHOLDERS = [
  "/placeholders/hero-main.svg",
  "/placeholders/hero-2.svg",
  "/placeholders/hero-3.svg",
  "/placeholders/hero-4.svg",
  "/placeholders/hero-5.svg",
];

export interface HomeContent {
  hero: HomeHero;
  heroImageIds: (string | null)[]; // length HERO_SLOTS
}
