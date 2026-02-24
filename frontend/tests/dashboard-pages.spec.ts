import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------
// Helpers - collect ALL problems
// ---------------------------------------------------------------
interface PageProblem {
  page: string;
  type: 'console_error' | 'page_error' | 'network_error' | 'missing_element' | 'layout' | 'broken_image' | 'a11y';
  detail: string;
}

const allProblems: PageProblem[] = [];

function setupPageMonitoring(page: Page, pageName: string) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore known noise
      if (text.includes('favicon') || text.includes('hydration')) return;
      allProblems.push({ page: pageName, type: 'console_error', detail: text });
    }
  });

  page.on('pageerror', (err) => {
    allProblems.push({ page: pageName, type: 'page_error', detail: err.message });
  });

  page.on('response', (response) => {
    if (response.status() >= 500) {
      allProblems.push({
        page: pageName,
        type: 'network_error',
        detail: `${response.status()} ${response.url()}`,
      });
    }
  });
}

async function checkBrokenImages(page: Page, pageName: string) {
  const images = page.locator('img');
  const count = await images.count();
  for (let i = 0; i < count; i++) {
    const img = images.nth(i);
    const src = await img.getAttribute('src');
    const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
    if (naturalWidth === 0 && src) {
      allProblems.push({ page: pageName, type: 'broken_image', detail: `Broken image: ${src}` });
    }
  }
}

async function checkOverflow(page: Page, pageName: string) {
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  if (hasHorizontalScroll) {
    allProblems.push({ page: pageName, type: 'layout', detail: 'Horizontal scrollbar detected (content overflow)' });
  }
}

async function checkEmptyState(page: Page, pageName: string) {
  // Check if main content area has meaningful content (not just blank)
  const bodyText = await page.locator('main, [role="main"], .flex-1').first().textContent().catch(() => '');
  if (bodyText && bodyText.trim().length < 5) {
    allProblems.push({ page: pageName, type: 'missing_element', detail: 'Main content area appears empty' });
  }
}

async function checkLinks(page: Page, pageName: string) {
  const links = page.locator('a[href]');
  const count = await links.count();
  for (let i = 0; i < Math.min(count, 30); i++) {
    const link = links.nth(i);
    const href = await link.getAttribute('href');
    if (href && href.startsWith('http') && !href.includes('localhost')) continue; // skip external
    if (href === '#' || href === '') {
      const text = await link.textContent();
      allProblems.push({ page: pageName, type: 'a11y', detail: `Empty/hash-only link: "${text?.trim()}" href="${href}"` });
    }
  }
}

// ---------------------------------------------------------------
// Dashboard Pages - Full audit
// ---------------------------------------------------------------

const DASHBOARD_PAGES = [
  { path: '/', name: 'Dashboard Home', expectedText: /dashboard|jobs|bem-vindo|pipeline|KPI/i },
  { path: '/jobs', name: 'Jobs List', expectedText: /jobs|projetos|novo job|nenhum/i },
  { path: '/clients', name: 'Clients List', expectedText: /clientes|novo cliente|nenhum/i },
  { path: '/agencies', name: 'Agencies List', expectedText: /agencias|agências|nova agencia|nenhum/i },
  { path: '/people', name: 'People List', expectedText: /pessoas|colaboradores|novo|nenhum/i },
  { path: '/financial', name: 'Financial', expectedText: /financeiro|receita|despesa|nenhum/i },
  { path: '/notifications', name: 'Notifications', expectedText: /notifica|nenhuma|todas/i },
  { path: '/approvals', name: 'Approvals', expectedText: /aprova|pendente|nenhum/i },
  { path: '/team/calendar', name: 'Team Calendar', expectedText: /equipe|calendario|alocac|nenhum/i },
  { path: '/reports', name: 'Reports', expectedText: /relatorio|report|receita|producao/i },
  { path: '/portal', name: 'Client Portal', expectedText: /portal|sessao|cliente|nenhum/i },
  { path: '/settings', name: 'Settings', expectedText: /config|integra|notifica/i },
  { path: '/settings/integrations', name: 'Settings Integrations', expectedText: /integra|drive|whatsapp|n8n/i },
  { path: '/settings/notifications', name: 'Settings Notifications', expectedText: /notifica|preferencia|email/i },
];

// Paginas que fazem fetch para APIs externas (React Query) podem nunca atingir
// networkidle pois as requests ficam em polling/streaming. Usar domcontentloaded
// com waitForTimeout para aguardar o conteudo renderizar apos o SSR/hydration.
async function gotoPage(page: Page, path: string) {
  try {
    // Tentar networkidle primeiro com timeout generoso
    await page.goto(path, { waitUntil: 'networkidle', timeout: 25000 });
  } catch {
    // Fallback: se networkidle expirar (ex: /team/calendar com React Query polling),
    // usar domcontentloaded e aguardar um pouco para o React hidratar
    await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
  }
}

for (const pg of DASHBOARD_PAGES) {
  test.describe(pg.name, () => {
    test(`loads without crash`, async ({ page }) => {
      setupPageMonitoring(page, pg.name);

      const response = await page.goto(pg.path, { waitUntil: 'domcontentloaded', timeout: 25000 });

      // Should not get server error
      expect(response?.status()).toBeLessThan(500);

      // Should not redirect to login (we're authenticated)
      const url = page.url();
      expect(url).not.toContain('/login');

      // Wait for content to settle (React hydration + initial data load)
      await page.waitForTimeout(2000);

      // Check page has content matching expected pattern
      const bodyText = await page.locator('body').textContent();
      if (bodyText && !pg.expectedText.test(bodyText)) {
        allProblems.push({
          page: pg.name,
          type: 'missing_element',
          detail: `Expected text pattern ${pg.expectedText} not found in page`,
        });
      }
    });

    test(`no console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (!text.includes('favicon') && !text.includes('hydration')) {
            errors.push(text);
          }
        }
      });
      page.on('pageerror', (err) => errors.push(`PAGE_ERROR: ${err.message}`));

      await gotoPage(page, pg.path);
      await page.waitForTimeout(2000);

      if (errors.length > 0) {
        for (const err of errors) {
          allProblems.push({ page: pg.name, type: 'console_error', detail: err });
        }
      }
      // Don't fail test, just record - we'll report at the end
    });

    test(`no layout overflow`, async ({ page }) => {
      await gotoPage(page, pg.path);
      await page.waitForTimeout(1000);
      await checkOverflow(page, pg.name);
    });

    test(`no broken images`, async ({ page }) => {
      await gotoPage(page, pg.path);
      await page.waitForTimeout(1000);
      await checkBrokenImages(page, pg.name);
    });

    test(`links are valid`, async ({ page }) => {
      await gotoPage(page, pg.path);
      await page.waitForTimeout(1000);
      await checkLinks(page, pg.name);
    });
  });
}

// ---------------------------------------------------------------
// Navigation - Sidebar/Header
// ---------------------------------------------------------------
test.describe('Navigation', () => {
  test('sidebar has all main nav links', async ({ page }) => {
    await page.goto('/jobs', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const expectedLinks = ['/jobs', '/clients', '/agencies', '/people', '/financial', '/approvals', '/reports'];

    for (const href of expectedLinks) {
      const link = page.locator(`a[href="${href}"], a[href*="${href}"]`).first();
      const isVisible = await link.isVisible().catch(() => false);
      if (!isVisible) {
        allProblems.push({
          page: 'Navigation',
          type: 'missing_element',
          detail: `Sidebar link to "${href}" not found or not visible`,
        });
      }
    }
  });

  test('sidebar navigation works', async ({ page }) => {
    await page.goto('/jobs', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Usar seletor especifico do sidebar (aside) para evitar pegar links do conteudo
    // O Sidebar renderiza <aside> com <nav> contendo <Link href="/clients">
    const clientsLink = page.locator('aside a[href="/clients"]').first();
    const isVisible = await clientsLink.isVisible().catch(() => false);

    if (isVisible) {
      await clientsLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/clients');
    } else {
      // Fallback: tentar pelo texto do link no sidebar
      const clientsLinkByText = page.locator('aside a').filter({ hasText: /clientes/i }).first();
      const isFallbackVisible = await clientsLinkByText.isVisible().catch(() => false);
      if (isFallbackVisible) {
        await clientsLinkByText.click();
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain('/clients');
      } else {
        // Se nao encontrar o link, registrar como problema mas nao falhar o teste
        allProblems.push({
          page: 'Navigation',
          type: 'missing_element',
          detail: 'Clients link not found in sidebar (aside a[href="/clients"])',
        });
      }
    }
  });

  test('user menu/profile is accessible', async ({ page }) => {
    await page.goto('/jobs', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Look for user avatar, dropdown trigger, or profile button
    const userMenu = page.locator('[data-testid="user-menu"], button:has(img[alt*="avatar"]), button:has(.avatar), [aria-label*="menu"], [aria-label*="perfil"]').first();
    const hasUserMenu = await userMenu.isVisible().catch(() => false);
    if (!hasUserMenu) {
      // Try looking for any dropdown trigger in header area
      const headerButtons = page.locator('header button, nav button').last();
      const hasHeaderBtn = await headerButtons.isVisible().catch(() => false);
      if (!hasHeaderBtn) {
        allProblems.push({
          page: 'Navigation',
          type: 'missing_element',
          detail: 'No user menu/profile button found in header',
        });
      }
    }
  });
});

// ---------------------------------------------------------------
// Responsive checks (mobile viewport)
// ---------------------------------------------------------------
test.describe('Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('jobs page renders on mobile', async ({ page }) => {
    setupPageMonitoring(page, 'Mobile Jobs');
    await page.goto('/jobs', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Should not have horizontal overflow
    await checkOverflow(page, 'Mobile Jobs');

    // Content should be visible
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(10);
  });

  test('dashboard renders on mobile', async ({ page }) => {
    setupPageMonitoring(page, 'Mobile Dashboard');
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await checkOverflow(page, 'Mobile Dashboard');
  });

  test('financial page renders on mobile', async ({ page }) => {
    setupPageMonitoring(page, 'Mobile Financial');
    await page.goto('/financial', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await checkOverflow(page, 'Mobile Financial');
  });

  test('reports page renders on mobile', async ({ page }) => {
    setupPageMonitoring(page, 'Mobile Reports');
    await page.goto('/reports', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await checkOverflow(page, 'Mobile Reports');
  });
});

// ---------------------------------------------------------------
// Report all collected problems at the end
// ---------------------------------------------------------------
test.afterAll(() => {
  if (allProblems.length > 0) {
    console.log('\n========================================');
    console.log('PROBLEMS FOUND:');
    console.log('========================================');
    for (const p of allProblems) {
      console.log(`[${p.type}] ${p.page}: ${p.detail}`);
    }
    console.log(`\nTotal: ${allProblems.length} problems`);
    console.log('========================================\n');
  }
});
