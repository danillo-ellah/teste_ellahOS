# Visao de Produto -- EllahOS
## Baseada na Radiografia Completa do Drive da Ellah Filmes

**Data:** 05/03/2026
**Autor:** PM EllahOS
**Fontes:** Drive audit (22.708 arquivos), Planilha Master (40 jobs), 5x GG analisadas, 2 Apps Scripts, 4 workflows n8n

---

## SUMARIO EXECUTIVO

A Ellah Filmes construiu ao longo de 3 anos um ERP artesanal em Google Workspace que funciona com surpreendente sofisticacao. Sao 175 planilhas, 193 documentos, 35 formularios e 2 Apps Scripts que orquestram o ciclo completo de producao audiovisual -- do orcamento a entrega, do casting ao pagamento do ultimo fornecedor.

O EllahOS ja substituiu a maior parte dessa camada de gestao (60+ tabelas, 45+ Edge Functions, Fases 1 a 12.5 concluidas). O que resta sao gaps especificos e bem mapeados.

**Posicao atual da Ellah Filmes:**
- 40 jobs executados (003-040), ticket medio de R$400k-600k por job
- Jobs ativos: ticket entre R$89.900 (036 Metro SP) e R$1.949.982 (038 SENAC SP)
- Pipeline: 10 orcamentos em negociacao (Silimed, Cruzeiro do Sul, SECOM-BA, Metro SP, SENAC Elenco/Fotografia/Vinhetas)
- 286 profissionais no banco de freelancers (204 migrados para o EllahOS)
- 25,5 TB de material bruto no Drive (4.800+ clips de video)
- Mercado: posicao 12 no ranking de publicidade brasileira (R$73,5M em contratos)
- Equipe interna: Aurelio (CEO/PE), Danillo (PE), Telma (CCO), Amanda (Financeiro), Lucas (Pos)

**O que o EllahOS ja entrega:**
Jobs com ciclo completo de criacao, historico, equipe, financeiro (cost_items, vendors, cash_advances), contratos (DocuSeal), portal do cliente, CRM com Kanban, cronograma/timeline, integracao Drive, Ordem do Dia, elenco com assinatura digital, WhatsApp com IA (n8n 95-nodes).

**Gaps remanescentes:**
- TIER 0 (urgente): completar banco de 286 fornecedores + ciclo completo de NF
- TIER 1 (alto impacto): dashboard financeiro visual, calendario de pagamentos, gerador de Aprovacao Interna
- TIER 2 (medio prazo): importador historico de GGs, indexacao de docs do Drive, dedup de fornecedores
- TIER 3 (diferenciais): catalogo de material bruto, conciliacao bancaria, score de saude financeira

---

## SECAO 1 -- MAPA DEPARTAMENTAL

### Como a Ellah Filmes opera hoje

---

### 1.1 ATENDIMENTO

**Operacao diaria:**
O Atendimento e a interface entre a Ellah e as agencias de publicidade. Recebe briefings, acompanha aprovacoes, coordena comunicacao durante todo o job via grupo WhatsApp externo. Rastreia o pipeline de orcamentos (pasta 000_Orcamentos_em_Negociacao) com 10 oportunidades ativas.

**Ferramentas atuais (Google Workspace ERP):**
- Planilha Master CRIACAO PASTA E CONTROLE DE JOB: 40 jobs, 50 colunas.
- Pasta 09_ATENDIMENTO por job: aprovacao interna, briefing, atas.
- Grupo WhatsApp EXTERNO criado automaticamente pelo n8n workflow JOB_FECHADO_CRIACAO.
- IA Supervisora (n8n, 95 nodes, 4 agentes): cartas de orcamento por WhatsApp, versionamento em Postgres separado.

**O que o EllahOS ja substitui:**
- CRM /crm com Kanban DnD rastreia pipeline por estagio
- Tabela jobs com 75+ colunas rastreia status, fase, responsaveis
- Portal do cliente /portal/client substitui entregas por email
- job_history registra todas as mudancas de estado

**Gaps remanescentes:**
1. Carta de orcamento: gerada via IA no n8n fora do EllahOS.
2. Aprovacao Interna: PDF do job gerado manualmente a partir de template Google Doc.
3. Comunicacao com agencia: grupos WhatsApp sem rastreamento no EllahOS.
4. Numero ANCINE: campo nao mapeado na tabela jobs.
5. Follow-up SLA: sem indicador de dias desde ultimo contato no CRM.

---

### 1.2 FINANCEIRO

**Operacao diaria:**
O Financeiro (Amanda) controla o ciclo completo de cada job: orcamento decupado, custos reais, pagamentos de fornecedores, solicitacao/recebimento de NFs, calendario de vencimentos e fechamento de P&L.

**Ferramentas atuais (Google Workspace ERP):**
- Planilha GG por job (GG_{NNN}_{NOME}_{CLIENTE}): 8 abas -- OC (orcamento por categoria), CUSTOS_REAIS (41 colunas), EQUIPE (~210 fornecedores com banco/PIX), PRODUCAO (verbas a vista, 104 colunas), DEPOSITOS, PEDIDO EMISSAO NF, CALENDARIO (fluxo de caixa), DASHBOARD.
- Dados reais: GG_038 SENAC tem 139 itens, R$765k custo previsto, pico R$586k vencendo em 11/03/2026. GG_033 ILHAPURA: R$350k custo real, 6 datas, R$341k total.
- Formula de vencimento: start_do_job + prazo_coluna_K (A vista, C/NF 30/40/45/60/90 dias, S/NF 30 dias).
- 16 categorias: 1-Verbas Vista, 2-Estudio, 3-Locacao, 4-Arte/Figurino, 5-Direcao/Foto/Som, 6-Producao, 7-Veiculos, 8-Passagem/Hospedagem/Alimentacao, 9-Camera/Luz, 10-Casting, 11-Objetos, 12-Performance, 13-Pos/Trilha, 14-Admin, 15-Monstro, 99-Mao Obra Interna.
- Nomenclatura: PGTO_AAAAMMDD_J{job}_ID{id}_I{item}S{sub}.pdf

**O que o EllahOS ja substitui:**
- cost_items (43 colunas) cobre o CUSTOS_REAIS das GGs
- vendors + bank_accounts cobrem a aba EQUIPE com dados bancarios
- cash_advances cobre a aba DEPOSITOS/PRODUCAO (verbas a vista)
- nf_requests cobre o fluxo de pedido de NF
- job_budgets + budget_items cobrem a aba OC
- 204 vendors + 283 cost_items + 202 bank_accounts ja migrados (Fase 10)

**Gaps remanescentes:**
1. Dashboard financeiro visual (G-02): aba DASHBOARD das GGs sem equivalente. Spec + arquitetura prontos. Estimativa: 2 dias.
2. Calendario de pagamentos visual (G-03): aba CALENDARIO com fluxo de caixa. Sem equivalente no EllahOS.
3. Ciclo completo de NF: pedido -> recebimento -> confirmacao. Loop nao fecha no sistema.
4. Fechamento P&L: pasta 08_FECHAMENTO_LUCRO_PREJUIZO sem equivalente no EllahOS.
5. 82 fornecedores do banco de 286 ainda nao migrados.

---

### 1.3 PRODUCAO

**Operacao diaria:**
Producao cuida da logistica do set: equipe, elenco, locacao, alimentacao, transporte e equipamentos. Pre-producao (PPM, casting, figurino, arte) e filmagem (diarias).

**Ferramentas atuais (Google Workspace ERP):**
- 35 Google Forms de equipe (1 por job): freelancer preenche, Apps Script cadastra no banco central automaticamente.
- Banco central de 286 profissionais: nome, CPF, RG, DRT, endereco, banco, PIX.
- Aba EQUIPE do GG: ~210 linhas por job com dados bancarios para VLOOKUP automatico.
- Aba PRODUCAO do GG: 104 colunas, verbas a vista com prestacao de contas (ate 30 NFs por item).
- Pasta 03_MONSTRO_PESQUISA_ARTES com 4 subpastas: Producao, Figurino, Arte, Objeto.
- Grupos WhatsApp PRODUCAO e ELENCO criados automaticamente pelo n8n.

**O que o EllahOS ja substitui:**
- job_team rastreia membros da equipe por job
- people armazena dados pessoais e bancarios (campo bank_info JSONB)
- Portal do Fornecedor /vendor/[token] substitui Google Forms de equipe
- job_cast (28 colunas) + DocuSeal para contratos de elenco com assinatura digital

**Gaps remanescentes:**
1. Banco de 286 profissionais: 82 ainda nao migrados. Risco de degradacao do dado.
2. Google Forms de equipe: 35 formularios ainda em uso ativo. Fluxo de convite automatico por job nao esta completo.
3. Verbas a vista: cash_advances cobre parcialmente. Falta reconciliacao granular.
4. Pesquisa visual: pasta 03_MONSTRO_PESQUISA_ARTES sem equivalente no EllahOS.

---

### 1.4 POS-PRODUCAO

**Operacao diaria:**
Pos-producao (Lucas) gerencia o workflow criativo apos a filmagem: loggagem do material, montagem, revisoes, color, finalizacao, online e entrega das copias.

**Ferramentas atuais (Google Workspace ERP):**
- Pasta 08_POS_PRODUCAO com 8 subpastas: Material Bruto, Material Limpo, Pesquisa, Storyboard, Montagem, Color, Finalizacao, Copias.
- 25,5 TB de material bruto: 4.800+ MOV, 2.670+ MP4, 1.344+ WAV, 156 BRAW, 505 DNG.
- Fases do cronograma: Loggagem, Montagem, Offline, Offline-Alteracao, Offline-Aprovacao, Color/Finalizacao, Online-Apresentacao, Online-Alteracao, Copias.
- Aprovacoes via WhatsApp e email sem rastreamento formal.

**O que o EllahOS ja substitui:**
- drive_folders mapeia as pastas criadas por job
- job_deliverables rastreia entregas por job
- Modulo de cronograma (G-01, commit 8f8508a) cobre fases com datas e status

**Gaps remanescentes:**
1. Sem indexacao de clips: 25 TB sem metadados no sistema.
2. Sem thumbnails/previews: cada clip exige abrir o Drive manualmente.
3. Sem controle de versoes de offline: rastreamento em emails e WhatsApp.
4. Sem tracking de storage: o EllahOS nao sabe que o job 033 ocupa X GB.
5. Sem fluxo formal de aprovacao criativa: arte, figurino, locacao aprovados por WhatsApp.

---

### 1.5 COMERCIAL / VENDAS

**Operacao diaria:**
O PE (Aurelio/Danillo) gera orcamentos, faz follow-up com agencias e fecha jobs. Participa de licitacoes publicas (SECOM, SENAC, Petrobras, TSE).

**Ferramentas atuais (Google Workspace ERP):**
- Pasta 000_Orcamentos_em_Negociacao com 10 orcamentos ativos: Silimed, Cruzeiro do Sul, SECOM-BA, Metro SP, SENAC Elenco, SENAC Fotografia, SENAC Vinhetas, Governo Locutor Rua, Secom Regional, SECOM Posicionamento 2026.
- IA Supervisora no n8n (95 nodes, 4 agentes): gera cartas de orcamento por WhatsApp, versiona em Postgres separado, calcula custo em BRL.
- Clientes recorrentes: PROPEG, FCB/Cruzeiro do Sul, Ogilvy, Leiaute, MullenLowe, Agencia3 (PMRJ), Binder, SENAC, SECOM.
- 181 planilhas de orcamento em PLANILHAS_TELMA (Telma CCO).
- Pasta LICITACOES com 4 processos reais: Petrobras, SENAC, TSE, SECOM.

**O que o EllahOS ja substitui:**
- CRM /crm com Kanban, 5 estagios, follow-up alerts, Monthly Report, Director Ranking
- Tabela jobs com closed_value, agency_id, client_id

**Gaps remanescentes:**
1. Carta de orcamento com IA: gerada pelo n8n fora do EllahOS. Versoes nao visiveis no sistema.
2. Historico de orcamentos como referencia: PE busca jobs similares no Drive. Sem busca por categoria historica.
3. SLA de follow-up: sem alerta formal de X dias sem contato por oportunidade.
4. Pipeline de licitacoes: sem fluxo especifico para processos publicos.

---

### 1.6 DIRECAO / CRIACAO

**Operacao diaria:**
O Diretor (externo por job) lidera a visao criativa: pesquisa visual, storyboard, aprovacoes de arte/figurino/locacao, PPM com agencia/cliente. Exemplos reais: Kiko Lomba (job 038, R$50k), Joan Josep ibars Pallas (Arte, R$18k).

**Ferramentas atuais (Google Workspace ERP):**
- Pasta 03_MONSTRO_PESQUISA_ARTES com 4 subpastas: Producao, Figurino, Arte, Objeto.
- Storyboard: PDF ou Google Slides em 08_POS_PRODUCAO/04_STORYBOARD.
- PPM: apresentacao formal antes da filmagem, resultado salvo em 01_DOCUMENTOS.
- Aprovacoes de arte/figurino/locacao por WhatsApp e email sem rastreamento.

**O que o EllahOS ja substitui:**
- Cronograma /jobs/[id]/cronograma rastreia fases incluindo PPM com datas
- job_history registra mudancas de estado

**Gaps remanescentes:**
1. Galeria de referencia visual: sem equivalente para pesquisa criativa por departamento.
2. Fluxo de aprovacao criativa: item -> proposta -> aprovado/rejeitado com comentario.
3. Preview inline de storyboard: EllahOS sabe que a pasta existe mas nao indexa conteudo.

---

## SECAO 2 -- USER STORIES PRIORIZADAS (MoSCoW)

### MUST HAVE (sem isso, o financeiro nao larga o GG)

**US-M01: Dashboard Financeiro Visual por Job (G-02)**
Como Amanda (Financeiro), quero ver graficos de OC vs Custo Real vs Saldo, donut de status de pagamento e comparativo por categoria, para ter o mesmo visual da aba DASHBOARD do GG sem abrir o Google Sheets.
- Criterios: 4 graficos Recharts, dados server-side, loading skeleton, empty state, responsivo, dark mode, tooltip BRL.
- Spec PM: docs/specs/dashboard-financeiro/01-pm-spec.md (pronto)
- Estimativa: 2 dias. Zero migrations.

**US-M02: Calendario de Pagamentos (G-03)**
Como Amanda (Financeiro), quero ver uma visao mensal dos vencimentos dos proximos 30/60/90 dias agrupados por job, para planejar o fluxo de caixa sem abrir a aba CALENDARIO do GG.
- Criterios: visao mensal com color-coding por status (pendente/vencido/pago), total por dia, drill-down para itens.
- Dado disponivel: cost_items.payment_due_date ja existe e esta populado.
- Estimativa: 2 dias.

**US-M03: Ciclo Completo de NF (P-02)**
Como Amanda (Financeiro), quero enviar pedido de NF ao fornecedor, receber a NF por email automaticamente, confirmar recebimento e registrar o link do PDF, para fechar o loop do custo sem sair do EllahOS.
- Criterios: cost_item atualizado automaticamente, link PDF salvo, notificacao WhatsApp.
- Status: nf_requests existe mas sem recebimento/confirmacao.
- Estimativa: 5 dias (integracao Gmail + n8n + Drive API).

**US-M04: Completar Banco de Fornecedores (P-01)**
Como Amanda (Financeiro), quero que os 82 fornecedores restantes do banco de 286 estejam no EllahOS com dados bancarios e PIX completos, para registrar pagamentos sem consultar a aba EQUIPE do GG.
- Criterios: dedup automatico (normalizar lowercase+acentos+trim), merge de duplicatas, 100% dos 286 migrados.
- Status: 204 de 286 migrados na Fase 10.
- Estimativa: 1-2 dias.

**US-M05: Gerador de Aprovacao Interna PDF (P-03)**
Como Danillo (PE), quero clicar em Gerar Aprovacao Interna no job e receber um PDF com dados consolidados (cliente, agencia, diretor, elenco, midia, formato, datas), para eliminar o preenchimento manual do template Google Doc.
- Criterios: PDF gerado instantaneamente, salvo em 01_DOCUMENTOS no Drive, historico de versoes por job.
- Dados disponiveis: tudo em jobs, clients, agencies, job_cast, job_team.
- Estimativa: 1-2 dias.

---

### SHOULD HAVE (aumenta significativamente a adocao)

**US-S01: Alerta de Vencimentos via WhatsApp (P-04)**
Como Amanda (Financeiro), quero receber uma mensagem no WhatsApp todas as manhas com os vencimentos do dia e da semana, para nao depender de lembrar de abrir o sistema.
- Criterios: mensagem formatada com total por job, link direto para o item, enviada via Z-API.
- Implementacao: pg_cron + query sobre cost_items + n8n.
- Dado real: GG_038 tem R$586k vencendo em 11/03/2026 -- esse tipo de alerta e critico.
- Estimativa: 1 dia.

**US-S02: Dedup Inteligente de Fornecedores (P-07)**
Como Danillo (PE), quero uma tela que mostra pares de fornecedores provavelmente duplicados e permite fazer merge com 1 clique, para limpar o banco com duplicatas por case sensitivity.
- Criterios: algoritmo Levenshtein normalizado, merge move cost_items e job_team para o ID vencedor.
- Estimativa: 2 dias.

**US-S03: Indexacao de Documentos do Drive no Job (G-06)**
Como qualquer membro da equipe, quero ver a lista de arquivos de cada pasta do Drive diretamente no job detail, para nao precisar abrir o Drive em outra aba.
- Criterios: listar arquivos por pasta (01_DOCUMENTOS, 05_CONTRATOS, 02_FINANCEIRO), nome + tamanho + data + link.
- Estimativa: 2 dias.

**US-S04: Carta de Orcamento com IA no EllahOS (P-08)**
Como Danillo (PE), quero gerar e versionar cartas de orcamento dentro do EllahOS usando IA, para unificar o fluxo que hoje esta no n8n separado e ter historico vinculado ao CRM.
- Estimativa: 3-5 dias. Requer migracao do fluxo n8n.

**US-S05: Controle de Versoes do Offline (P-06)**
Como Lucas (Pos), quero registrar cada versao do offline no EllahOS com data, status e link do arquivo, para rastrear o historico de revisoes sem depender de emails e WhatsApp.
- Criterios: versoes numeradas (v1, v2...), status (aguardando feedback/aprovado/rejeitado), comentario da aprovacao.
- Estimativa: 2-3 dias.

**US-S06: CRM com SLA de Follow-up**
Como Aurelio (CEO), quero ver no CRM quantos dias desde o ultimo contato com cada oportunidade, e receber alerta quando passar de 5 dias sem acao, para garantir que nenhum orcamento esfrie.
- Estimativa: 1-2 dias.

---

### COULD HAVE (agrega valor sem ser critico)

**US-C01: Importador Historico de GGs (P-05)**
Como Aurelio (CEO), quero que os jobs 003-040 aparecam no EllahOS com historico financeiro completo importado das planilhas GG do Drive, para conseguir fazer analises do tipo quando gastamos em equipe tecnica em 2025.
- Criterios: script Python, dedup de fornecedores, 0 registros duplicados.
- Estimativa: 3-5 dias.

**US-C02: Score de Saude Financeira por Job (P-10)**
Como Aurelio (CEO), quero ver um indicador automatico de saude financeira em cada job, para identificar jobs em risco sem abrir o dashboard completo.
- Criterios: score 0-100 baseado em % NFs recebidas, % itens pagos, variancia OC vs real, dias ate proximo vencimento.
- Estimativa: 2 dias.

**US-C03: Visualizador de Material Bruto (G-05 v1)**
Como Lucas (Pos), quero ver a lista de clips da pasta MATERIAL BRUTO com nome, tamanho, data e thumbnail, para ter acesso rapido sem sair do EllahOS.
- Estimativa: 2-3 dias.

**US-C04: Galeria de Referencia Visual por Job**
Como o Diretor do job, quero ver as imagens da pasta 03_MONSTRO_PESQUISA_ARTES organizadas por departamento dentro do EllahOS, para compartilhar referencias sem mandar link do Drive.
- Estimativa: 2 dias.

**US-C05: Fechamento de Job (P&L Final)**
Como Aurelio (CEO), quero uma tela de fechamento do job com P&L final (receita vs custo real vs margem) e confirmacao para marcar como fechado, para ter registro auditavel do resultado financeiro.
- Estimativa: 2 dias.

**US-C06: Pipeline de Licitacoes Publicas**
Como Danillo (PE), quero um modulo especifico para licitacoes com campos de edital, prazo de habilitacao, proposta tecnica e proposta comercial, para gerenciar concorrencias de Petrobras, SENAC e SECOM.
- Estimativa: 3-5 dias.

---

### WONT HAVE (por ora -- muito esforco, ROI baixo no volume atual)

**US-W01: MAM Completo (Media Asset Management)**
Indexacao automatica de 25 TB com metadata tecnico (codec, resolucao, FPS), busca full-text e preview em stream. Custo de infra muito alto para o volume atual. Reavaliar quando o numero de jobs crescer 3x.

**US-W02: OCR Automatico de NFs**
Complexidade de integracao e edge cases superam o beneficio enquanto o volume for baixo. Reavaliar apos ciclo de NF estar fechado.

**US-W03: Conciliacao Bancaria OFX/CNAB**
Muito util mas requer integracao bancaria segura. Prioridade apos o ciclo de NF estar 100% implementado.

**US-W04: AI Tagging de Clips (Groq Vision)**
Custo de tokens e tempo de processamento inviavel no volume atual de 25 TB.

---

## SECAO 3 -- ROADMAP TRIMESTRAL 2026

### Q1 2026 (janeiro-marco) -- Em andamento
**Tema: Fechar os gaps criticos que impedem o abandono do GG**

Estado em 05/03/2026: Fases 1-12.5 concluidas. G-01 (cronograma) implementado (commit 8f8508a). Aproximadamente 2 semanas restantes no trimestre.

Entregas previstas ate 31/03/2026:
- [ ] G-02: Dashboard financeiro visual (spec+arch prontos, ~2 dias)
- [ ] G-03: Calendario de pagamentos -- visao mensal (~2 dias)
- [ ] P-01: Completar banco de fornecedores (82 restantes + dedup, ~1-2 dias)
- [ ] SECURITY ALTO-001: adicionar auth ao handler sync-urls
- [ ] SECURITY ALTO-002: mascarar erro PG em 14 handlers
- [ ] PORTAL BUG-001: corrigir possivel exposicao de token UUID na RPC publica
- [ ] G-04: Permissoes Drive por papel no criador de pastas (~1-2 dias)

Dependencias:
- G-02: cost_items + vendors ja populados
- G-03: payment_due_date em cost_items ja existe
- ALTO-001: 1 handler a corrigir
- ALTO-002: 14 handlers a padronizar resposta de erro

---

### Q2 2026 (abril-junho)
**Tema: Fechar o loop operacional do financeiro e automatizar comunicacao**

Meta: Amanda nao precisa abrir o Google Sheets para o ciclo diario de pagamentos e NFs.

Entregas planejadas:
- [ ] P-02: Ciclo completo de NF (pedido -> recebimento via Gmail/n8n -> confirmacao)
- [ ] P-03: Gerador de Aprovacao Interna PDF
- [ ] P-04: Alertas de vencimento via WhatsApp (pg_cron + Z-API)
- [ ] US-S04: Carta de orcamento com IA dentro do EllahOS (migracao do n8n)
- [ ] US-S06: CRM com SLA de follow-up (badge de dias + alerta)
- [ ] Phone Auth: configurar SMS hook no Supabase Dashboard + Z-API secrets

Marco Q2: o financeiro consegue fechar o ciclo de um job inteiro (do custo ao pagamento) sem sair do EllahOS.

---

### Q3 2026 (julho-setembro)
**Tema: Historico completo + inteligencia sobre dados acumulados**

Meta: 3 anos de operacao (jobs 003-040) disponiveis para analise no EllahOS.

Entregas planejadas:
- [ ] P-05: Importador historico de GGs (jobs 003-040 com financeiro completo)
- [ ] P-07: Dedup inteligente de fornecedores (tela de merge)
- [ ] G-06: Indexacao de documentos do Drive no job detail
- [ ] P-06: Controle de versoes do offline
- [ ] P-10: Score de saude financeira por job
- [ ] US-C05: Tela de fechamento de job com P&L final
- [ ] US-C04: Galeria de referencia visual por departamento

Marco Q3: o CEO consegue responder quando gastamos em equipe tecnica em 2025 diretamente no EllahOS.

---

### Q4 2026 (outubro-dezembro)
**Tema: Diferenciais competitivos + preparacao para expansao SaaS**

Meta: EllahOS pronto para ser vendido como SaaS para outras produtoras audiovisuais brasileiras.

Entregas planejadas:
- [ ] G-05 v1: Visualizador de material bruto com thumbnails via Drive API
- [ ] US-C06: Pipeline de licitacoes publicas
- [ ] Multi-tenant onboarding: wizard de setup para nova produtora em menos de 2 horas
- [ ] Plano de precos SaaS: definir tiers (Starter/Growth/Enterprise)
- [ ] Documentacao de produto para demo externo

Marco Q4: primeiro cliente externo usando o EllahOS em producao.

---

## SECAO 4 -- IDEIAS CRIATIVAS

*Todas derivadas da analise real do Drive. Nenhuma foi inventada.*

---

### IDEIA 1: Importador de GG (Quick Win de Alto Impacto)
**Origem:** 38 planilhas GG no Drive com estrutura identica (8 abas, 41 colunas em CUSTOS_REAIS).

Script Python que le cada GG via Drive API e importa: itens de custo para cost_items, membros de equipe para job_team, dados bancarios para people.bank_info, calendario de pagamentos para payment_transactions.

Resultado: jobs 003-040 aparecem no EllahOS com historico completo. 3 anos de operacao (R$73,5M em contratos) hoje existem so no Drive.

Valor: altissimo. A Ellah pode responder quando gastei em equipe tecnica em 2025 diretamente no EllahOS.
Complexidade: media. Requer acesso autenticado ao Drive, parser de XLSX, dedup de fornecedores.

---

### IDEIA 2: Gerador de Aprovacao Interna
**Origem:** 01_DOCUMENTOS/Aprovacao_interna -- 1 documento por job, gerado manualmente (3.493 chars lido no Drive audit). Template com campos: cliente, agencia, anunciante, diretor, secundagem, diarias, datas, elenco, midia, formato.

O EllahOS ja tem TODOS os dados necessarios em jobs, clients, agencies, job_cast, job_team. Feature: botao Gerar Aprovacao Interna no job detail -> PDF instantaneo -> salvo em 01_DOCUMENTOS do Drive automaticamente.

Extensao natural: Pedido de ANCINE, Ficha Tecnica do Job, PPM summary -- todos baseados no mesmo conjunto de dados.

---

### IDEIA 3: Visualizador de Material Bruto
**Origem:** 25,5 TB em 08_POS_PRODUCAO/01_MATERIAL BRUTO sem indexacao. 4.800+ MOV, 2.670+ MP4, 505 DNG, 156 BRAW.

Versao simples (1 dia): listar arquivos da pasta via Drive API com nome, tamanho, data, link.
Versao media (2 dias): thumbnails -- a Drive API gera thumbnails de video automaticamente.
Versao avancada (futuro): Groq Vision para descrever cada clip e criar indice buscavel por tag.

O diferencial: a pos-producao nunca mais precisaria abrir o Drive separado para saber o que tem de material.

---

### IDEIA 4: Alerta Proativo de Vencimentos
**Origem:** GG_038 SENAC: R$586.140 vencendo em 11/03/2026 -- dado verificado na planilha real. GG_033 ILHAPURA: 6 datas de pagamento, R$341k total.

Feature: pg_cron roda toda manha, query sobre cost_items WHERE payment_due_date <= CURRENT_DATE + interval 1 day. n8n envia Z-API: Voce tem R$586k vencendo amanha no job SENAC. Acesse: [link].

Bonus: dashboard Esta semana: R$1,2M a pagar em 5 jobs. Uma query SQL sobre dados ja existentes.

---

### IDEIA 5: Score de Saude Financeira por Job
**Origem:** O EllahOS ja tem health_score calculado por trigger baseado em job_team. O mesmo padrao aplicado ao financeiro.

financial_health_score (0-100) baseado em: % de itens com NF recebida (peso 25%), % de itens pagos (peso 25%), variancia OC vs custo real -- maior que 20% = amarelo, maior que 40% = vermelho (peso 30%), dias ate proximo vencimento (peso 20%).

Card no job detail: Financeiro: 78% -- 3 NFs pendentes, proximo vencimento em 5 dias.

---

### IDEIA 6: Catalogo de Clips por Tags
**Origem:** Nenhum sistema de tags existe para os 25 TB. Zero metadados estruturados no sistema atual.

Schema minimo: tabela clip_tags com campos id, job_id, drive_file_id, filename, tags (text array), phase, notes, created_by, created_at.

Interface: editor adiciona tags manualmente nos clips. Busca full-text por tags. Exemplos: todos os takes close do produto, plano geral com continuidade de figurino, material cortado no offline.
Custo: ~2 dias. Valor enorme para pos-producao sem precisar de MAM completo.

---

### IDEIA 7: Dedup Inteligente de Fornecedores
**Origem:** 286 profissionais com duplicatas confirmadas por case sensitivity (Joao vs JOAO), PIX e CNPJ misturados no mesmo campo.

Tela Revisar Duplicatas: lista pares suspeitos (similaridade de nome maior que 85%). Cada par mostra dados lado a lado, botao Mesclar escolhe o registro principal e move todos os cost_items/job_team para o ID vencedor.

Algoritmo: normalizar (lowercase + strip acentos + trim) + distancia de Levenshtein. Base de teste disponivel: 204 fornecedores ja migrados.

---

### IDEIA 8: Ciclo de NF Fechado com n8n e Gmail
**Origem:** O Apps Script atual faz parte desse fluxo. O EllahOS tem nf_requests mas o loop nao fecha. A pasta 04_NOTAFISCAL_RECEBIMENTO existe em todo job.

Fluxo EllahOS completo:
1. Amanda clica Pedir NF no cost_item
2. EllahOS envia email padronizado ao fornecedor
3. n8n monitora Gmail por respostas com PDF em anexo
4. PDF salvo automaticamente em 04_NOTAFISCAL_RECEBIMENTO via Drive API
5. cost_item.nf_status = nf_recebida, link do PDF salvo
6. Notificacao WhatsApp: NF de Fullcine recebida (R$35.860).

Esse fluxo existe parcialmente no Apps Script atual. O n8n tem todos os building blocks.

---

### IDEIA 9: Linha do Tempo do Job
**Origem:** job_history registra todas as mudancas de estado mas nao ha visualizacao de timeline.

Feature /jobs/[id]/timeline: vida do job em ordem cronologica com cards visuais.
Exemplo real (job 038 SENAC): Orcamento aprovado R$644k (Aurelio, jan/26) -> Pasta Drive criada (Apps Script) -> Equipe cadastrada 12 membros (Amanda) -> Filmagem D1+D2 (25-26/jan) -> Offline entregue (Lucas, fev/26) -> Offline aprovado (cliente) -> Copias entregues (Lucas).

Cada evento mostra: quem fez, quando, tempo gasto na fase. Ferramenta de ouro para post-mortem e estimativas futuras.

---

### IDEIA 10: Modo Licitacao Publica
**Origem:** Pasta LICITACOES confirmada com 4 processos reais (Petrobras, SENAC, TSE, SECOM). Sao clientes recorrentes de alto valor.

Licitacao tem fluxo diferente: edital -> habilitacao (documentos) -> proposta tecnica -> proposta comercial -> prazo de impugnacao -> resultado -> recurso.

Feature: tipo de job licitacao_publica com campos especificos (numero do pregao, orgao, valor estimado, prazos, resultado). Checklist de documentos de habilitacao. Alta relevancia se volume crescer -- SECOM e SENAC sao contratos de R$500k+ recorrentes.

---

## SECAO 5 -- METRICAS DE SUCESSO

### KPIs de Adocao

**Meta Q2 2026: Amanda nao abre o Google Sheets mais de 2x por semana.**
Metrica proxy: numero de acessos ao GG no Drive Audit Log.
Atual (estimado): acesso diario. Meta: max 2x/semana para verificacoes rapidas.

**Meta Q2 2026: 100% dos novos itens de custo criados no EllahOS (nao no GG).**
Metrica: COUNT(cost_items) WHERE created_at maior ou igual a 2026-04-01.
Atual: novos itens ainda sendo lancados nas planilhas GG.

**Meta Q3 2026: 100% dos 286 fornecedores migrados e sem duplicatas.**
Metrica: COUNT(DISTINCT vendors) + resultado do algoritmo de dedup.
Atual: 204 de 286 migrados (71%).

---

### KPIs Financeiros

**Reducao do tempo de fechamento de job:**
Atual (estimativa CEO): 2-3 dias de trabalho por job para fechar P&L.
Meta Q3 2026: menos de 4 horas com dados completos no EllahOS.

**% de NFs recebidas antes do vencimento:**
Metrica: COUNT(cost_items WHERE nf_received_at menor que payment_due_date) / COUNT(cost_items nao cancelados).
Atual: nao calculavel (dado no GG). Baseline a medir no Q2. Meta Q3: maior que 80%.

**Variancia media OC vs Custo Real por categoria:**
Dados reais: job 033 ILHAPURA +107% total, job 038 SENAC +19% total.
Meta: monitorar variancia por categoria. Alertar quando uma categoria ultrapassar +30% do OC.

**Dias de atraso medio nos pagamentos:**
Metrica: AVG(actual_payment_date - payment_due_date) por job.
Atual: nao calculavel no EllahOS. Meta Q2: calcular baseline. Meta Q3: reduzir 20%.

---

### KPIs de Saude Tecnica

**Uptime:**
Meta: maior que 99,5% (Vercel + Supabase sa-east-1).
Atual: nao monitorado formalmente.

**Latencia das Edge Functions:**
Meta: P95 menor que 500ms.
Atual: nao monitorado formalmente.

**Seguranca:**
Meta Q1 2026: 0 issues CRITICOS ou ALTOS abertos.
Atual: ALTO-001 (sync-urls sem auth) + ALTO-002 (erro PG exposto em 14 handlers) em aberto.

**Cobertura TypeScript:**
Meta: zero erros tsc --noEmit em todo commit.
CI atual: lint + tsc + build em ci.yml.

---

### KPIs de Crescimento SaaS (horizonte Q4 2026)

**Onboarding de nova produtora:**
Meta Q4: nova produtora operacional em menos de 2 horas com wizard de setup.
Atual: sem wizard. Setup manual requer aproximadamente 1 semana.

**Mercado enderecavel:**
- Posicao 12 no ranking de publicidade brasileira (R$73,5M) -- dado real do Drive.
- Produtoras tier-1 em SP/RJ: ~150 com faturamento acima de R$5M/ano.
- Preco estimado SaaS: R$1.200/mes por produtora.
- ARR potencial: R$1.200 x 150 = R$2,16M.
- Meta Q4: fechar 3 contratos pilotos com produtoras externas.

---

## APENDICE -- REFERENCIAS

### Arquivos que embasam este documento

| Arquivo | Conteudo |
|---------|----------|
| docs/specs/drive-full-analysis/01-drive-deep-analysis.md | Radiografia completa dos 6 departamentos, 15 gaps TIER 0-3, 10 ideias criativas |
| docs/specs/drive-full-analysis/00-executive-summary.md | 12 planilhas, 73 abas, 5.390 linhas de dados |
| docs/specs/drive-full-analysis/sheets-gastos-gerais.md | GG_038 SENAC: 139 itens, R$765k, fornecedores e valores reais |
| docs/specs/drive-full-analysis/sheets-master.md | 40 jobs, 286 profissionais, 10 orcamentos ativos, RBAC por funcao |
| docs/specs/analise-planilhas-custos.md | Disseccao de GG_033 e GG_038: 41 colunas, formula de vencimento |
| docs/specs/analise-ecossistema-ellah.md | 2 Apps Scripts, 4 n8n workflows, permissoes por papel |
| docs/specs/respostas-perguntas-financeiro.md | 10 decisoes de produto confirmadas pelo CEO |
| docs/specs/dashboard-financeiro/01-pm-spec.md | G-02 spec pronto: 5 user stories, wireframe |

### Estado atual do EllahOS (05/03/2026)
- 60+ tabelas | 50+ migrations | 45+ Edge Functions
- Fases 1-12.5 concluidas
- Commits relevantes: 8f8508a (cronograma G-01), db3d80c (drive catalog, dashboard spec)
- Repo: https://github.com/danillo-ellah/teste_ellahOS.git (branch: main)
- Deploy: Vercel (https://teste-ellah-os.vercel.app) + Supabase sa-east-1
