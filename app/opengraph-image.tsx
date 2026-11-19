/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

export const alt = "SentryPix — protect confidential files before transfer"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OpenGraphImage() {
  const artwork = await readFile(
    join(process.cwd(), "public", "android-chrome-192x192.png"),
    "base64"
  )
  const artworkSource = `data:image/png;base64,${artwork}`
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "#112743",
        color: "white",
        display: "flex",
        height: "100%",
        padding: "72px",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
        <div
          style={{
            alignItems: "center",
            display: "flex",
            fontSize: 34,
            fontWeight: 700,
          }}
        >
          <img
            src={artworkSource}
            alt=""
            width={64}
            height={64}
            style={{ marginRight: 20 }}
          />
          SentryPix
        </div>
        <div
          style={{
            fontSize: 65,
            fontWeight: 800,
            letterSpacing: "-2px",
            lineHeight: 1.08,
            marginTop: 56,
            maxWidth: "950px",
          }}
        >
          Protect confidential files before transfer.
        </div>
        <div
          style={{
            color: "#c8daee",
            fontSize: 27,
            lineHeight: 1.4,
            marginTop: 28,
          }}
        >
          Browser-local encryption · AES-256-GCM · .spx packages
        </div>
        <div
          style={{
            borderTop: "1px solid #41617d",
            color: "#a9c1d9",
            display: "flex",
            fontSize: 20,
            marginTop: 65,
            paddingTop: 24,
          }}
        >
          A file-protection layer for your existing communication channels.
        </div>
      </div>
    </div>,
    size
  )
}
