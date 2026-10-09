# Pixelpaper

[Pixelpaper](https://wallpapers.samhc.us) is a small, local-first pixel art wallpaper studio created with love by Samuel. The public site is a static download home and Samuel’s example library. A downloaded app starts with a fresh, empty shelf.

## Download

Use the platform links on [wallpapers.samhc.us](https://wallpapers.samhc.us). Version 1.1.0 ships macOS, Windows, and Linux packages. Releases include `SHA256SUMS.txt`; macOS and Windows packages are currently unsigned and may require a first-launch confirmation.

## Run locally

Requires Node.js 24 or later:

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`. For the production server:

```bash
npm run build:app
npm start
```

The server binds to loopback only. It writes generation jobs and generated files to `.data/` (or `DATA_DIR`) and stops when the desktop app closes.

## Pixel generation

Pixelpaper uses the free, anonymous [AI Horde](https://aihorde.net/) volunteer queue only after the user submits a description. The server rejects photo, 3D, vector, and painting directions and adds a pixel-art constraint before submission. Prompts are shared by AI Horde; do not submit private information. Queue time and availability are not guaranteed.

## Editor

Every generated image opens in a low-resolution editor. Users can also start a blank desktop, phone, or square canvas. The editor uses nearest-neighbor pixels and includes pencil, eraser, fill, color picker, a warm palette, undo/redo, zoom, local shelf saves, and PNG export. Saved walls stay in the app’s local browser data; the public example library is never seeded into a downloaded instance.

## Packaging

```bash
npm run desktop:dist
```

The Electron package uses an allowlisted app payload, an ASAR archive with the server unpacked for startup, a sandboxed renderer, loopback-only server, strict navigation allowlist, and a restrictive CSP. Artifacts are written to `artifacts/`.

## Verify

```bash
npm run typecheck
npm test
npm run test:e2e
npm run test:site
```
