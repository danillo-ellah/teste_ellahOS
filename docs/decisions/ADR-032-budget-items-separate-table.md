# ADR-032: opportunity_budget_items separados de cost_items

**Data:** 11/03/2026
**Status:** Aceito
**Autor:** Tech Lead -- ELLAHOS
**Contexto:** Onda 2.4 -- Orcamentos pre-Job

## Contexto

A Onda 2.4 introduz orcamentos comerciais (pre-job) vinculados a oportunidades CRM. Cada orcamento contem linhas por categoria GG (Grupo de Gastos), o padrao de mercado publicitario brasileiro.

A tabela `cost_items` ja existe e armazena custos reais de jobs em execucao, com 40+ colunas (NF, pagamento, vendor, overtime, etc.). A questao era se os itens de orcamento pre-job deveriam reusar `cost_items` ou ter tabela propria.

## Decisao

Criar tabela separada `opportunity_budget_items` com schema enxuto (7 colunas uteis: id, tenant_id, version_id, item_number, display_name, value, notes). Na conversao de oportunidade para job, os dados sao copiados para `cost_items` com `item_status = 'orcado'` e `import_source = 'crm_opportunity_{id}'`.

## Consequencias

### Positivas

- Schema limpo: sem 30+ colunas nulas por linha de orcamento pre-job
- Semantica clara: `opportunity_budget_items` = estimativa; `cost_items` = custo real
- Constraints existentes de `cost_items` (chk_cost_items_period_month_for_fixed) nao quebram
- Queries financeiras nao precisam filtrar dados de CRM
- Lifecycle diferente: orcamento e imutavel apos ativacao; cost_item e editavel

### Negativas

- Duplicacao controlada na conversao (mapeamento de 7 campos para 40+)
- Dois conjuntos de RLS policies a manter

## Alternativas consideradas

**Reusar cost_items com job_id NULL e opportunity_id FK:**
- Poluiria a tabela central com semantica diferente
- Quebraria constraint chk_cost_items_period_month_for_fixed
- Exigiria ALTER TABLE cost_items ADD COLUMN opportunity_id
- Todas as queries existentes de financeiro precisariam de WHERE job_id IS NOT NULL

**JSONB snapshot na versao de orcamento:**
- Perderia queryability (impossivel GROUP BY categoria across versoes)
- Dificultaria reports e dashboard de perdas
- Impossivel ter UNIQUE constraint em (version_id, item_number)
