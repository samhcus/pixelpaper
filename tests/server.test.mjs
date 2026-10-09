import { test } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { createApp } from '../server/app.mjs'
import { createHorde, ProviderError } from '../server/horde.mjs'
const providerId = '00000000-0000-4000-8000-000000000001'
async function setup(t, overrides = {}) {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'wallpaper-test-'))
  const provider = { submit: async () => providerId,
    check: async () => ({ done: false, processing: 0, queue_position: 12, wait_time: 60 }),
    result: async () => ({ generations: [] }), cancel: async () => ({}), ...overrides }
  const runtime = await createApp({ provider, dataDir, poll: false })
  const server = runtime.app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}`
  t.after(async () => { runtime.close(); await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }) })
  const request = (endpoint, body, method = 'POST') => fetch(base + endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const submit = async () => {
    const response = await request('/api/generations', { prompt: 'A peaceful pixel art lake', orientation: 'desktop' })
    assert.equal(response.status, 202)
    return response.json()
  }
  return { ...runtime, base, request, submit, dataDir, provider }
}
test('validates prompts and dimensions before contacting provider', async t => {
  let submitted = false
  const s = await setup(t, { submit: async () => { submitted = true; return providerId } })
  for (const body of [{ prompt: '', orientation: 'desktop' }, { prompt: 'test', orientation: 'wide' }, { prompt: 'a'.repeat(2001), orientation: 'desktop' }]) {
    assert.equal((await s.request('/api/generations', body)).status, 400)
  }
  assert.equal(submitted, false)
})
test('rejects non-pixel directions and adds a pixel suffix before provider submission', async t => {
  let submittedPrompt = ''
  const s = await setup(t, { submit: async prompt => { submittedPrompt = prompt; return providerId } })
  const rejected = await s.request('/api/generations', { prompt: 'A photorealistic photograph of a room', orientation: 'desktop' })
  assert.equal(rejected.status, 400)
  await s.submit()
  assert.match(submittedPrompt, /pixel art only/)
})
test('creates one real job, redacts provider IDs, blocks duplicates, returns queue status', async t => {
  const s = await setup(t)
  const job = await s.submit()
  assert.equal(job.providerId, undefined)
  assert.equal((await s.request('/api/generations', { prompt: 'another lake', orientation: 'phone' })).status, 409)
  const response = await fetch(`${s.base}/api/generations/${job.id}`)
  const checked = await response.json()
  assert.equal(checked.queuePosition, 12)
  assert.equal(checked.waitTime, 60)
})
test('persists generated pixels, exposes downloadable image, and reloads creation after restart', async t => {
  const png = await sharp({ create: { width: 768, height: 512, channels: 3, background: '#19434c' } }).png().toBuffer()
  const s = await setup(t, { check: async () => ({ done: true }), result: async () => ({ generations: [{ img: png.toString('base64'), model: 'Test model', censored: false }] }) })
  const job = await s.submit()
  const completed = await (await fetch(`${s.base}/api/generations/${job.id}`)).json()
  assert.equal(completed.status, 'complete')
  assert.equal(completed.result.width, 768)
  const download = await fetch(s.base + completed.result.src)
  assert.equal(download.headers.get('content-type'), 'image/png')
  assert.equal((await sharp(Buffer.from(await download.arrayBuffer())).metadata()).height, 512)
  const creations = await (await fetch(s.base + '/api/creations')).json()
  assert.equal(creations[0].id, job.id)
  const restarted = await createApp({ provider: s.provider, dataDir: s.dataDir, poll: false })
  t.after(restarted.close)
  assert.equal(restarted.jobs.get(job.id).result.id, job.id)
})
test('temporary provider outage keeps the queued job resumable', async t => {
  const s = await setup(t, { check: async () => { throw new ProviderError('unavailable') } })
  const job = await s.submit()
  const checked = await (await fetch(`${s.base}/api/generations/${job.id}`)).json()
  assert.equal(checked.status, 'queued')
  assert.match(checked.message, /Connection interrupted/)
})
test('rejects censored results without writing an image', async t => {
  const s = await setup(t, { check: async () => ({ done: true }), result: async () => ({ generations: [{ censored: true }] }) })
  const job = await s.submit()
  const checked = await (await fetch(`${s.base}/api/generations/${job.id}`)).json()
  assert.equal(checked.status, 'failed')
  assert.equal(checked.result, undefined)
})
test('cancels the provider job and frees the generation slot', async t => {
  let cancelled
  const s = await setup(t, { cancel: async id => { cancelled = id } })
  const job = await s.submit()
  const response = await s.request(`/api/generations/${job.id}`, undefined, 'DELETE')
  assert.equal((await response.json()).status, 'cancelled')
  assert.equal(cancelled, providerId)
  await s.submit()
})
test('submission errors are actionable and free the slot for retry', async t => {
  const s = await setup(t, { submit: async () => { throw new ProviderError('The free generator is busy.', 429) } })
  const response = await s.request('/api/generations', { prompt: 'A peaceful lake', orientation: 'desktop' })
  assert.equal(response.status, 429)
  assert.match((await response.json()).message, /busy/)
  assert.equal([...s.jobs.values()][0].status, 'failed')
})
test('rejects cross-origin mutation and returns unknown API paths as JSON', async t => {
  const s = await setup(t)
  const response = await fetch(s.base + '/api/generations', { method: 'POST', headers: { Origin: 'https://unrelated.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'A lake', orientation: 'desktop' }) })
  assert.equal(response.status, 403)
  assert.equal((await fetch(s.base + '/api/missing')).status, 404)
})
test('Horde adapter uses the documented free anonymous flow and requested dimensions', async () => {
  const calls = []
  const horde = createHorde({ fetchImpl: async (url, options) => {
    calls.push({ url, options }); return new Response(JSON.stringify({ id: providerId }), { status: 202 })
  }, apiKey: '0000000000' })
  assert.equal(await horde.submit('A lake', 'phone'), providerId)
  const { url, options } = calls[0]
  const body = JSON.parse(options.body)
  assert.equal(url, 'https://aihorde.net/api/v2/generate/async')
  assert.equal(options.headers.apikey, '0000000000')
  assert.equal(body.params.width, 512)
  assert.equal(body.params.height, 768)
  assert.equal(body.r2, false)
  assert.equal(body.shared, true)
  assert.equal(body.censor_nsfw, true)
})
test('Horde adapter handles queue limits and expired job responses', async () => {
  const limited = createHorde({ fetchImpl: async () => new Response('{}', { status: 429 }) })
  await assert.rejects(limited.submit('test', 'desktop'), /busy/)
  const expired = createHorde({ fetchImpl: async () => new Response('{}', { status: 404 }) })
  await assert.rejects(expired.check(providerId), /expired/)
})
