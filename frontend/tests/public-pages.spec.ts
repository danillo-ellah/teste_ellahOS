import { test, expect, Page } from '@playwright/test';

// Public pages don't need auth — override storageState
test.use({ storageState: { cookies: [], origins: [] } });

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
const consoleErrors: string[] = [];

function collectConsoleErrors(page: Page) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[${page.url()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(`[${page.url()}] PAGE ERROR: ${err.message}`);
  });
}

// ---------------------------------------------------------------
// Login Page
// ---------------------------------------------------------------
test.describe('Login Page', () => {
  test('renders login form correctly', async ({ page }) => {
    collectConsoleErrors(page);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Title and description
    await expect(page.locator('h2')).toContainText('Entrar');
    await expect(page.locator('text=Acesse sua conta do ELLAHOS')).toBeVisible();

    // Form elements
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Entrar');

    // Forgot password link
    await expect(page.locator('text=Esqueceu a senha?')).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    collectConsoleErrors(page);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input#email', 'invalid@test.com');
    await page.fill('input#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('.text-destructive')).toBeVisible({ timeout: 10000 });
  });

  test('shows validation on empty submit', async ({ page }) => {
    collectConsoleErrors(page);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Click submit without filling
    await page.click('button[type="submit"]');

    // HTML5 validation should prevent submission
    const emailInput = page.locator('input#email');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });

  test('forgot password link navigates correctly', async ({ page }) => {
    collectConsoleErrors(page);
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.click('text=Esqueceu a senha?');
    await expect(page).toHaveURL(/forgot-password/);
  });

  test('no accessibility issues on login', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Check labels exist for inputs
    const emailLabel = page.locator('label[for="email"]');
    await expect(emailLabel).toBeVisible();
    const passwordLabel = page.locator('label[for="password"]');
    await expect(passwordLabel).toBeVisible();

    // Check inputs have proper types
    await expect(page.locator('input#email')).toHaveAttribute('type', 'email');
    await expect(page.locator('input#password')).toHaveAttribute('type', 'password');

    // Check autocomplete attributes
    await expect(page.locator('input#email')).toHaveAttribute('autocomplete', 'email');
    await expect(page.locator('input#password')).toHaveAttribute('autocomplete', 'current-password');
  });
});

// ---------------------------------------------------------------
// Forgot Password Page
// ---------------------------------------------------------------
test.describe('Forgot Password Page', () => {
  test('renders forgot password form', async ({ page }) => {
    collectConsoleErrors(page);
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');

    // Should have email input and submit
    await expect(page.locator('input[type="email"], input#email')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('has link back to login', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('networkidle');

    const loginLink = page.locator('a[href*="login"]');
    const count = await loginLink.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------
// Reset Password Page
// ---------------------------------------------------------------
test.describe('Reset Password Page', () => {
  test('renders reset password page', async ({ page }) => {
    collectConsoleErrors(page);
    await page.goto('/reset-password');
    await page.waitForLoadState('networkidle');

    // A pagina sem token valido (sem hash na URL) mostra "Link invalido"
    // com um link para solicitar novo link. Com token valido mostra o formulario.
    // Ambos os estados sao validos — verificar que a pagina carregou e tem conteudo.
    const body = page.locator('body');
    const bodyText = await body.textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(10);

    // Deve mostrar formulario (com token) OU mensagem de link invalido/expirado (sem token)
    const hasPasswordForm = await page.locator('input[type="password"]').count() > 0;
    const hasInvalidMessage = await page.locator('text=/Link invalido|link de recuperacao|expirou|Solicitar novo/i').isVisible().catch(() => false);
    const hasCheckingMessage = await page.locator('text=/Verificando|verificando/i').isVisible().catch(() => false);

    // Um dos tres estados deve estar presente
    expect(hasPasswordForm || hasInvalidMessage || hasCheckingMessage).toBe(true);
  });
});

// ---------------------------------------------------------------
// Unauthenticated redirect
// ---------------------------------------------------------------
test.describe('Auth redirect', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('redirects dashboard root to login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/login/);
  });
});
