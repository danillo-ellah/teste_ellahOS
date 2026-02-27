'use client'

import { useState } from 'react'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { MoreHorizontal, User, Building2 } from 'lucide-react'
import { useVendors, useUpdateVendor, useDeleteVendor } from '@/hooks/useVendors'
import { safeErrorMessage } from '@/lib/api'
import { Pagination } from '@/components/shared/Pagination'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { Vendor, VendorFilters } from '@/types/cost-management'

interface VendorsTableProps {
  filters: VendorFilters
  onFiltersChange: (filters: VendorFilters) => void
  onSelectVendor: (vendorId: string) => void
}

function formatCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '')
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function formatCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, '')
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

const PIX_TYPE_LABELS: Record<string, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  telefone: 'Telefone',
  aleatoria: 'Aleatoria',
}

interface RowActionsProps {
  vendor: Vendor
  onEdit: (vendor: Vendor) => void
  onToggleActive: (vendor: Vendor) => void
  onDelete: (vendor: Vendor) => void
}

function RowActions({ vendor, onEdit, onToggleActive, onDelete }: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Acoes</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(vendor)}>
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggleActive(vendor)}>
          {vendor.is_active ? 'Desativar' : 'Ativar'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(vendor)}
        >
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function VendorsTable({ filters, onFiltersChange, onSelectVendor }: VendorsTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null)

  const { data: vendors, meta, isLoading, isError, refetch } = useVendors(filters)
  const updateMutation = useUpdateVendor()
  const deleteMutation = useDeleteVendor()

  async function handleToggleActive(vendor: Vendor) {
    try {
      await updateMutation.mutateAsync({ id: vendor.id, is_active: !vendor.is_active })
      toast.success(vendor.is_active ? 'Fornecedor desativado' : 'Fornecedor ativado')
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success('Fornecedor excluido')
      setDeleteTarget(null)
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  if (isLoading) {
    return (
      <div className="py-16 text-center text-muted-foreground text-sm">
        Carregando...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Erro ao carregar fornecedores</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (!vendors || vendors.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Nenhum fornecedor encontrado</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="w-16">Tipo</TableHead>
              <TableHead className="hidden sm:table-cell">CPF/CNPJ</TableHead>
              <TableHead className="hidden md:table-cell">E-mail</TableHead>
              <TableHead className="hidden lg:table-cell">PIX</TableHead>
              <TableHead className="w-20">Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.map((vendor) => {
              const primaryBankAccount = vendor.bank_accounts?.[0]
              const pixKey = primaryBankAccount?.pix_key
              const pixKeyType = primaryBankAccount?.pix_key_type

              return (
                <TableRow key={vendor.id} className="group">
                  {/* Nome */}
                  <TableCell>
                    <button
                      type="button"
                      className="text-left font-medium hover:underline focus:underline focus:outline-none"
                      onClick={() => onSelectVendor(vendor.id)}
                    >
                      {vendor.full_name}
                    </button>
                    {vendor.razao_social && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {vendor.razao_social}
                      </p>
                    )}
                  </TableCell>

                  {/* Tipo */}
                  <TableCell>
                    {vendor.entity_type === 'pj' ? (
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit text-xs">
                        <Building2 className="size-3" />
                        PJ
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="flex items-center gap-1 w-fit text-xs">
                        <User className="size-3" />
                        PF
                      </Badge>
                    )}
                  </TableCell>

                  {/* CPF/CNPJ */}
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {vendor.cpf
                      ? formatCpf(vendor.cpf)
                      : vendor.cnpj
                      ? formatCnpj(vendor.cnpj)
                      : '-'}
                  </TableCell>

                  {/* Email */}
                  <TableCell className="hidden md:table-cell">
                    {vendor.email ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm text-muted-foreground truncate max-w-[180px] block cursor-default">
                            {vendor.email}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{vendor.email}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* PIX */}
                  <TableCell className="hidden lg:table-cell">
                    {pixKey ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm text-muted-foreground truncate max-w-[150px] block cursor-default">
                            {pixKey}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Tipo: {PIX_TYPE_LABELS[pixKeyType ?? ''] ?? pixKeyType}
                          <br />
                          {pixKey}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        vendor.is_active
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-muted text-muted-foreground hover:bg-muted'
                      }
                    >
                      {vendor.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>

                  {/* Acoes */}
                  <TableCell>
                    <RowActions
                      vendor={vendor}
                      onEdit={(v) => onSelectVendor(v.id)}
                      onToggleActive={handleToggleActive}
                      onDelete={(v) => setDeleteTarget(v)}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {meta && meta.total > 0 && (
        <Pagination
          page={filters.page ?? 1}
          totalPages={meta.total_pages}
          total={meta.total}
          perPage={filters.per_page ?? 20}
          onPageChange={(page) => onFiltersChange({ ...filters, page })}
          onPerPageChange={(per_page) => onFiltersChange({ ...filters, per_page, page: 1 })}
          itemLabel="fornecedor"
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
        title="Excluir fornecedor"
        description={`Tem certeza que deseja excluir "${deleteTarget?.full_name}"? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </>
  )
}
