<div align="center">

# Pixelpaper

**An offline pixel art creator for wallpapers.**

<code>draw · pixelate · export</code> &nbsp; <code>Desktop app · v2.1.0</code>

</div>

Pixelpaper is a small, local pixel art studio for making desktop, phone, and square wallpapers. Draw on a compact grid, bring in a photo, reduce it to pixels, tune the palette, and export a wallpaper-sized PNG.

There is no account, server, sync, subscription, or AI. The public [download page](https://pixelpaper.samhc.us) is a static PWA that can reopen after its first visit without a connection. A downloaded app starts with an empty shelf.

## Download

Download Pixelpaper at [pixelpaper.samhc.us](https://pixelpaper.samhc.us). Stable releases include macOS, Windows, and Linux packages plus SHA-256 checksums. iOS and Android apps are coming soon; the current desktop app is the complete offline studio. macOS and Windows packages are currently unsigned.

## Run locally

Requires Node.js 24 or later:

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`.

The local development build is the studio itself. It does not call a remote API. Imported photos are read in memory, saved walls use local browser storage, and PNG export happens in the renderer.

## Package the desktop app

```bash
npm run desktop:dist
```

The Electron app loads the built interface directly from its package. It has no local API server and makes no network requests. Your saved walls live in the app’s browser storage; imported photos are read in memory and are never uploaded. The renderer does all pixelation and export work locally.

## Pixelation algorithm

Photo import runs in the renderer with the Canvas API. Pixelpaper crops the source to the selected wallpaper ratio, downsamples it to the target grid with nearest-neighbor sampling, builds a compact color palette with median-cut quantization, and maps each pixel to its nearest palette color. Export scales the grid with nearest-neighbor so edges stay crisp. The operation is deterministic and works without an internet connection.

## Verify

```bash
npm run typecheck
npm test
npm run build:app
npm run build:site
npm run test:e2e
npm run test:site
npm run desktop:dist
```

## Project map

- `src/` — React studio and static download page.
- `desktop/` — Electron entrypoint for the packaged offline app.
- `pixel-art/`, `space/`, `ascii-art/`, `ai-generated/` — source examples used by the static page.
- `scripts/build_gallery.mjs` — creates local thumbnails and gallery metadata.
- `scripts/build_service_worker.mjs` — precaches every built static asset for the PWA download page.
- `RELEASE.md` — versioning, release, checksum, and publication procedure.
