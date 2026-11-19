import type { Metadata } from "next"

import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Interactive Algorithm Explorer",
  description:
    "Explore Caesar and Rail Fence demonstrations, then compare their educational role with AES-256-GCM and password-based authenticated encryption.",
  path: "/algorithms",
})

export default function AlgorithmsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
