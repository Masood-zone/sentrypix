import { describe, expect, it } from "vitest"

import {
  decryptClassicalFile,
  encryptClassicalFile,
} from "@/lib/sentrypix/classical"
import {
  deriveSecureKey,
  decryptSecureFile,
  encryptSecureFile,
  SECURE_FAILURE_MESSAGE,
} from "@/lib/sentrypix/secure"
import {
  createSpxRecoveryNote,
  parseSpxRecoveryNote,
} from "@/lib/sentrypix/recovery"
import {
  createSpxPackage,
  encodeSpxHeader,
  parseSpxPackage,
  SPX_MAGIC,
  SPX_VERSION,
  type FileMetadata,
} from "@/lib/sentrypix/spx-package"

const password = "a-unique-test-password-2026"
const bytes = Uint8Array.of(0, 1, 2, 80, 75, 255, 17, 42)
const metadata: FileMetadata = {
  originalFileName: "financial-report.xlsx",
  originalMimeType: "application/octet-stream",
  originalExtension: "xlsx",
  originalSize: bytes.length,
  encryptedAt: "2026-09-15T12:00:00.000Z",
}

describe("SentryPix secure packages", () => {
  it("derives a non-extractable AES-256 key and restores exact file bytes", async () => {
    const key = await deriveSecureKey(
      password,
      Uint8Array.from({ length: 16 }, (_, index) => index)
    )
    expect(key.algorithm).toMatchObject({ name: "AES-GCM", length: 256 })
    expect(key.extractable).toBe(false)
    const packageBytes = await encryptSecureFile(bytes, metadata, password)
    const parsed = parseSpxPackage(packageBytes)
    expect(parsed.header.mode).toBe("secure")
    expect(JSON.stringify(parsed.header)).not.toContain(
      metadata.originalFileName
    )
    await expect(decryptSecureFile(packageBytes, password)).resolves.toEqual({
      metadata,
      bytes,
    })
  })

  it("uses fresh salt and IV values for repeated encryption", async () => {
    const first = parseSpxPackage(
      await encryptSecureFile(bytes, metadata, password)
    )
    const second = parseSpxPackage(
      await encryptSecureFile(bytes, metadata, password)
    )
    if (first.header.mode !== "secure" || second.header.mode !== "secure")
      throw new Error("Wrong package mode")
    expect(first.header.salt).not.toBe(second.header.salt)
    expect(first.header.iv).not.toBe(second.header.iv)
    expect(first.payload).not.toEqual(second.payload)
  })

  it("rejects wrong passwords, changed ciphertext and changed authenticated headers", async () => {
    const original = await encryptSecureFile(bytes, metadata, password)
    await expect(
      decryptSecureFile(original, "incorrect-password")
    ).rejects.toThrow(SECURE_FAILURE_MESSAGE)
    const tampered = original.slice()
    tampered[tampered.length - 1] ^= 1
    await expect(decryptSecureFile(tampered, password)).rejects.toThrow(
      SECURE_FAILURE_MESSAGE
    )
    const parsed = parseSpxPackage(original)
    if (parsed.header.mode !== "secure") throw new Error("Wrong package mode")
    const changedHeader = encodeSpxHeader({
      ...parsed.header,
      salt: `${parsed.header.salt[0] === "a" ? "b" : "a"}${parsed.header.salt.slice(1)}`,
    })
    await expect(
      decryptSecureFile(
        createSpxPackage(changedHeader, parsed.payload),
        password
      )
    ).rejects.toThrow(SECURE_FAILURE_MESSAGE)
  })
})

describe("SentryPix package validation and classical modes", () => {
  it.each(["CAESAR", "RAIL_FENCE", "CAESAR_RAIL_FENCE"] as const)(
    "round-trips %s without changing original bytes",
    async (algorithm) => {
      const original = bytes.slice()
      const result = await encryptClassicalFile(
        bytes,
        metadata,
        algorithm,
        47,
        3
      )
      const recovered = await decryptClassicalFile(result.packageBytes, 47, 3)
      expect(recovered).toEqual({ metadata, bytes })
      expect(bytes).toEqual(original)
    }
  )

  it("rejects invalid magic, versions, metadata and payload lengths", async () => {
    const valid = await encryptSecureFile(bytes, metadata, password)
    const wrongMagic = valid.slice()
    wrongMagic[0] = 0
    const wrongVersion = valid.slice()
    wrongVersion[4] = 2
    const badLength = valid.slice()
    new DataView(badLength.buffer).setUint32(5, 0xffffffff, false)
    const truncated = valid.slice(0, -1)
    expect(() => parseSpxPackage(wrongMagic)).toThrow("not a SentryPix")
    expect(() => parseSpxPackage(wrongVersion)).toThrow("Unsupported")
    expect(() => parseSpxPackage(badLength)).toThrow("length")
    expect(() => parseSpxPackage(truncated)).toThrow("length")
    const parsed = parseSpxPackage(valid)
    if (parsed.header.mode !== "secure") throw new Error("Wrong package mode")
    const malformed = encodeSpxHeader({
      ...parsed.header,
      magic: SPX_MAGIC,
      version: SPX_VERSION,
    })
    const malformedJson = malformed.slice()
    malformedJson[9] = 0xff
    const invalid = new Uint8Array(malformedJson.length + parsed.payload.length)
    invalid.set(malformedJson)
    invalid.set(parsed.payload, malformedJson.length)
    expect(() => parseSpxPackage(invalid)).toThrow("Malformed")
    const wrongMetadata = { ...parsed.header, iterations: 1 }
    const json = new TextEncoder().encode(JSON.stringify(wrongMetadata))
    const invalidHeader = new Uint8Array(
      9 + json.length + parsed.payload.length
    )
    invalidHeader.set(new TextEncoder().encode(SPX_MAGIC), 0)
    invalidHeader[4] = SPX_VERSION
    new DataView(invalidHeader.buffer).setUint32(5, json.length, false)
    invalidHeader.set(json, 9)
    invalidHeader.set(parsed.payload, 9 + json.length)
    expect(() => parseSpxPackage(invalidHeader)).toThrow(
      "Invalid SentryPix package metadata"
    )
  })

  it("records only the recovery values required by the selected classical algorithm", () => {
    const caesar = createSpxRecoveryNote("example.spx", "CAESAR", 47, 3)
    const rails = createSpxRecoveryNote("example.spx", "RAIL_FENCE", 47, 3)
    expect(caesar.railFenceRails).toBeUndefined()
    expect(rails.caesarKey).toBeUndefined()
    expect(parseSpxRecoveryNote(JSON.stringify(rails))).toEqual(rails)
    expect(() =>
      parseSpxRecoveryNote(
        JSON.stringify({ ...rails, railFenceRails: undefined })
      )
    ).toThrow()
  })
})
