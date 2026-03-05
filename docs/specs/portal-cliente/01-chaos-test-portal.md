# Chaos Test Report — Portal do Cliente (ELLAHOS)

Data: 04/03/2026
Tester: Chaos Tester Agent (Personas: Telma, Junior, Hacker Acidental)
Arquivo de testes: `frontend/tests/portal-e2e.spec.ts`
Sistema: https://teste-ellah-os.vercel.app

---

## Sumario Executivo

O Portal do Cliente e uma funcionalidade critica do ELLAHOS que permite compartilhar status de jobs com clientes via link com token. Foram analisados 9 arquivos de codigo (backend + frontend) e criados 38 cenarios de teste E2E organizados em 6 suites.

A analise estatica do codigo revelou **8 bugs potenciais** antes mesmo de executar os testes, identificados pela leitura do codigo-fonte. Os testes automatizados cobrem os cenarios de usuario leigo, dados invalidos e seguranca.

---

## Arquivos Analisados

| Arquivo | Linhas | Funcao |
|---|---|---|
| `supabase/functions/client-portal/index.ts` | 89 | Router principal |
| `supabase/functions/client-portal/handlers/create-session.ts` | 131 | Criar sessao |
| `supabase/functions/client-portal/handlers/get-by-token.ts` | 48 | Acesso publico |
| `supabase/functions/client-portal/handlers/send-message.ts` | 156 | Enviar mensagem |
| `supabase/functions/client-portal/handlers/list-sessions.ts` | 68 | Listar sessoes |
| `supabase/functions/client-portal/handlers/update-session.ts` | 105 | Atualizar sessao |
| `supabase/functions/client-portal/handlers/delete-session.ts` | 50 | Deletar sessao |
| `frontend/src/app/(dashboard)/portal/page.tsx` | 271 | Admin: lista sessoes |
| `frontend/src/app/portal/[token]/page.tsx` | 201 | Pagina publica cliente |
| `frontend/src/components/portal/portal-chat.tsx` | 335 | Chat publico |
| `frontend/src/components/portal/create-session-dialog.tsx` | 250 | Dialog criar sessao |
| `frontend/src/components/portal/portal-sessions-manager.tsx` | 354 | Gerenciar sessoes |
| `frontend/src/components/portal/portal-approvals.tsx` | 409 | Aprovacoes publicas |
| `frontend/src/hooks/use-portal.ts` | 252 | Hooks React Query |
| `frontend/src/types/portal.ts` | 134 | Tipos TypeScript |

---

## Bugs Encontrados — Analise Estatica do Codigo

### BUG-001 — CRITICO: Token UUID exposto na resposta publica da API

**Persona:** Hacker Acidental
**Localizacao:** `handlers/create-session.ts` linha 90-103 + `handlers/list-sessions.ts` linha 41-44
**Descricao:** A resposta de `list-sessions` retorna o campo `token` completo da sessao via query `SELECT ... token ...`. O token e o segredo que autentica o acesso publico do cliente — expor ele em uma rota autenticada e aceitavel, mas a analise do payload publico (`get-by-token.ts`) precisaria garantir que o token nao seja ecoado de volta na resposta publica.

**Evidencia no codigo:**
```typescript
// list-sessions.ts linha 33 — retorna token na listagem admin (OK para admin)
.select(`
  ...
  token,   // <-- correto expor para admin copiar o link
  ...
`)

// types/portal.ts linha 96 — PROBLEMA: PortalPublicData.session nao tem campo token
// Mas a RPC get_portal_timeline precisa ser auditada para confirmar
```

**Acao requerida:** Auditar a RPC `get_portal_timeline` no banco para confirmar que o campo `token` da sessao NAO e retornado na resposta publica (endpoint `/public/:token`). O teste D08 cobre isso.

**Severidade:** CRITICO
**Status:** PENDENTE VERIFICACAO (requer acesso ao banco)

---

### BUG-002 — ALTO: Double-click no botao "Criar link" pode criar 2 sessoes

**Persona:** Telma (CEO, 55 anos — clica 2x em tudo)
**Localizacao:** `frontend/src/components/portal/create-session-dialog.tsx` linha 240
**Descricao:** O botao de submit nao tem protecao contra double-click. O backend tem constraint de unicidade por `job_id + contact_id` (23505), mas se `contact_id` for null (caso mais comum), nao ha constraint bloqueando — dois inserts consecutivos com label diferente ou mesmo label podem criar 2 sessoes. O loading state (`isPending`) desabilita o botao durante a primeira requisicao, mas se o usuario clicar muito rapido antes do estado ser atualizado, a segunda requisicao pode passar.

**Evidencia no codigo:**
```typescript
// create-session-dialog.tsx linha 240
<Button type="submit" disabled={isPending} className="gap-2">
  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
  Criar link
</Button>
// isPending so fica true APOS o primeiro click ser processado pelo React
// Se o usuario clicar 2x muito rapido (< 16ms), ambos disparos podem ocorrer
```

```typescript
// create-session.ts linha 108 — constraint so existe para job+contato com contato nao nulo
if (insertError.code === '23505') {
  throw new AppError('CONFLICT', 'Ja existe uma sessao ativa...');
}
// Se contact_id = null, a constraint UNIQUE pode nao cobrir todos os casos
```

**Impacto:** Cliente recebe 2 links identicos. Confusao, proliferacao de sessoes.
**Correcao sugerida:** Adicionar `useRef` para tracking de submit em andamento + `e.preventDefault()` no duplo submit antes do estado React atualizar.
**Severidade:** ALTO
**Status:** PENDENTE VERIFICACAO (o teste A06 cobre isso)

---

### BUG-003 — ALTO: Pagina /portal/page.tsx nao tem botao de criar sessao

**Persona:** Telma (CEO — vai direto em /portal esperando criar links la)
**Localizacao:** `frontend/src/app/(dashboard)/portal/page.tsx` linhas 130-134
**Descricao:** A pagina `/portal` (listagem global de sessoes) instrui o usuario a "acessar a aba Portal no detalhe do job" para criar links. Porem, nao ha nenhum botao de atalho, nenhum link direto para os jobs, e nenhuma instrucao de como chegar la. Um usuario que chegou direto em `/portal` fica sem saida clara — tem que saber que precisa ir em `/jobs`, abrir um job, achar a aba "Portal" dentro do job. Para a Telma isso e opaco.

**Evidencia no codigo:**
```tsx
// portal/page.tsx linha 130-134
<p className="text-xs text-muted-foreground">
  Para criar links, acesse a aba <strong>Portal</strong> no detalhe do job.
</p>
// Nenhum link para /jobs, nenhum botao de atalho
```

**Impacto:** Confusion UX. Usuario nao consegue criar links a partir da pagina principal de portais.
**Correcao sugerida:** Adicionar botao "Ver Jobs" ou link para `/jobs` ao lado da instrucao.
**Severidade:** ALTO (UX blocker para Telma)
**Status:** CONFIRMADO pela leitura do codigo

---

### BUG-004 — MEDIO: Mensagem otimista nao e removida se o servidor rejeitar por sessao inativa

**Persona:** Junior (abre 2 abas — admin desativa sessao na aba 1, cliente envia na aba 2)
**Localizacao:** `frontend/src/components/portal/portal-chat.tsx` linha 128-134
**Descricao:** Quando o cliente envia uma mensagem, o chat adiciona uma "mensagem otimista" imediatamente (antes da confirmacao do servidor). Se o servidor rejeitar por sessao expirada ou inativa (HTTP 403/410), o codigo remove a mensagem otimista E restaura o conteudo no textarea. Isso esta correto. POREM, o erro exibido via `toast.error(msg)` mostra a mensagem crua do backend em ingles ou portugues tecnico que o cliente nao entende.

**Evidencia no codigo:**
```typescript
// portal-chat.tsx linha 129-134
} catch (err) {
  setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
  const msg = err instanceof Error ? err.message : 'Erro ao enviar mensagem'
  toast.error(msg)  // msg pode ser: "Este link de acesso expirou. Entre em contato..."
  setContent(trimmedContent)
}
```

A mensagem do backend e em portugues (`"Este link de acesso esta desativado"`), entao esta parcialmente OK, mas o formato do toast pode nao ser claro para o cliente. Alem disso, se a rede cair, o erro sera generico.

**Impacto:** Confusao do cliente quando mensagem nao e enviada.
**Correcao sugerida:** Melhorar o mapeamento de erros no catch do chat publico com mensagens mais amigaveis por tipo de erro (expirado, sem permissao, rede, etc.).
**Severidade:** MEDIO
**Status:** CONFIRMADO pela leitura do codigo

---

### BUG-005 — MEDIO: Campo de nome do remetente salvo em localStorage sem sanitizacao

**Persona:** Hacker Acidental
**Localizacao:** `frontend/src/components/portal/portal-chat.tsx` linhas 66-69 e 98
**Descricao:** O nome do remetente e salvo no `localStorage` sem nenhuma sanitizacao e reutilizado automaticamente nas proximas visitas. Se um usuario mal-intencionado salvar `<script>alert(1)</script>` como nome, esse valor sera enviado para o servidor e eventualmente exibido para a equipe admin no painel de mensagens. O React renderiza texto como texto (nao HTML) por padrao via `{msg.sender_name}`, entao o XSS nao executa no frontend — mas o valor chega "sujo" ao banco.

**Evidencia no codigo:**
```typescript
// portal-chat.tsx linha 66-69
const [senderName, setSenderName] = useState(() => {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(SENDER_NAME_KEY) ?? ''  // lido sem sanitizacao
})

// portal-chat.tsx linha 98
localStorage.setItem(SENDER_NAME_KEY, trimmedName)  // salvo sem sanitizacao
```

**Impacto:** Baixo risco de XSS (React escapa automaticamente), mas o banco fica com dados sujos.
**Correcao sugerida:** Sanitizar o nome ao ler/salvar (remover tags HTML). O backend ja valida max 200 chars.
**Severidade:** MEDIO
**Status:** CONFIRMADO pela leitura do codigo

---

### BUG-006 — MEDIO: Aprovacao sem token nao exibe erro claro para o cliente

**Persona:** Telma
**Localizacao:** `frontend/src/components/portal/portal-approvals.tsx` linha 109-111
**Descricao:** Se uma aprovacao nao tem `token` (campo opcional no tipo `PortalApproval`), o componente lanca `Error('Token de aprovacao nao disponivel')` que e capturado pelo catch e exibido como `toast.error`. O cliente ve um erro tecnico sem saber o que fazer.

**Evidencia no codigo:**
```typescript
// portal-approvals.tsx linha 109-111
const approvalToken = approval.token
if (!approvalToken) throw new Error('Token de aprovacao nao disponivel')
```

**Impacto:** Cliente nao consegue aprovar ou rejeitar um item. Sem saida clara.
**Correcao sugerida:** Ao inves de lancar erro, mostrar mensagem inline no card da aprovacao: "Esta aprovacao nao pode ser respondida por este portal. Entre em contato com a producao."
**Severidade:** MEDIO
**Status:** CONFIRMADO pela leitura do codigo

---

### BUG-007 — MEDIO: Switch de ativar/desativar sessao sem confirmacao

**Persona:** Telma (clica em tudo sem ler)
**Localizacao:** `frontend/src/components/portal/portal-sessions-manager.tsx` linhas 71-81
**Descricao:** O toggle Switch que ativa/desativa uma sessao executa a acao imediatamente sem confirmacao. Se a Telma clicar no toggle por acidente, o link do cliente para de funcionar instantaneamente. Nao ha "undo" (desfazer). Diferente do botao Deletar (que tem AlertDialog de confirmacao), o Switch e silencioso.

**Evidencia no codigo:**
```typescript
// portal-sessions-manager.tsx linha 71-81
async function handleToggleActive() {
  try {
    await updateSession({
      id: session.id,
      payload: { is_active: !session.is_active },  // executa imediatamente, sem confirmacao
    })
    toast.success(session.is_active ? 'Link desativado' : 'Link ativado')
  } catch {
    toast.error('Erro ao atualizar o status do link')
  }
}
```

**Impacto:** Desativacao acidental corta acesso do cliente. Pode passar despercebida.
**Correcao sugerida:** Ao desativar (nao ao ativar), mostrar confirmacao: "Desativar este link ira bloquear o acesso do cliente. Confirmar?"
**Severidade:** MEDIO
**Status:** CONFIRMADO pela leitura do codigo

---

### BUG-008 — BAIXO: Indicador "Online" no chat e sempre verde (sem verificacao real)

**Persona:** Telma (acredita que alguem esta online disponivel para responder)
**Localizacao:** `frontend/src/components/portal/portal-chat.tsx` linhas 171-179
**Descricao:** O chat exibe um dot verde pulsante com o texto "Online" independente de qualquer estado real. A equipe de producao pode nao estar disponivel, o sistema pode estar offline, mas o indicador sempre mostra "Online". Isso cria expectativa falsa no cliente.

**Evidencia no codigo:**
```tsx
// portal-chat.tsx linhas 171-179
<span className="h-2 w-2 rounded-full bg-green-500" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
<span className="text-xs text-green-500">Online</span>
// Sem verificacao de presenca real
```

**Impacto:** Expectativa falsa. Cliente espera resposta imediata.
**Correcao sugerida:** Remover o indicador "Online" ou trocar por "Deixe sua mensagem" sem dot colorido.
**Severidade:** BAIXO
**Status:** CONFIRMADO pela leitura do codigo

---

## Mapa de Testes (38 cenarios)

### Suite A — Admin: gerenciamento de sessoes (15 testes)

| ID | Descricao | Persona | Status Esperado |
|---|---|---|---|
| A01 | /portal carrega sem erros de console | Geral | PASS |
| A02 | Filtro de status funcional | Telma | PASS |
| A03 | Acesso via URL direta sem sidebar | Junior | PASS |
| A04 | Encontrar aba Portal no job detail | Junior | PASS (se job existir) |
| A05 | Criar nova sessao de portal | Telma | PASS (captura token) |
| A06 | Double-click no Criar nao gera 2 sessoes | Telma | FALHA POTENCIAL (BUG-002) |
| A07 | Form vazio mostra erro de validacao | Junior | PASS |
| A08 | Label de 500 chars rejeitada ou truncada | Junior | PASS (backend valida max 500) |
| A09 | Copiar link funciona | Telma | PASS |
| A10 | /portal sem login redireciona | Hacker | PASS |
| A11 | Delete exige confirmacao | Hacker | PASS |
| A12 | 10x clicks Remover nao causa multiplas delecoes | Hacker | PASS (AlertDialog bloqueia) |
| A13 | ESC fecha dialog sem estado corrompido | Telma | PASS |
| A14 | Back do browser nao duplica | Junior | PASS |
| A15 | Sem overflow horizontal | Geral | PASS |

### Suite B — Portal publico (15 testes)

| ID | Descricao | Persona | Status Esperado |
|---|---|---|---|
| B01 | Portal publico sem erros de console | Geral | PASS |
| B02 | Exibe nome e status do job | Geral | PASS |
| B03 | Pagina publica nao exige login | Telma | PASS |
| B04 | Skeleton durante loading | Geral | PASS |
| B05 | Chat habilitado mostra textarea | Telma | PASS |
| B06 | Mensagem vazia nao submete | Junior | PASS (botao desabilitado) |
| B07 | Mensagem so espacos nao submete | Junior | PASS (trim detecta) |
| B08 | Chat pede nome antes de enviar | Telma | PASS |
| B09 | Enviar mensagem completa | Junior | PASS (depende de sessao ativa) |
| B10 | 5 mensagens rapidas nao trava | Hacker | PASS (rate limit gracioso) |
| B11 | Enter envia mensagem | Junior | PASS |
| B12 | Shift+Enter cria nova linha | Junior | PASS |
| B13 | WhatsApp com emojis nao quebra | Junior | PASS |
| B14 | Timeline aparece se habilitada | Geral | PASS |
| B15 | Clicar em tudo nao causa crash | Telma | PASS |

### Suite C — Cenarios de erro (8 testes)

| ID | Descricao | Persona | Status Esperado |
|---|---|---|---|
| C01 | Token nao-UUID mostra erro amigavel | Hacker | PASS |
| C02 | Token UUID invalido (inexistente) mostra 404 | Hacker | PASS |
| C03 | Pagina de erro tem botao de contato | Telma | PASS |
| C04 | URL com XSS nao executa script | Hacker | PASS |
| C05 | /portal/banana mostra erro | Hacker | PASS |
| C06 | UUID de outro tenant retorna 404 | Hacker | PASS (RLS isola) |
| C07 | Sub-rota inexistente nao retorna 500 | Hacker | PASS |
| C08 | Mobile 375px sem overflow | Telma iPhone | PASS |

### Suite D — Seguranca (8 testes)

| ID | Descricao | Persona | Status Esperado |
|---|---|---|---|
| D01 | Endpoint publico nao retorna campos financeiros | Hacker | PASS (RPC filtra) |
| D02 | Endpoint rejeita token sem formato UUID | Hacker | PASS (UUID_REGEX valida) |
| D03 | SQL injection no content e rejeitado | Hacker | PASS (sessao invalida = 404) |
| D04 | XSS no content nao executa no portal | Hacker | PASS (React escapa) |
| D05 | Rotas autenticadas sem token retornam 401 | Hacker | PASS |
| D06 | Criar sessao sem auth retorna 401 | Hacker | PASS |
| D07 | Rate limit retorna 429 apos limite | Hacker | PASS (20 msgs/hora) |
| D08 | Token UUID nao exposto na resposta publica | Hacker | PENDENTE VERIFICACAO (BUG-001) |

### Suite E — Mobile (5 testes)

| ID | Descricao | Viewport | Status Esperado |
|---|---|---|---|
| E01 | Pagina de erro responsiva em 375px | iPhone 13 | PASS |
| E02 | Portal publico sem overflow em 375px | iPhone 13 | PASS |
| E03 | Chat visivel e clicavel em mobile | iPhone 13 | PASS |
| E04 | Header fixo nao cobre conteudo | iPhone 13 | PASS (pt-24 = 96px) |
| E05 | Admin /portal em mobile sem overflow | iPhone 13 | FALHA POTENCIAL (tabela pode overflow) |

### Suite F — Smoke completo (2 testes)

| ID | Descricao | Tipo | Status Esperado |
|---|---|---|---|
| F01 | Admin cria sessao > cliente acessa > envia mensagem | Smoke | PASS (depende de job existente) |
| F02 | Desativar sessao bloqueia acesso | Smoke | MANUAL (ver abaixo) |

---

## Bugs Catalogados por Severidade

### CRITICO (1)

| ID | Titulo | Localizacao |
|---|---|---|
| BUG-001 | Token UUID possivelmente exposto na resposta da RPC publica | `get_portal_timeline` RPC (banco) |

### ALTO (2)

| ID | Titulo | Localizacao |
|---|---|---|
| BUG-002 | Double-click cria 2 sessoes (sem debounce no submit) | `create-session-dialog.tsx:240` |
| BUG-003 | Pagina /portal sem atalho para criar links (UX blocker) | `portal/page.tsx:130` |

### MEDIO (4)

| ID | Titulo | Localizacao |
|---|---|---|
| BUG-004 | Erros do servidor no chat exibem mensagens tecnicas | `portal-chat.tsx:132` |
| BUG-005 | Nome do remetente em localStorage sem sanitizacao | `portal-chat.tsx:66,98` |
| BUG-006 | Aprovacao sem token nao exibe erro amigavel | `portal-approvals.tsx:109` |
| BUG-007 | Switch de ativar/desativar sem confirmacao de desativacao | `portal-sessions-manager.tsx:71` |

### BAIXO (1)

| ID | Titulo | Localizacao |
|---|---|---|
| BUG-008 | Indicador "Online" falso no chat | `portal-chat.tsx:171` |

---

## Testes Manuais Recomendados

Os cenarios abaixo sao dificeis de automatizar mas sao criticos para validar:

### MT-01 — Sessao expirada bloqueia acesso imediatamente
**Como testar:**
1. Admin cria sessao com expiracao de hoje (data atual)
2. Aguardar ou manipular `expires_at` no banco para timestamp passado
3. Acessar o portal publico com o token
4. Verificar que aparece a pagina "Link Expirado" e nao o conteudo

**Esperado:** Pagina PortalExpired com botao de contato
**Risco:** Expiracao verificada no servidor (get-by-token.ts linha 41) e no send-message, mas o frontend pode ter cache de ate 30s

### MT-02 — Sessao desativada via Switch bloqueia cliente imediatamente
**Como testar:**
1. Admin e cliente tem o portal aberto em paralelo
2. Admin clica no Switch para desativar a sessao
3. Cliente tenta enviar uma mensagem
4. Verificar que recebe erro de "link desativado"

**Esperado:** Erro 403 + toast de erro amigavel no chat do cliente
**Risco:** O cliente pode ter a pagina carregada em cache e precisar recarregar para ver o bloqueio

### MT-03 — Sessao com TODAS as permissoes desabilitadas
**Como testar:**
1. Criar sessao com timeline=false, documents=false, approvals=false, messages=false
2. Acessar o portal publico com esse token
3. Verificar que a pagina nao mostra nenhuma secao, apenas o hero de status

**Esperado:** Portal minimal — so o header e o status hero. Nao deve quebrar.

### MT-04 — Acessar portal com sessao de outro tenant (mudando UUID na URL)
**Como testar:**
1. Pegar UUID de uma sessao do tenant A
2. Logar como usuario do tenant B
3. Tentar acessar `/portal/uuid-da-sessao-do-tenant-A` no frontend admin

**Esperado:** Redirecionar ou mostrar 404 (RLS deve bloquear)

### MT-05 — Copiar link e compartilhar via WhatsApp
**Como testar:**
1. Clicar no botao de copiar link (Suite A teste A09)
2. Colar o link em um chat de WhatsApp
3. Verificar se o link e curto o suficiente, se tem preview e se funciona em navegador mobile

**Esperado:** Link funciona em qualquer navegador mobile sem login

### MT-06 — Verificar que campos financeiros nao aparecem no portal
**Como testar:**
1. Criar um job com `closed_value = R$ 50.000`
2. Criar sessao de portal para esse job
3. Acessar o portal publico
4. Inspecionar a resposta JSON da API no DevTools (Network tab)
5. Verificar que `closed_value`, `gross_profit`, `margin_percentage` NAO aparecem

**Esperado:** Resposta publica tem apenas: code, title, status, project_type, client_name, agency_name, updated_at, delivery_date

---

## Como Executar os Testes

### Pre-requisitos

```bash
cd /c/Users/danil/ellahos/frontend
export PATH="/c/Program Files/nodejs:$PATH"
npx playwright install chromium
```

### Executar Suite completa de Portal

```bash
# Todas as suites de portal (admin + publico + mobile)
npx playwright test tests/portal-e2e.spec.ts

# So a suite de admin (requer auth — rodar setup primeiro)
npx playwright test tests/portal-e2e.spec.ts --project=portal-admin

# So testes publicos (sem auth)
npx playwright test tests/portal-e2e.spec.ts --project=portal-public

# Modo visual (ver o browser executando)
npx playwright test tests/portal-e2e.spec.ts --headed --project=portal-admin

# Com variavel de ambiente para token fixo (pular criacao de sessao)
PORTAL_TOKEN="uuid-de-sessao-ativa" npx playwright test tests/portal-e2e.spec.ts

# Ver report HTML com screenshots das falhas
npx playwright show-report
```

### Nota sobre dependencias entre suites

A Suite A tenta criar uma sessao e capturar o token para uso na Suite B. Se a Suite A falhar ou nao existir nenhum job, as Suites B e E sao automaticamente puladas com `test.skip`. Para rodar as Suites B, C, D, E isoladamente, defina `PORTAL_TOKEN=<uuid>` no ambiente.

---

## Analise de Seguranca

### O que esta BEM implementado

1. **UUID_REGEX em todos os endpoints publicos** — `get-by-token.ts` e `send-message.ts` validam o formato do token antes de qualquer query, prevenindo SQL injection por injecao na clausula WHERE.

2. **Rate limiting no chat** — 20 mensagens/hora por sessao (em `send-message.ts`). Implementado via contagem no banco, nao em memoria (funciona mesmo com multiplas instancias Deno).

3. **Idempotency key** — Previne duplicatas de mensagens em double-submit. Gerada automaticamente se nao fornecida pelo cliente.

4. **RLS no Supabase** — A query de list-sessions usa o token do usuario autenticado, garantindo isolamento por tenant.

5. **Soft delete** — Deletar sessao define `deleted_at`, invalidando o token imediatamente sem apagar historico de mensagens.

6. **Impersonation prevention** — Se a sessao tem um contato vinculado (`contact_id`), o nome do contato e usado no lugar do `sender_name` enviado pelo cliente (linha 106-107 em `send-message.ts`).

7. **Dados sensiveis filtrados na RPC** — O endpoint publico usa uma RPC `get_portal_timeline` que e responsavel por filtrar dados sensiveis. Os tipos TypeScript em `PortalJob` nao incluem campos financeiros.

### O que PRECISA ser verificado

1. **RPC `get_portal_timeline`** — Precisa ser auditada no banco para confirmar que nao retorna `closed_value`, `gross_profit`, `margin_percentage`, `cpf`, `cnpj`, ou o campo `token` da propria sessao.

2. **Content-Security-Policy** — O portal publico (`/portal/[token]`) e uma pagina Next.js normal. Verificar se o `next.config.ts` tem headers CSP configurados para prevenir XSS por injecao de conteudo.

---

## Resumo Final

| Categoria | Total |
|---|---|
| Testes criados | 38 |
| Bugs CRITICO | 1 |
| Bugs ALTO | 2 |
| Bugs MEDIO | 4 |
| Bugs BAIXO | 1 |
| Testes Manuais recomendados | 6 |

**Recomendacao principal:** Antes de disponibilizar o portal para clientes reais, executar o teste MT-06 (campos financeiros) e o teste D08 (token na resposta publica) para garantir que dados sensiveis nao vazam. O BUG-003 (UX da pagina /portal sem atalho) deve ser corrigido pois a Telma vai reclamar na primeira reuniao.
