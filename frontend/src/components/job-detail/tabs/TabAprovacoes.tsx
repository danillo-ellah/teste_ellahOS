'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Plus,
  MoreHorizontal,
  Send,
  CheckCircle,
  XCircle,
  ClipboardCheck,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyTabState } from '@/components/shared/EmptyTabState'
import {
  useJobApprovals,
  useCreateApproval,
  useResendApproval,
  useApproveInternal,
  useRejectInternal,
  useApprovalLogs,
} from '@/hooks/useApprovals'
import { ApiRequestError } from '@/lib/api'
import { formatDate, formatRelativeDate } from '@/lib/format'
import {
  APPROVAL_TYPE_LABELS,
  APPROVAL_STATUS_LABELS,
} from '@/types/approvals'
import type {
  ApprovalType,
  ApproverType,
  ApprovalRequest,
} from '@/types/approvals'
import type { JobDetail } from '@/types/jobs'

interface TabApprovacoesProps {
  job: JobDetail
}

export function TabAprovacoes({ job }: TabApprovacoesProps) {
  const { data: approvals, isLoading, isError, refetch } = useJobApprovals(job.id)
  const { mutateAsync: createApproval, isPending: isCreating } = useCreateApproval()
  const { mutateAsync: resendApproval } = useResendApproval()
  const { mutateAsync: approveInternal } = useApproveInternal()
  const { mutateAsync: rejectInternal } = useRejectInternal()

  const [createOpen, setCreateOpen] = useState(false)
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null)
  const [rejectComment, setRejectComment] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // --- Create form state ---
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<ApprovalType>('briefing')
  const [newApproverType, setNewApproverType] = useState<ApproverType>('internal')
  const [newDescription, setNewDescription] = useState('')
  const [newFileUrl, setNewFileUrl] = useState('')
  const [newApproverEmail, setNewApproverEmail] = useState('')
  const [newApproverPhone, setNewApproverPhone] = useState('')

  function resetCreateForm() {
    setNewTitle('')
    setNewType('briefing')
    setNewApproverType('internal')
    setNewDescription('')
    setNewFileUrl('')
    setNewApproverEmail('')
    setNewApproverPhone('')
  }

  async function handleCreate() {
    try {
      await createApproval({
        job_id: job.id,
        approval_type: newType,
        title: newTitle,
        description: newDescription || undefined,
        file_url: newFileUrl || undefined,
        approver_type: newApproverType,
        approver_email: newApproverEmail || undefined,
        approver_phone: newApproverPhone || undefined,
      })
      toast.success('Aprovacao criada')
      setCreateOpen(false)
      resetCreateForm()
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao criar aprovacao'
      toast.error(msg)
    }
  }

  async function handleResend(approval: ApprovalRequest) {
    try {
      await resendApproval({ id: approval.id, jobId: job.id })
      toast.success('Link reenviado')
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao reenviar'
      toast.error(msg)
    }
  }

  async function handleApproveInternal(id: string) {
    try {
      await approveInternal({ id })
      toast.success('Aprovado internamente')
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao aprovar'
      toast.error(msg)
    }
  }

  async function handleReject() {
    if (!rejectDialogId || !rejectComment.trim()) return
    try {
      await rejectInternal({ id: rejectDialogId, comment: rejectComment })
      toast.success('Rejeitado')
      setRejectDialogId(null)
      setRejectComment('')
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao rejeitar'
      toast.error(msg)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border py-12 flex flex-col items-center justify-center text-center gap-3">
        <p className="text-sm text-muted-foreground">Erro ao carregar aprovacoes.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar novamente</Button>
      </div>
    )
  }

  const list = approvals ?? []

  if (list.length === 0) {
    return (
      <>
        <EmptyTabState
          icon={ClipboardCheck}
          title="Nenhuma aprovacao"
          description="Crie solicitacoes de aprovacao para este job."
          actionLabel="Nova aprovacao"
          onAction={() => setCreateOpen(true)}
        />
        <CreateApprovalDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          isPending={isCreating}
          onSubmit={handleCreate}
          title={newTitle}
          setTitle={setNewTitle}
          type={newType}
          setType={setNewType}
          approverType={newApproverType}
          setApproverType={setNewApproverType}
          description={newDescription}
          setDescription={setNewDescription}
          fileUrl={newFileUrl}
          setFileUrl={setNewFileUrl}
          approverEmail={newApproverEmail}
          setApproverEmail={setNewApproverEmail}
          approverPhone={newApproverPhone}
          setApproverPhone={setNewApproverPhone}
        />
      </>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">
          Aprovacoes ({list.length})
        </h3>
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Nova aprovacao
        </Button>
      </div>

      {/* Tabela */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px]" />
              <TableHead>Titulo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Aprovador</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((a) => (
              <ApprovalRow
                key={a.id}
                approval={a}
                expanded={expandedId === a.id}
                onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
                onResend={() => handleResend(a)}
                onApprove={() => handleApproveInternal(a.id)}
                onReject={() => {
                  setRejectDialogId(a.id)
                  setRejectComment('')
                }}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog criar */}
      <CreateApprovalDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isPending={isCreating}
        onSubmit={handleCreate}
        title={newTitle}
        setTitle={setNewTitle}
        type={newType}
        setType={setNewType}
        approverType={newApproverType}
        setApproverType={setNewApproverType}
        description={newDescription}
        setDescription={setNewDescription}
        fileUrl={newFileUrl}
        setFileUrl={setNewFileUrl}
        approverEmail={newApproverEmail}
        setApproverEmail={setNewApproverEmail}
        approverPhone={newApproverPhone}
        setApproverPhone={setNewApproverPhone}
      />

      {/* Dialog rejeitar */}
      <Dialog
        open={rejectDialogId !== null}
        onOpenChange={(open) => { if (!open) setRejectDialogId(null) }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar aprovacao</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeicao.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="reject-comment">Motivo</Label>
            <Textarea
              id="reject-comment"
              rows={3}
              placeholder="Descreva o motivo da rejeicao..."
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectComment.trim()}
              onClick={handleReject}
            >
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// --- Linha de aprovacao com expand ---

function ApprovalRow({
  approval,
  expanded,
  onToggle,
  onResend,
  onApprove,
  onReject,
}: {
  approval: ApprovalRequest
  expanded: boolean
  onToggle: () => void
  onResend: () => void
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell>
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </TableCell>
        <TableCell className="font-medium">{approval.title}</TableCell>
        <TableCell>
          <Badge variant="secondary" className="text-xs">
            {APPROVAL_TYPE_LABELS[approval.approval_type]}
          </Badge>
        </TableCell>
        <TableCell>
          <span className="text-sm">
            {approval.approver_type === 'external' ? (
              <span className="flex items-center gap-1">
                <ExternalLink className="size-3" />
                {approval.approver_email || approval.approver_phone || 'Externo'}
              </span>
            ) : (
              approval.people?.full_name || 'Interno'
            )}
          </span>
        </TableCell>
        <TableCell>
          <ApprovalStatusBadge status={approval.status} />
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {formatRelativeDate(approval.created_at)}
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          {approval.status === 'pending' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {approval.approver_type === 'external' && (
                  <DropdownMenuItem onClick={onResend}>
                    <Send className="size-4" />
                    Reenviar link
                  </DropdownMenuItem>
                )}
                {approval.approver_type === 'internal' && (
                  <>
                    <DropdownMenuItem onClick={onApprove}>
                      <CheckCircle className="size-4" />
                      Aprovar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={onReject}
                      className="text-destructive focus:text-destructive"
                    >
                      <XCircle className="size-4" />
                      Rejeitar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30 px-6 py-4">
            <ApprovalDetails approval={approval} />
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// --- Detalhes expandidos (descricao + logs) ---

function ApprovalDetails({ approval }: { approval: ApprovalRequest }) {
  const { data: logs, isLoading } = useApprovalLogs(approval.id)

  return (
    <div className="space-y-3">
      {approval.description && (
        <p className="text-sm text-muted-foreground">{approval.description}</p>
      )}
      {approval.file_url && (
        <a
          href={approval.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          <ExternalLink className="size-3" />
          Ver arquivo
        </a>
      )}
      {approval.rejection_reason && (
        <div className="rounded-md bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">Motivo da rejeicao:</p>
          <p className="text-sm text-muted-foreground mt-1">{approval.rejection_reason}</p>
        </div>
      )}
      {approval.approved_at && (
        <p className="text-xs text-muted-foreground">
          {approval.status === 'approved' ? 'Aprovado' : 'Respondido'} em {formatDate(approval.approved_at)}
        </p>
      )}

      {/* Timeline de logs */}
      <div className="mt-3">
        <p className="text-xs font-semibold mb-2">Historico</p>
        {isLoading ? (
          <Skeleton className="h-8 w-full" />
        ) : (
          <div className="space-y-1.5">
            {(logs ?? []).map((log) => (
              <div key={log.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="size-3 shrink-0" />
                <span>{formatDate(log.created_at)}</span>
                <span className="font-medium capitalize">{log.action}</span>
                {log.actor?.full_name && <span>por {log.actor.full_name}</span>}
                {log.comment && <span className="italic">— {log.comment}</span>}
              </div>
            ))}
            {(!logs || logs.length === 0) && (
              <p className="text-xs text-muted-foreground">Nenhum registro.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// --- Badge de status ---

function ApprovalStatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    expired: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[status] ?? ''}`}>
      {APPROVAL_STATUS_LABELS[status as keyof typeof APPROVAL_STATUS_LABELS] ?? status}
    </span>
  )
}

// --- Dialog de criacao ---

function CreateApprovalDialog({
  open,
  onOpenChange,
  isPending,
  onSubmit,
  title, setTitle,
  type, setType,
  approverType, setApproverType,
  description, setDescription,
  fileUrl, setFileUrl,
  approverEmail, setApproverEmail,
  approverPhone, setApproverPhone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isPending: boolean
  onSubmit: () => void
  title: string; setTitle: (v: string) => void
  type: ApprovalType; setType: (v: ApprovalType) => void
  approverType: ApproverType; setApproverType: (v: ApproverType) => void
  description: string; setDescription: (v: string) => void
  fileUrl: string; setFileUrl: (v: string) => void
  approverEmail: string; setApproverEmail: (v: string) => void
  approverPhone: string; setApproverPhone: (v: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova aprovacao</DialogTitle>
          <DialogDescription>
            Solicite a aprovacao de um cliente ou membro interno.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label>Titulo *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Aprovacao do corte final"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as ApprovalType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(APPROVAL_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Aprovador</Label>
              <Select value={approverType} onValueChange={(v) => setApproverType(v as ApproverType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Interno</SelectItem>
                  <SelectItem value="external">Externo (Cliente)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {approverType === 'external' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>E-mail do aprovador</Label>
                <Input
                  type="email"
                  value={approverEmail}
                  onChange={(e) => setApproverEmail(e.target.value)}
                  placeholder="cliente@empresa.com"
                />
              </div>
              <div>
                <Label>WhatsApp do aprovador</Label>
                <Input
                  value={approverPhone}
                  onChange={(e) => setApproverPhone(e.target.value)}
                  placeholder="5511999999999"
                />
              </div>
            </div>
          )}

          <div>
            <Label>Descricao</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes do que precisa ser aprovado..."
            />
          </div>

          <div>
            <Label>URL do arquivo</Label>
            <Input
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
            />
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={isPending || !title.trim()}>
            {isPending ? 'Criando...' : 'Criar aprovacao'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
