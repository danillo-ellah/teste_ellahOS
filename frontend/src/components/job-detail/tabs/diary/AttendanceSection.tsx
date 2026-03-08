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
        <Button type="button" variant="outline" size="sm" onClick={handlePrePopulate}>
          <Users className="size-3.5 mr-1.5" />
          Carregar equipe confirmada ({teamMembers.length})
        </Button>
      )}

      {/* Lista de presenca */}
      {attendance.map((item, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-2 rounded-md border border-border bg-muted/30"
        >
          <Checkbox
            checked={item.present}
            onCheckedChange={(checked) =>
              updateItem(i, { present: checked === true })
            }
          />
          <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
            <span className="text-sm font-medium truncate sm:col-span-1">
              {item.person_name}
            </span>
            <span className="text-xs text-muted-foreground sm:col-span-1">
              {item.role}
            </span>
            <Input
              type="time"
              placeholder="Chegada"
              value={item.arrival_time ?? ''}
              onChange={(e) =>
                updateItem(i, { arrival_time: e.target.value || null })
              }
              className="h-7 text-xs sm:col-span-1"
            />
            <Input
              placeholder="Obs"
              value={item.notes ?? ''}
              onChange={(e) =>
                updateItem(i, { notes: e.target.value || null })
              }
              className="h-7 text-xs sm:col-span-1"
            />
          </div>
          <button
            type="button"
            className="text-muted-foreground hover:text-destructive text-xs shrink-0"
            onClick={() => removeItem(i)}
          >
            &times;
          </button>
        </div>
      ))}

      {/* Adicionar participante extra */}
      {showAddExtra ? (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Nome"
            value={extraName}
            onChange={(e) => setExtraName(e.target.value)}
            className="h-8 text-sm"
          />
          <Input
            placeholder="Funcao"
            value={extraRole}
            onChange={(e) => setExtraRole(e.target.value)}
            className="h-8 text-sm w-32"
          />
          <Button type="button" size="sm" onClick={addExtra} disabled={!extraName.trim()}>
            OK
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAddExtra(false)}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddExtra(true)}
        >
          <Plus className="size-3.5 mr-1.5" />
          Adicionar participante
        </Button>
      )}
    </div>
  )
}
