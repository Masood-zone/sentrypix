import type { Metadata } from "next"

import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Temporary Decryption Result",
  description:
    "Download a locally restored file after AES-GCM authentication or classical reconstruction verification.",
  path: "/decrypt/result",
  canonicalPath: "/decrypt",
  index: false,
})

export default function DecryptionResultLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
