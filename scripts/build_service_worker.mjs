import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const dist = path.join(root, 'dist')
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await filesIn(absolute))
    else if (entry.name !== 'sw.js') files.push(absolute)
  }
  return files
}

const shell = [
  '/',
  ...((await filesIn(dist)).map((file) => `/${path.relative(dist, file).split(path.sep).join('/')}`)),
]

const worker = `const CACHE = ${JSON.stringify(`pixelpaper-site-v${packageJson.version}`)}
const SHELL = ${JSON.stringify(shell, null, 2)}

self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())))
self.addEventListener('activate', (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())))
self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return
  const pathname = new URL(request.url).pathname
  event.respondWith(caches.match(new Request(pathname), { ignoreSearch: true }).then((cached) => {
    if (cached) return cached
    return fetch(request).then((response) => {
      if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()))
      return response
    }).catch(() => request.mode === 'navigate' ? caches.match('/') : Response.error())
  }))
})
`

await writeFile(path.join(dist, 'sw.js'), worker)
console.log(`Prepared offline cache for ${shell.length - 1} built files.`)
