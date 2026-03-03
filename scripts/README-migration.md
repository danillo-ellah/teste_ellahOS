# ELLAHOS — Script de Migração de Dados

Migra dados do Google Sheets / CSVs para o Supabase (vendors, jobs, cost_items).

## Pré-requisitos

Python 3.9+ instalado (no Windows: `python`, não `python3`).

```
pip install -r scripts/requirements-migrate.txt
```

> Se for usar apenas o modo CSV (recomendado para início), pode instalar apenas
> `requests` e `python-dotenv`:
> ```
> pip install requests python-dotenv
> ```

---

## Configuração

Crie um arquivo `.env` na raiz do projeto (ou exporte as variáveis no shell):

```env
SUPABASE_URL=https://etvapcxesaxhsvzgaane.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...          # Project Settings → API → service_role
TENANT_ID=<uuid-do-tenant-ellah-filmes>        # SELECT id FROM tenants LIMIT 1
```

Para descobrir o TENANT_ID, acesse o Supabase Dashboard → Table Editor → tenants.

---

## Uso — Modo CSV (recomendado)

### 1. Preparar os arquivos CSV

Coloque os CSVs em `scripts/data/`:

| Arquivo | Conteúdo |
|---|---|
| `freelancers.csv` | 286 freelancers → tabela `vendors` + `bank_accounts` |
| `jobs.csv` | +40 jobs → tabela `jobs` |
| `costs.csv` | Centenas de custos → tabela `cost_items` |

Veja os arquivos `*_example.csv` na mesma pasta para o formato esperado.

### 2. Sempre rode com `--dry-run` primeiro

```bash
python scripts/migrate_sheets_data.py --dry-run
```

Isso simula toda a migração sem gravar nenhum dado. Verifique os logs.

### 3. Migração completa

```bash
python scripts/migrate_sheets_data.py
```

### 4. Migrar apenas uma tabela

```bash
# Somente freelancers → vendors
python scripts/migrate_sheets_data.py --only freelancers

# Somente jobs
python scripts/migrate_sheets_data.py --only jobs

# Somente custos (requer vendors e jobs já importados)
python scripts/migrate_sheets_data.py --only costs
```

### 5. Logs detalhados

```bash
python scripts/migrate_sheets_data.py --verbose
```

---

## Formato dos CSVs

### freelancers.csv

Aceita **com ou sem cabeçalho**. O script detecta automaticamente.

**Com cabeçalho:**
```
nome,email,banco,documento_pix,telefone,agencia,conta,observacoes
Ana Lima,ana@email.com,Nubank,123.456.789-01,11999990001,,,DOP
```

**Sem cabeçalho** (formato legado EQUIPE.csv):
```
Ana Lima,ana@email.com,Nubank,123.456.789-01
Carlos Mendes,carlos@email.com,Bradesco,45.678.901/0001-23
```

Colunas:
| Coluna | Descrição | Exemplo |
|---|---|---|
| `nome` | Nome completo (obrigatório) | `Ana Lima` |
| `email` | E-mail | `ana@email.com` |
| `banco` | Nome do banco | `Nubank`, `Itau`, `Bradesco`... |
| `documento_pix` | CPF, CNPJ, e-mail PIX, telefone ou UUID aleatório | `123.456.789-01` |
| `telefone` | Celular | `11999990001` |
| `agencia` | Agência bancária | `1234` |
| `conta` | Número da conta | `56789-0` |
| `observacoes` | Notas livres | |

**Detecção automática do tipo de PIX:**
- 11 dígitos → CPF (entity_type: pf)
- 14 dígitos → CNPJ (entity_type: pj)
- `@` no valor → e-mail PIX
- 8-13 dígitos → telefone PIX
- UUID (8-4-4-4-12) → chave aleatória

---

### jobs.csv

Requer cabeçalho. Colunas reconhecidas:

| Coluna | Aliases | Descrição |
|---|---|---|
| `titulo` | `title`, `nome` | Título do job (obrigatório se `codigo` vazio) |
| `codigo` | `code`, `job_code`, `id` | Código único (ex: `GG-041`) |
| `cliente` | `client`, `anunciante` | Nome do cliente/anunciante |
| `agencia` | `agency` | Nome da agência |
| `status` | `situacao` | Status do job (ver mapeamentos abaixo) |
| `tipo` | `type`, `project_type` | Tipo de produção |
| `marca` | `brand` | Marca do produto |
| `data_briefing` | `briefing_date`, `data_inicio` | DD/MM/AAAA |
| `data_entrega` | `delivery_date`, `expected_delivery_date` | DD/MM/AAAA |
| `valor_fechado` | `closed_value`, `valor` | Valor em BRL |
| `custo_producao` | `production_cost`, `custo` | Custo estimado |
| `observacoes` | `notes`, `obs` | Notas livres |
| `drive_url` | `pasta_drive`, `folder_url` | URL da pasta no Drive |

**Mapeamentos de status aceitos:**
- `em andamento`, `em produção`, `filmagem` → `pos_producao`
- `finalizado`, `finalizada` → `finalizado`
- `entregue` → `entregue`
- `cancelado` → `cancelado`
- `briefing` → `briefing_recebido`
- `orçamento`, `orcamento` → `orcamento_elaboracao`
- `aprovado` → `aprovado_selecao_diretor`
- `pré produção`, `pre producao` → `pre_producao`
- `pós produção`, `pos producao` → `pos_producao`

**Mapeamentos de tipo de produção:**
- `filme publicitário`, `comercial` → `filme_publicitario`
- `branded content` → `branded_content`
- `videoclipe`, `clipe` → `videoclipe`
- `documentário` → `documentario`
- `conteúdo digital`, `social media` → `conteudo_digital`
- `institucional` → `institucional`
- `motion graphics` → `motion_graphics`
- `fotografia` → `fotografia`

---

### costs.csv

Requer cabeçalho. Colunas reconhecidas:

| Coluna | Aliases | Descrição |
|---|---|---|
| `job_code` | `codigo_job`, `job` | Código do job (para FK) |
| `item` | `item_number`, `categoria` | Número do item (1-99) |
| `sub_item` | `sub_item_number` | Sub-item (0 = header de categoria) |
| `descricao` | `description`, `service_description` | Descrição do item (obrigatório) |
| `valor_unitario` | `unit_value`, `valor` | Valor unitário em BRL |
| `quantidade` | `quantity`, `qtde` | Quantidade (padrão: 1) |
| `fornecedor` | `vendor`, `vendor_name` | Nome do fornecedor |
| `email_fornecedor` | `vendor_email`, `email` | E-mail do fornecedor |
| `pix` | `vendor_pix` | Chave PIX do fornecedor |
| `condicao_pagamento` | `payment_condition`, `c_nf` | Condição (ver abaixo) |
| `data_pagamento` | `payment_due_date`, `vencimento` | DD/MM/AAAA |
| `pago` | `paid`, `status_pagamento` | `sim`/`nao`, `pago`/`pendente` |
| `horas_extra` | `overtime_hours` | Horas extras (decimal) |
| `valor_he` | `overtime_rate` | Valor por hora extra |
| `observacoes` | `notes`, `obs` | Notas livres |

**Condições de pagamento aceitas:**
- `a vista`, `à vista` → `a_vista`
- `c/nf 30`, `cnf 30`, `c/nf 30 dias` → `cnf_30`
- `c/nf 40` → `cnf_40`
- `c/nf 45` → `cnf_45`
- `c/nf 60` → `cnf_60`
- `c/nf 90` → `cnf_90`
- `s/nf 30` → `snf_30`

---

## Uso — Modo Google Sheets (avançado)

### Configuração OAuth

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto ou use o existente
3. Ative a "Google Sheets API"
4. Crie credenciais do tipo "Service Account"
5. Baixe o JSON e salve como `scripts/credentials.json`
6. Compartilhe as planilhas com o e-mail do Service Account

### Variáveis de ambiente adicionais

```env
SHEET_FREELANCERS_ID=<id-da-planilha-equipe>   # Parte da URL após /d/
SHEET_JOBS_ID=<id-da-planilha-jobs>
SHEET_COSTS_ID=<id-da-planilha-custos>
```

### Execução

```bash
python scripts/migrate_sheets_data.py --mode sheets --dry-run
python scripts/migrate_sheets_data.py --mode sheets
```

---

## Idempotência

O script é seguro para re-execução:

- **vendors**: Verifica por `normalized_name` (nome normalizado sem acentos) e e-mail.
  Se já existe, ignora.
- **jobs**: Usa `upsert` com `ON CONFLICT (tenant_id, code)`.
  Se o job já existe com o mesmo código, atualiza os campos.
- **cost_items**: Verifica por `(import_source, job_id, item_number, sub_item_number, service_description)`.
  Se já existe, ignora.

---

## Troubleshooting

### "TENANT_ID não configurado"
Exporte a variável antes de rodar:
```bash
export TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```
Ou adicione ao arquivo `.env` na raiz do projeto.

### "SUPABASE_SERVICE_ROLE_KEY não configurado"
A chave service_role está no Supabase Dashboard:
Project Settings → API → Project API keys → `service_role` (clique em "Reveal").

### Erros de FK ao importar costs
Os custos dependem de jobs e vendors existentes.
Execute sempre na ordem: `freelancers` → `jobs` → `costs`.

### Encoding errado (caracteres com acento quebrados)
O script tenta `utf-8-sig`, `utf-8` e `latin-1` automaticamente.
Se ainda houver problemas, converta o CSV para UTF-8 com BOM:
```
Abra no Excel → Salvar Como → CSV UTF-8 (com BOM)
```

### Valores monetários não reconhecidos
O parser aceita: `R$ 1.000,00`, `1.000,00`, `1000`, `50000.00`.
Não aceita fórmulas Excel (`=SOMA(...)`).

---

## Ordem de dependências

```
tenants (já existe)
    ↓
clients + agencies  ← criados automaticamente durante migrate_jobs
    ↓
vendors             ← migrate_freelancers()
    + bank_accounts
    ↓
jobs                ← migrate_jobs()
    ↓
cost_items          ← migrate_costs()
```
