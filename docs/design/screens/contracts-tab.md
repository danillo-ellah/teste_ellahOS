# Spec Visual: Aba Contratos (Job Detail > Contratos)

**Data:** 2026-02-25
**Versao:** 1.0
**Autor:** UI/UX Designer - ELLAHOS
**Fase:** 9.4 - DocuSeal Contracts
**Design System:** docs/design/design-system.md
**Arquitetura:** docs/architecture/fase-9-automacoes-architecture.md (secao 6.3)
**Spec:** docs/specs/fase-9-automacoes-spec.md
**Contexto:** Job Detail (/jobs/[id]) — nova aba inserida apos "Arquivos"

---

## Indice

1. [Objetivo e Contexto](#1-objetivo-e-contexto)
2. [Integracao com Job Detail](#2-integracao-com-job-detail)
3. [Layout da Aba Contratos](#3-layout-da-aba-contratos)
4. [Lista de Contratos (ContractsList)](#4-lista-de-contratos-contractslist)
5. [Modal Gerar Contratos (CreateContractsDialog)](#5-modal-gerar-contratos-createcontractsdialog)
6. [Drawer de Detalhes (ContractDetailDrawer)](#6-drawer-de-detalhes-contractdetaildrawer)
7. [Progresso em Lote (BatchProgressIndicator)](#7-progresso-em-lote-batchprogressindicator)
8. [Estados: Loading, Empty, Error](#8-estados-loading-empty-error)
9. [Badges de Status de Contrato](#9-badges-de-status-de-contrato)
10. [Responsividade](#10-responsividade)
11. [Interacoes e Animacoes](#11-interacoes-e-animacoes)
12. [Acessibilidade](#12-acessibilidade)
13. [Tokens de Referencia Rapida](#13-tokens-de-referencia-rapida)

---

## 1. Objetivo e Contexto

A aba "Contratos" no Job Detail centraliza o ciclo de vida dos contratos DocuSeal para membros do elenco e equipe de um job. O produtor-executivo gera contratos diretamente da plataforma, sem precisar acessar o DocuSeal manualmente.

**Quem usa:** Produtor-executivo, produtor de campo.
**Quando usa:** Antes das filmagens (pre-producao), ao confirmar equipe e elenco.
**O que precisa entregar:**
- Visibilidade do status de asssinatura de cada membro
- Gerar/reenviar contratos sem sair do ELLAHOS
- Acesso ao PDF assinado apos conclusao

**Referencias de UX:** Linear (sidebar drawer para detalhes), Frame.io (timeline de eventos), Monday.com (status pipeline por pessoa).

---

## 2. Integracao com Job Detail

### 2.1 Posicao na Barra de Tabs

A aba "Contratos" e inserida entre "Arquivos" e "Historico" na barra de tabs do Job Detail.

```
TABS DO JOB DETAIL (desktop):

+-------+--------+-----------+----------+---------+-------------+-----------+
| Geral | Equipe | Entregav. | Financ.  | Arquivos| Contratos   | Historico |
+-------+--------+-----------+----------+---------+-------------+-----------+
                                                    ^
                                                    NOVO
```

### 2.2 Badge na Aba

Quando ha contratos com status `pending` ou `sent`, a aba exibe um badge numerico:

```
Sem pendencias:
  "Contratos" (texto simples)

Com pendencias:
  "Contratos"  [badge rose-500: N]

Badge:
  h: 18px, min-w: 18px
  bg: rose-500, text: white
  font: text-xs font-medium
  rounded-full
  posicao: ml-1.5 self-start mt-0.5 (canto superior direito do label da tab)
  aria-label: "{N} contratos aguardando assinatura"
```

### 2.3 Scroll e Posicionamento

O conteudo da aba segue o padrao das demais abas do Job Detail: comeca imediatamente abaixo do bloco sticky (header + pipeline + tabs) e scrolla normalmente.

---

## 3. Layout da Aba Contratos

### 3.1 Desktop (1024px+)

```
TAB CONTENT AREA

+------------------------------------------------------------------+
|  [header sticky do job detail acima - fora desta spec]           |
+------------------------------------------------------------------+
|  ABA CONTRATOS                                                   |
|                                                                  |
|  SECAO HEADER DA ABA                                             |
|  +-------------------------------------------------------------+ |
|  |  Contratos DocuSeal         [Gerar em Lote]  [+ Gerar Novo] | |
|  |  4 contratos · 2 assinados · 1 pendente · 1 enviado         | |
|  +-------------------------------------------------------------+ |
|                                                                  |
|  [PROGRESS INDICATOR — aparece durante geracao em lote]          |
|  +-------------------------------------------------------------+ |
|  |  [progress bar rose 60%]  Gerando contratos... 3/5          | |
|  +-------------------------------------------------------------+ |
|                                                                  |
|  TABELA DE CONTRATOS (ContractsList)                             |
|  +-------------------------------------------------------------+ |
|  |  membro        email         tipo         status   enviado  | |
|  |----------------------------------------------------------------|
|  |  Ana Costa     ana@mail.com  Elenco       [● green] 20/01  | |
|  |  Bruno Lima    bru@mail.com  Elenco       [● green] 20/01  | |
|  |  Carla Dias    car@mail.com  Equipe       [● amber]  21/01 | |
|  |  Diego Matos   die@mail.com  Prestacao    [● gray]  –      | |
|  +-------------------------------------------------------------+ |
|                                                                  |
+------------------------------------------------------------------+
```

### 3.2 Hierarquia Visual da Aba

```
Header da aba:
  titulo (implicito — vem da tab ativa)
  sub-header: contador de status (body-sm text-zinc-500)
  acoes: botoes Gerar em Lote e Gerar Novo (direita)

Progress bar: condicional (so durante operacao em lote)

Tabela: ocupa o restante, overflow-y auto
```

### 3.3 Linha de Sub-header (resumo de status)

```
"4 contratos · 2 assinados · 1 enviado · 1 pendente"

Formatacao:
  text-sm text-zinc-500
  separador: ·  (U+00B7, middle dot)
  cada contagem: numero em font-medium text-zinc-700 dark:text-zinc-300
  ex: "4 contratos · " + strong "2" + " assinados · " + strong "1" + " enviado"
```

---

## 4. Lista de Contratos (ContractsList)

### 4.1 Colunas

| # | Coluna | Largura | Conteudo |
|---|--------|---------|----------|
| 1 | Membro | flex-1 min-w-[160px] | avatar (24px) + nome + cargo no job |
| 2 | Email | w-[200px] | email de envio do contrato |
| 3 | Tipo | w-[120px] | badge tipo contrato (Elenco / Equipe / Prestacao) |
| 4 | Status | w-[130px] | ContractStatusBadge (ver secao 9) |
| 5 | Enviado em | w-[110px] | data DD/MM/AA ou "–" se nao enviado |
| 6 | Acoes | w-[100px] | botoes inline |

### 4.2 Wireframe de Linha

```
+------------------+------------------+----------+-----------+---------+----------+
| [avatar] Ana C.  | ana@empresa.com  | [Elenco] | [● green] | 20/01   | [...][>] |
| Atriz principal  |                  |          |  Assinado |         |          |
+------------------+------------------+----------+-----------+---------+---------++
```

### 4.3 Coluna Membro

```
Layout: flex items-center gap-2
  Avatar: w-6 h-6 rounded-full (foto da pessoa ou iniciais)
    foto: objeto da tabela people
    fallback: bg zinc-200 dark:zinc-700, iniciais em text-xs font-medium

  Texto:
    nome: text-sm font-medium text-zinc-800 dark:text-zinc-200
    cargo: text-xs text-zinc-500 (ex: "Atriz principal", "Diretor de Arte")
    cargo vem de job_team.role_description ou people.job_title
```

### 4.4 Coluna Tipo

```
Badge de tipo (nao e status — e classificacao):
  padding: px-2 py-0.5 rounded-md text-xs font-medium
  Elenco:    bg zinc-100 text-zinc-700 dark: bg-zinc-700 text-zinc-300
  Equipe:    bg zinc-100 text-zinc-700 dark: bg-zinc-700 text-zinc-300
  Prestacao: bg zinc-100 text-zinc-700 dark: bg-zinc-700 text-zinc-300

(tipos nao tem cores distintas — apenas o status e colorido)
```

### 4.5 Coluna Acoes

```
Botao Detalhes (aba aberta):
  ghost icon, icone SidebarOpen 16px
  aria-label: "Ver detalhes do contrato de {nome}"
  abre ContractDetailDrawer (secao 6)

DropdownMenu (...):
  Reenviar                 (icone: Send 14px)
  Baixar PDF               (icone: Download 14px)
  Copiar link de assinatura (icone: Link 14px) — apenas se status = sent/opened
  ----------
  Revogar contrato         (icone: Ban 14px, text-red-500) — confirm dialog

Botao "Reenviar" so aparece se status = pending, sent, opened, expired
Botao "Copiar link" so aparece se status = sent, opened
"Revogar" so aparece se status nao e signed, declined
```

### 4.6 Ordenacao

```
Ordem padrao: por status (unsigned primeiro) -> por nome
  1. pending (nao enviado)
  2. sent (enviado, aguardando)
  3. opened (abriu mas nao assinou)
  4. expired (expirado)
  5. signed (assinado)
  6. declined (recusado)
```

### 4.7 Header da Tabela

```
bg: zinc-50 dark:zinc-900
h: 40px
font: text-xs font-medium uppercase tracking-wide text-zinc-500
border-bottom: 1px zinc-200 dark:zinc-800
```

### 4.8 Row Hover

```
hover: bg-zinc-50 dark:bg-zinc-800/50
linha signed: nao tem destaque especial (estado final, sem acao necessaria)
linha pending: linha levemente destacada com left-border 2px zinc-300 dark:zinc-600
linha expired: row tem fundo vermelho muito sutil (red-50/5 dark:red-950/10)
```

---

## 5. Modal Gerar Contratos (CreateContractsDialog)

### 5.1 Wireframe

```
+------------------------------------------------------+
|  Gerar Contratos                               [X]   |
+------------------------------------------------------+
|  SELECIONAR MEMBROS                                  |
|  [  buscar membro...                ]                |
|                                                      |
|  [ ] Ana Costa (Atriz principal)    [sem contrato]   |
|  [x] Bruno Lima (Ator coadjuvante)  [sem contrato]   |
|  [ ] Carla Dias (Dir. de Arte)      [Equipe - sent]  |
|  [ ] Diego Matos (Freelancer)       [sem contrato]   |
|                                                      |
|  ---                                                 |
|  TIPO DE CONTRATO                                    |
|  [Elenco v]       [Equipe v]     [Prestacao de Serv] |
|  (radio ou select — 1 tipo por vez)                  |
|                                                      |
|  DADOS DO CONTRATO (para itens selecionados)         |
|  +--------------------------------------------------+|
|  |  MEMBRO: Bruno Lima                              ||
|  |  Nome completo  [Bruno Lima             ]        ||
|  |  CPF            [000.000.000-00          ]       ||
|  |  Email          [bruno@empresa.com       ]       ||
|  |                                                  ||
|  |  (repetido para cada membro selecionado)         ||
|  +--------------------------------------------------+|
|                                                      |
+------------------------------------------------------+
|  [Cancelar]                   [Gerar e Enviar (2)]   |
+------------------------------------------------------+
```

### 5.2 Dimensoes

```
Dialog: max-w-lg (512px), max-h-[80vh] overflow-y-auto
Animacao: scale + fade 150ms ease-out
```

### 5.3 Secao: Selecionar Membros

```
Busca:
  Input com icone Search 16px
  placeholder: "Buscar por nome ou funcao..."
  debounce: 300ms
  autofocus ao abrir

Lista de membros (do job_team):
  max-h: 200px overflow-y-auto
  ScrollArea component

  Item da lista:
    padding: px-3 py-2
    checkbox a esquerda
    nome: text-sm font-medium
    cargo: text-xs text-zinc-500
    badge (direita): estado atual dos contratos
      "sem contrato" → zinc-300 xs
      "Elenco - signed" → green xs (ja assinado — aviso)
      "Elenco - sent" → amber xs (ja enviado)

  Membro com contrato ja assinado:
    checkbox disabled, opacity-60
    badge "Assinado" green
    tooltip: "Contrato ja assinado — nao e possivel gerar novamente"

Aviso ao selecionar membro com contrato enviado/aberto:
  Banner inline (abaixo da lista):
    bg: amber-50 dark:amber-950/30 border amber-200
    rounded-md px-3 py-2
    [AlertTriangle 14px amber-500] "Bruno Lima ja tem contrato enviado. Gerar novo ira substituir o anterior."
```

### 5.4 Secao: Tipo de Contrato

```
Label: "TIPO DE CONTRATO" (overline)

RadioGroup com 3 opcoes (layout horizontal):
  [○] Elenco
  [○] Equipe
  [○] Prestacao de Servico

  cada opcao: radio + label text-sm
  selecionado: label font-medium, radio rose-500
  padding: gap-6 entre opcoes

Descricao do tipo selecionado (mt-1, text-xs text-zinc-500):
  Elenco: "Para atores, atrizes e figurantes"
  Equipe: "Para diretores, cinegrafistas e producao"
  Prestacao: "Para freelancers e prestadores de servico"
```

### 5.5 Secao: Dados dos Membros Selecionados

```
Label: "DADOS DOS MEMBROS" (overline)

Para cada membro selecionado: um bloco colapsavel:
  Header do bloco:
    bg: zinc-50 dark:zinc-800
    padding: px-4 py-2 rounded-t-md border border-zinc-200 dark:zinc-700
    nome do membro: text-sm font-medium
    botao toggle: ChevronDown/Up 16px (expande/colapsa os campos)
    estado: aberto por padrao

  Corpo do bloco (expansivel):
    bg: branco dark:zinc-900
    border: 1px zinc-200 dark:zinc-700 rounded-b-md border-t-0
    padding: p-4

    Grid 2 colunas (desktop) / 1 coluna (mobile):
      Nome completo (pre-preenchido de people.full_name, editavel)
      CPF (pre-preenchido de people.cpf, editavel, mask)
      Email (pre-preenchido de people.email, editavel)

    Campos pre-preenchidos:
      input: bg-zinc-50 dark:bg-zinc-800 (indicativo de auto-fill)
      badge "Pre-preenchido" (zinc-300, xs) ao lado do label

    Campo vazio (nao disponivel no cadastro):
      borda vermelha (error state)
      helper text: "Obrigatorio — preencha o CPF do membro"

    Separacao entre blocos de membros: gap-3
```

### 5.6 Footer do Modal

```
Botao Cancelar: variant outline
Botao Gerar e Enviar:
  variant primary (rose)
  conta membros selecionados no label: "Gerar e Enviar (2)"
  disabled se:
    - nenhum membro selecionado
    - campos obrigatorios vazios (CPF, email)
    - tipo nao selecionado
  loading: Loader2 spin + "Gerando contratos..."
  largura: auto
```

---

## 6. Drawer de Detalhes (ContractDetailDrawer)

Sheet lateral deslizando da direita ao clicar no icone de detalhes de um contrato.

### 6.1 Wireframe

```
+------------------------------------------+
|                     [X] Contrato — Ana C. |
|                     Elenco · BBB_039      |
+------------------------------------------+
|  STATUS ATUAL                             |
|  [● green large]  Assinado               |
|  Assinado em: 22/01/2026 14:35           |
|                                          |
|  DADOS DO CONTRATO                        |
|  +---------+---------------------------+ |
|  | Membro  | Ana Costa                 | |
|  | CPF     | 000.000.000-00            | |
|  | Email   | ana@empresa.com           | |
|  | Tipo    | Elenco                    | |
|  | Template| contrato-elenco-v2        | |
|  | Enviado | 20/01/2026                | |
|  | Expira  | 20/02/2026 (expirado)     | |
|  +---------+---------------------------+ |
|                                          |
|  ACOES                                   |
|  [Download PDF]  [Copiar link] [Reenviar]|
|                                          |
|  TIMELINE DE EVENTOS                     |
|  ●  22/01 14:35  Contrato assinado       |
|  |  22/01 10:10  Contrato aberto         |
|  |  20/01 09:00  Contrato enviado        |
|  |  20/01 08:58  Contrato gerado         |
|  ●  20/01 08:55  Solicitado por Danilo M.|
|                                          |
+------------------------------------------+
```

### 6.2 Dimensoes e Layout

```
Sheet (drawer lateral):
  side: right
  w: 400px (desktop) | 100% (mobile)
  bg: surface (white dark:zinc-950)
  border-left: 1px zinc-200 dark:zinc-800
  overflow-y: auto

Header do drawer:
  padding: px-6 py-4
  border-bottom: 1px zinc-200 dark:zinc-800
  layout: flex justify-between items-start

  Titulo: "Contrato — {nome}"
    text-lg font-semibold
  Sub: "{tipo} · {job_code}"
    text-sm text-zinc-500 mt-0.5

  Botao fechar: ghost icon X 20px, self-start
```

### 6.3 Secao: Status Atual

```
padding: px-6 py-4 bg-zinc-50 dark:bg-zinc-900 border-b zinc-100 dark:zinc-800

Layout: flex items-center gap-3

Dot grande: w-3 h-3 rounded-full bg-{status-color} (sem badge — apenas dot + texto)
Nome do status: text-base font-semibold (cor do status)
Data: text-sm text-zinc-500 mt-0.5

Exemplo signed:
  ● (w-3 green-500)  Assinado
                     Assinado em 22/01/2026 as 14h35
```

### 6.4 Secao: Dados do Contrato

```
padding: px-6 py-4

Label da secao: "DADOS DO CONTRATO" (overline)

Tabela de dados:
  layout: grid grid-cols-[100px_1fr]
  gap-y: 2 (8px entre linhas)
  border: nenhum (apenas grid)

  Coluna label: text-xs font-medium text-zinc-500 (uppercase)
  Coluna valor: text-sm text-zinc-800 dark:text-zinc-200

  Linhas:
    Membro    | nome completo
    CPF       | formatado (font-mono)
    Email     | email
    Tipo      | Elenco / Equipe / Prestacao
    Template  | nome do template DocuSeal (text-xs font-mono)
    Enviado   | data DD/MM/YYYY ou "Nao enviado"
    Expira    | data + badge se expirado (red-500 xs "Expirado")
    DocuSeal  | link para submission no DocuSeal (ExternalLink icon 12px)
              | texto: "Ver no DocuSeal" (link xs rose)
```

### 6.5 Secao: Acoes

```
padding: px-6 py-3 border-t border-b zinc-100 dark:zinc-800

Layout: flex gap-2 flex-wrap

Botoes:
  [Download PDF]
    variant: outline, size sm
    icone: Download 14px
    disabled: se nao existe PDF (contrato nao assinado)
    acao: fetch URL do PDF do DocuSeal + download

  [Copiar Link de Assinatura]
    variant: outline, size sm
    icone: Link 14px
    visivel: apenas se status = sent | opened
    acao: copy to clipboard, toast "Link copiado!"

  [Reenviar]
    variant: outline, size sm
    icone: Send 14px
    visivel: se status = pending | sent | opened | expired
    loading state: Loader2 spin + "Enviando..."
    apos envio: toast success "Email reenviado para {email}"

  [Revogar]
    variant: ghost, size sm
    icone: Ban 14px, text-red-500
    visivel: se status = pending | sent | opened
    acao: abre AlertDialog de confirmacao
```

### 6.6 Secao: Timeline de Eventos

```
padding: px-6 py-4

Label: "HISTORICO" (overline)

Timeline component (vertical):
  posicao: relative
  linha vertical: absolute left-[11px] top-0 bottom-0 w-0.5 bg-zinc-200 dark:bg-zinc-700

  Item da timeline:
    layout: flex gap-3 items-start
    padding-bottom: pb-4 (exceto ultimo)

    Dot:
      w-[22px] h-[22px] rounded-full flex-shrink-0
      borda: 2px solid {status-cor} | bg-white dark:bg-zinc-950
      para o evento mais recente: bg solido na cor do status
      tamanho relativo ao h-[22px]

    Conteudo:
      timestamp: text-xs text-zinc-400 leading-[22px] (alinhado ao dot)
      titulo: text-sm font-medium text-zinc-800 dark:text-zinc-200
      sub: text-xs text-zinc-500 (ex: "por Danilo Martins")

  Eventos possiveis (icone Lucide no dot):
    gerado:    FileText (zinc)
    enviado:   Send (blue)
    aberto:    Eye (amber)
    assinado:  CheckCircle2 (green)
    recusado:  XCircle (red)
    expirado:  Clock (red)
    reenviado: RefreshCw (blue)
    revogado:  Ban (red)
```

---

## 7. Progresso em Lote (BatchProgressIndicator)

Aparece na aba entre o header e a tabela durante a geracao em lote de contratos.

### 7.1 Wireframe

```
+---------------------------------------------------+
|  [Loader2 spin rose]  Gerando contratos... 3 / 5  |
|  [████████████████████░░░░░░░░░░] 60%             |
|                                          [Cancelar]|
+---------------------------------------------------+
```

### 7.2 Estilo

```
Container:
  bg: rose-50 dark:bg-rose-950/20
  border: 1px rose-200 dark:rose-800
  rounded-lg px-4 py-3 mb-4
  animate-none (o indicador interno e que anima)

Layout: flex flex-col gap-2

Linha topo: flex items-center gap-2 justify-between
  icone: Loader2 animate-spin w-4 h-4 text-rose-500
  texto: "Gerando contratos... {N} / {total}" (text-sm font-medium)
  botao Cancelar: ghost xs text-zinc-500

Progress bar:
  h: h-1.5 (6px)
  bg track: rose-100 dark:rose-900
  bg fill: rose-500 dark:rose-400
  transition: width 300ms ease-out
  border-radius: rounded-full

Apos conclusao (todos enviados):
  Container muda para green:
    bg: green-50 dark:green-950/20
    border: green-200 dark:green-800
    icone: CheckCircle2 green-500 (sem spin)
    texto: "5 contratos gerados e enviados com sucesso"
    progress: 100%
  Auto-desaparece apos 3s (fade-out + slide-up 300ms)
```

---

## 8. Estados: Loading, Empty, Error

### 8.1 Loading State (carregamento inicial da aba)

```
Skeleton da aba:
  Header: skeleton 2 linhas (titulo + subcontagem)
  Tabela: 4 linhas skeleton, h-[52px] each
    cada linha: 4 blocos skeleton (widths: 160px, 180px, 80px, 100px)
    animate-pulse zinc-200/zinc-800 rounded-md
    gap-x: gap-3
```

### 8.2 Empty State (job sem contratos)

```
Container: flex-col items-center justify-center py-16

[FileSignature 48px text-zinc-300]
"Nenhum contrato gerado"           heading-3 (18px) mt-4
"Gere contratos para os membros   body-sm text-zinc-500 mt-2 text-center max-w-sm
da equipe diretamente daqui."

[+ Gerar Primeiro Contrato]        Button primary (rose) mt-6
                                   abre CreateContractsDialog
```

### 8.3 Empty State (job sem membros)

Condicao: job_team esta vazio. O botao de gerar deve estar bloqueado.

```
[Users 48px text-zinc-300]
"Adicione membros primeiro"        heading-3 mt-4
"A aba Equipe precisa ter          body-sm text-zinc-500 mt-2 text-center max-w-sm
membros cadastrados antes de
gerar contratos."

[Ir para Equipe]                   Button outline mt-6
                                   muda a tab ativa para "Equipe"
```

### 8.4 Error State (falha na API)

```
[AlertTriangle 48px text-red-400]
"Erro ao carregar contratos"       heading-3
"Verifique se o DocuSeal esta     body-sm text-zinc-500 mt-2 text-center
configurado corretamente em
Configuracoes > Integracoes."

[Tentar novamente]                 Button outline mt-6
[Ver Integracoes]                  Button ghost mt-2, link para /settings/integrations
```

### 8.5 Estado: DocuSeal nao configurado

Verificado via `/settings/integrations` — se nao ha token DocuSeal.

```
Banner no topo da aba (acima de qualquer conteudo):
  bg: amber-50 dark:amber-950/30
  border: 1px amber-200 dark:amber-800
  rounded-lg px-4 py-3 mb-4
  flex items-start gap-3

  [AlertTriangle 20px amber-500 flex-shrink-0]
  texto: "DocuSeal nao esta configurado. Configure a integracao para gerar contratos."
    text-sm
  [Configurar agora] — link rose, text-sm
    href: /settings/integrations#docuseal

Tabela ainda exibida (com contratos anteriores se houver).
Botao "Gerar Contratos" desabilitado com tooltip:
  "Configure o DocuSeal primeiro em Configuracoes > Integracoes"
```

---

## 9. Badges de Status de Contrato

Seguem o padrao de `Badge com dot` do design system.

| Status | Cor | Label | BG (light) | BG (dark) |
|--------|-----|-------|-----------|-----------|
| `pending` | zinc/gray | Nao enviado | zinc-100 | zinc-700 |
| `sent` | amber | Aguardando | amber-100 | amber-500/10 |
| `opened` | blue | Visualizado | blue-100 | blue-500/10 |
| `signed` | green | Assinado | green-100 | green-500/10 |
| `declined` | red | Recusado | red-100 | red-500/10 |
| `expired` | red (outline) | Expirado | red-50 | red-950/20 |

```
Componente ContractStatusBadge:
  inline-flex items-center gap-1.5 px-2 py-0.5
  rounded-full text-xs font-medium

  dot: w-1.5 h-1.5 rounded-full

  pending:   dot bg-zinc-400  text-zinc-600 bg-zinc-100  dark: text-zinc-300 dark:bg-zinc-700
  sent:      dot bg-amber-500 text-amber-700 bg-amber-100 dark: text-amber-400 dark:bg-amber-500/10
  opened:    dot bg-blue-500  text-blue-700  bg-blue-100  dark: text-blue-400  dark:bg-blue-500/10
  signed:    dot bg-green-500 text-green-700 bg-green-100 dark: text-green-400 dark:bg-green-500/10
  declined:  dot bg-red-500   text-red-700   bg-red-100   dark: text-red-400   dark:bg-red-500/10
  expired:   dot bg-red-400   text-red-600   bg-red-50    dark: text-red-400   dark:bg-red-950/20
             (expired tem tom mais suave que declined)
```

---

## 10. Responsividade

### 10.1 Mobile (<768px)

```
TABELA vira LISTA DE CARDS:

+-----------------------------+
|  CONTRATOS                  |
|  [+ Gerar Novo]             |
|  4 contratos · 2 assinados  |
+-----------------------------+
| +---------------------------+|
| | Ana Costa                 ||
| | Atriz principal           ||
| | [● green] Assinado        ||
| | 20/01/2026   [Elenco]     ||
| | [Detalhes]  [...]         ||
| +---------------------------+|
| +---------------------------+|
| | Bruno Lima                ||
| | Ator coadjuvante          ||
| | [● amber] Aguardando      ||
| | 20/01/2026   [Elenco]     ||
| | [Detalhes]  [Reenviar]    ||
| +---------------------------+|
+-----------------------------+
```

**Card mobile:**
```
padding: p-4, rounded-lg, border zinc-200 dark:zinc-800, bg surface
linha 1: nome (font-medium) | badge tipo (xs outline)
linha 2: cargo (text-xs zinc-500)
linha 3: badge status | data enviado (text-xs zinc-500)
footer: flex gap-2 mt-3
  [Detalhes] ghost sm | [...] dropdown
```

**CreateContractsDialog mobile:**
```
Sheet from bottom (nao Dialog):
  h: 92vh, rounded-t-xl
  handle: barra 36px wide, h-1 rounded zinc-300 dark:zinc-600
  conteudo: overflow-y-auto
  campos em 1 coluna
  footer: fixed bottom-0 px-6 py-4 bg-white dark:bg-zinc-950 border-t
```

**ContractDetailDrawer mobile:**
```
Sheet from bottom:
  h: 85vh, rounded-t-xl
  handle: sim
  overflow-y: auto
```

### 10.2 Tablet (768px-1023px)

```
Tabela: exibida normalmente, scroll horizontal se necessario
Colunas ocultas no tablet: "Email" (ocultar — info no drawer)
CreateContractsDialog: Dialog padrao (nao Sheet), max-w-lg
ContractDetailDrawer: Sheet lateral, w-[360px]
```

### 10.3 Desktop (1024px+)

Conforme wireframes das secoes 3, 5 e 6.

---

## 11. Interacoes e Animacoes

### 11.1 Atualizacao em Tempo Real (Realtime)

Os contratos tem status atualizado via Supabase Realtime (INSERT/UPDATE em `docuseal_submissions`):

```
Quando status muda (ex: sent → opened → signed):
  1. Badge na linha faz crossfade para novo status (transition colors 300ms)
  2. Se drawer esta aberto: timeline recebe novo evento com slide-in from top (200ms)
  3. Sub-header da aba atualiza a contagem
  4. Badge no tab header atualiza (ou desaparece se zerou pendentes)

Animacao de entrada do novo evento na timeline:
  height: 0 -> auto (200ms ease-out)
  opacity: 0 -> 1 (200ms)
```

### 11.2 Geracao em Lote

```
1. Modal fecha (scale + fade 150ms)
2. Progress bar aparece na aba (slide-down from top 200ms)
3. Barra preenche conforme contratos sao gerados
4. Cada contrato gerado: linha aparece na tabela com slide-in (150ms)
5. Apos todos: progress vira success (green, 1s), depois desaparece (3s)
```

### 11.3 Abertura do Drawer

```
Overlay: fade-in 200ms bg-black/20 backdrop-blur-none
Drawer: slide-in from right 250ms ease-out
Fechamento: slide-out to right 200ms ease-in + fade overlay
```

### 11.4 Hover em Linha da Tabela

```
Row hover: bg-zinc-50 dark:bg-zinc-800/50 (transition 100ms)
Botao de acoes (icone ...): visivel apenas no hover (opacity 0 -> 1 100ms)
Botao detalhes: sempre visivel
```

---

## 12. Acessibilidade

### 12.1 Navegacao por Teclado

```
Tab na aba Contratos:
  "Gerar em Lote" -> "Gerar Novo" -> headers da tabela (colunas sortaveis) -> linhas

Na linha da tabela:
  Tab: move entre botoes da linha (Detalhes, DropdownMenu)
  Enter no botao Detalhes: abre drawer
  Escape com drawer aberto: fecha drawer, retorna foco ao botao que abriu

Dentro do CreateContractsDialog:
  Tab: busca -> itens da lista -> radio tipo -> campos de membro -> botoes footer
  Escape: fecha dialog
  Space na lista: toggle checkbox do membro

Dentro do ContractDetailDrawer:
  Tab: botoes de acao -> itens da timeline (se interativos)
  Escape: fecha drawer
```

### 12.2 ARIA

```
Tabela de contratos:
  role="grid" ou <table> semantico
  aria-label="Contratos do job {codigo}"
  aria-sort em colunas sortaveis

Linha da tabela:
  aria-label por linha: "Contrato de {nome}: {status}"

Badge na tab:
  Badge do <button> da tab:
    aria-label="Contratos, {N} aguardando assinatura"

CreateContractsDialog:
  role="dialog"
  aria-modal="true"
  aria-labelledby="create-contracts-title"

Checkbox do membro:
  aria-label="Selecionar {nome} para geração de contrato"
  aria-describedby (se disabled): "contract-already-signed-{id}"

ContractDetailDrawer:
  role="complementary"
  aria-label="Detalhes do contrato de {nome}"

Timeline:
  role="list"
  aria-label="Historico do contrato"
  cada item: role="listitem"

Progress bar:
  role="progressbar"
  aria-valuenow={percentual}
  aria-valuemin="0"
  aria-valuemax="100"
  aria-label="Gerando contratos"
  aria-live="polite"
```

### 12.3 Contraste

```
Badge pending (zinc-600 em zinc-100): 5.8:1 (AA)
Badge sent (amber-700 em amber-100): 4.6:1 (AA)
Badge signed (green-700 em green-100): 4.8:1 (AA)
Badge declined (red-700 em red-100): 4.9:1 (AA)
Texto timeline (zinc-800 em white): 16.1:1 (AAA)
```

---

## 13. Tokens de Referencia Rapida

```
CORES
  Surface tab:          bg-white dark:bg-zinc-950
  Header aba:           bg-zinc-50/0 (sem bg proprio, herda do surface)
  Tabela header:        bg-zinc-50 dark:bg-zinc-900
  Row hover:            bg-zinc-50 dark:bg-zinc-800/50
  Drawer bg:            bg-white dark:bg-zinc-950
  Drawer border:        border-l zinc-200 dark:zinc-800
  Progress bg:          bg-rose-50 dark:bg-rose-950/20
  Banner warning:       bg-amber-50 dark:bg-amber-950/30

  Status de contrato:
    pending:  text-zinc-600  bg-zinc-100  dark: text-zinc-300  bg-zinc-700
    sent:     text-amber-700 bg-amber-100 dark: text-amber-400 bg-amber-500/10
    opened:   text-blue-700  bg-blue-100  dark: text-blue-400  bg-blue-500/10
    signed:   text-green-700 bg-green-100 dark: text-green-400 bg-green-500/10
    declined: text-red-700   bg-red-100   dark: text-red-400   bg-red-500/10
    expired:  text-red-600   bg-red-50    dark: text-red-400   bg-red-950/20

TIPOGRAFIA
  Subtitulo da aba:     text-sm text-zinc-500
  Thead:                text-xs font-medium uppercase tracking-wide text-zinc-500
  Nome membro:          text-sm font-medium
  Cargo membro:         text-xs text-zinc-500
  Timeline data:        text-xs text-zinc-400
  Timeline titulo:      text-sm font-medium
  Overline:             text-xs font-medium uppercase tracking-wide text-zinc-500

ESPACAMENTO
  Aba padding:          px-0 (herda do job detail) — conteudo px-6 py-4
  Tabela row:           h-[52px]
  Drawer padding:       px-6 py-4 por secao
  Drawer width:         w-[400px] desktop | full mobile
  Dialog max-w:         max-w-lg (512px)
  Badge tab:            ml-1.5 mt-0.5 h-[18px] min-w-[18px]

COMPONENTES SHADCN/UI USADOS
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle
  Sheet, SheetContent, SheetHeader, SheetTitle (drawer + mobile modais)
  RadioGroup, RadioGroupItem
  Checkbox
  Input
  Button
  Badge
  Progress
  ScrollArea
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator
  AlertDialog, AlertDialogContent (confirmacao revogar/reenviar)
  Tooltip, TooltipContent
  Skeleton
  Avatar, AvatarFallback, AvatarImage
  Separator
```
