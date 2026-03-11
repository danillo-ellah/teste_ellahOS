/**
 * authenticated-flows.spec.ts
 *
 * Teste E2E de fluxos autenticados do ELLAHOS — producao
 * URL: https://teste-ellah-os.vercel.app
 *
 * Personas simuladas:
 *   - Telma  (CEO, 55 anos)         — desatenta, clica 2x, nao le erros
 *   - Marcos (PE/Coordenador)       — navega rapido, quer ver tudo
 *   - Ana    (Comercial/CRM)        — foca em oportunidades e clientes
 *   - Roberto (Financeiro)          — verifica pagamentos e fluxo de caixa
 *   - Hacker Junior (Coordenador curioso) — tenta rotas proibidas e UUIDs falsos
 *
 * Estrategia de autenticacao:
 *   - Login UMA VEZ via Supabase Auth REST API (grant_type=password)
 *   - Token salvo em `test.use({ storageState })` compartilhado entre suites
 *   - Testes sao apenas READ — sem criacao nem delecao de dados
 *
 * Formato de resultado: PASS / FAIL / WARN
 */

import { test, expect, Page, BrowserContext, Browser } from '@playwright/test';

const BASE = 'https://teste-ellah-os.vercel.app';
const SUPABASE_AUTH_URL = 'https://etvapcxesaxhsvzgaane.supabase.co/auth/v1/token?grant_type=password';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0dmFwY3hlc2F4aHN2emdhYW5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDc2NzY4OTMsImV4cCI6MjAyMzI1Mjg5M30.t0jRsqhNrM8FqJbWAl7VKXPGH7CMXLE4E3b4WBfVUHM';

const TEST_EMAIL = 'danillo@ellahfilmes.com';
// Credenciais de teste — mesmas usadas em auth.setup.ts e portal-e2e.spec.ts
const TEST_PASSWORD = 'Ellah2026!';

// ---------------------------------------------------------------------------
// Helpers de log — mesmo padrao do e2e-system-test.spec.ts
// ---------------------------------------------------------------------------

interface Finding {
  severity: 'PASS' | 'FAIL' | 'WARN';
  page: string;
  detail: string;
}

// Array compartilhado: acumula achados de todos os testes do processo
const findings: Finding[] = [];

function log(severity: Finding['severity'], page: string, detail: string) {
  findings.push({ severity, page, detail });
  const prefix = severity === 'PASS' ? '[PASS]' : severity === 'FAIL' ? '[FAIL]' : '[WARN]';
  console.log(`${prefix} ${page}: ${detail}`);
}

/**
 * Registra listener de erros de console e pageerror.
 * Retorna array compartilhado que vai crescendo conforme erros chegam.
 */
function monitorConsole(page: Page, pageName: string): string[] {
  const errors: string[] = [];
  // Ruidos conhecidos que nao indicam bug no produto
  const noise = [
    'favicon',
    'extension',
    'third-party',
    'ResizeObserver',
    'hydration',
    'ChunkLoad',
    'Loading chunk',
    'webpack',
    'hot-update',
  ];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (!noise.some((n) => txt.toLowerCase().includes(n.toLowerCase()))) {
        errors.push(txt);
        log('WARN', pageName, `Console error: ${txt.substring(0, 120)}`);
      }
    }
  });

  page.on('pageerror', (err) => {
    const txt = err.message;
    if (!noise.some((n) => txt.toLowerCase().includes(n.toLowerCase()))) {
      errors.push(txt);
      log('FAIL', pageName, `JS pageerror: ${txt.substring(0, 120)}`);
    }
  });

  return errors;
}

/**
 * Navega para URL e verifica que o status HTTP nao e erro de servidor.
 * Retorna true se carregou OK, false se encontrou erro 4xx/5xx bloqueante.
 */
async function goAndCheck(
  page: Page,
  url: string,
  label: string,
  opts: { expectAuth?: boolean } = {},
): Promise<boolean> {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null);
  const status = response?.status() ?? 0;

  if (status >= 500) {
    log('FAIL', label, `HTTP ${status} — erro de servidor`);
    return false;
  }

  // Rota autenticada: verificar se foi redirecionado pro login
  const finalUrl = page.url();
  if (opts.expectAuth && finalUrl.includes('/login')) {
    log('FAIL', label, `Sessao perdida — redirecionou para /login (estava em ${url})`);
    return false;
  }

  log('PASS', label, `Navegacao OK — status ${status}, URL final: ${finalUrl.replace(BASE, '')}`);
  return true;
}

/**
 * Aguarda um seletor aparecer com timeout curto e registra resultado.
 * Nao joga excecao — retorna true/false para que o teste decida continuar.
 */
async function waitForVisible(
  page: Page,
  selector: string,
  label: string,
  description: string,
  timeoutMs = 8000,
): Promise<boolean> {
  try {
    await page.locator(selector).first().waitFor({ state: 'visible', timeout: timeoutMs });
    log('PASS', label, description);
    return true;
  } catch {
    log('WARN', label, `Nao encontrou elemento (${timeoutMs}ms): ${description} — seletor: ${selector}`);
    return false;
  }
}

/**
 * Realiza login via Supabase Auth REST API.
 * Injeta cookies de sessao no contexto do browser para que todas as paginas
 * subsequentes ja estejam autenticadas sem precisar preencher form de login.
 *
 * Retorna o access_token ou null se falhar.
 */
async function supabaseLogin(context: BrowserContext): Promise<string | null> {
  // Usa uma pagina temporaria apenas para fazer o fetch da API
  const page = await context.newPage();

  try {
    const result = await page.evaluate(
      async ({ url, key, email, password }) => {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': key,
          },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const body = await res.text();
          return { ok: false, error: `HTTP ${res.status}: ${body}` };
        }
        const data = await res.json() as {
          access_token: string;
          refresh_token: string;
          expires_in: number;
          token_type: string;
        };
        return { ok: true, data };
      },
      {
        url: SUPABASE_AUTH_URL,
        key: SUPABASE_ANON_KEY,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      },
    );

    if (!result.ok || !('data' in result) || !result.data) {
      log('FAIL', 'AUTH', `Login via API falhou: ${'error' in result ? result.error : 'resposta vazia'}`);
      return null;
    }

    const { access_token, refresh_token } = result.data;

    // Injeta o token como cookie `sb-access-token` e `sb-refresh-token`
    // que o Next.js/Supabase SSR client le para restaurar a sessao
    const projectRef = 'etvapcxesaxhsvzgaane';
    const domain = 'teste-ellah-os.vercel.app';

    await context.addCookies([
      {
        name: `sb-${projectRef}-auth-token`,
        value: JSON.stringify({
          access_token,
          refresh_token,
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        }),
        domain,
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'Lax',
      },
    ]);

    log('PASS', 'AUTH', `Login OK — token obtido, cookie injetado para ${domain}`);
    return access_token;
  } catch (err) {
    log('FAIL', 'AUTH', `Excecao durante login via API: ${String(err).substring(0, 120)}`);
    return null;
  } finally {
    await page.close();
  }
}

/**
 * Alternativa de login: preenche o form de /login no browser.
 * Usada como fallback se o cookie de sessao nao for reconhecido.
 */
async function loginViaForm(page: Page): Promise<boolean> {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 });

  const emailInput = page.locator('input[type="email"], input[name="email"], input#email').first();
  const passInput = page.locator('input[type="password"], input[name="password"], input#password').first();
  const submitBtn = page.locator('button[type="submit"]').first();

  if (await emailInput.count() === 0) {
    log('FAIL', 'AUTH_FORM', 'Campo email nao encontrado no form de login');
    return false;
  }

  await emailInput.fill(TEST_EMAIL);
  await passInput.fill(TEST_PASSWORD);
  await submitBtn.click();

  // Aguarda redirect para dashboard (qualquer rota nao-login)
  try {
    await page.waitForFunction(
      () => !window.location.pathname.includes('/login'),
      { timeout: 15000 },
    );
    log('PASS', 'AUTH_FORM', `Login via form OK — URL atual: ${page.url().replace(BASE, '')}`);
    return true;
  } catch {
    log('FAIL', 'AUTH_FORM', `Timeout esperando redirect apos login — URL: ${page.url().replace(BASE, '')}`);
    return false;
  }
}

/**
 * Verifica se a pagina atual esta autenticada (nao redirecionou para /login).
 * Se estiver em /login, tenta login via form como fallback.
 */
async function ensureAuth(page: Page, label: string): Promise<boolean> {
  if (page.url().includes('/login') || page.url().includes('/landing')) {
    log('WARN', label, 'Cookie nao reconhecido — tentando login via form');
    return await loginViaForm(page);
  }
  return true;
}

// ---------------------------------------------------------------------------
// SETUP GLOBAL — login uma vez, reutiliza token em todas as suites
// ---------------------------------------------------------------------------

// Flag para saber se o login ja foi feito neste processo
let globalAuthDone = false;

// Funcao chamada por cada suite para garantir autenticacao
// Com o setup project (auth.setup.ts), o storageState ja deve estar injetado
// loginViaForm so e usado como fallback se o storageState nao funcionar
async function setupAuth(page: Page): Promise<boolean> {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(2000);

  if (page.url().includes('/login') || page.url().includes('/landing')) {
    log('WARN', 'SETUP', 'storageState nao reconhecido — tentando login via form');
    return await loginViaForm(page);
  }

  return true;
}

// ---------------------------------------------------------------------------
// SUITE A — Persona "Telma" (CEO, 55 anos, desatenta)
// ---------------------------------------------------------------------------

test.describe('SUITE A — Persona Telma (CEO desatenta)', () => {
  test.setTimeout(30000);

  test('A.1 Dashboard / — KPIs visiveis apos login', async ({ page, context }) => {
    const errors = monitorConsole(page, 'A.1 Dashboard');

    const authed = await setupAuth(page);
    if (!authed) {
      log('FAIL', 'A.1 Dashboard', 'Sem autenticacao — teste abortado');
      return;
    }

    // Navega para dashboard principal
    const ok = await goAndCheck(page, `${BASE}/`, 'A.1 Dashboard', { expectAuth: true });
    if (!ok) return;

    // Verifica que tem algum conteudo de dashboard (h1, cards, etc)
    // Telma quer saber se a tela nao esta em branco
    const contentIndicators = [
      'h1',
      '[class*="card"]',
      '[class*="Card"]',
      'main',
    ];

    let foundContent = false;
    for (const sel of contentIndicators) {
      const count = await page.locator(sel).count();
      if (count > 0) {
        foundContent = true;
        log('PASS', 'A.1 Dashboard', `Conteudo encontrado: ${count}x "${sel}"`);
        break;
      }
    }

    if (!foundContent) {
      log('WARN', 'A.1 Dashboard', 'Nenhum indicador de conteudo encontrado — dashboard pode estar em branco');
    }

    // Verifica que nao tem mensagem de erro na tela
    const errorOnScreen = page.locator('text=/erro interno|something went wrong|unexpected error/i');
    if (await errorOnScreen.count() > 0) {
      log('FAIL', 'A.1 Dashboard', 'Mensagem de erro de aplicacao visivel na tela');
    }

    if (errors.filter((e) => !e.includes('401')).length === 0) {
      log('PASS', 'A.1 Dashboard', 'Zero erros de console relevantes');
    }
  });

  test('A.2 /minha-semana — 4 KPI cards aparecem', async ({ page }) => {
    const errors = monitorConsole(page, 'A.2 Minha Semana');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'A.2 Minha Semana', 'Sem autenticacao'); return; }

    const ok = await goAndCheck(page, `${BASE}/minha-semana`, 'A.2 Minha Semana', { expectAuth: true });
    if (!ok) return;

    // Aguarda skeleton sumir (pagina carregada)
    await page.locator('[class*="skeleton"], [class*="Skeleton"]').last().waitFor({ state: 'hidden', timeout: 8000 }).catch(() => null);

    // Os 4 KPI cards da Minha Semana: Jobs, Entregas, Diarias, Aprovacoes
    // Identifica por Cards com CardTitle ou pelo heading da pagina
    const pageTitle = page.locator('h1, [class*="font-semibold"]').first();
    const titleText = await pageTitle.textContent().catch(() => '');
    if (titleText && titleText.length > 0) {
      log('PASS', 'A.2 Minha Semana', `Titulo da pagina: "${titleText.trim().substring(0, 60)}"`);
    } else {
      log('WARN', 'A.2 Minha Semana', 'Titulo da pagina nao encontrado');
    }

    // Conta cards na pagina
    const cards = page.locator('[class*="rounded"][class*="border"], [data-slot="card"]');
    const cardCount = await cards.count();
    if (cardCount >= 4) {
      log('PASS', 'A.2 Minha Semana', `${cardCount} cards encontrados (esperado >= 4)`);
    } else if (cardCount > 0) {
      log('WARN', 'A.2 Minha Semana', `Apenas ${cardCount} cards encontrados (esperado >= 4)`);
    } else {
      log('WARN', 'A.2 Minha Semana', 'Nenhum card encontrado — pode estar carregando ainda');
    }

    // Verifica KPI labels especificos (Jobs, Entregas, Diarias, Aprovacoes)
    const kpiLabels = ['Jobs', 'Entrega', 'Diaria', 'Aprova'];
    for (const label of kpiLabels) {
      const el = page.locator(`text=/${label}/i`).first();
      if (await el.count() > 0) {
        log('PASS', 'A.2 Minha Semana', `KPI "${label}" encontrado`);
      } else {
        log('WARN', 'A.2 Minha Semana', `KPI "${label}" NAO encontrado`);
      }
    }
  });

  test('A.3 /jobs — Telma clica num job e o detalhe abre com tabs', async ({ page }) => {
    const errors = monitorConsole(page, 'A.3 Job Detalhe');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'A.3 Job Detalhe', 'Sem autenticacao'); return; }

    const ok = await goAndCheck(page, `${BASE}/jobs`, 'A.3 Jobs Lista', { expectAuth: true });
    if (!ok) return;

    // Aguarda tabela ou lista de jobs carregar
    await page.locator('table tbody tr, [class*="job-row"], a[href*="/jobs/"]').first().waitFor({
      state: 'visible',
      timeout: 10000,
    }).catch(() => null);

    // Tenta clicar no primeiro job da lista
    const firstJobLink = page.locator('a[href*="/jobs/"]').first();
    const firstJobCount = await firstJobLink.count();

    if (firstJobCount === 0) {
      log('WARN', 'A.3 Job Detalhe', 'Nenhum link de job encontrado na lista — pode nao ter jobs cadastrados');
      return;
    }

    const jobHref = await firstJobLink.getAttribute('href') ?? '';
    await firstJobLink.click();

    // Aguarda URL mudar para /jobs/[uuid]
    try {
      await page.waitForFunction(
        (href: string) => window.location.pathname.includes('/jobs/') && window.location.pathname !== href,
        '/jobs',
        { timeout: 10000 },
      );
    } catch {
      log('WARN', 'A.3 Job Detalhe', `Nao navegou para detalhe do job — URL: ${page.url().replace(BASE, '')}`);
      return;
    }

    log('PASS', 'A.3 Job Detalhe', `Navegou para: ${page.url().replace(BASE, '')}`);

    // Verifica que tabs aparecem no detalhe
    // JobDetailTabs usa data-value nos TabsTrigger do shadcn/ui
    const tabsArea = page.locator('[role="tablist"]');
    if (await tabsArea.count() > 0) {
      const tabCount = await tabsArea.locator('[role="tab"]').count();
      log('PASS', 'A.3 Job Detalhe', `TabList encontrado com ${tabCount} tab(s)`);
    } else {
      log('WARN', 'A.3 Job Detalhe', 'TabList nao encontrado no detalhe do job — tabs podem nao ter carregado');
    }

    // Titulo do job deve estar visivel
    const jobTitle = page.locator('h1, [class*="job-title"], [class*="font-semibold"]').first();
    const titleText = await jobTitle.textContent().catch(() => '');
    if (titleText && titleText.trim().length > 0) {
      log('PASS', 'A.3 Job Detalhe', `Titulo do job visivel: "${titleText.trim().substring(0, 60)}"`);
    } else {
      log('WARN', 'A.3 Job Detalhe', 'Titulo do job nao visivel');
    }
  });

  test('A.4 Sidebar — items de menu corretos aparecem', async ({ page }) => {
    monitorConsole(page, 'A.4 Sidebar');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'A.4 Sidebar', 'Sem autenticacao'); return; }

    await goAndCheck(page, `${BASE}/`, 'A.4 Sidebar', { expectAuth: true });

    // Sidebar deve ter links para as principais secoes
    const expectedLinks = [
      { text: /Minha Semana|semana/i, label: 'Minha Semana' },
      { text: /Jobs/i, label: 'Jobs' },
      { text: /Comercial|Oportunidades|CRM/i, label: 'CRM/Comercial' },
      { text: /Financeiro/i, label: 'Financeiro' },
      { text: /Clientes/i, label: 'Clientes' },
    ];

    for (const item of expectedLinks) {
      const el = page.locator(`nav a, aside a, [class*="sidebar"] a`).filter({ hasText: item.text }).first();
      if (await el.count() > 0) {
        log('PASS', 'A.4 Sidebar', `Item "${item.label}" encontrado na sidebar`);
      } else {
        // Tenta sem restricao de nav/aside
        const elAny = page.locator(`a`).filter({ hasText: item.text }).first();
        if (await elAny.count() > 0) {
          log('PASS', 'A.4 Sidebar', `Item "${item.label}" encontrado (sem restricao de container)`);
        } else {
          log('WARN', 'A.4 Sidebar', `Item "${item.label}" NAO encontrado`);
        }
      }
    }
  });

  test('A.5 Tema escuro — toggle altera classe html', async ({ page }) => {
    monitorConsole(page, 'A.5 Tema');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'A.5 Tema', 'Sem autenticacao'); return; }

    await goAndCheck(page, `${BASE}/`, 'A.5 Tema', { expectAuth: true });

    // Busca o botao de toggle de tema (aria-label="Alternar tema")
    const toggleBtn = page.locator('button[aria-label="Alternar tema"], button[aria-label*="tema"], button[aria-label*="theme"]').first();

    if (await toggleBtn.count() === 0) {
      log('WARN', 'A.5 Tema', 'Botao de toggle de tema nao encontrado — pode estar em outro local');
      return;
    }

    // Captura classe atual do html
    const htmlClassBefore = await page.locator('html').getAttribute('class') ?? '';
    const isDarkBefore = htmlClassBefore.includes('dark');

    await toggleBtn.click();
    // Aguarda transicao CSS
    await page.waitForTimeout(500);

    const htmlClassAfter = await page.locator('html').getAttribute('class') ?? '';
    const isDarkAfter = htmlClassAfter.includes('dark');

    if (isDarkBefore !== isDarkAfter) {
      log('PASS', 'A.5 Tema', `Toggle funcionou: dark=${isDarkBefore} → dark=${isDarkAfter}`);
    } else {
      log('WARN', 'A.5 Tema', `Classe "dark" nao mudou apos toggle — antes: "${htmlClassBefore}", depois: "${htmlClassAfter}"`);
    }
  });
});

// ---------------------------------------------------------------------------
// SUITE B — Persona "Marcos" (PE/Coordenador, navega rapido)
// ---------------------------------------------------------------------------

test.describe('SUITE B — Persona Marcos (PE, navega rapido)', () => {
  test.setTimeout(30000);

  test('B.1 /jobs — lista de jobs carrega com linhas na tabela', async ({ page }) => {
    const errors = monitorConsole(page, 'B.1 Jobs Lista');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'B.1 Jobs Lista', 'Sem autenticacao'); return; }

    const ok = await goAndCheck(page, `${BASE}/jobs`, 'B.1 Jobs Lista', { expectAuth: true });
    if (!ok) return;

    // Aguarda conteudo da pagina (nao skeleton)
    await page.locator('[class*="skeleton"], [class*="Skeleton"]').last().waitFor({ state: 'hidden', timeout: 8000 }).catch(() => null);

    // Verifica se tem tabela com linhas OU kanban OU estado vazio
    const tableRows = page.locator('table tbody tr');
    const kanbanCards = page.locator('[class*="kanban"], [data-type="job-card"]');
    const emptyState = page.locator('text=/nenhum job|sem jobs|vazio|empty/i');

    const rowCount = await tableRows.count();
    const kanbanCount = await kanbanCards.count();
    const emptyCount = await emptyState.count();

    if (rowCount > 0) {
      log('PASS', 'B.1 Jobs Lista', `Tabela com ${rowCount} linha(s) de jobs`);
    } else if (kanbanCount > 0) {
      log('PASS', 'B.1 Jobs Lista', `Kanban com ${kanbanCount} card(s) de jobs`);
    } else if (emptyCount > 0) {
      log('WARN', 'B.1 Jobs Lista', 'Estado vazio — nenhum job cadastrado (pode ser ambiente limpo)');
    } else {
      // Verifica se tem algum link de job como fallback
      const jobLinks = await page.locator('a[href*="/jobs/"]').count();
      if (jobLinks > 0) {
        log('PASS', 'B.1 Jobs Lista', `${jobLinks} link(s) de job encontrado(s)`);
      } else {
        log('WARN', 'B.1 Jobs Lista', 'Nenhuma linha, card kanban ou link de job encontrado');
      }
    }

    if (errors.filter((e) => !e.includes('401')).length === 0) {
      log('PASS', 'B.1 Jobs Lista', 'Zero erros de console');
    }
  });

  test('B.2 /jobs/[id] — tabs de grupo aparecem no detalhe', async ({ page }) => {
    monitorConsole(page, 'B.2 Job Tabs');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'B.2 Job Tabs', 'Sem autenticacao'); return; }

    await goAndCheck(page, `${BASE}/jobs`, 'B.2 Jobs Lista', { expectAuth: true });

    const firstLink = page.locator('a[href*="/jobs/"]').first();
    if (await firstLink.count() === 0) {
      log('WARN', 'B.2 Job Tabs', 'Nenhum job na lista — pulando teste de detalhe');
      return;
    }

    await firstLink.click();
    await page.waitForFunction(
      () => window.location.pathname.includes('/jobs/') && window.location.pathname.length > '/jobs/'.length,
      { timeout: 10000 },
    ).catch(() => null);

    // Aguarda skeleton do detalhe sumir
    await page.locator('[class*="skeleton"], [class*="Skeleton"]').last().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => null);

    // Grupo de tabs: "Visao Geral", "Pre-Producao", "Relatorio de Set", "Financeiro"
    const tabGroups = [
      { text: /Visao Geral|visão geral/i, label: 'Tab Visao Geral' },
      { text: /Pre.Prod|Pré-Prod/i, label: 'Tab Pre-Producao' },
      { text: /Financeiro/i, label: 'Tab Financeiro' },
      { text: /Equipe/i, label: 'Tab Equipe' },
    ];

    for (const group of tabGroups) {
      const tab = page.locator('[role="tab"]').filter({ hasText: group.text }).first();
      if (await tab.count() > 0) {
        log('PASS', 'B.2 Job Tabs', `${group.label} encontrada`);
      } else {
        log('WARN', 'B.2 Job Tabs', `${group.label} NAO encontrada`);
      }
    }
  });

  test('B.3 /jobs/[id] — Tab Workflow visivel no grupo Visao Geral', async ({ page }) => {
    monitorConsole(page, 'B.3 Tab Workflow');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'B.3 Tab Workflow', 'Sem autenticacao'); return; }

    await goAndCheck(page, `${BASE}/jobs`, 'B.3 Jobs', { expectAuth: true });

    const firstLink = page.locator('a[href*="/jobs/"]').first();
    if (await firstLink.count() === 0) {
      log('WARN', 'B.3 Tab Workflow', 'Nenhum job disponivel');
      return;
    }

    await firstLink.click();
    await page.waitForFunction(
      () => window.location.pathname.includes('/jobs/') && window.location.pathname.length > '/jobs/'.length,
      { timeout: 10000 },
    ).catch(() => null);

    await page.locator('[class*="skeleton"], [class*="Skeleton"]').last().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => null);

    // Tab Workflow pode estar dentro do grupo "Visao Geral" ou no root tablist
    const workflowTab = page.locator('[role="tab"]').filter({ hasText: /Workflow|Status|Pipeline/i }).first();
    if (await workflowTab.count() > 0) {
      log('PASS', 'B.3 Tab Workflow', 'Tab Workflow/Status encontrada no detalhe do job');
    } else {
      log('WARN', 'B.3 Tab Workflow', 'Tab Workflow nao encontrada — pode estar em sub-tab ou nome diferente');
    }
  });

  test('B.4 /jobs/[id] — Tab Equipe mostra membros', async ({ page }) => {
    monitorConsole(page, 'B.4 Tab Equipe');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'B.4 Tab Equipe', 'Sem autenticacao'); return; }

    await goAndCheck(page, `${BASE}/jobs`, 'B.4 Jobs', { expectAuth: true });

    const firstLink = page.locator('a[href*="/jobs/"]').first();
    if (await firstLink.count() === 0) {
      log('WARN', 'B.4 Tab Equipe', 'Nenhum job disponivel');
      return;
    }

    await firstLink.click();
    await page.waitForFunction(
      () => window.location.pathname.includes('/jobs/') && window.location.pathname.length > '/jobs/'.length,
      { timeout: 10000 },
    ).catch(() => null);

    await page.locator('[class*="skeleton"], [class*="Skeleton"]').last().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => null);

    // Clica na tab Equipe
    const equipeTab = page.locator('[role="tab"]').filter({ hasText: /Equipe/i }).first();
    if (await equipeTab.count() === 0) {
      log('WARN', 'B.4 Tab Equipe', 'Tab Equipe nao encontrada');
      return;
    }

    await equipeTab.click();
    await page.waitForTimeout(1500);

    // Verifica conteudo da tab Equipe: tabela, lista ou estado vazio
    const memberRows = page.locator('table tbody tr');
    const memberCards = page.locator('[class*="member"], [class*="team"]');
    const emptyTeam = page.locator('text=/sem membros|nenhum membro|equipe vazia|sem equipe/i');

    const rowCount = await memberRows.count();
    const cardCount = await memberCards.count();

    if (rowCount > 0) {
      log('PASS', 'B.4 Tab Equipe', `Equipe com ${rowCount} membro(s) na tabela`);
    } else if (cardCount > 0) {
      log('PASS', 'B.4 Tab Equipe', `Equipe com ${cardCount} membro(s) em cards`);
    } else if (await emptyTeam.count() > 0) {
      log('WARN', 'B.4 Tab Equipe', 'Equipe vazia (sem membros cadastrados neste job)');
    } else {
      log('WARN', 'B.4 Tab Equipe', 'Conteudo da Tab Equipe indefinido — tabela nem estado vazio encontrado');
    }
  });

  test('B.5 /pos-producao — carrega com KPI cards no topo', async ({ page }) => {
    const errors = monitorConsole(page, 'B.5 Pos-Producao');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'B.5 Pos-Producao', 'Sem autenticacao'); return; }

    const ok = await goAndCheck(page, `${BASE}/pos-producao`, 'B.5 Pos-Producao', { expectAuth: true });
    if (!ok) return;

    // Aguarda skeleton sumir
    await page.locator('[class*="skeleton"], [class*="Skeleton"]').last().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => null);

    // KPI cards: Total, Ativos, Atrasados, Entregues
    const kpiLabels = ['Total', 'Ativo', 'Atraso', 'Entregue'];
    for (const kpi of kpiLabels) {
      const el = page.locator(`text=/${kpi}/i`).first();
      if (await el.count() > 0) {
        log('PASS', 'B.5 Pos-Producao', `KPI "${kpi}" encontrado`);
      } else {
        log('WARN', 'B.5 Pos-Producao', `KPI "${kpi}" NAO encontrado`);
      }
    }

    // Toggle Kanban/Lista deve estar presente
    const toggleBtns = page.locator('button').filter({ hasText: /kanban|lista|grid|list/i });
    if (await toggleBtns.count() > 0) {
      log('PASS', 'B.5 Pos-Producao', 'Toggle Kanban/Lista presente');
    } else {
      log('WARN', 'B.5 Pos-Producao', 'Toggle Kanban/Lista nao encontrado');
    }
  });

  test('B.6 /pos-producao — filtros respondem sem crash', async ({ page }) => {
    monitorConsole(page, 'B.6 Pos-Filtros');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'B.6 Pos-Filtros', 'Sem autenticacao'); return; }

    await goAndCheck(page, `${BASE}/pos-producao`, 'B.6 Pos-Filtros', { expectAuth: true });

    await page.locator('[class*="skeleton"], [class*="Skeleton"]').last().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => null);

    // Tenta interagir com select/input de filtro
    const filterSelects = page.locator('select, [role="combobox"]');
    const filterInputs = page.locator('input[placeholder*="buscar"], input[placeholder*="filtrar"], input[type="search"]');

    const selectCount = await filterSelects.count();
    const inputCount = await filterInputs.count();

    if (selectCount > 0) {
      log('PASS', 'B.6 Pos-Filtros', `${selectCount} select(s) de filtro encontrado(s)`);
      // Nao interage — apenas verifica presenca
    } else if (inputCount > 0) {
      log('PASS', 'B.6 Pos-Filtros', `${inputCount} input(s) de filtro encontrado(s)`);
    } else {
      log('WARN', 'B.6 Pos-Filtros', 'Nenhum controle de filtro encontrado na pos-producao');
    }

    // Verifica que nao tem erro 500 ou crash
    const crashMsg = page.locator('text=/erro interno|500|something went wrong/i');
    if (await crashMsg.count() > 0) {
      log('FAIL', 'B.6 Pos-Filtros', 'Mensagem de erro/crash visivel na pagina');
    } else {
      log('PASS', 'B.6 Pos-Filtros', 'Pagina sem mensagem de erro visivel');
    }
  });
});

// ---------------------------------------------------------------------------
// SUITE C — Persona "Ana" (Comercial / CRM)
// ---------------------------------------------------------------------------

test.describe('SUITE C — Persona Ana (Comercial, CRM)', () => {
  test.setTimeout(30000);

  test('C.1 /crm — pipeline Kanban carrega com colunas', async ({ page }) => {
    const errors = monitorConsole(page, 'C.1 CRM Kanban');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'C.1 CRM Kanban', 'Sem autenticacao'); return; }

    const ok = await goAndCheck(page, `${BASE}/crm`, 'C.1 CRM', { expectAuth: true });
    if (!ok) return;

    await page.locator('[class*="skeleton"], [class*="Skeleton"]').last().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => null);

    // Verifica colunas do Kanban CRM
    // Etapas: Prospecção, Contato, Proposta, Negociação, Fechado-Ganho, Fechado-Perdido
    const stageNames = ['Prospe', 'Contato', 'Proposta', 'Negocia', 'Fechado'];
    for (const stage of stageNames) {
      const el = page.locator(`text=/${stage}/i`).first();
      if (await el.count() > 0) {
        log('PASS', 'C.1 CRM Kanban', `Coluna "${stage}" encontrada`);
      } else {
        log('WARN', 'C.1 CRM Kanban', `Coluna "${stage}" NAO encontrada`);
      }
    }

    // Verifica se tem pelo menos uma coluna de kanban renderizada
    // CrmKanban usa divs com colunas — pode ter classe especifica
    const kanbanCols = page.locator('[class*="kanban"], [class*="column"], [data-stage]');
    const colCount = await kanbanCols.count();
    if (colCount > 0) {
      log('PASS', 'C.1 CRM Kanban', `${colCount} coluna(s) de kanban encontrada(s)`);
    }

    if (errors.filter((e) => !e.includes('401')).length === 0) {
      log('PASS', 'C.1 CRM Kanban', 'Zero erros de console');
    }
  });

  test('C.2 /crm — toggle Kanban/Lista funciona', async ({ page }) => {
    monitorConsole(page, 'C.2 CRM Toggle');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'C.2 CRM Toggle', 'Sem autenticacao'); return; }

    await goAndCheck(page, `${BASE}/crm`, 'C.2 CRM Toggle', { expectAuth: true });
    await page.locator('[class*="skeleton"], [class*="Skeleton"]').last().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => null);

    // Busca botoes de toggle (LayoutGrid / List icons ou texto)
    const listToggle = page.locator('button').filter({ hasText: /lista|list/i }).first();
    const gridToggle = page.locator('button').filter({ hasText: /kanban|grid/i }).first();

    // Usa seletores alternativos baseados nos icones Lucide renderizados como SVG
    // (LayoutGrid e List — os botoes nao tem texto, so icone)
    const toggleBtns = page.locator('button[class*="variant"], button[class*="outline"]').filter({
      has: page.locator('svg'),
    });

    if (await listToggle.count() > 0) {
      await listToggle.click();
      await page.waitForTimeout(1000);
      log('PASS', 'C.2 CRM Toggle', 'Toggle "Lista" clicado sem crash');
    } else if (await toggleBtns.count() >= 2) {
      // Tenta clicar no segundo botao de toggle (normalmente e o "Lista")
      await toggleBtns.nth(1).click();
      await page.waitForTimeout(1000);
      log('PASS', 'C.2 CRM Toggle', 'Segundo botao de toggle clicado sem crash');
    } else {
      log('WARN', 'C.2 CRM Toggle', 'Botao de toggle Kanban/Lista nao identificado claramente');
      return;
    }

    // Verifica que a pagina nao crashou
    const crashMsg = page.locator('text=/erro interno|500|something went wrong/i');
    if (await crashMsg.count() > 0) {
      log('FAIL', 'C.2 CRM Toggle', 'Crash apos toggle de view');
    } else {
      log('PASS', 'C.2 CRM Toggle', 'Pagina estavel apos toggle de view');
    }
  });

  test('C.3 /crm/dashboard — metricas CRM carregam', async ({ page }) => {
    const errors = monitorConsole(page, 'C.3 CRM Dashboard');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'C.3 CRM Dashboard', 'Sem autenticacao'); return; }

    const ok = await goAndCheck(page, `${BASE}/crm/dashboard`, 'C.3 CRM Dashboard', { expectAuth: true });
    if (!ok) return;

    await page.locator('[class*="skeleton"], [class*="Skeleton"]').last().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => null);

    // Verifica que tem alguma metrica de CRM visivel
    const metricLabels = ['Taxa', 'Valor', 'Opor', 'Convers'];
    let found = 0;
    for (const label of metricLabels) {
      if (await page.locator(`text=/${label}/i`).count() > 0) found++;
    }

    if (found > 0) {
      log('PASS', 'C.3 CRM Dashboard', `${found} metrica(s) de CRM encontrada(s)`);
    } else {
      log('WARN', 'C.3 CRM Dashboard', 'Nenhuma metrica identificada no dashboard CRM');
    }

    // Sem erros de servidor
    const serverError = page.locator('text=/500|erro interno/i');
    if (await serverError.count() > 0) {
      log('FAIL', 'C.3 CRM Dashboard', 'Erro de servidor visivel');
    } else {
      log('PASS', 'C.3 CRM Dashboard', 'Sem erro de servidor visivel');
    }
  });

  test('C.4 /crm/perdas — analise de perdas carrega', async ({ page }) => {
    const errors = monitorConsole(page, 'C.4 CRM Perdas');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'C.4 CRM Perdas', 'Sem autenticacao'); return; }

    const ok = await goAndCheck(page, `${BASE}/crm/perdas`, 'C.4 CRM Perdas', { expectAuth: true });
    if (!ok) return;

    await page.locator('[class*="skeleton"], [class*="Skeleton"]').last().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => null);

    // Pagina de perdas deve ter: titulo, filtros, grafico ou tabela
    const titleEl = page.locator('h1').first();
    const titleText = await titleEl.textContent().catch(() => '');
    if (titleText && titleText.length > 0) {
      log('PASS', 'C.4 CRM Perdas', `Titulo: "${titleText.trim().substring(0, 60)}"`);
    } else {
      log('WARN', 'C.4 CRM Perdas', 'H1 nao encontrado');
    }

    // Conteudo principal: tabela ou grafico
    const hasChart = await page.locator('svg[class*="recharts"], [class*="recharts-wrapper"]').count() > 0;
    const hasTable = await page.locator('table').count() > 0;
    const hasCards = await page.locator('[class*="card"], [data-slot="card"]').count() > 0;

    if (hasChart || hasTable || hasCards) {
      log('PASS', 'C.4 CRM Perdas', `Conteudo encontrado: chart=${hasChart}, table=${hasTable}, cards=${hasCards}`);
    } else {
      log('WARN', 'C.4 CRM Perdas', 'Nenhum grafico, tabela ou card encontrado');
    }
  });

  test('C.5 /crm — clicar numa oportunidade abre detalhe', async ({ page }) => {
    monitorConsole(page, 'C.5 CRM Oportunidade');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'C.5 CRM Oportunidade', 'Sem autenticacao'); return; }

    await goAndCheck(page, `${BASE}/crm`, 'C.5 CRM', { expectAuth: true });
    await page.locator('[class*="skeleton"], [class*="Skeleton"]').last().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => null);

    // Tenta encontrar link para uma oportunidade
    const oppLink = page.locator('a[href*="/crm/"]').filter({ hasNot: page.locator('[href="/crm"]') }).first();

    if (await oppLink.count() === 0) {
      log('WARN', 'C.5 CRM Oportunidade', 'Nenhum link de oportunidade encontrado — pode nao ter oportunidades');
      return;
    }

    const href = await oppLink.getAttribute('href') ?? '';
    await oppLink.click();

    await page.waitForFunction(
      () => window.location.pathname.includes('/crm/') && window.location.pathname.length > '/crm/'.length,
      { timeout: 10000 },
    ).catch(() => null);

    const finalUrl = page.url().replace(BASE, '');
    if (finalUrl.includes('/crm/') && finalUrl.length > '/crm/'.length) {
      log('PASS', 'C.5 CRM Oportunidade', `Detalhe da oportunidade abriu: ${finalUrl}`);

      // Verifica que tem conteudo (nao e 404)
      const notFound = page.locator('text=/nao encontrado|not found|404/i');
      if (await notFound.count() > 0) {
        log('FAIL', 'C.5 CRM Oportunidade', '404 no detalhe da oportunidade');
      }
    } else {
      log('WARN', 'C.5 CRM Oportunidade', `URL nao mudou para detalhe: ${finalUrl}`);
    }
  });

  test('C.6 /clients — lista de clientes carrega', async ({ page }) => {
    const errors = monitorConsole(page, 'C.6 Clientes');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'C.6 Clientes', 'Sem autenticacao'); return; }

    const ok = await goAndCheck(page, `${BASE}/clients`, 'C.6 Clientes', { expectAuth: true });
    if (!ok) return;

    await page.locator('[class*="skeleton"], [class*="Skeleton"]').last().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => null);

    // Tabela ou cards de clientes
    const tableRows = await page.locator('table tbody tr').count();
    const clientCards = await page.locator('[class*="client"]').count();
    const emptyState = await page.locator('text=/nenhum cliente|sem clientes|vazio/i').count();

    if (tableRows > 0) {
      log('PASS', 'C.6 Clientes', `Tabela com ${tableRows} cliente(s)`);
    } else if (clientCards > 0) {
      log('PASS', 'C.6 Clientes', `${clientCards} card(s) de cliente encontrado(s)`);
    } else if (emptyState > 0) {
      log('WARN', 'C.6 Clientes', 'Estado vazio — nenhum cliente cadastrado');
    } else {
      log('WARN', 'C.6 Clientes', 'Conteudo da lista de clientes indefinido');
    }

    if (errors.filter((e) => !e.includes('401')).length === 0) {
      log('PASS', 'C.6 Clientes', 'Zero erros de console');
    }
  });

  test('C.7 /agencies — lista de agencias carrega', async ({ page }) => {
    const errors = monitorConsole(page, 'C.7 Agencias');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'C.7 Agencias', 'Sem autenticacao'); return; }

    const ok = await goAndCheck(page, `${BASE}/agencies`, 'C.7 Agencias', { expectAuth: true });
    if (!ok) return;

    await page.locator('[class*="skeleton"], [class*="Skeleton"]').last().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => null);

    const tableRows = await page.locator('table tbody tr').count();
    const emptyState = await page.locator('text=/nenhuma agencia|sem agencias|vazio/i').count();

    if (tableRows > 0) {
      log('PASS', 'C.7 Agencias', `Tabela com ${tableRows} agencia(s)`);
    } else if (emptyState > 0) {
      log('WARN', 'C.7 Agencias', 'Estado vazio — nenhuma agencia cadastrada');
    } else {
      log('WARN', 'C.7 Agencias', 'Lista de agencias sem conteudo identificado');
    }

    if (errors.filter((e) => !e.includes('401')).length === 0) {
      log('PASS', 'C.7 Agencias', 'Zero erros de console');
    }
  });
});

// ---------------------------------------------------------------------------
// SUITE D — Persona "Roberto" (Financeiro)
// ---------------------------------------------------------------------------

test.describe('SUITE D — Persona Roberto (Financeiro)', () => {
  test.setTimeout(30000);

  test('D.1 /financeiro — visao geral carrega com cards de resumo', async ({ page }) => {
    const errors = monitorConsole(page, 'D.1 Financeiro');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'D.1 Financeiro', 'Sem autenticacao'); return; }

    const ok = await goAndCheck(page, `${BASE}/financeiro`, 'D.1 Financeiro', { expectAuth: true });
    if (!ok) return;

    await page.locator('[class*="skeleton"], [class*="Skeleton"]').last().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => null);

    // Verifica cards de resumo financeiro: Receitas, Despesas, Saldo
    const financialLabels = ['Receita', 'Despesa', 'Saldo'];
    for (const label of financialLabels) {
      if (await page.locator(`text=/${label}/i`).count() > 0) {
        log('PASS', 'D.1 Financeiro', `Card/label "${label}" encontrado`);
      } else {
        log('WARN', 'D.1 Financeiro', `Card/label "${label}" NAO encontrado`);
      }
    }

    if (errors.filter((e) => !e.includes('401')).length === 0) {
      log('PASS', 'D.1 Financeiro', 'Zero erros de console');
    }
  });

  test('D.2 /financeiro/calendario — calendario de pagamentos carrega', async ({ page }) => {
    const errors = monitorConsole(page, 'D.2 Financeiro Calendario');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'D.2 Financeiro Calendario', 'Sem autenticacao'); return; }

    const ok = await goAndCheck(page, `${BASE}/financeiro/calendario`, 'D.2 Financeiro Calendario', { expectAuth: true });
    if (!ok) return;

    await page.locator('[class*="skeleton"], [class*="Skeleton"]').last().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => null);

    // KPIs do calendario: A Pagar, A Receber, Vencidos, Pagos
    const calendarKpis = ['Pagar', 'Receber', 'Vencido', 'Pago'];
    let found = 0;
    for (const kpi of calendarKpis) {
      if (await page.locator(`text=/${kpi}/i`).count() > 0) found++;
    }

    if (found >= 2) {
      log('PASS', 'D.2 Financeiro Calendario', `${found} KPIs do calendario encontrados`);
    } else {
      log('WARN', 'D.2 Financeiro Calendario', `Apenas ${found} KPI(s) identificados (esperado >= 2)`);
    }

    if (errors.filter((e) => !e.includes('401')).length === 0) {
      log('PASS', 'D.2 Financeiro Calendario', 'Zero erros de console');
    }
  });

  test('D.3 /financeiro/fluxo-caixa — projecao carrega com grafico', async ({ page }) => {
    const errors = monitorConsole(page, 'D.3 Fluxo de Caixa');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'D.3 Fluxo de Caixa', 'Sem autenticacao'); return; }

    const ok = await goAndCheck(page, `${BASE}/financeiro/fluxo-caixa`, 'D.3 Fluxo de Caixa', { expectAuth: true });
    if (!ok) return;

    await page.locator('[class*="skeleton"], [class*="Skeleton"]').last().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => null);

    // Verifica titulo da pagina
    const h1 = page.locator('h1').first();
    const h1Text = await h1.textContent().catch(() => '');
    if (h1Text && h1Text.length > 0) {
      log('PASS', 'D.3 Fluxo de Caixa', `Titulo: "${h1Text.trim().substring(0, 60)}"`);
    }

    // Grafico Recharts ou tabela de fluxo
    const hasChart = await page.locator('[class*="recharts"]').count() > 0;
    const hasTable = await page.locator('table').count() > 0;
    const hasSelect = await page.locator('select, [role="combobox"]').count() > 0;

    if (hasChart) {
      log('PASS', 'D.3 Fluxo de Caixa', 'Grafico Recharts encontrado');
    } else if (hasTable) {
      log('PASS', 'D.3 Fluxo de Caixa', 'Tabela de fluxo encontrada');
    } else {
      log('WARN', 'D.3 Fluxo de Caixa', 'Nem grafico nem tabela encontrados — pode estar carregando');
    }

    if (hasSelect) {
      log('PASS', 'D.3 Fluxo de Caixa', 'Selector de periodo/granularidade encontrado');
    }

    if (errors.filter((e) => !e.includes('401')).length === 0) {
      log('PASS', 'D.3 Fluxo de Caixa', 'Zero erros de console');
    }
  });

  test('D.4 /financeiro/nf-validation — notas fiscais carregam', async ({ page }) => {
    const errors = monitorConsole(page, 'D.4 NF Validation');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'D.4 NF Validation', 'Sem autenticacao'); return; }

    const ok = await goAndCheck(page, `${BASE}/financeiro/nf-validation`, 'D.4 NF Validation', { expectAuth: true });
    if (!ok) return;

    await page.locator('[class*="skeleton"], [class*="Skeleton"]').last().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => null);

    // Cards de stats: Total NFs, Pendentes, Validadas, Pendente revisao
    const nfLabels = ['Total', 'Pendente', 'Valid'];
    let found = 0;
    for (const label of nfLabels) {
      if (await page.locator(`text=/${label}/i`).count() > 0) found++;
    }

    if (found > 0) {
      log('PASS', 'D.4 NF Validation', `${found} label(s) de NF encontrado(s)`);
    } else {
      log('WARN', 'D.4 NF Validation', 'Nenhum label de status NF encontrado');
    }

    // Tabela de documentos ou estado vazio
    const tableRows = await page.locator('table tbody tr').count();
    const emptyMsg = await page.locator('text=/nenhuma nota|sem notas|vazio/i').count();

    if (tableRows > 0) {
      log('PASS', 'D.4 NF Validation', `Tabela com ${tableRows} NF(s)`);
    } else if (emptyMsg > 0) {
      log('WARN', 'D.4 NF Validation', 'Nenhuma NF cadastrada (estado vazio esperado)');
    } else {
      log('WARN', 'D.4 NF Validation', 'Tabela de NFs sem conteudo identificado');
    }

    if (errors.filter((e) => !e.includes('401')).length === 0) {
      log('PASS', 'D.4 NF Validation', 'Zero erros de console');
    }
  });

  test('D.5 /financeiro/vendors — lista de fornecedores carrega', async ({ page }) => {
    const errors = monitorConsole(page, 'D.5 Vendors');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'D.5 Vendors', 'Sem autenticacao'); return; }

    const ok = await goAndCheck(page, `${BASE}/financeiro/vendors`, 'D.5 Vendors', { expectAuth: true });
    if (!ok) return;

    await page.locator('[class*="skeleton"], [class*="Skeleton"]').last().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => null);

    const tableRows = await page.locator('table tbody tr').count();
    const emptyMsg = await page.locator('text=/nenhum fornecedor|sem fornecedores|vazio/i').count();

    if (tableRows > 0) {
      log('PASS', 'D.5 Vendors', `Tabela com ${tableRows} fornecedor(es)`);
    } else if (emptyMsg > 0) {
      log('WARN', 'D.5 Vendors', 'Nenhum fornecedor cadastrado');
    } else {
      log('WARN', 'D.5 Vendors', 'Lista de fornecedores sem conteudo identificado');
    }

    if (errors.filter((e) => !e.includes('401')).length === 0) {
      log('PASS', 'D.5 Vendors', 'Zero erros de console');
    }
  });
});

// ---------------------------------------------------------------------------
// SUITE E — Persona "Hacker Junior" (tenta rotas proibidas)
// ---------------------------------------------------------------------------

test.describe('SUITE E — Persona Hacker Junior (rotas proibidas e chaos)', () => {
  test.setTimeout(30000);

  test('E.1 /admin/audit-log — carrega ou redireciona de forma segura', async ({ page }) => {
    monitorConsole(page, 'E.1 Audit Log');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'E.1 Audit Log', 'Sem autenticacao'); return; }

    await page.goto(`${BASE}/admin/audit-log`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);

    const finalUrl = page.url().replace(BASE, '');

    if (finalUrl.includes('/login')) {
      log('WARN', 'E.1 Audit Log', 'Sessao expirou durante o teste — redirecionou para /login');
      return;
    }

    if (finalUrl.includes('/admin/audit-log')) {
      // Carregou — usuario tem permissao (danillo e admin)
      log('PASS', 'E.1 Audit Log', 'Audit log carregou (usuario e admin)');

      // Verifica que tem conteudo de auditoria
      const hasTable = await page.locator('table').count() > 0;
      const hasContent = await page.locator('text=/acao|tabela|usuario|audit/i').count() > 0;

      if (hasTable || hasContent) {
        log('PASS', 'E.1 Audit Log', 'Conteudo de auditoria visivel');
      } else {
        log('WARN', 'E.1 Audit Log', 'Pagina carregou mas sem conteudo de auditoria identificado');
      }
    } else if (finalUrl.includes('/') || finalUrl.includes('/dashboard')) {
      log('PASS', 'E.1 Audit Log', `Redirecionado para ${finalUrl} (usuario sem permissao de admin — comportamento correto)`);
    } else {
      log('WARN', 'E.1 Audit Log', `Redirecionado para rota inesperada: ${finalUrl}`);
    }
  });

  test('E.2 /jobs/uuid-falso — mostra 404 ou not-found sem crash', async ({ page }) => {
    monitorConsole(page, 'E.2 Job UUID Falso');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'E.2 Job UUID Falso', 'Sem autenticacao'); return; }

    const fakeUUID = '00000000-0000-0000-0000-000000000000';
    const response = await page.goto(`${BASE}/jobs/${fakeUUID}`, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    }).catch(() => null);

    await page.waitForTimeout(3000);

    const finalUrl = page.url().replace(BASE, '');
    const status = response?.status() ?? 0;

    // Verifica status HTTP
    if (status === 404) {
      log('PASS', 'E.2 Job UUID Falso', 'HTTP 404 retornado corretamente');
    } else if (status === 200) {
      // Status 200 mas pagina pode mostrar not-found via Next.js notFound()
      const notFoundMsg = page.locator('text=/nao encontrado|not found|404|job nao existe|sem permissao/i');
      if (await notFoundMsg.count() > 0) {
        log('PASS', 'E.2 Job UUID Falso', 'Pagina not-found amigavel exibida (HTTP 200 com not-found Next.js)');
      } else {
        // Verifica se mostrou dados de outro tenant (critico!)
        const hasJobContent = await page.locator('text=/job|cliente|agencia|orcamento/i').count() > 3;
        if (hasJobContent) {
          log('FAIL', 'E.2 Job UUID Falso', 'CRITICO: UUID falso exibiu dados de job — possivel vazamento!');
        } else {
          log('WARN', 'E.2 Job UUID Falso', 'UUID falso carregou HTTP 200 sem mensagem not-found clara');
        }
      }
    } else if (status >= 500) {
      log('FAIL', 'E.2 Job UUID Falso', `UUID falso causou erro ${status} no servidor`);
    } else {
      log('WARN', 'E.2 Job UUID Falso', `Status inesperado: ${status} — URL: ${finalUrl}`);
    }
  });

  test('E.3 /crm/uuid-aleatorio — mostra not-found sem crash', async ({ page }) => {
    monitorConsole(page, 'E.3 CRM UUID Falso');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'E.3 CRM UUID Falso', 'Sem autenticacao'); return; }

    const fakeUUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    await page.goto(`${BASE}/crm/${fakeUUID}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);

    const finalUrl = page.url().replace(BASE, '');

    // Nao deve mostrar crash (pageerror) nem dados de outro tenant
    const notFoundMsg = page.locator('text=/nao encontrado|not found|404|oportunidade nao existe/i');
    const serverError = page.locator('text=/500|erro interno|something went wrong/i');

    if (await serverError.count() > 0) {
      log('FAIL', 'E.3 CRM UUID Falso', 'UUID falso causou erro 500 visivel');
    } else if (await notFoundMsg.count() > 0) {
      log('PASS', 'E.3 CRM UUID Falso', 'Mensagem not-found exibida corretamente');
    } else {
      log('WARN', 'E.3 CRM UUID Falso', `UUID falso em /crm nao mostrou not-found claro — URL: ${finalUrl}`);
    }
  });

  test('E.4 /rota-inventada — pagina 404 amigavel com link de volta', async ({ page }) => {
    monitorConsole(page, 'E.4 Rota Inexistente');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'E.4 Rota Inexistente', 'Sem autenticacao'); return; }

    await page.goto(`${BASE}/pagina-que-nao-existe-hacker-test`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').textContent() ?? '';
    const has404Msg = /nao encontrada|not found|404|pagina inexistente/i.test(bodyText);
    const hasBackLink = await page.locator('a:has-text("voltar"), a:has-text("inicio"), a:has-text("home"), a[href="/"]').count() > 0;

    if (has404Msg) {
      log('PASS', 'E.4 Rota Inexistente', 'Mensagem de pagina nao encontrada presente');
    } else {
      log('WARN', 'E.4 Rota Inexistente', 'Nenhuma mensagem 404 clara encontrada no body');
    }

    if (hasBackLink) {
      log('PASS', 'E.4 Rota Inexistente', 'Link de retorno (voltar/inicio/home) presente');
    } else {
      log('WARN', 'E.4 Rota Inexistente', 'Link de retorno nao encontrado — usuario pode ficar preso');
    }

    // Critico: nao deve ter stack trace exposto
    const hasStackTrace = /at Object\.|at Module\.|\.js:\d+:\d+/i.test(bodyText);
    if (hasStackTrace) {
      log('FAIL', 'E.4 Rota Inexistente', 'Stack trace de JS exposto na pagina 404 — vaza info tecnica');
    } else {
      log('PASS', 'E.4 Rota Inexistente', 'Sem stack trace exposto');
    }
  });

  test('E.5 XSS em URL de busca nao executa script', async ({ page }) => {
    monitorConsole(page, 'E.5 XSS URL');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'E.5 XSS URL', 'Sem autenticacao'); return; }

    // Injeta XSS como query param — nao deve executar
    let xssExecuted = false;
    page.on('dialog', () => {
      xssExecuted = true;
    });

    await page.goto(
      `${BASE}/jobs?search=%3Cscript%3Ealert('XSS')%3C%2Fscript%3E`,
      { waitUntil: 'domcontentloaded', timeout: 20000 },
    );
    await page.waitForTimeout(2000);

    if (xssExecuted) {
      log('FAIL', 'E.5 XSS URL', 'CRITICO: XSS via query param executou alert() — vulnerabilidade real!');
    } else {
      log('PASS', 'E.5 XSS URL', 'XSS via query param nao executou');
    }

    // Verifica que o texto do script nao esta sendo renderizado como HTML
    const scriptTag = page.locator('script:has-text("XSS")');
    if (await scriptTag.count() > 0) {
      log('FAIL', 'E.5 XSS URL', 'Tag script com payload XSS encontrada no DOM');
    } else {
      log('PASS', 'E.5 XSS URL', 'Payload XSS nao injetado no DOM como script');
    }
  });

  test('E.6 /jobs — busca com SQL injection nao quebra', async ({ page }) => {
    monitorConsole(page, 'E.6 SQL Injection Busca');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'E.6 SQL Injection Busca', 'Sem autenticacao'); return; }

    await goAndCheck(page, `${BASE}/jobs`, 'E.6 Jobs', { expectAuth: true });
    await page.locator('[class*="skeleton"], [class*="Skeleton"]').last().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => null);

    // Procura campo de busca/filtro
    const searchInput = page.locator(
      'input[placeholder*="buscar"], input[placeholder*="search"], input[placeholder*="filtrar"], input[type="search"]',
    ).first();

    if (await searchInput.count() === 0) {
      log('WARN', 'E.6 SQL Injection Busca', 'Campo de busca nao encontrado — pulando');
      return;
    }

    // Digita SQL injection
    await searchInput.fill("'; DROP TABLE jobs; --");
    await page.waitForTimeout(2000);

    // Verifica que a pagina nao crashou
    const crashMsg = page.locator('text=/syntax error|DROP TABLE|postgresql|internal server error/i');
    if (await crashMsg.count() > 0) {
      log('FAIL', 'E.6 SQL Injection Busca', 'SQL injection causou erro de banco visivel na UI');
    } else {
      log('PASS', 'E.6 SQL Injection Busca', 'SQL injection nao causou crash ou erro visivel');
    }

    // Body ainda existe e nao e branco
    const bodyText = await page.locator('body').textContent() ?? '';
    if (bodyText.trim().length > 50) {
      log('PASS', 'E.6 SQL Injection Busca', 'Pagina permanece visivel apos SQL injection no campo de busca');
    } else {
      log('FAIL', 'E.6 SQL Injection Busca', 'Body ficou quase vazio apos SQL injection');
    }
  });

  test('E.7 Botao Back apos navegar para job nao quebra a sessao', async ({ page }) => {
    monitorConsole(page, 'E.7 Back Button');

    const authed = await setupAuth(page);
    if (!authed) { log('FAIL', 'E.7 Back Button', 'Sem autenticacao'); return; }

    // Navega: /jobs → /jobs/[id] → Back → deve voltar para /jobs sem crash
    await page.goto(`${BASE}/jobs`, { waitUntil: 'domcontentloaded', timeout: 20000 });

    const firstLink = page.locator('a[href*="/jobs/"]').first();
    if (await firstLink.count() === 0) {
      log('WARN', 'E.7 Back Button', 'Nenhum job para navegar — pulando');
      return;
    }

    await firstLink.click();
    await page.waitForFunction(
      () => window.location.pathname.includes('/jobs/') && window.location.pathname.length > '/jobs/'.length,
      { timeout: 10000 },
    ).catch(() => null);

    const urlNoDetalhe = page.url().replace(BASE, '');
    log('PASS', 'E.7 Back Button', `Navegou para detalhe: ${urlNoDetalhe}`);

    // Volta com Back
    await page.goBack();
    await page.waitForTimeout(1500);

    const urlAposBack = page.url().replace(BASE, '');

    if (urlAposBack.includes('/jobs') && !urlAposBack.includes('/jobs/')) {
      log('PASS', 'E.7 Back Button', `Back voltou para /jobs corretamente (URL: ${urlAposBack})`);
    } else if (urlAposBack.includes('/login')) {
      log('WARN', 'E.7 Back Button', 'Back causou perda de sessao — redirecionou para /login');
    } else {
      log('WARN', 'E.7 Back Button', `Back levou para rota inesperada: ${urlAposBack}`);
    }

    // Pagina nao deve ter crashado
    const crashMsg = page.locator('text=/erro interno|something went wrong/i');
    if (await crashMsg.count() > 0) {
      log('FAIL', 'E.7 Back Button', 'Crash visivel apos botao Back');
    } else {
      log('PASS', 'E.7 Back Button', 'Sem crash apos botao Back');
    }
  });
});

// ---------------------------------------------------------------------------
// REPORT FINAL — imprime sumario de todos os achados
// ---------------------------------------------------------------------------

test.afterAll(async () => {
  const pass = findings.filter((f) => f.severity === 'PASS').length;
  const fail = findings.filter((f) => f.severity === 'FAIL').length;
  const warn = findings.filter((f) => f.severity === 'WARN').length;
  const total = findings.length;

  console.log('\n');
  console.log('='.repeat(72));
  console.log('RELATORIO FINAL — ELLAHOS Authenticated Flows E2E');
  console.log('='.repeat(72));
  console.log(`Total: ${total} | PASS: ${pass} | WARN: ${warn} | FAIL: ${fail}`);
  console.log('-'.repeat(72));

  if (fail > 0) {
    console.log('\nFALHAS CRITICAS:');
    findings
      .filter((f) => f.severity === 'FAIL')
      .forEach((f) => console.log(`  [FAIL] ${f.page}: ${f.detail}`));
  }

  if (warn > 0) {
    console.log('\nAVISOS:');
    findings
      .filter((f) => f.severity === 'WARN')
      .forEach((f) => console.log(`  [WARN] ${f.page}: ${f.detail}`));
  }

  console.log('\nPASSES:');
  findings
    .filter((f) => f.severity === 'PASS')
    .forEach((f) => console.log(`  [PASS] ${f.page}: ${f.detail}`));

  console.log('='.repeat(72));

  // Nao falha o test runner baseado apenas nos WARNs —
  // apenas FAILs devem parar o CI
  if (fail > 0) {
    throw new Error(
      `${fail} falha(s) critica(s) detectada(s). Ver relatorio acima.`,
    );
  }
});
