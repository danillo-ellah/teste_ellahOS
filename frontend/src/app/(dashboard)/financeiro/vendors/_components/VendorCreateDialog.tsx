'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import { useCreateVendor } from '@/hooks/useVendors'
import { ApiRequestError, safeErrorMessage } from '@/lib/api'
import {
  BankAccountForm,
  getEmptyBankAccountForm,
} from './BankAccountForm'
import type { BankAccountFormData } from './BankAccountForm'
import type { CreateVendorPayload, DuplicateVendorError, EntityType } from '@/types/cost-management'

interface VendorCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onVendorCreated?: (vendorId: string) => void
  onUseExisting?: (vendorId: string) => void
}

interface FormData {
  full_name: string
  entity_type: EntityType
  cpf: string
  cnpj: string
  razao_social: string
  email: string
  phone: string
  notes: string
  addBankAccount: boolean
}

function getEmptyForm(): FormData {
  return {
    full_name: '',
    entity_type: 'pf',
    cpf: '',
    cnpj: '',
    razao_social: '',
    email: '',
    phone: '',
    notes: '',
    addBankAccount: false,
  }
}

export function VendorCreateDialog({
  open,
  onOpenChange,
  onVendorCreated,
  onUseExisting,
}: VendorCreateDialogProps) {
  const [form, setForm] = useState<FormData>(getEmptyForm())
  const [bankForm, setBankForm] = useState<BankAccountFormData>(getEmptyBankAccountForm())
  const [duplicateData, setDuplicateData] = useState<DuplicateVendorError | null>(null)

  const createMutation = useCreateVendor()

  function setField(field: keyof FormData, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleClose(open: boolean) {
    if (!open) {
      setForm(getEmptyForm())
      setBankForm(getEmptyBankAccountForm())
      setDuplicateData(null)
    }
    onOpenChange(open)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) {
      toast.error('Nome do fornecedor e obrigatorio')
      return
    }

    const payload: CreateVendorPayload = {
      full_name: form.full_name.trim(),
      entity_type: form.entity_type,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      notes: form.notes.trim() || undefined,
    }

    if (form.entity_type === 'pf' && form.cpf.trim()) {
      payload.cpf = form.cpf.replace(/\D/g, '')
    }
    if (form.entity_type === 'pj') {
      if (form.cnpj.trim()) payload.cnpj = form.cnpj.replace(/\D/g, '')
      if (form.razao_social.trim()) payload.razao_social = form.razao_social.trim()
    }

    if (form.addBankAccount && (bankForm.bank_name || bankForm.pix_key || bankForm.account_number)) {
      payload.bank_account = {
        account_holder: bankForm.account_holder || null,
        bank_name: bankForm.bank_name || null,
        bank_code: bankForm.bank_code || null,
        agency: bankForm.agency || null,
        account_number: bankForm.account_number || null,
        account_type: (bankForm.account_type as import('@/types/cost-management').AccountType) || null,
        pix_key: bankForm.pix_key || null,
        pix_key_type: (bankForm.pix_key_type as import('@/types/cost-management').PixKeyType) || null,
        is_primary: bankForm.is_primary,
      }
    }

    try {
      const result = await createMutation.mutateAsync(payload)
      toast.success('Fornecedor criado com sucesso')
      handleClose(false)
      if (result.data?.id) {
        onVendorCreated?.(result.data.id)
      }
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'DUPLICATE_VENDOR') {
        setDuplicateData(err.details as unknown as DuplicateVendorError)
      } else {
        toast.error(safeErrorMessage(err))
      }
    }
  }

  function handleUseExisting() {
    if (!duplicateData?.existing_vendor?.id) return
    handleClose(false)
    onUseExisting?.(duplicateData.existing_vendor.id)
  }

  const isPending = createMutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Fornecedor</DialogTitle>
        </DialogHeader>

        {duplicateData && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-4 text-yellow-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-yellow-800">Fornecedor similar encontrado</p>
                <p className="text-sm text-yellow-700 mt-1">
                  <strong>{duplicateData.existing_vendor.full_name}</strong>
                  {duplicateData.existing_vendor.email && (
                    <> &mdash; {duplicateData.existing_vendor.email}</>
                  )}
                </p>
                <p className="text-xs text-yellow-600 mt-0.5">
                  Similaridade: {Math.round((duplicateData.existing_vendor.similarity_score ?? 0) * 100)}%
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-yellow-400 text-yellow-800 hover:bg-yellow-100"
                onClick={handleUseExisting}
              >
                Usar existente
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-yellow-700"
                onClick={() => setDuplicateData(null)}
              >
                Ignorar e continuar
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="full_name">
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              id="full_name"
              placeholder="Nome completo ou nome fantasia"
              value={form.full_name}
              onChange={(e) => setField('full_name', e.target.value)}
              disabled={isPending}
              required
            />
          </div>

          {/* Tipo */}
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select
              value={form.entity_type}
              onValueChange={(v) => setField('entity_type', v as EntityType)}
              disabled={isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pf">Pessoa Fisica (PF)</SelectItem>
                <SelectItem value="pj">Pessoa Juridica (PJ)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* PF: CPF */}
          {form.entity_type === 'pf' && (
            <div className="space-y-1.5">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(e) => setField('cpf', e.target.value)}
                disabled={isPending}
                maxLength={14}
              />
            </div>
          )}

          {/* PJ: CNPJ + Razao Social */}
          {form.entity_type === 'pj' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  value={form.cnpj}
                  onChange={(e) => setField('cnpj', e.target.value)}
                  disabled={isPending}
                  maxLength={18}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="razao_social">Razao Social</Label>
                <Input
                  id="razao_social"
                  placeholder="Razao social da empresa"
                  value={form.razao_social}
                  onChange={(e) => setField('razao_social', e.target.value)}
                  disabled={isPending}
                />
              </div>
            </>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* Telefone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              placeholder="(11) 99999-9999"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* Observacoes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Observacoes</Label>
            <Textarea
              id="notes"
              placeholder="Informacoes adicionais sobre o fornecedor"
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              disabled={isPending}
              rows={3}
            />
          </div>

          {/* Toggle dados bancarios */}
          <div className="border-t pt-4">
            <button
              type="button"
              className="text-sm font-medium text-primary hover:underline"
              onClick={() => setField('addBankAccount', !form.addBankAccount)}
              disabled={isPending}
            >
              {form.addBankAccount ? '- Remover dados bancarios' : '+ Adicionar dados bancarios (opcional)'}
            </button>
          </div>

          {form.addBankAccount && (
            <BankAccountForm
              value={bankForm}
              onChange={setBankForm}
              disabled={isPending}
            />
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Criando...' : 'Criar Fornecedor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
