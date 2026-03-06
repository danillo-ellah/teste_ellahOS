# EllaOS — Visao Estrategica do Produto

**Versao:** 1.0
**Data:** 2026-03-07
**Status:** Rascunho para revisao CEO
**Autor:** PM + Tech Lead (Claude Opus 4.6)
**Origem:** DNA operacional (31 perguntas CEO), inventario tecnico, roadmap Ellah Filmes

---

## 1. Sumario Executivo

### O que e o EllaOS

EllaOS e o sistema operacional de gestao para produtoras de filmes publicitarios. Nasceu para resolver o caos operacional da Ellah Filmes (Sao Paulo) — uma produtora que gerencia dezenas de jobs simultaneos com equipes de 10-30 freelancers por projeto, orcamentos de R$89k a R$1.9M, e toda comunicacao espalhada entre WhatsApp, Google Sheets, Drive e email.

### Para quem

**Hoje:** Ellah Filmes (cliente unico, dog-fooding).
**Futuro proximo:** Colorbar (parceira de pos-producao, primeiro tenant externo).
**Visao:** Qualquer produtora audiovisual brasileira que sofre dos mesmos problemas.

### Estado honesto (marco 2026)

O sistema tem **60+ tabelas**, **51 Edge Functions**, **45+ migrations** e **~45 paginas frontend**. Cobre financeiro (custos, orcamento, NFs, dashboard), CRM (pipeline Kanban, carta orcamento IA), producao (diarias, locacoes, figurino, elenco, ordem do dia, claquete ANCINE), cronograma, contratos DocuSeal, portal do cliente e um copilot IA basico.

**O que funciona bem:** Modulo financeiro (migrado de Google Sheets com dados reais), CRM com Kanban DnD, claquete ANCINE, portal do cliente, CI/CD automatico.

**O que falta:** RBAC real (Fase 1 acabou de ser implementada, faltam Fases 2-4), pos-producao como modulo completo, IAs especializadas por area, Drive com credenciais reais, NF automation via n8n, multi-tenant para Colorbar, e polimento geral de UX.

---

## 2. Inventario Honesto — O Que Ja Existe

### 2.1 Frontend — Modulos e Maturidade

| Modulo | Rota | Maturidade | Observacao |
|--------|------|-----------|------------|
| Jobs — Listagem | /jobs | Producao | Filtros, busca, paginacao |
| Jobs — Detalhe | /jobs/[id] | Producao | 19 abas em 4 grupos (Info, Producao, Gestao, Registro) |
| Jobs — Geral | tab=geral | Producao | Status pipeline, dados basicos |
| Jobs — Equipe | tab=equipe | Producao | CRUD membros, contratos batch DocuSeal |
| Jobs — Entregaveis | tab=entregaveis | Producao | CRUD, status, versionamento |
| Jobs — Financeiro | tab=financeiro + sub-rotas | Producao | 5 sub-paginas (custos, dashboard, orcamento, verbas, calendario) |
| Jobs — Diarias | tab=diarias | Beta | CRUD shooting dates |
| Jobs — Locacoes | tab=locacoes | Beta | CRUD locacoes |
| Jobs — PPM | tab=ppm | Beta | Pre-production meeting |
| Jobs — Storyboard | tab=storyboard | MVP | Canvas react-sketch-canvas + upload |
| Jobs — Elenco | tab=elenco | Beta | 28 colunas, import CSV, contratos DocuSeal |
| Jobs — Ordem do Dia | tab=ordem-do-dia | Beta | Gerador, preview HTML, PDF jsPDF |
| Jobs — Cronograma | tab=cronograma | Beta | Gantt CSS Grid, DnD fases |
| Jobs — Aprovacoes | tab=aprovacoes | Beta | PDF interno, historico |
| Jobs — Contratos | tab=contratos | Beta | DocuSeal integration |
| Jobs — Claquete | tab=claquete | Producao | Template 1920x1080, ANCINE, export JPEG+PDF |
| Jobs — Diario | tab=diario | MVP | Diario de producao |
| Jobs — Figurino/Arte | tab=figurino | MVP | Gestao figurino e arte |
| Jobs — Horas Extras | tab=horas-extras | MVP | Registro horas extras |
| Jobs — Historico | tab=historico | Producao | Audit trail |
| Jobs — Portal | tab=portal | Beta | Sessoes de aprovacao com token |
| CRM — Pipeline | /crm | Producao | Kanban DnD, notas, follow-ups, atividades |
| CRM — Dashboard | /crm/dashboard | Beta | Metricas CEO |
| CRM — Relatorio | /crm/report | Beta | Report mensal |
| Clientes/Agencias | /clients, /agencies | Producao | CRUD, contatos, historico |
| Financeiro Global | /financeiro/* | Producao | NF request, NF validation, vendors, calendario, conciliacao |
| Pessoas | /people | Producao | Equipe + freelancers, dados bancarios |
| Portal Cliente | /portal/[token] | Beta | Aprovacao entregas, chat, timeline |
| Calendario Equipe | /team/calendar | Beta | Alocacoes por pessoa |
| Admin | /admin/* | Beta | Config, equipe, categorias |
| Settings | /settings/* | Beta | Empresa, integracoes, notificacoes |
| AI Copilot (ELLA) | FAB flutuante | MVP | Groq/Llama 3.3, assistente geral |

### 2.2 Backend — 51 Edge Functions por Dominio

| Dominio | EFs | Endpoints | Maturidade |
|---------|-----|-----------|------------|
| Financeiro | 8 | ~35 | Producao |
| Jobs | 5 | ~30 | Producao |
| CRM | 4 | ~20 | Producao |
| Pessoas/Contatos | 2 | ~10 | Producao |
| Clientes/Agencias | 2 | ~10 | Producao |
| Producao (diarias, locacoes, PPM, call sheet, wrap, weather) | 6 | ~20 | Beta |
| Pos (storyboard, OD) | 2 | ~10 | MVP |
| Drive | 1 | ~5 | Beta |
| Portal Cliente | 1 | ~8 | Beta |
| Contratos (DocuSeal) | 2 | ~6 | Beta |
| Auth | 1 | ~2 | Producao |
| Config/Infra | 3 | ~6 | Producao |
| WhatsApp (Z-API) | 1 | ~5 | MVP |
| IA | 4 | ~8 | MVP |
| SaaS (invitations, team) | 2 | ~6 | MVP |

### 2.3 Banco de Dados

- **60+ tabelas** com RLS ativo em todas
- **14 tabelas base** (schema original robusto)
- **~46 tabelas adicionais** (financeiro, CRM, producao, SaaS, IA, config)
- **Triggers:** updated_at, health_score, status_history, job_code atomico
- **Generated columns:** tax_value, gross_profit, margin_percentage
- **Dados reais migrados:** 204 vendors, 283 cost_items, 202 bank_accounts

### 2.4 Infraestrutura

| Componente | Status | Custo |
|-----------|--------|-------|
| Supabase (Pro) | Producao | ~$25/mes |
| Vercel (Hobby) | Producao | Gratis |
| VPS Hetzner (Docker) | Producao | ~EUR 10/mes |
| n8n self-hosted | Operacional | Incluido VPS |
| DocuSeal self-hosted | Operacional | Incluido VPS |
| Groq API (Llama 3.3) | Free tier | Gratis |
| Z-API WhatsApp | Producao | R$100/mes |
| GitHub (repo privado) | Ativo | Gratis |

### 2.5 Seguranca

- **0 criticos, 0 altos, 0 medios** (todos corrigidos)
- **4 baixos restantes** (nenhum exploitable)
- JWT auth, RLS em todas tabelas, CORS com allowlist
- Source maps off, x-powered-by off, CSP sem unsafe-eval
- Pentest externo: 30 findings, maioria falsos positivos

---

## 3. Gaps por Area

### 3.1 Financeiro

| Gap | Impacto | Prioridade |
|-----|---------|------------|
| NF automation (n8n Gmail → ingest) | Alto — hoje manual | P0 |
| Backend mascarar dados por role (RBAC Fase 4) | Alto — seguranca | P1 |
| Sub-secoes financeiras gated por role (RBAC Fase 2) | Alto — seguranca | P1 |
| Conciliacao bancaria OFX — polimento | Medio | P2 |
| IA Financeira (alertas, orcamento inteligente) | Alto — CEO prioridade MAX | P1 |

### 3.2 Producao

| Gap | Impacto | Prioridade |
|-----|---------|------------|
| Fluxo aprovacao equipamentos (DOP→Dir.Prod→PE) | Medio | P2 |
| Checklists automaticos pre-producao | Medio | P2 |
| Gestao de fornecedores por job (orcamentos, comparacao) | Medio | P2 |
| Logistica (passagens, hoteis) — hoje no WhatsApp | Baixo | P3 |

### 3.3 Pos-Producao

| Gap | Impacto | Prioridade |
|-----|---------|------------|
| Modulo completo (timeline entregas, versoes, aprovacoes) | Alto — nao existe | P1 |
| Controle de retrabalho e custos pos | Alto | P2 |
| Integracao Frame.io (webhook pronto, falta frontend) | Medio | P2 |
| Lifecycle material bruto (created→active→archived→glacier) | Alto — ativo mais valioso | P1 |

### 3.4 Comercial / CRM

| Gap | Impacto | Prioridade |
|-----|---------|------------|
| Follow-up alerts automaticos | Baixo — MVP existe | P3 |
| Relatorio mensal automatico | Baixo — MVP existe | P3 |
| Integracao com email (tracking aberturas) | Baixo | P3 |

### 3.5 Contratos

| Gap | Impacto | Prioridade |
|-----|---------|------------|
| IA Juridica (revisao automatica) | Alto — CEO quer | P2 |
| Templates DocuSeal para todos os tipos | Medio | P2 |
| Envio automatico de contratos para equipe toda | Medio | P2 |

### 3.6 Drive

| Gap | Impacto | Prioridade |
|-----|---------|------------|
| Credenciais reais (Service Account em produção) | Alto — blocker | P0 |
| Rotacao chave SA (exposta no chat) | Alto — seguranca | P0 |
| Sincronizacao bidirecional sistema↔Drive | Medio | P2 |

### 3.7 Portal do Cliente

| Gap | Impacto | Prioridade |
|-----|---------|------------|
| 8 bugs do chaos test (1 critico, 2 altos) | Alto | P0 |
| Notificacao WhatsApp quando sessao criada | Medio | P2 |
| Comentarios em video (timecode) | Baixo | P3 |

### 3.8 Atendimento

| Gap | Impacto | Prioridade |
|-----|---------|------------|
| Modulo atendimento (pagina dedicada) | Alto — nao existe | P1 |
| IA Atendimento (monitora WhatsApp, salva docs) | Alto — CEO prioridade #2 | P1 |
| Chat interno por job | Medio | P2 |

### 3.9 RH

| Gap | Impacto | Prioridade |
|-----|---------|------------|
| Modulo RH completo | Baixo — futuro | P3 |
| Historico de projetos por pessoa | Medio | P2 |
| Avaliacao de performance | Baixo | P3 |

### 3.10 Admin / SaaS

| Gap | Impacto | Prioridade |
|-----|---------|------------|
| Onboarding self-service | Alto — blocker SaaS | P2 |
| Billing (Stripe) | Alto — blocker SaaS | P2 |
| Documentacao usuario | Medio | P2 |
| Multi-tenant cross-access (Colorbar) | Alto — diferencial | P2 |

---

## 4. Roadmap — Fases 13 a 17

### Fase 13: Seguranca + RBAC + Automacao (~1.5 semana)

**Objetivo:** Fechar gaps de seguranca e implementar controle de acesso real.

| Sprint | Entregavel | Dias |
|--------|-----------|------|
| 13.1 | RBAC Fase 2 — guards sub-secoes financeiras, sidebar filtrada, campos ocultos | 1.5 |
| 13.2 | RBAC Fase 3 — override por job (access_override JSONB), UI na aba Equipe | 2 |
| 13.3 | Portal bugs — 8 fixes (1 critico, 2 altos) | 1 |
| 13.4 | NF automation — workflow n8n Gmail → ingest | 1 |
| 13.5 | Drive credenciais reais + rotacao SA key | 0.5 |

**Criterio de done:** Dir. Cena nao ve aba Financeiro. Financeiro nao ve Storyboard. NFs chegam automaticamente via Gmail.

### Fase 14: IAs Especializadas v1 (~2 semanas)

**Objetivo:** Entregar as 2 IAs prioritarias do CEO.

| Sprint | Entregavel | Dias |
|--------|-----------|------|
| 14.1 | IA Financeira — alertas de estouro de orcamento, sugestao de cortes, analise de margem | 3 |
| 14.2 | IA Atendimento v1 — monitora WhatsApp (Z-API), extrai docs/decisoes, salva no sistema | 3 |
| 14.3 | RBAC Fase 4 — backend validation (mascarar dados financeiros na API) | 2 |
| 14.4 | Alertas WhatsApp integrados (lembretes de pagamento, aprovacoes pendentes) | 2 |

**Criterio de done:** IA alerta quando custo ultrapassa 90% do orcamento. IA resume grupo WhatsApp do job e salva decisoes.

### Fase 15: Pos-Producao + Polimento (~2 semanas)

**Objetivo:** Modulo de pos-producao completo (maior gap operacional).

| Sprint | Entregavel | Dias |
|--------|-----------|------|
| 15.1 | Schema pos-producao (delivery_versions, review_notes, pos_timeline) | 1 |
| 15.2 | EFs pos-producao (CRUD versoes, aprovacoes, timeline) | 2 |
| 15.3 | Frontend pos-producao (timeline, viewer, notas com timecode) | 3 |
| 15.4 | Lifecycle material bruto (tracking, protecao, alertas retencao) | 2 |
| 15.5 | Drive sincronizacao bidirecional (upload sistema → cria no Drive) | 2 |

**Criterio de done:** Editor sobe versao → dir. cena e cliente revisam com notas → aprovacao no sistema. Material bruto com 3 camadas de protecao.

### Fase 16: Multi-Tenant + SaaS (~3 semanas)

**Objetivo:** Preparar o sistema para vender.

| Sprint | Entregavel | Dias |
|--------|-----------|------|
| 16.1 | Onboarding Colorbar — primeiro tenant externo, acesso cruzado a jobs compartilhados | 3 |
| 16.2 | Billing — Stripe integration, planos, limites por tier | 3 |
| 16.3 | Documentacao usuario — help center, tooltips, onboarding tour | 3 |
| 16.4 | SLA e monitoring — uptime, alertas, backup automatizado | 2 |
| 16.5 | Polimento UX — acessibilidade, mobile responsivo, performance audit | 3 |

**Criterio de done:** Colorbar usando o sistema em producao. Pagina de pricing funcional. Documentacao navegavel.

### Fase 17: IAs Avancadas + Escala (~4 semanas)

**Objetivo:** Diferenciar o produto com inteligencia.

| Sprint | Entregavel | Dias |
|--------|-----------|------|
| 17.1 | IA Juridica — revisao automatica de contratos, envio para equipe toda | 3 |
| 17.2 | IA Producao — checklists inteligentes, logistica, fornecedores | 3 |
| 17.3 | IA WhatsApp inteligente — organiza msgs, extrai docs, cria tarefas | 4 |
| 17.4 | Roteador Ellaih — orquestracao central de todos os agentes | 3 |
| 17.5 | IA Pos-Producao — controle entregas, alertas retrabalho, custos | 3 |
| 17.6 | Fluxo aprovacao equipamentos (DOP→Dir.Prod→PE) | 2 |
| 17.7 | API publica v1 (para integracoes de terceiros) | 2 |

**Criterio de done:** 6 IAs operacionais, roteador central funcionando. Cada area com "assessora" digital.

---

## 5. Arquitetura de IAs

### 5.1 Modelo de Agentes

```
                    Usuario (WhatsApp / EllaOS)
                              |
                         [Ellaih]
                    Roteador Central IA
                    (classifica intent)
                              |
          +---------+---------+---------+---------+---------+
          |         |         |         |         |         |
     [Financeira] [Atendimento] [Juridica] [Producao] [Pos]  [ELLA]
      Agente       Agente      Agente    Agente    Agente   Estagiaria
```

### 5.2 Especializacao por Agente

| Agente | Dominio | Tools (API Catalog) | Modelo | Prioridade |
|--------|---------|---------------------|--------|------------|
| Financeira | Orcamento, custos, NFs, alertas | financial-dashboard, cost-items, payment-manager, nf-processor | Claude Sonnet (precisa ser certeiro) | MAX |
| Atendimento | WhatsApp, aprovacoes, escopo, logistica | client-portal, zapi-client, jobs (leitura), crm-notes | Claude Sonnet | Alta |
| Juridica | Contratos, revisao, compliance | docuseal-integration, jobs-team (fee), cost-items | Claude Sonnet | Media |
| Producao | Checklists, logistica, fornecedores | call-sheet, shooting-dates, locations, weather-alerts, vendors | Llama 3.3 (volume alto, custo baixo) | Media |
| Pos | Entregas, versoes, retrabalho | storyboard, od-generator, job-deliverables | Llama 3.3 | Baixa |
| ELLA | Assistente geral, perguntas, busca | Todas (readonly) | Groq/Llama 3.3 | Ja existe |

### 5.3 Progressao de Autonomia

| Nivel | Descricao | Exemplo | Timeline |
|-------|-----------|---------|----------|
| Assistente | Sugere acoes, humano executa | "Custo passou 90% do orcamento, quer que eu alerte o PE?" | Fase 14 |
| Semi-autonomo | Executa com aprovacao | "Preparei o resumo da reuniao. Salvar no job?" | Fase 17 |
| Autonomo | Executa e reporta | "NF recebida, vinculei ao cost item #234, status: recebido" | Futuro |

### 5.4 Autenticacao de Agentes

Cada agente usa um **service user** dedicado no Supabase:
- `ia_financeira@ellahfilmes.com` → user_role: `admin` (service) + RLS bypass via service key
- Todas acoes logadas em `ai_usage_logs` com agent_id, tool_called, tokens_used
- Rate limiting por agente para evitar custos descontrolados

---

## 6. Estrategia Multi-Tenant / SaaS

### 6.1 Colorbar como Piloto

- Empresa parceira de pos-producao da Ellah
- Primeiro tenant externo (tenant_id separado)
- Acesso cruzado: Colorbar ve jobs compartilhados com Ellah
- Feedback mutuo dentro do sistema (notas de revisao, aprovacoes)
- **Timeline:** Fase 16 (~3 meses)

### 6.2 Modelo de Pricing (proposta)

| Plano | Preco/mes | Jobs ativos | Usuarios | IAs | Storage |
|-------|-----------|-------------|----------|-----|---------|
| Starter | R$790 | 10 | 5 internos + ilimitado freelancers | ELLA basica | 10GB |
| Growth | R$1.490 | 30 | 15 internos + ilimitado freelancers | 3 IAs especializadas | 50GB |
| Enterprise | R$3.490 | Ilimitado | Ilimitado | Todas as IAs + customizacao | 200GB |

**Modelo de cobranca:** Por seat interno (internos pagam, freelancers nao). Freelancers sao convidados por job e veem apenas o que o RBAC permite.

### 6.3 Onboarding

| Tipo | Para quem | Processo |
|------|-----------|---------|
| White-glove | Primeiros 5 clientes | Reuniao, migracao de dados, treinamento 1-on-1 |
| Self-service | Escala | Signup, wizard de config, import CSV, docs + video |

### 6.4 Diferenciacao Competitiva

| Aspecto | EllaOS | Concorrentes genericos (Monday, Asana, Notion) |
|---------|--------|----------------------------------------------|
| Conhecimento do dominio | Feito POR produtora, PRA produtora | Templates genericos |
| Nomenclatura | Fala a lingua (PE, DOP, 1a AD, ANCINE) | Termos genericos |
| RBAC granular | 18 papeis × 19 abas, override por job | Roles basicos (admin/member/viewer) |
| IAs especializadas | 6 agentes que entendem producao audiovisual | IA generica |
| Drive integration | Mapa de pastas padrao da industria | Upload generico |
| Contratos DocuSeal | Fluxo completo equipe+elenco+producao | Nao tem |
| Claquete ANCINE | Formato oficial brasileiro | Nao existe |
| Portal cliente | Aprovacao com token (sem login) | Login obrigatorio |

---

## 7. Riscos e Mitigacoes

### 7.1 Riscos Tecnicos

| Risco | Prob. | Impacto | Mitigacao |
|-------|-------|---------|-----------|
| Complexidade crescente (60+ tabelas, 51 EFs) | Alta | Alto | Manter specs, testes, API catalog |
| Custo de infra com IAs (tokens Claude/Groq) | Media | Alto | Usar Groq free tier para volume, Claude so para precisao |
| Seguranca dados financeiros | Baixa | Critico | RBAC 4 fases, RLS, pentest periodico |
| Supabase lock-in | Media | Medio | Postgres padrao, EFs portaveis |
| Performance com muitos jobs simultaneos | Baixa | Medio | Indices, paginacao, cache |

### 7.2 Riscos de Negocio

| Risco | Prob. | Impacto | Mitigacao |
|-------|-------|---------|-----------|
| Mercado pequeno (produtoras audiovisuais BR) | Media | Alto | Expandir para produtoras de conteudo, agencias |
| Dependencia de 1 cliente (Ellah) | Alta | Alto | Onboarding Colorbar ASAP, depois mais 3-5 clientes |
| Pricing errado | Media | Medio | Beta gratuito para Colorbar, ajustar com feedback |
| Concorrentes copiarem features | Baixa | Medio | Velocidade + conhecimento profundo do dominio |
| CEO como unico usuario avancado | Alta | Alto | Treinamento equipe, documentacao, UX intuitiva |

### 7.3 Riscos Operacionais

| Risco | Prob. | Impacto | Mitigacao |
|-------|-------|---------|-----------|
| Bus factor = 1 (Danillo = CEO + dev + financeiro) | Alta | Critico | Documentar tudo, contratar, automatizar |
| Equipe nao adotar o sistema | Media | Alto | Onboarding gradual, IA ajudando, WhatsApp como ponte |
| Downtime afetar producao ativa | Baixa | Alto | Monitoring, alertas, fallback manual documentado |
| Dados sensiveis vazarem | Baixa | Critico | RBAC completo, audit log, backup encriptado |
| Burnout do fundador | Alta | Critico | Priorizar, delegar pra IA, contratar |

---

## 8. Metricas de Sucesso

### 8.1 KPIs por Fase

| Fase | KPI | Meta |
|------|-----|------|
| 13 (RBAC) | % de abas corretamente filtradas por role | 100% |
| 13 (NF) | NFs processadas automaticamente vs manual | >80% automatico |
| 14 (IAs) | Alertas financeiros uteis (precision) | >90% |
| 14 (IAs) | Msgs WhatsApp resumidas corretamente | >85% |
| 15 (Pos) | Jobs usando modulo pos-producao | >50% dos jobs ativos |
| 16 (SaaS) | Colorbar usando em producao | Sim/Nao |
| 16 (SaaS) | NPS da equipe Ellah | >8 |
| 17 (IAs) | Tempo medio economizado por job (horas) | >10h/job |

### 8.2 Quando o Sistema "Se Paga"

**Cenario Ellah (cliente interno):**
- Horas economizadas por mes: ~40h (CEO) + ~20h (atendimento) + ~10h (financeiro)
- Valor hora medio equipe interna: ~R$80/h
- Economia mensal: ~R$5.600/mes
- Custo do sistema: ~R$500/mes (infra)
- **ROI: 11x** — ja se paga como ferramenta interna

**Cenario SaaS (futuro):**

| Cenario | Clientes | Plano medio | MRR | Timeline |
|---------|----------|-------------|-----|----------|
| Minimo viavel | 3 | Growth (R$1.490) | R$4.470 | 6 meses apos lancamento |
| Sustentavel | 10 | Mix | ~R$12.000 | 12 meses |
| Crescimento | 25 | Mix | ~R$30.000 | 24 meses |

### 8.3 North Star Metric

**Numero de jobs gerenciados end-to-end pelo EllaOS por mes.**

Um job "end-to-end" significa: criado no CRM → orcamento no Financeiro → equipe montada → producao executada (diarias, OD, claquete) → pos-producao entregue → cliente aprovou no Portal → NF emitida → job fechado.

**Meta Fase 17:** 100% dos jobs da Ellah gerenciados end-to-end pelo sistema.

---

## Anexo A: Timeline Visual

```
Mar 2026          Abr 2026          Mai 2026          Jun-Jul 2026
|--- Fase 13 ----|--- Fase 14 ------|--- Fase 15 ------|--- Fase 16 ---------|
 RBAC + NF + Bugs  IAs v1 + Backend   Pos-Prod + Drive   SaaS + Colorbar

                                                        Ago-Set 2026
                                                        |--- Fase 17 ---------|
                                                         IAs avancadas + Escala
```

## Anexo B: Dependencias entre Fases

```
Fase 13 (RBAC)
  └→ Fase 14 (IAs precisam de RBAC pra respeitar permissoes)
       └→ Fase 17 (IAs avancadas)

Fase 13 (Drive creds)
  └→ Fase 15 (Drive sync bidirecional)
       └→ Fase 16 (Colorbar precisa de Drive real)

Fase 15 (Pos-producao)
  └→ Fase 16 (Colorbar e empresa de pos, precisa do modulo)

Fase 16 (SaaS/Billing)
  └→ Fase 17 (Escala, API publica)
```
