import { z } from "zod";

// Editable home-page hero (Admin → Home page). Stored in settings under "home_hero".

export const HomeHero = z.object({
  eyebrow: z.string().trim().max(40, "Eyebrow: up to 40 characters"),
  headline: z.string().trim().min(5, "Headline is required").max(80, "Headline: up to 80 characters"),
  body: z.string().trim().max(280, "Paragraph: up to 280 characters"),
  /** Three short highlights. The editor saves the text in `label`; `value` is kept for older saves. */
  stats: z
    .array(
      z.object({
        value: z.string().trim().max(12, "Highlight: up to 12 characters before the label"),
        label: z.string().trim().max(20, "Highlight: up to 20 characters"),
      }),
    )
    .length(3),
});

export type HomeHero = z.infer<typeof HomeHero>;

export const DEFAULT_HERO: HomeHero = {
  eyebrow: "The festive edit · 2026",
  headline: "Made for your next best-selling edit.",
  body: "Thoughtfully made kurtis and suit sets, direct from our Ahmedabad workshop to your store.",
  stats: [
    { value: "", label: "From the maker" },
    { value: "", label: "48-hour dispatch" },
    { value: "", label: "GST invoiced" },
  ],
};

export const highlightText = (s: HomeHero["stats"][number]) => `${s.value} ${s.label}`.trim();

/** Hero carousel slides (Admin → Home page); empty slots are skipped. */
export const HERO_SLOTS = 5;

/** Shown as the only slide until a hero photo is uploaded. */
export const DEFAULT_HERO_IMAGE = {
  src: "/hero/editorial-1672.webp",
  srcSet: "/hero/editorial-900.webp 900w, /hero/editorial-1672.webp 1672w",
};

export interface HomeContent {
  hero: HomeHero;
  heroImageIds: (string | null)[]; // length HERO_SLOTS
}
