# RELATORIO FINAL — Google Drive Ellah Filmes
## Raio-X Completo da Operacao + Gaps no ELLAHOS

**Data:** 04/03/2026
**Fonte:** Varredura completa via Service Account API (22.708 arquivos)

---

## 1. NUMEROS DO DRIVE

| Metrica | Valor |
|---------|-------|
| **Total de arquivos** | 22.708 |
| **Tamanho total** | ~25.5 TB |
| **Pastas** | 4.098 |
| **Videos (MOV+MP4+MXF+BRAW)** | 7.633 (~93% do storage) |
| **Audios (WAV)** | 1.344 |
| **PDFs** | 2.297 |
| **Google Sheets** | 175 |
| **Google Docs** | 193 |
| **Google Forms** | 35 |
| **Imagens (JPEG+PNG+DNG+TIFF+PSD)** | 1.431 |
| **Word/Excel** | 161 |
| **Apps Scripts** | 2 |
| **Jobs mapeados** | ~40 (003 a 040) |
| **Orcamentos** | 10 (ORC-2025/2026) |

### Distribuicao por Ano
| Pasta | Itens | Descricao |
|-------|-------|-----------|
| 2024 | 6.527 | Jobs 003-017 + template + fase orcamento |
| 2025 | 15.218 | Jobs 018-039 (maior volume — material bruto) |
| 2026 | 829 | Jobs 038-040 (mais recentes) |
| 000_Orcamentos | 87 | Pipeline de orcamentos |
| APPS_SCRIPT | 38 | Scripts de automacao |
| ELLAHOS | 9 | Pasta de integracao |

---

## 2. O DIAMANTE: MATERIAL BRUTO (~25 TB)

O material bruto (video + audio) e o ativo mais valioso da Ellah Filmes.

### Formatos encontrados
| Formato | Qtd | Uso |
|---------|-----|-----|
| MOV (QuickTime) | 4.800 | Camera principal (ProRes, H.264) |
| MP4 | 2.670 | Entregas, conversoes, social media |
| WAV | 1.344 | Audio de set, trilhas, locucao |
| BRAW (Blackmagic RAW) | 156 | Camera Blackmagic |
| MXF | 7 | Material broadcast |
| DNG | 505 | RAW de foto |

### Organizacao do material bruto
- Fica em `08_POS_PRODUCAO/` de cada job
- Subpastas: Material Bruto, Material Limpo, Pesquisa, Storyboard, Montagem, Color, Finalizacao, Copias
- Jobs antigos (003-010) tinham estrutura diferente (`01 - MATERIAL BRUTO/`)
- A partir do job 011 a estrutura ficou padronizada

### O que o ELLAHOS NAO faz ainda com esse material
1. **Catalogo de clips** — nao existe indexacao por clip/cena/take
2. **Metadata extraction** — nao extrai duracao, resolucao, codec, FPS
3. **Thumbnails** — nao gera previews dos clips
4. **Busca** — nao consegue pesquisar "drone em praia" ou "close-up produto"
5. **Storage analytics** — nao mostra quanto cada job ocupa em TB
6. **Arquivo/Lifecycle** — nao gerencia o que pode ir pra cold storage

---

## 3. PLANILHAS OPERACIONAIS (175 Google Sheets)

### 3.1 Planilha Master: CRIACAO PASTA E CONTROLE DE JOB
- **ID:** `13cOwWutmLhFdAvL4h-Dkpb_ObglPft2yphck2wAwvoU`
- **Local:** 2024/ (raiz)
- **Funcao:** Dashboard central de TODOS os jobs — status, links, permissoes
- **Acionada pelo:** Apps Script "CRIADOR DE PASTA_JOB_FECHADO"
- **Status no ELLAHOS:** Substituida pela tabela `jobs` + dashboard frontend

### 3.2 Gastos Gerais (GG_XXX) — 1 por job
Padrao de nome: `GG_{NUMERO}_{NOME}_{CLIENTE}`
Localizada em: `02_FINANCEIRO/03_GASTOS GERAIS/`

**Abas padrao (8-9 abas):**
| Aba | Funcao | Status no ELLAHOS |
|-----|--------|-------------------|
| OC | Orcamento original (decupado) | `job_budgets` + `budget_items` |
| CUSTOS_REAIS | Custos efetivos vs orcado | `cost_items` + CostItemsTable |
| EQUIPE | Lista com nome, email, banco, CNPJ | `job_team` + `people` + `vendors` |
| PRODUCAO | Links das pastas Drive da producao | `drive_folders` |
| DEPOSITOS | Controle de depositos/pagamentos | `payment_transactions` |
| PEDIDO EMISSAO NF | Solicitacao de NF ao financeiro | `nf_requests` + workflow n8n |
| CALENDARIO | Calendario de pagamentos por fornecedor | `cost_items.payment_due_date` |
| DASHBOARD | Resumo visual de gastos | Pagina /financeiro (parcial) |

**Gaps identificados:**
- A aba CALENDARIO mostra pagamentos por semana com color-coding. O ELLAHOS tem `payment_due_date` mas nao tem visualizacao de calendario
- A aba OC as vezes tem variantes (OC_3_DEPO, OC_5_DEPO) para orcamentos com depositos diferentes. O ELLAHOS suporta multiplos budgets mas nao variantes por deposito
- A aba DASHBOARD agrega dados automaticamente. O ELLAHOS tem dados mas nao dashboard financeiro consolidado por job

### 3.3 Cronograma — 1 por job
Padrao: `CRONOGRAMA {NUMERO}_{NOME}`
Localizada em: `04_CRONOGRAMA/` ou `10_VENDAS/.../04_CRONOGRAMA/`

**Abas (3):**
| Aba | Funcao | Status no ELLAHOS |
|-----|--------|-------------------|
| Calendario | Gantt visual com cores por fase | NAO EXISTE — gap critico |
| Processo | Lista de fases com datas inicio/fim | `shooting_day_orders` (parcial, so filmagem) |
| DE_PARA | Mapeamento de fases e IDs | NAO EXISTE |

**Fases do cronograma (padrao Ellah):**
1. Orcamento (Aprovacao)
2. Reuniao de Briefing
3. Pre-Producao
4. PPM
5. Filmagem
6. Pos-Producao
7. Entrega

**Gap critico:** O ELLAHOS nao tem modulo de CRONOGRAMA/TIMELINE por job. So tem datas de filmagem. Falta Gantt chart com fases da producao.

### 3.4 Cadastro Elenco — 1 por job
Padrao: `CADASTRO_ELENCO_{NUMERO}_{NOME}`
Localizada em: `05_CONTRATOS/`

**Funcao:** Registro de atores com dados completos (nome, CPF, agencia, valor, cena, etc.)
**Status:** Substituido por `job_cast` + TabCast no ELLAHOS

### 3.5 Equipe do Job
Algumas planilhas separadas com dados da equipe tecnica
**Status:** Substituido por `job_team` + `people` no ELLAHOS

---

## 4. GOOGLE DOCS (193 documentos)

**Nota:** A Docs API nao esta habilitada no projeto GCP. Os docs foram catalogados por nome/path mas o conteudo nao foi lido.

### Tipos identificados por nome
| Tipo | Qtd aprox | Funcao |
|------|-----------|--------|
| Contratos de elenco (PDF gerado) | ~50 | Contratos individuais gerados pelo Apps Script |
| Roteiros/briefings | ~20 | Documentos criativos |
| Relatorios/atas | ~15 | Documentacao de reunioes |
| Templates | ~10 | Templates de contrato, orcamento |
| Outros | ~100 | Diversos documentos operacionais |

**Gap:** O ELLAHOS nao indexa/linka documentos do Drive de volta ao job. Sabe que a pasta existe mas nao sabe o que tem dentro.

---

## 5. GOOGLE FORMS (35 formularios)

### Encontrados
- Formularios de cadastro de equipe (1 por job)
- Gerados automaticamente pelo Apps Script "CRIADOR DE PASTA"
- Publicados para que freelancers preencham seus dados

**Status no ELLAHOS:** Parcialmente substituido pelo Portal do Fornecedor (`/vendor/[token]`)
**Gap:** O portal existe mas nao gera formulario automatico por job. O fluxo antigo era: Apps Script cria form > Publica link > Freelancer preenche > Dados vao pra planilha. No ELLAHOS: admin cria job_team > Envia convite > Freelancer acessa portal. Fluxo diferente mas equivalente.

---

## 6. APPS SCRIPTS (2 scripts — coracao da automacao)

### Script 1: MODELO_DOC_ID (Gerador de Contratos Elenco)
- Chamado via n8n (webhook)
- Le dados de planilha CADASTRO_ELENCO
- Copia template Google Doc, preenche ~40 placeholders
- Converte para PDF, salva no Drive
- Idempotente (SHA-256 de job+cpf+email)
- **Status ELLAHOS:** Substituido por DocuSeal (com assinatura digital). O DocuSeal tem ~50 placeholders e fluxo de assinatura. O script antigo so gera PDF sem assinatura.

### Script 2: CRIADOR DE PASTA_JOB_FECHADO (Criador de Estrutura)
- O script PRINCIPAL — cria 55+ pastas por job
- Gera codigo do job (ex: `025_PETROBRAS_ARTPLAN`)
- Copia template `01_PASTA_BASE_ADM`
- **Aplica permissoes por papel** (Atendimento, Financeiro, Pos, Producao, Comercial)
- Cria planilha CADASTRO_ELENCO e Google Forms automaticamente
- Salva URLs na planilha master
- Callback para n8n
- **Status ELLAHOS:** `drive-integration` EF faz a criacao de pastas. **NAO aplica permissoes por papel** (gap).

---

## 7. GAPS CRITICOS — O QUE FALTA NO ELLAHOS

### TIER 1 — Gaps que impedem substituir 100% do Google Sheets

| # | Gap | Impacto | Esforco |
|---|-----|---------|---------|
| G-01 | **Cronograma/Timeline por job** | Sem Gantt chart de fases (orcamento→filmagem→entrega) | Alto (3-5 dias) |
| G-02 | **Dashboard financeiro por job** | Falta resumo visual tipo a aba DASHBOARD do GG | Medio (2 dias) |
| G-03 | **Calendario de pagamentos** | Falta visao semanal/mensal de pagamentos a vencer | Medio (2 dias) |
| G-04 | **Permissoes Drive por papel** | Criador de pastas nao aplica permissoes granulares | Medio (1-2 dias) |

### TIER 2 — Gaps que agregam valor significativo

| # | Gap | Impacto | Esforco |
|---|-----|---------|---------|
| G-05 | **Catalogo de material bruto** | 25TB sem indexacao. Nao busca por clip/cena | Alto (5+ dias) |
| G-06 | **Indexacao de docs no Drive** | Sabe que pasta existe mas nao o que tem dentro | Medio (2 dias) |
| G-07 | **Importar dados historicos** | Jobs 003-039 so existem no Drive/Sheets | Alto (3-5 dias) |
| G-08 | **Google Docs API** | Nao esta habilitada no GCP — nao le docs | Baixo (config) |

### TIER 3 — Features futuras de alto valor

| # | Gap | Impacto | Esforco |
|---|-----|---------|---------|
| G-09 | **AI tagging de material bruto** | Groq Vision pra descrever clips automaticamente | Alto (5+ dias) |
| G-10 | **Storage analytics** | Quanto cada job ocupa em TB, custo estimado | Medio (2 dias) |
| G-11 | **Busca semantica** | "drone em praia" busca no acervo | Alto (5+ dias) |
| G-12 | **Media Asset Management (MAM)** | Catalogar cada clip com metadata completa | Muito alto |

---

## 8. O QUE O ELLAHOS JA SUBSTITUI COM SUCESSO

| Funcao antiga (Sheets/Script) | Modulo ELLAHOS | Status |
|-------------------------------|----------------|--------|
| Planilha master de jobs | `jobs` + dashboard /jobs | Funcionando |
| Aba OC (orcamento) | `job_budgets` + `budget_items` | Funcionando |
| Aba CUSTOS_REAIS | `cost_items` + CostItemsTable | Funcionando |
| Aba EQUIPE | `job_team` + `people` | Funcionando |
| Aba DEPOSITOS | `payment_transactions` | Funcionando |
| Aba PEDIDO EMISSAO NF | `nf_requests` + workflow n8n | Funcionando |
| CADASTRO_ELENCO | `job_cast` + TabCast | Funcionando |
| Criador de pastas (Apps Script) | `drive-integration` EF | Funcionando (sem permissoes) |
| Gerador contratos (Apps Script) | DocuSeal integration | Funcionando (com assinatura) |
| Google Forms equipe | Portal Fornecedor | Funcionando (fluxo diferente) |
| Pipeline orcamentos | CRM Kanban /crm | Funcionando |

---

## 9. PLANILHA GG — DETALHAMENTO DAS ABAS

A planilha "Gastos Gerais" e o coracao financeiro de cada job. Cada job tem a sua.

### Aba OC (Orcamento)
- Decupagem completa do orcamento aprovado
- Categorias: producao, equipe, elenco, locacao, alimentacao, transporte, pos-producao
- Serve como baseline pra comparar com custos reais
- **ELLAHOS:** `budget_items` faz isso

### Aba CUSTOS_REAIS
- Registro de cada gasto efetivo
- Compara com orcado (variance)
- **ELLAHOS:** `cost_items` faz isso

### Aba EQUIPE
- Nome, email, banco, CNPJ/CPF de cada membro
- **ELLAHOS:** `job_team` + `people` + `vendors` fazem isso

### Aba PRODUCAO
- Links para pastas do Drive organizadas por area
- **ELLAHOS:** `drive_folders` faz isso

### Aba DEPOSITOS
- Controle de cada deposito feito (service_id, item, valor)
- **ELLAHOS:** `payment_transactions` faz isso

### Aba PEDIDO EMISSAO NF
- Formulario pra solicitar emissao de NF ao financeiro
- Inclui tomador, CNPJ, valor, descritivo
- **ELLAHOS:** `nf_requests` + workflow n8n fazem isso

### Aba CALENDARIO
- Calendario visual de pagamentos por semana
- Mostra data, valor, fornecedor
- Color-coding por status (pago/pendente/atrasado)
- **ELLAHOS:** Gap G-03 — nao tem visualizacao calendario

### Aba DASHBOARD
- Resumo do job: total orcado, total gasto, saldo, margem
- Graficos de pizza por categoria
- **ELLAHOS:** Gap G-02 — dados existem mas nao tem dashboard visual por job

---

## 10. RECOMENDACOES DE IMPLEMENTACAO

### Prioridade 1 — Fechar gaps pra cortar producao
1. **G-01 Cronograma/Timeline** — Implementar Gantt simplificado com fases da producao
2. **G-02 Dashboard financeiro job** — Card com resumo OC vs Real vs Saldo
3. **G-03 Calendario pagamentos** — Visao mensal de pagamentos a vencer
4. **G-04 Permissoes Drive** — Aplicar ACL por papel ao criar pastas

### Prioridade 2 — Agregar valor sobre o Sheets
5. **G-06 Indexar docs do Drive** — Listar arquivos dentro de cada pasta no job detail
6. **G-08 Habilitar Docs API** — Ler conteudo de docs pra busca e preview
7. **G-07 Importar historico** — Script Python pra ler GG de cada job e popular o banco

### Prioridade 3 — Diferenciais competitivos
8. **G-05 Catalogo material bruto** — Indexar clips com metadata basica
9. **G-09 AI tagging** — Groq Vision pra catalogar automaticamente
10. **G-10 Storage analytics** — Dashboard de uso de storage por job/ano

---

## 11. INSIGHTS DA OPERACAO ELLAH FILMES

### Fluxo de um job (reconstituido dos dados)
1. **Orcamento** → Pasta em `000_Orcamentos` (ORC-YYYY-XXXX)
2. **Aprovacao** → Move pra pasta do ano (2024/2025/2026)
3. **Estrutura** → Apps Script cria 55 pastas + planilhas + forms
4. **Pre-producao** → Equipe cadastrada, contratos gerados, cronograma feito
5. **Producao** → Material bruto armazenado em 08_POS_PRODUCAO
6. **Pos-producao** → Edicao, color, finalizacao na mesma pasta
7. **Entrega** → Copias finais + claquete ANCINE + ficha tecnica
8. **Fechamento** → Planilha GG fecha P&L, NFs emitidas

### Volumes de producao
- **2024:** ~15 jobs (003-017), incluindo 3 perdidos
- **2025:** ~22 jobs (018-039), maior volume
- **2026:** 3 jobs ate agora (038-040)
- **Orcamentos:** ~10 em pipeline

### Clientes recorrentes (pelo Drive)
- PROPEG (Bahia, GGB)
- FCB/Cruzeiro do Sul
- Ogilvy
- Leiaute
- MullenLowe
- Agencia3 (PMRJ)
- Binder
- SENAC
- SECOM (Governo)

### Equipe tipica por job
- Produtor executivo, diretor, 1o assistente
- Fotografia (DOP + assistentes)
- Som (tecnico + boom)
- Arte/figurino
- Producao de base
- Pos: editor, colorista, finalizador

---

## ARQUIVOS GERADOS NESTA VARREDURA

| Arquivo | Tamanho | Conteudo |
|---------|---------|----------|
| `drive-catalog.json` | 15 MB | Catalogo JSON completo (22.708 itens) |
| `drive-summary.md` | 60 KB | Arvore de pastas + dados de Sheets |
| `apps-scripts-report.md` | 98 KB | Codigo fonte completo dos 2 scripts |
| `explore-log.txt` | 21 KB | Log de execucao do script |
| `RELATORIO-FINAL-DRIVE-ELLAH.md` | Este arquivo |
