import { defineConfig, devices } from '@playwright/test'

const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: chromiumExecutablePath
          ? { executablePath: chromiumExecutablePath }
          : undefined,
      },
    },
  ],
  webServer: {
    command:
      'VITE_CONVEX_URL= VITE_SOURCE_PROJECTS=bun VITE_SOURCE_AGENTS=bun VITE_SOURCE_HARNESSES=bun VITE_SOURCE_TASKS=bun VITE_SOURCE_ISSUES=bun VITE_SOURCE_LOGS=bun VITE_SOURCE_SETTINGS=bun npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
