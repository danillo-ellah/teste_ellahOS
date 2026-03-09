'use client'

import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useJobTeam } from '@/hooks/useJobTeam'
import { useUpdatePosAssignee } from '@/hooks/usePosProducao'
import { ApiRequestError } from '@/lib/api'

interface PosAssigneeSelectProps {
  deliverableId: string
  jobId: string
  currentAssigneeId: string | null
}

export function PosAssigneeSelect({ deliverableId, jobId, currentAssigneeId }: PosAssigneeSelectProps) {
  const { data: team, isLoading } = useJobTeam(jobId)
  const { mutateAsync: updateAssignee, isPending } = useUpdatePosAssignee(jobId)

  async function handleChange(value: string) {
    const assigneeId = value === '__none__' ? null : value
    try {
      await updateAssignee({ deliverableId, assigneeId })
      toast.success('Responsavel atualizado')
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao atualizar responsavel'
      toast.error(msg)
    }
  }

  const members = team ?? []

  return (
    <Select
      value={currentAssigneeId ?? '__none__'}
      onValueChange={handleChange}
      disabled={isLoading || isPending}
    >
      <SelectTrigger className="h-8 text-xs w-full min-w-0">
        <SelectValue placeholder="Sem responsavel" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__" className="text-xs text-muted-foreground">
          Sem responsavel
        </SelectItem>
        {members.map((m) => (
          <SelectItem key={m.person_id} value={m.person_id} className="text-xs">
            {m.person_name ?? m.person_id}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
