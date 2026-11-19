import type { Metadata, Viewport } from "next"

import "./globals.css"
import { AppShell } from "@/components/layout/app-shell"
import { ThemeProvider } from "@/components/theme-provider"
import { siteConfig } from "@/lib/seo"

export const metadata: Metadata = {
  metadataBase: siteConfig.url,
  title: {
    default: "SentryPix — Protect Files Before Transfer",
    template: "%s | SentryPix",
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  authors: [{ name: siteConfig.author.name }],
  creator: siteConfig.author.name,
  publisher: siteConfig.name,
  generator: "Next.js",
  category: "security",
  keywords: [
    "file encryption",
    "browser encryption",
    "AES-256-GCM",
    "PBKDF2",
    "organizational file protection",
    "classical cryptography",
    "SentryPix",
  ],
  referrer: "strict-origin-when-cross-origin",
  formatDetection: { address: false, email: false, telephone: false },
  alternates: { canonical: "/" },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "SentryPix — Protect Files Before Transfer",
    description: siteConfig.description,
    url: "/",
    siteName: siteConfig.name,
    locale: "en_GH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SentryPix — Protect Files Before Transfer",
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(process.env.BING_SITE_VERIFICATION
      ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } }
      : {}),
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1728" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className="antialiased">
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
