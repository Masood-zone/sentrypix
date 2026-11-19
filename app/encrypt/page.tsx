import type { Metadata } from "next"

import { EncryptionWorkflow } from "@/components/sentrypix/encryption-workflow"
import { PageHero } from "@/components/sentrypix/ui"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Encrypt a File",
  description:
    "Protect any confidential file locally with password-based AES-256-GCM, or explore classical ciphers in educational mode.",
  path: "/encrypt",
})

export default function EncryptPage() {
  return (
    <>
      <PageHero
        eyebrow="Browser-local protection"
        title="Encrypt a File"
        description="Choose a file, encrypt it securely in this browser, and download a .spx package to send through your usual platform. Classical algorithms remain available for learning."
      />
      <section className="page-container pb-12">
        <EncryptionWorkflow />
      </section>
    </>
  )
}
