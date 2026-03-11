import { test as setup, expect } from '@playwright/test';

const AUTH_FILE = 'tests/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.fill('input#email', 'danillo@ellahfilmes.com');
  await page.fill('input#password', 'Ellah2026!');
  await page.click('button[type="submit"]');

  // Wait for redirect after login (should leave /login)
  await page.waitForFunction(
    () => !window.location.pathname.includes('/login'),
    { timeout: 15000 },
  );
  await expect(page).not.toHaveURL(/\/login/);

  // Save auth state
  await page.context().storageState({ path: AUTH_FILE });
});
