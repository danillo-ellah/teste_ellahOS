'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, RotateCcw, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { apiMutate } from '@/lib/api'
import {
  applyMapping,
  validateRows,
  chunkArray,
  IMPORT_LIMITS,
  ENTITY_LABELS,
  type EntityType,
  type ParsedSheet,
  type FieldMapping,
} from '@/lib/import-utils'

interface StepImportingProps {
  sheet: ParsedSheet
  entityType: EntityType
  mappings: FieldMapping[]
  fileHash: string | null
  onReset: () => void
}

interface BatchResult {
  inserted: number
  skipped: number
  errors: Array<{ line: number; data?: unknown; error: string }>
  inserted_ids?: string[]
  skipped_names?: string[]
  skipped_titles?: string[]
}

type ImportStatus = 'running' | 'completed' | 'failed'

export function StepImporting({ sheet, entityType, mappings, fileHash, onReset }: StepImportingProps) {
  const [status, setStatus] = useState<ImportStatus>('running')
  const [totalInserted, setTotalInserted] = useState(0)
  const [totalSkipped, setTotalSkipped] = useState(0)
  const [totalErrors, setTotalErrors] = useState(0)
  const [allErrors, setAllErrors] = useState<Array<{ line: number; error: string }>>([])
  const [batchesDone, setBatchesDone] = useState(0)
  const [totalBatches, setTotalBatches] = useState(0)
  const [currentBatchMsg, setCurrentBatchMsg] = useState('')
  const [fatalError, setFatalError] = useState<string | null>(null)
  const startedRef = useRef(false)

  // Preparar dados transformados e validos
  const { validRows, validationErrors, totalRowCount } = useMemo(() => {
    const transformed = applyMapping(sheet.rows, mappings, entityType)
    const errors = validateRows(transformed, entityType)
    const errorLines = new Set(errors.map((e) => e.line))
    const valid = transformed.filter((_, i) => !errorLines.has(i + 1))
    return { validRows: valid, validationErrors: errors, totalRowCount: transformed.length }
  }, [sheet.rows, mappings, entityType])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const batches = chunkArray(validRows, IMPORT_LIMITS.BATCH_SIZE)
    setTotalBatches(batches.length)

    async function runImport() {
      let inserted = 0
      let skipped = 0
      let errors = 0
      const collectedErrors: Array<{ line: number; error: string }> = []
      let batchOffset = 0

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        setCurrentBatchMsg(`Enviando lote ${i + 1} de ${batches.length} (${batch.length} linhas)...`)

        try {
          const response = await apiMutate<BatchResult>(
            'data-import',
            'POST',
            {
              rows: batch,
              options: {
                skip_duplicates: true,
                file_name: sheet.fileName,
                file_hash: i === 0 ? (fileHash ?? undefined) : undefined,
                file_size_bytes: sheet.fileSize,
                file_format: sheet.fileFormat,
              },
            },
            entityType,
          )

          const result = response.data
          inserted += result.inserted
          skipped += result.skipped
          errors += result.errors.length

          for (const err of result.errors) {
            collectedErrors.push({
              line: err.line + batchOffset,
              error: err.error,
            })
          }
        } catch (err) {
          // Erro fatal no batch — continua com os proximos
          const errMsg = err instanceof Error ? err.message : 'Erro desconhecido'
          errors += batch.length
          for (let j = 0; j < batch.length; j++) {
            collectedErrors.push({
              line: batchOffset + j + 1,
              error: `Erro no lote: ${errMsg}`,
            })
          }

          // Se for 403 (forbidden), para tudo
          if (errMsg.includes('403') || errMsg.includes('permissao') || errMsg.includes('FORBIDDEN')) {
            setFatalError('Sem permissao para importar dados. Apenas admin, CEO e produtor executivo podem importar.')
            setStatus('failed')
            return
          }
        }

        batchOffset += batch.length
        setBatchesDone(i + 1)
        setTotalInserted(inserted)
        setTotalSkipped(skipped)
        setTotalErrors(errors)
        setAllErrors([...collectedErrors])
      }

      // Adicionar erros de validacao ao total
      const finalErrors = [
        ...collectedErrors,
        ...validationErrors.map((e) => ({ line: e.line, error: `${e.field}: ${e.message}` })),
      ]

      setAllErrors(finalErrors)
      setTotalErrors(errors + validationErrors.length)
      setStatus('completed')
      setCurrentBatchMsg('')
    }

    if (validRows.length === 0) {
      setStatus('completed')
      setCurrentBatchMsg('')
    } else {
      runImport()
    }
  }, [validRows, entityType, sheet, fileHash, validationErrors])

  const progress = totalBatches > 0 ? Math.round((batchesDone / totalBatches) * 100) : 0

  function handleExportErrors() {
    if (allErrors.length === 0) return
    const csvContent = [
      'Linha,Erro',
      ...allErrors.map((e) => `${e.line},"${e.error.replace(/"/g, '""')}"`),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `erros-importacao-${entityType}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {status === 'running' && (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Importando {ENTITY_LABELS[entityType]}...
              </>
            )}
            {status === 'completed' && (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Importacao concluida
              </>
            )}
            {status === 'failed' && (
              <>
                <XCircle className="h-5 w-5 text-destructive" />
                Importacao interrompida
              </>
            )}
          </CardTitle>
          {currentBatchMsg && (
            <CardDescription>{currentBatchMsg}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={status === 'completed' ? 100 : progress} className="h-2" />

          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total no arquivo</p>
              <p className="text-lg font-bold">{totalRowCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Inseridos</p>
              <p className="text-lg font-bold text-green-600">{totalInserted}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duplicados (pulados)</p>
              <p className="text-lg font-bold text-amber-600">{totalSkipped}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Erros</p>
              <p className={`text-lg font-bold ${totalErrors + validationErrors.length > 0 ? 'text-destructive' : ''}`}>
                {status === 'completed' ? totalErrors : totalErrors + validationErrors.length}
              </p>
            </div>
          </div>

          {fatalError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{fatalError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Erros detalhados */}
      {allErrors.length > 0 && status !== 'running' && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Detalhes dos erros ({allErrors.length})
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportErrors}>
                <FileDown className="mr-1.5 h-3.5 w-3.5" />
                Exportar CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {allErrors.slice(0, 50).map((err, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Linha {err.line}:</span>{' '}
                  {err.error}
                </p>
              ))}
              {allErrors.length > 50 && (
                <p className="text-xs text-muted-foreground pt-1">
                  ... e mais {allErrors.length - 50} erros. Exporte o CSV para ver todos.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado final */}
      {status !== 'running' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {totalSkipped > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalSkipped} duplicados ignorados
              </Badge>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onReset}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Nova importacao
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
