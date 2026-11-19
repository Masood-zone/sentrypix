"use client"

import { CheckCircle2, Download, FileKey2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { LostResult, Notice } from "@/components/sentrypix/ui"
import { downloadBlob } from "@/lib/sentrypix/downloads"
import { formatBytes } from "@/lib/sentrypix/files"
import { useEncryptionStore } from "@/stores/workflow-store"

export default function EncryptionResultPage() {
  const { result, reset } = useEncryptionStore()
  if (!result) return <LostResult operation="encryption" />
  return (
    <section className="page-container section-space">
      <span className="eyebrow">
        <CheckCircle2 className="size-4" /> Package ready
      </span>
      <h1 className="page-title">Your encrypted package is ready</h1>
      <p className="page-lead">
        Download the .spx file and send it through your usual transfer platform.
        The recipient can restore the original file in SentryPix.
      </p>
      <div className="mt-8 grid max-w-5xl gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="surface-card">
          <div className="flex items-start gap-3">
            <Image
              src="/android-chrome-192x192.png"
              alt=""
              width={48}
              height={48}
              className="size-12 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <h2 className="text-xl font-bold break-all">
                {result.encryptedFileName}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.mode === "secure"
                  ? "Secure · AES-256-GCM"
                  : `Classical / educational · ${result.algorithm.replaceAll("_", " + ")}`}
              </p>
            </div>
          </div>
          <dl className="mt-6 grid gap-4 border-t pt-5 text-sm sm:grid-cols-2">
            <Detail label="Original file" value={result.originalFileName} />
            <Detail
              label="Package size"
              value={formatBytes(result.encryptedSize)}
            />
            <Detail
              label="Processing time"
              value={`${result.durationMs.toFixed(1)} ms`}
            />
            <Detail
              label="Mode"
              value={result.mode === "secure" ? "Secure" : "Classical"}
            />
          </dl>
          <button
            className="link-button mt-6 w-full"
            onClick={() =>
              downloadBlob(result.packageBlob, result.encryptedFileName)
            }
          >
            <Download className="size-4" /> Download .spx package
          </button>
        </div>
        <div className="space-y-5">
          {result.mode === "secure" ? (
            <Notice title="Share the password separately">
              This package does not contain the password or the derived key.
              Agree on a separate, trusted channel for the recipient to receive
              the password. SentryPix does not store it.
            </Notice>
          ) : (
            <div className="surface-card">
              <FileKey2 className="text-primary" />
              <h2 className="mt-3 text-xl font-bold">
                Classical recovery note
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This educational package needs the separate recovery values.
                Anyone with both files can restore the original.
              </p>
              {result.recoveryBlob && result.recoveryFileName && (
                <button
                  className="link-button-outline mt-5 w-full"
                  onClick={() =>
                    downloadBlob(result.recoveryBlob!, result.recoveryFileName!)
                  }
                >
                  <Download className="size-4" /> Download recovery note
                </button>
              )}
            </div>
          )}
          <Notice
            tone={result.mode === "secure" ? "success" : "warning"}
            title={
              result.mode === "secure"
                ? "Authenticated encryption"
                : "Educational mode"
            }
          >
            {result.mode === "secure"
              ? "AES-GCM will reject a wrong password or modified authenticated package data during decryption."
              : "A checksum verifies recovered bytes but does not make Caesar or Rail Fence suitable for confidential files."}
          </Notice>
        </div>
      </div>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link href="/encrypt" className="link-button-outline" onClick={reset}>
          Encrypt another file
        </Link>
        <Link href="/decrypt" className="link-button">
          Open Decrypt
        </Link>
      </div>
    </section>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold break-all">{value}</dd>
    </div>
  )
}
