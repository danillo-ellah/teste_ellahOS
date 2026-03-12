'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Copy } from 'lucide-react'
import { useReferenceJobs, useImportFromJob } from '@/hooks/useCostItems'
import { cn } from '@/lib/utils'

interface ReferenceJob {
  id: string
  code: string
  title: string
  cost_items_count: number
  total_estimated: number
}

interface ReferenceJobsResponse {
  reference_jobs: ReferenceJob[]
}

interface ImportFromJobDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  onSuccess: () => void
}

export function ImportFromJobDialog({
  open,
  onOpenChange,
  jobId,
  onSuccess,
}: ImportFromJobDialogProps) {
  const [search, setSearch] = useState('')
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const referenceJobsQuery = useReferenceJobs(jobId)
  const importFromJob = useImportFromJob()

  const responseData = referenceJobsQuery.data?.data as ReferenceJobsResponse | undefined
  const allJobs = responseData?.reference_jobs ?? []

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allJobs
    return allJobs.filter(
      (job) =>
        job.title.toLowerCase().includes(q) || job.code.toLowerCase().includes(q),
    )
  }, [allJobs, search])

  const selectedJob = allJobs.find((job) => job.id === selectedJobId) ?? null

  async function handleImport() {
    if (!selectedJobId || !selectedJob) return
    setIsImporting(true)
    try {
      const result = await importFromJob.mutateAsync({ jobId, source_job_id: selectedJobId })
      const data = (result as { data?: { created?: number; source_job?: { title?: string } } }).data
      const count = data?.created ?? 0
      const sourceTitle = data?.source_job?.title ?? selectedJob.title
      toast.success(`Estrutura importada: ${count} itens de '${sourceTitle}'`)
      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao importar estrutura'
      if (
        message.includes('409') ||
        message.includes('CONFLICT') ||
        message.includes('ja possui')
      ) {
        toast.error('Job ja possui itens de custo. Import so pode ser feito em job vazio.')
      } else {
        toast.error(message)
      }
    } finally {
      setIsImporting(false)
    }
  }

  function handleOpenChange(value: boolean) {
    if (!value) {
      setSearch('')
      setSelectedJobId(null)
    }
    onOpenChange(value)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="size-5" />
            Importar Estrutura de Outro Job
          </DialogTitle>
          <DialogDescription>
            Copie categorias e descricoes de um job existente. Valores, fornecedores e status
            nao serao copiados.
          </DialogDescription>
        </DialogHeader>

        <Input
          placeholder="Buscar job por titulo ou codigo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={referenceJobsQuery.isLoading}
        />

        {referenceJobsQuery.isLoading && (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 mr-2 animate-spin" />
            Carregando jobs...
          </div>
        )}

        {!referenceJobsQuery.isLoading && filteredJobs.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {search.trim()
              ? 'Nenhum job encontrado para essa busca.'
              : 'Nenhum job com itens de custo disponivel para importar.'}
          </p>
        )}

        {!referenceJobsQuery.isLoading && filteredJobs.length > 0 && (
          <ScrollArea className="max-h-[280px] pr-1">
            <div className="space-y-1">
              {filteredJobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => setSelectedJobId(job.id)}
                  className={cn(
                    'w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors',
                    'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selectedJobId === job.id
                      ? 'bg-primary/10 ring-1 ring-primary/30'
                      : 'bg-transparent',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-xs text-muted-foreground">
                        {job.code}
                      </span>
                      <p className="font-medium truncate">{job.title}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {job.cost_items_count}{' '}
                      {job.cost_items_count === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {selectedJob && (
          <p className="text-xs text-muted-foreground">
            Selecionado:{' '}
            <span className="font-medium text-foreground">{selectedJob.title}</span>
            {' — '}
            {selectedJob.cost_items_count}{' '}
            {selectedJob.cost_items_count === 1 ? 'item' : 'itens'}
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isImporting}
          >
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={!selectedJobId || isImporting}>
            {isImporting ? (
              <>
                <Loader2 className="size-4 mr-1.5 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Copy className="size-4 mr-1.5" />
                Importar Estrutura
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
