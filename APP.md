# Pixelpaper v2

Pixelpaper is an offline pixel art creator for wallpapers. It is deliberately small: blank canvases, photo pixelation, a few useful tools, local saves, and PNG export.

## Create

- Desktop: 128 × 72
- Phone: 72 × 128
- Square: 96 × 96
- Pencil, eraser, fill, and color picker
- Undo and redo
- Four curated palettes
- Nearest-neighbor preview and zoom
- Local shelf saves
- Wallpaper-sized PNG export (nearest-neighbor upscaled)

## Pixelate a photo

Drop in or choose a PNG, JPG, WEBP, or GIF up to 15 MB. Pixelpaper processes it locally with Canvas: crop to the selected ratio, downsample to the pixel grid, median-cut color quantization, then nearest-palette mapping. No upload occurs and no AI is involved.

## Offline boundary

The desktop app contains no Express server, AI provider, generation endpoint, or remote runtime dependency. Electron loads the bundled Vite build from disk with `contextIsolation`, `sandbox`, and `nodeIntegration: false`. The public site is a separate static download page.

## Local development

```bash
npm ci
npm run dev
```

## Packaging

```bash
npm run desktop:dist
```

Artifacts are written to `artifacts/`. The public release page is [wallpapers.samhc.us](https://wallpapers.samhc.us).
