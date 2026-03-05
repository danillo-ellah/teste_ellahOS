# Drive Deep Analysis — Ellah Filmes
## Radiografia Completa da Operacao + Mapa de Features para o EllahOS

**Data:** 05/03/2026
**Fontes consultadas:**
- `drive-catalog.json` — catalogo completo de 22.708 arquivos
- `RELATORIO-FINAL-DRIVE-ELLAH.md` — raio-x do Drive
- `drive-summary.md` — arvore de pastas e planilhas
- `apps-scripts-report.md` — codigo fonte completo dos 2 scripts
- `analise-ecossistema-ellah.md` — mapa de workflows n8n e Apps Scripts
- `analise-planilhas-custos.md` — disseccao de GG_033 e GG_038
- `respostas-perguntas-financeiro.md` — decisoes de produto confirmadas pelo CEO

---

## SUMARIO EXECUTIVO

A Ellah Filmes construiu ao longo de 3 anos um ERP artesanal em Google Sheets + Apps Script que funciona com surpreendente sofisticacao. O Drive guarda 25.5 TB de ativos (videos, audio, imagens) e uma camada de gestao operacional com planilhas interligadas, formularios automaticos e 2 Apps Scripts que orquestram a criacao de cada job completo (55+ pastas, permissoes por papel, planilhas, formularios).

O EllahOS ja substituiu a maior parte dessa camada de gestao. Os gaps que restam sao especificos e mapeados abaixo. O maior ativo nao substituivel ainda e o volume de 25 TB de material bruto — essa biblioteca de clips e audio ainda esta fora do sistema.

---

## PARTE 1 — DEPARTAMENTOS E COMO OPERAM

### 1.1 ATENDIMENTO

**O que faz:**
O Atendimento e a interface entre a Ellah Filmes e as agencias de publicidade. Recebe o briefing do cliente, acompanha aprovacoes, coordena comunicacao durante o job.

**Como opera no Drive:**
- Pasta `09_ATENDIMENTO/` em cada job com 6 arquivos tipo. Contem: aprovacao interna, briefing recebido, atas de reuniao, troca de emails arquivada.
- A `09_ATENDIMENTO/` tem permissao concedida automaticamente ao "email do atendimento" da agencia (coluna I da planilha master) mais equipe interna de Atendimento.
- Usa grupo WhatsApp `EXTERNO || {JOB_ABA}` para comunicacao diaria com a agencia.
- Rastreia jobs na planilha master `CRIACAO PASTA E CONTROLE DE JOB` — campos relevantes: EMAIL DO ATENDIMENTO (col I), FASE (col X), STATUS (col Y), LINK DO BOARD TRELLO (col Q), URL_ENTREGAS_FINAIS (col T).

**Documento central: Aprovacao Interna**
PDF gerado com todos os dados do job consolidados: cliente, agencia, anunciante, diretor, secundagem, diarias, datas, elenco (texto/menor?), midia, formato. Serve como "ordem de servico" interna. Hoje e gerado manualmente a partir de um template Google Doc.

**Pipeline de orcamentos no Drive:**
Pasta `000_Orcamentos_em_Negociacao/` com subpastas por oportunidade, nomadas como:
`ORC-YYYY-XXXX_{data}_{cliente}_{projeto}/`
Atualmente 10 orcamentos em pipeline (dados do catalogo): 5 de 2025, 5 de 2026. Contem documentos de briefing, apresentacoes e cartas de orcamento.

**O que o EllahOS ja substitui:**
- CRM Kanban `/crm` rastreia pipeline de orcamentos.
- Jobs table rastreia status e fase.
- Portal cliente `/portal/client` da visibilidade ao cliente.

**O que AINDA faz no Google:**
1. Cartas de orcamento: a IA Supervisora do n8n (workflow de 95 nodes) gera e versiona cartas de orcamento com versionamento proprio em Postgres separado. Esta fora do EllahOS.
2. Aprovacao Interna: documento PDF consolidado do job. Gerado manualmente.
3. Comunicacao com agencia: grupos WhatsApp criados automaticamente, sem rastreamento no EllahOS.
4. Trello: jobs mais antigos tinham board no Trello (coluna Q da master). O EllahOS substitui isso mas o historico esta no Trello.

**Telas que precisam no EllahOS:**
- Gerador de "Aprovacao Interna" (PDF automatico com dados do job)
- Historico de versoes de carta de orcamento por job
- Inbox de mensagens por job (WhatsApp + email consolidados)
- Registro de numero ANCINE por job

---

### 1.2 FINANCEIRO

**O que faz:**
O Financeiro controla o ciclo financeiro completo de cada job: orcamento, custos reais, pagamentos de fornecedores, solicitacao/recebimento de notas fiscais, calendario de vencimentos e fechamento de P&L.

**Como opera no Drive:**
Pasta `02_FINANCEIRO/` com 8 subpastas por job:
```
02_FINANCEIRO/
  01_CARTAORCAMENTO/       — proposta enviada ao cliente
  02_DECUPADO/             — orcamento detalhado por item
  03_GASTOS GERAIS/        — planilha GG (coracao do financeiro)
  04_NOTAFISCAL_RECEBIMENTO/ — NFs de fornecedores recebidas
  05_COMPROVANTES_PG/      — comprovantes de pagamento
  06_NOTINHAS_EM_PRODUCAO/ — notas e recibos do set
  07_NOTAFISCAL_FINAL_PRODUCAO/ — NF que a Ellah emite ao cliente
  08_FECHAMENTO_LUCRO_PREJUIZO/ — resultado final (P&L)
```

**A planilha GG — diseccao completa:**
Cada job tem uma planilha `GG_{NUMERO}_{NOME}_{CLIENTE}` com 8 abas:

| Aba | O que contem | Status EllahOS |
|-----|-------------|----------------|
| OC | Orcamento decupado por categorias (15 categorias, 1095 linhas potenciais). Cabeçalho com titulo, numero, cliente, agencia, start, diarias, diretor, vencimento, faturamento, budget | `job_budgets` + `budget_items` — funcionando |
| CUSTOS_REAIS | 41 colunas, ate 1126 linhas. O nucleo operacional. Ciclo: valor/qtde/fornecedor → data vencimento calculada → pedido NF → NF recebida → pagamento → comprovante | `cost_items` — funcionando, mas sem ciclo NF |
| EQUIPE | ~210 fornecedores/freelancers: nome, email, banco, PIX. Fonte de VLOOKUP automatico para CUSTOS_REAIS | `job_team` + `people` + `vendors` — funcionando |
| PRODUCAO | 104 colunas. Controle de verbas a vista: orcado vs depositado vs comprovado com NFs (ate 30 NFs por item) | `cash_advances` — parcial |
| DEPOSITOS | Adiantamentos de verba ao produtor: indice, valor depositado, data, comprovante, PIX, via | `payment_transactions` — funcionando |
| PEDIDO EMISSAO NF | Template de email automatico. Digita INDEX, toda aba preenche: fornecedor, email, valor, data, assunto padronizado, pasta Drive para salvar NF | `nf_requests` + n8n — funcionando |
| CALENDARIO | Fluxo de caixa: SORT/UNIQUE/FILTER sobre coluna R (data vencimento). Total por data. Job 033: 6 datas, R$341k. Job 038: 6 datas, R$723k | Gap G-03 — sem visualizacao |
| DASHBOARD | Vazio no template — placeholder para graficos/pivot tables | Gap G-02 — sem dashboard visual |

**Dados reais dos jobs analisados:**

| Job | OC (orcado) | Custo Real | Diferenca |
|-----|-------------|------------|-----------|
| 033 ILHAPURA | R$168.922 | R$350.624 | +107% |
| 038 SENAC | R$644.400 | R$765.890 | +19% |

A diferenca entre OC e custo real e normal: OC e o orcamento aprovado pelo cliente. O custo real inclui toda a estrutura de producao.

**Formula de data de vencimento (coluna R):**
`start_do_job + prazo_da_coluna_K`
Valores de K: A vista, C/NF 30/40/45/60/90 dias, S/NF 30 dias.
Exemplo verificado: start 2026-01-25 + C/NF 45 dias = vencimento 2026-03-11.

**Nomenclatura de arquivos (padrao critico):**
- Comprovante: `PGTO_AAAAMMDD_J{job}_ID{id}_I{item}S{sub}.pdf`
- Nota Fiscal: `NF_AAAAMMDD_J{job}_ID{id}_I{item}S{sub}`
- Um comprovante pode cobrir multiplos itens: `PGTO_..._J33_ID24_I4S1_J33_ID27_I4S5.pdf`

**Ciclo de vida de um item de custo:**
```
(vazio) → PEDIDO (email enviado ao fornecedor)
       → AD=NAO (aguardando NF)
       → AD=SIM (NF recebida, link salvo)
       → AF=PAGO (pagamento efetuado, data em AG, comprovante em AH)
```

**O que AINDA faz no Google:**
1. Calendario de pagamentos visual (aba CALENDARIO): visao semanal/mensal com color-coding por status. Nao existe no EllahOS.
2. Dashboard financeiro (aba DASHBOARD): graficos de pizza por categoria, resumo OC vs Real vs Saldo. Gap G-02.
3. Ciclo de NF: pedido → fornecedor recebe email → fornecedor salva NF na pasta do Drive → planilha atualizada. No EllahOS existe `nf_requests` mas sem o ciclo de recebimento/confirmacao.
4. OCR de NFs: Apps Script usa api.ocr.space para extrair valores de PDFs de NFs automaticamente.
5. Conciliacao bancaria: planejada como roadmap (importar extrato OFX/CNAB e cruzar com pagamentos).
6. Fechamento P&L: pasta `08_FECHAMENTO_LUCRO_PREJUIZO/` — resultado final do job. Nao modelado no EllahOS.

**Telas que precisam no EllahOS:**
- Dashboard financeiro por job: cards OC vs Real vs Margem, grafico de categorias (Gap G-02)
- Calendario de pagamentos: visao mensal com vencimentos (Gap G-03)
- Ciclo de NF completo: pedido → recebimento → confirmacao
- Visualizacao de variancia por categoria (orcado vs real)
- Fechamento de job: tela de P&L final com confirmacao

---

### 1.3 PRODUCAO

**O que faz:**
Producao cuida da logistica do set: equipe, elenco, locacao, alimentacao, transporte, equipamentos. Pre-producao (PPM, casting, figurino, arte) e producao em si (diarias de filmagem).

**Como opera no Drive:**
Pastas relevantes:
- `01_DOCUMENTOS/` — aprovacao interna, roteiro, briefing (5 arquivos tipo)
- `03_MONSTRO_PESQUISA_ARTES/` — pesquisa visual, referencias de arte/figurino (4 subpastas)
- `06_FORNECEDORES/` — contratos e documentos de fornecedores de equipamento/locacao
- `05_CONTRATOS/` — contratos de elenco gerados (PDFs)

**Planilhas de producao:**
Na aba PRODUCAO do GG: 104 colunas. Controla verbas a vista do produtor de campo. O produtor recebe adiantamentos e presta contas com NFs/recibos. Sistema de deposito → comprovacao com ate 30 NFs por item de verba.

**Google Forms de equipe (35 formularios):**
Um formulario por job, gerado automaticamente pelo Apps Script ao criar o job.
Fluxo: freelancer recebe link do form → preenche dados (nome, CPF, RG, banco, PIX, etc.) → se "ja trabalhou antes? = SIM", puxa dados do banco central → se NAO, cadastra como novo.
O banco central de equipe tem ~286 profissionais registrados.

**O que o EllahOS ja substitui:**
- `job_team` rastreia membros da equipe por job.
- `people` armazena dados pessoais e bancarios (campo `bank_info JSONB`).
- Portal do Fornecedor `/vendor/[token]` substitui o Google Forms.

**O que AINDA faz no Google:**
1. Google Forms de equipe: ainda em uso ativo (35 formularios encontrados). O portal do fornecedor existe mas o fluxo de convite ainda nao e totalmente equivalente.
2. Banco central de equipe com ~286 profissionais: alguns com dados incompletos (duplicatas por case sensitivity, PIX e CNPJ misturados no mesmo campo). Nao migrado para o EllahOS.
3. Aba PRODUCAO: controle granular de verbas a vista com prestacao de contas. Parcialmente coberto por `cash_advances`.
4. Pasta `03_MONSTRO_PESQUISA_ARTES/`: board de pesquisa visual e referencias criativas. Nao tem equivalente no EllahOS — equipe usa pasta do Drive diretamente.

**Telas que precisam no EllahOS:**
- Migrador de banco de equipe: importar os 286 profissionais com dedup automatico (normalizar lowercase, trim, remover acentos)
- Controle de verbas a vista: fluxo deposito → prestacao de contas com reconciliacao
- Referencia visual do job: galeria de imagens de pesquisa/storyboard linkada ao Drive

---

### 1.4 POS-PRODUCAO

**O que faz:**
Pos-producao gerencia todo o workflow criativo apos a filmagem: loggagem do material, montagem (offline), revisoes, color/finalizacao, online e entrega das copias.

**Como opera no Drive:**
Pasta `08_POS_PRODUCAO/` com 8 subpastas padrao:
```
08_POS_PRODUCAO/
  01_MATERIAL BRUTO/    — clips originais da camera (MOV, MP4, BRAW, MXF)
  02_MATERIAL LIMPO/    — selecao/log do material aprovado
  03_PESQUISA/          — referencias criativas para pos
  04_STORYBOARD/        — storyboard e animatic
  05_MONTAGEM/          — projeto de edicao (Premiere/Resolve) + renders intermediarios
  06_COLOR/             — projeto de color grading
  07_FINALIZACAO/       — versao final aprovada
  08_COPIAS/            — entregas finais (formatos por midia/plataforma)
```

**O ativo mais valioso: 25 TB de material bruto**
| Formato | Qtd | Uso tipico |
|---------|-----|------------|
| MOV | 4.800 | Camera principal (ProRes, H.264) |
| MP4 | 2.670 | Entregas, conversoes, social |
| WAV | 1.344 | Audio de set, trilhas, locucao |
| BRAW | 156 | Camera Blackmagic |
| MXF | 7 | Broadcast |
| DNG | 505 | Foto RAW |

**Fases do cronograma de pos (da planilha DE_PARA):**
1. Loggagem do Material
2. Montagem
3. Offline (edicao/corte)
4. Offline — Alteracao
5. Offline — Aprovacao
6. Color / Finalizacao / Motion
7. Online — Apresentacao Agencia e Cliente
8. Online — Alteracao
9. Copias (entrega final)

**O que o EllahOS ja substitui:**
- `drive_folders` mapeia as pastas criadas.
- `job_deliverables` rastreia entregas.
- Modulo de cronograma (G-01 implementado) cobre as fases.

**O que AINDA faz no Google:**
1. Nenhuma indexacao de clips: 25 TB sem metadados no sistema. Impossivel buscar "plano americano produto" ou "take com erro de continuidade" no EllahOS.
2. Sem thumbnails ou previews: cada clip exige abrir o Drive manualmente.
3. Sem metadata de arquivo: duracao, resolucao, codec, FPS, tamanho — nada extraido.
4. Sem controle de versoes de edicao: quantas versoes do offline existiram? Quais foram aprovadas? Isso fica em emails e WhatsApp.
5. Sem tracking de storage: o EllahOS nao sabe que o job 033 ocupa X GB no Drive.

**Telas que precisam no EllahOS:**
- Player/preview de clips dentro do job (via embed do Drive)
- Controle de versoes do offline com status de aprovacao
- Storage analytics por job (GB/TB + estimativa de custo)
- Fase da pos-producao com checklist: loggagem -> offline -> color -> finalizacao -> copias

---

### 1.5 COMERCIAL / VENDAS

**O que faz:**
Comercial (Produtor Executivo) gera orcamentos, faz follow-up com agencias e fecha os jobs. Usa a pasta `10_VENDAS/PRODUTOR_EXECUTIVO/` de cada job.

**Como opera no Drive:**
- Pasta `10_VENDAS/PRODUTOR_EXECUTIVO/01_INICIO_DO_PROJETO/` — proposta inicial, cronograma inicial
- Pasta raiz `000_Orcamentos_em_Negociacao/` — pipeline de oportunidades com estrutura de pasta por ORC
- `PLANILHAS_TELMA/Orcamentos atuais/` — 181 planilhas de orcamento (provavelmente orcamentos da produtora Telma, sub-contratada)
- `LICITACOES/` — editais publicos (Petrobras, SENAC, TSE)

**A IA Supervisora do n8n (asset critico):**
O workflow de 95 nodes tem um agente especialista em "carta de orcamento" que:
- Recebe pedidos via WhatsApp
- Gera/edita cartas de orcamento com IA (Groq/Claude)
- Versiona as cartas em Postgres separado (`carta_orcamento_versions`)
- Envia PDF pelo WhatsApp
- Calcula custo de tokens em BRL (busca cotacao USD/BRL)

Esse fluxo esta completamente fora do EllahOS — funciona autonomamente no n8n.

**Clientes recorrentes (pelo Drive):**
PROPEG (Bahia, GGB), FCB/Cruzeiro do Sul, Ogilvy, Leiaute, MullenLowe, Agencia3 (PMRJ), Binder, SENAC, SECOM (Governo).

**O que AINDA faz no Google:**
1. Carta de orcamento: gerada via IA no n8n, fora do EllahOS. Versionamento em Postgres separado.
2. Follow-up de orcamentos: sem SLA ou rastreamento formal no EllahOS.
3. Licitacoes publicas: sem fluxo especifico no EllahOS para concorrencias publicas (Petrobras, SENAC, TSE encontradas no Drive).
4. Historico de orcamentos de referencia: para montar novo orcamento, o PE busca jobs similares no Drive. O EllahOS nao tem busca por categorias de custo historico.

**Telas que precisam no EllahOS:**
- Gerador de carta de orcamento com IA integrado (migrar da IA Supervisora do n8n)
- CRM com SLA de follow-up (dias desde ultimo contato)
- Buscador de historico de orcamentos: "quanto custou equipe tecnica em jobs similares?"
- Pipeline de licitacoes com prazos e documentacao

---

### 1.6 DIRECAO

**O que faz:**
O diretor lidera a visao criativa do job: pesquisa visual, storyboard, aprovacoes de arte/figurino/locacao, PPM (Pre-Production Meeting) com agencia/cliente.

**Como opera no Drive:**
- `03_MONSTRO_PESQUISA_ARTES/` — pasta de pesquisa visual e referencias (4 subpastas: Producao, Figurino, Arte, Objeto)
- `04_STORYBOARD/` dentro de `08_POS_PRODUCAO/` — storyboard e animatic
- PPM: reuniao formal antes da filmagem. Resultado salvo em `01_DOCUMENTOS/`.

**O que AINDA faz no Google:**
1. Pesquisa visual: Pinterest boards, referencias do Drive, imagens salvas sem metadados no sistema.
2. Storyboard: geralmente um PDF ou apresentacao Google Slides/PowerPoint. O EllahOS sabe que a pasta existe mas nao indexa o conteudo.
3. Aprovacoes: feitas via WhatsApp e email. Nao existe fluxo de aprovacao formal no EllahOS para arte/figurino/locacao.

**Telas que precisam no EllahOS:**
- Galeria de referencia visual por departamento (Producao/Figurino/Arte/Objeto)
- Fluxo de aprovacao criativa: item -> proposta -> aprovacao/rejeitada com comentario
- Preview de storyboard inline no job detail

---

## PARTE 2 — CATALOGO DE ARQUIVOS GOOGLE

### 2.1 GOOGLE SHEETS (175 planilhas)

#### Tipo A: Gastos Gerais (GG) — ~38 planilhas
Padrao de nome: `GG_{NNN}_{NOME}_{CLIENTE}`
Localizacao: `{JOB}/02_FINANCEIRO/03_GASTOS GERAIS/`
Funcao: controle financeiro completo do job (8 abas, 41 colunas na aba principal)
Jobs confirmados com GG: 011, 014, 017, 018, 020, 021, 023, 025, 026, 027, 028, 031, 033, 034, 035, 036, 037, 038, 039, 040

IDs de referencia:
- GG_033 ILHAPURA: analisado (R$350k custo real, 44 NFs, 6 datas pagamento)
- GG_038 SENAC: analisado (R$765k custo previsto, 75 itens C/NF, pico R$586k em mar/2026)

#### Tipo B: Cronograma — ~30 planilhas
Padrao de nome: `CRONOGRAMA {NNN}_{NOME}`
Localizacao: `{JOB}/04_CRONOGRAMA/` e `{JOB}/10_VENDAS/PRODUTOR_EXECUTIVO/01_INICIO_DO_PROJETO/04_CRONOGRAMA/`
Funcao: 3 abas (Calendario, Processo, DE_PARA). Gantt mensal com 8-15 fases da producao.
Jobs confirmados com Cronograma: 028, 031, 038, 039, 040
Fases padrão (8 na DE_PARA + sub-etapas manuais): Orcamento, Reuniao de Briefing, Pre-Producao, PPM, Producao, Gravacao, Pos Producao, Offline

#### Tipo C: Cadastro Elenco — ~38 planilhas
Padrao de nome: `CADASTRO_ELENCO_{NNN}_{NOME}`
Localizacao: `{JOB}/05_CONTRATOS/`
Funcao: dados de atores/modelos (CPF, RG, valores, cenas), hub de geracao de contratos
Estrutura: aba ELENCO (dados), aba CODIGO_ROBO (IDs de pastas/templates), aba DOCUSEAL_LOG
Nota: ja tem aba DOCUSEAL_LOG — indica que DocuSeal foi testado nessas planilhas

#### Tipo D: Planilha Master — 1 planilha global
ID: `13cOwWutmLhFdAvL4h-Dkpb_ObglPft2yphck2wAwvoU`
Nome: `CRIACAO PASTA E CONTROLE DE JOB`
Localizacao: pasta `2024/` (raiz)
Funcao: dashboard central de todos os jobs (40+ jobs). 50 colunas: INDEX, numero, nome, cliente, agencia, valor, links de todas as subpastas (15+ URLs por job), fase, status, responsaveis.
Colunas NAO mapeadas no EllahOS: LINK TRELLO (Q), URL_ENTREGAS_FINAIS (T), NUMERO ANCINE (Z), 15 URLs de subpastas (AA-AK), RESPONSAVEL COMERCIAL (AL), VALIDADE PROPOSTA (AM), TIPO MIDIA (AO), mockup/cenografia/comp grafica (AP-AR), URL_CARTA_ORCAMENTO (AU), URL_EQUIPE_DO_JOB_ATUAL (AW).

#### Tipo E: Banco de Dados Equipe — 1 planilha global
Nome: `BANCO DE DADOS EQUIPE`
Funcao: banco central de ~286 profissionais
Campos: Nome, Funcao, CPF, RG, Nascimento, DRT, Endereco, Cidade, CEP, Email, Telefone, CTPS, Serie, Valor, Diarias, Banco, Agencia, Conta, C/C ou C/P, PIX
Status: NAO migrado para o EllahOS. Dado mais completo que o `people` atual.

#### Tipo F: Planilhas Telma — ~181 planilhas
Localizacao: `2025/PLANILHAS_TELMA/Orcamentos atuais/`
Funcao: orcamentos de producao (Telma = PE sub-contratada ou interna?)
Status: nao analisadas em detalhe. Volume incomum para uma sub-pasta.

#### Tipo G: Outras — restante das 175
Inclui: GASTOS_PATROCINIO_CLUBEDECRIACAO, planilhas de licitacoes, formularios de equipe individuais.

---

### 2.2 GOOGLE DOCS (193 documentos)

**Nota tecnica:** Docs API nao estava habilitada no GCP no momento da varredura. Conteudo nao foi lido, apenas nomes e caminhos catalogados.

#### Tipo A: Contratos de Elenco (PDF) — ~50 documentos
Localizacao: `{JOB}/05_CONTRATOS/`
Gerados pelo Apps Script MODELO_DOC_ID: copia template, substitui ~40 placeholders, converte para PDF.
Estrutura do contrato: 5 quadros (qualificacao das partes, servico e obra, valor, observacoes, 14 clausulas).
Status: substituido pelo DocuSeal (com assinatura digital). O template DocuSeal #3 ja existe.

#### Tipo B: Docs-Fonte de Contrato — ~38 documentos
Um por job, localizado em `05_CONTRATOS/` ou `01_DOCUMENTOS/`
Funcao: contem dados do cliente e agencia em formato de texto livre com labels padronizados (ex: `Nome da empresa (cliente): SENAC SP`). O Apps Script le esse doc via regex para preencher os contratos.
Campos: nome, endereco, cidade, estado, CEP, CNPJ (cliente), CNPJ/end/nome (agencia), titulo(s) do(s) filme(s), produto, qtde pecas, suporte, duracao, exclusividade, veiculacao, comp grafica, midia impressa/foto still.

#### Tipo C: Aprovacao Interna — ~38 documentos
Um por job, em `01_DOCUMENTOS/`
PDF com todos os dados do job consolidados. Serve como "ordem de servico" interna e referencia para a equipe.

#### Tipo D: Roteiros e Briefings — ~20 documentos
Localizacao: `01_DOCUMENTOS/`
Documentos criativos: roteiros de producao, decupagens, briefings recebidos de agencias.

#### Tipo E: Atas e Relatorios — ~15 documentos
Atas de reuniao (PPM, reunioes de feedback), relatorios de producao.

#### Tipo F: Templates — ~10 documentos
Templates de contrato, carta de orcamento, documentos administrativos. Ficam na pasta `01_PASTA_BASE_ADM/` (template raiz).

---

### 2.3 GOOGLE FORMS (35 formularios)

Todos sao **formularios de cadastro de equipe por job**.
Gerados automaticamente pelo Apps Script CRIADOR DE PASTA ao criar cada job.
Link salvo na coluna `URL_EQUIPE_DO_JOB_ATUAL` (col AW) da planilha master.

**Estrutura do formulario:**
1. "Ja trabalhou com a gente antes?" (Sim/Nao)
2. Se Sim: seleciona nome na lista (autocomplete da planilha de equipe)
3. Se Nao: preenche tudo — nome, funcao, CPF, RG, nascimento, DRT, endereco, cidade, CEP, email, telefone, CTPS, banco, agencia, conta, PIX

**Processamento (Apps Script `processarColaboradores`):**
- Se "Ja trabalhou? = Sim": puxa dados do banco central pelo nome
- Se "Nao": cadastra como novo no banco central
- Preenche a aba EQUIPE do GG com os dados consolidados

**Status:** 35 formularios ativos. O Portal do Fornecedor do EllahOS e o equivalente, mas o fluxo de convite ainda nao e automatico por job (gap operacional).

---

### 2.4 GOOGLE PRESENTATIONS (15 apresentacoes)

Tipos encontrados pelos nomes/caminhos:
1. **Apresentacoes de orcamento** — apresentacao visual da proposta ao cliente
2. **PPM deck** — apresentacao da pre-producao para a agencia/cliente
3. **Claquetes** — geradas pelo Apps Script `gerarClaqueteInterface` (copia template Slides, preenche dados do filme, exporta PDF+PNG para registro ANCINE)
4. **Apresentacoes internas** — para equipe em reunioes de producao

**Nota sobre a claquete:** o Apps Script que gera claquetes (identificado em `analise-ecossistema-ellah.md`) copia um template de Google Slides, substitui placeholders (titulo, duracao, produto, cliente, diretor, tipo) e exporta PDF + PNG. Util para registro na ANCINE.

---

## PARTE 3 — GAPS E IDEIAS

### 3.1 O QUE CADA DEPARTAMENTO AINDA FAZ NO GOOGLE (consolidado)

| Departamento | Funcao no Google | Impacto se migrasse | Esforco estimado |
|-------------|-----------------|---------------------|------------------|
| Atendimento | Carta de orcamento via IA (n8n) | Alto — unifica tudo no EllahOS | Medio (3-5 dias) |
| Atendimento | Aprovacao Interna PDF | Medio — elimina template manual | Baixo (1-2 dias) |
| Atendimento | Comunicacao via grupos WhatsApp | Alto — rastreia conversas | Alto (5+ dias) |
| Financeiro | Calendario de pagamentos visual | Alto — vencimentos visiveis | Medio (2 dias) |
| Financeiro | Dashboard financeiro por job | Alto — elimina aba DASHBOARD | Medio (2 dias) |
| Financeiro | Ciclo completo de NF | Alto — fecha o loop operacional | Alto (5+ dias) |
| Financeiro | OCR de NFs | Medio — automatiza preenchimento | Medio (2-3 dias) |
| Financeiro | Conciliacao bancaria OFX | Alto — reconcilia tudo | Alto (5+ dias) |
| Producao | Google Forms de equipe | Medio — ja tem portal alternativo | Baixo (1 dia) |
| Producao | Banco de 286 profissionais | Alto — dado perdido se nao migrar | Medio (2-3 dias) |
| Producao | Verbas a vista + prestacao de contas | Medio — fluxo especifico | Medio (2-3 dias) |
| Pos-Producao | Controle de versoes de offline | Medio — hoje e em email/WhatsApp | Medio (2-3 dias) |
| Pos-Producao | Indexacao do material bruto | Alto — 25TB sem busca | Muito alto (10+ dias) |
| Comercial | Busca historica de orcamentos | Alto — PE perde tempo buscando | Medio (3-4 dias) |
| Direcao | Galeria de referencia visual | Baixo — comodidade | Medio (2-3 dias) |

---

### 3.2 IDEIAS CRIATIVAS BASEADAS NOS DADOS REAIS

#### IDEIA 1: Importador de GG (Quick Win Critico)
Criar script Python que le cada planilha GG do Drive e importa:
- Items de custo para `cost_items`
- Membros de equipe para `job_team`
- Dados bancarios para `people.bank_info`
- Calendario de pagamentos para `payment_transactions`

Resultado: jobs 003-040 aparecem no EllahOS com historico completo. Hoje o historico de 3 anos de operacao existe so no Drive.

Complexidade: Media. Requer acesso autenticado ao Drive, parser de XLSX, dedup de fornecedores.
Valor: Altissimo. A Ellah pode fazer analises de "quanto gastei em equipe tecnica em 2025?" diretamente no EllahOS.

#### IDEIA 2: Gerador de Aprovacao Interna
O documento "Aprovacao Interna" e gerado manualmente a partir de um template Google Doc. O EllahOS ja tem todos os dados necessarios (cliente, agencia, diretor, elenco, midia, formato, datas).

Feature: botao "Gerar Aprovacao Interna" no job detail → PDF gerado instantaneamente com dados do banco → salvo na pasta `01_DOCUMENTOS/` do Drive automaticamente.

Mesmo conceito se aplica para: Pedido de ANCINE, Ficha Tecnica, PPM summary.

#### IDEIA 3: Visualizador de Material Bruto
25 TB de clips sem indexacao. Nao e necessario fazer MAM (Media Asset Management) completo para comecar.

Versao simples: ao clicar em "Material Bruto" no job detail, listar os arquivos da pasta `08_POS_PRODUCAO/01_MATERIAL BRUTO/` via Drive API com nome, tamanho, data. Link para abrir no Drive.

Versao media: mostrar thumbnails (a Drive API gera thumbnails de videos automaticamente com `?alt=media&source=s2`).

Versao avancada: usar Groq Vision para descrever cada clip automaticamente e criar um indice buscavel.

#### IDEIA 4: Alerta Proativo de Vencimentos
A aba CALENDARIO do GG mostra os vencimentos. O EllahOS tem `payment_due_date` em `cost_items` mas sem visualizacao.

Feature: dashboard financeiro com timeline de vencimentos dos proximos 30 dias, agrupado por job. "Esta semana: R$45k a pagar em 3 jobs." Implementavel com uma query SQL simples sobre `cost_items`.

Bonus: notificacao WhatsApp automatica via n8n: "Voce tem R$586k vencendo em 11/03 no job SENAC. Clique aqui para ver detalhes."

#### IDEIA 5: Score de Saudade Financeira
Hoje nao existe indicador automatico de saude financeira por job. O EllahOS ja tem `health_score` (de `job_team`). Criar um `financial_health_score` baseado em:
- % de itens com NF recebida
- % de itens pagos vs total
- Variancia entre OC e custo real (>20% = amarelo, >40% = vermelho)
- Dias ate o proximo vencimento

Resultado: card no job detail mostrando "Financeiro: 78% — 3 NFs pendentes, proximo vencimento em 5 dias".

#### IDEIA 6: Catalogo de Clips por Tags
Sem precisar de MAM completo: criar uma tabela `clip_tags` simples onde o editor pode adicionar tags manuais nos clips do Drive.

Schema:
```sql
clip_tags (
  id, job_id, drive_file_id, filename,
  tags text[], phase text, notes text,
  created_by uuid, created_at timestamptz
)
```

Interface: lista de clips do job com campo de tags. Busca full-text por tags. Custo: ~2 dias de desenvolvimento, valor enorme para pos-producao.

#### IDEIA 7: Dedup Inteligente de Fornecedores
O banco de 286 fornecedores tem duplicatas por case sensitivity ("Joao" vs "JOAO"), PIX e CNPJ misturados.

Feature de migracao: tela de "Revisar Duplicatas" que mostra pares suspeitos (similaridade de nome > 85%) e permite merge com 1 click. Algoritmo: normalizar (lowercase, remover acentos, trim) + distancia de Levenshtein.

#### IDEIA 8: Integracao com Fluxo de NF
O fluxo atual: Financeiro envia email ao fornecedor → fornecedor salva PDF na pasta do Drive → financeiro confere manualmente → atualiza planilha.

Versao EllahOS:
1. EllahOS gera email de pedido de NF (ja existe `nf_requests`)
2. n8n monitora Gmail por respostas com PDF
3. PDF salvo automaticamente na pasta `04_NOTAFISCAL_RECEBIMENTO/` do Drive
4. `cost_item.nf_received = true`, link salvo
5. Notificacao para o financeiro conferir

Esse fluxo existe parcialmente no Apps Script atual — pode ser portado para n8n.

#### IDEIA 9: Linha do Tempo do Job (Job Timeline)
Cada mudanca de status/fase do job gera um registro em `job_history`. O EllahOS tem isso mas nao tem uma visualizacao de timeline.

Feature: `/jobs/[id]/timeline` mostrando a vida do job em ordem cronologica: orcamento aprovado → pasta criada → equipe cadastrada → filmagem realizada → offline entregue → aprovado → copias entregues → job fechado.

Inclui: quem fez cada acao, quando, quanto tempo levou em cada fase.

#### IDEIA 10: Modo Licitacao Publica
O Drive tem pasta `LICITACOES/` com 4 processos licitatories (Petrobras, SENAC, TSE). Licitacao tem fluxo diferente: edital, habilitacao, proposta tecnica, proposta comercial, impugnacao, resultado.

Feature modular: tipo de job `licitacao_publica` no EllahOS com campos e fases especificas. Alto valor para Ellah se o volume de licitacoes crescer (SECOM, Petrobras, TSE sao clientes recorrentes).

---

### 3.3 PRIORIZACAO POR IMPACTO OPERACIONAL

#### TIER 0 — Urgente (impede operacao plena)
| # | Feature | Justificativa |
|---|---------|---------------|
| P-01 | Importar banco de 286 fornecedores | Dado vai se degradar se nao migrar. 286 profissionais sem PIX/banco no EllahOS = impossivel pagar pelo sistema |
| P-02 | Ciclo de NF completo (pedido→recebimento→confirmacao) | O maior buraco operacional. Hoje o loop fecha no Google Sheets. Sem isso, o Financeiro nao pode largar o GG |

#### TIER 1 — Alta Prioridade (fecha gaps com Sheets)
| # | Feature | Justificativa | Esforco |
|---|---------|---------------|---------|
| G-02 | Dashboard financeiro por job | Card OC vs Real vs Margem. Dados ja existem | 2 dias |
| G-03 | Calendario de pagamentos | Vencimentos dos proximos 30/60/90 dias. Critico para Financeiro | 2 dias |
| G-04 | Permissoes Drive por papel | Criador de pastas nao aplica ACL granular | 1-2 dias |
| P-03 | Gerador de Aprovacao Interna PDF | Elimina template manual. Dados ja estao no EllahOS | 1-2 dias |
| P-04 | Alertas de vencimento via WhatsApp | pg_cron + n8n. "Voce tem X vencendo amanha" | 1 dia |

#### TIER 2 — Medio Prazo (agrega valor sobre Sheets)
| # | Feature | Justificativa | Esforco |
|---|---------|---------------|---------|
| P-05 | Importador de GG historico | Jobs 003-040 no EllahOS com historico completo | 3-5 dias |
| G-06 | Indexacao de docs do Drive | Listar arquivos de cada pasta no job detail | 2 dias |
| P-06 | Controle de versoes do offline | Rastrear revisoes e aprovacoes de pos-producao | 2-3 dias |
| P-07 | Dedup inteligente de fornecedores | Tela de merge + normalizacao | 2 dias |
| P-08 | IA para carta de orcamento | Migrar da IA Supervisora do n8n para dentro do EllahOS | 3-5 dias |

#### TIER 3 — Futuro (diferenciais competitivos)
| # | Feature | Justificativa | Esforco |
|---|---------|---------------|---------|
| G-05 | Catalogo de material bruto | Listar clips + thumbnails de 25TB | 5+ dias |
| P-09 | Conciliacao bancaria OFX | Importar extrato, cruzar com pagamentos | 5+ dias |
| P-10 | Score de saude financeira | Indicador automatico por job | 2 dias |
| P-11 | AI tagging de clips | Groq Vision para descrever material bruto | 10+ dias |
| P-12 | Modo licitacao publica | Fluxo dedicado para processos licitatorios | 5+ dias |
| G-12 | MAM completo | Media Asset Management com metadata plena | Muito alto |

---

## PARTE 4 — MAPA DE TABELAS E ARQUIVOS CHAVE

### 4.1 IDs do Drive relevantes para integracao

| Arquivo/Pasta | ID | Tipo | Uso |
|---|---|---|---|
| Planilha Master de Jobs | `13cOwWutmLhFdAvL4h-Dkpb_ObglPft2yphck2wAwvoU` | Spreadsheet | Dashboard central. Ler para importacao historica |
| Template de pastas (PASTA_BASE_ADM) | `1MEgFUwlOa5xsBpGrNZT3otsrkerp6sOd` | Folder | Template copiado pelo Apps Script para cada novo job |
| Pasta 2024/2025/2026 | `1vWSYrPSJswMSkeN5QED37MNTiaaib1id` | Folder | Raiz dos jobs. Novos jobs vao aqui |
| Template de contrato elenco | `1NpMEmZnOudHnfUxE1qiLmL98qh_2-5rqzaewZUqkrko` | Doc | Template usado pelo MODELO_DOC_ID para gerar contratos |
| Template GG (sub-planilha) | na pasta `subPastaId` do Apps Script | Spreadsheet | Copiado e renomeado para cada job |
| Apps Script Contratos | `15IgSCKO6stLHwDIzFnln38EzhnhMYbCqnW1hHIYmShJCAhLiVaoBBAO8` | Script | Gerador de contratos PDF (substituido pelo DocuSeal) |
| Apps Script Criador Pastas | `1VnMn1va5TUfs7SVbc2VMa8lHiPiBn3Ot5_XW0PsQuLnAbTF_vMeIoAkb` | Script | Script principal de criacao de estrutura por job |

### 4.2 Categorias de custo (as 15 do padrao Ellah)

```
1  - Desembolsos a Vista (figurino, locacao, uber, reembolsos)
2  - Estudio
3  - Locacao
4  - Arte / Figurino / Make / Efeitos
5  - Direcao de Cena / Fotografia / Som Direto
6  - Producao (Dir. Producao, Produtor, Coord., Ajudantes, Seguro)
7  - Veiculos
8  - Passagem, Hospedagem e Alimentacao
9  - Camera, Luz, Maquinaria, Gerador, Infra
10 - Producao de Casting
11 - Objetos de Cena / Itens Cenograficos
12 - Performance e Footage / Still / Bastidores
13 - Pos Producao / Trilha / Roteirista / Condecine
14 - Administrativo Legal / Financeiro / Atendimento
15 - Monstro (extras e imprevistos)
99 - Mao de Obra Interna (equipe Ellah Filmes)
```

### 4.3 Fases padrao de producao (da planilha DE_PARA)

| ID | Emoji | Fase | Categoria |
|----|-------|------|-----------|
| 1 | Comercial | Orcamento | Aprovacao |
| 2 | Comercial | Reuniao de Briefing | |
| 3 | Pre-Producao | Pre-Producao | |
| 4 | Pre-Producao | PPM | |
| 5 | Producao | Producao | |
| 6 | Producao | Gravacao | |
| 7 | Pos-Producao | Pos Producao | |
| 8 | Pos-Producao | Offline | |
| + | Sub-etapas | Loggagem, Montagem, Offline Alteracao/Aprovacao, Color, Online, Copias | |

### 4.4 Estructura de pastas por job (26 pastas padrao desde job 011)

```
{NNN}_{NOME}_{CLIENTE}/
  01_DOCUMENTOS/                     (5 templates)
  02_FINANCEIRO/                     (8 subpastas)
    01_CARTAORCAMENTO/
    02_DECUPADO/
    03_GASTOS GERAIS/
    04_NOTAFISCAL_RECEBIMENTO/
    05_COMPROVANTES_PG/
    06_NOTINHAS_EM_PRODUCAO/
    07_NOTAFISCAL_FINAL_PRODUCAO/
    08_FECHAMENTO_LUCRO_PREJUIZO/
  03_MONSTRO_PESQUISA_ARTES/         (4 subpastas: Producao, Figurino, Arte, Objeto)
  04_CRONOGRAMA/                     (1 planilha de cronograma)
  05_CONTRATOS/                      (contratos de elenco PDFs)
  06_FORNECEDORES/                   (documentos de fornecedores)
  07_CLIENTES/                       (materiais do cliente)
  08_POS_PRODUCAO/                   (8 subpastas)
    01_MATERIAL BRUTO/
    02_MATERIAL LIMPO/
    03_PESQUISA/
    04_STORYBOARD/
    05_MONTAGEM/
    06_COLOR/
    07_FINALIZACAO/
    08_COPIAS/
  09_ATENDIMENTO/                    (comunicacao com agencia)
  10_VENDAS/PRODUTOR_EXECUTIVO/      (1 subpasta)
    01_INICIO_DO_PROJETO/
      04_CRONOGRAMA/
```

---

## PARTE 5 — MAPEAMENTO DE STATUS: GOOGLE vs ELLAHOS

| Funcao | Google Workspace | EllahOS | Lacuna |
|--------|-----------------|---------|--------|
| Controle de jobs | Planilha Master (50 cols) | `jobs` + dashboard | Campos: ANCINE, URL_ENTREGAS, responsavel_comercial, validade_proposta, tipo_midia |
| Orcamento decupado | Aba OC da GG | `job_budgets` + `budget_items` | Modo top-down nao implementado |
| Custos reais | Aba CUSTOS_REAIS (41 cols) | `cost_items` | Ciclo NF (pedido/recebimento/confirmacao) |
| Equipe do job | Aba EQUIPE + Form | `job_team` + `people` | 286 profissionais nao migrados; bank_info parcial |
| Verbas a vista | Aba PRODUCAO (104 cols) | `cash_advances` | Prestacao de contas (multiplas NFs por verba) |
| Depositos | Aba DEPOSITOS | `payment_transactions` | OK |
| Pedido de NF | Aba PEDIDO EMISSAO NF | `nf_requests` + n8n | Loop de recebimento/confirmacao falta |
| Calendario de pagamentos | Aba CALENDARIO | --- | Gap G-03 critico |
| Dashboard financeiro | Aba DASHBOARD (vazia/placeholder) | --- | Gap G-02 critico |
| Elenco | CADASTRO_ELENCO + planilha | `job_cast` + TabCast | OK (DocuSeal substituiu gerador de PDF) |
| Cronograma | CRONOGRAMA (3 abas, Gantt) | Modulo cronograma (G-01) | Implementado |
| Criacao de pastas | Apps Script CRIADOR_PASTA | `drive-integration` EF | Sem permissoes por papel (Gap G-04) |
| Contratos de elenco | Apps Script MODELO_DOC_ID | DocuSeal integration | OK (com assinatura digital) |
| Forms de equipe | 35 Google Forms | Portal Fornecedor | Fluxo diferente mas equivalente |
| Pipeline de orcamentos | Pasta 000_Orcamentos | CRM Kanban /crm | OK |
| IA de orcamento | Workflow n8n 95 nodes | --- | Fora do EllahOS (n8n separado) |
| Grupos WhatsApp | n8n JOB_FECHADO_CRIACAO (Z-API) | --- | Fora do EllahOS (n8n separado) |
| Material bruto (25 TB) | Drive (pastas 08_POS_PRODUCAO) | --- | Sem indexacao (Gap G-05) |
| Claquete ANCINE | Apps Script gerarClaquete | --- | Nao implementado |
| Permissoes por papel | Apps Script aplicarPermissoes | --- | Gap G-04 |

---

## CONCLUSAO

A Ellah Filmes construiu um sistema operacional funcional e sofisticado em cima do Google Workspace. O EllahOS ja substituiu a maioria das planilhas operacionais com uma arquitetura mais robusta.

Os 3 gaps que mais prejudicam a operacao diaria e impedem o abandono total das planilhas sao:

1. **Ciclo de NF**: o loop pedido → recebimento → confirmacao → pagamento nao fecha no EllahOS. O financeiro precisa voltar ao GG para marcar NF como recebida.

2. **Banco de 286 profissionais nao migrado**: dados bancarios (PIX, banco, conta) dos freelancers existem so no Drive. Sem eles, o EllahOS nao consegue gerar pagamentos.

3. **Calendario de pagamentos**: vencimentos de R$500k+ em jobs como o SENAC estao visiveis no GG mas invisiveis no EllahOS.

O maior ativo intocado e os 25 TB de material bruto. Uma indexacao basica (listar arquivos + thumbnails via Drive API) ja mudaria radicalmente a experiencia da pos-producao sem precisar de MAM completo.

A IA Supervisora do n8n (carta de orcamento com 4 agents) e um asset valioso que merece integracao nativa no EllahOS em vez de ficar como sistema paralelo.
