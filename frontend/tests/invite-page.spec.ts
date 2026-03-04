import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Invite Page', () => {
  test('/invite/invalid-token shows error', async ({ page }) => {
    await page.goto('/invite/invalid-token-12345');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);

    // Should show error state (convite invalido)
    const bodyText = await page.locator('body').textContent();
    const hasError =
      bodyText?.includes('invalido') ||
      bodyText?.includes('expirado') ||
      bodyText?.includes('nao encontrado') ||
      bodyText?.includes('Erro');
    expect(hasError).toBe(true);
  });

  test('/invite/invalid-token has link to login', async ({ page }) => {
    await page.goto('/invite/invalid-token-12345');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);

    // Should have a link to login page
    const loginLink = page.locator('a[href*="login"]');
    const hasLoginLink = await loginLink.count();
    expect(hasLoginLink).toBeGreaterThanOrEqual(1);
  });

  test('/invite page does not redirect unauthenticated users', async ({ page }) => {
    await page.goto('/invite/some-test-token');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Should stay on /invite/ (not redirect to /login)
    // This verifies FIX-1 (invite added to public routes)
    expect(page.url()).toContain('/invite/');
  });
});
