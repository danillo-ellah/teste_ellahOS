'use client'

import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdatePosStage } from '@/hooks/usePosProducao'
import { useUserRole } from '@/hooks/useUserRole'
import { POS_STAGE_MAP, POS_BLOCK_COLORS } from '@/types/pos-producao'
import type { PosStage, PosStageBlock } from '@/types/pos-producao'
import { ApiRequestError } from '@/lib/api'
import { cn } from '@/lib/utils'

const BLOCK_LABELS: Record<PosStageBlock, string> = {
  pre: 'Pre',
  offline: 'Offline',
  online: 'Online',
  entrega: 'Entrega',
}

const CAN_CHANGE_STAGE_ROLES = ['admin', 'ceo', 'produtor_executivo', 'coordenador']

interface PosStageSelectProps {
  deliverableId: string
  jobId: string
  currentStage: PosStage | null
}

export function PosStageSelect({ deliverableId, jobId, currentStage }: PosStageSelectProps) {
  const { role } = useUserRole()
  const { mutateAsync: updateStage, isPending } = useUpdatePosStage(jobId)

  const canChange = role !== null && CAN_CHANGE_STAGE_ROLES.includes(role)

  async function handleChange(value: string) {
    try {
      await updateStage({ deliverableId, posStage: value as PosStage })
      toast.success('Etapa atualizada')
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : 'Erro ao atualizar etapa'
      toast.error(msg)
    }
  }

  // Agrupa stages por bloco
  const blocks: PosStageBlock[] = ['pre', 'offline', 'online', 'entrega']
  const grouped = blocks.map((block) => ({
    block,
    stages: POS_STAGE_MAP.filter((s) => s.block === block),
  }))

  const currentInfo = POS_STAGE_MAP.find((s) => s.value === currentStage)
  const blockColors = currentInfo ? POS_BLOCK_COLORS[currentInfo.block] : null

  return (
    <Select
      value={currentStage ?? ''}
      onValueChange={handleChange}
      disabled={!canChange || isPending}
    >
      <SelectTrigger
        className={cn(
          'h-8 text-xs w-full min-w-0',
          blockColors ? `${blockColors.bg} ${blockColors.text} border-0` : '',
        )}
      >
        <SelectValue placeholder="Sem etapa" />
      </SelectTrigger>
      <SelectContent>
        {grouped.map(({ block, stages }) => {
          const colors = POS_BLOCK_COLORS[block]
          return (
            <SelectGroup key={block}>
              <SelectLabel
                className={cn('text-xs font-semibold', colors.text)}
              >
                {BLOCK_LABELS[block]}
              </SelectLabel>
              {stages.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectGroup>
          )
        })}
      </SelectContent>
    </Select>
  )
}
