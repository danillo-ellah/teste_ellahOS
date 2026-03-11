'use client'

import { useState } from 'react'
import { XCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ---------------------------------------------------------------------------
// Tipos publicos
// ---------------------------------------------------------------------------

export interface LossFeedback {
  loss_category: string
  loss_reason: string
  winner_competitor?: string
  winner_value?: number
}

interface LossFeedbackDialogProps {
  open: boolean
  onConfirm: (feedback: LossFeedback) => void
  onCancel: () => void
  opportunityTitle: string
}

// ---------------------------------------------------------------------------
// Opcoes de motivo de perda — inclui 'concorrencia' (Onda 2.4)
// ---------------------------------------------------------------------------

const LOSS_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'preco', label: 'Preco' },
  { value: 'diretor', label: 'Diretor' },
  { value: 'prazo', label: 'Prazo' },
  { value: 'escopo', label: 'Escopo' },
  { value: 'relacionamento', label: 'Relacionamento' },
  { value: 'concorrencia', label: 'Concorrencia' },
  { value: 'outro', label: 'Outro' },
]

const DETAILS_MAX_LENGTH = 1000

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function LossFeedbackDialog({
  open,
  onConfirm,
  onCancel,
  opportunityTitle,
}: LossFeedbackDialogProps) {
  const [lossCategory, setLossCategory] = useState('')
  const [lossReason, setLossReason] = useState('')
  const [winnerCompetitor, setWinnerCompetitor] = useState('')
  const [winnerValue, setWinnerValue] = useState('')

  // Limpa estado ao fechar
  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      handleCancel()
    }
  }

  function handleCancel() {
    setLossCategory('')
    setLossReason('')
    setWinnerCompetitor('')
    setWinnerValue('')
    onCancel()
  }

  function handleConfirm() {
    if (!lossCategory || !lossReason.trim()) return

    const feedback: LossFeedback = {
      loss_category: lossCategory,
      loss_reason: lossReason.trim(),
    }

    if (winnerCompetitor.trim()) {
      feedback.winner_competitor = winnerCompetitor.trim()
    }

    const parsedValue = winnerValue ? parseFloat(winnerValue) : NaN
    if (!isNaN(parsedValue) && parsedValue > 0) {
      feedback.winner_value = parsedValue
    }

    onConfirm(feedback)

    // Limpa estado apos confirmar
    setLossCategory('')
    setLossReason('')
    setWinnerCompetitor('')
    setWinnerValue('')
  }

  const canConfirm = !!lossCategory && lossReason.trim().length > 0
  const charsLeft = DETAILS_MAX_LENGTH - lossReason.length

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="size-5 shrink-0" />
            Marcar como Perdida
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome da oportunidade */}
          <p className="text-sm text-muted-foreground leading-snug">
            <span className="font-medium text-foreground">{opportunityTitle}</span>
            {' '}sera marcada como perdida. Registre o motivo para analise futura.
          </p>

          {/* Motivo principal — obrigatorio */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">
              Motivo da perda <span className="text-destructive">*</span>
            </label>
            <Select value={lossCategory} onValueChange={setLossCategory}>
              <SelectTrigger className="h-10 text-sm" aria-label="Motivo da perda">
                <SelectValue placeholder="Selecione o motivo principal..." />
              </SelectTrigger>
              <SelectContent>
                {LOSS_CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-sm">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Detalhes — obrigatorio, max 1000 chars */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">
                Detalhes <span className="text-destructive">*</span>
              </label>
              <span
                className={
                  charsLeft < 100
                    ? 'text-xs text-amber-600 dark:text-amber-400 tabular-nums'
                    : 'text-xs text-muted-foreground tabular-nums'
                }
              >
                {lossReason.length}/{DETAILS_MAX_LENGTH}
              </span>
            </div>
            <Textarea
              rows={3}
              maxLength={DETAILS_MAX_LENGTH}
              className="resize-none text-sm"
              placeholder="Conte o que aconteceu, o que decidiu o cliente..."
              value={lossReason}
              onChange={(e) => setLossReason(e.target.value)}
              aria-label="Detalhes da perda"
            />
          </div>

          {/* Concorrente que ganhou — opcional */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Concorrente que ganhou (opcional)
            </label>
            <Input
              className="h-10 text-sm"
              placeholder="Ex: Paranoid, O2 Filmes, Vetor Zero..."
              value={winnerCompetitor}
              onChange={(e) => setWinnerCompetitor(e.target.value)}
              aria-label="Concorrente que ganhou"
            />
          </div>

          {/* Valor do concorrente — opcional */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Valor do concorrente R$ (opcional)
            </label>
            <div className="flex items-center gap-1">
              <span className="flex h-10 items-center border border-r-0 rounded-l-md bg-muted/50 px-2 text-xs text-muted-foreground select-none">
                R$
              </span>
              <Input
                type="number"
                min={0}
                step={0.01}
                className="h-10 text-sm rounded-l-none"
                placeholder="0,00"
                value={winnerValue}
                onChange={(e) => setWinnerValue(e.target.value)}
                aria-label="Valor do concorrente"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            className="h-10"
            onClick={handleCancel}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-10 gap-1.5"
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            <XCircle className="size-4" />
            Confirmar Perda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
