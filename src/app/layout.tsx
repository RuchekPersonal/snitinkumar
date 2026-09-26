import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { site, siteUrl } from "@/lib/site";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

const defaultTitle = `${site.name} — Wholesale Kurtis, Straight from the Maker`;

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: defaultTitle, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "wholesale kurtis",
    "kurti manufacturer",
    "kurti wholesaler Surat",
    "3 piece suit sets wholesale",
    "rayon kurti wholesale",
  ],
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_IN",
    title: defaultTitle,
    description: site.description,
    url: "/",
    images: [{ url: "/og-default.jpg", width: 1200, height: 630, alt: `${site.name} — wholesale kurtis` }],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: site.description,
    images: ["/og-default.jpg"],
  },
  formatDetection: { telephone: false },
  appleWebApp: { title: "SN Wholesale", capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#6B1F2B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${cormorant.variable} ${jakarta.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
