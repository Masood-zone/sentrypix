import type { Metadata } from "next"

import { DecryptionWorkflow } from "@/components/sentrypix/decryption-workflow"
import { PageHero } from "@/components/sentrypix/ui"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Decrypt a File",
  description:
    "Restore a SentryPix .spx package with its password or classical recovery values, or open a legacy CipherPix .cpx file.",
  path: "/decrypt",
})

export default function DecryptPage() {
  return (
    <>
      <PageHero
        eyebrow="Browser-local recovery"
        title="Decrypt a File"
        description="Choose an encrypted package. SentryPix detects its mode, verifies the required credentials, and restores the original bytes locally."
      />
      <section className="page-container pb-12">
        <DecryptionWorkflow />
      </section>
    </>
  )
}
