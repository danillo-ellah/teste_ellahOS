'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, Pencil, X, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useUpdatePosBriefing } from '@/hooks/usePosProducao'
import { useUserRole } from '@/hooks/useUserRole'
import { POS_BRIEFING_FIELDS } from '@/types/pos-producao'
import type { PosBriefing } from '@/types/pos-producao'
import { ApiRequestError } from '@/lib/api'

const CAN_EDIT_BRIEFING_ROLES = ['admin', 'ceo', 'produtor_executivo', 'coordenador']

interface PosBriefingPanelProps {
  deliverableId: string
  jobId: string
  briefing: PosBriefing | null
}

export function PosBriefingPanel({ deliverableId, jobId, briefing }: PosBriefingPanelProps) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<PosBriefing>(briefing ?? {})
  const { role } = useUserRole()
  const { mutateAsync: updateBriefing, isPending } = useUpdatePosBriefing(jobId)

  const canEdit = role !== null && CAN_EDIT_BRIEFING_ROLES.includes(role)

  const filledCount = POS_BRIEFING_FIELDS.filter(
    (f) => briefing?.[f.key] != null && briefing[f.key] !== '',
  ).length

  async function handleSave() {
    try {
      const cleaned: PosBriefing = {}
      for (const f of POS_BRIEFING_FIELDS) {
        const val = form[f.key]
        cleaned[f.key] = val && val.toString().trim() !== '' ? val : null
      }
      await updateBriefing({ deliverableId, briefing: cleaned })
      toast.success('Briefing tecnico salvo')
      setEditing(false)
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao salvar briefing'
      toast.error(msg)
    }
  }

  function handleCancel() {
    setForm(briefing ?? {})
    setEditing(false)
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-primary transition-colors"
          >
            {open ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
            Briefing Tecnico
          </button>
        </CollapsibleTrigger>
        <span className="text-xs text-muted-foreground">
          {filledCount}/{POS_BRIEFING_FIELDS.length} campos
        </span>
        {canEdit && !editing && open && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 ml-auto"
            onClick={() => setEditing(true)}
            aria-label="Editar briefing"
          >
            <Pencil className="size-3" />
          </Button>
        )}
      </div>

      <CollapsibleContent className="mt-3">
        {editing ? (
          <div className="space-y-3">
            {POS_BRIEFING_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  {f.label}
                </label>
                {f.key === 'notas_tecnicas' ? (
                  <Textarea
                    value={form[f.key] ?? ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="text-xs min-h-[80px]"
                    disabled={isPending}
                  />
                ) : (
                  <Input
                    value={form[f.key] ?? ''}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="h-8 text-xs"
                    disabled={isPending}
                  />
                )}
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={handleSave} disabled={isPending} className="h-8">
                <Save className="size-3.5" />
                Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isPending} className="h-8">
                <X className="size-3.5" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {POS_BRIEFING_FIELDS.map((f) => {
              const val = briefing?.[f.key]
              return (
                <div key={f.key} className="flex flex-col gap-0.5">
                  <span className="text-xs text-muted-foreground">{f.label}</span>
                  <span className={`text-xs ${val ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                    {val ?? 'Nao definido'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
