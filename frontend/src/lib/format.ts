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
