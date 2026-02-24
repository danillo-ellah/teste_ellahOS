# Dashboard - Spec de Produto

**Arquivo:** docs/specs/dashboard-page.md  
**Data:** 24/02/2026  
**Status:** VIGENTE - implementacao concluida na Fase 7.5  
**Autor:** Product Manager - ELLAHOS  
**Fase de origem:** Fase 7, Sub-fase 7.5 - Frontend Dashboard

---

## 1. Objetivo

Prover ao CEO, Produtor Executivo e Coordenador de Producao uma visao executiva do estado da operacao em tempo real, acessivel na pagina inicial do sistema (rota /). O dashboard concentra KPIs, alertas, pipeline, atividade recente e graficos financeiros em uma unica tela, eliminando a necessidade de navegar por multiplos modulos para entender a saude do negocio.

**Rota:** `/` (rota raiz do dashboard autenticado, mapeada em `frontend/src/app/(dashboard)/page.tsx`)
**Backend:** Edge Function `dashboard` (ACTIVE) com 5 endpoints

---

## 2. Personas

| Persona | Necessidade principal | Frequencia de uso |
|---|---|---|
| CEO / Socio | Saude financeira e operacional do negocio | Diario, manha |
| Produtor Executivo | Alertas urgentes e pipeline dos seus jobs | Multiplas vezes ao dia |
| Coordenador de Producao | Atividade recente e gargalos da equipe | Multiplas vezes ao dia |
| Financeiro | Faturamento mensal e margem media | Semanal |

---

## 3. Wireframe da Pagina

Layout em grade no desktop, coluna unica no mobile.

```
+-------------------------------------------------------------------+
| ELLAHOS                          [username]  [notificacoes]       |
+-------------------------------------------------------------------+
| [sidebar]  Bom dia, Ana                         [Atualizar]      |
|            Aqui esta um resumo do seu dia                         |
|                                                                   |
|  +--------+ +--------+ +--------+ +--------+ +----------+        |
|  | Jobs   | |Fatura. | |Margem  | |Health  | |Aprovacoes|        |
|  | Ativos | |do Mes  | |Media   | |Score   | |Pendentes |        |
|  |   12   | |R$ 85k  | | 28.3%  | |71/100  | |    4     |        |
|  +--------+ +--------+ +--------+ +--------+ +----------+        |
|                                                                   |
|  Pipeline de Jobs (barras proporcionais por status)               |
|  [Brief:2] [Pre-Prod:3] [Filmagem:2] [Pos:1] [Entregue:4]        |
|                                                                   |
|  +---------------------------+  +--------------------------+     |
|  | Alertas     (lg:col-3)    |  | Atividade Recente (lg:2) |     |
|  | [critico] Margem baixa    |  | Hoje                     |     |
|  | [alto] Entregavel atr.    |  | > Status alterado        |     |
|  | [medio] Aprovacao expir.  |  | > Job criado             |     |
|  | + 2 outros alertas        |  | Ontem                    |     |
|  +---------------------------+  | > Aprovacao enviada      |     |
|                                 +--------------------------+     |
|  +-------------------------+  +---------------------------+      |
|  | Jobs por Status (donut) |  | Faturamento Mensal        |      |
|  | [grafico + legenda]     |  | [barras: rec vs custo]    |      |
|  +-------------------------+  +---------------------------+      |
+-------------------------------------------------------------------+
```

Mobile (375px): KPI cards em grid 2x2. Demais secoes em coluna unica. Sem scroll horizontal indesejado.

---

## 4. User Stories

### US-D01 - Saudacao personalizada

Como qualquer usuario, quero ser recebido pelo primeiro nome com saudacao adaptada ao horario, para ter uma experiencia personalizada ao abrir o sistema.

Criterios de aceite:
- CA-D01.1: Saudacao baseada na hora: Bom dia (00h-11h59), Boa tarde (12h-17h59), Boa noite (18h-23h59)
- CA-D01.2: Primeiro nome extraido de user_metadata.full_name, user_metadata.name ou prefixo do email
- CA-D01.3: Subtitulo fixo: Aqui esta um resumo do seu dia
- CA-D01.4: Enquanto o nome carrega, saudacao aparece sem nome (sem espaco em branco visivel)

### US-D02 - Cards de KPIs no topo

Como CEO, quero ver os 5 principais indicadores do negocio em cards clicaveis no topo, para entender a saude geral em menos de 5 segundos.

Criterios de aceite:
- CA-D02.1: 5 cards: Jobs Ativos, Faturamento do Mes, Margem Media, Health Score Medio, Aprovacoes Pendentes
- CA-D02.2: Card Jobs Ativos: valor active_jobs. Icone Clapperboard (rose). Link /jobs
- CA-D02.3: Card Faturamento do Mes: valor revenue_month em formato abreviado (R$ Xk ou R$ X.XM). Icone DollarSign (amber). Link /financial
- CA-D02.4: Card Margem Media: valor avg_margin em %. Trend badge verde >= 30%, vermelho < 20%. Texto de comparacao com meta abaixo do valor. Icone Percent (emerald). Link /financial
- CA-D02.5: Card Health Score: valor avg_health_score no formato XX/100. Barra de progresso: verde >= 71, amber 41-70, vermelho <= 40. Icone Activity (blue). Link /jobs
- CA-D02.6: Card Aprovacoes Pendentes: valor pending_approvals. Borda e fundo rose quando > 0. Ponto vermelho pulsante no icone quando > 0. col-span-2 no mobile. Link /approvals?status=pending
- CA-D02.7: Cada card clicavel com hover: -translate-y-0.5 e shadow-md. Focus-visible ring rose
- CA-D02.8: Grid responsivo: grid-cols-2 mobile / md:grid-cols-3 / lg:grid-cols-5
- CA-D02.9: Estado loading: 5 skeletons com altura minima 120px
- CA-D02.10: Dados via useDashboardKpis() com staleTime=30s e refetchInterval=30s

### US-D03 - Pipeline visual de jobs por status

Como Produtor Executivo, quero ver a distribuicao dos jobs por status em representacao visual compacta, para entender o fluxo da operacao rapidamente.

Criterios de aceite:
- CA-D03.1: Secao Pipeline de Jobs com barras verticais proporcionais, uma por status com count > 0
- CA-D03.2: Altura proporcional a contagem (minimo 8px, maximo 48px)
- CA-D03.3: Cor de cada barra segue paleta das StatusBadges: violet=briefing, amber=orcamento, green=aprovado, blue=pre-producao, cyan=filmagem, purple=pos-producao, emerald=entregue, gray=finalizado/pausado, red=cancelado
- CA-D03.4: Abaixo das barras: contagem numerica e label abreviada do status
- CA-D03.5: Cada barra e um Link para /jobs?status={status}
- CA-D03.6: Link Ver todos no header aponta para /jobs
- CA-D03.7: Status com count = 0 nao aparecem
- CA-D03.8: Empty state: Nenhum job no pipeline
- CA-D03.9: Scroll horizontal no mobile (overflow-x-auto)
- CA-D03.10: Tooltip nativo via atributo title: X jobs em STATUS - R$ VALOR
- CA-D03.11: Dados via useDashboardPipeline() com staleTime=60s e refetchInterval=60s

### US-D04 - Painel de alertas urgentes

Como Produtor Executivo, quero ver alertas prioritarios em destaque, para agir antes que problemas se agravem.

Criterios de aceite:
- CA-D04.1: Secao Alertas exibe ate 5 itens. Excedente indicado como + N outros alertas
- CA-D04.2: 4 tipos suportados: margin_alert (TrendingDown, vermelho), overdue_deliverable (Clock, vermelho), low_health_score (HeartPulse, laranja), approval_expiring (FileCheck, violeta)
- CA-D04.3: Cada alerta exibe: icone colorido por tipo, codigo do job em fonte mono 11px, titulo descritivo, descricao contextual, badge de severidade, link Ver job para /jobs/{entity_id}
- CA-D04.4: Severity derivada no frontend por tipo: margin_alert=critico, overdue_deliverable=alto, low_health_score=alto, approval_expiring=medio
- CA-D04.5: Cores dos badges: critico=bg-red-100 text-red-700 (dark: bg-red-500/20 text-red-400), alto=bg-orange-100 text-orange-700, medio=bg-amber-100 text-amber-700
- CA-D04.6: Titulos gerados no frontend combinando alert_type com entity_code e entity_title da RPC
- CA-D04.7: Empty state positivo: icone CheckCircle2 verde, texto Tudo em ordem por aqui
- CA-D04.8: Badge contador rose no header exibe total de alertas quando > 0
- CA-D04.9: Dados via useDashboardAlerts(20) com staleTime=60s e refetchInterval=60s
- CA-D04.10: Ocupa lg:col-span-3 no grid de 5 colunas ao lado da atividade recente

### US-D05 - Feed de atividade recente

Como Coordenador de Producao, quero ver as ultimas acoes realizadas nos jobs, para acompanhar o que esta acontecendo sem abrir cada job individualmente.

Criterios de aceite:
- CA-D05.1: Secao Atividade Recente lista ate 10 eventos das ultimas 48h. Excedente indicado como + N eventos anteriores
- CA-D05.2: Eventos agrupados por data: Hoje, Ontem ou data por extenso em pt-BR
- CA-D05.3: Layout de timeline com linha vertical cinza a esquerda
- CA-D05.4: Avatar circular: iniciais do usuario quando ha user_name, icone do tipo com fundo colorido quando sem usuario
- CA-D05.5: 7 tipos com icone e cor proprios: status_change (ArrowRight, violet), job_created (Plus, rose), approval_sent (Send, violet), approval_received (CheckCircle2, green), budget_approved (DollarSign, amber), file_uploaded (FileUp, blue), comment (MessageSquare, zinc)
- CA-D05.6: Cada evento exibe: avatar, hora HH:mm, descricao, link do job com codigo e titulo, tempo relativo em pt-BR, nome do usuario
- CA-D05.7: Link do job aponta para /jobs/{job_id}
- CA-D05.8: Area com scroll interno maximo de 420px (max-h-[420px] overflow-y-auto)
- CA-D05.9: Empty state: icone Clock, Nenhuma atividade recente
- CA-D05.10: Dados via useDashboardActivity(48, 30) com staleTime=30s e refetchInterval=30s
- CA-D05.11: Ocupa lg:col-span-2 no grid de 5 colunas ao lado dos alertas

### US-D06 - Grafico donut de distribuicao por status

Como CEO, quero ver a distribuicao percentual de jobs por status em grafico visual, para ter representacao proporcional da operacao atual.

Criterios de aceite:
- CA-D06.1: PieChart do Recharts com innerRadius=52, outerRadius=72, paddingAngle=2
- CA-D06.2: Cada fatia usa a cor do status (mesma paleta do PipelineChart)
- CA-D06.3: Total de jobs exibido no centro do donut (numero em destaque + label total)
- CA-D06.4: Legenda lateral com: ponto colorido, nome do status, contagem, percentual
- CA-D06.5: Tooltip ao hover: nome do status, contagem e percentual com 1 casa decimal
- CA-D06.6: Apenas status com count > 0 aparecem
- CA-D06.7: Empty state: Nenhum job no periodo
- CA-D06.8: Layout responsivo: flex-col no mobile, sm:flex-row a partir de sm
- CA-D06.9: Reusa dados de useDashboardPipeline() sem nova requisicao ao backend


### US-D07 - Grafico de barras de faturamento mensal

Como Financeiro, quero ver faturamento e custo por mes em grafico de barras, para identificar tendencias e o melhor periodo da operacao.

Criterios de aceite:
- CA-D07.1: BarChart do Recharts com duas series: Receita (amber #F59E0B) e Custo (zinc #71717A, opacity 0.5)
- CA-D07.2: Eixo X: meses abreviados em pt-BR (Jan, Fev, Mar, Abr, Mai, Jun, Jul, Ago, Set, Out, Nov, Dez)
- CA-D07.3: Eixo Y: valores em formato curto (R$ Xk, R$ X.XM). Largura do eixo: 56px
- CA-D07.4: Grid horizontal pontilhado (strokeDasharray 3 3), sem linhas verticais
- CA-D07.5: Tooltip customizado: mes, receita completa em R$, custo completo em R$, numero de jobs
- CA-D07.6: Seletor de periodo no header: 3 meses, 6 meses, 12 meses. Periodo ativo com bg-secondary
- CA-D07.7: Rodape com border-t e 3 metricas: Total do periodo, Media mensal, Melhor mes
- CA-D07.8: ResponsiveContainer com height=200
- CA-D07.9: Empty state: Nenhum dado financeiro no periodo
- CA-D07.10: Dados via useDashboardRevenue(12) com staleTime=300s e refetchInterval=300s

### US-D08 - Atualizacao automatica e refresh manual

Como Produtor Executivo, quero dados sempre atuais sem recarregar a pagina, e ter botao de refresh manual para forcar atualizacao imediata.

Criterios de aceite:
- CA-D08.1: KPIs e atividade: refetchInterval=30s
- CA-D08.2: Pipeline e alertas: refetchInterval=60s
- CA-D08.3: Faturamento: refetchInterval=300s (5 minutos)
- CA-D08.4: Botao Atualizar no header da pagina com icone RefreshCw
- CA-D08.5: Clicar em Atualizar dispara refetch() de todos os 5 hooks simultaneamente


### US-D09 - Tratamento de erros por secao

Como qualquer usuario, quero ser informado quando alguma secao nao carregou, para saber que dados podem estar desatualizados.

Criterios de aceite:
- CA-D09.1: Quando qualquer hook retorna erro, um banner vermelho aparece no topo da pagina
- CA-D09.2: Banner exibe: icone AlertTriangle, mensagem de erro e botao Tentar novamente
- CA-D09.3: Botao Tentar novamente dispara refetch de todos os hooks simultaneamente
- CA-D09.4: Cada secao em loading exibe skeleton proprio (sem spinner global de pagina)
- CA-D09.5: Secoes carregam independentemente (falha em alerts nao bloqueia KPIs)


### US-D10 - Layout responsivo mobile-first

Como Produtor Executivo usando celular, quero o dashboard utilizavel em telas de 375px, para consultar alertas e KPIs de qualquer lugar.

Criterios de aceite:
- CA-D10.1: KPI cards em grid-cols-2 no mobile. Card de Aprovacoes ocupa col-span-2 na terceira linha
- CA-D10.2: A partir de md (768px): KPI cards em md:grid-cols-3
- CA-D10.3: A partir de lg (1024px): KPI cards em lg:grid-cols-5
- CA-D10.4: Grid Alertas e Atividade: coluna unica no mobile, 5 colunas (3+2) a partir de lg
- CA-D10.5: Grid Graficos: coluna unica no mobile, 2 colunas iguais a partir de md
- CA-D10.6: Pipeline com scroll horizontal (overflow-x-auto) no mobile
- CA-D10.7: Donut em coluna no mobile (flex-col), lado a lado a partir de sm (sm:flex-row)
- CA-D10.8: Sem scroll horizontal indesejado em viewport 375px


### US-D11 - Dark mode nativo

Como qualquer usuario em ambiente de pouca luz, quero dark mode completo no dashboard, incluindo graficos e badges.

Criterios de aceite:
- CA-D11.1: Todos os componentes usam tokens do design system (bg-card, text-foreground, text-muted-foreground, border-border)
- CA-D11.2: Badges de alerta com variantes dark explicitas (dark:bg-{color}-500/20 e dark:text-{color}-400)
- CA-D11.3: Graficos Recharts com cores hexadecimais fixas que funcionam em ambos os modos
- CA-D11.4: Axes e grids dos graficos com fill=currentColor e strokeOpacity para adaptar ao tema
- CA-D11.5: Tooltips dos graficos usando bg-popover e border-border (tokens do design system)
- CA-D11.6: Card de Aprovacoes urgente: bg-rose-50 no light, dark:bg-rose-500/5 no dark

---

## 5. Contratos com o Backend

### 5.1 Endpoints consumidos

| Endpoint | Hook | Dados retornados |
|---|---|---|
| GET /dashboard/kpis | useDashboardKpis() | Objeto DashboardKpis |
| GET /dashboard/pipeline | useDashboardPipeline() | Array PipelineItem[] |
| GET /dashboard/alerts?limit=20 | useDashboardAlerts(20) | Array DashboardAlert[] |
| GET /dashboard/activity?hours=48&limit=30 | useDashboardActivity(48, 30) | Array ActivityEvent[] |
| GET /dashboard/revenue?months=12 | useDashboardRevenue(12) | Array RevenueMonth[] |

### 5.2 Tipos TypeScript

Definidos em frontend/src/hooks/use-dashboard.ts:

- DashboardKpis: active_jobs, total_jobs_month, total_revenue, revenue_month, avg_margin, avg_health_score, pending_approvals, overdue_deliverables, team_allocated
- PipelineItem: status (string), count (number), total_value (number)
- AlertType: margin_alert, overdue_deliverable, low_health_score, approval_expiring
- AlertSeverity: critical, high, medium, low
- DashboardAlert: alert_type, entity_id, entity_title, entity_code, alert_date, metadata
- ActivityEvent: id, event_type, description, created_at, user_id, user_name, job_id, job_code, job_title
- RevenueMonth: month (YYYY-MM), job_count, revenue, cost, profit

### 5.3 Campos da KPI disponiveis mas nao exibidos atualmente

| Campo | Uso potencial |
|---|---|
| total_revenue | Total acumulado historico |
| total_jobs_month | Metrica secundaria no card Jobs Ativos |
| overdue_deliverables | Sub-metrica no Health Score |
| team_allocated | Widget de equipe (planejado para Fase 9) |

---

## 6. Arquitetura de Componentes

Todos os componentes sao Client Components. A pagina nao e Server Component pois depende de autenticacao e hooks de cliente.

Arquivos envolvidos:

- frontend/src/app/(dashboard)/page.tsx: Instancia 5 hooks, saudacao personalizada, botao de refresh, banner de erro e layout
- frontend/src/hooks/use-dashboard.ts: 5 hooks TanStack Query com staleTime e refetchInterval individuais
- frontend/src/components/dashboard/kpi-cards.tsx: Grid de 5 KPI cards com trend badge e barra de progresso
- frontend/src/components/dashboard/pipeline-chart.tsx: Barras verticais proporcionais por status, clicaveis
- frontend/src/components/dashboard/alerts-panel.tsx: Lista com icone por tipo e severity badge derivado no frontend
- frontend/src/components/dashboard/activity-timeline.tsx: Feed agrupado por data com scroll interno e avatares
- frontend/src/components/dashboard/status-donut.tsx: PieChart Recharts com legenda lateral e total no centro
- frontend/src/components/dashboard/revenue-chart.tsx: BarChart Recharts com seletor de periodo e rodape de resumo

---

## 7. Fora de Escopo (Esta Versao)

- Filtro de dashboard por papel do usuario (RBAC granular planejado para Fase 9)
- Variacao percentual vs mes anterior nos cards de KPI
- Widget de equipe mais alocada (top 5 pessoas - US-707 da Fase 7, nao implementada)
- Alerta de diaria de filmagem sem membros alocados (tipo nao incluido na RPC get_alerts)
- Timestamp de ultima atualizacao na interface
- Notificacoes em tempo real via Realtime Supabase (usa polling via refetchInterval)
- Export ou impressao do dashboard

---

## 8. Dependencias

| Dependencia | Adicionada quando | Funcao no dashboard |
|---|---|---|
| recharts | Fase 7 (nova) | StatusDonut, RevenueChart |
| date-fns + locale ptBR | Anterior a Fase 7 | Datas relativas no ActivityTimeline |
| @tanstack/react-query v5 | Anterior a Fase 7 | Todos os 5 hooks de dados |
| lucide-react | Anterior a Fase 7 | Icones dos cards e alertas |

---

## 9. Criterios de Performance

- CA-PERF-01: Os 5 requests sao feitos em paralelo (sem waterfall entre hooks)
- CA-PERF-02: Pagina visualmente utilizavel com skeletons em menos de 300ms
- CA-PERF-03: Dados completos carregados em menos de 2 segundos em conexao normal
- CA-PERF-04: Sem re-renders desnecessarios: cada secao re-renderiza apenas quando seu proprio hook atualiza

---

## 10. Criterios de Acessibilidade

- CA-A11Y-01: KPI cards com role=article e aria-label descritivo
- CA-A11Y-02: Pipeline bars com role=button e aria-label com status e contagem
- CA-A11Y-03: AlertsPanel com role=list, role=listitem e aria-live=polite
- CA-A11Y-04: ActivityTimeline com role=feed
- CA-A11Y-05: Graficos Recharts com role=img, aria-label descritivo e tabIndex=0
- CA-A11Y-06: KPI cards navegaveis por teclado (tabIndex=0, focus-visible ring rose)
- CA-A11Y-07: Contraste WCAG 2.1 AA em light e dark mode

---

## 11. Perguntas Abertas

1. **RBAC no dashboard:** A spec da Fase 7 previa filtragem por papel. Atualmente todos os roles veem o dashboard completo. Quando implementar? Requer alterar a Edge Function para receber user_id alem do tenant_id.

2. **Variacao vs mes anterior:** Cards de KPI sem variacao percentual porque a RPC nao retorna periodo anterior. Requer alteracao na RPC get_dashboard_kpis para incluir objeto previous_month.

3. **Widget de equipe top-5:** US-707 da Fase 7 nao implementada. Tem prioridade para proxima iteracao?

4. **Alerta de diaria sem equipe:** RPC get_alerts nao inclui esse tipo. Incluir na proxima versao?

5. **Timestamp de ultima atualizacao:** Pode ser implementado com state local lastRefresh atualizado em handleRefetchAll.

---

## 12. Referencias

- Implementacao da pagina: frontend/src/app/(dashboard)/page.tsx
- Hooks de dados: frontend/src/hooks/use-dashboard.ts
- Componentes: frontend/src/components/dashboard/
- Edge Function backend: supabase/functions/dashboard/
- Spec da fase: docs/specs/fase-7-dashboard-reports-portal.md (secao 5.1, US-701 a US-710)
- Arquitetura: docs/architecture/fase-7-architecture.md (secao 5.1.1)
- Design System: docs/design/design-system.md