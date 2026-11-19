/// <reference lib="webworker" />

import {
  encryptClassicalFile,
  decryptClassicalFile,
} from "@/lib/sentrypix/classical"
import {
  caesarDecrypt,
  checksumMatches,
  railFenceDecrypt,
} from "@/lib/sentrypix/crypto"
import { parseCipherPixPackage } from "@/lib/sentrypix/package"
import { decryptSecureFile, encryptSecureFile } from "@/lib/sentrypix/secure"
import type {
  ClassicalAlgorithm,
  FileMetadata,
} from "@/lib/sentrypix/spx-package"
import type { ProcessingStage } from "@/lib/sentrypix/types"

type FileDetails = Omit<FileMetadata, "originalSize" | "encryptedAt">
type Request =
  | {
      id: string
      type: "encrypt-secure"
      bytes: ArrayBuffer
      file: FileDetails
      password: string
    }
  | {
      id: string
      type: "encrypt-classical"
      bytes: ArrayBuffer
      file: FileDetails
      algorithm: ClassicalAlgorithm
      key: number
      rails: number
    }
  | {
      id: string
      type: "decrypt-secure"
      packageBytes: ArrayBuffer
      password: string
    }
  | {
      id: string
      type: "decrypt-classical" | "decrypt-legacy"
      packageBytes: ArrayBuffer
      key: number
      rails: number
    }

const worker = self as unknown as DedicatedWorkerGlobalScope

function stage(id: string, value: ProcessingStage): void {
  worker.postMessage({ id, type: "stage", stage: value })
}

worker.onmessage = async (event: MessageEvent<Request>) => {
  const request = event.data
  const started = performance.now()
  try {
    if (
      request.type === "encrypt-secure" ||
      request.type === "encrypt-classical"
    ) {
      stage(request.id, "reading")
      const bytes = new Uint8Array(request.bytes)
      const metadata: FileMetadata = {
        ...request.file,
        originalSize: bytes.length,
        encryptedAt: new Date().toISOString(),
      }
      if (request.type === "encrypt-secure") {
        const packageBytes = await encryptSecureFile(
          bytes,
          metadata,
          request.password,
          (value) => stage(request.id, value)
        )
        stage(request.id, "ready")
        worker.postMessage(
          {
            id: request.id,
            type: "encrypted",
            packageBytes: packageBytes.buffer,
            durationMs: performance.now() - started,
          },
          [packageBytes.buffer]
        )
      } else {
        stage(request.id, "hashing")
        const response = await encryptClassicalFile(
          bytes,
          metadata,
          request.algorithm,
          request.key,
          request.rails
        )
        stage(request.id, "verifying")
        const recovered = await decryptClassicalFile(
          response.packageBytes,
          request.key,
          request.rails
        )
        if (recovered.bytes.length !== bytes.length)
          throw new Error("Classical verification failed.")
        stage(request.id, "ready")
        worker.postMessage(
          {
            id: request.id,
            type: "encrypted",
            packageBytes: response.packageBytes.buffer,
            checksum: response.checksum,
            durationMs: performance.now() - started,
          },
          [response.packageBytes.buffer]
        )
      }
      return
    }

    stage(request.id, "reading-package")
    let metadata: FileMetadata
    let recovered: Uint8Array
    if (request.type === "decrypt-secure") {
      const response = await decryptSecureFile(
        new Uint8Array(request.packageBytes),
        request.password,
        (value) => stage(request.id, value)
      )
      metadata = response.metadata
      recovered = response.bytes
    } else if (request.type === "decrypt-classical") {
      stage(request.id, "decrypting")
      const response = await decryptClassicalFile(
        new Uint8Array(request.packageBytes),
        request.key,
        request.rails
      )
      metadata = response.metadata
      recovered = response.bytes
    } else {
      const parsed = parseCipherPixPackage(new Uint8Array(request.packageBytes))
      stage(request.id, "decrypting")
      recovered = caesarDecrypt(
        railFenceDecrypt(parsed.encryptedData, request.rails),
        request.key
      )
      stage(request.id, "verifying")
      if (!(await checksumMatches(recovered, parsed.metadata.originalChecksum)))
        throw new Error(
          "The recovery values are incorrect, or the package is damaged."
        )
      metadata = {
        originalFileName: parsed.metadata.originalFileName,
        originalMimeType: parsed.metadata.originalMimeType,
        originalExtension: parsed.metadata.originalExtension,
        originalSize: parsed.metadata.originalSize,
        encryptedAt: parsed.metadata.encryptedAt,
        ...(parsed.metadata.width && parsed.metadata.height
          ? { width: parsed.metadata.width, height: parsed.metadata.height }
          : {}),
      }
    }
    stage(request.id, "ready")
    worker.postMessage(
      {
        id: request.id,
        type: "decrypted",
        recoveredBytes: recovered.buffer,
        metadata,
        durationMs: performance.now() - started,
      },
      [recovered.buffer]
    )
  } catch (error) {
    worker.postMessage({
      id: request.id,
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "The browser could not process this operation.",
    })
  }
}

export {}
