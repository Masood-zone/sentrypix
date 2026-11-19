import type { ClassicalAlgorithm, FileMetadata } from "./spx-package"
import type { ProcessingStage } from "./types"

type StageResponse = { id: string; type: "stage"; stage: ProcessingStage }
type ErrorResponse = { id: string; type: "error"; message: string }
export type EncryptedResponse = {
  id: string
  type: "encrypted"
  packageBytes: ArrayBuffer
  checksum?: string
  durationMs: number
}
export type DecryptedResponse = {
  id: string
  type: "decrypted"
  recoveredBytes: ArrayBuffer
  metadata: FileMetadata
  durationMs: number
}
type WorkerResponse =
  StageResponse | ErrorResponse | EncryptedResponse | DecryptedResponse
type FileDetails = Omit<FileMetadata, "originalSize" | "encryptedAt">

function runWorker<T extends EncryptedResponse | DecryptedResponse>(
  request: Record<string, unknown> & { id: string },
  transfer: Transferable[],
  onStage: (stage: ProcessingStage) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../../workers/cipher.worker.ts", import.meta.url),
      { type: "module" }
    )
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data
      if (response.id !== request.id) return
      if (response.type === "stage") onStage(response.stage)
      else {
        worker.terminate()
        if (response.type === "error") reject(new Error(response.message))
        else resolve(response as T)
      }
    }
    worker.onerror = () => {
      worker.terminate()
      reject(
        new Error("This browser could not start the local encryption worker.")
      )
    }
    worker.postMessage(request, transfer)
  })
}

function copyForWorker(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer
}

export function encryptSecureInWorker(
  bytes: Uint8Array,
  password: string,
  file: FileDetails,
  onStage: (stage: ProcessingStage) => void
): Promise<EncryptedResponse> {
  const transferable = copyForWorker(bytes)
  return runWorker(
    {
      id: crypto.randomUUID(),
      type: "encrypt-secure",
      bytes: transferable,
      password,
      file,
    },
    [transferable],
    onStage
  )
}

export function encryptClassicalInWorker(
  bytes: Uint8Array,
  algorithm: ClassicalAlgorithm,
  key: number,
  rails: number,
  file: FileDetails,
  onStage: (stage: ProcessingStage) => void
): Promise<EncryptedResponse> {
  const transferable = copyForWorker(bytes)
  return runWorker(
    {
      id: crypto.randomUUID(),
      type: "encrypt-classical",
      bytes: transferable,
      algorithm,
      key,
      rails,
      file,
    },
    [transferable],
    onStage
  )
}

export function decryptPackageInWorker(
  packageBytes: Uint8Array,
  mode: "secure" | "classical" | "legacy",
  credentials: { password: string } | { key: number; rails: number },
  onStage: (stage: ProcessingStage) => void
): Promise<DecryptedResponse> {
  const transferable = copyForWorker(packageBytes)
  const type =
    mode === "secure"
      ? "decrypt-secure"
      : mode === "classical"
        ? "decrypt-classical"
        : "decrypt-legacy"
  return runWorker(
    {
      id: crypto.randomUUID(),
      type,
      packageBytes: transferable,
      ...credentials,
    },
    [transferable],
    onStage
  )
}
