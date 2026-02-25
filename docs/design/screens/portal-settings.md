# Spec Visual: Configuracoes do Portal (/settings/portal)

**Data:** 2026-02-20
**Versao:** 1.0
**Autor:** UI/UX Designer - ELLAHOS
**Design System:** docs/design/design-system.md
**Fase:** 7 - Dashboard + Relatorios + Portal do Cliente

---

## Indice

1. [Objetivo e Contexto](#1-objetivo-e-contexto)
2. [Integracao no Layout de Settings](#2-integracao-no-layout-de-settings)
3. [Layout Geral da Aba Portal](#3-layout-geral-da-aba-portal)
4. [Secao: Configuracoes Gerais do Portal](#4-secao-configuracoes-gerais-do-portal)
5. [Secao: Secoes Visiveis ao Cliente](#5-secao-secoes-visiveis-ao-cliente)
6. [Secao: Aparencia e Mensagem de Boas-vindas](#6-secao-aparencia-e-mensagem-de-boas-vindas)
7. [Secao: Tokens Ativos](#7-secao-tokens-ativos)
8. [Modal: Criar Token](#8-modal-criar-token)
9. [Modal: Revogar Token](#9-modal-revogar-token)
10. [Preview do Portal](#10-preview-do-portal)
11. [Estados: Loading, Empty, Error](#11-estados-loading-empty-error)
12. [Responsividade](#12-responsividade)
13. [Interacoes e Animacoes](#13-interacoes-e-animacoes)
14. [Acessibilidade](#14-acessibilidade)
15. [Dark Mode](#15-dark-mode)
16. [Tokens de Referencia Rapida](#16-tokens-de-referencia-rapida)

---

## 1. Objetivo e Contexto

A pagina `/settings/portal` e a terceira aba do layout de Configuracoes, ao lado de "Integracoes" e "Notificacoes". Ela permite que o administrador da produtora configure o Portal do Cliente.

**Quem usa:** Admin (CEO, gerente), acesso restrito por role.
**O que faz:**
- Ativar/desativar o portal para a produtora
- Configurar quais secoes o cliente ve (timeline, documentos, aprovacoes, mensagens)
- Customizar a mensagem de boas-vindas
- Gerenciar tokens de acesso (criar, revogar, ver historico)
- Visualizar preview de como o cliente vera o portal

**Roles com acesso:** admin, ceo (mesmo controle do settings existente).

---

## 2. Integracao no Layout de Settings

### 2.1 Adicionar Aba "Portal" ao Layout Existente

O layout `/settings/layout.tsx` ja tem as abas Integracoes e Notificacoes. A nova aba "Portal" e inserida como a terceira.

```
+------------------------------------------------------------------+
|  TOPBAR (h-14, fixed top-0, z-50)                                |
+--------+---------------------------------------------------------+
|        |                                                         |
| SIDE   |  PAGE HEADER                                            |
| BAR    |  Configuracoes                                          |
| w-64   |  Gerencie as configuracoes da producao                  |
|        |                                                         |
|        |  SETTINGS TABS (sticky top-14)                          |
|        |  +---------------------------------------------------+  |
|        |  | [Integracoes]  [Notificacoes]  [Portal]           |  |
|        |  +---------------------------------------------------+  |
|        |                                                         |
|        |  TAB CONTENT (scrollavel)                               |
|        |  +---------------------------------------------------+  |
|        |  |  Conteudo da aba Portal (ver layout abaixo)       |  |
|        |  +---------------------------------------------------+  |
|        |                                                         |
+--------+---------------------------------------------------------+
```

### 2.2 Tab Item

```
Label: "Portal"
Icone: Globe 18px (inline no tab, a esquerda do texto)
URL: /settings/portal
Badge "Novo": optional, badge rose-500 xs texto "Novo" por algumas semanas apos launch

Consistencia com tabs existentes:
  Mesmo styling de Integracoes e Notificacoes
  border-bottom ativo: 2px solid hsl(var(--primary)) — rose
  font: 14px font-medium
```

---

## 3. Layout Geral da Aba Portal

### 3.1 Desktop (1280px+)

```
+------------------------------------------------------------------+
|  SETTINGS TABS: [Integracoes] [Notificacoes] [Portal ativo]      |
+------------------------------------------------------------------+
|                                                                  |
|  PORTAL DO CLIENTE                          [Abrir Preview]      |
|  Configure como seus clientes acessam o projeto                  |
|                                                                  |
|  SECAO: CONFIGURACOES GERAIS                                     |
|  +--------------------------------------------------------------+|
|  | [ ] Ativar Portal do Cliente                                  ||
|  | Permite que clientes acessem seus projetos via link          ||
|  | [--- detalhes quando ativado ---]                            ||
|  +--------------------------------------------------------------+|
|                                                                  |
|  SECAO: SECOES VISIVEIS                                          |
|  +--------------------------------------------------------------+|
|  | O que o cliente pode ver no portal                            ||
|  | [x] Timeline do Projeto    [ ] Documentos                    ||
|  | [x] Aprovacoes             [x] Mensagens                     ||
|  +--------------------------------------------------------------+|
|                                                                  |
|  SECAO: APARENCIA E MENSAGEM                                     |
|  +--------------------------------------------------------------+|
|  | Mensagem de boas-vindas:                                      ||
|  | [Textarea com preview]                                        ||
|  | Logo customizado: [Upload] ou usar logo padrao Ellah         ||
|  +--------------------------------------------------------------+|
|                                                                  |
|  SECAO: TOKENS ATIVOS                                            |
|  +--------------------------------------------------------------+|
|  | Tokens de acesso dos clientes             [+ Criar Token]    ||
|  | Busca: [_________]   Filtro: [Todos v]                       ||
|  |                                                               ||
|  | Tabela de tokens                                              ||
|  +--------------------------------------------------------------+|
|                                                                  |
|  [Salvar alteracoes]                                             |
+------------------------------------------------------------------+
```

### 3.2 Layout das Secoes

```
Cada secao e um card separado com:
  bg: bg-card
  border: 1px border-border
  border-radius: rounded-xl (12px)
  padding: p-6

Separacao entre secoes: space-y-6

Dentro de cada card:
  Header da secao:
    Titulo: text-base font-semibold
    Descricao: text-sm text-muted-foreground mt-0.5

  Conteudo: mt-5

  Divisor interno (se necessario): border-t border-border my-4
```

---

## 4. Secao: Configuracoes Gerais do Portal

### 4.1 Wireframe

```
+--------------------------------------------------------------+
|  PORTAL DO CLIENTE                                            |
|  Controle geral do portal                                     |
|                                                               |
|  +-----------+  Ativar Portal do Cliente                      |
|  | [toggle]  |  Quando ativo, links de acesso podem ser      |
|  +-----------+  gerados e clientes podem acessar seus        |
|                 projetos em tempo real.                        |
|                                                               |
|  [STATUS: ATIVO badge green]     (mostra quando ativo)        |
|                                                               |
|  - - - - (divider quando ativo) - - - -                       |
|                                                               |
|  Expiracao padrao de tokens:                                  |
|  [30 dias v]   "Tokens criados sem expiracao especifica       |
|                 usarao este prazo padrao"                      |
|                                                               |
|  Notificacoes para a producao:                                |
|  [x] Receber email quando cliente visualiza o portal          |
|  [x] Receber notificacao quando cliente envia mensagem        |
|  [ ] Receber notificacao quando aprovacao e respondida        |
|      (estas tambem sao enviadas via sistema de aprovacoes)    |
+--------------------------------------------------------------+
```

### 4.2 Especificacao do Toggle Principal

```
Toggle principal "Ativar Portal do Cliente":
  Componente: shadcn/ui Switch
  Layout: flex items-start gap-4

  Left (flex-1):
    Label: "Ativar Portal do Cliente" — text-sm font-medium
    Descricao: text-sm text-muted-foreground mt-0.5
      "Quando ativo, links de acesso podem ser gerados para clientes."

  Right:
    Switch: w-11 h-6 (padrao shadcn)
    checked: bg-rose-500
    unchecked: bg-muted

Quando desativado:
  Resto da secao: opacity-50 pointer-events-none
  Badge: "INATIVO" — bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400

Quando ativado:
  Badge: "ATIVO" — bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400
  Revelacao das opcoes abaixo: slide-down (Framer Motion, 200ms)

Toggle de ativacao:
  Mudanca salva automaticamente (sem precisar clicar "Salvar")
  Toast: "Portal ativado" / "Portal desativado"
  Loading: switch em estado intermediario + spinner 16px ao lado
```

### 4.3 Expiracao Padrao

```
Select "Expiracao padrao de tokens":
  Opcoes:
    7 dias
    15 dias
    30 dias (padrao)
    60 dias
    90 dias
    Sem expiracao

  Componente: shadcn/ui Select
  h-9 text-sm max-w-[160px]

  Helper text: text-xs text-muted-foreground mt-1.5
  "Tokens criados sem data especifica usarao este prazo."
```

### 4.4 Notificacoes do Portal

```
Lista de checkboxes:

  Cada item:
    flex items-start gap-3
    mb-3

    Checkbox: shadcn/ui Checkbox w-4 h-4 mt-0.5
    Conteudo:
      Label: text-sm font-medium
      Descricao: text-xs text-muted-foreground mt-0.5 (quando relevante)
```

---

## 5. Secao: Secoes Visiveis ao Cliente

### 5.1 Wireframe

```
+--------------------------------------------------------------+
|  O QUE O CLIENTE PODE VER                                     |
|  Escolha quais secoes aparecem no portal do cliente           |
|                                                               |
|  +---------------------------+ +---------------------------+  |
|  | [History 20px]  [toggle] | | [FolderOpen 20px] [toggle]|  |
|  | Timeline do Projeto       | | Documentos e Arquivos     |  |
|  | Historico de status e     | | Links de Drive e arquivos |  |
|  | marcos do projeto.        | | com is_client_visible.    |  |
|  +---------------------------+ +---------------------------+  |
|                                                               |
|  +---------------------------+ +---------------------------+  |
|  | [ClipboardCheck] [toggle] | | [MessageSquare] [toggle]  |  |
|  | Aprovacoes                | | Mensagens                 |  |
|  | Solicitacoes de aprovacao | | Chat direto com a         |  |
|  | do tipo externa_cliente.  | | producao.                 |  |
|  +---------------------------+ +---------------------------+  |
+--------------------------------------------------------------+
```

### 5.2 Especificacao do Card de Secao

```
Grid: grid-cols-2 gap-4 (desktop) / grid-cols-1 (mobile)

Card de secao:
  border: 1px border-border
  rounded-lg
  p-4
  flex flex-col gap-3
  bg: bg-card
  transition-all duration-150

  Quando ativado:
    border-rose-500/30 bg-rose-50/50 dark:bg-rose-500/5

  Header (flex justify-between items-start):
    Left (flex items-center gap-2):
      Icone: 20px, cor:
        Timeline:    zinc-600 dark:zinc-400 (desativado) / rose-500 (ativado)
        Documentos:  zinc-600 dark:zinc-400 (desativado) / blue-500 (ativado)
        Aprovacoes:  zinc-600 dark:zinc-400 (desativado) / violet-500 (ativado)
        Mensagens:   zinc-600 dark:zinc-400 (desativado) / emerald-500 (ativado)

      Label: text-sm font-medium

    Right:
      Switch (shadcn)

  Descricao:
    text-xs text-muted-foreground leading-relaxed
    max 2 linhas

  (Opcional) aviso contextual:
    text-xs text-amber-600 dark:text-amber-400
    icone AlertTriangle 12px
    ex: "Requer arquivos com visibilidade de cliente"

Regra de negocio:
  Timeline nao pode ser desativada (e sempre visivel — aviso + toggle disabled)
  Tooltip no toggle desabilitado: "A timeline e sempre exibida no portal"
```

---

## 6. Secao: Aparencia e Mensagem de Boas-vindas

### 6.1 Wireframe

```
+--------------------------------------------------------------+
|  APARENCIA E MENSAGEM DE BOAS-VINDAS                          |
|  Customize a experiencia do seu cliente                       |
|                                                               |
|  Logo do Portal:                                              |
|  [preview imagem 64px]  [Fazer upload]  [Usar padrao]        |
|  Recomendado: PNG transparente, min 200x80px                  |
|                                                               |
|  - - - - - - - - - - - - - - - - - - - - - - - - - - - - -   |
|                                                               |
|  Mensagem de boas-vindas:                                     |
|  +----------------------------------------------------------+ |
|  | Ola! Aqui voce pode acompanhar o andamento do seu        | |
|  | projeto em tempo real. Qualquer duvida, entre em contato | |
|  | com nossa equipe.                                        | |
|  +----------------------------------------------------------+ |
|  300/500 caracteres                                           |
|                                                               |
|  [ Preview da mensagem ]                                      |
|                                                               |
|  Email de contato exibido no portal:                          |
|  [contato@ellahfilmes.com_________________]                   |
|  Este email aparece no rodape do portal para duvidas          |
+--------------------------------------------------------------+
```

### 6.2 Especificacao

```
Logo do Portal:

  Preview:
    Container: w-24 h-12 border border-dashed border-border rounded-lg
    flex items-center justify-center
    bg: checkerboard pattern (indica transparencia) ou bg-white/50
    Se tem logo: imagem object-contain w-full h-full p-1
    Se nao tem: Icone Image 24px text-muted-foreground

  Botoes:
    [Fazer upload]: Button outline size="sm"
      Icone: Upload 14px
      Abre file picker (accept="image/png,image/svg+xml")
      Max: 2MB
      Apos upload: preview atualiza, toast "Logo atualizado"

    [Usar padrao]: Button ghost size="sm" text-muted-foreground
      Volta para o logo da Ellah Filmes

  Validacao:
    Tamanho maximo: 2MB (erro inline se maior)
    Tipos: PNG, SVG apenas
    Resolucao recomendada: informativo, nao bloqueante


Mensagem de boas-vindas:

  Label: "Mensagem de boas-vindas" — text-sm font-medium
  Helper: text-xs text-muted-foreground mt-0.5
    "Esta mensagem aparece no topo do portal quando o cliente acessa."

  Textarea:
    shadcn Textarea
    rows="4" (fixo, sem auto-resize)
    max-length: 500
    placeholder: "Ola! Aqui voce pode acompanhar..."
    h-24

  Contador: flex justify-end text-xs text-muted-foreground mt-1
    "{N}/500 caracteres"
    Quando > 450: text-amber-500
    Quando 500: text-red-500

  Toggle de preview:
    Button ghost size="sm" text-xs icone Eye 14px
    "Visualizar preview"
    Expande card inline mostrando como a mensagem aparece no portal
    bg: bg-muted/50 rounded-lg p-4 mt-3
    Texto formatado como no portal real


Email de contato:

  Label: "Email de contato"
  Input type="email"
  h-9 text-sm
  Validacao: formato de email ao blur
  Helper: text-xs text-muted-foreground
```

---

## 7. Secao: Tokens Ativos

### 7.1 Wireframe

```
+--------------------------------------------------------------+
|  TOKENS DE ACESSO                      [+ Criar Token]        |
|  32 tokens ativos                                             |
|                                                               |
|  [Buscar...________]  [Status: Todos v]  [Job: Todos v]      |
|                                                               |
|  +-------------------------------------------------------+   |
|  | Job             | Contato         | Criado  | Expira  |   |
|  | [=====]         | [======]        | [====]  | [====]  |   |
|  +-------------------------------------------------------+   |
|  | BBB_042         | Maria Costa     | 15 Jan  | 15 Abr  |   |
|  | Campanha Verao  | maria@ambev.com | 2026    | 2026    |   |
|  | [badge ATIVO]   |                 |         |         |   |
|  | [...] [Revogar] |                 |         |         |   |
|  +-------------------------------------------------------+   |
|  | BBB_039         | Carlos Mendes   | 10 Jan  | Sem exp |   |
|  | Documentario    | carlos@nat.com  | 2026    | iracao  |   |
|  | [badge ATIVO]   |                 |         |         |   |
|  | [...] [Revogar] |                 |         |         |   |
|  +-------------------------------------------------------+   |
|  | BBB_031         | Ana Lima        | 01 Dez  | 01 Mar  |   |
|  | Spot Animado    | ana@mag.com     | 2025    | 2026    |   |
|  | [badge EXPIRADO]|                 |         |         |   |
|  | [Renovar] [Del] |                 |         |         |   |
|  +-------------------------------------------------------+   |
|                                                               |
|  Mostrando 1-10 de 32   [<] [1] [2] [3] [>]                 |
+--------------------------------------------------------------+
```

### 7.2 Header e Filtros

```
Header:
  flex justify-between items-center mb-4

  Esquerda:
    Titulo: "Tokens de Acesso" — text-base font-semibold
    Subtitulo: "N tokens ativos" — text-sm text-muted-foreground

  Direita:
    [+ Criar Token]: Button variant="default" size="sm" icone Plus 16px

Barra de filtros:
  flex gap-3 mb-4 flex-wrap

  Busca:
    Input com prefix Search 16px
    placeholder: "Buscar por job ou contato..."
    h-9 text-sm max-w-xs

  Status:
    Select: Todos | Ativos | Expirados | Revogados
    h-9 text-sm

  Job:
    Combobox searchable: lista de jobs
    h-9 text-sm
```

### 7.3 Tabela de Tokens

```
Colunas:
  Job:
    Stack de 2 linhas:
      Codigo: text-xs font-mono text-muted-foreground
      Titulo: text-sm font-medium (truncado, max 200px)
    Status badge: abaixo do titulo, altura 20px
      ATIVO:    bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400
      EXPIRADO: bg-zinc-100 text-zinc-500 dark:bg-zinc-500/10 dark:text-zinc-400
      REVOGADO: bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400

  Contato:
    Nome: text-sm font-medium
    Email: text-xs text-muted-foreground

  Criado em:
    Data: text-sm
    Formato: "15 jan 2026"
    text-muted-foreground

  Expira em:
    Data: text-sm
    Expirado: text-red-500 font-medium
    Proximo (< 7 dias): text-amber-500 font-medium + icone AlertTriangle 12px
    Sem expiracao: text-muted "Sem expiracao"

  Ultimo acesso:
    Data + hora relativa: "ha 2 horas", "ha 3 dias"
    text-xs text-muted-foreground
    "Nunca acessado" se nao ha historico

  Acoes:
    DropdownMenu (MoreHorizontal icon)
    Opcoes:
      [Copy] Copiar link
      [Eye] Abrir portal (nova aba)
      [RefreshCw] Renovar (estende expiracao)
      [---]
      [Trash2] Revogar acesso (destructive)

Row de token revogado:
  opacity-60
  Texto riscado no codigo do job (line-through)
  Badge REVOGADO

Row de token expirado:
  opacity-80
  Acoes: [Renovar] aparece em destaque (nao no dropdown, botao inline)
```

### 7.4 Paginacao

```
Identica a paginacao de outras tabelas do app (ver jobs-dashboard.md)
flex justify-between items-center mt-4

Info: "Mostrando X-Y de N tokens"
Paginas: < [1] [2] [3] > (max 5 paginas visiveis)
Por pagina: Select 10 | 25 | 50
```

---

## 8. Modal: Criar Token

### 8.1 Wireframe

```
+--------------------------------------+
|  Criar Token de Acesso          [X]  |
+--------------------------------------+
|                                      |
|  Job *                               |
|  [Selecionar job...        v]        |
|  Busca por codigo ou titulo          |
|                                      |
|  Contato *                           |
|  [Selecionar contato...    v]        |
|  Busca na lista de contatos          |
|  [+ Adicionar novo contato]          |
|                                      |
|  Expiracao                           |
|  ( ) Usar padrao (30 dias)           |
|  ( ) Data especifica: [____/__/____] |
|  ( ) Sem expiracao                   |
|                                      |
|  Secoes habilitadas para este token  |
|  (herda as configuracoes globais,    |
|   pode sobrescrever por token)       |
|  [x] Timeline  [x] Documentos       |
|  [x] Aprovacoes [ ] Mensagens       |
|                                      |
|  Notificar o contato                 |
|  [x] Enviar link por email           |
|  [ ] Enviar por WhatsApp             |
|                                      |
|  - - - preview do link - - -        |
|  https://app.ellahos.com/portal/     |
|  [abcdef123...] [Copiar]             |
|                                      |
+--------------------------------------+
|  [Cancelar]         [Criar Token]    |
+--------------------------------------+
```

### 8.2 Especificacao

```
Modal:
  shadcn Dialog
  max-w-lg (512px)
  Overlay: bg-black/50 backdrop-blur-sm

Cabecalho:
  Titulo: "Criar Token de Acesso" — text-lg font-semibold
  Botao fechar: X ghost icon

Formulario:
  space-y-5

  Campo Job:
    Label: "Job *"
    Combobox searchable (Popover + Command)
    Busca: por codigo (BBB_XXX) OU titulo
    Itens: "BBB_042 - Campanha Verao 2026"
    Codigo em font-mono text-muted

  Campo Contato:
    Label: "Contato *"
    Combobox searchable
    Itens: "[Nome] — email@empresa.com"
    Link "+ Adicionar novo contato": ghost text-sm text-rose-500
      Abre um segundo dialog (ou inline form com slide-down)
      Campos: Nome, Email, Empresa

  Expiracao:
    RadioGroup vertical
    Opcao "Data especifica": revela DatePicker inline
    DatePicker: min date = hoje + 1

  Secoes habilitadas:
    Grid 2 colunas de checkboxes
    Label: "Secoes para este token"
    Helper: text-xs "Sobrescreve as configuracoes globais apenas para este token"

  Notificar:
    Checkboxes de envio
    Email: sempre disponivel (se contato tem email)
    WhatsApp: apenas disponivel se integracao WhatsApp configurada
      Se nao configurada: disabled + tooltip "Configure a integracao WhatsApp primeiro"

  Preview do link:
    bg-muted/50 rounded-lg p-3
    label: "Link gerado:" text-xs text-muted-foreground mb-1
    URL: text-xs font-mono text-foreground break-all
    O token so e gerado APOS criar (mostrar placeholder "---" antes)
    Botao Copiar: appear apos criacao

Rodape:
  [Cancelar] Button variant="outline"
  [Criar Token] Button variant="default" (rose)
  Loading state: Loader2 no botao + texto "Criando..."

Validacoes inline:
  Job: obrigatorio
  Contato: obrigatorio
  Data especifica: deve ser futura
  Erro: text-xs text-red-500 abaixo do campo
```

---

## 9. Modal: Revogar Token

### 9.1 Wireframe

```
+------------------------------------------+
|  Revogar Acesso                     [X]  |
+------------------------------------------+
|                                          |
|  [AlertTriangle 32px amber-500]          |
|                                          |
|  Tem certeza que deseja revogar          |
|  o acesso de Maria Costa ao portal       |
|  do job BBB_042?                         |
|                                          |
|  O link de acesso sera invalidado        |
|  imediatamente. Esta acao nao pode       |
|  ser desfeita.                           |
|                                          |
+------------------------------------------+
|  [Cancelar]         [Revogar acesso]     |
+------------------------------------------+
```

### 9.2 Especificacao

```
Modal:
  shadcn AlertDialog (para destructive actions)
  max-w-sm (380px)
  Centrado na tela

Conteudo:
  Icone: AlertTriangle 40px text-amber-500 mx-auto
  Titulo: text-lg font-semibold mt-4 text-center
  Texto: text-sm text-muted-foreground mt-2 text-center

  Destaques em negrito: nome do contato + codigo do job

Rodape:
  [Cancelar]: Button variant="outline" (foco aqui ao abrir)
  [Revogar acesso]: Button variant="destructive"
    Loading: Loader2 + "Revogando..."

Apos revogar:
  Modal fecha
  Row na tabela: anima para estado REVOGADO (opacity-60, badge update)
  Toast: "Acesso de [nome] revogado" (warning amber)
```

---

## 10. Preview do Portal

### 10.1 Botao no Header

```
Botao "Abrir Preview":
  Button variant="outline" size="sm"
  Icone: Eye 16px mr-2
  Texto: "Abrir Preview"
  Acao: abre /portal/preview-token em nova aba (token especial de preview, nao expira, nao conta no historico)
  Tooltip: "Veja como o cliente visualiza o portal"
```

### 10.2 Modal de Preview Inline (alternativo)

Em mobile, ao inves de nova aba, pode mostrar preview em drawer do lado direito:

```
Sheet (drawer from right):
  w-full sm:max-w-sm
  Header: "Preview do Portal" + botao fechar
  Conteudo: iframe do portal (scaled down) ou renderizacao inline
  Footer: "O cliente vera exatamente assim no celular"
```

---

## 11. Estados: Loading, Empty, Error

### 11.1 Loading da Aba

```
Configuracoes (toggles e selects): skeleton de cada card
  Card 1: h-32 skeleton
  Card 2: grid 2x2 de skeleton h-24
  Card 3: h-40 skeleton
  Tabela: header skeleton + 5 rows skeleton

Animate-pulse, border-radius compativel com o card real
```

### 11.2 Empty (sem tokens)

```
Estado da tabela quando nao ha tokens:

  Container: py-12 flex flex-col items-center text-center

  Icone: Key 48px text-muted-foreground mx-auto

  Titulo: "Nenhum token criado"
  text-base font-medium mt-4

  Descricao: "Crie tokens de acesso para compartilhar o portal do seu projeto com clientes."
  text-sm text-muted-foreground mt-2 max-w-sm

  CTA: [+ Criar primeiro token] Button variant="default" mt-6
```

### 11.3 Empty (portal desativado)

```
Quando portal esta desativado, as secoes abaixo do toggle ficam:
  opacity-50 pointer-events-none (CSS)
  Blur overlay opcional: blur-[1px] (sutil)

Tabela de tokens mostra empty state com mensagem:
  "Ative o portal para gerenciar tokens de acesso"
  Button ghost desabilitado "+ Criar Token"
```

### 11.4 Error

```
Banner identico ao padrao do app:
  bg-red-50 dark:bg-red-950/30 rounded-xl p-4
  [AlertTriangle] "Erro ao carregar configuracoes. [Tentar novamente]"

Tabela com erro:
  Empty state com icone WifiOff e botao Retry
```

---

## 12. Responsividade

### 12.1 Mobile (<768px)

```
+---------------------------+
|  TOPBAR                   |
+---------------------------+
|  SETTINGS TABS (scroll)   |
|  [Integ.][Notif.][Portal] |
+---------------------------+
|  CONFIGURACOES GERAIS     |
|  Toggle (full width)      |
|  Expiracao + Notificacoes |
|  (empilhados)             |
+---------------------------+
|  SECOES VISIVEIS          |
|  Grid 1 coluna            |
|  (4 cards empilhados)     |
+---------------------------+
|  APARENCIA E MENSAGEM     |
|  Logo upload full width   |
|  Textarea full width      |
|  Email full width         |
+---------------------------+
|  TOKENS                   |
|  Header: titulo + botao   |
|  Filtros colapsados:      |
|  [Filtrar v] abre drawer  |
|                           |
|  Tokens como CARDS:       |
|  +--------------------+   |
|  | BBB_042            |   |
|  | Campanha Verao     |   |
|  | [ATIVO] [...]      |   |
|  | Maria Costa        |   |
|  | Exp: 15 abr 2026   |   |
|  | [Copiar link]      |   |
|  | [Revogar]          |   |
|  +--------------------+   |
+---------------------------+
|  [Salvar]                 |
+---------------------------+
|  BOTTOM NAV               |
+---------------------------+

Modal criar token no mobile:
  Sheet from bottom (100% height - 20%)
  Formulario em 1 coluna
  Botoes full width
```

### 12.2 Tablet (768px - 1023px)

```
Tabs: visiveis completas
Secoes: 1 coluna de cards
Secoes visiveis: grid-cols-2
Tabela: scroll horizontal, colunas compactas
Modal criar: max-w-lg centrado
```

### 12.3 Desktop Grande (1536px+)

```
Secoes: max-w-3xl (mais estreito para melhor leitura de forms)
Tabela: ainda max-w-7xl (precisa das colunas)
Modal: max-w-lg (nao aumenta)
```

---

## 13. Interacoes e Animacoes

### 13.1 Toggle de Ativacao

```
On:
  Switch: slide (150ms, padrao shadcn)
  Reveal das opcoes abaixo: height 0 -> auto + opacity 0 -> 1 (200ms ease-out)
  Badge: swap INATIVO -> ATIVO com fade (100ms)
  Auto-save: debounce 500ms, toast confirmacao

Off:
  Reverse das animacoes
  Se ha tokens ativos: dialog de confirmacao
    "Voce tem N tokens ativos. Desativar o portal invalidara todos os acessos."
    [Cancelar] [Desativar mesmo assim]
```

### 13.2 Cards de Secao Visivel

```
Ao ligar toggle de uma secao:
  Card: border muda para rose-500/30 (150ms)
  Icone: cor muda de zinc para cor do tipo (150ms)
  bg: leve tint da cor do tipo (/5 opacity, 150ms)

Ao desligar:
  Reverse: tudo volta para neutro (150ms)
```

### 13.3 Tabela de Tokens

```
Criacao de novo token:
  Nova row aparece no topo com highlight de 2s:
  bg-rose-50 dark:bg-rose-500/10 -> bg-transparent (fade out 2s)

Revogacao:
  Row: opacity 100 -> 60 (300ms)
  Badge: ATIVO -> REVOGADO com fade (150ms)
  Se era a unica row ativa: empty state aparece com fade-in
```

### 13.4 Botao Salvar

```
Sticky bottom bar (aparece quando ha mudancas nao salvas):
  Position: sticky bottom-0
  bg: background/95 backdrop-blur-sm border-t border-border
  py-4 px-6
  flex justify-between items-center

  Left: "Voce tem alteracoes nao salvas" — text-sm text-muted-foreground
  Right: [Descartar] [Salvar alteracoes]

  Aparece com slide-up (translateY 100% -> 0, 200ms ease-out)
  Some com slide-down ao salvar ou descartar

Alguns campos (toggle de ativacao, toggles de secao): auto-save
Outros (mensagem, email, logo): require "Salvar alteracoes"
```

---

## 14. Acessibilidade

```
Settings tabs (ja implementadas):
  role="tablist" / role="tab" / role="tabpanel"
  aria-selected, Arrow keys para navegar entre tabs

Toggle principal:
  aria-label="Ativar ou desativar portal do cliente"
  aria-checked (managed pelo Switch component)
  Keyboard: Space para toggle

Cards de secao visivel:
  Cada switch: aria-label="[Nome da secao]: ativar ou desativar"
  aria-describedby apontando para a descricao do card

Tabela de tokens:
  <caption> descritivo
  Coluna acoes: aria-label="Acoes para token de [job] - [contato]"
  Status badge: aria-label="Status: [ATIVO/EXPIRADO/REVOGADO]"

Modal criar token:
  focus-trap dentro do dialog
  Primeiro foco: campo Job (primeiro campo obrigatorio)
  Escape: fecha o modal (sem salvar)
  aria-describedby: descricao do que o token faz

Modal revogar:
  shadcn AlertDialog ja gerencia aria-alertdialog
  Foco inicial: botao "Cancelar" (mais seguro para destructive)
  aria-describedby: descricao das consequencias

Confirmacoes de acao:
  aria-live="polite" para toasts
  Toast de erro: aria-live="assertive"

Contraste:
  Badge ATIVO (green-700 over green-100 light): 6.7:1 OK (AAA)
  Badge REVOGADO (red-600 over red-100 light): 5.4:1 OK (AA)
  Toggle checked rose-500 sobre white: contraste do thumb OK
  Texto muted sobre card: zinc-500 over white: 4.6:1 OK (AA)
```

---

## 15. Dark Mode

```
Settings page background: bg-background (zinc-950)
Cards: bg-card (zinc-900/50 aproximado)
Borders: border-border (zinc-700)

Toggle principal:
  Switch checked: bg-rose-500 (no dark tambem)
  Switch unchecked: bg-zinc-600

Cards de secao:
  Ativados: border-rose-500/20 bg-rose-500/5 (mais sutil que light)
  Icones ativos: cores plenas (rose-400, blue-400, violet-400, emerald-400 no dark)

Tabela de tokens:
  Header: bg-zinc-900
  Row hover: bg-zinc-800/50
  Badge ATIVO: bg-green-500/10 text-green-400
  Badge EXPIRADO: bg-zinc-500/10 text-zinc-400
  Badge REVOGADO: bg-red-500/10 text-red-400
  Data proximo de expirar: text-amber-400

Modal criar token:
  bg: bg-popover (zinc-900)
  Link preview: bg-zinc-800 text-zinc-300

Sticky save bar:
  bg: zinc-950/95 backdrop-blur-md
  border-t: zinc-800

Upload area logo:
  border: border-dashed border-zinc-600
  bg: bg-zinc-800/50

Textarea mensagem:
  bg: bg-zinc-800 border-zinc-700
  placeholder: text-zinc-500
```

---

## 16. Tokens de Referencia Rapida

```
Sticky positions dentro do settings layout:
  Tabs settings: top-14 z-30 (ja definido no layout existente)
  Sticky save bar: bottom-0 z-20

Cards (geral):
  border-radius: rounded-xl (12px)
  padding: p-6
  gap entre cards: space-y-6

Formulario:
  max-w dentro dos cards: sem restricao (ocupa o card)
  Campos texto: h-9 text-sm
  Textarea: resize-none h-24

Modal criar token:
  max-w: max-w-lg (512px)
  padding: p-6
  form gap: space-y-5

Modal revogar:
  max-w: max-w-sm (380px)
  padding: p-6

Tabela de tokens:
  Row height: h-16 (2 linhas de texto na coluna Job)
  Paginacao: identica ao jobs-dashboard

Icones das secoes do portal:
  Timeline:    History 20px
  Documentos:  FolderOpen 20px
  Aprovacoes:  ClipboardCheck 20px
  Mensagens:   MessageSquare 20px

Icones de acao na tabela:
  Copiar link:  Copy 16px
  Abrir portal: ExternalLink 16px
  Renovar:      RefreshCw 16px
  Revogar:      ShieldOff 16px (destructive)
  Delete:       Trash2 16px (destructive)

Tab "Portal" no settings layout:
  Icone: Globe 18px inline no tab label
  Texto: "Portal"
```

---

## Changelog

| Data       | Versao | Descricao                       |
|------------|--------|---------------------------------|
| 2026-02-20 | 1.0    | Spec inicial - Fase 7           |
