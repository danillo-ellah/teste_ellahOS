'use client'

import { useState, useMemo } from 'react'
import { ArrowLeft, ArrowRight, Zap, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  autoMapColumns,
  ENTITY_FIELDS,
  ENTITY_LABELS,
  type EntityType,
  type ParsedSheet,
  type FieldMapping,
} from '@/lib/import-utils'

interface StepMappingProps {
  sheet: ParsedSheet
  entityType: EntityType
  onComplete: (mappings: FieldMapping[]) => void
  onBack: () => void
}

const UNMAPPED = '__unmapped__'

export function StepMapping({ sheet, entityType, onComplete, onBack }: StepMappingProps) {
  const fields = ENTITY_FIELDS[entityType]
  const requiredKeys = useMemo(() => fields.filter((f) => f.required).map((f) => f.key), [fields])

  // Iniciar com auto-mapeamento
  const [mappings, setMappings] = useState<FieldMapping[]>(() =>
    autoMapColumns(sheet.headers, entityType),
  )

  // Verificar quais colunas do arquivo ja estao mapeadas
  const mappedSourceColumns = useMemo(
    () => new Set(mappings.map((m) => m.sourceColumn)),
    [mappings],
  )

  // Verificar quais campos do sistema ja estao mapeados
  const mappedTargetFields = useMemo(
    () => new Set(mappings.map((m) => m.targetField)),
    [mappings],
  )

  // Campos obrigatorios que faltam mapear
  const missingRequired = useMemo(
    () => requiredKeys.filter((k) => !mappedTargetFields.has(k)),
    [requiredKeys, mappedTargetFields],
  )

  function handleAutoMap() {
    setMappings(autoMapColumns(sheet.headers, entityType))
  }

  function handleClearAll() {
    setMappings([])
  }

  function handleChangeMapping(sourceColumn: string, targetField: string) {
    setMappings((prev) => {
      // Remover mapeamento existente para essa coluna
      const filtered = prev.filter((m) => m.sourceColumn !== sourceColumn)
      if (targetField === UNMAPPED) return filtered
      // Remover mapeamento anterior do target (evitar duplicata)
      const deduped = filtered.filter((m) => m.targetField !== targetField)
      return [...deduped, { sourceColumn, targetField }]
    })
  }

  function getTargetForSource(sourceColumn: string): string {
    return mappings.find((m) => m.sourceColumn === sourceColumn)?.targetField ?? UNMAPPED
  }

  // Preview de dados: primeiras 3 linhas de cada coluna
  function getSampleValues(header: string): string {
    const values = sheet.rows
      .slice(0, 3)
      .map((r) => r[header])
      .filter((v) => v && v.trim() !== '')
    return values.length > 0 ? values.join(' | ') : '(vazio)'
  }

  const canProceed = missingRequired.length === 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Mapeamento de colunas — {ENTITY_LABELS[entityType]}
              </CardTitle>
              <CardDescription className="mt-1">
                Associe cada coluna do arquivo a um campo do sistema.
                Colunas nao mapeadas serao ignoradas.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleAutoMap}>
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                Auto-mapear
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClearAll}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Limpar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-[1fr_40px_1fr_1fr] items-center gap-3 px-1 text-xs font-semibold text-muted-foreground">
              <span>Coluna do arquivo</span>
              <span />
              <span>Campo do sistema</span>
              <span>Amostra de dados</span>
            </div>

            {/* Mapping rows */}
            {sheet.headers.map((header) => {
              const currentTarget = getTargetForSource(header)
              const targetField = fields.find((f) => f.key === currentTarget)
              const isRequired = targetField?.required
              const isMapped = currentTarget !== UNMAPPED

              return (
                <div
                  key={header}
                  className={`grid grid-cols-[1fr_40px_1fr_1fr] items-center gap-3 rounded-md border px-3 py-2.5 transition-colors ${
                    isMapped ? 'border-primary/30 bg-primary/5' : 'border-border/60'
                  }`}
                >
                  {/* Source */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate text-sm font-medium">{header}</span>
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center">
                    <ArrowRight className={`h-4 w-4 ${isMapped ? 'text-primary' : 'text-muted-foreground/40'}`} />
                  </div>

                  {/* Target select */}
                  <Select
                    value={currentTarget}
                    onValueChange={(v) => handleChangeMapping(header, v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Nao mapear" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNMAPPED}>
                        <span className="text-muted-foreground">Nao mapear</span>
                      </SelectItem>
                      {fields.map((field) => {
                        const alreadyUsed = mappedTargetFields.has(field.key) && field.key !== currentTarget
                        return (
                          <SelectItem
                            key={field.key}
                            value={field.key}
                            disabled={alreadyUsed}
                          >
                            <span className="flex items-center gap-2">
                              {field.label}
                              {field.required && (
                                <span className="text-xs text-destructive">*</span>
                              )}
                              {alreadyUsed && (
                                <span className="text-xs text-muted-foreground">(em uso)</span>
                              )}
                            </span>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>

                  {/* Sample */}
                  <p className="truncate text-xs text-muted-foreground" title={getSampleValues(header)}>
                    {getSampleValues(header)}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Status */}
          <div className="mt-5 flex items-center gap-3 text-sm">
            <Badge variant="secondary">
              {mappings.length}/{sheet.headers.length} mapeadas
            </Badge>
            {missingRequired.length > 0 && (
              <span className="text-xs text-destructive">
                Campos obrigatorios faltando:{' '}
                {missingRequired.map((k) => fields.find((f) => f.key === k)?.label ?? k).join(', ')}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Voltar
        </Button>
        <Button onClick={() => onComplete(mappings)} disabled={!canProceed}>
          Continuar para preview
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
