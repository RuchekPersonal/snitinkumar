// Business details shown across the site. Values marked "placeholder" still need real data.
export const site = {
  name: "S. Nitinkumar",
  tagline: "Manufacturer & Wholesaler",
  description:
    "Designer kurtis, 3-piece suit sets and rayon daily wear for retailers and boutiques across India. Min 3 pcs per design · 48 hr dispatch · Enquire on WhatsApp.",
  whatsappNumber: "918866238147", // wa.me format: country code + number, no "+"
  helplineDisplay: "+91 88662 38147",
  helplineTel: "+918866238147",
  email: "imruchekshah@gmail.com",
  address: "Textile Market, Ring Road, Surat, Gujarat", // placeholder
  hours: "Mon–Sat 10am–7pm",
  newArrivalDays: 14,
} as const;

export function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);
  return new URL("http://localhost:3000");
}
