import type { Metadata } from "next"

import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Temporary Encryption Result",
  description:
    "Download a temporary SentryPix package and, for classical mode, its separate recovery note.",
  path: "/encrypt/result",
  canonicalPath: "/encrypt",
  index: false,
})

export default function EncryptionResultLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
