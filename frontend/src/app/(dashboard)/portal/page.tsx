'use client'

import { useState } from 'react'
import {
  Globe,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'
import { usePortalSessions } from '@/hooks/use-portal'
import { CreateSessionDialog } from '@/components/portal/create-session-dialog'
import type { PortalSession } from '@/types/portal'

// Componente para copiar link individualmente
function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Link copiado!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Nao foi possivel copiar o link')
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={handleCopy}
      aria-label="Copiar link do portal"
      title="Copiar link"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  )
}

type StatusFilter = 'all' | 'active' | 'inactive'

export default function PortalPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Busca todas as sessoes (sem filtro por job)
  const { data: sessions, isLoading, isError, refetch } = usePortalSessions()

  // Filtrar por status
  const filtered = (sessions ?? []).filter((s: PortalSession) => {
    if (statusFilter === 'active') return s.is_active
    if (statusFilter === 'inactive') return !s.is_active
    return true
  })

  const activeCount = (sessions ?? []).filter((s: PortalSession) => s.is_active).length
  const inactiveCount = (sessions ?? []).filter((s: PortalSession) => !s.is_active).length

  return (
    <div className="space-y-6">
      {/* Cabecalho */}
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Globe className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          Portal do Cliente
          {!isLoading && sessions && sessions.length > 0 && (
            <span className="text-base font-normal text-muted-foreground">
              ({sessions.length})
            </span>
          )}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie os links de acesso ao portal do cliente para todos os jobs.
        </p>
      </div>

      {/* Filtros + Botao */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Filtro por status */}
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                Todos ({(sessions ?? []).length})
              </SelectItem>
              <SelectItem value="active">
                Ativos ({activeCount})
              </SelectItem>
              <SelectItem value="inactive">
                Inativos ({inactiveCount})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Info: criar links pelo detalhe do job */}
        <p className="text-xs text-muted-foreground">
          Para criar links, acesse a aba <strong>Portal</strong> no detalhe do job.
        </p>
      </div>

      {/* Tabela */}
      {isError ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
          <AlertCircle className="h-10 w-10 text-destructive" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Erro ao carregar sessoes do portal.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Globe className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
          <p className="text-lg font-medium">Nenhum link encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">
            {statusFilter !== 'all'
              ? 'Nenhum link com este status.'
              : 'Crie links do portal nos detalhes de cada job.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Nome do link</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Link</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((session: PortalSession) => (
                <TableRow key={session.id}>
                  {/* Job */}
                  <TableCell className="font-medium">
                    <div>
                      <p className="text-xs text-muted-foreground font-mono">
                        {session.jobs?.code ?? '-'}
                      </p>
                      <p className="text-sm truncate max-w-[160px]">
                        {session.jobs?.title ?? '-'}
                      </p>
                    </div>
                  </TableCell>

                  {/* Label */}
                  <TableCell>
                    <p className="text-sm font-medium">{session.label}</p>
                    {session.contacts && (
                      <p className="text-xs text-muted-foreground">
                        {session.contacts.name}
                      </p>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge
                      variant={session.is_active ? 'default' : 'secondary'}
                      className={cn(
                        'text-xs',
                        session.is_active
                          ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20'
                          : '',
                      )}
                    >
                      {session.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>

                  {/* Link */}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground font-mono truncate max-w-[140px]">
                        {session.portal_url}
                      </span>
                      <CopyLinkButton url={session.portal_url} />
                    </div>
                  </TableCell>

                  {/* Criado em */}
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(session.created_at)}
                  </TableCell>

                  {/* Expira em */}
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(session.expires_at)}
                  </TableCell>

                  {/* Acoes */}
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      asChild
                    >
                      <a
                        href={session.portal_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Abrir portal: ${session.label}`}
                        title="Abrir portal em nova aba"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Info sobre como criar links */}
      {!isLoading && (sessions ?? []).length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Para criar novos links, acesse o detalhe de um job e use a aba{' '}
          <strong>Portal</strong>.
        </p>
      )}

    </div>
  )
}
