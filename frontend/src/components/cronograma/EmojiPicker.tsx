'use client'

import { useState, useMemo, useCallback } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Catalogo de emojis por categoria
// ---------------------------------------------------------------------------

interface EmojiEntry {
  emoji: string
  keywords: string[]
}

interface EmojiCategory {
  label: string
  emojis: EmojiEntry[]
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    label: 'Producao',
    emojis: [
      { emoji: '🎬', keywords: ['gravacao', 'filmagem', 'camera', 'diaria'] },
      { emoji: '🎥', keywords: ['camera', 'video', 'filmagem'] },
      { emoji: '🎤', keywords: ['audio', 'som', 'microfone', 'gravacao'] },
      { emoji: '🎵', keywords: ['musica', 'trilha', 'som', 'audio'] },
      { emoji: '🎞️', keywords: ['montagem', 'filme', 'pelicula'] },
      { emoji: '📹', keywords: ['video', 'camera', 'gravacao'] },
      { emoji: '🧰', keywords: ['producao', 'setup', 'preparacao', 'equipe'] },
      { emoji: '🏗️', keywords: ['construcao', 'cenario', 'set', 'arte'] },
    ],
  },
  {
    label: 'Pos-Producao',
    emojis: [
      { emoji: '✂️', keywords: ['offline', 'corte', 'edicao', 'montagem'] },
      { emoji: '🖥️', keywords: ['pos', 'producao', 'computador', 'edicao'] },
      { emoji: '🎨', keywords: ['finalizacao', 'color', 'cor', 'arte', 'grading'] },
      { emoji: '💻', keywords: ['online', 'digital', 'computador', 'aprovacao'] },
      { emoji: '📀', keywords: ['copias', 'disco', 'entrega', 'master'] },
      { emoji: '🎧', keywords: ['mixagem', 'audio', 'som', 'master'] },
    ],
  },
  {
    label: 'Planejamento',
    emojis: [
      { emoji: '💰', keywords: ['orcamento', 'dinheiro', 'custo', 'valor'] },
      { emoji: '🗓️', keywords: ['reuniao', 'briefing', 'agenda', 'data'] },
      { emoji: '📋', keywords: ['pre', 'producao', 'planejamento', 'checklist'] },
      { emoji: '📅', keywords: ['ppm', 'reuniao', 'calendario', 'data'] },
      { emoji: '📝', keywords: ['roteiro', 'script', 'texto', 'anotacao'] },
      { emoji: '📌', keywords: ['marco', 'milestone', 'importante', 'destaque'] },
      { emoji: '🎯', keywords: ['objetivo', 'meta', 'foco', 'alvo'] },
      { emoji: '🔍', keywords: ['pesquisa', 'referencia', 'busca', 'casting'] },
    ],
  },
  {
    label: 'Status',
    emojis: [
      { emoji: '✅', keywords: ['aprovado', 'pronto', 'concluido', 'ok'] },
      { emoji: '🚀', keywords: ['lancamento', 'entrega', 'inicio', 'go'] },
      { emoji: '🏁', keywords: ['entrega', 'final', 'fim', 'conclusao'] },
      { emoji: '⏳', keywords: ['espera', 'aguardando', 'pendente', 'prazo'] },
      { emoji: '🤝', keywords: ['aprovacao', 'acordo', 'cliente', 'reuniao'] },
      { emoji: '📞', keywords: ['ligacao', 'contato', 'telefone', 'call'] },
    ],
  },
  {
    label: 'Natureza e Locacao',
    emojis: [
      { emoji: '🌊', keywords: ['agua', 'aquatico', 'mar', 'praia', 'piscina'] },
      { emoji: '🏊', keywords: ['aquatico', 'natacao', 'piscina', 'mergulho'] },
      { emoji: '🤿', keywords: ['mergulho', 'subaquatico', 'agua'] },
      { emoji: '🌅', keywords: ['externa', 'nascer', 'sol', 'golden', 'hour'] },
      { emoji: '🌃', keywords: ['noturna', 'noite', 'cidade', 'urbano'] },
      { emoji: '🏔️', keywords: ['montanha', 'natureza', 'externa', 'paisagem'] },
      { emoji: '🏖️', keywords: ['praia', 'litoral', 'areia', 'verao'] },
      { emoji: '🌧️', keywords: ['chuva', 'clima', 'tempo', 'efeito'] },
      { emoji: '☀️', keywords: ['sol', 'dia', 'diurna', 'externa'] },
      { emoji: '🌙', keywords: ['noite', 'lua', 'noturna', 'madrugada'] },
    ],
  },
  {
    label: 'Criativo',
    emojis: [
      { emoji: '🎭', keywords: ['elenco', 'ator', 'atriz', 'casting', 'atuacao'] },
      { emoji: '👗', keywords: ['figurino', 'roupa', 'moda', 'vestimenta'] },
      { emoji: '💄', keywords: ['maquiagem', 'beauty', 'makeup', 'caracterizacao'] },
      { emoji: '🪄', keywords: ['efeito', 'vfx', 'visual', 'magica', 'especial'] },
      { emoji: '📸', keywords: ['foto', 'still', 'fotografia', 'making'] },
      { emoji: '🖼️', keywords: ['arte', 'cenografia', 'visual', 'design'] },
      { emoji: '📦', keywords: ['logistica', 'transporte', 'material', 'carga'] },
      { emoji: '🚗', keywords: ['transporte', 'carro', 'locacao', 'veiculo'] },
    ],
  },
]

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const RECENT_EMOJIS_KEY = 'ellahos-recent-emojis'
const MAX_RECENT = 8

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

/** Remove acentos para busca normalizada */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function loadRecentEmojis(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_EMOJIS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as string[]).slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

function saveRecentEmoji(emoji: string): void {
  if (typeof window === 'undefined') return
  try {
    const current = loadRecentEmojis()
    const updated = [emoji, ...current.filter((e) => e !== emoji)].slice(0, MAX_RECENT)
    localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(updated))
  } catch {
    // ignorar erros de localStorage (ex: modo privado com storage bloqueado)
  }
}

// ---------------------------------------------------------------------------
// EmojiButton — botao individual de emoji no grid
// ---------------------------------------------------------------------------

function EmojiButton({
  emoji,
  onClick,
  title,
}: {
  emoji: string
  onClick: (emoji: string) => void
  title?: string
}) {
  return (
    <button
      type="button"
      title={title ?? emoji}
      onClick={() => onClick(emoji)}
      className={cn(
        'h-8 w-8 flex items-center justify-center rounded text-lg',
        'hover:bg-accent transition-colors cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      )}
    >
      {emoji}
    </button>
  )
}

// ---------------------------------------------------------------------------
// EmojiPickerContent — conteudo interno do picker
// ---------------------------------------------------------------------------

function EmojiPickerContent({
  onSelect,
}: {
  onSelect: (emoji: string) => void
}) {
  const [query, setQuery] = useState('')
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => loadRecentEmojis())

  const handleSelect = useCallback(
    (emoji: string) => {
      saveRecentEmoji(emoji)
      setRecentEmojis(loadRecentEmojis())
      onSelect(emoji)
    },
    [onSelect],
  )

  const normalizedQuery = normalize(query)

  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) return EMOJI_CATEGORIES

    return EMOJI_CATEGORIES.map((cat) => ({
      ...cat,
      emojis: cat.emojis.filter((entry) =>
        entry.keywords.some((kw) => normalize(kw).includes(normalizedQuery)),
      ),
    })).filter((cat) => cat.emojis.length > 0)
  }, [normalizedQuery])

  return (
    <div className="w-[280px] flex flex-col">
      {/* Busca */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar emoji..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-7 h-8 text-sm"
            autoFocus
          />
        </div>
      </div>

      {/* Lista scrollavel */}
      <div className="max-h-[260px] overflow-y-auto p-2 flex flex-col gap-2">
        {/* Recentes */}
        {!normalizedQuery && recentEmojis.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 px-0.5">
              Recentes
            </p>
            <div className="flex flex-wrap gap-0.5">
              {recentEmojis.map((emoji) => (
                <EmojiButton key={emoji} emoji={emoji} onClick={handleSelect} />
              ))}
            </div>
          </div>
        )}

        {/* Categorias filtradas */}
        {filteredCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum emoji encontrado
          </p>
        ) : (
          filteredCategories.map((cat) => (
            <div key={cat.label}>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 px-0.5">
                {cat.label}
              </p>
              <div className="flex flex-wrap gap-0.5">
                {cat.emojis.map((entry) => (
                  <EmojiButton
                    key={entry.emoji}
                    emoji={entry.emoji}
                    onClick={handleSelect}
                    title={entry.keywords.join(', ')}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// EmojiPicker — componente publico com Popover
// ---------------------------------------------------------------------------

export interface EmojiPickerProps {
  value: string
  onChange: (emoji: string) => void
  /** Trigger customizado — se nao passado, renderiza um botao padrao */
  trigger?: React.ReactNode
}

export function EmojiPicker({ value, onChange, trigger }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)

  function handleSelect(emoji: string) {
    onChange(emoji)
    setOpen(false)
  }

  const defaultTrigger = (
    <button
      type="button"
      aria-label="Abrir seletor de emoji"
      className={cn(
        'h-10 w-10 text-2xl flex items-center justify-center rounded-md border border-input bg-background',
        'hover:bg-accent transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      )}
    >
      {value || '📋'}
    </button>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? defaultTrigger}
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-auto"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <EmojiPickerContent onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  )
}
