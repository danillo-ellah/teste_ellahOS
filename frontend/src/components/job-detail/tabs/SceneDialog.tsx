'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiMutate, safeErrorMessage } from '@/lib/api'
import type { StoryboardScene } from '@/types/storyboard'

// --- Zod schema ---

const sceneSchema = z.object({
  scene_number: z.number().int().min(1, 'Numero da cena deve ser maior que zero'),
  title: z.string().min(1, 'Titulo obrigatorio').max(200),
  description: z.string().max(2000).nullable().optional(),
  shot_type: z.string().nullable().optional(),
  location: z.string().max(300).nullable().optional(),
  cast_notes: z.string().max(1000).nullable().optional(),
  camera_notes: z.string().max(1000).nullable().optional(),
  status: z
    .enum(['pendente', 'em_preparo', 'filmada', 'aprovada'])
    .optional(),
})

type SceneFormValues = z.infer<typeof sceneSchema>

// --- Constants ---

const SHOT_TYPES = [
  { value: 'plano_geral', label: 'Plano Geral' },
  { value: 'plano_medio', label: 'Plano Medio' },
  { value: 'close_up', label: 'Close-up' },
  { value: 'detalhe', label: 'Detalhe' },
  { value: 'drone', label: 'Drone' },
  { value: 'pov', label: 'POV' },
  { value: 'outro', label: 'Outro' },
]

const STATUS_OPTIONS: { value: StoryboardScene['status']; label: string }[] = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_preparo', label: 'Em Preparo' },
  { value: 'filmada', label: 'Filmada' },
  { value: 'aprovada', label: 'Aprovada' },
]

// --- Props ---

interface SceneDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  jobId: string
  scene?: StoryboardScene
}

export function SceneDialog({
  open,
  onOpenChange,
  mode,
  jobId,
  scene,
}: SceneDialogProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<SceneFormValues>({
    resolver: zodResolver(sceneSchema),
    defaultValues: {
      scene_number: scene?.scene_number ?? 1,
      title: scene?.title ?? '',
      description: scene?.description ?? null,
      shot_type: scene?.shot_type ?? null,
      location: scene?.location ?? null,
      cast_notes: scene?.cast_notes ?? null,
      camera_notes: scene?.camera_notes ?? null,
      status: scene?.status ?? 'pendente',
    },
  })

  // Reset form when dialog opens/scene changes
  useEffect(() => {
    if (open) {
      reset({
        scene_number: scene?.scene_number ?? 1,
        title: scene?.title ?? '',
        description: scene?.description ?? null,
        shot_type: scene?.shot_type ?? null,
        location: scene?.location ?? null,
        cast_notes: scene?.cast_notes ?? null,
        camera_notes: scene?.camera_notes ?? null,
        status: scene?.status ?? 'pendente',
      })
    }
  }, [open, scene, reset])

  const mutation = useMutation({
    mutationFn: async (values: SceneFormValues) => {
      if (mode === 'create') {
        return apiMutate('storyboard', 'POST', {
          job_id: jobId,
          scene_number: values.scene_number,
          title: values.title,
          description: values.description ?? null,
          shot_type: values.shot_type ?? null,
          location: values.location ?? null,
          cast_notes: values.cast_notes ?? null,
          camera_notes: values.camera_notes ?? null,
        })
      } else {
        return apiMutate(
          'storyboard',
          'PATCH',
          {
            scene_number: values.scene_number,
            title: values.title,
            description: values.description ?? null,
            shot_type: values.shot_type ?? null,
            location: values.location ?? null,
            cast_notes: values.cast_notes ?? null,
            camera_notes: values.camera_notes ?? null,
            status: values.status,
          },
          scene!.id,
        )
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storyboard', jobId] })
      toast.success(mode === 'create' ? 'Cena criada com sucesso' : 'Cena atualizada com sucesso')
      onOpenChange(false)
    },
    onError: (err) => {
      toast.error(safeErrorMessage(err))
    },
  })

  function onSubmit(values: SceneFormValues) {
    mutation.mutate(values)
  }

  const isLoading = mutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nova Cena' : 'Editar Cena'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-2">
          {/* Row: scene_number + shot_type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="scene_number">
                Numero da Cena <span className="text-destructive">*</span>
              </Label>
              <Input
                id="scene_number"
                type="number"
                min={1}
                {...register('scene_number', { valueAsNumber: true })}
                disabled={isLoading}
              />
              {errors.scene_number && (
                <p className="text-xs text-destructive">{errors.scene_number.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Tipo de Plano</Label>
              <Controller
                name="shot_type"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {SHOT_TYPES.map((st) => (
                        <SelectItem key={st.value} value={st.value}>
                          {st.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">
              Titulo <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Ex: Abertura com produto na mesa"
              {...register('title')}
              disabled={isLoading}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Descricao</Label>
            <Textarea
              id="description"
              placeholder="Descreva a cena, angulo, movimento de camera..."
              rows={3}
              {...register('description')}
              disabled={isLoading}
            />
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="location">Locacao</Label>
            <Input
              id="location"
              placeholder="Ex: Sala de estar - estudio A"
              {...register('location')}
              disabled={isLoading}
            />
          </div>

          {/* Cast notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cast_notes">Notas de Elenco</Label>
            <Textarea
              id="cast_notes"
              placeholder="Personagens, figurino, maquiagem..."
              rows={2}
              {...register('cast_notes')}
              disabled={isLoading}
            />
          </div>

          {/* Camera notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="camera_notes">Notas de Camera</Label>
            <Textarea
              id="camera_notes"
              placeholder="Lente, movimento, equipamento especial..."
              rows={2}
              {...register('camera_notes')}
              disabled={isLoading}
            />
          </div>

          {/* Status — only in edit mode */}
          {mode === 'edit' && (
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? 'pendente'}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="size-4 animate-spin" />}
              {mode === 'create' ? 'Criar Cena' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
