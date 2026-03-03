'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Upload, FileText, X, Loader2, Receipt } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useUploadPaymentProof } from '@/hooks/usePaymentProofs'
import { formatCurrency, parseBRNumber } from '@/lib/format'
import { safeErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { CostItem } from '@/types/cost-management'
import { createClient } from '@/lib/supabase/client'

interface PaymentProofDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId: string
  // Itens disponiveis para vincular (filtrados: pendente e nao cancelado)
  availableItems: CostItem[]
  // Opcional: pre-selecionar um item especifico ao abrir
  preselectedItemId?: string
}

interface SelectedItemState {
  costItemId: string
  allocatedAmount: string // string para o input BR-formatted
}

// ---- FileUploadZone ----

interface FileUploadZoneProps {
  file: File | null
  onFile: (file: File | null) => void
  isUploading: boolean
}

function FileUploadZone({ file, onFile, isUploading }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) onFile(dropped)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) onFile(selected)
    // Limpar o input para permitir re-selecionar o mesmo arquivo
    e.target.value = ''
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'relative flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 transition-colors',
        isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/20',
        isUploading && 'pointer-events-none opacity-60',
      )}
    >
      {file ? (
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
          <span className="truncate max-w-[240px] font-medium">{file.name}</span>
          <button
            type="button"
            onClick={() => onFile(null)}
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Remover arquivo"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <Upload className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground text-center">
            Arraste um arquivo ou{' '}
            <label className="text-primary cursor-pointer hover:underline">
              clique para selecionar
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handleChange}
              />
            </label>
          </p>
          <p className="text-xs text-muted-foreground">PDF, JPG, PNG ate 10MB</p>
        </>
      )}
    </div>
  )
}

// ---- ItemCheckRow ----

interface ItemCheckRowProps {
  item: CostItem
  isSelected: boolean
  allocatedAmount: string
  onToggle: () => void
  onAmountChange: (value: string) => void
}

function ItemCheckRow({
  item,
  isSelected,
  allocatedAmount,
  onToggle,
  onAmountChange,
}: ItemCheckRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md border p-3 transition-colors',
        isSelected ? 'border-primary/50 bg-primary/5' : 'border-border',
      )}
    >
      <Checkbox
        id={`item-${item.id}`}
        checked={isSelected}
        onCheckedChange={onToggle}
        className="shrink-0"
      />
      <label
        htmlFor={`item-${item.id}`}
        className="flex-1 min-w-0 cursor-pointer"
      >
        <span className="text-sm font-medium block truncate">
          {item.item_number}.{item.sub_item_number} — {item.service_description}
        </span>
        <span className="text-xs text-muted-foreground">
          {item.vendor_name_snapshot ? `${item.vendor_name_snapshot} · ` : ''}
          {formatCurrency(item.total_with_overtime)}
        </span>
      </label>
      {isSelected && (
        <div className="shrink-0 w-32">
          <Input
            type="text"
            placeholder="R$ alocado"
            value={allocatedAmount}
            onChange={e => onAmountChange(e.target.value)}
            className="h-8 text-sm"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

// ---- PaymentProofDialog (main) ----

export function PaymentProofDialog({
  open,
  onOpenChange,
  jobId,
  availableItems,
  preselectedItemId,
}: PaymentProofDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [paymentDate, setPaymentDate] = useState('')
  const [bankReference, setBankReference] = useState('')
  const [amount, setAmount] = useState('')
  const [payerName, setPayerName] = useState('')
  const [selectedItems, setSelectedItems] = useState<SelectedItemState[]>(
    // Pre-seleciona o item se fornecido
    preselectedItemId
      ? [{ costItemId: preselectedItemId, allocatedAmount: '' }]
      : [],
  )

  const { mutateAsync: uploadProof, isPending } = useUploadPaymentProof()

  // Reset ao fechar
  function handleOpenChange(value: boolean) {
    if (!value) {
      setFile(null)
      setIsUploadingFile(false)
      setPaymentDate('')
      setBankReference('')
      setAmount('')
      setPayerName('')
      setSelectedItems(
        preselectedItemId
          ? [{ costItemId: preselectedItemId, allocatedAmount: '' }]
          : [],
      )
    }
    onOpenChange(value)
  }

  function isItemSelected(costItemId: string): boolean {
    return selectedItems.some(s => s.costItemId === costItemId)
  }

  function getAllocatedAmount(costItemId: string): string {
    return selectedItems.find(s => s.costItemId === costItemId)?.allocatedAmount ?? ''
  }

  function toggleItem(costItemId: string) {
    setSelectedItems(prev => {
      if (prev.some(s => s.costItemId === costItemId)) {
        return prev.filter(s => s.costItemId !== costItemId)
      }
      return [...prev, { costItemId, allocatedAmount: '' }]
    })
  }

  function updateAllocatedAmount(costItemId: string, value: string) {
    setSelectedItems(prev =>
      prev.map(s =>
        s.costItemId === costItemId ? { ...s, allocatedAmount: value } : s,
      ),
    )
  }

  // Upload do arquivo para o Supabase Storage e retorna a URL publica
  const uploadFileToStorage = useCallback(async (f: File): Promise<string> => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error('Sessao expirada')

    const ext = f.name.split('.').pop() ?? 'bin'
    const path = `payment-proofs/${jobId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage
      .from('cost-documents')
      .upload(path, f, { contentType: f.type, upsert: false })

    if (error) throw new Error(`Erro ao enviar arquivo: ${error.message}`)

    const { data: urlData } = supabase.storage
      .from('cost-documents')
      .getPublicUrl(path)

    return urlData.publicUrl
  }, [jobId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!file) {
      toast.error('Selecione um arquivo de comprovante')
      return
    }

    if (!paymentDate) {
      toast.error('Informe a data do pagamento')
      return
    }

    if (selectedItems.length === 0) {
      toast.error('Selecione ao menos um item de custo para vincular')
      return
    }

    try {
      // 1. Upload do arquivo para storage
      setIsUploadingFile(true)
      let fileUrl: string
      try {
        fileUrl = await uploadFileToStorage(file)
      } finally {
        setIsUploadingFile(false)
      }

      // 2. Parsear valor total
      const parsedAmount = amount.trim() ? parseBRNumber(amount) ?? undefined : undefined

      // 3. Montar vinculos com cost items
      const linkItems = selectedItems.map(s => ({
        cost_item_id: s.costItemId,
        allocated_amount: s.allocatedAmount.trim()
          ? (parseBRNumber(s.allocatedAmount) ?? undefined)
          : undefined,
      }))

      // 4. Criar comprovante no backend
      await uploadProof({
        job_id: jobId,
        file_url: fileUrl,
        file_name: file.name,
        payment_date: paymentDate,
        bank_reference: bankReference.trim() || undefined,
        amount: parsedAmount,
        payer_name: payerName.trim() || undefined,
        link_items: linkItems,
      })

      toast.success('Comprovante vinculado com sucesso')
      handleOpenChange(false)
    } catch (err) {
      setIsUploadingFile(false)
      toast.error(safeErrorMessage(err))
    }
  }

  const isProcessing = isPending || isUploadingFile

  // Itens que podem ser vinculados (exclui headers e cancelados)
  const linkableItems = availableItems.filter(
    item => !item.is_category_header && item.payment_status !== 'cancelado',
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Vincular Comprovante de Pagamento
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-1">
          {/* Upload de arquivo */}
          <div className="space-y-2">
            <Label>Arquivo do Comprovante</Label>
            <FileUploadZone
              file={file}
              onFile={setFile}
              isUploading={isUploadingFile}
            />
          </div>

          {/* Data do pagamento */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="proof-payment-date">
                Data do Pagamento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="proof-payment-date"
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                required
                disabled={isProcessing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proof-amount">Valor Total (R$)</Label>
              <Input
                id="proof-amount"
                type="text"
                placeholder="Ex: 5.000,00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Referencia bancaria e pagador */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="proof-reference">Referencia Bancaria</Label>
              <Input
                id="proof-reference"
                placeholder="ID da transacao, etc."
                value={bankReference}
                onChange={e => setBankReference(e.target.value)}
                disabled={isProcessing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proof-payer">Pagador</Label>
              <Input
                id="proof-payer"
                placeholder="Nome ou empresa"
                value={payerName}
                onChange={e => setPayerName(e.target.value)}
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Selecao de itens de custo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Itens de Custo{' '}
                <span className="text-muted-foreground font-normal">
                  (selecione um ou mais)
                </span>
              </Label>
              {selectedItems.length > 0 && (
                <span className="text-xs text-primary font-medium">
                  {selectedItems.length} selecionado(s)
                </span>
              )}
            </div>

            {linkableItems.length === 0 ? (
              <p className="text-sm text-muted-foreground rounded-md border border-dashed border-border p-4 text-center">
                Nenhum item de custo disponivel para vinculacao.
              </p>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {linkableItems.map(item => (
                  <ItemCheckRow
                    key={item.id}
                    item={item}
                    isSelected={isItemSelected(item.id)}
                    allocatedAmount={getAllocatedAmount(item.id)}
                    onToggle={() => toggleItem(item.id)}
                    onAmountChange={value => updateAllocatedAmount(item.id, value)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Resumo de alocacao */}
          {selectedItems.length > 0 && (() => {
            const totalAllocated = selectedItems.reduce((sum, s) => {
              const v = s.allocatedAmount.trim() ? parseBRNumber(s.allocatedAmount) : null
              return sum + (v ?? 0)
            }, 0)
            const totalAmount = amount.trim() ? parseBRNumber(amount) : null

            if (!totalAmount && totalAllocated === 0) return null

            return (
              <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1 text-sm">
                {totalAmount != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor total do comprovante</span>
                    <span className="font-medium tabular-nums">{formatCurrency(totalAmount)}</span>
                  </div>
                )}
                {totalAllocated > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total alocado aos itens</span>
                    <span className={cn(
                      'font-medium tabular-nums',
                      totalAmount != null && totalAllocated > totalAmount
                        ? 'text-destructive'
                        : 'text-foreground',
                    )}>
                      {formatCurrency(totalAllocated)}
                    </span>
                  </div>
                )}
                {totalAmount != null && totalAllocated > 0 && totalAllocated > totalAmount && (
                  <p className="text-xs text-destructive">
                    Valor alocado excede o total do comprovante.
                  </p>
                )}
              </div>
            )
          })()}
        </form>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isProcessing || !file || !paymentDate || selectedItems.length === 0}
            onClick={handleSubmit}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isUploadingFile ? 'Enviando arquivo...' : 'Vinculando...'}
              </>
            ) : (
              'Vincular Comprovante'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
