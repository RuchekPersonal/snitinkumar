import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { site, siteUrl } from "@/lib/site";
import { demoRolesEnabled, getViewer } from "@/lib/server/session";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { DemoRoleBar } from "@/components/layout/demo-role-bar";

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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  const accountHref = viewer.role === "guest" ? "/login" : "/account";

  return (
    <html lang="en-IN" className={`${cormorant.variable} ${jakarta.variable}`}>
      <body className="flex min-h-dvh flex-col pb-safe-nav">
        {demoRolesEnabled() && (
          <Suspense>
            <DemoRoleBar role={viewer.role} />
          </Suspense>
        )}
        <Header viewer={viewer} />
        <main className="flex-1">{children}</main>
        <Footer />
        <BottomNav accountHref={accountHref} />
      </body>
    </html>
  );
}
