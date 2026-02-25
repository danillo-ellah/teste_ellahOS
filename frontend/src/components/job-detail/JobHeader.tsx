'use client'

import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Archive,
  ChevronRight,
  ExternalLink,
  MoreHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { JobCodeBadge } from '@/components/jobs/JobCodeBadge'
import { PriorityBadge } from '@/components/jobs/PriorityBadge'
import { ConfirmDialog } from '@/components/jobs/ConfirmDialog'
import { StatusChangeDropdown } from '@/components/job-detail/StatusChangeDropdown'
import { IntegrationBadges } from '@/components/job-detail/IntegrationBadges'
import { SyncIndicator } from '@/components/job-detail/SyncIndicator'
import type { SyncState } from '@/components/job-detail/SyncIndicator'
import { useUpdateJob } from '@/hooks/useUpdateJob'
import { useArchiveJob } from '@/hooks/useArchiveJob'
import { useUserRole } from '@/hooks/useUserRole'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { JobDetail } from '@/types/jobs'

// Dynamic import para evitar SSR do componente que usa supabase.auth no cliente
const ApprovalPdfButton = dynamic(
  () =>
    import('@/app/(dashboard)/jobs/[id]/_components/approval-pdf-button').then(
      (m) => m.ApprovalPdfButton,
    ),
  { ssr: false },
)

interface JobHeaderProps {
  job: JobDetail
}

export function JobHeader({ job }: JobHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(job.title)
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [archiveOpen, setArchiveOpen] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const { mutateAsync: updateJob } = useUpdateJob()
  const { mutateAsync: archiveJob, isPending: isArchiving } = useArchiveJob()
  const { role: userRole } = useUserRole()

  // Sync titulo se mudar externamente
  useEffect(() => {
    if (!isEditing) {
      setEditValue(job.title)
    }
  }, [job.title, isEditing])

  // Focus no input quando entra em modo de edicao
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  async function saveTitle() {
    const trimmed = editValue.trim()
    if (!trimmed || trimmed === job.title) {
      setEditValue(job.title)
      setIsEditing(false)
      return
    }

    setIsEditing(false)
    setSyncState('saving')

    try {
      await updateJob({ jobId: job.id, payload: { title: trimmed } })
      setSyncState('saved')
      setTimeout(() => setSyncState('idle'), 2000)
    } catch {
      setSyncState('error')
      setEditValue(job.title)
      toast.error('Erro ao salvar titulo. Tente novamente.')
      setTimeout(() => setSyncState('idle'), 3000)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveTitle()
    } else if (e.key === 'Escape') {
      setEditValue(job.title)
      setIsEditing(false)
    }
  }

  async function handleArchiveConfirm() {
    try {
      await archiveJob({ jobId: job.id })
      toast.success('Job arquivado')
      setArchiveOpen(false)
      router.push('/jobs')
    } catch {
      toast.error('Erro ao arquivar job. Tente novamente.')
    }
  }

  return (
    <>
      <div className="sticky top-14 z-20 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-sm border-b border-border">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
          <Link
            href="/jobs"
            className="hover:text-foreground transition-colors"
          >
            Jobs
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground font-medium truncate max-w-[200px]" title={job.job_code}>
            {job.job_code}
          </span>
        </nav>

        {/* Linha principal: titulo + acoes */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Titulo + badges */}
            <div className="flex items-center gap-3 flex-wrap">
              <JobCodeBadge code={job.job_code} />

              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    'text-xl font-semibold tracking-tight bg-transparent border-b-2 border-primary',
                    'outline-none px-0 py-0 min-w-[200px] max-w-full',
                  )}
                  maxLength={200}
                />
              ) : (
                <h1
                  tabIndex={0}
                  role="button"
                  aria-label={`Editar titulo: ${job.title}`}
                  className="text-xl font-semibold tracking-tight cursor-text hover:text-foreground/80 transition-colors truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  onClick={() => setIsEditing(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setIsEditing(true)
                    }
                  }}
                  title="Clique para editar"
                >
                  {job.title}
                </h1>
              )}

              <StatusChangeDropdown
                jobId={job.id}
                currentStatus={job.status}
              />
              <PriorityBadge priority={job.priority} />
              <SyncIndicator state={syncState} />
            </div>

            {/* Metadata row */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              {job.clients?.name && (
                <span>
                  Cliente: <span className="text-foreground">{job.clients.name}</span>
                </span>
              )}
              {job.agencies?.name && (
                <span>
                  Agencia: <span className="text-foreground">{job.agencies.name}</span>
                </span>
              )}
              {job.expected_delivery_date && (
                <span>
                  Entrega: <span className="text-foreground">{formatDate(job.expected_delivery_date)}</span>
                </span>
              )}
              <IntegrationBadges jobId={job.id} driveFolderUrl={job.drive_folder_url} />
            </div>
          </div>

          {/* Menu de acoes */}
          <div className="flex items-center gap-2 shrink-0">
            {job.drive_folder_url && (
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a
                  href={job.drive_folder_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-4" />
                  Drive
                </a>
              </Button>
            )}

            {userRole && (
              <ApprovalPdfButton
                jobId={job.id}
                jobCode={job.job_code}
                userRole={userRole}
              />
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  aria-label="Mais acoes"
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() =>
                    navigator.clipboard.writeText(window.location.href)
                      .then(() => toast.success('Link copiado'))
                      .catch(() => toast.error('Nao foi possivel copiar o link'))
                  }
                >
                  Copiar link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setArchiveOpen(true)}
                >
                  <Archive className="size-4" />
                  Arquivar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Arquivar job"
        description="Este job sera movido para o arquivo e nao aparecera na listagem principal. Voce pode restaura-lo a qualquer momento."
        confirmLabel="Arquivar"
        cancelLabel="Cancelar"
        variant="destructive"
        isPending={isArchiving}
        onConfirm={handleArchiveConfirm}
      />
    </>
  )
}
