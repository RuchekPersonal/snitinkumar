import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // /api/img stays crawlable so link previews (WhatsApp, Facebook) can fetch product images.
    rules: [{ userAgent: "*", allow: ["/", "/api/img/"], disallow: ["/api/", "/admin", "/account", "/enquiry"] }],
    sitemap: `${siteUrl().origin}/sitemap.xml`,
  };
}
