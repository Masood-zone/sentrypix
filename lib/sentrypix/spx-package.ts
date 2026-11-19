import { z } from "zod"

export const SPX_MAGIC = "SPX1"
export const SPX_VERSION = 1 as const
export const SPX_MIME_TYPE = "application/x-sentrypix"
export const SPX_HEADER_SIZE = 9
const MAX_HEADER_LENGTH = 64 * 1024
const MAX_INNER_METADATA_LENGTH = 64 * 1024

export const fileMetadataSchema = z.object({
  originalFileName: z.string().min(1).max(255),
  originalMimeType: z.string().min(1).max(255),
  originalExtension: z.string().max(32),
  originalSize: z
    .number()
    .int()
    .positive()
    .max(20 * 1024 * 1024),
  encryptedAt: z.string().datetime(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
})

const secureHeaderSchema = z.object({
  magic: z.literal(SPX_MAGIC),
  version: z.literal(SPX_VERSION),
  mode: z.literal("secure"),
  algorithm: z.literal("AES-256-GCM"),
  kdf: z.literal("PBKDF2-HMAC-SHA-256"),
  iterations: z.literal(600_000),
  salt: z.string().regex(/^[a-f0-9]{32}$/),
  iv: z.string().regex(/^[a-f0-9]{24}$/),
  tagLength: z.literal(128),
  payloadLength: z
    .number()
    .int()
    .min(17)
    .max(21 * 1024 * 1024),
})

const classicalHeaderSchema = fileMetadataSchema.extend({
  magic: z.literal(SPX_MAGIC),
  version: z.literal(SPX_VERSION),
  mode: z.literal("classical"),
  algorithm: z.enum(["CAESAR", "RAIL_FENCE", "CAESAR_RAIL_FENCE"]),
  checksumAlgorithm: z.literal("SHA-256"),
  originalChecksum: z.string().regex(/^[a-f0-9]{64}$/),
  payloadLength: z
    .number()
    .int()
    .positive()
    .max(20 * 1024 * 1024),
})

export const spxHeaderSchema = z.discriminatedUnion("mode", [
  secureHeaderSchema,
  classicalHeaderSchema,
])
export type SpxHeader = z.infer<typeof spxHeaderSchema>
export type FileMetadata = z.infer<typeof fileMetadataSchema>
export type ClassicalAlgorithm = Extract<
  SpxHeader,
  { mode: "classical" }
>["algorithm"]

function encodeLengthPrefixedMetadata(
  metadata: object,
  limit: number
): Uint8Array {
  const bytes = new TextEncoder().encode(JSON.stringify(metadata))
  if (!bytes.length || bytes.length > limit)
    throw new Error("Package metadata is too large.")
  const output = new Uint8Array(4 + bytes.length)
  new DataView(output.buffer).setUint32(0, bytes.length, false)
  output.set(bytes, 4)
  return output
}

export function encodeSpxHeader(header: SpxHeader): Uint8Array {
  const valid = spxHeaderSchema.parse(header)
  const metadata = encodeLengthPrefixedMetadata(valid, MAX_HEADER_LENGTH)
  const output = new Uint8Array(5 + metadata.length)
  output.set(new TextEncoder().encode(SPX_MAGIC), 0)
  output[4] = SPX_VERSION
  output.set(metadata, 5)
  return output
}

export function createSpxPackage(
  headerBytes: Uint8Array,
  payload: Uint8Array
): Uint8Array {
  if (!payload.length) throw new Error("Encrypted payload is missing.")
  const output = new Uint8Array(headerBytes.length + payload.length)
  output.set(headerBytes, 0)
  output.set(payload, headerBytes.length)
  parseSpxPackage(output)
  return output
}

export function parseSpxPackage(input: Uint8Array): {
  header: SpxHeader
  headerBytes: Uint8Array
  payload: Uint8Array
} {
  if (input.length < SPX_HEADER_SIZE)
    throw new Error("This SentryPix package is incomplete.")
  const magic = new TextDecoder().decode(input.subarray(0, 4))
  if (magic !== SPX_MAGIC) throw new Error("This is not a SentryPix package.")
  if (input[4] !== SPX_VERSION)
    throw new Error("Unsupported SentryPix package version.")
  const length = new DataView(
    input.buffer,
    input.byteOffset,
    input.byteLength
  ).getUint32(5, false)
  if (
    !length ||
    length > MAX_HEADER_LENGTH ||
    SPX_HEADER_SIZE + length >= input.length
  ) {
    throw new Error("Invalid SentryPix package length.")
  }
  const payloadStart = SPX_HEADER_SIZE + length
  let unknown: unknown
  try {
    unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        input.subarray(SPX_HEADER_SIZE, payloadStart)
      )
    )
  } catch {
    throw new Error("Malformed SentryPix package metadata.")
  }
  const result = spxHeaderSchema.safeParse(unknown)
  if (!result.success) throw new Error("Invalid SentryPix package metadata.")
  const payload = input.slice(payloadStart)
  if (result.data.payloadLength !== payload.length) {
    throw new Error("Encrypted payload length does not match package metadata.")
  }
  return {
    header: result.data,
    headerBytes: input.slice(0, payloadStart),
    payload,
  }
}

export function encodeSecureContent(
  metadata: FileMetadata,
  bytes: Uint8Array
): Uint8Array {
  const valid = fileMetadataSchema.parse(metadata)
  if (valid.originalSize !== bytes.length)
    throw new Error("Original file size does not match.")
  const prefix = encodeLengthPrefixedMetadata(valid, MAX_INNER_METADATA_LENGTH)
  const output = new Uint8Array(prefix.length + bytes.length)
  output.set(prefix)
  output.set(bytes, prefix.length)
  return output
}

export function parseSecureContent(input: Uint8Array): {
  metadata: FileMetadata
  bytes: Uint8Array
} {
  if (input.length < 5) throw new Error("Decrypted content is incomplete.")
  const length = new DataView(
    input.buffer,
    input.byteOffset,
    input.byteLength
  ).getUint32(0, false)
  if (
    !length ||
    length > MAX_INNER_METADATA_LENGTH ||
    4 + length >= input.length
  ) {
    throw new Error("Invalid decrypted metadata length.")
  }
  let unknown: unknown
  try {
    unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        input.subarray(4, 4 + length)
      )
    )
  } catch {
    throw new Error("Malformed decrypted metadata.")
  }
  const result = fileMetadataSchema.safeParse(unknown)
  if (!result.success) throw new Error("Invalid decrypted metadata.")
  const bytes = input.slice(4 + length)
  if (bytes.length !== result.data.originalSize)
    throw new Error("Decrypted file size does not match.")
  return { metadata: result.data, bytes }
}
