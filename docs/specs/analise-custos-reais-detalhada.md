# Analise Detalhada das Planilhas de Custos Reais - Ellah Filmes

**Data da analise:** 26/02/2026
**Analista:** PM ELLAHOS
**Fonte:** CSVs exportados do Google Sheets - pasta docs/specs/planilha-custos/
**Objetivo:** Mapear exatamente o que cada coluna faz com dados reais para planejar tabelas e features do modulo financeiro do ELLAHOS.

---

## Arquivos analisados

| Arquivo | Tipo | Status do Job |
|---------|------|---------------|
| GG_033_ILHAPURA_ORNARE_UNUM - CUSTOS_REAIS.csv | Planilha de custos | FECHADO (tudo pago) |
| GG_038_Quer Fazer_ Senac\!_SENAC SP - CUSTOS_REAIS.csv | Planilha de custos | EM ANDAMENTO |
| *_EQUIPE.csv | Cadastro de fornecedores | Base compartilhada (210 registros, identico nos 2 jobs) |
| *_PEDIDO EMISSAO NF.csv | Template de email NF | Gerado por formula do Sheets |
| *_PRODUCAO.csv | Controle de verbas a vista | Template vazio nos exports CSV |
| *_CALENDARIO.csv | Calendario de pagamentos | Lotes de pagamento por data |

---

## 1. CUSTOS_REAIS.csv - A Planilha Central

### 1.1 Estrutura geral

A planilha tem **38 colunas** separadas por virgula, exportada do Google Sheets.

**Encoding real:** latin-1 (nao UTF-8 apesar do BOM). Para leitura correta: open(file, 'rb').read().decode('latin-1').

Estrutura das linhas:
- Linhas 0-17: Cabecalho de metadados do job (nao sao dados de custo)
- Linha 18: Cabecalho das 38 colunas de dados
- Linhas 19+: Dados de custo, uma linha por item/servico contratado

### 1.2 Metadados do job (linhas 1-13)

Os campos de cabecalho ficam nas colunas 4/5 e 6/7 (label/valor):

| Campo | GG_033 | GG_038 |
|-------|--------|--------|
| TITULO | ORNARE | Quer fazer? Senac\! |
| CLIENTE | ILHA PURA | Senac |
| NUMER JOB | 33 | 38 |
| AGENCIA | URUM | Nao tem |
| ATENDIMENTO | (vazio) | Renata, Arthur |
| START DO JOB | 20/07/2025 | 25/01/2026 |
| DIRETOR | (vazio) | Sergio |
| QTDADE DE DIARIAS | 1 | 3 |
| RESPONSAVEL ORCAMENTO | (vazio) | Marcello/Danillo |
| FATURAMENTO | (vazio) | (vazio) |
| PRODUTORA P.J. | (vazio) | (vazio) |
| START POS | (vazio) | (vazio) |
| COORDENADOR DE PRODUCAO | (vazio) | (vazio) |
| BUDGET | (vazio) | (vazio) |
| EXCLUSIVIDADE | (vazio) | (vazio) |
| ELENCO -18 | (vazio) | (vazio) |
| FOTO STILL | (vazio) | (vazio) |
| AEREOS | (vazio) | (vazio) |
| MAKING OF | (vazio) | (vazio) |
| veiculacao | (vazio) | (vazio) |
| EDITOR/POS NO SET | (vazio) | (vazio) |

Observacao: A maioria dos campos de metadados fica vazia nos exports CSV. Os campos que tem dados reais nos dois jobs analisados sao: titulo, job ID, agencia, cliente, start do job, quantidade de diarias, diretor, atendimento, responsavel orcamento.

### 1.3 Mapeamento completo das 38 colunas

| Col | Nome no Header | Preench. GG_033 | Preench. GG_038 | Descricao detalhada |
|-----|----------------|-----------------|-----------------|---------------------|
| 0 | ID | 161/161 | 140/140 | ID sequencial global do item de custo. Unico por linha, por job. |
| 1 | JOB ID | 161/161 | 140/140 | Numero do job. FK para o job. |
| 2 | Item | 155/161 | 138/140 | Grupo de custo (1 a 15, 99). Ver taxonomia na secao 1.5. |
| 3 | Sub Item | 152/161 | 138/140 | Sub-item dentro do grupo. SubItem=0 e a linha de titulo da categoria. |
| 4 | Destino da Verba | 145/161 | 138/140 | Nome do servico ou categoria. Ex: "Diretor de cena", "Alimentacao equipe". 143 valores unicos no GG_033. |
| 5 | Valor UNITARIO | 86/161 | 110/140 | Valor por unidade quando Qtde > 1. Formato string: "R$  1.000,00" (2 espacos apos R$). |
| 6 | Qtde | 98/161 | 110/140 | Quantidade. Valores observados nos 2 jobs: 0, 1, 2, 3, 8. |
| 7 | Valor Total s/ HE | 146/161 | 138/140 | Valor total sem horas extras. Formula: Valor Unit x Qtde. |
| 8 | Fornecedor (GG_033) / Valor TOTAL (GG_038) | 146/161 | 124/140 | DIVERGENCIA entre jobs: no GG_033 o label e "Fornecedor" mas o conteudo sao valores monetarios (bug de label). No GG_038, label correto "Valor TOTAL" com valor total incluindo HE. |
| 9 | Fornecedor | 37/161 | 42/140 | Nome completo do fornecedor/prestador. Ex: "Joan Josep ibars Pallas". |
| 10 | C/NF ou S/NF | 57/161 | 81/140 | Condicao de pagamento. Valores: "A vista", "C/NF 30 dias", "C/NF 40 dias", "C/NF 45 dias", "C/NF 60 dias". |
| 11 | Hora de Entrada | 7/161 | 8/140 | USO INCOMUM: em itens de desembolso a vista ja pagos, campo recebe "PAGO" como hack de controle manual. Em teoria: hora de entrada para calculo de HE. |
| 12 | Hora de Saida | 1/161 | 0/140 | Hora de saida para calculo de HE. Quase sem uso (1 valor anomalo "19550" = erro de digitacao). |
| 13 | Total de Horas | 0/161 | 0/140 | Total de horas. Nunca preenchido nos dois jobs analisados. |
| 14 | Horas extras | 0/161 | 0/140 | Quantidade de HE. Nao usado. |
| 15 | Valor HE | 0/161 | 0/140 | Valor total das horas extras. Nao usado. |
| 16 | OBSERVACOES | 0/161 | 0/140 | Campo de notas livres. Nao usado em nenhum dos dois jobs. |
| 17 | DATA PAGAMENTO | 147/161 | 138/140 | Data prevista para pagamento. Formato DD/MM/AAAA. Valor especial: "COLUNA NOTA ZERADO E/OU START DO JOB ZERADO" indica que a formula nao encontrou a data (job sem start ou valor zerado). |
| 18 | TELEFONE | 0/161 | 0/140 | Presente no template mas nunca preenchido em nenhum job. |
| 19 | E-MAIL | 42/161 | 42/140 | E-mail do fornecedor. Preenchido nos itens com fornecedor identificado. |
| 20 | Razao Social | 1/161 | 0/140 | Razao social do fornecedor PJ. Quase vazia - o dado real fica na EQUIPE.csv. |
| 21 | Titular / Favorecido | 0/161 | 0/140 | Nome do beneficiario bancario. Nao preenchido. |
| 22 | CNPJ / CPF | 0/161 | 0/140 | Documento fiscal. Nao preenchido (o dado fica na col PIX ou na EQUIPE). |
| 23 | Banco | 38/161 | 0/140 | Nome do banco. Altamente inconsistente: "Nubank", "260", "Banco inter", "Cora". |
| 24 | Agencia | 0/161 | 0/140 | Numero da agencia. Nao preenchido (PIX e predominante). |
| 25 | Conta | 0/161 | 0/140 | Numero da conta. Nao preenchido. |
| 26 | C/P ou C/C | 0/161 | 0/140 | Tipo de conta (Corrente/Poupanca). Nao preenchido. |
| 27 | PIX | 39/161 | 42/140 | Chave PIX. Tipos coexistentes: CPF/CNPJ numerico, email, telefone. Exemplos: "j2i4p@icloud.com", "11932311387", "36.660.560/0001-10", "41059198819". |
| 28 | PEDIDO NF | 46/161 | 10/140 | Status do pedido de NF. Valores: "PEDIDO", "SEM", "Sem Nota". |
| 29 | FORNECEU NF? | 45/161 | 10/140 | O fornecedor enviou a NF? Valores: "SIM", "NAO", "Pegar PIX" (instrucao manual incorreta neste campo). |
| 30 | NF | 43/161 | 8/140 | Link da NF no Google Drive OU nome do arquivo. Dois formatos coexistem (ver secao 1.4). |
| 31 | PAGO? | 67/161 | 18/140 | Status de pagamento. Valores: "PAGO", "Pago" (inconsistencia de case). |
| 32 | Quando? | 46/161 | 2/140 | Data efetiva do pagamento. Formato DD/MM/AAAA. |
| 33 | COMPROVANTE PAGAMENTO | 42/161 | 2/140 | Nome do arquivo de comprovante no Drive. Formato PGTO_ (ver secao 1.4). |
| 34 | (sem nome) | 161/161 | 135/140 | CAMPO OCULTO/FORMULA: Template do nome do arquivo PGTO, gerado automaticamente pelo Sheets. Ex: "PGTO_18991230_J33_ID1_I1S0". Data "18991230" = item sem data de pagamento definida. |
| 35 | (sem nome) | 161/161 | 135/140 | CAMPO OCULTO/FORMULA: Template do nome do arquivo NF, gerado automaticamente. Ex: "NF_18991230_J33_ID1_I1S0". |
| 36 | (sem nome) | 23/161 | 0/140 | CAMPO OCULTO: Valor numerico da NF extraido pelo n8n (wf-nf-processor via Claude Haiku). Ex: "2.000,00", "7.000", "900". Formato inconsistente. |
| 37 | (sem nome) | 161/161 | 135/140 | CAMPO OCULTO: Status de validacao da NF pelo n8n. Valores: "TRUE" (validada), "FALSE" (pendente/sem NF), valor monetario (estado intermediario), "Arquivo nao encontrado", "Valor nao encontrado". |

### 1.4 Padroes de nomenclatura de arquivos

#### Formato NF



A data e a DATA PAGAMENTO PREVISTA (col 17). Quando a data e "18991230" (1899-12-30), a formula nao encontrou a data.

Exemplos reais do GG_033:


#### Formato PGTO (comprovante de pagamento)



A data e a DATA EFETIVA DO PAGAMENTO (col 32). Um comprovante pode cobrir multiplos itens (pagamento em lote):

Exemplos reais do GG_033:


Quando um comprovante cobre multiplos itens, TODOS os itens do lote tem a col 33 apontando para o mesmo arquivo.

#### Links Google Drive para NFs



O parametro ?usp=drivesdk indica que o link foi gerado pelo SDK do Drive (via n8n). Nao tem expiracao.

### 1.5 Taxonomia das categorias de custo (Item groups)

As categorias sao numeradas por Item. SubItem=0 e sempre a linha de titulo da categoria.

| Item | Categoria (GG_033) | Categoria (GG_038) | Observacao |
|------|-------------------|--------------------|------------|
| 1 | DESEMBOLSOS DE VERBAS A VISTA | DESEMBOLSOS DE VERBAS A VISTA | Identico |
| 2 | ESTUDIO | ESTUDIO | Identico |
| 3 | ESTUDIO (duplicado!) | LOCACAO | Nome diferente entre jobs |
| 4 | DIRECAO DE ARTE / FIGURINISTA / EFEITOS | DIRECAO DE ARTE / FIGURINISTA / EFEITOS | Similar |
| 5 | DIRECAO DE CENA / DF / SOM DIRETO | DIRECAO DE CENA / DF / SOM | Similar |
| 6 | PRODUCAO | PRODUCAO | Identico |
| 7 | VEICULOS | VEICULOS | Identico |
| 8 | PASSEGEM, HOSPEDAGEM e ALIMENTACAO | PASSEGEM, HOSPEDAGEM e ALIMENTACAO | Identico (typo "passegem" mantido) |
| 9 | CAMERA, LUZ, MAQUINARIA, MOVIMENTO, GERADOR e INFRA | idem | Sem SubItem=0 no GG_033 (bug) |
| 10 | PRODUCAO DE CASTING | PRODUCAO DE CASTING | Identico |
| 11 | OBJETOS DE CENA | OBJETOS DE CENA | Identico |
| 12 | PERFORMANCE E FOOTAGE | Still / Bastidores | Nome diferente |
| 13 | POS PRODUCAO / FOTOGRAFO STILL / TRILHA / ROTEIRISTA / CONDECINE | POS PRODUCAO / TRILHA / ROTEIRISTA / CONDECINE | Similar |
| 14 | (vazio - itens administrativos avulsos) | ADMINISTRATIVO LEGAL / FINANCEIRO | Formalizado no GG_038 |
| 15 | N/A | MONSTRO | So no GG_038 (vazio) |
| 99 | N/A | MAO DE OBRA INTERNA | So no GG_038 |

**Observacao critica:** As categorias nao sao fixas entre jobs. O nome e a estrutura evoluem. O ELLAHOS precisa de um sistema de templates de categoria por tipo de producao (comercial, filme, etc.).

### 1.6 Sub-itens reais por categoria - GG_038 (versao mais completa)

Item 1 - DESEMBOLSOS A VISTA: Uber equipe, Verba de Producao, Verba de Arte, Verba de Figurino, Reembolso Equipe, Compras Emergenciais de Set, Impressoes/Autorizacoes, Verba de visita de locacao

Item 3 - LOCACAO: Diretor de Locacao, Locacao

Item 4 - DIRECAO DE ARTE: Diretor(a) de arte, Arte para Fotos no Set, Assistente de Arte, Pesquisa e Layouts, Produtor de Objetos, Assistente de Objetos, Contra Regra, Assistente Contra Regra, Ajudante Arte I/II/III/IV, Retirada de arte, Devolucao de arte, Produtor(a) de Figurino, Assistente de figurino I/II, Camareira 1, Assistente de Make, Make/hair, Assistente de Make

Item 5 - DIRECAO DE CENA/DF: Shooting Board, Diretor de cena, Assistente de direcao I/II, Logger/Script, Diretor de fotografia, Operador de Camera, Assistente de Camera I/II, DIT, Video assist/Playback x2, Making Off, Chefe de eletrica, Assistente de eletrica I/II/III/IV/V, Chefe de maquinaria, Assistente de maquinaria I/II/III, Carga e Devolucao de Eletrica/Maquinaria, Operador de Drone, Operador de Ronin/Steadicam, Tecnico de Som Direto, Microfonista, Assistente de Som

Item 6 - PRODUCAO: Produtor Executivo, Diretor de Producao, Coordenador de Producao, Produtor, Ajudante de producao I/II/III/IV, Carga e Devolucao de Producao, Efeitista, Seguranca de Set, Seguro, Bombeiro/Socorrista, Taxa Administrativa, Previsao do Tempo

Item 7 - VEICULOS: Veiculo Pacote, Transporte Robo, Transporte Cliente

Item 8 - HOSPEDAGEM: Alimentacao equipe, Transporte catering, Hotel, Passagens

Item 9 - CAMERA/LUZ: Camera/Acessorio/Lente, Luz e Maquinaria, Kambo Gravacao, Radios, Consumiveis, Adaptadores, Infraestrutura de Producao, HD externo, Gerador, SteadyCam, Drone

Item 10 - CASTING: Produtor de casting, Elenco Produtor (com HE), Elenco Produtor agencia, Elenco especifico, Reembolso elenco

Item 13 - POS PRODUCAO: Coordenador de Pos, Montador, Finalizador/VFX, Motion Design, Designer Grafico, Tecnico de Audio, Mixador, Compositor Musical/Trilha, Roteirista, Locutor, Condecine, Responsavel por Condecine

Item 14 - ADMINISTRATIVO: Atendimento, Assistente de Atendimento, Seguro Equipe, Advogado

### 1.7 Condicoes de pagamento

| Valor | Significado | GG_033 | GG_038 |
|-------|-------------|--------|--------|
| A vista | Pagamento imediato, sem exigencia de NF | 11 itens | 6 itens |
| C/NF 30 dias | Com NF, prazo 30 dias apos o servico | 2 itens | 0 |
| C/NF 40 dias | Com NF, prazo 40 dias | 40 itens | 0 |
| C/NF 45 dias | Com NF, prazo 45 dias | 4 itens | 73 itens |
| C/NF 60 dias | Com NF, prazo 60 dias | 0 | 2 itens |

Os itens "A vista" sao os "Desembolsos de Verbas" (Item 1) - verbas entregues em dinheiro para a equipe gastar em compras de set. Esses itens marcam Hora de Entrada = "PAGO" como marcacao manual de controle.


### 1.8 Status e contadores por job

#### GG_033 - Job FECHADO (referencia completa)

| Metrica | Valor |
|---------|-------|
| Total de linhas de custo | 161 |
| Linhas com fornecedor identificado | 37 |
| NF PEDIDA (col 28 = PEDIDO) | 44 |
| NF RECEBIDA (col 29 = SIM) | 44 |
| Itens sem nota (SEM / Sem Nota) | 2 |
| Itens PAGOS (col 31 = PAGO) | 67 |
| Itens com comprovante (col 33 preenchida) | 42 |
| NF como link Drive | 34 |
| NF como nome de arquivo local | 9 |
| COL37 = TRUE (NF validada pelo n8n) | 126 |
| COL37 = FALSE (pendente/sem NF) | 21 |
| COL37 = Arquivo nao encontrado | 6 |
| COL37 = Valor nao encontrado | 3 |
| COL37 = valor monetario (estado intermediario) | 4 |
| Valor total dos custos | R$ 350.624,50 |
| Valor total pago | R$ 341.824,50 |
| Datas de pagamento efetivadas | 20/07, 13/08, 19/08, 22/08, 29/08, 03/09/2025 |

#### GG_038 - Job EM ANDAMENTO

| Metrica | Valor |
|---------|-------|
| Total de linhas de custo | 140 |
| Linhas com fornecedor identificado | 42 |
| NF PEDIDA | 10 |
| NF RECEBIDA (FORNECEU = SIM) | 8 |
| NF NAO RECEBIDA (FORNECEU = NAO) | 2 |
| Itens PAGOS | 18 |
| Itens com comprovante | 2 |
| NF como link Drive | 8 |
| COL37 = TRUE | 64 |
| COL37 = FALSE | 71 |
| Valor total orcado | R$ 765.890,95 |
| Valor total pago ate agora | R$ 153.674,10 |
| Datas de pagamento previstas | 22/01, 25/01, 13/02, 25/02, 11/03, 26/03/2026 |

### 1.9 Diferenca estrutural entre GG_033 e GG_038

Apenas 1 diferenca de label nas colunas:

- Col 8 no GG_033: Label Fornecedor mas conteudo sao valores monetarios (bug de label antigo)
- Col 8 no GG_038: Label correto Valor TOTAL com dados reais de valor total calculado

A planilha do GG_038 e uma versao evoluida do template do GG_033.

### 1.10 Campos ocultos (colunas 34-37) - automacao n8n

| Col | Proposito | Formato | Quem preenche |
|-----|-----------|---------|---------------|
| 34 | Template nome arquivo PGTO | PGTO_{DATA}_J{job}_ID{id}_I{item}S{sub} | Formula Google Sheets |
| 35 | Template nome arquivo NF | NF_{DATA}_J{job}_ID{id}_I{item}S{sub} | Formula Google Sheets |
| 36 | Valor extraido da NF | Numero BR sem R$ (ex: 2.000,00 ou 7.000) | n8n wf-nf-processor via Claude Haiku |
| 37 | Status validacao NF | TRUE / FALSE / Arquivo nao encontrado / Valor nao encontrado | n8n wf-nf-processor |

Interpretacao do COL37:
- TRUE = NF encontrada no Drive, valor extraido, confere com o orcado
- FALSE = item nao tem NF ou nao foi processado ainda
- Valor monetario ex 6.000,00 = estado intermediario - NF encontrada mas validacao pendente
- Arquivo nao encontrado = n8n esperava o arquivo pelo nome mas nao encontrou na pasta
- Valor nao encontrado = arquivo encontrado mas a IA nao conseguiu extrair o valor

---

## 2. EQUIPE.csv - Cadastro de Fornecedores

### 2.1 Estrutura

O arquivo nao tem linha de cabecalho. A primeira linha ja e o primeiro cadastro. Tem 4 colunas e 210 registros. Os dois jobs (GG_033 e GG_038) tem exatamente o mesmo EQUIPE.csv - e um cadastro global compartilhado da produtora.

| Col | Conteudo real | Preenchimento | Descricao |
|-----|--------------|---------------|----------|
| 0 | Nome completo | 210/210 (100%) | Nome do fornecedor ou prestador. Inclui PF e PJ. |
| 1 | E-mail | 210/210 (100%) | E-mail principal. Usado para envio da solicitacao de NF. |
| 2 | Banco | 208/210 (99%) | Nome do banco. Altamente inconsistente: Nubank, nubank, NU Bank, 260, Banco inter. |
| 3 | CPF / CNPJ / PIX | 210/210 (100%) | Campo unico que aceita qualquer tipo de identificacao. Extremamente inconsistente. |

### 2.2 Estatisticas

- 210 fornecedores cadastrados
- 201 e-mails unicos (9 duplicados)
- 98 nomes de banco unicos para provavelmente ~15 bancos reais
- Estimativa de tipos na col 3: ~45 CPFs, ~18 e-mails PIX, ~44 telefones PIX, restante CNPJs em varios formatos

### 2.3 Exemplos de cadastros



### 2.4 Problemas de qualidade

1. Sem separacao entre CPF, CNPJ e chave PIX - tudo numa unica coluna
2. Banco sem codigo ISPB: Nubank vs 260 vs NU Bank = mesmo banco, 3 representacoes diferentes
3. Ausentes: agencia, conta, tipo de conta, razao social, tipo pessoa (PF/PJ)
4. Sem campo PIX explicito com tipo da chave
5. Sem campo de status ativo/inativo ou data de cadastro
6. Anotacoes textuais no campo de identificacao (03415954706 CPF, 30890130000108(cnpj))

---

## 3. PEDIDO EMISSAO NF.csv - Template de Email Automatico

### 3.1 Estrutura geral

O arquivo e um formulario de visualizacao, nao uma tabela de dados. Tem 19 linhas e 9 colunas. E gerado dinamicamente pela formula do Sheets a partir de um INDEX de item selecionado pelo usuario. Representa a previa do e-mail a ser enviado ao fornecedor solicitando a emissao da NF.

### 3.2 Campos do template

| Linha | Col 0 (label) | Col 1 (valor real) |
|-------|---------------|-------------------|
| 5 | CNPJ: | 52.212.223/0001-16 |
| 6 | RAZAO SOCIAL: | ELLAH FILMES LTDA |
| 7 | ENDERECO: | Rua Dionisio Murcovic, 149 Adalgisa - Osasco - SP CEP 06030-370 |
| 8 | EMAIL (OBRIGATORIO): | financeiro@ellahfilmes.com |
| 10 | IDENTIFICACAO DO JOB: | 033 - ILHA PURA - ORNARE |
| 11 | VALOR DA NOTA: | R 155.000,00 no GG_033 / R 1.813,50 no GG_038 |
| 12 | DATA PARA PAGAMENTO: | Sexta-Feira, 22 de Agosto de 2025 |
| 13 | SERVICO PRESTADO: | 13.4 - Pos PD + Audio / 7.2 - Transporte - Robo |

### 3.3 Campos ocultos (colunas 7 e 8) - dados para automacao

| Linha | Col 7 | Col 8 |
|-------|-------|-------|
| 0 | NAO APAGAR\! ----> | 26/02/2026 19:33:39 (timestamp da geracao) |
| 5 | SUBSTITUIR\! --> | 10bVPQPtsrp0e-uwAVkqOeWB12oRFS4x8 (Folder ID do Drive) |
| 6 | NAO APAGAR\! --> | NF_20250825_J33_ID153_I13S4 (nome canonico da NF) |

### 3.4 Assunto do email (chave de rastreamento)

Formato: {job_num} - {cliente} - {titulo} / {item}.{subitem} - {destino} / SOLICITACAO DE NOTA

Exemplos reais:
- 033 - ILHA PURA - ORNARE / 13.4 - Pos PD + Audio / SOLICITACAO DE NOTA
- 038 - Senac - Quer fazer? Senac\! / 7.2 - Transporte - Robo / SOLICITACAO DE NOTA

O assunto e a chave de rastreamento da NF. O n8n monitora financeiro@ellahfilmes.com e identifica as NFs pelo padrao no assunto da resposta do fornecedor.

### 3.5 Corpo do email

O email instrui o fornecedor a:
1. Nao alterar o assunto ao responder (o codigo no assunto e essencial para identificar a nota)
2. Anexar a NF no formato PDF apenas (outros formatos nao sao processados)
3. Informar na DESCRICAO da NFe (nao no corpo do email): banco, agencia, conta, tipo, favorecido, tipo pessoa, CPF ou PIX

O email tambem tem CC para financeiro@colorbarfilmes.com (entidade a ser investigada).

---

## 4. PRODUCAO.csv - Controle de Verbas da Producao

O arquivo tem 102 colunas e 13 linhas. E uma tabela horizontal expandida para suportar ate 30 NFs por item. Exportado vazio nos dois jobs.

### 4.1 Colunas fixas (0-11)

| Col | Nome | Descricao |
|-----|------|-----------|
| 0 | INDEX | ID do item de custo (FK para CUSTOS_REAIS) |
| 1 | JOB ID | Numero do job |
| 2 | ITEM | Grupo de custo |
| 3 | SUB | Sub-item |
| 4 | TIPO SERVICO | Descricao do servico |
| 5 | UN. | Unidade |
| 6 | CACHE OU VERBA | Valor total do cache ou verba para este item |
| 7 | DEPOSITADO | Valor total ja depositado ou enviado |
| 8 | COMPROVADO | Valor total comprovado com NF ou recibo |
| 9 | VERBA DISPONIVEL | Saldo calculado: CACHE - DEPOSITADO |
| 10 | PASTA | Link da pasta no Drive para os documentos |
| 11 | CHECK SE O VALOR ESTA CONVERSANDO | Formula de validacao |

Colunas repetitivas (12 em diante): Para cada NF (ate 30): VALOR, JUSTIFICATIVA, LINK.

### 4.2 Proposito funcional

Esta aba controla as verbas a vista entregues para a equipe de producao:
1. A equipe recebe uma verba em dinheiro ou transferencia antes ou durante a filmagem
2. Durante a producao, guarda comprovantes (NFs, recibos, tickets)
3. Apos a producao, envia os documentos para comprovar os gastos
4. O sistema controla: DEPOSITADO vs COMPROVADO = VERBA DISPONIVEL (saldo)

---

## 5. CALENDARIO.csv - Datas de Pagamento por Lote

Tem 6 colunas e 31 linhas. Cada data agrupa todos os itens da CUSTOS_REAIS com aquela data de pagamento prevista (col 17). O valor do lote e a soma calculada pela formula do Sheets.

**GG_033 - Job FECHADO (6 lotes realizados):**

| Data | Valor |
|------|-------|
| 20/07/2025 | R 25.985,00 |
| 13/08/2025 | R 8.000,00 |
| 19/08/2025 | R 16.675,50 |
| 22/08/2025 | R 155.000,00 |
| 29/08/2025 | R 129.514,00 |
| 03/09/2025 | R 6.300,00 |

**GG_038 - Job EM ANDAMENTO (6 lotes planejados):**

| Data | Valor | Status |
|------|-------|--------|
| 22/01/2026 | R 31.000,00 | Pago |
| 25/01/2026 | R 25.068,04 | Pago |
| 13/02/2026 | R 37.000,00 | Pago |
| 25/02/2026 | R 39.399,36 | Pago |
| 11/03/2026 | R 586.323,55 | Futuro |
| 26/03/2026 | R 4.900,00 | Futuro |

---

## 6. Fluxo operacional mapeado

**Fase 1 - Orcamento (pre-producao):**
Item criado na planilha com todos os campos. Fornecedor identificado. Condicao de pagamento definida. Data prevista gerada pela formula baseada no START DO JOB. Nomes canonicos de arquivo gerados automaticamente nas colunas 34 e 35.

**Fase 2 - Pedido de NF (automacao n8n):**
Usuario seleciona o INDEX do item na aba PEDIDO EMISSAO NF. A planilha monta o template completo. O n8n le o template e envia o email para o fornecedor. Col 28 recebe PEDIDO.

**Fase 3 - Recebimento da NF (automacao n8n - wf-nf-processor):**
Fornecedor responde com a NF em PDF. n8n detecta a resposta pelo Gmail pelo codigo unico no assunto. Baixa o PDF, salva no Drive com o nome da col 35. Extrai o valor via Claude Haiku. Valida se o valor bate com o orcado. Col 29 recebe SIM, col 30 recebe o link, col 36 o valor extraido, col 37 o status de validacao.

**Fase 4 - Pagamento (manual pelo financeiro):**
Financeiro faz o PIX ou TED. Salva o comprovante no Drive com o nome da col 34. Col 33 recebe o nome do comprovante. Col 31 recebe PAGO. Col 32 recebe a data efetiva.

**Fase 5 - Pagamento em lote:**
Um comprovante pode cobrir multiplos fornecedores. O nome do arquivo contem todos os IDs: PGTO_..._J33_ID24_..._J33_ID27_... Todos os itens do lote tem col 33 apontando para o mesmo arquivo. A col 34 de cada item ja gerou o nome correto com todos os IDs concatenados.

**Fase 6 - Verbas a vista (Item 1):**
A verba e entregue antes ou durante a producao em dinheiro ou transferencia. Col 11 recebe PAGO como marcacao manual de que a verba foi entregue. Equipe gasta, guarda comprovantes, envia apos a producao. Aba PRODUCAO controla: DEPOSITADO vs COMPROVADO vs VERBA DISPONIVEL.

---

## 7. Divergencias e inconsistencias identificadas

| Problema | Localizacao | Impacto |
|----------|-------------|--------|
| Col 8 tem label diferente nos dois jobs | CUSTOS_REAIS linha 18 | Medio |
| Status PAGO com case inconsistente: PAGO vs Pago | Col 31 | Baixo |
| Banco sem padronizacao: Nubank/nubank/NU Bank/260 | EQUIPE col 2 | Alto |
| Col 3 da EQUIPE mistura CPF, CNPJ e PIX sem tipo | EQUIPE col 3 | Alto |
| NF aceita como .jpg e sem extensao, alem de PDF | Col 30 | Medio |
| Categorias nao fixas entre jobs | CUSTOS_REAIS col 4 | Alto |
| Data 18991230 como placeholder de sem data definida | Cols 34, 35 | Critico |
| Item 9 sem SubItem=0 explicito no GG_033 | CUSTOS_REAIS | Medio |
| Valor monetario como string BR nao padronizada | Multiplas colunas | Alto |
| CC para financeiro@colorbarfilmes.com - entidade desconhecida | PEDIDO EMISSAO NF | Baixo |
| Pegar PIX no campo FORNECEU NF | Col 29 | Baixo |

---

## 8. Implicacoes para o banco de dados do ELLAHOS

### 8.1 Tabela central: job_cost_items

A tabela existente job_budgets precisa ser expandida ou substituida por uma nova tabela que suporte o ciclo completo de custos. Campos necessarios identificados pela analise:

**Hierarquia e descricao:**
- item_number (SMALLINT) -- grupo de custo 1-15, 99
- sub_item_number (SMALLINT) -- subitem, 0 = titulo do grupo
- is_category_header (BOOLEAN GENERATED AS sub_item_number = 0)
- service_description (TEXT) -- Destino da Verba

**Valores:**
- unit_value (NUMERIC 12,2) -- Valor Unitario
- quantity (SMALLINT DEFAULT 1) -- Qtde
- total_value (NUMERIC 12,2) -- Valor Total s/HE
- total_with_he (NUMERIC 12,2) -- Valor Total com HE

**Pagamento:**
- payment_condition (TEXT CHECK IN a_vista, cnf_30, cnf_40, cnf_45, cnf_60)
- payment_due_date (DATE) -- Data prevista de pagamento

**Fornecedor (desnormalizado para historico):**
- vendor_id (UUID FK para vendors)
- vendor_name, vendor_email, vendor_pix_key, vendor_bank

**Ciclo de NF:**
- nf_requested_at (TIMESTAMPTZ) -- quando o pedido foi enviado
- nf_request_status (TEXT CHECK IN pedido, sem, sem_nota)
- nf_received (BOOLEAN DEFAULT FALSE)
- nf_drive_url (TEXT) -- link Drive ou nome do arquivo
- nf_filename (TEXT) -- nome canonico NF_...
- nf_extracted_value (NUMERIC 12,2) -- valor extraido pela IA
- nf_validation_status (TEXT) -- TRUE/FALSE/Arquivo nao encontrado/Valor nao encontrado

**Pagamento:**
- payment_status (TEXT CHECK IN pago)
- payment_date (DATE)
- payment_proof_filename (TEXT) -- PGTO_...
- payment_proof_drive_url (TEXT)

**Verbas a vista:**
- verba_deposited (NUMERIC 12,2) -- para Item=1 desembolsos
- verba_documented (NUMERIC 12,2)

### 8.2 Tabela de fornecedores: vendors

Substitui o EQUIPE.csv atual com estrutura padronizada:

- Identificacao: full_name, person_type (PF/PJ), cpf, cnpj, razao_social
- Contato: email, phone
- Dados bancarios: bank_name, bank_code (ISPB padronizado), agency, account, account_type (corrente/poupanca), account_holder
- PIX: pix_key, pix_key_type (cpf/cnpj/email/phone/random)
- Status: is_active, created_at, updated_at

### 8.3 Tabela de lotes: payment_batches

- job_id (UUID FK), payment_date (DATE), total_amount (NUMERIC), status (planejado/realizado)
- Tabela de juncao payment_batch_items para o relacionamento N:N com job_cost_items

### 8.4 Templates de categorias: cost_category_templates

- Templates de categorias de custo por tipo de producao (comercial, filme, institucional)
- item_number, item_name, production_type, is_active

### 8.5 Features prioritarias

| Feature | Prioridade | Status atual |
|---------|-----------|---------------|
| Tela de custos reais por job (lista hierarquica Item/SubItem) | Alta | Nao existe |
| Workflow de NF: pedido - recebimento - validacao - pagamento | Alta | Parcial no n8n fase 9 |
| Cadastro de fornecedores com dados bancarios completos | Alta | Nao existe |
| Dashboard financeiro: orcado vs pago por categoria | Alta | Nao existe |
| Calendario de pagamentos com lotes | Media | Nao existe |
| Controle de verbas a vista para substituir aba PRODUCAO | Media | Nao existe |
| Validacao de NF por IA (valor extraido vs orcado) | Alta | Existe no n8n |
| Pagamento em lote (1 comprovante para N itens) | Media | Nao existe |
| Alertas de NFs vencidas ou pagamentos atrasados | Media | Nao existe |
| Aprovacao de pagamentos (workflow de autorizacao) | Media | Nao existe |

---


## 9. Perguntas Abertas

Estas perguntas precisam ser respondidas antes de iniciar o desenvolvimento do modulo financeiro:

### 9.1 Modelo de dados

**P1 - Os itens de custo sao sempre vinculados a um job?**
Existem custos fixos da produtora (aluguel, salarios, ferramentas) que nao pertencem a nenhum job especifico, ou todo custo e sempre alocado a um projeto?

**P2 - Um fornecedor pode ter multiplos cadastros?**
A EQUIPE.csv tem 210 linhas sem controle de duplicatas. Na migracao, como tratar: deduplicar automaticamente por CPF/CNPJ, manter historico, ou criar processo manual de curadoria?

**P3 - O campo banco/PIX deve ser estruturado ou livre?**
Atualmente e texto livre com 98 variacoes para ~15 bancos. O ELLAHOS deve forcar estrutura (banco + agencia + conta + tipo) ou manter campo livre para facilitar migracao?

**P4 - Um item pode ter mais de uma NF?**
A PRODUCAO.csv suporta ate 30 NFs por item (slot horizontal). Isso e uso real ou apenas capacidade de reserva? Qual o maximo real observado?

**P5 - Como funciona o pagamento em lote (PGTO)?**
O arquivo PGTO cobre multiplos itens. O ELLAHOS deve: (a) criar um objeto pagamento separado que referencia N itens, ou (b) registrar o mesmo comprovante em cada item individualmente?

### 9.2 Fluxo operacional

**P6 - Quem preenche a data de pagamento no item?**
A coluna COL_19 (data de pagamento prevista) e preenchida pelo produtor no orcamento ou pelo financeiro durante a execucao? Ela pode mudar depois do job aprovado?

**P7 - O status do item e manual ou automatico?**
Atualmente o status PAGO parece ser inserido manualmente no campo de hora de entrada. No ELLAHOS, o status deve ser calculado automaticamente (ex: se tem comprovante = PAGO) ou continuara sendo manual?

**P8 - Como funciona a aprovacao do orcamento?**
Antes de comecar a executar um job, o orcamento total e aprovado pelo cliente? Existe um workflow de aprovacao formal ou e informal? Isso afeta quais colunas do schema?

### 9.3 Integracao e automacao

**P9 - O Drive continuara sendo o storage primario de NFs e comprovantes?**
O n8n atual salva NFs no Drive e registra o link na planilha. No ELLAHOS, as NFs serao salvas no Supabase Storage (com link para o arquivo) ou continuarao no Drive com apenas o link registrado no banco?

**P10 - Como sera a migracao dos dados existentes?**
Os jobs GG_033 e GG_038 representam quantos jobs totais no historico da Ellah? Existe expectativa de migrar todos os jobs anteriores para o ELLAHOS, ou apenas novos jobs a partir de uma data de corte?

---

## 10. Resumo Executivo

### O que a planilha faz bem (manter no ELLAHOS)

1. **Granularidade de item**: Cada linha e um contrato/servico especifico com seu proprio ciclo de vida (pedido NF, recebimento, pagamento, comprovante). Essa granularidade deve ser preservada.
2. **Rastreamento por codigo canonico**: O codigo NF_YYYYMMDD_J{job}_ID{id}_I{item}S{sub} e uma solucao elegante. O ELLAHOS deve adotar esse padrao como identificador oficial.
3. **Separacao de NF e comprovante**: A planilha distingue a nota fiscal recebida do comprovante de pagamento. Essa separacao deve existir como dois campos distintos no banco.
4. **Calendario de lotes**: A CALENDARIO.csv agrupa pagamentos por data, fundamental para fluxo de caixa. O ELLAHOS deve ter uma view de pagamentos por data similar.
5. **Campo de justificativa livre**: A coluna COL_10 permite texto livre para explicar discrepancias de valor. Manter esse campo no banco.

### O que precisa melhorar (problemas que o ELLAHOS deve resolver)

1. **Cadastro de fornecedores sem estrutura**: A EQUIPE.csv tem 98 variacoes de banco para ~15 bancos reais. O ELLAHOS deve ter tabela vendors estruturada com campos tipados.
2. **Status manual hackeado**: O status PAGO e inserido manualmente no campo de hora. O ELLAHOS deve ter campo status explicito e calcular automaticamente com base em datas e comprovantes.
3. **Sem separacao de tipo de documento**: A coluna documento mistura CPF, CNPJ e chave PIX. O banco deve ter campos separados: document_type e pix_key.
4. **PRODUCAO.csv horizontal nao escalavel**: A estrutura de 30 slots horizontais para NFs por item nao escala. O ELLAHOS deve usar tabela relacional (1 linha por NF de verba).
5. **Sem auditoria de mudancas**: Quando o valor de um item muda apos o orcamento, nao ha registro de quem mudou, quando, e de qual valor para qual. O ELLAHOS deve ter log de mudancas.
6. **Acoplamento a planilhas compartilhadas**: A EQUIPE.csv e identica nos dois jobs, copiada manualmente. O risco de divergencia e alto. O ELLAHOS centraliza isso em uma unica tabela.

### Metricas de escala (baseadas nos 2 jobs analisados)

| Metrica | GG_033 (FECHADO) | GG_038 (EM ANDAMENTO) | Estimativa ELLAHOS |
|---------|------------------|----------------------|---------------------|
| Itens de custo por job | 161 | 140 | ~100-200 |
| NFs por job | 44 | 10 (parcial) | ~30-60 |
| Lotes de pagamento por job | 6 | 6 (4 pagos) | ~5-10 |
| Fornecedores na base | 210 | 210 (mesma base) | ~200-500 |
| Valor medio por job | R$ 350k | R$ 765k | R$ 100k - R$ 1M |

### Prioridade de implementacao

Com base na analise, a ordem sugerida para o modulo financeiro:

1. **job_cost_items** (tabela central) - bloqueia tudo
2. **vendors** (fornecedores estruturados) - bloqueia NF request
3. **invoices** (NFs recebidas com Drive link) - automacao n8n ja existe
4. **payment_proofs** (comprovantes) - automacao n8n ja existe
5. **payment_batches** (lotes por data) - view de fluxo de caixa
6. **cost_templates** (templates de itens por categoria) - eficiencia no orcamento

---

Analise concluida em 26/02/2026.
Documento gerado pelo PM ELLAHOS com base em dados reais exportados do Google Sheets da Ellah Filmes.
