# Analise das Planilhas de Custos da Ellah Filmes

**Data da analise:** 2026-02-26  
**Arquivos analisados:**
- GG_033_ILHAPURA_ORNARE_UNUM.xlsx --- Job fechado (NFs emitidas, pagas, comprovantes salvos)
- GG_038 Quer Fazer Senac_SENAC SP.xlsx --- Job em andamento (produtor preenchendo, pagamentos pendentes)

**Status:** Analise completa de todas as 8 abas, 41 colunas da aba CUSTOS_REAIS, todos os fluxos.

---

## 1. Estrutura Geral

Ambas as planilhas sao identicas em estrutura --- um template padrao da Ellah Filmes reutilizado por job.
Cada planilha gerencia um job completo: do orcamento ate o fechamento financeiro.

### Abas (8 total)

| Aba | Funcao | Status de uso |
|-----|--------|---------------|
| OC | Ordem de Compra --- orcamento do job | Preenchida pelo produtor antes da filmagem |
| CUSTOS_REAIS | Controle financeiro completo (NFs, pagamentos, comprovantes) | Principal aba operacional |
| EQUIPE | Cadastro de fornecedores/freelancers (nome, email, banco, PIX) | Banco de dados lookup |
| PRODUCAO | Reconciliacao de verbas depositadas vs NFs comprovadas | Controle do produtor |
| DEPOSITOS | Registro de adiantamentos de verba enviados ao produtor | Sub-registro financeiro |
| PEDIDO EMISSAO NF | Template de email para solicitar NF ao fornecedor | Ferramenta operacional |
| CALENDARIO | Fluxo de caixa --- datas e valores agrupados por vencimento | Visao financeira |
| DASHBOARD | Nao implementado (vazio) | Placeholder |

---

## 2. Aba OC (Ordem de Compra)

**Proposito:** Orcamento do job. O produtor preenche o que vai gastar com cada funcao/servico.
**Dimensoes:** ate ~1095 linhas, 9 colunas efetivas (A-I).

### Cabecalho do Job (linhas 2-14)

Campos do job preenchidos manualmente no topo da aba:

| Campo | Coluna | Exemplo GG_033 | Exemplo GG_038 |
|-------|--------|----------------|----------------|
| Titulo | F2 | ORNARE | (vazio) |
| Numero do Job | F3 | 33 | 38 |
| Cliente | H2 | ILHAPURA | SENAC SP |
| Agencia | H3 | UNUM | (vazio) |
| Atendimento | H4 | Renata/Thamires | (vazio) |
| Start do Job | F5 | 2025-07-20 | (vazio --- no OC) |
| Qtde de diarias | F6 | 1 | (vazio) |
| Diretor | H5 | KIKO | (vazio) |
| Vencimento | H6 | (data) | (data) |
| Faturamento | H7 | (valor) | (valor) |
| Budget | H9 | (valor) | (valor) |

### Colunas de Dados (a partir da linha 19)

| Coluna | Header | Preenchimento | Descricao |
|--------|--------|---------------|-----------|
| A | ID | Auto (=A_ant+1) | Indice sequencial do item |
| B | JOB ID | Manual | Numero do job |
| C | Item | Manual | Categoria de custo (1-99) |
| D | Sub Item | Manual | Subcategoria |
| E | Destino da Verba | Manual | Descricao do servico/cargo |
| F | Valor UNITARIO | Manual | Valor unitario em R$ |
| G | Qtde | Manual | Quantidade ou numero de diarias |
| H | Valor Total s/ HE | Auto (=F*G) | Total estimado sem hora extra |
| I | Fornecedor | Informal | Usado como status (PAGO, SEM NOTA) --- nao estruturado |

### Categorias de Custo (Itens/Secoes)

| Item | Categoria |
|------|-----------|
| 1 | Desembolsos de Verbas a Vista (figurino, locacao, alimentacao, uber, reembolsos) |
| 2 | Estudio |
| 3 | Locacao |
| 4 | Direcao de Arte / Figurinista / Make / Efeitos |
| 5 | Direcao de Cena / Direcao de Fotografia / Som Direto |
| 6 | Producao (Dir. Producao, Produtor, Coordenador, Ajudantes, Seguro) |
| 7 | Veiculos |
| 8 | Passagem, Hospedagem e Alimentacao |
| 9 | Camera, Luz, Maquinaria, Gerador, Infra de Producao |
| 10 | Producao de Casting |
| 11 | Objetos de Cena / Itens Cenograficos |
| 12 | Performance e Footage / Still / Bastidores |
| 13 | Pos Producao / Trilha / Roteirista / Condecine |
| 14 | Administrativo Legal / Financeiro / Atendimento |
| 15 | Monstro (extras e imprevistos) |
| 99 | Mao de Obra Interna (equipe Ellah Filmes) |

### Totais Financeiros

| Job | Orcamento OC | Custo Real (CUSTOS_REAIS) |
|-----|-------------|--------------------------|
| GG_033 ILHAPURA | R$ 168.922,69 | R$ 350.624,50 |
| GG_038 SENAC | R$ 644.400,00 | R$ 765.890,95 |

**Observacao critica:** O custo real do GG_033 e ~2x o orcamento OC. O OC e o orcamento aprovado pelo cliente;
o CUSTOS_REAIS reflete o custo real de producao incluindo todos os fornecedores, equipe e estrutura completa.

---

## 3. Aba CUSTOS_REAIS

**A aba mais importante da planilha.** 41 colunas (A-AO), ate 1126 linhas.

### Cabecalho (linhas 2-14)

Identico ao OC. Campo critico: **F5 = START DO JOB** (base de todos os calculos de vencimento).

- GG_033: start = 2025-07-20
- GG_038: start = 2026-01-25

### Mapa Completo das 41 Colunas

#### Bloco 1: Identificacao e Valores (A-I)

| Col | Header | Tipo | Descricao |
|-----|--------|------|-----------|
| A | ID | Auto | Indice unico incremental --- chave primaria da planilha |
| B | JOB ID | Manual | Numero do job |
| C | Item | Manual | Categoria de custo (1-99) |
| D | Sub Item | Manual | Subcategoria |
| E | Destino da Verba | Manual | Descricao do servico ou cargo |
| F | Valor UNITARIO | **Manual** | Valor unitario em R$ (digitado pelo produtor) |
| G | Qtde | **Manual** | Quantidade ou numero de diarias |
| H | Valor Total s/ HE | Auto | =F*G (total estimado sem hora extra) |
| I | Fornecedor | Auto | =H (replica o valor total; serve de referencia para verificacao) |
#### Bloco 2: Fornecedor e Condicao de Pagamento (J-P)

| Col | Header | Tipo | Descricao |
|-----|--------|------|-----------|
| J | Fornecedor | **Manual** | Nome completo do fornecedor --- chave de busca no cadastro EQUIPE |
| K | C/NF ou S/NF | **Manual** | Tipo e prazo de pagamento |
| L | Hora de Entrada | Manual | Hora de entrada na diaria (para calculo de hora extra) |
| M | Hora de Saida | Manual | Hora de saida |
| N | Total de Horas | Manual | Total de horas trabalhadas |
| O | Horas extras | Manual | Quantidade de horas extras |
| P | Valor HE | Manual | Valor monetario das horas extras |

**Valores da coluna K (Condicao de Pagamento):**

| Valor | Significado |
|-------|-------------|
| C/NF 30 dias | Com nota fiscal, vencimento em 30 dias apos start do job |
| C/NF 40 dias | Com nota fiscal, 40 dias |
| C/NF 45 dias | Com nota fiscal, 45 dias (mais utilizado) |
| C/NF 60 dias | Com nota fiscal, 60 dias |
| C/NF 90 dias | Com nota fiscal, 90 dias |
| A vista | Pagamento imediato no dia do start do job |
| S/NF 30 dias | Sem nota fiscal, 30 dias |
| (vazio) | Sistema gera alerta: COLUNA NOTA ZERADO E/OU START DO JOB ZERADO |

#### Bloco 3: Observacoes e Data de Vencimento (Q-R)

| Col | Header | Tipo | Descricao |
|-----|--------|------|-----------|
| Q | Observacoes | Manual | Campo livre para anotacoes |
| R | DATA PAGAMENTO | **Auto** | Formula: start_do_job + prazo conforme K |

**Formula da coluna R (data de vencimento calculada automaticamente):**



Exemplo verificado: GG_033 start=2025-07-20, C/NF 40 dias -> R=2025-08-29 (bate com pagamentos reais)
Exemplo verificado: GG_038 start=2026-01-25, C/NF 45 dias -> R=2026-03-11 (maior pagamento do job)

#### Bloco 4: Dados Bancarios do Fornecedor (S-AB)

| Col | Header | Tipo | Descricao |
|-----|--------|------|-----------|
| S | TELEFONE | Manual (raro) | Telefone do fornecedor |
| T | E-MAIL | **Auto (VLOOKUP)** | Email buscado pelo nome em J na aba EQUIPE |
| U | Razao Social | Manual (raro) | Razao social para constar na NF |
| V | Titular / Favorecido | Manual (raro) | Nome do titular da conta bancaria |
| W | CNPJ / CPF | Manual (raro) | Documento fiscal do fornecedor |
| X | Banco | **Auto (VLOOKUP)** | Nome do banco buscado pelo nome em J na aba EQUIPE |
| Y | Agencia | Manual (raro) | Numero da agencia bancaria |
| Z | Conta | Manual (raro) | Numero da conta bancaria |
| AA | C/P ou C/C | Manual (raro) | Tipo de conta (Corrente ou Poupanca) |
| AB | PIX | **Auto (VLOOKUP)** | Chave PIX buscada pelo nome em J na aba EQUIPE |

**Formula de preenchimento automatico dos dados bancarios:**


O nome digitado em J busca automaticamente email, banco e PIX na aba EQUIPE (cadastro centralizado).
Agencia, conta e tipo de conta (Y, Z, AA) ficam vazios --- o padrao e pagamento via PIX.

#### Bloco 5: Ciclo de Vida da NF (AC-AH)

| Col | Header | Tipo | Descricao |
|-----|--------|------|-----------|
| AC | PEDIDO NF | **Manual** | Status do pedido de NF ao fornecedor |
| AD | FORNECEU NF? | **Manual** | Confirmacao de recebimento da NF |
| AE | NF | **Manual** | Link do Google Drive com o arquivo da NF recebida |
| AF | PAGO? | **Manual** | Status do pagamento |
| AG | Quando? | **Manual** | Data real em que o pagamento foi efetuado |
| AH | COMPROVANTE PAGAMENTO | **Manual** | Nome do arquivo de comprovante (padrao de nomenclatura) |

**Valores da coluna AC (Pedido NF):**

| Valor | Significado |
|-------|-------------|
| PEDIDO | Email de solicitacao ja foi enviado ao fornecedor |
| SEM | Nao ha NF neste item (verba, reembolso, etc.) |
| Sem Nota | Variante informal de SEM |

**Valores da coluna AD (Forneceu NF?):**

| Valor | Significado |
|-------|-------------|
| SIM | Nota fiscal recebida e salva no Drive |
| NAO | Solicitada mas ainda nao recebida |
| Pegar PIX | Dado bancario pendente (caso especifico) |

**Valores da coluna AF (Pago?):**

| Valor | Significado |
|-------|-------------|
| PAGO | Pagamento efetuado |
| (vazio) | Pagamento pendente |

#### Bloco 6: Nomenclatura de Arquivos e Verificacao (AI-AL)

| Col | Header | Tipo | Descricao |
|-----|--------|------|-----------|
| AI | (sem header) | Auto | Nome padrao do arquivo de comprovante de pagamento |
| AJ | (sem header) | Auto | Nome padrao do arquivo de NF |
| AK | (sem header) | **Manual** | Valor real pago (quando difere do estimado em I) |
| AL | (sem header) | Auto (=AK=I) | Boolean: valor real pago bate com o estimado? |

**Padrao de nomenclatura de arquivos:**

Para comprovante de pagamento (AI):

Exemplo: PGTO_20250829_J33_ID24_I4S1.pdf
- PGTO = tipo comprovante
- 20250829 = data do pagamento (AG)
- J33 = Job numero 33
- ID24 = Index 24 (coluna A)
- I4S1 = Item 4, Sub 1 (colunas C e D)

Para nota fiscal (AJ):

Exemplo: NF_20250829_J33_ID24_I4S1

**Um comprovante pode cobrir multiplos itens** (quando um PIX paga varios fornecedores):
Exemplo: PGTO_20250829_J33_ID24_I4S1_J33_ID27_I4S5.pdf

**Coluna AL = verificacao de divergencia de valor:**
- Se AK esta vazio: AL = True (sem divergencia declarada)
- Se AK tem valor: AL = (AK == I) --- True se bate, False se diverge
- Quando AL = False: o financeiro precisa investigar a diferenca

### Totais GG_033 vs GG_038

| Job | OC Total | CUSTOS_REAIS Total | Diferenca |
|-----|---------|-------------------|-----------|
| GG_033 ILHAPURA | R$ 168.922,69 | R$ 350.624,50 | +R$ 181.701,81 (+107%) |
| GG_038 SENAC | R$ 644.400,00 | R$ 765.890,95 | +R$ 121.490,95 (+19%) |

A diferenca entre OC e CUSTOS_REAIS e normal: o OC e o orcamento aprovado pelo cliente (menor);
o CUSTOS_REAIS inclui todos os custos reais de producao que superam o orcamento inicial.

---

## 4. Aba EQUIPE

**Proposito:** Banco de dados centralizado de fornecedores e freelancers.
**Dimensoes:** 4 colunas, ~210 registros.

### Estrutura

| Col | Conteudo | Exemplo |
|-----|----------|---------|
| A | Nome completo | Andre de Oliveira Alves |
| B | Email | andre_rock_roll@hotmail.com |
| C | Banco | Banco do Brasil |
| D | PIX ou CNPJ/CPF | 19.956.170/0001-72 |

### Como e usada

Quando o produtor digita o nome do fornecedor na coluna J da CUSTOS_REAIS,
as colunas T (email), X (banco) e AB (PIX) sao preenchidas automaticamente via VLOOKUP nesta aba.

### Origem dos dados

A aba usa formula IMPORTRANGE (Google Sheets) --- o cadastro vem de uma planilha centralizada compartilhada.
Nos dois jobs analisados o mesmo cadastro de ~210 fornecedores foi importado.

### Limitacoes do formato atual

- Nao armazena: agencia, conta, tipo de conta, razao social estruturada, CNPJ separado
- PIX e CNPJ/CPF ficam misturados na coluna D (campo livre)
- Sem campo de telefone estruturado
- Sem validacao de dados (duplicatas possiveis, formato de PIX variavel)

---

## 5. Aba PRODUCAO

**Proposito:** Controle de verbas por produtor. Reconcilia o que foi depositado vs o que foi comprovado com NFs.
**Dimensoes:** 104 colunas (A-CX), ate 865 linhas.

### Estrutura

Linha 7 = cabecalho. Cada linha = um item identificado pelo INDEX (coluna A da CUSTOS_REAIS).

#### Colunas Basicas (A-L)

| Col | Header | Tipo | Descricao |
|-----|--------|------|-----------|
| A | INDEX | **Manual** | ID do item em CUSTOS_REAIS (chave de busca) |
| B | JOB ID | Auto (VLOOKUP) | Numero do job |
| C | ITEM | Auto (VLOOKUP) | Categoria |
| D | SUB | Auto (VLOOKUP) | Subcategoria |
| E | TIPO SERVICO | Auto (VLOOKUP em DEPOSITOS) | Tipo do servico |
| F | UN. | Auto (VLOOKUP em DEPOSITOS) | Unidade |
| G | CACHE OU VERBA | Auto (VLOOKUP em DEPOSITOS) | Valor orcado |
| H | DEPOSITADO | **Auto (SUMIFS em DEPOSITOS)** | Soma de todos os depositos para este INDEX |
| I | COMPROVADO | **Auto** | Soma de todas as NFs: M+P+S+...ate 30 NFs |
| J | VERBA DISPONIVEL | Auto (=H-I) | Saldo disponivel apos comprovacao |
| K | PASTA | --- | Referencia de pasta no Drive |
| L | CHECK | Auto | OK se comprovado bate com CUSTOS_REAIS, alerta caso contrario |

#### Colunas de NFs (M ate CX --- ate 30 NFs por item)

Para cada NF, tres colunas em grupo:
- **VALOR** --- valor da NF/comprovante
- **JUSTIFICATIVA** --- descricao do gasto
- **LINK** --- link do comprovante no Drive

### Observacao

Nos dois jobs analisados, esta aba estava sem dados preenchidos.
A gestao de verbas do produtor nao passou pelo fluxo formal DEPOSITOS -> PRODUCAO nesses jobs.
O fluxo CUSTOS_REAIS foi suficiente para o controle realizado.

---

## 6. Aba DEPOSITOS

**Proposito:** Registro de verbas/adiantamentos enviados pelo financeiro ao produtor
para compras de set (arte, figurino, objetos, alimentacao, etc.).
**Dimensoes:** A-Z, ate 850 linhas.

### Colunas

| Col | Header | Tipo | Descricao |
|-----|--------|------|-----------|
| A | INDEX | **Manual** | ID do item em CUSTOS_REAIS que recebeu o adiantamento |
| B | JOB ID | Auto (VLOOKUP) | Numero do job |
| C | ITEM | Auto (VLOOKUP) | Categoria |
| D | SUB | Auto (VLOOKUP) | Subcategoria |
| E | (Descricao) | Auto (VLOOKUP) | Nome do destino da verba |
| F | UN. | Auto (VLOOKUP) | Unidade |
| G | CACHE OU VERBA | Auto (VLOOKUP) | Valor orcado do item |
| H | DEPOSITADO | **Manual** | Valor efetivamente depositado/adiantado |
| I | Quando? | Manual | Data do deposito |
| J | COMP. PAGAMENTO | Manual | Comprovante do deposito |
| K | PIX | Manual | Chave PIX utilizada |
| L | PG. VIA | Manual | Via de pagamento (PIX, TED, etc.) |

### Observacao

Nos dois jobs analisados, a aba estava sem dados (A3:A9 vazios, total=0).
Os adiantamentos de verba nao foram registrados aqui nesses jobs --- ou o fluxo
operacional da Ellah nao utiliza esta aba regularmente.

---

## 7. Aba PEDIDO EMISSAO NF

**Proposito:** Template automatico para solicitar nota fiscal ao fornecedor por email.
O financeiro digita apenas o **INDEX** do item (celula D3) e toda a aba preenche automaticamente.
**Dimensoes:** A-I, 20 linhas.

### Fluxo de Uso

1. Financeiro abre a aba
2. Digita o INDEX do item na celula D3 (ex: 153)
3. Toda a aba preenche automaticamente com dados do fornecedor e do job
4. Financeiro copia os dados e envia o email para o fornecedor
5. Marca AC = PEDIDO na CUSTOS_REAIS

### Campos Auto-preenchidos por Formulas

| Campo | Celula | Formula | Resultado exemplo |
|-------|--------|---------|-------------------|
| Nome do fornecedor | D8 | INDEX(CUSTOS_REAIS\!U:U, MATCH(E3, A:A, 0)) | Razao social |
| Email do fornecedor | D9 | INDEX(CUSTOS_REAIS\!T:T, MATCH(E3, A:A, 0)) | email para envio |
| Telefone | I9 | INDEX(CUSTOS_REAIS\!S:S, MATCH(E3, A:A, 0)) | telefone |
| Nome do arquivo NF | I7 | INDEX(CUSTOS_REAIS\!AJ:AJ, MATCH(E3, A:A, 0)) | NF_20250825_J33_ID153_I13S4 |
| Valor da nota | B12 | INDEX(CUSTOS_REAIS\!I:I, MATCH(E3, A:A, 0)) | 155000 |
| Data de pagamento | D13 | INDEX(CUSTOS_REAIS\!R:R, MATCH(E3, A:A, 0)) | 2025-08-22 |
| Data por extenso | B13 | PROPER(TEXT(D13, dddd)) + formatacao | Sexta-Feira, 22 de Agosto de 2025 |
| Identificacao do job | B11 | Concatenacao de numero + cliente + titulo | 033 - ILHA PURA - ORNARE |
| Assunto do email | D10 | Concatenacao | 033 - ILHA PURA - ORNARE / 13.4 - Pos PD / SOLICITACAO DE NOTA |
| Servico prestado | B14 | Concatenacao Item.Sub + descricao | 13.4 - Pos PD + Audio |
| Saudacao | I3 | IF(hora<12, Bom dia\!, IF(hora<19, Boa tarde\!, Boa noite\!)) | Boa tarde\! |

### Campos Fixos (dados da Ellah)

| Campo | Celula | Valor |
|-------|--------|-------|
| CNPJ | B6 | 52.212.223/0001-16 |
| Razao Social | B7 | ELLAH FILMES LTDA |
| Endereco | B8 | Rua Dionisio Murcovic, 149 - Adalgisa - Osasco - SP - CEP 06030-370 |
| Email financeiro | B9 | financeiro@ellahfilmes.com |
| Codigo Drive | I6 | ID da pasta no Google Drive para salvar a NF (SUBSTITUIR por job) |

### Instrucoes no Corpo do Email

O template inclui automaticamente:
- Instrucao para nao alterar o assunto do email
- Dados completos do tomador do servico (Ellah Filmes)
- Valor exato a ser faturado
- Data de pagamento formatada por extenso
- Codigo de nomenclatura do arquivo de NF
- Link da pasta do Drive para salvar a NF
- Lembrete que dados bancarios devem ser informados no email, nao na NF

---

## 8. Aba CALENDARIO

**Proposito:** Fluxo de caixa automatico. Agrupa todas as datas de vencimento (coluna R da CUSTOS_REAIS)
e soma os valores a pagar em cada data.
**Dimensoes:** A-T, ate 1000 linhas.

### Como Funciona

- Formula principal: SORT(UNIQUE(FILTER(CUSTOS_REAIS\!R:R, ...))) --- extrai datas unicas
- Para cada data: SUMIFS soma todos os valores cujo vencimento cai naquela data
- Resultado: agenda de pagamentos com total por data

### Fluxo de Caixa GG_033 ILHAPURA (job fechado)

| Data | Total Pago |
|------|-----------|
| 2025-07-20 | R$ 25.985,00 |
| 2025-08-13 | R$ 8.000,00 |
| 2025-08-19 | R$ 16.675,50 |
| 2025-08-22 | R$ 155.000,00 |
| 2025-08-29 | R$ 129.514,00 |
| 2025-09-03 | R$ 6.300,00 |
| **TOTAL** | **R$ 341.474,50** |

### Fluxo de Caixa GG_038 SENAC (job em andamento --- previsao)

| Data | Total a Pagar |
|------|--------------|
| 2026-01-22 | R$ 31.000,00 |
| 2026-01-25 | R$ 25.068,04 |
| 2026-02-13 | R$ 37.000,00 |
| 2026-02-25 | R$ 39.399,36 |
| 2026-03-11 | R$ 586.323,55 |
| 2026-03-26 | R$ 4.900,00 |
| **TOTAL** | **R$ 723.690,95** |

O pico em 2026-03-11 (R86k) e o vencimento do C/NF 45 dias --- a maioria do elenco tecnico
e equipe tem prazo de 45 dias a partir do start em 2026-01-25.

---

## 9. Fluxo Completo de Gestao Financeira por Job

### Fase 1: Orcamento (OC)



### Fase 2: Setup da CUSTOS_REAIS



### Fase 3: Solicitacao de NF



### Fase 4: Recebimento da NF



### Fase 5: Pagamento



### Fase 6: Controle pelo CALENDARIO



### States de um Item de Custo



---

## 10. Mapeamento Manual vs Automatico

### Campos digitados pelo PRODUTOR

Setup do job:
- F (Valor unitario), G (Quantidade/diarias)
- J (Nome do fornecedor --- chave de lookup)
- K (Tipo e prazo de NF)

### Campos digitados pelo FINANCEIRO

Ciclo financeiro:
- AC (PEDIDO NF: PEDIDO, SEM)
- AD (FORNECEU NF?: SIM, NAO)
- AE (Link do Drive com a NF)
- AF (PAGO?)
- AG (Data real do pagamento)
- AH (Nome do arquivo comprovante)
- AK (Valor real pago --- opcional, so se diferir do estimado)

Dados bancarios raramente preenchidos manualmente (S, U, V, W, Y, Z, AA):
- Usados quando o fornecedor nao esta cadastrado na aba EQUIPE

### Campos calculados automaticamente

| Campo | Formula |
|-------|---------|
| H (Total s/HE) | =F*G |
| I (Valor para verificacao) | =H |
| R (Data vencimento) | =start_job + prazo (baseado em K) |
| T (Email) | VLOOKUP em EQUIPE via J |
| X (Banco) | VLOOKUP em EQUIPE via J |
| AB (PIX) | VLOOKUP em EQUIPE via J |
| AI (Nome comprovante) | PGTO_data_Jjob_IDid_Iitem_Ssub |
| AJ (Nome NF) | NF_data_Jjob_IDid_Iitem_Ssub |
| AL (Verificacao valor) | =AK=I (TRUE/FALSE) |
| CALENDARIO inteiro | SORT/UNIQUE/FILTER/SUMIFS sobre CUSTOS_REAIS\!R |
| PEDIDO EMISSAO NF inteiro | VLOOKUP/INDEX/MATCH em CUSTOS_REAIS |

---

## 11. Dados Numericos dos Jobs Analisados

### GG_033 ILHAPURA (job fechado)

| Metrica | Valor |
|---------|-------|
| Orcamento OC | R$ 168.922,69 |
| Custo Real Total | R$ 350.624,50 |
| Itens com valor > 0 | 61 de 147 linhas |
| Itens com status PAGO | 67 |
| Itens com NF obrigatoria | 45 (C/NF) |
| Itens sem NF / a vista | 11 |
| Itens com comprovante salvo | 42 |
| NF pedidas (AC=PEDIDO) | 44 |
| NF recebidas (AD=SIM) | 44 (todas recebidas) |
| Fornecedores no cadastro | 210 |
| Prazos de NF utilizados | C/NF 30, 40, 45 dias; A vista |
| Numero de datas de pagamento | 6 datas (jul-set 2025) |

### GG_038 SENAC (job em andamento --- 26/02/2026)

| Metrica | Valor |
|---------|-------|
| Orcamento OC | R$ 644.400,00 |
| Custo Real Total previsto | R$ 765.890,95 |
| Itens com valor > 0 | 76 de 139 linhas |
| Itens com status PAGO | 18 |
| Itens com NF obrigatoria | 75 (C/NF) |
| Itens sem NF / a vista | 6 |
| Itens com comprovante salvo | 2 |
| NF pedidas | 10 |
| NF recebidas | 8 (2 ainda nao recebidas) |
| Prazo predominante | C/NF 45 dias |
| Numero de datas de pagamento | 6 datas (jan-mar 2026) |
| Maior pagamento previsto | 2026-03-11 = R$ 586.323,55 |

---

## 12. Convencao de Nomenclatura de Arquivos

### Comprovante de Pagamento

Padrao: PGTO_{YYYYMMDD}_J{job_id}_ID{index}_I{item}S{sub}.pdf

Exemplo: PGTO_20250829_J33_ID24_I4S1.pdf
- PGTO = tipo do arquivo
- 20250829 = data real do pagamento (coluna AG)
- J33 = Job numero 33
- ID24 = Index 24 (coluna A da CUSTOS_REAIS)
- I4S1 = Item 4, Sub 1 (colunas C e D)

Quando um unico pagamento cobre multiplos itens:
PGTO_20250829_J33_ID24_I4S1_J33_ID27_I4S5.pdf

### Nota Fiscal

Padrao: NF_{YYYYMMDD}_J{job_id}_ID{index}_I{item}S{sub}.pdf

Exemplo: NF_20250829_J33_ID24_I4S1
Obs: a data aqui e a data de pagamento (AG), nao a data de emissao da NF

---

## 13. O Que o ELLAHOS Precisa Implementar

### Entidades de Banco de Dados Necessarias

**1. Item de Custo (linha da CUSTOS_REAIS):**
- job_id, item, sub_item, descricao, valor_unitario, quantidade, valor_total
- tipo_nf (enum: a_vista, c_nf_30, c_nf_40, c_nf_45, c_nf_60, c_nf_90)
- data_vencimento (calculada automaticamente)
- fornecedor_id (FK para tabela people/fornecedores)
- hora_entrada, hora_saida, horas_extras, valor_he
- observacoes
- status_nf (enum: nao_aplicavel, solicitada, recebida)
- link_nf (URL do Drive)
- status_pagamento (enum: pendente, pago)
- data_pagamento (real)
- valor_real_pago (quando difere do estimado)
- nome_comprovante (gerado automaticamente)

**2. Fornecedor/Pessoa (aba EQUIPE):**
- Ja existe como tabela people no banco do ELLAHOS
- Campos essenciais: nome, email, banco, pix
- Campos desejados: cnpj_cpf, razao_social, agencia, conta, tipo_conta

**3. Fluxo de Caixa (aba CALENDARIO):**
- View ou query agregando: data_vencimento, sum(valor_total)
- Agrupado por job e por data

**4. Template de Pedido de NF:**
- Gerado automaticamente a partir dos dados do item + dados da Ellah
- Via Edge Function ou n8n

### Calculos Automaticos

- valor_total = valor_unitario * quantidade
- data_vencimento = start_do_job + prazo_dias[tipo_nf]
- nome_comprovante = PGTO_ + data_pagamento + _J + job_id + _ID + item_id + ...
- nome_nf = NF_ + data_pagamento + _J + job_id + _ID + item_id + ...
- divergencia_valor = valor_real_pago \!= valor_total

### Fluxo de Status por Item

ORCADO -> NF_SOLICITADA -> NF_RECEBIDA -> PAGO
ORCADO -> PAGO (para itens a vista sem NF)

---

## 14. Perguntas Abertas

1. **Multiplos pagamentos por item:** O GG_033 tem Direcao de Cena dividida em duas linhas
   (parte 1 e parte 2). O ELLAHOS deve suportar parcelas de um mesmo item ou tratar como itens distintos?

2. **Verbas a vista:** Itens marcados como a vista nao geram pedido de NF.
   Precisam de um fluxo separado (apenas comprovante, sem NF)?
   Ou o campo tipo_nf ja resolve, e a UI se adapta?

3. **Aba DEPOSITOS:** Registra adiantamentos de verba para o produtor comprar materiais.
   E um sub-fluxo diferente dos pagamentos individuais. O ELLAHOS deve ter entidade separada
   para verbas adiantadas ao produtor?

4. **Cadastro de fornecedores:** A aba EQUIPE e compartilhada via IMPORTRANGE.
   A tabela people ja existe no ELLAHOS. Ela deve ser usada como cadastro centralizado de freelancers?
   Como lidar com a lookup automatica por nome?

5. **Valor real vs estimado:** Coluna AK = valor real pago (quando difere do estimado).
   O ELLAHOS deve ter campo separado para valor_real_pago alem do valor_estimado?

6. **Hora extra:** Colunas L-P existem mas raramente preenchidas. E necessario no MVP?

7. **Comprovante de multiplos itens:** Um comprovante pode cobrir varios itens
   (PGTO_...ID24...ID27...). Como modelar essa relacao N:N comprovante-itens?

8. **Nomenclatura de arquivos:** A convencao atual e densa. O ELLAHOS deve gerar automaticamente
   o nome do arquivo ao registrar o pagamento? Ou aceitar upload livre com nome sugerido?

9. **Vinculo NF - pagamento:** Hoje o link da NF fica na coluna AE e o comprovante em AH,
   sem vinculo explicito entre eles. O ELLAHOS deve criar entidades separadas para NF e para Pagamento,
   com relacionamento explicito?

---

*Documento gerado em 2026-02-26 com base na analise de GG_033_ILHAPURA_ORNARE_UNUM.xlsx e
GG_038_Quer Fazer_ Senac\!_SENAC SP (1).xlsx via Python/openpyxl.*
