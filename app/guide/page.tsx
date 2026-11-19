import type { Metadata } from "next"
import { Download, FileUp, KeyRound, LockOpen, Send } from "lucide-react"

import { FeatureCard, Notice, PageHero } from "@/components/sentrypix/ui"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "User Guide",
  description:
    "Encrypt files in Secure Mode, transfer .spx packages, share passwords separately, restore files, and open legacy .cpx packages.",
  path: "/guide",
})

export default function GuidePage() {
  return (
    <>
      <PageHero
        eyebrow="Practical steps"
        title="SentryPix User Guide"
        description="Protect a file before transfer, then help the intended recipient restore it."
      />
      <section className="page-container grid gap-4 pb-12 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard icon={FileUp} title="1. Select a file">
          Open Encrypt and choose a non-empty file within the configured limit.
          Documents, images, archives, media and code are supported.
        </FeatureCard>
        <FeatureCard icon={KeyRound} title="2. Choose Secure Mode">
          Secure Mode is selected by default. Enter and confirm a unique
          password, or generate one in the form.
        </FeatureCard>
        <FeatureCard icon={Download} title="3. Download the package">
          SentryPix encrypts locally and creates a .spx package. Save the
          download before leaving or refreshing the result page.
        </FeatureCard>
        <FeatureCard icon={Send} title="4. Send it normally">
          Transfer the package through your approved email, intranet, cloud
          drive or messaging platform. Share its password separately.
        </FeatureCard>
        <FeatureCard icon={LockOpen} title="5. Restore the original">
          The recipient opens Decrypt, chooses the .spx package and enters the
          password. A wrong password or modified package will fail safely.
        </FeatureCard>
        <FeatureCard icon={KeyRound} title="Classical and legacy files">
          Classical .spx files and old CipherPix .cpx files need their separate
          recovery values or note. Use Classical Mode for learning only.
        </FeatureCard>
      </section>
      <section className="page-container space-y-4 pb-12">
        <h2 className="font-heading text-2xl font-bold">Common questions</h2>
        <details className="surface-card">
          <summary className="font-semibold">Why was my file rejected?</summary>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            It may be empty or above the configured file-size limit. SentryPix
            does not restrict file formats to images.
          </p>
        </details>
        <details className="surface-card">
          <summary className="font-semibold">
            Why did secure decryption fail?
          </summary>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The password may be wrong, or the package may be modified or
            corrupted. For privacy and clarity, these outcomes share one error
            message.
          </p>
        </details>
        <details className="surface-card">
          <summary className="font-semibold">
            Why did my result disappear?
          </summary>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Binary results live in memory only. Refreshing or closing the tab
            clears them; repeat the operation if the package or original was not
            downloaded.
          </p>
        </details>
      </section>
      <section className="page-container pb-12">
        <Notice title="Processing stays local">
          SentryPix has no upload endpoint, account, database or cloud file
          store. Your browser processes the file and creates the download.
        </Notice>
      </section>
    </>
  )
}
