# Fase 7: Dashboard + Relatorios + Portal do Cliente -- Spec Completa

**Data:** 20/02/2026
**Status:** RASCUNHO -- aguardando validacao
**Autor:** Product Manager -- ELLAHOS
**Fase anterior:** Fase 6 (Gestao de Equipe + Aprovacoes) -- CONCLUIDA E AUDITADA

---

## 1. Resumo Executivo

A Fase 7 entrega tres modulos que fecham o ciclo de valor do ELLAHOS para os perfis estrategicos da produtora e para o cliente externo.

**Problema 1 -- Visao gerencial dispersa:** CEO e PE precisam abrir multiplas telas para entender a saude do negocio. Nao ha um unico lugar que mostre: jobs em risco, margem geral, aprovacoes pendentes e equipe sobrecarregada ao mesmo tempo.

**Problema 2 -- Relatorios manuais:** Financeiro exporta dados para Excel, cruza planilhas manualmente e demora horas para gerar relatorios de performance e faturamento. Nao ha historico comparativo.

**Problema 3 -- Cliente sem visibilidade:** O cliente so recebe atualizacoes quando a equipe lembra de mandar mensagem. Nao ha um canal formal e organizado para acompanhamento de job, documentos e aprovacoes pendentes.

**Entregaveis da Fase 7:**
- Dashboard Home (/): painel gerencial com KPIs, alertas urgentes, pipeline visual e graficos
- Relatorios (/reports): performance por dimensao, financeiro mensal, utilizacao de equipe, com filtros e export
- Portal do Cliente (/portal/[token]): acesso externo mobile-first com timeline, documentos, aprovacoes e mensagens
- Portal Settings (/settings/portal): configuracao de tokens, permissoes e personalizacao

---

## 2. Contexto e Estado Atual

### O que ja existe (nao alterar)

**Banco de dados (27 tabelas):**
- `jobs` (~77 colunas) -- incluindo health_score, margin_percentage, status, project_type, closed_value, created_at
- `job_history` -- audit trail completo de mudancas (event_type, data_before, data_after)
- `job_team` -- equipe alocada por job (com allocation_start/end da Fase 6)
- `allocations` -- periodos formais de alocacao (Fase 6)
- `financial_records` -- receitas, despesas, provisoes por job
- `approval_requests` -- aprovacoes de conteudo com token publico (Fase 6)
- `notifications` -- registro de todas as notificacoes enviadas
- `drive_folders` -- pastas Drive por job
- `clients`, `agencies`, `people` -- cadastros base

**Edge Functions deployadas (13 ativas):**
- `jobs`, `jobs-status`, `jobs-team`, `jobs-deliverables`, `jobs-shooting-dates`, `jobs-history`
- `notifications`, `tenant-settings`, `integration-processor`
- `drive-integration`, `whatsapp`
- `allocations`, `approvals`

**Frontend existente (rotas ativas):**
- /(dashboard)/jobs -- lista e kanban
- /(dashboard)/jobs/[id] -- detalhe com 7 abas
- /(dashboard)/financial -- visao geral financeira
- /(dashboard)/approvals -- aprovacoes pendentes
- /(dashboard)/team/calendar -- calendario Gantt
- /approve/[token] -- pagina publica de aprovacao (Fase 6)
- /settings/integrations, /settings/notifications

**Sidebar atual:**
- Jobs, Clientes, Agencias, Equipe, Financeiro, Calendario, Aprovacoes, Arquivos (disabled), Configuracoes

### O que a Fase 7 cria

| Item | Descricao |
|------|----------|
| 2 tabelas novas | `client_portal_tokens`, `client_portal_messages` |
| 2 Edge Functions novas | `reports`, `client-portal` |
| 4 telas novas | /, /reports, /portal/[token], /settings/portal |
| 1 pagina publica | /portal/[token] sem autenticacao (similar a /approve/[token] da Fase 6) |
| Sidebar: 2 novos itens | Dashboard (rota raiz), Relatorios |
| Settings: 1 nova aba | Portal do Cliente |
| 29 tabelas total | 27 existentes + 2 novas |

---

## 3. Personas

**CEO/Socio:** Quer ver a saude geral do negocio em 5 segundos ao abrir o sistema. Toma decisoes estrategicas (aceitar job de margem baixa? diretor esta sobrecarregado?). Usa desktop, abre de manha antes das reunioes.

**Produtor Executivo (PE):** Quer ver SEUS jobs, alertas de prazo e margem, e aprovacoes pendentes. Precisa de relatorios de performance por diretor e por tipo de projeto para justificar decisoes. Usa desktop e celular.

**Financeiro:** Quer relatorios de faturamento mensal, projecao de receita e margem por periodo. Exporta para Excel para reuniao de socio. Precisa de comparativo com periodo anterior.

**Coordenador de Producao:** Quer ver alocacao de equipe e prazos iminentes. Usa o dashboard para identificar gargalos antes que virem problema.

**Cliente externo:** Quer acompanhar o andamento do job sem precisar ligar para a producao. Acessa pelo celular via link enviado por WhatsApp. Precisa ver o que ja foi feito, o que esta pendente de aprovacao e enviar mensagem para a equipe.


---

## 4. Sub-fases

| Sub-fase | Descricao | Dependencias |
|----------|----------|-------------|
| 7.1 | Infrastructure Foundation (migrations + Recharts) | Fase 6 concluida |
| 7.2 | Edge Function: reports (todos os handlers) | 7.1 |
| 7.3 | Dashboard Home (/) | 7.2 |
| 7.4 | Relatorios (/reports) | 7.2 |
| 7.5 | Edge Function: client-portal (auth + publico) | 7.1 |
| 7.6 | Portal do Cliente -- Frontend (/portal/[token]) | 7.5 |
| 7.7 | Portal Settings (/settings/portal) | 7.5 |
| 7.8 | Polish + End-to-End (notificacoes, pg_cron, testes) | 7.3, 7.4, 7.6, 7.7 |

---

## 5. User Stories

### 5.1 Dashboard Home (US-701 a US-710)

**US-701 -- Visao geral de KPIs**
Como CEO, quero ver os principais indicadores do negocio em cards no topo da pagina inicial, para entender a saude geral sem navegar por outras telas.

Criterios de aceite:
- CA-701.1: Rota / exibe dashboard (hoje redireciona para /jobs)
- CA-701.2: Card Jobs Ativos: contagem de jobs com status diferente de cancelado, pausado e finalizado
- CA-701.3: Card Faturamento do Mes: soma de closed_value dos jobs com approval_date no mes corrente
- CA-701.4: Card Margem Media: media ponderada de margin_percentage dos jobs ativos com closed_value maior que zero
- CA-701.5: Card Health Score Medio: media simples de health_score de todos os jobs ativos
- CA-701.6: Cada card mostra variacao percentual vs mes anterior (ex: +12%)
- CA-701.7: Cards clicaveis levam para pagina correspondente
- CA-701.8: Dados carregam em menos de 1 segundo (query agregada unica no backend)


---

## 5. User Stories

### 5.1 Dashboard Home (US-701 a US-710)

**US-701 -- Visao geral de KPIs**
Como CEO, quero ver os principais indicadores do negocio em cards no topo da pagina inicial, para entender a saude geral sem navegar por outras telas.

Criterios de aceite:
- CA-701.1: Rota / exibe dashboard
- CA-701.2: Card Jobs Ativos: contagem de jobs com status diferente de cancelado, pausado e finalizado
- CA-701.3: Card Faturamento do Mes: soma de closed_value dos jobs com approval_date no mes corrente
- CA-701.4: Card Margem Media: media ponderada de margin_percentage dos jobs ativos com closed_value > 0
- CA-701.5: Card Health Score Medio: media simples de health_score de todos os jobs ativos
- CA-701.6: Cada card mostra variacao percentual vs mes anterior
- CA-701.7: Cards clicaveis levam para pagina correspondente (/jobs ou /financial)
- CA-701.8: Dados carregam em menos de 1 segundo (query agregada unica no backend)

**US-702 -- Alertas urgentes**
Como PE, quero ver um painel de alertas urgentes no dashboard, para agir proativamente.

Criterios de aceite:
- CA-702.1: Secao Alertas exibe itens ordenados por severidade (critico > atencao)
- CA-702.2: Alerta critico (vermelho): jobs com margin_percentage abaixo de 15% e status ativo
- CA-702.3: Alerta critico (vermelho): jobs com expected_delivery_date igual ou anterior a hoje e status diferente de entregue/finalizado/cancelado
- CA-702.4: Alerta atencao (amarelo): approval_requests com status pending criadas ha mais de 7 dias
- CA-702.5: Alerta atencao (amarelo): jobs com health_score abaixo de 50 e status em producao ou pos-producao
- CA-702.6: Alerta atencao (amarelo): diarias de filmagem nos proximos 3 dias em jobs sem nenhum membro em job_team
- CA-702.7: Cada alerta tem link direto para o job ou pagina relacionada
- CA-702.8: Se nao ha alertas, exibe empty state positivo
- CA-702.9: Alertas calculados em tempo real no backend (stale time max 2 minutos)

**US-703 -- Pipeline visual**
Como PE, quero ver um resumo visual do pipeline de jobs por status, para entender rapidamente em que fase esta cada projeto.

Criterios de aceite:
- CA-703.1: Secao Pipeline exibe colunas por macro-fase: Comercial, Pre-Producao, Producao, Pos-Producao, Encerrado
- CA-703.2: Cada coluna mostra contagem e lista titulos (max 3 por coluna, com +N mais se exceder)
- CA-703.3: Agrupamento: Comercial (briefing_recebido ate aguardando_aprovacao_cliente), Pre-Producao (aprovado_selecao_diretor ate pre_producao_andamento), Producao (producao_filmagem), Pos-Producao (pos_producao, aguardando_aprovacao_final), Encerrado (entregue, finalizado, cancelado, pausado)
- CA-703.4: Click em coluna leva para /jobs filtrado pelo status daquela macro-fase
- CA-703.5: Click em job individual leva para /jobs/[id]

**US-704 -- Atividade recente**
Como Coordenador, quero ver atividade recente no dashboard, para saber o que esta acontecendo.

Criterios de aceite:
- CA-704.1: Secao Atividade Recente lista ultimas 5 entradas de job_history de qualquer job do tenant
- CA-704.2: Cada entrada: icone de tipo, descricao legivel, nome do job, tempo relativo
- CA-704.3: Tipos exibidos: status_change, team_change, field_update, comment
- CA-704.4: Click na linha leva para /jobs/[id]
- CA-704.5: Secao Jobs Recentes lista os 5 jobs com updated_at mais recente
- CA-704.6: Cada job mostra: codigo, titulo, status badge, indicador de health_score colorido
**US-705 -- Grafico de jobs por status**
Como CEO, quero ver grafico de distribuicao de jobs por status, para ter representacao visual da operacao.

Criterios de aceite:
- CA-705.1: Grafico de barras horizontal ou donut com contagem de jobs por status (apenas jobs ativos)
- CA-705.2: Status com zero jobs nao aparecem no grafico
- CA-705.3: Cores seguem design system (mesmas cores dos StatusBadge existentes)
- CA-705.4: Tooltip ao hover mostra nome do status e contagem
- CA-705.5: Grafico responsivo (ResponsiveContainer do Recharts)
- CA-705.6: Biblioteca de graficos: Recharts (nova dependencia desta fase)

**US-706 -- Grafico de faturamento mensal**
Como Financeiro, quero ver grafico de faturamento dos ultimos 6 meses, para identificar tendencias de receita.

Criterios de aceite:
- CA-706.1: Grafico de barras verticais com faturamento (closed_value) por mes dos ultimos 6 meses
- CA-706.2: Eixo Y em R$ com abreviacao (ex: R$ 85k, R$ 1,2M)
- CA-706.3: Tooltip com valor exato e numero de jobs no mes
- CA-706.4: Linha de media dos 6 meses sobreposta ao grafico (linha pontilhada)
- CA-706.5: Dados baseados em approval_date dos jobs (quando o job foi fechado)
- CA-706.6: Visivel apenas para roles: admin, ceo, financeiro

**US-707 -- Equipe mais alocada**
Como PE, quero ver quais pessoas estao mais sobrecarregadas, para balancear alocacoes.

Criterios de aceite:
- CA-707.1: Secao Equipe lista top 5 pessoas com mais jobs ativos (via job_team)
- CA-707.2: Para cada pessoa: iniciais/avatar, nome, role mais frequente, contagem de jobs ativos
- CA-707.3: Pessoas com conflito de alocacao (tabela allocations) marcadas com badge de alerta
- CA-707.4: Click em pessoa leva para /people/[id]

**US-708 -- Dashboard filtrado por papel**
Como sistema, quero adaptar o conteudo do dashboard para o papel do usuario logado.

Criterios de aceite:
- CA-708.1: Roles admin e ceo: dashboard completo
- CA-708.2: Roles produtor e coordenador: alertas e atividade filtrados para jobs em que sao membros (job_team)
- CA-708.3: Role financeiro: KPIs + grafico faturamento + alertas de margem
- CA-708.4: Filtro implementado no backend (Edge Function reports aplica WHERE baseado em role do JWT)

**US-709 -- Atualizacao automatica do dashboard**
Como PE, quero que o dashboard atualize automaticamente, para ter dados atuais durante o dia.

Criterios de aceite:
- CA-709.1: KPIs e alertas tem stale time de 2 minutos (TanStack Query refetchInterval)
- CA-709.2: Botao de refresh manual no header da pagina
- CA-709.3: Timestamp de ultima atualizacao exibido abaixo dos KPIs

**US-710 -- Dashboard responsivo**
Como PE usando celular, quero que o dashboard funcione bem no celular, para consultar alertas de qualquer lugar.

Criterios de aceite:
- CA-710.1: KPI cards em grid 2x2 no mobile (nao 4 colunas em linha)
- CA-710.2: Alertas sao o primeiro conteudo visivel no mobile
- CA-710.3: Pipeline visual colapsa para lista vertical no mobile
- CA-710.4: Graficos responsivos com ResponsiveContainer
- CA-710.5: Sem scroll horizontal em viewport 375px

### 5.2 Relatorios (US-720 a US-732)

**US-720 -- Pagina central de relatorios**
Como PE, quero uma pagina centralizada com todos os relatorios.

Criterios de aceite:
- CA-720.1: Rota /reports acessivel pelo menu lateral (novo item Relatorios)
- CA-720.2: Pagina exibe tabs: Performance | Financeiro | Equipe
- CA-720.3: Filtros globais de periodo com presets
- CA-720.4: Filtros persistem no URL via searchParams
