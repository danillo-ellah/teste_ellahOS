# Portal do Cliente — Plano de Correcao de Bugs

**Data:** 2026-03-06
**Origem:** Chaos Test Report — docs/specs/portal-cliente/01-chaos-test-portal.md
**Escopo:** 8 bugs identificados por analise estatica de codigo

---

## 1. Resumo dos 8 Bugs

| ID | Severidade | Componente | Descricao Curta | Impacto |
|----|-----------|-----------|-----------------|---------|
| BUG-001 | CRITICO | `get_portal_timeline` (RPC) | Token UUID possivelmente ecoado na resposta publica | Vazamento do segredo de acesso |
| BUG-002 | ALTO | `create-session-dialog.tsx` | Double-click cria 2 sessoes identicas | Dados duplicados |
| BUG-003 | ALTO | `portal/page.tsx` | Pagina /portal sem atalho para criar links | UX blocker |
| BUG-004 | MEDIO | `portal-chat.tsx` | Erros do servidor exibidos como texto tecnico | Cliente confuso |
| BUG-005 | MEDIO | `portal-chat.tsx` | Nome do remetente sem sanitizacao | Dados sujos no banco |
| BUG-006 | MEDIO | `portal-approvals.tsx` | Aprovacao sem token lanca excecao | Cliente nao consegue aprovar |
| BUG-007 | MEDIO | `portal-sessions-manager.tsx` | Switch desativa sessao sem confirmacao | Desativacao acidental |
| BUG-008 | BAIXO | `portal-chat.tsx` | Indicador Online sempre verde | Expectativa falsa |

---

## 2. Priorizacao

1. **BUG-001** (CRITICO) — Auditoria RPC no banco. Se token exposto, corrigir imediatamente.
2. **BUG-003** (ALTO) — Fix de 2 linhas, maior impacto UX.
3. **BUG-002** (ALTO) — useRef debounce no submit.
4. **BUG-007** (MEDIO) — AlertDialog no toggle de desativacao.
5. **BUG-006** (MEDIO) — Mensagem inline no card de aprovacao.
6. **BUG-004** (MEDIO) — Mapa de mensagens de erro amigaveis.
7. **BUG-005** (MEDIO) — sanitizeName() em 2 pontos.
8. **BUG-008** (BAIXO) — Remover dot verde hardcoded.

---

## 3. Agrupamento por Arquivo

| Grupo | Arquivo | Bugs | Estimativa |
|-------|---------|------|-----------|
| A | portal-chat.tsx | BUG-004 + BUG-005 + BUG-008 | 30-45 min |
| B | portal-sessions-manager.tsx + portal-approvals.tsx | BUG-007 + BUG-006 | 30-40 min |
| C | create-session-dialog.tsx | BUG-002 | 20-30 min |
| D | portal/page.tsx | BUG-003 | 5-10 min |
| E | Banco (RPC) | BUG-001 | 30 min |

**Total estimado:** ~2.5h

---

## 4. Plano de Execucao

### Etapa 0 — Auditoria BUG-001 (ANTES DE TUDO)
1. Verificar RPC `get_portal_timeline` no banco
2. Se retorna token/dados sensiveis: corrigir via migration
3. Se nao retorna: falso positivo, fechar

### Etapa 1 — BUG-003 (5 min)
Adicionar link/botao para criar sessoes na pagina /portal

### Etapa 2 — Grupo A: BUG-005 + BUG-004 + BUG-008 (30-45 min)
1. sanitizeName() para strip de HTML tags
2. Mapa de mensagens de erro amigaveis
3. Remover indicador "Online" hardcoded

### Etapa 3 — BUG-002 (20-30 min)
useRef debounce no submit do dialog de criar sessao

### Etapa 4 — Grupo B: BUG-007 + BUG-006 (30-40 min)
1. AlertDialog ao desativar sessao
2. Mensagem inline quando token de aprovacao ausente

### Etapa 5 — Validacao
- Executar Playwright: `npx playwright test tests/portal-e2e.spec.ts`
- Testes manuais MT-01 a MT-06

---

## 5. Criterios de Done

- BUG-001: RPC auditada, token ausente da resposta publica
- BUG-002: Double-click cria apenas 1 sessao
- BUG-003: Pagina /portal tem atalho para criar links
- BUG-004: Erros exibidos em portugues amigavel
- BUG-005: HTML tags removidas antes de salvar
- BUG-006: Card mostra mensagem inline (sem throw)
- BUG-007: AlertDialog ao desativar sessao
- BUG-008: Sem indicador "Online" falso
