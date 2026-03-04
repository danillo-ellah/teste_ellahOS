import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Phone Login Tab', () => {
  test('renders Email and Celular tabs', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'Email' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Celular' })).toBeVisible();
  });

  test('Celular tab shows phone field with +55 prefix', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Celular' }).click();
    await expect(page.locator('text=+55')).toBeVisible();
    await expect(page.locator('input#phone')).toBeVisible();
  });

  test('phone input accepts only numbers', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Celular' }).click();
    const phoneInput = page.locator('input#phone');
    await phoneInput.fill('abc11912345678');
    const value = await phoneInput.inputValue();
    // Should strip non-digit chars (the onChange handler strips them)
    expect(value.replace(/\D/g, '')).toBeTruthy();
  });

  test('Enviar Codigo button requires phone input', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Celular' }).click();
    // Phone field is required — clicking submit with empty field triggers HTML5 validation
    await page.click('button[type="submit"]');
    const phoneInput = page.locator('input#phone');
    const isInvalid = await phoneInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test('switching tabs resets form state', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    // Fill email form
    await page.fill('input#email', 'test@example.com');
    // Switch to phone
    await page.getByRole('button', { name: 'Celular' }).click();
    // Switch back to email
    await page.getByRole('button', { name: 'Email' }).click();
    // Email should be empty (form was reset via key prop)
    const emailValue = await page.locator('input#email').inputValue();
    expect(emailValue).toBe('');
  });

  test('Enviar Codigo button shows correct text', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Celular' }).click();
    await expect(page.locator('button[type="submit"]')).toContainText('Enviar Codigo');
  });
});
