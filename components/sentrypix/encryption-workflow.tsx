"use client"

import {
  Eye,
  EyeOff,
  FileLock2,
  KeyRound,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { FileDropzone } from "@/components/sentrypix/file-dropzone"
import { Notice } from "@/components/sentrypix/ui"
import { Button } from "@/components/ui/button"
import { generateCaesarKey } from "@/lib/sentrypix/crypto"
import { downloadBlob } from "@/lib/sentrypix/downloads"
import {
  baseName,
  formatBytes,
  inspectFile,
  sanitizeFileName,
} from "@/lib/sentrypix/files"
import {
  generateStrongPassword,
  passwordStrength,
} from "@/lib/sentrypix/password"
import { createSpxRecoveryNote } from "@/lib/sentrypix/recovery"
import {
  SPX_MIME_TYPE,
  type ClassicalAlgorithm,
} from "@/lib/sentrypix/spx-package"
import {
  encryptClassicalInWorker,
  encryptSecureInWorker,
} from "@/lib/sentrypix/worker-client"
import { useHistoryStore } from "@/stores/history-store"
import { useSettingsStore } from "@/stores/settings-store"
import { useEncryptionStore } from "@/stores/workflow-store"

type Mode = "secure" | "classical"
type FormValues = {
  outputName: string
  password: string
  confirmPassword: string
  algorithm: ClassicalAlgorithm
  key: number
  rails: number
}
type SelectedFile = {
  file: File
  bytes: Uint8Array
  mimeType: string
  extension: string
  width?: number
  height?: number
  previewUrl?: string
}

const secureSchema = z
  .object({
    outputName: z.string().max(120),
    password: z
      .string()
      .min(12, "Use at least 12 characters for the password."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  })
const classicalOutput = { outputName: z.string().max(120) }
const caesarKey = z.coerce.number<number>().int().min(1).max(255)
const railCount = z.coerce.number<number>().int().min(2).max(10)
const classicalSchema = z.discriminatedUnion("algorithm", [
  z.object({
    ...classicalOutput,
    algorithm: z.literal("CAESAR"),
    key: caesarKey,
  }),
  z.object({
    ...classicalOutput,
    algorithm: z.literal("RAIL_FENCE"),
    rails: railCount,
  }),
  z.object({
    ...classicalOutput,
    algorithm: z.literal("CAESAR_RAIL_FENCE"),
    key: caesarKey,
    rails: railCount,
  }),
])

export function EncryptionWorkflow() {
  const router = useRouter()
  const settings = useSettingsStore()
  const addHistory = useHistoryStore((state) => state.add)
  const { stage, setStage, setResult, reset } = useEncryptionStore()
  const [mode, setMode] = React.useState<Mode>("secure")
  const [selected, setSelected] = React.useState<SelectedFile | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [pendingValues, setPendingValues] = React.useState<FormValues | null>(
    null
  )
  const [showPassword, setShowPassword] = React.useState(false)
  const form = useForm<FormValues>({
    defaultValues: {
      outputName: "",
      password: "",
      confirmPassword: "",
      algorithm: "CAESAR_RAIL_FENCE",
      key: 47,
      rails: settings.defaultRails,
    },
  })
  const password = useWatch({ control: form.control, name: "password" }) ?? ""
  const algorithm = useWatch({ control: form.control, name: "algorithm" })

  React.useEffect(() => {
    if (settings.generateKeyAutomatically)
      form.setValue("key", generateCaesarKey())
  }, [form, settings.generateKeyAutomatically])
  React.useEffect(
    () => () => {
      if (selected?.previewUrl) URL.revokeObjectURL(selected.previewUrl)
    },
    [selected]
  )

  async function selectFile(file: File): Promise<void> {
    setError(null)
    try {
      if (file.size === 0) throw new Error("The selected file is empty.")
      if (file.size > settings.maxFileSizeMb * 1024 * 1024)
        throw new Error("This file exceeds the configured file-size limit.")
      const inspected = await inspectFile(
        file,
        settings.maxFileSizeMb * 1024 * 1024
      )
      setSelected({
        file,
        ...inspected,
        previewUrl: inspected.width ? URL.createObjectURL(file) : undefined,
      })
      form.setValue(
        "outputName",
        mode === "secure" ? "sentrypix-protected-file" : baseName(file.name)
      )
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "This browser could not read the selected file."
      )
    }
  }

  function selectMode(nextMode: Mode): void {
    setMode(nextMode)
    form.clearErrors()
    if (selected)
      form.setValue(
        "outputName",
        nextMode === "secure"
          ? "sentrypix-protected-file"
          : baseName(selected.file.name)
      )
  }

  const submit = form.handleSubmit(async (values) => {
    if (!selected || busy) return
    form.clearErrors()
    const validation =
      mode === "secure"
        ? secureSchema.safeParse(values)
        : classicalSchema.safeParse(values)
    if (!validation.success) {
      for (const issue of validation.error.issues) {
        const field = issue.path[0]
        if (typeof field === "string" && field in values)
          form.setError(field as keyof FormValues, { message: issue.message })
      }
      return
    }
    if (mode === "classical" && settings.showSaveConfirmation) {
      setPendingValues(values)
      return
    }
    await begin(values)
  })

  async function begin(values: FormValues): Promise<void> {
    if (!selected || busy) return
    setPendingValues(null)
    setBusy(true)
    setError(null)
    reset()
    setStage("reading")
    const outputBase = sanitizeFileName(
      values.outputName ||
        (mode === "secure"
          ? "sentrypix-protected-file"
          : baseName(selected.file.name)),
      "sentrypix-file"
    )
    const encryptedFileName = `${outputBase}.spx`
    try {
      const details = {
        originalFileName: selected.file.name,
        originalMimeType: selected.mimeType,
        originalExtension: selected.extension,
        ...(selected.width && selected.height
          ? { width: selected.width, height: selected.height }
          : {}),
      }
      const response =
        mode === "secure"
          ? await encryptSecureInWorker(
              selected.bytes,
              values.password,
              details,
              setStage
            )
          : await encryptClassicalInWorker(
              selected.bytes,
              values.algorithm,
              values.key,
              values.rails,
              details,
              setStage
            )
      const packageBlob = new Blob([response.packageBytes], {
        type: SPX_MIME_TYPE,
      })
      const note =
        mode === "classical"
          ? createSpxRecoveryNote(
              encryptedFileName,
              values.algorithm,
              values.key,
              values.rails,
              settings.recoveryMetadata
            )
          : null
      setResult({
        packageBlob,
        ...(note
          ? {
              recoveryBlob: new Blob([JSON.stringify(note, null, 2)], {
                type: "application/json",
              }),
              recoveryFileName: `${outputBase}.spx-key.json`,
              key: values.key,
              rails: values.rails,
            }
          : {}),
        encryptedFileName,
        originalFileName: selected.file.name,
        originalSize: selected.file.size,
        encryptedSize: packageBlob.size,
        mode,
        algorithm: mode === "secure" ? "AES-256-GCM" : values.algorithm,
        durationMs: response.durationMs,
        ...(response.checksum ? { checksum: response.checksum } : {}),
        integrityVerified: true,
      })
      if (settings.storeHistory)
        addHistory({
          id: crypto.randomUUID(),
          fileName: selected.file.name,
          operation: "encrypt",
          mode,
          fileSize: selected.file.size,
          durationMs: response.durationMs,
          integrityStatus: "verified",
          status: "completed",
          createdAt: new Date().toISOString(),
        })
      form.setValue("password", "")
      form.setValue("confirmPassword", "")
      router.push("/encrypt/result")
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "This browser could not encrypt the file."
      setError(message)
      toast.error(message)
      if (settings.storeHistory)
        addHistory({
          id: crypto.randomUUID(),
          fileName: selected.file.name,
          operation: "encrypt",
          mode,
          fileSize: selected.file.size,
          durationMs: 0,
          integrityStatus: "failed",
          status: "failed",
          createdAt: new Date().toISOString(),
        })
    } finally {
      setBusy(false)
    }
  }

  function downloadPendingNote(values: FormValues): void {
    if (!selected) return
    const base = sanitizeFileName(
      values.outputName || baseName(selected.file.name),
      "sentrypix-file"
    )
    const note = createSpxRecoveryNote(
      `${base}.spx`,
      values.algorithm,
      values.key,
      values.rails,
      settings.recoveryMetadata
    )
    downloadBlob(
      new Blob([JSON.stringify(note, null, 2)], { type: "application/json" }),
      `${base}.spx-key.json`
    )
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div
        className="grid gap-4 md:grid-cols-2"
        role="radiogroup"
        aria-label="Encryption mode"
      >
        <ModeCard
          mode="secure"
          selected={mode === "secure"}
          onSelect={() => selectMode("secure")}
          title="Secure encryption"
          badge="Recommended"
          description="AES-256-GCM with a password. Choose this for confidential organizational files."
        />
        <ModeCard
          mode="classical"
          selected={mode === "classical"}
          onSelect={() => selectMode("classical")}
          title="Classical cryptography"
          badge="Educational"
          description="Explore Caesar and Rail Fence. These algorithms cannot protect sensitive information."
        />
      </div>

      {!selected ? (
        <FileDropzone
          accept="*/*"
          title="Choose a file to encrypt"
          description={`Select any non-empty file up to ${settings.maxFileSizeMb} MB. Documents, images, archives, media and code are supported.`}
          onFile={(file) => void selectFile(file)}
          disabled={busy}
        />
      ) : (
        <div className="surface-card flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <FileLock2
              className="size-9 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="truncate font-semibold">{selected.file.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatBytes(selected.file.size)} · {selected.mimeType}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSelected(null)}
            aria-label="Remove selected file"
          >
            <Trash2 /> Remove
          </Button>
        </div>
      )}

      <div className="surface-card space-y-5">
        <div>
          <label className="label" htmlFor="output-name">
            Output filename
          </label>
          <input
            id="output-name"
            className="field"
            {...form.register("outputName")}
            aria-invalid={Boolean(form.formState.errors.outputName)}
          />
          <FieldError message={form.formState.errors.outputName?.message} />
          <p className="mt-1 text-xs text-muted-foreground">
            The downloaded package uses the .spx extension.
          </p>
        </div>
        {mode === "secure" ? (
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="secure-password">
                Password
              </label>
              <div className="flex gap-2">
                <input
                  id="secure-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="field"
                  {...form.register("password")}
                  aria-invalid={Boolean(form.formState.errors.password)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              <FieldError message={form.formState.errors.password?.message} />
              <p
                className="mt-2 text-xs text-muted-foreground"
                aria-live="polite"
              >
                Password strength:{" "}
                <strong className="capitalize">
                  {password ? passwordStrength(password) : "not entered"}
                </strong>
                . This is an estimate; use a unique password.
              </p>
            </div>
            <div>
              <label className="label" htmlFor="confirm-password">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="field"
                {...form.register("confirmPassword")}
                aria-invalid={Boolean(form.formState.errors.confirmPassword)}
              />
              <FieldError
                message={form.formState.errors.confirmPassword?.message}
              />
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => {
                  const generated = generateStrongPassword()
                  form.setValue("password", generated, { shouldValidate: true })
                  form.setValue("confirmPassword", generated, {
                    shouldValidate: true,
                  })
                  setShowPassword(true)
                }}
              >
                <KeyRound /> Generate strong password
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <Notice tone="warning" title="For learning only">
              Classical packages use reversible transformations and a separate
              checksum. Do not use them for sensitive business, financial or
              client files.
            </Notice>
            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label className="label" htmlFor="classical-algorithm">
                  Algorithm
                </label>
                <select
                  id="classical-algorithm"
                  className="field"
                  {...form.register("algorithm")}
                >
                  <option value="CAESAR">Caesar</option>
                  <option value="RAIL_FENCE">Rail Fence</option>
                  <option value="CAESAR_RAIL_FENCE">Caesar + Rail Fence</option>
                </select>
              </div>
              {algorithm !== "RAIL_FENCE" && (
                <div>
                  <label className="label" htmlFor="caesar-key">
                    Caesar key
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="caesar-key"
                      type="number"
                      min="1"
                      max="255"
                      className="field"
                      {...form.register("key", { valueAsNumber: true })}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label="Generate Caesar key"
                      onClick={() => form.setValue("key", generateCaesarKey())}
                    >
                      <RefreshCw />
                    </Button>
                  </div>
                  <FieldError message={form.formState.errors.key?.message} />
                </div>
              )}
              {algorithm !== "CAESAR" && (
                <div>
                  <label className="label" htmlFor="rail-rails">
                    Rail Fence rails
                  </label>
                  <select
                    id="rail-rails"
                    className="field"
                    {...form.register("rails", { valueAsNumber: true })}
                  >
                    {Array.from({ length: 9 }, (_, index) => index + 2).map(
                      (value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      )
                    )}
                  </select>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Download the separate recovery note with the package and keep it
              in a different place.
            </p>
          </div>
        )}
      </div>

      <Notice title="Processed in this browser">
        SentryPix reads and encrypts your file locally. The application has no
        file-upload endpoint. Send the downloaded package through your usual
        transfer platform and share the password separately.
      </Notice>
      {busy && (
        <p
          className="surface-card font-semibold text-primary"
          aria-live="polite"
        >
          Processing locally: {stage?.replaceAll("-", " ") ?? "reading"}
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
      <Button
        type="submit"
        size="lg"
        disabled={!selected || busy}
        className="w-full sm:w-auto"
      >
        <FileLock2 /> {busy ? "Encrypting locally…" : "Encrypt file"}
      </Button>
      {pendingValues && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="recovery-confirm-title"
            className="surface-card w-full max-w-lg"
          >
            <h2 id="recovery-confirm-title" className="text-xl font-bold">
              Save your classical recovery values
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              The recovery values are not stored in the .spx package. Download
              the note before continuing and keep it separately. Classical
              encryption is educational only.
            </p>
            <div className="mt-4 rounded-md border bg-muted p-4 font-mono text-sm">
              {pendingValues.algorithm !== "RAIL_FENCE" && (
                <p>Caesar key: {pendingValues.key}</p>
              )}
              {pendingValues.algorithm !== "CAESAR" && (
                <p>Rail Fence rails: {pendingValues.rails}</p>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => downloadPendingNote(pendingValues)}
              >
                Download recovery note
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (pendingValues) void begin(pendingValues)
                }}
              >
                I saved the values · Continue
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPendingValues(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}

function ModeCard({
  mode,
  selected,
  onSelect,
  title,
  badge,
  description,
}: {
  mode: Mode
  selected: boolean
  onSelect: () => void
  title: string
  badge: string
  description: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`surface-card text-left transition hover:border-primary ${selected ? "border-primary bg-secondary/50" : ""}`}
    >
      <span className="text-xs font-bold tracking-wide text-primary uppercase">
        {badge}
      </span>
      <span className="mt-2 block text-xl font-bold">{title}</span>
      <span className="mt-2 block text-sm leading-6 text-muted-foreground">
        {description}
      </span>
      <span className="sr-only">{mode} mode</span>
    </button>
  )
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <p className="mt-1 text-sm text-destructive" role="alert">
      {message}
    </p>
  ) : null
}
