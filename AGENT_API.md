# Pixelpaper agent tools

Pixelpaper includes a local JSONL bridge for agents. It runs without a server and does not make network requests.

Start it with:

```sh
npm run agent
```

Send one JSON object per line on stdin. Each response is one JSON object on stdout:

```json
{"id":1,"tool":"studio.create","arguments":{"width":16,"height":16}}
{"id":2,"tool":"canvas.set_pixel","arguments":{"x":2,"y":3,"color":"#f6c773"}}
{"id":3,"tool":"document.export"}
```

Every response includes `ok`, the request `id`, and `protocolVersion`. Errors include a short `code` and `message`. The process keeps the current document in memory until it exits.

Use `tools.list` first to read the current tool names and input schemas. The first tool call should normally be `studio.create`. Available tools are:

- `studio.create`, `studio.get`
- `document.import`, `document.set_title`, `document.export`
- `canvas.set_pixel`, `canvas.set_pixels`, `canvas.fill`, `canvas.clear`, `canvas.resize`
- `history.undo`, `history.redo`

The core implementation is in `src/studio/model.ts`. It is dependency-free, validates dimensions and colors, and returns new document values for every edit so actions can be inspected and undone.
