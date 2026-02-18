'use client'

import Link from 'next/link'
import { ArrowLeft, Pencil, Save, X, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PERSON_TYPE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Person } from '@/types/people'

interface PersonHeaderProps {
  person: Person
  isEditing: boolean
  isSaving: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
}

export function PersonHeader({
  person,
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
}: PersonHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
          <Link href="/people" aria-label="Voltar para equipe">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>

        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xl font-semibold tracking-tight truncate" title={person.full_name}>
              {person.full_name}
            </h1>
            <Badge
              variant="secondary"
              className={cn(
                'text-xs font-normal',
                person.is_internal
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
              )}
            >
              {person.is_internal ? PERSON_TYPE_LABELS.internal : PERSON_TYPE_LABELS.freelancer}
            </Badge>
            <Badge
              variant={person.is_active ? 'default' : 'secondary'}
              className={
                person.is_active
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs'
                  : 'bg-zinc-500/10 text-zinc-500 text-xs'
              }
            >
              {person.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          {person.profession && (
            <span className="text-sm text-muted-foreground truncate">
              {person.profession}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isEditing ? (
          <>
            <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
              <X className="size-4" />
              Cancelar
            </Button>
            <Button size="sm" onClick={onSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="size-4" />
            Editar
          </Button>
        )}
      </div>
    </div>
  )
}
