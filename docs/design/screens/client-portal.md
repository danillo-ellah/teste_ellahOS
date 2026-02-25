# Spec Visual: Portal do Cliente (/portal/[token])

**Data:** 2026-02-20
**Versao:** 1.0
**Autor:** UI/UX Designer - ELLAHOS
**Design System:** docs/design/design-system.md
**Fase:** 7 - Dashboard + Relatorios + Portal do Cliente

---

## Indice

1. [Objetivo e Contexto](#1-objetivo-e-contexto)
2. [Layout Geral (publico, sem auth)](#2-layout-geral-publico-sem-auth)
3. [Header do Portal](#3-header-do-portal)
4. [Secao: Status e Timeline do Job](#4-secao-status-e-timeline-do-job)
5. [Secao: Documentos](#5-secao-documentos)
6. [Secao: Aprovacoes Pendentes](#6-secao-aprovacoes-pendentes)
7. [Secao: Mensagens](#7-secao-mensagens)
8. [Footer do Portal](#8-footer-do-portal)
9. [Estados: Loading, Error, Token Invalido, Expirado](#9-estados-loading-error-token-invalido-expirado)
10. [Responsividade (mobile-first)](#10-responsividade-mobile-first)
11. [Interacoes e Animacoes](#11-interacoes-e-animacoes)
12. [Acessibilidade](#12-acessibilidade)
13. [Dark Mode](#13-dark-mode)
14. [Seguranca e Dados Sensiveis](#14-seguranca-e-dados-sensiveis)
15. [Tokens de Referencia Rapida](#15-tokens-de-referencia-rapida)

---

## 1. Objetivo e Contexto

O Portal do Cliente e uma pagina publica (sem login) onde o cliente pode acompanhar o andamento do seu projeto audiovisual. O acesso e por token unico por job, gerado pela produtora.

**Quem usa:** Cliente contratante (marketing, agencia, gerente de marca).
**Quando usa:** Para acompanhar o projeto, aprovar entregas, baixar materiais.
**Dispositivo primario:** Celular (acesso via link enviado por WhatsApp ou email).
**O que nao pode aparecer:** Valores financeiros, margens, custos internos, dados de equipe, health score.

**Referencias de UX:**
- Frame.io (review de video, comentarios em timeline)
- DocuSeal/HelloSign (aprovacao de documentos limpa)
- Typeform (experiencia de aprovacao simples, mobile-friendly)

---

## 2. Layout Geral (publico, sem auth)

### 2.1 Estrutura — Sem Sidebar, Sem Topbar do App

O portal e uma pagina completamente separada do app. Nao usa o layout `(dashboard)/layout.tsx`. E uma pagina limpa com branding Ellah.

### 2.2 Desktop (1024px+)

```
+------------------------------------------------------------------+
|  PORTAL HEADER (fixed top-0, h-16, z-50)                         |
|  [Logo Ellah Filmes]    Nome do Job    [Contato] [Notificacoes]  |
+------------------------------------------------------------------+
|                                                                  |
|  HERO DO JOB (pt-16, bg leve)                                    |
|  +--------------------------------------------------------------+|
|  | Nome do Projeto — BBB_042                                     ||
|  | Cliente: Ambev  |  Tipo: TVC  |  Atualizado: hoje, 14:32     ||
|  | [STATUS BADGE grande]                                         ||
|  +--------------------------------------------------------------+|
|                                                                  |
|  MAIN CONTENT (max-w-3xl mx-auto px-6)                           |
|                                                                  |
|  SECAO: TIMELINE DO JOB (sempre visivel)                         |
|  +--------------------------------------------------------------+|
|  | Progresso do Projeto                                          ||
|  | [==========] 65% concluido                                   ||
|  | Timeline vertical de eventos...                               ||
|  +--------------------------------------------------------------+|
|                                                                  |
|  SECAO: APROVACOES (se houver pendentes — destaque visual)       |
|  +--------------------------------------------------------------+|
|  | [AlertCircle rose] AGUARDANDO SUA APROVACAO                   ||
|  | Card de aprovacao com botoes Aprovar / Rejeitar               ||
|  +--------------------------------------------------------------+|
|                                                                  |
|  SECAO: DOCUMENTOS (se habilitado)                               |
|  +--------------------------------------------------------------+|
|  | Documentos e Arquivos                                         ||
|  | [card] [card] [card]                                          ||
|  +--------------------------------------------------------------+|
|                                                                  |
|  SECAO: MENSAGENS (se habilitado)                                |
|  +--------------------------------------------------------------+|
|  | Chat com a Producao                                           ||
|  | [mensagens] [input]                                           ||
|  +--------------------------------------------------------------+|
|                                                                  |
|  PORTAL FOOTER                                                   |
|  Powered by ELLAHOS | Ellah Filmes                               |
+------------------------------------------------------------------+
```

### 2.3 Largura e Espacamento

```
Portal header: full width, fixed
Conteudo: max-w-3xl (768px) mx-auto
  Escolha intencional: estreito para melhor leitura e foco no mobile
  No mobile: padding px-4

Page padding top: pt-24 (h-16 header + 8px gap)
Section gap: space-y-8
Card padding: p-5 ou p-6
```

---

## 3. Header do Portal

### 3.1 Wireframe

```
+------------------------------------------------------------------+
|  [Logo]  Campanha Verao 2026 - Ambev       [?] [sino] [...]     |
+------------------------------------------------------------------+
```

```
Header:
  position: fixed top-0 left-0 right-0
  height: h-16
  bg: white/95 dark:bg-zinc-950/95
  backdrop-blur: backdrop-blur-md
  border-bottom: 1px border-border
  z-50

  Conteudo (container max-w-3xl mx-auto px-4 flex items-center gap-4):

  Logo Ellah Filmes (left):
    Imagem/SVG do logo
    max-h: 32px
    Link: recarrega a pagina (href="#")

  Nome do job (center, flex-1):
    text-sm font-medium text-foreground
    truncado com ellipsis
    Codigo entre parenteses: text-xs text-muted-foreground
    Ex: "Campanha Verao 2026 (BBB_042)"

  Acoes (right, flex items-center gap-2):

    Botao ajuda [?]:
      variant="ghost" size="icon" h-9 w-9
      Icone: HelpCircle 18px text-muted-foreground
      Tooltip: "Ajuda"
      Abre modal com FAQ do portal

    Botao notificacoes [sino]:
      variant="ghost" size="icon" h-9 w-9
      Icone: Bell 18px
      Badge vermelho se houver aprovacao pendente
      Acao: scroll para secao de aprovacoes

    Menu [tres pontinhos]:
      DropdownMenu
      variant="ghost" size="icon" h-9 w-9
      Icone: MoreHorizontal 18px
      Opcoes:
        [Download] Baixar todos os arquivos
        [Mail] Contatar a producao
        [Share2] Compartilhar este link
        [---]
        [Info] Sobre este projeto
```

---

## 4. Secao: Status e Timeline do Job

### 4.1 Hero do Status

```
+------------------------------------------------------------------+
| CAMPANHA VERAO 2026 — AMBEV                                       |
|                                                                  |
| [Clapperboard 20px]  TVC  |  Atualizado 20 fev, 14:32           |
|                                                                  |
| [POS-PRODUCAO badge grande — purple-500]                         |
|                                                                  |
| Progresso estimado:                                              |
| [========================----] 75%                               |
| Pos-Producao  (4 de 9 etapas concluidas)                        |
+------------------------------------------------------------------+
```

```
Hero section:
  bg: gradient sutil - from-background to-muted/30
  dark: from-background to-zinc-900/50
  border: 1px border-border
  rounded-2xl (16px)
  p-6

  Titulo do job:
    text-xl font-semibold tracking-tight
    text-foreground

  Meta info (flex gap-4 mt-1):
    Items: text-sm text-muted-foreground
    Icones: 14px mr-1
    Separador: " | "

  Status badge:
    mt-4
    height: h-8 (maior que o padrao de 22px)
    padding: px-4
    font: 13px font-semibold
    Icone de status: 16px mr-2
    bg/text: cores exatas do design system por status

  Progress bar:
    mt-5
    Label: "Progresso estimado" — text-xs text-muted-foreground mb-2
    Barra: h-2.5 rounded-full overflow-hidden
      bg-track: bg-muted
      bg-fill: cor do status atual (com transicao de width)
    Legenda: flex justify-between text-xs text-muted-foreground mt-1
      Left: nome do status atual
      Right: "X de 9 etapas"
```

### 4.2 Progress dos Status (Pipeline Visual)

Barra visual horizontal dos status do job. Simples, sem numeros de jobs — so mostra onde o projeto esta.

```
+------------------------------------------------------------------+
| Briefing → Orcamento → Aprovado → Pre-Prod → [PRODUCAO] → Pos → Entrega → Concluido
|   [///]      [///]       [///]      [///]        [>>>]      [ ]     [ ]       [ ]
+------------------------------------------------------------------+
```

```
Pipeline horizontal:
  mt-5
  overflow: overflow-x-auto (scroll em mobile)
  scroll-snap: x mandatory

  Flex de etapas com setas entre elas:
    Etapa concluida: icone CheckCircle2 cor do status, opacidade 60%
    Etapa atual: icone relevante cor do status, ring brilhante, fonte bold
    Etapa futura: icone Circle vazio, text-muted, opacidade 40%

  Cada etapa: min-w-[80px] text-center
    Icone: 20px
    Label: 10px mt-1 truncado

  Seta entre etapas: ChevronRight 14px text-muted

NOTA: NAO mostrar este componente se o status for "cancelado"
Se cancelado: mostrar banner vermelho "Projeto cancelado"
```

### 4.3 Timeline de Eventos

Lista cronologica reversa (mais recente primeiro) das mudancas de status e marcos importantes.

```
+------------------------------------------------------------------+
| HISTORICO DO PROJETO                                             |
|                                                                  |
| HOJE                                                             |
|                                                                  |
|   14:32  [purple dot]  Pos-Producao iniciada                     |
|          Finalizacao da pre-producao — equipe liberada para      |
|          iniciar edicao                                          |
|                                                                  |
|   09:15  [red dot]     Filmagem concluida                        |
|          Todas as diarias de filmagem registradas (3 dias)       |
|                                                                  |
| 18 FEV                                                           |
|                                                                  |
|   16:00  [green dot]   Aprovacao recebida                        |
|          Voce aprovou o roteiro final                            |
|                                                                  |
|   11:30  [violet dot]  Briefing atualizado                       |
|                                                                  |
+------------------------------------------------------------------+
```

```
Container:
  Card padrao (bg-card border rounded-xl p-5)
  Titulo: "Historico do Projeto" — text-base font-semibold mb-4

Timeline:
  position: relative
  pl-8

  Linha vertical:
    before: absolute left-[7px] top-2 bottom-2 w-0.5 bg-border

  Separador de data:
    text-xs font-semibold uppercase tracking-widest text-muted-foreground
    py-3 -ml-8
    pl-2

  Item de evento:
    position: relative
    mb-4

    Dot (absolute left -ml-8, top-1):
      w-3.5 h-3.5 rounded-full
      bg: cor do status
      ring: 2px ring-background (para cobrir a linha vertical)

    Hora: text-xs text-muted-foreground mb-0.5

    Titulo: text-sm font-medium text-foreground

    Descricao: text-sm text-muted-foreground mt-0.5
      (opcional — nem todo evento tem descricao)

    Badge extra (aprovacoes):
      inline badge verde/vermelho se for evento de aprovacao

Tipos de evento (cores do dot):
  status_change:      cor do novo status
  approval_received:  green-500
  approval_rejected:  red-500
  file_uploaded:      blue-500
  message:            zinc-400
  job_created:        rose-500

Mostrar max 10 eventos. Botao "Ver mais" para carregar outros.
```

---

## 5. Secao: Documentos

### 5.1 Wireframe

```
+------------------------------------------------------------------+
| DOCUMENTOS E ARQUIVOS                                 [Baixar tudo]
|                                                                  |
| +------------------+ +------------------+ +-----------------+   |
| | [FileVideo]      | | [FileText]       | | [FileImage]     |   |
| | Cut Aprovado v1  | | Roteiro Final    | | Storyboard      |   |
| | MP4 · 2,4 GB    | | PDF · 320 KB     | | ZIP · 48 MB    |   |
| | [Visualizar]     | | [Download]       | | [Download]      |   |
| | [Download]       | |                  | |                 |   |
| +------------------+ +------------------+ +-----------------+   |
+------------------------------------------------------------------+
```

### 5.2 Especificacao

```
Container:
  Card padrao
  p-5

Header:
  flex justify-between items-center mb-4
  Titulo: "Documentos e Arquivos" text-base font-semibold
  Botao "Baixar tudo": Button outline size="sm" icone DownloadCloud

Grid de arquivos:
  grid-cols-3 gap-4 (desktop)
  grid-cols-2 gap-3 (tablet)
  grid-cols-1 gap-3 (mobile)

Card de arquivo:
  bg-muted/30 dark:bg-zinc-800/50
  border: 1px border-border
  rounded-lg
  p-4

  Icone do tipo de arquivo (top, 32px):
    Video:    FileVideo  — blue-500
    Imagem:   FileImage  — emerald-500
    PDF:      FileText   — red-500
    ZIP:      Archive    — amber-500
    Audio:    FileAudio  — purple-500
    Generico: File       — zinc-400

  Nome: text-sm font-medium mt-3 leading-snug (2 linhas max, clamp)
  Meta: text-xs text-muted-foreground mt-1
    Formato: "{EXT} · {tamanho}"

  Acoes (mt-3, flex gap-2):
    Video/imagem: Button ghost size="sm" icone Eye "Visualizar"
      Abre modal de preview ou nova aba
    Todos: Button ghost size="sm" icone Download "Baixar"
      Download direto ou link Drive

Estado sem documentos (secao escondida se lista vazia E secao desabilitada):
  Se habilitada mas sem docs:
  Icone: FolderOpen 32px text-muted
  "Nenhum arquivo disponivel ainda"
  text-sm text-muted mt-2
```

### 5.3 Visibilidade Condicional

```
A secao de documentos so e exibida se:
1. portal_settings.show_documents = true  (config da produtora)
2. E houver pelo menos 1 arquivo com visibilidade "cliente"

Arquivos internos (is_client_visible = false) NAO aparecem no portal.
```

---

## 6. Secao: Aprovacoes Pendentes

### 6.1 Destaque Visual (prioridade maxima)

Se houver aprovacoes pendentes, esta secao SEMPRE aparece no topo do conteudo, antes da timeline. E a acao mais urgente que o cliente precisa tomar.

### 6.2 Wireframe (aprovacao pendente)

```
+------------------------------------------------------------------+
|  [Bell rose animando]  AGUARDANDO SUA APROVACAO                  |
|  Por favor, revise e aprove ou solicite alteracoes               |
|                                                                  |
|  +--------------------------------------------------------------+|
|  | APROVACAO INTERNA — ROTEIRO FINAL                             ||
|  | Enviado pela Ellah Filmes em 19/02/2026                       ||
|  |                                                               ||
|  | Descricao:                                                    ||
|  | "Por favor revise o roteiro final da campanha. Esta versao    ||
|  | incorpora as alteracoes solicitadas na reuniao de 15/02."     ||
|  |                                                               ||
|  | [View Document - link externo Drive]                          ||
|  |                                                               ||
|  | +------------------------+  +---------------------------+     ||
|  | | [ThumbsUp] APROVAR     |  | [ThumbsDown] REJEITAR     |    ||
|  | +------------------------+  +---------------------------+     ||
|  +--------------------------------------------------------------+|
|                                                                  |
|  Se mais de 1 aprovacao: paginador ou lista colapsada            |
+------------------------------------------------------------------+
```

### 6.3 Especificacao Visual

```
Banner de atencao (se houver aprovacoes pendentes):
  bg: rose-50 dark:bg-rose-500/8
  border: 1px border-rose-200 dark:border-rose-500/20
  rounded-xl
  p-4 mb-4
  flex items-start gap-3

  Icone animado: Bell 20px text-rose-500
    animation: bell-ring (shake sutil) 2s ease infinite
    @keyframes bell-ring: { 0% rotate(0) 10% rotate(15deg) 20% rotate(-10deg) 30% rotate(0) }

  Texto:
    Titulo: text-sm font-semibold text-rose-700 dark:text-rose-400
    Subtitulo: text-xs text-rose-600/80 dark:text-rose-400/70 mt-0.5

Card de aprovacao:
  bg-card
  border: 2px border-rose-300 dark:border-rose-500/40 (destaque adicional)
  rounded-xl
  p-5

  Header:
    Tag tipo: badge pequeno
      interna: bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400
      externa_cliente: bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400
    Titulo: text-base font-semibold mt-2
    Meta: text-xs text-muted-foreground mt-1
      "Enviado por [nome] em [data]"

  Descricao/mensagem:
    mt-3 p-3 bg-muted/50 rounded-lg
    text-sm text-foreground leading-relaxed
    max-h: 120px (overflow scroll se maior)

  Link do documento (se houver):
    mt-3
    inline-flex items-center gap-2
    text-sm text-blue-500 hover:underline
    Icone: ExternalLink 14px
    Target: "_blank" rel="noopener noreferrer"

  Acoes (mt-4 flex gap-3):
    Aprovar:
      Button variant="default" (primary, rose)
      size="lg" (h-11, mais facil no touch)
      w-full (ocupa metade do flex) ou flex-1
      Icone: ThumbsUp 18px mr-2
      "Aprovar"
      Hover: bg-rose-700 dark:bg-rose-500

    Rejeitar / Solicitar alteracoes:
      Button variant="outline"
      size="lg" h-11 flex-1
      Icone: ThumbsDown 18px mr-2
      "Solicitar alteracoes"
      border-red-200 text-red-600 dark:border-red-500/30 dark:text-red-400
      Hover: bg-red-50 dark:bg-red-500/10

Modal de confirmacao ao clicar em Aprovar:
  shadcn AlertDialog
  "Confirmar aprovacao"
  "Ao aprovar, voce confirma que revisou e aprovou [titulo]."
  [Cancelar] [Confirmar aprovacao]

Modal ao rejeitar (pede motivo):
  shadcn Dialog
  "Solicitar alteracoes"
  Label: "Descreva as alteracoes necessarias:"
  Textarea: h-24, placeholder "Ex: Ajustar o texto do segundo bloco..."
  [Cancelar] [Enviar]

Apos resposta (aprovado/rejeitado):
  Card animacao: fade-out (300ms)
  Toast:
    Aprovado: "Aprovacao registrada com sucesso" (green)
    Rejeitado: "Solicitacao de alteracoes enviada" (amber)
  Card substituido por: estado "Respondido"
    Icone + mensagem confirmando a acao
    Data/hora da resposta
```

### 6.4 Estado: Sem Aprovacoes Pendentes

```
+------------------------------------------------------------------+
| APROVACOES                                                        |
|                                                                  |
|   [CheckCircle2 40px green]                                       |
|   Nenhuma aprovacao pendente                                      |
|   Quando houver algo para aprovar, aparecera aqui.               |
+------------------------------------------------------------------+
```

---

## 7. Secao: Mensagens

### 7.1 Objetivo

Chat simples entre o cliente e a produtora. Nao e um app de mensagens completo — e um canal contextual por job.

### 7.2 Wireframe

```
+------------------------------------------------------------------+
| MENSAGENS COM A PRODUCAO                                         |
|                                                                  |
| +--------------------------------------------------------------+ |
| | 19/02/2026 — ONTEM                                           | |
| |                                                              | |
| |  [Logo Ellah] Ellah Filmes  14:22                           | |
| |  Oi! Enviamos o corte v1 para sua aprovacao. Fique a        | |
| |  vontade para comentar.                              [####] | |
| |                                                              | |
| |                  20/02/2026 — HOJE                          | |
| |                                                              | |
| |                          14:45  Voce (Maria Costa) [avatar] | |
| |  Ficou otimo! Tenho uma sugestao para o final [####]        | |
| |                                                              | |
| |  [Logo Ellah] Ellah Filmes  15:02                           | |
| |  Claro! Qual seria a sugestao? [####]                       | |
| +--------------------------------------------------------------+ |
|                                                                  |
| +--------------------------------------------------------------+ |
| | [Sua mensagem...                          ] [Enviar ->]     | |
| +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

### 7.3 Especificacao Visual

```
Container:
  Card padrao
  p-0 (overflow hidden, so card shell)

Header do card:
  flex items-center gap-2 px-5 py-4 border-b
  Titulo: "Mensagens" text-base font-semibold
  Badge online: dot verde pulsante + "Online" text-xs text-green-500
    (indicador visual, nao realtime real por hora)
  Icone: MessageSquare 18px text-muted-foreground

Area de mensagens:
  height: h-80 (320px fixo)
  overflow-y: auto
  padding: p-4
  scroll-behavior: smooth (auto-scroll para ultima mensagem)

  Separador de data:
    text-xs text-muted-foreground text-center my-3
    "HOJE" | "ONTEM" | "19/02/2026"
    linha horizontal com texto no centro:
      via flex items-center gap-2 before/after with flex-1 h-px bg-border

  Mensagem da producao (left-aligned):
    flex items-start gap-3 mb-4

    Avatar: 32x32px rounded-full
      Logo Ellah (imagem) ou iniciais "EF"
      bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400

    Conteudo:
      max-w: max-w-[70%]
      bg: bg-muted (zinc-100 light / zinc-800 dark)
      border-radius: rounded-lg rounded-tl-sm (canto top-left reto)
      px-3 py-2
      text-sm text-foreground

      Nome + hora: text-xs text-muted-foreground mb-1

  Mensagem do cliente (right-aligned):
    flex items-start gap-3 mb-4 justify-end (row-reverse)

    Avatar: 32x32px rounded-full
      Iniciais do nome do cliente
      bg: zinc-200 dark:zinc-700 text-zinc-700 dark:text-zinc-200

    Conteudo:
      max-w: max-w-[70%]
      bg: bg-rose-50 text-rose-900 dark:bg-rose-500/10 dark:text-rose-100
      border-radius: rounded-lg rounded-tr-sm (canto top-right reto)
      px-3 py-2
      text-sm

      Hora: text-xs text-muted-foreground mt-1 text-right

  Estado digitando (typing indicator):
    dots animados (•••)
    bg muted, rounded-lg px-3 py-2
    "Ellah Filmes esta digitando..."

Input de nova mensagem:
  border-top: 1px border-border
  p-3

  flex gap-2

  Textarea:
    flex-1
    min-h: 40px
    max-h: 120px (auto-resize com resize-none)
    bg: bg-muted/50
    border: 1px border-border
    rounded-lg
    px-3 py-2
    text-sm
    placeholder: "Escreva sua mensagem..."
    focus: ring-2 ring-rose-500/20 border-rose-500/50
    resize: none (auto-expand via JS)
    Enter: envia (Shift+Enter = nova linha)

  Botao Enviar:
    Button variant="default" (rose primary)
    size="icon" h-10 w-10
    Icone: Send 18px
    disabled: se input vazio ou loading
    Loading: Loader2 animate-spin

Notificacao de nova mensagem (se tela scrollada):
  Badge flutuante acima do input:
  "1 nova mensagem" bg-rose-500 text-white rounded-full px-3 py-1 text-xs
  Click: scroll para a mensagem
  Auto-dismiss apos scroll
```

### 7.4 Visibilidade Condicional

```
Secao de mensagens so exibida se:
  portal_settings.show_messages = true

Desabilitado: secao nao aparece no portal
```

---

## 8. Footer do Portal

### 8.1 Wireframe

```
+------------------------------------------------------------------+
|                                                                  |
|  [Logo Ellah]                                                    |
|  Campanha Verao 2026                                             |
|                                                                  |
|  Em caso de duvidas, entre em contato: contato@ellahfilmes.com   |
|                                                                  |
|  _______________________________________________________________  |
|                                                                  |
|  Powered by ELLAHOS · Portal gerado em 15/01/2026               |
|  Este link expira em 15/04/2026                                  |
+------------------------------------------------------------------+
```

```
Footer:
  mt-12 pt-8 border-t border-border
  text-center

  Logo: max-h 24px mx-auto mb-3 opacity-60 hover:opacity-100

  Nome do job: text-sm text-muted-foreground

  Contato: text-sm text-muted-foreground mt-2
    Link de email: text-rose-500 hover:underline

  Divider: my-6 border-border

  Powered by:
    text-xs text-muted-foreground/60
    "Powered by ELLAHOS"
    "Portal gerado em [data] · Expira em [data]"

  NAO incluir informacoes financeiras ou tecnicas internas
```

---

## 9. Estados: Loading, Error, Token Invalido, Expirado

### 9.1 Loading (primeiro acesso)

```
+------------------------------------------------------------------+
|  PORTAL HEADER (skeleton do logo + texto)                        |
+------------------------------------------------------------------+
|                                                                  |
|  [Skeleton: hero block 120px]                                    |
|  [Skeleton: pipeline 40px]                                       |
|  [Skeleton: card grande 200px]                                   |
|  [Skeleton: 3 cards de documento]                                |
|  [Skeleton: chat area 280px]                                     |
+------------------------------------------------------------------+
```

Sem spinner centralizado. Skeleton imediato para perceived performance.

### 9.2 Token Invalido ou Nao Encontrado

```
+------------------------------------------------------------------+
|  [Logo Ellah (centrado)]                                         |
|                                                                  |
|  [ShieldOff 64px text-muted]                                     |
|                                                                  |
|  Link Invalido                                                   |
|  text-xl font-semibold                                           |
|                                                                  |
|  "Este link de acesso nao e valido ou nao existe."               |
|  text-sm text-muted mt-2                                         |
|                                                                  |
|  "Se voce recebeu este link por engano, entre em contato         |
|   com a producao."                                               |
|                                                                  |
|  [Contatar a Producao] (button primary)                          |
+------------------------------------------------------------------+

Layout: flex flex-col items-center justify-center min-h-screen
bg: background
```

### 9.3 Token Expirado

```
+------------------------------------------------------------------+
|  [Logo Ellah (centrado)]                                         |
|                                                                  |
|  [CalendarX 64px text-muted]                                     |
|                                                                  |
|  Link Expirado                                                   |
|                                                                  |
|  "Este link de acesso expirou em [data de expiracao]."           |
|  "Solicite um novo link de acesso a producao."                   |
|                                                                  |
|  [Contatar a Producao] (button primary)                          |
+------------------------------------------------------------------+
```

### 9.4 Projeto Cancelado

```
Banner no topo do conteudo (substituindo o hero normal):
  bg-zinc-100 dark:bg-zinc-800/50
  border border-zinc-300 dark:border-zinc-700
  rounded-xl p-6 text-center

  Icone: XCircle 48px text-zinc-400
  Titulo: "Projeto Cancelado" text-lg font-semibold text-muted-foreground
  Texto: "Este projeto foi cancelado em [data]. Em caso de duvidas, entre em contato."
```

### 9.5 Erro de Rede

```
Banner topo:
  bg-red-50 border-red-200
  rounded-xl p-4
  flex items-center gap-3

  [WifiOff 18px red-500]
  "Nao foi possivel carregar as informacoes. [Tentar novamente]"
```

---

## 10. Responsividade (mobile-first)

### 10.1 Mobile (<640px) — PRIORIDADE

```
+---------------------------+
|  HEADER (h-14)            |
|  [Logo] [title] [sino][.] |
+---------------------------+
|  HERO DO JOB              |
|  Nome do Projeto          |
|  Cliente | Tipo           |
|  [STATUS BADGE]           |
|  [progress bar]           |
+---------------------------+
|  APROVACOES PENDENTES     |
|  (se houver — destaque)   |
|  Card full width          |
|  [APROVAR] [REJEITAR]     |
|  (buttons full width, h12)|
+---------------------------+
|  PIPELINE (scroll horiz.) |
|  [Brief]->[Orc]->...      |
+---------------------------+
|  HISTORICO                |
|  (timeline compacta)      |
|  [Ver mais]               |
+---------------------------+
|  DOCUMENTOS               |
|  grid 1 col (cards full)  |
+---------------------------+
|  MENSAGENS                |
|  chat area h-60           |
+---------------------------+
|  FOOTER                   |
+---------------------------+

Touch targets:
  Botoes aprovar/rejeitar: h-12 (48px) w-full
  Itens da timeline: minimo 44px de altura

Sem bottom nav (portal nao usa o nav do app)
```

### 10.2 Tablet (640px - 1023px)

```
max-w-2xl mx-auto
Documentos: grid-cols-2
Aprovacoes: botoes lado a lado (flex, nao stack)
Pipeline: visivel sem scroll (cabe na largura)
Chat: height aumenta para h-96
```

### 10.3 Desktop (1024px+)

```
max-w-3xl mx-auto
Hero: mais padding, fonte do titulo maior (text-2xl)
Pipeline: todos os status visiveis sem scroll
Documentos: grid-cols-3
Chat: height h-96, layout ligeiramente diferente
Margem lateral generosa px-0 (max-w ja garante)
```

---

## 11. Interacoes e Animacoes

### 11.1 Entrada da Pagina

```
Stagger sutil (Framer Motion):
  Header: imediato
  Hero: fade-in + translateY(4px -> 0) 250ms
  Secoes (em ordem): fade-in + translateY stagger 50ms
  Total stagger: ~400ms

Respeitar prefers-reduced-motion
```

### 11.2 Aprovacoes — Fluxo de Resposta

```
1. Click em Aprovar/Rejeitar:
   - Botao: loading state (Loader2)
   - Overlay sutil no card

2. Confirmacao (AlertDialog):
   - Aparece com scale 0.95 -> 1 + fade-in (200ms)

3. Confirmacao enviada:
   - Card: bordas acendem (green ou amber) por 300ms
   - Fade-out do card (400ms)
   - Aparece estado "respondido" com fade-in
   - Toast aparece no top-center (mobile)

4. Toast:
   Aprovado: "Aprovacao registrada!" + CheckCircle2 green
   Rejeitado: "Alteracoes solicitadas enviadas" + MessageSquare amber
   Duracao: 5s
```

### 11.3 Chat — Envio de Mensagem

```
1. Click Enviar ou Enter:
   - Mensagem aparece imediatamente (optimistic UI) na area de chat
   - Input limpa
   - Scroll suave para ultima mensagem
   - Botao: loading briefly

2. Confirmacao da API:
   - Tick de confirmacao na mensagem (Lucide Check, 12px, text-muted)

3. Erro:
   - Mensagem recebe badge de erro
   - "Nao enviado · [Tentar novamente]" abaixo da mensagem
```

### 11.4 Pipeline — Hover

```
Cada etapa do pipeline:
  hover: scale(1.05) + tooltip com nome completo do status (se truncado)
  Etapa atual: leve pulsacao no ring (keyframe: ring-offset 0 -> 4px -> 0, 2s ease)
```

---

## 12. Acessibilidade

```
Sem sidebar = foco mais simples, fluxo linear.

Estrutura semantica:
  <header> role="banner" (header do portal)
  <main> id="main-content"
  Secoes: <section> com aria-labelledby apontando para o h2 de cada secao
  <footer> role="contentinfo"

Skip link:
  "Ir para o conteudo principal"
  posicao: absolute, -top-10, focus: top-0
  Visivel apenas no focus (para usuarios de teclado)

Timeline:
  role="list" aria-label="Historico do projeto"
  role="listitem" por evento

Aprovacoes:
  Botao Aprovar: aria-label="Aprovar [titulo da aprovacao]"
  Botao Rejeitar: aria-label="Solicitar alteracoes em [titulo]"
  AlertDialog: aria-describedby apontando para o texto de confirmacao
  focus-trap dentro do dialog enquanto aberto

Chat:
  aria-label="Area de mensagens" no container
  aria-live="polite" na lista de mensagens (anunciar novas mensagens)
  Textarea: aria-label="Escreva sua mensagem"
  Botao Enviar: aria-label="Enviar mensagem"

Documentos:
  Cada card: role="article" aria-label="Arquivo: [nome]"
  Links de download: aria-label="Baixar [nome do arquivo], [formato] [tamanho]"
  Links externos: aria-label="Visualizar [nome] (abre em nova aba)"

Contraste:
  Portal usa as mesmas cores do design system — ja validadas (AA)
  Botoes do portal (rose primary): ratio 4.9:1 sobre white (AA)
  Badge de status: ratio testado por cor (ver design system sec 6.5)

Navegacao por teclado:
  Tab: header -> hero -> pipeline -> aprovacoes -> timeline -> docs -> chat -> footer
  Dentro do chat: Tab para textarea, Enter para enviar, Shift+Tab para sair
  Dentro do dialog: focus-trap, Escape para fechar
```

---

## 13. Dark Mode

```
O portal respeita prefers-color-scheme E o toggle salvo no localStorage do usuario.

Se usuario nao tem preferencia salva: usa prefers-color-scheme.
Toggle: nao ha botao de toggle no portal (simplificar UX).
  O portal simplesmente segue o sistema do dispositivo do cliente.

Especificacoes dark:
  Background: #09090B (ellah-black)
  Header bg: zinc-950/95 + backdrop-blur
  Cards: bg-card (#1F1F23)
  Hero bg: gradient zinc-950 -> zinc-900/50

  Status badges: variante dark (ver design system 6.5)
  Progress bar track: bg-zinc-800
  Progress bar fill: cor do status (mesma, mais visivel no dark)

  Mensagens producao: bg-zinc-800
  Mensagens cliente: bg-rose-500/10 text-rose-100

  Pipeline etapas concluidas: opacity-50 (mais discretas no dark)
  Pipeline etapa atual: ring brilhante sobre fundo escuro

  Aprovacao card borda: rose-500/40 (dark) — mais sutil que light
  Botao aprovar: rose-500 bg (no dark — sem lightening)

  Documentos card: bg-zinc-800/50
  Icones de arquivo: cores plenas (sem dessaturacao no dark)
```

---

## 14. Seguranca e Dados Sensiveis

### 14.1 O que NAO deve aparecer no portal

```
PROIBIDO mostrar no portal do cliente:
  - closed_value (valor do contrato)
  - production_cost (custo de producao)
  - tax_value (impostos)
  - margin_percentage (margem)
  - gross_profit (lucro bruto)
  - other_costs, risk_buffer
  - health_score (metrica interna)
  - Dados da equipe interna (salarios, taxas)
  - job_history completo (so eventos publicos)
  - Arquivos com is_client_visible = false
  - Mensagens internas (tipo "interna")
  - Nomes de fornecedores e valores

PERMITIDO:
  - Titulo, codigo, tipo e segmento do job
  - Status atual e pipeline de status
  - Datas publicas (inicio, entrega prevista)
  - Eventos de historico marcados como "publicos"
  - Arquivos com is_client_visible = true
  - Aprovacoes do tipo externa_cliente
  - Mensagens da thread do cliente
```

### 14.2 Implementacao

```
Edge function `approvals` (endpoint get-by-token):
  Retorna apenas os campos da allowlist
  Nao usa SELECT * (sempre campos explicitos)

Middleware do portal:
  Valida token antes de renderizar qualquer dado
  Token expirado -> redirect para pagina de erro
  Token invalido -> 404

Rate limiting:
  Max 30 requests/min por token (proteger contra scraping)
  Max 5 tentativas de aprovacao/rejeicao por hora por token
```

---

## 15. Tokens de Referencia Rapida

```
Layout:
  Sem sidebar, sem topbar do app
  Header portal: h-16 fixed top-0 z-50
  Content: max-w-3xl mx-auto px-4 pt-24 pb-12
  Section gap: space-y-8

Tipografia:
  Job title hero:   text-xl font-semibold (mobile) / text-2xl (desktop)
  Section titles:   text-base font-semibold
  Body text:        text-sm
  Meta info:        text-xs text-muted-foreground
  Chat messages:    text-sm

Botoes de aprovacao (mobile, touch-friendly):
  height: h-12 (48px) — acima do minimo de 44px
  width: w-full (mobile) / flex-1 (tablet+)
  font: text-sm font-semibold

Animacoes:
  Bell ring keyframe: 0% 0deg, 10% 15deg, 20% -10deg, 30% 6deg, 40% 0deg, 100% 0deg
  Duration: 2s infinite ease-in-out
  Apenas quando ha aprovacao pendente

Chat area:
  mobile: h-64 (256px)
  tablet: h-80 (320px)
  desktop: h-96 (384px)

Timeline dot sizes:
  default: w-3.5 h-3.5 (14px)
  atual (em progresso): w-4 h-4 com ring-2

Icones das secoes:
  Timeline:    History 18px
  Aprovacoes:  ClipboardCheck 18px
  Documentos:  FolderOpen 18px
  Mensagens:   MessageSquare 18px
```

---

## Changelog

| Data       | Versao | Descricao                       |
|------------|--------|---------------------------------|
| 2026-02-20 | 1.0    | Spec inicial - Fase 7           |
