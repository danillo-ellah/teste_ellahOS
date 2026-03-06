# Onda 1.1 -- Gestao de Recebiveis: CRUD + Frontend

**Data:** 2026-03-06
**Status:** IMPLEMENTADO
**Autor:** PM (Claude)

---

## 1. Objetivo

Permitir que financeiro e produtor executivo criem, editem e acompanhem as parcelas de recebimento de cada job diretamente no EllaOS, substituindo o controle manual em planilha.

---

## 2. O Que Foi Entregue

### Backend (Edge Function `receivables`)
- **LIST** `GET /receivables?job_id=X` -- listagem paginada com filtros (status, busca, data)
- **CREATE** `POST /receivables` -- criar parcela com validacao Zod
- **UPDATE** `PATCH /receivables/:id` -- editar com transicoes de status, auto-set `received_date`
- **DELETE** `DELETE /receivables/:id` -- soft delete (apenas admin/ceo, bloqueia recebidos)
- **SUMMARY** `GET /receivables/summary/:jobId` -- resumo via RPC get_receivables_summary

### Frontend
- Types: `frontend/src/types/receivables.ts`
- Hooks: `frontend/src/hooks/useReceivables.ts` (list, summary, create, update, delete)
- Query keys: `receivableKeys` em `frontend/src/lib/query-keys.ts`
- `ReceivablesList` -- tabela com summary strip (previsto/recebido/pendente/atrasado)
- `ReceivableDialog` -- dialog para criar/editar parcelas
- Integrado na `TabFinanceiro` do job detail

---

## 3. Schema (ja existente)

Tabela `job_receivables` (migration 20260307200000):
- id, tenant_id, job_id, description, installment_number, amount
- due_date, received_date, status, invoice_number, invoice_url
- payment_proof_url, notes, created_by, created_at, updated_at, deleted_at
- Status: pendente | faturado | recebido | atrasado | cancelado
- UNIQUE(tenant_id, job_id, installment_number)
- RPC: get_receivables_summary(p_tenant_id, p_job_id)
- View: vw_calendario_recebiveis

---

## 4. Transicoes de Status

| De | Para |
|----|------|
| pendente | faturado, recebido, atrasado, cancelado |
| faturado | pendente, recebido, atrasado, cancelado |
| atrasado | pendente, faturado, recebido, cancelado |
| recebido | cancelado (apenas) |
| cancelado | pendente (reativacao) |

Regras automaticas:
- Ao entrar em `recebido`: auto-set `received_date` = hoje (se nao fornecido)
- Ao sair de `recebido`: auto-clear `received_date`

---

## 5. Roles

| Acao | Roles permitidos |
|------|-----------------|
| Listar | Qualquer role com acesso financeiro (canViewFinancials) |
| Criar | admin, ceo, produtor_executivo, financeiro |
| Editar | admin, ceo, produtor_executivo, financeiro |
| Deletar | admin, ceo (mais restrito) |
| Summary | Qualquer role com acesso financeiro |

---

## 6. Fora de Escopo (Backlog)

- Upload automatico de NF com OCR
- Geracao automatica de NF vinculada a parcela
- Envio de boleto ou link de pagamento ao cliente
- Exibicao das parcelas no portal do cliente
- Geracao automatica de parcelas (dividir closed_value em N)
- Notificacoes de parcela vencida
- Filtros avancados na tabela (por periodo)

---

## 7. Dependencias

Todas ja concluidas:
- Tabela, RLS, indices, trigger updated_at (migration 20260307200000)
- RPC get_receivables_summary
- View vw_calendario_recebiveis
- EF shared modules (_shared/auth, errors, response, pagination, cors, history, financial-mask)
