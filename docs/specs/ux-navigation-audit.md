# Auditoria de Navegacao do ELLAHOS

**Data:** 2026-03-11
**Avaliador:** Consultor de Produto ELLAHOS (Comercial + UX Research + Advogado do leigo)
**Escopo:** Sidebar, hierarquia de paginas, tabs do job detail, fluxos do dia-a-dia

---

## Nota Geral da Navegacao Atual: 4.5/10

**Veredicto direto:** A navegacao do ELLAHOS foi construida de forma incremental a medida que features eram adicionadas, e isso se reflete. Para um desenvolvedor que conhece o sistema, faz sentido. Para uma Produtora Executiva de 55 anos que precisa entregar resultado, e um labirinto.

---

## 1. Radiografia da Sidebar Atual

### Estrutura mapeada (o que cada role ve)

```
[Sem agrupamento]
  Dashboard           /                    (todos)
  Minha Semana        /minha-semana        (todos)

[PRODUCAO] (bolinha azul)
  Jobs                /jobs                (todos)
  Calendario          /team/calendar       (todos)
  Aprovacoes          /approvals           (todos)
  Pos-Producao        /pos-producao        (admin, ceo, PE, coord, freelancer)

[COMERCIAL] (bolinha roxa)
  Dashboard           /crm/dashboard       (admin, ceo, PE, comercial)
  Relatorio           /crm/report          (admin, ceo, PE, comercial)
  Pipeline            /crm                 (admin, ceo, PE, comercial)
  Analise de Perdas   /crm/perdas          (admin, ceo, PE)
  Clientes            /clients             (admin, ceo, PE, comercial, atendimento)
  Agencias            /agencies            (admin, ceo, PE, comercial, atendimento)

[FINANCEIRO] (bolinha verde)
  Visao Geral         /financeiro          (admin, ceo, PE, financeiro)
  Fornecedores        /financeiro/vendors  (admin, ceo, PE, financeiro)
  Calendario Pgtos    /financeiro/calendario (admin, ceo, PE, financeiro)
  Fluxo de Caixa      /financeiro/fluxo-caixa (admin, ceo, PE, financeiro)
  Validacao NFs       /financeiro/nf-validation (admin, ceo, PE, financeiro)
  Solicitar NFs       /financeiro/nf-request (admin, ceo, PE, financeiro)
  Conciliacao         /financeiro/conciliacao (admin, ceo, PE, financeiro)

[EQUIPE] (bolinha amarela)
  Pessoas             /people              (todos)
  Atendimento         /atendimento         (admin, ceo, PE, coord, atendimento)
  Portal              /portal              (admin, ceo, PE, atendimento)
  Relatorios          /reports             (admin, ceo, PE)

[ADMIN] (bolinha cinza)
  Equipe              /admin/equipe        (admin, ceo)
  Configuracoes       /settings            (admin, ceo)
  Pre-Producao        /admin/pre-producao  (admin, ceo)
  Categorias Custo    /admin/financeiro/categorias (admin, ceo)
  Importar Dados      /admin/import        (admin, ceo)
  Audit Log           /admin/audit-log     (admin, ceo)
```

### Total de itens na sidebar: 25 itens (para admin/ceo)

---

## 2. Estrutura de Paginas Real (47 page.tsx)

```
/                                    Dashboard CEO
/minha-semana                        Minha Semana (PE/Coord)
/jobs                                Lista de Jobs
/jobs/[id]                           Detalhe do Job (21 tabs)
/jobs/[id]/financeiro                Sub-pagina financeiro do job
/jobs/[id]/financeiro/custos         Planilha de custos do job
/jobs/[id]/financeiro/orcamento      Orcamento do job
/jobs/[id]/financeiro/verbas         Verbas do job
/jobs/[id]/financeiro/dashboard      Dashboard financeiro do job
/jobs/[id]/financeiro/calendario     Calendario financeiro do job
/approvals                           Aprovacoes pendentes
/team/calendar                       Calendario de equipe
/pos-producao                        Dashboard pos-producao cross-job
/crm                                 Pipeline CRM (Kanban)
/crm/[id]                            Detalhe oportunidade CRM
/crm/dashboard                       Dashboard CRM
/crm/report                          Relatorio CRM
/crm/perdas                          Analise de perdas
/clients                             Lista de clientes
/clients/[id]                        Detalhe cliente
/agencies                            Lista de agencias
/agencies/[id]                       Detalhe agencia
/financeiro                          Visao geral financeiro
/financeiro/vendors                  Fornecedores
/financeiro/calendario               Calendario de pagamentos
/financeiro/fluxo-caixa              Fluxo de caixa
/financeiro/nf-validation            Validacao de NFs
/financeiro/nf-request               Solicitacao de NFs
/financeiro/conciliacao              Conciliacao bancaria
/financeiro/custos-fixos             Custos fixos (NAO na sidebar!)
/people                              Lista de pessoas
/people/[id]                         Detalhe pessoa
/atendimento                         Dashboard atendimento
/atendimento/aprovacao-interna/[id]  Aprovacao interna
/portal                              Sessoes do portal
/reports                             Relatorios
/notifications                       Notificacoes (NAO na sidebar!)
/settings                            Configuracoes
/settings/company                    Dados da empresa
/settings/integrations               Integracoes
/settings/notifications              Config notificacoes
/admin/equipe                        Gestao de equipe (convites)
/admin/pre-producao                  Config checklist pre-producao
/admin/financeiro/categorias         Categorias de custo
/admin/import                        Importar dados
/admin/audit-log                     Audit log
/admin/settings                      Settings admin (duplicado?)
```

---

## 3. Tabs do Job Detail (21 abas em 5 grupos)

```
[INFO] (azul)
  Geral, Equipe, Entregaveis

[PRODUCAO] (azul)
  PPM, Diarias, Locacoes, Storyboard, Elenco, Ordem do Dia,
  Relatorio de Set, Figurino/Arte

[GESTAO] (verde)
  Financeiro, Cronograma, Aprovacoes, Contratos, Claquete,
  Atendimento, Horas Extras

[POS-PRODUCAO] (azul)
  Pos-Producao

[REGISTRO] (cinza)
  Historico, Portal
```

---

## 4. Problemas Criticos Identificados

### PROBLEMA 1: Duplicacao de conceitos entre sidebar e job tabs
**Gravidade: CRITICA**

| Conceito | Sidebar | Job Tab | Confusao |
|----------|---------|---------|----------|
| Aprovacoes | /approvals (pagina propria) | Tab Aprovacoes dentro do job | PE nao sabe onde ir |
| Pos-Producao | /pos-producao (dashboard) | Tab Pos-Producao no job | Qual e o "certo"? |
| Atendimento | /atendimento (dashboard) | Tab Atendimento no job | Dois lugares pro mesmo fluxo |
| Portal | /portal (pagina propria) | Tab Portal no job | Sessoes globais vs por job |
| Financeiro | /financeiro (7 sub-paginas) | Tab Financeiro no job + 5 sub-pages | Parece dois sistemas |
| Calendario | /team/calendar | Tab Diarias no job | Calendario e diarias? |

**Impacto:** O usuario ve "Aprovacoes" na sidebar e "Aprovacoes" dentro do job e pensa: "Sao a mesma coisa? Sao diferentes? Onde eu clico?" Isso e a DEFINICAO de "nao estar a prova de burro."

**Regra de ouro violada:** Uma funcao deve ter UM lugar obvio. Se existe em dois lugares, precisa ficar muito claro que um e a visao global (cross-job) e outro e a visao especifica (dentro do job).


### PROBLEMA 2: Grupo "Equipe" e um balaio de gato
**Gravidade: ALTA**

O grupo "Equipe" na sidebar contem:
- **Pessoas** -- OK, cadastro de pessoas
- **Atendimento** -- Dashboard de atendimento (nada a ver com "equipe")
- **Portal** -- Sessoes do portal do cliente (nada a ver com "equipe")
- **Relatorios** -- Relatorios financeiros e performance (nada a ver com "equipe")

**Impacto:** Uma PE procurando relatorios NAO vai olhar dentro de "Equipe". Uma PE procurando o atendimento ao cliente NAO vai procurar em "Equipe".

"Equipe" sugere: gerenciar pessoas, convidar membros, ver quem esta em qual job. Nao sugere: atendimento ao cliente, portal de aprovacao, relatorios gerenciais.


### PROBLEMA 3: Financeiro fragmentado entre global e job
**Gravidade: ALTA**

Mapa do financeiro:
- Sidebar: 7 itens (Visao Geral, Fornecedores, Calendario Pgtos, Fluxo de Caixa, Validacao NFs, Solicitar NFs, Conciliacao)
- Job tab: Financeiro + 5 sub-paginas (custos, orcamento, verbas, dashboard, calendario)
- Pagina orfao: /financeiro/custos-fixos (nao aparece na sidebar!)

**Impacto:** A PE que quer ver quanto gastou no Job 038 precisa:
1. Ir em Jobs
2. Clicar no job 038
3. Clicar na tab Financeiro
4. Clicar em "Custos do Job"
= 4 cliques. E se ela quiser ver o calendario de pagamentos desse job especifico? Outro caminho.

E o financeiro global (sidebar) fala de "Validacao NFs" e "Conciliacao" -- termos que um PE leigo nao domina.


### PROBLEMA 4: Dois "Dashboards" competindo
**Gravidade: MEDIA-ALTA**

- "/" = Dashboard CEO (KPIs, pipeline, alertas, graficos)
- "/minha-semana" = Dashboard PE/Coord (jobs, entregas, diarias)
- "/crm/dashboard" = Dashboard CRM
- "/atendimento" = Dashboard Atendimento

Uma PE entra e ve "Dashboard" na sidebar. Clica. Ve numeros de CEO. Pensa: "Isso nao e pra mim." Vira resistencia ao sistema.

"Minha Semana" e o dashboard CERTO pra PE, mas esta como segundo item, nao como primeiro. E o nome "Minha Semana" nao diz claramente "esta e a sua central de trabalho."


### PROBLEMA 5: 21 abas e demais dentro de um job
**Gravidade: MEDIA-ALTA**

Mesmo com o agrupamento em 5 categorias, 21 abas e avassalador. O sistema inteligente de "abas por fase" ajuda (na fase comercial, so mostra 5 abas), mas:

- A PE que acaba de entrar no sistema ve 5+ abas e ja fica perdida
- Termos como "PPM", "Claquete", "Storyboard" -- a PE sabe o que sao no mercado, mas nao espera encontrar DENTRO de um sistema de gestao
- "Horas Extras" e "Claquete" estao no grupo "Gestao" (junto com Financeiro e Cronograma) -- nao faz sentido semantico
- "Entregaveis" esta no grupo "Info" mas e mais sobre producao/pos

O agrupamento esta errado. "Gestao" virou o novo "balaio de gato."


### PROBLEMA 6: Nomenclatura inconsistente e confusa
**Gravidade: MEDIA**

| Termo na sidebar | Significado real | O que leigo entende |
|-----------------|-----------------|-------------------|
| Pipeline | CRM / Kanban de oportunidades | Encanamento? Etapas? |
| Validacao NFs | Conferir notas fiscais recebidas | Validar o que? |
| Conciliacao | Conferir extrato bancario vs sistema | Conciliar o que com o que? |
| PPM | Pre-Production Meeting | Reuniao de pre? |
| Claquete | Controle de takes no set | A de cinema? No computador? |
| Portal | Sessoes de aprovacao para cliente externo | Portal de que? |

**Regra violada:** Termos devem ser auto-explicativos. Se precisa de tooltip pra entender, ta errado.


### PROBLEMA 7: URL paths desorganizados
**Gravidade: BAIXA (tecnico, mas impacta percepcao)

- /team/calendar -- por que "team" e nao "calendario"?
- /people -- por que nao /equipe/pessoas?
- /approvals -- por que nao /aprovacoes?
- /admin/equipe vs /people -- dois gerenciamentos de pessoas
- /admin/settings vs /settings -- duplicacao

Usuarios que compartilham links ficam confusos. "Me manda o link do calendario" = /team/calendar (que nome e esse?)


### PROBLEMA 8: Paginas orfas (existem mas nao estao na sidebar)
**Gravidade: MEDIA**

- `/financeiro/custos-fixos` -- existe como pagina mas nao tem link na sidebar
- `/notifications` -- pagina de notificacoes sem link na sidebar
- `/admin/settings` -- existe separado de `/settings`
- `/settings/company`, `/settings/integrations`, `/settings/notifications` -- sub-paginas que so sao acessiveis de dentro de /settings

**Impacto:** Features que existem mas ninguem encontra = features que nao existem.

---

## 5. Analise de Fluxos do Dia-a-Dia

### Fluxo A: PE quer ver status dos jobs da semana
**Caminho atual:**
1. Login -> Dashboard CEO (nao e pra ela) -> 2. Clicar "Minha Semana" -> 3. Ver jobs
= **2 cliques** (seria 1 se a home fosse Minha Semana pra PE)

**Ideal:** 1 clique (home personalizavel por role)


### Fluxo B: PE quer ver equipe + custos de um job especifico
**Caminho atual:**
1. Sidebar -> Jobs -> 2. Encontrar job na lista -> 3. Clicar no job -> 4. Tab Equipe (ja aberta? nao, abre em Geral) -> 5. Clicar Equipe -> 6. Voltar pro nivel de grupo e ir pra Gestao -> 7. Clicar Financeiro -> 8. Clicar Custos do Job (sub-page)
= **6-8 cliques** para ver equipe E custos de um unico job

**Ideal:** 3 cliques (Jobs -> Job -> Financeiro ja mostra resumo)


### Fluxo C: PE quer aprovar algo
**Caminho atual:** Onde clicar?
- Opcao 1: Sidebar -> Aprovacoes (pagina global) -> encontrar a aprovacao -> clicar
- Opcao 2: Sidebar -> Jobs -> Job especifico -> Tab Aprovacoes
- Opcao 3: Sidebar -> Atendimento -> Tab Aprovacoes Pendentes
= **3 caminhos diferentes** para a mesma acao. CONFUSO.

**Ideal:** 1 caminho claro. Notificacao leva direto pro contexto.


### Fluxo D: CEO quer ver faturamento
**Caminho atual:**
1. Login -> Dashboard (OK, tem alguns numeros) -> mas se quiser detalhes: 2. Sidebar -> Financeiro -> Visao Geral
OU: Sidebar -> Relatorios (dentro de "Equipe"??) -> Tab Financeiro
= **2-3 cliques, 2 caminhos**

**Ideal:** Dashboard CEO ja mostra os numeros importantes. Link direto para drill-down.


### Fluxo E: Coordenador quer atualizar pre-producao
**Caminho atual:**
1. Sidebar -> Jobs -> 2. Clicar no job -> 3. Grupo "Producao" -> 4. Tab PPM (ou Diarias, ou Locacoes)
= **4 cliques** minimos, aceitavel

**Mas:** Se o job esta na fase "comercial", as abas de pre-producao estao ESCONDIDAS (filtro por fase). Coordenador precisa clicar "Mostrar todas as abas" primeiro.
= **5 cliques** com um botao contra-intuitivo no meio.


### Fluxo F: Alguem quer achar uma funcionalidade
**Teste:** "Onde configuro o checklist de pre-producao?"
Resposta: Admin -> Pre-Producao. Mas por que esta em Admin e nao em Producao?

**Teste:** "Onde vejo as pessoas da minha equipe?"
Resposta: Depende. Quer ver todas as pessoas? "Equipe" -> Pessoas. Quer gerenciar usuarios (convidar)? Admin -> Equipe. Quer ver quem esta no job? Job -> Tab Equipe.
= 3 "equipes" diferentes em 3 lugares diferentes.

---

## 6. Analise Competitiva da Navegacao

### Monday.com
- Sidebar ultra-limpa: Espacos de trabalho -> Boards -> Itens
- Maximo 8-10 itens na sidebar
- Zero duplicacao

### StudioBinder
- Sidebar por projeto: Dashboard, Call Sheets, Shot Lists, Scripts
- Navegacao contextual (dentro do projeto)
- Maximo 12 itens no contexto do projeto

### Trello
- Boards -> Listas -> Cards
- Zero sidebar (tudo visual)
- 0 confusao

### ELLAHOS atual
- 25 itens na sidebar (admin ve tudo)
- 21 abas dentro do job
- 47 paginas no total
- Duplicacoes multiplas
= Complexidade de ERP enterprise, em sistema que deveria ser simples

---

## 7. Proposta de Reorganizacao

### Principio 1: Navegacao centrada no Job
O job e o centro do universo da produtora. TUDO deveria fluir a partir dele.

### Principio 2: Maximo 12 itens na sidebar
Usuarios leigos se perdem com mais de 12 opcoes. Agrupamentos ajudam, mas os itens dentro dos grupos devem ser poucos.

### Principio 3: Sem duplicacao de conceito
Se "Aprovacoes" existe como pagina global, nao deveria se chamar "Aprovacoes" na tab do job. Deve ser "Aprovar Entrega" ou similar, contextualizando.

### Principio 4: Nome = funcao obvia
Nada de "Pipeline", "Conciliacao", "Portal". Usar linguagem de produtora.

---

### Sidebar Proposta (reorganizada)

```
[INICIO]
  Minha Semana          /minha-semana       (primeiro item! PE comeca aqui)
  Painel Geral          /                   (dashboard CEO - rename)

[PRODUCAO]
  Jobs                  /jobs               (tudo do job esta DENTRO do job)
  Calendario            /calendario         (rename de /team/calendar)
  Pos-Producao          /pos-producao       (dashboard cross-job, manter)

[COMERCIAL]
  Oportunidades         /crm                (rename de "Pipeline")
  Clientes              /clients
  Agencias              /agencies

[FINANCEIRO]
  Visao Geral           /financeiro
  Pagamentos            /financeiro/calendario  (rename "Calendario Pgtos")
  Fluxo de Caixa        /financeiro/fluxo-caixa
  Notas Fiscais         /financeiro/nf-validation  (merge NF validation + request)

[RELATORIOS]
  Relatorios            /reports            (saiu de "Equipe")
  Comercial             /crm/dashboard      (rename, saiu de "Comercial")
  Analise de Perdas     /crm/perdas         (saiu de "Comercial")

[CONFIGURACOES]
  Equipe & Acessos      /admin/equipe       (merge admin equipe + people)
  Cadastro de Pessoas   /people             (manter separado, mas renomear)
  Configuracoes         /settings
```

**Para admin/ceo, acrescenta:**
```
  Categorias de Custo   /admin/financeiro/categorias
  Checklist Pre-Prod    /admin/pre-producao
  Importar Dados        /admin/import
  Audit Log             /admin/audit-log
```

**Itens REMOVIDOS da sidebar (movidos):**
- "Aprovacoes" (/approvals) -> Virou widget em "Minha Semana" + badge no job
- "Atendimento" (/atendimento) -> Conteudo absorvido por "Minha Semana" para PE/Coord
- "Portal" (/portal) -> Acessivel DENTRO do job (tab Portal) + link em Minha Semana
- "Fornecedores" (/financeiro/vendors) -> Sub-pagina de Financeiro (link interno)
- "Conciliacao" (/financeiro/conciliacao) -> Sub-pagina de Financeiro (link interno)
- "Solicitar NFs" (/financeiro/nf-request) -> Merge com Notas Fiscais
- CRM Dashboard e Report -> Consolidados em "Relatorios"

**Contagem nova:** 15-18 itens (vs 25 atualmente), agrupados logicamente

---

### Job Tabs Proposta (reorganizada em 4 grupos mais claros)

```
[VISAO GERAL]
  Resumo            (merge Geral + KPIs financeiros resumidos)
  Equipe            (manter)
  Cronograma        (manter)
  Historico         (manter)

[PRE-PRODUCAO]
  Checklist PPM     (rename de PPM - "Reuniao de Pre-Producao")
  Diarias & Locais  (merge Diarias + Locacoes -- sempre andam juntas)
  Elenco            (manter)
  Figurino & Arte   (manter)
  Storyboard        (manter)
  Ordem do Dia      (manter)

[PRODUCAO & SET]
  Relatorio de Set  (manter - rename de "Diario")
  Claquete          (manter)
  Horas Extras      (manter)

[ENTREGA & FINANCEIRO]
  Custos            (acesso direto ao financeiro, sem sub-pagina intermediaria)
  Entregaveis       (manter)
  Contratos         (manter)
  Pos-Producao      (manter)
  Aprovacao Cliente  (rename de "Portal" - mais claro)
  Aprovacoes        (rename de "Aprovacoes" - ficam aqui, dentro do job)
```

**Removido de tabs:**
- "Atendimento" (tab) -> Absorvido por "Resumo" (notas do atendimento aparecem no resumo)

**Resultado:** 4 grupos com 3-6 itens cada (vs 5 grupos com ate 8 itens)

---

## 8. Problemas de UX para Usuario Leigo

### 8.1 Teste dos 5 segundos -- FALHA
- Sidebar tem 25 itens, organizados em 6 secoes com bolinhas de cor
- Uma PE de 55 anos olha e pensa: "O que significam essas bolinhas? Qual secao eu clico?"
- Os agrupamentos nao tem titulo suficientemente grande (text-[11px] uppercase tracking-wider)
- As bolinhas de cor (1.5x1.5 rounded-full) sao MINUSCULAS -- dificil ver diferenca

### 8.2 Teste da mae -- FALHA
- "Pipeline" -- minha mae nao sabe o que e
- "Conciliacao" -- minha mae nao sabe o que e
- "PPM" -- sigla que ninguem fora da industria conhece
- "Portal" -- portal de que?
- Dois itens chamados "Dashboard" (/ e /crm/dashboard)
- Dois itens chamados "Equipe" (/people area equipe e /admin/equipe area admin)
- "Relatorios" esta dentro do grupo "Equipe" (???)

### 8.3 Teste do WhatsApp -- FALHA PARCIAL
- Aprovar algo: 3 caminhos, 3-5 cliques
- Ver custos de um job: 6-8 cliques
- Pelo celular no set: sidebar colapsa pra icones, mas 25 icones e impossivel

### 8.4 Teste da planilha -- FALHA PARCIAL
- A planilha do Google Sheets tem TUDO em uma tela (abas embaixo)
- O ELLAHOS tem 21 abas divididas em 5 grupos com scroll horizontal
- Vantagem: dados conectados, calculos automaticos
- Desvantagem: mais cliques pra chegar na informacao

### 8.5 Teste do "e dai?" -- PASSA
- Quando o usuario ENCONTRA a funcao certa, ela entrega valor
- Problema e ENCONTRAR, nao USAR

### 8.6 Teste de acessibilidade 55+ -- FALHA
- Titulos de secao da sidebar: 11px uppercase = ILEGIVEL para 55+
- Bolinhas de area: 6px (1.5 tailwind) = praticamente invisiveis
- Tabs do job: texto xs em mobile = muito pequeno
- Separador entre collapsed sections: border-border/50 = contraste insuficiente

### 8.7 Teste de venda -- FALHA
- Se eu mostrar essa sidebar num pitch de 3 min, o prospect pensa: "E complexo demais"
- Concorrentes (Monday, Trello) tem visual mais limpo na sidebar
- O "wow factor" do ELLAHOS esta nas features (Kanban, IA, WhatsApp), nao na navegacao
- Navegacao confusa MATA a primeira impressao

---

## 9. Quick Wins (implementacao em 1-2 dias cada)

### QW-01: Renomear itens confusos na sidebar
**Esforco: 1h | Impacto: ALTO**

| Atual | Proposto | Razao |
|-------|----------|-------|
| Pipeline | Oportunidades | Ninguem fala "pipeline" no dia-a-dia |
| Calendario Pgtos | Pagamentos | Mais curto e claro |
| Validacao NFs | Notas Fiscais | "Validacao" e tecnico demais |
| Solicitar NFs | (merge com Notas Fiscais) | Nao precisa de item separado |
| Conciliacao | (mover pra sub-pagina) | Confuso como item principal |
| Dashboard (CRM) | CRM: Resumo | Distinguir dos outros dashboards |
| Dashboard (/) | Painel Geral | Distinguir de Minha Semana |

**Arquivo a editar:** `frontend/src/lib/constants.ts` (SIDEBAR_SECTIONS)


### QW-02: Trocar ordem - Minha Semana primeiro
**Esforco: 10min | Impacto: ALTO**

Mover "Minha Semana" para o primeiro item da sidebar (antes de Dashboard). A PE abre o sistema e ja ve SEUS jobs, SUAS entregas, SUAS diarias. O "Painel Geral" (dashboard CEO) fica como segundo.

**Arquivo a editar:** `frontend/src/lib/constants.ts` (SIDEBAR_SECTIONS, primeiro array)


### QW-03: Aumentar tamanho dos titulos de secao
**Esforco: 30min | Impacto: MEDIO**

Mudar de `text-[11px]` para `text-xs` (12px). Mudar bolinhas de `h-1.5 w-1.5` para `h-2 w-2`. Adicionar um icone de area ao lado do titulo para reforcar visualmente.

**Arquivo a editar:** `frontend/src/components/layout/Sidebar.tsx`


### QW-04: Mover "Relatorios" para fora de "Equipe"
**Esforco: 10min | Impacto: MEDIO**

"Relatorios" e uma funcao de GESTAO, nao de EQUIPE. Criar uma secao propria ou colocar junto com Financeiro.

**Arquivo a editar:** `frontend/src/lib/constants.ts` (SIDEBAR_SECTIONS)


### QW-05: Eliminar duplicacao "Equipe" (sidebar)
**Esforco: 30min | Impacto: MEDIO**

Renomear "Pessoas" (em Equipe) para "Cadastro de Pessoas" ou "Banco de Talentos". Renomear "Equipe" (em Admin) para "Usuarios & Acessos" ou "Gerenciar Equipe". Dois itens chamados "Equipe" e inaceitavel.

**Arquivo a editar:** `frontend/src/lib/constants.ts`


### QW-06: Adicionar breadcrumbs em TODAS as paginas
**Esforco: 1 dia | Impacto: ALTO**

O job detail ja tem breadcrumbs (Jobs > 036 - Titulo). Mas outras paginas nao. Toda pagina deveria ter breadcrumbs mostrando: Inicio > Area > Pagina. Isso elimina a sensacao de "estou perdido".

**Componente a criar/expandir:** Breadcrumbs ja existe (`useBreadcrumbOverride`), expandir para todas as paginas.


### QW-07: Tooltip nos itens da sidebar collapsed
**Status: JA IMPLEMENTADO** (boa noticia!)

Os tooltips com side="right" ja existem quando a sidebar esta colapsada. Isso e bom.

---

## 10. Melhorias Estruturais (1-2 semanas)

### ME-01: Home personalizada por role
- PE/Coordenador: home = /minha-semana (nao o dashboard CEO)
- CEO/Admin: home = / (dashboard atual)
- Atendimento: home = /atendimento
- Financeiro: home = /financeiro

**Implementacao:** Redirect no middleware baseado no role do usuario.


### ME-02: Merge paginas globais em "Minha Semana"
- "Aprovacoes" (pagina standalone) -> Widget em Minha Semana + badge
- "Atendimento" -> Widget em Minha Semana para roles de atendimento
- O conceito: "Minha Semana" vira a CENTRAL UNICA de trabalho do PE

**Impacto:** Elimina 2 itens da sidebar, reduce duplicacao.


### ME-03: Unificar Notas Fiscais
- /financeiro/nf-validation + /financeiro/nf-request = 1 pagina com 2 abas
- Chamar de "Notas Fiscais" com sub-abas "Recebidas" e "Solicitar"

**Impacto:** Elimina 1 item da sidebar.


### ME-04: Financeiro do Job simplificado
- Tab "Financeiro" dentro do job deveria mostrar um RESUMO (orcado vs realizado vs margem)
- Sem forcar o usuario a navegar para sub-paginas
- Link "Ver detalhes completos" para quem quer drill-down

**Impacto:** Reduz cliques de 4 para 2 para o caso de uso mais comum.


### ME-05: Sidebar com busca global
- Atalho Ctrl+K acessivel em qualquer tela
- Busca por: nome de job, nome de cliente, nome de pessoa, funcionalidade
- Exemplo: digitar "aprovacao" mostra todas as aprovacoes pendentes
- Exemplo: digitar "038" mostra o Job 038

**Impacto:** O usuario que esta perdido digita o que quer. Resolve a navegacao por eliminacao.

---

## 11. Prioridade de Implementacao

### Imediato (esta semana)
1. **[CRITICO] QW-02:** Minha Semana como primeiro item
2. **[CRITICO] QW-01:** Renomear itens confusos
3. **[CRITICO] QW-04:** Mover Relatorios para fora de Equipe
4. **[CRITICO] QW-05:** Eliminar duplicacao "Equipe"

### Curto prazo (proxima semana)
5. **[IMPORTANTE] QW-03:** Aumentar tamanho visual secoes
6. **[IMPORTANTE] QW-06:** Breadcrumbs em todas as paginas
7. **[IMPORTANTE] ME-01:** Home personalizada por role
8. **[IMPORTANTE] ME-03:** Unificar pagina de Notas Fiscais

### Medio prazo (2-3 semanas)
9. **[NICE TO HAVE] ME-02:** Merge paginas globais em Minha Semana
10. **[NICE TO HAVE] ME-04:** Financeiro do Job simplificado
11. **[NICE TO HAVE] ME-05:** Busca global Ctrl+K
12. **[NICE TO HAVE]** Reorganizar grupos de tabs do job detail

---

## 12. Resumo Executivo

### O que esta BOM (nao mexer)
- Sistema de areas com color-coding (producao=azul, financeiro=verde, etc.) e um bom conceito
- Tabs do job com filtro por fase e inteligente e evita overwhelm
- RBAC granular por tab e sofisticado e bem implementado
- Breadcrumbs no job detail ja funcionam
- Toggle show/hide tabs e util para power users
- Tooltips na sidebar collapsed ja existem
- Error boundaries em cada tab e resiliente

### O que esta RUIM (prioridade de correcao)
1. **Duplicacao massiva** -- mesma funcao em 2-3 lugares (aprovacoes, atendimento, portal)
2. **Nomenclatura confusa** -- Pipeline, Conciliacao, PPM, Portal sem contexto
3. **25 itens na sidebar** -- demais para qualquer usuario
4. **Grupo "Equipe" incoerente** -- Atendimento, Portal e Relatorios nao pertencem ali
5. **Home errada para PE** -- Dashboard CEO e a primeira coisa que ela ve
6. **Financeiro fragmentado** -- 7 sub-paginas na sidebar + 5 sub-paginas no job
7. **Textos minusculos** -- 11px nas secoes da sidebar e ilegivel para 55+

### Nota detalhada por criterio

| Criterio | Nota | Comentario |
|----------|------|-----------|
| Organizacao logica | 3/10 | Agrupamentos nao fazem sentido semantico |
| Nomenclatura | 4/10 | Termos tecnicos e ambiguos |
| Fluxo do dia-a-dia | 5/10 | Funciona mas com muitos cliques |
| Descobribilidade | 3/10 | Funcoes escondidas ou duplicadas |
| Visual/hierarquia | 5/10 | Color-coding bom, mas textos pequenos |
| Consistencia | 4/10 | Mesma funcao com nomes diferentes |
| Acessibilidade 55+ | 4/10 | Fontes pequenas, areas de clique apertadas |
| Impressao comercial | 5/10 | Funcional mas nao impressiona |

### Nota final: 4.5/10 -> Meta pos-reorganizacao: 7.5/10

A navegacao nao e ruim porque foi mal pensada -- e ruim porque cresceu organicamente. Cada feature nova ganhou um lugar na sidebar, cada modulo novo ganhou uma tab no job. O resultado e um sistema que tem TUDO mas onde ninguem encontra NADA.

A reorganizacao proposta mantem todas as funcionalidades (nenhum backend muda), apenas redistribui a navegacao de forma que faca sentido para o usuario final -- a Produtora Executiva de 55 anos que precisa entregar resultado, nao navegar menus.
