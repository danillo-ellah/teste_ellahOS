'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Upload, Users, Loader2, Trash2, Pencil, FileSignature } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { EmptyTabState } from '@/components/shared/EmptyTabState'
import { CastMemberDialog } from './CastMemberDialog'
import { ImportCastDialog } from './ImportCastDialog'
import { CastContractDialog } from './CastContractDialog'
import { apiGet, apiMutate, safeErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { JobDetail } from '@/types/jobs'
import type { CastMember, CastContractStatus, CastDataStatus } from '@/types/cast'

// --- Formatacao ---

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

// --- Badge configs ---

const DATA_STATUS_CONFIG: Record<
  CastDataStatus,
  { label: string; className: string }
> = {
  completo: {
    label: 'Completo',
    className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-transparent',
  },
  incompleto: {
    label: 'Incompleto',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-transparent',
  },
}

const CONTRACT_STATUS_CONFIG: Record<
  CastContractStatus,
  { label: string; className: string }
> = {
  pendente: {
    label: 'Pendente',
    className: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-transparent',
  },
  enviado: {
    label: 'Enviado',
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-transparent',
  },
  assinado: {
    label: 'Assinado',
    className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-transparent',
  },
  cancelado: {
    label: 'Cancelado',
    className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-transparent',
  },
}

// --- Category display labels ---

const CAST_CATEGORY_LABELS: Record<string, string> = {
  ator_principal: 'Ator Principal',
  ator_coadjuvante: 'Coadjuvante',
  figurante: 'Figurante',
  modelo: 'Modelo',
  crianca: 'Crianca',
  locutor: 'Locutor(a)',
  apresentador: 'Apresentador(a)',
  outro: 'Outro',
}

function categoryLabel(value: string): string {
  return CAST_CATEGORY_LABELS[value] ?? value
}

// --- Loading skeleton ---

function CastSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="rounded-md border border-border overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-3 border-b border-border last:border-0">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Props ---

interface TabCastProps {
  job: JobDetail
}

// --- Main component ---

export function TabCast({ job }: TabCastProps) {
  const queryClient = useQueryClient()

  const [memberDialogOpen, setMemberDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [contractDialogOpen, setContractDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<CastMember | undefined>()
  const [deletingMember, setDeletingMember] = useState<CastMember | null>(null)

  // Fetch cast members
  const {
    data: response,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['job-cast', job.id],
    queryFn: () => apiGet<CastMember[]>('job-cast', { job_id: job.id }),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (memberId: string) => apiMutate('job-cast', 'DELETE', undefined, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-cast', job.id] })
      toast.success('Membro removido')
      setDeletingMember(null)
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  // Handlers
  function handleOpenCreate() {
    setEditingMember(undefined)
    setMemberDialogOpen(true)
  }

  function handleOpenEdit(member: CastMember) {
    setEditingMember(member)
    setMemberDialogOpen(true)
  }

  function handleMemberDialogClose(open: boolean) {
    setMemberDialogOpen(open)
    if (!open) setEditingMember(undefined)
  }

  function handleDeleteConfirm() {
    if (!deletingMember) return
    deleteMutation.mutate(deletingMember.id)
  }

  // Derived data
  const members: CastMember[] = response?.data ?? []

  // --- Render states ---

  if (isLoading) {
    return <CastSkeleton />
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border py-12 flex flex-col items-center justify-center text-center gap-3">
        <p className="text-sm text-muted-foreground">Erro ao carregar o elenco.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <>
        <EmptyTabState
          icon={Users}
          title="Nenhum membro cadastrado"
          description="Adicione os atores, modelos e figurantes deste projeto."
          actionLabel="Novo Membro"
          onAction={handleOpenCreate}
        />

        <CastMemberDialog
          open={memberDialogOpen}
          onOpenChange={handleMemberDialogClose}
          jobId={job.id}
        />

        <ImportCastDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          jobId={job.id}
        />
      </>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Elenco</h3>
          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
            {members.length} {members.length === 1 ? 'membro' : 'membros'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportDialogOpen(true)}
          >
            <Upload className="size-4" />
            Importar CSV
          </Button>

          {members.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setContractDialogOpen(true)}
            >
              <FileSignature className="size-4" />
              Gerar Contratos
            </Button>
          )}

          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="size-4" />
            Novo Membro
          </Button>
        </div>
      </div>

      {/* Table — desktop */}
      <div className="hidden sm:block rounded-md border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Nome</TableHead>
              <TableHead className="text-xs">Categoria</TableHead>
              <TableHead className="text-xs">Telefone</TableHead>
              <TableHead className="text-xs text-right">Valor Total</TableHead>
              <TableHead className="text-xs text-center">Diarias</TableHead>
              <TableHead className="text-xs">Dados</TableHead>
              <TableHead className="text-xs">Contrato</TableHead>
              <TableHead className="text-xs w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const dataConfig = DATA_STATUS_CONFIG[member.data_status]
              const contractConfig = CONTRACT_STATUS_CONFIG[member.contract_status]

              return (
                <TableRow
                  key={member.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleOpenEdit(member)}
                >
                  <TableCell className="py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{member.name}</span>
                      {member.character_name && (
                        <span className="text-xs text-muted-foreground">
                          {member.character_name}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-xs">
                    {categoryLabel(member.cast_category)}
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground">
                    {member.phone ?? '—'}
                  </TableCell>

                  <TableCell className="text-xs text-right font-mono">
                    {member.total_fee > 0 ? BRL.format(member.total_fee) : '—'}
                  </TableCell>

                  <TableCell className="text-xs text-center">
                    {member.num_days}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', dataConfig.className)}
                    >
                      {dataConfig.label}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', contractConfig.className)}
                    >
                      {contractConfig.label}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Editar"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenEdit(member)
                        }}
                        className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Remover"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingMember(member)
                        }}
                        className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Cards — mobile */}
      <div className="flex flex-col gap-2 sm:hidden">
        {members.map((member) => {
          const dataConfig = DATA_STATUS_CONFIG[member.data_status]
          const contractConfig = CONTRACT_STATUS_CONFIG[member.contract_status]

          return (
            <div
              key={member.id}
              className="rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => handleOpenEdit(member)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium truncate">{member.name}</span>
                  {member.character_name && (
                    <span className="text-xs text-muted-foreground truncate">
                      {member.character_name}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {categoryLabel(member.cast_category)}
                    {member.phone ? ` · ${member.phone}` : ''}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    aria-label="Remover"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeletingMember(member)
                    }}
                    className="size-7 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn('text-[10px]', dataConfig.className)}
                >
                  {dataConfig.label}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('text-[10px]', contractConfig.className)}
                >
                  {contractConfig.label}
                </Badge>
                {member.total_fee > 0 && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {BRL.format(member.total_fee)}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {member.num_days} {member.num_days === 1 ? 'diaria' : 'diarias'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create / Edit Dialog */}
      <CastMemberDialog
        open={memberDialogOpen}
        onOpenChange={handleMemberDialogClose}
        jobId={job.id}
        member={editingMember}
      />

      {/* Import Dialog */}
      <ImportCastDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        jobId={job.id}
      />

      {/* Contract Dialog */}
      <CastContractDialog
        open={contractDialogOpen}
        onOpenChange={setContractDialogOpen}
        jobId={job.id}
        members={members}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={deletingMember !== null}
        onOpenChange={(open) => { if (!open) setDeletingMember(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro do elenco</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover{' '}
              <strong>{deletingMember?.name}</strong> do elenco?
              Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
