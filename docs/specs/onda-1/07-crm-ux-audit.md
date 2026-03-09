# CRM UX Audit — ELLAHOS
> Auditoria completa de usabilidade do modulo Comercial (CRM)
> Foco: usuarios nao tech-savvy (produtores, atendimento, PEs)
> Data: 2026-03-09 | Auditor: UI/UX Designer ELLAHOS

---

## Contexto da Auditoria

O objetivo declarado pelo time e que o CRM seja "a prova de burros" — pessoas com baixa familiaridade com ferramentas digitais precisam conseguir navegar, criar oportunidades, mover pelo pipeline e converter em job SEM instrucao previa.

### Perfis de usuario avaliados
- **Atendimento**: registra consultas que chegam, faz follow-up, sem expertise tecnica
- **Produtor Executivo (PE)**: acompanha negociacoes, move stages, faz atividades
- **Coordenador/CEO**: consulta dashboard, acompanha metricas

### Metodologia
Leitura completa de todos os componentes do modulo CRM e avaliacao contra:
- Design System ELLAHOS (docs/design/design-system.md)
- Principios WCAG 2.1 AA
- Heuristicas de Nielsen
- Padroes de CRMs de referencia (Monday.com, Pipedrive, HubSpot)

---

## 1. LISTA DE FINDINGS

### CRITICOS — Bloqueiam uso por usuarios leigos

---

**[CRIT-01] Kanban sem drag handle visivel — usuario nao sabe que pode arrastar**

- **Componente:** `DraggableCard` em `CrmKanban.tsx`
- **Problema:** O card inteiro e arrastavel mas nao ha nenhum indicador visual disso. Nenhum icone de "arrastar" (GripVertical), nenhum cursor CSS `grab`, nenhum tooltip ensinando a interacao. Usuario leigo ve um cartao e clica — nao tenta arrastar.
- **Impacto:** O fluxo principal do Kanban (mover oportunidades entre etapas) e invisivel para usuarios nao familiarizados com DnD.
- **Solucao proposta:**
  - Adicionar `GripVertical` icon (16px, text-muted-foreground/40) no canto superior esquerdo do card, visivel sempre no mobile e `group-hover:opacity-100` no desktop
  - Adicionar `cursor-grab active:cursor-grabbing` ao wrapper do DraggableCard
  - Na primeira vez que o usuario acessa o Kanban (localStorage flag), exibir um tooltip/banner educativo: "Arraste os cards para mover entre etapas"

---

**[CRIT-02] Pagina detalhe sem indicacao do proximo passo obrigatorio**

- **Componente:** `OpportunityFullDetail.tsx` — Card "Acoes"
- **Problema:** O card "Acoes" lista: WhatsApp, Mover para X, Converter em Job, Pausar, Registrar vitoria, Perdemos. Para um usuario leigo, todos os botoes tem o mesmo peso visual. Nao ha indicacao de qual e a acao que o sistema "espera" que ele faca agora. O botao "Mover para [proximo stage]" usa variante `default` (filled) mas sem hierarquia clara em relacao ao "Converter em Job" (emerald filled) e "Pausar" (outline).
- **Impacto:** Usuario fica paralisado diante de multiplas acoes sem saber o que fazer.
- **Solucao proposta:**
  - Criar um bloco "Proximo passo recomendado" no topo do card "Acoes" com destaque visual (borda accent, icone seta)
  - Logica: se stage == lead → "Qualificar esta oportunidade"; se stage == proposta → "Enviar orcamento para o cliente"; se stage == negociacao → "Aguardar retorno do cliente — prazo: X"
  - Separar visualmente acoes positivas (mover, converter) de acoes negativas (pausar, perdemos) com um `<Separator>` claro e label "Encerrar negociacao"

---

**[CRIT-03] Empty state do Kanban sem CTA educativo**

- **Componente:** `KanbanColumn` em `CrmKanban.tsx`
- **Problema:** Quando uma coluna esta vazia, o estado vazio mostra um botao dashed com "Adicionar oportunidade" e um icone Plus. Quando o Kanban inteiro esta vazio (pipeline zerado), nao ha empty state da pagina inteira — apenas colunas vazias lado a lado. Usuario novo nao tem orientacao nenhuma.
- **Impacto:** Na primeira semana de uso, o usuario ve um Kanban completamente vazio sem saber o que fazer.
- **Solucao proposta:**
  - Detectar quando `pipeline.total_opportunities === 0` e renderizar um empty state centralizado NO LUGAR do Kanban, com:
    - Icone grande (Target, 48px)
    - Titulo: "Nenhuma oportunidade cadastrada ainda"
    - Descricao: "Registre aqui todas as consultas e negociacoes da produtora. Cada oportunidade representa um potencial job."
    - CTA primario: "+ Nova Oportunidade"
    - Link secundario: "Ver como funciona o pipeline" (tooltip ou modal de onboarding)

---

**[CRIT-04] Campo "Registrar atividade" sem label de instrucao — usuario nao entende o campo de texto pequeno**

- **Componente:** `OpportunityFullDetail.tsx` — secao Atividades
- **Problema:** O formulario de adicao de atividade tem um Select de tipo + um Textarea compacto (rows=1) + um botao de icone `+`. Nao ha label explicando o que e "registrar atividade". O Textarea tem placeholder "Registrar atividade..." que e removido ao digitar. O botao de envio e apenas um icone Plus sem texto. Para um leigo, e impossivel saber o que este campo faz.
- **Impacto:** O log de atividades (ligacoes, emails, reunioes) nao e preenchido porque o usuario nao entende o campo.
- **Solucao proposta:**
  - Adicionar label explicativa acima do formulario: "Registrar atividade" com subtext "Anote ligacoes, emails, reunioes e follow-ups aqui"
  - Trocar o botao icone por um botao com texto: "Salvar" (sm, com Loader2 quando pending)
  - Adicionar `aria-label` em tudo que seja icone

---

### ALTOS — Prejudicam significativamente a experiencia

---

**[ALTO-01] Breadcrumb duplicado — "voltar" e breadcrumb fazem a mesma coisa**

- **Componente:** `CrmDetailPage` em `/crm/[id]/page.tsx`
- **Problema:** A pagina de detalhe tem DOIS mecanismos de voltar: (1) breadcrumb no topo "Comercial > Titulo", (2) botao "Voltar ao Pipeline" logo abaixo. Ambos vao para `/crm`. Isso ocupa espaco vertical valioso, confunde hierarquia e e redundante.
- **Impacto:** Poluicao visual, desperdicio de espaco que poderia ser das acoes principais.
- **Solucao proposta:**
  - Manter APENAS o breadcrumb (padrao universal, usuarios reconhecem)
  - Remover o botao "Voltar ao Pipeline" separado
  - O breadcrumb ja tem link clicavel — e suficiente
  - Alternativa: integrar o back ao breadcrumb com `<ArrowLeft>` antes do primeiro item

---

**[ALTO-02] Stage badge do card sem significado claro para leigo**

- **Componente:** `OpportunityCard.tsx`
- **Problema:** O card nao mostra explicitamente em que etapa esta (o badge de stage fica no header da COLUNA, nao no card). O card mostra: titulo, agencia→cliente, badge "Concorrencia", valor, data, temperatura (Quente/Morno/Frio), assignee. O que significa "Quente"? "Morno"? Para um produtor sem experiencia com CRM, esses termos nao sao obvios.
- **Impacto:** Usuarios nao conseguem escanear o pipeline de forma significativa.
- **Solucao proposta:**
  - Adicionar tooltip no HeatIndicator: "Quente = alta chance de fechar (acima de 70%)"
  - OU substituir probabilidade% por algo mais concreto: "70% de chance" em vez de apenas "Quente"
  - Garantir que a coluna do Kanban tenha sempre o label de stage visivel (ja tem, mas analisar se e suficientemente grande)

---

**[ALTO-03] Acoes destrutivas ("Perdemos") sem modal de confirmacao — e reversivel mas parece definitivo**

- **Componente:** `OpportunityFullDetail.tsx` — botao "Perdemos"
- **Problema:** O fluxo de "Perdemos" e: clicar no botao → formulario abre inline no card → preencher motivo → "Confirmar perda". O formulario esta dentro do card "Acoes" sem destaque de perigo suficiente. Alem disso, o botao inicial "Perdemos" e ghost com `text-destructive` — visualmente parece um link, nao um botao de acao importante.
- **Solucao proposta:**
  - Mover "Perdemos" para dentro de um `Dialog` proprio (nao inline), para dar o peso correto a decisao
  - O botao "Perdemos" deve ser `variant="outline"` com borda vermelha, mais definitivo visualmente
  - No dialog, adicionar: "Tem certeza? Voce pode reativar esta oportunidade depois se necessario."
  - Manter o formulario de analise de perda no dialog

---

**[ALTO-04] ProposalSection: botao "Gerar Carta IA" disponivel so com job vinculado, mas hint e minusculo**

- **Componente:** `ProposalSection.tsx`
- **Problema:** Quando nao ha job vinculado, o botao "Gerar Carta IA" nao aparece e a unica explicacao e um texto em `text-[11px] italic opacity-70`: "Vincule a um job para gerar carta orcamento com IA." Este texto tem contraste insufficiente (11px italic muted) e passa despercebido completamente.
- **Impacto:** Usuario nao entende por que o recurso de IA nao aparece, e nao sabe o que fazer.
- **Solucao proposta:**
  - Mostrar o botao "Gerar Carta IA" sempre, mas desabilitado com `disabled` quando nao ha job
  - Adicionar tooltip no botao desabilitado: "Converta esta oportunidade em Job primeiro para usar este recurso"
  - Isso ensina o fluxo correto sem esconder funcionalidades

---

**[ALTO-05] CrmAlertsBanner: alertas de "Sem PE" e "Inativo" nao explicam o que o usuario deve fazer**

- **Componente:** `CrmAlertsBanner.tsx`
- **Problema:** O banner mostra badges como "Vencido", "Urgente", "Inativo", "Sem PE". O usuario leigo ve os badges mas nao sabe o que precisa fazer. "Inativo" significa o que? Por quanto tempo? "Sem PE" — o que eu preciso fazer?
- **Solucao proposta:**
  - Adicionar texto de acao em cada `AlertRow`: ex. "Inativo ha 7 dias — faca um follow-up"
  - OU adicionar tooltip nos badges com explicacao e acao sugerida
  - O header do banner pode ser mais acionavel: "3 oportunidades precisam de atencao" em vez de "3 alertas de follow-up"

---

**[ALTO-06] Lista CrmListView: coluna "PE" mostra so o primeiro nome, sem tooltip**

- **Componente:** `CrmListView.tsx`
- **Problema:** A coluna "PE" mostra apenas o primeiro nome (`full_name.split(' ')[0]`) com max-w-[100px] truncado. Se ha dois PEs chamados "Ana", e impossivel saber qual. Nao ha tooltip com o nome completo.
- **Solucao proposta:**
  - Adicionar `title={opp.assigned_profile.full_name}` no span ja truncado para tooltip nativo do browser
  - Ou mostrar avatar circular com iniciais + nome ao lado (padrao Monday.com)

---

**[ALTO-07] ConvertToJobDialog: usuario nao sabe o que acontece com a oportunidade apos conversao**

- **Componente:** `ConvertToJobDialog.tsx`
- **Problema:** O box de info diz: "A oportunidade sera marcada como 'ganho' e voce sera redirecionado ao novo job." Isso e tecnicamente correto mas nao explica o impacto: a oportunidade nao some, ela fica no CRM como "Fechado". Usuario leigo pode ter medo de "converter" achando que vai perder dados.
- **Solucao proposta:**
  - Expandir o texto de info: "A oportunidade ficara salva no CRM como 'Fechado'. O job criado tera todos os dados copiados automaticamente."
  - Adicionar um preview dos dados que serao copiados (ja existe a secao "Dados copiados", esta bom) mas melhorar o label: "Estes dados serao copiados automaticamente para o novo job:"

---

### MEDIOS — Prejudicam eficiencia mas nao bloqueiam

---

**[MEDIO-01] Header da pagina CRM sem contexto de quantas oportunidades estao ativas**

- **Componente:** `crm/page.tsx`
- **Problema:** O header mostra "Comercial" e "Propostas e negociacoes em andamento". O badge de total de oportunidades aparece na linha de filtros, ao lado do toggle Kanban/Lista. Nao e o lugar mais natural para essa informacao.
- **Solucao proposta:**
  - Mover o badge de total para o subtitulo do header: "Propostas e negociacoes em andamento · 12 oportunidades ativas"
  - Ou adicionar na CrmStatsBar de forma mais prominente

---

**[MEDIO-02] Botao "Atualizar" existe mas auto-refresh nao e configuravel ou indicado**

- **Componente:** `crm/page.tsx`
- **Problema:** O botao "Atualizar" manual existe. Para usuarios leigos que deixam a tela aberta o dia todo, os dados ficam stale sem indicacao visual. Em contrapartida, usuarios avancados podem achar frustrante ter que atualizar manualmente.
- **Solucao proposta:**
  - Adicionar texto discreto abaixo do botao: "Atualizado agora · auto-atualiza a cada 5 min" usando `useRelativeTime`
  - Implementar `refetchInterval: 300_000` no useCrmPipeline

---

**[MEDIO-03] Filtro "Incluir ganhos/perdidos" usa botoes pill mas nao e obvio que sao mutuamente exclusivos**

- **Componente:** `crm/page.tsx` — area de filtros
- **Problema:** Os dois filtros "Pipeline ativo" e "Incluir ganhos/perdidos" parecem botoes independentes mas sao na verdade tabs mutuamente exclusivas. O padrao visual de pill selecionado (bg-primary) funciona, mas o texto "Incluir ganhos/perdidos" implica que e um ADICIONAL ao ativo, nao uma troca.
- **Solucao proposta:**
  - Renomear para "Pipeline ativo" e "Historico completo" — mais claro
  - OU usar um componente `<Tabs>` do shadcn/ui que tem semantica correta de tabs

---

**[MEDIO-04] Coluna "Data" na ListView mostra data de criacao, nao data relevante para acao**

- **Componente:** `CrmListView.tsx`
- **Problema:** A coluna "DATA" mostra `created_at` (data em que a oportunidade foi criada). Para atendimento fazendo follow-up, a data mais relevante e `response_deadline` ou `expected_close_date`. A data de criacao e menos util no dia a dia.
- **Solucao proposta:**
  - Renomear coluna para "Criado em" para ser explicita
  - OU substituir por "Prazo" (response_deadline) e mover "Retorno" para posicao diferente
  - No minimo: adicionar tooltip "Data de entrada no pipeline" no header da coluna

---

**[MEDIO-05] ProposalSection: ao adicionar proposta manual, campo "URL do arquivo (PDF)" e texto puro**

- **Componente:** `ProposalSection.tsx`
- **Problema:** O campo URL do arquivo aceita qualquer texto. Usuario leigo pode tentar colar um caminho local (C:\Documentos\proposta.pdf) ou um link do Google Drive nao publico. Nao ha validacao ou instrucao do formato aceito.
- **Solucao proposta:**
  - Adicionar helper text abaixo do campo: "Cole o link publico do Google Drive ou Dropbox"
  - Validar se a URL comeca com `https://` antes de salvar (toast de erro amigavel)
  - Icone de informacao (Info) inline com tooltip mais detalhado

---

**[MEDIO-06] HeatIndicator nao tem aria-label — leitores de tela dizem apenas "Quente"**

- **Componente:** `OpportunityCard.tsx` — `HeatIndicator`
- **Problema:** O componente renderiza um dot colorido + texto "Quente/Morno/Frio" sem aria-label explicando o contexto.
- **Solucao proposta:**
  - `<span aria-label={`Temperatura da oportunidade: ${heat.label} (${probability}% de probabilidade)`}>`

---

**[MEDIO-07] Dashboard CRM acessivel via sidebar mas sem link visivel na pagina principal do CRM**

- **Componente:** `crm/page.tsx` — botao "Metricas"
- **Problema:** O botao "Metricas" abre um `CrmStatsDialog`. Existe tambem uma rota `/crm/dashboard` com o `CrmDashboard` completo. A relacao entre eles nao e clara — sao os mesmos dados? O dashboard completo e mais completo?
- **Solucao proposta:**
  - Se o `CrmStatsDialog` e um resumo e `/crm/dashboard` e a versao completa, adicionar link "Ver dashboard completo" dentro do dialog
  - Garantir que a sidebar aponta para `/crm/dashboard` com label claro

---

### BAIXOS — Melhorias de polimento

---

**[BAIXO-01] Cards do Kanban: ChevronRight aparece so no hover (opacity-0 → opacity-100)**

- **Componente:** `OpportunityCard.tsx`
- **Problema:** O `ChevronRight` e a unica indicacao de que o card e clicavel, mas so aparece no hover. Em mobile, hover nao existe — o usuario nunca ve o indicador de que pode clicar para ver o detalhe.
- **Solucao proposta:**
  - No mobile (`@media (hover: none)`), mostrar o ChevronRight sempre com opacity-60
  - Ou adicionar `aria-label="Ver detalhes da oportunidade"` no botao do card

---

**[BAIXO-02] Texto "vencido" e "atrasado" na data do card sem icone de alerta**

- **Componente:** `OpportunityCard.tsx`
- **Problema:** Quando um prazo esta vencido, aparece o texto "vencido" em `text-destructive`. Nao ha icone de alerta (AlertTriangle) para chamar atencao em modo de escaneamento rapido.
- **Solucao proposta:**
  - Adicionar `<AlertTriangle className="size-3" />` antes do texto "vencido" no card
  - Isso melhora scannability para quem esta fazendo triagem rapida

---

**[BAIXO-03] Stage "Fechamento" no Kanban e "Aprovacao" — nome confuso**

- **Componente:** `CrmKanban.tsx` — `STAGE_CONFIG`
- **Problema:** O stage interno `fechamento` tem label "Aprovacao" na UI. Mas na pagina de detalhe, o `NEXT_STAGE` map diz `fechamento → ganho`, e o botao diz "Mover para Aprovacao". O nome "Aprovacao" pode ser confundido com o modulo de "Aprovacao Interna" de jobs que tambem existe no sistema.
- **Solucao proposta:**
  - Renomear para "Em Aprovacao" ou "Aguardando OK" para diferenciar do modulo de aprovacao interna
  - Avaliar com o time comercial qual o termo que eles usam internamente

---

**[BAIXO-04] CrmDashboard: funil de oportunidades tem todas as barras na mesma cor (violet-500)**

- **Componente:** `CrmDashboard.tsx`
- **Problema:** O funil usa `bg-violet-500` para todas as barras. Isso nao comunica que cada etapa do funil tem uma cor propria (que ja existe no STAGE_CONFIG do Kanban). Oportunidade perdida de consistencia visual.
- **Solucao proposta:**
  - Usar a cor de cada stage do `STAGE_CONFIG` para colorir a barra correspondente no funil
  - Isso cria consistencia visual entre Kanban e Dashboard

---

**[BAIXO-05] AgencyHistoryPanel: nao foi auditado (arquivo nao incluido)**

- Verificar se o painel de historico de agencia tem empty state adequado e hierarquia clara
- Adicionar ao proximo ciclo de auditoria

---

## 2. WIREFRAMES TEXTUAIS

### 2.1 Kanban — Card com drag handle + estado vazio global

```
KANBAN PRINCIPAL (quando pipeline.total_opportunities === 0)
========================================================

+----------------------------------------------------------+
| [Target icon]  Comercial                    [+ Nova]     |
|                Propostas e negociacoes                   |
+----------------------------------------------------------+
| [Stats bar compacta]                                     |
| [Separator]                                              |
+----------------------------------------------------------+
|                                                          |
|              [Target icon 48px, muted]                   |
|                                                          |
|          Nenhuma oportunidade cadastrada                 |
|                                                          |
|   Registre aqui consultas e negociacoes da produtora.    |
|   Cada oportunidade e um potencial job.                  |
|                                                          |
|              [ + Nova Oportunidade  ]  <- primary btn    |
|                                                          |
|     Como funciona o pipeline? <- link/tooltip            |
|                                                          |
+----------------------------------------------------------+


CARD NO KANBAN (com drag handle visivel)
=========================================

+---[col header: "Em Analise  3  R$85K  [+]]--+
|                                              |
| +------------------------------------------+|
| | [::] Campanha Verao Nike               > ||  <- [::] = GripVertical, opacity-40
| |      ← drag handle sempre visivel        ||
| |  [Building2] Agencia W + 1 → Nike Brazil ||
| |  [Shield] Concorrencia                   ||
| |  R$ 45K               [●] Quente         ||
| |  [Cal] retorno: em 2d                    ||
| |  [A] Ana Costa                           ||
| +------------------------------------------+|
|                                              |
+----------------------------------------------+
```

### 2.2 Pagina Detalhe — Card "Acoes" reestruturado

```
CARD ACOES (reestruturado com hierarquia clara)
================================================

+------------------------------------------+
|  Acoes                                   |
+------------------------------------------+
|                                          |
|  PROXIMO PASSO RECOMENDADO               |
|  +--------------------------------------+|
|  | [->] Enviar orcamento ao cliente     ||  <- accent border, bg-accent/5
|  |      Esta oportunidade esta em       ||
|  |      "Orc. Enviado". Acompanhe o    ||
|  |      retorno ate 15/mar.            ||
|  +--------------------------------------+|
|                                          |
|  [ Mover para Negociacao  [->] ]         |  <- variant default (primary)
|  [ [Briefcase] Converter em Job ]        |  <- emerald, only if canConvert
|  [ [Whatsapp] Abrir WhatsApp ]           |  <- outline, emerald
|                                          |
|  -------- Encerrar negociacao --------   |  <- separator com label
|                                          |
|  [ [Pause] Pausar oportunidade ]         |  <- outline
|  [ [X] Perdemos... ]                     |  <- outline border-red-200
|                                          |
+------------------------------------------+

DIALOG "PERDEMOS" (em vez de inline)
======================================

+--[ Dialog: Registrar Perda ]------------+
|                                         |
|  [XCircle] Marcar como Perdida          |
|                                         |
|  Tem certeza? Voce pode reativar esta   |
|  oportunidade depois se precisar.       |
|                                         |
|  Motivo principal *                     |
|  [Select: Preco / Diretor / Prazo ...]  |
|                                         |
|  Concorrente vencedor (opcional)        |
|  [Input: Ex: Paranoid, O2 Filmes]       |
|                                         |
|  Valor do concorrente (opcional)        |
|  [R$][Input number]                     |
|                                         |
|  Detalhes (opcional)                    |
|  [Textarea]                             |
|                                         |
|  [ Cancelar ]  [ Confirmar Perda ]      |
|                                         |
+-----------------------------------------+
```

### 2.3 Secao Atividades — Com label e botao com texto

```
SECAO ATIVIDADES (reestruturada)
==================================

+------------------------------------------+
|  Atividades                               |
+------------------------------------------+
|                                           |
|  Registrar atividade                      |
|  Anote ligacoes, emails e reunioes        |
|                                           |
|  Tipo:  [v Anotacao         ]             |
|                                           |
|  +--------------------------------------+ |
|  | O que aconteceu?                    | |  <- Textarea com 2 rows, placeholder melhor
|  |                                     | |
|  +--------------------------------------+ |
|                              [Salvar]     |  <- botao com texto, nao icone
|                                           |
|  ---------------------------------------- |
|                                           |
|  [FileText] Ana Costa · 09 mar 14:30      |
|  Liguei para a agencia, estao aguardando  |
|  aprovacao interna.                       |
|                                           |
|  [Phone] Pedro · 08 mar 10:15             |
|  Reuniao de alinhamento de escopo         |
|                                           |
+-------------------------------------------+
```

### 2.4 Empty State Coluna Kanban — Educativo

```
COLUNA VAZIA (com drop active)
================================

+--[ Orc. Enviado  0 ]--+
|                        |
|   +--------------+     |
|   |              |     |  <- quando dragging, mostra "Soltar aqui" em verde
|   |   + Adicionar|     |     quando idle, mostra texto educativo
|   |   oportunid. |     |
|   |              |     |
|   |   Arraste um |     |  <- texto adicional educativo
|   |   card aqui  |     |
|   |              |     |
|   +--------------+     |
|                        |
+------------------------+
```

### 2.5 ConvertToJobDialog — Texto de confirmacao melhorado

```
DIALOG CONVERTER EM JOB
=========================

+--[ Converter em Job ]-------------------+
|                                          |
|  [Briefcase] Criar Job a partir desta    |
|  oportunidade                            |
|                                          |
|  -- Dados do Job (voce pode editar) --   |
|                                          |
|  Titulo do job *                         |
|  [Campanha Verao Nike            ]       |
|                                          |
|  Valor fechado (R$)                      |
|  [45.000,00                      ]       |
|                                          |
|  Tipo de producao                        |
|  [v Filme Publicitario           ]       |
|                                          |
|  -- Estes dados sao copiados automaticamente --
|                                          |
|  Cliente: Nike Brazil                    |
|  Agencia: Agencia W + 1                  |
|  Formato: Filme 30s                      |
|                                          |
|  [i] A oportunidade ficara salva no CRM  |
|      como "Fechado". O job criado tera   |
|      todos os dados copiados. Voce sera  |
|      redirecionado ao novo job.          |
|                                          |
|  [ Cancelar ]        [ Criar Job ]       |
|                                          |
+------------------------------------------+
```

---

## 3. ANALISE POR AREA

### 3.1 Navegacao e Orientacao

| Aspecto | Situacao Atual | Avaliacao |
|---------|---------------|-----------|
| Breadcrumb | Existe na pagina de detalhe (Comercial > Titulo) | Bom |
| Botao voltar | Existe MAS e redundante com breadcrumb | Problema (ALTO-01) |
| Sidebar | Aponta para /crm corretamente | Bom |
| Fluxo principal visivel | Nao. Nao ha indicacao do proximo passo | Problema (CRIT-02) |
| Onboarding/orientacao | Inexistente | Problema (CRIT-03) |
| Progress do pipeline | Colunas do Kanban representam o progresso | Adequado |

### 3.2 Hierarquia Visual

| Componente | Aspecto | Avaliacao |
|------------|---------|-----------|
| Card Kanban | Titulo proeminente (font-medium, line-clamp-2) | Bom |
| Card Kanban | Valor em font-semibold, destaque adequado | Bom |
| Card Kanban | Temperatura (Quente/Morno/Frio) sem contexto | Problema (ALTO-02) |
| Pagina detalhe | Layout 3 colunas legivel | Bom |
| Pagina detalhe | Card "Acoes" sem hierarquia entre acoes | Problema (CRIT-02) |
| Dashboard | KPIs em destaque adequado | Bom |
| Dashboard | Funil monocromatico | Problema (BAIXO-04) |

### 3.3 Affordance

| Elemento | Situacao | Avaliacao |
|----------|----------|-----------|
| Cards sao clicaveis? | Sim (button tag, hover:shadow, hover:border) | Bom |
| Cards sao arrastaveis? | Sim, mas sem indicacao visual | Problema (CRIT-01) |
| Botoes do card Acoes | ghost text-destructive parece link | Problema (ALTO-03) |
| Colunas aceitam drop? | Indicacao visual com borda verde/vermelha | Bom |
| Rows da ListView clicaveis? | cursor-pointer + hover, sem affordance forte | Medio |

### 3.4 Estados Vazios

| Componente | Empty State | CTA | Avaliacao |
|------------|-------------|-----|-----------|
| Kanban global vazio | Nao tem — mostra colunas vazias | Nao | CRITICO (CRIT-03) |
| Coluna vazia | Botao dashed "+ Adicionar oportunidade" | Sim | Adequado |
| Atividades vazias | Texto "Nenhuma atividade registrada." | Nao | Fraco |
| Propostas vazias | Texto "Nenhuma proposta registrada." | Nao | Fraco |
| Lista vazia | Texto "Nenhuma oportunidade encontrada." | Nao | Fraco |
| Dashboard erro | Alert com botao "Tentar novamente" | Sim | Bom |

### 3.5 Mobile e Acessibilidade

| Aspecto | Situacao | Avaliacao |
|---------|----------|-----------|
| Touch targets botoes | h-8 (32px) em varios lugares | Abaixo do minimo (44px) |
| Touch targets cards Kanban | card completo clicavel — adequado | Bom |
| Textos minimos | varios text-[11px] (11px) | Abaixo do recomendado (12px min) |
| Contraste text-muted-foreground | Depende do tema — verificar ratios | A verificar |
| aria-labels em icones | Varios botoes icon-only sem aria-label | Problema (MEDIO-06) |
| Focus visible | focus-visible:ring-2 nos cards | Bom |
| Keyboard navigation | Tab navega pelos cards | Adequado |
| Kanban mobile | Scroll horizontal funciona mas DnD em mobile e difícil | Problema (CRIT-01) |

---

## 4. PRIORIDADE DE IMPLEMENTACAO

### Sprint 1 — Criticos (impacto imediato para usuarios leigos)

1. **[CRIT-03]** Empty state global do Kanban com CTA educativo
   - Menor esforco, maior impacto para novos usuarios
   - Implementar em `crm/page.tsx`: detectar `pipeline.total_opportunities === 0`

2. **[CRIT-02]** Reestruturar card "Acoes" com hierarquia e "Proximo Passo"
   - Requer logica por stage + redesign do card
   - Mover "Perdemos" para dialog proprio (ALTO-03 incluso aqui)

3. **[CRIT-01]** Adicionar GripVertical ao card do Kanban
   - Minimo esforco: um icone + cursor-grab
   - Adicionar banner educativo "Arraste para mover" na primeira visita

4. **[CRIT-04]** Label e botao com texto na secao Atividades
   - Minimo esforco: adicionar label + trocar icone por texto no botao

### Sprint 2 — Altos (polimento da experiencia)

5. **[ALTO-01]** Remover botao "Voltar ao Pipeline" duplicado
6. **[ALTO-04]** Botao "Gerar Carta IA" sempre visivel com disabled + tooltip
7. **[ALTO-05]** Alertas com texto de acao sugerida
8. **[ALTO-07]** Expandir texto de confirmacao no ConvertToJobDialog

### Sprint 3 — Medios (eficiencia e acessibilidade)

9. **[MEDIO-01]** Total de oportunidades no header
10. **[MEDIO-03]** Renomear filtros para "Pipeline ativo" / "Historico completo"
11. **[MEDIO-06]** aria-labels em todos os elementos interativos de icone
12. **[BAIXO-01]** ChevronRight sempre visivel no mobile
13. **[BAIXO-04]** Cores do funil no Dashboard consistentes com Kanban

### Sprint 4 — Touch targets e texto (acessibilidade)

14. Auditar todos os `h-7` e `h-8` buttons em formularios — elevar para `h-9` (36px) ou `h-10` (40px) minimo
15. Auditar textos `text-[11px]` — elevar para `text-xs` (12px) minimo
16. Adicionar `title` attributes em colunas truncadas na ListView

---

## 5. FLUXO PRINCIPAL RECOMENDADO (usuario leigo)

O fluxo deve ser guiado visualmente, passo a passo:

```
1. ENTRADA NO CRM
   └─ Se vazio: empty state educativo com "+ Nova Oportunidade"
   └─ Se tem oportunidades: Kanban com alertas em destaque

2. CRIAR OPORTUNIDADE
   └─ Botao "+ Nova Oportunidade" (destaque, sempre visivel)
   └─ Dialog: campos minimos primeiro (titulo, agencia/cliente)
   └─ Campos opcionais indicados claramente como "opcional"

3. QUALIFICAR (mover pelo pipeline)
   └─ Card "Proximo Passo" no detalhe: instrucao clara
   └─ Botao "Mover para [proxima etapa]" = acao principal destaque
   └─ OU arrastar no Kanban (com drag handle visivel)

4. REGISTRAR ATIVIDADE
   └─ Campo de atividade com label claro e botao com texto "Salvar"
   └─ Lista cronologica clara abaixo

5. ENVIAR ORCAMENTO
   └─ ProposalSection: "+ Adicionar" ou "Gerar com IA"
   └─ Ao adicionar proposta, mover automaticamente para "Orc. Enviado"?
      (considerar auto-advance de stage)

6. CONVERTER EM JOB
   └─ Botao "Converter em Job" proeminente em stage fechamento
   └─ Dialog com confirmacao clara do que acontece
   └─ Redirect automatico para o job criado

7. REGISTRAR PERDA
   └─ Botao "Perdemos" com peso visual adequado (outline border-red)
   └─ Dialog proprio com campo obrigatorio de motivo
   └─ Mensagem pos-perda: "Oportunidade arquivada. Pode ser reativada a qualquer momento."
```

---

## 6. REFERENCIAS DE IMPLEMENTACAO

### Componentes do Design System a usar

- `GripVertical` (Lucide) — drag handle no card Kanban
- `AlertTriangle` (Lucide) — icone junto ao texto "vencido"
- `Dialog` (shadcn/ui) — para "Perdemos" em vez de inline
- `Tooltip` (shadcn/ui) — em botao desabilitado "Gerar Carta IA"
- `Separator` com label — para dividir acoes positivas/negativas no card Acoes
- Empty state pattern do design system (secao 6.9): `py-16 flex-col items-center`

### Touch targets — minimos a corrigir

Todos os `h-7 text-xs` buttons (28px) nos formularios de proposta e atividade devem ser elevados para `h-9` (36px) minimo, `h-10` (40px) no mobile para respeitar WCAG 2.5.5 (44px area de toque).

### Contraste a verificar

- `text-[11px] text-muted-foreground italic opacity-70` (ProposalSection hint) — FALHA
  - Combinacao de 11px + italic + muted + 70% opacity viola WCAG AA com certeza
- Badges `text-[10px]` nos alertas — verificar ratio contra o background

---

## Changelog

| Data | Versao | Descricao |
|------|--------|-----------|
| 2026-03-09 | 1.0 | Auditoria inicial — 4 criticos, 7 altos, 7 medios, 5 baixos |
