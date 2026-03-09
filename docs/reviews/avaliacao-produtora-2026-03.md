# Avaliacao ELLAHOS - Perspectiva de Dono de Produtora

**De:** Avaliador independente (produtora medio porte, 12 pessoas fixas, ~20 jobs/ano, faturamento R$5M/ano)
**Para:** CEO / Fundador do ELLAHOS
**Data:** 09 de marco de 2026
**Versao avaliada:** main branch (commit fba0572)

---

## Contexto da Avaliacao

Sou dono de uma produtora de filme publicitario em Sao Paulo. Trabalho com agencias como Almap, Africa, DPZ. Faco de 15 a 25 jobs por ano, cada um com 30-50 freelas. Hoje uso Google Sheets pra tudo, WhatsApp pra comunicacao, e-mail pra aprovacoes, e a cabeca da minha produtora executiva pra nao perder prazo.

Explorei o codigo-fonte real do ELLAHOS — frontend, backend, banco de dados — pra entender o que existe de verdade, nao o que esta num slide de vendas. O que segue e minha avaliacao honesta.

---

## Inventario Real do Sistema

Antes de dar notas, preciso registrar o que encontrei de fato implementado:

- **42 paginas** no frontend (dashboard, listagens, detalhes, sub-paginas financeiras, CRM, portal, admin)
- **54 Edge Functions** no backend (CRUD completo, IA, integracao Drive, DocuSeal, NF, pagamentos, relatorios)
- **86 migrations** no banco (62+ tabelas reais no Supabase)
- **19 abas** no detalhe do Job (Geral, Equipe, Entregaveis, Financeiro, Diarias, Locacoes, PPM, Storyboard, Elenco, Ordem do Dia, Relatorio de Set, Figurino/Arte, Horas Extras, Aprovacoes, Contratos, Cronograma, Atendimento, Historico, Portal)
- **7 sub-paginas financeiras** por job (Custos, Dashboard, Orcamento, Verbas, Calendario, + globais: Fluxo de Caixa, Conciliacao, NF)
- **RBAC com 4 fases** implementadas (15 roles x 19 abas, masking financeiro no backend)
- **IA Copilot** (ELLA) com botao flutuante em todas as paginas
- **Dark mode** funcional
- **Mobile** com bottom nav

---

## Avaliacao por Modulo

### 1. Dashboard (Home) — NOTA: 8/10

**O que vi:** Pagina de entrada com saudacao personalizada ("Boa tarde, Daniel"), KPI cards, faixa de caixa projetado, pipeline de jobs, painel de alertas, timeline de atividades, grafico de receita, snapshot comercial, donut de status.

**O que funciona bem:**
- Saudacao humanizada — parece que o sistema me conhece
- KPIs logo de cara (jobs ativos, faturamento, margem)
- Pipeline visual — consigo ver em que fase cada job esta
- Alertas de prazo e margem — isso me economiza tempo REAL
- Faixa de caixa projetado — nenhuma planilha me da isso automaticamente
- CeoPendingExtras — mostra extras pendentes de aprovacao, muito util

**O que falta:**
- Nao tem "acoes rapidas" (criar job, ver job mais urgente) na home
- Nao tem comparativo com mes anterior
- Nao tem meta de faturamento vs realizado

---

### 2. Jobs (Listagem) — NOTA: 8.5/10

**O que vi:** Tabela com filtros, ordenacao, paginacao, selecao em massa, acoes bulk (arquivar, mudar status, cancelar com motivo). Visao alternativa em Kanban. Contagem "Mostrando X de Y jobs".

**O que funciona bem:**
- Kanban + Tabela — cada pessoa usa do jeito que prefere
- Filtros por status, cliente, agencia, tipo, data — completo
- Bulk actions com confirmacao (nao deleta sem querer)
- Cancelamento exige motivo — otimo pra historico
- Empty state com CTA claro ("Crie o primeiro job")
- View mode persistido em localStorage — lembra minha preferencia

**O que falta:**
- Filtro por Produtor Executivo responsavel (minha PE quer ver SO os dela)
- Busca global (Ctrl+K) nao aparece implementada na listagem
- Nao tem "jobs favoritos" ou "jobs fixados no topo"

---

### 3. Detalhe do Job — NOTA: 9/10

**O que vi:** Header sticky com breadcrumb, titulo editavel inline, badge de status com dropdown pra mudar, prioridade, badge de pre-producao, indicador de sync. 19 abas organizadas em 4 grupos coloridos (Info, Producao, Gestao, Registro). Error boundaries por aba. RBAC filtrando abas por role.

**O que funciona BEM:**
- Titulo editavel com auto-save e feedback visual — nao preciso clicar "Salvar"
- Grupos de abas por area (Producao, Gestao, etc.) com cor — facilita MUITO
- Cada aba tem Error Boundary — se uma quebra, as outras continuam
- Clonagem de job — uso muito isso quando repito trabalho pro mesmo cliente
- Breadcrumb "Jobs > 036" — sei exatamente onde estou
- Status pipeline visual — consigo ver em que fase o job esta
- Metadata visivel (cliente, agencia, data entrega) sem clicar

**O que impressiona:**
- 19 abas e NENHUMA parece placeholder vazio. Todas tem funcionalidade real
- PPM (Pre-Producao Meeting) com checklist configuravel — muito especifico do audiovisual
- Storyboard, Elenco, Ordem do Dia, Relatorio de Set — isso e linguagem de PRODUTORA, nao de software generico
- Claquete digital — dispenso aquele app separado que a equipe usava

**O que falta:**
- Tab de Pos-Producao dedicada (vi que a migration acabou de ser criada, mas o frontend ainda nao tem a tab)
- Nao tem busca dentro do job (imagina um job com 80 membros de equipe)

---

### 4. CRM / Pipeline Comercial — NOTA: 8/10

**O que vi:** Pipeline Kanban com drag-and-drop, visao lista, barra de stats, alertas de follow-up, metricas dialog, detalhe de oportunidade com layout 3 colunas. Dashboard CRM separado. Relatorio CRM separado.

**O que funciona bem:**
- Kanban visual com pipeline ativo vs historico completo
- Alerta de follow-up ("voce nao falou com esse cliente ha X dias")
- Metricas de conversao (funil de oportunidades)
- Detalhe da oportunidade completo (breadcrumb, stages, full detail)
- Dashboard CRM dedicado + relatorio — nao mistura com o financeiro

**O que falta:**
- Nao vi "Converter oportunidade em Job" com 1 clique (esse e O fluxo mais importante)
- Nao tem integracao com e-mail (pra trackear quando mandei proposta)
- Nao tem template de proposta comercial

---

### 5. Financeiro — NOTA: 9/10

**O que vi:** E o modulo MAIS completo do sistema. Contei 7 sub-paginas no menu lateral + 4 sub-paginas por job:

**Global:**
- Visao Geral (receitas x despesas x saldo)
- Fornecedores (cadastro completo)
- Calendario de Pagamentos (visao mes, lista, selecao batch, dialogs de pagamento e prorrogacao)
- Fluxo de Caixa Projetado (30/60/90/180 dias, granularidade diaria/semanal/mensal, grafico + tabela, ALERTA de saldo negativo com data exata)
- Validacao de NFs (auto-match por email, status cards, filtros)
- Solicitacao de NFs
- Conciliacao Bancaria (upload OFX, auto-conciliacao, barra de progresso)

**Por Job:**
- Custos do Job (tabela planilha-like com export CSV, filtros, pagamento batch, drawer de edicao)
- Dashboard Financeiro do Job (6 KPIs, barra de margem visual, alertas, graficos de timeline/status/vendors/budget-vs-actual, tabela por categoria, proximos pagamentos)
- Orcamento
- Verbas (adiantamentos)

**O que funciona BEM:**
- ALERTA DE SALDO NEGATIVO COM DATA — "Voce tem 15 dias pra agir" — isso vale OURO
- Dashboard financeiro por job com 5 graficos e breakdown por categoria — nenhum concorrente tem isso
- Campos em R$ com formato brasileiro (virgula decimal) — parece bobo, mas todo sistema americano erra nisso
- Margem calculada automaticamente (generated columns no banco)
- Conciliacao bancaria com OFX — isso e coisa de ERP grande
- Export CSV dos custos — minha PE vai amar (pode colar na planilha dela pra comparar)
- Calendario de pagamentos com batch pay + prorrogacao — resolve o "quando tenho que pagar quem"

**O que impressiona MUITO:**
- O sistema calcula impostos brasileiros (tax_percentage, tax_value como generated column)
- Comissao de agencia como campo separado — entende como funciona o mercado
- Custos fixos separados dos custos por job
- Recebiveis (parcelas do cliente) com gestao propria

**O que falta:**
- DRE mensal (Demonstrativo de Resultado) — meu contador pede todo mes
- Integracao bancaria automatica (Open Banking) em vez de upload OFX manual
- Boletos — gerar boleto direto do sistema seria um diferencial enorme

---

### 6. Equipe / Pessoas — NOTA: 7.5/10

**O que vi:** Listagem de pessoas (internas e freelas), detalhe com tabs, cadastro completo (CTPS, dados bancarios). Na aba Equipe do job: tabela com role, status de contratacao, cache, datas, contrato. Geracao de contratos em lote via DocuSeal. Override de acesso por membro.

**O que funciona bem:**
- 16 roles especificos do audiovisual (Diretor, DoP, Gaffer, etc.) — nao e generico
- Status de contratacao (Orcado, Proposta Enviada, Confirmado, Cancelado)
- Contratos DocuSeal em lote — economiza HORAS
- Override de acesso por membro — o 1o AD ve abas diferentes do Editor
- Cache visivel com controle de quem pode ver (FEE_VIEW_ROLES)

**O que falta:**
- Calendario de disponibilidade de freelas — "quem esta livre na semana que vem?"
- Avaliacao de freelas pos-job — "como foi trabalhar com fulano?"
- Portal do freela pra preencher dados e ver contratos (vi que existe vendor-portal EF, mas sem frontend)

---

### 7. Pre-Producao (PPM) — NOTA: 7/10

**O que vi:** Aba PPM no detalhe do job com checklist configuravel (admin pode criar templates). Badge de progresso no header do job. Integracao com o fluxo de status.

**O que funciona bem:**
- Checklist configuravel por tipo de job (filme publicitario vs conteudo digital tem itens diferentes)
- Badge visual de progresso — vejo de cara se a pre-producao ta completa
- Admin pode criar templates de pre-producao

**O que falta:**
- Nao vi geracao de callsheet integrada (existe EF call-sheet, mas nao achei tab no frontend)
- Nao tem timeline visual de pre-producao (tipo Gantt da pre-prod)
- Faltam documentos padrao (briefing de pos, briefing de arte, etc.)

---

### 8. Producao (Set) — NOTA: 8/10

**O que vi:** Diarias (shooting dates), Locacoes, Storyboard, Elenco, Ordem do Dia, Relatorio de Set, Figurino/Arte, Horas Extras, Claquete. Tudo como abas no detalhe do job.

**O que funciona bem:**
- Relatorio de Set com 30 colunas (horarios, cenas, ocorrencias, clima) — substitui o diario de papel
- Ordem do Dia com preview dialog — posso ver antes de enviar pra equipe
- Elenco com import e contratos individuais
- Horas Extras com calculo — isso e uma DOR enorme nas produtoras
- Claquete digital — a equipe de camera vai adorar

**O que falta:**
- Callsheet como PDF gerado automaticamente (tenho a EF, mas nao o frontend que gera)
- Envio de callsheet por WhatsApp direto do sistema
- Weather alerts (vi a EF weather-alerts, mas nao o frontend)

---

### 9. Pos-Producao — NOTA: 3/10

**O que vi:** A migration mais recente (20260309) cria colunas de pos-producao em job_deliverables (pos_stage, pos_assignee_id, pos_drive_url, pos_briefing) e tabela pos_cut_versions. Existe EF pos-producao. Mas NAO existe tab/pagina de pos-producao no frontend.

**Situacao real:** Backend pronto, frontend NAO implementado.

**O que falta (tudo):**
- Tab de Pos-Producao no detalhe do job
- Pipeline visual de estagios (ingest, montagem, cor, VFX, finalizacao, audio)
- Upload/link de cortes com versionamento
- Ciclo de revisao com aprovacao do diretor/cliente
- Estimativa de horas por entregavel
- Esta e uma lacuna CRITICA — pos-producao e 40-60% do ciclo de um job

---

### 10. Drive / Integracao Google Drive — NOTA: 5/10

**O que vi:** DriveSection e DrivePermissionsDialog como componentes no job detail. EF drive-integration. IntegrationBadges no header do job. Botao "Drive" no header que abre a pasta.

**Situacao real:** A integracao existe mas depende de credenciais configuradas. O link pro Drive aparece no header. Nao tem navegacao de arquivos dentro do ELLAHOS.

**O que funciona:**
- Link direto pra pasta do job no Drive
- Permissoes de Drive por membro da equipe

**O que falta:**
- Nao navego arquivos do Drive dentro do sistema — tenho que ir pro Drive
- Nao tem preview de video/imagem
- Nao tem controle de versao de arquivos

---

### 11. Portal do Cliente — NOTA: 7/10

**O que vi:** Pagina global listando todas as sessoes de portal com filtro de status, link copiavel, datas. Criacao de sessoes no detalhe do job (aba Portal). Portal externo com timeline, documentos, mensagens.

**O que funciona bem:**
- Link unico por sessao com expiracao — seguro
- Copiar link com 1 clique — facilita enviar por WhatsApp
- Status ativo/inativo visivel
- Timeline de interacao no portal

**O que falta:**
- Cliente nao consegue aprovar orcamento direto pelo portal (vi que e mais informativo)
- Nao tem notificacao pro atendimento quando cliente acessa o portal
- Nao tem chat em tempo real no portal

---

### 12. Dashboard CEO (visao 360) — NOTA: 8/10

**O que vi:** A home JA e o dashboard CEO. Tem KPIs, pipeline, alertas, faixa de caixa, receita por mes, snapshot comercial. Extras pendentes de aprovacao.

**O que funciona bem:**
- Tudo que o CEO precisa numa tela so
- Faixa de caixa projetado no dashboard — nao preciso ir na pagina de fluxo de caixa

**O que falta:**
- Comparativo ano a ano (2025 vs 2026)
- Meta de faturamento anual com % atingido
- Ranking de rentabilidade por cliente

---

### 13. Contratos DocuSeal — NOTA: 6/10

**O que vi:** Aba Contratos no job com BatchContractDialog. EF docuseal-integration com template HTML (15 clausulas + 3 anexos). Gerador de valor por extenso em PT-BR.

**O que funciona:**
- Contrato gerado automaticamente com dados do job e do freela
- Assinatura digital via DocuSeal
- Geracao em lote (batch) pra toda a equipe

**Limitacao:**
- DocuSeal free nao substitui campos — usa HTML API como workaround
- Depende de configuracao de servidor (self-hosted)
- Nao tem contratos com clientes/agencias (so freelas)

---

### 14. NFs / Notas Fiscais — NOTA: 7/10

**O que vi:** Validacao de NFs com auto-match (subject do email + vendor_email), tabela filtrada com stats cards, dialogs de validacao e reassign, rejeicao em lote. EF nf-processor com ingest em 2 etapas.

**O que funciona:**
- Auto-match inteligente (codigo do job no assunto + email do fornecedor)
- Vinculacao manual quando auto-match falha
- Stats claras (pendentes, auto-matched, confirmadas, rejeitadas)

**O que falta:**
- Workflow n8n (Gmail > n8n > ingest) nao esta ativo — depende de configuracao VPS
- Nao emite NF — so recebe e valida
- Nao tem XML viewer

---

### 15. RBAC / Controle de Acesso — NOTA: 8.5/10

**O que vi:** 4 fases implementadas. Sidebar filtrada por role. Tabs do job filtradas por role. Guard nas rotas. Masking financeiro no backend (PE ve tudo, 1o AD ve so orcamento aprovado). Override por job.

**O que funciona MUITO bem:**
- O 1o Assistente de Direcao nao ve a margem do job — CORRETO
- O Editor so ve as abas de producao dele — CORRETO
- PE e Admin podem dar override por membro
- Backend faz masking real (nao so esconde no frontend, o dado nao vai na resposta)

---

### 16. Atendimento — NOTA: 6/10

**O que vi:** Pagina com 3 abas (Meus Jobs, Aprovacoes Pendentes, Comunicacoes). KPIs especificos do atendimento. Aprovacao interna como pagina separada.

**O que funciona:**
- KPIs de atendimento (jobs que acompanho, aprovacoes pendentes, entregas proximas)
- Tabela "Meus Jobs" filtrada automaticamente

**O que falta:**
- Aba Comunicacoes e placeholder ("Em breve")
- Nao tem historico de e-mails com cliente
- Nao integra com WhatsApp (apesar da EF whatsapp existir)

---

### 17. IA (ELLA Copilot) — NOTA: 6/10

**O que vi:** Botao flutuante em todas as paginas. Painel lateral de chat. EFs: ai-copilot, ai-budget-estimate, ai-freelancer-match, ai-dailies-analysis.

**O que funciona:**
- Botao sempre acessivel — nao preciso procurar
- Contexto do job passado pro chat

**O que falta pra ser util de verdade:**
- Nao testei a qualidade das respostas (depende de dados reais)
- Nao sugere acoes proativamente ("Voce tem 3 pagamentos vencidos")
- Analise de dailies parece interessante mas preciso ver funcionando

---

### 18. Relatorios — NOTA: 7/10

**O que vi:** 3 abas (Financeiro, Performance, Equipe). Filtros de periodo (preset + custom). Export CSV. Graficos e tabelas.

**O que funciona:**
- Export CSV — posso mandar pro contador
- Filtros de periodo com presets uteis (ultimo mes, 3 meses, ano)
- Agrupamento por diretor no relatorio de performance

**O que falta:**
- DRE (Demonstrativo de Resultado do Exercicio)
- Relatorio de custos por tipo de producao
- Comparativo entre jobs similares

---

## Resumo das Notas

| Modulo | Nota | Status |
|--------|------|--------|
| Dashboard | 8/10 | Funcional e completo |
| Jobs (listagem) | 8.5/10 | Muito bom, faltam filtros |
| Detalhe do Job | 9/10 | Impressionante, 19 abas reais |
| CRM / Pipeline | 8/10 | Bom, falta conversao para job |
| Financeiro | 9/10 | EXCEPCIONAL, melhor modulo |
| Equipe / Pessoas | 7.5/10 | Solido, falta calendario |
| Pre-Producao | 7/10 | Funcional, falta callsheet |
| Producao (Set) | 8/10 | Muito completo e especifico |
| Pos-Producao | 3/10 | Backend pronto, frontend ZERO |
| Drive | 5/10 | Basico, so link |
| Portal Cliente | 7/10 | Funcional, falta aprovacao |
| Dashboard CEO | 8/10 | Bom, falta meta anual |
| Contratos | 6/10 | Funciona, depende setup |
| NFs | 7/10 | Inteligente, falta workflow ativo |
| RBAC | 8.5/10 | Muito bem pensado |
| Atendimento | 6/10 | Basico, aba principal e placeholder |
| IA (ELLA) | 6/10 | Existe mas preciso ver valor |
| Relatorios | 7/10 | Funcional, falta DRE |

---

## NOTA GERAL: 7.5/10

Pra um sistema que claramente foi construido por quem ENTENDE producao audiovisual, 7.5 e uma nota alta. Nao estou comparando com Monday.com ou Trello — estou comparando com a NECESSIDADE REAL de uma produtora.

O 9/10 do Financeiro puxa a nota pra cima. O 3/10 da Pos-Producao puxa pra baixo. Se a pos-prod estivesse implementada no frontend, a nota geral subiria pra 8/10.

---

## Quanto Eu Pagaria

### Cenario atual (com o que esta implementado hoje):
**R$ 80-120 por usuario/mes** para o core team (PE, Coordenador, CEO, Financeiro, Atendimento)
**R$ 30-50 por usuario/mes** para equipe estendida (1o AD, Editor, Diretor de Arte)

Para uma produtora como a minha (8-12 usuarios ativos):
**R$ 800-1.500/mes fixo** seria justo.

### Cenario futuro (com pos-prod + callsheet + WhatsApp funcionando):
**R$ 150-200 por usuario/mes** ou **R$ 1.500-2.500/mes fixo** — facilmente.

### Referencia de valor:
- Um coordenador de producao gasta 2-3 horas/dia em planilhas. Se o sistema reduzir pra 30min, a economia e de ~R$ 2.500/mes so em produtividade.
- Um erro de pagamento a fornecedor (pagar duplicado, esquecer NF) pode custar R$ 5-20k por ocorrencia. O calendario de pagamentos com alertas paga o sistema em 1 mes.
- A conciliacao bancaria manual leva 1-2 dias por mes. Com OFX + auto-conciliacao, leva 30 minutos.

---

## TOP 10 SUGESTOES (o que me faria largar o Google Sheets)

### 1. [CRITICO] Implementar frontend de Pos-Producao
A pos-producao e onde a produtora mais sofre. Pipeline de cortes, versionamento, aprovacoes do diretor e do cliente, prazos de entrega parciais. O backend ja ta pronto (migration + EF). So falta o frontend. Sem isso, meu editor continua usando o Frame.io separado.

### 2. [CRITICO] Converter Oportunidade CRM em Job com 1 clique
O fluxo real e: Orcamento (CRM) > Aprovacao > Job. Hoje parece que preciso criar o job manualmente. Deveria ser: "Aprovado? Clique aqui pra virar Job" e ja traz cliente, agencia, valor, equipe sugerida.

### 3. [ALTO] Callsheet gerada automaticamente como PDF
A callsheet e o documento mais importante de pre-producao. Existe a EF (call-sheet), mas nao tem a tela que gera, mostra preview, e envia. Se gerar e enviar por WhatsApp com 2 cliques, vendo pra QUALQUER produtora.

### 4. [ALTO] WhatsApp nativo pra notificacoes
Existe a EF (whatsapp). Mas nenhuma tela usa. Se o sistema me mandasse no WhatsApp: "Job 036 - Pagamento de R$ 15.000 vence amanha" ou "Cliente Natura acessou o portal" — isso muda tudo. Esse e O diferencial que NINGUEM tem.

### 5. [ALTO] Calendario de disponibilidade de freelas
Na hora de escalar equipe, minha PE liga pra 15 pessoas perguntando "voce ta livre dia X?". Se os freelas pudessem marcar disponibilidade num portal (ou responder por WhatsApp), minha PE economiza 3 horas por job.

### 6. [MEDIO] Portal do freela (receber convite, preencher dados, ver contrato, receber pagamento)
A EF vendor-portal existe. O frontend nao. Se o freela recebesse um link, preenchesse dados bancarios, assinasse contrato e visse status de pagamento — tudo num lugar so — eu nunca mais mandaria "me manda seus dados por WhatsApp".

### 7. [MEDIO] DRE mensal automatico
Meu contador me pede o DRE todo mes. Eu exporto 3 planilhas e monto na mao. Se o sistema gerasse automaticamente (receitas - custos diretos = lucro bruto - custos fixos = lucro liquido), eu pararia de usar planilha no dia 1.

### 8. [MEDIO] Busca global (Ctrl+K)
Com 20 jobs ativos, 200 freelas, 50 fornecedores — preciso encontrar qualquer coisa em 2 segundos. Busca global que pesquisa jobs, pessoas, clientes, agencias, NFs — como o Spotlight do Mac.

### 9. [BAIXO] Aprovacao de orcamento pelo portal do cliente
Hoje mando o orcamento por e-mail e fico esperando resposta. Se o cliente pudesse abrir o portal, ver o orcamento, e clicar "Aprovado" (com registro de data/hora/IP) — isso resolve uma DOR enorme de comprovacao.

### 10. [BAIXO] App mobile nativo (ou PWA otimizado)
No set de filmagem, EU (o dono) preciso consultar: "qual o cache do diretor de foto?", "quantas diarias faltam?", "qual o status do pagamento do equipamento?". Funciona no celular hoje (responsive), mas um PWA com offline-first seria muito melhor.

---

## Killer Features (o que NENHUM concorrente oferece junto)

1. **Financeiro com profundidade de ERP + linguagem de produtora.** O Yamdu nao tem isso. O Monday nao tem isso. O Frame.io nao tem isso. NINGUEM tem fluxo de caixa projetado + calendario de pagamentos + conciliacao bancaria + custos por job + margem calculada automaticamente + impostos BR — tudo num sistema feito pra audiovisual.

2. **19 abas especificas do audiovisual num unico job.** Storyboard, Elenco, Ordem do Dia, Relatorio de Set, Claquete, Figurino, Horas Extras — isso e conhecimento de quem trabalha em set. Nenhum Trello, Notion ou Monday replica isso sem semanas de customizacao.

3. **RBAC que entende as hierarquias de uma produtora.** O 1o AD ve coisas diferentes do Editor que ve coisas diferentes do PE. O masking financeiro no backend (nao so no frontend) e seguranca real. Nenhum concorrente no mercado audiovisual brasileiro tem isso.

4. **Contratos DocuSeal em lote pra equipe inteira.** Gerar 30 contratos de freela de uma vez, com valores corretos, clausulas padrao, e assinatura digital. Isso economiza 2 DIAS de trabalho por job.

5. **CRM com pipeline visual acoplado ao fluxo de jobs.** Nao e CRM generico — e o funil de ORCAMENTOS de uma produtora. Com follow-up, metricas de conversao, e (futuramente) conversao direta em job.

---

## Deal Breakers (o que me faria NAO comprar)

1. **Se a Pos-Producao continuar sem frontend por mais de 2 meses.** Pos-prod e 40-60% do meu trabalho. Nao posso ter um sistema que cobre 60% do ciclo e deixa o resto pro Frame.io/planilha. A migration ta pronta — e questao de prioridade.

2. **Se nao tiver integracao com WhatsApp funcionando.** A EF existe. O numero ta configurado. Mas se nao mandar notificacao de verdade (nao e-mail — WHATSAPP), perde o diferencial mais forte que o sistema poderia ter. Toda produtora brasileira vive no WhatsApp.

3. **Se o sistema ficar lento com volume real.** Estou avaliando codigo, nao performance. Uma produtora com 5 anos de historico tem 100+ jobs, 1000+ freelas, 10.000+ lancamentos financeiros. Se travar, minha PE volta pro Google Sheets no mesmo dia.

4. **Se nao tiver suporte humano decente.** Qualquer sistema novo da problema no comeco. Se eu mandar mensagem e demorar 48h pra responder, cancelo. Preciso de alguem que entenda de producao, nao so de TI.

5. **Se a migracoa de dados for traumatica.** Tenho 3 anos de planilhas no Drive. Se o processo de importar meus dados existentes pro ELLAHOS for manual e doloroso (digitar 500 freelas um por um), nao vou migrar. Preciso de import CSV, no minimo.

---

## Observacoes Finais

Vou ser direto: esse e o sistema MAIS completo que ja vi para produtoras audiovisuais no Brasil. E nao e pouca coisa — ja avaliei Yamdu, StudioBinder, Showbiz, e dezenas de planilhas "milagrosas".

O financeiro, sozinho, ja justifica a assinatura. O nivel de detalhe das abas de producao mostra que quem construiu isso TRABALHA em produtora. O RBAC mostra maturidade tecnica.

Os gaps sao claros e honestos: pos-producao precisa de frontend urgente, WhatsApp precisa sair do papel, callsheet precisa virar PDF. Mas sao gaps de PRIORIDADE, nao de capacidade. A arquitetura esta la. O banco esta la. As EFs estao la.

Se voces entregarem pos-producao + WhatsApp + callsheet nos proximos 60 dias, eu assino contrato anual.

---

**Avaliacao realizada em:** 09/03/2026
**Base:** Codigo-fonte do repositorio (branch main, commit fba0572)
**Metodo:** Leitura de codigo real (frontend, backend, migrations, componentes)
