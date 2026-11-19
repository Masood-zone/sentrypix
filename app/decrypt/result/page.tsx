/* eslint-disable @next/next/no-img-element */
"use client"

import { CheckCircle2, Download } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { LostResult, Notice } from "@/components/sentrypix/ui"
import { downloadBlob } from "@/lib/sentrypix/downloads"
import { formatBytes } from "@/lib/sentrypix/files"
import { useDecryptionStore } from "@/stores/workflow-store"

export default function DecryptionResultPage() {
  const { result, reset } = useDecryptionStore()
  if (!result) return <LostResult operation="decryption" />
  const preview = Boolean(
    result.previewUrl && result.metadata.originalMimeType.startsWith("image/")
  )
  return (
    <section className="page-container section-space">
      <span className="eyebrow">
        <CheckCircle2 className="size-4" /> File restored
      </span>
      <h1 className="page-title">Your original file is ready</h1>
      <p className="page-lead">
        {result.mode === "secure"
          ? "The package passed AES-GCM authentication and the original bytes were restored."
          : "The recovered bytes matched the package checksum. Classical packages are for educational use."}
      </p>
      <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="surface-card grid min-h-72 place-items-center bg-muted/40">
          {preview ? (
            <img
              src={result.previewUrl}
              alt={`Recovered ${result.metadata.originalFileName}`}
              className="max-h-[550px] w-full object-contain"
            />
          ) : (
            <div className="text-center">
              <Image
                src="/android-chrome-192x192.png"
                alt=""
                width={96}
                height={96}
                className="mx-auto size-24 object-contain"
              />
              <p className="mt-4 font-semibold break-all">
                {result.metadata.originalFileName}
              </p>
            </div>
          )}
        </div>
        <div className="space-y-5">
          <div className="surface-card">
            <h2 className="text-xl font-bold">Download restored file</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <Detail
                label="Filename"
                value={result.metadata.originalFileName}
              />
              <Detail label="Size" value={formatBytes(result.blob.size)} />
              <Detail
                label="MIME type"
                value={result.metadata.originalMimeType}
              />
              <Detail
                label="Processing time"
                value={`${result.durationMs.toFixed(1)} ms`}
              />
            </dl>
            <button
              className="link-button mt-6 w-full"
              onClick={() =>
                downloadBlob(result.blob, result.metadata.originalFileName)
              }
            >
              <Download className="size-4" /> Download original file
            </button>
          </div>
          <Notice
            tone="success"
            title={
              result.mode === "secure"
                ? "Authentication passed"
                : "Reconstruction verified"
            }
          >
            {result.mode === "secure"
              ? "The password and authenticated package data were accepted by AES-GCM."
              : "The reconstructed file matched the SHA-256 checksum in the package. This does not imply modern confidentiality."}
          </Notice>
        </div>
      </div>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link href="/decrypt" className="link-button-outline" onClick={reset}>
          Decrypt another file
        </Link>
        <Link href="/encrypt" className="link-button-outline" onClick={reset}>
          Encrypt a file
        </Link>
      </div>
    </section>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold break-all">{value}</dd>
    </div>
  )
}
