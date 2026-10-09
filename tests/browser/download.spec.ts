import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('static home has a clear download path and accessible platform links', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Your next wallpaper/ })).toBeVisible()
  await expect(page.getByText('Wallpapers by Samuel')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Download for macOS' })).toHaveAttribute('href', /Wallpapers-mac-arm64\.dmg$/)
  await expect(page.getByRole('link', { name: 'Download Wallpapers for Windows' })).toHaveAttribute('href', /Wallpapers-win-x64\.exe$/)
  await expect(page.getByRole('link', { name: 'Download Wallpapers for Linux' })).toHaveAttribute('href', /Wallpapers-linux-x86_64\.AppImage$/)
  await expect(page.locator('.preview-mini-grid img')).toHaveCount(4)
  await expect(page.locator('.preview-mini-grid img').first()).toHaveJSProperty('naturalWidth', 600)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations.map((v) => v.id)).toEqual([])
})
