"use client"

import { Eye, EyeOff, FileCheck2, FileKey2, LockOpen } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { FileDropzone } from "@/components/sentrypix/file-dropzone"
import { Notice } from "@/components/sentrypix/ui"
import { Button } from "@/components/ui/button"
import { formatBytes, sanitizeFileName } from "@/lib/sentrypix/files"
import { parseCipherPixPackage } from "@/lib/sentrypix/package"
import {
  parseRecoveryNote,
  parseSpxRecoveryNote,
} from "@/lib/sentrypix/recovery"
import { SECURE_FAILURE_MESSAGE } from "@/lib/sentrypix/secure"
import {
  parseSpxPackage,
  SPX_MAGIC,
  type FileMetadata,
  type SpxHeader,
} from "@/lib/sentrypix/spx-package"
import { decryptPackageInWorker } from "@/lib/sentrypix/worker-client"
import { useHistoryStore } from "@/stores/history-store"
import { useSettingsStore } from "@/stores/settings-store"
import { useDecryptionStore } from "@/stores/workflow-store"

type Mode = "secure" | "classical" | "legacy"
type FormValues = { password: string; key: number; rails: number }
type SelectedPackage = {
  file: File
  bytes: Uint8Array
  mode: Mode
  metadata?: FileMetadata
  header?: SpxHeader
}
const classicalSchema = z.object({
  key: z.coerce.number<number>().int().min(1).max(255),
  rails: z.coerce.number<number>().int().min(2).max(10),
})
const caesarOnlySchema = classicalSchema.pick({ key: true })
const railsOnlySchema = classicalSchema.pick({ rails: true })

export function DecryptionWorkflow() {
  const router = useRouter()
  const settings = useSettingsStore()
  const addHistory = useHistoryStore((state) => state.add)
  const workflow = useDecryptionStore()
  const [selected, setSelected] = React.useState<SelectedPackage | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [noteWarning, setNoteWarning] = React.useState<string | null>(null)
  const [showPassword, setShowPassword] = React.useState(false)
  const noteInput = React.useRef<HTMLInputElement>(null)
  const form = useForm<FormValues>({
    defaultValues: { password: "", key: 47, rails: 3 },
  })

  async function selectPackage(file: File): Promise<void> {
    setError(null)
    setNoteWarning(null)
    try {
      if (file.size > 21 * 1024 * 1024 + 64 * 1024)
        throw new Error("This package exceeds the supported file-size limit.")
      const bytes = new Uint8Array(await file.arrayBuffer())
      const magic = new TextDecoder().decode(bytes.subarray(0, 4))
      if (magic === SPX_MAGIC) {
        const parsed = parseSpxPackage(bytes)
        const mode = parsed.header.mode
        const metadata =
          mode === "classical"
            ? {
                originalFileName: parsed.header.originalFileName,
                originalMimeType: parsed.header.originalMimeType,
                originalExtension: parsed.header.originalExtension,
                originalSize: parsed.header.originalSize,
                encryptedAt: parsed.header.encryptedAt,
                ...(parsed.header.width && parsed.header.height
                  ? { width: parsed.header.width, height: parsed.header.height }
                  : {}),
              }
            : undefined
        setSelected({ file, bytes, mode, metadata, header: parsed.header })
        workflow.setPackageMetadata(metadata ?? null)
      } else if (magic === "CPX1") {
        const parsed = parseCipherPixPackage(bytes)
        const metadata = {
          originalFileName: parsed.metadata.originalFileName,
          originalMimeType: parsed.metadata.originalMimeType,
          originalExtension: parsed.metadata.originalExtension,
          originalSize: parsed.metadata.originalSize,
          encryptedAt: parsed.metadata.encryptedAt,
          ...(parsed.metadata.width && parsed.metadata.height
            ? { width: parsed.metadata.width, height: parsed.metadata.height }
            : {}),
        }
        setSelected({ file, bytes, mode: "legacy", metadata })
        workflow.setPackageMetadata(metadata)
      } else
        throw new Error(
          "This is not a supported SentryPix or legacy CipherPix package."
        )
    } catch (cause) {
      setSelected(null)
      workflow.setPackageMetadata(null)
      setError(
        cause instanceof Error
          ? cause.message
          : "This package could not be opened."
      )
    }
  }

  async function importNote(file: File): Promise<void> {
    if (!selected || selected.mode === "secure") return
    try {
      const text = await file.text()
      const note =
        selected.mode === "legacy"
          ? parseRecoveryNote(text)
          : parseSpxRecoveryNote(text)
      if (note.caesarKey !== undefined)
        form.setValue("key", note.caesarKey, { shouldValidate: true })
      if (note.railFenceRails !== undefined)
        form.setValue("rails", note.railFenceRails, { shouldValidate: true })
      setNoteWarning(
        note.encryptedFileName && note.encryptedFileName !== selected.file.name
          ? "This note names a different package. Confirm that it belongs to this file."
          : null
      )
      toast.success("Recovery note imported")
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Invalid recovery note."
      setError(message)
      toast.error(message)
    }
  }

  const submit = form.handleSubmit(async (values) => {
    if (!selected || busy) return
    form.clearErrors()
    if (selected.mode === "secure") {
      if (!values.password) {
        form.setError("password", {
          message: "Enter the password used to encrypt this package.",
        })
        return
      }
    } else {
      const algorithm =
        selected.header?.mode === "classical"
          ? selected.header.algorithm
          : "CAESAR_RAIL_FENCE"
      const credentialSchema =
        algorithm === "CAESAR"
          ? caesarOnlySchema
          : algorithm === "RAIL_FENCE"
            ? railsOnlySchema
            : classicalSchema
      const parsed = credentialSchema.safeParse(values)
      if (!parsed.success) {
        for (const issue of parsed.error.issues)
          form.setError(issue.path[0] as "key" | "rails", {
            message: issue.message,
          })
        return
      }
    }
    setBusy(true)
    setError(null)
    workflow.setStage("reading-package")
    try {
      const credentials =
        selected.mode === "secure"
          ? { password: values.password }
          : { key: values.key, rails: values.rails }
      const response = await decryptPackageInWorker(
        selected.bytes,
        selected.mode,
        credentials,
        workflow.setStage
      )
      const metadata = {
        ...response.metadata,
        originalFileName: sanitizeFileName(
          response.metadata.originalFileName,
          "recovered-file"
        ),
      }
      const blob = new Blob([response.recoveredBytes], {
        type: metadata.originalMimeType,
      })
      const previewUrl = metadata.originalMimeType.startsWith("image/")
        ? URL.createObjectURL(blob)
        : ""
      workflow.setResult({
        blob,
        previewUrl,
        metadata,
        mode: selected.mode,
        durationMs: response.durationMs,
        integrityVerified: true,
      })
      if (settings.storeHistory)
        addHistory({
          id: crypto.randomUUID(),
          fileName: metadata.originalFileName,
          operation: "decrypt",
          mode: selected.mode,
          fileSize: blob.size,
          durationMs: response.durationMs,
          integrityStatus: "verified",
          status: "completed",
          createdAt: new Date().toISOString(),
        })
      form.setValue("password", "")
      router.push("/decrypt/result")
    } catch (cause) {
      const message =
        selected.mode === "secure"
          ? SECURE_FAILURE_MESSAGE
          : cause instanceof Error
            ? cause.message
            : "These recovery values could not restore the file."
      setError(message)
      toast.error(message)
      if (settings.storeHistory)
        addHistory({
          id: crypto.randomUUID(),
          fileName: selected.metadata?.originalFileName ?? selected.file.name,
          operation: "decrypt",
          mode: selected.mode,
          fileSize: selected.file.size,
          durationMs: 0,
          integrityStatus: "failed",
          status: "failed",
          createdAt: new Date().toISOString(),
        })
    } finally {
      setBusy(false)
    }
  })

  const classicalAlgorithm =
    selected?.header?.mode === "classical" ? selected.header.algorithm : null
  const needsCaesar =
    selected?.mode === "legacy" ||
    (selected?.mode === "classical" && classicalAlgorithm !== "RAIL_FENCE")
  const needsRails =
    selected?.mode === "legacy" ||
    (selected?.mode === "classical" && classicalAlgorithm !== "CAESAR")

  return (
    <form onSubmit={submit} className="space-y-6">
      {!selected ? (
        <FileDropzone
          accept=".spx,.cpx,application/x-sentrypix,application/x-cipherpix"
          title="Choose an encrypted package"
          description="Select a .spx package or a legacy .cpx file. SentryPix inspects its format locally."
          onFile={(file) => void selectPackage(file)}
          disabled={busy}
        />
      ) : (
        <div className="surface-card flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <FileCheck2 className="size-9 shrink-0 text-primary" />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold">
                {selected.file.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatBytes(selected.file.size)} ·{" "}
                {selected.mode === "secure"
                  ? "Secure AES-256-GCM"
                  : selected.mode === "classical"
                    ? "Classical / educational"
                    : "Legacy CipherPix"}
              </p>
              {selected.metadata && (
                <p className="mt-2 text-sm">
                  Original file:{" "}
                  <strong>{selected.metadata.originalFileName}</strong>
                </p>
              )}
              {selected.mode === "secure" && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Original file details are encrypted and appear after
                  successful decryption.
                </p>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSelected(null)
              workflow.reset()
            }}
          >
            Choose another package
          </Button>
        </div>
      )}

      {selected && (
        <div className="surface-card max-w-xl space-y-4">
          {selected.mode === "secure" ? (
            <>
              <h2 className="text-xl font-bold">Enter the package password</h2>
              <label className="label" htmlFor="decrypt-password">
                Password
              </label>
              <div className="flex gap-2">
                <input
                  id="decrypt-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="off"
                  className="field"
                  {...form.register("password")}
                  aria-invalid={Boolean(form.formState.errors.password)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              {form.formState.errors.password && (
                <p role="alert" className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold">
                {selected.mode === "legacy"
                  ? "Legacy recovery values"
                  : "Classical recovery values"}
              </h2>
              <Notice tone="warning" title="Educational encryption">
                Classical ciphers do not provide modern confidentiality. Use
                Secure Mode for sensitive files.
              </Notice>
              <div className="grid gap-4 sm:grid-cols-2">
                {needsCaesar && (
                  <div>
                    <label className="label" htmlFor="decrypt-key">
                      Caesar key
                    </label>
                    <input
                      id="decrypt-key"
                      type="number"
                      min="1"
                      max="255"
                      className="field"
                      {...form.register("key", { valueAsNumber: true })}
                      aria-invalid={Boolean(form.formState.errors.key)}
                    />
                    {form.formState.errors.key && (
                      <p role="alert" className="mt-1 text-sm text-destructive">
                        {form.formState.errors.key.message}
                      </p>
                    )}
                  </div>
                )}
                {needsRails && (
                  <div>
                    <label className="label" htmlFor="decrypt-rails">
                      Rail Fence rails
                    </label>
                    <select
                      id="decrypt-rails"
                      className="field"
                      {...form.register("rails", { valueAsNumber: true })}
                      aria-invalid={Boolean(form.formState.errors.rails)}
                    >
                      {Array.from({ length: 9 }, (_, index) => index + 2).map(
                        (value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        )
                      )}
                    </select>
                    {form.formState.errors.rails && (
                      <p role="alert" className="mt-1 text-sm text-destructive">
                        {form.formState.errors.rails.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => noteInput.current?.click()}
              >
                <FileKey2 /> Import recovery note
              </Button>
              <input
                ref={noteInput}
                type="file"
                accept=".json,application/json"
                className="sr-only"
                aria-label="Import recovery note"
                onChange={(event) => {
                  if (event.target.files?.[0])
                    void importNote(event.target.files[0])
                }}
              />
              {noteWarning && (
                <p
                  role="alert"
                  className="text-sm text-amber-700 dark:text-amber-300"
                >
                  {noteWarning}
                </p>
              )}
            </>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            <LockOpen /> {busy ? "Decrypting locally…" : "Decrypt file"}
          </Button>
        </div>
      )}
      <Notice title="Your package stays local">
        Decryption and authentication run in your browser. SentryPix does not
        upload the package or store your password.
      </Notice>
      {busy && (
        <p
          aria-live="polite"
          className="surface-card font-semibold text-primary"
        >
          Processing locally:{" "}
          {workflow.stage?.replaceAll("-", " ") ?? "reading package"}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive p-4 text-sm font-semibold text-destructive"
        >
          {error}
        </p>
      )}
    </form>
  )
}
