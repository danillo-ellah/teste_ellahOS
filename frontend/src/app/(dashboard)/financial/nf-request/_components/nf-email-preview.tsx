'use client'

import { useEffect, useState, useRef } from 'react'
import { Mail, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/format'
import type { NfRequestRecord, NfRequestSupplierGroup } from '@/types/nf'

// Gera um HTML de preview do email localmente
// Em producao o HTML viria do backend, mas para preview usamos um template local
function generateEmailHtml(
  group: NfRequestSupplierGroup,
  selectedRecords: NfRequestRecord[],
  customMessage: string,
): string {
  const rows = selectedRecords
    .map(
      (r) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;font-size:14px;color:#18181b">${r.description}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;font-size:14px;color:#18181b;text-align:right;font-family:monospace">${formatCurrency(r.amount)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;font-size:13px;color:#71717a">${formatDate(r.due_date)}</td>
      </tr>
    `,
    )
    .join('')

  const total = selectedRecords.reduce((sum, r) => sum + r.amount, 0)

  const customBlock = customMessage
    ? `<p style="margin:16px 0;font-size:14px;color:#3f3f46;line-height:1.6">${customMessage}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><style>body{font-family:-apple-system,sans-serif;background:#fff;margin:0;padding:0}</style></head>
<body style="padding:24px;max-width:600px;margin:0 auto">
  <div style="margin-bottom:24px">
    <span style="font-size:18px;font-weight:700;letter-spacing:-0.5px;color:#09090b">ELLAH<span style="color:#e11d48">OS</span></span>
  </div>
  <p style="margin:0 0 8px;font-size:14px;color:#3f3f46">Prezados,</p>
  <p style="margin:0 0 16px;font-size:14px;color:#3f3f46;line-height:1.6">
    Segue relacao de servicos prestados para os quais solicitamos o envio da Nota Fiscal correspondente.
  </p>
  ${customBlock}
  <table style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden">
    <thead>
      <tr style="background:#f4f4f5">
        <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:.05em">Descricao</th>
        <th style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:.05em">Valor</th>
        <th style="padding:10px 12px;text-align:left;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:.05em">Data</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr style="background:#f4f4f5">
        <td style="padding:10px 12px;font-size:14px;font-weight:700;color:#09090b">Total</td>
        <td style="padding:10px 12px;font-size:14px;font-weight:700;color:#09090b;text-align:right;font-family:monospace">${formatCurrency(total)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>
  <p style="margin:16px 0 8px;font-size:14px;color:#3f3f46;line-height:1.6">
    Por favor, envie a NF para o email <strong>financeiro@ellahfilmes.com.br</strong> ou responda este email com o arquivo anexo.
  </p>
  <p style="margin:24px 0 4px;font-size:14px;color:#3f3f46">Atenciosamente,</p>
  <p style="margin:0;font-size:14px;font-weight:600;color:#09090b">Equipe Financeira — Ellah Filmes</p>
</body>
</html>`
}

// --- Estado vazio (sem selecao) ---

function PreviewEmpty() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
      <Mail className="h-10 w-10 text-zinc-300" />
      <p className="max-w-[220px] text-center text-sm text-zinc-400">
        Selecione lancamentos para ver o preview do email
      </p>
    </div>
  )
}

// --- Componente principal ---

interface NfEmailPreviewProps {
  selectedGroup: NfRequestSupplierGroup | null
  selectedRecords: NfRequestRecord[]
  customMessage: string
  onCustomMessageChange: (value: string) => void
  subject: string
  onSubjectChange: (value: string) => void
  isMultipleSuppliers: boolean
  supplierCount: number
}

const MAX_MESSAGE_LENGTH = 500

export function NfEmailPreview({
  selectedGroup,
  selectedRecords,
  customMessage,
  onCustomMessageChange,
  subject,
  onSubjectChange,
  isMultipleSuppliers,
  supplierCount,
}: NfEmailPreviewProps) {
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const hasSelection = selectedRecords.length > 0

  // H8 fix: gera HTML com debounce e usa srcdoc (mais seguro que document.write)
  useEffect(() => {
    if (!hasSelection || !selectedGroup) {
      setPreviewHtml('')
      return
    }

    setPreviewLoading(true)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      const html = generateEmailHtml(selectedGroup, selectedRecords, customMessage)
      setPreviewHtml(html)
      setPreviewLoading(false)
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRecords, customMessage, hasSelection, selectedGroup])

  const toAddress = isMultipleSuppliers
    ? `${supplierCount} fornecedores (emails individuais)`
    : (selectedGroup?.supplier_email ?? '—')

  return (
    <div className="flex h-full flex-col">
      {/* Cabecalho do preview */}
      <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/60">
        {/* Para: */}
        <div className="flex items-baseline gap-2 py-1">
          <span className="w-[60px] shrink-0 text-xs font-medium text-zinc-500">
            Para:
          </span>
          <span className="truncate text-sm text-zinc-800 dark:text-zinc-200">
            {hasSelection ? toAddress : '—'}
          </span>
        </div>

        {/* Assunto: */}
        <div className="flex items-baseline gap-2 py-1">
          <span className="w-[60px] shrink-0 text-xs font-medium text-zinc-500">
            Assunto:
          </span>
          <Input
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder={
              selectedGroup
                ? `Pedido de NF - ${selectedGroup.supplier_name}`
                : 'Pedido de NF'
            }
            disabled={!hasSelection}
            className="h-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-rose-400 dark:bg-transparent"
            aria-label="Assunto do email"
          />
        </div>
      </div>

      {/* Area de preview do iframe */}
      <div className="relative flex-1 px-4 py-3">
        {!hasSelection ? (
          <PreviewEmpty />
        ) : previewLoading ? (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 dark:border-zinc-700">
            <Loader2 className="h-5 w-5 animate-spin text-rose-400" />
            <span className="text-xs text-zinc-400">Gerando preview...</span>
          </div>
        ) : (
          <div className="relative h-full min-h-[300px]">
            <iframe
              title={
                selectedGroup
                  ? `Preview do email para ${selectedGroup.supplier_name}`
                  : 'Preview do email'
              }
              srcDoc={previewHtml}
              sandbox=""
              className="h-full min-h-[300px] w-full rounded-md border border-zinc-200 bg-white dark:border-zinc-700"
              aria-label="Preview do conteudo do email"
            />
          </div>
        )}
      </div>

      {/* Mensagem custom */}
      <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <label
          htmlFor="custom-message"
          className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500"
        >
          Mensagem adicional (opcional)
        </label>
        <Textarea
          id="custom-message"
          placeholder="Adicione uma mensagem personalizada ao email..."
          value={customMessage}
          onChange={(e) => onCustomMessageChange(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
          disabled={!hasSelection}
          rows={3}
          className={cn(
            'resize-none text-sm focus-visible:ring-rose-400',
            !hasSelection && 'cursor-not-allowed opacity-50',
          )}
          aria-describedby="message-counter"
        />
        <p
          id="message-counter"
          className="mt-1 text-right text-xs text-zinc-400"
        >
          {customMessage.length} / {MAX_MESSAGE_LENGTH}
        </p>
      </div>
    </div>
  )
}
