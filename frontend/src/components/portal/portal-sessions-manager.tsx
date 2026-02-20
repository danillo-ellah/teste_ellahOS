'use client'

import { useState } from 'react'
import {
  Globe,
  Plus,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  MessageSquare,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
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
import { cn } from '@/lib/utils'
import { usePortalSessions, useUpdateSession, useDeleteSession } from '@/hooks/use-portal'
import { CreateSessionDialog } from '@/components/portal/create-session-dialog'
import { SessionMessages } from '@/components/portal/session-messages'
import type { PortalSession } from '@/types/portal'

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    const parsed = parseISO(dateStr)
    if (!isValid(parsed)) return '-'
    return format(parsed, 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return '-'
  }
}

// --- Card de sessao individual ---
function SessionCard({ session }: { session: PortalSession }) {
  const [showMessages, setShowMessages] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { mutateAsync: updateSession, isPending: isUpdating } = useUpdateSession()
  const { mutateAsync: deleteSession, isPending: isDeleting } = useDeleteSession()

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(session.portal_url)
      setCopied(true)
      toast.success('Link copiado!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Nao foi possivel copiar o link')
    }
  }

  async function handleToggleActive() {
    try {
      await updateSession({
        id: session.id,
        payload: { is_active: !session.is_active },
      })
      toast.success(session.is_active ? 'Link desativado' : 'Link ativado')
    } catch {
      toast.error('Erro ao atualizar o status do link')
    }
  }

  async function handleDelete() {
    try {
      await deleteSession(session.id)
      toast.success('Link removido com sucesso')
    } catch {
      toast.error('Erro ao remover o link')
    }
    setShowDeleteDialog(false)
  }

  // Permissoes formatadas
  const perms = session.permissions
  const permLabels = [
    perms.timeline && 'Timeline',
    perms.documents && 'Documentos',
    perms.approvals && 'Aprovacoes',
    perms.messages && 'Mensagens',
  ].filter(Boolean)

  return (
    <>
      <div
        className={cn(
          'rounded-xl border border-border bg-card p-4 space-y-3',
          !session.is_active && 'opacity-60',
        )}
      >
        {/* Header do card */}
        <div className="flex items-start gap-3">
          <Globe
            className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold truncate">{session.label}</p>
              <Badge
                variant={session.is_active ? 'default' : 'secondary'}
                className={cn(
                  'text-xs shrink-0',
                  session.is_active
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20'
                    : '',
                )}
              >
                {session.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>

            {/* Permissoes */}
            {permLabels.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {permLabels.join(' · ')}
              </p>
            )}

            {/* Datas */}
            <p className="text-xs text-muted-foreground mt-1">
              Criado em {formatDate(session.created_at)}
              {session.expires_at && (
                <span className="ml-2">· Expira em {formatDate(session.expires_at)}</span>
              )}
            </p>

            {/* Contato associado */}
            {session.contacts && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Contato: {session.contacts.name}
                {session.contacts.email && ` (${session.contacts.email})`}
              </p>
            )}
          </div>

          {/* Toggle ativo/inativo */}
          <Switch
            checked={session.is_active}
            onCheckedChange={handleToggleActive}
            disabled={isUpdating || isDeleting}
            aria-label={`${session.is_active ? 'Desativar' : 'Ativar'} link: ${session.label}`}
          />
        </div>

        {/* Link do portal */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs font-mono text-muted-foreground flex-1 truncate">
            {session.portal_url}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopyLink}
              aria-label="Copiar link do portal"
              title="Copiar link"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              asChild
            >
              <a
                href={session.portal_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Abrir portal em nova aba"
                title="Abrir portal"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>

        {/* Acoes */}
        <div className="flex items-center gap-2">
          {/* Mensagens */}
          {perms.messages && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={() => setShowMessages((v) => !v)}
            >
              <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
              Mensagens
              {showMessages ? (
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
              )}
            </Button>
          )}

          {/* Deletar */}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto gap-1.5 text-xs h-8 text-destructive hover:bg-destructive/10"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isDeleting}
            aria-label={`Remover link: ${session.label}`}
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Remover
          </Button>
        </div>

        {/* Painel de mensagens (colapsavel) */}
        {showMessages && (
          <div className="pt-1">
            <SessionMessages sessionId={session.id} />
          </div>
        )}
      </div>

      {/* Dialogo de confirmacao de exclusao */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover link do portal?</AlertDialogTitle>
            <AlertDialogDescription>
              O link <strong>{session.label}</strong> sera permanentemente
              removido. O cliente nao conseguira mais acessar o portal por
              este link. Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// --- Componente principal ---

interface PortalSessionsManagerProps {
  jobId: string
}

export function PortalSessionsManager({ jobId }: PortalSessionsManagerProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const { data: sessions, isLoading, isError, refetch } = usePortalSessions(jobId)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-base font-semibold">Portal do Cliente</h3>
          {!isLoading && sessions && sessions.length > 0 && (
            <span className="text-sm text-muted-foreground">({sessions.length})</span>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreateDialog(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Criar link
        </Button>
      </div>

      {/* Conteudo */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Erro ao carregar links do portal.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : !sessions || sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Globe className="h-10 w-10 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">Nenhum link criado</p>
          <p className="text-xs text-muted-foreground mt-1">
            Crie um link para compartilhar o portal com o cliente.
          </p>
          <Button
            size="sm"
            className="mt-4 gap-2"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Criar primeiro link
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}

      {/* Dialog de criacao */}
      <CreateSessionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        jobId={jobId}
      />
    </div>
  )
}
