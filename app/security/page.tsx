import type { Metadata } from "next"
import {
  Braces,
  HardDrive,
  KeyRound,
  LockKeyhole,
  MonitorCheck,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react"

import { FeatureCard, Notice, PageHero } from "@/components/sentrypix/ui"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Security & Limitations",
  description:
    "Understand browser-local processing, Secure Mode, password handling, classical-mode limits, and safe file exchange.",
  path: "/security",
})

export default function SecurityPage() {
  return (
    <>
      <PageHero
        eyebrow="Clear security guidance"
        title="Security & Limitations"
        description="What SentryPix protects, how it works, and what still depends on you and your organization."
      />
      <section className="page-container grid gap-4 pb-12 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard icon={MonitorCheck} title="Local file processing">
          Encryption and decryption run in your browser. The application has no
          file-upload endpoint or server-side processing route.
        </FeatureCard>
        <FeatureCard icon={LockKeyhole} title="Authenticated encryption">
          Secure Mode uses native Web Crypto AES-256-GCM. It rejects incorrect
          passwords and modified authenticated package data.
        </FeatureCard>
        <FeatureCard icon={KeyRound} title="Password-derived keys">
          Each encryption uses a new random salt and IV. PBKDF2 derives a
          non-extractable AES key. Neither the password nor key is saved in the
          package or local history.
        </FeatureCard>
        <FeatureCard icon={HardDrive} title="Local history only">
          Activity summaries and preferences may be stored in this browser. File
          bytes, encrypted packages, passwords, keys and previews remain
          temporary.
        </FeatureCard>
        <FeatureCard icon={Braces} title="Educational ciphers">
          Caesar and Rail Fence demonstrate classical ideas. Their small key
          spaces and predictable structures make them inappropriate for
          sensitive files.
        </FeatureCard>
        <FeatureCard icon={ShieldCheck} title="What authentication means">
          AES-GCM authenticates Secure Mode’s ciphertext and public package
          header. Classical SHA-256 checks reconstruction but does not supply
          modern confidentiality or authentication.
        </FeatureCard>
      </section>
      <section className="border-y bg-card py-12">
        <div className="page-container grid gap-5 md:grid-cols-2">
          <Notice tone="warning" title="Exchange passwords separately">
            Anyone with the encrypted package and its password can decrypt it.
            Share the password through a separate, trusted channel and use a
            unique strong password.
          </Notice>
          <Notice title="Browser and recipient safety matter">
            Keep your browser and device trustworthy. Once an authorized
            recipient decrypts and downloads the file, SentryPix cannot control
            what happens to that copy.
          </Notice>
        </div>
      </section>
      <section className="page-container py-12">
        <FeatureCard
          icon={ShieldAlert}
          title="Part of an organization’s controls"
        >
          SentryPix adds file protection before transfer. It does not replace
          access control, endpoint security, safe recipient verification,
          backup, or an approved transfer policy.
        </FeatureCard>
      </section>
    </>
  )
}
