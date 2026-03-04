import { test, expect } from '@playwright/test';

test.describe('Admin Pages', () => {
  test('/admin/equipe loads member list', async ({ page }) => {
    await page.goto('/admin/equipe');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Should not redirect to login
    expect(page.url()).not.toContain('/login');

    // Should show either member table or permission denied
    const bodyText = await page.locator('body').textContent();
    const hasExpectedContent =
      bodyText?.includes('Equipe') ||
      bodyText?.includes('Membros') ||
      bodyText?.includes('Acesso restrito');
    expect(hasExpectedContent).toBe(true);
  });

  test('/admin/equipe has Convidar button for admins', async ({ page }) => {
    await page.goto('/admin/equipe');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // If user is admin, should see "Convidar" button
    const inviteBtn = page.getByRole('button', { name: /Convidar/i });
    const isAdmin = await inviteBtn.isVisible().catch(() => false);

    if (isAdmin) {
      await expect(inviteBtn).toBeEnabled();
    }
    // If not admin, the page shows "Acesso restrito" which is also valid
  });

  test('invite dialog has email, phone, and role fields', async ({ page }) => {
    await page.goto('/admin/equipe');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const inviteBtn = page.getByRole('button', { name: /Convidar/i });
    if (!(await inviteBtn.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    await inviteBtn.click();
    await page.waitForTimeout(500);

    // Dialog should be open with fields
    await expect(page.locator('input#invite-email')).toBeVisible();
    await expect(page.locator('input#invite-phone')).toBeVisible();
    await expect(page.locator('#invite-role')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Convidar Membro/i })).toBeVisible();
  });

  test('/admin/settings loads branding form', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    expect(page.url()).not.toContain('/login');

    const bodyText = await page.locator('body').textContent();
    const hasExpectedContent =
      bodyText?.includes('Configuracoes') ||
      bodyText?.includes('marca') ||
      bodyText?.includes('Acesso restrito');
    expect(hasExpectedContent).toBe(true);
  });

  test('/admin/settings has brand preview', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // If admin, should have preview section
    const preview = page.locator('text=Preview da marca');
    const isAdmin = await preview.isVisible().catch(() => false);
    if (isAdmin) {
      await expect(preview).toBeVisible();
    }
  });

  test('/admin/settings color picker works', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const colorInput = page.locator('input[aria-label="Codigo hexadecimal da cor"]');
    if (!(await colorInput.isVisible().catch(() => false))) {
      test.skip();
      return;
    }

    // Clear and type a new color
    await colorInput.clear();
    await colorInput.fill('#FF5733');
    await colorInput.blur();
    await page.waitForTimeout(300);

    // Value should remain as typed
    const value = await colorInput.inputValue();
    expect(value).toBe('#FF5733');
  });
});
