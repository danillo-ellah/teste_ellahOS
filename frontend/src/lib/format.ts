import { format, formatDistanceToNow, isAfter, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function safeParse(date: string): Date | null {
  try {
    const parsed = parseISO(date)
    return isValid(parsed) ? parsed : null
  } catch {
    return null
  }
}

// Formatar moeda BRL
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '-'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Formatar porcentagem
export function formatPercentage(value: number | null | undefined): string {
  if (value == null) return '-'
  return `${value.toFixed(1)}%`
}

// Formatar data dd/mm/yyyy
export function formatDate(date: string | null | undefined): string {
  if (!date) return '-'
  const parsed = safeParse(date)
  if (!parsed) return '-'
  return format(parsed, 'dd/MM/yyyy', { locale: ptBR })
}

// Formatar data relativa (ex: "ha 2 dias")
export function formatRelativeDate(date: string | null | undefined): string {
  if (!date) return '-'
  const parsed = safeParse(date)
  if (!parsed) return '-'
  return formatDistanceToNow(parsed, {
    addSuffix: true,
    locale: ptBR,
  })
}

// Verificar se data esta vencida
export function isOverdue(date: string | null | undefined): boolean {
  if (!date) return false
  const parsed = safeParse(date)
  if (!parsed) return false
  return isAfter(new Date(), parsed)
}

// Formatar duracao em segundos para "Xmin Ys"
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return '-'
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  if (min === 0) return `${sec}s`
  if (sec === 0) return `${min}min`
  return `${min}min ${sec}s`
}

// Formatar numero para exibicao BR (1.234,56)
export function formatBRNumber(value: number | null | undefined, decimals = 2): string {
  if (value == null) return ''
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

// Parsear string BR para numero (aceita "1.234,56" ou "1234.56")
export function parseBRNumber(text: string): number | null {
  if (!text || !text.trim()) return null
  let cleaned = text.trim()
  // Se tem virgula, assumir formato BR (1.234,56)
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  }
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

// Formatar horario HH:MM:SS para HH:MM
export function formatTime(time: string | null | undefined): string {
  if (!time) return '-'
  // Aceita HH:MM, HH:MM:SS, ou outros formatos de horario
  const trimmed = time.trim()
  if (trimmed.length < 5) return trimmed
  return trimmed.slice(0, 5)
}
