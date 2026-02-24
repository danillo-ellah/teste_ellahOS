import { test, expect } from '@playwright/test';
import path from 'path';

// Directory for screenshots
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

// All main pages to screenshot
const PAGES = [
  { name: '01-login', path: '/login', needsAuth: false, waitFor: 'input#email' },
  { name: '02-dashboard', path: '/', needsAuth: true, waitFor: '[data-testid],.grid,.card,main' },
  { name: '03-jobs', path: '/jobs', needsAuth: true, waitFor: 'table,main,.flex' },
  { name: '04-clients', path: '/clients', needsAuth: true, waitFor: 'table,main,.flex' },
  { name: '05-agencies', path: '/agencies', needsAuth: true, waitFor: 'table,main,.flex' },
  { name: '06-people', path: '/people', needsAuth: true, waitFor: 'table,main,.flex' },
  { name: '07-financial', path: '/financial', needsAuth: true, waitFor: 'table,main,.flex' },
  { name: '08-calendar', path: '/team/calendar', needsAuth: true, waitFor: 'main,.flex,.calendar' },
  { name: '09-approvals', path: '/approvals', needsAuth: true, waitFor: 'table,main,.flex' },
  { name: '10-reports', path: '/reports', needsAuth: true, waitFor: 'main,.flex,.chart' },
  { name: '11-notifications', path: '/notifications', needsAuth: true, waitFor: 'main,.flex' },
  { name: '12-settings', path: '/settings', needsAuth: true, waitFor: 'main,.flex,.tab' },
  { name: '13-settings-integrations', path: '/settings/integrations', needsAuth: true, waitFor: 'main,.flex' },
  { name: '14-settings-notifications', path: '/settings/notifications', needsAuth: true, waitFor: 'main,.flex' },
  { name: '15-portal', path: '/portal', needsAuth: true, waitFor: 'main,.flex' },
];

test.describe('Screenshot Audit - All Pages', () => {
  // Login page (no auth - fresh context without storageState)
  test('01 - Login Page', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      storageState: undefined,
    });
    const page = await context.newPage();

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '01-login.png'),
      fullPage: true,
    });

    console.log('[01-login] Title:', await page.title());
    await context.close();
  });

  // Authenticated pages
  const authPages = PAGES.filter((p) => p.needsAuth);

  for (const pageInfo of authPages) {
    test(`${pageInfo.name} - ${pageInfo.path}`, async ({ browser }) => {
      // Use saved auth state
      const context = await browser.newContext({
        storageState: 'tests/.auth/user.json',
        viewport: { width: 1440, height: 900 },
      });
      const page = await context.newPage();

      // Track console errors and network failures
      const consoleErrors: string[] = [];
      const networkErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          // Ignore common non-critical errors
          if (
            !text.includes('favicon') &&
            !text.includes('hydration') &&
            !text.includes('NEXT_REDIRECT') &&
            !text.includes('ChunkLoadError')
          ) {
            consoleErrors.push(text);
          }
        }
      });

      page.on('response', (response) => {
        if (response.status() >= 500) {
          networkErrors.push(`${response.status()} ${response.url()}`);
        }
      });

      // Navigate
      await page.goto(pageInfo.path);
      await page.waitForLoadState('domcontentloaded');
      // Wait for content to load (networkidle can timeout on polling pages)
      await page.waitForTimeout(3000);

      // Take full-page screenshot
      await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, `${pageInfo.name}.png`),
        fullPage: true,
      });

      // Report findings
      if (consoleErrors.length > 0) {
        console.log(`\n[${pageInfo.name}] Console errors:`);
        consoleErrors.forEach((e) => console.log(`  - ${e.substring(0, 200)}`));
      }
      if (networkErrors.length > 0) {
        console.log(`\n[${pageInfo.name}] Network errors (5xx):`);
        networkErrors.forEach((e) => console.log(`  - ${e}`));
      }

      // Basic page health checks
      const title = await page.title();
      console.log(`[${pageInfo.name}] Title: ${title}`);

      // Check for error boundaries / error states visible on page
      const errorBoundary = await page.locator('text=/something went wrong|error|erro/i').count();
      if (errorBoundary > 0) {
        console.log(`[${pageInfo.name}] WARNING: Error state detected on page`);
      }

      await context.close();
    });
  }
});
