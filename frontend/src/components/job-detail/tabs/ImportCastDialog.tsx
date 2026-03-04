'use client'

import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload, Loader2, FileText, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { apiMutate, safeErrorMessage } from '@/lib/api'

// --- Props ---

interface ImportCastDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
}

// --- CSV parsing helpers ---

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

function parseCsv(content: string): { headers: string[]; rows: string[][] } {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = parseCsvLine(lines[0])
  const rows = lines.slice(1).map((line) => parseCsvLine(line))

  return { headers, rows }
}

export function ImportCastDialog({
  open,
  onOpenChange,
  jobId,
}: ImportCastDialogProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [csvContent, setCsvContent] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setCsvContent(text)
      setPreview(parseCsv(text))
    }
    reader.readAsText(file, 'UTF-8')

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handlePasteChange(value: string) {
    setCsvContent(value)
    if (value.trim()) {
      setPreview(parseCsv(value))
      setFileName(null)
    } else {
      setPreview(null)
    }
  }

  function handleClear() {
    setCsvContent('')
    setFileName(null)
    setPreview(null)
  }

  const mutation = useMutation({
    mutationFn: () =>
      apiMutate('job-cast', 'POST', { job_id: jobId, csv_content: csvContent }, 'import-csv'),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['job-cast', jobId] })
      const inserted = (response as { data?: { inserted?: number } }).data?.inserted ?? 0
      toast.success(`${inserted} membro${inserted !== 1 ? 's' : ''} importado${inserted !== 1 ? 's' : ''} com sucesso`)
      onOpenChange(false)
      handleClear()
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  const isLoading = mutation.isPending
  const memberCount = preview ? preview.rows.length : 0
  const previewHeaders = preview?.headers ?? []
  const previewRows = preview?.rows.slice(0, 5) ?? []
  const hasMore = (preview?.rows.length ?? 0) > 5

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClear()
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Elenco via CSV</DialogTitle>
          <DialogDescription>
            Selecione um arquivo .csv ou cole o conteudo abaixo. O CSV deve conter as colunas:
            nome, categoria, personagem, cpf, email, telefone, cache (valores opcionais).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          {/* Upload area */}
          <div className="flex flex-col gap-2">
            <Label>Arquivo CSV</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Upload className="size-4" />
                Selecionar Arquivo
              </Button>

              {fileName && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="size-3.5" />
                  <span>{fileName}</span>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remover arquivo"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Paste area */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="csv_paste">Ou cole o conteudo CSV</Label>
            <Textarea
              id="csv_paste"
              placeholder={'nome,categoria,personagem,cpf,email,telefone\nJoao Silva,ator_principal,Heroi,123.456.789-00,joao@email.com,(11) 99999-0000'}
              rows={4}
              value={csvContent}
              onChange={(e) => handlePasteChange(e.target.value)}
              disabled={isLoading}
              className="font-mono text-xs"
            />
          </div>

          {/* Preview table */}
          {preview && previewHeaders.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">
                  Preview{' '}
                  <span className="text-muted-foreground">
                    ({memberCount} {memberCount === 1 ? 'linha' : 'linhas'} detectada{memberCount === 1 ? '' : 's'})
                  </span>
                </p>
                {hasMore && (
                  <p className="text-xs text-muted-foreground">
                    Mostrando 5 de {memberCount}
                  </p>
                )}
              </div>

              <div className="rounded-md border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {previewHeaders.map((header) => (
                        <TableHead key={header} className="text-xs whitespace-nowrap py-2">
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, rowIdx) => (
                      <TableRow key={rowIdx}>
                        {row.map((cell, cellIdx) => (
                          <TableCell
                            key={cellIdx}
                            className="text-xs py-1.5 max-w-[180px] truncate"
                          >
                            {cell || (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Empty preview state */}
          {preview && previewHeaders.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-3">
              Nenhum dado valido detectado no CSV.
            </p>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              handleClear()
              onOpenChange(false)
            }}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isLoading || memberCount === 0}
            onClick={() => mutation.mutate()}
          >
            {isLoading && <Loader2 className="size-4 animate-spin" />}
            {memberCount > 0
              ? `Importar ${memberCount} membro${memberCount !== 1 ? 's' : ''}`
              : 'Importar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
