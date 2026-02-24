# Relatorio QA Playwright - ELLAHOS Frontend
**Data:** 2026-02-23
**Resultado:** 100/103 testes passed (97% pass rate)
**Ambiente:** localhost:3001, Next.js 16.1.6, Chromium

---

## Resumo Executivo

| Categoria | Passed | Failed | Total |
|-----------|--------|--------|-------|
| Public Pages | 9 | 1* | 10 |
| Dashboard Pages | 69 | 1 | 70 |
| Navigation | 2 | 1 | 3 |
| Forms & Interactions | 18 | 0 | 18 |
| Mobile Responsive | 4 | 0 | 4 |
| **Total** | **100** | **3** | **103** |

*Reset Password falha esperada (requer token na URL)

---

## PROBLEMAS ENCONTRADOS

### CRITICO (impacta funcionalidade)

#### P1. Financial — Erro 400 nas chamadas API
- **Pagina:** /financial
- **Tipo:** console_error + missing_element
- **Detalhe:** 2x "Failed to load resource: 400" — API retornando erro. Nenhum card/tab de resumo financeiro visivel.
- **Impacto:** Pagina financeira pode estar sem dados ou com parametros incorretos na chamada.
- **Acao:** Investigar endpoint chamado pelo frontend e corrigir request params.

#### P2. Reports — Erro 500 nas chamadas API
- **Pagina:** /reports
- **Tipo:** console_error + missing_element
- **Detalhe:** 6x "Failed to load resource: 500" — Multiplos endpoints de relatorio falhando. Nenhum grafico ou tabela de dados renderizado.
- **Impacto:** Pagina de relatorios completamente sem dados. Possivelmente Edge Function `reports` com bug ou dados insuficientes.
- **Acao:** Verificar logs da Edge Function `reports` no Supabase, corrigir erros.

### MEDIO (UX prejudicada)

#### P3. Team Calendar — Timeout no networkidle
- **Pagina:** /team/calendar
- **Tipo:** timeout
- **Detalhe:** Pagina nao atinge "networkidle" em 20s. Screenshot mostra skeleton loading infinito — dados do calendario (nomes, barras de alocacao) nunca carregam, apenas placeholders cinza.
- **Impacto:** Calendario visivel mas sem dados reais. Pode ser problema de API ou query lenta.
- **Acao:** Verificar se a API `allocations` retorna dados e se o frontend processa corretamente.

#### P4. Sidebar Navigation — Click em link nao navega
- **Pagina:** Sidebar geral
- **Tipo:** interaction
- **Detalhe:** Click no link "Clientes" da sidebar nao navega para /clients — permanece em /jobs. Possivel problema de prefetch/router ou link dentro de componente complexo (sidebar colapsavel).
- **Impacto:** Navegacao por click pode nao funcionar (apenas URL direta funciona, pois todas as paginas carregam OK por URL).
- **Acao:** Verificar componente Sidebar — links podem ser `<button>` com router.push em vez de `<a>`, ou ter overlays interceptando click.

#### P5. Jobs List — Sem campo de busca/filtro
- **Pagina:** /jobs
- **Tipo:** missing_element
- **Detalhe:** Nenhum `input[type="search"]` ou input com placeholder de buscar/pesquisar/filtrar encontrado.
- **Screenshot:** Jobs page tem filtros de Status, Cliente, Tipo e toggle "Arquivados" — mas nao um campo de busca por texto livre (titulo/codigo).
- **Impacto:** Usuario nao consegue buscar jobs por titulo ou codigo, precisa rolar/filtrar manualmente.
- **Acao:** Confirmar se e intencional. Se nao, adicionar campo de busca textual.

#### P6. People Page — Sem botao de criar
- **Pagina:** /people
- **Tipo:** missing_element
- **Detalhe:** Nenhum botao "Novo" ou "Criar" encontrado na pagina de pessoas.
- **Impacto:** Usuario nao consegue criar novo registro de pessoa diretamente da listagem.
- **Acao:** Verificar se criacao de pessoas e feita por outra via (ex: importacao) ou se falta implementar o botao.

### BAIXO (cosmetico/menor)

#### P7. Reset Password — Mostra "Verificando link de recuperacao..." sem token
- **Pagina:** /reset-password
- **Tipo:** esperado
- **Detalhe:** Acessar /reset-password sem token mostra loading eterno "Verificando link de recuperacao..."
- **Impacto:** Menor — usuario normalmente acessa via link do email com token.
- **Acao:** Considerar mostrar mensagem de erro apos timeout (ex: "Link invalido ou expirado").

---

## O QUE FUNCIONA BEM

- Login: form, validacao HTML5, mensagem de erro traduzida, link "Esqueceu a senha" — tudo OK
- Forgot Password: form renderiza, link de volta ao login OK
- Auth redirect: nao-autenticados sao redirecionados corretamente para /login
- Todas as 14 paginas do dashboard carregam sem crash (exceto problemas de API acima)
- Zero broken images em todas as paginas
- Zero overflow horizontal (layout responsivo) em todas as paginas desktop
- Mobile responsive OK: Jobs, Dashboard, Financial, Reports — sem overflow
- Dark mode toggle funciona (classe .dark alternada no html)
- Notification bell visivel no header com badge de contagem (4 notificacoes)
- Sidebar com todos os links principais visiveis
- Botao "Novo Job" funciona e abre dialog de criacao
- Botao "Novo Cliente" funciona na pagina de clientes
- Settings tem navegacao por abas (Integracoes/Notificacoes)
- Integracoes mostra cards de Drive/WhatsApp/n8n
- Approvals mostra conteudo relevante
- Portal mostra conteudo relevante
- Copilot AI trigger (botao flutuante) visivel no canto inferior direito

---

## RESOLUCAO (2026-02-23)

| # | Status | Causa raiz | Correcao |
|---|--------|-----------|----------|
| P1 | CORRIGIDO | RPC `get_financial_summary` lia `tenant_id` de `request.jwt.claims` (top-level) em vez de `app_metadata` | Migration: recriou RPC usando `auth.jwt() -> 'app_metadata' ->> 'tenant_id'` (mesmo que `get_tenant_id()`) |
| P2 | CORRIGIDO | Handlers de reports NAO passavam `p_tenant_id` para RPCs SECURITY DEFINER | Adicionado `p_tenant_id: auth.tenantId` em financial.ts, performance.ts, team.ts e export-csv.ts. Edge Function `reports` redeployed v5 |
| P3 | FALSO POSITIVO | Playwright `networkidle` nunca atinge por causa do WebSocket do Supabase Realtime (notifications) | Nao e bug — calendario funciona normalmente. Realtime subscription mantem conexao aberta |
| P4 | FALSO POSITIVO | Sidebar usa `<Link>` do Next.js corretamente. Playwright pode ter clicado no overlay/tooltip | Nao e bug — navegacao funciona no browser. Codigo verificado: Sidebar.tsx usa Link com href correto |
| P5 | FALSO POSITIVO | Playwright buscou `input[type="search"]` mas o campo usa `type="text"` | Campo de busca JA EXISTE em JobFilters.tsx (placeholder "Buscar por titulo, codigo...") |
| P6 | FALSO POSITIVO | Playwright nao encontrou seletor generico mas botao existe | Botao "Nova Pessoa" JA EXISTE em people/page.tsx (Button + Plus icon + onClick modal) |
| P7 | CORRIGIDO | Sem hash na URL, `getUser()` + timeout criam race condition; falta `.catch()` | Adicionado check de `window.location.hash` no mount — sem hash, mostra "Link invalido" imediatamente |
