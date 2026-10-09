import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'download.spec.ts',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } }, { name: 'phone', use: { ...devices['Pixel 7'] } }],
  webServer: { command: 'npm run build:site && vite preview --host 127.0.0.1 --port 4173', url: 'http://127.0.0.1:4173' },
})
