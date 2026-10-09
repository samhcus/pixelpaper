import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
const jobId = '00000000-0000-4000-8000-000000000001'
const prompt = 'A quiet pixel art lake at sunset'
const created = { id: jobId, title: prompt, prompt, category: 'Created', src: '/wallpapers/pixel-art/teal-ancient-treehouse-01.png', thumbnail: '/thumbnails/pixel-art-teal-ancient-treehouse-01.webp', width: 768, height: 512, createdAt: '2026-10-08T20:00:00Z' }
const job = { id: jobId, prompt, orientation: 'desktop', status: 'queued', createdAt: created.createdAt, queuePosition: 5, waitTime: 120 }
test.beforeEach(async ({ page }) => {
  await page.route('**/api/creations', route => route.fulfill({ json: [] }))
})
test('shows actual collection, no horizontal overflow, and an uncropped downloadable preview', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Wallpapers', exact: true })).toBeVisible()
  await expect(page.locator('.wallpaper-card')).toHaveCount(31)
  const first = page.locator('.wallpaper-card').first()
  await expect(first.locator('img')).toHaveJSProperty('naturalWidth', 600)
  await first.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Ancient Treehouse' })).toBeVisible()
  await expect(dialog.locator('.preview-image')).toHaveCSS('object-fit', 'contain')
  const downloadEvent = page.waitForEvent('download')
  await dialog.getByRole('link', { name: 'Download' }).click()
  const download = await downloadEvent
  expect(download.suggestedFilename()).toBe('teal-ancient-treehouse-01.png')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(first).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
test('category filter and templates change the real content and editable description', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Filter wallpapers by category' }).click()
  await page.getByRole('option', { name: 'Space', exact: true }).click()
  await expect(page.locator('.wallpaper-card')).toHaveCount(1)
  await page.getByRole('tab', { name: 'Templates' }).click()
  await expect(page.locator('.template-card')).toHaveCount(8)
  await page.getByRole('button', { name: 'Use Hidden treehouse template' }).click()
  await expect(page.getByRole('textbox', { name: 'Describe a new image' })).toHaveValue(/secret treehouse/)
  await expect(page.getByRole('textbox', { name: 'Describe a new image' })).toBeFocused()
})
test('generation preserves draft on failure and retries into queue then a downloadable creation', async ({ page }) => {
  let attempts = 0
  let finish = false
  await page.route('**/api/generations', async route => {
    const body = route.request().postDataJSON()
    expect(body.prompt).toBe(prompt)
    expect(body.orientation).toBe('desktop')
    attempts++
    await route.fulfill(attempts === 1 ? {status:429,json:{message:'The free generator is busy. Try again.'}} : {status:202,json:job})
  })
  await page.route(`**/api/generations/${jobId}`, route => route.fulfill({json:finish?{...job,status:'complete',result:created}:job}))
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Generate wallpaper', exact: true })).toBeDisabled()
  const input = page.getByRole('textbox', { name: 'Describe a new image' })
  await input.fill(prompt)
  await page.getByRole('button', { name: 'Generate wallpaper', exact: true }).click()
  await expect(page.getByText('The free generator is busy. Try again.')).toBeVisible()
  await expect(input).toHaveValue(prompt)
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByText(/Queue position 5/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generation in progress' })).toBeDisabled()
  finish = true
  await expect(page.getByText('Your wallpaper is ready in Creations.')).toBeVisible({timeout:12000})
  await expect(page.getByRole('button', { name: `Preview ${prompt}` })).toBeVisible()
  expect(attempts).toBe(2)
})
test('reload resumes active request and Cancel cancels the existing job', async ({ page }) => {
  let cancelled = false
  await page.route(`**/api/generations/${jobId}`, async route => {
    if (route.request().method() === 'DELETE') cancelled = true
    await route.fulfill({json:cancelled?{...job,status:'cancelled'}:job})
  })
  await page.goto('/')
  await page.evaluate(({id,prompt})=>{localStorage.setItem('wallpapers.active-generation',id);localStorage.setItem('wallpapers.prompt-draft',prompt)}, {id:jobId,prompt})
  await page.reload()
  await expect(page.getByText(/Queue position 5/).first()).toBeVisible()
  await expect(page.getByRole('textbox', { name:'Describe a new image' })).toHaveValue(prompt)
  await page.getByRole('button', { name:'Cancel', exact:true }).click()
  await expect(page.getByText('Generation cancelled. Your description is saved.')).toBeVisible()
  expect(cancelled).toBe(true)
  expect(await page.evaluate(()=>localStorage.getItem('wallpapers.active-generation'))).toBeNull()
})
test('format selection, multiline keyboard input, final row reachability, and accessibility', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('combobox', { name:'Wallpaper format' }).click()
  await page.getByRole('option', { name:/Phone/ }).click()
  await expect(page.getByRole('combobox', { name:'Wallpaper format' })).toContainText('Phone')
  const input = page.getByRole('textbox', { name:'Describe a new image' })
  await input.fill('A lake')
  await input.press('Enter')
  await input.press('KeyT')
  await expect(input).toHaveValue('A lake\nt')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  const last = await page.locator('.wallpaper-card').last().boundingBox()
  const dock = await page.locator('.composer-dock').boundingBox()
  expect(last!.y + last!.height).toBeLessThan(dock!.y)
  const results = await new AxeBuilder({page}).analyze()
  expect(results.violations.map(v=>({id:v.id,description:v.description,nodes:v.nodes.map(n=>n.target)}))).toEqual([])
})
test('completion keeps browsing in place and the idle composer stays fully opaque', async ({ page }) => {
  let finish = false
  await page.route('**/api/generations', route => route.fulfill({status:202,json:job}))
  await page.route(`**/api/generations/${jobId}`, route => route.fulfill({json:finish?{...job,status:'complete',result:created}:job}))
  await page.goto('/')
  await expect(page.locator('.composer-input')).toHaveCSS('opacity','1')
  await page.getByRole('textbox', {name:'Describe a new image'}).fill(prompt)
  await page.getByRole('button', {name:'Generate wallpaper',exact:true}).click()
  await expect(page.getByText(/Queue position 5/).first()).toBeVisible()
  await page.getByRole('tab', {name:'Collection',exact:true}).click()
  finish = true
  await expect(page.getByText('Your wallpaper is ready in Creations.')).toBeVisible({timeout:12000})
  await expect(page.getByRole('tab', {name:'Collection',exact:true})).toHaveAttribute('aria-selected','true')
})
