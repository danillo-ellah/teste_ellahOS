'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { apiGet } from '@/lib/api'
import { jobKeys } from '@/lib/query-keys'
import type { AttendanceItem } from '@/types/production-diary'

interface AttendanceSectionProps {
  jobId: string
  attendance: AttendanceItem[]
  onChange: (attendance: AttendanceItem[]) => void
}

interface TeamMember {
  id: string
  person_id: string | null
  person_name: string
  role_in_job: string
  hiring_status: string
}

export function AttendanceSection({ jobId, attendance, onChange }: AttendanceSectionProps) {
  const [showAddExtra, setShowAddExtra] = useState(false)
  const [extraName, setExtraName] = useState('')
  const [extraRole, setExtraRole] = useState('')

  // Busca equipe confirmada para pre-popular
  const { data: teamMembers } = useQuery({
    queryKey: [...jobKeys.team(jobId), 'confirmed'],
    queryFn: async () => {
      const res = await apiGet<TeamMember[]>('jobs-team', {}, jobId)
      return (res.data ?? []).filter((m) => m.hiring_status === 'confirmado')
    },
    staleTime: 60_000,
    enabled: !!jobId,
  })

  // Pre-popula a lista de presenca com membros confirmados se attendance esta vazio
  function handlePrePopulate() {
    if (!teamMembers || teamMembers.length === 0) return
    const items: AttendanceItem[] = teamMembers.map((m) => ({
      person_id: m.person_id,
      person_name: m.person_name,
      role: m.role_in_job,
      present: true,
      arrival_time: null,
      notes: null,
    }))
    onChange(items)
  }

  function updateItem(index: number, partial: Partial<AttendanceItem>) {
    const updated = attendance.map((a, i) => (i === index ? { ...a, ...partial } : a))
    onChange(updated)
  }

  function addExtra() {
    if (!extraName.trim()) return
    const newItem: AttendanceItem = {
      person_id: null,
      person_name: extraName.trim(),
      role: extraRole.trim() || 'participante',
      present: true,
      arrival_time: null,
      notes: null,
    }
    onChange([...attendance, newItem])
    setExtraName('')
    setExtraRole('')
    setShowAddExtra(false)
  }

  function removeItem(index: number) {
    onChange(attendance.filter((_, i) => i !== index))
  }

  const presentCount = attendance.filter((a) => a.present).length
  const totalCount = attendance.length

  return (
    <div className="space-y-3">
      {/* Header com contagem */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="size-4" />
          <span>{presentCount}/{totalCount} presentes</span>
        </div>
      )}

      {/* Botao pre-popular se vazio */}
      {totalCount === 0 && teamMembers && teamMembers.length > 0 && (
        <Button type="button" variant="outline" size="sm" onClick={handlePrePopulate} className="h-9">
          <Users className="size-3.5 mr-1.5" />
          Carregar equipe confirmada ({teamMembers.length})
        </Button>
      )}

      {/* Lista de presenca */}
      {attendance.map((item, i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-3 rounded-md border border-border bg-muted/30"
        >
          <Checkbox
            checked={item.present}
            onCheckedChange={(checked) =>
              updateItem(i, { present: checked === true })
            }
            className="mt-0.5 shrink-0"
          />
          <div className="flex-1 min-w-0 space-y-2">
            {/* Nome e funcao */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium truncate flex-1">
                {item.person_name}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {item.role}
              </span>
            </div>
            {/* Horario e obs — empilhados em mobile, lado a lado em sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                type="time"
                placeholder="Horario de chegada"
                value={item.arrival_time ?? ''}
                onChange={(e) =>
                  updateItem(i, { arrival_time: e.target.value || null })
                }
                className="h-9 text-sm"
              />
              <Input
                placeholder="Observacao"
                value={item.notes ?? ''}
                onChange={(e) =>
                  updateItem(i, { notes: e.target.value || null })
                }
                className="h-9 text-sm"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-muted-foreground hover:text-destructive mt-0.5"
            onClick={() => removeItem(i)}
            aria-label={`Remover ${item.person_name}`}
          >
            <span className="text-base leading-none">&times;</span>
          </Button>
        </div>
      ))}

      {/* Adicionar participante extra */}
      {showAddExtra ? (
        <div className="space-y-2 p-3 rounded-md border border-border bg-muted/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              placeholder="Nome do participante"
              value={extraName}
              onChange={(e) => setExtraName(e.target.value)}
              className="h-10 text-sm"
            />
            <Input
              placeholder="Funcao (ex: camarero)"
              value={extraRole}
              onChange={(e) => setExtraRole(e.target.value)}
              className="h-10 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={addExtra} disabled={!extraName.trim()} className="h-9">
              Adicionar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddExtra(false)}
              className="h-9"
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddExtra(true)}
          className="h-9"
        >
          <Plus className="size-3.5 mr-1.5" />
          Adicionar participante
        </Button>
      )}
    </div>
  )
}
