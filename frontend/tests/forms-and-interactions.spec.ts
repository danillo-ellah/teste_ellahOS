import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------
interface Problem {
  page: string;
  type: string;
  detail: string;
}
const problems: Problem[] = [];

function monitor(page: Page, name: string) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (!t.includes('favicon') && !t.includes('hydration')) {
        problems.push({ page: name, type: 'console_error', detail: t });
      }
    }
  });
  page.on('pageerror', (err) => {
    problems.push({ page: name, type: 'page_error', detail: err.message });
  });
}

// ---------------------------------------------------------------
// Jobs Page - Create Dialog
// ---------------------------------------------------------------
test.describe('Jobs Page Interactions', () => {
  test('new job button exists and opens dialog/form', async ({ page }) => {
    monitor(page, 'Jobs Create');
    await page.goto('/jobs', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Look for "Novo Job" or similar create button
    const createBtn = page.locator('button:has-text("Novo"), button:has-text("Criar"), a:has-text("Novo Job")').first();
    const exists = await createBtn.isVisible().catch(() => false);

    if (exists) {
      await createBtn.click();
      await page.waitForTimeout(1000);

      // Should open a dialog/sheet/form
      const dialog = page.locator('[role="dialog"], [data-state="open"], .sheet-content, form').first();
      const dialogVisible = await dialog.isVisible().catch(() => false);
      if (!dialogVisible) {
        problems.push({ page: 'Jobs Create', type: 'interaction', detail: 'Create button clicked but no dialog/form appeared' });
      }
    } else {
      problems.push({ page: 'Jobs Create', type: 'missing_element', detail: 'No "Novo Job" / create button found on jobs page' });
    }
  });

  test('jobs table/list renders rows or empty state', async ({ page }) => {
    monitor(page, 'Jobs Table');
    await page.goto('/jobs', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Should have either table rows or empty state message
    const tableRows = page.locator('table tbody tr, [data-testid="job-row"], .job-card');
    const emptyState = page.locator('text=/nenhum|vazio|sem jobs|sem projetos/i');
    const rowCount = await tableRows.count();
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    if (rowCount === 0 && !hasEmpty) {
      problems.push({ page: 'Jobs Table', type: 'missing_element', detail: 'No job rows AND no empty state message visible' });
    }
  });

  test('jobs table has sortable columns or filters', async ({ page }) => {
    await page.goto('/jobs', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Check for search/filter input
    const search = page.locator('input[placeholder*="buscar"], input[placeholder*="pesquisar"], input[placeholder*="filtrar"], input[type="search"]').first();
    const hasSearch = await search.isVisible().catch(() => false);
    if (!hasSearch) {
      problems.push({ page: 'Jobs Table', type: 'missing_element', detail: 'No search/filter input found on jobs list' });
    }
  });
});

// ---------------------------------------------------------------
// Clients Page
// ---------------------------------------------------------------
test.describe('Clients Page Interactions', () => {
  test('new client button exists', async ({ page }) => {
    monitor(page, 'Clients Create');
    await page.goto('/clients', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const createBtn = page.locator('button:has-text("Novo"), button:has-text("Criar"), a:has-text("Novo")').first();
    const exists = await createBtn.isVisible().catch(() => false);
    if (!exists) {
      problems.push({ page: 'Clients', type: 'missing_element', detail: 'No create button found' });
    }
  });

  test('client list renders rows or empty state', async ({ page }) => {
    await page.goto('/clients', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const rows = page.locator('table tbody tr, [data-testid*="client"]');
    const empty = page.locator('text=/nenhum|vazio|sem cliente/i');
    const rowCount = await rows.count();
    const hasEmpty = await empty.isVisible().catch(() => false);

    if (rowCount === 0 && !hasEmpty) {
      problems.push({ page: 'Clients List', type: 'missing_element', detail: 'No client rows AND no empty state' });
    }
  });
});

// ---------------------------------------------------------------
// People Page
// ---------------------------------------------------------------
test.describe('People Page Interactions', () => {
  test('new person button exists', async ({ page }) => {
    monitor(page, 'People Create');
    await page.goto('/people', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const createBtn = page.locator('button:has-text("Novo"), button:has-text("Criar"), a:has-text("Novo")').first();
    const exists = await createBtn.isVisible().catch(() => false);
    if (!exists) {
      problems.push({ page: 'People', type: 'missing_element', detail: 'No create button found' });
    }
  });
});

// ---------------------------------------------------------------
// Financial Page
// ---------------------------------------------------------------
test.describe('Financial Page Interactions', () => {
  test('financial page has tabs or filters', async ({ page }) => {
    monitor(page, 'Financial');
    await page.goto('/financial', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check for tabs, filters, or summary cards
    const tabs = page.locator('[role="tablist"], [data-state="active"]');
    const cards = page.locator('.card, [class*="card"]');
    const tabCount = await tabs.count();
    const cardCount = await cards.count();

    if (tabCount === 0 && cardCount === 0) {
      problems.push({ page: 'Financial', type: 'missing_element', detail: 'No tabs or summary cards found' });
    }
  });
});

// ---------------------------------------------------------------
// Reports Page
// ---------------------------------------------------------------
test.describe('Reports Page Interactions', () => {
  test('reports page has report type selection', async ({ page }) => {
    monitor(page, 'Reports');
    await page.goto('/reports', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check for tabs, select, or buttons to choose report type
    const selectors = page.locator('[role="tablist"], select, button:has-text("Receita"), button:has-text("Revenue"), [role="tab"]');
    const count = await selectors.count();

    if (count === 0) {
      problems.push({ page: 'Reports', type: 'missing_element', detail: 'No report type selector found' });
    }
  });

  test('reports page renders charts or tables', async ({ page }) => {
    await page.goto('/reports', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Look for charts (Recharts renders SVG) or data tables
    const charts = page.locator('svg.recharts-surface, .recharts-wrapper, canvas');
    const tables = page.locator('table');
    const chartCount = await charts.count();
    const tableCount = await tables.count();

    if (chartCount === 0 && tableCount === 0) {
      problems.push({ page: 'Reports', type: 'missing_element', detail: 'No charts or data tables rendered' });
    }
  });
});

// ---------------------------------------------------------------
// Team Calendar
// ---------------------------------------------------------------
test.describe('Team Calendar Interactions', () => {
  test('calendar renders timeline/gantt or calendar view', async ({ page }) => {
    monitor(page, 'Team Calendar');
    await page.goto('/team/calendar', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check for calendar elements
    const calendar = page.locator('[class*="calendar"], [class*="gantt"], [class*="timeline"], table, svg');
    const count = await calendar.count();

    if (count === 0) {
      problems.push({ page: 'Team Calendar', type: 'missing_element', detail: 'No calendar/timeline/gantt element found' });
    }
  });
});

// ---------------------------------------------------------------
// Approvals Page
// ---------------------------------------------------------------
test.describe('Approvals Page Interactions', () => {
  test('approvals page shows list or empty state', async ({ page }) => {
    monitor(page, 'Approvals');
    await page.goto('/approvals', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const body = await page.locator('body').textContent();
    const hasContent = body && (/aprova|pendente|nenhum|vazio/i.test(body));
    if (!hasContent) {
      problems.push({ page: 'Approvals', type: 'missing_element', detail: 'Approvals page has no relevant content' });
    }
  });
});

// ---------------------------------------------------------------
// Settings Pages
// ---------------------------------------------------------------
test.describe('Settings Interactions', () => {
  test('settings has tab navigation', async ({ page }) => {
    monitor(page, 'Settings');
    await page.goto('/settings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const tabs = page.locator('a[href*="settings/"], [role="tab"]');
    const count = await tabs.count();
    if (count === 0) {
      problems.push({ page: 'Settings', type: 'missing_element', detail: 'No settings tab navigation found' });
    }
  });

  test('integrations settings shows integration cards', async ({ page }) => {
    monitor(page, 'Settings Integrations');
    await page.goto('/settings/integrations', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const body = await page.locator('body').textContent();
    const hasIntegrations = body && (/drive|whatsapp|n8n|integra/i.test(body));
    if (!hasIntegrations) {
      problems.push({ page: 'Settings Integrations', type: 'missing_element', detail: 'No integration items visible' });
    }
  });
});

// ---------------------------------------------------------------
// Theme Toggle (Dark/Light)
// ---------------------------------------------------------------
test.describe('Theme', () => {
  test('dark mode toggle exists and works', async ({ page }) => {
    await page.goto('/jobs', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Look for theme toggle button
    const themeBtn = page.locator('button[aria-label*="theme"], button[aria-label*="tema"], button:has([class*="moon"]), button:has([class*="sun"])').first();
    const exists = await themeBtn.isVisible().catch(() => false);

    if (!exists) {
      problems.push({ page: 'Theme', type: 'missing_element', detail: 'No dark/light mode toggle button found' });
    } else {
      // Try toggling
      const htmlBefore = await page.locator('html').getAttribute('class');
      await themeBtn.click();
      await page.waitForTimeout(500);
      const htmlAfter = await page.locator('html').getAttribute('class');

      if (htmlBefore === htmlAfter) {
        problems.push({ page: 'Theme', type: 'interaction', detail: 'Theme toggle clicked but html class did not change' });
      }
    }
  });
});

// ---------------------------------------------------------------
// Notification bell
// ---------------------------------------------------------------
test.describe('Notifications Bell', () => {
  test('notification icon in header', async ({ page }) => {
    await page.goto('/jobs', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const bell = page.locator('a[href*="notification"], button[aria-label*="notifica"], [data-testid="notifications"]').first();
    const exists = await bell.isVisible().catch(() => false);

    if (!exists) {
      // Try looking for bell icon SVG
      const bellIcon = page.locator('svg[class*="bell"], [class*="notification"] svg').first();
      const iconExists = await bellIcon.isVisible().catch(() => false);
      if (!iconExists) {
        problems.push({ page: 'Header', type: 'missing_element', detail: 'No notifications bell/icon found in header' });
      }
    }
  });
});

// ---------------------------------------------------------------
// Print all problems
// ---------------------------------------------------------------
test.afterAll(() => {
  if (problems.length > 0) {
    console.log('\n========================================');
    console.log('INTERACTION PROBLEMS FOUND:');
    console.log('========================================');
    for (const p of problems) {
      console.log(`[${p.type}] ${p.page}: ${p.detail}`);
    }
    console.log(`\nTotal: ${problems.length} problems`);
    console.log('========================================\n');
  }
});
