import type { Metadata } from "next";
import type { ReactNode } from "react";
import { JetBrains_Mono, Raleway } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { RevealController } from "@/components/RevealController";
import {
  SITE_URL,
  KEYWORDS,
  absoluteUrl,
} from "@/lib/site";
import { getPublicSettings as getAdminSettings, type AdminSettings } from "@/lib/admin/settings";

// One consistent studio type system exposed as CSS variables:
//   Raleway       — all regular interface, body and display text
//   JetBrains Mono — small technical labels, counts and metadata
const raleway = Raleway({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAdminSettings();
  const title = `${settings.siteName} · Architecture, Interiors & Planning in ${settings.city}`;
  return {
    metadataBase: new URL(SITE_URL), title: { default: title, template: `%s · ${settings.siteName}` }, description: settings.description, keywords: KEYWORDS,
    applicationName: settings.siteName, authors: [{ name: settings.siteName, url: SITE_URL }], creator: settings.siteName, publisher: settings.siteName, alternates: { canonical: "/" },
    openGraph: { type: "website", siteName: settings.siteName, locale: "en_IN", url: SITE_URL, title, description: settings.description, images: [{ url: "/og.jpg", width: 1200, height: 630, alt: settings.siteName }] },
    twitter: { card: "summary_large_image", title, description: settings.description, images: ["/og.jpg"] },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
    icons: { icon: "/logo-ra.png", shortcut: "/logo-ra.png", apple: "/logo-ra.png" },
  };
}

/**
 * Sitewide structured data: a LocalBusiness/Organization graph (NAP, geo,
 * founders, socials) plus a WebSite node, combined under a single @graph.
 */
function buildSiteJsonLd(settings: AdminSettings) {
  return {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "LocalBusiness"],
      "@id": absoluteUrl("/#organization"),
      name: settings.siteName,
      legalName: settings.legalName,
      url: SITE_URL,
      logo: absoluteUrl("/logo-full.png"),
      image: absoluteUrl("/og.jpg"),
      email: settings.email,
      address: {
        "@type": "PostalAddress",
        addressLocality: settings.city,
        addressRegion: settings.region,
        postalCode: settings.postalCode,
        addressCountry: settings.country,
      },
      sameAs: settings.instagram ? [settings.instagram] : [],
      foundingDate: settings.foundingYear,
      areaServed: settings.city,
      priceRange: "₹₹₹",
      description: settings.description,
    },
    {
      "@type": "WebSite",
      "@id": absoluteUrl("/#website"),
      name: settings.siteName,
      url: SITE_URL,
      inLanguage: "en",
    },
  ],
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const settings = await getAdminSettings();
  const siteJsonLd = buildSiteJsonLd(settings);
  return (
    <html lang="en" className={`${raleway.variable} ${jetBrainsMono.variable}`}>
      <body>
        {/* No-JS fallback: reveal-on-scroll content must never stay hidden. */}
        <noscript>
          <style>{`.reveal,.img-mask{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <SmoothScroll>
          <Nav />
          <main className="page">{children}</main>
          <Footer settings={settings} />
        </SmoothScroll>
        <RevealController />
      </body>
    </html>
  );
}
