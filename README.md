<div align="center">

# Pixelpaper

**An offline pixel art creator for wallpapers.**

<code>draw · pixelate · export</code> &nbsp; <code>Desktop app · v2.0.1</code>

</div>

Pixelpaper is a small, local pixel art studio for making desktop, phone, and square wallpapers. Draw on a compact grid, bring in a photo, reduce it to pixels, tune the palette, and export a wallpaper-sized PNG.

There is no account, server, sync, subscription, or AI. The public [download page](https://pixelpaper.samhc.us) is only a static home for the app and Samuel’s example library. A downloaded app starts with an empty shelf.

## Download

Download Pixelpaper at [pixelpaper.samhc.us](https://pixelpaper.samhc.us). Release packages include SHA-256 checksums. macOS and Windows packages are currently unsigned.

## Run locally

Requires Node.js 24 or later:

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`.

## Package the desktop app

```bash
npm run desktop:dist
```

The Electron app loads the built interface directly from its package. It has no local API server and makes no network requests. Your saved walls live in the app’s browser storage; imported photos are read in memory and are never uploaded.

## Pixelation algorithm

Photo import runs in the renderer with the Canvas API. Pixelpaper crops the source to the selected wallpaper ratio, downsamples it to the target grid with nearest-neighbor sampling, builds a compact color palette with median-cut quantization, and maps each pixel to its nearest palette color. Export scales the grid with nearest-neighbor so edges stay crisp. The operation is deterministic and works without an internet connection.

## Verify

```bash
npm run typecheck
npm test
npm run test:e2e
npm run test:site
npm run desktop:dist
```
