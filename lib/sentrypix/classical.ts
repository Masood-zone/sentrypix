import {
  caesarDecrypt,
  caesarEncrypt,
  railFenceDecrypt,
  railFenceEncrypt,
  sha256,
  checksumMatches,
} from "./crypto"
import {
  createSpxPackage,
  encodeSpxHeader,
  parseSpxPackage,
  SPX_MAGIC,
  SPX_VERSION,
  type ClassicalAlgorithm,
  type FileMetadata,
} from "./spx-package"

export function classicalEncrypt(
  bytes: Uint8Array,
  algorithm: ClassicalAlgorithm,
  key: number,
  rails: number
): Uint8Array {
  if (algorithm === "CAESAR") return caesarEncrypt(bytes, key)
  if (algorithm === "RAIL_FENCE") return railFenceEncrypt(bytes, rails)
  return railFenceEncrypt(caesarEncrypt(bytes, key), rails)
}

export function classicalDecrypt(
  bytes: Uint8Array,
  algorithm: ClassicalAlgorithm,
  key: number,
  rails: number
): Uint8Array {
  if (algorithm === "CAESAR") return caesarDecrypt(bytes, key)
  if (algorithm === "RAIL_FENCE") return railFenceDecrypt(bytes, rails)
  return caesarDecrypt(railFenceDecrypt(bytes, rails), key)
}

export async function encryptClassicalFile(
  bytes: Uint8Array,
  metadata: FileMetadata,
  algorithm: ClassicalAlgorithm,
  key: number,
  rails: number
): Promise<{ packageBytes: Uint8Array; checksum: string }> {
  const checksum = await sha256(bytes)
  const encrypted = classicalEncrypt(bytes, algorithm, key, rails)
  const headerBytes = encodeSpxHeader({
    ...metadata,
    magic: SPX_MAGIC,
    version: SPX_VERSION,
    mode: "classical",
    algorithm,
    checksumAlgorithm: "SHA-256",
    originalChecksum: checksum,
    payloadLength: encrypted.length,
  })
  return { packageBytes: createSpxPackage(headerBytes, encrypted), checksum }
}

export async function decryptClassicalFile(
  packageBytes: Uint8Array,
  key: number,
  rails: number
): Promise<{ metadata: FileMetadata; bytes: Uint8Array }> {
  const parsed = parseSpxPackage(packageBytes)
  if (parsed.header.mode !== "classical")
    throw new Error("This is not a classical package.")
  const bytes = classicalDecrypt(
    parsed.payload,
    parsed.header.algorithm,
    key,
    rails
  )
  if (!(await checksumMatches(bytes, parsed.header.originalChecksum))) {
    throw new Error(
      "The recovery values are incorrect, or the package is damaged."
    )
  }
  const {
    originalFileName,
    originalMimeType,
    originalExtension,
    originalSize,
    encryptedAt,
    width,
    height,
  } = parsed.header
  if (bytes.length !== originalSize)
    throw new Error("Recovered file size does not match.")
  return {
    metadata: {
      originalFileName,
      originalMimeType,
      originalExtension,
      originalSize,
      encryptedAt,
      ...(width && height ? { width, height } : {}),
    },
    bytes,
  }
}
