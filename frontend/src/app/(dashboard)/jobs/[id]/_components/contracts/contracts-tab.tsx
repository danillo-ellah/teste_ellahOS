'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ContractsList } from './contracts-list'
import { CreateContractsDialog } from './create-contracts-dialog'
import { useDocuSealSubmissions } from '@/hooks/useDocuSealSubmissions'

interface ContractsTabProps {
  jobId: string
}

export function ContractsTab({ jobId }: ContractsTabProps) {
  const [createOpen, setCreateOpen] = useState(false)

  // Busca submissions para exibir contador no header
  const { data: submissions } = useDocuSealSubmissions(jobId)
  const count = submissions?.length ?? 0

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">
          Contratos{count > 0 ? ` (${count})` : ''}
        </h3>
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Gerar contratos
        </Button>
      </div>

      {/* Lista — passa submissions para evitar double fetch */}
      <ContractsList jobId={jobId} onCreateClick={() => setCreateOpen(true)} prefetchedSubmissions={submissions} />

      {/* Dialog de criacao */}
      <CreateContractsDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        jobId={jobId}
      />
    </>
  )
}
