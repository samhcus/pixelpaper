# Pixelpaper v2

Pixelpaper is an offline pixel art studio. It is deliberately small: blank canvases, photo pixelation, a few useful tools, local saves, and PNG export.

## Create

- Desktop: 128 × 72
- Phone: 72 × 128
- Square: 96 × 96
- Pencil, eraser, fill, and color picker
- Undo and redo
- Four curated palettes
- Nearest-neighbor preview and zoom
- Local shelf saves
- PNG export (nearest-neighbor upscaled)

## Pixelate a photo

Drop in or choose a PNG, JPG, WEBP, or GIF up to 15 MB. Pixelpaper processes it locally with Canvas: crop to the selected ratio, downsample to the pixel grid, median-cut color quantization, then nearest-palette mapping. No upload occurs and no AI is involved.

## Offline boundary

The desktop app contains no Express server, AI provider, generation endpoint, or remote runtime dependency. Electron loads the bundled Vite build from disk with `contextIsolation`, `sandbox`, and `nodeIntegration: false`. Pixelation, editing, local saves, and PNG export all run in the renderer. The public site is a separate static download page with a generated service-worker cache for its built assets. Agents can use the dependency-free JSONL bridge described in [AGENT_API.md](AGENT_API.md).

The offline boundary is intentional: the app does not sync drafts, upload photos, fetch examples, or contact a generation service. The shelf uses browser storage inside the app profile, so clearing that profile removes its local drafts.

## Local development

```bash
npm ci
npm run dev
```

## Packaging

```bash
npm run desktop:dist
```

Artifacts are written to `artifacts/`. The public release page is [pixelpaper.samhc.us](https://pixelpaper.samhc.us).

## Release source of truth

The version in `package.json` is the release version. `src/DownloadPage.tsx` reads that value for the public version badge and footer. See [RELEASE.md](RELEASE.md) for the tag, GitHub Actions, asset, checksum, and publication flow.
