'use client'

import { useState, useCallback } from 'react'
import { StepUpload } from './StepUpload'
import { StepMapping } from './StepMapping'
import { StepPreview } from './StepPreview'
import { StepImporting } from './StepImporting'
import type { EntityType, ParsedSheet, FieldMapping } from '@/lib/import-utils'

export type WizardStep = 'upload' | 'mapping' | 'preview' | 'importing'

const STEP_LABELS: Record<WizardStep, string> = {
  upload: 'Upload',
  mapping: 'Mapeamento',
  preview: 'Preview',
  importing: 'Importacao',
}

const STEPS: WizardStep[] = ['upload', 'mapping', 'preview', 'importing']

export function ImportWizard() {
  const [step, setStep] = useState<WizardStep>('upload')
  const [entityType, setEntityType] = useState<EntityType>('clients')
  const [parsedSheet, setParsedSheet] = useState<ParsedSheet | null>(null)
  const [mappings, setMappings] = useState<FieldMapping[]>([])
  const [fileHash, setFileHash] = useState<string | null>(null)

  const handleUploadComplete = useCallback((
    sheet: ParsedSheet,
    entity: EntityType,
    hash: string,
  ) => {
    setParsedSheet(sheet)
    setEntityType(entity)
    setFileHash(hash)
    setStep('mapping')
  }, [])

  const handleMappingComplete = useCallback((m: FieldMapping[]) => {
    setMappings(m)
    setStep('preview')
  }, [])

  const handleStartImport = useCallback(() => {
    setStep('importing')
  }, [])

  const handleReset = useCallback(() => {
    setStep('upload')
    setParsedSheet(null)
    setMappings([])
    setFileHash(null)
  }, [])

  const currentIndex = STEPS.indexOf(step)

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <nav aria-label="Progresso" className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const isActive = i === currentIndex
          const isCompleted = i < currentIndex
          return (
            <div key={s} className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isCompleted
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? '\u2713' : i + 1}
                </div>
                <span
                  className={`text-sm ${
                    isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {STEP_LABELS[s]}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px w-8 ${
                    isCompleted ? 'bg-primary/40' : 'bg-border'
                  }`}
                />
              )}
            </div>
          )
        })}
      </nav>

      {/* Step content */}
      {step === 'upload' && (
        <StepUpload onComplete={handleUploadComplete} />
      )}

      {step === 'mapping' && parsedSheet && (
        <StepMapping
          sheet={parsedSheet}
          entityType={entityType}
          onComplete={handleMappingComplete}
          onBack={() => setStep('upload')}
        />
      )}

      {step === 'preview' && parsedSheet && (
        <StepPreview
          sheet={parsedSheet}
          entityType={entityType}
          mappings={mappings}
          onConfirm={handleStartImport}
          onBack={() => setStep('mapping')}
        />
      )}

      {step === 'importing' && parsedSheet && (
        <StepImporting
          sheet={parsedSheet}
          entityType={entityType}
          mappings={mappings}
          fileHash={fileHash}
          onReset={handleReset}
        />
      )}
    </div>
  )
}
