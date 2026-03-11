import { defineConfig, devices } from '@playwright/test';

/**
 * Config dedicada para o Chaos E2E System Test
 * Aponta direto para a URL de producao — sem servidor local necessario
 */
export default defineConfig({
  testDir: './tests',
  testMatch: /e2e-system-test\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  outputDir: 'test-results-chaos',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-chaos' }]],
  timeout: 30000,
  use: {
    baseURL: 'https://teste-ellah-os.vercel.app',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    // Sem storageState — testes publicos/nao-autenticados
  },
  projects: [
    {
      name: 'chaos-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
