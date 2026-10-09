import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
test('static home presents Pixelpaper downloads and Samuel library', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Your next pixel art wallpaper starts here/ })).toBeVisible()
  await expect(page.getByText('Pixelpaper by Samuel')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Download for macOS' })).toHaveAttribute('href', /Pixelpaper-mac-arm64\.dmg$/)
  await expect(page.getByRole('link', { name: 'Download Pixelpaper for Windows' })).toHaveAttribute('href', /Pixelpaper-win-x64\.exe$/)
  await expect(page.getByRole('link', { name: 'Download Pixelpaper for Linux' })).toHaveAttribute('href', /Pixelpaper-linux-x86_64\.AppImage$/)
  await expect(page.getByRole('heading', { name: 'A few made with Pixelpaper.' })).toBeVisible()
  await expect(page.locator('.example-grid img')).toHaveCount(25)
  await expect(page.getByText('Created with love by Samuel.')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).analyze()).violations.map(v => v.id)).toEqual([])
})
