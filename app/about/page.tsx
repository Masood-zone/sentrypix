import type { Metadata } from "next"
import { Code2, GraduationCap, ListChecks, UserRound } from "lucide-react"

import { FeatureCard, Notice, PageHero } from "@/components/sentrypix/ui"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "About SentryPix",
  description:
    "Learn about SentryPix’s browser-based file encryption purpose, academic scope, technology, and evolution from CipherPix.",
  path: "/about",
})

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Final-year software project"
        title="About SentryPix"
        description="A browser-based file encryption and cryptography system that protects files before exchange and explains the difference between modern and classical techniques."
      />
      <section className="page-container grid gap-4 pb-12 md:grid-cols-2">
        <FeatureCard icon={GraduationCap} title="Aim">
          Help technology businesses, financial institutions and organizations
          protect confidential files before internal or external transfer, while
          making the cryptography understandable.
        </FeatureCard>
        <FeatureCard icon={ListChecks} title="What it does">
          Encrypt and decrypt arbitrary files locally, create versioned .spx
          packages, authenticate Secure Mode, explain educational classical
          ciphers and show non-sensitive local activity.
        </FeatureCard>
        <FeatureCard icon={Code2} title="Technology">
          Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Zustand, Zod, Web
          Workers, Web Crypto and Vitest. There is no database, authentication
          or file-upload backend.
        </FeatureCard>
        <FeatureCard icon={UserRound} title="Project author">
          Mike Coffie
          <br />
          Index Number: 5221040080
          <br />
          Developer and Researcher
        </FeatureCard>
      </section>
      <section className="page-container grid gap-4 pb-12 md:grid-cols-2">
        <Notice title="Evolution from CipherPix">
          CipherPix demonstrated Caesar and Rail Fence file transformations in
          .cpx packages. SentryPix keeps those lessons and old-file recovery
          while adding AES-256-GCM Secure Mode.
        </Notice>
        <Notice tone="warning" title="Project boundary">
          SentryPix is a file-protection layer before transmission. It does not
          replace an organization’s cybersecurity program or existing transfer
          platforms.
        </Notice>
      </section>
    </>
  )
}
