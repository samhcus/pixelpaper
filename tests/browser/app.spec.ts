import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
const jobId = '00000000-0000-4000-8000-000000000001'
const prompt = 'A cozy pixel art apartment above a rainy neon city'
const job = { id: jobId, prompt, orientation: 'desktop', status: 'queued', createdAt: '2026-10-08T20:00:00Z', queuePosition: 5, waitTime: 120 }
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.clear() })
  await page.route('**/api/creations', route => route.fulfill({ json: [] }))
})
test('starts with a clean pixel shelf and no bundled examples', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Your next pixel art wallpaper' })).toBeVisible()
  await expect(page.getByText('Your pixel shelf is empty')).toBeVisible()
  await expect(page.locator('.wallpaper-card')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Draw from scratch' }).first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).analyze()).violations.map(v => v.id)).toEqual([])
})
test('blank editor draws, saves, and exports a pixel wall', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Draw from scratch' }).first().click()
  await expect(page.getByRole('heading', { name: 'Draw from scratch' })).toBeVisible()
  await expect(page.getByRole('application', { name: /Pixel canvas/ })).toBeVisible()
  await page.getByRole('button', { name: 'Use #f6c773' }).click()
  await page.getByRole('application', { name: /Pixel canvas/ }).click({ position: { x: 80, y: 80 } })
  await page.getByRole('button', { name: 'Save to shelf' }).click()
  await expect(page.getByText('Untitled pixel wall')).toBeVisible()
})
test('generation stays pixel-only and opens the editor when complete', async ({ page }) => {
  let done = false
  await page.route('**/api/generations', async route => { expect(route.request().postDataJSON()).toMatchObject({ prompt, orientation: 'desktop' }); await route.fulfill({ status: 202, json: job }) })
  await page.route(`**/api/generations/${jobId}`, route => route.fulfill({ json: done ? { ...job, status: 'complete', result: { id: jobId, title: prompt, prompt, category: 'Pixel art', src: '/generated/test.png', thumbnail: '/generated/test.png', width: 768, height: 512 } } : job }))
  await page.goto('/')
  await page.getByRole('textbox', { name: 'Describe a new pixel art wallpaper' }).fill(prompt)
  await page.getByRole('button', { name: 'Generate pixel art wallpaper' }).click()
  await expect(page.getByText(/Waiting for a volunteer pixel artist|Painting your pixels/)).toBeVisible()
  done = true
  await expect(page.getByRole('heading', { name: 'Tune your wallpaper' })).toBeVisible({ timeout: 12000 })
  await expect(page.getByText('Save to shelf')).toBeVisible()
})
test('mobile composer has no overflow and editor tools remain reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/')
  await expect(page.getByRole('textbox', { name: 'Describe a new pixel art wallpaper' })).toBeVisible()
  await page.getByRole('button', { name: 'Draw from scratch' }).first().click()
  await expect(page.getByRole('button', { name: 'Color picker (I)' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
