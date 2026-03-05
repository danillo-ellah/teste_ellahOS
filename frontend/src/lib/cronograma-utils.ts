import { differenceInCalendarDays, addDays, format, parseISO, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Conta dias uteis (seg-sex) ou dias corridos entre duas datas.
 */
export function countWorkingDays(
  startDate: Date | string,
  endDate: Date | string,
  skipWeekends: boolean,
): number {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate

  if (end < start) return 0

  if (!skipWeekends) {
    return differenceInCalendarDays(end, start) + 1
  }

  let count = 0
  let current = start
  while (current <= end) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) count++
    current = addDays(current, 1)
  }
  return count
}

/**
 * Formata contagem de dias de forma amigavel.
 */
export function formatWorkingDays(days: number): string {
  if (days === 1) return '1 dia'
  return `${days} dias`
}

/**
 * Formata data ISO para exibicao no padrao brasileiro.
 * Ex: "2026-01-05" => "05 jan 2026"
 */
export function formatDateBR(dateStr: string): string {
  try {
    const d = parseISO(dateStr)
    return format(d, "dd MMM yyyy", { locale: ptBR })
  } catch {
    return dateStr
  }
}

/**
 * Formata data ISO para exibicao curta.
 * Ex: "2026-01-05" => "05/01"
 */
export function formatDateShort(dateStr: string): string {
  try {
    const d = parseISO(dateStr)
    return format(d, "dd/MM")
  } catch {
    return dateStr
  }
}

/**
 * Formata data para exibicao no PDF por extenso.
 * Ex: "2026-03-04" => "04 de marco de 2026"
 */
export function formatDateExtended(dateStr: string): string {
  try {
    const d = parseISO(dateStr)
    return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  } catch {
    return dateStr
  }
}

/**
 * Gera todos os dias de um intervalo de datas.
 */
export function getDaysInRange(startDate: string, endDate: string): Date[] {
  try {
    const start = parseISO(startDate)
    const end = parseISO(endDate)
    if (end < start) return []
    return eachDayOfInterval({ start, end })
  } catch {
    return []
  }
}

/**
 * Detecta o status automatico de uma fase baseado na data atual.
 */
export function computePhaseStatus(
  startDate: string,
  endDate: string,
): 'pending' | 'in_progress' | 'completed' {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const start = parseISO(startDate)
  const end = parseISO(endDate)

  if (today > end) return 'completed'
  if (today >= start) return 'in_progress'
  return 'pending'
}

/**
 * Calcula o progresso percentual de uma fase (0-100) baseado na data atual.
 * Usado para barra de progresso no card mobile.
 */
export function computePhaseProgress(
  startDate: string,
  endDate: string,
): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const start = parseISO(startDate)
  const end = parseISO(endDate)

  if (today < start) return 0
  if (today > end) return 100

  const total = differenceInCalendarDays(end, start) + 1
  const elapsed = differenceInCalendarDays(today, start) + 1
  return Math.min(100, Math.round((elapsed / total) * 100))
}

/**
 * Calcula posicao e largura de uma barra no gantt.
 * Retorna gridColumn CSS string.
 */
export function getGanttBarColumn(
  phaseStart: string,
  phaseEnd: string,
  timelineStart: string,
): { colStart: number; colSpan: number } {
  const start = parseISO(phaseStart)
  const end = parseISO(phaseEnd)
  const timeStart = parseISO(timelineStart)

  const colStart = differenceInCalendarDays(start, timeStart) + 2 // +2: label col + 1-indexed
  const colSpan = differenceInCalendarDays(end, start) + 1

  return { colStart: Math.max(2, colStart), colSpan: Math.max(1, colSpan) }
}

/**
 * Iniciais de um nome (max 2 chars) para fallback de logo.
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

/**
 * Formata data para nome de arquivo PDF.
 * Ex: new Date() => "2026-03-04"
 */
export function formatDateForFilename(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd')
}
