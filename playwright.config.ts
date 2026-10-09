import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './tests/browser', testMatch: 'app.spec.ts', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  projects: [ { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1478, height: 955 } } },
    { name: 'phone', use: { ...devices['Pixel 7'] } } ],
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI },
})
