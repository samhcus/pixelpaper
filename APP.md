# Wallpapers

The public site at `wallpapers.samhc.us` is a static download home. It does not run
the generator or store user data. The downloadable desktop app includes the gallery,
the describe-a-new-image composer, and the local server it needs while the app is open.
The collection comes from the repository's 31 original images. Thumbnails are optimized locally; downloads retain the originals.

## Download the app

Use the platform links on [wallpapers.samhc.us](https://wallpapers.samhc.us). The
current release is version 1.0.1 and ships macOS, Windows, and Linux packages. The
app is local-first: it stores creations on the computer where it is running and stops
its local service when the app closes. The app is not a hosted web service.

The app is built with React/TypeScript, real shadcn/ui source components, Radix primitives,
Tailwind CSS v4, and a Node/Express server.

## Run

Requires Node.js 24 or later.

```bash
npm ci
npm run dev
```

Open http://localhost:5173. Vite proxies API and original-image requests to the
server at 127.0.0.1:3001. If adding repository wallpapers, run `npm run assets`.

For a local production build:

```bash
npm run build
npm start
```

Open http://localhost:3001. The server defaults to loopback and is a single-user,
single-instance application with a shared Creations gallery. `HOST`, `PORT`, and
`DATA_DIR` are optional server environment variables; `.env.example` documents them.

## Free image generation

The backend uses [AI Horde](https://github.com/Haidra-Org/AI-Horde), a free,
community-run image generation service. No account, payment, or API key is required:
the server uses the documented anonymous key `0000000000`. It submits one image,
polls `/generate/check`, and retrieves `/generate/status` when complete. The app
shows the provider's actual queue position and time estimate. Requests can be
cancelled; a refresh resumes the browser's active request. The server continues
polling even if the browser closes, and resumes queued jobs on restart.

Anonymous requests receive low priority and may be restricted during heavy load.
Waits can be several minutes. No free service can promise instant generation.
Images use available Dreamshaper or Deliberate workers. The current free sizes are:

| Format | Actual output size |
| --- | --- |
| Desktop | 768 × 512 |
| Phone | 512 × 768 |
| Square | 512 × 512 |

These are generation sizes, not a claim of native 4K output. An optional free
AI Horde account key in `HORDE_API_KEY` can improve queue priority. The app never
falls back to a paid provider.

Descriptions are sent to AI Horde and volunteer workers. The provider marks
anonymous generations as shared with LAION; anonymous generation is not private.
Avoid sensitive descriptions. The app explains this before generation in its
provider information dialog. Generated files and prompts are also saved locally.

Primary references checked October 8, 2026:

- [Anonymous usage and queue limits](https://github.com/Haidra-Org/AI-Horde#anonymous-usage)
- [API integration lifecycle](https://github.com/Haidra-Org/AI-Horde/blob/main/README_integration.md)
- [Live OpenAPI schema, including sharing behavior](https://aihorde.net/api/swagger.json)
- [shadcn/ui components](https://ui.shadcn.com/docs/components)

## Storage

Generated PNGs, preview WebPs, and job records live in `.data/`, ignored by Git.
Use a persistent writable `DATA_DIR` for deployments. Originals are left in their
existing collection folders. Prompt drafts and the active job ID are stored in
browser localStorage. Creations belong to the local server and are shared between
browsers accessing that server. The app allows one queued generation at a time.

## Package a desktop release

The release bundle starts the same server on a free loopback port when the desktop
window opens. It is not a background daemon.

```bash
npm run desktop:dist
```

Artifacts are written to `artifacts/`. Tagged releases are built by
`.github/workflows/release.yml` and attached to the GitHub release used by the
download page. To run the source version locally instead:

```bash
npm ci
npm start
```

Generation uses the free, anonymous AI Horde service only after the user submits a
description. Those requests are shared by that provider; the local app does not
claim private generation or guaranteed queue time.

## Verify

```bash
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

Backend integration tests use a deterministic provider double to exercise
submission, validation, concurrency, queue status, cancellation, censorship,
persistence, download decoding, retryable outages, and cross-origin rejection.
Browser tests use intercepted generation responses to cover loading, failure,
success, reload, keyboard access, mobile layout, and accessibility without
sending unnecessary work to volunteer GPUs. Live AI Horde generation is a separate
manual check because queues and worker availability vary.

The README generator still maintains the original collection showcase. It excludes
app infrastructure directories and preserves the app startup section.
