import type { Metadata } from "next";
import { Cinzel, Manrope, Marcellus } from "next/font/google";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { guildConfig } from "@/config/guild";

import "./globals.css";

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const displayFont = Marcellus({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const brandFont = Cinzel({
  subsets: ["latin"],
  weight: "500",
  variable: "--font-brand",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${guildConfig.name} | World of Warcraft Guild`,
    template: `%s | ${guildConfig.name}`,
  },
  description: guildConfig.description,
  applicationName: guildConfig.name,
  openGraph: {
    type: "website",
    locale: "en_GB",
    siteName: guildConfig.name,
    title: `${guildConfig.name} | World of Warcraft Guild`,
    description: guildConfig.description,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: guildConfig.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${guildConfig.name} | World of Warcraft Guild`,
    description: guildConfig.description,
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={`${bodyFont.variable} ${displayFont.variable} ${brandFont.variable}`}>
      <body className="antialiased">
        <a
          href="#main-content"
          className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-lg bg-[var(--accent-strong)] px-4 py-3 font-bold text-[#17130d] transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
