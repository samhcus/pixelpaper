import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { test } from 'node:test'
import {
  createDocument,
  createStudioState,
  fillPixels,
  invokeTool,
  resizeDocument,
  setPixel,
} from '../src/studio/model.ts'

test('document operations are immutable and use bounded pixel grids', () => {
  const original = createDocument({ id: 'test', width: 3, height: 2, background: '#fff' })
  const painted = setPixel(original, 1, 0, '#f00')
  assert.equal(original.pixels[1], '#ffffff')
  assert.equal(painted.pixels[1], '#ff0000')
  const filled = fillPixels(painted, 0, 0, '#00ff00')
  assert.equal(filled.pixels.filter((pixel) => pixel === '#00ff00').length, 5)
  const resized = resizeDocument(filled, 2, 3, '#000')
  assert.deepEqual(resized.pixels.slice(0, 2), ['#00ff00', '#ff0000'])
  assert.equal(resized.pixels.length, 6)
})

test('tool dispatch records undo and redo state', () => {
  let state = createStudioState()
  state = invokeTool(state, 'studio.create', { id: 'history', width: 2, height: 1 }).state
  state = invokeTool(state, 'canvas.set_pixel', { x: 0, y: 0, color: '#abc' }).state
  assert.equal(state.document.pixels[0], '#aabbcc')
  state = invokeTool(state, 'history.undo').state
  assert.equal(state.document.pixels[0], '#000000')
  state = invokeTool(state, 'history.redo').state
  assert.equal(state.document.pixels[0], '#aabbcc')
  state = invokeTool(state, 'canvas.set_pixels', { pixels: ['#000000', '#ffffff'] }).state
  assert.deepEqual(state.document.pixels, ['#000000', '#ffffff'])
  state = invokeTool(state, 'document.import', { document: state.document }).state
  assert.equal(state.document.pixels[1], '#ffffff')
})

test('JSONL bridge returns inspectable tool responses', async () => {
  const child = spawn(process.execPath, ['--experimental-strip-types', 'scripts/pixelpaper-agent.mjs'], { stdio: ['pipe', 'pipe', 'pipe'] })
  const lines = []
  child.stdout.setEncoding('utf8')
  child.stdout.on('data', (chunk) => lines.push(...chunk.split('\n').filter(Boolean)))
  child.stdin.write('{"id":"create","tool":"studio.create","arguments":{"id":"cli","width":2,"height":2}}\n')
  child.stdin.write('{"id":"pixel","tool":"canvas.set_pixel","arguments":{"x":1,"y":1,"color":"#123456"}}\n')
  child.stdin.end()
  const code = await new Promise((resolve) => child.on('close', resolve))
  assert.equal(code, 0)
  assert.equal(lines.length, 2)
  const response = JSON.parse(lines[1])
  assert.equal(response.ok, true)
  assert.equal(response.id, 'pixel')
  assert.equal(response.result.pixels.at(-1), '#123456')
})
