import assert from 'node:assert/strict'
import { test } from 'node:test'
import { blankPixels, canvasSizes, palettes } from '../src/pixel.ts'

test('wallpaper presets stay within compact pixel grids', () => {
  assert.deepEqual(canvasSizes.desktop, { width: 128, height: 72, label: 'Desktop', detail: '16:9 · 128 × 72' })
  assert.deepEqual(canvasSizes.phone, { width: 72, height: 128, label: 'Phone', detail: '9:16 · 72 × 128' })
  assert.deepEqual(canvasSizes.square, { width: 96, height: 96, label: 'Square', detail: '1:1 · 96 × 96' })
})

test('blank canvas is deterministic and uses the selected fill', () => {
  const pixels = blankPixels(canvasSizes.desktop.width, canvasSizes.desktop.height, palettes.peach.colors[0])
  assert.equal(pixels.length, 128 * 72)
  assert.equal(new Set(pixels).size, 1)
  assert.equal(pixels[0], '#193c43')
  assert.equal(pixels.at(-1), '#193c43')
})
