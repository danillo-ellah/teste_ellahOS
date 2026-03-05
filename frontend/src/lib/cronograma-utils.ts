import {
  differenceInCalendarDays,
  addDays,
  format,
  parseISO,
  eachDayOfInterval,
  startOfWeek,
  isToday as dateFnsIsToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { JobPhase } from '@/types/cronograma'

/**
 * Conta dias uteis (seg-sex) ou dias corridos entre duas datas.
 * Retorna 0 se alguma data for nula/invalida.
 */
export function countWorkingDays(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined,
  skipWeekends: boolean,
): number {
  if (!startDate || !endDate) return 0

  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0
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
export function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const d = parseISO(dateStr)
    if (isNaN(d.getTime())) return '—'
    return format(d, "dd MMM yyyy", { locale: ptBR })
  } catch {
    return dateStr
  }
}

/**
 * Formata data ISO para exibicao curta.
 * Ex: "2026-01-05" => "05/01"
 */
export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const d = parseISO(dateStr)
    if (isNaN(d.getTime())) return '—'
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
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): 'pending' | 'in_progress' | 'completed' {
  if (!startDate || !endDate) return 'pending'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const start = parseISO(startDate)
  const end = parseISO(endDate)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'pending'

  if (today > end) return 'completed'
  if (today >= start) return 'in_progress'
  return 'pending'
}

/**
 * Calcula o progresso percentual de uma fase (0-100) baseado na data atual.
 * Usado para barra de progresso no card mobile.
 */
export function computePhaseProgress(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): number {
  if (!startDate || !endDate) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const start = parseISO(startDate)
  const end = parseISO(endDate)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0
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
  phaseStart: string | null | undefined,
  phaseEnd: string | null | undefined,
  timelineStart: string,
): { colStart: number; colSpan: number } {
  if (!phaseStart || !phaseEnd) return { colStart: 2, colSpan: 1 }

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

// ---------------------------------------------------------------------------
// Utils do Calendario Mensal
// ---------------------------------------------------------------------------

/**
 * Retorna o grid do calendario mensal: array de semanas (cada semana e array
 * de 7 Date). Inclui dias dos meses adjacentes para completar as semanas.
 * Sempre gera 6 semanas (42 slots) para estabilidade visual.
 *
 * @param year  Ano (ex: 2026)
 * @param month Mes 0-indexed (0 = janeiro)
 */
export function getCalendarGrid(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1)
  // Sempre comecar no domingo (weekStartsOn: 0)
  const gridStart = startOfWeek(firstDay, { weekStartsOn: 0 })

  const weeks: Date[][] = []
  let current = new Date(gridStart)

  // 6 semanas fixas = 42 dias
  for (let week = 0; week < 6; week++) {
    const days: Date[] = []
    for (let day = 0; day < 7; day++) {
      days.push(new Date(current))
      current = addDays(current, 1)
    }
    weeks.push(days)
  }

  return weeks
}

/**
 * Retorna as fases ativas em um dia especifico.
 * Uma fase esta ativa se start_date <= day <= end_date.
 * Se skip_weekends = true e o dia e FDS, a fase ainda e retornada
 * (o componente e responsavel por aplicar opacity-50).
 *
 * Ordenacao: sort_order crescente, em_andamento primeiro dentro do mesmo sort.
 */
export function getPhasesForDay(phases: JobPhase[], day: Date): JobPhase[] {
  const dayStr = format(day, 'yyyy-MM-dd')

  return phases
    .filter((phase) => {
      if (!phase.start_date || !phase.end_date) return false
      return phase.start_date <= dayStr && dayStr <= phase.end_date
    })
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
      // in_progress primeiro
      if (a.status === 'in_progress' && b.status !== 'in_progress') return -1
      if (b.status === 'in_progress' && a.status !== 'in_progress') return 1
      return 0
    })
}

/**
 * Retorna o mes inicial sugerido para o calendario baseado nas fases.
 * Prioridade: primeiro mes com fase in_progress > primeiro mes com fase futura > mes atual.
 */
export function getInitialCalendarMonth(phases: JobPhase[]): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = format(today, 'yyyy-MM-dd')

  const datedPhases = phases.filter((p) => p.start_date && p.end_date)

  // 1. Primeiro in_progress
  const inProgress = datedPhases.find((p) => p.status === 'in_progress' && p.start_date)
  if (inProgress?.start_date) {
    const d = parseISO(inProgress.start_date)
    return new Date(d.getFullYear(), d.getMonth(), 1)
  }

  // 2. Primeira fase futura
  const future = datedPhases
    .filter((p) => p.start_date && p.start_date >= todayStr)
    .sort((a, b) => a.start_date!.localeCompare(b.start_date!))
  if (future.length > 0 && future[0].start_date) {
    const d = parseISO(future[0].start_date)
    return new Date(d.getFullYear(), d.getMonth(), 1)
  }

  // 3. Fallback: mes atual
  return new Date(today.getFullYear(), today.getMonth(), 1)
}

/**
 * Verifica se uma data e hoje.
 */
export function isTodayDate(date: Date): boolean {
  return dateFnsIsToday(date)
}

/**
 * Formata mes/ano para exibicao no cabecalho do calendario.
 * Ex: new Date(2026, 2, 1) => "MARCO 2026"
 */
export function formatCalendarMonthTitle(date: Date): string {
  return format(date, 'MMMM yyyy', { locale: ptBR }).toUpperCase()
}
