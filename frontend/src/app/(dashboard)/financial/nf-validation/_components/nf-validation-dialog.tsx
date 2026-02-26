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
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/format'
import { toast } from 'sonner'
import { NfReassignDialog } from './nf-reassign-dialog'
import { useValidateNf, useRejectNf } from '@/hooks/useNf'
import type { NfDocument, FinancialRecordMatch } from '@/types/nf'

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
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border bg-zinc-100 px-3 dark:bg-zinc-900">
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
            <Skeleton className="h-8 w-8 rounded-full" />
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
}: OcrFieldProps) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-zinc-500">{label}</Label>
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
            isOcr &&
              !isEdited &&
              'border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800',
            isEdited && 'border-solid border-amber-500 dark:border-amber-400',
          )}
        />
        {isOcr && !isEdited && (
          <Badge
            variant="secondary"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0 h-4 dark:bg-blue-500/10 dark:text-blue-400"
            title="Extraido automaticamente — verifique antes de confirmar"
          >
            OCR
          </Badge>
        )}
        {isEdited && (
          <Badge
            variant="secondary"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0 h-4 dark:bg-amber-500/10 dark:text-amber-400"
          >
            Editado
          </Badge>
        )}
      </div>
    </div>
  )
}

// --- Main dialog (desktop) ---

interface NfValidationDialogProps {
  nf: NfDocument | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

// NfValidationContent: flex-col, ocupa todo o espaco disponivel (flex-1 no container pai)
// Estrutura: [split-body flex-1 overflow-hidden] + [footer shrink-0]
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
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  const { mutateAsync: validateNf, isPending: isValidating } = useValidateNf()
  const { mutateAsync: rejectNf, isPending: isRejecting } = useRejectNf()

  // Detectar campos editados vs OCR
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

  // Usa match existente da NF ou o selecionado manualmente
  const hasAutoMatch =
    nf.status === 'auto_matched' && nf.matched_financial_record_id
  const effectiveMatch = selectedMatch
  const matchFinancialRecordId =
    effectiveMatch?.id ?? (hasAutoMatch ? nf.matched_financial_record_id : null)

  const canConfirm = !!(
    (issuerName.trim() || nfNumber.trim()) &&
    nfValue.trim() &&
    matchFinancialRecordId
  )

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

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      {/* Corpo split */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Painel esquerdo: PDF */}
        <div className="hidden w-1/2 border-r border-border md:flex md:flex-col">
          <PdfPreview url={nf.drive_url} fileName={nf.file_name} />
        </div>

        {/* Painel direito: dados */}
        <div className="flex-1 overflow-y-auto p-6 md:w-1/2">
          {/* Dados extraidos */}
          <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">
            Dados Extraidos
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <OcrField
                label="Fornecedor"
                value={issuerName}
                onChange={setIssuerName}
                isOcr={!!nf.extracted_issuer_name}
                isEdited={isEdited.issuerName}
                placeholder="Nome do fornecedor"
              />
            </div>
            <OcrField
              label="CNPJ"
              value={issuerCnpj}
              onChange={setIssuerCnpj}
              isOcr={!!nf.extracted_issuer_cnpj}
              isEdited={isEdited.issuerCnpj}
              placeholder="00.000.000/0000-00"
            />
            <OcrField
              label="Numero NF"
              value={nfNumber}
              onChange={setNfNumber}
              isOcr={!!nf.extracted_nf_number}
              isEdited={isEdited.nfNumber}
              placeholder="000000"
            />
            <OcrField
              label="Valor"
              value={nfValue}
              onChange={setNfValue}
              isOcr={!!nf.extracted_value}
              isEdited={isEdited.nfValue}
              prefix="R$"
              placeholder="0,00"
            />
            <OcrField
              label="Data de emissao"
              value={issueDate}
              onChange={setIssueDate}
              isOcr={!!nf.extracted_issue_date}
              isEdited={isEdited.issueDate}
              type="date"
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
          </div>

          {/* Match sugerido */}
          <p className="mt-6 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
            Match Sugerido
          </p>

          {hasAutoMatch || selectedMatch ? (
            <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {selectedMatch ? 'Selecionado manualmente' : 'Auto-matched'}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">
                  {selectedMatch?.description ?? nf.matched_record_description ?? '—'}
                </p>
                {(selectedMatch?.job_code ?? nf.matched_job_code) && (
                  <Badge variant="outline" className="text-xs">
                    {selectedMatch?.job_code ?? nf.matched_job_code}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                <span className="font-mono text-blue-700 dark:text-blue-300">
                  {formatCurrency(
                    selectedMatch?.amount ?? nf.matched_record_amount,
                  )}
                </span>
                {' · '}
                {formatDate(selectedMatch?.due_date ?? nf.matched_record_date)}
              </p>
            </div>
          ) : (
            <div className="mt-2 flex flex-col items-center gap-2 rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-600 dark:bg-zinc-800">
              <AlertCircle className="h-5 w-5 text-zinc-400" />
              <p className="text-xs text-zinc-500">
                Sem match automatico — selecione o lancamento
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-1"
                onClick={() => setReassignOpen(true)}
              >
                <Search className="h-3.5 w-3.5 mr-1.5" />
                Buscar lancamento
              </Button>
            </div>
          )}

          {(hasAutoMatch || selectedMatch) && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={() => setReassignOpen(true)}
            >
              <Search className="h-3.5 w-3.5 mr-1.5" />
              Reclassificar para outro lancamento
            </Button>
          )}

          {/* Modo rejeicao */}
          {rejectMode && (
            <div className="mt-4 space-y-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
              <Label className="text-xs text-red-700 dark:text-red-400">
                Motivo da rejeicao (obrigatorio)
              </Label>
              <Input
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex: NF duplicada, fornecedor incorreto..."
                className="text-sm border-red-300 dark:border-red-800"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setRejectMode(false)
                    setRejectionReason('')
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  disabled={isRejecting || !rejectionReason.trim()}
                  onClick={handleReject}
                >
                  {isRejecting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-1" />
                  )}
                  Confirmar rejeicao
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <DialogFooter className="flex flex-row items-center justify-between border-t border-border px-6 py-4">
        <Button
          variant="destructive"
          onClick={() => setRejectMode((prev) => !prev)}
          disabled={isValidating || isRejecting}
        >
          <XCircle className="h-4 w-4 mr-1.5" />
          Rejeitar NF
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isValidating || isRejecting}>
            Cancelar
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
                Confirmar Match
              </>
            )}
          </Button>
        </div>
      </DialogFooter>

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
  )
}

// --- Desktop Dialog ---

export function NfValidationDialog({
  nf,
  open,
  onOpenChange,
  onSuccess,
}: NfValidationDialogProps) {
  return (
    <>
      {/* Desktop (md+): Dialog com layout split */}
      <div className="hidden md:block">
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            className="max-w-4xl p-0 overflow-hidden"
            style={{ maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            aria-labelledby="nf-validation-title"
            aria-modal="true"
          >
            <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
              <DialogTitle id="nf-validation-title">
                Validar NF {nf ? `— ${nf.file_name}` : ''}
              </DialogTitle>
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
      </div>

      {/* Mobile: bottom sheet */}
      <div className="md:hidden">
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent
            side="bottom"
            className="flex h-[95vh] flex-col p-0"
          >
            <div className="shrink-0 border-b border-border px-6 py-4">
              <p className="text-lg font-semibold">
                Validar NF {nf ? `— ${nf.file_name}` : ''}
              </p>
            </div>
            {/* Preview PDF mobile (50% altura) */}
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
      </div>
    </>
  )
}
