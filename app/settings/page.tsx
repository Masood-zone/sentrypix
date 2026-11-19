"use client"

import {
  MonitorCog,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from "lucide-react"
import { useTheme } from "next-themes"
import { toast } from "sonner"

import { Notice, PageHero } from "@/components/sentrypix/ui"
import { Button } from "@/components/ui/button"
import { useHistoryStore } from "@/stores/history-store"
import {
  defaultSettings,
  type ThemePreference,
  useSettingsStore,
} from "@/stores/settings-store"

export default function SettingsPage() {
  const settings = useSettingsStore()
  const clearHistory = useHistoryStore((state) => state.clear)
  const { setTheme } = useTheme()
  function updateTheme(theme: ThemePreference) {
    settings.update({ theme })
    setTheme(theme)
  }
  return (
    <>
      <PageHero
        eyebrow="Local preferences"
        title="Settings"
        description="Set appearance, the maximum file size, classical learning defaults and local history. No file contents or passwords are stored here."
      />
      <section className="page-container grid gap-5 pb-12 lg:grid-cols-2">
        <div className="surface-card">
          <div className="flex items-center gap-2">
            <MonitorCog className="text-primary" />
            <h2 className="text-xl font-bold">Appearance</h2>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {(["light", "dark", "system"] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                aria-pressed={settings.theme === theme}
                className={`rounded-md border px-3 py-3 text-sm font-semibold capitalize ${settings.theme === theme ? "border-primary bg-secondary" : "bg-card"}`}
                onClick={() => updateTheme(theme)}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>
        <div className="surface-card">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="text-primary" />
            <h2 className="text-xl font-bold">File and classical defaults</h2>
          </div>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="label">Maximum original file size</span>
              <select
                className="field"
                value={settings.maxFileSizeMb}
                onChange={(event) =>
                  settings.update({ maxFileSizeMb: Number(event.target.value) })
                }
              >
                <option value="5">5 MB</option>
                <option value="10">10 MB</option>
                <option value="20">20 MB</option>
              </select>
            </label>
            <label className="block">
              <span className="label">Default Rail Fence rails</span>
              <select
                className="field"
                value={settings.defaultRails}
                onChange={(event) =>
                  settings.update({ defaultRails: Number(event.target.value) })
                }
              >
                {Array.from({ length: 9 }, (_, index) => index + 2).map(
                  (value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  )
                )}
              </select>
            </label>
            <Toggle
              label="Generate Caesar key automatically"
              checked={settings.generateKeyAutomatically}
              onChange={(value) =>
                settings.update({ generateKeyAutomatically: value })
              }
            />
            <Toggle
              label="Confirm classical recovery settings before encryption"
              checked={settings.showSaveConfirmation}
              onChange={(value) =>
                settings.update({ showSaveConfirmation: value })
              }
            />
            <Toggle
              label="Include package filename in classical recovery note"
              checked={settings.recoveryMetadata}
              onChange={(value) => settings.update({ recoveryMetadata: value })}
            />
          </div>
        </div>
        <div className="surface-card">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-primary" />
            <h2 className="text-xl font-bold">Privacy</h2>
          </div>
          <div className="mt-5 space-y-4">
            <Toggle
              label="Store local activity history"
              checked={settings.storeHistory}
              onChange={(value) => settings.update({ storeHistory: value })}
            />
            <Button
              variant="outline"
              onClick={() => {
                clearHistory()
                toast.success("Local history cleared")
              }}
            >
              <Trash2 /> Clear local history
            </Button>
          </div>
        </div>
        <div className="space-y-5">
          <Notice title="Cryptographic defaults are fixed">
            Secure Mode uses PBKDF2 and AES-256-GCM with fresh random values.
            These parameters are kept out of the ordinary file workflow.
          </Notice>
          <Notice tone="warning" title="Classical settings are educational">
            Caesar and Rail Fence defaults cannot make Classical Mode suitable
            for confidential files.
          </Notice>
          <Button
            variant="outline"
            onClick={() => {
              settings.reset()
              setTheme(defaultSettings.theme)
              toast.success("Settings reset")
            }}
          >
            <RotateCcw /> Reset settings
          </Button>
        </div>
      </section>
    </>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border p-4">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="checkbox"
        className="size-5"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  )
}
