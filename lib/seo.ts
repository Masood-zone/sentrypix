import type { Metadata } from "next"

const fallbackUrl = "http://localhost:3000"

function resolveSiteUrl(): URL {
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (vercelUrl ? `https://${vercelUrl}` : "")
  try {
    return new URL(configuredUrl || fallbackUrl)
  } catch {
    return new URL(fallbackUrl)
  }
}

export const siteConfig = {
  name: "SentryPix",
  fullName: "SentryPix — Browser-Based File Encryption & Cryptography System",
  tagline: "Protect confidential files before transfer.",
  description: "Encrypt confidential files locally in your browser before sharing them through your usual organizational channels. Secure Mode uses password-based AES-256-GCM; Classical Mode is educational.",
  url: resolveSiteUrl(),
  author: {
    name: "Mike Coffie",
    role: "Developer and Researcher",
  },
} as const

interface PageMetadataOptions {
  title: string
  description: string
  path: `/${string}` | "/"
  index?: boolean
  canonicalPath?: `/${string}` | "/"
}

export function createPageMetadata({
  title,
  description,
  path,
  index = true,
  canonicalPath = path,
}: PageMetadataOptions): Metadata {
  return {
    title: { absolute: `${title} | ${siteConfig.name}` },
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url: path,
      siteName: siteConfig.name,
      type: "website",
      locale: "en_GH",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${siteConfig.name}`,
      description,
    },
    robots: index
      ? { index: true, follow: true }
      : {
          index: false,
          follow: false,
          noarchive: true,
          nosnippet: true,
          googleBot: { index: false, follow: false, noimageindex: true },
        },
  }
}
