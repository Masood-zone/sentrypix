"use client"

import { create } from "zustand"

import type { ProcessingStage, RecoveryNote } from "@/lib/sentrypix/types"
import type {
  ClassicalAlgorithm,
  FileMetadata,
} from "@/lib/sentrypix/spx-package"

export interface EncryptionResult {
  packageBlob: Blob
  recoveryBlob?: Blob
  encryptedFileName: string
  recoveryFileName?: string
  originalFileName: string
  originalSize: number
  encryptedSize: number
  mode: "secure" | "classical"
  algorithm: "AES-256-GCM" | ClassicalAlgorithm
  key?: number
  rails?: number
  durationMs: number
  checksum?: string
  integrityVerified: true
}

interface EncryptionState {
  result: EncryptionResult | null
  stage: ProcessingStage | null
  setStage: (stage: ProcessingStage | null) => void
  setResult: (result: EncryptionResult) => void
  reset: () => void
}

export const useEncryptionStore = create<EncryptionState>((set) => ({
  result: null,
  stage: null,
  setStage: (stage) => set({ stage }),
  setResult: (result) => set({ result, stage: "ready" }),
  reset: () => set({ result: null, stage: null }),
}))

export interface DecryptionResult {
  blob: Blob
  previewUrl: string
  metadata: FileMetadata
  mode: "secure" | "classical" | "legacy"
  durationMs: number
  integrityVerified: true
}

interface DecryptionState {
  result: DecryptionResult | null
  packageMetadata: FileMetadata | null
  recoveryNote: RecoveryNote | null
  stage: ProcessingStage | null
  setStage: (stage: ProcessingStage | null) => void
  setPackageMetadata: (metadata: FileMetadata | null) => void
  setRecoveryNote: (note: RecoveryNote | null) => void
  setResult: (result: DecryptionResult) => void
  reset: () => void
}

export const useDecryptionStore = create<DecryptionState>((set, get) => ({
  result: null,
  packageMetadata: null,
  recoveryNote: null,
  stage: null,
  setStage: (stage) => set({ stage }),
  setPackageMetadata: (packageMetadata) => set({ packageMetadata }),
  setRecoveryNote: (recoveryNote) => set({ recoveryNote }),
  setResult: (result) => {
    const previous = get().result
    if (previous) URL.revokeObjectURL(previous.previewUrl)
    set({ result, stage: "ready" })
  },
  reset: () => {
    const result = get().result
    if (result) URL.revokeObjectURL(result.previewUrl)
    set({
      result: null,
      packageMetadata: null,
      recoveryNote: null,
      stage: null,
    })
  },
}))
