'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ExternalLink, Link2, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUpdatePosDriveUrl } from '@/hooks/usePosProducao'
import { ApiRequestError } from '@/lib/api'

interface PosDriveLinkProps {
  deliverableId: string
  jobId: string
  currentUrl: string | null
  jobDriveFolderUrl?: string | null
}

export function PosDriveLink({ deliverableId, jobId, currentUrl, jobDriveFolderUrl }: PosDriveLinkProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentUrl ?? '')
  const { mutateAsync: updateUrl, isPending } = useUpdatePosDriveUrl(jobId)

  async function handleSave() {
    try {
      await updateUrl({ deliverableId, driveUrl: value.trim() || null })
      toast.success('Link Drive atualizado')
      setEditing(false)
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao salvar link'
      toast.error(msg)
    }
  }

  function handleCancel() {
    setValue(currentUrl ?? '')
    setEditing(false)
  }

  function handleUseJobFolder() {
    if (jobDriveFolderUrl) setValue(jobDriveFolderUrl)
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://drive.google.com/..."
            className="h-8 text-xs flex-1"
            disabled={isPending}
          />
          <Button
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleSave}
            disabled={isPending}
            aria-label="Salvar link"
          >
            <Save className="size-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={handleCancel}
            disabled={isPending}
            aria-label="Cancelar"
          >
            <X className="size-3.5" />
          </Button>
        </div>
        {jobDriveFolderUrl && jobDriveFolderUrl !== value && (
          <button
            type="button"
            onClick={handleUseJobFolder}
            className="text-xs text-primary hover:underline"
          >
            Usar pasta do job
          </button>
        )}
      </div>
    )
  }

  if (currentUrl) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline truncate"
        >
          <ExternalLink className="size-3 shrink-0" />
          <span className="truncate">Drive</span>
        </a>
        <button
          type="button"
          onClick={() => {
            setValue(currentUrl)
            setEditing(true)
          }}
          className="text-xs text-muted-foreground hover:text-foreground shrink-0"
        >
          Editar
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
    >
      <Link2 className="size-3" />
      Adicionar link Drive
    </button>
  )
}
