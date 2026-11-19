import type { Metadata } from "next"

import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Local Activity History",
  description:
    "Review SentryPix activity summaries stored only in this browser, without file contents, passwords or keys.",
  path: "/history",
  index: false,
})

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
