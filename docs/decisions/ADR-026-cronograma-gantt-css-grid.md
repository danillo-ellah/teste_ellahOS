# ADR-026: Cronograma/Timeline com Gantt CSS Grid Custom

**Data:** 2026-03-04
**Status:** PROPOSTA
**Decisor:** Tech Lead / Arquiteto

---

## Contexto

O ELLAHOS precisa de um modulo de cronograma por job mostrando fases de producao em formato Gantt. O modulo deve ser editavel, exportavel em PDF e funcionar em mobile.

Precisamos decidir:
1. Como armazenar as fases (tabela normalizada vs JSONB)
2. Qual componente Gantt usar no frontend (lib externa vs custom)
3. Como tratar o template de fases padrao por tenant

## Decisao

### 1. Armazenamento: tabela normalizada `job_phases`

Tabela dedicada com uma row por fase, com colunas tipadas para datas, cor, progresso e dependencia. RLS tenant-based (padrao do projeto). Constraint `UNIQUE(job_id, phase_key)` garante uma fase por chave por job.

Template de fases padrao fica em `tenants.settings.timeline_phases` (JSONB existente), nao em tabela separada. Volume de templates por tenant e pequeno (8-12 fases) e nao justifica tabela propria.

### 2. Frontend: Gantt custom com CSS Grid

Componente custom usando CSS Grid nativo + Tailwind, sem dependencia de biblioteca externa. Cada dia do periodo ocupa uma coluna do grid; cada fase ocupa uma row. As barras sao divs posicionadas via `grid-column: start / span N`.

### 3. Template: auto-populate via `bulk-create`

Endpoint `POST /job-timeline/bulk-create` copia o template do tenant e calcula datas sequenciais a partir de uma data base. Idempotente: retorna 409 se job ja tem fases. Fallback para template hardcoded se tenant nao configurou.

## Consequencias

### Positivas
- Zero dependencias extras no bundle frontend (vs 50-500KB de libs Gantt)
- Controle total do visual: dark mode, cores do design system, responsivo
- Dados normalizados permitem queries SQL diretas ("jobs em filmagem esta semana")
- RLS nativo por row, sem wrappers
- Template configuravel por tenant (multi-tenant ready)
- PDF export usa jsPDF (ja no projeto), sem canvas/screenshot

### Negativas
- Gantt custom requer mais codigo (~200-300 linhas vs config de lib)
- Drag-to-resize das barras nao incluido no MVP (precisa implementar depois)
- Zoom (dia/semana/mes) precisa ser implementado manualmente
- Dependencias visuais (setas entre barras) ficam para fase 2

### Neutras
- Complexidade de manutencao similar a libs externas (que tambem precisam de customizacao)
- Performance identica para o volume esperado (<30 fases por job)

## Alternativas Consideradas

| Alternativa | Motivo da rejeicao |
|-------------|-------------------|
| JSONB em `jobs.custom_fields` | Sem queries SQL diretas, sem FK, sem RLS granular |
| frappe-gantt | Sem TypeScript nativo, sem React wrapper, estilo incompativel |
| vis-timeline | 300KB+, API imperativa, problemas com React 18 StrictMode |
| recharts (Bar horizontal) | Workaround fragil, sem suporte nativo a datas/dependencias |
| @dhtmlx/gantt | GPL/comercial, 500KB+, overkill |
| Tabela separada para templates | Over-engineering para 8-12 items por tenant |
