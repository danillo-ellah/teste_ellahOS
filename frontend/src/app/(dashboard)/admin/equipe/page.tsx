'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MoreHorizontal, Plus, ShieldAlert, UserPlus, Mail, Phone, Trash2, UserCog } from 'lucide-react'
import { apiGet, apiMutate, safeErrorMessage } from '@/lib/api'
import { useUserRole } from '@/hooks/useUserRole'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

// --- Tipos ---

interface TeamMember {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  role: string
  joined_at: string
}

interface Invitation {
  id: string
  email: string | null
  phone: string | null
  role: string
  created_at: string
  expires_at: string
}

// --- Constantes ---

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  ceo: 'CEO',
  produtor_executivo: 'Produtor Executivo',
  coordenador_producao: 'Coord. Producao',
  diretor: 'Diretor',
  financeiro: 'Financeiro',
  assistente: 'Assistente',
  membro: 'Membro',
  freelancer: 'Freelancer',
}

const ADMIN_ROLES = ['admin', 'ceo']

const ALL_ROLES = [
  'admin',
  'ceo',
  'produtor_executivo',
  'coordenador_producao',
  'diretor',
  'financeiro',
  'assistente',
  'membro',
  'freelancer',
]

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), "dd 'de' MMM 'de' yyyy", { locale: ptBR })
  } catch {
    return '-'
  }
}

// --- Dialog de Convite ---

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('membro')

  const inviteMutation = useMutation({
    mutationFn: () =>
      apiMutate('tenant-management/invitations', 'POST', {
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        role,
      }),
    onSuccess: () => {
      toast.success('Convite enviado com sucesso')
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] })
      handleClose()
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  function handleClose() {
    setEmail('')
    setPhone('')
    setRole('membro')
    onOpenChange(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() && !phone.trim()) {
      toast.error('Informe um email ou telefone para enviar o convite')
      return
    }
    inviteMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar Membro</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="nome@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-phone">
              Telefone <span className="text-xs text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="invite-phone"
              type="tel"
              placeholder="(11) 91234-5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invite-role">Cargo</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="invite-role">
                <SelectValue placeholder="Selecionar cargo" />
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r] ?? r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={inviteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={inviteMutation.isPending}>
              <UserPlus className="size-4 mr-1.5" />
              {inviteMutation.isPending ? 'Enviando...' : 'Enviar Convite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// --- Dialog de Alterar Cargo ---

interface ChangeRoleDialogProps {
  member: TeamMember | null
  onOpenChange: (open: boolean) => void
}

function ChangeRoleDialog({ member, onOpenChange }: ChangeRoleDialogProps) {
  const queryClient = useQueryClient()
  const [role, setRole] = useState(member?.role ?? 'membro')

  const updateMutation = useMutation({
    mutationFn: () =>
      apiMutate('tenant-management/members', 'PATCH', { role }, member!.id),
    onSuccess: () => {
      toast.success('Cargo atualizado com sucesso')
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      onOpenChange(false)
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateMutation.mutate()
  }

  return (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Alterar Cargo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Alterando cargo de <span className="font-medium text-foreground">{member?.full_name}</span>
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="change-role">Novo cargo</Label>
            <Select
              value={role}
              onValueChange={setRole}
              defaultValue={member?.role}
            >
              <SelectTrigger id="change-role">
                <SelectValue placeholder="Selecionar cargo" />
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r] ?? r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// --- Tabela de Membros ---

interface MembersTableProps {
  isAdmin: boolean
  onChangeRole: (member: TeamMember) => void
}

function MembersTable({ isAdmin, onChangeRole }: MembersTableProps) {
  const queryClient = useQueryClient()
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['team-members'],
    queryFn: () => apiGet<TeamMember[]>('tenant-management/members'),
  })

  const removeMutation = useMutation({
    mutationFn: (memberId: string) =>
      apiMutate('tenant-management/members', 'DELETE', undefined, memberId),
    onSuccess: () => {
      toast.success('Membro removido')
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      setMemberToRemove(null)
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Carregando membros...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="py-12 text-center text-sm text-destructive">
        Erro ao carregar membros. Tente novamente.
      </div>
    )
  }

  const members = data?.data ?? []

  if (members.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Nenhum membro na equipe ainda.
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead className="hidden md:table-cell">Telefone</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead className="hidden lg:table-cell">Entrada</TableHead>
              {isAdmin && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.full_name}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                  {member.email ?? '-'}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                  {member.phone ?? '-'}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs font-normal">
                    {ROLE_LABELS[member.role] ?? member.role}
                  </Badge>
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                  {formatDate(member.joined_at)}
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Acoes</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onChangeRole(member)}>
                          <UserCog className="size-4 mr-2" />
                          Alterar Cargo
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setMemberToRemove(member)}
                        >
                          <Trash2 className="size-4 mr-2" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={memberToRemove !== null}
        onOpenChange={(open) => { if (!open) setMemberToRemove(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{memberToRemove?.full_name}</strong> da equipe?
              Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToRemove && removeMutation.mutate(memberToRemove.id)}
              disabled={removeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMutation.isPending ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// --- Secao de Convites Pendentes ---

interface PendingInvitationsProps {
  isAdmin: boolean
}

function PendingInvitations({ isAdmin }: PendingInvitationsProps) {
  const queryClient = useQueryClient()
  const [inviteToRevoke, setInviteToRevoke] = useState<Invitation | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['team-invitations'],
    queryFn: () => apiGet<Invitation[]>('tenant-management/invitations'),
  })

  const revokeMutation = useMutation({
    mutationFn: (invitationId: string) =>
      apiMutate('tenant-management/invitations', 'DELETE', undefined, invitationId),
    onSuccess: () => {
      toast.success('Convite revogado')
      queryClient.invalidateQueries({ queryKey: ['team-invitations'] })
      setInviteToRevoke(null)
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  const invitations = data?.data ?? []

  if (isLoading) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        Carregando convites...
      </div>
    )
  }

  if (invitations.length === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        Nenhum convite pendente.
      </p>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Destinatario</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead className="hidden sm:table-cell">Enviado em</TableHead>
              <TableHead className="hidden md:table-cell">Expira em</TableHead>
              {isAdmin && <TableHead className="w-24 text-right">Acao</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-sm">
                    {inv.email ? (
                      <>
                        <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                        <span>{inv.email}</span>
                      </>
                    ) : inv.phone ? (
                      <>
                        <Phone className="size-3.5 shrink-0 text-muted-foreground" />
                        <span>{inv.phone}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs font-normal">
                    {ROLE_LABELS[inv.role] ?? inv.role}
                  </Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                  {formatDate(inv.created_at)}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                  {formatDate(inv.expires_at)}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      disabled={revokeMutation.isPending}
                      onClick={() => setInviteToRevoke(inv)}
                    >
                      Revogar
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={inviteToRevoke !== null}
        onOpenChange={(open) => { if (!open) setInviteToRevoke(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar convite</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja revogar o convite para{' '}
              <strong>{inviteToRevoke?.email ?? inviteToRevoke?.phone ?? '-'}</strong>?
              O link de convite deixara de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => inviteToRevoke && revokeMutation.mutate(inviteToRevoke.id)}
              disabled={revokeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeMutation.isPending ? 'Revogando...' : 'Revogar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// --- Pagina Principal ---

export default function AdminEquipePage() {
  const { role, isLoading: roleLoading } = useUserRole()
  const isAdmin = role !== null && ADMIN_ROLES.includes(role)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [memberToChangeRole, setMemberToChangeRole] = useState<TeamMember | null>(null)

  if (roleLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Verificando permissoes...
      </div>
    )
  }

  if (!role || !ADMIN_ROLES.includes(role)) {
    return (
      <div className="py-16 flex flex-col items-center gap-3 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Acesso restrito. Somente administradores podem gerenciar a equipe.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equipe</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os membros e convites da sua organizacao
          </p>
        </div>

        <Button
          size="default"
          className="h-9 px-4 shrink-0"
          onClick={() => setInviteOpen(true)}
        >
          <Plus className="size-4 mr-1.5" />
          Convidar
        </Button>
      </div>

      {/* Tabela de membros */}
      <section className="space-y-3">
        <h2 className="text-base font-medium">Membros ativos</h2>
        <MembersTable
          isAdmin={isAdmin}
          onChangeRole={(m) => setMemberToChangeRole(m)}
        />
      </section>

      {/* Convites pendentes */}
      <section className="space-y-3">
        <h2 className="text-base font-medium">Convites pendentes</h2>
        <PendingInvitations isAdmin={isAdmin} />
      </section>

      {/* Dialogs */}
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />

      <ChangeRoleDialog
        member={memberToChangeRole}
        onOpenChange={(open) => {
          if (!open) setMemberToChangeRole(null)
        }}
      />
    </div>
  )
}
