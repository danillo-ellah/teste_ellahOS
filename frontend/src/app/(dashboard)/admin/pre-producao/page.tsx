'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  ClipboardList,
  Plus,
  Trash2,
  Pencil,
  Sparkles,
  Loader2,
  GripVertical,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { safeErrorMessage } from '@/lib/api'
import {
  useTemplateList,
  useCreateTemplate,
  useUpdateTemplate,
  useDeactivateTemplate,
  useSeedTemplates,
} from '@/hooks/usePreproductionTemplates'
import type { ChecklistTemplate, TemplateItem } from '@/types/preproduction'

// --- Constantes ---

const PROJECT_TYPE_LABELS: Record<string, string> = {
  filme_publicitario: 'Filme Publicitario',
  branded_content: 'Branded Content',
  videoclipe: 'Videoclipe',
  documentario: 'Documentario',
  conteudo_digital: 'Conteudo Digital',
  evento_livestream: 'Evento / Livestream',
  institucional: 'Institucional',
  motion_graphics: 'Motion Graphics',
  fotografia: 'Fotografia',
  outro: 'Outro',
}

// --- Componente do formulario de template ---

interface TemplateFormState {
  projectType: string | null
  name: string
  items: Array<{ id?: string; label: string; position: number }>
}

function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSave,
  saving,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: ChecklistTemplate | null
  onSave: (data: TemplateFormState) => void
  saving: boolean
}) {
  const isEdit = !!template
  const [projectType, setProjectType] = useState<string | null>(
    template?.project_type ?? null,
  )
  const [name, setName] = useState(template?.name ?? '')
  const [items, setItems] = useState<Array<{ id?: string; label: string; position: number }>>(
    template?.items?.map((i) => ({ id: i.id, label: i.label, position: i.position })) ?? [
      { label: '', position: 1 },
    ],
  )
  const [newItemLabel, setNewItemLabel] = useState('')

  function addItem() {
    const label = newItemLabel.trim()
    if (!label) return
    setItems([...items, { label, position: items.length + 1 }])
    setNewItemLabel('')
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx).map((item, i) => ({ ...item, position: i + 1 })))
  }

  function updateItemLabel(idx: number, label: string) {
    setItems(items.map((item, i) => (i === idx ? { ...item, label } : item)))
  }

  function handleSave() {
    if (!name.trim() || items.length === 0 || items.some((i) => !i.label.trim())) return
    onSave({
      projectType,
      name: name.trim(),
      items: items.map((i, idx) => ({ ...i, label: i.label.trim(), position: idx + 1 })),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar template' : 'Novo template de checklist'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!isEdit && (
            <div>
              <Label>Tipo de projeto</Label>
              <Select
                value={projectType ?? '__default__'}
                onValueChange={(v) =>
                  setProjectType(v === '__default__' ? null : v)
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">
                    Padrao Geral (fallback)
                  </SelectItem>
                  {Object.entries(PROJECT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="tpl-name">Nome do template</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Checklist Filme Publicitario"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Itens do checklist</Label>
            <ul className="mt-2 space-y-2">
              {items.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <GripVertical className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground w-5">
                    {idx + 1}.
                  </span>
                  <Input
                    value={item.label}
                    onChange={(e) => updateItemLabel(idx, e.target.value)}
                    placeholder="Descricao do item"
                    className="h-8 text-sm flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-destructive"
                    onClick={() => removeItem(idx)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Novo item..."
                value={newItemLabel}
                onChange={(e) => setNewItemLabel(e.target.value)}
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addItem()
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 shrink-0"
                onClick={addItem}
                disabled={!newItemLabel.trim()}
              >
                <Plus className="size-3 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              saving ||
              !name.trim() ||
              items.length === 0 ||
              items.some((i) => !i.label.trim())
            }
          >
            {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
            {isEdit ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Pagina principal ---

export default function PreProducaoSettingsPage() {
  const { data: templatesResponse, isLoading } = useTemplateList({
    include_inactive: 'true',
  })
  const createMutation = useCreateTemplate()
  const updateMutation = useUpdateTemplate()
  const deactivateMutation = useDeactivateTemplate()
  const seedMutation = useSeedTemplates()

  const [formOpen, setFormOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)

  const templates = templatesResponse?.data ?? []
  const activeTemplates = templates.filter((t) => t.is_active)

  function handleCreate(data: TemplateFormState) {
    createMutation.mutate(
      {
        project_type: data.projectType,
        name: data.name,
        items: data.items.map((i) => ({ label: i.label, position: i.position })),
      },
      {
        onSuccess: () => {
          toast.success('Template criado')
          setFormOpen(false)
        },
        onError: (err) => toast.error(safeErrorMessage(err)),
      },
    )
  }

  function handleUpdate(data: TemplateFormState) {
    if (!editingTemplate) return
    updateMutation.mutate(
      {
        id: editingTemplate.id,
        name: data.name,
        items: data.items.map((i) => ({
          id: i.id ?? crypto.randomUUID(),
          label: i.label,
          position: i.position,
        })),
      },
      {
        onSuccess: () => {
          toast.success('Template atualizado')
          setEditingTemplate(null)
        },
        onError: (err) => toast.error(safeErrorMessage(err)),
      },
    )
  }

  function handleDeactivate(id: string) {
    deactivateMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Template desativado')
        setDeactivatingId(null)
      },
      onError: (err) => toast.error(safeErrorMessage(err)),
    })
  }

  function handleSeed() {
    seedMutation.mutate(undefined, {
      onSuccess: (res) => {
        const count = (res as { data?: { templates_created?: number } })?.data?.templates_created ?? 0
        toast.success(`${count} templates criados`)
      },
      onError: (err) => toast.error(safeErrorMessage(err)),
    })
  }

  function openEdit(t: ChecklistTemplate) {
    setEditingTemplate(t)
  }

  function openNew() {
    setEditingTemplate(null)
    setFormOpen(true)
  }

  if (isLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Carregando templates...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ClipboardList className="size-6" />
            Templates de Pre-Producao
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure os checklists padrao para cada tipo de projeto
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="size-4 mr-1.5" />
          Novo template
        </Button>
      </div>

      {/* Seed banner */}
      {activeTemplates.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8">
            <div className="flex flex-col items-center text-center gap-3">
              <Sparkles className="size-8 text-amber-500" />
              <div>
                <p className="text-sm font-medium">
                  Nenhum template configurado
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Carregue os templates sugeridos para comecar rapidamente ou
                  crie os seus do zero.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleSeed}
                disabled={seedMutation.isPending}
              >
                {seedMutation.isPending && (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                )}
                <Sparkles className="size-4 mr-1.5" />
                Carregar templates sugeridos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid de templates */}
      {templates.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((t) => (
            <Card
              key={t.id}
              className={!t.is_active ? 'opacity-50' : undefined}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-medium truncate">
                      {t.name}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {t.project_type
                        ? PROJECT_TYPE_LABELS[t.project_type] ?? t.project_type
                        : 'Padrao Geral'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    {!t.is_active && (
                      <Badge variant="outline" className="text-[10px] h-5">
                        Inativo
                      </Badge>
                    )}
                    {t.is_active && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => openEdit(t)}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive"
                          onClick={() => setDeactivatingId(t.id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {t.items.slice(0, 5).map((item: TemplateItem) => (
                    <li key={item.id} className="truncate">
                      {item.position}. {item.label}
                    </li>
                  ))}
                  {t.items.length > 5 && (
                    <li className="text-xs italic">
                      +{t.items.length - 5} mais...
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <TemplateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        template={null}
        onSave={handleCreate}
        saving={createMutation.isPending}
      />

      {editingTemplate && (
        <TemplateFormDialog
          open={!!editingTemplate}
          onOpenChange={(open) => {
            if (!open) setEditingTemplate(null)
          }}
          template={editingTemplate}
          onSave={handleUpdate}
          saving={updateMutation.isPending}
        />
      )}

      <AlertDialog
        open={!!deactivatingId}
        onOpenChange={() => setDeactivatingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar template?</AlertDialogTitle>
            <AlertDialogDescription>
              O template sera desativado. Jobs que ja copiaram este checklist nao
              serao afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deactivatingId && handleDeactivate(deactivatingId)}
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
