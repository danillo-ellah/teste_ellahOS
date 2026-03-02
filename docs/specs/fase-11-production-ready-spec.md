# Fase 11 — Production Ready: Gap Analysis & Execution Plan

**Data:** 2026-03-02
**Objetivo:** Implementar TUDO que falta para cortar a produção atual (Google Sheets + Apps Script) e operar 100% pelo ELLAHOS.
**Visão:** Sistema vendável como SaaS para outras produtoras audiovisuais brasileiras.

---

## Contexto Estratégico

### Multi-tenant como produto
O ELLAHOS já é multi-tenant (RLS por `tenant_id`). Toda feature nova DEVE ser tenant-aware:
- Configurações por tenant (templates, logos, CNPJ, integrações)
- Dados isolados por tenant
- Onboarding self-service (futuro)
- Cada produtora "pluga" suas credenciais (Drive, DocuSeal, WhatsApp, Gmail)

### Preparação para Fase 12 (LangGraph Multi-Agent)
Toda feature deve expor dados via Edge Functions com endpoints claros para que os agentes AI (Ellaih) possam:
- Consultar dados (GET)
- Executar ações (POST)
- Receber contexto estruturado para decisões

---

## TIER 1 — Bloqueadores de Produção (sem isso não corta)

### T1.1 — Geração de Claquete (PDF + PNG)

**Substitui:** Apps Script `gerarClaqueteInterface` + Google Slides template

**O que é:** Documento regulatório ANCINE obrigatório no set de filmagem para obras veiculadas em TV aberta. Contém: título, duração, produto, anunciante, agência, diretor, tipo, segmento, CRT (número ANCINE), produtora, CNPJ, produtora de áudio, ano, closed caption, tecla SAP, libras.

**Implementação:**
- **DB:** Tabela `claquetes` (job_id, campos do template, pdf_url, png_url, created_by, version)
- **Edge Function:** `claquete-generator` com handlers:
  - `create.ts` — Cria registro + gera PDF/PNG via template HTML→PDF (sem depender de Google Slides)
  - `list.ts` — Lista claquetes do job
  - `get.ts` — Retorna uma claquete
  - `update.ts` — Edita campos e regenera PDF/PNG
  - `delete.ts` — Soft delete
- **Template:** HTML/CSS que replica o layout da claquete (fundo rosa, borda, logo Ellah). Renderizado server-side para PDF (via Deno `puppeteer` ou template SVG→PNG)
- **Frontend:**
  - Aba "Claquete" no job detail
  - Form com campos pré-preenchidos do job (título, cliente, agência, diretor já vêm do job)
  - Preview visual do documento
  - Botões "Gerar PDF", "Gerar PNG", "Download"
  - Histórico de versões
- **Drive:** Upload automático para pasta `03_PRODUCAO/` do job
- **Campos novos no `jobs`:** `ancine_crt` (string, número CRT), `audio_company` (string), `media_type` (enum: tv_aberta, tv_fechada, digital, cinema, todos)
- **Multi-tenant:** Template customizável por tenant (logo, CNPJ, razão social)

**Dados de referência:** `docs/specs/claquete_exemplo/CADASTRO_CLAQUETE - DADOS.csv` e `CLAQUETE.jpg`

**Critério de aceite:**
- Financeiro/Produção cria claquete preenchendo só os campos específicos (CRT, áudio, etc.)
- Dados do job (título, cliente, agência, diretor) vêm automaticamente
- PDF e PNG gerados e salvos no Drive
- Versioning (v1, v2, v3)

---

### T1.2 — Aprovação Interna (PDF)

**Substitui:** Documento manual em Google Docs

**O que é:** Documento formal que formaliza o fechamento do job internamente antes de iniciar a produção. Enviado aos sócios/aprovadores para aprovação.

**Implementação:**
- **Edge Function:** `approval-pdf` (já existe handler `aprovacao-interna.ts` no `pdf-generator` — estender)
- **Dados do PDF:**
  - Cliente: razão social, CNPJ, endereço
  - Job: código, nome, título, campanha, diretor, PE
  - Técnico: secundagem, peças, diárias, datas de filmagem
  - Elenco: lista com nomes e funções
  - Produtora de som
  - Período de veiculação e mídias
  - Formato, legendagem, CG
  - Modelo de contrato
  - Valor fechado e condições
- **Frontend:**
  - Botão "Gerar Aprovação Interna" no job detail (aba Documentos ou ação no header)
  - Preview do documento antes de gerar
  - Campos editáveis para dados que não estão no job (período de veiculação, CG, etc.)
  - Histórico de aprovações com status (pendente, aprovado, rejeitado)
- **Workflow:**
  1. PE/Atendimento gera o documento
  2. PDF salvo na pasta `09_ATENDIMENTO/01_PRE_PRODUCAO/01_APROVACAO_INTERNA/` do job no Drive
  3. Notificação in-app + email para aprovadores
  4. Aprovadores aprovam/rejeitam (com comentários)
  5. Status do job pode avançar após aprovação

**Critério de aceite:**
- PDF gerado com todos os dados do job preenchidos automaticamente
- Upload automático no Drive
- Fluxo de aprovação com notificação

---

### T1.3 — Lookup Automático de Fornecedor

**Substitui:** VLOOKUP da aba EQUIPE no GG_

**O que é:** Ao criar/editar um item de custo, quando o usuário seleciona o fornecedor (vendor), o sistema carrega automaticamente email, dados bancários (banco, agência, conta, PIX).

**Implementação:**
- **Frontend:** No `CostItemDrawer`, ao selecionar vendor:
  - Carregar dados bancários via `vendors/{id}` (já existe handler `get.ts`)
  - Preencher campos de dados bancários automaticamente
  - Mostrar dados bancários do vendor selecionado (read-only ou editável)
- **Edge Function:** Endpoint `vendors/{id}/bank-accounts` (handler `bank-accounts-list.ts` já existe)
- **UX:**
  - Combobox de vendor com busca (já existe `VendorSelector.tsx`)
  - Ao selecionar, seção "Dados Bancários" aparece preenchida
  - Se vendor não tem dados bancários → alerta "Fornecedor sem dados bancários cadastrados"

**Critério de aceite:**
- Selecionar vendor preenche dados bancários automaticamente
- Dados visíveis no drawer do item de custo

---

### T1.4 — Condição de Pagamento com Cálculo Automático de Vencimento

**Substitui:** Fórmula `start_do_job + prazo` na planilha GG_

**O que é:** Campo de condição de pagamento (C/NF 30, 40, 45, 60 dias, à vista) que calcula automaticamente a data de vencimento.

**Implementação:**
- **DB:** Campo `payment_condition` já existe em `cost_items`. Adicionar ENUM ou check constraint: `a_vista`, `cnf_30`, `cnf_40`, `cnf_45`, `cnf_60`, `custom`
- **Edge Function:** No handler `create.ts` e `update.ts` do `cost-items`:
  - Se `payment_condition` preenchido e `payment_due_date` vazio → calcular automaticamente
  - Base: `job.start_date` + prazo em dias
  - Se `payment_condition = 'a_vista'` → `payment_due_date = job.start_date`
  - Usuário pode sobrescrever o cálculo (campo editável)
- **Frontend:**
  - Dropdown de condição de pagamento
  - Data de vencimento calculada automaticamente (mas editável)
  - Indicador visual "calculado automaticamente" vs "manual"

**Critério de aceite:**
- Ao selecionar "C/NF 30 dias", data de vencimento = start do job + 30 dias
- Usuário pode editar a data manualmente
- Cálculo funciona para 30, 40, 45 e 60 dias

---

### T1.5 — Portal do Fornecedor (Auto-cadastro)

**Substitui:** Google Forms para cadastro de equipe/freelancers

**O que é:** Link público que o fornecedor/freelancer acessa para preencher seus dados pessoais e bancários.

**Implementação:**
- **DB:**
  - Tabela `vendor_invite_tokens` (id, tenant_id, vendor_id, token UUID, job_id nullable, expires_at, used_at)
  - Campos estruturados em `vendors`: cpf_cnpj (já existe), rg, birth_date, address_* (street, number, complement, neighborhood, city, state, zip)
  - Tabela `bank_accounts` já existe
- **Edge Function:** `vendor-portal` com handlers:
  - `get-by-token.ts` — Retorna dados do vendor pelo token (sem auth)
  - `update-by-token.ts` — Vendor atualiza seus dados (sem auth, validação por token)
  - `create-invite.ts` — Admin cria convite (com auth)
  - `list-invites.ts` — Lista convites pendentes
- **Frontend:**
  - Rota pública `/vendor/[token]` — Form de auto-cadastro
  - Campos: nome, CPF/CNPJ, RG, data nascimento, endereço completo, dados bancários (banco dropdown, agência, conta, tipo PIX, chave PIX), email, telefone
  - Pergunta "Já trabalhou com a produtora?" → Se sim, pré-preenche dados existentes
  - Tela de confirmação com resumo dos dados
  - Admin: botão "Enviar convite" na página de vendors e no job team

**Critério de aceite:**
- Fornecedor recebe link, preenche dados, dados salvos no ELLAHOS
- Admin pode gerar link por vendor ou em lote (para equipe do job)
- Dados bancários estruturados (não JSONB livre)

---

### T1.6 — Controle de Verbas à Vista (Cash Advances)

**Substitui:** Aba DEPOSITOS + PRODUCAO da planilha GG_

**O que é:** Controle de adiantamentos de verba para o produtor comprar materiais à vista no set (arte, figurino, objetos de cena).

**Implementação:**
- **DB:** Tabelas `cash_advances` e `expense_receipts` (já especificadas na Fase 10, verificar se migration existe)
  - `cash_advances`: job_id, tenant_id, amount, recipient_id (vendor/people), pix_key_used, deposit_date, receipt_url, status (pending, approved, settled), approved_by
  - `expense_receipts`: cash_advance_id, amount, description, receipt_url, nf_url, category, created_at
  - Regra: até 10% do orçamento sem aprovação extra, acima precisa CEO/CFO
- **Edge Function:** `cash-advances` (verificar se já existe — se sim, estender)
  - `create.ts` — Criar adiantamento (com check de threshold 10%)
  - `list.ts` — Listar por job
  - `settle.ts` — Prestar contas (adicionar receipts)
  - `approve.ts` — Aprovar adiantamento acima do threshold
- **Frontend:**
  - Aba "Verbas" no `/jobs/[id]/financeiro/verbas` (verificar se já existe)
  - Card de saldo: depositado vs comprovado vs disponível
  - Lista de adiantamentos com status
  - Form de prestação de contas: múltiplos recibos/NFs por adiantamento
  - Alerta visual quando saldo negativo

**Critério de aceite:**
- Financeiro registra depósito para produtor
- Produtor presta contas com recibos/NFs
- Saldo atualizado automaticamente
- Threshold de 10% funciona

---

### T1.7 — OCR de Notas Fiscais

**Substitui:** Apps Script com api.ocr.space

**O que é:** Extração automática de dados do PDF da NF (valor, CNPJ emissor, número NF, data emissão).

**Implementação:**
- **Edge Function:** Novo handler `ocr-analyze.ts` no `nf-processor`
  - Recebe URL do PDF (já no Storage)
  - Usa Groq Vision (Llama 3.2 Vision) ou Claude Vision para extrair:
    - Valor total da NF
    - CNPJ do emissor
    - Número da NF
    - Data de emissão
    - Data de competência
    - Descrição do serviço
  - Retorna dados extraídos com confidence score
- **Frontend:** Na tela de validação de NF (`nf-validation-dialog.tsx`):
  - Badge "OCR" ao lado de cada campo extraído automaticamente
  - Campos pré-preenchidos com dados do OCR
  - Financeiro confirma/corrige antes de aprovar
  - Indicador de confiança (verde: >90%, amarelo: 70-90%, vermelho: <70%)

**Critério de aceite:**
- PDF de NF processado automaticamente
- Campos pré-preenchidos no dialog de validação
- Precisão > 85% nos testes com NFs reais

---

### T1.8 — Script de Migração de Dados

**O que é:** Importar dados históricos das planilhas para o ELLAHOS.

**Implementação:**
- **Script Python:** `scripts/migration/import_data.py`
  - Lê CSVs exportados das planilhas (jobs, equipe, custos)
  - Mapeia campos para schema do ELLAHOS
  - Insere via Supabase API (service role key)
  - Log de erros e itens ignorados
- **Dados a migrar:**
  - 40+ jobs da planilha master → tabela `jobs`
  - 286 freelancers do BANCO DE DADOS EQUIPE → tabela `vendors` + `bank_accounts`
  - Custos reais dos GG_ ativos → tabela `cost_items` + `financial_records`
  - Clientes e agências → tabelas `clients` + `agencies`
- **Validação:** Script de verificação pós-migração (contagem, somas, integridade referencial)

**Critério de aceite:**
- Dados históricos visíveis no ELLAHOS
- Nenhum dado perdido (log de 100% dos registros processados)
- Valores financeiros batem com as planilhas

---

## TIER 2 — Operacionalmente Importante (workaround manual existe)

### T2.1 — Carta Orçamento com IA + Versionamento
- Gerar carta orçamento via AI (Groq) com dados do job
- Versionamento (v1, v2, v3) com histórico
- Export PDF
- Integrar com AI Copilot (ELLA gera/edita via chat)

### T2.2 — Número ANCINE como Fluxo
- Campos `ancine_crt` e `ancine_status` (pendente, registrado, dispensado)
- Formulário de dados ANCINE no job detail
- Vinculo automático com claquete (puxa CRT)
- Checklist de documentação necessária

### T2.3 — Nomenclatura Automática de Arquivos
- Gerar nomes no padrão `PGTO_YYYYMMDD_J{job}_ID{item}.pdf` e `NF_YYYYMMDD_J{job}_ID{item}.pdf`
- Ao fazer upload de comprovante → renomear automaticamente
- Ao vincular NF → renomear automaticamente

### T2.4 — Divergência Valor Estimado vs Real
- Campo `estimated_amount` vs `actual_amount` nos cost_items
- Badge visual: verde (match), amarelo (divergência <10%), vermelho (divergência >10%)
- Alerta na dashboard financeira

### T2.5 — Aprovação Hierárquica de Pagamentos
- Tabela `approval_rules` (tenant_id, min_amount, max_amount, required_role)
- Pagamentos acima do threshold precisam aprovação CEO/CFO
- Workflow: financeiro marca "pagar" → notificação para aprovador → aprova/rejeita
- Status de pagamento: pending_approval, approved, paid

### T2.6 — Comprovante N:N (1 PIX, vários itens)
- Tabela `payment_proofs` (id, tenant_id, file_url, payment_date, bank_reference)
- Tabela junction `cost_item_payment_proofs` (cost_item_id, payment_proof_id)
- Upload de 1 comprovante e vincular a múltiplos itens de custo

### T2.7 — PPM como Documento Gerenciável
- Aba PPM no job detail
- Template de PPM com campos pré-preenchidos do job
- Upload de documento PPM (PDF ou link Google Docs)
- Status: rascunho, enviado, aprovado
- Vinculo com `ppm_url` no job

### T2.8 — Contratos de Equipe Técnica
- Novos templates DocuSeal para equipe técnica
- Seleção de template por tipo de membro (elenco vs técnico vs PJ)
- Geração em lote para toda a equipe do job

---

## TIER 3 — Melhorias (não existe em nenhum sistema hoje)

### T3.1 — Diário de Produção Digital
- Registro do que foi filmado no dia (cenas, takes, problemas)
- Upload de fotos/referências do set
- Timeline por dia de filmagem

### T3.2 — Gestão de Locações
- Cadastro de locações com fotos, endereço, contato
- Histórico de uso por job
- Status de alvará de filmagem
- Custo de locação vinculado ao cost_item

### T3.3 — Controle de Figurino/Arte por Cena
- Fichas de figurino por personagem
- Status de peças (comprada, alugada, devolvida)
- Fotos de referência

### T3.4 — Integração Frame.io
- Webhook de review (aprovado, comentário, revisão)
- Status de entregáveis atualizado automaticamente
- Links de review no portal do cliente

### T3.5 — Controle de Horas Extras
- Registro de entrada/saída por membro da equipe
- Cálculo de HE automático (base: 8h/dia)
- Valor de HE por tipo de profissional
- Impacto no custo do job

### T3.6 — CRM / Pipeline Comercial
- Pipeline de oportunidades (lead → proposta → negociação → fechamento)
- Versionamento de propostas
- Taxa de conversão
- Valor médio de jobs por segmento

### T3.7 — Integração Bancária (OFX/CNAB)
- Importar extrato bancário
- Conciliação automática com pagamentos
- Tela de conciliação (match manual quando necessário)

---

## Preparação para Fase 12 (LangGraph Multi-Agent "Ellaih")

Cada feature do Tier 1-3 deve considerar:

1. **API First:** Endpoints REST claros e documentados para cada operação
2. **Contexto estruturado:** Funções `getJobFullContext()` e similares devem incluir dados das novas features
3. **Ações executáveis:** Agentes devem poder criar claquete, gerar aprovação, pedir NF, registrar pagamento via API
4. **Notificações:** Cada ação gera notificação que pode ser entregue via WhatsApp pelos agentes

### Exemplos de ações que os agentes farão:
- "Ellaih, gera a claquete do job 045" → `POST /claquete-generator` com dados do job
- "Preciso da aprovação interna do Senac" → `POST /approval-pdf` + notifica aprovadores
- "Quanto falta pra fechar o job 038?" → `GET /financial-dashboard/job/{id}`
- "Pede NF pro Thiago do job 033" → `POST /nf-processor/request`

---

## Cronograma Estimado

```
Semana 1-2:  T1.1 (Claquete) + T1.2 (Aprovação Interna) + T1.3 (Lookup Vendor)
Semana 2-3:  T1.4 (Condição Pagamento) + T1.5 (Portal Fornecedor) + T1.6 (Verbas)
Semana 3-4:  T1.7 (OCR NF) + T1.8 (Migração Dados) + Testes E2E
Semana 5-6:  TIER 2 (T2.1-T2.8)
Semana 7-8:  TIER 3 (T3.1-T3.7) — priorizando T3.1 e T3.6
Semana 9+:   Fase 12 (LangGraph)
```

**Caminho crítico:** T1.1 e T1.2 desbloqueiam o uso diário. T1.8 desbloqueia a migração.
