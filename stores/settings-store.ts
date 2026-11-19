"use client"

import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export type ThemePreference = "light" | "dark" | "system"

interface SettingsState {
  theme: ThemePreference
  generateKeyAutomatically: boolean
  defaultRails: number
  verifyBeforeDownload: true
  showSaveConfirmation: boolean
  maxFileSizeMb: number
  storeHistory: boolean
  clearTemporaryPreviews: boolean
  recoveryMetadata: boolean
  clearAfterDownloads: boolean
  update: (settings: Partial<Omit<SettingsState, "update" | "reset">>) => void
  reset: () => void
}

export const defaultSettings = {
  theme: "system" as const,
  generateKeyAutomatically: true,
  defaultRails: 3,
  verifyBeforeDownload: true as const,
  showSaveConfirmation: true,
  maxFileSizeMb: 20,
  storeHistory: true,
  clearTemporaryPreviews: true,
  recoveryMetadata: true,
  clearAfterDownloads: false,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      update: (settings) => set(settings),
      reset: () => set(defaultSettings),
    }),
    {
      name: "cipherpix-settings-v1",
      version: 2,
      migrate: (persisted) => {
        const old = persisted as Partial<SettingsState> & {
          maxImageSizeMb?: number
        }
        return {
          ...old,
          maxFileSizeMb: old.maxFileSizeMb ?? old.maxImageSizeMb ?? 20,
        }
      },
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        generateKeyAutomatically: state.generateKeyAutomatically,
        defaultRails: state.defaultRails,
        verifyBeforeDownload: state.verifyBeforeDownload,
        showSaveConfirmation: state.showSaveConfirmation,
        maxFileSizeMb: state.maxFileSizeMb,
        storeHistory: state.storeHistory,
        clearTemporaryPreviews: state.clearTemporaryPreviews,
        recoveryMetadata: state.recoveryMetadata,
        clearAfterDownloads: state.clearAfterDownloads,
      }),
    }
  )
)
