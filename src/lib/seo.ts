import type { Metadata } from "next";
import { site } from "./site";

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  image?: { url: string; width: number; height: number; alt: string };
}

const defaultImage = { url: "/og-default.jpg", width: 1200, height: 630, alt: `${site.name} — wholesale kurtis` };

/**
 * Page-level metadata. Next.js replaces (does not merge) the root `openGraph` object,
 * so every page repeats the site-wide Open Graph fields that WhatsApp previews rely on.
 */
export function pageMeta({ title, description, path, image = defaultImage }: PageMetaInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: "en_IN",
      title,
      description,
      url: path,
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}
