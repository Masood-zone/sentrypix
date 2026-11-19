# SentryPix

**Browser-Based File Encryption & Cryptography System**

SentryPix protects confidential files before they are transferred through an organization's existing email, intranet, cloud drive, or messaging platform. A sender encrypts a file locally, downloads a `.spx` package, transfers it normally, and shares the password separately. The recipient uses SentryPix to restore the original file. Classical Mode remains available for cryptography learning; it is not suitable for sensitive information.

## Run and verify

The app uses Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Zustand, Zod, Web Workers, Web Crypto and Vitest. There is no database, authentication, file-upload API, or cloud file store.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. Production SEO uses `NEXT_PUBLIC_SITE_URL=https://your-domain.example` when building. Optional search verification values are `GOOGLE_SITE_VERIFICATION` and `BING_SITE_VERIFICATION`.

Run these commands from this `sentrypix` app directory. After adding or moving App Router pages, restart an already-running development server if it still serves a 404 for `/encrypt/result` or `/decrypt/result`. Both result routes are included in the production build; refreshing a result page shows a temporary-result message because packages and restored files remain in memory only.

```bash
pnpm typecheck
pnpm lint
pnpm test:run
pnpm build
```

## Modes

Secure Mode is the default. The browser's native Web Crypto API uses PBKDF2-HMAC-SHA-256 with 600,000 iterations, a fresh 16-byte random salt, and a non-extractable 256-bit AES-GCM key. Every operation gets a fresh 12-byte IV and a 128-bit authentication tag. Public package-header bytes are authenticated as AES-GCM additional data. A wrong password or changed authenticated data causes decryption to fail. These choices do not remove the need for a strong, unique password, a trustworthy browser/device, and a separate channel for exchanging that password.

Classical Mode offers Caesar substitution, Rail Fence transposition and their hybrid. SHA-256 checks recovered bytes against a checksum in the package. This check does **not** make the classical algorithms secure. Classical `.spx` packages need an external `.spx-key.json` recovery note or manually entered values.

## `.spx` version 1 format

```text
0       4 bytes    ASCII SPX1 magic
4       1 byte     package version 1
5       4 bytes    big-endian JSON header length
9       variable   UTF-8 JSON header, bounded to 64 KiB
...     remaining  encrypted payload, exact length checked
```

The Secure header contains the mode, algorithm, PBKDF2 parameters, salt, IV, tag length and payload length. The original filename, MIME type, extension, size, date, optional image dimensions, and file bytes are encrypted together inside the payload. The header is not encrypted, but its exact bytes are authenticated. The package never contains the password or derived AES key.

Classical headers contain restoration metadata and SHA-256 checksum in plaintext. Recovery values remain in a separate note. Zod validates headers and inner file metadata; parsers bound lengths and reject unsupported versions and malformed packages. Arbitrary non-empty file formats are accepted within the configurable 5, 10 or 20 MB original-file limit. Supported examples include PDF, DOCX, XLSX, PPTX, images, ZIP, text, audio, video and source code.

## Legacy compatibility and local privacy

Old CipherPix `.cpx` packages are recognized by `CPX1` and can still be decrypted using their Caesar key, Rail Fence rails, or original `.cpx-key.json` note. The old parser and note schema remain in the codebase for compatibility; new downloads use `.spx`.

`workers/cipher.worker.ts` performs derivation and transformations away from the UI thread. `stores/workflow-store.ts` holds temporary results in memory, while settings and activity summaries may use localStorage. History can include filename, operation, mode, file size, result, processing time and date; it never includes passwords, keys, file contents, packages or recovery notes. Result data is lost on refresh by design.

The app has Home, Encrypt, Decrypt, Algorithms, Security, Guide, History, Settings and About routes. The Security page describes browser and recipient limitations without absolute security claims.
