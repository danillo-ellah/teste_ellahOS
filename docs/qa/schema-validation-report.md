# Relatorio de Validacao: Schema do Banco de Dados vs Spec/Arquitetura

**Data:** 2026-02-17
**QA Engineer:** Claude Code (Sonnet 4.5)
**Supabase Project ID:** etvapcxesaxhsvzgaane
**Documentos analisados:**
- `docs/specs/jobs-master-table.md` (spec de requisitos, data 2026-02-13)
- `docs/architecture/jobs-module.md` (arquitetura planejada, data 2026-02-13)
- Schema real do banco (fornecido pelo time de desenvolvimento)

---

## RESUMO EXECUTIVO

| Categoria | Quantidade |
|-----------|------------|
| Divergencias criticas (Blocker/Critical) | 8 |
| Divergencias menores (Minor/adaptavel) | 14 |
| Melhorias alem da spec (positivo) | 11 |
| Itens faltantes a adicionar | 6 |

Conclusao: **a feature NAO esta pronta para homologacao**. Existem 8 divergencias criticas que precisam ser resolvidas ou formalmente aceitas antes de liberar para producao. A maioria e relacionada a campos ausentes que afetam regras de negocio centrais (health score incorreto, campos de auditoria, custom_fields).

---

## 1. DIVERGENCIAS CRITICAS

Estas divergencias quebram funcionalidade documentada na spec ou geram inconsistencia de dados. Cada uma deve ser tratada como Blocker ou Critical antes do go-live.

---

### BUG-001 - Severidade: BLOCKER
**Health Score incompleto: max 90 pts em vez de 100**

**Passos para reproduzir:**
1. Criar um job e preencher os 4 URLs (budget_letter_url, schedule_url, script_url, ppm_url)
2. Preencher expected_delivery_date e payment_date
3. Verificar health_score calculado

**Esperado (spec, secao 4.7 e US-021):**
```
+15 por URL preenchido (4 URLs = 60 pts)
+10 data entrega definida
+10 data pagamento definida
+10 Diretor definido na equipe
+10 PE definido na equipe
Total maximo: 100 pts
```

**Atual (trigger real):**
```
+15 por URL preenchido (4 URLs = 60 pts)
+10 data entrega definida
+10 data pagamento definida
+10 se closed_value > 0       <-- substitui "+10 Diretor" sem base na spec
Total maximo: 90 pts          <-- falta "+10 PE", perdido criterio de equipe
```

**Impacto:** Health score nunca chega a 100. Jobs com diretor e PE definidos nao recebem pontuacao correta. Criterio de equipe (central para o modelo da Ellah) e ignorado pelo trigger.

**Arquivo relevante:** Trigger `calculate_health_score` no banco Supabase.

**Correcao necessaria:** Substituir "+10 se closed_value > 0" por:
- +10 se existe membro com role = 'diretor' em job_team (ativo, nao deletado)
- +10 se existe membro com role = 'produtor_executivo' em job_team (ativo, nao deletado)

---

### BUG-002 - Severidade: CRITICAL
**Campo `created_by` ausente: auditoria de criacao incompleta**

**Spec (secao 4.11):** Campo `created_by UUID FK` obrigatorio em todas as tabelas, incluindo `jobs`.

**Real:** Campo `created_by` NAO EXISTE na tabela `jobs`.

**Impacto:**
- Impossivel saber quem criou cada job (requisito auditoria, US-015)
- `job_history` para evento `created` fica sem referencia ao usuario criador
- RLS por papel nao consegue filtrar "jobs que coordena" (US-003, criterio de permissao)
- Criterio de aceite 6.3 quebrado: "Produtor/Coordenador: criar e editar jobs que coordena"

**Correcao necessaria:** Adicionar coluna e preencher via trigger no INSERT:
```sql
ALTER TABLE jobs ADD COLUMN created_by UUID REFERENCES profiles(id);
CREATE INDEX idx_jobs_created_by ON jobs(created_by);
```

---

### BUG-003 - Severidade: CRITICAL
**Campo `custom_fields` ausente: customizacao por tenant impossivel**

**Spec (secao 4.12):** `custom_fields JSONB DEFAULT '{}'` - explicitamente planejado para permitir customizacao por produtora.

**Real:** Campo `custom_fields` NAO EXISTE na tabela `jobs`.

**Impacto:**
- US-003 criterio: "Produtoras podem customizar status" - nao ha onde armazenar configuracoes de tenant
- Resposta CEO (perguntas abertas, item 15): "Sim campos proprios (JSONB)" - requisito confirmado
- Sem esse campo, customizacao por tenant exige schema migration para cada novo cliente

**Correcao necessaria:**
```sql
ALTER TABLE jobs ADD COLUMN custom_fields JSONB DEFAULT '{}';
CREATE INDEX idx_jobs_custom_fields ON jobs USING GIN(custom_fields);
```

---

### BUG-004 - Severidade: CRITICAL
**Geracao de job_code sem lock atomico: risco de duplicidade em concorrencia**

**Arquitetura planejada (secao 2.5):** Tabela `job_code_sequences` com `INSERT ON CONFLICT DO UPDATE` para garantir atomicidade e prevenir race conditions.

**Real:** Usa `MAX(index_number) + 1` sem nenhum mecanismo de lock.

**Cenario de falha:**
1. Usuario A inicia criacao de job (MAX = 5, vai usar 6)
2. Usuario B inicia criacao de job simultaneamente (MAX = 5, vai usar 6 tambem)
3. Ambos tentam INSERT com index_number = 6
4. Constraint UNIQUE(tenant_id, job_code) faz um deles falhar com erro 500

**Impacto:** Em uso normal (poucos usuarios simultaneos da Ellah) o risco e baixo mas real. Para multi-tenant com multiplas produtoras o risco cresce. Gera experiencia de usuario ruim (erro ao criar job).

**Correcao necessaria:** Implementar tabela `job_code_sequences` conforme spec, ou usar `SELECT ... FOR UPDATE` na transacao de criacao do codigo.

---

### BUG-005 - Severidade: CRITICAL
**`job_shooting_dates` substituida por array: perda de metadados de filmagem**

**Spec (secao 5.3 e 4.5):** Tabela separada `job_shooting_dates` com colunas: `shooting_date`, `description`, `location`, `start_time`, `end_time`, `display_order`, `created_at`, `updated_at`, `deleted_at`.

**Real:** Campo `shooting_dates date[]` (array simples) na tabela `jobs`.

**Impacto:**
- Impossivel registrar local de filmagem por diaria (campo `location` perdido)
- Impossivel registrar horario de inicio/fim por diaria
- Impossivel adicionar descricao ("Dia 1 - Locacao externa")
- Impossivel fazer soft delete de uma diaria especifica
- Impossivel auditar quem alterou qual diaria
- US-006 criterio "Calendário visual mostra jobs agendados" fica limitado sem metadados
- US-018 criterio "Filtro por fase (producao/filmagem)" perde granularidade

**Correcao necessaria:** Criar tabela `job_shooting_dates` conforme spec. Migrar dados do array para a tabela.

---

### BUG-006 - Severidade: CRITICAL
**`deliverable_status` sem o valor 'aprovado': workflow de entregavel quebrado**

**Spec (secao 5.2) e arquitetura (ENUM `deliverable_status`):**
```
pendente, em_producao, aguardando_aprovacao, aprovado, entregue
```

**Real (ENUM no banco):** Valor `aprovado` NAO EXISTE.

**Impacto:**
- US-009 criterio: "Checklist visual de pendentes vs entregues" - o estado intermediario "aprovado antes de entregue" nao existe
- US-009 criterio: "Entregaveis podem ter versoes (v1, v2 com correcoes)" - sem status "aprovado" nao ha marco de aprovacao antes de nova versao
- Criterio de aceite 6.4: "Status 'Entregue' do job requer pelo menos 1 entregavel entregue" - logica pode ser afetada

**Correcao necessaria:**
```sql
ALTER TYPE deliverable_status ADD VALUE 'aprovado' BEFORE 'entregue';
```

---

### BUG-007 - Severidade: CRITICAL
**Tabela `job_files` sem `updated_at` e `version`: versionamento de anexos impossivel**

**Spec (secao 5.4) e arquitetura:** Tabela `job_attachments` com `version INTEGER NOT NULL DEFAULT 1` e `updated_at`.

**Real (tabela `job_files`):**
- `version` NAO EXISTE
- `updated_at` NAO EXISTE

**Impacto:**
- US-019 criterio: "Versionamento de arquivos" - impossivel rastrear versoes v1, v2 de contratos e briefings
- Sem `updated_at`, impossivel ordenar ou filtrar arquivos por modificacao recente
- Auditoria de anexos incompleta (padrao da spec: todas as tabelas tem updated_at)

**Correcao necessaria:**
```sql
ALTER TABLE job_files ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE job_files ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
```

---

### BUG-008 - Severidade: CRITICAL
**`approval_type` com valores em ingles na spec, em portugues no banco: inconsistencia de API**

**Spec (secao 4.10):** ENUM `approval_type` com valores `'internal'` e `'external'`.

**Real:** ENUM `approval_type` com valores `'interna'` e `'externa_cliente'`.

**Impacto:**
- Qualquer codigo frontend ou Edge Function escrito contra a spec vai falhar ao tentar inserir `'internal'`
- Documentacao da API fica incorreta
- Testes escritos com valores da spec vao falhar

**Decisao necessaria:** Escolher um padrao (ingles ou portugues) e documentar. A arquitetura usa ingles para ENUMs. Recomendacao: manter portugues mas atualizar spec e arquitetura.

---

## 2. DIVERGENCIAS MENORES

Diferencas de nomenclatura ou tipo que nao quebram funcionalidade central, mas precisam ser mapeadas na camada de API e documentadas para nao gerar confusao.

| # | Elemento | Spec/Arquitetura | Real | Impacto |
|---|----------|-----------------|------|---------|
| M-01 | Tabela de equipe | `job_team_members` | `job_team` | Renomear referencias em Edge Functions e frontend |
| M-02 | Tabela de anexos | `job_attachments` | `job_files` | Renomear referencias |
| M-03 | Campo cache/valor | `fee` (job_team_members) | `rate` (job_team) | Renomear no DTO da API |
| M-04 | Campo produtor resp. | `is_lead_producer` | `is_responsible_producer` | Renomear no DTO e logica de alerta |
| M-05 | ENUM tipo de projeto | `job_type` | `project_type` | Alias no DTO |
| M-06 | ENUM prioridade | `job_priority` | `priority_level` | Alias no DTO |
| M-07 | ENUM segmento | `segment_type` | `client_segment` | Alias no DTO |
| M-08 | Segmento "alimentos" | `alimentos` (spec) | `alimentos_bebidas` (real) | Mais especifico, aceitar real |
| M-09 | Segmento "tech" | `tech` (spec) | `tecnologia` (real) | Mais especifico, aceitar real |
| M-10 | Segmento "governo" | NAO EXISTE na spec | Existe no real | Adicionar na spec |
| M-11 | `complexity_level` | ENUM tipado | TEXT livre | Risco de dados inconsistentes (ver recomendacoes) |
| M-12 | `sub_status` | `sub_status TEXT` (spec) | `pos_sub_status ENUM(6 valores)` (real) | Nome diferente + ENUM vs TEXT + apenas para pos-producao |
| M-13 | `previous_data` / `new_data` | Nomes spec (job_history) | `data_before` / `data_after` (real) | Renomear no DTO de historico |
| M-14 | `job_code` (spec) | Campo unico com codigo completo | `code` + `job_aba` separados (real) | Pode ser positivo (ver secao 3) |
| M-15 | Tabela `users` (arch) | `users` com campos proprios | `profiles` com FK para `auth.users` | Padrao Supabase correto, atualizar referencias na arch |
| M-16 | `account_email` | Campo na tabela `jobs` (spec) | NAO EXISTE | Funcionalidade de email do atendimento perdida |
| M-17 | `job_category` | Campo na tabela `jobs` (spec) | NAO EXISTE | Categoria customizavel perdida |

---

## 3. MELHORIAS IMPLEMENTADAS ALEM DA SPEC (POSITIVO)

Campos e decisoes de implementacao que vao alem do que foi especificado e agregam valor.

### 3.1 Tabela `job_budgets` (nova, nao estava na spec original)
A spec planejava versionamento de orcamentos mas nao tinha um modelo de dados claro. A implementacao criou uma tabela dedicada com:
- `version` para controle de versoes (v1, v2, v3)
- `content_md` para conteudo do orcamento em Markdown
- `doc_url` e `pdf_url` para documentos gerados
- `approved_at` e `approved_by` para rastreabilidade de aprovacao
- Padrao completo de auditoria (created_at, updated_at, deleted_at)

Isso atende diretamente US-022 (versionamento de orcamentos) e US-023 (aprovacoes).

### 3.2 URLs de producao expandidas (campos extras em `jobs`)
Spec planejou 7 URLs. Real implementou 13 URLs cobrindo fases especificas do workflow da Ellah:
- `raw_material_url` - material bruto
- `team_sheet_url`, `team_form_url`, `cast_sheet_url` - equipe e elenco
- `pre_production_url`, `pre_art_url`, `pre_costume_url` - pre-producao por departamento
- `closing_production_url`, `closing_art_url`, `closing_costume_url` - fechamento por departamento
- `final_delivery_url` - entrega final

Isso reflete melhor o workflow real da produtora e permite health score mais granular no futuro.

### 3.3 Generated columns para calculos financeiros
Spec planejava trigger `calculate_job_financials`. Real usa `GENERATED ALWAYS AS`, que e superior:
- Consistencia garantida pelo banco (impossivel ter valor calculado incorreto)
- Performance melhor (sem overhead de trigger)
- Semantica clara (a coluna e derivada, nao pode ser editada diretamente)

### 3.4 Flags booleanas de producao
Campos `has_contracted_audio`, `has_mockup_scenography`, `has_computer_graphics` permitem filtros e relatorios especificos do workflow audiovisual, nao previstos na spec.

### 3.5 Campo `other_costs` para calculos
Permite registrar custos extras que afetam o calculo financeiro sem precisar de modulo financeiro completo.

### 3.6 Campo `total_duration_seconds`
Util para relatorios de producao (total de segundos produzidos por cliente/tipo).

### 3.7 Campos de compliance ANCINE
`ancine_number` e `commercial_responsible` atendem obrigacoes regulatorias brasileiras nao cobertas pela spec original.

### 3.8 Campo `proposal_validity`
Controle de validade da proposta comercial, util para automacao de followup.

### 3.9 Campo `references_text`
Alternativa textual para referencias visuais, complementa o sistema de anexos.

### 3.10 ENUM `pos_sub_status` com valores tipados
Embora o nome seja diferente da spec, tipificar os sub-status de pos-producao previne dados inconsistentes. Os 6 valores cobre o workflow real de pos.

### 3.11 Separacao `code` + `job_aba`
Ter o codigo numerico (`code`) separado do codigo completo (`job_aba`) facilita ordenacao, busca por numero e geracao de relatorios. Melhoria em relacao ao campo unico `job_code` da spec.

---

## 4. ITENS FALTANTES QUE PRECISAM SER ADICIONADOS

Funcionalidades documentadas na spec que ainda nao foram implementadas no schema.

### FA-001 - Tabela `job_shooting_dates` (ja catalogado como BUG-005)
Substituir `shooting_dates date[]` por tabela com metadados completos.

### FA-002 - Campo `created_by` em `jobs` (ja catalogado como BUG-002)
Auditoria de criacao obrigatoria.

### FA-003 - Campo `custom_fields` em `jobs` (ja catalogado como BUG-003)
JSONB para customizacao por tenant.

### FA-004 - Indice de busca textual full-text
Arquitetura (secao 2.3) planejou indice GIN para busca em portugues:
```sql
CREATE INDEX idx_jobs_search ON jobs USING GIN(
  to_tsvector('portuguese', coalesce(title,'') || ' ' || coalesce(job_aba,''))
);
```
Sem isso, busca textual (US-013 criterio "<500ms") pode ser lenta em volumes maiores.

### FA-005 - Indice composto para listagem ativa
Arquitetura planejou:
```sql
CREATE INDEX idx_jobs_active_listing
  ON jobs(tenant_id, is_archived, status, expected_delivery_date)
  WHERE deleted_at IS NULL;
```
Critico para performance da tabela master (US-001 criterio "<1s para 500 jobs").

### FA-006 - Campos `account_email` e `job_category` em `jobs`
Ambos mencionados na spec (secoes 4.1 e 4.2) e na arquitetura. Sem eles:
- `account_email`: impossivel registrar email do atendimento responsavel no job
- `job_category`: categoria customizavel da master Ellah (coluna "CATEGORIA DE JOB") nao tem campo no banco

---

## 5. RECOMENDACOES PARA A FASE 2

### REC-001 - Prioridade ALTA: Resolver BUGs criticos antes de qualquer feature nova
Ordem sugerida de correcao:
1. BUG-001 (health score): correcao de logica no trigger
2. BUG-002 (created_by): ALTER TABLE simples
3. BUG-003 (custom_fields): ALTER TABLE simples
4. BUG-005 (shooting_dates): requer migration com dados
5. BUG-006 (deliverable_status): ALTER TYPE ADD VALUE
6. BUG-007 (job_files): ALTER TABLE simples
7. BUG-004 (job_code atomico): requer criacao de tabela + refatoracao de trigger
8. BUG-008 (approval_type): decisao de padrao + atualizar docs

### REC-002 - Prioridade ALTA: Converter `complexity_level` para ENUM
Atualmente e TEXT livre, o que permite qualquer string no banco. Isso gera inconsistencias de dados que sao dificeis de corrigir depois. Criar ENUM `complexity_level` com valores `'baixo', 'medio', 'alto'` e aplicar constraint.

### REC-003 - Prioridade MEDIA: Atualizar documentacao para refletir realidade
A spec e a arquitetura documentam um schema diferente do que foi implementado. Isso confunde novos desenvolvedores e QA. Recomendado:
- Atualizar `docs/architecture/jobs-module.md` com nomes reais das tabelas e colunas
- Documentar explicitamente as decisoes de desvio da spec (ex: por que `job_files` em vez de `job_attachments`)
- Criar `docs/architecture/schema-decisions.md` com ADRs (Architecture Decision Records)

### REC-004 - Prioridade MEDIA: Criar tabela `job_shooting_dates` e migrar dados
O array `date[]` e uma solucao simples que nao escala para o workflow real de producao. Na Fase 2, antes de usar o modulo de calendario, criar a tabela separada.

### REC-005 - Prioridade MEDIA: Validar RLS policies no banco real
A arquitetura define policies de isolamento por tenant, mas o banco real usa `profiles` em vez de `users`. Verificar se todas as policies referenciam a tabela correta e se o `tenant_id` e extraido corretamente do JWT.

### REC-006 - Prioridade BAIXA: Padronizar nomenclatura de ENUMs
Decidir entre ingles e portugues para valores de ENUM e aplicar consistentemente. Sugestao: manter portugues (mais claro para o contexto brasileiro) e atualizar spec e arquitetura.

### REC-007 - Prioridade BAIXA: Avaliar `pos_sub_status` vs `sub_status`
A spec previa `sub_status TEXT` livre para qualquer fase do job. O real implementou `pos_sub_status ENUM` apenas para pos-producao. Avaliar se o campo generico `sub_status` e necessario para outras fases ou se o ENUM tipado e suficiente.

### REC-008 - Prioridade BAIXA: Adicionar indices faltantes
Os indices de busca textual (FA-004) e listagem ativa (FA-005) impactam performance. Adicionar antes de carga de dados real.

---

## MAPA DE NOMES: SPEC vs REAL (referencia rapida para desenvolvedores)

| Spec/Arquitetura | Real (banco) | Status |
|-----------------|-------------|--------|
| `job_team_members` | `job_team` | Divergencia menor |
| `job_attachments` | `job_files` | Divergencia menor |
| `job_shooting_dates` (tabela) | `shooting_dates date[]` (coluna em jobs) | BUG-005 Critical |
| `job_code_sequences` | NAO EXISTE | BUG-004 Critical |
| `users` | `profiles` | Padrao Supabase, OK |
| `job_code` | `code` + `job_aba` | Melhoria |
| `fee` | `rate` | Divergencia menor |
| `is_lead_producer` | `is_responsible_producer` | Divergencia menor |
| `previous_data` / `new_data` | `data_before` / `data_after` | Divergencia menor |
| `job_type` (ENUM) | `project_type` (ENUM) | Divergencia menor |
| `job_priority` (ENUM) | `priority_level` (ENUM) | Divergencia menor |
| `segment_type` (ENUM) | `client_segment` (ENUM) | Divergencia menor |
| `complexity_level` (ENUM) | `complexity_level TEXT` | Divergencia menor, risco dados |
| `approval_type: internal/external` | `approval_type: interna/externa_cliente` | BUG-008 Critical |
| `sub_status TEXT` | `pos_sub_status ENUM` | Divergencia menor |
| `audio_notes TEXT` | `has_contracted_audio BOOLEAN` | Tipo diferente, perda de info |
| `custom_fields JSONB` | NAO EXISTE | BUG-003 Critical |
| `created_by UUID` | NAO EXISTE | BUG-002 Critical |
| `account_email TEXT` | NAO EXISTE | FA-006 Faltante |
| `job_category TEXT` | NAO EXISTE | FA-006 Faltante |
| `job_budgets` (tabela) | Existe (nao estava na spec) | Melhoria |

---

**Fim do Relatorio**
**Proximos passos:** Apresentar ao Tech Lead para priorizacao dos BUGs criticos (BUG-001 a BUG-008) antes do inicio da Fase 2 (Edge Functions CRUD).
