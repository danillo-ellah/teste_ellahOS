# Respostas — Perguntas Abertas do Modulo Financeiro

Data: 26/02/2026
Respondido por: Danillo (CEO)

---

## P1 - Custos sempre vinculados a job?
**R: Ambos (job + fixos)**
O ELLAHOS deve gerenciar tanto custos de job quanto custos fixos da produtora (aluguel, ferramentas, salarios).
→ Implicacao: `job_id` nullable na tabela de custos. Custos fixos sao organizados por periodo (mes/ano).

## P2 - Duplicatas de fornecedores na migracao?
**R: Dedup com normalizacao automatica**
Hoje o Apps Script tenta evitar duplicatas mas falha com case sensitivity (ex: "Joao" vs "JOAO").
O ELLAHOS deve normalizar (lowercase, trim, remove acentos) antes de comparar, e deduplicar automaticamente.
→ Implicacao: Normalizar na insercao. Migration script com dedup inteligente. Possivel tela de "merge sugerido".

## P3 - Campo banco/PIX?
**R: Estruturado (banco + agencia + conta)**
Campos separados: banco (dropdown padronizado), agencia, conta, tipo_pix, chave_pix.
→ Implicacao: Tabela `bank_accounts` com FK para `people`. Enum ou tabela para bancos brasileiros. Migration parser para o texto livre atual.

## P4 - Multiplas NFs por item?
**R: Nao se aplica diretamente**
A aba PRODUCAO nao e "NFs por item de custo" — e um **controle de verba a vista**. Funciona assim:
- Orcamento: "Produtor tem R$8k de verba a vista"
- Adiantamento 1: R$2k transferidos
- Prestacao de contas: recibos e NFs justificando os R$2k
- Adiantamento 2: R$6k transferidos
- Nova prestacao de contas
- Acerto final: produtor devolveu R$500 ou empresa deve mais R$1.200
→ Implicacao: Tabela `cash_advances` (adiantamentos) com N `expense_receipts` (prestacao de contas). Saldo calculado (total_adiantado - total_justificado).

## P5 - Pagamento em lote?
**R: Comprovante no item**
Cada item de custo recebe o link do comprovante individualmente. Se o mesmo comprovante serve pra 5 itens, o link e duplicado.
→ Implicacao: Campo `payment_proof_url` e `payment_proof_drive_id` direto na tabela de custos. Sem tabela `payment_batches`.
OBS: Manter uma **view de calendario** que agrupa pagamentos por data (funcionalidade da planilha CALENDARIO que deve ser preservada).

## P6 - Quem define a data de pagamento?
**R: Financeiro define tudo**
O financeiro e quem coloca as datas de pagamento quando organiza os lotes. O produtor so informa a condicao de pagamento (a vista, C/NF 30 dias, etc).
→ Implicacao: `payment_condition` preenchido pelo produtor no orcamento. `payment_due_date` preenchido pelo financeiro. Nao calcular automaticamente.

## P7 - Status do item automatico ou manual?
**R: Semi-automatico**
O sistema sugere o status com base nos dados (tem NF? tem comprovante?), mas o financeiro confirma/ajusta manualmente se necessario.
→ Implicacao: Campo `status` editavel + campo `suggested_status` computado. UI mostra alerta quando `status != suggested_status`.

## P8 - Aprovacao do orcamento?
**R: Complexo — dois cenarios**
1. **Licitacao / sem concorrencia**: Orcamento bottom-up. Produtor + Produtor Executivo montam com historico de jobs similares. CEO/CCO/CFO colocam taxas + impostos + Valor W. Fecha o valor final.
2. **Cliente define teto**: Cliente fala "so tenho X". Produtor Executivo e Produtor precisam encaixar dentro do valor, buscando lucro.
→ Implicacao: Dois modos no formulario de orcamento: "bottom-up" (soma itens → total) e "top-down" (total fixo → distribuir itens). Campos para taxas_produtora, impostos, valor_w. Campo `budget_mode` enum. Historico de jobs para referencia.

## P9 - Storage de NFs e comprovantes?
**R: Hibrido (Drive primario + redundancia)**
Google Drive como storage primario (50 GB disponiveis). O ELLAHOS pode fazer cache/redundancia no Supabase Storage para acesso rapido e seguranca.
→ Implicacao: Drive como source of truth. Supabase Storage como cache opcional. Links do Drive armazenados no banco. Manter integracao n8n→Drive que ja existe.

## P10 - Migracao?
**R: Todos os jobs historicos**
Migrar o maximo possivel do historico de planilhas para o ELLAHOS. Importante para relatorios e referencia.
→ Implicacao: Script de migracao robusto. Precisa de acesso a todas as planilhas do Drive. Parser CSV/XLSX generico. Pode ser implementado por fases (jobs recentes primeiro, depois historico).

---

## Resumo das decisoes para o schema

| Decisao | Resultado |
|---------|-----------|
| Custos sem job | Sim (job_id nullable) |
| Vendors dedup | Automatica com normalizacao |
| Dados bancarios | Estruturados (campos separados) |
| Verba a vista | Tabela cash_advances + expense_receipts |
| Comprovante | Link direto no item (sem payment_batches) |
| Data pagamento | Financeiro define manualmente |
| Status item | Semi-automatico (sugerido + editavel) |
| Modo orcamento | Dois modos: bottom-up e top-down |
| Storage | Drive primario + Supabase cache |
| Migracao | Todos os jobs historicos |

---

## Perguntas Abertas do PM (P-FIN-001 a P-FIN-005)

### P-FIN-001 - Categorias de custo fixas ou customizaveis?
**R: Fixas + sub-categorias livres**
As 15 categorias principais sao fixas (padrao Ellah). Dentro de cada categoria, o tenant pode criar sub-categorias customizadas.
→ Implicacao: `cost_categories` com seed fixo das 15 + campo `parent_id` para sub-categorias. Flag `is_system` para proteger as 15 de delecao.

### P-FIN-002 - Hierarquia de aprovacao para pagamentos?
**R: Sim, por faixa de valor**
Pagamentos acima de certo valor precisam de aprovacao do CEO/CFO antes de serem efetuados.
→ Implicacao: Tabela `approval_rules` ou config por tenant com faixas de valor. Workflow de aprovacao no `cost_items` antes de marcar como pago. Notificacao para aprovador.

### P-FIN-003 - Formulario de cadastro de fornecedores?
**R: Portal do fornecedor**
Criar uma area no ELLAHOS onde o fornecedor faz login e gerencia seus proprios dados (dados pessoais, bancarios, documentos). Substitui o Google Forms.
→ Implicacao: Rota publica `/portal/vendor/[token]` (similar ao portal de cliente que ja existe). Formulario para dados pessoais + bancarios. Token de acesso por convite. Mais ambicioso, pode ser Fase 10.5.

### P-FIN-004 - Integracao bancaria (OFX/CNAB)?
**R: Roadmap proximo**
Quer implementar nos proximos meses. Importar extrato bancario e cruzar com pagamentos automaticamente.
→ Implicacao: Parser OFX/CNAB. Tabela `bank_transactions` para extrato importado. Algoritmo de matching (valor + data + nome). Tela de conciliacao. Pode ser Fase 11.

### P-FIN-005 - Limite de verba a vista?
**R: ~10% do orcamento, acima disso precisa aprovacao CEO/CFO**
Regra geral: verba a vista gira em torno de 10% do orcamento. Se passar muito disso, precisa de aprovacao do CFO e do CEO.
→ Implicacao: Config `cash_advance_threshold_pct` (default 10%) por tenant. Se `total_verba / budget_total > threshold`, exigir aprovacao. Alert visual na UI quando proximo do limite.
