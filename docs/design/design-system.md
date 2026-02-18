# ELLAHOS Design System

> Design System oficial do ELLAHOS - SaaS de gestao para produtoras audiovisuais.
> Baseado na identidade visual da Ellah Filmes, adaptado para interface de produto.

---

## 1. Fundamentos

### 1.1 Filosofia
O ELLAHOS e uma ferramenta profissional para produtoras audiovisuais. O design deve ser:
- **Limpo e funcional**: informacao e protagonista, nao decoracao
- **Cinematografico**: inspirado no universo audiovisual (tons quentes, contraste)
- **Denso mas respiravel**: muitos dados sem parecer apertado
- **Rapido de escanear**: hierarquia visual clara, padroes reconheciveis

### 1.2 Principios
1. **Conteudo primeiro** - UI desaparece, o trabalho do usuario aparece
2. **Consistencia** - mesma acao, mesmo visual, sempre
3. **Feedback imediato** - toda acao do usuario gera resposta visual
4. **Acessivel por padrao** - WCAG 2.1 AA minimo
5. **Mobile e set-friendly** - funciona no celular, no set de filmagem, sob sol

---

## 2. Paleta de Cores

### 2.1 Cores da Marca

A Ellah Filmes usa preto e branco com um rosa suave (blush) na palavra "Filmes" do logo. Essa combinacao cria uma identidade simplista mas marcante.

```
BRAND
  ellah-black:    #09090B   (quase-preto, base do dark mode)
  ellah-charcoal: #32373C   (cinza escuro da marca)
  ellah-rose:     #F472B6   (rosa blush - "Filmes" no logo)
  ellah-white:    #FAFAFA   (off-white, base do light mode)
```

### 2.2 Cor Accent Primaria (Rose/Pink)

O rosa do logo e a cor de destaque principal do ELLAHOS. Usada em CTAs, links ativos, elementos de destaque e estados selecionados.

```
ACCENT PRIMARY (rose/pink)
  50:   #FFF1F2
  100:  #FFE4E6
  200:  #FECDD3
  300:  #FDA4AF
  400:  #FB7185
  500:  #F43F5E   ← accent principal (dark mode)
  600:  #E11D48   ← accent principal (light mode)
  700:  #BE185D
  800:  #9F1239
  900:  #881337
```

### 2.3 Cor Accent Secundaria (Amber/Gold)

Inspirada na "hora dourada" da cinematografia. Usada para destaques financeiros, badges premium e elementos complementares.

```
ACCENT SECONDARY (amber)
  50:   #FFFBEB
  100:  #FEF3C7
  200:  #FDE68A
  300:  #FCD34D
  400:  #FBBF24
  500:  #F59E0B
  600:  #D97706
  700:  #B45309
  800:  #92400E
  900:  #78350F
```

### 2.4 Cores Neutras (Gray Scale)

Baseadas em zinc do Tailwind (tom levemente quente, combina com a marca).

```
NEUTRAL (zinc)
  50:   #FAFAFA
  100:  #F4F4F5
  150:  #ECECED
  200:  #E4E4E7
  300:  #D4D4D8
  400:  #A1A1AA
  500:  #71717A
  600:  #52525B
  700:  #3F3F46
  800:  #27272A
  850:  #1F1F23
  900:  #18181B
  950:  #09090B
```

### 2.5 Cores Semanticas

```
SUCCESS (green)
  light:  #16A34A  (green-600)
  dark:   #22C55E  (green-500)
  bg:     #F0FDF4  (green-50)  |  dark-bg: #052E16 (green-950)

ERROR (red)
  light:  #DC2626  (red-600)
  dark:   #EF4444  (red-500)
  bg:     #FEF2F2  (red-50)   |  dark-bg: #450A0A (red-950)

WARNING (yellow)
  light:  #CA8A04  (yellow-600)
  dark:   #EAB308  (yellow-500)
  bg:     #FEFCE8  (yellow-50) |  dark-bg: #422006 (yellow-950)

INFO (blue)
  light:  #2563EB  (blue-600)
  dark:   #3B82F6  (blue-500)
  bg:     #EFF6FF  (blue-50)  |  dark-bg: #172554 (blue-950)
```

### 2.6 Cores de Status do Job

Cada status do job tem uma cor fixa para reconhecimento instantaneo.

```
STATUS
  briefing:       #8B5CF6  (violet-500)    - Roxo: inicio, ideia
  orcamento:      #F59E0B  (amber-500)     - Dourado: dinheiro, negociacao
  aprovado:       #22C55E  (green-500)     - Verde: aprovado, go!
  pre_producao:   #3B82F6  (blue-500)      - Azul: planejamento
  producao:       #EF4444  (red-500)       - Vermelho: ao vivo, urgente
  pos_producao:   #A855F7  (purple-500)    - Purple: edicao, magia
  entrega:        #06B6D4  (cyan-500)      - Ciano: saindo, entregando
  concluido:      #10B981  (emerald-500)   - Esmeralda: feito, completo
  cancelado:      #6B7280  (gray-500)      - Cinza: inativo
```

### 2.7 Aplicacao Light/Dark Mode

```
                        LIGHT MODE          DARK MODE
Background:             #FFFFFF             #09090B
Background subtle:      #FAFAFA             #18181B
Surface (cards):        #FFFFFF             #1F1F23
Surface hover:          #F4F4F5             #27272A
Border:                 #E4E4E7             #3F3F46
Border subtle:          #F4F4F5             #27272A
Text primary:           #09090B             #FAFAFA
Text secondary:         #71717A             #A1A1AA
Text muted:             #A1A1AA             #71717A
Accent:                 #E11D48             #FB7185
Accent hover:           #BE185D             #F43F5E
Accent text on bg:      #9F1239             #FFE4E6
Accent secondary:       #F59E0B             #FBBF24
Accent secondary hover: #D97706             #F59E0B
Sidebar bg:             #FAFAFA             #0F0F12
Sidebar active:         #FFF1F2             #3F1F28
```

---

## 3. Tipografia

### 3.1 Font Stack

```
Heading:  "Inter", system-ui, -apple-system, sans-serif
Body:     "Inter", system-ui, -apple-system, sans-serif
Mono:     "JetBrains Mono", "Fira Code", ui-monospace, monospace
```

Inter e a fonte padrao do shadcn/ui - limpa, legivel, boa para dashboards.

### 3.2 Escala Tipografica

Base: 16px (1rem). Escala com ratio ~1.25 (Major Third).

```
TAMANHO            REM      PX     PESO        USO
display-lg         2.25     36     700 (bold)  Hero, pagina principal
display-sm         1.875    30     600 (semi)  Titulos de secao grandes
heading-1          1.5      24     600 (semi)  Titulo de pagina
heading-2          1.25     20     600 (semi)  Titulo de secao/card
heading-3          1.125    18     500 (med)   Subtitulo
body-lg            1.0      16     400 (reg)   Texto principal
body-sm            0.875    14     400 (reg)   Texto secundario, tabelas
caption            0.75     12     500 (med)   Labels, badges, meta info
overline           0.6875   11     600 (semi)  Overline, categorias (uppercase)
```

### 3.3 Line Height

```
Headings:  1.2 (leading-tight)
Body:      1.5 (leading-normal)
UI tight:  1.25 (leading-snug) - para tabelas, badges, botoes
```

### 3.4 Letter Spacing

```
Headings:     -0.025em (tracking-tight)
Body:          0 (tracking-normal)
Overline:      0.05em (tracking-wide) + uppercase
Mono:         -0.02em
```

---

## 4. Espacamento

### 4.1 Sistema de 4-point Grid

Todo espacamento e multiplo de 4px. Usar tokens do Tailwind.

```
TOKEN    PX     TAILWIND    USO
0        0      0           Reset
0.5      2      0.5         Micro gap (entre icone e texto inline)
1        4      1           Padding interno minimo (badges)
1.5      6      1.5         Gap pequeno
2        8      2           Padding de botoes, gap entre items
3        12     3           Padding de inputs
4        16     4           Padding de cards, gap entre secoes
5        20     5           Separacao media
6        24     6           Padding de secao, sidebar padding
8        32     8           Gap entre grupos de conteudo
10       40     10          Margin entre secoes grandes
12       48     12          Padding de container
16       64     16          Espacamento de layout
20       80     20          Separacao de blocos de pagina
```

### 4.2 Layout Spacing

```
Page padding (desktop):    px-6 (24px) ate px-8 (32px)
Page padding (mobile):     px-4 (16px)
Card padding:              p-4 (16px) ate p-6 (24px)
Section gap:               gap-6 (24px) ate gap-8 (32px)
Inline gap (items):        gap-2 (8px) ate gap-3 (12px)
Stack gap (vertical):      gap-4 (16px)
```

---

## 5. Grid e Layout

### 5.1 Breakpoints

Seguir Tailwind defaults (mobile-first):

```
sm:   640px    - Celular grande / landscape
md:   768px    - Tablet
lg:   1024px   - Laptop
xl:   1280px   - Desktop
2xl:  1536px   - Monitor grande
```

### 5.2 Layout Principal

```
+--------------------------------------------------+
|  Top Bar (h-14, fixed)                           |
+--------+-----------------------------------------+
|        |                                         |
| Side   |  Main Content                           |
| bar    |  (max-w-7xl, mx-auto)                   |
| (w-64) |                                         |
| collap |  +-----------------------------------+  |
| sible  |  | Page Header                      |  |
|        |  | (titulo + acoes)                 |  |
| mobile:|  +-----------------------------------+  |
| bottom |  | Content Area                     |  |
| nav    |  | (tabela, kanban, form...)        |  |
|        |  +-----------------------------------+  |
+--------+-----------------------------------------+
```

**Desktop (lg+):** Sidebar fixa a esquerda (w-64, colapsavel para w-16)
**Tablet (md):** Sidebar overlay (drawer)
**Mobile (<md):** Bottom navigation bar (5 items max) + menu hamburger

### 5.3 Content Width

```
Conteudo principal: max-w-7xl (1280px) com mx-auto
Formularios: max-w-2xl (672px) para forms simples, max-w-4xl (896px) para forms complexos
Modais small: max-w-md (448px)
Modais medium: max-w-lg (512px)
Modais large: max-w-2xl (672px)
Modais full: max-w-4xl (896px)
```

---

## 6. Componentes

### 6.1 Botoes

Base: shadcn/ui Button, customizado.

```
VARIANTE        BG                  TEXT            BORDA          USO
primary         accent-500          white           none           Acao principal (1 por tela)
secondary       neutral-100/800     neutral-900/100 neutral-200    Acao secundaria
outline         transparent         neutral-700/300 neutral-300    Acao terciaria
ghost           transparent         neutral-700/300 none           Acao minima, toolbar
destructive     red-600/500         white           none           Deletar, cancelar
link            transparent         accent-600/400  none           Navegacao inline
```

```
TAMANHO     H      PX-PADDING   FONT-SIZE    ICON-SIZE
sm          32px   px-3         14px (sm)    16px
default     36px   px-4         14px (sm)    18px
lg          40px   px-6         16px (base)  20px
icon-only   36px   px-0 (w-9)   -            18px
```

Regras:
- Cantos: rounded-md (6px)
- Transicao: transition-colors duration-150
- Disabled: opacity-50, cursor-not-allowed
- Loading: spinner Lucide (Loader2) animado, texto "Salvando..." etc.
- Maximo 1 botao primary por contexto visual

### 6.2 Inputs

Base: shadcn/ui Input, customizado.

```
Estado          BG              BORDA           RING
default         white/neutral-900  neutral-300/700  none
focus           white/neutral-900  accent-500       ring-2 ring-accent/20
error           white/neutral-900  red-500          ring-2 ring-red/20
disabled        neutral-100/800    neutral-200/700  none (opacity-50)
```

```
TAMANHO     H      FONT-SIZE   PADDING
sm          32px   14px        px-3
default     36px   14px        px-3
lg          40px   16px        px-4
```

Regras:
- Label: body-sm (14px) font-medium, acima do input, gap-1.5
- Placeholder: text-muted (neutral-500/400)
- Helper text: caption (12px) text-muted, abaixo do input
- Error message: caption (12px) text-red-500, abaixo do input
- Required: asterisco vermelho ao lado do label

### 6.3 Cards

```
Card padrao:
  bg: surface (white/neutral-850)
  border: 1px neutral-200/neutral-800
  radius: rounded-lg (8px)
  shadow: shadow-sm (light mode only)
  padding: p-4 a p-6

Card hover (clicavel):
  hover:shadow-md hover:border-neutral-300 (light)
  hover:border-neutral-600 (dark)
  transition-all duration-150
  cursor-pointer

Card selected:
  border-accent-500
  ring-2 ring-accent/10
```

### 6.4 Tabelas

Estilo inspirado no Monday.com - clean, compactas, escaneáveis.

```
Table container:
  bg: surface
  border: 1px neutral-200/800
  radius: rounded-lg
  overflow: hidden

Header row:
  bg: neutral-50/neutral-900
  font: body-sm font-medium text-secondary
  h: 40px
  border-bottom: 1px

Body row:
  h: 44px (compact) | 52px (default) | 64px (comfortable)
  border-bottom: 1px neutral-100/neutral-850
  hover: bg neutral-50/neutral-850

Cell padding: px-3 py-2
```

Recursos:
- Checkbox na primeira coluna para selecao
- Sorting: icone ChevronUp/Down no header
- Filtros: barra acima da tabela com FilterX + chips de filtro ativo
- Paginacao: abaixo da tabela, mostrando total + paginas
- Empty state: ilustracao + texto + CTA
- Loading: skeleton rows (5-10 linhas)

### 6.5 Badges de Status

Para status de jobs e outras categorias.

```
Badge padrao:
  h: 22px
  padding: px-2 py-0.5
  font: caption (12px) font-medium
  radius: rounded-full
  display: inline-flex items-center gap-1

Badge com dot:
  dot: w-2 h-2 rounded-full bg-{status-color}
  text: status label
  bg: {status-color}/10 (10% opacity do status)
  text: {status-color}
```

Status badges especificos:

```
briefing:      bg-violet-100   text-violet-700  | dark: bg-violet-500/10  text-violet-400
orcamento:     bg-amber-100    text-amber-700   | dark: bg-amber-500/10   text-amber-400
aprovado:      bg-green-100    text-green-700   | dark: bg-green-500/10   text-green-400
pre_producao:  bg-blue-100     text-blue-700    | dark: bg-blue-500/10    text-blue-400
producao:      bg-red-100      text-red-700     | dark: bg-red-500/10     text-red-400
pos_producao:  bg-purple-100   text-purple-700  | dark: bg-purple-500/10  text-purple-400
entrega:       bg-cyan-100     text-cyan-700    | dark: bg-cyan-500/10    text-cyan-400
concluido:     bg-emerald-100  text-emerald-700 | dark: bg-emerald-500/10 text-emerald-400
cancelado:     bg-gray-100     text-gray-500    | dark: bg-gray-500/10    text-gray-400
```

### 6.6 Modais/Dialogs

Base: shadcn/ui Dialog.

```
Overlay: bg-black/50 backdrop-blur-sm
Container:
  bg: surface
  border: 1px neutral-200/800
  radius: rounded-xl (12px)
  shadow: shadow-xl
  padding: p-6

Header: flex justify-between items-center mb-4
  Title: heading-2 (20px semi)
  Close: ghost icon button (X)

Footer: flex justify-end gap-2 mt-6 pt-4 border-t
  Botoes: secondary (cancelar) + primary (confirmar)

Animacao: fade-in + scale-95 to scale-100 (150ms)
```

### 6.7 Sidebar/Navigation

```
Sidebar (desktop):
  w: 256px (expanded) | 64px (collapsed)
  bg: sidebar-bg (neutral-50/neutral-950)
  border-right: 1px neutral-200/800
  transition: width 200ms ease

Nav item:
  h: 36px
  padding: px-3
  radius: rounded-md
  font: body-sm
  icon: 18px (Lucide)
  gap: 12px (icon to text)

  default: text-secondary
  hover: bg-neutral-100/neutral-800 text-primary
  active: bg-neutral-200/neutral-800 text-primary font-medium
         (com barra accent-500 na esquerda, 3px)

Nav group:
  label: overline (11px, uppercase, tracking-wide, text-muted)
  margin-top: mt-6 (entre grupos)

Mobile bottom nav:
  h: 64px (com safe area)
  bg: surface
  border-top: 1px
  items: max 5 (icon + label)
  active: text-accent
```

### 6.8 Toast/Notifications

Base: shadcn/ui Sonner (toast).

```
Posicao: bottom-right (desktop), top-center (mobile)
Max visible: 3

Tipos:
  success: borda-esquerda green-500, icone CheckCircle
  error: borda-esquerda red-500, icone XCircle
  warning: borda-esquerda yellow-500, icone AlertTriangle
  info: borda-esquerda blue-500, icone Info

Duracao: 4s (info/success), 8s (warning), persistent (error com action)
Animacao: slide-in from right, fade-out
```

### 6.9 Empty States

```
Container: flex flex-col items-center justify-center py-16

Icone: 48px, text-muted (neutral-400)
Titulo: heading-3 (18px) text-primary, mt-4
Descricao: body-sm text-secondary, mt-2, max-w-md text-center
CTA: primary button, mt-6
```

### 6.10 Skeleton/Loading

```
Skeleton block:
  bg: neutral-200/neutral-800
  animate-pulse
  radius: rounded-md

Padroes:
  Table: 5-8 rows de skeleton (h variavel)
  Card: skeleton retangular com 2-3 linhas
  Page: skeleton do layout completo (header + content)

Tempo: mostrar skeleton se loading > 200ms (evitar flash)
```

---

## 7. Icones

### 7.1 Set

**Lucide Icons** (padrao do shadcn/ui) - https://lucide.dev

### 7.2 Tamanhos

```
Inline (em texto):  16px (w-4 h-4)
Default (botoes):   18px (w-[18px] h-[18px])
Medium (nav):       20px (w-5 h-5)
Large (empty state):48px (w-12 h-12)
```

### 7.3 Icones por Contexto

```
Navegacao:
  Dashboard:     LayoutDashboard
  Jobs:          Clapperboard
  Clientes:      Building2
  Equipe:        Users
  Financeiro:    DollarSign
  Calendario:    CalendarDays
  Arquivos:      FolderOpen
  Configuracoes: Settings

Acoes:
  Criar:         Plus
  Editar:        Pencil
  Deletar:       Trash2
  Filtrar:       Filter
  Buscar:        Search
  Exportar:      Download
  Importar:      Upload
  Refresh:       RefreshCw

Status:
  Sucesso:       CheckCircle2
  Erro:          XCircle
  Warning:       AlertTriangle
  Info:          Info
  Loading:       Loader2 (animate-spin)
```

---

## 8. Animacoes e Transicoes

### 8.1 Principios
- Sutis, nunca chamativas
- Nunca bloquear interacao
- Respeitar `prefers-reduced-motion`

### 8.2 Duracoes

```
instant:   0ms      - Toggle de checkbox, state change
fast:      100ms    - Hover effects, color changes
normal:    150ms    - Botoes, inputs, foco
medium:    200ms    - Sidebar collapse, dropdown open
slow:      300ms    - Modal open/close, page transitions
```

### 8.3 Easing

```
default:   ease-out        (desaceleracao natural)
enter:     ease-out        (entra rapido, desacelera)
exit:      ease-in         (acelera ao sair)
bounce:    NAO USAR        (nao combina com o tom profissional)
```

---

## 9. Responsividade

### 9.1 Adaptacoes por Breakpoint

```
MOBILE (<768px):
  - Bottom navigation (5 items)
  - Tabelas viram cards empilhados
  - Sidebar vira drawer overlay
  - Formularios: 1 coluna
  - Modais: full-screen (sheet from bottom)
  - Filtros: collapsable section

TABLET (768-1023px):
  - Sidebar drawer (overlay)
  - Tabelas com scroll horizontal
  - Formularios: 1-2 colunas
  - Modais: centered, max-w-lg

DESKTOP (1024px+):
  - Sidebar fixa (collapsable)
  - Tabelas completas
  - Formularios: 2-3 colunas
  - Modais: centered, tamanho variavel
  - Kanban: todas colunas visiveis
```

### 9.2 Touch Targets

```
Minimo: 44x44px (area de toque)
Recomendado: 48x48px
Spacing entre targets: minimo 8px
```

---

## 10. Dark Mode

### 10.1 Implementacao

- Usar CSS variables com classe `.dark` no `<html>`
- Tailwind: `dark:` prefix
- Persistir preferencia no localStorage
- Default: seguir preferencia do sistema (`prefers-color-scheme`)
- Toggle manual no header (Sun/Moon icon)

### 10.2 Regras de Adaptacao

```
- Backgrounds: inverter (claro→escuro), reduzir brilho
- Texto: inverter, nunca branco puro (#FAFAFA, nao #FFFFFF)
- Bordas: mais sutis (reduzir opacidade em ~30%)
- Sombras: remover ou reduzir drasticamente (escuro nao precisa)
- Imagens: nenhum filtro (manter original)
- Cores semanticas: aumentar levemente brilho (600→500)
- Accent (rose): usar rose-400 (#FB7185) no dark, rose-600 (#E11D48) no light
- Accent secundario (amber): para elementos financeiros e destaques complementares
```

---

## 11. Acessibilidade

### 11.1 Checklist

- [ ] Contraste texto: minimo 4.5:1 (AA)
- [ ] Contraste UI interativo: minimo 3:1
- [ ] Focus visible: ring-2 ring-accent/50 em todo elemento focavel
- [ ] Skip to content link (primeira coisa na pagina)
- [ ] Aria labels em todos botoes de icone
- [ ] Role e aria attributes em componentes custom
- [ ] Navegacao completa por teclado (Tab, Enter, Escape, Arrow keys)
- [ ] Anuncio de mudancas dinamicas (aria-live regions)
- [ ] Alt text em imagens
- [ ] Formularios: label associado a cada input (htmlFor/id)

### 11.2 Focus Style

```
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-rose-500/50
focus-visible:ring-offset-2
focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-900
```

---

## 12. Configuracao Tailwind

### 12.1 tailwind.config.ts (resumo dos tokens)

```typescript
// Cores customizadas para o ELLAHOS (adicionar ao extend.colors)
colors: {
  brand: {
    black: '#09090B',
    charcoal: '#32373C',
    rose: '#F472B6',
    white: '#FAFAFA',
  },
  accent: {
    // Rose (primary accent - do logo Ellah Filmes)
    50: '#FFF1F2',
    100: '#FFE4E6',
    200: '#FECDD3',
    300: '#FDA4AF',
    400: '#FB7185',
    500: '#F43F5E',
    600: '#E11D48',
    700: '#BE185D',
    800: '#9F1239',
    900: '#881337',
  },
  'accent-secondary': {
    // Amber (secondary - hora dourada, financeiro)
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  // Status do job
  status: {
    briefing: '#8B5CF6',
    orcamento: '#F59E0B',
    aprovado: '#22C55E',
    'pre-producao': '#3B82F6',
    producao: '#EF4444',
    'pos-producao': '#A855F7',
    entrega: '#06B6D4',
    concluido: '#10B981',
    cancelado: '#6B7280',
  },
}
```

### 12.2 CSS Variables (globals.css)

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 347 77% 50%;        /* rose-600 #E11D48 */
    --primary-foreground: 0 0% 100%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 347 77% 50%;            /* rose-600 */
    --radius: 0.375rem;
    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.9% 10%;
    --sidebar-primary: 347 77% 50%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 240 5.9% 90%;
    --sidebar-ring: 347 77% 50%;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 6% 10%;
    --card-foreground: 0 0% 98%;
    --popover: 240 6% 10%;
    --popover-foreground: 0 0% 98%;
    --primary: 350 89% 60%;        /* rose-400 #FB7185 */
    --primary-foreground: 344 84% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 25%;
    --input: 240 3.7% 25%;
    --ring: 350 89% 60%;            /* rose-400 */
    --sidebar-background: 240 6% 6%;
    --sidebar-foreground: 0 0% 98%;
    --sidebar-primary: 350 89% 60%;
    --sidebar-primary-foreground: 344 84% 10%;
    --sidebar-accent: 240 3.7% 15.9%;
    --sidebar-accent-foreground: 0 0% 98%;
    --sidebar-border: 240 3.7% 25%;
    --sidebar-ring: 350 89% 60%;
  }
}
```

---

## 13. Padroes de UX Especificos

### 13.1 Dashboard de Jobs

- **Vista padrao**: tabela (como Monday.com)
- **Vista alternativa**: kanban por status (drag & drop)
- **Toggle**: botoes no header (LayoutList / KanbanSquare)
- **Filtros rapidos**: chips de status (clicavel para filtrar)
- **Busca**: search bar no topo, busca por titulo, codigo, cliente
- **Bulk actions**: selecionar multiplos + barra de acoes fixa no bottom

### 13.2 Detalhe do Job

- **Layout**: tabs horizontais (Geral, Equipe, Entregaveis, Financeiro, Arquivos, Historico)
- **Header fixo**: codigo + titulo + status badge + acoes principais
- **Progress bar**: visual do pipeline de status
- **Timeline**: historico lateral (como Git log)
- **Formulario**: auto-save com debounce (1.5s) + indicador "Salvo"

### 13.3 Formularios Complexos

- **Secoes colapsaveis**: agrupar campos por contexto
- **Progress indicator**: mostrar % preenchido (jobs tem ~75 campos)
- **Dependencias visuais**: campos aparecem/somem baseado em selecoes
- **Validacao**: inline, ao perder foco (nao ao digitar)
- **Rascunho**: auto-save em localStorage ate primeiro save no servidor

### 13.4 Kanban Board

```
Colunas: 1 por status (scrollavel horizontalmente)
Card:
  Titulo: heading-3 truncado
  Codigo: badge com job code
  Cliente: text-secondary
  Data: deadline com icone Calendar
  Avatar stack: equipe (max 3 + "+N")
  Drag handle: GripVertical icon (left side)

Contagem: badge no header de cada coluna
```

### 13.5 Calendario de Producao

- Vista mensal (default) e semanal
- Cores por status do job
- Click para ver detalhes
- Indicador de conflito de equipe (warning badge)

---

## 14. Nomenclatura de Arquivos (Frontend)

```
Componentes:     src/components/{dominio}/{NomeComponente}.tsx
Pages:           src/app/(dashboard)/{rota}/page.tsx
Layouts:         src/app/(dashboard)/layout.tsx
Hooks:           src/hooks/use-{nome}.ts
Utils:           src/lib/{nome}.ts
Types:           src/types/{dominio}.ts
Constantes:      src/constants/{dominio}.ts
```

---

## Changelog

| Data       | Versao | Descricao                          |
|------------|--------|------------------------------------|
| 2026-02-18 | 1.0    | Design system inicial - Fase 3     |
