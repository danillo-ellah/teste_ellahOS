// Gerador de PDF: Callsheet (diaria de filmagem)
// Info do job + data/local + equipe escalada

import type { JobDetail, JobShootingDate, JobTeamMember } from '@/types/jobs'
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
  setText,
  setFill,
  setDraw,
  addWrappedText,
  COLOR,
  MARGIN,
  CONTENT_W,
} from './pdf-core'

// Labels de roles (espelhando constants.ts)
const ROLE_LABELS: Record<string, string> = {
  diretor: 'Diretor(a)',
  produtor_executivo: 'Produtor(a) Executivo(a)',
  coordenador_producao: 'Coord. Producao',
  dop: 'DOP',
  primeiro_assistente: '1o Assistente',
  editor: 'Editor(a)',
  colorista: 'Colorista',
  motion_designer: 'Motion Designer',
  diretor_arte: 'Diretor(a) de Arte',
  figurinista: 'Figurinista',
  produtor_casting: 'Prod. Casting',
  produtor_locacao: 'Prod. Locacao',
  gaffer: 'Gaffer',
  som_direto: 'Som Direto',
  maquiador: 'Maquiador(a)',
  outro: 'Outro',
}

const HIRING_LABELS: Record<string, string> = {
  orcado: 'Orcado',
  proposta_enviada: 'Proposta',
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
}

export interface CallsheetPdfParams {
  job: JobDetail
  shootingDate: JobShootingDate
  team: JobTeamMember[]
  tenantName?: string
}

export async function generateCallsheetPdf(params: CallsheetPdfParams): Promise<void> {
  const { job, shootingDate, team, tenantName } = params
  const pdf = await createPdfDoc()

  const jobCode = job.job_code || job.id.slice(0, 8)
  const subtitle = tenantName
    ? `${jobCode} — ${job.title} | ${tenantName}`
    : `${jobCode} — ${job.title}`

  let y = addHeader(pdf, 'Callsheet', subtitle)

  // --- Informacoes da Producao ---
  y = drawSectionTitle(pdf, 'Informacoes da Producao', y)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  setText(pdf, COLOR.BLACK)

  const infoLines: [string, string][] = [
    ['Codigo', jobCode],
    ['Titulo', job.title],
    ['Cliente', job.clients?.name ?? '-'],
    ['Agencia', job.agencies?.name ?? '-'],
  ]

  for (const [label, value] of infoLines) {
    y = checkPageBreak(pdf, y, 6)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`${label}:`, MARGIN.left, y)
    pdf.setFont('helvetica', 'normal')
    pdf.text(value, MARGIN.left + 30, y)
    y += 5
  }
  y += 4

  // --- Data e Local ---
  y = checkPageBreak(pdf, y, 30)
  y = drawSectionTitle(pdf, 'Data e Local', y)

  // Faixa com info da diaria
  const boxH = 20
  setFill(pdf, COLOR.TABLE_ALT)
  setDraw(pdf, COLOR.BORDER)
  pdf.rect(MARGIN.left, y, CONTENT_W, boxH, 'FD')

  const dateStr = formatDateBR(shootingDate.shooting_date)
  const timeStart = formatTimeBR(shootingDate.start_time)
  const timeEnd = formatTimeBR(shootingDate.end_time)
  const location = shootingDate.location || 'A definir'

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  setText(pdf, COLOR.TITLE)
  pdf.text(dateStr, MARGIN.left + 4, y + 8)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  setText(pdf, COLOR.MUTED)

  const timeStr = timeStart !== '-' && timeEnd !== '-'
    ? `${timeStart} - ${timeEnd}`
    : timeStart !== '-' ? timeStart : '-'
  pdf.text(`Horario: ${timeStr}`, MARGIN.left + 50, y + 8)
  pdf.text(`Local: ${location}`, MARGIN.left + 4, y + 16)

  if (shootingDate.description) {
    const descLines = pdf.splitTextToSize(shootingDate.description, CONTENT_W - 60) as string[]
    pdf.text(descLines[0] || '', MARGIN.left + 50, y + 16)
  }

  y += boxH + 6

  // --- Equipe ---
  const activeTeam = team.filter(m => m.hiring_status !== 'cancelado')

  if (activeTeam.length > 0) {
    y = checkPageBreak(pdf, y, 20)
    y = drawSectionTitle(pdf, `Equipe (${activeTeam.length})`, y)

    const w = CONTENT_W
    const cols = [w * 0.05, w * 0.30, w * 0.30, w * 0.20, w * 0.15]
    const headers = ['#', 'Nome', 'Funcao', 'Status', 'Responsavel']

    y = drawTableRow(pdf, MARGIN.left, y, headers, cols, 7, { isHeader: true, fontSize: 8 })

    activeTeam.forEach((member, idx) => {
      y = checkPageBreak(pdf, y, 7)
      y = drawTableRow(pdf, MARGIN.left, y,
        [
          String(idx + 1),
          member.person_name ?? '-',
          ROLE_LABELS[member.role] ?? member.role,
          HIRING_LABELS[member.hiring_status] ?? member.hiring_status,
          member.is_lead_producer ? 'Sim' : '',
        ],
        cols, 7, { fontSize: 8, altRow: idx % 2 === 1 })
    })

    y += 4
  }

  // --- Notas ---
  if (shootingDate.description) {
    y = checkPageBreak(pdf, y, 20)
    y = drawSectionTitle(pdf, 'Observacoes', y)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    setText(pdf, COLOR.BLACK)
    y = addWrappedText(pdf, shootingDate.description, MARGIN.left, y, CONTENT_W)
    y += 4
  }

  // Footer
  addFooters(pdf, `Callsheet ${jobCode}`)

  const dateSlug = shootingDate.shooting_date.slice(0, 10).replace(/-/g, '')
  savePdf(pdf, `callsheet_${jobCode}_${dateSlug}.pdf`)
}
