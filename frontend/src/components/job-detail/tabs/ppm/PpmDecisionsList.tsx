'use client'

import { useState } from 'react'
import { MessageSquare, Plus, Pencil, Trash2, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PpmDecisionDialog } from './PpmDecisionDialog'
import type { PpmDecision } from '@/types/preproduction'

interface PpmDecisionsListProps {
  decisions: PpmDecision[]
  currentUserName: string
  userRole: string
  onChange: (decisions: PpmDecision[]) => void
}

export function PpmDecisionsList({
  decisions,
  currentUserName,
  userRole,
  onChange,
}: PpmDecisionsListProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDecision, setEditingDecision] = useState<PpmDecision | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const canManage = ['ceo', 'admin', 'produtor_executivo'].includes(userRole)

  function handleSave(decision: PpmDecision) {
    const existing = decisions.find((d) => d.id === decision.id)
    if (existing) {
      onChange(decisions.map((d) => (d.id === decision.id ? decision : d)))
    } else {
      onChange([decision, ...decisions])
    }
  }

  function handleDelete(id: string) {
    onChange(decisions.filter((d) => d.id !== id))
    setDeletingId(null)
  }

  function openEdit(d: PpmDecision) {
    setEditingDecision(d)
    setDialogOpen(true)
  }

  function openNew() {
    setEditingDecision(null)
    setDialogOpen(true)
  }

  const sorted = [...decisions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
              <MessageSquare className="size-4" />
              Decisoes da PPM
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={openNew}
            >
              <Plus className="size-3 mr-1" />
              Nova decisao
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma decisao registrada
            </p>
          ) : (
            <ul className="space-y-3">
              {sorted.map((d) => {
                const canEdit =
                  canManage || d.created_by_name === currentUserName

                return (
                  <li
                    key={d.id}
                    className="rounded-lg border p-3 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{d.description}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                          <span>{new Date(d.date).toLocaleDateString('pt-BR')}</span>
                          {d.responsible && (
                            <span className="flex items-center gap-0.5">
                              <User className="size-3" />
                              {d.responsible}
                            </span>
                          )}
                          <span>por {d.created_by_name}</span>
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => openEdit(d)}
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive"
                            onClick={() => setDeletingId(d.id)}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <PpmDecisionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        decision={editingDecision}
        currentUserName={currentUserName}
        onSave={handleSave}
      />

      <AlertDialog
        open={!!deletingId}
        onOpenChange={() => setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir decisao?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. A decisao sera removida
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
