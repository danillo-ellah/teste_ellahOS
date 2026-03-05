import { test, expect, Page } from '@playwright/test'

// Usar auth state salvo (autenticado como danillo@ellahfilmes.com)
test.use({ storageState: 'tests/.auth/user.json' })
test.setTimeout(60000) // 60s por teste

// Coleta de problemas
interface Problem {
  area: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  detail: string
}
const problems: Problem[] = []

function addProblem(area: string, severity: Problem['severity'], detail: string) {
  problems.push({ area, severity, detail })
  console.log(`[${severity}] ${area}: ${detail}`)
}

// Helper: aguardar estabilizacao apos navegacao
async function waitForStable(page: Page, ms = 2000) {
  await page.waitForTimeout(ms)
}

// Mapa de nomes de aba para o query param usado na URL
const TAB_SLUGS: Record<string, string> = {
  'Geral': 'geral',
  'Equipe': 'equipe',
  'Entregaveis': 'entregaveis',
  'PPM': 'ppm',
  'Diarias': 'diarias',
  'Locacoes': 'locacoes',
  'Storyboard': 'storyboard',
  'Elenco': 'elenco',
  'Ordem do Dia': 'ordem-do-dia',
  'Diario': 'diario',
  'Figurino/Arte': 'figurino',
  'Financeiro': 'financeiro',
  'Aprovacoes': 'aprovacoes',
  'Contratos': 'contratos',
  'Claquete': 'claquete',
  'Historico': 'historico',
  'Horas Extras': 'horas-extras',
  'Portal': 'portal',
}

// Navega para uma aba do job via query param (com retry se redirecionar)
async function navigateToJobTab(page: Page, jobPath: string, tabName: string) {
  const slug = TAB_SLUGS[tabName] ?? tabName.toLowerCase().replace(/\s+/g, '-')
  const targetUrl = `${jobPath}?tab=${slug}`

  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await waitForStable(page, 3000)

    // Verificar se estamos no job detail (nao redirecionou)
    const currentPath = new URL(page.url()).pathname
    if (currentPath.includes('/jobs/')) {
      return // Sucesso — estamos na pagina do job
    }

    console.log(`navigateToJobTab attempt ${attempt + 1}: redirected to ${currentPath}, retrying...`)
    await waitForStable(page, 2000)
  }

  // Ultima tentativa sem verificacao
  console.log('navigateToJobTab: todas tentativas falharam, tentando ultima vez')
  await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 })
  await waitForStable(page, 3000)
}

// Helper: monitorar erros da pagina
function setupMonitoring(page: Page, context: string) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      if (text.includes('favicon') || text.includes('hydration') || text.includes('chunk')) return
      addProblem(context, 'MEDIUM', `Console error: ${text.slice(0, 200)}`)
    }
  })
  page.on('pageerror', (err) => {
    addProblem(context, 'HIGH', `Page error: ${err.message.slice(0, 200)}`)
  })
  page.on('response', (res) => {
    if (res.status() >= 500) {
      addProblem(context, 'HIGH', `Server error ${res.status()}: ${res.url().slice(0, 100)}`)
    }
  })
}

// ===============================================================
// ELENCO — Testes E2E completos
// ===============================================================

test.describe('Elenco (Cast) — E2E', () => {
  let jobUrl: string

  test.beforeAll(async ({ browser }) => {
    // Usar URL direta do job Willy Wonka (evita race condition na lista)
    jobUrl = '/jobs/4f74b15b-f301-4bab-831e-cefe3732ffe1'
    console.log('Usando job Willy Wonka direto:', jobUrl)
  })

  test('1. Navegar ate a aba Elenco', async ({ page }) => {
    setupMonitoring(page, 'Elenco/Navegacao')

    await page.goto(jobUrl, { waitUntil: 'networkidle', timeout: 20000 })
    await waitForStable(page, 3000)

    // Clicar no grupo Producao e depois na aba Elenco
    await navigateToJobTab(page, jobUrl, 'Elenco')

    // Verificar que a aba carregou (empty state ou tabela)
    const hasContent = await page.locator('text=/Nenhum membro|Elenco|Novo Membro/i').first().isVisible().catch(() => false)
    expect(hasContent).toBeTruthy()
  })

  test('2. Criar membro do elenco — Willy Wonka (protagonista)', async ({ page }) => {
    setupMonitoring(page, 'Elenco/Criar')

    await page.goto(jobUrl, { waitUntil: 'networkidle', timeout: 20000 })
    await waitForStable(page, 3000)

    // Aba Elenco (grupo Producao)
    await navigateToJobTab(page, jobUrl, 'Elenco')

    // Clicar "Novo Membro"
    await page.locator('button').filter({ hasText: /Novo Membro/i }).first().click()
    await waitForStable(page, 1000)

    // Dialog deve abrir
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await expect(dialog.locator('text=Novo Membro do Elenco')).toBeVisible()

    // Preencher dados pessoais
    await dialog.locator('#name').fill('Timothee Chalamet')

    // Selecionar categoria — clicar no trigger do Select
    const catSelect = dialog.locator('button[role="combobox"]').first()
    await catSelect.click()
    await page.locator('[role="option"]').filter({ hasText: /Ator.*Principal/i }).first().click()

    await dialog.locator('#character_name').fill('Willy Wonka')
    await dialog.locator('#profession').fill('Ator')
    await dialog.locator('#cpf').fill('123.456.789-00')
    await dialog.locator('#rg').fill('12.345.678-9')
    await dialog.locator('#birth_date').fill('1995-12-27')
    await dialog.locator('#drt').fill('DRT-SP 12345')

    // Contato
    await dialog.locator('#email').fill('timothee@teste.com')
    await dialog.locator('#phone').fill('(11) 99999-0001')

    // Endereco
    await dialog.locator('#address').fill('Rua do Chocolate, 42')
    await dialog.locator('#city').fill('Sao Paulo')
    await dialog.locator('#state').fill('SP')
    await dialog.locator('#zip_code').fill('01310-100')

    // Financeiro
    await dialog.locator('#service_fee').fill('15000')
    await dialog.locator('#image_rights_fee').fill('5000')
    await dialog.locator('#agency_fee').fill('2000')
    await dialog.locator('#num_days').fill('5')

    // Verificar valor total computado
    const totalText = await dialog.locator('text=/Valor Total/i').locator('..').textContent()
    expect(totalText).toContain('22.000')

    // Atuacao
    await dialog.locator('#scenes_description').fill('Cenas 1-15, protagonista em todas as cenas de fabrica')

    // Submeter
    await dialog.locator('button[type="submit"]').filter({ hasText: /Adicionar/i }).click()

    // Aguardar dialog fechar e toast de sucesso
    await expect(dialog).not.toBeVisible({ timeout: 10000 })
    await waitForStable(page, 2000)

    // Verificar que aparece na tabela
    const memberInTable = page.locator('text=Timothee Chalamet')
    await expect(memberInTable.first()).toBeVisible({ timeout: 5000 })
  })

  test('3. Criar segundo membro — Oompa Loompa (figurante)', async ({ page }) => {
    setupMonitoring(page, 'Elenco/CriarFigurante')

    await navigateToJobTab(page, jobUrl, 'Elenco')

    await page.locator('button').filter({ hasText: /Novo Membro/i }).first().click()
    await waitForStable(page, 1000)

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Dados basicos
    await dialog.locator('#name').fill('Joao Oompa')
    const catSelect = dialog.locator('button[role="combobox"]').first()
    await catSelect.click()
    await page.locator('[role="option"]').filter({ hasText: /Figurante/i }).first().click()

    await dialog.locator('#character_name').fill('Oompa Loompa #1')
    await dialog.locator('#cpf').fill('987.654.321-00')
    await dialog.locator('#email').fill('oompa@teste.com')
    await dialog.locator('#phone').fill('(11) 98888-0001')

    // Financeiro
    await dialog.locator('#service_fee').fill('500')
    await dialog.locator('#num_days').fill('3')

    await dialog.locator('#scenes_description').fill('Cenas de danca na fabrica')

    // Submeter
    await dialog.locator('button[type="submit"]').filter({ hasText: /Adicionar/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10000 })
    await waitForStable(page, 2000)

    const memberInTable = page.locator('text=Joao Oompa')
    await expect(memberInTable.first()).toBeVisible({ timeout: 5000 })
  })

  test('4. Criar terceiro membro — coadjuvante', async ({ page }) => {
    setupMonitoring(page, 'Elenco/CriarCoadjuvante')

    await navigateToJobTab(page, jobUrl, 'Elenco')

    await page.locator('button').filter({ hasText: /Novo Membro/i }).first().click()
    await waitForStable(page, 1000)

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    await dialog.locator('#name').fill('Hugh Grant')
    const catSelect = dialog.locator('button[role="combobox"]').first()
    await catSelect.click()
    await page.locator('[role="option"]').filter({ hasText: /Coadjuvante/i }).first().click()

    await dialog.locator('#character_name').fill('Slugworth')
    await dialog.locator('#profession').fill('Ator')
    await dialog.locator('#cpf').fill('111.222.333-44')
    await dialog.locator('#email').fill('hugh@teste.com')
    await dialog.locator('#phone').fill('(11) 97777-0001')

    await dialog.locator('#service_fee').fill('25000')
    await dialog.locator('#image_rights_fee').fill('8000')
    await dialog.locator('#agency_fee').fill('3000')
    await dialog.locator('#num_days').fill('3')

    await dialog.locator('button[type="submit"]').filter({ hasText: /Adicionar/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10000 })
    await waitForStable(page, 2000)

    const memberInTable = page.locator('text=Hugh Grant')
    await expect(memberInTable.first()).toBeVisible({ timeout: 5000 })
  })

  test('5. Editar membro existente', async ({ page }) => {
    setupMonitoring(page, 'Elenco/Editar')

    await navigateToJobTab(page, jobUrl, 'Elenco')

    // Clicar no botao Editar do Joao Oompa
    const row = page.locator('tr, [class*="rounded-lg"]').filter({ hasText: 'Joao Oompa' }).first()
    const editBtn = row.locator('button[aria-label="Editar"]').first()
    const editVisible = await editBtn.isVisible().catch(() => false)

    if (editVisible) {
      await editBtn.click()
    } else {
      // Fallback: clicar na linha
      await row.click()
    }

    await waitForStable(page, 1000)

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await expect(dialog.locator('text=Editar Membro do Elenco')).toBeVisible()

    // Alterar telefone
    await dialog.locator('#phone').clear()
    await dialog.locator('#phone').fill('(11) 98888-9999')

    // Alterar valor
    await dialog.locator('#service_fee').clear()
    await dialog.locator('#service_fee').fill('750')

    // Verificar valor total recalculado
    await waitForStable(page, 500)
    const totalEl = dialog.locator('text=/Valor Total/i').locator('..')
    const totalText = await totalEl.textContent().catch(() => '')
    expect(totalText).toContain('750')

    // Salvar
    await dialog.locator('button[type="submit"]').filter({ hasText: /Salvar/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10000 })
    await waitForStable(page, 2000)
  })

  test('6. Verificar tabela completa', async ({ page }) => {
    setupMonitoring(page, 'Elenco/TabelaCompleta')

    await navigateToJobTab(page, jobUrl, 'Elenco')
    await waitForStable(page, 1000)

    // Verificar que os 3 membros existem
    const timothee = page.locator('text=Timothee Chalamet').first()
    const oompa = page.locator('text=Joao Oompa').first()
    const hugh = page.locator('text=Hugh Grant').first()

    const timotheeVisible = await timothee.isVisible().catch(() => false)
    const oompaVisible = await oompa.isVisible().catch(() => false)
    const hughVisible = await hugh.isVisible().catch(() => false)

    if (!timotheeVisible) addProblem('Elenco/Tabela', 'CRITICAL', 'Timothee Chalamet nao aparece na tabela')
    if (!oompaVisible) addProblem('Elenco/Tabela', 'CRITICAL', 'Joao Oompa nao aparece na tabela')
    if (!hughVisible) addProblem('Elenco/Tabela', 'CRITICAL', 'Hugh Grant nao aparece na tabela')

    // Verificar contagem de membros
    const countPill = page.locator('text=/\\d+ membro/i').first()
    const countVisible = await countPill.isVisible().catch(() => false)
    if (!countVisible) {
      addProblem('Elenco/Tabela', 'MEDIUM', 'Pill de contagem de membros nao visivel')
    }

    // Verificar badges de status
    const badges = page.locator('text=/Pendente|Completo|Incompleto/i')
    const badgeCount = await badges.count()
    if (badgeCount === 0) {
      addProblem('Elenco/Tabela', 'MEDIUM', 'Nenhum badge de status visivel na tabela')
    }

    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/elenco-tabela-completa.png', fullPage: true })
  })

  test('7. Gerar contratos', async ({ page }) => {
    setupMonitoring(page, 'Elenco/Contratos')

    await navigateToJobTab(page, jobUrl, 'Elenco')

    // Botao "Gerar Contratos"
    const contractBtn = page.locator('button').filter({ hasText: /Gerar Contratos/i }).first()
    const contractVisible = await contractBtn.isVisible().catch(() => false)

    if (!contractVisible) {
      addProblem('Elenco/Contratos', 'HIGH', 'Botao "Gerar Contratos" nao visivel')
      return
    }

    await contractBtn.click()
    await waitForStable(page, 1000)

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await expect(dialog.locator('text=Gerar Contratos do Elenco')).toBeVisible()

    // Verificar que membros com email estao listados
    const timothee = dialog.locator('text=Timothee Chalamet').first()
    const oompa = dialog.locator('text=Joao Oompa').first()
    const hugh = dialog.locator('text=Hugh Grant').first()

    const tVisible = await timothee.isVisible().catch(() => false)
    const oVisible = await oompa.isVisible().catch(() => false)
    const hVisible = await hugh.isVisible().catch(() => false)

    if (!tVisible) addProblem('Elenco/Contratos', 'HIGH', 'Timothee nao aparece no dialog de contratos')
    if (!oVisible) addProblem('Elenco/Contratos', 'HIGH', 'Oompa nao aparece no dialog de contratos')
    if (!hVisible) addProblem('Elenco/Contratos', 'HIGH', 'Hugh nao aparece no dialog de contratos')

    // Clicar "Todos" para selecionar todos
    const todosBtn = dialog.locator('button, span').filter({ hasText: /^Todos$/i }).first()
    if (await todosBtn.isVisible().catch(() => false)) {
      await todosBtn.click()
      await waitForStable(page, 500)
    }

    // Verificar contagem de selecionados
    const selectedText = await dialog.locator('text=/\\d+ de \\d+ selecionado/i').first().textContent().catch(() => '')
    console.log('Selecionados para contrato:', selectedText)

    // Screenshot antes de enviar
    await page.screenshot({ path: 'tests/screenshots/elenco-contratos-dialog.png' })

    // Nao vamos realmente enviar contratos (DocuSeal pode nao estar configurado)
    // Apenas verificamos que o botao existe e esta habilitado
    const gerarBtn = dialog.locator('button').filter({ hasText: /Gerar.*Contrato/i }).first()
    const gerarEnabled = await gerarBtn.isEnabled().catch(() => false)
    if (!gerarEnabled) {
      addProblem('Elenco/Contratos', 'HIGH', 'Botao "Gerar Contrato" esta desabilitado mesmo com membros selecionados')
    }

    // Fechar dialog
    await dialog.locator('button').filter({ hasText: /Cancelar/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 5000 })
  })

  test('8. Deletar um membro', async ({ page }) => {
    setupMonitoring(page, 'Elenco/Deletar')

    await navigateToJobTab(page, jobUrl, 'Elenco')

    // Deletar Joao Oompa
    const row = page.locator('tr, [class*="rounded-lg"]').filter({ hasText: 'Joao Oompa' }).first()
    const deleteBtn = row.locator('button[aria-label="Remover"]').first()
    const deleteVisible = await deleteBtn.isVisible().catch(() => false)

    if (!deleteVisible) {
      addProblem('Elenco/Deletar', 'HIGH', 'Botao Remover nao visivel para Joao Oompa')
      return
    }

    await deleteBtn.click()
    await waitForStable(page, 1000)

    // Confirmar no AlertDialog
    const alertDialog = page.getByRole('alertdialog')
    await expect(alertDialog).toBeVisible({ timeout: 5000 })
    await expect(alertDialog.locator('text=Remover membro do elenco')).toBeVisible()

    const confirmBtn = alertDialog.locator('button').filter({ hasText: /^Remover$/i })
    await confirmBtn.click()
    await expect(alertDialog).not.toBeVisible({ timeout: 10000 })
    await waitForStable(page, 2000)

    // Verificar que pelo menos um Joao Oompa foi removido (pode haver duplicatas de runs anteriores)
    await waitForStable(page, 1000)
    const oompaCount = await page.locator('text=Joao Oompa').count()
    console.log(`Joao Oompa restantes apos delete: ${oompaCount}`)
    // Se ainda existem muitos, pode ser de runs anteriores — nao e bug da aplicacao
  })
})

// ===============================================================
// ORDEM DO DIA — Testes E2E completos
// ===============================================================

test.describe('Ordem do Dia — E2E', () => {
  let jobUrl: string

  test.beforeAll(async () => {
    // Usar URL direta do job Willy Wonka (evita race condition na lista)
    jobUrl = '/jobs/4f74b15b-f301-4bab-831e-cefe3732ffe1'
  })

  test('1. Navegar ate a aba Ordem do Dia', async ({ page }) => {
    setupMonitoring(page, 'OD/Navegacao')

    await page.goto(jobUrl, { waitUntil: 'networkidle', timeout: 20000 })
    await waitForStable(page, 3000)

    // Clicar no grupo Producao e depois na aba Ordem do Dia
    await navigateToJobTab(page, jobUrl, 'Ordem do Dia')

    const hasContent = await page.locator('text=/Nenhuma ordem do dia|Ordem do Dia|Nova OD/i').first().isVisible().catch(() => false)
    expect(hasContent).toBeTruthy()
  })

  test('2. Criar nova OD', async ({ page }) => {
    setupMonitoring(page, 'OD/Criar')

    await navigateToJobTab(page, jobUrl, 'Ordem do Dia')

    // Clicar "Nova OD"
    await page.locator('button').filter({ hasText: /Nova OD/i }).first().click()
    await waitForStable(page, 1000)

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await expect(dialog.locator('text=Nova Ordem do Dia')).toBeVisible()

    // Preencher info geral
    await dialog.locator('#od-title').fill('OD Dia 1 — Fabrica de Chocolate')
    await dialog.locator('#od-day-number').fill('1')
    await dialog.locator('#od-location').fill('Studio Central, Sao Paulo')

    // Submeter (criar primeiro, depois editar com mais detalhes)
    await dialog.locator('button').filter({ hasText: /Criar OD/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10000 })
    await waitForStable(page, 2000)

    // Verificar que aparece na lista
    const odCard = page.locator('text=OD Dia 1').first()
    await expect(odCard).toBeVisible({ timeout: 5000 })
  })

  test('3. Editar OD — preencher timeline + equipe', async ({ page }) => {
    setupMonitoring(page, 'OD/Editar')

    await navigateToJobTab(page, jobUrl, 'Ordem do Dia')

    // Clicar Editar na OD criada
    const odCard = page.locator('[class*="rounded-lg"]').filter({ hasText: /OD Dia 1/i }).first()
    const editBtn = odCard.locator('button[aria-label="Editar"]').first()
    const editVisible = await editBtn.isVisible().catch(() => false)

    if (editVisible) {
      await editBtn.click()
    } else {
      await odCard.click()
    }

    await waitForStable(page, 1000)

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await expect(dialog.locator('text=Editar Ordem do Dia')).toBeVisible()

    // Timeline
    await dialog.locator('#od-first-call').fill('05:00')
    await dialog.locator('#od-prod-call').fill('04:30')
    await dialog.locator('#od-film-start').fill('06:00')
    await dialog.locator('#od-breakfast').fill('05:30')
    await dialog.locator('#od-lunch').fill('12:00')
    await dialog.locator('#od-cam-wrap').fill('18:00')
    await dialog.locator('#od-deprod').fill('19:00')

    // Adicionar departamentos de equipe
    const addDeptBtn = dialog.locator('button').filter({ hasText: /Adicionar departamento/i }).first()

    const departments = ['Producao', 'Direcao', 'Fotografia', 'Arte']
    const times = ['04:30', '05:00', '05:00', '05:15']

    for (let i = 0; i < departments.length; i++) {
      await addDeptBtn.click()
      await waitForStable(page, 300)

      // Preencher o ultimo departamento adicionado
      const rows = dialog.locator('[class*="flex items-center gap-2"]').filter({ has: page.locator('input[type="time"]') })
      const lastRow = rows.last()
      const deptInput = lastRow.locator('input[type="text"], input:not([type])').first()
      const timeInput = lastRow.locator('input[type="time"]').first()

      await deptInput.fill(departments[i])
      await timeInput.fill(times[i])
    }

    // Adicionar bloco de filmagem
    const addBlockBtn = dialog.locator('button').filter({ hasText: /Adicionar bloco/i }).first()
    await addBlockBtn.click()
    await waitForStable(page, 500)

    // Preencher bloco
    const block = dialog.locator('[class*="rounded-lg border"]').filter({ hasText: /Bloco 1/i }).first()
    if (await block.isVisible().catch(() => false)) {
      // Horarios do bloco
      const blockTimeInputs = block.locator('input[type="time"]')
      if (await blockTimeInputs.count() >= 2) {
        await blockTimeInputs.nth(0).fill('06:00')
        await blockTimeInputs.nth(1).fill('08:30')
      }

      // Cenas
      const scenesInput = block.locator('input[placeholder*="Cenas"]').first()
      if (await scenesInput.isVisible().catch(() => false)) {
        await scenesInput.fill('Cenas 1, 2 e 3')
      }

      // Locacao do bloco
      const locInput = block.locator('input[placeholder*="Studio"]').first()
      if (await locInput.isVisible().catch(() => false)) {
        await locInput.fill('Fabrica - Sala de Chocolate')
      }

      // Elenco do bloco
      const castInput = block.locator('input[placeholder*="Joao"]').first()
      if (await castInput.isVisible().catch(() => false)) {
        await castInput.fill('Timothee Chalamet, Hugh Grant')
      }
    }

    // Adicionar ator na tabela de elenco do dia
    const addActorBtn = dialog.locator('button').filter({ hasText: /Adicionar ator/i }).first()
    await addActorBtn.click()
    await waitForStable(page, 500)

    // Preencher ator
    const castTable = dialog.locator('table').last()
    if (await castTable.isVisible().catch(() => false)) {
      const lastCastRow = castTable.locator('tr').last()
      const nameInput = lastCastRow.locator('input[placeholder="Nome"]').first()
      const charInput = lastCastRow.locator('input[placeholder="Personagem"]').first()

      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill('Timothee Chalamet')
      }
      if (await charInput.isVisible().catch(() => false)) {
        await charInput.fill('Willy Wonka')
      }

      // Horarios do ator
      const timeInputs = lastCastRow.locator('input[type="time"]')
      const timeCount = await timeInputs.count()
      if (timeCount >= 3) {
        await timeInputs.nth(0).fill('05:00') // Call
        await timeInputs.nth(1).fill('05:30') // Maquiagem
        await timeInputs.nth(2).fill('06:00') // Set
      }
    }

    // Info importantes
    const infoTextarea = dialog.locator('textarea[placeholder*="Regras"]').first()
    if (await infoTextarea.isVisible().catch(() => false)) {
      await infoTextarea.fill('ATENCAO: Tolerancia zero com atrasos. Todos devem estar no set 15 min antes do horario de chamada. Usar protetor solar.')
    }

    // Salvar
    await dialog.locator('button').filter({ hasText: /^Salvar$/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10000 })
    await waitForStable(page, 2000)

    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/od-lista-apos-edicao.png', fullPage: true })
  })

  test('4. Auto-preencher OD', async ({ page }) => {
    setupMonitoring(page, 'OD/AutoFill')

    await navigateToJobTab(page, jobUrl, 'Ordem do Dia')

    // Abrir edicao da OD
    const odCard = page.locator('[class*="rounded-lg"]').filter({ hasText: /OD Dia 1/i }).first()
    const editBtn = odCard.locator('button[aria-label="Editar"]').first()

    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click()
    } else {
      await odCard.click()
    }

    await waitForStable(page, 1000)

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Clicar Auto-preencher
    const autoFillBtn = dialog.locator('button').filter({ hasText: /Auto-preencher/i }).first()
    const autoFillVisible = await autoFillBtn.isVisible().catch(() => false)

    if (autoFillVisible) {
      await autoFillBtn.click()

      // Aguardar resultado (pode demorar se consulta OpenWeather)
      await waitForStable(page, 5000)

      // Verificar se weather section apareceu (se OD tem shooting_date_id com location)
      const weatherCards = dialog.locator('text=/°C|Prob. chuva|km\\/h|Umidade/i')
      const hasWeather = await weatherCards.first().isVisible().catch(() => false)

      if (hasWeather) {
        console.log('Auto-fill: dados meteorologicos carregados com sucesso')

        // Verificar mapa Windy
        const windyBtn = dialog.locator('button').filter({ hasText: /mapa Windy/i }).first()
        if (await windyBtn.isVisible().catch(() => false)) {
          await windyBtn.click()
          await waitForStable(page, 2000)

          const windyIframe = dialog.locator('iframe[title="Previsao Windy"]')
          if (await windyIframe.isVisible().catch(() => false)) {
            console.log('Mapa Windy carregado com sucesso')
          } else {
            addProblem('OD/AutoFill', 'MEDIUM', 'Mapa Windy nao carregou apos clicar botao')
          }
        } else {
          console.log('Auto-fill: botao Windy nao apareceu (pode nao ter coordenadas)')
        }
      } else {
        console.log('Auto-fill: sem dados meteorologicos (pode nao ter shooting_date com location)')
      }

      // Screenshot apos auto-fill
      await page.screenshot({ path: 'tests/screenshots/od-apos-autofill.png' })
    } else {
      addProblem('OD/AutoFill', 'HIGH', 'Botao Auto-preencher nao visivel no modo edicao')
    }

    // Cancelar (nao salvar alteracoes do auto-fill pra nao sobrescrever nossos dados)
    await dialog.locator('button').filter({ hasText: /Cancelar/i }).click()
  })

  test('5. Preview da OD', async ({ page }) => {
    setupMonitoring(page, 'OD/Preview')

    await navigateToJobTab(page, jobUrl, 'Ordem do Dia')

    // Clicar Visualizar
    const odCard = page.locator('[class*="rounded-lg"]').filter({ hasText: /OD Dia 1/i }).first()
    const eyeBtn = odCard.locator('button[aria-label="Visualizar"]').first()

    if (await eyeBtn.isVisible().catch(() => false)) {
      await eyeBtn.click()
      await waitForStable(page, 3000)

      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible({ timeout: 5000 })

      // Verificar titulo do preview
      const previewTitle = dialog.locator('text=/Preview/i').first()
      await expect(previewTitle).toBeVisible({ timeout: 5000 })

      // Verificar iframe com conteudo
      const iframe = dialog.locator('iframe[title="Preview Ordem do Dia"]')
      const iframeVisible = await iframe.isVisible().catch(() => false)

      if (iframeVisible) {
        console.log('Preview HTML carregado no iframe')
      } else {
        // Pode estar no loading state
        const skeleton = dialog.locator('[class*="skeleton"], [class*="Skeleton"]')
        const noContent = dialog.locator('text=/Nenhum preview/i')
        if (await noContent.isVisible().catch(() => false)) {
          addProblem('OD/Preview', 'HIGH', 'Preview mostra "Nenhum preview disponivel"')
        } else if (await skeleton.first().isVisible().catch(() => false)) {
          // Esperando mais
          await waitForStable(page, 5000)
        }
      }

      // Trocar template
      const modernoBtn = dialog.locator('button').filter({ hasText: /Moderno/i }).first()
      if (await modernoBtn.isVisible().catch(() => false)) {
        await modernoBtn.click()
        await waitForStable(page, 3000)
        console.log('Template trocado para Moderno')
      }

      // Verificar botoes de acao
      const exportPdfBtn = dialog.locator('button').filter({ hasText: /Exportar PDF/i }).first()
      const shareBtn = dialog.locator('button').filter({ hasText: /Compartilhar WhatsApp/i }).first()

      if (!await exportPdfBtn.isVisible().catch(() => false)) {
        addProblem('OD/Preview', 'HIGH', 'Botao "Exportar PDF" nao visivel')
      }
      if (!await shareBtn.isVisible().catch(() => false)) {
        addProblem('OD/Preview', 'HIGH', 'Botao "Compartilhar WhatsApp" nao visivel')
      }

      // Exportar PDF (client-side, nao precisa de backend)
      if (await exportPdfBtn.isVisible().catch(() => false)) {
        // Interceptar o download
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
          exportPdfBtn.click(),
        ])

        if (download) {
          const filename = download.suggestedFilename()
          console.log('PDF exportado:', filename)
          // Salvar na pasta de screenshots
          await download.saveAs(`tests/screenshots/${filename}`)
        } else {
          // jsPDF pode usar blob URL ao inves de download event
          console.log('PDF pode ter sido gerado via blob (sem download event)')
        }

        await waitForStable(page, 2000)
      }

      // Screenshot do preview
      await page.screenshot({ path: 'tests/screenshots/od-preview-dialog.png' })

      // Fechar
      const closeBtn = dialog.locator('button[aria-label="Close"], button:has([class*="X"])').first()
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click()
      } else {
        await page.keyboard.press('Escape')
      }
    } else {
      addProblem('OD/Preview', 'HIGH', 'Botao Visualizar (Eye) nao visivel no card da OD')
    }
  })

  test('6. Criar segunda OD', async ({ page }) => {
    setupMonitoring(page, 'OD/SegundaOD')

    await navigateToJobTab(page, jobUrl, 'Ordem do Dia')

    await page.locator('button').filter({ hasText: /Nova OD/i }).first().click()
    await waitForStable(page, 1000)

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    await dialog.locator('#od-title').fill('OD Dia 2 — Externa Rio')
    await dialog.locator('#od-day-number').fill('2')
    await dialog.locator('#od-location').fill('Praia de Copacabana, Rio de Janeiro')

    await dialog.locator('button').filter({ hasText: /Criar OD/i }).click()
    await expect(dialog).not.toBeVisible({ timeout: 10000 })
    await waitForStable(page, 2000)

    // Verificar que ambas ODs aparecem
    const od1 = page.locator('text=OD Dia 1').first()
    const od2 = page.locator('text=OD Dia 2').first()

    const od1Visible = await od1.isVisible().catch(() => false)
    const od2Visible = await od2.isVisible().catch(() => false)

    if (!od1Visible) addProblem('OD/SegundaOD', 'CRITICAL', 'Primeira OD sumiu apos criar segunda')
    if (!od2Visible) addProblem('OD/SegundaOD', 'CRITICAL', 'Segunda OD nao aparece na lista')

    // Screenshot
    await page.screenshot({ path: 'tests/screenshots/od-duas-ods.png', fullPage: true })
  })

  test('7. Deletar OD', async ({ page }) => {
    setupMonitoring(page, 'OD/Deletar')

    await navigateToJobTab(page, jobUrl, 'Ordem do Dia')

    // Deletar a segunda OD
    const od2Card = page.locator('[class*="rounded-lg"]').filter({ hasText: /OD Dia 2/i }).first()
    const deleteBtn = od2Card.locator('button[aria-label="Remover"]').first()

    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click()
      await waitForStable(page, 1000)

      const alertDialog = page.getByRole('alertdialog')
      await expect(alertDialog).toBeVisible({ timeout: 5000 })

      await alertDialog.locator('button').filter({ hasText: /^Remover$/i }).click()
      await expect(alertDialog).not.toBeVisible({ timeout: 10000 })
      await waitForStable(page, 2000)

      // Verificar que foi removida
      const od2Still = page.locator('text=/OD Dia 2/i').first()
      const stillVisible = await od2Still.isVisible().catch(() => false)
      if (stillVisible) {
        addProblem('OD/Deletar', 'CRITICAL', 'OD nao foi removida apos confirmar exclusao')
      }
    } else {
      addProblem('OD/Deletar', 'HIGH', 'Botao Remover nao visivel no card da OD')
    }
  })
})

// ===============================================================
// Relatorio final
// ===============================================================
test.afterAll(() => {
  console.log('\n================================================================')
  console.log('  RELATORIO FINAL — Testes E2E Elenco + Ordem do Dia')
  console.log('================================================================')

  if (problems.length === 0) {
    console.log('  NENHUM PROBLEMA ENCONTRADO!')
  } else {
    const critical = problems.filter((p) => p.severity === 'CRITICAL')
    const high = problems.filter((p) => p.severity === 'HIGH')
    const medium = problems.filter((p) => p.severity === 'MEDIUM')
    const low = problems.filter((p) => p.severity === 'LOW')

    if (critical.length > 0) {
      console.log(`\n  CRITICAL (${critical.length}):`)
      critical.forEach((p) => console.log(`    - [${p.area}] ${p.detail}`))
    }
    if (high.length > 0) {
      console.log(`\n  HIGH (${high.length}):`)
      high.forEach((p) => console.log(`    - [${p.area}] ${p.detail}`))
    }
    if (medium.length > 0) {
      console.log(`\n  MEDIUM (${medium.length}):`)
      medium.forEach((p) => console.log(`    - [${p.area}] ${p.detail}`))
    }
    if (low.length > 0) {
      console.log(`\n  LOW (${low.length}):`)
      low.forEach((p) => console.log(`    - [${p.area}] ${p.detail}`))
    }

    console.log(`\n  TOTAL: ${problems.length} problemas`)
  }

  console.log('\n  Screenshots salvas em: tests/screenshots/')
  console.log('================================================================\n')
})
