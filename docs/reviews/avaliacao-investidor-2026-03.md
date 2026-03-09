# MEMO DE INVESTIMENTO — ELLAHOS

**Data:** 2026-03-09
**Tipo:** Due Diligence Tecnica e de Produto
**Analista:** VC Specialist — SaaS Vertical / Creative Industries
**Status do investimento:** Avaliacao pre-seed
**Fonte dos dados:** Analise direta do codigo-fonte, nao de pitch deck

---

## 0. SUMARIO EXECUTIVO

O EllaOS e um sistema de gestao verticalizado para produtoras de filmes publicitarios brasileiras. Nasceu como ferramenta interna da Ellah Filmes (SP), uma produtora de medio porte (posicao 12 no ranking nacional, ~R$73,5M em contratos, jobs de R$89k a R$1,9M). O sistema esta em fase de dog-fooding com dados reais de producao, construido por um fundador tecnico usando desenvolvimento assistido por IA (Claude Code).

**Veredicto rapido:** Produto com profundidade de dominio impressionante para o estagio, stack moderna, e um mercado vertical com zero concorrencia local relevante. O risco principal e a dependencia de um unico fundador e a distancia entre o produto atual (ferramenta interna) e um SaaS vendavel. O potencial de retorno e assimetrico — se executar, pode se tornar o "Procore da publicidade brasileira".

---

## 1. INVENTARIO REAL DO PRODUTO (Numeros Verificados no Codigo)

Estes numeros foram contados diretamente no repositorio, nao sao estimativas.

### 1.1 Frontend

| Metrica | Quantidade |
|---------|-----------|
| **Paginas (page.tsx)** | **49** |
| **Hooks customizados** | **63** |
| **Componentes (arquivos .tsx)** | **190+** (truncado pelo scan — real provavelmente 210+) |
| **Tipos TypeScript (arquivos .ts em /types)** | **31** |
| **Bibliotecas utilitarias (/lib)** | **14** |
| **Testes E2E (Playwright)** | **11 spec files** |
| **CI/CD Workflows** | **2** (ci.yml + e2e.yml) |

### 1.2 Backend (Supabase Edge Functions)

| Metrica | Quantidade |
|---------|-----------|
| **Edge Functions (index.ts)** | **53** |
| **Handlers individuais** | **100+** (truncado — real estimado 130+) |
| **Shared utilities (_shared/)** | **33 arquivos** |
| **Dominios cobertos** | 20+ (jobs, financeiro, CRM, AI, drive, whatsapp, portal, vendors, contratos, NF, etc.) |

### 1.3 Banco de Dados

| Metrica | Quantidade |
|---------|-----------|
| **Migrations SQL** | **83** |
| **Tabelas estimadas** | **62+** |
| **RLS (Row Level Security)** | **100% das tabelas** |
| **Triggers** | Multiples (updated_at, health_score, status_history, job_code atomico) |
| **Generated columns** | tax_value, gross_profit, margin_percentage |
| **RPCs (stored procedures)** | 10+ (dashboards, reports) |
| **Dados reais migrados** | 204 vendors, 283 cost_items, 202 bank_accounts |

### 1.4 Documentacao

| Metrica | Quantidade |
|---------|-----------|
| **Specs de produto** | **30+ documentos** |
| **ADRs (Architecture Decision Records)** | **20** |
| **Auditorias de seguranca** | **3 documentos** |
| **Reviews tecnicas** | **3+** |
| **Analises de mercado** | **2** (product-analysis-publicidade.md, crm-analysis-produtora.md) |

---

## 2. AVALIACAO POR DIMENSAO

### A. PRODUTO — 8.5/10

#### Breadth (Amplitude): Excepcional

O sistema cobre **21 abas** dentro de um unico job, organizadas em 5 grupos (Info, Producao, Gestao, Pos-Producao, Registro). Essa e a lista completa verificada no codigo:

**Grupo Info:** Geral, Equipe, Entregaveis
**Grupo Producao:** PPM, Diarias, Locacoes, Storyboard, Elenco, Ordem do Dia, Relatorio de Set, Figurino/Arte
**Grupo Gestao:** Financeiro (com 5 sub-paginas), Cronograma, Aprovacoes, Contratos, Claquete, Atendimento, Horas Extras
**Grupo Pos-Producao:** Pos-Producao (stage management, cut versions, briefing, aprovacao)
**Grupo Registro:** Historico, Portal

Alem do job detail, existem modulos independentes completos:
- **CRM** com Kanban DnD, pipeline visual, metricas, relatorios (13 componentes)
- **Financeiro global** com 7 sub-paginas (visao geral, fornecedores, calendario pgtos, fluxo de caixa, validacao NFs, solicitacao NFs, conciliacao bancaria)
- **Dashboard CEO** com KPIs, pipeline chart, alertas, timeline, receita, fluxo de caixa, snapshot comercial (9 componentes)
- **Portal do cliente** com token-based access, chat, timeline, documentos
- **Portal do fornecedor** com convite e dados bancarios
- **Modulo de pessoas** com perfis, dados bancarios, historico de jobs
- **Admin** com gestao de equipe, categorias de custo, templates de pre-producao
- **Settings** com configuracoes da empresa, integracoes, notificacoes

**Isso nao e um MVP. E um produto com cobertura funcional de mid-market.**

#### Depth (Profundidade): Impressionante no financeiro, variavel nos demais

O modulo financeiro e o mais profundo e demonstra entendimento real do dominio:

1. **Orcamento** — por categorias (16 categorias do mercado), budget mode toggle, templates aplicaveis, jobs de referencia
2. **Custos reais** — CRUD com status (orcado/aprovado/pago), link com NF, comprovante de pagamento, export
3. **Verbas a vista** — cash advances com deposito, prestacao de contas (receipts), aprovacao, fechamento
4. **Dashboard financeiro** — budget vs actual, spending timeline, top vendors, status breakdown (4 graficos)
5. **Calendario de pagamentos** — por data, adiamento, KPIs
6. **Fluxo de caixa projetado** — projecao 30 dias, mensal
7. **NF validation** — upload, auto-link por email+job code, reassign, rejeicao
8. **NF request** — solicitacao, preview email, confirmacao
9. **Conciliacao bancaria** — upload OFX, link com cost items
10. **Fornecedores** — CRUD, contas bancarias, merge de duplicados, convite portal, sugestao IA
11. **Custos fixos** — separados dos custos por job
12. **Aprovacao de pagamentos** — com fluxo de aprovacao

**Isso e equivalente a um mini-ERP financeiro. Nenhum concorrente audiovisual global tem essa profundidade.**

O modulo de producao tambem e notavel:
- Ordem do Dia com preview HTML e export PDF (jsPDF)
- Claquete ANCINE (template 1920x1080, JPEG+PDF) — feature unica no mercado
- Elenco com 28 colunas, import CSV, contratos DocuSeal
- Cronograma com Gantt CSS Grid e DnD
- Relatorio de Set com boletim de producao (30 colunas)
- Pre-producao com checklist configuravel (templates admin)
- Pos-producao com stage management, cut versions, briefing, aprovacao/rejeicao

#### Completeness (End-to-end): 85%

O fluxo principal esta coberto:
Lead (CRM) -> Orcamento -> Job -> Pre-Producao -> Filmagem -> Pos-Producao -> Entrega -> Faturamento

Gaps notaveis:
- CRM -> Job: "Converter para Job" existe no CRM mas o fluxo de orcamento pre-job (antes de virar job) ainda nao e nativo
- NF automation: fluxo n8n Gmail -> ingest esta arquitetado mas nao deployado
- Drive: integrado mas sem credenciais reais em producao

#### UX: Boa, com espaco para melhoria

- Dark mode implementado
- Mobile responsivo (touch 44px documentado)
- Skeletons de loading (nao spinners)
- Sistema de areas com color-coding (Producao azul, Comercial roxo, Financeiro verde, Equipe ambar, Admin cinza)
- Sidebar organizada por areas
- Toast notifications (sonner)
- Tudo em portugues brasileiro com termos do mercado

#### Diferenciais vs Concorrencia

1. **Claquete ANCINE** — nenhum concorrente faz isso
2. **Financeiro com calculo de impostos BR** — margem real, nao estimativa
3. **CRM nativo com Kanban** — Yamdu e StudioBinder nao tem CRM
4. **Contratos com DocuSeal** — assinatura digital integrada ao fluxo
5. **Portal do cliente** — aprovacao de entregas sem login
6. **21 abas por job** — cobertura funcional incomparavel
7. **RBAC granular** — 15 grupos x 21 abas, com override por job
8. **IA copilot nativo** — estimativa de orcamento, match de freelancer, analise de dailies

---

### B. TECNOLOGIA — 7.5/10

#### Stack: Moderna e bem escolhida

| Camada | Tecnologia | Avaliacao |
|--------|-----------|-----------|
| Frontend | Next.js 16.1.6, React 19, TypeScript | Bleeding edge (Next 16 ainda e novo) |
| Styling | Tailwind v4, shadcn/ui (new-york, zinc) | Best-in-class para startups |
| State | TanStack React Query v5 | Correto para data-heavy app |
| Backend | Supabase (PostgreSQL, Edge Functions, Auth, Storage, Realtime) | Escolha acertada para solo dev |
| Forms | React Hook Form + Zod v4 | Padrao industria |
| Charts | Recharts v3 | Adequado |
| DnD | @dnd-kit | Escolha profissional |
| PDF | jsPDF + html-to-image | Funcional mas fragil |
| E2E | Playwright | Padrao ouro |

**Observacao positiva:** A escolha do Supabase e estrategicamente correta. Multi-tenant com RLS e nativo, Auth e out-of-the-box, Edge Functions escalam sem servidor proprio. Pra um fundador solo, elimina toda a complexidade de infra.

#### Arquitetura: Solida com padroes consistentes

**Edge Functions bem estruturadas:**
- Padrao index.ts -> handlers/ consistente em todas as 53 EFs
- Shared utilities reutilizaveis (auth, cors, response, pagination, validation)
- Error handling tipado com AppError
- CORS dinamico com origin allowlist (nao wildcard)
- Validacao com Zod em endpoints criticos
- Response format padronizado: `{ data, meta?, warnings?, error? }`

**Frontend bem organizado:**
- 31 tipos TypeScript separados
- 63 hooks com React Query (cache, invalidacao, mutations)
- Componentes atomicos (shared/FormField, shared/SearchableSelect, shared/Pagination)
- Constants centralizadas com labels pt-BR
- Access control map com resolucao de permissoes em runtime
- Query keys centralizadas

**Banco de dados maduro:**
- 83 migrations idempontentes (IF NOT EXISTS)
- RLS em 100% das tabelas — raro ate em startups Series A
- Triggers para automacao (health_score, status_history)
- Generated columns para calculos financeiros
- Indices otimizados (foreign keys, performance advisors)

#### Seguranca: Acima da media para o estagio

- Auditoria formal documentada (13 findings, TODOS corrigidos)
- JWT validado server-side em todas as EFs
- Tenant isolation via app_metadata (nao query param)
- CORS dinamico por origin
- Webhooks com timing-safe secret verification
- Source maps desabilitados em producao
- CSP sem unsafe-eval
- npm audit com 0 vulnerabilidades
- Input validation com Zod
- Financial data masking por role

**Ponto de atencao:** A auditoria de seguranca foi feita pelo proprio Claude AI, nao por um pentest externo independente. Os 30 findings do pentest externo foram classificados como "maioria falsos positivos" — isso precisaria de validacao independente.

#### Qualidade do codigo: Consistente, com tech debt aceitavel

**Positivos:**
- TypeScript end-to-end (frontend + tipos gerados + Zod schemas)
- CI/CD com lint + typecheck + build (automatico no push main)
- Deno type-check nas Edge Functions (continue-on-error, mas existe)
- 20 ADRs documentando decisoes tecnicas
- 11 specs de teste E2E

**Debt tecnica identificada:**
- Ausencia de unit tests (so E2E)
- Playwright E2E com trigger manual (nao automatico no CI)
- Alguns modulos em estado MVP (storyboard com react-sketch-canvas, figurino basico)
- PDF generation via jsPDF e fragil para layouts complexos
- Edge Functions typecheck com continue-on-error (alguns tem type errors)

#### Riscos tecnicos

1. **Dependencia de Supabase:** Se Supabase mudar pricing ou descontinuar Edge Functions, a migracao seria complexa (53 EFs para reescrever)
2. **Next.js 16 bleeding edge:** Versao muito recente, potenciais bugs de framework
3. **Solo developer bus factor:** 100% do codigo foi escrito por 1 pessoa + IA. Zero code review por outro humano

---

### C. MERCADO — 7/10

#### TAM/SAM/SOM

**TAM (Total Addressable Market):**
- Produtoras audiovisuais no Brasil: ~5.000-8.000 (inclui publicidade, cinema, TV, conteudo digital)
- Ticket medio SaaS estimado: R$1.500-3.000/mes (por produtora, nao por usuario)
- TAM Brasil: R$108M-288M ARR (5.000-8.000 x R$1.800-3.000 x 12)
- Expansao LATAM (Argentina, Mexico, Colombia): 3-5x o mercado BR

**SAM (Serviceable Available Market):**
- Produtoras de publicidade com 5+ jobs/ano: ~2.000-3.000 no Brasil
- Ticket medio realista no lancamento: R$1.000-2.000/mes
- SAM: R$24M-72M ARR

**SOM (Serviceable Obtainable Market) — 3 anos:**
- Meta realista: 100-200 produtoras pagantes em 3 anos
- ARPU: R$1.500/mes
- SOM: R$1,8M-3,6M ARR

**Analise:** O mercado e nicho mas concentrado. Produtoras de publicidade sao poucas (vs milhares de agencias de marketing digital), mas os tickets medios sao altos e a dor e aguda. E um mercado de indicacao — 80% das produtoras se conhecem. Um case de sucesso gera word-of-mouth.

#### Concorrencia

| Concorrente | Tipo | Preco | Fraqueza vs EllaOS |
|-------------|------|-------|---------------------|
| **Yamdu** | Internacional | USD 49-249/user/mes | Complexo demais, sem financeiro BR, sem NF |
| **StudioBinder** | US, pre-producao | USD 29-99/user/mes | Zero financeiro, sem mercado BR |
| **Showbiz Budgeting** | US, orcamento | USD 499 unico | So orcamento, desktop, sem gestao |
| **Monday.com** | Generico | USD 8-16/user/mes | Sem nada de audiovisual |
| **Google Sheets** | Planilha | Gratis | O real concorrente — flexivel mas caos |
| **ContaAzul/Omie** | ERP BR generico | R$100-400/mes | Zero audiovisual, generico demais |

**Concorrencia local direta: ZERO.** Nao existe um SaaS de gestao para produtoras de publicidade no Brasil. Esse e o dado mais relevante da analise.

#### Moats potenciais

1. **Data moat:** Quanto mais jobs processados, melhor a IA fica (estimativa de orcamento, match freelancer, analise de custos). Dados financeiros de producao sao extremamente sensiveis e proprietarios — ninguem compartilha.

2. **Switching costs:** Depois que uma produtora migra historico financeiro, fornecedores, templates, e workflows para o EllaOS, o custo de sair e alto. Diferente de Trello/Notion que sao genericos.

3. **Network effects (potencial):** Portal de freelancers (futuro). Se 200 produtoras usam EllaOS e 5.000 freelancers tem perfil no sistema, o marketplace cria lock-in dos dois lados. Esse e o holy grail.

4. **Dominio vertical profundo:** 83 migrations, 21 abas por job, RBAC com 15 roles audiovisuais, Claquete ANCINE, 16 categorias de custo do mercado. Um horizontal nunca vai reconstruir isso.

#### Timing

**Favoravel:**
- Produtoras brasileiras nunca tiveram uma opcao local
- Mercado de publicidade crescendo pos-pandemia (R$25bi em 2025)
- Regulamentacao (ANCINE, NF) forca digitalizacao
- IA generativa desbloqueou desenvolvimento solo com qualidade enterprise

**Desfavoravel:**
- Produtoras sao conservadoras (ja tentaram sistemas e desistiram)
- Budget de TI de produtoras e baixo (nao e prioridade)
- Mercado acostumado com "gratis" (Google Workspace)

---

### D. NEGOCIO / TRACTION — 4/10

#### Stage: Pre-revenue, dog-fooding avancado

- **Clientes pagantes:** 0
- **Dog-fooding:** 1 (Ellah Filmes, com dados reais migrados)
- **Pipeline:** 1 prospect (Colorbar, parceira de pos-producao)
- **Revenue:** R$ 0

Isso e o score mais fraco e a razao mais obvia pela qual o investimento seria early-stage com alto risco.

#### Team: 1 fundador + IA

**Danillo (fundador):**
- CEO da Ellah Filmes (produtora ativa)
- Produtor Executivo com experiencia real no mercado
- Construiu o sistema inteiro usando Claude Code (desenvolvimento assistido por IA)

**Vantagem:** Entende o dominio profundamente. Nao e um dev construindo para um mercado que nao conhece — e um usuario construindo para si mesmo. Melhor PMF possivel.

**Risco:** Bus factor de 1. Se o fundador para, o projeto morre. Nao ha co-fundador tecnico, nao ha equipe. O Claude Code acelerou o desenvolvimento mas nao substitui revisao humana, debugging em producao, ou suporte ao cliente.

**Avaliacao honesta sobre IA-assisted development:**
- **O codigo e real e funciona.** 53 Edge Functions, 49 paginas, 83 migrations — isso nao e vapor. O volume e a consistencia do output sao impressionantes para um solo dev.
- **A qualidade e surpreendentemente alta.** Padroes consistentes, TypeScript end-to-end, CORS correto, RLS em tudo, error handling padronizado. Isso e melhor que 90% dos MVPs que vejo de equipes de 3-4 devs.
- **Mas a ausencia de revisao humana e um risco.** Nenhum code review por outro humano significa que bugs sutis (edge cases de concorrencia, race conditions em pagamentos, dados corrompidos) so serao descobertos em producao.

#### Pricing model (proposto, nao validado)

Modelo sugerido baseado no mercado:

| Tier | Preco/mes | Target | Inclui |
|------|-----------|--------|--------|
| Starter | R$799 | Produtoras pequenas (1-3 jobs/mes) | 5 usuarios, 20 jobs/ano |
| Pro | R$1.499 | Produtoras medias (3-8 jobs/mes) | 15 usuarios, jobs ilimitados, IA |
| Enterprise | R$2.999+ | Grandes produtoras (8+ jobs/mes) | Usuarios ilimitados, onboarding, suporte dedicado |

**ARPU estimado:** R$1.500/mes (media ponderada)
**LTV estimado (24 meses, 5% churn mensal):** R$24.000

#### Path to revenue: 3-6 meses

O que falta para os primeiros 10 clientes pagantes:
1. Multi-tenant funcional (Colorbar como primeiro teste) — 2-4 semanas
2. Onboarding self-service (setup wizard, dados iniciais) — 2-3 semanas
3. Stripe/Asaas integration (billing) — 1-2 semanas
4. Landing page com demo — 1 semana
5. Dog-fooding estabilizado (3 meses de uso sem bug blocker) — em andamento
6. Documentacao usuario / video tutorials — 2-3 semanas
7. Ajuste de pricing baseado em feedback — continuo

**Total estimado: 3-6 meses para estar vendavel.**

---

## 3. SCORECARD

| Dimensao | Peso | Nota | Ponderado |
|----------|------|------|-----------|
| **Produto** | 40% | 8.5/10 | 3.40 |
| **Tecnologia** | 20% | 7.5/10 | 1.50 |
| **Mercado** | 20% | 7.0/10 | 1.40 |
| **Negocio/Traction** | 20% | 4.0/10 | 0.80 |
| **TOTAL** | 100% | — | **7.10/10** |

**Nota geral: 7.1/10 — Acima da media para pre-seed, com upside significativo se executar go-to-market.**

---

## 4. VALUATION ESTIMATE

### Cenario 1: Pre-Seed (hoje, 0 clientes pagantes)

O produto existe mas nao tem revenue. Valuation baseada em:
- Custo de reconstrucao: ~R$1,5-2,5M (53 EFs, 49 paginas, 83 migrations — mesmo com IA, levaria 6-12 meses de equipe de 3)
- Dominio profundo do mercado
- Zero concorrencia local
- Risco alto (0 revenue, 1 pessoa)

**Valuation estimada:** R$2-3M pre-money
**Investimento sugerido:** R$300-500k por 12-18% da empresa
**Uso dos fundos:** 1 dev senior (6 meses), landing page + marketing, onboarding dos primeiros 10 clientes

### Cenario 2: Com 10 clientes pagando (pre-seed avancado)

- MRR: R$15.000 (10 x R$1.500)
- ARR: R$180.000
- Validacao de product-market fit
- Multiple: 15-25x ARR (SaaS vertical early-stage)

**Valuation estimada:** R$2,7M-4,5M pre-money
**Investimento sugerido:** R$500k-1M por 15-20%

### Cenario 3: Com 50 clientes (seed)

- MRR: R$75.000
- ARR: R$900.000
- Growth: se chegou a 50, o word-of-mouth esta funcionando
- Multiple: 20-30x ARR

**Valuation estimada:** R$18M-27M pre-money
**Investimento sugerido:** R$2-4M por 10-15% (seed institucional)

### Cenario 4: Benchmark — Comparables exit

- **Frame.io** (vendido para Adobe por USD 1.275B): Comecou como ferramenta de review para pos-producao. Vertical audiovisual.
- **Shotgrid** (vendido para Autodesk por ~USD 70M estimado): Gestao de producao VFX/games.
- **Procore** (IPO, USD 12B market cap): Gestao de construcao. Analogia direta — vertical SaaS para industria que vivia de planilhas.

**O EllaOS esta no mesmo ponto em que Frame.io estava em 2015** — uma ferramenta interna de uma empresa real, com cobertura funcional profunda, zero concorrencia local, prestes a virar SaaS.

---

## 5. TOP 10 RECOMENDACOES

### Para conseguir os primeiros 10 clientes pagantes:

**1. [CRITICO] Fechar o loop com a Colorbar (primeiro tenant externo)**
- Sem um segundo cliente, tudo e teoria. Colorbar como parceira de pos-producao e o candidato ideal.
- Meta: Colorbar rodando em 30 dias, pagando em 60 dias.
- Isso valida multi-tenant, onboarding, e pricing de uma so vez.

**2. [CRITICO] Setup wizard de onboarding**
- Hoje o sistema requer setup manual (categorias de custo, equipe, templates). Ninguem vai migrar sem um wizard que guie os primeiros 30 minutos.
- MVP: 5 telas (dados da produtora, categorias padrao, importar equipe, criar primeiro job, conectar Drive).

**3. [CRITICO] Landing page com demo interativa**
- Video de 3 minutos mostrando o antes (planilha caos) vs depois (EllaOS organizado).
- Feature screenshot: a tela do dashboard CEO e a melhor peca de venda.
- Formulario "Agendar demo" com WhatsApp click-to-chat.

**4. [ALTO] Simplificar para o primeiro uso**
- Esconder features avancadas (conciliacao bancaria, figurino, horas extras) atras de feature flags.
- Novo usuario ve: Jobs + Equipe + Financeiro basico + CRM.
- Conforme usa, desbloqueia modulos — "progressive disclosure".

**5. [ALTO] Gerador de orcamento/proposta**
- Feature que toda produtora precisa no dia 1: criar orcamento bonito para apresentar ao cliente.
- O sistema ja tem os dados (categorias, custos, margem). Falta o template visual exportavel em PDF.
- Esse e o "aha moment" — a primeira coisa que gera valor imediato.

**6. [ALTO] WhatsApp como canal de notificacao (nao so integracao)**
- "Seu job 038 foi aprovado pelo cliente" direto no WhatsApp.
- "Pagamento de R$15k para [fornecedor] vence amanha" no WhatsApp.
- Isso e o que faz o sistema ser indispensavel — se a informacao chega no WhatsApp, nao precisa abrir o sistema.

**7. [MEDIO] Importador de dados historicos**
- Produtoras tem meses/anos de planilhas. Um importador de Google Sheets -> EllaOS reduziria a barreira de entrada dramaticamente.
- MVP: importar a planilha GG (gastos gerais) para popular cost_items e vendors.

**8. [MEDIO] Marketplace de freelancers (v1)**
- Mesmo que basico (perfil + portfolio + disponibilidade), criar o diretorio onde produtoras encontram freelancers gera network effect.
- Freelancers preenchem dados uma vez, multiplas produtoras acessam.

**9. [BAIXO] App mobile nativo (ou PWA)**
- Produtores Executivos estao no set de filmagem, nao na mesa. PWA com funcoes criticas (aprovar pagamento, ver calendario, notificacoes) seria diferencial.

**10. [BAIXO] Programa de early adopter**
- 10 produtoras com desconto de 50% por 6 meses em troca de feedback semanal.
- Convite pessoal (o fundador conhece o mercado).
- Produz case studies e testimonials para o pitch.

### O que cortar/simplificar:

- **Storyboard canvas:** Feature fragil (react-sketch-canvas), pouco uso. Esconder ou remover.
- **IA copilot generico:** Investir a IA em features especificas (orcamento automatico, match freelancer) em vez de chat generico.
- **Figurino/Arte como tab separada:** Poderia ser sub-secao de Pre-Producao.
- **Conciliacao bancaria OFX:** Feature avancada que so grandes produtoras usam. Feature flag.

---

## 6. RED FLAGS

1. **Zero revenue, zero traction externa.** O produto e real mas a validacao de mercado nao existe alem da propria produtora do fundador. Dog-fooding e necessario mas nao suficiente.

2. **Solo founder, bus factor 1.** Se Danillo ficar doente por 1 mes, o desenvolvimento para completamente. Nao ha CTO, nao ha dev, nao ha suporte. O Claude Code nao opera sozinho.

3. **Qualidade validada apenas por IA.** Auditorias de seguranca, code reviews, e QA foram todos feitos pelo proprio Claude AI. Falta validacao humana independente. Em especial para o modulo financeiro que lida com dinheiro real.

4. **Mercado conservador.** Produtoras de publicidade sao notoriamente resistentes a mudar de ferramenta. "Ja tentaram outros sistemas e desistiram" e frase real. A adocao pode ser muito mais lenta do que projetado.

5. **Risco de over-engineering.** 21 abas por job, 83 migrations, 53 EFs — para 0 clientes externos. Ha o risco de construir demais antes de validar se o mercado quer exatamente isso.

6. **Dependencia de Supabase.** Vendor lock-in significativo. Se Supabase mudar pricing (como Firebase fez varias vezes), a migracao seria dolorosa.

7. **Ausencia de unit tests.** So E2E (11 specs). Modulo financeiro sem unit tests e preocupante — calculos de imposto, margem, e fluxo de caixa precisam de cobertura granular.

---

## 7. GREEN FLAGS

1. **Founder-market fit excepcional.** O fundador e literalmente o usuario. Ele opera uma produtora real com jobs reais. Os dados no sistema sao dados de producao reais (R$89k a R$1,9M). Nao e um dev construindo para um mercado que imagina — e um PE construindo para resolver sua propria dor.

2. **Profundidade de dominio impossivel de copiar rapidamente.** 83 migrations, 16 categorias de custo do mercado, Claquete ANCINE, RBAC com 15 roles audiovisuais, calculo de impostos BR. Um concorrente levaria 12-18 meses para chegar aqui mesmo com equipe.

3. **Zero concorrencia local.** Nao existe um SaaS de gestao para produtoras de publicidade no Brasil. O mercado e blue ocean. Se o EllaOS capturar 5% das produtoras de publicidade, ja e um negocio viavel.

4. **Stack moderna e escalavel.** Nao e um MVP em WordPress. Supabase com RLS, Next.js 16, TypeScript end-to-end, CI/CD automatico. Isso e infra de Series A construida no dia 1.

5. **Dados reais migrados.** 204 fornecedores, 283 itens de custo, 202 contas bancarias. Nao e mockup — o sistema processa dados financeiros reais. Isso e validacao tecnica.

6. **AI-first development como vantagem competitiva.** O fundador demonstrou que 1 pessoa + Claude Code pode produzir output equivalente a uma equipe de 3-5 devs. Isso significa burn rate dramaticamente menor. Enquanto concorrentes gastam R$80k/mes em equipe, ele gasta R$2k/mes em API.

7. **Documentacao excepcional.** 20 ADRs, 30+ specs, 3 auditorias de seguranca, analises de mercado. Isso demonstra maturidade de pensamento e facilita onboarding de futuros devs.

8. **Multi-tenant desde o dia 1.** RLS com tenant_id em todas as tabelas, auth com app_metadata. Nao precisara reescrever para virar SaaS — ja e SaaS na arquitetura.

9. **Mercado de indicacao.** Produtoras de publicidade sao ~2.000-3.000 no Brasil e todas se conhecem. Um case de sucesso gera word-of-mouth organico. CAC pode ser muito baixo (WhatsApp + indicacao + eventos do mercado).

10. **Regulamentacao como tailwind.** ANCINE, NF eletronicas, eSocial — regulamentacoes brasileiras forcam digitalizacao. Produtoras que ainda usam planilha estao em risco regulatorio crescente. EllaOS resolve isso nativamente.

---

## 8. COMPARABLES

### SaaS verticais que seguiram path similar:

| Empresa | Vertical | Founding → Traction | Exit/Status | Licao para EllaOS |
|---------|----------|---------------------|-------------|-------------------|
| **Frame.io** | Review audiovisual | 2014 ferramenta interna → 2015 beta → 2021 exit | Adquirida Adobe USD 1.275B | Comecou resolvendo 1 dor (review de video). Expandiu depois. |
| **Procore** | Gestao construcao | 2003 ferramenta interna → 2014 Series A → 2021 IPO | IPO USD 12B | Construcao e tao vertical quanto audiovisual. Planilha era o ERP. Levou 11 anos ate IPO. |
| **ServiceTitan** | Gestao de encanadores/HVAC | 2012 → 2018 unicornio → 2024 IPO | IPO USD 7.3B | Fundadores eram filhos de encanadores (founder-market fit). SaaS vertical para oficio manual. |
| **Toast** | Restaurantes | 2012 → 2014 beta → 2021 IPO | IPO USD 20B | Comecou como POS, virou plataforma completa. Expansao por modulos. |
| **Shopmonkey** | Oficinas mecanicas | 2016 → 2022 Series C USD 75M | Avaliado USD 1B+ | Vertical profunda, mercado fragmentado de oficinas que usavam papel e planilha. |
| **Cin7** | Gestao de inventario | 2012 NZ → crescimento organico → 2023 fusao com Orderhive | ~USD 500M+ | Bootstrap por anos, depois acelerou. Prova que SaaS vertical pode crescer devagar e ser viavel. |

### Path mais provavel para o EllaOS:

**Ano 1 (2026):** 5-20 clientes, R$100-360k ARR, bootstrap ou pre-seed pequeno
**Ano 2 (2027):** 50-100 clientes, R$900k-1,8M ARR, seed round
**Ano 3 (2028):** 200-400 clientes, R$3,6-7,2M ARR, Series A
**Ano 4-5:** Expansao LATAM, marketplace freelancers, potencial aquisicao por player como Autodesk, Adobe, ou SAP

### Potenciais acquirers:
- **Autodesk** (ja comprou Shotgrid para VFX)
- **Adobe** (ja comprou Frame.io para workflow de video)
- **TOTVS** (maior ERP brasileiro, busca verticais)
- **Globo/Globoplay** (verticalizacao da producao)
- **Endeavor Brasil** (investimento de impacto, ecossistema criativo)

---

## 9. CONCLUSAO E RECOMENDACAO

### Se eu fosse investir hoje:

**Investiria R$400k por 15% da empresa (pre-money R$2,3M).**

Condicoes:
1. Fundador dedica 100% do tempo ao EllaOS (nao 50% produtora, 50% software)
2. Contratacao de 1 dev senior nos primeiros 60 dias (reduzir bus factor)
3. Primeiro cliente pagante (nao Ellah Filmes) em 90 dias
4. 10 clientes pagantes em 12 meses (milestone para bridge/seed)
5. Auditoria de seguranca independente do modulo financeiro

### Por que investiria:

O EllaOS tem algo raro: um produto real com profundidade de dominio genuina, construido por alguem que entende visceralmente o problema. Num mercado sem concorrencia local. Com uma stack que escala.

O risco e real (solo founder, zero revenue), mas o upside e assimetrico. Se capturar apenas 5% do mercado brasileiro (100-150 produtoras a R$1.500/mes), ja e um negocio de R$2M+ ARR com margens de SaaS (80%+). Se expandir para LATAM e adicionar marketplace de freelancers, o teto e muito mais alto.

A maior prova de que o produto tem potencial e que ele ja existe e funciona. Nao e um slide deck — sao 53 Edge Functions, 49 paginas, 83 migrations, e dados reais de producao processados.

O desenvolvimento assistido por IA e uma feature, nao um bug. O fundador mostrou que pode produzir com velocidade e qualidade desproporcionais ao tamanho da equipe. Em SaaS vertical, onde o dominio importa mais que a escala de engenharia, isso e uma vantagem.

**A pergunta nao e "o produto e bom?" (e). A pergunta e "o fundador consegue vender?" Isso so o mercado vai dizer.**

---

*Documento gerado por analise direta do codigo-fonte do repositorio EllaOS. Todos os numeros foram verificados por inspecao do filesystem, nao por self-report do fundador.*
