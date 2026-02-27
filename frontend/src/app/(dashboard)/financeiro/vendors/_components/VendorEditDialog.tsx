'use client'

import { useState, useEffect } from 'react'
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
import { useUpdateVendor } from '@/hooks/useVendors'
import { safeErrorMessage } from '@/lib/api'
import type { Vendor, EntityType } from '@/types/cost-management'

interface VendorEditDialogProps {
  vendor: Vendor | null
  open: boolean
  onOpenChange: (open: boolean) => void
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
}

function vendorToForm(vendor: Vendor): FormData {
  return {
    full_name: vendor.full_name,
    entity_type: vendor.entity_type,
    cpf: vendor.cpf ?? '',
    cnpj: vendor.cnpj ?? '',
    razao_social: vendor.razao_social ?? '',
    email: vendor.email ?? '',
    phone: vendor.phone ?? '',
    notes: vendor.notes ?? '',
  }
}

export function VendorEditDialog({ vendor, open, onOpenChange }: VendorEditDialogProps) {
  const [form, setForm] = useState<FormData>({
    full_name: '',
    entity_type: 'pf',
    cpf: '',
    cnpj: '',
    razao_social: '',
    email: '',
    phone: '',
    notes: '',
  })

  const updateMutation = useUpdateVendor()

  useEffect(() => {
    if (vendor) {
      setForm(vendorToForm(vendor))
    }
  }, [vendor])

  function setField(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!vendor) return
    if (!form.full_name.trim()) {
      toast.error('Nome do fornecedor e obrigatorio')
      return
    }

    try {
      await updateMutation.mutateAsync({
        id: vendor.id,
        full_name: form.full_name.trim(),
        entity_type: form.entity_type,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        notes: form.notes.trim() || undefined,
        cpf: form.entity_type === 'pf' ? (form.cpf.replace(/\D/g, '') || undefined) : undefined,
        cnpj: form.entity_type === 'pj' ? (form.cnpj.replace(/\D/g, '') || undefined) : undefined,
        razao_social: form.entity_type === 'pj' ? (form.razao_social.trim() || undefined) : undefined,
      })
      toast.success('Fornecedor atualizado')
      onOpenChange(false)
    } catch (err) {
      toast.error(safeErrorMessage(err))
    }
  }

  const isPending = updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Fornecedor</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit_full_name">
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit_full_name"
              placeholder="Nome completo ou nome fantasia"
              value={form.full_name}
              onChange={(e) => setField('full_name', e.target.value)}
              disabled={isPending}
              required
            />
          </div>

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

          {form.entity_type === 'pf' && (
            <div className="space-y-1.5">
              <Label htmlFor="edit_cpf">CPF</Label>
              <Input
                id="edit_cpf"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(e) => setField('cpf', e.target.value)}
                disabled={isPending}
                maxLength={14}
              />
            </div>
          )}

          {form.entity_type === 'pj' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="edit_cnpj">CNPJ</Label>
                <Input
                  id="edit_cnpj"
                  placeholder="00.000.000/0000-00"
                  value={form.cnpj}
                  onChange={(e) => setField('cnpj', e.target.value)}
                  disabled={isPending}
                  maxLength={18}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_razao_social">Razao Social</Label>
                <Input
                  id="edit_razao_social"
                  placeholder="Razao social da empresa"
                  value={form.razao_social}
                  onChange={(e) => setField('razao_social', e.target.value)}
                  disabled={isPending}
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit_email">E-mail</Label>
            <Input
              id="edit_email"
              type="email"
              placeholder="email@exemplo.com"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit_phone">Telefone</Label>
            <Input
              id="edit_phone"
              placeholder="(11) 99999-9999"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit_notes">Observacoes</Label>
            <Textarea
              id="edit_notes"
              placeholder="Informacoes adicionais sobre o fornecedor"
              value={form.notes}
              onChange={(e) => setField('notes', e.target.value)}
              disabled={isPending}
              rows={3}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
