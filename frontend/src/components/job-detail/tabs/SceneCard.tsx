'use client'

import { Film, MapPin, ImageIcon, Pencil, CheckCircle2, MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { StoryboardScene } from '@/types/storyboard'

// --- Status config ---

const SCENE_STATUS_CONFIG: Record<
  StoryboardScene['status'],
  { label: string; className: string }
> = {
  pendente: {
    label: 'Pendente',
    className: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
  },
  em_preparo: {
    label: 'Em Preparo',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  filmada: {
    label: 'Filmada',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  aprovada: {
    label: 'Aprovada',
    className: 'bg-green-500/10 text-green-600 dark:text-green-400',
  },
}

// --- Props ---

interface SceneCardProps {
  scene: StoryboardScene
  onClick: (scene: StoryboardScene) => void
}

export function SceneCard({ scene, onClick }: SceneCardProps) {
  const statusConfig = SCENE_STATUS_CONFIG[scene.status]
  const thumbnail = scene.mood_references?.[0] ?? null
  const hasDrawing = (scene.mood_references?.length ?? 0) > 0
  const isFilmed = scene.status === 'filmada' || scene.status === 'aprovada'

  return (
    <button
      type="button"
      onClick={() => onClick(scene)}
      aria-label={`Cena ${scene.scene_number} — ${scene.title}`}
      title={`Cena ${scene.scene_number} — ${scene.title}`}
      className={cn(
        'w-full text-left rounded-lg border border-border overflow-hidden',
        'hover:shadow-md hover:border-primary/40 transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'bg-card',
      )}
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={`Referencia visual - ${scene.title}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <ImageIcon className="size-8 text-muted-foreground/30" />
        )}

        {/* Scene number badge — absolute top-left */}
        <span className="absolute top-2 left-2 size-7 rounded-full bg-black/70 text-white text-xs font-bold flex items-center justify-center backdrop-blur-sm">
          {scene.scene_number}
        </span>

        {/* Status badge — absolute top-right */}
        <Badge
          variant="outline"
          className={cn(
            'absolute top-2 right-2 text-[10px] px-1.5 py-0.5 border-0 font-medium backdrop-blur-sm',
            statusConfig.className,
          )}
        >
          {statusConfig.label}
        </Badge>

        {/* Filmed overlay check */}
        {isFilmed && (
          <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
            <CheckCircle2 className="size-10 text-white/80 drop-shadow-lg" />
          </div>
        )}

        {/* Drawing indicator — bottom-left */}
        {hasDrawing && (
          <span className="absolute bottom-2 left-2 size-6 rounded-full bg-primary/80 text-primary-foreground flex items-center justify-center backdrop-blur-sm">
            <Pencil className="size-3" />
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col gap-1.5">
        {/* Title */}
        <p className="text-sm font-semibold leading-tight line-clamp-1">{scene.title}</p>

        {/* Shot type */}
        {scene.shot_type && (
          <div className="flex items-center gap-1.5">
            <Film className="size-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">{scene.shot_type}</span>
          </div>
        )}

        {/* Location */}
        {scene.location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground line-clamp-1">{scene.location}</span>
          </div>
        )}

        {/* Shoot notes preview */}
        {scene.shoot_notes && (
          <div className="flex items-center gap-1.5">
            <MessageSquare className="size-3 text-amber-500 shrink-0" />
            <span className="text-xs text-amber-600 dark:text-amber-400 line-clamp-1">{scene.shoot_notes}</span>
          </div>
        )}

        {/* Description preview — only if nothing else shown */}
        {scene.description && !scene.location && !scene.shot_type && !scene.shoot_notes && (
          <p className="text-xs text-muted-foreground line-clamp-2">{scene.description}</p>
        )}
      </div>
    </button>
  )
}
