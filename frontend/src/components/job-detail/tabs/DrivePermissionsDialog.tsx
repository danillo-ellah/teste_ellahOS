'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldX,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useDrivePermissions,
  useGrantMemberPermissions,
  useRevokeMemberPermissions,
  useSyncPermissions,
} from '@/hooks/useDrivePermissions'
import { ApiRequestError } from '@/lib/api'

interface DrivePermissionsDialogProps {
  jobId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DrivePermissionsDialog({
  jobId,
  open,
  onOpenChange,
}: DrivePermissionsDialogProps) {
  const { data: members, meta, isLoading, refetch } = useDrivePermissions(jobId, open)
  const grantMutation = useGrantMemberPermissions()
  const revokeMutation = useRevokeMemberPermissions()
  const syncMutation = useSyncPermissions()

  const [actioningId, setActioningId] = useState<string | null>(null)

  async function handleGrant(personId: string, email: string) {
    setActioningId(personId)
    try {
      await grantMutation.mutateAsync({ jobId, personId, email })
      toast.success('Permissao concedida')
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Erro ao conceder permissao')
    } finally {
      setActioningId(null)
    }
  }

  async function handleRevoke(personId: string) {
    setActioningId(personId)
    try {
      await revokeMutation.mutateAsync({ jobId, personId })
      toast.success('Permissao revogada')
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Erro ao revogar permissao')
    } finally {
      setActioningId(null)
    }
  }

  async function handleSync() {
    try {
      await syncMutation.mutateAsync(jobId)
      toast.success('Permissoes sincronizadas')
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Erro ao sincronizar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-4" />
            Permissoes do Drive
          </DialogTitle>
          <DialogDescription>
            Gerencie o acesso dos membros da equipe as pastas deste job no Google Drive.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {meta.total} membro(s)
            {meta.synced_at && ` — sync: ${new Date(meta.synced_at).toLocaleDateString('pt-BR')}`}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleSync}
            disabled={syncMutation.isPending}
          >
            <RefreshCw className={`size-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
        </div>

        <div className="max-h-80 overflow-y-auto space-y-1">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum membro na equipe deste job.
            </p>
          ) : (
            members.map((member) => {
              const isActioning = actioningId === member.person_id
              return (
                <div
                  key={member.person_id}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/50"
                >
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                    {member.has_access ? (
                      <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ShieldX className="size-4 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.person_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {member.role}
                      {member.email && ` — ${member.email}`}
                    </p>
                  </div>

                  {member.has_access ? (
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shrink-0 cursor-pointer hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/20 transition-colors"
                      onClick={() => !isActioning && handleRevoke(member.person_id)}
                    >
                      {isActioning ? (
                        <RefreshCw className="size-3 animate-spin mr-1" />
                      ) : (
                        <Shield className="size-3 mr-1" />
                      )}
                      Revogar
                    </Badge>
                  ) : member.email ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1"
                      disabled={isActioning}
                      onClick={() => handleGrant(member.person_id, member.email)}
                    >
                      {isActioning ? (
                        <RefreshCw className="size-3 animate-spin" />
                      ) : (
                        <ShieldCheck className="size-3" />
                      )}
                      Conceder
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground shrink-0">
                      Sem email
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
