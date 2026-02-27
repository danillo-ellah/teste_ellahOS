# Fase 10 - Modulo Financeiro

**Data:** 26/02/2026
**Status:** RASCUNHO - Aprovacao do Tech Lead pendente
**Autor:** Product Manager - ELLAHOS
**Fases anteriores:** Fases 1-9 CONCLUIDAS (schema, Edge Functions, frontend, automacoes NF)

**Referencias:**
- docs/specs/analise-custos-reais-detalhada.md - analise das planilhas reais (620 linhas)
- docs/specs/analise-planilhas-custos.md - mapeamento das 41 colunas e 8 abas
- docs/specs/respostas-perguntas-financeiro.md - 10 decisoes confirmadas pelo CEO
- docs/specs/fase-9-automacoes-spec.md - automacoes NF implementadas (US-901 a US-917)
- docs/reviews/database-inventory-2026-02-20.md - inventario das 29 tabelas existentes

---

## 1. Visao Geral

### 1.1 Contexto

A Ellah Filmes gerencia o financeiro de producoes audiovisuais hoje com Google Sheets + Apps Script.
Cada job tem uma planilha GG_ com 8 abas: OC (orcamento), CUSTOS_REAIS (controle central com
41 colunas), EQUIPE (cadastro de fornecedores), PRODUCAO (verbas a vista), DEPOSITOS
(adiantamentos), PEDIDO EMISSAO NF (template de email), CALENDARIO (fluxo de caixa) e DASHBOARD.

A Fase 9 automatizou o ciclo de NF (pedido, recebimento, validacao via IA). A Fase 10 conclui
a substituicao total das planilhas GG_ pelo ELLAHOS, implementando:

1. **Schema novo**: tabelas , , , ,
   ,  + views  e 
2. **Backend**: Edge Functions para todo o ciclo financeiro do job
3. **Frontend**: telas de custos, orcamento, calendario e verbas a vista
4. **Migracao**: importacao de todos os jobs historicos das planilhas GG_

### 1.2 O que ja existe (NAO reimplementar)

| Tabela/Feature | Status | Fase |
|----------------|--------|------|
| financial_records | EXISTENTE - registros financeiros de alto nivel por job | Fase 4 |
| budget_items | EXISTENTE - itens de orcamento simplificado | Fase 4 |
| invoices | EXISTENTE - NFs recebidas vinculadas ao job | Fase 4 |
| payment_history | EXISTENTE - historico de pagamentos | Fase 4 |
| people | EXISTENTE - cadastro de fornecedores com bank_info JSONB | Fase 1 |
| nf_documents | EXISTENTE - NFs recebidas via email (ingest n8n) | Fase 9 |
| Ciclo de NF completo (pedido/recebimento/validacao IA) | EXISTENTE - US-901 a US-917 | Fase 9 |
| Edge Function financial | EXISTENTE - CRUD financial_records, budget_items, invoices | Fase 4 |
| n8n wf-nf-processor | EXISTENTE e TESTADO E2E (commit 94e275b) | Fase 9 |
| n8n wf-nf-request | EXISTENTE (4 fixes pendentes) | Fase 9 |

### 1.3 O que a Fase 10 cria

| Item | Descricao | Prioridade |
|------|-----------|------------|
| Tabela cost_categories | Categorias de custo 1-15 e 99 por template de producao | P0 |
| Tabela vendors | Fornecedores estruturados com dedup automatico | P0 |
| Tabela bank_accounts | Dados bancarios vinculados a vendors | P0 |
| Tabela cost_items | Itens de custo por job - substitui budget_items para operacao | P0 |
| Tabela cash_advances | Adiantamentos de verba a vista | P1 |
| Tabela expense_receipts | Prestacao de contas da verba a vista | P1 |
| View calendario_pagamentos | Pagamentos agrupados por data (substitui aba CALENDARIO) | P0 |
| View resumo_custos_job | Totais e status por categoria (substitui aba DASHBOARD) | P0 |
| Edge Function vendors | CRUD vendors com dedup e normalizacao | P0 |
| Edge Function cost-items | CRUD cost_items com validacoes e computed fields | P0 |
| Edge Function payment-manager | Registrar pagamento, vincular comprovante | P0 |
| Edge Function financial-dashboard | Dashboard financeiro por job e por produtora | P0 |
| Edge Function budget-manager | Orcamento bottom-up e top-down | P1 |
| Edge Function cash-advances | Gestao de adiantamentos e prestacao de contas | P1 |
| Edge Function migration-importer | Importar planilhas historicas | P2 |
| Tela custos do job | Lista hierarquica Item/SubItem estilo planilha | P0 |
| Tela orcamento | Formulario com modo bottom-up e top-down | P1 |
| Tela cadastro de vendors | Busca, cadastro, merge de duplicatas | P0 |
| Tela calendario de pagamentos | Visao de pagamentos por data com lotes | P0 |
| Dashboard financeiro | Totais, margens, status por job e produtora | P0 |
| Tela verba a vista | Adiantamentos + prestacao de contas | P1 |
| Script de migracao | Parser CSV/XLSX + dedup vendors + historico completo | P2 |

### 1.4 Premissas do negocio (confirmadas pelo CEO em 26/02/2026)

1. Custos fixos da produtora (aluguel, ferramentas) tambem gerenciados - job_id nullable
2. Normalizacao automatica de vendors: lowercase + trim + remocao de acentos antes de comparar
3. Dados bancarios estruturados: banco (dropdown padronizado), agencia, conta, tipo_pix, chave_pix
4. Verbas a vista usam tabelas cash_advances + expense_receipts (nao sao itens simples de custo)
5. Comprovante armazenado como link direto no item (sem tabela payment_batches separada)
6. Data de pagamento definida manualmente pelo financeiro (nao calculada automaticamente)
7. Status semi-automatico: sistema sugere, financeiro confirma/ajusta quando necessario
8. Orcamento em dois modos: bottom-up (soma itens para total) e top-down (teto fixo, distribuir)
9. Storage hibrido: Google Drive como primario + Supabase Storage como cache opcional
10. Migracao total: todos os jobs historicos das planilhas GG_ (estimativa: 38+ jobs)

---

## 2. Glossario

| Termo | Definicao |
|-------|-----------|
| **Job** | Projeto audiovisual (comercial, filme, institucional etc.) |
| **OC** | Ordem de Compra - orcamento aprovado pelo cliente |
| **CUSTOS_REAIS** | Aba central da planilha GG_ com todos os custos de producao |
| **Item de custo** | Uma linha na CUSTOS_REAIS - um servico/cargo contratado com ciclo completo |
| **Categoria** | Grupo de custo numerado 1-15 e 99. Ex: Item 5 = Direcao de Cena/DF |
| **SubItem** | Posicao dentro da categoria. SubItem=0 e o titulo da categoria |
| **Vendor** | Fornecedor ou prestador de servico PF ou PJ - substitui a aba EQUIPE |
| **Condicao de pagamento** | Prazo e exigencia de NF. Ex: C/NF 45 dias, A vista |
| **Data de vencimento** | Data prevista para pagamento (financeiro define manualmente) |
| **NF** | Nota Fiscal emitida pelo fornecedor para receber pelo servico |
| **Pedido de NF** | Email enviado ao fornecedor solicitando a emissao da NF |
| **Comprovante de pagamento** | Arquivo PDF do recibo do PIX ou TED efetuado |
| **Verba a vista** | Adiantamento em dinheiro entregue ao produtor para compras |
| **Prestacao de contas** | Justificativa da verba a vista com NFs e recibos das despesas |
| **Calendario de pagamentos** | Visao agrupada de itens por data de vencimento |
| **Bottom-up** | Modo de orcamento: produtor soma itens para calcular total |
| **Top-down** | Modo de orcamento: cliente define teto, produtor distribui dentro do valor |
| **Valor W** | Buffer de risco/imprevistos adicionado ao orcamento pelo CEO/CFO |
| **Nome canonico** | Padrao de nomenclatura de arquivos: NF ou PGTO_{DATA}_J{job}_ID{id}_I{item}S{sub} |
| **Status sugerido** | Status calculado automaticamente pelo sistema com base nos dados do item |
| **Lote de pagamento** | Grupo de itens pagos na mesma data com o mesmo comprovante |
| **Dedup** | Deduplicacao - identificar e mesclar registros duplicados |
| **Normalizacao** | Padronizacao de texto: lowercase + trim + remocao de acentos |
| **ISPB** | Identificador de Sistema de Pagamentos Brasileiro - codigo unico do banco |
| **Chave PIX** | Identificador para recebimento via PIX: CPF, CNPJ, email, telefone, aleatoria |

---

## 3. Personas e Permissoes

### 3.1 Financeiro (role: financeiro)

**Perfil:** Responsavel pelo ciclo financeiro completo do job. Usa o modulo todo dia.
**Acesso:** Leitura e escrita em todos os itens financeiros. Aprova NFs. Registra pagamentos.
**Nao pode:** Aprovar orcamentos (CEO/CFO). Excluir jobs (admin only).

**Necessidades principais:**
- Ver todos os itens de custo ordenados por categoria/subcategoria
- Saber quais NFs ainda nao foram pedidas, quais foram pedidas e nao chegaram
- Registrar pagamento de forma rapida com comprovante
- Ver calendario de pagamentos para planejar fluxo de caixa
- Revisar e aprovar NFs recebidas pelo n8n (fluxo da Fase 9)

### 3.2 Produtor Executivo (role: produtor_executivo)

**Perfil:** Monta o orcamento do job. Responsavel pela viabilidade financeira.
**Acesso:** Criar e editar itens de custo. Ver dashboard financeiro. Nao pode registrar pagamentos.

**Necessidades principais:**
- Montar orcamento bottom-up com referencia de jobs similares anteriores
- Montar orcamento top-down quando cliente define teto
- Ver margem em tempo real enquanto adiciona itens
- Copiar template de orcamento de um job similar

### 3.3 CEO / CFO (role: ceo | role: admin)

**Perfil:** Aprova orcamentos finais. Adiciona taxas, impostos e Valor W.
**Acesso:** Total. Pode aprovar orcamentos, fechar jobs, ver todos os relatorios.

**Necessidades principais:**
- Ver e editar campos de taxa e markup no orcamento
- Aprovar ou rejeitar orcamento com comentario
- Dashboard consolidado de todos os jobs (faturamento, margens, alertas)
- Historico financeiro de jobs fechados para referencia

### 3.4 Produtor (role: produtor)

**Perfil:** Executa o job no set. Recebe verbas a vista para compras.
**Acesso:** Ver itens do proprio job. Submeter prestacao de contas de verbas recebidas.
**Nao pode:** Ver financeiro de outros jobs. Registrar pagamentos. Editar valores.

### 3.5 Admin (role: admin)

**Perfil:** Configuracoes do sistema e gestao do tenant.
**Acesso:** Total.
**Necessidades:** Configurar templates de categorias. Executar migracoes. Ver logs de automacao.

---

## 4. User Stories

### 4.1 Bloco 1 - Schema

---

#### US-FIN-001 - Criar tabela cost_categories (P0)

**Prioridade:** P0 | **Persona:** Admin

**Como** admin, **quero** cadastrar templates de categorias de custo por tipo de producao,
**para** que ao criar um novo job o produtor encontre a estrutura padronizada da produtora.

**Criterios de aceite:**
- [ ] CA-001.1: Tabela  criada com colunas: , ,
   (1-15 e 99), , 
  (enum: filme_publicitario | branded_content | videoclipe | documentario | conteudo_digital | all),
  , ,
  , , 
- [ ] CA-001.2: RLS habilitado com policy 
- [ ] CA-001.3: Trigger  automatico via 
- [ ] CA-001.4: UNIQUE em  - mesmo numero nao
  pode aparecer duas vezes no mesmo template de tipo de producao
- [ ] CA-001.5: Seed inicial com as 15 categorias mapeadas da planilha GG_038 para :
  1=Desembolsos a Vista, 2=Estudio, 3=Locacao, 4=Direcao de Arte, 5=Direcao de Cena,
  6=Producao, 7=Veiculos, 8=Passagem/Hospedagem/Alimentacao, 9=Camera/Luz/Maquinaria,
  10=Producao de Casting, 11=Objetos de Cena, 12=Performance e Footage,
  13=Pos Producao/Trilha/Roteirista/Condecine, 14=Administrativo Legal, 15=Monstro, 99=Mao de Obra Interna
- [ ] CA-001.6: Migration idempotente (IF NOT EXISTS em todas as instrucoes DDL)

**Fora de escopo:** Tela de gerenciamento de categorias (ver US-FIN-028).

---

#### US-FIN-002 - Criar tabela vendors (P0)

**Prioridade:** P0 | **Persona:** Financeiro

**Como** financeiro, **quero** um cadastro centralizado e estruturado de fornecedores,
**para** nunca mais ter 98 variacoes de Nubank e dados bancarios desatualizados.

**Contexto:** A EQUIPE.csv tem 210 registros com campo banco altamente inconsistente
(Nubank vs 260 vs NU Bank = mesmo banco) e CPF/CNPJ/PIX misturados em uma unica coluna.

**Criterios de aceite:**
- [ ] CA-002.1: Tabela  criada com colunas:
  - 
  - 
  - 
  - 
  -  - pessoa fisica ou juridica
  -  - apenas digitos, 11 chars
  -  - apenas digitos, 14 chars
  - 
  -  - email principal para pedido de NF
  - 
  -  - observacoes livres e aliases da migracao
  - 
  -  - vinculo com tabela people (opcional)
  -  - identifica registros importados via migracao
  - 
  - 
  - 
- [ ] CA-002.2: CHECK que cpf tem 11 digitos quando nao e NULL
- [ ] CA-002.3: CHECK que cnpj tem 14 digitos quando nao e NULL
- [ ] CA-002.4: Index em  para dedup rapido
- [ ] CA-002.5: Index em  para lookup por email (usado pelo n8n)
- [ ] CA-002.6: Index em  e  para busca por documento
- [ ] CA-002.7: RLS com policy 
- [ ] CA-002.8: Trigger  automatico
- [ ] CA-002.9: Migration idempotente

**Dependencias:** Nenhuma (tabela base).
**Fora de escopo:** Interface de gestao de vendors (ver US-FIN-023).

---
#### US-FIN-003 - Criar tabela bank_accounts (P0)

**Prioridade:** P0 | **Persona:** Financeiro

**Como** financeiro, **quero** armazenar dados bancarios estruturados de cada vendor,
**para** ter banco, agencia, conta e chave PIX padronizados para efetuar pagamentos.

**Criterios de aceite:**
- [ ] CA-003.1: Tabela bank_accounts com colunas:
  - id UUID PK DEFAULT gen_random_uuid()
  - tenant_id UUID NOT NULL FK tenants
  - vendor_id UUID NOT NULL FK vendors ON DELETE CASCADE
  - account_holder TEXT (nome do titular da conta)
  - bank_name TEXT (nome do banco por extenso)
  - bank_code TEXT (codigo ISPB ou compensacao, ex: 260 para Nubank)
  - agency TEXT (numero da agencia sem digito verificador)
  - account_number TEXT (numero da conta)
  - account_type TEXT CHECK IN (corrente, poupanca)
  - pix_key TEXT (chave PIX)
  - pix_key_type TEXT CHECK IN (cpf, cnpj, email, telefone, aleatoria)
  - is_primary BOOLEAN DEFAULT false (conta principal do vendor)
  - is_active BOOLEAN DEFAULT true
  - created_at TIMESTAMPTZ DEFAULT now()
  - updated_at TIMESTAMPTZ
  - deleted_at TIMESTAMPTZ
- [ ] CA-003.2: UNIQUE parcial em (vendor_id) WHERE is_primary = true AND deleted_at IS NULL
- [ ] CA-003.3: RLS com policy tenant_id = (SELECT get_tenant_id())
- [ ] CA-003.4: Trigger updated_at automatico
- [ ] CA-003.5: Migration idempotente

**Dependencias:** US-FIN-002 (vendors).

---
#### US-FIN-004 - Criar tabela cost_items (P0)

**Prioridade:** P0 | **Persona:** Financeiro, Produtor Executivo

**Como** financeiro, **quero** uma tabela que replique a granularidade da aba CUSTOS_REAIS,
**para** ter rastreabilidade completa de cada item do orcamento ao pagamento no ELLAHOS.

**Contexto:** Cada job tem 140-161 linhas de custo com 41 colunas. A tabela existente
 (Fase 4) e simplificada.  e o controle operacional completo.

**Criterios de aceite:**
- [ ] CA-004.1: Tabela cost_items com grupos de colunas:

  Identificacao e hierarquia:
  - id UUID PK DEFAULT gen_random_uuid()
  - tenant_id UUID NOT NULL FK tenants
  - job_id UUID FK jobs(id) NULLABLE (custos fixos da produtora nao tem job)
  - item_number SMALLINT NOT NULL (grupo de custo 1-15 e 99)
  - sub_item_number SMALLINT NOT NULL DEFAULT 0 (SubItem=0 e titulo da categoria)
  - is_category_header BOOLEAN GENERATED ALWAYS AS (sub_item_number = 0) STORED
  - service_description TEXT NOT NULL (Destino da Verba da planilha)
  - sort_order SMALLINT DEFAULT 0
  - period_month DATE (preenchido quando job_id IS NULL - custos fixos por mes)
  - import_source TEXT (identifica registros importados via migracao)

  Valores:
  - unit_value NUMERIC(12,2) (valor unitario)
  - quantity SMALLINT DEFAULT 1 (quantidade ou numero de diarias)
  - total_value NUMERIC(12,2) GENERATED AS (COALESCE(unit_value,0)*COALESCE(quantity,1)) STORED
  - overtime_hours NUMERIC(5,2) (horas extras - raramente usado)
  - overtime_rate NUMERIC(12,2) (valor por hora extra)
  - overtime_value NUMERIC(12,2) GENERATED (overtime_hours * overtime_rate) STORED
  - total_with_overtime NUMERIC(12,2) GENERATED (total_value + overtime_value) STORED
  - actual_paid_value NUMERIC(12,2) (valor real pago se difere do estimado)
  - value_divergence BOOLEAN GENERATED AS (actual_paid_value IS NOT NULL AND actual_paid_value \!= total_value) STORED
  - notes TEXT (campo livre)

  Condicao de pagamento (preenchida pelo produtor):
  - payment_condition TEXT CHECK IN (a_vista, cnf_30, cnf_40, cnf_45, cnf_60, cnf_90, snf_30)
  - payment_due_date DATE (definida pelo financeiro manualmente - nao calculada automaticamente)
  - payment_method TEXT CHECK IN (pix, ted, dinheiro, debito, credito, outro)

  Vendor snapshot (nao afetado por edicoes futuras do vendor):
  - vendor_id UUID FK vendors(id)
  - vendor_name_snapshot TEXT
  - vendor_email_snapshot TEXT
  - vendor_pix_snapshot TEXT
  - vendor_bank_snapshot TEXT

  Status do item:
  - item_status TEXT CHECK IN (orcado, aguardando_nf, nf_pedida, nf_recebida, nf_aprovada, pago, cancelado) DEFAULT orcado
  - suggested_status TEXT (calculado por trigger)
  - status_note TEXT (nota quando financeiro diverge do status sugerido)

  Ciclo de NF (campos atualizados pela Edge Function nf-processor da Fase 9):
  - nf_request_status TEXT CHECK IN (nao_aplicavel, pendente, pedido, recebido, rejeitado, aprovado) DEFAULT pendente
  - nf_requested_at TIMESTAMPTZ
  - nf_requested_by UUID FK profiles(id)
  - nf_document_id UUID FK nf_documents(id) (NF vinculada - tabela da Fase 9)
  - nf_drive_url TEXT
  - nf_filename TEXT (nome canonico NF_{DATA}_J{job}_ID{id}_I{item}S{sub})
  - nf_extracted_value NUMERIC(12,2) (valor extraido pela IA)
  - nf_validation_ok BOOLEAN

  Pagamento:
  - payment_status TEXT CHECK IN (pendente, pago, cancelado) DEFAULT pendente
  - payment_date DATE (definida manualmente pelo financeiro)
  - payment_proof_url TEXT (link Drive do comprovante)
  - payment_proof_filename TEXT (nome canonico PGTO_{DATA}_J{job}_ID{id}...)

  Auditoria:
  - created_at TIMESTAMPTZ DEFAULT now()
  - updated_at TIMESTAMPTZ
  - deleted_at TIMESTAMPTZ
  - created_by UUID FK profiles(id)

- [ ] CA-004.2: Index em (tenant_id, job_id, item_number, sub_item_number)
- [ ] CA-004.3: Index em (tenant_id, payment_due_date) WHERE payment_status = pendente AND deleted_at IS NULL
- [ ] CA-004.4: Index em (tenant_id, vendor_id)
- [ ] CA-004.5: Index em (job_id, item_status)
- [ ] CA-004.6: RLS com policy tenant_id = (SELECT get_tenant_id())
- [ ] CA-004.7: Trigger updated_at automatico
- [ ] CA-004.8: Trigger trg_cost_items_suggested_status (AFTER INSERT OR UPDATE):
  - payment_status = pago => suggested = pago
  - nf_validation_ok = true => suggested = nf_aprovada
  - nf_request_status = recebido => suggested = nf_recebida
  - nf_requested_at IS NOT NULL => suggested = nf_pedida
  - payment_condition = a_vista => suggested = aguardando_nf
  - default => suggested = orcado
- [ ] CA-004.9: Migration idempotente (migration_019 ou posterior)

**Relacao com existente:** budget_items (Fase 4) permanece para orcamento simplificado.
cost_items e a tabela operacional completa. Coexistem sem conflito.

**Dependencias:** US-FIN-001, US-FIN-002.

---
#### US-FIN-005 - Criar tabela cash_advances (P1)

**Prioridade:** P1 | **Persona:** Financeiro, Produtor

**Como** financeiro, **quero** controlar os adiantamentos de verba entregues ao produtor,
**para** saber quanto foi depositado, quanto foi comprovado e qual e o saldo.

**Contexto:** A aba PRODUCAO da planilha GG_ controla verbas a vista: produtor recebe verba,
gasta durante a producao, guarda comprovantes, envia apos o job para prestacao de contas.

**Criterios de aceite:**
- [ ] CA-005.1: Tabela cash_advances com colunas:
  - id UUID PK, tenant_id UUID NOT NULL FK tenants
  - job_id UUID NOT NULL FK jobs (verbas sempre vinculadas a um job)
  - cost_item_id UUID FK cost_items (item Item=1 Desembolsos a Vista)
  - recipient_vendor_id UUID FK vendors, recipient_name TEXT NOT NULL
  - description TEXT NOT NULL
  - amount_authorized NUMERIC(12,2) NOT NULL
  - amount_deposited NUMERIC(12,2) DEFAULT 0
  - amount_documented NUMERIC(12,2) DEFAULT 0 (calculado por trigger)
  - balance NUMERIC(12,2) GENERATED AS (amount_deposited - amount_documented) STORED
  - status TEXT CHECK IN (aberta, encerrada, aprovada) DEFAULT aberta
  - drive_folder_url TEXT, notes TEXT
  - created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ
  - created_by UUID FK profiles(id)
- [ ] CA-005.2: RLS com policy tenant_id = (SELECT get_tenant_id())
- [ ] CA-005.3: Trigger updated_at automatico
- [ ] CA-005.4: Trigger que recalcula amount_documented como soma de expense_receipts
  WHERE status = aprovado AND cash_advance_id = id
- [ ] CA-005.5: Migration idempotente

**Dependencias:** US-FIN-004 (cost_items).

---

#### US-FIN-006 - Criar tabela expense_receipts (P1)

**Prioridade:** P1 | **Persona:** Produtor, Financeiro

**Como** produtor, **quero** submeter os comprovantes de gasto da verba recebida,
**para** prestar contas ao financeiro e comprovar que a verba foi bem utilizada.

**Criterios de aceite:**
- [ ] CA-006.1: Tabela expense_receipts com colunas:
  - id UUID PK, tenant_id UUID NOT NULL FK tenants
  - cash_advance_id UUID NOT NULL FK cash_advances ON DELETE CASCADE
  - job_id UUID NOT NULL FK jobs
  - amount NUMERIC(12,2) NOT NULL, description TEXT NOT NULL
  - receipt_type TEXT CHECK IN (nf, recibo, ticket, outros)
  - document_url TEXT, document_filename TEXT, expense_date DATE
  - status TEXT CHECK IN (pendente, aprovado, rejeitado) DEFAULT pendente
  - reviewed_by UUID FK profiles, reviewed_at TIMESTAMPTZ, review_note TEXT
  - created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ
  - created_by UUID FK profiles(id)
- [ ] CA-006.2: RLS com policy tenant_id = (SELECT get_tenant_id())
- [ ] CA-006.3: Trigger updated_at automatico
- [ ] CA-006.4: Trigger AFTER UPDATE em status: dispara recalculo de cash_advances.amount_documented
- [ ] CA-006.5: Migration idempotente

**Dependencias:** US-FIN-005 (cash_advances).

---

#### US-FIN-007 - Criar view calendario_pagamentos (P0)

**Prioridade:** P0 | **Persona:** Financeiro, CEO

**Como** financeiro, **quero** uma view que agrupe pagamentos por data de vencimento,
**para** ter a visao de fluxo de caixa que a aba CALENDARIO das planilhas GG_ oferecia.

**Criterios de aceite:**
- [ ] CA-007.1: View calendario_pagamentos agregando cost_items por payment_due_date e job_id:
  tenant_id, payment_due_date, job_id, job_code, job_title,
  total_budgeted, total_paid, total_pending,
  items_count, items_paid, items_pending,
  is_overdue BOOLEAN (payment_due_date < now() AND total_pending > 0)
- [ ] CA-007.2: Filtra WHERE deleted_at IS NULL AND is_category_header = false
- [ ] CA-007.3: SECURITY INVOKER (RLS das tabelas base se aplica)
- [ ] CA-007.4: Ordenada por payment_due_date ASC
- [ ] CA-007.5: CREATE OR REPLACE VIEW (idempotente)

---

#### US-FIN-008 - Criar view resumo_custos_job (P0)

**Prioridade:** P0 | **Persona:** Financeiro, CEO, Produtor Executivo

**Como** PE, **quero** uma view com totais por categoria para um job,
**para** ter o dashboard financeiro sem precisar consultar item por item.

**Criterios de aceite:**
- [ ] CA-008.1: View resumo_custos_job agregando cost_items por job_id e item_number:
  tenant_id, job_id, item_number, item_name,
  total_budgeted, total_paid, items_total, items_paid,
  items_pending_nf, items_with_nf_approved, pct_paid NUMERIC(5,2)
- [ ] CA-008.2: Inclui linha de sumario por job com item_number = NULL (totais gerais)
- [ ] CA-008.3: Filtra WHERE deleted_at IS NULL AND is_category_header = false
- [ ] CA-008.4: SECURITY INVOKER
- [ ] CA-008.5: CREATE OR REPLACE VIEW (idempotente)

---

#### US-FIN-009 - Adicionar campo budget_mode em jobs (P1)

**Prioridade:** P1 | **Persona:** Sistema

**Como** sistema, **quero** que a tabela jobs tenha campo budget_mode,
**para** registrar se o orcamento foi montado em modo bottom-up ou top-down.

**Criterios de aceite:**
- [ ] CA-009.1: Migration adiciona budget_mode TEXT CHECK IN (bottom_up, top_down) DEFAULT bottom_up na tabela jobs
- [ ] CA-009.2: ALTER TABLE ADD COLUMN IF NOT EXISTS (idempotente)
- [ ] CA-009.3: Jobs existentes recebem budget_mode = bottom_up como default

---

### 4.2 Bloco 2 - Backend (Edge Functions)

---

#### US-FIN-010 - Edge Function vendors: CRUD com dedup automatico (P0)

**Prioridade:** P0 | **Persona:** Financeiro

**Como** financeiro, **quero** criar e buscar vendors com dedup automatico,
**para** garantir que o mesmo fornecedor nao entre duplicado.

**Criterios de aceite:**
- [ ] CA-010.1: POST /vendors: normaliza full_name antes de inserir,
  retorna HTTP 409 se duplicata encontrada com dados do vendor existente,
  cria e retorna HTTP 201 se nao ha duplicata
- [ ] CA-010.2: GET /vendors: busca por nome, email, CPF ou CNPJ, retorna paginado
- [ ] CA-010.3: GET /vendors/:id: detalhe com bank_accounts
- [ ] CA-010.4: PATCH /vendors/:id: atualiza, revalida dedup ao alterar full_name
- [ ] CA-010.5: DELETE /vendors/:id: soft delete, bloqueia se vendor tem itens pendentes
- [ ] CA-010.6: POST /vendors/:id/merge: mescla duplicatas, reatribui cost_items e bank_accounts
- [ ] CA-010.7: GET /vendors/suggest: autocomplete, retorna ate 5 vendors similares
- [ ] CA-010.8: GET /vendors/banks: lista padronizada de bancos brasileiros (JSON estatico)
  Nubank=260, BB=1, Bradesco=237, Itau=341, Santander=33, CEF=104, Inter=77, C6=336
- [ ] CA-010.9: Autenticacao via getAuthContext() e tenant_id do JWT
- [ ] CA-010.10: Resposta padrao com data, meta, warnings e error

---

#### US-FIN-011 - Edge Function cost-items: CRUD completo (P0)

**Prioridade:** P0 | **Persona:** Financeiro, Produtor Executivo

**Como** produtor executivo, **quero** criar e editar itens de custo,
**para** que a tela replique o comportamento da planilha CUSTOS_REAIS.

**Criterios de aceite:**
- [ ] CA-011.1: POST /cost-items: valida job no tenant e item_number valido,
  copia snapshot do vendor ao informar vendor_id
- [ ] CA-011.2: GET /cost-items: lista hierarquica por job_id,
  ordenada por item_number, sub_item_number, sort_order,
  inclui vendor e bank_account primario,
  suporta filtros: item_number, payment_status, nf_request_status, periodo
- [ ] CA-011.3: GET /cost-items/:id: detalhe com vendor e invoice vinculada
- [ ] CA-011.4: PATCH /cost-items/:id: aceita campos parciais,
  recalcula snapshots ao alterar vendor_id,
  cria entrada em job_history com event_type = financial_update
- [ ] CA-011.5: DELETE /cost-items/:id: soft delete, bloqueia se payment_status = pago
- [ ] CA-011.6: POST /cost-items/batch: ate 200 itens em transacao atomica
- [ ] CA-011.7: POST /cost-items/:id/copy-to-job: copia item para outro job

---

#### US-FIN-012 - Edge Function payment-manager: registrar pagamento (P0)

**Prioridade:** P0 | **Persona:** Financeiro

**Como** financeiro, **quero** registrar pagamentos com data e comprovante,
**para** fechar o ciclo financeiro.

**Criterios de aceite:**
- [ ] CA-012.1: POST /payment-manager/pay (lote): cost_item_ids array, payment_date,
  payment_method, payment_proof_url, actual_paid_value opcional;
  gera payment_proof_filename canonico; cria payment_history e job_history
- [ ] CA-012.2: POST /payment-manager/undo-pay/:id: desfaz pagamento das ultimas 48h
- [ ] CA-012.3: GET /payment-manager/batch-preview: preview sem efetuar pagamento
- [ ] CA-012.4: Permissao: roles financeiro, admin, ceo

---

#### US-FIN-013 - Edge Function financial-dashboard: dashboard financeiro (P0)

**Prioridade:** P0 | **Persona:** Financeiro, CEO, Produtor Executivo

**Como** PE, **quero** ver o resumo financeiro em uma chamada,
**para** ter visao de margem, pagamentos e alertas.

**Criterios de aceite:**
- [ ] CA-013.1: GET /financial-dashboard/job/:job_id: summary, by_category,
  payment_calendar, overdue_items, pending_nf_requests, alerts
- [ ] CA-013.2: GET /financial-dashboard/tenant: consolidado com KPIs e fluxo de caixa
- [ ] CA-013.3: Cache de 5 minutos via report_snapshots existente

---

#### US-FIN-014 - Edge Function budget-manager: orcamento (P1)

**Prioridade:** P1 | **Persona:** Produtor Executivo, CEO

**Como** PE, **quero** montar orcamento bottom-up ou top-down,
**para** ter visao de margem em tempo real.

**Criterios de aceite:**
- [ ] CA-014.1: GET /budget-manager/job/:id/summary: totais e margens
- [ ] CA-014.2: PATCH /budget-manager/job/:id/mode: define budget_mode
- [ ] CA-014.3: PATCH /budget-manager/job/:id/financials: atualiza taxas via trigger existente
- [ ] CA-014.4: GET /budget-manager/job/:id/reference-jobs: jobs similares para referencia
- [ ] CA-014.5: POST /budget-manager/job/:id/apply-template: cria cost_items de template
- [ ] CA-014.6: Permissao para editar financials: roles pe, ceo, admin

---

#### US-FIN-015 - Edge Function cash-advances: gestao de verbas (P1)

**Prioridade:** P1 | **Persona:** Financeiro, Produtor

**Como** financeiro, **quero** controlar o ciclo de verbas a vista,
**para** substituir as abas PRODUCAO e DEPOSITOS das planilhas GG_.

**Criterios de aceite:**
- [ ] CA-015.1: POST /cash-advances: cria adiantamento
- [ ] CA-015.2: POST /cash-advances/:id/deposit: registra deposito
- [ ] CA-015.3: GET /cash-advances: lista com expense_receipts e saldo
- [ ] CA-015.4: POST /cash-advances/:id/receipts: submete comprovante (pendente),
  notifica financeiro via notifications (Fase 5)
- [ ] CA-015.5: PATCH /cash-advances/:id/receipts/:rid: aprova ou rejeita,
  trigger recalcula amount_documented, notifica produtor
- [ ] CA-015.6: POST /cash-advances/:id/close: encerra, valida balance ~= 0
- [ ] CA-015.7: Permissao submit: produtor, financeiro, admin
- [ ] CA-015.8: Permissao aprovar: financeiro, admin, ceo

---

#### US-FIN-016 - Integracao cost-items com ciclo NF da Fase 9 (P0)

**Prioridade:** P0 | **Persona:** Sistema

**Como** sistema, **quero** que o ciclo de NF da Fase 9 atualize cost_items,
**para** ter o status de NF sincronizado em tempo real.

**Criterios de aceite:**
- [ ] CA-016.1: nf-processor (Fase 9) alem de invoices tambem atualiza cost_items:
  nf_request_status = recebido, nf_document_id, nf_drive_url, nf_extracted_value, nf_validation_ok
- [ ] CA-016.2: Ao enviar pedido de NF: cost_items.nf_request_status = pedido, nf_requested_at
- [ ] CA-016.3: Ao aprovar NF: nf_request_status = aprovado, item_status = nf_aprovada
- [ ] CA-016.4: Trigger suggested_status recalculado a cada mudanca

---
### 4.3 Bloco 3 - Frontend

---

#### US-FIN-020 - Tela de custos do job: lista hierarquica (P0)

**Prioridade:** P0 | **Persona:** Financeiro, Produtor Executivo

**Como** financeiro, **quero** uma tela que replique a visao da aba CUSTOS_REAIS,
**para** ver todos os 140-161 itens agrupados por categoria com status em tempo real.

**Criterios de aceite:**
- [ ] CA-020.1: Rota /jobs/[id]/financeiro/custos, acessivel pelo role financeiro, pe, ceo, admin
- [ ] CA-020.2: Tabela hierarquica com grupos expansiveis por item_number;
  linha de header da categoria (is_category_header=true) em destaque visual;
  colunas: SubItem, Descricao, Vendor, Condicao, Vencimento, Valor Estimado, Valor Pago, Status, Acoes
- [ ] CA-020.3: Status de cada item com badge colorido:
  orcado=cinza, aguardando_nf=amarelo, nf_pedida=laranja, nf_recebida=azul,
  nf_aprovada=verde-claro, pago=verde, cancelado=vermelho
- [ ] CA-020.4: Quando suggested_status difere de item_status, mostrar icone de alerta com tooltip
  explicando a sugestao do sistema
- [ ] CA-020.5: Filtros: por item_number (categoria), por payment_status, por nf_request_status,
  por vencimento (range de datas), por vendor
- [ ] CA-020.6: Busca em tempo real por service_description ou vendor_name
- [ ] CA-020.7: Acao rapida por linha: editar, marcar como pago, pedido de NF, ver comprovante
- [ ] CA-020.8: Linha de totais por categoria: total orcado, total pago, % pago
- [ ] CA-020.9: Linha de totalizadores gerais no rodape da tabela
- [ ] CA-020.10: Botao Adicionar Item abre drawer de criacao (ver US-FIN-021)
- [ ] CA-020.11: Botao Exportar CSV exporta a visao atual filtrada
- [ ] CA-020.12: Realtime via Supabase: status atualizado sem refresh ao receber NF

---

#### US-FIN-021 - Drawer de criacao e edicao de item de custo (P0)

**Prioridade:** P0 | **Persona:** Financeiro, Produtor Executivo

**Como** financeiro, **quero** criar e editar itens de custo sem sair da tela principal,
**para** manter o contexto da lista enquanto trabalho.

**Criterios de aceite:**
- [ ] CA-021.1: Drawer lateral (Sheet do shadcn/ui) abre ao clicar em Adicionar ou editar item
- [ ] CA-021.2: Campos obrigatorios: item_number (dropdown de categorias), service_description
- [ ] CA-021.3: Campos opcionais: unit_value, quantity, payment_condition, payment_due_date,
  payment_method, notes
- [ ] CA-021.4: Campo Vendor: autocomplete que busca GET /vendors/suggest enquanto usuario digita,
  ao selecionar preenche vendor_name_snapshot, vendor_email_snapshot, vendor_pix_snapshot
- [ ] CA-021.5: Validacao em tempo real: vencimento nao pode ser no passado para novos itens
- [ ] CA-021.6: Ao salvar, lista principal atualiza via Realtime (nao precisa de reload manual)
- [ ] CA-021.7: Botao Duplicar cria copia do item com campos zerados (valor e status)
- [ ] CA-021.8: Financeiro pode editar item_status manualmente com campo status_note obrigatorio
  quando diverge do suggested_status

---

#### US-FIN-022 - Tela de calendario de pagamentos (P0)

**Prioridade:** P0 | **Persona:** Financeiro, CEO

**Como** financeiro, **quero** ver pagamentos agrupados por data,
**para** planejar o fluxo de caixa da proxima semana e mes.

**Criterios de aceite:**
- [ ] CA-022.1: Rota /financeiro/calendario acessivel por financeiro, ceo, admin
- [ ] CA-022.2: Visao padrao: proximos 30 dias com grupos por data de vencimento
- [ ] CA-022.3: Cada grupo mostra: data, job(s), total pendente, total pago, indicador overdue
- [ ] CA-022.4: Linha overdue (vencimento < hoje, status pendente) destacada em vermelho
- [ ] CA-022.5: Ao clicar em um grupo, expande e mostra os cost_items individuais com vendor e valor
- [ ] CA-022.6: Filtro por job especifico ou ver todos os jobs
- [ ] CA-022.7: Filtro de periodo: proximos 7d, 15d, 30d, 60d, ou range customizado
- [ ] CA-022.8: Botao Pagar em Lote: seleciona multiplos itens e abre modal de pagamento em lote
- [ ] CA-022.9: Totalizadores no header: total a vencer (30d), total vencido, total pago no mes

---
#### US-FIN-023 - Tela de cadastro e busca de vendors (P0)

**Prioridade:** P0 | **Persona:** Financeiro

**Como** financeiro, **quero** buscar, cadastrar e corrigir duplicatas de vendors,
**para** manter o cadastro de fornecedores limpo e confivel.

**Criterios de aceite:**
- [ ] CA-023.1: Rota /financeiro/vendors acessivel por financeiro, ceo, admin
- [ ] CA-023.2: Lista paginada de vendors com busca por nome, email, CPF ou CNPJ
- [ ] CA-023.3: Badge de duplicatas suspeitas: sistema destaca vendors com normalized_name similar
- [ ] CA-023.4: Formulario de novo vendor: full_name, entity_type, cpf/cnpj, email, notes
  ao submeter chama POST /vendors; se retornar 409 mostra painel de conflito com vendor existente
- [ ] CA-023.5: Painel de conflito: mostra dados do vendor existente lado a lado com o novo,
  opcoes: Usar existente, Atualizar existente, Criar mesmo assim (requer justificativa)
- [ ] CA-023.6: Tela de detalhe do vendor: dados + lista de bank_accounts + cost_items vinculados
- [ ] CA-023.7: Gerenciamento de bank_accounts: adicionar, editar, definir como principal, remover
  dropdown de banco usa lista padronizada de GET /vendors/banks
- [ ] CA-023.8: Acao Mesclar Duplicatas: seleciona 2+ vendors, escolhe o vendor principal,
  preview mostra o que sera reatribuido, confirma e chama POST /vendors/:id/merge

---

#### US-FIN-024 - Modal de pagamento (P0)

**Prioridade:** P0 | **Persona:** Financeiro

**Como** financeiro, **quero** registrar pagamentos de forma rapida com comprovante,
**para** fechar o ciclo financeiro sem sair do contexto que estou.

**Criterios de aceite:**
- [ ] CA-024.1: Modal abre ao clicar em Pagar em qualquer tela (custos do job ou calendario)
- [ ] CA-024.2: Mostra lista dos itens selecionados com vendor, condicao, valor e status de NF
- [ ] CA-024.3: Campos do pagamento: data (obrigatorio, default hoje), metodo (obrigatorio),
  valor real pago (opcional, se difere do estimado), link comprovante Drive (opcional)
- [ ] CA-024.4: Botao Preview mostra POST /payment-manager/batch-preview antes de confirmar
- [ ] CA-024.5: Botao Confirmar executa POST /payment-manager/pay
- [ ] CA-024.6: Sucesso: toast de confirmacao, lista atualiza via Realtime
- [ ] CA-024.7: Campos de valor real e comprovante opcionais - financeiro pode adicionar depois

---

#### US-FIN-025 - Dashboard financeiro do job (P0)

**Prioridade:** P0 | **Persona:** CEO, Produtor Executivo, Financeiro

**Como** CEO, **quero** ver o dashboard financeiro do job em uma tela,
**para** tomar decisoes rapidas sobre o status do job sem abrir a planilha.

**Criterios de aceite:**
- [ ] CA-025.1: Rota /jobs/[id]/financeiro/dashboard acessivel por financeiro, pe, ceo, admin
- [ ] CA-025.2: Cards de KPIs no topo: OC (faturamento aprovado), Total Estimado, Total Pago,
  Saldo, Margem Bruta (%), Status Geral do job
- [ ] CA-025.3: Grafico de barras por categoria: orcado vs pago
- [ ] CA-025.4: Alertas destacados: itens vencidos sem pagamento, NFs pedidas ha mais de 7 dias
  sem resposta, itens com value_divergence, verbas a vista com saldo negativo
- [ ] CA-025.5: Tabela de resumo por categoria com totais (de resumo_custos_job)
- [ ] CA-025.6: Secao de proximos pagamentos: proximos 15 dias via calendario_pagamentos
- [ ] CA-025.7: Botao Orcamento abre formulario de edicao das financials do job (US-FIN-026)

---

#### US-FIN-026 - Formulario de orcamento (P1)

**Prioridade:** P1 | **Persona:** Produtor Executivo, CEO

**Como** PE, **quero** definir o orcamento do job em modo bottom-up ou top-down,
**para** ter controle sobre margem e aprovar com o CEO antes de executar.

**Criterios de aceite:**
- [ ] CA-026.1: Rota /jobs/[id]/financeiro/orcamento acessivel por pe, ceo, admin
- [ ] CA-026.2: Toggle de modo: Bottom-up (padrao) ou Top-down
- [ ] CA-026.3: Bottom-up: campos tax_rate, agency_fee_pct, production_markup;
  sistema calcula gross_profit e margin_percentage em tempo real enquanto PE digita
- [ ] CA-026.4: Top-down: campo budget_ceiling (teto do cliente); sistema mostra quanto sobra
  enquanto PE adiciona itens em cost_items
- [ ] CA-026.5: Secao Aplicar Template: dropdown de tipo de producao, clique em Aplicar Template
  chama POST /budget-manager/job/:id/apply-template e cria cost_items da categoria
- [ ] CA-026.6: Jobs de referencia: busca jobs similares do mesmo project_type para consulta
- [ ] CA-026.7: Historico de orcamento: lista de versoes anteriores com data e autor

---
#### US-FIN-027 - Tela de verbas a vista (P1)

**Prioridade:** P1 | **Persona:** Financeiro, Produtor

**Como** financeiro, **quero** controlar o ciclo completo de verbas a vista,
**para** substituir as abas PRODUCAO e DEPOSITOS das planilhas GG_.

**Criterios de aceite:**
- [ ] CA-027.1: Rota /jobs/[id]/financeiro/verbas acessivel por financeiro, produtor (do job), admin
- [ ] CA-027.2: Lista de cash_advances com: recipiente, valor autorizado, depositado, comprovado,
  saldo, status (aberta/encerrada/aprovada)
- [ ] CA-027.3: Saldo negativo destacado em vermelho (mais gasto do que depositado)
- [ ] CA-027.4: Botao Novo Adiantamento: cria cash_advance e vincula a cost_item (Item 1)
- [ ] CA-027.5: Ao expandir um adiantamento: lista expense_receipts com status individual
- [ ] CA-027.6: Botao Submeter Comprovante (role produtor): upload de arquivo ou link Drive,
  chama POST /cash-advances/:id/receipts, notifica financeiro
- [ ] CA-027.7: Botoes Aprovar / Rejeitar (role financeiro): atualiza status do receipt,
  trigger recalcula amount_documented e balance automaticamente
- [ ] CA-027.8: Botao Encerrar Verba (role financeiro): valida balance ~= 0, confirma encerramento

---

#### US-FIN-028 - Tela de gerenciamento de templates de categorias (P2)

**Prioridade:** P2 | **Persona:** Admin

**Como** admin, **quero** editar o template de categorias de custo,
**para** adaptar a estrutura quando a produtora criar um novo tipo de producao.

**Criterios de aceite:**
- [ ] CA-028.1: Rota /admin/financeiro/categorias acessivel somente por admin
- [ ] CA-028.2: Lista de categorias por production_type com item_number, display_name, is_active
- [ ] CA-028.3: Adicionar, editar, reordenar e desativar categorias
- [ ] CA-028.4: Desativar categoria bloqueia criacao de novos cost_items nessa categoria
  (nao afeta itens existentes)
- [ ] CA-028.5: Botao Duplicar Template cria copia de um production_type para outro

---

### 4.4 Bloco 4 - Migracao

---

#### US-FIN-030 - Script de importacao das planilhas GG_ (P2)

**Prioridade:** P2 | **Persona:** Admin

**Como** admin, **quero** importar os historicos das planilhas GG_ para o ELLAHOS,
**para** ter todos os dados operacionais na plataforma desde o primeiro dia.

**Contexto:** Estimativa de 38+ jobs historicos. Cada job tem CSV da aba CUSTOS_REAIS
com 140-161 linhas e 41 colunas.

**Criterios de aceite:**
- [ ] CA-030.1: Script Python scripts/migration/import_job_finances.py
  aceita path de CSV e job_code como argumentos
- [ ] CA-030.2: Parser para as 41 colunas da CUSTOS_REAIS mapeadas em analise-custos-reais-detalhada.md
- [ ] CA-030.3: Para cada linha: identifica item_number e sub_item_number pelo padrao da planilha,
  mapeia colunas para cost_items, usa Edge Function POST /cost-items/batch
- [ ] CA-030.4: Para cada vendor encontrado: chama POST /vendors/suggest,
  se similaridade > 0.8 usa vendor existente, senao cria novo
- [ ] CA-030.5: Log detalhado de cada linha: OK, SKIPPED (header), VENDOR_CREATED, VENDOR_REUSED
- [ ] CA-030.6: Modo dry-run: mostra o que sera importado sem persistir
- [ ] CA-030.7: Idempotente: reimportar o mesmo CSV nao cria duplicatas (verifica import_source)

---

#### US-FIN-031 - Script de dedup e normalizacao de vendors na migracao (P2)

**Prioridade:** P2 | **Persona:** Admin

**Como** admin, **quero** um script que identifique e resolva duplicatas de vendors
ao importar as planilhas historicas,
**para** nao trazer a bagunca da planilha EQUIPE para o ELLAHOS.

**Criterios de aceite:**
- [ ] CA-031.1: Script scripts/migration/dedup_vendors.py processa CSV da aba EQUIPE
- [ ] CA-031.2: Normaliza cada nome: lowercase + trim + remocao de acentos (unidecode)
- [ ] CA-031.3: Agrupa por nome normalizado e mostra clusters de possiveis duplicatas
- [ ] CA-031.4: Modo interativo: para cada cluster, propoe vendor principal e lista aliases,
  admin confirma ou ajusta
- [ ] CA-031.5: Gera arquivo YAML de mapeamento aliases => vendor_id para uso pelo import_job_finances.py
- [ ] CA-031.6: Valida CPF/CNPJ (algoritmo de digito verificador)
- [ ] CA-031.7: Documenta em notes o historico de aliases encontrados durante a migracao

---

#### US-FIN-032 - Importar EQUIPE.csv para vendors (P2)

**Prioridade:** P2 | **Persona:** Admin

**Como** admin, **quero** importar a planilha EQUIPE.csv como ponto de partida do cadastro,
**para** ter os 210 fornecedores ativos sem redigitar tudo.

**Criterios de aceite:**
- [ ] CA-032.1: Script scripts/migration/import_equipe.py aceita path do CSV
- [ ] CA-032.2: Aplica dedup automatico via normalized_name antes de inserir
- [ ] CA-032.3: Extrai banco, agencia e conta do campo banco (texto livre da planilha)
  usando regex e tabela de normalizacao (Nubank=>260, Itau=>341 etc.)
- [ ] CA-032.4: Cria bank_accounts com is_primary=true para cada vendor importado
- [ ] CA-032.5: Tenta identificar pix_key_type: se numerico com 11 digitos => CPF,
  14 digitos => CNPJ, contem @ => email, padrao UUID => aleatoria
- [ ] CA-032.6: Campos nao parseados ficam em notes para revisao manual
- [ ] CA-032.7: Relatorio final: X vendors criados, Y duplicatas mescladas, Z para revisao manual

---

#### US-FIN-033 - Documentar processo de migracao (P2)

**Prioridade:** P2 | **Persona:** Admin

**Como** admin, **quero** um guia de migracao documentado,
**para** executar a importacao de todos os jobs historicos de forma ordenada.

**Criterios de aceite:**
- [ ] CA-033.1: Arquivo docs/migration/fase-10-guia-migracao.md criado
- [ ] CA-033.2: Passo a passo: pre-requisitos, ordem de execucao dos scripts,
  como validar resultado, como reverter se necessario
- [ ] CA-033.3: Tabela de jobs a migrar: job_code, status atual na planilha, responsavel por validar
- [ ] CA-033.4: Criterios de aceite da migracao: 100% das linhas importadas,
  zero vendors duplicados, todos os campos criticos populados

---
## 5. Regras de Negocio

### RN-001 - Normalizacao de vendors para dedup

Antes de comparar ou inserir um vendor, o sistema SEMPRE normaliza o full_name:
1. Converter para lowercase
2. Remover espacos extras (trim)
3. Remover acentos (unaccent extension do PostgreSQL)
4. Remover caracteres especiais exceto espacos e hifens

Exemplos: NUBANK SA => nubank sa, Nubank S.A. => nubank sa, nu bank => nu bank

A coluna normalized_name e GENERATED ALWAYS e nao pode ser editada diretamente.
A comparacao de dedup usa normalized_name = normalize(new_full_name).

---

### RN-002 - Ciclo de status de um item de custo

O item percorre os estados na ordem abaixo. O sistema sugere automaticamente via trigger.
O financeiro pode sobrescrever com status_note obrigatorio (exceto para pago).

orcado => aguardando_nf => nf_pedida => nf_recebida => nf_aprovada => pago

Regras de transicao:
- Para status = pago: obrigatorio informar payment_date
- Para pular de orcado para pago (a vista sem NF): permitido somente com payment_condition = a_vista
- Status cancelado: disponivel de qualquer estado, requer confirmacao do usuario
- Desfazer pagamento: somente nas ultimas 48h (CA-012.2)

---

### RN-003 - Snapshot de vendor no item de custo

Ao vincular um vendor_id em um cost_item, o sistema COPIA os dados do vendor para os campos
vendor_name_snapshot, vendor_email_snapshot, vendor_pix_snapshot, vendor_bank_snapshot.

Esses campos NAO sao atualizados automaticamente se o vendor for editado depois.
Isso e intencional: o historico financeiro deve refletir os dados no momento do registro.

O financeiro pode forcar atualizacao do snapshot ao fazer PATCH com vendor_id explicito.

---

### RN-004 - Nomenclatura canonica de arquivos

Todos os arquivos financeiros seguem o padrao:
- NF: NF_{YYYYMMDD}_J{job_code}_ID{cost_item_id[:8]}_I{item_number}S{sub_item_number}
- Comprovante de pagamento (item unico): PGTO_{YYYYMMDD}_J{job_code}_ID{cost_item_id[:8]}
- Comprovante de pagamento (lote): PGTO_{YYYYMMDD}_J{job_code}_IDS{count}_{hash[:6]}

Onde {hash} e o DJB2 dos cost_item_ids ordenados (mesma logica do wf-nf-processor Fase 9).

---

### RN-005 - Verbas a vista: saldo e fechamento

O saldo de uma verba a vista e calculado automaticamente:
  balance = amount_deposited - amount_documented

amount_documented e a soma de expense_receipts WHERE status = aprovado.

Para encerrar uma verba (status = encerrada):
- balance deve ser <= 0 (tudo comprovado ou devolvido)
- Se balance > 0: financeiro pode forcar encerramento com justificativa, gerando alerta

---

### RN-006 - Pagamento em lote

Multiplos cost_items podem ser pagos com o mesmo comprovante (mesmo transfer bancario).
O endpoint POST /payment-manager/pay aceita array de cost_item_ids.

O payment_proof_filename gerado para lotes segue o padrao de RN-004.
Cada item recebe seu propro payment_date e payment_proof_url.

---

### RN-007 - Permissoes por acao financeira

| Acao | financeiro | pe | produtor | ceo | admin |
|------|-----------|-----|---------|-----|-------|
| Ver cost_items do job | Sim | Sim | Sim (proprio) | Sim | Sim |
| Criar/editar cost_items | Sim | Sim | Nao | Sim | Sim |
| Registrar pagamento | Sim | Nao | Nao | Sim | Sim |
| Aprovar NF | Sim | Nao | Nao | Sim | Sim |
| Aprovar orcamento | Nao | Nao | Nao | Sim | Sim |
| Submeter comprovante de verba | Sim | Sim | Sim | Sim | Sim |
| Aprovar comprovante de verba | Sim | Nao | Nao | Sim | Sim |
| Executar migracao | Nao | Nao | Nao | Nao | Sim |

---

### RN-008 - Custos fixos da produtora

cost_items com job_id = NULL representam custos fixos da produtora (aluguel, SaaS, etc.).
Esses itens usam period_month para agrupar por mes.
Nao aparecem no dashboard de job.
Aparecem somente no relatorio consolidado do tenant (/financial-dashboard/tenant).

---

### RN-009 - Integridade referencial dos snapshots de vendor em pagamentos

Ao registrar um pagamento, o sistema registra em payment_history:
- vendor_name: vendor_name_snapshot (nao busca o vendor pelo id novamente)
- amount: actual_paid_value se preenchido, senao total_with_overtime
- proof_url: payment_proof_url

Isso garante que o historico de pagamentos nao mude mesmo se o vendor for editado ou excluido.

---

### RN-010 - Limite de tempo para desfazer pagamento

O endpoint POST /payment-manager/undo-pay/:id funciona somente se:
- payment_date >= now() - interval 48 hours
- Nenhum relatorio ou fechamento contabil foi gerado depois do pagamento

Apos 48h, desfazer exige role admin e cria entrada em job_history com justificativa.

---

### RN-011 - Cache do dashboard financeiro

GET /financial-dashboard usa cache de 5 minutos via tabela report_snapshots existente.
Qualquer PATCH ou POST em cost_items invalida o cache do job afetado.
O cache e por (tenant_id, job_id, report_type).

---

### RN-012 - Migracao: precedencia na resolucao de duplicatas

Durante a migracao de vendors, a resolucao de duplicatas segue esta ordem:
1. Se normalized_name match exato: usar vendor existente (nao criar)
2. Se CPF ou CNPJ match exato: usar vendor existente (nao criar)
3. Se email match exato: usar vendor existente (nao criar)
4. Se nenhum match: criar novo vendor com import_source = migracao

---
## 6. Integracao com Modulos Existentes

### 6.1 Integracao com Fase 9 (Automacoes de NF)

| Ponto de integracao | Descricao |
|---------------------|-----------|
| n8n wf-nf-processor | Ja testado E2E (commit 94e275b). Alem de atualizar invoices,
  deve passar a atualizar cost_items.nf_request_status (US-FIN-016) |
| n8n wf-nf-request | 4 fixes pendentes. Ao enviar pedido, atualiza cost_items.nf_requested_at |
| nf_documents | FK cost_items.nf_document_id referencia nf_documents(id) da Fase 9 |
| Ciclo de aprovacao de NF | Ao aprovar NF no frontend Fase 9, deve chamar PATCH /cost-items/:id
  para sincronizar nf_request_status = aprovado |

### 6.2 Integracao com tabela jobs

| Campo | Uso na Fase 10 |
|-------|---------------|
| jobs.id | FK em cost_items, cash_advances, expense_receipts |
| jobs.code | Usado no nome canonico de arquivos (J{code}) |
| jobs.project_type | Filtra templates de categorias em cost_categories |
| jobs.budget_mode | Campo novo adicionado em US-FIN-009 |
| jobs.budget_value | Valor OC (faturamento) para calculo de margem |
| jobs.tax_value | Imposto sobre o faturamento |
| jobs.gross_profit | Calculado por trigger existente |
| jobs.margin_percentage | Calculado por trigger existente |

### 6.3 Integracao com tabela people

A tabela vendors e independente de people mas pode ser vinculada via vendors.people_id FK.
Isso permite que fornecedores que tambem sao membros da equipe (freelancers) sejam
encontrados tanto no modulo Financeiro quanto no modulo Equipe.

Nao ha sincronizacao automatica entre vendors e people. A vinculacao e somente para navegacao.

### 6.4 Integracao com financial_records

financial_records (Fase 4) continua existindo para registros de alto nivel do job
(faturamento, impostos, margem). A Fase 10 NAO substitui financial_records.

cost_items complementa financial_records: um representa o faturamento do job,
o outro representa os custos detalhados de producao.

### 6.5 Integracao com job_history

Acoes financeiras criticas registram entrada em job_history:
- Registro de pagamento: event_type = payment_registered
- Aprovacao de NF: event_type = nf_approved
- Edicao de valor de item: event_type = financial_update
- Criacao de lote de cost_items (importacao): event_type = cost_items_imported

### 6.6 Integracao com notifications

| Evento | Notificacao | Destinatario |
|--------|-------------|--------------|
| Comprovante de verba submetido | in_app + email | financeiro do job |
| Comprovante de verba aprovado | in_app | produtor que submeteu |
| Comprovante de verba rejeitado | in_app + email | produtor que submeteu |
| Item com vencimento amanha | in_app | financeiro |
| Item vencido sem pagamento | in_app diario | financeiro |
| NF pedida ha mais de 7 dias sem resposta | in_app | financeiro |

---

## 7. Metricas de Sucesso

| Metrica | Baseline atual | Meta (6 meses) |
|---------|----------------|----------------|
| Tempo para registrar pagamento de um item | 5 min (planilha) | < 30 segundos |
| Taxa de vendors duplicados no cadastro | 40% (planilha EQUIPE) | < 2% |
| Itens com data de vencimento preenchida | 60% (planilha) | > 95% |
| Jobs com ciclo financeiro 100% no ELLAHOS | 0 | 100% dos novos jobs |
| Jobs historicos migrados | 0 | 100% (38+ jobs) |
| Tempo para ver dashboard financeiro de um job | 2 min (abrir planilha) | < 5 segundos |

---

## 8. Fora de Escopo (v1)

Os itens abaixo foram explicitamente excluidos da Fase 10.
Podem ser considerados para versoes futuras.

| Item | Justificativa |
|------|---------------|
| Emissao de NF propria (emitir NF para o cliente) | Complexidade tributaria alta, integrar depois |
| Integracao bancaria automatica (OFX/API banco) | Requer parceria com banco ou Open Finance |
| Boletos de cobranca | Fora do fluxo atual da Ellah Filmes |
| Integracao com ERP (SAP, TOTVS, etc.) | Fora do escopo SaaS v1 |
| Conciliacao automatica bancaria | Dependencia de integracao bancaria |
| Modulo fiscal completo (SPED, escrituracao) | Requer contador especializado |
| Parcelamentos e renegociacoes | Fora do fluxo atual |
| Aprovacao de orcamento com workflow multi-etapa | Aprovacao simples do CEO e suficiente para v1 |
| Relatorios PDF formatados | Exportacao CSV e suficiente para v1 |
| Portal do fornecedor para consulta de pagamentos | Fora do escopo do portal do cliente existente |
| Pagamentos em moeda estrangeira | Nao ha cases ativos ainda |

---
## 9. Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Migracao incompleta de dados historicos | Alta | Alto | Modo dry-run + validacao por job + rollback script |
| Dedup de vendors mesclar vendors incorretamente | Media | Alto | Threshold 0.8+, modo interativo, log detalhado, merge reversivel |
| Performance da tela de custos com 160 itens | Baixa | Medio | Virtualizacao de lista (react-virtual), paginacao por categoria |
| Conflito entre suggested_status e status manual | Media | Baixo | Campo status_note obrigatorio, interface clara distingue sugestao de status real |
| n8n wf-nf-request com 4 fixes pendentes bloquear US-FIN-016 | Alta | Medio | US-FIN-016 pode ser implementado independente; fixes sao pre-requisito de E2E |
| Planilhas historicas com formatos inconsistentes | Alta | Medio | Parser defensivo com fallback para notes, relatorio de campos nao parseados |
| RLS bloqueando views agregadas | Baixa | Alto | Views com SECURITY INVOKER herdando RLS das tabelas base, testar com role produtor |
| Supabase Storage vs Drive para comprovantes | Baixa | Baixo | v1 aceita somente link Drive (URL livre), Storage opcional em versao futura |

---

## 10. Perguntas Abertas

As questoes abaixo precisam de resposta do CEO antes da implementacao das user stories marcadas.

### P-FIN-001 (bloqueia US-FIN-026)

**Pergunta:** No modo top-down, o teto do cliente (budget_ceiling) e o valor da OC ou pode ser
diferente? Exemplo: cliente aprova OC de R$ 200k mas PE quer montar orcamento com teto de R$ 180k
para ter margem de seguranca.

**Opcoes:**
- (A) budget_ceiling = budget_value da jobs sempre
- (B) budget_ceiling e campo separado editavel independente do budget_value
- (C) PE define teto livre sem vinculo com OC

**Impacto se nao respondida:** US-FIN-026 implementa opcao A como padrao.

---

### P-FIN-002 (bloqueia US-FIN-028)

**Pergunta:** Templates de categorias sao por production_type (filme_publicitario, videoclipe etc.)
ou existe um template unico para todos os tipos?

**Opcoes:**
- (A) Um template unico all que se aplica a todos os tipos
- (B) Templates por production_type permitindo customizacao por tipo

**Impacto se nao respondida:** US-FIN-001 e US-FIN-028 implementam opcao B com seed usando
production_type = all para os 15 itens mapeados.

---

### P-FIN-003 (bloqueia US-FIN-030)

**Pergunta:** Os 38+ jobs historicos serao migrados todos de uma vez ou em grupos por ordem
cronologica (os mais recentes primeiro)?

**Impacto:** Afeta estrategia de rollback e validacao da migracao.
Recomendacao: comecar pelos 5 jobs mais recentes para validar o processo.

---

### P-FIN-004 (informativa)

**Pergunta:** A tabela budget_items da Fase 4 sera depreciada ou continuara sendo usada
para orcamentos simplificados (jobs novos pre-producao)?

**Opcoes:**
- (A) Depreciar budget_items, migrar para cost_items
- (B) Manter budget_items para estimativas rapidas, usar cost_items somente em jobs em producao

**Impacto se nao respondida:** Fase 10 mantem os dois sem conflito (premissa 1.2).
Decisao de depreciacao pode ser tomada na Fase 11.

---

### P-FIN-005 (bloqueia US-FIN-022)

**Pergunta:** O calendario de pagamentos deve mostrar jobs de todos os clientes juntos
(visao consolidada da produtora) ou separados por job como tab?

**Opcoes:**
- (A) Visao consolidada com filtro opcional por job (CA-022.6)
- (B) Uma aba por job ativo no periodo

**Impacto se nao respondida:** US-FIN-022 implementa opcao A (mais util para fluxo de caixa).

---

*Spec gerada pelo PM do ELLAHOS com base nas planilhas GG_033 e GG_038,
nas respostas do CEO (26/02/2026) e no inventario tecnico de 26/02/2026.*
