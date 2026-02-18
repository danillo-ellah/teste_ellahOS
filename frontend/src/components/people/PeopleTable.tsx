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
import { TEAM_ROLE_LABELS, PERSON_TYPE_LABELS } from '@/lib/constants'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Person } from '@/types/people'

interface PeopleTableProps {
  people: Person[]
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
  { label: 'NOME', key: 'full_name', sortable: true, className: 'min-w-[200px]' },
  { label: 'FUNCAO', key: 'default_role', sortable: true, className: 'w-44' },
  { label: 'TIPO', key: 'is_internal', sortable: false, className: 'w-28' },
  { label: 'CACHE', key: 'default_rate', sortable: true, className: 'w-28 text-right' },
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

export function PeopleTable({
  people,
  sortBy,
  sortOrder,
  onSortChange,
  onArchive,
}: PeopleTableProps) {
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
          {people.map((person) => (
            <TableRow
              key={person.id}
              className="group h-[52px] border-b border-border transition-colors duration-100 cursor-pointer hover:bg-muted/40"
              onClick={() => router.push(`/people/${person.id}`)}
            >
              <TableCell className="px-3 py-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium truncate group-hover:text-primary transition-colors duration-100" title={person.full_name}>
                    {person.full_name}
                  </span>
                  {person.email && (
                    <span className="text-xs text-muted-foreground truncate">
                      {person.email}
                    </span>
                  )}
                </div>
              </TableCell>

              <TableCell className="px-3 py-2">
                {person.default_role ? (
                  <span className="text-sm text-muted-foreground truncate">
                    {TEAM_ROLE_LABELS[person.default_role] ?? person.default_role}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
              </TableCell>

              <TableCell className="px-3 py-2">
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-xs font-normal',
                    person.is_internal
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
                  )}
                >
                  {person.is_internal ? PERSON_TYPE_LABELS.internal : PERSON_TYPE_LABELS.freelancer}
                </Badge>
              </TableCell>

              <TableCell className="px-3 py-2 text-right">
                <span className="text-sm tabular-nums text-muted-foreground">
                  {person.default_rate ? formatCurrency(person.default_rate) : '-'}
                </span>
              </TableCell>

              <TableCell className="px-3 py-2">
                <Badge
                  variant={person.is_active ? 'default' : 'secondary'}
                  className={cn(
                    'text-xs font-normal',
                    person.is_active
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                      : 'bg-zinc-500/10 text-zinc-500',
                  )}
                >
                  {person.is_active ? 'Ativo' : 'Inativo'}
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
                    <DropdownMenuItem onClick={() => router.push(`/people/${person.id}`)}>
                      <Pencil className="size-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onArchive(person.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Archive className="size-4" />
                      {person.is_active ? 'Desativar' : 'Reativar'}
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
