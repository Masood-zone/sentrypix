import { z } from "zod"

import type { RecoveryNote } from "./types"
import type { ClassicalAlgorithm } from "./spx-package"

export const recoveryNoteSchema = z.object({
  type: z.literal("CipherPix Recovery Note"),
  version: z.literal(1),
  encryptedFileName: z.string().min(1).optional(),
  caesarKey: z.number().int().min(1).max(255),
  railFenceRails: z.number().int().min(2).max(10),
  createdAt: z.string().datetime().optional(),
  instructions: z.string().min(1),
})

export function createRecoveryNote(
  caesarKey: number,
  railFenceRails: number,
  encryptedFileName: string,
  includeMetadata: boolean
): RecoveryNote {
  return recoveryNoteSchema.parse({
    type: "CipherPix Recovery Note",
    version: 1,
    ...(includeMetadata
      ? { encryptedFileName, createdAt: new Date().toISOString() }
      : {}),
    caesarKey,
    railFenceRails,
    instructions:
      "Upload the .cpx file to CipherPix and import this recovery note.",
  })
}

export function parseRecoveryNote(value: string): RecoveryNote {
  let unknownNote: unknown
  try {
    unknownNote = JSON.parse(value)
  } catch {
    throw new Error("This recovery note is not valid JSON.")
  }
  const result = recoveryNoteSchema.safeParse(unknownNote)
  if (!result.success)
    throw new Error("This is not a valid CipherPix recovery note.")
  return result.data
}

export function serializeRecoveryNote(note: RecoveryNote): string {
  return JSON.stringify(recoveryNoteSchema.parse(note), null, 2)
}

export const spxRecoveryNoteSchema = z
  .object({
    type: z.literal("SentryPix Classical Recovery Note"),
    version: z.literal(1),
    encryptedFileName: z.string().min(1).optional(),
    algorithm: z.enum(["CAESAR", "RAIL_FENCE", "CAESAR_RAIL_FENCE"]),
    caesarKey: z.number().int().min(1).max(255).optional(),
    railFenceRails: z.number().int().min(2).max(10).optional(),
  })
  .superRefine((note, context) => {
    if (note.algorithm !== "RAIL_FENCE" && note.caesarKey === undefined)
      context.addIssue({
        code: "custom",
        path: ["caesarKey"],
        message: "Caesar key is required.",
      })
    if (note.algorithm !== "CAESAR" && note.railFenceRails === undefined)
      context.addIssue({
        code: "custom",
        path: ["railFenceRails"],
        message: "Rail Fence rails are required.",
      })
  })
export type SpxRecoveryNote = z.infer<typeof spxRecoveryNoteSchema>

export function createSpxRecoveryNote(
  encryptedFileName: string,
  algorithm: ClassicalAlgorithm,
  caesarKey: number,
  railFenceRails: number,
  includeMetadata = true
): SpxRecoveryNote {
  return spxRecoveryNoteSchema.parse({
    type: "SentryPix Classical Recovery Note",
    version: 1,
    ...(includeMetadata ? { encryptedFileName } : {}),
    algorithm,
    ...(algorithm !== "RAIL_FENCE" ? { caesarKey } : {}),
    ...(algorithm !== "CAESAR" ? { railFenceRails } : {}),
  })
}

export function parseSpxRecoveryNote(value: string): SpxRecoveryNote {
  let unknown: unknown
  try {
    unknown = JSON.parse(value)
  } catch {
    throw new Error("This recovery note is not valid JSON.")
  }
  const result = spxRecoveryNoteSchema.safeParse(unknown)
  if (!result.success)
    throw new Error("This is not a valid SentryPix recovery note.")
  return result.data
}
