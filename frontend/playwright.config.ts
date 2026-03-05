import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'tests/results.json' }]],
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'public',
      testMatch: /public-pages\.spec\.ts|phone-login\.spec\.ts|invite-page\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'authenticated',
      testMatch: /dashboard-pages\.spec\.ts|forms-and-interactions\.spec\.ts|screenshots\.spec\.ts|storyboard\.spec\.ts|admin-pages\.spec\.ts|elenco-od-e2e\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    // Portal do Cliente — chaos tests (Suites A-F)
    // Suite A e F requerem auth (storageState)
    // Suites B, C, D, E sao publicas ou via API direta
    {
      name: 'portal-admin',
      testMatch: /portal-e2e\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/user.json',
        baseURL: 'https://teste-ellah-os.vercel.app',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
      dependencies: ['setup'],
    },
    {
      name: 'portal-public',
      testMatch: /portal-e2e\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://teste-ellah-os.vercel.app',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
    },
    {
      name: 'portal-mobile',
      testMatch: /portal-e2e\.spec\.ts/,
      use: {
        ...devices['iPhone 13'],
        baseURL: 'https://teste-ellah-os.vercel.app',
        screenshot: 'only-on-failure',
      },
    },
  ],
});
