'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Shield, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useUpdateTeamMember } from '@/hooks/useJobTeam'
import { ApiRequestError } from '@/lib/api'
import { JOB_DETAIL_TABS } from '@/lib/constants'
import type { JobTeamMember, AccessOverride } from '@/types/jobs'

interface AccessOverrideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: JobTeamMember
  jobId: string
}

type AccessLevel = 'view_edit' | 'view' | 'view_restricted' | 'hidden'

const ACCESS_LABELS: Record<AccessLevel | 'default', string> = {
  default: 'Padrao',
  view_edit: 'Editar',
  view: 'Visualizar',
  view_restricted: 'Restrito',
  hidden: 'Oculto',
}

const ACCESS_COLORS: Record<AccessLevel | 'default', string> = {
  default: 'bg-muted text-muted-foreground',
  view_edit: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  view: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  view_restricted: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  hidden: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export function AccessOverrideDialog({
  open,
  onOpenChange,
  member,
  jobId,
}: AccessOverrideDialogProps) {
  const { mutateAsync: updateMember, isPending } = useUpdateTeamMember()

  // Estado local: tabs com override
  const [overrides, setOverrides] = useState<Record<string, AccessLevel>>(() => {
    return member.access_override?.tabs
      ? { ...member.access_override.tabs } as Record<string, AccessLevel>
      : {}
  })

  function handleChange(tabId: string, value: string) {
    setOverrides((prev) => {
      const next = { ...prev }
      if (value === 'default') {
        delete next[tabId]
      } else {
        next[tabId] = value as AccessLevel
      }
      return next
    })
  }

  function handleClearAll() {
    setOverrides({})
  }

  async function handleSave() {
    try {
      const payload = Object.keys(overrides).length > 0
        ? { tabs: overrides }
        : null

      await updateMember({
        jobId,
        memberId: member.id,
        access_override: payload,
      })
      toast.success(`Permissoes de ${member.person_name ?? 'membro'} atualizadas`)
      onOpenChange(false)
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao salvar permissoes'
      toast.error(msg)
    }
  }

  const hasChanges = JSON.stringify(overrides) !== JSON.stringify(member.access_override?.tabs ?? {})
  const overrideCount = Object.keys(overrides).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="size-4" />
            Permissoes — {member.person_name ?? 'Membro'}
          </DialogTitle>
        </DialogHeader>

        <div className="text-xs text-muted-foreground mb-3">
          Selecione &quot;Padrao&quot; para usar a permissao do papel ({member.role}).
          Altere para expandir ou restringir o acesso neste job.
        </div>

        {overrideCount > 0 && (
          <div className="flex items-center justify-between mb-2">
            <Badge variant="secondary" className="text-xs">
              {overrideCount} override{overrideCount > 1 ? 's' : ''}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleClearAll} className="text-xs h-7">
              <X className="size-3 mr-1" />
              Limpar todos
            </Button>
          </div>
        )}

        <div className="space-y-1.5">
          {JOB_DETAIL_TABS.map((tab) => {
            const currentValue = overrides[tab.id] ?? 'default'
            return (
              <div key={tab.id} className="flex items-center justify-between gap-3 py-1.5 px-2 rounded hover:bg-muted/50">
                <span className="text-sm font-medium min-w-0 truncate">{tab.label}</span>
                <Select value={currentValue} onValueChange={(v) => handleChange(tab.id, v)}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">
                      <span className={ACCESS_COLORS.default + ' px-1.5 py-0.5 rounded text-xs'}>Padrao</span>
                    </SelectItem>
                    <SelectItem value="view_edit">
                      <span className={ACCESS_COLORS.view_edit + ' px-1.5 py-0.5 rounded text-xs'}>Editar</span>
                    </SelectItem>
                    <SelectItem value="view">
                      <span className={ACCESS_COLORS.view + ' px-1.5 py-0.5 rounded text-xs'}>Visualizar</span>
                    </SelectItem>
                    <SelectItem value="view_restricted">
                      <span className={ACCESS_COLORS.view_restricted + ' px-1.5 py-0.5 rounded text-xs'}>Restrito</span>
                    </SelectItem>
                    <SelectItem value="hidden">
                      <span className={ACCESS_COLORS.hidden + ' px-1.5 py-0.5 rounded text-xs'}>Oculto</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )
          })}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isPending || !hasChanges}>
            {isPending ? 'Salvando...' : 'Salvar permissoes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
