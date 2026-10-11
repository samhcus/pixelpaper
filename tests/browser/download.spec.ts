import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
test('static home presents a focused offline Pixelpaper download', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'PixelPaper' })).toBeVisible()
  await expect(page.getByText('Pixel art studio. Offline.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'View source on GitHub' })).toHaveAttribute('href', 'https://github.com/samhcus/pixelpaper')
  await expect(page.getByRole('link', { name: 'Download PixelPaper for macOS · Apple silicon' })).toHaveAttribute('href', /Pixelpaper-mac-arm64\.dmg$/)
  await expect(page.getByRole('link', { name: 'Download PixelPaper for Windows' })).toHaveAttribute('href', /Pixelpaper-win-x64\.exe$/)
  await expect(page.getByText('Coming soon')).toHaveCount(2)
  await expect(page.getByRole('heading', { name: 'Mobile' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).analyze()).violations.map(v => v.id)).toEqual([])
})

test('static home remains available after the first visit goes offline', async ({ page, context }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => navigator.serviceWorker.ready)
  await context.setOffline(true)
  try {
    await page.reload()
    await expect(page.getByRole('heading', { name: 'PixelPaper' })).toBeVisible()
    await expect(page.getByText('Pixel art studio. Offline.')).toBeVisible()
  } finally {
    await context.setOffline(false)
  }
})
