// Gerador de PDF: Relatorio de Set
// Dados do production_diary_entries: clima, horarios, cenas, presenca, equipamentos

import type { JobDetail } from '@/types/jobs'
import type { DiaryEntry } from '@/types/production-diary'
import {
  createPdfDoc,
  addHeader,
  addFooters,
  savePdf,
  drawSectionTitle,
  drawTableRow,
  checkPageBreak,
  formatDateBR,
  formatTimeBR,
  addWrappedText,
  setText,
  setFill,
  setDraw,
  COLOR,
  MARGIN,
  CONTENT_W,
} from './pdf-core'

const WEATHER_LABELS: Record<string, string> = {
  sol: 'Ensolarado',
  nublado: 'Nublado',
  chuva: 'Chuvoso',
  noturna: 'Noturna',
  indoor: 'Indoor',
}

const DAY_STATUS_LABELS: Record<string, string> = {
  no_cronograma: 'No Cronograma',
  adiantado: 'Adiantado',
  atrasado: 'Atrasado',
}

const SCENE_STATUS_LABELS: Record<string, string> = {
  ok: 'OK',
  incompleta: 'Incompleta',
  nao_gravada: 'Nao gravada',
}

export interface SetReportPdfParams {
  job: JobDetail
  entry: DiaryEntry
  tenantName?: string
}

export async function generateSetReportPdf(params: SetReportPdfParams): Promise<void> {
  const { job, entry, tenantName } = params
  const pdf = await createPdfDoc()

  const jobCode = job.job_code || job.id.slice(0, 8)
  const dayLabel = `Dia ${entry.day_number}`
  const subtitle = tenantName
    ? `${jobCode} — ${job.title} | ${dayLabel} | ${tenantName}`
    : `${jobCode} — ${job.title} | ${dayLabel}`

  let y = addHeader(pdf, 'Relatorio de Set', subtitle)

  // --- Info Geral ---
  y = drawSectionTitle(pdf, 'Informacoes Gerais', y)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  setText(pdf, COLOR.BLACK)

  const infoLines: [string, string][] = [
    ['Codigo', jobCode],
    ['Titulo', job.title],
    ['Data', formatDateBR(entry.shooting_date)],
    ['Dia', String(entry.day_number)],
    ['Local', entry.location ?? '-'],
    ['Clima', WEATHER_LABELS[entry.weather_condition] ?? entry.weather_condition],
  ]

  if (entry.day_status) {
    infoLines.push(['Status do Dia', DAY_STATUS_LABELS[entry.day_status] ?? entry.day_status])
  }

  for (const [label, value] of infoLines) {
    y = checkPageBreak(pdf, y, 6)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`${label}:`, MARGIN.left, y)
    pdf.setFont('helvetica', 'normal')
    pdf.text(value, MARGIN.left + 35, y)
    y += 5
  }
  y += 4

  // --- Cronograma do Dia ---
  const hasSchedule = entry.call_time || entry.filming_start_time || entry.lunch_time || entry.wrap_time
  if (hasSchedule) {
    y = checkPageBreak(pdf, y, 24)
    y = drawSectionTitle(pdf, 'Cronograma', y)

    const scheduleItems: [string, string][] = [
      ['Chamada', formatTimeBR(entry.call_time)],
      ['Inicio Filmagem', formatTimeBR(entry.filming_start_time)],
      ['Almoco', formatTimeBR(entry.lunch_time)],
      ['Wrap', formatTimeBR(entry.wrap_time)],
    ]

    // Faixa cinza com horarios
    setFill(pdf, COLOR.TABLE_ALT)
    setDraw(pdf, COLOR.BORDER)
    pdf.rect(MARGIN.left, y, CONTENT_W, 12, 'FD')

    const colW = CONTENT_W / 4
    scheduleItems.forEach(([label, value], i) => {
      const tx = MARGIN.left + i * colW + 3
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8)
      setText(pdf, COLOR.TITLE)
      pdf.text(label + ':', tx, y + 4)
      pdf.setFont('helvetica', 'normal')
      pdf.text(value, tx, y + 9)
    })

    y += 12 + 6
  }

  // --- Resumo de Cenas ---
  const hasScenesInfo = entry.planned_scenes || entry.filmed_scenes || entry.total_takes
  if (hasScenesInfo) {
    y = checkPageBreak(pdf, y, 16)
    y = drawSectionTitle(pdf, 'Resumo de Cenas', y)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    setText(pdf, COLOR.BLACK)

    if (entry.planned_scenes) {
      pdf.setFont('helvetica', 'bold')
      pdf.text('Cenas Previstas:', MARGIN.left, y)
      pdf.setFont('helvetica', 'normal')
      pdf.text(entry.planned_scenes, MARGIN.left + 35, y)
      y += 5
    }
    if (entry.filmed_scenes) {
      pdf.setFont('helvetica', 'bold')
      pdf.text('Cenas Filmadas:', MARGIN.left, y)
      pdf.setFont('helvetica', 'normal')
      pdf.text(entry.filmed_scenes, MARGIN.left + 35, y)
      y += 5
    }
    if (entry.total_takes != null) {
      pdf.setFont('helvetica', 'bold')
      pdf.text('Total de Takes:', MARGIN.left, y)
      pdf.setFont('helvetica', 'normal')
      pdf.text(String(entry.total_takes), MARGIN.left + 35, y)
      y += 5
    }
    y += 4
  }

  // --- Tabela de Cenas ---
  if (entry.scenes_list && entry.scenes_list.length > 0) {
    y = checkPageBreak(pdf, y, 20)
    y = drawSectionTitle(pdf, `Cenas Detalhadas (${entry.scenes_list.length})`, y)

    const w = CONTENT_W
    const cols = [w * 0.12, w * 0.38, w * 0.12, w * 0.14, w * 0.24]
    const headers = ['Cena', 'Descricao', 'Takes', 'OK Take', 'Status']

    y = drawTableRow(pdf, MARGIN.left, y, headers, cols, 7, { isHeader: true, fontSize: 8 })

    entry.scenes_list.forEach((scene, idx) => {
      y = checkPageBreak(pdf, y, 7)
      y = drawTableRow(pdf, MARGIN.left, y,
        [
          scene.scene_number,
          scene.description ?? '',
          String(scene.takes),
          scene.ok_take != null ? String(scene.ok_take) : '-',
          SCENE_STATUS_LABELS[scene.status] ?? scene.status,
        ],
        cols, 7, { fontSize: 8, altRow: idx % 2 === 1 })
    })
    y += 4
  }

  // --- Observacoes / Problemas / Destaques ---
  const textSections: [string, string | null][] = [
    ['Observacoes', entry.observations],
    ['Problemas', entry.issues],
    ['Destaques', entry.highlights],
  ]

  for (const [title, content] of textSections) {
    if (content && content.trim()) {
      y = checkPageBreak(pdf, y, 16)
      y = drawSectionTitle(pdf, title, y)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      setText(pdf, COLOR.BLACK)
      y = addWrappedText(pdf, content, MARGIN.left, y, CONTENT_W)
      y += 4
    }
  }

  // --- Tabela de Presenca ---
  if (entry.attendance_list && entry.attendance_list.length > 0) {
    y = checkPageBreak(pdf, y, 20)
    y = drawSectionTitle(pdf, `Presenca (${entry.attendance_list.length})`, y)

    const w = CONTENT_W
    const cols = [w * 0.05, w * 0.30, w * 0.25, w * 0.15, w * 0.25]
    const headers = ['#', 'Nome', 'Funcao', 'Presente', 'Hora Chegada']

    y = drawTableRow(pdf, MARGIN.left, y, headers, cols, 7, { isHeader: true, fontSize: 8 })

    entry.attendance_list.forEach((person, idx) => {
      y = checkPageBreak(pdf, y, 7)
      y = drawTableRow(pdf, MARGIN.left, y,
        [
          String(idx + 1),
          person.person_name,
          person.role ?? '-',
          person.present ? 'Sim' : 'Nao',
          person.arrival_time ? formatTimeBR(person.arrival_time) : '-',
        ],
        cols, 7, { fontSize: 8, altRow: idx % 2 === 1 })
    })
    y += 4
  }

  // --- Tabela de Equipamentos ---
  if (entry.equipment_list && entry.equipment_list.length > 0) {
    y = checkPageBreak(pdf, y, 20)
    y = drawSectionTitle(pdf, `Equipamentos (${entry.equipment_list.length})`, y)

    const w = CONTENT_W
    const cols = [w * 0.05, w * 0.40, w * 0.15, w * 0.40]
    const headers = ['#', 'Equipamento', 'Qtd', 'Observacoes']

    y = drawTableRow(pdf, MARGIN.left, y, headers, cols, 7, { isHeader: true, fontSize: 8 })

    entry.equipment_list.forEach((eq, idx) => {
      y = checkPageBreak(pdf, y, 7)
      y = drawTableRow(pdf, MARGIN.left, y,
        [
          String(idx + 1),
          eq.name,
          eq.quantity != null ? String(eq.quantity) : '-',
          eq.notes ?? '',
        ],
        cols, 7, { fontSize: 8, altRow: idx % 2 === 1 })
    })
    y += 4
  }

  // --- Boletim de Producao ---
  if (entry.executive_summary && entry.executive_summary.trim()) {
    y = checkPageBreak(pdf, y, 30)
    y = drawSectionTitle(pdf, 'Boletim de Producao', y)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    setText(pdf, COLOR.BLACK)

    if (entry.day_status) {
      pdf.setFont('helvetica', 'bold')
      pdf.text('Status:', MARGIN.left, y)
      pdf.setFont('helvetica', 'normal')
      pdf.text(DAY_STATUS_LABELS[entry.day_status] ?? entry.day_status, MARGIN.left + 20, y)
      y += 5
    }

    pdf.setFont('helvetica', 'bold')
    pdf.text('Resumo Executivo:', MARGIN.left, y)
    y += 5
    pdf.setFont('helvetica', 'normal')
    y = addWrappedText(pdf, entry.executive_summary, MARGIN.left, y, CONTENT_W)
    y += 3

    if (entry.next_steps && entry.next_steps.trim()) {
      y = checkPageBreak(pdf, y, 12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Proximos Passos:', MARGIN.left, y)
      y += 5
      pdf.setFont('helvetica', 'normal')
      y = addWrappedText(pdf, entry.next_steps, MARGIN.left, y, CONTENT_W)
      y += 3
    }

    if (entry.director_signature && entry.director_signature.trim()) {
      y = checkPageBreak(pdf, y, 12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Assinatura Diretor:', MARGIN.left, y)
      y += 5
      pdf.setFont('helvetica', 'normal')
      pdf.text(entry.director_signature, MARGIN.left, y)
      y += 5
    }
  }

  // Footer
  addFooters(pdf, `Relatorio de Set ${jobCode} — Dia ${entry.day_number}`)

  const dateSlug = entry.shooting_date.slice(0, 10).replace(/-/g, '')
  savePdf(pdf, `relatorio_set_${jobCode}_dia${entry.day_number}_${dateSlug}.pdf`)
}
