import {
  createSpxPackage,
  encodeSecureContent,
  encodeSpxHeader,
  parseSecureContent,
  parseSpxPackage,
  SPX_MAGIC,
  SPX_VERSION,
  type FileMetadata,
} from "./spx-package"

export const SECURE_FAILURE_MESSAGE =
  "Decryption failed. The password may be incorrect, or the encrypted file may have been modified or corrupted."

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  )
}

function unhex(value: string): Uint8Array {
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (pair) =>
    Number.parseInt(pair, 16)
  )
}

export async function deriveSecureKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  if (!password) throw new Error("A password is required.")
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  )
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: Uint8Array.from(salt),
      iterations: 600_000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

export async function encryptSecureFile(
  bytes: Uint8Array,
  metadata: FileMetadata,
  password: string,
  onStage?: (stage: "deriving-key" | "encrypting" | "packaging") => void
): Promise<Uint8Array> {
  const plaintext = encodeSecureContent(metadata, bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  onStage?.("deriving-key")
  const key = await deriveSecureKey(password, salt)
  const headerBytes = encodeSpxHeader({
    magic: SPX_MAGIC,
    version: SPX_VERSION,
    mode: "secure",
    algorithm: "AES-256-GCM",
    kdf: "PBKDF2-HMAC-SHA-256",
    iterations: 600_000,
    salt: hex(salt),
    iv: hex(iv),
    tagLength: 128,
    payloadLength: plaintext.length + 16,
  })
  onStage?.("encrypting")
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: Uint8Array.from(iv),
        additionalData: Uint8Array.from(headerBytes),
        tagLength: 128,
      },
      key,
      Uint8Array.from(plaintext)
    )
  )
  onStage?.("packaging")
  return createSpxPackage(headerBytes, encrypted)
}

export async function decryptSecureFile(
  packageBytes: Uint8Array,
  password: string,
  onStage?: (stage: "deriving-key" | "authenticating" | "restoring") => void
): Promise<{ metadata: FileMetadata; bytes: Uint8Array }> {
  try {
    const parsed = parseSpxPackage(packageBytes)
    if (parsed.header.mode !== "secure")
      throw new Error("Not a secure package.")
    onStage?.("deriving-key")
    const key = await deriveSecureKey(password, unhex(parsed.header.salt))
    onStage?.("authenticating")
    const plain = new Uint8Array(
      await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: Uint8Array.from(unhex(parsed.header.iv)),
          additionalData: Uint8Array.from(parsed.headerBytes),
          tagLength: parsed.header.tagLength,
        },
        key,
        Uint8Array.from(parsed.payload)
      )
    )
    onStage?.("restoring")
    return parseSecureContent(plain)
  } catch {
    throw new Error(SECURE_FAILURE_MESSAGE)
  }
}
