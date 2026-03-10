'use client'

import { useMemo } from 'react'
import { ArrowLeft, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  applyMapping,
  validateRows,
  ENTITY_FIELDS,
  ENTITY_LABELS,
  type EntityType,
  type ParsedSheet,
  type FieldMapping,
} from '@/lib/import-utils'

interface StepPreviewProps {
  sheet: ParsedSheet
  entityType: EntityType
  mappings: FieldMapping[]
  onConfirm: () => void
  onBack: () => void
}

export function StepPreview({ sheet, entityType, mappings, onConfirm, onBack }: StepPreviewProps) {
  const fields = ENTITY_FIELDS[entityType]
  const mappedFields = useMemo(
    () => mappings.map((m) => fields.find((f) => f.key === m.targetField)).filter(Boolean),
    [mappings, fields],
  )

  const transformedRows = useMemo(
    () => applyMapping(sheet.rows, mappings, entityType),
    [sheet.rows, mappings, entityType],
  )

  const validationErrors = useMemo(
    () => validateRows(transformedRows, entityType),
    [transformedRows, entityType],
  )

  const errorLines = useMemo(
    () => new Set(validationErrors.map((e) => e.line)),
    [validationErrors],
  )

  const validCount = transformedRows.length - errorLines.size
  const errorCount = errorLines.size

  // Mostrar primeiras 20 linhas no preview
  const previewRows = transformedRows.slice(0, 20)
  const hasMore = transformedRows.length > 20

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold">{transformedRows.length}</p>
            <p className="text-xs text-muted-foreground">linhas no arquivo</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-green-600">{validCount}</p>
            <p className="text-xs text-muted-foreground">linhas validas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className={`text-2xl font-bold ${errorCount > 0 ? 'text-destructive' : ''}`}>
              {errorCount}
            </p>
            <p className="text-xs text-muted-foreground">linhas com erro</p>
          </CardContent>
        </Card>
      </div>

      {/* Erros */}
      {validationErrors.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Erros de validacao ({validationErrors.length})
            </CardTitle>
            <CardDescription>
              Linhas com erro serao ignoradas durante a importacao.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {validationErrors.slice(0, 20).map((err, i) => (
                <p key={i} className="text-xs text-destructive">
                  Linha {err.line}: {err.message} ({err.field})
                </p>
              ))}
              {validationErrors.length > 20 && (
                <p className="text-xs text-muted-foreground">
                  ... e mais {validationErrors.length - 20} erros
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Preview — {ENTITY_LABELS[entityType]}
          </CardTitle>
          <CardDescription>
            Primeiras {Math.min(20, transformedRows.length)} linhas apos mapeamento e transformacao.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-12">
                    #
                  </th>
                  {mappedFields.map((field) => (
                    <th
                      key={field!.key}
                      className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground"
                    >
                      {field!.label}
                      {field!.required && <span className="text-destructive ml-0.5">*</span>}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-16">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, idx) => {
                  const lineNum = idx + 1
                  const hasError = errorLines.has(lineNum)
                  const lineErrors = validationErrors.filter((e) => e.line === lineNum)

                  return (
                    <tr
                      key={idx}
                      className={`border-b transition-colors ${
                        hasError ? 'bg-destructive/5' : 'hover:bg-muted/20'
                      }`}
                    >
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {lineNum}
                      </td>
                      {mappedFields.map((field) => {
                        const value = row[field!.key]
                        const fieldHasError = lineErrors.some((e) => e.field === field!.key)
                        return (
                          <td
                            key={field!.key}
                            className={`max-w-48 truncate px-3 py-2 text-xs ${
                              fieldHasError ? 'text-destructive font-medium' : ''
                            }`}
                            title={String(value ?? '')}
                          >
                            {value === null || value === undefined || value === ''
                              ? <span className="text-muted-foreground/40">-</span>
                              : String(value)}
                          </td>
                        )
                      })}
                      <td className="px-3 py-2">
                        {hasError ? (
                          <Badge variant="destructive" className="text-[10px]">Erro</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">OK</Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <p className="px-3 py-2 text-xs text-muted-foreground text-center border-t">
              Mostrando 20 de {transformedRows.length} linhas
            </p>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Voltar
        </Button>
        <div className="flex items-center gap-3">
          {validCount > 0 && (
            <p className="text-sm text-muted-foreground">
              <CheckCircle2 className="mr-1 inline h-4 w-4 text-green-600" />
              {validCount} {ENTITY_LABELS[entityType].toLowerCase()} serao importados
            </p>
          )}
          <Button onClick={onConfirm} disabled={validCount === 0}>
            <Upload className="mr-1.5 h-4 w-4" />
            Importar {validCount} registros
          </Button>
        </div>
      </div>
    </div>
  )
}
