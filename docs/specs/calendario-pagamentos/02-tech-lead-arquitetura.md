# G-03: Calendario de Pagamentos — Arquitetura Tecnica

**Autor:** Tech Lead / Arquiteto | **Data:** 2026-03-05 | **Status:** APROVADO PARA IMPLEMENTACAO

---

## 1. O Que Ja Existe

| Componente | Status |
|---|---|
| `vw_calendario_pagamentos` (view SQL) | Ativa — agrupa cost_items por data+job, retorna totais/pendentes/vencidos |
| `financial-dashboard/job-dashboard.ts` | Usa a view para "proximos pagamentos" do job (janela 30d) |
| `financial-dashboard/tenant-dashboard.ts` | Retorna totais agregados cross-job (total_overdue, upcoming_payments_30d) |
| `/financeiro/calendario/page.tsx` | Lista cronologica de cost_items pendentes agrupados por data, com batch-pay |
| `payment-manager/pay` (EF) | Registra pagamento batch (ids + date + method), ja funcional |
| `cost-items/update` (EF) | PATCH individual — suporta `payment_due_date` |
| `invoices` (tabela) | Tem due_date, amount, status — mas sem UI de calendario ainda |
| `jobs.payment_date` | Data de recebimento do cliente |

**Gap real:** A pagina existente (`/financeiro/calendario`) e uma lista flat sem visao de calendario mensal, sem receitas (invoices/jobs), sem KPIs de saldo, e sem acao de prorrogar vencimento. Falta tambem a visao per-job.

---

## 2. Decisoes Arquiteturais

### D1: Novo EF `payment-calendar` (NAO estender financial-dashboard)

**Motivo:** O financial-dashboard retorna dados de dashboard (KPIs + charts). O calendario precisa de dados tabulares com filtros de range, paginacao por mes, e acoes de escrita (prorrogar). Escopo diferente = EF separada. Isso tambem evita que a EF financial-dashboard (ja com 3 handlers) fique sobrecarregada.

### D2: 3 endpoints (events + kpis + postpone)

- `GET /payment-calendar/events` — eventos do calendario (cost_items + invoices + receitas)
- `GET /payment-calendar/kpis` — KPIs do periodo (a pagar, a receber, saldo, atrasados)
- `PATCH /payment-calendar/postpone` — prorrogar vencimento de cost_items

**Mark-paid** NAO precisa de endpoint novo — ja existe `payment-manager/pay`. O frontend invoca esse endpoint existente.

### D3: Nao criar componente de calendario novo — reusar CalendarMonthGrid do cronograma

O modulo cronograma ja tem `CalendarMonthGrid`, `CalendarCell`, `CalendarDayPopover` com navegacao mes a mes, skeleton, empty state. Criaremos um wrapper `PaymentCalendarView` que passa `renderDay` customizado ao grid existente, renderizando pills de pagamento em vez de fases.

### D4: Zero migrations

A view `vw_calendario_pagamentos` ja existe. Para receitas (invoices), faremos query direta. Indices existentes cobrem os filtros.

---

## 3. Endpoints

### 3.1 GET /payment-calendar/events

Retorna todos os eventos de pagamento num range de datas. Usado tanto no calendario mensal quanto na lista.

**Query params:**
| Param | Tipo | Obrigatorio | Default |
|---|---|---|---|
| `start_date` | `YYYY-MM-DD` | sim | - |
| `end_date` | `YYYY-MM-DD` | sim | - |
| `job_id` | uuid | nao | null (cross-job) |
| `type` | `payable\|receivable\|all` | nao | `all` |

**Response (200):**
```jsonc
{
  "data": {
    "payables": [
      {
        "id": "uuid",
        "date": "2026-03-15",
        "type": "cost_item",
        "amount": 5000.00,
        "status": "pendente",        // pendente | pago | cancelado
        "is_overdue": true,
        "description": "Aluguel de estudio",
        "vendor_name": "Studio X",
        "job_id": "uuid",
        "job_code": "ELH-2026-042",
        "job_title": "Campanha Verao",
        "payment_method": "pix",
        "nf_status": "aprovado"
      }
    ],
    "receivables": [
      {
        "id": "uuid",
        "date": "2026-03-20",
        "type": "job_payment",       // job_payment | invoice
        "amount": 150000.00,
        "status": "pendente",
        "description": "1a parcela - Campanha Verao",
        "client_name": "Marca X",
        "job_id": "uuid",
        "job_code": "ELH-2026-042",
        "job_title": "Campanha Verao"
      }
    ]
  }
}
```

**Queries do handler:**
```typescript
// Paralelo: cost_items (payables) + jobs (receivables) + invoices (receivables)
const [costItemsResult, jobsResult, invoicesResult] = await Promise.all([
  // 1. Cost items com vencimento no range
  client.from('cost_items').select(
    'id, payment_due_date, total_with_overtime, payment_status, service_description, ' +
    'vendor_name_snapshot, job_id, payment_method, nf_request_status'
  )
  .eq('tenant_id', auth.tenantId)
  .is('deleted_at', null)
  .eq('is_category_header', false)
  .gte('payment_due_date', startDate)
  .lte('payment_due_date', endDate)
  .neq('payment_status', 'cancelado')
  // Se job_id passado, filtra
  ...(jobId ? ['.eq("job_id", jobId)'] : []),

  // 2. Jobs com payment_date no range (receita do cliente)
  client.from('jobs').select(
    'id, code, title, payment_date, closed_value, client_id, clients(company_name)'
  )
  .eq('tenant_id', auth.tenantId)
  .is('deleted_at', null)
  .gte('payment_date', startDate)
  .lte('payment_date', endDate),

  // 3. Invoices (NFs emitidas para clientes)
  client.from('invoices').select(
    'id, due_date, amount, status, type, nf_number, job_id'
  )
  .eq('tenant_id', auth.tenantId)
  .is('deleted_at', null)
  .gte('due_date', startDate)
  .lte('due_date', endDate)
  .neq('status', 'cancelada'),
]);
```

Indices existentes usados: `idx_cost_items_tenant_job`, `idx_invoices_job`, `idx_invoices_status`.

### 3.2 GET /payment-calendar/kpis

**Query params:** Mesmos `start_date`, `end_date`, `job_id` (opcionais).

**Response (200):**
```jsonc
{
  "data": {
    "total_payable": 85000.00,       // soma cost_items pendentes no range
    "total_receivable": 150000.00,   // soma jobs.closed_value + invoices no range
    "net_balance": 65000.00,         // receivable - payable
    "overdue_count": 3,              // cost_items vencidos (payment_due_date < hoje, status pendente)
    "overdue_amount": 12000.00,
    "due_this_week": 25000.00,       // vence nos proximos 7 dias
    "paid_in_period": 40000.00       // pagos no range
  }
}
```

**Implementacao:** Uma query agregada nos cost_items + uma nos jobs/invoices. Agregacao em memoria (volume baixo por range mensal).

### 3.3 PATCH /payment-calendar/postpone

**Body:**
```jsonc
{
  "cost_item_ids": ["uuid1", "uuid2"],  // max 50
  "new_due_date": "2026-04-15",
  "reason": "Aguardando NF do fornecedor"  // obrigatorio
}
```

**Response (200):**
```jsonc
{
  "data": {
    "items_updated": 2,
    "new_due_date": "2026-04-15"
  }
}
```

**Logica:**
1. Validar que `new_due_date >= hoje`
2. Buscar cost_items pelo ids + tenant_id
3. Filtrar apenas `payment_status = 'pendente'` (nao pode prorrogar pago/cancelado)
4. Update batch: `payment_due_date = new_due_date`
5. Inserir historico via `insertHistory` (campo: payment_due_date, data_before/data_after)
6. Roles: `financeiro`, `admin`, `ceo`, `produtor_executivo`

---

## 4. Componentes Frontend

### 4.1 Arvore — Tela cross-job (`/financeiro/calendario`)

```
/financeiro/calendario/page.tsx              [REESCREVER]
  |-- PaymentCalendarKpis                    [NOVO]
  |-- ViewToggle (calendario | lista)        [NOVO inline]
  |-- PaymentCalendarView                    [NOVO — usa CalendarMonthGrid]
  |    |-- CalendarMonthGrid                 [REUSO do cronograma]
  |    |-- PaymentDayCell                    [NOVO — pills de pagamento]
  |    |-- PaymentDayPopover                 [NOVO — detalhe do dia]
  |-- PaymentListView                        [REFACTOR da lista atual]
  |-- PostponeDialog                         [NOVO]
  |-- PaymentDialog                          [REUSO existente]
  |-- BatchPayBar                            [REUSO — extrair de page atual]
```

### 4.2 Tela per-job (`/jobs/[id]/financeiro/calendario`)

Nova tab no financeiro do job. Reutiliza todos os componentes acima com prop `jobId` que filtra os dados.

### 4.3 Componentes novos (resumo)

| Componente | Descricao |
|---|---|
| `PaymentCalendarKpis` | 4 cards: A Pagar, A Receber, Saldo, Atrasados. Cores: vermelho se overdue > 0. |
| `PaymentCalendarView` | Wrapper do CalendarMonthGrid. Cada dia renderiza pills coloridas (verde=receita, amber=pendente, red=vencido, gray=pago). |
| `PaymentDayCell` | Renderiza dentro da celula: ate 3 pills + "+N" se houver mais. |
| `PaymentDayPopover` | Click no dia: lista completa de pagamentos, checkbox para selecionar, botao prorrogar. |
| `PostponeDialog` | DatePicker + textarea motivo. Chama PATCH /payment-calendar/postpone. |
| `PaymentListView` | Refactor da lista agrupada por data existente, adicionando receitas e botao prorrogar. |

---

## 5. Types

```typescript
// frontend/src/types/payment-calendar.ts

export type CalendarEventType = 'cost_item' | 'job_payment' | 'invoice'

export interface PayableEvent {
  id: string
  date: string
  type: 'cost_item'
  amount: number
  status: 'pendente' | 'pago' | 'cancelado'
  is_overdue: boolean
  description: string
  vendor_name: string | null
  job_id: string
  job_code: string
  job_title: string
  payment_method: string | null
  nf_status: string | null
}

export interface ReceivableEvent {
  id: string
  date: string
  type: 'job_payment' | 'invoice'
  amount: number
  status: string
  description: string
  client_name: string | null
  job_id: string
  job_code: string
  job_title: string
}

export interface PaymentCalendarEvents {
  payables: PayableEvent[]
  receivables: ReceivableEvent[]
}

export interface PaymentCalendarKpis {
  total_payable: number
  total_receivable: number
  net_balance: number
  overdue_count: number
  overdue_amount: number
  due_this_week: number
  paid_in_period: number
}

export interface PostponePayload {
  cost_item_ids: string[]
  new_due_date: string
  reason: string
}

export interface PostponeResult {
  items_updated: number
  new_due_date: string
}
```

---

## 6. Hooks e Query Keys

```typescript
// query-keys.ts — adicionar
export const paymentCalendarKeys = {
  all: ['payment-calendar'] as const,
  events: (start: string, end: string, jobId?: string) =>
    [...paymentCalendarKeys.all, 'events', start, end, jobId] as const,
  kpis: (start: string, end: string, jobId?: string) =>
    [...paymentCalendarKeys.all, 'kpis', start, end, jobId] as const,
}
```

```typescript
// hooks/usePaymentCalendar.ts
export function usePaymentCalendarEvents(start: string, end: string, jobId?: string)
export function usePaymentCalendarKpis(start: string, end: string, jobId?: string)
export function usePostponePayment()  // useMutation
```

StaleTime: 2 minutos (dados de pagamento mudam com mais frequencia que dashboard).

---

## 7. Estrutura de Arquivos

**Backend:**
```
supabase/functions/payment-calendar/
  index.ts                          [NOVO — routing GET events, GET kpis, PATCH postpone]
  handlers/
    events.ts                       [NOVO]
    kpis.ts                         [NOVO]
    postpone.ts                     [NOVO]
```

**Frontend:**
```
frontend/src/
  types/payment-calendar.ts                                    [NOVO]
  lib/query-keys.ts                                            [MODIFICAR]
  hooks/usePaymentCalendar.ts                                  [NOVO]
  app/(dashboard)/financeiro/calendario/
    page.tsx                                                   [REESCREVER]
    _components/
      PaymentCalendarKpis.tsx                                  [NOVO]
      PaymentCalendarView.tsx                                  [NOVO]
      PaymentDayCell.tsx                                       [NOVO]
      PaymentDayPopover.tsx                                    [NOVO]
      PostponeDialog.tsx                                       [NOVO]
      PaymentListView.tsx                                      [NOVO]
  app/(dashboard)/jobs/[id]/financeiro/calendario/
    page.tsx                                                   [NOVO — wrapper com jobId]
```

---

## 8. Plano de Execucao

| Passo | Descricao | Esforco |
|---|---|---|
| 1 | Criar EF `payment-calendar` (index + 3 handlers) | 1h |
| 2 | Deploy EF + testar via curl | 15min |
| 3 | Types + query keys + hooks frontend | 20min |
| 4 | `PaymentCalendarKpis` (4 cards) | 15min |
| 5 | `PaymentCalendarView` + `PaymentDayCell` + popover | 45min |
| 6 | `PostponeDialog` + mutation | 20min |
| 7 | `PaymentListView` (refactor lista existente + receitas) | 30min |
| 8 | Reescrever page.tsx cross-job (toggle calendario/lista) | 20min |
| 9 | Criar page.tsx per-job (tab financeiro) | 15min |
| 10 | Testes manuais + push | 15min |
| **Total** | | **~4h** |

---

## 9. Alternativas Descartadas

**A. Estender financial-dashboard com handler de calendario** — Descartado. Escopo de escrita (postpone) nao pertence a um dashboard de leitura. Misturar viola SRP.

**B. Criar view materializada para cross-job** — Volume de cost_items por mes e baixo (~200-500 no tenant). Query direta com indice e suficiente. View materializada adiciona complexidade de refresh sem beneficio.

**C. Usar FullCalendar.js** — Lib pesada (~200KB). O CalendarMonthGrid do cronograma ja existe, e leve, e segue o design system. Reusar e a escolha correta.

**D. Endpoint unico retornando events + KPIs juntos** — Descartado. KPIs sao agregados numericos (rapidos), events sao listas potencialmente longas. Separar permite que os KPI cards renderizem antes da lista.
