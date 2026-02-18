'use client'

import Link from 'next/link'
import { ArrowLeft, Pencil, Save, X, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Agency } from '@/types/clients'

interface AgencyHeaderProps {
  agency: Agency
  isEditing: boolean
  isSaving: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
}

export function AgencyHeader({
  agency,
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancel,
}: AgencyHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
          <Link href="/agencies" aria-label="Voltar para agencias">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>

        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xl font-semibold tracking-tight truncate" title={agency.name}>
              {agency.name}
            </h1>
            <Badge
              variant={agency.is_active ? 'default' : 'secondary'}
              className={
                agency.is_active
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-xs'
                  : 'bg-zinc-500/10 text-zinc-500 text-xs'
              }
            >
              {agency.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          {agency.trading_name && (
            <span className="text-sm text-muted-foreground truncate">
              {agency.trading_name}
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
