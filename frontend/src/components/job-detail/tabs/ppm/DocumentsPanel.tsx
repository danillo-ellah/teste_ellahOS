'use client'

import { useState } from 'react'
import {
  FolderOpen,
  FileText,
  FileEdit,
  CalendarDays,
  PenLine,
  ExternalLink,
  Pencil,
  Check,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { LucideIcon } from 'lucide-react'
import type { JobDetail } from '@/types/jobs'

interface DocumentLink {
  field: keyof JobDetail
  label: string
  icon: LucideIcon
}

const DOCUMENT_LINKS: DocumentLink[] = [
  { field: 'drive_folder_url', label: 'Pasta Drive', icon: FolderOpen },
  { field: 'ppm_url', label: 'Documento PPM', icon: FileText },
  { field: 'script_url', label: 'Roteiro', icon: FileEdit },
  { field: 'pre_production_url', label: 'Pasta Pre-Producao', icon: FolderOpen },
  { field: 'schedule_url', label: 'Cronograma', icon: CalendarDays },
  { field: 'contracts_folder_url', label: 'Contratos', icon: PenLine },
]

interface DocumentsPanelProps {
  job: JobDetail
  canEdit: boolean
  onSave: (fields: Record<string, unknown>) => void
}

export function DocumentsPanel({ job, canEdit, onSave }: DocumentsPanelProps) {
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  function startEdit(field: string, currentValue: string) {
    setEditing(field)
    setEditValue(currentValue)
  }

  function cancelEdit() {
    setEditing(null)
    setEditValue('')
  }

  function saveEdit(field: string) {
    onSave({ [field]: editValue.trim() || null })
    setEditing(null)
    setEditValue('')
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
          <FolderOpen className="size-4" />
          Documentos e Links
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {DOCUMENT_LINKS.map(({ field, label, icon: Icon }) => {
            const value = (job[field] as string) ?? ''
            const isEditing = editing === field

            return (
              <li key={field} className="flex items-center gap-3 min-h-[36px]">
                <Icon className="size-4 text-muted-foreground shrink-0" />

                {isEditing ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <Input
                      type="url"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="https://..."
                      className="h-8 text-sm flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(field)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => saveEdit(field)}
                    >
                      <Check className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={cancelEdit}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm flex-1 truncate">
                      {value ? (
                        <a
                          href={value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {label}
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground">{label} — nao informado</span>
                      )}
                    </span>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        onClick={() => startEdit(field, value)}
                      >
                        <Pencil className="size-3" />
                      </Button>
                    )}
                  </>
                )}
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
