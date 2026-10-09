import express from 'express'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { mkdir, readFile, writeFile, rename, readdir } from 'node:fs/promises'
import sharp from 'sharp'
import { createHorde, ProviderError, sizes } from './horde.mjs'
const root = fileURLToPath(new URL('../', import.meta.url))
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const active = job => ['queued', 'processing'].includes(job.status)
const PIXEL_SUFFIX = ' pixel art only, low resolution pixel grid, crisp hard edges, limited warm palette, no photorealism, no 3D render, no text.'
const forbidden = /\b(?:photorealistic|photograph|photography|3d\s+render|vector\s+art|oil\s+painting)\b/i
export async function createApp({ provider = createHorde(), dataDir = process.env.DATA_DIR || path.join(root, '.data'), poll = true } = {}) {
  const app = express()
  const jobs = new Map()
  const locks = new Map()
  let submitting = false
  const jobsDir = path.join(dataDir, 'jobs')
  const imageDir = path.join(dataDir, 'images')
  await Promise.all([mkdir(jobsDir, { recursive: true }), mkdir(imageDir, { recursive: true })])
  for (const file of await readdir(jobsDir)) {
    if (!file.endsWith('.json')) continue
    const job = JSON.parse(await readFile(path.join(jobsDir, file), 'utf8'))
    // A restart during submission cannot safely resubmit the provider POST.
    if (active(job) && !job.providerId) {
      job.status = 'failed'; job.message = 'The server restarted during submission. Please try again.'
    }
    jobs.set(job.id, job)
  }
  const publicJob = ({ providerId, lastChecked, ...job }) => job
  async function save(job) {
    jobs.set(job.id, job)
    const target = path.join(jobsDir, `${job.id}.json`)
    const tmp = `${target}.${randomUUID()}.tmp`
    await writeFile(tmp, JSON.stringify(job), { mode: 0o600 })
    await rename(tmp, target)
  }
  async function update(job, force = false) {
    if (!active(job) || !job.providerId) return job
    if (locks.has(job.id)) return locks.get(job.id)
    if (!force && Date.now() - (job.lastChecked || 0) < 4500) return job
    const task = (async () => {
      if (Date.now() - Date.parse(job.createdAt) > 60 * 60 * 1000) {
        try { await provider.cancel(job.providerId) } catch { /* provider IDs expire independently */ }
        job.status = 'failed'; job.message = 'The free queue took too long. Please try again later.'
        await save(job); return job
      }
      job.lastChecked = Date.now()
      try {
        const state = await provider.check(job.providerId)
        if (state.faulted) throw new ProviderError('The generator could not finish this wallpaper. Please try again.', 410)
        job.queuePosition = state.queue_position
        job.waitTime = state.wait_time
        job.status = state.processing > 0 ? 'processing' : 'queued'
        job.message = state.is_possible === false ? 'Waiting for a compatible volunteer GPU.' : undefined
        if (state.done) {
          const response = await provider.result(job.providerId)
          const result = response.generations?.[0]
          if (!result || result.censored) throw new ProviderError('The generator could not deliver this image. Try a different description.', 410)
          if (typeof result.img !== 'string' || result.img.length > 30_000_000 || result.img.startsWith('http')) {
            throw new ProviderError('The generator returned an unsupported image. Please try again.', 410)
          }
          const bytes = Buffer.from(result.img, 'base64')
          const image = sharp(bytes, { limitInputPixels: 16_000_000 })
          const metadata = await image.metadata()
          await image.png().toFile(path.join(imageDir, `${job.id}.png`))
          await sharp(bytes).resize(600, 750, { fit: 'cover' }).webp({ quality: 83 }).toFile(path.join(imageDir, `${job.id}.webp`))
          job.status = 'complete'
          job.result = { id: job.id, title: job.prompt, prompt: job.prompt, category: 'Created',
            src: `/generated/${job.id}.png`, thumbnail: `/generated/${job.id}.webp`,
            width: metadata.width, height: metadata.height, model: result.model, createdAt: job.createdAt }
          job.message = undefined
        }
      } catch (error) {
        if (error.status === 410 || error.status === 422 || !(error instanceof ProviderError)) { job.status = 'failed'; job.message = error instanceof ProviderError ? error.message : 'The generator returned an unreadable image. Please try again.' }
        else { job.message = 'Connection interrupted. We are still checking your generation.' }
      }
      await save(job)
      return job
    })().finally(() => locks.delete(job.id))
    locks.set(job.id, task)
    return task
  }
  app.disable('x-powered-by')
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'same-origin')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https://aihorde.net; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
    if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store')
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin) {
      let origin
      try { origin = new URL(req.headers.origin) } catch { return res.status(403).json({ message: 'Invalid origin.' }) }
      if (origin.host !== req.headers.host) return res.status(403).json({ message: 'Cross-origin requests are not allowed.' })
    }
    next()
  })
  app.use(express.json({ limit: '20kb' }))
  app.get('/api/health', (_req, res) => res.json({ ok: true, provider: 'AI Horde', free: true, sizes }))
  app.get('/api/creations', (_req, res) => res.json([...jobs.values()].filter(j => j.status === 'complete').map(j => j.result).sort((a, b) => b.createdAt.localeCompare(a.createdAt))))
  app.post('/api/generations', async (req, res) => {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : ''
    const orientation = req.body?.orientation
    if (prompt.length < 3 || prompt.length > 2000 || !Object.hasOwn(sizes, orientation)) {
      return res.status(400).json({ message: 'Describe your pixel wallpaper in 3–2,000 characters and choose a valid orientation.' })
    }
    if (forbidden.test(prompt)) return res.status(400).json({ message: 'Pixelpaper makes pixel art only. Remove photo, 3D, vector, or painting directions.' })
    const pixelPrompt = `${prompt}${PIXEL_SUFFIX}`
    const existing = [...jobs.values()].find(active)
    if (submitting || existing) return res.status(409).json({ message: 'A wallpaper is already being generated.', job: existing ? publicJob(existing) : undefined })
    submitting = true
    const job = { id: randomUUID(), prompt: pixelPrompt, orientation, status: 'queued', createdAt: new Date().toISOString() }
    try {
      await save(job)
      job.providerId = await provider.submit(pixelPrompt, orientation)
      await save(job)
      res.status(202).json(publicJob(job))
    } catch (error) {
      job.status = 'failed'; job.message = error instanceof ProviderError ? error.message : 'Could not save this generation. Please try again.'
      await save(job)
      res.status(error.status || 500).json({ message: job.message })
    } finally { submitting = false }
  })
  app.get('/api/generations/:id', async (req, res) => {
    const job = idPattern.test(req.params.id) && jobs.get(req.params.id)
    if (!job) return res.status(404).json({ message: 'This generation could not be found.' })
    res.json(publicJob(await update(job)))
  })
  app.delete('/api/generations/:id', async (req, res) => {
    const job = idPattern.test(req.params.id) && jobs.get(req.params.id)
    if (!job) return res.status(404).json({ message: 'This generation could not be found.' })
    if (locks.has(job.id)) await locks.get(job.id)
    if (active(job)) {
      const cancelling = (async () => {
        try { await provider.cancel(job.providerId) } catch (error) {
          if (error.status !== 410) throw new ProviderError('Could not cancel yet. Please try again.')
        }
        job.status = 'cancelled'; job.message = 'Generation cancelled.'
        await save(job)
        return job
      })().finally(() => locks.delete(job.id))
      locks.set(job.id, cancelling)
      try { await cancelling } catch (error) { return res.status(502).json({ message: error.message }) }
    }
    res.json(publicJob(job))
  })
  app.use('/generated', express.static(imageDir, { dotfiles: 'deny', maxAge: '1y', immutable: true }))
  app.use('/api', (_req, res) => res.status(404).json({ message: 'API endpoint not found.' }))
  app.use(express.static(path.join(root, 'dist')))
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(root, 'dist/index.html')))
  app.use((error, _req, res, _next) => {
    const status = error.status === 413 ? 413 : error.status === 400 ? 400 : 500
    res.status(status).json({ message: status === 413 ? 'The description is too long.' : status === 400 ? 'The request must contain valid JSON.' : 'The server could not process this request.' })
  })
  const timer = poll ? setInterval(() => {
    for (const job of jobs.values()) if (active(job)) update(job).catch(error => console.error('Could not save generation progress:', error.code || error.name))
  }, 5000) : null
  timer?.unref()
  return { app, close: () => timer && clearInterval(timer), update, jobs }
}
