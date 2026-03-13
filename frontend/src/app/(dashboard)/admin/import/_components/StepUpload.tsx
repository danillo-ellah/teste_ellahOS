'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react'
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
import {
  parseFile,
  computeFileHash,
  ENTITY_LABELS,
  IMPORT_LIMITS,
  type EntityType,
  type ParsedSheet,
} from '@/lib/import-utils'

interface StepUploadProps {
  onComplete: (sheet: ParsedSheet, entityType: EntityType, hash: string) => void
}

export function StepUpload({ onComplete }: StepUploadProps) {
  const [entityType, setEntityType] = useState<EntityType>('clients')
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    setError(null)
    setIsProcessing(true)

    try {
      const [sheet, hash] = await Promise.all([
        parseFile(file),
        computeFileHash(file),
      ])
      onComplete(sheet, entityType, hash)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar arquivo')
    } finally {
      setIsProcessing(false)
    }
  }, [entityType, onComplete])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    // Reset para permitir re-upload do mesmo arquivo
    e.target.value = ''
  }, [processFile])

  return (
    <div className="space-y-6">
      {/* Selecao de entidade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">O que voce quer importar?</CardTitle>
          <CardDescription>
            Escolha o tipo de dado que sera importado do arquivo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={entityType}
            onValueChange={(v) => setEntityType(v as EntityType)}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clients">Clientes</SelectItem>
              <SelectItem value="contacts">Contatos</SelectItem>
              <SelectItem value="jobs">Jobs</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-muted-foreground">
            {entityType === 'clients' && 'Importa empresas/produtoras para o cadastro de clientes.'}
            {entityType === 'contacts' && 'Importa contatos vinculados a clientes ja existentes no sistema.'}
            {entityType === 'jobs' && 'Importa projetos/jobs vinculados a clientes ja existentes no sistema.'}
          </p>
        </CardContent>
      </Card>

      {/* Drop zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload do arquivo</CardTitle>
          <CardDescription>
            Formatos aceitos: CSV e XLSX (Excel). Maximo {IMPORT_LIMITS.MAX_ROWS} linhas e{' '}
            {IMPORT_LIMITS.MAX_FILE_SIZE / 1024 / 1024} MB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-12 transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
            } ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
          >
            {isProcessing ? (
              <>
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">
                  Processando arquivo...
                </p>
              </>
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  {isDragging ? (
                    <FileSpreadsheet className="h-7 w-7 text-primary" />
                  ) : (
                    <Upload className="h-7 w-7 text-muted-foreground" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    Arraste um arquivo aqui ou clique para selecionar
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    .csv ou .xlsx
                  </p>
                </div>
              </>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileInput}
            className="hidden"
          />

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dicas */}
      <div className="rounded-lg border border-border/60 bg-muted/20 px-5 py-4">
        <p className="text-sm font-medium">Dicas para um bom resultado:</p>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          <li>
            A primeira linha do arquivo deve conter os nomes das colunas (cabecalho).
          </li>
          <li>
            Para importar <strong>{ENTITY_LABELS[entityType]}</strong>, o campo obrigatorio e:{' '}
            {entityType === 'clients' && <strong>Nome</strong>}
            {entityType === 'contacts' && <strong>Nome + Cliente</strong>}
            {entityType === 'jobs' && <strong>Titulo + Cliente + Tipo</strong>}
          </li>
          {entityType !== 'clients' && (
            <li>
              Os clientes referenciados ja devem estar cadastrados no sistema.
              Importe clientes primeiro, se necessario.
            </li>
          )}
          <li>
            Registros duplicados serao automaticamente ignorados (nao sobrescrevem dados existentes).
          </li>
        </ul>
      </div>
    </div>
  )
}
