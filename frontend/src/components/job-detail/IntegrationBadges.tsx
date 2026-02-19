'use client'

import { FolderOpen, MessageCircle, Bell } from 'lucide-react'
import { useDriveFolders } from '@/hooks/useDriveFolders'
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages'
import { useNotifications } from '@/hooks/useNotifications'

interface IntegrationBadgesProps {
  jobId: string
  driveFolderUrl?: string | null
}

export function IntegrationBadges({ jobId, driveFolderUrl }: IntegrationBadgesProps) {
  const { total: driveCount } = useDriveFolders(jobId)
  const { total: whatsappCount } = useWhatsAppMessages(jobId)
  const { data: notifications } = useNotifications({ job_id: jobId, per_page: 1 })

  const notifCount = notifications?.length ?? 0
  const hasDrive = driveCount > 0 || !!driveFolderUrl

  // Nao exibir nada se nenhuma integracao tem dados
  if (!hasDrive && whatsappCount === 0 && notifCount === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {hasDrive && (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
          <FolderOpen className="size-3" />
          Drive{driveCount > 0 && ` (${driveCount})`}
        </span>
      )}

      {whatsappCount > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
          <MessageCircle className="size-3" />
          {whatsappCount} msg
        </span>
      )}

      {notifCount > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
          <Bell className="size-3" />
          Notificacoes
        </span>
      )}
    </div>
  )
}
