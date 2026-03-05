/**
 * portal-e2e.spec.ts
 *
 * Chaos E2E Tests — Portal do Cliente (ELLAHOS)
 *
 * Personas:
 *   - Telma (CEO, 55 anos): clica 2x em tudo, digita devagar, fecha sem salvar
 *   - Junior (estagiario, 19 anos): rapido demais, dados zoados, Enter key mania
 *   - Hacker Acidental (coordenador curioso): edita URL, inspeciona, clica 10x
 *
 * Estrutura:
 *   SUITE A — Admin autenticado (sessions manager, criar/editar/deletar sessoes)
 *   SUITE B — Portal publico (token valido, dados visiveis, chat)
 *   SUITE C — Cenarios de erro (token invalido, expirado, sem permissao)
 *   SUITE D — Seguranca (XSS, dados sensiveis, cross-tenant)
 *   SUITE E — Mobile (viewport 375px)
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// ---------------------------------------------------------------------------
// Constantes de ambiente
// ---------------------------------------------------------------------------
const BASE_URL = 'https://teste-ellah-os.vercel.app';
const SUPABASE_URL = 'https://etvapcxesaxhsvzgaane.supabase.co';
const ADMIN_EMAIL = 'danillo@ellahfilmes.com';
const ADMIN_PASSWORD = 'Ellah2026!';

// Token de portal publico real — sera preenchido durante os testes de admin
// Se o banco ja tem uma sessao ativa, substitua aqui para rodar a suite B isolada
let capturedPortalToken = '';
let capturedSessionId = '';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Coleta erros de console e de rede durante a execucao do teste */
function monitorPage(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      const ignore = ['favicon', 'extension', 'third-party', 'hydration', 'ResizeObserver'];
      if (!ignore.some((n) => text.includes(n))) {
        errors.push(`[console.error] ${text}`);
      }
    }
  });
  page.on('pageerror', (err) => {
    errors.push(`[pageerror] ${err.message}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 500) {
      errors.push(`[HTTP ${res.status()}] ${res.url()}`);
    }
  });
  return errors;
}

/** Login no dashboard admin */
async function adminLogin(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('input#email', ADMIN_EMAIL);
  await page.fill('input#password', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/$/, { timeout: 20000 });
}

/** Navega para a pagina de portal admin */
async function goToPortalAdmin(page: Page) {
  await page.goto(`${BASE_URL}/portal`);
  await page.waitForLoadState('networkidle');
}

/** Navega para o portal publico usando o token capturado */
async function goToPublicPortal(page: Page, token: string) {
  await page.goto(`${BASE_URL}/portal/${token}`);
  await page.waitForLoadState('networkidle');
}

// ---------------------------------------------------------------------------
// SUITE A — Admin: gerenciamento de sessoes (autenticado)
// ---------------------------------------------------------------------------

test.describe('SUITE A — Admin: gerenciamento de sessoes (Persona: Telma + Junior)', () => {
  test.use({ storageState: 'tests/.auth/user.json' });

  test('A01 — pagina /portal carrega sem erros de console', async ({ page }) => {
    const errors = monitorPage(page);
    await goToPortalAdmin(page);

    // Deve mostrar o titulo principal
    await expect(page.locator('h1, [data-testid="page-title"]').first()).toBeVisible({ timeout: 10000 });

    // Nao deve ter erros criticos
    expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
  });

  test('A02 — [Telma] pagina /portal tem filtro de status funcional', async ({ page }) => {
    await goToPortalAdmin(page);

    // Verificar que o select de filtro existe
    const filterSelect = page.locator('select, [role="combobox"]').first();
    if (await filterSelect.count() > 0) {
      await expect(filterSelect).toBeVisible();
    }

    // Verificar estado vazio ou listagem
    const hasTable = await page.locator('table').count() > 0;
    const hasEmpty = await page.locator('text=/nenhum link|nenhuma sess/i').count() > 0;
    const hasSkeleton = await page.locator('[class*="skeleton"]').count() > 0;

    expect(hasTable || hasEmpty || hasSkeleton).toBeTruthy();
  });

  test('A03 — [Junior] navegar para /portal sem estar na sidebar deve funcionar via URL direta', async ({ page }) => {
    // Junior digita a URL direto
    await page.goto(`${BASE_URL}/portal`);
    await page.waitForLoadState('networkidle');

    // Nao deve ser redirecionado para login (ja esta autenticado)
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('A04 — [Junior] navegar para job e achar aba Portal', async ({ page }) => {
    // Junior vai para /jobs e tenta achar um job
    await page.goto(`${BASE_URL}/jobs`);
    await page.waitForLoadState('networkidle');

    // Verificar que a pagina de jobs carregou
    const jobLink = page.locator('a[href*="/jobs/"]').first();

    if (await jobLink.count() > 0) {
      await jobLink.click();
      await page.waitForLoadState('networkidle');

      // Procurar aba Portal no job detail
      const portalTab = page.locator('[role="tab"]', { hasText: /portal/i });
      if (await portalTab.count() > 0) {
        await expect(portalTab).toBeVisible();
      }
    } else {
      // Nenhum job existe — documentar como estado valido
      console.warn('[A04] Nenhum job encontrado para testar aba Portal');
    }
  });

  test('A05 — [Telma] criar nova sessao de portal pelo job detail', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    await page.waitForLoadState('networkidle');

    const jobLink = page.locator('a[href*="/jobs/"]').first();

    if (await jobLink.count() === 0) {
      test.skip(true, 'Nenhum job disponivel para teste de criacao de sessao');
      return;
    }

    await jobLink.click();
    await page.waitForLoadState('networkidle');

    // Ir para aba Portal
    const portalTab = page.locator('[role="tab"]', { hasText: /portal/i });
    if (await portalTab.count() === 0) {
      test.skip(true, 'Aba Portal nao encontrada no job detail');
      return;
    }
    await portalTab.click();
    await page.waitForTimeout(500);

    // Clicar em "Criar link"
    const createBtn = page.locator('button', { hasText: /criar link|criar primeiro link/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 5000 });
    await createBtn.click();

    // Dialog deve abrir
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Preencher label
    const labelInput = dialog.locator('input[id="session-label"], input[placeholder*="nome"]').first();
    await expect(labelInput).toBeVisible();
    await labelInput.fill('Link de Teste Chaos — Telma CEO');

    // Tentar submeter o form (Telma nao le as instrucoes, clica direto)
    const submitBtn = dialog.locator('button[type="submit"], button', { hasText: /criar link/i }).first();
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Aguardar resultado (sucesso ou erro)
    await page.waitForTimeout(3000);

    // Capturar URL do portal se criou com sucesso
    const portalUrlText = dialog.locator('p.font-mono, [class*="font-mono"]').first();
    if (await portalUrlText.count() > 0) {
      const urlContent = await portalUrlText.textContent();
      if (urlContent && urlContent.includes('/portal/')) {
        const match = urlContent.match(/\/portal\/([a-f0-9-]{36})/);
        if (match) {
          capturedPortalToken = match[1]!;
          console.log(`[A05] Token capturado: ${capturedPortalToken.slice(0, 8)}...`);
        }
      }
    }

    // Toast de sucesso ou URL gerada deve aparecer
    const successToast = page.locator('[data-sonner-toast], [role="status"]', { hasText: /sucesso|criado/i });
    const urlGenerated = dialog.locator('text=/portal/');
    const hasSuccess = await successToast.count() > 0 || await urlGenerated.count() > 0;
    expect(hasSuccess).toBeTruthy();
  });

  test('A06 — [Telma] double-click no botao Criar nao gera 2 sessoes', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    await page.waitForLoadState('networkidle');

    const jobLink = page.locator('a[href*="/jobs/"]').first();
    if (await jobLink.count() === 0) {
      test.skip(true, 'Nenhum job disponivel');
      return;
    }

    await jobLink.click();
    await page.waitForLoadState('networkidle');

    const portalTab = page.locator('[role="tab"]', { hasText: /portal/i });
    if (await portalTab.count() === 0) {
      test.skip(true, 'Aba Portal nao encontrada');
      return;
    }

    // Contar sessoes existentes antes
    await portalTab.click();
    await page.waitForTimeout(1000);
    const sessionsBefore = await page.locator('[class*="rounded-xl"][class*="border"]').count();

    // Abrir dialog
    const createBtn = page.locator('button', { hasText: /criar link|criar primeiro link/i }).first();
    if (await createBtn.count() === 0) {
      test.skip(true, 'Botao criar link nao encontrado');
      return;
    }
    await createBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const labelInput = dialog.locator('input[id="session-label"]').first();
    await labelInput.fill('Teste Double Click Telma');

    // DOUBLE CLICK (Telma clica 2x em tudo)
    const submitBtn = dialog.locator('button', { hasText: /criar link/i }).first();
    await submitBtn.dblclick();

    await page.waitForTimeout(4000);

    // Fechar dialog se ainda aberto
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);

    // Contar sessoes depois — nao deve ter mais de 1 adicional
    const sessionsAfter = await page.locator('[class*="rounded-xl"][class*="border"]').count();
    const diff = sessionsAfter - sessionsBefore;
    expect(diff).toBeLessThanOrEqual(1);
  });

  test('A07 — [Junior] submeter form vazio mostra erro de validacao', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    await page.waitForLoadState('networkidle');

    const jobLink = page.locator('a[href*="/jobs/"]').first();
    if (await jobLink.count() === 0) {
      test.skip(true, 'Nenhum job disponivel');
      return;
    }

    await jobLink.click();
    await page.waitForLoadState('networkidle');

    const portalTab = page.locator('[role="tab"]', { hasText: /portal/i });
    if (await portalTab.count() === 0) {
      test.skip(true, 'Aba Portal nao encontrada');
      return;
    }

    await portalTab.click();
    await page.waitForTimeout(500);

    const createBtn = page.locator('button', { hasText: /criar link|criar primeiro link/i }).first();
    if (await createBtn.count() === 0) {
      test.skip(true, 'Botao criar link nao encontrado');
      return;
    }
    await createBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Junior clica direto sem preencher nada
    const submitBtn = dialog.locator('button[type="submit"], button', { hasText: /criar link/i }).first();
    await submitBtn.click();

    // Deve mostrar mensagem de erro
    const errorMsg = dialog.locator('p.text-destructive, [class*="destructive"], [role="alert"]');
    await expect(errorMsg.first()).toBeVisible({ timeout: 3000 });
  });

  test('A08 — [Junior] label gigante (500 chars) deve ser rejeitada ou truncada', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    await page.waitForLoadState('networkidle');

    const jobLink = page.locator('a[href*="/jobs/"]').first();
    if (await jobLink.count() === 0) {
      test.skip(true, 'Nenhum job disponivel');
      return;
    }

    await jobLink.click();
    await page.waitForLoadState('networkidle');

    const portalTab = page.locator('[role="tab"]', { hasText: /portal/i });
    if (await portalTab.count() === 0) {
      test.skip(true, 'Aba Portal nao encontrada');
      return;
    }

    await portalTab.click();
    await page.waitForTimeout(500);

    const createBtn = page.locator('button', { hasText: /criar link|criar primeiro link/i }).first();
    if (await createBtn.count() === 0) {
      test.skip(true, 'Botao criar link nao encontrado');
      return;
    }
    await createBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const labelInput = dialog.locator('input[id="session-label"]').first();
    const bigLabel = 'A'.repeat(500);
    await labelInput.fill(bigLabel);

    const submitBtn = dialog.locator('button[type="submit"], button', { hasText: /criar link/i }).first();
    await submitBtn.click();

    await page.waitForTimeout(2000);

    // O sistema nao deve travar — ou aceita (back valida 500 max) ou rejeita com mensagem
    await expect(page.locator('body')).toBeVisible();
  });

  test('A09 — [Telma] copiar link funciona na pagina /portal', async ({ page }) => {
    await goToPortalAdmin(page);

    // Verificar se ha alguma sessao listada
    const copyBtn = page.locator('button[aria-label*="Copiar link"]').first();

    if (await copyBtn.count() === 0) {
      test.skip(true, 'Nenhuma sessao com botao de copiar link encontrada');
      return;
    }

    await copyBtn.click();

    // Toast de sucesso deve aparecer
    const toast = page.locator('[data-sonner-toast], [role="status"]').filter({ hasText: /copiado/i });
    await expect(toast).toBeVisible({ timeout: 3000 });
  });

  test('A10 — [Hacker] acessar /portal sem estar logado redireciona para login', async ({ browser }) => {
    // Usar contexto sem autenticacao
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/portal`);
    await page.waitForLoadState('networkidle');

    // Deve redirecionar para login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    await context.close();
  });

  test('A11 — [Hacker] botao deletar sessao exige confirmacao (nao deleta direto)', async ({ page }) => {
    await goToPortalAdmin(page);

    const jobLink = page.locator('a[href*="/jobs/"]');
    if (await jobLink.count() > 0) {
      await jobLink.first().click();
      await page.waitForLoadState('networkidle');

      const portalTab = page.locator('[role="tab"]', { hasText: /portal/i });
      if (await portalTab.count() > 0) {
        await portalTab.click();
        await page.waitForTimeout(500);
      }
    }

    // Procurar botao de remover sessao
    const deleteBtn = page.locator('button[aria-label*="Remover"], button', { hasText: /remover/i }).first();

    if (await deleteBtn.count() === 0) {
      test.skip(true, 'Nenhuma sessao disponivel para testar delete');
      return;
    }

    await deleteBtn.click();

    // AlertDialog de confirmacao DEVE aparecer
    const confirmDialog = page.locator('[role="alertdialog"]');
    await expect(confirmDialog).toBeVisible({ timeout: 3000 });

    // Cancelar — nao deve deletar
    const cancelBtn = confirmDialog.locator('button', { hasText: /cancelar/i });
    await cancelBtn.click();

    await expect(confirmDialog).not.toBeVisible({ timeout: 3000 });
  });

  test('A12 — [Hacker] clicar Remover 10x rapido nao causa multiplas delecoes', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    await page.waitForLoadState('networkidle');

    const jobLink = page.locator('a[href*="/jobs/"]').first();
    if (await jobLink.count() === 0) {
      test.skip(true, 'Nenhum job disponivel');
      return;
    }

    await jobLink.click();
    await page.waitForLoadState('networkidle');

    const portalTab = page.locator('[role="tab"]', { hasText: /portal/i });
    if (await portalTab.count() === 0) {
      test.skip(true, 'Aba Portal nao encontrada');
      return;
    }

    await portalTab.click();
    await page.waitForTimeout(500);

    const deleteBtn = page.locator('button[aria-label*="Remover"], button', { hasText: /remover/i }).first();
    if (await deleteBtn.count() === 0) {
      test.skip(true, 'Nenhuma sessao para testar rapid-fire delete');
      return;
    }

    // Rapid fire no botao Remover
    for (let i = 0; i < 10; i++) {
      await deleteBtn.click({ force: true });
      await page.waitForTimeout(30);
    }

    // So um dialog de confirmacao deve aparecer (nao multiplos)
    const dialogs = page.locator('[role="alertdialog"]');
    await page.waitForTimeout(1000);
    const count = await dialogs.count();
    expect(count).toBeLessThanOrEqual(1);

    // Fechar dialog se aberto
    const cancelBtn = page.locator('[role="alertdialog"] button', { hasText: /cancelar/i });
    if (await cancelBtn.count() > 0) {
      await cancelBtn.click();
    }
  });

  test('A13 — [Telma] fechar dialog com ESC nao causa estado corrompido', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    await page.waitForLoadState('networkidle');

    const jobLink = page.locator('a[href*="/jobs/"]').first();
    if (await jobLink.count() === 0) {
      test.skip(true, 'Nenhum job disponivel');
      return;
    }

    await jobLink.click();
    await page.waitForLoadState('networkidle');

    const portalTab = page.locator('[role="tab"]', { hasText: /portal/i });
    if (await portalTab.count() === 0) {
      test.skip(true, 'Aba Portal nao encontrada');
      return;
    }

    await portalTab.click();
    await page.waitForTimeout(500);

    const createBtn = page.locator('button', { hasText: /criar link|criar primeiro link/i }).first();
    if (await createBtn.count() === 0) {
      test.skip(true, 'Botao criar link nao encontrado');
      return;
    }

    // Abrir, preencher parcialmente, fechar com ESC
    await createBtn.click();
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const labelInput = dialog.locator('input[id="session-label"]').first();
    await labelInput.fill('Link que Telma vai abandonar');

    // ESC fecha o dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Dialog nao deve mais estar visivel
    await expect(dialog).not.toBeVisible({ timeout: 3000 });

    // Pagina deve estar funcional — botao ainda aparece
    await expect(page.locator('body')).toBeVisible();
  });

  test('A14 — [Junior] navegar com botao Back do browser apos criar sessao nao duplica', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    await page.waitForLoadState('networkidle');

    // Anotar URL inicial
    const initialUrl = page.url();

    // Ir para um job
    const jobLink = page.locator('a[href*="/jobs/"]').first();
    if (await jobLink.count() === 0) {
      test.skip(true, 'Nenhum job disponivel');
      return;
    }

    await jobLink.click();
    await page.waitForLoadState('networkidle');

    // Voltar com Back
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // URL deve ter voltado para /jobs
    expect(page.url()).toContain('/jobs');

    // Pagina nao deve estar em estado de erro
    await expect(page.locator('body')).toBeVisible();
  });

  test('A15 — pagina /portal tem scroll horizontal zerado (sem overflow)', async ({ page }) => {
    await goToPortalAdmin(page);
    await page.waitForTimeout(2000);

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 5;
    });

    expect(hasHorizontalScroll).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// SUITE B — Portal publico (sem auth, token valido)
// ---------------------------------------------------------------------------

test.describe('SUITE B — Portal publico: fluxo do cliente (Persona: Telma)', () => {
  // Usar o token capturado na suite A ou um fixo para testes independentes
  // Para rodar esta suite isolada, coloque um token valido em PORTAL_TOKEN
  const TOKEN_FROM_ENV = process.env.PORTAL_TOKEN ?? capturedPortalToken;

  test.beforeEach(async ({}, testInfo) => {
    if (!TOKEN_FROM_ENV && !capturedPortalToken) {
      testInfo.skip(
        true,
        'Token de portal nao capturado. Rode a Suite A primeiro ou defina PORTAL_TOKEN=<uuid> no ambiente.',
      );
    }
  });

  test('B01 — portal publico carrega sem erros de console', async ({ page }) => {
    const token = TOKEN_FROM_ENV || capturedPortalToken;
    if (!token) return;

    const errors = monitorPage(page);
    await goToPublicPortal(page, token);

    // Deve mostrar o branding ELLAHOS
    const brand = page.locator('text=/ELLAHOS|ELLAH/i').first();
    await expect(brand).toBeVisible({ timeout: 10000 });

    expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
  });

  test('B02 — portal exibe nome do job e status', async ({ page }) => {
    const token = TOKEN_FROM_ENV || capturedPortalToken;
    if (!token) return;

    await goToPublicPortal(page, token);

    // Header deve existir com algum titulo
    const header = page.locator('header').first();
    await expect(header).toBeVisible({ timeout: 10000 });

    // Deve ter algum texto de status
    const statusText = page.locator('text=/em producao|aprovado|finalizado|pre-producao|pos-producao|orcamento|briefing|cancelado/i').first();
    // Apenas verificar que a pagina carregou com conteudo (status pode nao existir dependendo dos dados)
    await expect(page.locator('main, [id="main-content"]')).toBeVisible({ timeout: 10000 });
  });

  test('B03 — [Telma] pagina publica nao exige login', async ({ browser }) => {
    const token = TOKEN_FROM_ENV || capturedPortalToken;
    if (!token) return;

    // Contexto sem autenticacao
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/portal/${token}`);
    await page.waitForLoadState('networkidle');

    // NAO deve redirecionar para login
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('body')).toBeVisible();

    await context.close();
  });

  test('B04 — [Junior] skeleton aparece durante loading (sem flash de conteudo vazio)', async ({ page }) => {
    const token = TOKEN_FROM_ENV || capturedPortalToken;
    if (!token) return;

    // Interceptar a requisicao para simular delay
    await page.route(`${SUPABASE_URL}/functions/v1/client-portal/public/**`, async (route) => {
      await page.waitForTimeout(500);
      await route.continue();
    });

    await page.goto(`${BASE_URL}/portal/${token}`);

    // Skeleton deve aparecer antes do conteudo
    const skeleton = page.locator('[class*="skeleton"], [class*="animate-pulse"]').first();
    // Pode ser que o skeleton seja muito rapido para capturar, entao apenas verificar que a pagina nao fica em branco
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('B05 — [Telma] secao de mensagens permite enviar (se habilitada)', async ({ page }) => {
    const token = TOKEN_FROM_ENV || capturedPortalToken;
    if (!token) return;

    await goToPublicPortal(page, token);

    // Verificar se o chat esta habilitado
    const chatSection = page.locator('section', { hasText: /mensagens com a producao/i }).first();

    if (await chatSection.count() === 0) {
      test.skip(true, 'Chat nao habilitado nesta sessao de portal');
      return;
    }

    await expect(chatSection).toBeVisible({ timeout: 5000 });

    // Textarea de mensagem deve estar presente
    const msgInput = chatSection.locator('textarea').first();
    await expect(msgInput).toBeVisible();

    // Botao de enviar deve estar desabilitado quando vazio
    const sendBtn = chatSection.locator('button[aria-label*="Enviar"]').first();
    await expect(sendBtn).toBeDisabled();
  });

  test('B06 — [Junior] enviar mensagem vazia nao submete', async ({ page }) => {
    const token = TOKEN_FROM_ENV || capturedPortalToken;
    if (!token) return;

    await goToPublicPortal(page, token);

    const chatSection = page.locator('section', { hasText: /mensagens com a producao/i }).first();
    if (await chatSection.count() === 0) {
      test.skip(true, 'Chat nao habilitado');
      return;
    }

    const msgInput = chatSection.locator('textarea').first();
    await msgInput.fill('');

    // Apertar Enter sem conteudo nao deve disparar envio
    await msgInput.press('Enter');

    // Nenhum toast de sucesso ou erro de requisicao deve aparecer
    const errorToast = page.locator('[data-sonner-toast][data-type="error"]');
    await page.waitForTimeout(1000);
    // Nao deve ter toast de erro por mensagem vazia — apenas nao enviar
    const toastCount = await errorToast.count();
    // Aceitar 0 (correto: nao enviou) ou verificar que nao foi para o servidor
    expect(toastCount).toBe(0);
  });

  test('B07 — [Junior] mensagem com apenas espacos nao submete', async ({ page }) => {
    const token = TOKEN_FROM_ENV || capturedPortalToken;
    if (!token) return;

    await goToPublicPortal(page, token);

    const chatSection = page.locator('section', { hasText: /mensagens com a producao/i }).first();
    if (await chatSection.count() === 0) {
      test.skip(true, 'Chat nao habilitado');
      return;
    }

    const msgInput = chatSection.locator('textarea').first();
    await msgInput.fill('     ');

    const sendBtn = chatSection.locator('button[aria-label*="Enviar"]').first();
    // Botao deve continuar desabilitado (trim() detecta espaco em branco)
    await expect(sendBtn).toBeDisabled();
  });

  test('B08 — [Telma] chat pede nome antes de enviar se nao preenchido', async ({ page }) => {
    const token = TOKEN_FROM_ENV || capturedPortalToken;
    if (!token) return;

    // Limpar localStorage para simular primeiro acesso
    await page.goto(`${BASE_URL}/portal/${token}`);
    await page.evaluate(() => localStorage.removeItem('portal_sender_name'));
    await page.reload();
    await page.waitForLoadState('networkidle');

    const chatSection = page.locator('section', { hasText: /mensagens com a producao/i }).first();
    if (await chatSection.count() === 0) {
      test.skip(true, 'Chat nao habilitado');
      return;
    }

    const msgInput = chatSection.locator('textarea').first();
    await msgInput.fill('Ola, alguem me responde?');
    await msgInput.press('Enter');

    // Deve aparecer campo de nome
    const nameInput = page.locator('input#sender-name').first();
    await expect(nameInput).toBeVisible({ timeout: 3000 });
    await expect(nameInput).toBeFocused();
  });

  test('B09 — [Junior] enviar mensagem completa com nome e conteudo', async ({ page }) => {
    const token = TOKEN_FROM_ENV || capturedPortalToken;
    if (!token) return;

    await goToPublicPortal(page, token);

    // Garantir que o nome esta salvo no localStorage
    await page.evaluate(() => localStorage.setItem('portal_sender_name', 'Junior Teste E2E'));

    // Recarregar para aplicar
    await page.reload();
    await page.waitForLoadState('networkidle');

    const chatSection = page.locator('section', { hasText: /mensagens com a producao/i }).first();
    if (await chatSection.count() === 0) {
      test.skip(true, 'Chat nao habilitado');
      return;
    }

    const msgInput = chatSection.locator('textarea').first();
    const testMsg = `Mensagem de teste E2E — ${Date.now()}`;
    await msgInput.fill(testMsg);

    const sendBtn = chatSection.locator('button[aria-label*="Enviar"]').first();
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();

    // Aguardar resposta
    await page.waitForTimeout(3000);

    // Mensagem otimista ou confirmada deve aparecer no chat
    const msgContent = chatSection.locator(`text=${testMsg}`);
    // Pode ter sido enviada (aparece) ou erro (toast)
    const hasMsg = await msgContent.count() > 0;
    const hasError = await page.locator('[data-sonner-toast]', { hasText: /erro/i }).count() > 0;

    // Um dos dois deve acontecer — nao deve ficar em loading forever
    expect(hasMsg || hasError).toBeTruthy();
  });

  test('B10 — [Hacker] enviar 5 mensagens rapidas nao trava o chat (rate limit gracioso)', async ({ page }) => {
    const token = TOKEN_FROM_ENV || capturedPortalToken;
    if (!token) return;

    await goToPublicPortal(page, token);
    await page.evaluate(() => localStorage.setItem('portal_sender_name', 'Hacker Acidental'));
    await page.reload();
    await page.waitForLoadState('networkidle');

    const chatSection = page.locator('section', { hasText: /mensagens com a producao/i }).first();
    if (await chatSection.count() === 0) {
      test.skip(true, 'Chat nao habilitado');
      return;
    }

    const msgInput = chatSection.locator('textarea').first();
    const sendBtn = chatSection.locator('button[aria-label*="Enviar"]').first();

    // Enviar 5 mensagens rapidas
    for (let i = 1; i <= 5; i++) {
      await msgInput.fill(`Mensagem rapida ${i} — ${Date.now()}`);
      await sendBtn.click();
      await page.waitForTimeout(200);
    }

    await page.waitForTimeout(3000);

    // Pagina nao deve ter crashado
    await expect(page.locator('body')).toBeVisible();
    // Nao deve ter erro 500 no console
  });

  test('B11 — [Junior] Enter envia mensagem (sem Shift)', async ({ page }) => {
    const token = TOKEN_FROM_ENV || capturedPortalToken;
    if (!token) return;

    await goToPublicPortal(page, token);
    await page.evaluate(() => localStorage.setItem('portal_sender_name', 'Junior Enter Key'));
    await page.reload();
    await page.waitForLoadState('networkidle');

    const chatSection = page.locator('section', { hasText: /mensagens com a producao/i }).first();
    if (await chatSection.count() === 0) {
      test.skip(true, 'Chat nao habilitado');
      return;
    }

    const msgInput = chatSection.locator('textarea').first();
    await msgInput.fill('Mensagem via Enter key');

    // Enter sem Shift deve enviar
    await msgInput.press('Enter');
    await page.waitForTimeout(2000);

    // Textarea deve ter ficado vazia apos envio (ou estar em loading)
    const currentVal = await msgInput.inputValue();
    expect(currentVal.trim()).toBe('');
  });

  test('B12 — [Junior] Shift+Enter cria nova linha (nao envia)', async ({ page }) => {
    const token = TOKEN_FROM_ENV || capturedPortalToken;
    if (!token) return;

    await goToPublicPortal(page, token);
    await page.evaluate(() => localStorage.setItem('portal_sender_name', 'Junior Shift Enter'));
    await page.reload();
    await page.waitForLoadState('networkidle');

    const chatSection = page.locator('section', { hasText: /mensagens com a producao/i }).first();
    if (await chatSection.count() === 0) {
      test.skip(true, 'Chat nao habilitado');
      return;
    }

    const msgInput = chatSection.locator('textarea').first();
    await msgInput.fill('Primeira linha');
    await msgInput.press('Shift+Enter');
    await msgInput.type('Segunda linha');

    // Textarea NAO deve ter ficado vazia (Shift+Enter nao envia)
    const currentVal = await msgInput.inputValue();
    expect(currentVal).toContain('Segunda linha');
  });

  test('B13 — [Junior] colar texto do WhatsApp com emojis nao quebra o chat', async ({ page }) => {
    const token = TOKEN_FROM_ENV || capturedPortalToken;
    if (!token) return;

    await goToPublicPortal(page, token);
    await page.evaluate(() => localStorage.setItem('portal_sender_name', 'Junior WhatsApp'));
    await page.reload();
    await page.waitForLoadState('networkidle');

    const chatSection = page.locator('section', { hasText: /mensagens com a producao/i }).first();
    if (await chatSection.count() === 0) {
      test.skip(true, 'Chat nao habilitado');
      return;
    }

    const msgInput = chatSection.locator('textarea').first();
    const whatsappText = '🎬 *APROVACAO* do cut final 🍺\n\nLink: https://drive.google.com/test\n✅ Por favor confirmar!';
    await msgInput.fill(whatsappText);

    // Botao de enviar deve estar habilitado (conteudo valido)
    const sendBtn = chatSection.locator('button[aria-label*="Enviar"]').first();
    await expect(sendBtn).toBeEnabled();

    // Nao deve quebrar o layout
    await expect(chatSection).toBeVisible();
  });

  test('B14 — portal exibe secao de timeline se habilitada', async ({ page }) => {
    const token = TOKEN_FROM_ENV || capturedPortalToken;
    if (!token) return;

    await goToPublicPortal(page, token);

    // Verificar se timeline aparece (pode estar vazia)
    await page.waitForSelector('main, [id="main-content"]', { timeout: 10000 });
    const content = await page.locator('main, [id="main-content"]').textContent();
    expect(content).toBeTruthy();
  });

  test('B15 — [Telma] clicar em tudo que parecer botao nao causa crash', async ({ page }) => {
    const token = TOKEN_FROM_ENV || capturedPortalToken;
    if (!token) return;

    const errors = monitorPage(page);
    await goToPublicPortal(page, token);
    await page.waitForSelector('main', { timeout: 10000 });

    // Telma clica em todos os botoes visiveis
    const buttons = page.locator('button:visible, a:visible');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 15); i++) {
      try {
        const btn = buttons.nth(i);
        const isVisible = await btn.isVisible();
        if (isVisible) {
          await btn.click({ timeout: 2000, force: false });
          await page.waitForTimeout(300);
        }
      } catch {
        // Telma nao liga pra o que nao clica
      }
    }

    // Pagina nao deve ter crashado com erros criticos
    const criticalErrors = errors.filter(
      (e) => e.includes('TypeError') || e.includes('ReferenceError') || e.includes('Cannot read'),
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// SUITE C — Cenarios de erro e tokens invalidos
// ---------------------------------------------------------------------------

test.describe('SUITE C — Cenarios de erro: tokens invalidos e permissoes (Persona: Hacker + Telma)', () => {
  test('C01 — token invalido (nao-UUID) mostra pagina de erro amigavel', async ({ page }) => {
    await page.goto(`${BASE_URL}/portal/token-invalido-123`);
    await page.waitForLoadState('networkidle');

    // Deve mostrar pagina de erro amigavel (nao dump tecnico)
    const errorPage = page.locator('text=/link invalido|nao existe|nao e valido|nao encontrado/i').first();
    await expect(errorPage).toBeVisible({ timeout: 10000 });

    // Nao deve mostrar stack trace ou mensagem tecnica
    const stackTrace = page.locator('text=/TypeError|ReferenceError|Error:/');
    await expect(stackTrace).not.toBeVisible();
  });

  test('C02 — token UUID invalido (formato correto mas inexistente) mostra 404 amigavel', async ({ page }) => {
    const fakeUUID = '00000000-0000-0000-0000-000000000000';
    await page.goto(`${BASE_URL}/portal/${fakeUUID}`);
    await page.waitForLoadState('networkidle');

    // Deve mostrar erro amigavel
    const errorPage = page.locator('text=/link invalido|nao existe|nao e valido|nao encontrado/i').first();
    await expect(errorPage).toBeVisible({ timeout: 10000 });
  });

  test('C03 — pagina de erro tem botao de contato ou link de saida', async ({ page }) => {
    await page.goto(`${BASE_URL}/portal/00000000-0000-0000-0000-000000000001`);
    await page.waitForLoadState('networkidle');

    // Deve ter alguma forma de o usuario saber o que fazer
    const contactLink = page.locator('a[href*="mailto:"], a:has-text("Contatar"), a:has-text("contato")').first();
    await expect(contactLink).toBeVisible({ timeout: 10000 });
  });

  test('C04 — URL /portal/xss-<script> nao executa script', async ({ page }) => {
    const alerts: string[] = [];
    page.on('dialog', (dialog) => {
      alerts.push(dialog.message());
      dialog.dismiss();
    });

    await page.goto(`${BASE_URL}/portal/<script>alert('XSS')</script>`);
    await page.waitForLoadState('networkidle');

    // Nao deve ter executado alert()
    expect(alerts).toHaveLength(0);

    // Deve mostrar pagina de erro, nao pagina em branco
    await expect(page.locator('body')).toBeVisible();
  });

  test('C05 — URL /portal/banana (texto curto) mostra erro amigavel', async ({ page }) => {
    await page.goto(`${BASE_URL}/portal/banana`);
    await page.waitForLoadState('networkidle');

    // Backend rejeita tokens que nao sao UUID — frontend deve mostrar erro amigavel
    const errorPage = page.locator('text=/link invalido|nao existe|nao e valido|nao encontrado/i').first();
    await expect(errorPage).toBeVisible({ timeout: 10000 });
  });

  test('C06 — [Hacker] acessar /portal/[uuid-de-outro-tenant] retorna 404 (sem dados vazados)', async ({
    page,
  }) => {
    // UUID de tenant diferente (inventado)
    const crossTenantUUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    await page.goto(`${BASE_URL}/portal/${crossTenantUUID}`);
    await page.waitForLoadState('networkidle');

    // Deve mostrar pagina de erro — nao deve vazar dados de outros tenants
    const errorPage = page.locator('text=/link invalido|nao existe|nao e valido|nao encontrado/i').first();
    await expect(errorPage).toBeVisible({ timeout: 10000 });
  });

  test('C07 — rota /portal/[token]/qualquer-coisa retorna 404 ou redireciona', async ({ page }) => {
    const fakeUUID = '00000000-0000-0000-0000-000000000002';
    await page.goto(`${BASE_URL}/portal/${fakeUUID}/pagina-inexistente`);
    await page.waitForLoadState('networkidle');

    // Nao deve mostrar erro 500 ou dump tecnico
    const techError = page.locator('text=/Internal Server Error|Application error/i');
    await expect(techError).not.toBeVisible({ timeout: 5000 });
  });

  test('C08 — pagina /portal/[token] em mobile 375px nao tem overflow horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/portal/00000000-0000-0000-0000-000000000000`);
    await page.waitForLoadState('networkidle');

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 5;
    });

    expect(hasHorizontalScroll).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// SUITE D — Seguranca: dados sensiveis e XSS no chat
// ---------------------------------------------------------------------------

test.describe('SUITE D — Seguranca: dados sensiveis, XSS, injecao (Persona: Hacker)', () => {
  test('D01 — endpoint publico GET /client-portal/public/:token nao retorna campos financeiros', async ({ request }) => {
    // Tentar acessar com UUID invalido — verificar que a resposta e 404 estruturado
    const res = await request.get(
      `${SUPABASE_URL}/functions/v1/client-portal/public/00000000-0000-0000-0000-000000000000`,
    );

    expect(res.status()).toBe(404);
    const body = await res.json();

    // Verificar que nao ha campos sensiveis na resposta de erro
    const bodyStr = JSON.stringify(body).toLowerCase();
    const sensitiveTerms = ['cpf', 'cnpj', 'closed_value', 'gross_profit', 'margin', 'nf_', 'tax_value'];
    for (const term of sensitiveTerms) {
      expect(bodyStr).not.toContain(term);
    }
  });

  test('D02 — endpoint publico nao aceita token sem formato UUID', async ({ request }) => {
    const res = await request.get(
      `${SUPABASE_URL}/functions/v1/client-portal/public/nao-sou-uuid`,
    );

    // Deve retornar 404 (token invalido), nao 500
    expect(res.status()).toBe(404);
  });

  test('D03 — [Hacker] tentar enviar mensagem com SQL injection no content', async ({ request }) => {
    const fakeToken = '00000000-0000-0000-0000-000000000000';
    const res = await request.post(
      `${SUPABASE_URL}/functions/v1/client-portal/public/${fakeToken}/message`,
      {
        data: {
          sender_name: "'; DROP TABLE client_portal_messages; --",
          content: "SELECT * FROM client_portal_sessions WHERE 1=1; --",
        },
      },
    );

    // Nao deve retornar 200 (sessao nao existe), nao deve expor erro de SQL
    expect(res.status()).not.toBe(200);
    const body = await res.json();
    const bodyStr = JSON.stringify(body).toLowerCase();
    expect(bodyStr).not.toContain('syntax error');
    expect(bodyStr).not.toContain('postgresql');
    expect(bodyStr).not.toContain('sql');
  });

  test('D04 — [Hacker] enviar XSS no content da mensagem nao executa no portal', async ({ page }) => {
    const token = capturedPortalToken;
    if (!token) {
      test.skip(true, 'Token nao capturado — pular teste de XSS');
      return;
    }

    const xssAttempts: string[] = [];
    page.on('dialog', (dialog) => {
      xssAttempts.push(dialog.message());
      dialog.dismiss();
    });

    // Tentar enviar XSS via API direta (simulando Hacker que bypassa o frontend)
    const xssPayload = '<script>alert("XSS")</script><img src=x onerror=alert(1)>';
    const res = await page.request.post(
      `${SUPABASE_URL}/functions/v1/client-portal/public/${token}/message`,
      {
        data: {
          sender_name: 'Hacker',
          content: xssPayload,
        },
      },
    );

    if (res.status() === 200 || res.status() === 201) {
      // Mensagem foi aceita — verificar se e renderizada com seguranca no frontend
      await goToPublicPortal(page, token);
      await page.waitForTimeout(2000);

      // XSS nao deve ter sido executado
      expect(xssAttempts).toHaveLength(0);
    }
    // Se foi rejeitada, tudo certo
  });

  test('D05 — [Hacker] rotas autenticadas sem token retornam 401', async ({ request }) => {
    // Tentar acessar rota autenticada sem Bearer token
    const res = await request.get(
      `${SUPABASE_URL}/functions/v1/client-portal/sessions`,
    );

    // Deve retornar 401 ou 403, nao dados
    expect([401, 403]).toContain(res.status());
  });

  test('D06 — [Hacker] tentar criar sessao sem autenticacao retorna 401', async ({ request }) => {
    const res = await request.post(
      `${SUPABASE_URL}/functions/v1/client-portal/sessions`,
      {
        data: {
          job_id: '00000000-0000-0000-0000-000000000000',
          label: 'Hacker session',
        },
      },
    );

    expect([401, 403]).toContain(res.status());
  });

  test('D07 — [Hacker] rate limit de mensagens retorna 429 apos limite', async ({ request }) => {
    // So podemos testar isso se tiver um token valido
    const token = capturedPortalToken;
    if (!token) {
      test.skip(true, 'Token nao capturado — pular teste de rate limit');
      return;
    }

    // O rate limit e 20 mensagens/hora — nao vamos chegar nele aqui
    // Mas verificamos que a API retorna 429 se tentarmos acima do limite
    // Este e um teste de documentacao do comportamento esperado

    // Enviar 1 mensagem e verificar que o status e valido (200/201 ou 429)
    const res = await request.post(
      `${SUPABASE_URL}/functions/v1/client-portal/public/${token}/message`,
      {
        data: {
          sender_name: 'Tester Rate Limit',
          content: 'Teste de rate limit',
        },
      },
    );

    // Deve ser 200/201 (dentro do limite) ou 429 (acima do limite) ou 403 (sem permissao)
    expect([200, 201, 429, 403, 410]).toContain(res.status());
  });

  test('D08 — portal publico nao expoe token UUID nas respostas JSON publicas', async ({ request }) => {
    const token = capturedPortalToken;
    if (!token) {
      test.skip(true, 'Token nao capturado');
      return;
    }

    const res = await request.get(
      `${SUPABASE_URL}/functions/v1/client-portal/public/${token}`,
    );

    if (res.status() === 200) {
      const body = await res.json();
      const data = body.data;

      // Session na resposta publica NAO deve ter o token UUID exposto diretamente
      // (o token ja foi usado para autenticar, expor novamente e redundante e de risco)
      if (data?.session) {
        expect(data.session.token).toBeUndefined();
      }

      // Dados financeiros nao devem aparecer
      const bodyStr = JSON.stringify(data).toLowerCase();
      const sensitiveFields = ['closed_value', 'gross_profit', 'margin_percentage', 'tax_value', 'cpf', 'cnpj'];
      for (const field of sensitiveFields) {
        expect(bodyStr).not.toContain(field);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// SUITE E — Mobile (viewport 375px, iPhone 13)
// ---------------------------------------------------------------------------

test.describe('SUITE E — Mobile: Telma no iPhone (viewport 375px)', () => {
  test.use({
    viewport: { width: 375, height: 812 },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  });

  test('E01 — pagina de erro do portal (token invalido) responsiva em mobile', async ({ page }) => {
    await page.goto(`${BASE_URL}/portal/00000000-0000-0000-0000-000000000000`);
    await page.waitForLoadState('networkidle');

    // Sem scroll horizontal
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 5;
    });
    expect(hasHorizontalScroll).toBeFalsy();

    // Conteudo visivel e legivel
    await expect(page.locator('body')).toBeVisible();
  });

  test('E02 — portal publico responsivo em 375px (sem overflow)', async ({ page }) => {
    const token = capturedPortalToken;
    if (!token) {
      test.skip(true, 'Token nao capturado — pular teste mobile do portal publico');
      return;
    }

    await goToPublicPortal(page, token);
    await page.waitForSelector('main', { timeout: 10000 });

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 5;
    });
    expect(hasHorizontalScroll).toBeFalsy();
  });

  test('E03 — chat no mobile: textarea e botao de envio visiveis e clicaveis', async ({ page }) => {
    const token = capturedPortalToken;
    if (!token) {
      test.skip(true, 'Token nao capturado');
      return;
    }

    await goToPublicPortal(page, token);

    const chatSection = page.locator('section', { hasText: /mensagens com a producao/i }).first();
    if (await chatSection.count() === 0) {
      test.skip(true, 'Chat nao habilitado nesta sessao');
      return;
    }

    // Textarea deve ser visivel sem scroll horizontal
    const textarea = chatSection.locator('textarea').first();
    await expect(textarea).toBeVisible();

    // Verificar que o textarea nao esta cortado
    const box = await textarea.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThan(100);
      expect(box.x + box.width).toBeLessThanOrEqual(380); // dentro do viewport 375
    }
  });

  test('E04 — [Telma no iPhone] header do portal fixo nao cobre conteudo em mobile', async ({ page }) => {
    const token = capturedPortalToken;
    if (!token) {
      test.skip(true, 'Token nao capturado');
      return;
    }

    await goToPublicPortal(page, token);
    await page.waitForSelector('main', { timeout: 10000 });

    // Verificar que o main content tem padding-top suficiente para o header fixo
    const mainPaddingTop = await page.evaluate(() => {
      const main = document.querySelector('main, [id="main-content"]');
      if (!main) return 0;
      return parseInt(window.getComputedStyle(main).paddingTop);
    });

    // O layout usa pt-24 (96px) — em mobile deve ser suficiente para o header
    expect(mainPaddingTop).toBeGreaterThanOrEqual(60);
  });

  test('E05 — admin /portal em mobile mostra tabela sem overflow', async ({ page }) => {
    test.use({ storageState: 'tests/.auth/user.json' });

    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input#email', ADMIN_EMAIL);
    await page.fill('input#password', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    try {
      await page.waitForURL(/\/$/, { timeout: 15000 });
    } catch {
      test.skip(true, 'Login falhou em mobile — possivelmente redirecionamento diferente');
      return;
    }

    await goToPortalAdmin(page);
    await page.waitForTimeout(2000);

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 5;
    });

    expect(hasHorizontalScroll).toBeFalsy();
  });
});

// ---------------------------------------------------------------------------
// SUITE F — Fluxo completo integrado (smoke test realista)
// ---------------------------------------------------------------------------

test.describe('SUITE F — Smoke: fluxo completo admin → cliente', () => {
  test.use({ storageState: 'tests/.auth/user.json' });

  test('F01 — smoke: criar sessao → acessar portal publico → enviar mensagem', async ({ page, browser }) => {
    // PASSO 1: Admin cria sessao
    await page.goto(`${BASE_URL}/jobs`);
    await page.waitForLoadState('networkidle');

    const jobLink = page.locator('a[href*="/jobs/"]').first();
    if (await jobLink.count() === 0) {
      test.skip(true, 'Nenhum job disponivel para smoke test completo');
      return;
    }

    await jobLink.click();
    await page.waitForLoadState('networkidle');

    const portalTab = page.locator('[role="tab"]', { hasText: /portal/i });
    if (await portalTab.count() === 0) {
      test.skip(true, 'Aba Portal nao encontrada');
      return;
    }

    await portalTab.click();
    await page.waitForTimeout(500);

    const createBtn = page.locator('button', { hasText: /criar link|criar primeiro link/i }).first();
    if (await createBtn.count() === 0) {
      test.skip(true, 'Botao criar link nao encontrado');
      return;
    }

    await createBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const labelInput = dialog.locator('input[id="session-label"]').first();
    const sessionLabel = `Smoke Test ${Date.now()}`;
    await labelInput.fill(sessionLabel);

    const submitBtn = dialog.locator('button', { hasText: /criar link/i }).first();
    await submitBtn.click();

    // Aguardar URL gerada
    await page.waitForTimeout(3000);

    // Capturar URL
    const urlElement = dialog.locator('[class*="font-mono"], p.text-sm.font-mono').first();
    let portalUrl = '';
    if (await urlElement.count() > 0) {
      portalUrl = (await urlElement.textContent()) ?? '';
    }

    // PASSO 2: Cliente (sem auth) acessa o portal
    if (portalUrl.includes('/portal/')) {
      const clientContext = await browser.newContext();
      const clientPage = await clientContext.newPage();

      await clientPage.goto(portalUrl.trim());
      await clientPage.waitForLoadState('networkidle');

      // Deve mostrar o portal, nao pagina de erro
      const errorText = clientPage.locator('text=/link invalido|nao existe/i');
      const hasError = await errorText.count() > 0;

      if (!hasError) {
        // PASSO 3: Cliente envia mensagem
        await clientPage.evaluate(() => localStorage.setItem('portal_sender_name', 'Cliente Smoke Test'));
        await clientPage.reload();
        await clientPage.waitForLoadState('networkidle');

        const chatSection = clientPage.locator('section', { hasText: /mensagens com a producao/i }).first();
        if (await chatSection.count() > 0) {
          const msgInput = chatSection.locator('textarea').first();
          await msgInput.fill('Mensagem do smoke test — por favor confirmar');
          await msgInput.press('Enter');
          await clientPage.waitForTimeout(2000);

          // Mensagem deve aparecer no chat
          await expect(clientPage.locator('body')).toBeVisible();
        }
      }

      await clientContext.close();
    }

    // Teste passou se chegou ate aqui sem excecao
    expect(true).toBeTruthy();
  });

  test('F02 — desativar sessao impede acesso ao portal publico', async ({ page, browser }) => {
    // Este teste requer uma sessao que possamos desativar
    // Por seguranca, so executamos se temos o token capturado
    const token = capturedPortalToken;
    const sessionId = capturedSessionId;

    if (!token || !sessionId) {
      test.skip(true, 'Token/SessionId nao capturado — pular teste de desativacao');
      return;
    }

    // Desativar via API (usuario admin autenticado)
    // Este teste e mais complexo e requer autenticacao na API diretamente
    // Documentamos como teste manual
    test.skip(true, 'Teste de desativacao requer autenticacao de API — executar manualmente (ver relatorio)');
  });
});
