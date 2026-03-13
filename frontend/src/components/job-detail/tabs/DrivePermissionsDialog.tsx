'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldX,
  Users,
  XCircle,
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
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  useDrivePermissions,
  useGrantMemberPermissions,
  useRevokeMemberPermissions,
  useSyncPermissions,
} from '@/hooks/useDrivePermissions'
import { useUserRole } from '@/hooks/useUserRole'
import { ApiRequestError } from '@/lib/api'
import { FOLDER_LABELS } from './DriveSection'
import type { DrivePermissionMember, DrivePermissionDetail } from '@/types/drive'

// Roles que podem gerenciar permissoes do Drive
const MANAGE_ROLES = ['admin', 'ceo', 'produtor_executivo']

interface DrivePermissionsDialogProps {
  jobId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

// --- Permission status badge per folder ---

function PermissionBadge({ perm }: { perm: DrivePermissionDetail }) {
  if (perm.revoked_at) {
    return (
      <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-muted">
        Revogado
      </Badge>
    )
  }
  if (perm.error_message) {
    return (
      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
        <AlertTriangle className="size-3 mr-1" />
        Erro
      </Badge>
    )
  }
  if (perm.drive_permission_id) {
    return (
      <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
        <CheckCircle2 className="size-3 mr-1" />
        {perm.drive_role === 'writer' ? 'Editor' : 'Leitor'}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
      Pendente
    </Badge>
  )
}

// --- Member row with expandable folder details ---

function MemberRow({
  member,
  canManage,
  actioningId,
  onGrant,
  onRevokeConfirm,
}: {
  member: DrivePermissionMember
  canManage: boolean
  actioningId: string | null
  onGrant: (jobTeamId: string, email: string) => void
  onRevokeConfirm: (member: DrivePermissionMember) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isActioning = actioningId === member.job_team_id

  const activePerms = member.permissions.filter((p) => !p.revoked_at)
  const errorPerms = member.permissions.filter((p) => p.error_message && !p.revoked_at)
  const hasAccess = activePerms.length > 0

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="rounded-md hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3 p-2">
          {/* Status icon */}
          <div className="flex size-8 items-center justify-center rounded-full bg-muted shrink-0">
            {hasAccess ? (
              errorPerms.length > 0 ? (
                <AlertTriangle className="size-4 text-amber-500" />
              ) : (
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
              )
            ) : (
              <ShieldX className="size-4 text-muted-foreground" />
            )}
          </div>

          {/* Name + role */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{member.person_name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {member.role}
              {member.email && ` — ${member.email}`}
            </p>
          </div>

          {/* Folder count + expand */}
          {member.permissions.length > 0 && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground h-7 px-2">
                <FolderOpen className="size-3" />
                {activePerms.length}
                {expanded ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )}
              </Button>
            </CollapsibleTrigger>
          )}

          {/* Action button */}
          {canManage && (
            <>
              {hasAccess ? (
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shrink-0 cursor-pointer hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/20 transition-colors"
                  onClick={() => !isActioning && onRevokeConfirm(member)}
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
                  className="shrink-0 gap-1 h-7"
                  disabled={isActioning}
                  onClick={() => onGrant(member.job_team_id, member.email)}
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
            </>
          )}
        </div>

        {/* Expanded: per-folder permissions */}
        <CollapsibleContent>
          <div className="ml-11 mr-2 mb-2 space-y-1">
            {member.permissions.map((perm) => (
              <div
                key={perm.id}
                className="flex items-center justify-between gap-2 text-xs py-1 px-2 rounded bg-muted/30"
              >
                <span className="truncate text-muted-foreground">
                  {FOLDER_LABELS[perm.folder_key] ?? perm.folder_key}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <PermissionBadge perm={perm} />
                  {perm.error_message && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 max-w-[150px] truncate" title={perm.error_message}>
                      {perm.error_message}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}

// --- Main dialog ---

export function DrivePermissionsDialog({
  jobId,
  open,
  onOpenChange,
}: DrivePermissionsDialogProps) {
  const [activeOnly, setActiveOnly] = useState(true)
  const { members, meta, isLoading, refetch: _refetch } = useDrivePermissions(jobId, activeOnly, open)
  const grantMutation = useGrantMemberPermissions()
  const revokeMutation = useRevokeMemberPermissions()
  const syncMutation = useSyncPermissions()
  const { role } = useUserRole()

  const canManage = role !== null && MANAGE_ROLES.includes(role)

  const [actioningId, setActioningId] = useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<DrivePermissionMember | null>(null)

  async function handleGrant(jobTeamId: string, email: string) {
    setActioningId(jobTeamId)
    try {
      await grantMutation.mutateAsync({ jobId, jobTeamId, email })
      toast.success('Permissao concedida')
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Erro ao conceder permissao')
    } finally {
      setActioningId(null)
    }
  }

  async function handleRevoke(member: DrivePermissionMember) {
    setActioningId(member.job_team_id)
    try {
      await revokeMutation.mutateAsync({ jobId, jobTeamId: member.job_team_id })
      toast.success(`Permissoes de ${member.person_name} revogadas`)
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Erro ao revogar permissao')
    } finally {
      setActioningId(null)
      setRevokeTarget(null)
    }
  }

  async function handleSync() {
    try {
      const result = await syncMutation.mutateAsync(jobId)
      const data = result as { granted?: number; revoked?: number } | undefined
      if (data?.granted !== undefined || data?.revoked !== undefined) {
        toast.success(`Sincronizado: ${data.granted ?? 0} concedidas, ${data.revoked ?? 0} revogadas`)
      } else {
        toast.success('Permissoes sincronizadas')
      }
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : 'Erro ao sincronizar')
    }
  }

  return (
    <>
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
              {meta.total_members} membro(s) — {meta.total_active_permissions} permissao(oes) ativas
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Switch
                  id="show-history"
                  checked={!activeOnly}
                  onCheckedChange={(checked) => setActiveOnly(!checked)}
                  className="scale-75"
                />
                <Label htmlFor="show-history" className="text-xs text-muted-foreground cursor-pointer">
                  Historico
                </Label>
              </div>
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-7"
                  onClick={handleSync}
                  disabled={syncMutation.isPending}
                >
                  <RefreshCw className={`size-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                  Sincronizar
                </Button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-1">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-7 w-20" />
                </div>
              ))
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <XCircle className="size-8 mb-2 opacity-50" />
                <p className="text-sm">Nenhum membro na equipe deste job.</p>
              </div>
            ) : (
              members.map((member) => (
                <MemberRow
                  key={member.job_team_id}
                  member={member}
                  canManage={canManage}
                  actioningId={actioningId}
                  onGrant={handleGrant}
                  onRevokeConfirm={setRevokeTarget}
                />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog for revoke */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(o) => !o && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar permissoes?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as permissoes de <strong>{revokeTarget?.person_name}</strong> nas pastas do Drive deste job serao removidas. Esta acao pode ser revertida concedendo novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => revokeTarget && handleRevoke(revokeTarget)}
            >
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
