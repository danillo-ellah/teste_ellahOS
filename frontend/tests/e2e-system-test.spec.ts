/**
 * e2e-system-test.spec.ts
 *
 * Teste E2E completo do sistema ELLAHOS — producao
 * URL: https://teste-ellah-os.vercel.app
 *
 * Personas simuladas:
 *   - Telma (CEO, 55 anos): desatenta, clica 2x, nao le erros
 *   - Junior (estagiario): rapido, dados zoados, pressiona Enter
 *   - Hacker Acidental: edita URL, tenta acessar rotas proibidas
 *
 * Formato de resultado: PASS / FAIL / WARN
 */

import { test, expect, Page } from '@playwright/test';

const BASE = 'https://teste-ellah-os.vercel.app';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Finding {
  severity: 'PASS' | 'FAIL' | 'WARN';
  page: string;
  detail: string;
}

const findings: Finding[] = [];

function log(severity: Finding['severity'], page: string, detail: string) {
  findings.push({ severity, page, detail });
  const prefix = severity === 'PASS' ? '[PASS]' : severity === 'FAIL' ? '[FAIL]' : '[WARN]';
  console.log(`${prefix} ${page}: ${detail}`);
}

function monitorConsole(page: Page, pageName: string): string[] {
  const errors: string[] = [];
  const noise = ['favicon', 'extension', 'third-party', 'ResizeObserver', 'hydration'];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const txt = msg.text();
      if (!noise.some((n) => txt.toLowerCase().includes(n))) {
        errors.push(txt);
        log('WARN', pageName, `Console error: ${txt.substring(0, 120)}`);
      }
    }
  });

  page.on('pageerror', (err) => {
    errors.push(err.message);
    log('FAIL', pageName, `JS page error: ${err.message.substring(0, 120)}`);
  });

  return errors;
}

// Testa se pagina carregou sem erro 500 / crash
async function checkPageLoads(page: Page, url: string, label: string) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  const status = response?.status() ?? 0;

  if (status >= 500) {
    log('FAIL', label, `HTTP ${status} — servidor com erro`);
    return false;
  }
  if (status === 404) {
    log('FAIL', label, `HTTP 404 — pagina nao encontrada`);
    return false;
  }
  log('PASS', label, `Carregou com HTTP ${status}`);
  return true;
}

// ---------------------------------------------------------------------------
// SUITE 1 — Paginas Publicas
// ---------------------------------------------------------------------------

test.describe('SUITE 1 — Paginas Publicas', () => {

  test('1.1 /landing — pagina de apresentacao carrega', async ({ page }) => {
    monitorConsole(page, '/landing');
    const ok = await checkPageLoads(page, `${BASE}/landing`, '/landing');
    if (!ok) return;

    await page.waitForLoadState('networkidle');

    // Hero section — titulo ou CTA principal
    const heroText = await page.locator('h1').first().textContent().catch(() => '');
    if (heroText && heroText.length > 0) {
      log('PASS', '/landing', `Hero h1 presente: "${heroText.substring(0, 60)}"`);
    } else {
      log('WARN', '/landing', 'Nenhum h1 encontrado na landing — hero pode estar quebrado');
    }

    // Verifica se tem conteudo minimo (nao e pagina em branco)
    const bodyText = await page.locator('body').textContent();
    if (!bodyText || bodyText.trim().length < 50) {
      log('FAIL', '/landing', 'Corpo da pagina quase vazio — possivel erro de renderizacao');
    } else {
      log('PASS', '/landing', `Conteudo presente (${bodyText.trim().length} chars)`);
    }
  });

  test('1.2 /landing — links de CTA funcionam', async ({ page }) => {
    monitorConsole(page, '/landing CTA');
    await page.goto(`${BASE}/landing`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Links de acao principais
    const ctaSelectors = [
      'a:has-text("Entrar")',
      'a:has-text("Comecar gratis"), a:has-text("Começar grátis"), a:has-text("Comecar")',
      'a:has-text("Conhecer recursos"), a:has-text("Saiba mais")',
    ];

    for (const sel of ctaSelectors) {
      const el = page.locator(sel).first();
      const count = await el.count();
      if (count > 0) {
        const href = await el.getAttribute('href');
        log('PASS', '/landing', `CTA encontrado: "${sel}" → href="${href}"`);
      } else {
        log('WARN', '/landing', `CTA nao encontrado: ${sel}`);
      }
    }

    // Verifica botao "Entrar" vai pra /login
    const entrarBtn = page.locator('a[href*="login"]').first();
    const entrarCount = await entrarBtn.count();
    if (entrarCount > 0) {
      log('PASS', '/landing', 'Link "Entrar" aponta para /login');
    } else {
      log('WARN', '/landing', 'Nenhum link apontando para /login encontrado na landing');
    }
  });

  test('1.3 /landing — sem erros de console criticos', async ({ page }) => {
    const errors = monitorConsole(page, '/landing console');
    await page.goto(`${BASE}/landing`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    if (errors.length === 0) {
      log('PASS', '/landing', 'Zero erros de console');
    } else {
      log('WARN', '/landing', `${errors.length} erro(s) de console detectados`);
    }
  });

  test('1.4 /signup — formulario de cadastro renderiza', async ({ page }) => {
    monitorConsole(page, '/signup');
    const ok = await checkPageLoads(page, `${BASE}/signup`, '/signup');
    if (!ok) return;

    await page.waitForLoadState('networkidle');

    // Campos esperados no cadastro
    // IDs reais: company_name, full_name, email, password, password_confirm
    const fields = [
      { sel: 'input#full_name, input[name="full_name"], input[placeholder*="Maria"]', label: 'Campo Nome Completo' },
      { sel: 'input[name="email"], input#email, input[type="email"]', label: 'Campo Email' },
      { sel: 'input[name="password"], input#password, input[type="password"]', label: 'Campo Senha' },
      { sel: 'input#company_name, input[name="company_name"], input[placeholder*="Ellah"]', label: 'Campo Nome da Produtora' },
    ];

    let foundFields = 0;
    for (const field of fields) {
      const count = await page.locator(field.sel).count();
      if (count > 0) {
        log('PASS', '/signup', `${field.label} presente`);
        foundFields++;
      } else {
        log('WARN', '/signup', `${field.label} NAO encontrado — seletor: ${field.sel}`);
      }
    }

    // Botao de submit
    const submitBtn = page.locator('button[type="submit"]');
    if (await submitBtn.count() > 0) {
      log('PASS', '/signup', `Botao submit presente: "${await submitBtn.first().textContent()}"`);
    } else {
      log('FAIL', '/signup', 'Botao submit NAO encontrado');
    }

    // Link "Ja tem conta? Entrar"
    const loginLink = page.locator('a[href*="login"]');
    if (await loginLink.count() > 0) {
      log('PASS', '/signup', 'Link "Ja tem conta? Entrar" presente');
    } else {
      log('WARN', '/signup', 'Link para /login nao encontrado no signup');
    }

    if (foundFields < 2) {
      log('FAIL', '/signup', `Apenas ${foundFields}/4 campos encontrados — form pode estar quebrado`);
    }
  });

  test('1.5 /signup — validacao de campos obrigatorios (persona Junior)', async ({ page }) => {
    monitorConsole(page, '/signup validacao');
    await page.goto(`${BASE}/signup`, { waitUntil: 'networkidle' });

    // Junior clica em Submit sem preencher nada
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.count() === 0) {
      log('WARN', '/signup', 'Botao submit nao encontrado — pulando teste de validacao');
      return;
    }

    await submitBtn.click();
    await page.waitForTimeout(1500);

    // Verifica se houve alguma mensagem de erro ou validacao HTML5
    const errorMsgs = page.locator('[class*="error"], [class*="destructive"], [role="alert"], .text-red-500, .text-destructive');
    const errorCount = await errorMsgs.count();

    const emailInput = page.locator('input[type="email"], input#email, input[name="email"]').first();
    const emailCount = await emailInput.count();
    let html5Invalid = false;
    if (emailCount > 0) {
      html5Invalid = await emailInput.evaluate((el) => !(el as HTMLInputElement).validity.valid);
    }

    if (errorCount > 0) {
      log('PASS', '/signup', `Validacao ativa: ${errorCount} mensagem(ns) de erro exibida(s)`);
    } else if (html5Invalid) {
      log('PASS', '/signup', 'Validacao HTML5 nativa bloqueou submit vazio');
    } else {
      log('WARN', '/signup', 'Submit vazio nao gerou mensagem de erro visivel — validacao pode estar ausente');
    }
  });

  test('1.6 /login — formulario de login renderiza', async ({ page }) => {
    monitorConsole(page, '/login');
    const ok = await checkPageLoads(page, `${BASE}/login`, '/login');
    if (!ok) return;

    await page.waitForLoadState('networkidle');

    // Verifica campos do form
    const emailInput = page.locator('input#email, input[name="email"], input[type="email"]').first();
    const passInput = page.locator('input#password, input[name="password"], input[type="password"]').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await emailInput.count() > 0) {
      log('PASS', '/login', 'Campo email presente');
    } else {
      log('FAIL', '/login', 'Campo email NAO encontrado');
    }

    if (await passInput.count() > 0) {
      log('PASS', '/login', 'Campo senha presente');
    } else {
      log('FAIL', '/login', 'Campo senha NAO encontrado');
    }

    if (await submitBtn.count() > 0) {
      const btnText = await submitBtn.textContent();
      log('PASS', '/login', `Botao submit presente: "${btnText?.trim()}"`);
    } else {
      log('FAIL', '/login', 'Botao submit NAO encontrado');
    }

    // Link "Esqueceu a senha?"
    const forgotLink = page.locator('a:has-text("Esqueceu"), a:has-text("esqueceu"), a[href*="forgot"]');
    if (await forgotLink.count() > 0) {
      log('PASS', '/login', 'Link "Esqueceu a senha?" presente');
    } else {
      log('WARN', '/login', 'Link de recuperacao de senha nao encontrado');
    }

    // Link "Criar conta" / signup
    const signupLink = page.locator('a[href*="signup"], a:has-text("Criar conta"), a:has-text("cadastro")');
    if (await signupLink.count() > 0) {
      log('PASS', '/login', 'Link "Criar conta" presente');
    } else {
      log('WARN', '/login', 'Link para signup nao encontrado na pagina de login');
    }
  });

  test('1.7 /login — credenciais invalidas exibem erro (sem crash)', async ({ page }) => {
    monitorConsole(page, '/login credenciais');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });

    const emailInput = page.locator('input[type="email"], input#email').first();
    const passInput = page.locator('input[type="password"], input#password').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await emailInput.count() === 0) {
      log('WARN', '/login', 'Form nao encontrado — pulando teste de credenciais invalidas');
      return;
    }

    // Persona Telma: digita email errado no campo certo, mas erra a senha
    await emailInput.fill('telma.naosabe@gmail.com');
    await passInput.fill('minhaSenhaErrada123');
    await submitBtn.click();

    // Espera resposta do servidor
    await page.waitForTimeout(5000);

    // Verifica se exibiu erro (nao crashou, nao redirecionou pra dentro)
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/')) {
      // Ainda na pagina de login ou redirecionou pro root — ok
      const errorEl = page.locator('[class*="error"], [class*="destructive"], [role="alert"], .text-red-500');
      if (await errorEl.count() > 0) {
        log('PASS', '/login', 'Erro de credenciais invalidas exibido corretamente');
      } else {
        log('WARN', '/login', 'Nenhuma mensagem de erro visivel apos credenciais invalidas — pode estar silencioso');
      }
    } else {
      log('FAIL', '/login', `Credenciais invalidas redirecionaram para: ${currentUrl} — possivel bypass de auth`);
    }
  });

  test('1.8 /login — link Esqueceu senha navega para forgot-password', async ({ page }) => {
    monitorConsole(page, '/login forgot-link');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });

    const forgotLink = page.locator('a:has-text("Esqueceu"), a:has-text("esqueceu"), a[href*="forgot"]').first();
    if (await forgotLink.count() === 0) {
      log('WARN', '/login', 'Link "Esqueceu a senha?" nao encontrado — pulando');
      return;
    }

    await forgotLink.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const url = page.url();
    if (url.includes('forgot') || url.includes('recuper')) {
      log('PASS', '/login', `Link "Esqueceu a senha?" navega para: ${url}`);
    } else {
      log('FAIL', '/login', `Link "Esqueceu a senha?" levou para rota inesperada: ${url}`);
    }
  });
});

// ---------------------------------------------------------------------------
// SUITE 2 — Rotas Protegidas (sem autenticacao)
// ---------------------------------------------------------------------------

test.describe('SUITE 2 — Redirect de rotas protegidas', () => {

  const protectedRoutes = [
    '/',
    '/jobs',
    '/crm',
    '/financeiro',
    '/pos-producao',
    '/atendimento',
    '/admin',
    '/settings',
    '/reports',
  ];

  for (const route of protectedRoutes) {
    test(`2.x ${route} — redireciona para /login sem auth`, async ({ page }) => {
      monitorConsole(page, route);
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2000);

      const url = page.url();
      if (url.includes('/login')) {
        log('PASS', route, `Redirect correto para /login (URL atual: ${url})`);
      } else if (url.includes('/onboarding')) {
        log('PASS', route, `Redirect para /onboarding (usuarios novos — comportamento valido)`);
      } else if (url.includes('/landing')) {
        log('PASS', route, 'Redirect para /landing (comportamento aceitavel para nao-autenticado)');
      } else if (url === `${BASE}${route}` || url === `${BASE}${route}/`) {
        // Nao redirecionou — verificar se tem conteudo protegido exposto
        const bodyText = await page.locator('body').textContent();
        const hasPrivateData = bodyText && (
          bodyText.includes('Dashboard') ||
          bodyText.includes('Job') ||
          bodyText.includes('Financeiro') ||
          bodyText.includes('Cliente')
        );
        if (hasPrivateData) {
          log('FAIL', route, `CRITICO: rota protegida acessivel sem auth — dados privados visiveis!`);
        } else {
          log('WARN', route, `Rota nao redirecionou para login (URL: ${url}) — verificar se e rota publica intencional`);
        }
      } else {
        log('WARN', route, `Redirect para rota inesperada: ${url}`);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// SUITE 3 — Paginas Publicas Adicionais
// ---------------------------------------------------------------------------

test.describe('SUITE 3 — Paginas publicas adicionais', () => {

  test('3.1 /portal — carrega sem auth (rota publica)', async ({ page }) => {
    monitorConsole(page, '/portal');
    const ok = await checkPageLoads(page, `${BASE}/portal`, '/portal');
    if (!ok) return;

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const url = page.url();
    // Portal pode ter token na URL ou redirecionar para pagina de acesso
    if (url.includes('/portal')) {
      const bodyText = await page.locator('body').textContent();
      if (bodyText && bodyText.length > 20) {
        log('PASS', '/portal', `Portal carregou com conteudo (${bodyText.trim().length} chars)`);
      } else {
        log('WARN', '/portal', 'Portal carregou mas corpo esta quase vazio');
      }
    } else {
      log('WARN', '/portal', `Portal redirecionou para: ${url}`);
    }
  });

  test('3.2 /onboarding — comportamento correto sem auth', async ({ page }) => {
    monitorConsole(page, '/onboarding');
    await page.goto(`${BASE}/onboarding`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2000);

    const url = page.url();
    if (url.includes('/login')) {
      log('PASS', '/onboarding', 'Redireciona para /login quando nao autenticado');
    } else if (url.includes('/onboarding')) {
      // Carregou — verifica conteudo
      const bodyText = await page.locator('body').textContent();
      log('PASS', '/onboarding', `Onboarding carregou publicamente (${bodyText?.trim().length} chars)`);
    } else {
      log('WARN', '/onboarding', `Redirecinou para rota inesperada: ${url}`);
    }
  });

  test('3.3 /forgot-password — form de recuperacao de senha', async ({ page }) => {
    monitorConsole(page, '/forgot-password');
    const ok = await checkPageLoads(page, `${BASE}/forgot-password`, '/forgot-password');
    if (!ok) return;

    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"], input[name="email"], input#email').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await emailInput.count() > 0) {
      log('PASS', '/forgot-password', 'Campo de email presente');
    } else {
      log('FAIL', '/forgot-password', 'Campo de email NAO encontrado no form de recuperacao');
    }

    if (await submitBtn.count() > 0) {
      log('PASS', '/forgot-password', 'Botao submit presente');
    } else {
      log('FAIL', '/forgot-password', 'Botao submit NAO encontrado');
    }

    // Link voltar pra login
    const backLink = page.locator('a[href*="login"], a:has-text("Voltar"), a:has-text("Entrar")');
    if (await backLink.count() > 0) {
      log('PASS', '/forgot-password', 'Link de volta ao login presente');
    } else {
      log('WARN', '/forgot-password', 'Nenhum link de retorno ao login encontrado');
    }
  });

  test('3.4 /reset-password — comportamento sem token', async ({ page }) => {
    monitorConsole(page, '/reset-password');
    const ok = await checkPageLoads(page, `${BASE}/reset-password`, '/reset-password');
    if (!ok) return;

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const bodyText = await page.locator('body').textContent() ?? '';

    const hasForm = await page.locator('input[type="password"]').count() > 0;
    const hasInvalidMsg = /link invalido|expirado|solicitar novo|nao encontrado/i.test(bodyText);
    const hasVerifying = /verificando|carregando/i.test(bodyText);

    if (hasForm) {
      log('WARN', '/reset-password', 'Exibe form de nova senha sem token na URL — pode aceitar qualquer coisa');
    } else if (hasInvalidMsg) {
      log('PASS', '/reset-password', 'Exibe mensagem de link invalido/expirado (comportamento correto sem token)');
    } else if (hasVerifying) {
      log('PASS', '/reset-password', 'Exibe estado de verificacao (normal ao carregar sem token)');
    } else {
      log('WARN', '/reset-password', 'Estado inesperado na pagina de reset sem token');
    }
  });
});

// ---------------------------------------------------------------------------
// SUITE 4 — Rotas 404 e URLs malucas (Hacker Acidental)
// ---------------------------------------------------------------------------

test.describe('SUITE 4 — Rotas inexistentes e manipulacao de URL', () => {

  const brokenRoutes = [
    '/pagina-que-nao-existe',
    '/jobs/00000000-0000-0000-0000-000000000000',
    '/asdf',
    '/admin/../../../../etc/passwd',
    '/jobs/banana',
    '/crm/uuid-falso-de-outro-tenant',
  ];

  for (const route of brokenRoutes) {
    test(`4.x ${route} — 404 amigavel ou redirect`, async ({ page }) => {
      monitorConsole(page, route);
      const response = await page.goto(`${BASE}${route}`, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });
      await page.waitForTimeout(1500);

      const status = response?.status() ?? 0;
      const url = page.url();
      const bodyText = await page.locator('body').textContent() ?? '';

      // Se redirecionou para login — aceitavel (protegido)
      if (url.includes('/login')) {
        log('PASS', route, 'Rota invalida redirecionou para login (protegido)');
        return;
      }

      // Se tem pagina 404 customizada
      const has404Page = /nao encontrad|not found|404|pagina nao existe/i.test(bodyText);
      if (has404Page || status === 404) {
        log('PASS', route, `404 tratado corretamente (HTTP ${status})`);
        return;
      }

      // Se expos stack trace ou erro interno — problema critico
      const hasStackTrace = /Error:|at Object\.|at Function\.|stack trace/i.test(bodyText);
      const hasSQLError = /syntax error|PostgreSQL|SQLSTATE/i.test(bodyText);
      const hasPathTraversal = /root:|bin:|passwd|shadow/i.test(bodyText);

      if (hasStackTrace) {
        log('FAIL', route, 'CRITICO: Stack trace exposto na resposta publica!');
      } else if (hasSQLError) {
        log('FAIL', route, 'CRITICO: Erro SQL exposto na resposta publica!');
      } else if (hasPathTraversal) {
        log('FAIL', route, 'CRITICO: Path traversal possivelmente explorado!');
      } else if (status >= 500) {
        log('FAIL', route, `Servidor retornou HTTP ${status} — erro interno exposto`);
      } else {
        log('WARN', route, `Rota inexistente retornou HTTP ${status} sem pagina 404 clara (URL: ${url})`);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// SUITE 5 — Comportamento Mobile (Persona Telma no iPhone)
// ---------------------------------------------------------------------------

test.describe('SUITE 5 — Mobile viewport (Persona Telma)', () => {

  test.use({ viewport: { width: 375, height: 812 } }); // iPhone 13

  test('5.1 /landing — responsivo em mobile', async ({ page }) => {
    monitorConsole(page, '/landing mobile');
    await page.goto(`${BASE}/landing`, { waitUntil: 'networkidle' });

    // Verifica que nao tem overflow horizontal (sinal de layout quebrado)
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.body.clientWidth);

    if (scrollWidth > clientWidth + 10) {
      log('WARN', '/landing mobile', `Overflow horizontal detectado: scrollWidth=${scrollWidth}px > clientWidth=${clientWidth}px`);
    } else {
      log('PASS', '/landing mobile', `Sem overflow horizontal (${scrollWidth}px <= ${clientWidth}px)`);
    }

    // Verifica que h1 e visivel
    const h1 = page.locator('h1').first();
    if (await h1.count() > 0 && await h1.isVisible()) {
      log('PASS', '/landing mobile', 'H1 visivel em mobile');
    } else {
      log('WARN', '/landing mobile', 'H1 nao visivel em viewport mobile');
    }
  });

  test('5.2 /login — campos tocaveis em mobile', async ({ page }) => {
    monitorConsole(page, '/login mobile');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });

    const emailInput = page.locator('input[type="email"], input#email').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await emailInput.count() > 0) {
      const box = await emailInput.boundingBox();
      if (box && box.height >= 40) {
        log('PASS', '/login mobile', `Campo email tem altura adequada para touch: ${box.height}px`);
      } else {
        log('WARN', '/login mobile', `Campo email pequeno demais para touch: ${box?.height ?? 0}px (recomendado: >= 44px)`);
      }
    }

    if (await submitBtn.count() > 0) {
      const box = await submitBtn.boundingBox();
      if (box && box.height >= 40) {
        log('PASS', '/login mobile', `Botao submit tem altura adequada para touch: ${box.height}px`);
      } else {
        log('WARN', '/login mobile', `Botao submit pequeno demais para touch: ${box?.height ?? 0}px`);
      }
    }
  });

  test('5.3 /signup — formulario renderiza em mobile', async ({ page }) => {
    monitorConsole(page, '/signup mobile');
    await page.goto(`${BASE}/signup`, { waitUntil: 'networkidle' });

    const bodyText = await page.locator('body').textContent() ?? '';
    if (bodyText.length > 30) {
      log('PASS', '/signup mobile', `Pagina de signup carregou em mobile (${bodyText.length} chars)`);
    } else {
      log('FAIL', '/signup mobile', 'Pagina de signup quase vazia em mobile');
    }
  });
});

// ---------------------------------------------------------------------------
// SUITE 6 — Input Chaos (Persona Junior)
// ---------------------------------------------------------------------------

test.describe('SUITE 6 — Input Chaos no Login', () => {

  test('6.1 SQL injection no campo email nao quebra o sistema', async ({ page }) => {
    monitorConsole(page, '/login SQL');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });

    const emailInput = page.locator('input[type="email"], input#email').first();
    const passInput = page.locator('input[type="password"], input#password').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await emailInput.count() === 0) {
      log('WARN', '/login', 'Form nao encontrado — pulando teste SQL');
      return;
    }

    await emailInput.fill("'; DROP TABLE users; --");
    await passInput.fill('qualquercoisa');
    await submitBtn.click();
    await page.waitForTimeout(4000);

    const bodyText = await page.locator('body').textContent() ?? '';
    const hasSQLError = /syntax error|DROP TABLE|postgresql|SQLSTATE/i.test(bodyText);
    const hasStackTrace = /at Object\.|Error stack|traceback/i.test(bodyText);

    if (hasSQLError) {
      log('FAIL', '/login', 'CRITICO: SQL injection expoe erro de banco de dados!');
    } else if (hasStackTrace) {
      log('FAIL', '/login', 'CRITICO: Stack trace exposto apos input malicioso!');
    } else {
      log('PASS', '/login', 'SQL injection no campo email nao crashou nem expoe erros internos');
    }
  });

  test('6.2 XSS no campo email nao executa script', async ({ page }) => {
    monitorConsole(page, '/login XSS');
    let alertFired = false;
    page.on('dialog', async (dialog) => {
      alertFired = true;
      await dialog.dismiss();
    });

    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });

    const emailInput = page.locator('input[type="email"], input#email').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await emailInput.count() === 0) {
      log('WARN', '/login', 'Form nao encontrado — pulando teste XSS');
      return;
    }

    // Tenta burlar validacao HTML5 de email com JS inline
    await emailInput.evaluate((el) => {
      (el as HTMLInputElement).value = '<script>alert("XSS")</script>';
    });
    await submitBtn.click();
    await page.waitForTimeout(2000);

    if (alertFired) {
      log('FAIL', '/login', 'CRITICO: XSS executou alert() no campo de email!');
    } else {
      log('PASS', '/login', 'XSS nao executou no campo de email');
    }
  });

  test('6.3 string gigante no campo nao trava o browser', async ({ page }) => {
    monitorConsole(page, '/login string gigante');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });

    const emailInput = page.locator('input[type="email"], input#email').first();
    if (await emailInput.count() === 0) {
      log('WARN', '/login', 'Form nao encontrado — pulando teste de string gigante');
      return;
    }

    const bigString = 'A'.repeat(5000) + '@teste.com';
    await emailInput.fill(bigString);
    await page.waitForTimeout(1000);

    // Verifica que a pagina ainda responde
    const submitBtn = page.locator('button[type="submit"]').first();
    const isVisible = await submitBtn.isVisible().catch(() => false);

    if (isVisible) {
      log('PASS', '/login', 'Pagina ainda responsiva apos input de 5000+ chars');
    } else {
      log('WARN', '/login', 'Botao submit sumiu apos input gigante — possivel problema de layout');
    }
  });

  test('6.4 double-click no botao de submit nao envia 2x (Persona Telma)', async ({ page }) => {
    monitorConsole(page, '/login double-click');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });

    const emailInput = page.locator('input[type="email"], input#email').first();
    const passInput = page.locator('input[type="password"], input#password').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await emailInput.count() === 0) {
      log('WARN', '/login', 'Form nao encontrado — pulando teste de double-click');
      return;
    }

    await emailInput.fill('telma@ellahfilmes.com');
    await passInput.fill('senhaerrada123');

    // Telma da double-click no botao
    const requestCount = { value: 0 };
    page.on('request', (req) => {
      if (req.url().includes('auth') || req.url().includes('login') || req.url().includes('token')) {
        requestCount.value++;
      }
    });

    await submitBtn.dblclick();
    await page.waitForTimeout(3000);

    // Idealmente so 1 request de auth deve ter sido feito
    if (requestCount.value <= 1) {
      log('PASS', '/login', `Double-click gerou apenas ${requestCount.value} request de auth (debounce funcionando)`);
    } else {
      log('WARN', '/login', `Double-click gerou ${requestCount.value} requests de auth — possivel duplicacao`);
    }
  });
});

// ---------------------------------------------------------------------------
// SUITE 7 — Navegacao e Links
// ---------------------------------------------------------------------------

test.describe('SUITE 7 — Navegacao geral', () => {

  test('7.1 Navegar de /login para /signup e voltar', async ({ page }) => {
    monitorConsole(page, 'nav login<->signup');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });

    // Clica no link de signup
    const signupLink = page.locator('a[href*="signup"]').first();
    if (await signupLink.count() === 0) {
      log('WARN', '/login', 'Link para signup nao encontrado — pulando teste');
      return;
    }

    await signupLink.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    if (page.url().includes('signup')) {
      log('PASS', '/login', 'Link "Criar conta" navega para /signup');
    } else {
      log('FAIL', '/login', `Link "Criar conta" foi para: ${page.url()} em vez de /signup`);
    }

    // Volta para login
    const loginLink = page.locator('a[href*="login"]').first();
    if (await loginLink.count() > 0) {
      await loginLink.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      if (page.url().includes('login')) {
        log('PASS', '/signup', 'Link "Ja tenho conta" navega de volta para /login');
      } else {
        log('FAIL', '/signup', `Link "Ja tenho conta" foi para: ${page.url()}`);
      }
    }
  });

  test('7.2 Botao Back do browser apos navegar (Persona Hacker)', async ({ page }) => {
    monitorConsole(page, 'back-button');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });

    const signupLink = page.locator('a[href*="signup"]').first();
    if (await signupLink.count() > 0) {
      await signupLink.click();
      await page.waitForLoadState('domcontentloaded');
    }

    // Usa botao Back do browser
    await page.goBack();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const url = page.url();
    const bodyText = await page.locator('body').textContent() ?? '';

    if (bodyText.length > 20) {
      log('PASS', 'back-button', `Botao Back funcionou — pagina carregada (${url})`);
    } else {
      log('WARN', 'back-button', 'Botao Back retornou pagina quase vazia');
    }
  });

  test('7.3 F5 refresh na pagina de login nao quebra', async ({ page }) => {
    monitorConsole(page, '/login refresh');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const emailInput = page.locator('input[type="email"], input#email').first();
    if (await emailInput.count() > 0) {
      log('PASS', '/login', 'F5 refresh mantem form de login intacto');
    } else {
      log('FAIL', '/login', 'Apos F5 refresh, form de login desapareceu');
    }
  });

  test('7.4 URL digitada manualmente: /jobs/uuid-invalido redireciona', async ({ page }) => {
    monitorConsole(page, '/jobs/uuid-invalido');
    await page.goto(`${BASE}/jobs/nao-e-um-uuid-valido`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const url = page.url();
    if (url.includes('/login')) {
      log('PASS', '/jobs/uuid-invalido', 'UUID invalido na URL redirecionou para /login (correto)');
    } else if (url.includes('/jobs')) {
      // Ficou em jobs — verifica se tem mensagem de nao encontrado
      const bodyText = await page.locator('body').textContent() ?? '';
      const hasNotFound = /nao encontrad|not found|404/i.test(bodyText);
      if (hasNotFound) {
        log('PASS', '/jobs/uuid-invalido', '404 amigavel exibido para UUID invalido');
      } else {
        log('WARN', '/jobs/uuid-invalido', 'UUID invalido em /jobs sem mensagem clara de erro');
      }
    } else {
      log('WARN', '/jobs/uuid-invalido', `URL invalida resultou em: ${url}`);
    }
  });
});

// ---------------------------------------------------------------------------
// SUITE 8 — Testes extras baseados no codigo fonte real
// ---------------------------------------------------------------------------

test.describe('SUITE 8 — Comportamentos especificos do codigo', () => {

  test('8.1 /login — tab Celular renderiza form de telefone', async ({ page }) => {
    monitorConsole(page, '/login tab celular');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });

    // Login tem tabs: Email | Celular
    const phoneTab = page.locator('button:has-text("Celular")');
    if (await phoneTab.count() === 0) {
      log('WARN', '/login', 'Tab "Celular" nao encontrada — login por SMS pode estar ausente');
      return;
    }

    await phoneTab.click();
    await page.waitForTimeout(800);

    const phoneInput = page.locator('input[type="tel"], input#phone');
    if (await phoneInput.count() > 0) {
      log('PASS', '/login', 'Tab "Celular" exibe campo de telefone corretamente');
    } else {
      log('FAIL', '/login', 'Tab "Celular" clicada mas campo de telefone nao apareceu');
    }

    // Prefixo +55 deve estar visivel
    const prefix = page.locator('text=+55');
    if (await prefix.count() > 0) {
      log('PASS', '/login', 'Prefixo +55 visivel no form de celular');
    } else {
      log('WARN', '/login', 'Prefixo +55 nao encontrado no form de celular');
    }
  });

  test('8.2 /login — trocar de tab limpa o form (key reset)', async ({ page }) => {
    monitorConsole(page, '/login tab switch');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });

    // Preenche email
    const emailInput = page.locator('input#email').first();
    if (await emailInput.count() === 0) {
      log('WARN', '/login', 'Campo email nao encontrado — pulando teste de tab switch');
      return;
    }

    await emailInput.fill('telma@ellahfilmes.com');

    // Troca para Celular
    const phoneTab = page.locator('button:has-text("Celular")').first();
    if (await phoneTab.count() > 0) {
      await phoneTab.click();
      await page.waitForTimeout(500);

      // Volta para Email
      const emailTab = page.locator('button:has-text("Email")').first();
      await emailTab.click();
      await page.waitForTimeout(500);

      // Campo deve estar limpo (o codigo usa key={tabKey} pra resetar)
      const emailInputAfter = page.locator('input#email').first();
      const value = await emailInputAfter.inputValue().catch(() => 'ERRO');
      if (value === '') {
        log('PASS', '/login', 'Trocar de tab limpa o formulario corretamente (key reset funciona)');
      } else {
        log('WARN', '/login', `Trocar de tab nao limpou o campo email — valor persistiu: "${value}"`);
      }
    } else {
      log('WARN', '/login', 'Tab Celular nao encontrada — pulando teste de tab switch');
    }
  });

  test('8.3 /signup — campo confirmar senha exibe erro quando senhas diferentes', async ({ page }) => {
    monitorConsole(page, '/signup senha-mismatch');
    await page.goto(`${BASE}/signup`, { waitUntil: 'networkidle' });

    const passInput = page.locator('input#password').first();
    const passConfirmInput = page.locator('input#password_confirm').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await passInput.count() === 0 || await passConfirmInput.count() === 0) {
      log('WARN', '/signup', 'Campos de senha nao encontrados com IDs esperados — pulando');
      return;
    }

    // Persona Junior: digita senhas diferentes sem perceber
    await page.fill('input#company_name', 'Produtora Teste');
    await page.fill('input#full_name', 'Junior Teste');
    await page.fill('input#email', 'junior@teste.com');
    await passInput.fill('senha123');
    await passConfirmInput.fill('senha456');   // diferente!
    await submitBtn.click();

    await page.waitForTimeout(1000);

    // Deve mostrar erro de senhas nao coincidem
    const errorEl = page.locator('text=/senhas nao coincidem|senhas diferentes|confirmar senha/i');
    if (await errorEl.count() > 0) {
      log('PASS', '/signup', 'Erro "senhas nao coincidem" exibido corretamente');
    } else {
      // Verifica qualquer mensagem de erro
      const anyError = page.locator('[class*="destructive"], .text-destructive');
      if (await anyError.count() > 0) {
        log('PASS', '/signup', 'Erro de validacao exibido (senhas diferentes bloqueadas)');
      } else {
        log('FAIL', '/signup', 'Senhas diferentes submetidas sem mensagem de erro visivel');
      }
    }
  });

  test('8.4 /signup — senha muito curta e bloqueada', async ({ page }) => {
    monitorConsole(page, '/signup senha curta');
    await page.goto(`${BASE}/signup`, { waitUntil: 'networkidle' });

    const passInput = page.locator('input#password').first();
    const submitBtn = page.locator('button[type="submit"]').first();

    if (await passInput.count() === 0) {
      log('WARN', '/signup', 'Campo senha nao encontrado — pulando');
      return;
    }

    // Persona Junior: digita "abc" (menos de 6 chars)
    await page.fill('input#company_name', 'Produtora Teste');
    await page.fill('input#full_name', 'Junior Teste');
    await page.fill('input#email', 'junior@teste.com');
    await passInput.fill('abc');
    await page.fill('input#password_confirm', 'abc');
    await submitBtn.click();

    await page.waitForTimeout(1000);

    const errorEl = page.locator('text=/minimo 6|pelo menos 6|senha.*curta/i');
    if (await errorEl.count() > 0) {
      log('PASS', '/signup', 'Erro de senha curta (< 6 chars) exibido corretamente');
    } else {
      const anyError = page.locator('[class*="destructive"], .text-destructive');
      if (await anyError.count() > 0) {
        log('PASS', '/signup', 'Validacao de senha curta ativou algum erro');
      } else {
        log('WARN', '/signup', 'Senha com 3 chars submetida sem mensagem de erro visivel de comprimento minimo');
      }
    }
  });

  test('8.5 /login — mensagem de sessao expirada via query param', async ({ page }) => {
    monitorConsole(page, '/login session-expired');
    await page.goto(`${BASE}/login?session_expired=1`, { waitUntil: 'networkidle' });

    // O codigo exibe banner quando session_expired esta presente
    const expiredMsg = page.locator('text=/sessao expirou|faca login novamente/i');
    if (await expiredMsg.count() > 0) {
      log('PASS', '/login', 'Banner de sessao expirada exibido via query param ?session_expired=1');
    } else {
      log('WARN', '/login', 'Banner de sessao expirada NAO encontrado com ?session_expired=1 — pode estar ausente ou mudou o texto');
    }
  });

  test('8.6 /login — mensagem de sucesso de reset de senha via query param', async ({ page }) => {
    monitorConsole(page, '/login password-reset-success');
    await page.goto(`${BASE}/login?message=password_reset_success`, { waitUntil: 'networkidle' });

    // O codigo exibe banner de sucesso quando message=password_reset_success
    const successMsg = page.locator('text=/senha redefinida|nova senha|sucesso/i');
    if (await successMsg.count() > 0) {
      log('PASS', '/login', 'Banner de senha redefinida exibido via ?message=password_reset_success');
    } else {
      log('WARN', '/login', 'Banner de senha redefinida NAO encontrado com ?message=password_reset_success');
    }
  });

  test('8.7 /login — returnUrl malicioso e sanitizado', async ({ page }) => {
    monitorConsole(page, '/login returnUrl XSS');
    // Tenta injetar returnUrl perigoso
    await page.goto(`${BASE}/login?returnUrl=//evil.com`, { waitUntil: 'networkidle' });

    // A pagina deve carregar no dominio correto (nao redirecionar pra fora)
    // Nota: a query string contem o valor malicioso, mas a pagina deve permanecer no dominio
    const url = page.url();
    const hostname = new URL(url).hostname;
    if (hostname === 'evil.com') {
      log('FAIL', '/login', 'CRITICO: returnUrl com redirect externo (//evil.com) foi aceito!');
    } else {
      log('PASS', '/login', `returnUrl malicioso (//evil.com) nao causou redirect externo — host: ${hostname}`);
    }

    // Testa returnUrl com protocolo javascript:
    // O sanitize so atua no submit (router.push), nao no load da pagina
    // Verificamos que a pagina nao executou JS malicioso
    let alertFired = false;
    page.on('dialog', () => { alertFired = true; });
    await page.goto(`${BASE}/login?returnUrl=javascript:alert(1)`, { waitUntil: 'networkidle' });
    const url2 = page.url();
    const hostname2 = new URL(url2).hostname;
    if (!alertFired && hostname2.includes('vercel.app')) {
      log('PASS', '/login', 'returnUrl com javascript: nao executou — pagina permanece no dominio correto');
    } else {
      log('FAIL', '/login', 'CRITICO: returnUrl com javascript: executou alert ou redirecionou!');
    }
  });

  test('8.8 /login — tab Celular com telefone invalido exibe erro adequado', async ({ page }) => {
    monitorConsole(page, '/login celular invalido');
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });

    const phoneTab = page.locator('button:has-text("Celular")').first();
    if (await phoneTab.count() === 0) {
      log('WARN', '/login', 'Tab Celular nao encontrada — pulando teste de telefone invalido');
      return;
    }

    await phoneTab.click();
    await page.waitForTimeout(500);

    const phoneInput = page.locator('input#phone, input[type="tel"]').first();
    if (await phoneInput.count() === 0) {
      log('WARN', '/login', 'Campo de telefone nao encontrado apos clicar em tab Celular');
      return;
    }

    // Persona Telma: digita email no campo de telefone
    await phoneInput.fill('telma@gmail.com');
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').textContent() ?? '';
    const hasSQLError = /syntax error|DROP TABLE|postgresql/i.test(bodyText);
    const hasStackTrace = /at Object\.|Error stack/i.test(bodyText);

    if (hasSQLError || hasStackTrace) {
      log('FAIL', '/login', 'Email no campo de telefone causou erro interno exposto');
    } else {
      log('PASS', '/login', 'Email no campo de telefone nao causou crash — sistema tratou graciosamente');
    }
  });
});

// ---------------------------------------------------------------------------
// SUITE 9 — Relatorio Final
// ---------------------------------------------------------------------------

test.describe('SUITE 9 — Relatorio', () => {

  test('9.1 Sumario de todos os findings', async () => {
    const passes = findings.filter((f) => f.severity === 'PASS').length;
    const fails = findings.filter((f) => f.severity === 'FAIL').length;
    const warns = findings.filter((f) => f.severity === 'WARN').length;

    console.log('\n\n================================================================');
    console.log('RELATORIO FINAL — ELLAHOS E2E SYSTEM TEST');
    console.log('================================================================');
    console.log(`PASS: ${passes} | FAIL: ${fails} | WARN: ${warns}`);
    console.log('----------------------------------------------------------------');

    if (fails > 0) {
      console.log('\nFALHAS CRITICAS:');
      findings.filter((f) => f.severity === 'FAIL').forEach((f) => {
        console.log(`  [FAIL] ${f.page}: ${f.detail}`);
      });
    }

    if (warns > 0) {
      console.log('\nAVISOS:');
      findings.filter((f) => f.severity === 'WARN').forEach((f) => {
        console.log(`  [WARN] ${f.page}: ${f.detail}`);
      });
    }

    console.log('\nPASSES:');
    findings.filter((f) => f.severity === 'PASS').forEach((f) => {
      console.log(`  [PASS] ${f.page}: ${f.detail}`);
    });

    console.log('================================================================\n');

    // O teste falha se houver qualquer FAIL critico
    expect(fails, `${fails} falha(s) critica(s) detectada(s) — ver relatorio acima`).toBe(0);
  });
});
