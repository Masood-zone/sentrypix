import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Building2,
  FileCheck2,
  FileLock2,
  HardDrive,
  Landmark,
  LockKeyhole,
} from "lucide-react"

import { FeatureCard, Notice } from "@/components/sentrypix/ui"
import { StructuredData } from "@/components/seo/structured-data"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Protect Confidential Files Before Transfer",
  description:
    "SentryPix encrypts files locally in your browser before you send them through existing internal or external communication platforms.",
  path: "/",
})

const steps = [
  [
    "01",
    "Select",
    "Choose any confidential file, from a report to a source archive.",
  ],
  [
    "02",
    "Protect",
    "Encrypt it with a password using AES-256-GCM in this browser.",
  ],
  [
    "03",
    "Transfer",
    "Send the .spx package through your usual approved channel.",
  ],
  [
    "04",
    "Restore",
    "The recipient downloads it and decrypts it with SentryPix.",
  ],
] as const

export default function HomePage() {
  return (
    <>
      <StructuredData />
      <section className="border-b bg-[#112743] text-white dark:bg-[#152b46]">
        <div className="page-container grid min-h-[520px] items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <span className="inline-flex rounded-md border border-white/25 px-3 py-1 text-xs font-semibold tracking-wide text-blue-100 uppercase">
              Browser-based file protection
            </span>
            <h1 className="mt-7 max-w-3xl font-heading text-4xl leading-tight font-bold tracking-tight sm:text-5xl xl:text-[3.6rem]">
              Protect confidential files before they leave your organization.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-100">
              Encrypt locally, then exchange the protected package through the
              email, intranet, cloud drive, or messaging platform you already
              use.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/encrypt"
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-white px-5 py-3 font-semibold text-[#112743] hover:bg-blue-100"
              >
                <FileLock2 className="size-4" /> Encrypt a File
              </Link>
              <Link
                href="/decrypt"
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/40 px-5 py-3 font-semibold hover:bg-white/10"
              >
                <LockKeyhole className="size-4" /> Decrypt a File
              </Link>
            </div>
            <p className="mt-7 flex items-center gap-2 text-sm text-blue-100">
              <HardDrive className="size-4" /> Your files are processed locally
              in your browser.
            </p>
          </div>
          <div className="rounded-lg border border-white/20 bg-white/5 p-5 shadow-xl sm:p-7">
            <div className="flex items-center justify-between border-b border-white/20 pb-4">
              <div>
                <span className="text-sm font-semibold">
                  File protection workflow
                </span>
                <p className="mt-1 text-xs text-blue-100">
                  From sender to intended recipient
                </p>
              </div>
              <Image
                src="/android-chrome-512x512.png"
                alt=""
                width={64}
                height={64}
                className="size-16 object-contain"
              />
            </div>
            <div className="mt-5 space-y-3">
              <FlowRow
                number="1"
                label="Confidential file"
                detail="report.pdf"
              />
              <div className="ml-5 h-5 border-l border-dashed border-blue-200/70" />
              <FlowRow
                number="2"
                label="Secure browser encryption"
                detail="AES-256-GCM"
              />
              <div className="ml-5 h-5 border-l border-dashed border-blue-200/70" />
              <FlowRow
                number="3"
                label="Protected package"
                detail="protected-file.spx"
              />
              <div className="ml-5 h-5 border-l border-dashed border-blue-200/70" />
              <FlowRow
                number="4"
                label="Existing transfer platform"
                detail="Recipient decrypts"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="page-container section-space">
        <div className="max-w-3xl">
          <span className="eyebrow">How it works</span>
          <h2 className="page-title">
            A protection step for the way you already share files
          </h2>
          <p className="page-lead">
            SentryPix creates an encrypted package before transmission. It does
            not replace your organization’s transfer tools.
          </p>
        </div>
        <ol className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map(([number, title, copy]) => (
            <li key={number} className="surface-card">
              <span className="font-mono text-xs font-bold text-primary">
                {number}
              </span>
              <h3 className="mt-5 text-xl font-bold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {copy}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y bg-card py-14">
        <div className="page-container">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <span className="eyebrow">Built for file exchange</span>
              <h2 className="mt-4 max-w-3xl font-heading text-3xl font-bold">
                Useful across organizational channels
              </h2>
            </div>
            <Link
              href="/guide"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              Read the guide <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <FeatureCard icon={Building2} title="Technology teams">
              Protect source archives, project documents and client deliverables
              before external transfer.
            </FeatureCard>
            <FeatureCard icon={Landmark} title="Financial teams">
              Protect financial reports and sensitive documents during
              authorized branch or partner exchange.
            </FeatureCard>
            <FeatureCard icon={FileCheck2} title="Professional organizations">
              Protect contracts, records and confidential correspondence before
              sending.
            </FeatureCard>
          </div>
        </div>
      </section>

      <section className="page-container grid gap-5 py-14 lg:grid-cols-[1fr_1fr]">
        <Notice tone="success" title="Secure Mode is recommended">
          Password-based AES-256-GCM authenticates encrypted packages and
          protects file details inside the ciphertext. Share the password
          separately from the package.
        </Notice>
        <Notice tone="warning" title="Classical Mode is educational">
          Caesar and Rail Fence help explain substitution and transposition.
          They are not suitable for protecting sensitive organizational
          information.
        </Notice>
      </section>
    </>
  )
}

function FlowRow({
  number,
  label,
  detail,
}: {
  number: string
  label: string
  detail: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/20 bg-white/10 p-3">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-md bg-white/15 font-mono text-sm font-bold">
          {number}
        </span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <span className="hidden text-xs text-blue-100 sm:inline">{detail}</span>
    </div>
  )
}
