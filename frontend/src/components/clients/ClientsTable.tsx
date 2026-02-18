'use client'

import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, ChevronsUpDown, MoreHorizontal, Pencil, Archive } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CLIENT_SEGMENT_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Client, ClientSegment } from '@/types/clients'

interface ClientsTableProps {
  clients: Client[]
  sortBy: string
  sortOrder: 'asc' | 'desc'
  onSortChange: (column: string) => void
  onArchive: (id: string) => void
}

interface Column {
  label: string
  key: string
  sortable: boolean
  className?: string
}

const COLUMNS: Column[] = [
  { label: 'NOME', key: 'name', sortable: true, className: 'min-w-[200px]' },
  { label: 'CNPJ', key: 'cnpj', sortable: false, className: 'w-40' },
  { label: 'SEGMENTO', key: 'segment', sortable: true, className: 'w-36' },
  { label: 'CIDADE', key: 'city', sortable: true, className: 'w-36' },
  { label: 'STATUS', key: 'is_active', sortable: false, className: 'w-24' },
]

function SortIcon({ column, sortBy, sortOrder }: { column: string; sortBy: string; sortOrder: 'asc' | 'desc' }) {
  if (sortBy !== column) {
    return <ChevronsUpDown className="ml-1 inline size-3.5 shrink-0 text-muted-foreground/60" />
  }
  return sortOrder === 'asc'
    ? <ChevronUp className="ml-1 inline size-3.5 shrink-0 text-foreground" />
    : <ChevronDown className="ml-1 inline size-3.5 shrink-0 text-foreground" />
}

function formatCNPJ(cnpj: string | null): string {
  if (!cnpj) return '-'
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) return cnpj
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

export function ClientsTable({
  clients,
  sortBy,
  sortOrder,
  onSortChange,
  onArchive,
}: ClientsTableProps) {
  const router = useRouter()

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-muted/40 border-b border-border">
            {COLUMNS.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  'h-10 text-[11px] font-medium text-muted-foreground uppercase tracking-wide',
                  col.className,
                  col.sortable && 'cursor-pointer select-none hover:bg-muted/60 hover:text-foreground transition-colors',
                )}
                onClick={() => col.sortable && onSortChange(col.key)}
              >
                <span className="inline-flex items-center">
                  {col.label}
                  {col.sortable && <SortIcon column={col.key} sortBy={sortBy} sortOrder={sortOrder} />}
                </span>
              </TableHead>
            ))}
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {clients.map((client) => (
            <TableRow
              key={client.id}
              className="group h-[52px] border-b border-border transition-colors duration-100 cursor-pointer hover:bg-muted/40"
              onClick={() => router.push(`/clients/${client.id}`)}
            >
              <TableCell className="px-3 py-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium truncate group-hover:text-primary transition-colors duration-100" title={client.name}>
                    {client.name}
                  </span>
                  {client.trading_name && (
                    <span className="text-xs text-muted-foreground truncate">
                      {client.trading_name}
                    </span>
                  )}
                </div>
              </TableCell>

              <TableCell className="px-3 py-2 text-sm text-muted-foreground tabular-nums">
                {formatCNPJ(client.cnpj)}
              </TableCell>

              <TableCell className="px-3 py-2">
                {client.segment ? (
                  <Badge variant="secondary" className="text-xs font-normal">
                    {CLIENT_SEGMENT_LABELS[client.segment as ClientSegment] ?? client.segment}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </TableCell>

              <TableCell className="px-3 py-2 text-sm text-muted-foreground truncate">
                {client.city && client.state
                  ? `${client.city}/${client.state}`
                  : client.city ?? client.state ?? '-'}
              </TableCell>

              <TableCell className="px-3 py-2">
                <Badge
                  variant={client.is_active ? 'default' : 'secondary'}
                  className={cn(
                    'text-xs font-normal',
                    client.is_active
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                      : 'bg-zinc-500/10 text-zinc-500',
                  )}
                >
                  {client.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>

              <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/clients/${client.id}`)}>
                      <Pencil className="size-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onArchive(client.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Archive className="size-4" />
                      {client.is_active ? 'Desativar' : 'Reativar'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
