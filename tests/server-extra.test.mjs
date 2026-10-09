import { test } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { createApp } from '../server/app.mjs'
test('malformed image fails the job instead of polling forever', async t => {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'wallpapers-invalid-'))
  const provider = { submit: async () => '00000000-0000-4000-8000-000000000001', check: async () => ({ done: true }), result: async () => ({ generations: [{ img: 'bm90YW5pbWFnZQ==', censored: false }] }) }
  const s = await createApp({ provider, dataDir, poll: false })
  const server = s.app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(async () => { s.close(); await new Promise(resolve => server.close(resolve)); await rm(dataDir, {recursive:true,force:true}) })
  const base = `http://127.0.0.1:${server.address().port}`
  const response = await fetch(base + '/api/generations', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({prompt:'A lake',orientation:'desktop'}) })
  const job = await response.json()
  const result = await (await fetch(base + '/api/generations/' + job.id)).json()
  assert.equal(result.status, 'failed')
  assert.match(result.message, /unreadable/)
  const invalid = await fetch(base + '/api/generations', {method:'POST',headers:{'Content-Type':'application/json'},body:'{broken'})
  assert.equal(invalid.status,400)
})
