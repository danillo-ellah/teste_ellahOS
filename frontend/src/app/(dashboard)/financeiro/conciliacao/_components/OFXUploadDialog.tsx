'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, FileText, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useImportOFX } from '@/hooks/useBankReconciliation'
import { toast } from 'sonner'
import type { BankStatement } from '@/types/bank-reconciliation'

interface OFXUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (statement: BankStatement) => void
}

interface FilePreview {
  name: string
  size: number
  content: string
  parsedInfo: {
    bankId: string | null
    accountId: string | null
    dtStart: string | null
    dtEnd: string | null
    transactionCount: number
  }
}

// Extrai informacao rapida do OFX para preview antes de enviar
function quickParseOFX(content: string): FilePreview['parsedInfo'] {
  const extractTag = (tag: string): string | null => {
    const regex = new RegExp(`<${tag}>([^\r\n<]*)`, 'i')
    const match = content.match(regex)
    return match?.[1]?.trim() || null
  }

  const formatDate = (raw: string | null): string | null => {
    if (!raw || raw.length < 8) return null
    const cleaned = raw.replace(/[\.\[].+$/, '').trim()
    const year = cleaned.substring(0, 4)
    const month = cleaned.substring(4, 6)
    const day = cleaned.substring(6, 8)
    return `${day}/${month}/${year}`
  }

  const transactionCount = (content.match(/<STMTTRN>/gi) ?? []).length

  return {
    bankId: extractTag('BANKID') ?? extractTag('ORG'),
    accountId: extractTag('ACCTID'),
    dtStart: formatDate(extractTag('DTSTART')),
    dtEnd: formatDate(extractTag('DTEND')),
    transactionCount,
  }
}

export function OFXUploadDialog({ open, onOpenChange, onSuccess }: OFXUploadDialogProps) {
  const [file, setFile] = useState<FilePreview | null>(null)
  const [bankNameOverride, setBankNameOverride] = useState('')
  const [accountOverride, setAccountOverride] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { mutateAsync: importOFX, isPending } = useImportOFX()

  const processFile = useCallback((selectedFile: File) => {
    setError(null)

    if (!selectedFile.name.toLowerCase().endsWith('.ofx') &&
        !selectedFile.name.toLowerCase().endsWith('.qfx')) {
      setError('Arquivo invalido. Selecione um arquivo .ofx ou .qfx')
      return
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('Arquivo muito grande. Tamanho maximo: 5 MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (!content) {
        setError('Nao foi possivel ler o arquivo')
        return
      }

      // Verificar se parece um OFX valido
      if (!content.includes('<OFX>') && !content.includes('<STMTTRN>')) {
        setError('O arquivo nao parece ser um extrato OFX valido')
        return
      }

      const parsedInfo = quickParseOFX(content)

      if (parsedInfo.transactionCount === 0) {
        setError('Nenhuma transacao encontrada no arquivo OFX')
        return
      }

      setFile({
        name: selectedFile.name,
        size: selectedFile.size,
        content,
        parsedInfo,
      })
    }
    reader.onerror = () => setError('Erro ao ler o arquivo')
    reader.readAsText(selectedFile, 'utf-8')
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) processFile(selected)
    // Reset input para permitir re-selecionar o mesmo arquivo
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) processFile(dropped)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleClearFile = () => {
    setFile(null)
    setError(null)
    setBankNameOverride('')
    setAccountOverride('')
  }

  const handleImport = async () => {
    if (!file) return

    try {
      const result = await importOFX({
        ofx_content: file.content,
        bank_name: bankNameOverride.trim() || undefined,
        account_identifier: accountOverride.trim() || undefined,
        file_name: file.name,
      })

      toast.success(
        `Extrato importado com sucesso: ${result.inserted_count} transacoes${
          result.skipped_count > 0 ? ` (${result.skipped_count} duplicatas ignoradas)` : ''
        }`,
      )

      onSuccess(result.statement)
      handleClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao importar extrato'
      toast.error(msg)
    }
  }

  const handleClose = () => {
    if (isPending) return
    handleClearFile()
    onOpenChange(false)
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Extrato Bancario (OFX)</DialogTitle>
          <DialogDescription>
            Selecione ou arraste um arquivo .ofx exportado do seu banco. O sistema
            identifica automaticamente o banco e o periodo do extrato.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-zinc-200 dark:border-zinc-700 hover:border-primary/50 hover:bg-zinc-50 dark:hover:bg-zinc-900',
              )}
            >
              <Upload className="h-10 w-10 text-zinc-400 mb-3" />
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Clique ou arraste o arquivo OFX aqui
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Suporta .ofx e .qfx (max. 5 MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ofx,.qfx"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          ) : (
            /* Preview do arquivo */
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
              {/* Header do arquivo */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-5 w-5 shrink-0 text-blue-500" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-zinc-500">{formatBytes(file.size)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFile}
                  className="h-7 w-7 p-0 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Informacoes parseadas */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {file.parsedInfo.bankId && (
                  <div>
                    <span className="text-zinc-500">Banco:</span>{' '}
                    <span className="font-medium">{file.parsedInfo.bankId}</span>
                  </div>
                )}
                {file.parsedInfo.accountId && (
                  <div>
                    <span className="text-zinc-500">Conta:</span>{' '}
                    <span className="font-medium">...{file.parsedInfo.accountId.slice(-6)}</span>
                  </div>
                )}
                {file.parsedInfo.dtStart && (
                  <div>
                    <span className="text-zinc-500">De:</span>{' '}
                    <span className="font-medium">{file.parsedInfo.dtStart}</span>
                  </div>
                )}
                {file.parsedInfo.dtEnd && (
                  <div>
                    <span className="text-zinc-500">Ate:</span>{' '}
                    <span className="font-medium">{file.parsedInfo.dtEnd}</span>
                  </div>
                )}
                <div className="col-span-2">
                  <span className="text-zinc-500">Transacoes encontradas:</span>{' '}
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {file.parsedInfo.transactionCount}
                  </span>
                </div>
              </div>

              {/* Sucesso */}
              <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Arquivo OFX validado com sucesso
              </div>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Campos opcionais de override */}
          {file && (
            <div className="space-y-3 border-t pt-3">
              <p className="text-xs text-zinc-500">Opcional: sobrescrever informacoes do banco</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bank-name" className="text-xs">
                    Nome do banco
                  </Label>
                  <Input
                    id="bank-name"
                    placeholder={file.parsedInfo.bankId ?? 'Ex: Itau, Bradesco'}
                    value={bankNameOverride}
                    onChange={(e) => setBankNameOverride(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="account-id" className="text-xs">
                    Identificador da conta
                  </Label>
                  <Input
                    id="account-id"
                    placeholder={file.parsedInfo.accountId ? `...${file.parsedInfo.accountId.slice(-6)}` : 'Ex: 4321'}
                    value={accountOverride}
                    onChange={(e) => setAccountOverride(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={!file || isPending}>
            {isPending ? 'Importando...' : `Importar ${file ? `(${file.parsedInfo.transactionCount} transacoes)` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
