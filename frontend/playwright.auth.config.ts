import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

/**
 * Config dedicada para o Authenticated Flows E2E
 * Aponta direto para URL de producao — sem servidor local necessario
 *
 * Estrategia: auth.setup.ts loga uma vez e salva storageState em tests/.auth/user.json
 * Todos os testes subsequentes reutilizam essa sessao (sem re-login).
 *
 * Como rodar:
 *   npx playwright test --config=playwright.auth.config.ts
 *
 *   # Com browser visivel (debug):
 *   npx playwright test --config=playwright.auth.config.ts --headed
 *
 *   # Ver relatorio HTML apos rodar:
 *   npx playwright show-report playwright-report-auth
 */

const STORAGE_STATE_PATH = path.join(__dirname, 'tests/.auth/user.json');

export default defineConfig({
  testDir: './tests',

  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,

  outputDir: 'test-results-auth',
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-auth' }],
  ],

  timeout: 30000,

  use: {
    baseURL: 'https://teste-ellah-os.vercel.app',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    // Setup: loga uma vez e salva sessao
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Testes autenticados: reutilizam sessao do setup
    {
      name: 'auth-flows-chrome',
      testMatch: /authenticated-flows\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: STORAGE_STATE_PATH,
      },
      dependencies: ['auth-setup'],
    },
  ],
});
