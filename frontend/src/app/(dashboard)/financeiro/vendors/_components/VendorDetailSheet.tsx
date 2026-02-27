'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Edit, Trash2, Plus, Star } from 'lucide-react'
import { useVendor, useDeleteVendor, useUpdateVendor, useCreateBankAccount, useUpdateBankAccount, useDeleteBankAccount } from '@/hooks/useVendors'
import { safeErrorMessage } from '@/lib/api'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { VendorEditDialog } from './VendorEditDialog'
import { BankAccountForm, getEmptyBankAccountForm, bankAccountToFormData } from './BankAccountForm'
import type { BankAccountFormData } from './BankAccountForm'
import type { BankAccount } from '@/types/cost-management'

interface VendorDetailSheetProps {
  vendorId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

function formatCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, '')
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function formatCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '')
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

const PIX_KEY_TYPE_LABELS: Record<string, string> = {
  cpf: 'CPF',
  cnpj: 'CNPJ',
  email: 'E-mail',
  telefone: 'Telefone',
  aleatoria: 'Aleatoria',
}

interface BankAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  onSave: (data: BankAccountFormData) => Promise<void>
  initialData?: BankAccountFormData
  isPending: boolean
}

function BankAccountDialog({ open, onOpenChange, title, onSave, initialData, isPending }: BankAccountDialogProps) {
  const [form, setForm] = useState<BankAccountFormData>(initialData ?? getEmptyBankAccountForm())

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open) {
      setForm(initialData ?? getEmptyBankAccountForm())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleSave() {
    await onSave(form)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <BankAccountForm value={form} onChange={setForm} disabled={isPending} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function VendorDetailSheet({ vendorId, open, onOpenChange, onDeleted }: VendorDetailSheetProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [addBankOpen, setAddBankOpen] = useState(false)
  const [editBank, setEditBank] = useState<BankAccount | null>(null)
  const [deleteBankId, setDeleteBankId] = useState<string | null>(null)

  const vendorQuery = useVendor(vendorId ?? '')
  const vendor = vendorQuery.data?.data
  const isLoading = vendorQuery.isLoading
  const isError = vendorQuery.isError

  const deleteMutation = useDeleteVendor()
  const updateMutation = useUpdateVendor()
  const createBankMutation = useCreateBankAccount()
  const updateBankMutation = useUpdateBankAccount()
  const deleteBankMutation = useDeleteBankAccount()

  async function handleDelete() {
    if (!vendor) return
    try {
      await deleteMutation.mutateAsync(vendor.id)
      toast.success('Fornecedor excluido')
      setDeleteConfirmOpen(false)
      onOpenChange(false)
      onDeleted?.()
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  async function handleToggleActive() {
    if (!vendor) return
    try {
      await updateMutation.mutateAsync({ id: vendor.id, is_active: !vendor.is_active })
      toast.success(vendor.is_active ? 'Fornecedor desativado' : 'Fornecedor ativado')
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  async function handleAddBankAccount(data: BankAccountFormData) {
    if (!vendor) return
    try {
      await createBankMutation.mutateAsync({
        vendorId: vendor.id,
        bank_name: data.bank_name || null,
        bank_code: data.bank_code || null,
        account_holder: data.account_holder || null,
        agency: data.agency || null,
        account_number: data.account_number || null,
        account_type: data.account_type || null,
        pix_key: data.pix_key || null,
        pix_key_type: data.pix_key_type || null,
        is_primary: data.is_primary,
      })
      toast.success('Conta bancaria adicionada')
      setAddBankOpen(false)
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  async function handleEditBankAccount(data: BankAccountFormData) {
    if (!vendor || !editBank) return
    try {
      await updateBankMutation.mutateAsync({
        vendorId: vendor.id,
        bankAccountId: editBank.id,
        bank_name: data.bank_name || null,
        bank_code: data.bank_code || null,
        account_holder: data.account_holder || null,
        agency: data.agency || null,
        account_number: data.account_number || null,
        account_type: data.account_type || null,
        pix_key: data.pix_key || null,
        pix_key_type: data.pix_key_type || null,
        is_primary: data.is_primary,
      })
      toast.success('Conta bancaria atualizada')
      setEditBank(null)
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  async function handleDeleteBankAccount() {
    if (!vendor || !deleteBankId) return
    try {
      await deleteBankMutation.mutateAsync({ vendorId: vendor.id, bankAccountId: deleteBankId })
      toast.success('Conta bancaria removida')
      setDeleteBankId(null)
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  async function handleSetPrimary(ba: BankAccount) {
    if (!vendor) return
    try {
      await updateBankMutation.mutateAsync({
        vendorId: vendor.id,
        bankAccountId: ba.id,
        is_primary: true,
      })
      toast.success('Conta definida como principal')
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            {isLoading ? (
              <SheetTitle className="text-muted-foreground">Carregando...</SheetTitle>
            ) : isError || !vendor ? (
              <SheetTitle className="text-muted-foreground">Fornecedor nao encontrado</SheetTitle>
            ) : (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <SheetTitle className="text-lg leading-tight">{vendor.full_name}</SheetTitle>
                  <Badge variant={vendor.entity_type === 'pj' ? 'default' : 'secondary'} className="shrink-0">
                    {vendor.entity_type === 'pj' ? 'PJ' : 'PF'}
                  </Badge>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                    <Edit className="size-3.5 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleToggleActive}
                    disabled={updateMutation.isPending}
                  >
                    {vendor.is_active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    <Trash2 className="size-3.5 mr-1" />
                    Excluir
                  </Button>
                </div>
              </div>
            )}
          </SheetHeader>

          {vendor && (
            <div className="space-y-6 py-4">
              {/* Informacoes */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Informacoes
                </h3>
                <dl className="space-y-2 text-sm">
                  {vendor.email && (
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground w-24 shrink-0">E-mail</dt>
                      <dd className="font-medium break-all">{vendor.email}</dd>
                    </div>
                  )}
                  {vendor.phone && (
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground w-24 shrink-0">Telefone</dt>
                      <dd className="font-medium">{vendor.phone}</dd>
                    </div>
                  )}
                  {vendor.cpf && (
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground w-24 shrink-0">CPF</dt>
                      <dd className="font-medium">{formatCpf(vendor.cpf)}</dd>
                    </div>
                  )}
                  {vendor.cnpj && (
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground w-24 shrink-0">CNPJ</dt>
                      <dd className="font-medium">{formatCnpj(vendor.cnpj)}</dd>
                    </div>
                  )}
                  {vendor.razao_social && (
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground w-24 shrink-0">Razao Social</dt>
                      <dd className="font-medium">{vendor.razao_social}</dd>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-24 shrink-0">Status</dt>
                    <dd>
                      <Badge variant={vendor.is_active ? 'default' : 'secondary'} className={vendor.is_active ? 'bg-emerald-100 text-emerald-700' : ''}>
                        {vendor.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </dd>
                  </div>
                  {vendor.notes && (
                    <div className="flex gap-2">
                      <dt className="text-muted-foreground w-24 shrink-0">Obs.</dt>
                      <dd className="text-muted-foreground">{vendor.notes}</dd>
                    </div>
                  )}
                </dl>
              </section>

              {/* Contas Bancarias */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Contas Bancarias
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddBankOpen(true)}
                  >
                    <Plus className="size-3.5 mr-1" />
                    Adicionar
                  </Button>
                </div>

                {(!vendor.bank_accounts || vendor.bank_accounts.length === 0) ? (
                  <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada</p>
                ) : (
                  <div className="space-y-3">
                    {vendor.bank_accounts.map((ba) => (
                      <div
                        key={ba.id}
                        className="rounded-md border p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {ba.bank_name && (
                                <span className="text-sm font-medium">{ba.bank_name}</span>
                              )}
                              {ba.is_primary && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                  <Star className="size-2.5 mr-0.5" />
                                  Principal
                                </Badge>
                              )}
                            </div>
                            {(ba.agency || ba.account_number) && (
                              <p className="text-xs text-muted-foreground">
                                {[ba.agency && `Ag: ${ba.agency}`, ba.account_number && `Cc: ${ba.account_number}`].filter(Boolean).join(' / ')}
                              </p>
                            )}
                            {ba.pix_key && (
                              <p className="text-xs text-muted-foreground">
                                PIX ({PIX_KEY_TYPE_LABELS[ba.pix_key_type ?? ''] ?? ba.pix_key_type}): {ba.pix_key}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {!ba.is_primary && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleSetPrimary(ba)}
                                disabled={updateBankMutation.isPending}
                              >
                                Principal
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => setEditBank(ba)}
                            >
                              <Edit className="size-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => setDeleteBankId(ba.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Itens de Custo */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Itens de Custo Vinculados
                </h3>
                <div className="rounded-md border border-dashed p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Visualizacao de itens de custo disponivel em breve
                  </p>
                </div>
              </section>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {vendor && (
        <VendorEditDialog
          vendor={vendor}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Excluir fornecedor"
        description={`Tem certeza que deseja excluir "${vendor?.full_name}"? Esta acao nao pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />

      <BankAccountDialog
        open={addBankOpen}
        onOpenChange={setAddBankOpen}
        title="Adicionar Conta Bancaria"
        onSave={handleAddBankAccount}
        isPending={createBankMutation.isPending}
      />

      {editBank && (
        <BankAccountDialog
          open={!!editBank}
          onOpenChange={(o) => { if (!o) setEditBank(null) }}
          title="Editar Conta Bancaria"
          onSave={handleEditBankAccount}
          initialData={bankAccountToFormData(editBank)}
          isPending={updateBankMutation.isPending}
        />
      )}

      <ConfirmDialog
        open={!!deleteBankId}
        onOpenChange={(o) => { if (!o) setDeleteBankId(null) }}
        title="Remover conta bancaria"
        description="Tem certeza que deseja remover esta conta bancaria?"
        confirmLabel="Remover"
        variant="destructive"
        onConfirm={handleDeleteBankAccount}
        isPending={deleteBankMutation.isPending}
      />
    </>
  )
}
