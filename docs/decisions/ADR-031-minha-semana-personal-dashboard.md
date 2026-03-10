# ADR-031: Minha Semana - Dashboard Pessoal

## Status
Aceito

## Contexto
Produtores Executivos (PEs) e Coordenadores precisam de uma visao consolidada da **sua** semana:
quais jobs estao sob sua responsabilidade, quais entregas vencem nos proximos dias, quais diarias
(filmagens) estao agendadas, e quais aprovacoes aguardam acao. O dashboard CEO (/) mostra
metricas globais do tenant, mas nao oferece filtro pessoal por membro da equipe.

Hoje, para ver seus jobs, um PE precisa abrir `/jobs`, filtrar mentalmente, depois verificar
entregas e diarias em cada job individualmente. Isso e ineficiente.

### Restricoes
- Dados de 4 tabelas diferentes: `jobs`, `job_deliverables`, `job_shooting_dates`, `approvals`
- Filtro cruzado: precisa da tabela `job_team` para saber quais jobs pertencem ao usuario
- A tabela `job_team` vincula `person_id`, nao `user_id` — exige lookup via `people.profile_id`
- EFs existentes (`jobs/list`, `jobs-deliverables`, `jobs-shooting-dates`, `approvals/pending`)
  operam por job_id individual, nao cross-job por usuario
- Fazer N+1 requests do frontend (1 para jobs, depois 1 por job para deliverables/shooting)
  seria O(n) roundtrips — inaceitavel

## Decisao

### 1. Nova Edge Function: `my-week`
Criar uma Edge Function dedicada que retorna **tudo em uma unica request**:
- `jobs`: jobs ativos onde o usuario logado esta no `job_team`
- `deliverables`: entregaveis com `delivery_date` na semana (seg-dom), de todos esses jobs
- `shooting_dates`: diarias de filmagem na semana, de todos esses jobs
- `pending_approvals`: aprovacoes pendentes dos jobs do usuario

**Rota unica:** `GET /my-week?week_start=2026-03-09`

O parametro `week_start` e opcional (default: segunda-feira da semana atual).

### 2. Rota Frontend: `/minha-semana`
Pagina dentro de `(dashboard)/minha-semana/page.tsx`. Nao substituir `/` (dashboard CEO),
pois a home e estrategica para CEOs/admins com visao global. A minha-semana e pessoal.

Adicionada na sidebar na secao "Producao" (area: producao), logo abaixo de "Dashboard".

### 3. Secoes da Pagina
| Secao | Descricao | Fonte de dados |
|-------|-----------|---------------|
| **KPI Cards** (4) | Meus jobs ativos, Entregas da semana, Diarias da semana, Aprovacoes pendentes | Contagens derivadas da response |
| **Meus Jobs** | Tabela compacta com status, cliente, health, link rapido | `data.jobs` |
| **Entregas da Semana** | Lista agrupada por dia (seg-dom) com job code, descricao, status badge | `data.deliverables` |
| **Diarias da Semana** | Timeline por dia com job code, local, horario | `data.shooting_dates` |
| **Aprovacoes Pendentes** | Cards/lista com tipo, job, data criacao | `data.pending_approvals` |

### 4. Acesso
Visivel para todos os roles com job_team (nao so PE/Coord). Um freelancer tambem pode
ter "sua semana". O sidebar fica visivel para todos (`SIDEBAR_ACCESS` sem restricao).
Se o usuario nao tem jobs, mostra empty state.

## Consequencias

### Positivas
- Uma request retorna tudo — sem N+1 waterfall
- Query SQL eficiente: CTE para person_id -> job_ids, depois 4 queries paralelas
- Reusa infraestrutura existente (auth, CORS, response helpers)
- Nao precisa de migration (zero alteracao de schema)

### Negativas
- Nova EF para manter (mas e read-only, baixa complexidade)
- Dados duplicados parcialmente com hooks existentes (`useJobs`, etc.) — mas com filtro
  diferente (por usuario, nao por tenant inteiro)

## Alternativas Consideradas

### A. Multiplas chamadas existentes no frontend
Usar `useJobs` + `useJobDeliverables(jobId)` para cada job. Rejeitada: seria O(n) requests
onde n = numero de jobs do usuario. Latencia inaceitavel.

### B. Supabase client direto (sem EF)
Fazer queries diretamente via Supabase client no frontend com RLS. Seria possivel, mas:
- Quebraria o pattern do projeto (100% via apiGet -> Edge Functions)
- Nao temos acesso a `people.profile_id` via RLS no frontend facilmente
- Misturaria duas abordagens de data fetching

### C. Adicionar filtro `my_jobs=true` na EF jobs/list
Adicionaria apenas jobs, nao resolveria deliverables/shooting cross-job.

## Contrato da API

### Request
```
GET /my-week?week_start=2026-03-09
Authorization: Bearer <jwt>
```

### Response (200)
```json
{
  "data": {
    "person_id": "uuid",
    "person_name": "Fulano",
    "week_start": "2026-03-09",
    "week_end": "2026-03-15",
    "jobs": [
      {
        "id": "uuid",
        "code": "038",
        "title": "Senac SP - Campanha",
        "status": "producao_filmagem",
        "health_score": 80,
        "client_name": "Senac",
        "agency_name": "Africa",
        "expected_delivery_date": "2026-03-20",
        "team_role": "produtor_executivo",
        "is_responsible_producer": true
      }
    ],
    "deliverables": [
      {
        "id": "uuid",
        "job_id": "uuid",
        "job_code": "038",
        "job_title": "Senac SP - Campanha",
        "description": "Filme 30s - Versao final",
        "status": "em_producao",
        "delivery_date": "2026-03-12",
        "format": "MP4",
        "resolution": "4K"
      }
    ],
    "shooting_dates": [
      {
        "id": "uuid",
        "job_id": "uuid",
        "job_code": "038",
        "job_title": "Senac SP - Campanha",
        "shooting_date": "2026-03-11",
        "description": "Diaria 1 - Externas",
        "location": "Parque Ibirapuera",
        "start_time": "07:00",
        "end_time": "19:00"
      }
    ],
    "pending_approvals": [
      {
        "id": "uuid",
        "job_id": "uuid",
        "job_code": "038",
        "job_title": "Senac SP - Campanha",
        "approval_type": "interna_orcamento",
        "status": "pendente",
        "created_at": "2026-03-10T10:00:00Z"
      }
    ]
  }
}
```

## Componentes Frontend

```
frontend/src/app/(dashboard)/minha-semana/page.tsx     -- pagina principal
frontend/src/hooks/useMyWeek.ts                        -- hook TanStack Query
frontend/src/types/my-week.ts                          -- tipos da response
supabase/functions/my-week/index.ts                    -- router EF
supabase/functions/my-week/handlers/get.ts             -- handler unico
```
