<div align="center">

# Pixelpaper

**A cozy pixel art wallpaper studio, created with love by Samuel.**

<code>25 pixel art examples</code> &nbsp; <code>Desktop app · v1.1.0</code>

</div>

Pixelpaper is a focused pixel art app for tiny cities, warm interiors, night markets, and quiet scenes. The public [download page](https://wallpapers.samhc.us) shows Samuel’s examples; every downloaded app starts with a clean shelf for its owner.

## Download

Download the packaged app at [wallpapers.samhc.us](https://wallpapers.samhc.us). Release artifacts include SHA-256 checksums. macOS and Windows packages are currently unsigned.

## Source

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`. See [APP.md](APP.md) for generation, editor, storage, packaging, and verification details.

## Collection

The repository keeps the original source collection under `pixel-art/`, `space/`, `ascii-art/`, and `ai-generated/` for the public example page. Those assets are excluded from the downloaded app payload.
