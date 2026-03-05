# Analise de Conteudo do Drive - Ellah Filmes
## Varredura Completa da Operacao + Workflows Implicitos + Gaps

**Data:** 05/03/2026
**Fonte:** drive-catalog.json (22.708 itens) + drive-summary.md + apps-scripts-report.md
**Analista:** Integrations Engineer - EllahOS

---

## 1. VISAO GERAL DO DRIVE

| Metrica | Valor |
|---------|-------|
| Total de arquivos | 22.708 |
| Tamanho total | ~25,5 TB |
| Pastas | 4.098 |
| Google Sheets | 175 |
| Google Docs | 193 |
| Google Forms | 35 |
| Videos (MOV+MP4+BRAW+MXF) | 7.633 |
| Audios (WAV) | 1.344 |
| PDFs | 2.297 |
| Jobs mapeados | ~40 (003 a 040) |
| Orcamentos em pipeline | ~10 |
| Anos de operacao | 2024, 2025, 2026 |

---

## 2. PLANILHA MASTER - "CRIACAO PASTA E CONTROLE DE JOB"

**ID:** `13cOwWutmLhFdAvL4h-Dkpb_ObglPft2yphck2wAwvoU`
**Local:** `2024/CRIACAO PASTA E CONTROLE DE JOB`
**Funcao:** Dashboard central de TODOS os jobs — status, links, permissoes, automacoes

### 2.1 Abas da Planilha Master

| Aba | Funcao |
|-----|--------|
| CRIADOR DE PASTA | Interface para iniciar criacao de novo job. Campos: NOME DA PASTA, INDEX. |
| NUMERO DE JOB | Registro central de todos os jobs com ~20 colunas de metadados |
| ORCAMENTOS | Pipeline de orcamentos em negociacao |
| BANCO DE EQUIPE INTERNA | Cadastro da equipe interna com permissoes padrao por funcao |
| VALIDACAO DE DADOS | Log automatico de erros/avisos de cada job |
| CHECKLIST_JOB_TIPO | Checklists por tipo de projeto (Publicidade TV, Monstro, etc.) |
| REGRAS_CONDICIONAIS_JOB | Regras de negocio por tipo/valor/cliente |
| STATUS_JOB_ETAPA | Tracking granular de cada etapa por job |
| THREAD_ID | Mapeamento de threads do assistente IA (OpenAI) por contato WhatsApp |
| MAPA_DE_PERMISSOES_POR_FUNCAO | Matriz de ACL: qual funcao acessa qual pasta |
| ACESSO_POR_JOB | Permissoes granulares por job especifico |
| Fluxo de Caixa | Consolidado financeiro macro |
| Pagina14 | Controle de valores pendentes por cliente |

### 2.2 Aba NUMERO DE JOB - Colunas Identificadas

Colunas obrigatorias (validadas pelo Apps Script):
- INDEX
- NUMERO DO JOB
- NOME DO JOB
- AGENCIA
- CLIENTE
- EMAIL DO ATENDIMENTO
- DIRETOR
- PRODUTOR EXECUTIVO

Colunas salvas automaticamente pelo Apps Script:
- PLANILHA PRODUCAO (URL da GG)
- PASTA_URL (URL da pasta raiz do job)
- URL_CARTA_ORCAMENTO
- URL_CADASTRO_EQUIPE (URL publica do Google Form)
- URL_EQUIPE_DO_JOB_ATUAL
- URL_ROTEIRO
- URL_PPM
- URL_FECHAMENTO_PRODUCAO
- URL_FECHAMENTO_ARTE
- URL_FECHAMENTO_FIGURINO
- URL_PRE_FIGURINO
- URL_PRE_ARTE
- URL_CRONOGRAMA
- URL_MATERIAL_BRUTO
- URL_CADASTRO_ELENCO

Colunas calculadas por formula:
- Coluna J (CUSTOS_REAIS): `=QUERY(IMPORTRANGE(G{row}; "CUSTOS_REAIS!E:I"); "select Col5 where Col1 = 'TOTAL'"; 0)`
- Coluna K (IMPOSTO 12%): `=F{row}*0,12`
- Coluna M (VALOR_W/MARGEM): `=F{row}-(J{row}+K{row}+L{row})`

### 2.3 Aba BANCO DE EQUIPE INTERNA

Equipe interna identificada:
| Nome | Funcao | Email | Permissao Padrao |
|------|--------|-------|-----------------|
| Aurelio Belas Lustosa | CEO | aurelio@ellahfilmes.com | Total |
| Danillo Menezes Lucas | Produtora Executiva | danillo@ellahfilmes.com | Total |
| Telma dos Reis | CCO | telma@ellahfilmes.com | Comercial + Atendimento |
| Financeiro | Financeiro | financeiro@ellahfilmes.com | Todo financeiro |

### 2.4 Aba CHECKLIST_JOB_TIPO

Tipos de projeto mapeados:
- Publicidade TV (Alta complexidade)
- Monstro de Ideia (Baixa complexidade)

Fases do checklist por tipo:
- Pre-Producao: Receber briefing, Validar roteiro, Selecionar diretor, Montar shooting board
- Producao: Executar filmagem conforme cronograma
- Pos-Producao: (identificado no STATUS_JOB_ETAPA)

### 2.5 Aba REGRAS_CONDICIONAIS_JOB

| Condicao | Valor | Acao |
|----------|-------|------|
| TIPO_PROJETO = Institucional Governo | - | Orcamento decupado obrigatorio |
| VALOR_FECHADO > 250.000 | - | Notificar coordenacao executiva |
| CLIENTE_RECORRENTE = Nao | - | Reforcar briefing detalhado com atendimento |
| TIPO_PROJETO = Todos | - | Incluir reuniao de PPM com agencia |

### 2.6 Aba THREAD_ID (Integracao IA)

- Registra threads do assistente OpenAI por contato WhatsApp
- Campos: INDEX, GRUPO_OU_CONTATO, NUMERO_WHATSAPP, TIPO_DESTINO, NOME_JOB_RELACIONADO, THREAD_ID, ASSISTANT_ID, ULTIMA_ATUALIZACAO, QTD_MENSAGENS, STATUS
- Indica que havia/ha uma IA assistente integrada via WhatsApp antes do EllahOS

### 2.7 Aba ORCAMENTOS

Pipeline de orcamentos com campos:
- NUM_ORC, DATA, CLIENTE, PROJETO, IGUAL_A, PASTA_URL, PLANILHA_URL, STATUS, URL_CARTA_ORCAMENTO

Orcamentos identificados (2025-2026):
- ORC-2025-0001: Silimed - Proteses de silicone
- ORC-2025-0002: Cruzeiro do Sul - Aulao Enem
- ORC-2025-0003: SECOM-BA - Qual a Boa na Bahia 2025.3
- ORC-2025-0004: Metro de Sao Paulo - SAC 252002-001 Operacional
- ORC-2025-0005: Governo do Brasil - Locutor de Rua
- ORC-2026-0001: SECOM - Posicionamento Governo Presente
- ORC-2026-0001: SENAC - Fotografia
- ORC-2026-0002: Senac - Elenco
- ORC-2026-0003: Senac - Fotografia Quer fazer Senac?
- ORC-2026-0004: Senac - Vinhetas Quer fazer Senac?

---

## 3. PLANILHAS GG (GASTOS GERAIS) - ANALISE DETALHADA

A planilha GG e o **coracao financeiro** de cada job. Existe uma por job, nomeada `GG_{NUMERO}_{NOME}_{CLIENTE}`, localizada em `{JOB}/02_FINANCEIRO/03_GASTOS GERAIS/`.

### 3.1 Estrutura Padrao das Abas

Todas as GGs modernas (job 018+) tem 8 abas padrao:

```
OC | CUSTOS_REAIS | EQUIPE | PRODUCAO | DEPOSITOS | PEDIDO EMISSAO NF | CALENDARIO | DASHBOARD
```

Excecoes identificadas:
- GG_011 (2024): Abas `OC_3_DEPO` e `OC_5_DEPO` em vez de `OC` (orcamentos com 3 e 5 depositos)
- GG_031 (Ogilvy): Tem `Copia de OC` adicional (orcamento revisado)
- GG_025 (INMETRO): Sem aba EQUIPE (omitida por ser job simples)

### 3.2 Aba OC (Orcamento)

**Funcao:** Decupagem completa do orcamento aprovado — baseline financeiro do job.

**Estrutura observada:**
- Categorias de custo (producao, equipe, elenco, locacao, alimentacao, transporte, pos-producao)
- Valores por item
- Total por categoria
- Total geral

**Variantes:**
- OC_3_DEPO: Orcamento estruturado em 3 depositos (pagamentos escalonados)
- OC_5_DEPO: Orcamento estruturado em 5 depositos

**Relevancia para EllahOS:** A tabela `job_budgets` + `budget_items` reproduz essa funcao. A variante por deposito e suportada na estrutura mas nao tem UI especifica.

### 3.3 Aba CUSTOS_REAIS

**Funcao:** Registro de cada gasto efetivo do job para comparar com o orcado.

**Colunas identificadas (via formula da Master):**
- Coluna A: DESCRICAO/CATEGORIA (ex: "TOTAL")
- Colunas E a I: Valores financeiros por categoria
- Total e extraido pela Master via: `=QUERY(IMPORTRANGE(url_gg; "CUSTOS_REAIS!E:I"); "select Col5 where Col1 = 'TOTAL'"; 0)`

**Relevancia para EllahOS:** A tabela `cost_items` + `CostItemsTable` reproduz essa funcao.

### 3.4 Aba EQUIPE

**Funcao:** Cadastro financeiro dos membros da equipe tecnica do job.

**Colunas identificadas:**
- Nome completo
- Email
- Banco
- CNPJ ou CPF

**Exemplos reais de equipe (Jobs 033, 037, 038, 040):**
| Nome | Email | Banco | CNPJ/CPF |
|------|-------|-------|----------|
| Andre de Oliveira Alves | andre_rock_roll@hotmail.com | Banco do Brasil | 19.956.170/0001-72 |
| Giulia Martinho Casado | giu.casado@gmail.com | Nubank | 42786481000152 |
| Jose Luiz Lerma | Joseluizlerma@hotmail.com | - | 18549941000144 |
| Marcelo Brito do Espirito Santo Filho | marcelobritofilho@gmail.com | Itau | 65218914568 |
| Marcello Luiz Garofalo Avian | marcelloavian@gmail.com | NU Bank | marcelloavian@gmail.com |

Observacao: A aba EQUIPE da GG contem os membros que **recebem pagamento** (dados bancarios). Diferente da planilha EQUIPE_DO_JOB que contem todos os membros (inclusive sem pagamento direto).

**Relevancia para EllahOS:** `job_team` + `people` + `vendors` reproduzem essa funcao.

### 3.5 Aba PRODUCAO

**Funcao:** Links para as pastas do Drive de cada area de producao.

**Estrutura:**
- PASTAS DA PRODUCAO
- Produtor
- (links das subpastas)

**Relevancia para EllahOS:** `drive_folders` reproduz essa funcao.

### 3.6 Aba DEPOSITOS

**Funcao:** Controle de cada deposito/pagamento efetivado.

**Colunas identificadas:**
- SERVICE ID
- INDEX
- JOB ID
- ITEM (descricao do que foi pago)

**Observacao:** A aba e pre-populada com linhas vazias (INDEX vazio, JOB ID = "-", ITEM = "-"), indicando estrutura template aguardando preenchimento.

**Relevancia para EllahOS:** `payment_transactions` reproduz essa funcao.

### 3.7 Aba PEDIDO EMISSAO NF

**Funcao:** Formulario para solicitar emissao de Nota Fiscal ao financeiro.

**Conteudo observado:**
- Instrucoes de uso (3 regras obrigatorias):
  1. Caso o descritivo esteja incompleto, o financeiro devolvera
  2. NAO enviar dados bancarios no corpo da mensagem
  3. E OBRIGATORIO o envio da NFe para o email financeiro
- Campo INDEX (auto-populado com timestamp)
- Campo "INPUT O INDEX" (numero do job, preenchido pelo usuario)
- Secao: EMISSAO DE NOTA PARA (TOMADOR DO SERVICO)
- Campo: CODIGO URL ONDE SALVAR NF

**Campos de INDEX encontrados:**
- Job 38: INDEX = 133 (timestamp-like), valor INDEX = 19
- Job 40: INDEX = 46, INDEX = 19
- Job 33: INDEX = 153, INDEX = 19
- Job 37: INDEX = 126, INDEX = 19

**Observacao critica:** O campo INDEX = 19 aparece em TODOS os jobs, indicando que e uma referencia para um canal WhatsApp (THREAD_ID #19 na planilha Master).

**Relevancia para EllahOS:** `nf_requests` + workflow n8n reproduzem essa funcao.

### 3.8 Aba CALENDARIO

**Funcao:** Calendario visual de pagamentos da producao por data.

**Estrutura real (dados dos jobs):**

Job 038 (Senac):
| Data | Valor | Observacao |
|------|-------|------------|
| 22/01/2026 | R$ 31.000,00 | Deposito #1 |
| 27/01/2026 | R$ 25.068,04 | Deposito #2 |
| 13/02/2026 | R$ 37.000,00 | Deposito #3 |
| 25/02/2026 | R$ 39.399,36 | Deposito #4 |
| 13/03/2026 | R$ 587.088,49 | Deposito #5 (pagamento final) |

Job 033 (Ornare):
| Data | Valor |
|------|-------|
| 20/07/2025 | R$ 25.985,00 |
| 13/08/2025 | R$ 8.000,00 |
| 19/08/2025 | R$ 16.675,50 |
| 22/08/2025 | R$ 155.000,00 |
| 29/08/2025 | R$ 129.514,00 |

Job 037 (Bahia Regionais):
| Data | Valor |
|------|-------|
| 04/12/2025 | R$ 69.550,00 |
| 16/01/2026 | R$ 12.500,00 |
| 02/02/2026 | R$ 209.654,90 |
| 09/02/2026 | R$ 6.500,00 |
| 11/02/2026 | R$ 21.200,00 |

Job 040 (Pura/Unum):
| Data | Valor |
|------|-------|
| 23/02/2026 | R$ 5.200,00 |
| 25/03/2026 | R$ 3.500,00 |
| 09/04/2026 | R$ 239.180,00 |

**Estrutura tecnica:** Alem de data e valor, a aba tem colunas adicionais (20 no total) com:
- Colunas de semana (#N/A indica formula sem dados)
- Valores 30, 7 (prazo e frequencia de calculo)
- Header: "JOB {N} - PAGAMENTO DA PRODUCAO. ATENTE-..."

**Relevancia para EllahOS:** Gap G-03. Os dados de `cost_items.payment_due_date` existem mas nao ha visualizacao de calendario.

### 3.9 Aba DASHBOARD

**Funcao:** Resumo visual agregado do job (OC vs Real vs Saldo vs Margem).

**Observacao:** Em todas as GGs analisadas a aba DASHBOARD aparece vazia na exportacao via API. Isso e esperado pois o DASHBOARD usa graficos e formulas visuais que nao exportam como valores de celula.

**Relevancia para EllahOS:** Gap G-02. Os dados existem mas nao ha dashboard visual consolidado por job.

### 3.10 Jobs por Volume Financeiro (estimado pelo CALENDARIO)

| Job | Nome | Cliente | Volume Total Estimado |
|-----|------|---------|----------------------|
| 038 | Quer Fazer? Senac! | SENAC SP | ~R$ 719.000 |
| 033 | Ilhapura Ornare | UNUM | ~R$ 335.000 |
| 037 | Bahia Regionais PAC | PROPEG | ~R$ 319.000 |
| 040 | Pura | UNUM | ~R$ 248.000 |
| 025 | Monstro INMETRO | BINDER | ~R$ 3.700 (parcial) |

---

## 4. PLANILHAS CADASTRO_ELENCO

**Padrao:** `CADASTRO_ELENCO_{NUMERO}_{NOME}_{CLIENTE}`
**Local:** `{JOB}/05_CONTRATOS/03_CONTRATODEELENCO/`

### 4.1 Abas do CADASTRO_ELENCO

| Aba | Funcao |
|-----|--------|
| ELENCO | Dados de cada ator/modelo para geracao de contratos |
| CODIGO_ROBO | Configuracao do Apps Script (pasta destino, ID do doc-fonte) |
| DOCUSEAL_LOG | Log de envios via DocuSeal (jobs recentes) |
| Pagina5 | Aba auxiliar vazia |

### 4.2 Aba ELENCO - Estrutura Completa

**Linha 1 (Agencia de Elenco):**
- RAZAO SOCIAL Agencia de Atores e Modelos
- ENDERECO COMPLETO
- CNPJ
- REPRESENTANTE LEGAL
- RG
- CPF
- EMAIL
- TELEFONE

**Linha 3 (Cabecalhos):**
`#, Nome Completo, Elenco, CPF, RG, Data de Nascimento, DRT, Endereco Completo, Cidade, Estado, CEP, E-mail, Telefone, Valor Prestacao de Servico, Valor Concessao do Uso de Imagem, Valor taxa de agenciamento, Valor TOTAL`

**Exemplo real de ator (Job 038 - Senac):**
- Giulia Barros Nochieri | ATOR/ATRIZ PRINCIPAL | CPF: 530.538.968-26 | RG: 63.481.089-3 | Nasc: 21/12/2003 | Endereco: Rua Doutor Moraes Dantas, 189... | Sao Paulo/SP | CEP: 02556-170 | Email: barrosgiulia2112@gmail.com | Tel: (11) 91655-1475 | Prestacao: R$450,00 | Imagem: R$1.050,00 | Taxa: R$0,00 | Total: R$1.500,00
- Mariana de Saboya Furtado | ATOR/ATRIZ PRINCIPAL | CPF: 035.989.941-25 | Brasilia/DF | Email: saboya.mari@gmail.com | Prestacao: R$450,00 | Imagem: R$1.050,00 | Total: R$1.500,00

**Exemplo real (Job 031 - Ogilvy):**
- Aleksei Krylov | ATOR/ATRIZ PRINCIPAL | CPF: 718.516.751-59 | Rio de Janeiro/RJ | Prestacao: R$45,00 | Imagem: R$250,00 | Taxa: R$50,00
- Alinne Victoria Pereira Moraes | FIGURACAO ESPECIAL | Prestacao: R$0 | Imagem: R$250,00 | Taxa: R$50,00

**Tipos de Elenco encontrados:**
- ATOR/ATRIZ PRINCIPAL
- FIGURACAO ESPECIAL

### 4.3 Aba CODIGO_ROBO

Configuracoes do Apps Script para geracao de contratos:
- `B1`: ID da pasta destino para PDFs gerados
- `B2`: ID do Google Doc com dados de aprovacao interna (cliente/agencia)

**Job 038:**
- Pasta PDFs: `1LNG3EcMQKyqppEQdKZj6cne3Zkig3b05`
- Doc aprovacao: `1B5vhSNwuH_dpXdPKRRW4b5bi1PuyLq1WWkJU3JD`

### 4.4 Aba DOCUSEAL_LOG

Presente nos jobs mais recentes. Campos:
`ROW, NOME, EMAIL, STATUS_ENVIO, SUBMISSION_ID, LINK_MODELO, LINK_PRODUTORA, ULTIMO_ERRO, TENTATIVAS, ULTIMA_TENTATIVA_EM, JOB_SLUG, SAFE_KEY`

Indica que o EllahOS ja substituiu o Apps Script para geracao de contratos em jobs recentes, com log auditavel.

---

## 5. PLANILHAS EQUIPE_DO_JOB

**Padrao:** `{JOB} - EQUIPE_DO_JOB`
**Local:** `{JOB}/05_CONTRATOS/02_CONTRATOEQUIPE/`

### 5.1 Abas

| Aba | Funcao |
|-----|--------|
| Respostas ao formulario 2 | Dados preenchidos pelo Google Form de cadastro de equipe |
| ELENCO | Aba auxiliar (geralmente vazia) |
| CODIGO_ROBO | IDs de pastas e docs para o robo |

### 5.2 Google Form de Equipe - Campos Completos

O Form coleta os seguintes dados da equipe tecnica freelancer:
```
1. Carimbo de data/hora
2. Endereco de e-mail
3. Ja trabalhou com a gente antes?
4. Nome Completo (repetido - por logica de branching)
5. Funcao no Job
6. Diarias de Filmagem (numero)
7. Cache acordado com o Diretor de Producao (valor)
8. Nome Completo (secao 2 para quem nao trabalhou antes)
9. Funcao no Job
10. CPF (APENAS NUMEROS)
11. RG
12. Data de Nascimento
13. DRT (Se tiver)
14. Endereco Completo
15. Cidade
16. CEP
17. E-mail
18. Telefone
19. CTPS (Se quiser fornecer)
20. Em caso de sim na resposta anterior, diz (campo condicional)
21. Cache acordado com o Diretor de Producao (repetido)
22. Diarias de Filmagem (repetido)
23. BANCO
24. AGENCIA
25. CONTA (Se tiver digito, escrever com digito)
26. C/C ou C/P (Conta Corrente ou Conta Poupanca)
```

**Exemplo real de resposta (Job 040 - Pura/Unum):**
| Membro | Funcao | Cache | Banco |
|--------|--------|-------|-------|
| Joan Josep ibars Pallas | Diretor de Arte | R$ 6.000,00 | Nubank |
| Arthur Caio Marau da Cruz | Ajudante de Arte I | R$ 570,00 | NUBANK |
| Marcello Luiz Garofalo Avian | Diretor de Producao | R$ 10.000,00 | NU Bank |
| Fernando Ricardo Hanriot Selasco Junior | Operador de Camera | R$ 4.000,00 | Nubank |

**Exemplo real (Job 038 - Senac):**
| Membro | Funcao | Cache | Banco | Agencia | Conta |
|--------|--------|-------|-------|---------|-------|
| Ana Claudia Laforga | Assistente de Direcao I | R$ 6.000,00 | Banco do Brasil | 3026-0 | 15478-4 |
| (Hanna - dado incompleto) | - | R$ 7.000,00 | Nubank | 0001 | 10979857-3 |
| (Gabriela - dado incompleto) | - | R$ 5.000,00 | Itau (341) | 3098 | 32151-0 |
| (Ricardo - dado incompleto) | - | R$ 56,00 (??) | Inter | 0001 | 21801589-5 |

**Observacao critica:** Varios campos do form estao com dados duplicados ou corrompidos (campos nomes vazio, valores errados como R$56,00 para uma diaria, CPF no campo de cache). Isso e um problema real de qualidade de dado do processo atual.

---

## 6. PLANILHAS CRONOGRAMA

**Padrao:** `CRONOGRAMA {NUMERO}_{NOME}`
**Local:** `{JOB}/04_CRONOGRAMA/` ou `{JOB}/10_VENDAS/PRODUTOR_EXECUTIVO/01_INICIO_DO_PROJETO/04_CRONOGRAMA/`

### 6.1 Abas

| Aba | Funcao |
|-----|--------|
| Calendario | Gantt visual gerado automaticamente a partir da aba Processo |
| Processo | Lista de fases com datas inicio/fim e configuracoes |
| DE_PARA | Mapeamento de IDs das fases |

### 6.2 Aba PROCESSO - Estrutura Completa

Colunas:
- Ordem (numero sequencial)
- Fase (selecionavel via dropdown)
- Complemento (texto livre - hora, observacao)
- Primeiro Dia (data)
- Ultimo Dia (data)
- Pular o FINAL DE SEMANA? (booleano)
- Dias de Trabalho (calculado automaticamente)

**Fases padrao (dropdown):**
```
1. Orcamento / Aprovacao
2. Reuniao de Briefing
3. Pre-Producao
4. PPM (Pre-Production Meeting)
5. Filmagem
6. Pos-Producao
7. Entrega
```

**Emojis por fase (sistema visual):**
- Orcamento: 💰
- Reuniao de Briefing: 🗓️
- Pre-Producao: 📋
- Aprovacao: ✅
- PPM: 📅

**Exemplo real (Job 028 - COMLURB):**
| Ordem | Fase | Data Inicio | Data Fim | Dias |
|-------|------|-------------|----------|------|
| 1 | Aprovacao | 24/04/2025 | 24/04/2025 | 1 |
| 2 | Reuniao de Briefing | - | - | - |
| 3 | PPM (Agencia 10:30) | 26/04/2025 | 26/04/2025 | 1 |

**Exemplo real (Job 031 - Ogilvy):**
| Ordem | Fase | Data Inicio |
|-------|------|-------------|
| 1 | Aprovacao (10 hrs) | 12/05/2025 |
| 2 | Reuniao de Briefing (12 hrs) | 12/05/2025 |
| 3 | Pre-Producao | 13/05/2025 |

**Exemplo real (Job 038 - Senac):**
| Ordem | Fase | Data Inicio |
|-------|------|-------------|
| 1 | Orcamento / Aprovacao | 11/11/2024 |
| 2 | Reuniao de Briefing | 12/11/2024 |
| 3 | Pre-Producao | 12/11/2024 a 13/11/2024 |

### 6.3 Aba DE_PARA

Mapeamento de fases para IDs (usado pela formula do Gantt):
- Orcamento → 1
- Reuniao de Briefing → 2
- Pre-Producao → 3
- (continua ate Entrega)

**Status no EllahOS:** O modulo de Cronograma/Timeline foi implementado no commit 8f8508a (G-01 fechado). A estrutura de dados reflete o que foi visto aqui.

---

## 7. PLANILHA CADASTRO_CLAQUETE

**Funcao:** Registro das pecas (filmes) para geracao da claquete ANCINE.

**Local:** `{JOB}/09_ATENDIMENTO/05_CLAQUETE/CADASTRO_CLAQUETE`

### 7.1 Abas

| Aba | Funcao |
|-----|--------|
| CODIGO_ROBO | ID do template Google Doc da claquete |
| DADOS | Dados de cada peca para preenchimento da claquete |

### 7.2 Aba DADOS - Colunas Completas

```
INDICE | TITULO | DURACAO | PRODUTO | ANUNCIANTE | AGENCIA | DIRETOR DE CENA |
TIPO | SEGMENTO | CRT | PRODUTORA | CNPJ | PRODUTORA DE AUDIO |
ANO DE PRODUCAO | CLOSED CAPTION | TECLA SAP | LIBRAS
```

**Exemplo real (Job 037 - Bahia Regionais / PROPEG):**
| # | Titulo | Duracao | Anunciante | Agencia | Diretor |
|---|--------|---------|------------|---------|---------|
| 1 | CARRINHO DE CAFE | 60" | SECOM | PROPEG COMUNICACAO S/A | TIAGO CAVALCANTI |
| 2 | CARRINHO DE CAFE 0105 | 30" | SECOM | PROPEG COMUNICACAO S/A | TIAGO CAVALCANTI |
| 3 | CARRINHO DE CAFE 0205 | 30" | SECOM | PROPEG COMUNICACAO S/A | TIAGO CAVALCANTI |
| 4 | CARRINHO DE CAFE 0305 | 30" | SECOM | PROPEG COMUNICACAO S/A | TIAGO CAVALCANTI |

Dados fixos:
- Produtora: ELLAH FILMES LTDA
- CNPJ: 52.212.223/0001-16
- Produtora de Audio: Estudio Muzak
- CRT: 20260006390008 (numero sequencial ANCINE)
- Tipo: COMUM
- Segmento: TODOS OS SEGMENTOS DE MERCADO
- Closed Caption: SIM
- Tecla SAP: NAO
- Libras: SIM

**Relevancia para EllahOS:** NAO existe modulo de claquete. Gap identificado pela primeira vez nesta analise.

---

## 8. APPS SCRIPTS - AUTOMACOES DO DRIVE

### 8.1 Script 1: MODELO_DOC_ID (Gerador de Contratos de Elenco)

**ID:** `15IgSCKO6stLHwDIzFnln38EzhnhMYbCqnW1hHIYmShJCAhLiVaoBBAO8`
**Modificado:** 05/11/2025

**Fluxo completo:**
1. n8n envia POST com `{spreadsheetId, token, onlyRow?, sendEmail?}`
2. Script abre a planilha CADASTRO_ELENCO e le aba ELENCO
3. Abre Google Doc "Docs-Fonte" com dados do cliente/agencia (pre-preenchido manualmente)
4. Para cada ator (linha 4+):
   a. Calcula SAFE_KEY = SHA-256(jobSlug | cpf | email) para idempotencia
   b. Se PDF ja existe com mesma safe_key: retorna URL existente (reuso)
   c. Copia template de contrato (`1NpMEmZnOudHnfUxE1qiLmL98qh_2-5rqzaewZUqkrko`)
   d. Preenche ~40 placeholders no doc copiado
   e. Converte para PDF e salva na pasta do job
   f. Marca as colunas AF/AG/AH com safe_key, PDF_ID, PDF_URL
   g. Opcionalmente envia PDF por email ao ator
5. Retorna JSON com lista de contratos gerados para o n8n processar

**Placeholders do template de contrato:**
```
{{NOME_COMPLETO}}, {{CPF}}, {{RG}}, {{DRT}}, {{DATA_NASCIMENTO}},
{{ENDERECO}}, {{CIDADE}}, {{ESTADO}}, {{CEP}}, {{EMAIL}}, {{TELEFONE}},
{{PROFISSAO}}, {{OQUEFEZ}}, {{DIARIA}}, {{ELENCO}},
{{RAZAO_SOCIAL}}, {{ENDERECO_AGENCIA}}, {{CNPJ_AGENCIA}},
{{REPRESENTANTE_LEGAL}}, {{RG_AGENCIA}}, {{CPF_AGENCIA}},
{{NOME_CLIENTE}}, {{ENDERECO_CLIENTE}}, {{CNPJ_CLIENTE}},
{{CNPJ_AGENCIA_PUBLI}}, {{END_AGENCIA_PUBLI}}, {{NOME_AGENCIA_PUBLI}},
{{CIDADE_AGENCIA_PUBLI}}, {{ESTADO_AGENCIA_PUBLI}}, {{CEP_AGENCIA_PUBLI}},
{{TITULO}}, {{PRODUTO}}, {{QTDE_PECAS}}, {{SUP_OBRA}}, {{DURACAO}},
{{EXCLUSIVIDADE}}, {{VEICULACAO}}, {{COMP_GRAFICA}}, {{MIDIA}},
{{VALOR_TOTAL}}, {{VALOR_AGENCIAMENTO}}, {{VALOR_IMAGEM}}, {{VALOR_PRESTACAO}},
{{VALOR_TOTAL_EXTENSO}}, {{VALOR_AGENCIAMENTO_EXTENSO}},
{{VALOR_IMAGEM_EXTENSO}}, {{VALOR_PRESTACAO_EXTENSO}},
{{DATA_ATUAL}}
```

**Google Doc "Docs-Fonte" - campos que extrai por regex:**
```
Nome da empresa (cliente): ...
Endereco (cliente): ...
Cidade (cliente): ...
Estado (cliente): ...
CEP (cliente): ...
CNPJ (cliente): ...
CNPJ (agencia): ...
Endereco (agencia): ...
Nome da empresa (agencia): ...
Cidade (agencia): ...
Estado (agencia): ...
CEP (agencia): ...
Titulo(s) do(s) filme(s): ...
Produto: ...
Quantidade de pecas Publicitarias: ...
Suporte da obra: ...
Quantidade de filme(s), duracao(oes), versao(oes) e/ou reducao(oes): ...
Exclusividade?: ...
Periodo: ...
Computacao grafica: ...
Midia impressa e/ou foto still?: ...
```

**Status no EllahOS:** Substituido pelo DocuSeal com assinatura digital. DocuSeal tem ~50 placeholders e fluxo de assinatura eletronica legalmente valida.

### 8.2 Script 2: CRIADOR DE PASTA_JOB_FECHADO

**ID:** `1VnMn1va5TUfs7SVbc2VMa8lHiPiBn3Ot5_XW0PsQuLnAbTF_vMeIoAkb`
**Modificado:** 24/10/2025

**O script PRINCIPAL da operacao Ellah. Cria toda a estrutura de um novo job.**

**Configuracoes (CONFIG):**
- MASTER_SS_ID: `13cOwWutmLhFdAvL4h-Dkpb_ObglPft2yphck2wAwvoU` (planilha master)
- pasta2024Id: `1vWSYrPSJswMSkeN5QED37MNTiaaib1id` (pasta do ano atual)
- pastaBaseId: `1MEgFUwlOa5xsBpGrNZT3otsrkerp6sOd` (01_PASTA_BASE_ADM)
- N8N_CALLBACK_URL: `https://ia.ellahfilmes.com/webhook/4154ad0b-d8eb-4a3a-95d8-fa6fca626066`

**Fluxo completo de criacao de job:**
1. Valida cabecalhos obrigatorios na aba NUMERO DE JOB
2. Gera codigo do job (ex: `028_COMLURB_PMRJ_Agencia3`)
3. Verifica duplicatas (anti-duplicata)
4. Copia recursivamente a pasta `01_PASTA_BASE_ADM` renomeando tudo com prefixo do job
5. Para cada subpasta criada: aplica permissoes por tipo de pasta
6. Copia e renomeia a planilha "Super Modelo - NAO MEXER E NEM DELETAR" para `GG_{JOB}`
7. Move a GG para `02_FINANCEIRO/03_GASTOS GERAIS/`
8. Executa uma serie de funcoes para renomear e salvar URLs:
   - Carta de Orcamento (preenche campos do contrato)
   - Cronograma
   - CADASTRO_ELENCO
   - Aprovacao Interna
   - Contratos PDF (configura CODIGO_ROBO)
   - Roteiro
   - Planilha de Equipe
   - PPM
   - Fechamento de Producao/Arte/Figurino
   - Pre-Arte/Figurino
   - Material Bruto
9. Publica e configura o Google Form de cadastro de equipe
10. Vincula o Form a planilha EQUIPE_DO_JOB
11. Aplica formulas nas colunas J, K, M da planilha Master
12. Callback para n8n

**Permissoes por tipo de pasta:**
| Pasta | Quem acessa |
|-------|-------------|
| 09_ATENDIMENTO | Equipe Atendimento + EMAIL_DO_ATENDIMENTO + DIRETOR |
| 10_VENDAS | Equipe Comercial + Produtor Executivo + EMAIL_PRODUTOR_EXECUTIVO |
| 02_FINANCEIRO | Equipe Financeiro |
| POS_PRODUCAO | Equipe Pos |
| PRODUCAO | Equipe Producao + DIRETOR |
| Demais | Socios |

**Status no EllahOS:** A Edge Function `drive-integration` faz a criacao de pastas mas NAO aplica permissoes granulares por papel (Gap G-04).

---

## 9. GOOGLE FORMS (35 formularios)

### 9.1 Formulario de Cadastro de Equipe

**Criado por:** Apps Script ao criar novo job
**Publicado em:** `{JOB}/05_CONTRATOS/02_CONTRATOEQUIPE/`
**Vinculado a:** Planilha `{JOB} - EQUIPE_DO_JOB` (aba "Respostas ao formulario 2")

**Configuracoes do form:**
- `setRequireLogin(false)` - acesso anonimo
- `setCollectEmail(true)` - coleta email mesmo sem login
- `setLimitOneResponsePerUser(true)` - 1 resposta por email
- `setAllowResponseEdits(true)` - permite edicao
- `setShowProgressBar(true)` - barra de progresso
- Mensagem de confirmacao: "Obrigado por se cadastrar! Suas informacoes foram salvas com sucesso."

**Fluxo:**
1. Script cria job → cria form → publica URL publica
2. URL salva na planilha Master (coluna URL_CADASTRO_EQUIPE)
3. Freelancer recebe URL (via WhatsApp ou email) → preenche dados
4. Respostas vao para aba "Respostas ao formulario 2" na planilha EQUIPE_DO_JOB
5. Dados usados para contratos e pagamentos

**Status no EllahOS:** Parcialmente substituido pelo Portal do Fornecedor (`/vendor/[token]`). O fluxo e diferente mas equivalente. O portal nao tem barra de progresso nem mensagem de confirmacao customizada.

---

## 10. GOOGLE DOCS IMPORTANTES

**Nota:** A Docs API nao estava habilitada no projeto GCP durante a varredura. Os docs foram catalogados por nome mas o conteudo nao foi lido.

### 10.1 Templates de Contrato

- **Modelo de contrato de elenco:** ID `1NpMEmZnOudHnfUxE1qiLmL98qh_2-5rqzaewZUqkrko` (usado pelo MODELO_DOC_ID)
- **Template de claquete:** `1lYq6ryCFA9mH2bLnzpYYZyEOce-iDGqS` (job 037)
- **Template de claquete (Ogilvy):** `1PnenXfzx7KqxwgHdtOFztGpDkkO56yRC` (job 031)
- **Aprovacao Interna:** Renomeado para `Aprovacao_interna_{JOB}` por job

### 10.2 Carta de Orcamento (Documento Timbrado)

- Template: `TIMBRADO_ELLAH_FILMES_OFICIAL`
- Renomeado para `Carta_Orcamento_{JOB}`
- Pre-preenchido pelo Apps Script com campos basicos do job
- Salvo em `{JOB}/10_VENDAS/PRODUTOR_EXECUTIVO/01_INICIO_DO_PROJETO/02_DECUPADO/CARTAORCAMENTO/`

### 10.3 Docs-Fonte (Cliente/Agencia)

- Um doc por job com dados estruturados do cliente e agencia
- Preenchido manualmente pelo atendimento
- Usado pelo gerador de contratos de elenco (extrai dados por regex)
- Campos extraidos: nome/endereco/CNPJ do cliente e agencia, titulo do filme, produto, duracao, exclusividade, veiculacao

### 10.4 Aprovacao Interna

- Template que vira o documento de aprovacao interna para o cliente
- ID salvo na aba CODIGO_ROBO do CADASTRO_ELENCO (`B2`)
- Um por job

---

## 11. WORKFLOWS IMPLICITOS DA OPERACAO

### 11.1 Workflow: Aprovacao de Job (Orcamento → Job Fechado)

```
1. Orcamento criado em 000_Orcamentos_em_Negociacao/
   └─ Pasta ORC-YYYY-XXXX criada manualmente
   └─ Carta de orcamento gerada (Google Doc timbrado)

2. Cliente aprova
   ├─ Atendimento preenche aba NUMERO DE JOB da planilha Master
   │   (NOME, AGENCIA, CLIENTE, EMAIL ATENDIMENTO, DIRETOR, PRODUTOR EXECUTIVO)
   └─ Clica no botao "Criar Pasta" no CRIADOR DE PASTA

3. Apps Script executa (~2-3 minutos):
   ├─ Gera codigo do job (ex: 040_PURA_UNUM)
   ├─ Copia 01_PASTA_BASE_ADM → cria ~55 pastas renomeadas
   ├─ Copia GG template → salva em 02_FINANCEIRO/03_GASTOS GERAIS/
   ├─ Renomeia todos os documentos com prefixo do job
   ├─ Aplica permissoes por pasta (Atendimento, Financeiro, Pos, Comercial)
   ├─ Publica Google Form de equipe
   ├─ Vincula form a planilha EQUIPE_DO_JOB
   ├─ Salva ~15 URLs na planilha Master
   └─ Callback para n8n (webhook)

4. n8n recebe callback:
   └─ (integracao com EllahOS futura)
```

### 11.2 Workflow: Onboarding da Equipe Tecnica

```
1. Diretor de Producao sabe quem vai na equipe
2. Envia link publico do Google Form (URL_CADASTRO_EQUIPE da Master)
   via WhatsApp
3. Freelancer preenche o form com todos os dados pessoais + bancarios
4. Respostas chegam na planilha EQUIPE_DO_JOB automaticamente
5. Financeiro revisa os dados
6. Dados usados para:
   ├─ Pagamentos (transferencia bancaria)
   └─ Contratos (futuramente via DocuSeal no EllahOS)
```

**Problemas identificados no processo atual:**
- Dados duplicados no form (formulario com branching confuso)
- Valores incorretos (R$56 para uma diaria, CPF no campo errado)
- Sem validacao automatica de CPF/CNPJ
- Sem confirmacao de recebimento dos dados ao financeiro

### 11.3 Workflow: Contratos de Elenco

```
1. Producao de elenco preenche CADASTRO_ELENCO_{JOB} com dados dos atores
   ├─ Linha 1: Dados da agencia de elenco
   └─ Linhas 4+: Dados de cada ator

2. n8n dispara (ou producao aciona manualmente):
   POST para URL do Apps Script MODELO_DOC_ID com:
   - spreadsheetId = ID do CADASTRO_ELENCO
   - token = 'ellahfilmesaprimeiraIA'

3. Script gera PDF para cada ator:
   ├─ Verifica idempotencia (nao duplica se ja gerou)
   ├─ Copia template de contrato
   ├─ Preenche ~40 campos
   ├─ Converte para PDF
   └─ Salva no Drive

4. Script retorna JSON com URLs dos PDFs para o n8n
5. n8n envia os PDFs por email ou WhatsApp

PROBLEMA: Sem assinatura digital valida legalmente.
SOLUCAO EllahOS: DocuSeal com assinatura eletronica (ja implementado).
```

### 11.4 Workflow: Calendario Financeiro

```
1. Financeiro preenche aba CALENDARIO da GG com:
   ├─ Data de cada deposito esperado
   └─ Valor de cada deposito

2. A aba calcula automaticamente:
   ├─ Semana do pagamento
   ├─ Dias ate o vencimento
   └─ Status (via color-coding)

3. Financeiro usa a aba como referencia para:
   ├─ Saber quando cobrar o cliente
   └─ Saber quando pagar a equipe/fornecedores

FLUXO TIPICO DE DEPOSITOS:
- Deposito 1: ~25% na aprovacao
- Deposito 2: ~20% antes da filmagem
- Deposito 3: ~30% na entrega do bruto
- Deposito 4: ~25% na entrega final

EXEMPLO JOB 038 (Senac - R$719k):
- 22/01: R$31k (4,3%)
- 27/01: R$25k (3,5%)
- 13/02: R$37k (5,1%)
- 25/02: R$39k (5,4%)
- 13/03: R$587k (81,6%) → pagamento principal
```

### 11.5 Workflow: Pedido de NF

```
1. Job encerrado ou parcialmente concluido
2. Producao/Financeiro preenche aba PEDIDO EMISSAO NF:
   ├─ Dados do tomador (cliente)
   └─ Valor e descritivo do servico

3. Envia via WhatsApp (canal #19 da planilha Master)
   para financeiro@ellahfilmes.com

4. Financeiro emite NF

5. NF salva no Drive em pasta especifica

REGRAS DE NEGOCIO IDENTIFICADAS:
- Descritivo incompleto → financeiro devolve para correcao
- Dados bancarios NAO vao no corpo da mensagem
- NFe obrigatoriamente enviada para financeiro
```

### 11.6 Workflow: Claquete ANCINE

```
1. Para cada peca publicitaria do job:
   Atendimento preenche CADASTRO_CLAQUETE com:
   - Titulo, Duracao, Produto, Anunciante, Agencia
   - Diretor de Cena, Tipo, Segmento, CRT
   - Produtora de Audio, Ano
   - Closed Caption, SAP, Libras

2. Apps Script (DOCS_CLAQUETE) le os dados e:
   └─ Preenche template de claquete Google Doc
   └─ Gera PDF oficial da claquete para ANCINE

3. PDF salvo em 09_ATENDIMENTO/05_CLAQUETE/

NOTA: Este workflow NAO existe no EllahOS ainda (gap identificado).
```

---

## 12. GAPS IDENTIFICADOS NESTA ANALISE

### 12.1 Gaps Pre-Existentes (do Relatorio Anterior)

| # | Gap | Status |
|---|-----|--------|
| G-01 | Cronograma/Timeline por job | IMPLEMENTADO (commit 8f8508a) |
| G-02 | Dashboard financeiro por job | SPEC pronta, a implementar |
| G-03 | Calendario de pagamentos | Pendente |
| G-04 | Permissoes Drive por papel | Pendente |

### 12.2 Gaps Novos Identificados Nesta Analise

| # | Gap Novo | Impacto | Esforco |
|---|----------|---------|---------|
| G-13 | **Modulo de Claquete ANCINE** | Cada peca publicitaria precisa de claquete registrada. Processo atual e manual via Google Doc. | Medio (1-2 dias) |
| G-14 | **Validacao de dados do Form de Equipe** | Dados corrompidos chegam (CPF no campo cache, valores errados). Sem validacao automatica. | Baixo (1 dia) |
| G-15 | **Docs-Fonte (dados cliente/agencia por job)** | O gerador de contratos le dados de um Google Doc pre-preenchido manualmente. Dados frageis e sem versionamento. | Medio (1-2 dias) |
| G-16 | **Docs API desabilitada no GCP** | Nao e possivel ler conteudo de Google Docs via SA. Templates de contrato nao sao acessiveis programaticamente. | Baixo (config) |
| G-17 | **Regras condicionais por tipo/valor** | A planilha Master tem regras (ex: job >R$250k notifica CEO). O EllahOS nao tem sistema de regras de negocio configuravel. | Alto (3-5 dias) |
| G-18 | **Checklist por tipo de projeto** | A planilha tem checklists por tipo (Publicidade TV, Monstro, etc.). O EllahOS nao tem checklists dinamicos por tipo. | Medio (2-3 dias) |
| G-19 | **Callback n8n no criador de pasta** | O script faz callback para n8n ao criar job. O EllahOS `drive-integration` nao faz callback. | Baixo (1 dia) |
| G-20 | **Aba PEDIDO EMISSAO NF com INDEX de canal** | O campo INDEX = 19 referencia um canal WhatsApp especifico. O EllahOS nao mapeia canais por job. | Baixo (config) |
| G-21 | **Multiplos orcamentos (OC_3_DEPO, OC_5_DEPO)** | Jobs com pagamento escalonado tem OC variante por numero de depositos. A UI nao distingue variantes. | Medio (1-2 dias) |
| G-22 | **Formulas financeiras na Master** | A Master calcula Custos Reais, Imposto 12%, Margem via IMPORTRANGE da GG. Sem equivalente no EllahOS. | Medio (implementar views/endpoint) |

---

## 13. WORKFLOWS IMPLICITOS - QUEM FAZ O QUE, QUANDO

### 13.1 Papeis e Responsabilidades

| Papel | Responsavel | O que faz nas planilhas |
|-------|-------------|------------------------|
| CEO | Aurelio Lustosa | Aprova jobs de alto valor (>R$250k), acesso total |
| Produtora Executiva | Danillo Lucas | Preenche NUMERO DE JOB, aciona criacao de pasta, supervisiona financeiro |
| CCO | Telma dos Reis | Acompanha CRM/orcamentos, atendimento, comercial |
| Financeiro | financeiro@ellahfilmes | Preenche GG (custos reais, depositos), emite NF, paga equipe |
| Atendimento | Email por job | Preenche cronograma, aprovacao interna, claquete |
| Diretor de Producao | Por job (freelancer) | Preenchimento do GG (equipe, custos), acesso 09_ATENDIMENTO |
| Producao de Elenco | Por job (agencia) | Preenche CADASTRO_ELENCO, aciona geracao de contratos |
| Freelancer | Por job | Preenche Google Form de equipe (dados pessoais + bancarios) |

### 13.2 Linea do Tempo de um Job (Reconstruida)

```
SEMANA -4 a -2 (Pre-Aprovacao):
├─ Orcamento criado em 000_Orcamentos
├─ Carta de orcamento enviada ao cliente
└─ Negociacao via CRM

SEMANA -1 (Aprovacao):
├─ Cliente aprova
├─ Atendimento preenche NUMERO DE JOB na Master
├─ Apps Script cria estrutura (55 pastas + GG + forms)
└─ n8n notifica equipe

SEMANA 0-2 (Pre-Producao):
├─ Diretor de Producao montado
├─ Form de equipe enviado para freelancers via WhatsApp
├─ Freelancers preenchem dados (nome, CPF, banco, cache)
├─ Atendimento preenche Cronograma
├─ PPM (Pre-Production Meeting) com agencia
└─ Financeiro configura CALENDARIO com datas de deposito

SEMANA 2-4 (Producao):
├─ Filmagem executada
├─ Material bruto vai para 08_POS_PRODUCAO/01_MATERIAL BRUTO
├─ Deposito 1-2 recebidos do cliente
└─ Equipe tecnica recebe pagamentos

SEMANA 4-8 (Pos-Producao):
├─ Edicao, color, finalizacao em 08_POS_PRODUCAO
├─ Aprovacoes internas e do cliente
└─ Deposito 3 recebido

SEMANA 8-10 (Entrega):
├─ Copias finais entregues
├─ Claquete ANCINE gerada
├─ NF emitida pelo financeiro
└─ Deposito final recebido

FECHAMENTO:
├─ GG fecha P&L (OC vs Real)
├─ Todos os contratos arquivados
└─ Job marcado como CONCLUIDO na Master
```

---

## 14. O QUE O ELLAHOS JA SUBSTITUI (CONFIRMADO)

| Funcao Drive/Sheets | Modulo EllahOS | Confirmado Nesta Analise |
|--------------------|----------------|--------------------------|
| Planilha Master (NUMERO DE JOB) | `jobs` + dashboard /jobs | Sim - estrutura mais rica |
| Aba OC | `job_budgets` + `budget_items` | Sim |
| Aba CUSTOS_REAIS | `cost_items` + CostItemsTable | Sim |
| Aba EQUIPE | `job_team` + `people` | Sim - dados bancarios em `vendors` |
| Aba DEPOSITOS | `payment_transactions` | Sim |
| Aba PEDIDO EMISSAO NF | `nf_requests` + n8n | Sim |
| CADASTRO_ELENCO | `job_cast` + TabCast | Sim - com DocuSeal |
| Google Form de Equipe | Portal Fornecedor `/vendor/[token]` | Sim - fluxo diferente |
| CHECKLIST_JOB_TIPO | NAO - ausente | Gap G-18 identificado |
| CADASTRO_CLAQUETE | NAO - ausente | Gap G-13 identificado |
| Criador de Pastas (Apps Script) | `drive-integration` EF | Sim - sem permissoes (G-04) |
| Gerador de Contratos (Apps Script) | DocuSeal integration | Sim - com assinatura |
| Pipeline orcamentos | CRM Kanban /crm | Sim |
| CRONOGRAMA | Modulo Timeline | Sim - G-01 fechado |
| DASHBOARD GG | Parcial - /financeiro | G-02 em spec |
| CALENDARIO pagamentos | Dados em `cost_items` | G-03 sem UI |

---

## 15. RECOMENDACOES DE FEATURES BASEADAS NO CONTEUDO REAL

### PRIORIDADE 1 — Fechar gaps criticos (ate 1 semana)

**G-02 Dashboard Financeiro por Job (2 dias)**
Spec e arquitetura prontas (docs/specs/dashboard-financeiro/). Implementar:
- Card resumo: OC total, Gasto real, Saldo, Margem %
- Graficos de pizza por categoria de custo
- Comparativo OC vs Real por categoria

**G-03 Calendario de Pagamentos (2 dias)**
Baseado na aba CALENDARIO da GG. Implementar:
- Visao mensal/semanal dos pagamentos a vencer
- Color-coding: pago (verde), pendente (amarelo), atrasado (vermelho)
- Dados ja existem em `cost_items.payment_due_date` e `payment_transactions`

**G-04 Permissoes Drive por Papel (1-2 dias)**
Baseado no `aplicarPermissoes()` do Apps Script. Implementar:
- Matriz de permissoes da aba MAPA_DE_PERMISSOES_POR_FUNCAO
- Aplicar ao criar job: Atendimento acessa 09_ATENDIMENTO, Financeiro acessa 02_FINANCEIRO, etc.

### PRIORIDADE 2 — Features de alto impacto operacional (1-2 semanas)

**G-13 Modulo de Claquete ANCINE (2 dias)**
Funcao nova identificada nesta analise. Implementar:
- Formulario de dados da peca (titulo, duracao, CRT, segmento, etc.)
- Geracao automatica de PDF da claquete via template
- Armazenamento em `job_deliverables` ou tabela nova `job_claquetes`
- Link para pasta 09_ATENDIMENTO/05_CLAQUETE/ no Drive

**G-18 Checklists Dinamicos por Tipo de Job (2-3 dias)**
Baseado na aba CHECKLIST_JOB_TIPO e STATUS_JOB_ETAPA. Implementar:
- Templates de checklist por tipo (Publicidade TV, Monstro, Evento, etc.)
- Tracking de conclusao com responsavel e data prevista/realizada
- Status visual por fase (OK, Em aberto, Atrasado)

**G-14 Validacao de Dados do Portal Fornecedor (1 dia)**
Baseado nos problemas encontrados nas respostas reais do Form de Equipe. Implementar:
- Validacao de CPF (digito verificador)
- Validacao de CNPJ
- Validacao de agencia/conta bancaria (formato por banco)
- Campo de cache com minimo/maximo razoavel (evitar R$56 como diaria)
- Confirmacao por email ao fornecedor quando dados sao aceitos

**G-17 Regras de Negocio Configuravel (3-5 dias)**
Baseado na aba REGRAS_CONDICIONAIS_JOB. Implementar:
- Engine de regras simples: CAMPO + CONDICAO + VALOR → ACAO
- Acoes: notificar (email/WhatsApp), obrigar campo, criar tarefa
- Exemplos: job >R$250k notifica CEO, tipo Governo obriga decupagem

**G-21 Orcamentos Multi-Deposito (1-2 dias)**
Baseado nas abas OC_3_DEPO e OC_5_DEPO. Implementar:
- UI para criar variantes de OC por numero de depositos
- Calculo automatico de valor por deposito
- Link entre orcamento aprovado e calendario de pagamentos

**G-15 Docs-Fonte Estruturado (1-2 dias)**
Substituir o Google Doc de dados de cliente/agencia por campos estruturados no EllahOS:
- Dados do cliente: nome, CNPJ, endereco, cidade, estado, CEP
- Dados da agencia: mesmos campos
- Dados da obra: titulo, produto, qtde pecas, suporte, duracao, exclusividade, veiculacao
- Esses dados alimentam tanto contratos de elenco quanto claquetes

### PRIORIDADE 3 — Diferenciais (2-4 semanas)

**G-05 Catalogo de Material Bruto (5+ dias)**
- Indexar cada arquivo de video/audio no Drive com metadata
- Extrair: duracao, resolucao, codec, FPS, tamanho
- Interface para navegar o material por job
- Thumbnails/preview

**G-22 Formulas Financeiras Consolidadas (Medio)**
Implementar no endpoint de financeiro por job as mesmas formulas da Master:
- Custos Reais = soma do CUSTOS_REAIS da GG (ja tem em `cost_items`)
- Imposto = 12% do valor fechado
- Margem = Valor_Fechado - Custos - Imposto - Comissoes

**G-10 Storage Analytics (2 dias)**
- Calcular tamanho de cada job via Drive API
- Dashboard de uso de storage por job/ano
- Alertas de jobs com storage muito alto

---

## 16. DADOS DE EQUIPE RECORRENTE IDENTIFICADOS

Membros que aparecem em multiplos jobs (frequente na equipe):

| Nome | Email | Funcao |
|------|-------|--------|
| Andre de Oliveira Alves | andre_rock_roll@hotmail.com | Equipe Producao |
| Giulia Martinho Casado | giu.casado@gmail.com | Equipe Producao |
| Jose Luiz Lerma | Joseluizlerma@hotmail.com | Equipe Producao |
| Marcelo Brito do Espirito Santo Filho | marcelobritofilho@gmail.com | Equipe Producao |
| Marcello Luiz Garofalo Avian | marcelloavian@gmail.com | Diretor de Producao |
| Joan Josep ibars Pallas | j2i4p@yahoo.com.br | Diretor de Arte |
| Fernando Ricardo Hanriot Selasco Junior | hanriotselasco@gmail.com | Operador de Camera |
| Ana Claudia Laforga | analaforga@gmail.com | Assistente de Direcao |

Esses nomes devem ser pre-cadastrados na tabela `people` do EllahOS para facilitar o onboarding em jobs futuros.

---

## 17. DADOS DA PRODUTORA ELLAH FILMES

Dados institucionais encontrados nos documentos:

- **Razao Social:** ELLAH FILMES LTDA
- **CNPJ:** 52.212.223/0001-16
- **Email contato:** contas@ellahfilmes.com
- **Email financeiro:** financeiro@ellahfilmes.com
- **Produtora de Audio parceira:** Estudio Muzak

---

## 18. INDICE DE PLANILHAS GG IDENTIFICADAS

| Job | Nome | ID da GG | Volume (estimado) |
|-----|------|----------|-------------------|
| 011 | FOTOSTILL CRUZEIRO DO SUL FCB | 1YWeMJs_jKdTIzOMR3VXHlf6al07N1I5RCvfdnN-2u4o | R$26.500 |
| 014 | VERAO RJ Leiaute | 1f6ADrKd-pW0vRzLzQOgv7JlZl7p-lsuLJllrclCnQ2I | N/D |
| 016 | MEDICINA CRS FCB (perdeu) | ID na lista | N/D |
| 017 | EAD CRS FCB | 11gLFyiIZtdC7r4QhG5087TamwHrB_PpJP2Nx3S5U-VE | N/D |
| 018 | GGB PARTE2 PROPEG | 1vzokqRDsHBvs7b5ZGL7IflK9UVZFa-cPlzGsvmecgTc | N/D |
| 020 | ILHAPURA ASTRA | 1ZhDXT1v9LpqZJMVwcvNmVFHJpsCUDOmu4a_eHr7eers | N/D |
| 021 | ANIVERSARIO PFSP MENEPORTELA | 1NvFaFBf0EkAkACLKIR1FzkDiPvPXlaN00rQix5034Ks | N/D |
| 023 | Respeita Ellah Propeg | 1IG2RHTVyF5M1XblnL0LhplJB14VSnLQ5P2eBW62OydQ | N/D |
| 024 | MONSTRO CAIXA BINDER (perdeu) | ID na lista | N/D |
| 025 | Monstro INMETRO BINDER | 1ZhDXT1v9LpqZJMVwcvNmVFHJpsCUDOmu4a_eHr7eers | R$3.700+ |
| 026 | VERAO RJ NOVA MONTAGEM LEIAUTE | 1XN0mZAJ9wUA2U8SUJF_xLezE2bmYvroVbWW9CEKut2c | N/D |
| 027 | Resana MullenLowe | 1pK_7tAN2Z7cQFdRvLdurBFFrPdteaFe5iTQBycUPCEA | N/D |
| 028 | COMLURB PMRJ Agencia3 | 1QvI9Jxh1YXpM1PfOjO6mK4g59gIu3oiQEOBCRqGvkKc | N/D |
| 031 | SP PRA TODA OBRA Ogilvy | 1kMOxIZidEOdeQgGWuK_bWnmZcjJqak6gIfet01E2WLY | N/D |
| 033 | ILHAPURA ORNARE UNUM | 170kwzwf_m-wVUnNDw8aoNSVJDw5ISc3HUFZuOv7T91w | ~R$335.000 |
| 034 | VERAORJ VERSAO3 LEIAUTE | 1F2rAZtQGAJbL012hVmbGFgBqDKj9EWyCvI5PBkOSDQQ | N/D |
| 035 | MONSTRO DENGUE 2025 DEBRITTO | 1VleGTw0kXohCyi1dJsgs86Qc6wuKKPPHfMqZqStW-q8 | N/D |
| 036 | Simulacao de emergencia Mene Portella | 1gQT0d8oQBvB6r_5yncCd0dgHJsmZjpdIWwKxMoEUF5k | N/D |
| 037 | BAHIA REGIONAIS PAC POSICIONAMENTO PROPEG | 14lsfoYzcGnf0tYQRBczW5nBWo5xeVLal-s32gYtBCrg | ~R$319.000 |
| 038 | Quer Fazer Senac SENAC SP | 1TRn30J6u_5spPGw-z-WtsPEKSN2G9XvM2eVF7sykCLY | ~R$719.000 |
| 039 | FIM DE ANO LINHA SIMPATIA DEBRITO | 1chuzdhx-0dKAWD-kY4UTF3zqKR5pnggfkvb4C0bYf_w | N/D |
| 040 | PURA UNUM | 1cndDFFxJMnLGpoXmSJndBhpOVA34EpSNb0Yy0nGzlLI | ~R$248.000 |
| 099 | CAMINHO DOS VINHOS Ogilvy | 1hpaq4QjHHr1cZyCkq4AvUKsAgGph_NZW0PQejmfu_ag | N/D |

---

## 19. CONCLUSAO

### O que esta analise revelou de novo

1. **A operacao e muito mais sofisticada do que o Drive summary sugeria.** O Apps Script e um orquestrador complexo com validacoes, permissoes granulares por papel, idempotencia, anti-duplicatas e callback para n8n.

2. **A claquete ANCINE e um workflow proprio** que nao existia mapeado anteriormente (Gap G-13).

3. **Os dados de equipe chegam corrompidos** do Google Form - problema real de qualidade de dado que o Portal do Fornecedor do EllahOS precisa resolver com validacoes robustas (Gap G-14).

4. **O campo INDEX = 19 em todos os PEDIDO EMISSAO NF** indica um canal WhatsApp fixo (#19) para o financeiro - provavelmente o grupo "Financeiro Ellah". O EllahOS deve replicar esse roteamento.

5. **Os jobs tem volumes financeiros muito significativos** - o Job 038 (Senac) movimentou ~R$719k em poucos meses. A confiabilidade do EllahOS e critica.

6. **A equipe interna e de apenas 4 pessoas** - CEO, Produtora Executiva, CCO e Financeiro. O EllahOS precisa ser simples e rapido para pessoas que nao sao tecnicos.

7. **A Master tem formulas que puxam dados das GGs via IMPORTRANGE** - o EllahOS ja faz isso via API mas nao tem a visao consolidada da Master.

### Proximos passos recomendados

1. Implementar G-02 (Dashboard financeiro) - spec pronta
2. Implementar G-03 (Calendario de pagamentos) - 2 dias
3. Implementar G-13 (Claquete ANCINE) - feature nova de alto impacto
4. Corrigir G-14 (Validacao Portal Fornecedor) - qualidade de dado
5. Implementar G-04 (Permissoes Drive) - completar a automacao de job
6. Planejar G-18 (Checklists dinamicos) - substituir STATUS_JOB_ETAPA

---

*Documento gerado em 05/03/2026 pelo Integrations Engineer do EllahOS.*
*Baseado em: drive-catalog.json (22.708 itens), drive-summary.md (25 sheets lidas), apps-scripts-report.md (2 scripts completos), RELATORIO-FINAL-DRIVE-ELLAH.md.*
