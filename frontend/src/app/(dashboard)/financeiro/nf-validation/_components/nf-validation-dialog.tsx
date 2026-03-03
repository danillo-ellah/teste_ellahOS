'use client'

import { useState, useEffect } from 'react'
import {
  ExternalLink,
  AlertTriangle,
  FileText,
  Zap,
  AlertCircle,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ScanLine,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/format'
import { toast } from 'sonner'
import { NfReassignDialog } from './nf-reassign-dialog'
import { NfStatusBadge } from './nf-status-badge'
import { useValidateNf, useRejectNf, useOcrAnalyze } from '@/hooks/useNf'
import type { NfDocument, FinancialRecordMatch, OcrAnalyzeResult, OcrFieldConfidence } from '@/types/nf'

// --- Responsive hook (evita renderizar Dialog+Sheet simultaneamente) ---

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return isMobile
}

// --- PDF Preview ---

interface PdfPreviewProps {
  url: string | null
  fileName: string
}

function toEmbedUrl(driveUrl: string): string {
  // Converte /view para /preview (Google Drive bloqueia /view em iframes)
  return driveUrl.replace(/\/view(\?.*)?$/, '/preview')
}

function PdfPreview({ url, fileName }: PdfPreviewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const embedUrl = url ? toEmbedUrl(url) : null

  useEffect(() => {
    setLoading(true)
    setError(false)
  }, [url])

  if (!url || !embedUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-400">
        <FileText className="h-10 w-10" />
        <p className="text-sm">Sem PDF disponivel</p>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border border-l-4 border-l-zinc-300 bg-zinc-100 px-3 dark:border-l-zinc-600 dark:bg-zinc-900">
        <span className="truncate text-xs text-zinc-500 max-w-[200px]">{fileName}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir em nova aba
        </a>
      </div>

      {/* iframe */}
      <div className="relative flex-1 bg-white">
        {loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-50">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            <p className="text-xs text-zinc-400">Carregando PDF...</p>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-50">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <p className="text-sm text-zinc-500">Nao foi possivel carregar o PDF</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-rose-600 hover:underline"
            >
              Abrir em nova aba
            </a>
          </div>
        )}
        {!error && (
          <iframe
            src={embedUrl!}
            title={`Preview do PDF: ${fileName}`}
            className="h-full w-full border-none"
            sandbox="allow-same-origin allow-scripts"
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false)
              setError(true)
            }}
          />
        )}
      </div>
    </div>
  )
}

// --- Badge de confianca OCR por campo ---

interface OcrConfidenceBadgeProps {
  confidence: OcrFieldConfidence
}

function OcrConfidenceBadge({ confidence }: OcrConfidenceBadgeProps) {
  if (confidence === 'high') {
    return (
      <Badge
        variant="outline"
        className="ml-1.5 text-[10px] px-1.5 py-0 h-4 border-emerald-400 text-emerald-700 dark:border-emerald-600 dark:text-emerald-400"
        title="OCR: alta confianca — dado extraido com clareza"
      >
        OCR ✓
      </Badge>
    )
  }
  if (confidence === 'medium') {
    return (
      <Badge
        variant="outline"
        className="ml-1.5 text-[10px] px-1.5 py-0 h-4 border-amber-400 text-amber-600 dark:border-amber-600 dark:text-amber-400"
        title="OCR: confianca media — verifique o valor"
      >
        OCR ~
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="ml-1.5 text-[10px] px-1.5 py-0 h-4 border-red-300 text-red-600 dark:border-red-700 dark:text-red-400"
      title="OCR: baixa confianca — dado incerto, revise manualmente"
    >
      OCR ?
    </Badge>
  )
}

// --- Campo com badge OCR ---

interface OcrFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  isOcr: boolean
  isEdited: boolean
  prefix?: string
  type?: 'text' | 'date' | 'month'
  placeholder?: string
  // Confianca do OCR ao-vivo (resultado do botao "Extrair com OCR")
  ocrConfidence?: OcrFieldConfidence
  wasManuallyFilledBeforeOcr?: boolean
}

function OcrField({
  label,
  value,
  onChange,
  isOcr,
  isEdited,
  prefix,
  type = 'text',
  placeholder,
  ocrConfidence,
  wasManuallyFilledBeforeOcr,
}: OcrFieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-0">
        <Label className="text-xs text-zinc-500">{label}</Label>
        {/* Badge do OCR ao-vivo (resultado do botao Extrair com OCR) */}
        {ocrConfidence && !isEdited && (
          <OcrConfidenceBadge confidence={ocrConfidence} />
        )}
        {/* Badge padrao OCR (dados extraidos anteriormente pelo pipeline) */}
        {!ocrConfidence && isOcr && !isEdited && (
          <Badge
            variant="outline"
            className="ml-1.5 text-[10px] px-1.5 py-0 h-4 border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400"
            title="Extraido automaticamente — verifique antes de confirmar"
          >
            OCR
          </Badge>
        )}
        {isEdited && (
          <Badge
            variant="outline"
            className="ml-1.5 text-[10px] px-1.5 py-0 h-4 border-amber-400 text-amber-600 dark:border-amber-600 dark:text-amber-400"
          >
            Editado
          </Badge>
        )}
        {/* Aviso de campo preenchido manualmente antes do OCR */}
        {wasManuallyFilledBeforeOcr && ocrConfidence && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="ml-1.5 cursor-help text-[10px] text-zinc-400">
                (mantido)
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-[200px]">
              Campo ja preenchido manualmente — OCR nao sobrescreveu
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
            {prefix}
          </span>
        )}
        <Input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'text-sm',
            prefix && 'pl-7',
            // Estilo OCR ao-vivo por confianca
            ocrConfidence === 'high' && !isEdited &&
              'border-dashed border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-950/20',
            ocrConfidence === 'medium' && !isEdited &&
              'border-dashed border-amber-300 bg-amber-50/30 dark:border-amber-700 dark:bg-amber-950/20',
            ocrConfidence === 'low' && !isEdited &&
              'border-dashed border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-950/10',
            // Estilo OCR de pipeline (sem resultado ao-vivo)
            !ocrConfidence && isOcr && !isEdited &&
              'border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800',
            isEdited && 'border-solid border-amber-500 dark:border-amber-400',
          )}
        />
      </div>
    </div>
  )
}

// --- Main content ---

interface NfValidationDialogProps {
  nf: NfDocument | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

function NfValidationContent({
  nf,
  onClose,
  onSuccess,
}: {
  nf: NfDocument
  onClose: () => void
  onSuccess?: () => void
}) {
  const [issuerName, setIssuerName] = useState(nf.nf_issuer_name ?? nf.extracted_issuer_name ?? '')
  const [issuerCnpj, setIssuerCnpj] = useState(nf.nf_issuer_cnpj ?? nf.extracted_issuer_cnpj ?? '')
  const [nfNumber, setNfNumber] = useState(nf.nf_number ?? nf.extracted_nf_number ?? '')
  const [nfValue, setNfValue] = useState(
    String(nf.nf_value ?? nf.extracted_value ?? ''),
  )
  const [issueDate, setIssueDate] = useState(nf.nf_issue_date ?? nf.extracted_issue_date ?? '')
  const [competencia, setCompetencia] = useState(nf.extracted_competencia ?? '')
  const [selectedMatch, setSelectedMatch] = useState<FinancialRecordMatch | null>(null)
  const [reassignOpen, setReassignOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  // --- Estado OCR ao-vivo ---
  const [ocrResult, setOcrResult] = useState<OcrAnalyzeResult | null>(null)
  // Rastreia quais campos tinham valor ANTES de o OCR ser disparado (para nao sobrescrever)
  const [preOcrValues, setPreOcrValues] = useState<Record<string, string> | null>(null)

  const { mutateAsync: validateNf, isPending: isValidating } = useValidateNf()
  const { mutateAsync: rejectNf, isPending: isRejecting } = useRejectNf()
  const { mutateAsync: runOcr, isPending: isOcrPending } = useOcrAnalyze()

  // Botao OCR desabilitado se nao ha arquivo no Drive
  const hasFile = !!(nf.drive_url || nf.drive_file_id)

  // --- Detectar campos editados vs OCR de pipeline ---
  const orig = {
    issuerName: nf.extracted_issuer_name ?? '',
    issuerCnpj: nf.extracted_issuer_cnpj ?? '',
    nfNumber: nf.extracted_nf_number ?? '',
    nfValue: String(nf.extracted_value ?? ''),
    issueDate: nf.extracted_issue_date ?? '',
  }

  const isEdited = {
    issuerName: issuerName !== orig.issuerName,
    issuerCnpj: issuerCnpj !== orig.issuerCnpj,
    nfNumber: nfNumber !== orig.nfNumber,
    nfValue: nfValue !== orig.nfValue,
    issueDate: issueDate !== orig.issueDate,
  }

  // --- Handler do botao OCR ---
  async function handleOcrExtract() {
    // Salvar valores atuais ANTES de rodar OCR para detectar campos preenchidos manualmente
    const snapshot: Record<string, string> = {
      issuerName,
      issuerCnpj,
      nfNumber,
      nfValue,
      issueDate,
    }
    setPreOcrValues(snapshot)

    try {
      const response = await runOcr(nf.id)
      const result = response.data

      if (!result) {
        toast.error('Nao foi possivel extrair dados da NF')
        return
      }

      setOcrResult(result)

      // Aplicar valores extraidos APENAS nos campos que estavam vazios antes do OCR
      // Campos ja preenchidos manualmente sao preservados
      if (result.company_name.value && !snapshot.issuerName) {
        setIssuerName(result.company_name.value)
      }
      if (result.cnpj_emitter.value && !snapshot.issuerCnpj) {
        setIssuerCnpj(result.cnpj_emitter.value)
      }
      if (result.nf_number.value && !snapshot.nfNumber) {
        setNfNumber(result.nf_number.value)
      }
      if (result.total_value.value && !snapshot.nfValue) {
        setNfValue(result.total_value.value)
      }
      if (result.emission_date.value && !snapshot.issueDate) {
        setIssueDate(result.emission_date.value)
      }

      const filledCount = [
        result.company_name.value,
        result.nf_number.value,
        result.total_value.value,
        result.emission_date.value,
        result.cnpj_emitter.value,
      ].filter(Boolean).length

      if (filledCount === 0) {
        toast.warning('OCR nao conseguiu extrair dados desta NF. Preencha manualmente.')
      } else {
        const sourceLabel = result.source === 'groq_ocr' ? 'Extracao IA' : 'Dados existentes'
        toast.success(`${sourceLabel}: ${filledCount} campo(s) preenchidos automaticamente`)

        // Se a secao de informacoes adicionais estiver fechada e o OCR extraiu data/cnpj, abrir
        if (result.emission_date.value || result.cnpj_emitter.value) {
          setComplementaryOpen(true)
        }
      }
    } catch {
      toast.error('Nao foi possivel extrair dados da NF')
    }
  }

  // Retorna a confianca do OCR ao-vivo para um campo (se disponivel e campo nao foi editado manualmente pos-OCR)
  function getOcrConfidence(
    fieldKey: keyof typeof isEdited,
    ocrKey: keyof OcrAnalyzeResult,
  ): OcrFieldConfidence | undefined {
    if (!ocrResult) return undefined
    // Se o campo foi editado APOS o OCR, nao mostrar badge de confianca
    if (isEdited[fieldKey]) return undefined
    const field = ocrResult[ocrKey] as { value: string | null; confidence: OcrFieldConfidence } | undefined
    if (!field?.value) return undefined
    return field.confidence
  }

  // Detecta se o campo tinha valor manual ANTES de o OCR ser disparado
  function wasManuallyFilled(fieldKey: string): boolean {
    if (!preOcrValues || !ocrResult) return false
    return !!(preOcrValues[fieldKey])
  }

  // Usa match existente da NF ou o selecionado manualmente
  const hasAutoMatch =
    nf.status === 'auto_matched' && nf.matched_financial_record_id
  const matchFinancialRecordId =
    selectedMatch?.id ?? (hasAutoMatch ? nf.matched_financial_record_id : null)

  const canConfirm = !!(
    (issuerName.trim() || nfNumber.trim()) &&
    nfValue.trim() &&
    matchFinancialRecordId
  )

  const confirmDisabledReason = !matchFinancialRecordId
    ? 'Selecione um lancamento financeiro'
    : !nfValue.trim()
      ? 'Informe o valor da NF'
      : 'Preencha o fornecedor ou numero da NF'

  async function handleConfirm() {
    try {
      const value = parseFloat(nfValue.replace(',', '.'))
      await validateNf({
        nf_document_id: nf.id,
        financial_record_id: matchFinancialRecordId ?? undefined,
        nf_number: nfNumber.trim() || undefined,
        nf_value: isNaN(value) ? undefined : value,
        nf_issuer_cnpj: issuerCnpj.trim() || undefined,
        nf_issuer_name: issuerName.trim() || undefined,
        nf_issue_date: issueDate || undefined,
      })
      toast.success('NF confirmada com sucesso')
      onSuccess?.()
      onClose()
    } catch {
      toast.error('Erro ao confirmar NF. Tente novamente.')
    }
  }

  async function handleReject() {
    if (!rejectionReason.trim()) {
      toast.error('Informe o motivo da rejeicao')
      return
    }
    try {
      await rejectNf({
        nf_document_id: nf.id,
        rejection_reason: rejectionReason.trim(),
      })
      toast.success('NF rejeitada')
      onSuccess?.()
      onClose()
    } catch {
      toast.error('Erro ao rejeitar NF. Tente novamente.')
    }
  }

  // Estado inicial da secao colapsavel: expandido se houver algum dado OCR nos campos complementares
  const hasComplementaryOcrData = !!(
    nf.extracted_issuer_cnpj ||
    nf.extracted_issue_date ||
    nf.extracted_competencia
  )
  const [complementaryOpen, setComplementaryOpen] = useState(hasComplementaryOcrData)

  return (
    <TooltipProvider>
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        {/* Corpo split */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Painel esquerdo: PDF */}
          <div className="hidden w-3/5 border-r border-border md:flex md:flex-col">
            <PdfPreview url={nf.drive_url} fileName={nf.file_name} />
          </div>

          {/* Painel direito: dados */}
          <div className="flex-1 overflow-y-auto p-6 md:w-2/5">

            {/* ZONA A — Match Sugerido (ponto de decisao — vem primeiro) */}
            <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">
              Match Sugerido
            </p>

            {hasAutoMatch || selectedMatch ? (
              <div
                className={cn(
                  'mt-2 rounded-lg border p-4',
                  'border-l-4',
                  selectedMatch
                    ? 'border-amber-200 border-l-amber-500 bg-amber-50/50 dark:border-amber-800 dark:border-l-amber-500 dark:bg-amber-950/20'
                    : 'border-emerald-200 border-l-emerald-500 bg-emerald-50 dark:border-emerald-800 dark:border-l-emerald-500 dark:bg-emerald-950/40',
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    {selectedMatch ? 'Vinculado manualmente' : 'Auto-matched'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-7 text-xs text-zinc-500 hover:text-foreground"
                    onClick={() => setReassignOpen(true)}
                  >
                    Trocar
                  </Button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {selectedMatch?.description ?? nf.matched_record_description ?? '\u2014'}
                  </p>
                  {(selectedMatch?.job_code ?? nf.matched_job_code) && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedMatch?.job_code ?? nf.matched_job_code}
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    {formatCurrency(
                      selectedMatch?.amount ?? nf.matched_record_amount,
                    )}
                  </span>
                  {' \u00b7 '}
                  {formatDate(selectedMatch?.due_date ?? nf.matched_record_date)}
                </p>
              </div>
            ) : (
              <div className="mt-2 rounded-lg border-2 border-dashed border-zinc-300 bg-transparent p-4 dark:border-zinc-600">
                <div className="flex flex-col items-center gap-2 text-center">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <p className="text-sm font-medium text-foreground">
                    Lancamento nao encontrado automaticamente
                  </p>
                  <p className="text-xs text-zinc-500">
                    Vincule manualmente ao lancamento correto para confirmar esta NF.
                  </p>
                  <Button
                    size="sm"
                    className="mt-1"
                    onClick={() => setReassignOpen(true)}
                  >
                    <Search className="h-3.5 w-3.5 mr-1.5" />
                    Buscar lancamento financeiro
                  </Button>
                </div>
              </div>
            )}

            {/* ZONA B — Dados Principais + botao OCR */}
            <div className="mt-6 flex items-center justify-between">
              <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">
                Dados da Nota Fiscal
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        'h-7 gap-1.5 text-xs',
                        !hasFile && 'opacity-50 cursor-not-allowed',
                        ocrResult && 'border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400',
                      )}
                      disabled={!hasFile || isOcrPending || isValidating || isRejecting}
                      onClick={handleOcrExtract}
                    >
                      {isOcrPending ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Analisando...
                        </>
                      ) : (
                        <>
                          <ScanLine className="h-3.5 w-3.5" />
                          {ocrResult ? 'Re-extrair com OCR' : 'Extrair com OCR'}
                        </>
                      )}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs max-w-[220px]">
                  {!hasFile
                    ? 'Sem arquivo anexo — nao e possivel usar OCR'
                    : 'Preenche os campos automaticamente usando IA. Campos ja preenchidos nao serao sobrescritos.'}
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <OcrField
                  label="Fornecedor"
                  value={issuerName}
                  onChange={setIssuerName}
                  isOcr={!!nf.extracted_issuer_name}
                  isEdited={isEdited.issuerName}
                  placeholder="Nome do fornecedor"
                  ocrConfidence={getOcrConfidence('issuerName', 'company_name')}
                  wasManuallyFilledBeforeOcr={wasManuallyFilled('issuerName')}
                />
              </div>
              <OcrField
                label="Valor"
                value={nfValue}
                onChange={setNfValue}
                isOcr={!!nf.extracted_value}
                isEdited={isEdited.nfValue}
                prefix="R$"
                placeholder="0,00"
                ocrConfidence={getOcrConfidence('nfValue', 'total_value')}
                wasManuallyFilledBeforeOcr={wasManuallyFilled('nfValue')}
              />
              <OcrField
                label="Numero NF"
                value={nfNumber}
                onChange={setNfNumber}
                isOcr={!!nf.extracted_nf_number}
                isEdited={isEdited.nfNumber}
                placeholder="000000"
                ocrConfidence={getOcrConfidence('nfNumber', 'nf_number')}
                wasManuallyFilledBeforeOcr={wasManuallyFilled('nfNumber')}
              />
            </div>

            {/* ZONA C — Informacoes Adicionais (colapsavel) */}
            <Collapsible
              open={complementaryOpen}
              onOpenChange={setComplementaryOpen}
              className="mt-4 pt-4 border-t border-border/50"
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-[11px] font-medium uppercase tracking-widest text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  <span>Informacoes Adicionais</span>
                  {complementaryOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <OcrField
                    label="Data de emissao"
                    value={issueDate}
                    onChange={setIssueDate}
                    isOcr={!!nf.extracted_issue_date}
                    isEdited={isEdited.issueDate}
                    type="date"
                    ocrConfidence={getOcrConfidence('issueDate', 'emission_date')}
                    wasManuallyFilledBeforeOcr={wasManuallyFilled('issueDate')}
                  />
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-500">Competencia</Label>
                    <Input
                      type="month"
                      value={competencia}
                      onChange={(e) => setCompetencia(e.target.value)}
                      className="text-sm"
                      placeholder="MM/AAAA"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <OcrField
                      label="CNPJ"
                      value={issuerCnpj}
                      onChange={setIssuerCnpj}
                      isOcr={!!nf.extracted_issuer_cnpj}
                      isEdited={isEdited.issuerCnpj}
                      placeholder="00.000.000/0000-00"
                      ocrConfidence={getOcrConfidence('issuerCnpj', 'cnpj_emitter')}
                      wasManuallyFilledBeforeOcr={wasManuallyFilled('issuerCnpj')}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        {/* Footer: [Cancelar ghost] [hint] [Rejeitar outline] [Confirmar NF primary] */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <Button variant="ghost" onClick={onClose} disabled={isValidating || isRejecting}>
            Cancelar
          </Button>
          <div className="flex items-center gap-3">
            {!canConfirm && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Falta: {confirmDisabledReason.toLowerCase()}
              </p>
            )}
            <Button
              variant="outline"
              className="border-zinc-300 text-zinc-600 hover:border-red-300 hover:text-red-600 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-red-700 dark:hover:text-red-400"
              onClick={() => setRejectDialogOpen(true)}
              disabled={isValidating || isRejecting}
            >
              <XCircle className="h-4 w-4 mr-1.5" />
              Rejeitar
            </Button>
            <Button
              disabled={!canConfirm || isValidating}
              onClick={handleConfirm}
            >
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Confirmando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Confirmar NF
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Rejeicao via AlertDialog overlay */}
        <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <AlertDialogContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">Rejeitar Nota Fiscal</h3>
                <p className="text-sm text-zinc-500 mt-1">
                  Voce esta rejeitando:{' '}
                  <span className="font-medium">{nf.file_name}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">
                  Motivo da rejeicao <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ex: NF duplicada, fornecedor incorreto, NF cancelada pelo emitente..."
                  className="min-h-[80px] text-sm resize-none"
                  autoFocus
                />
                <p className="text-xs text-zinc-500">
                  Exemplos: duplicada, fornecedor incorreto, NF cancelada pelo emitente.
                </p>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setRejectionReason('')}>
                Cancelar
              </AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={isRejecting || !rejectionReason.trim()}
                onClick={handleReject}
              >
                {isRejecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <XCircle className="h-4 w-4 mr-1" />
                )}
                Rejeitar NF
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de reclassificacao */}
        <NfReassignDialog
          open={reassignOpen}
          onOpenChange={setReassignOpen}
          onSelect={(record) => {
            setSelectedMatch(record)
            setReassignOpen(false)
          }}
          currentJobId={nf.matched_job_id}
        />
      </div>
    </TooltipProvider>
  )
}

// --- Desktop Dialog / Mobile Sheet (renderiza apenas um) ---

export function NfValidationDialog({
  nf,
  open,
  onOpenChange,
  onSuccess,
}: NfValidationDialogProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="flex h-[95vh] flex-col p-0"
        >
          <div className="shrink-0 border-b border-border px-6 py-4">
            <p className="text-base font-semibold">Validar Nota Fiscal</p>
            {nf && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-zinc-500 truncate max-w-[280px]">
                  {nf.file_name}
                </span>
                <NfStatusBadge status={nf.status} />
              </div>
            )}
          </div>
          {/* Preview PDF mobile (45% altura) */}
          {nf && (
            <div className="h-[45%] shrink-0 border-b border-border">
              <PdfPreview url={nf.drive_url} fileName={nf.file_name} />
            </div>
          )}
          {nf && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <NfValidationContent
                nf={nf}
                onClose={() => onOpenChange(false)}
                onSuccess={onSuccess}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] w-[95vw] p-0 overflow-hidden xl:max-w-7xl"
        style={{ height: '92vh', display: 'flex', flexDirection: 'column' }}
        aria-labelledby="nf-validation-title"
        aria-modal="true"
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle id="nf-validation-title" className="text-base font-semibold">
            Validar Nota Fiscal
          </DialogTitle>
          {nf && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-zinc-500 truncate max-w-[360px]">
                {nf.file_name}
              </span>
              <NfStatusBadge status={nf.status} />
            </div>
          )}
        </DialogHeader>
        {nf && (
          <NfValidationContent
            nf={nf}
            onClose={() => onOpenChange(false)}
            onSuccess={onSuccess}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
