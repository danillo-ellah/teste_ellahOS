'use client'

import { use, useState } from 'react'
import { notFound } from 'next/navigation'
import { toast } from 'sonner'
import { AgencyHeader } from '@/components/agencies/AgencyHeader'
import { AgencyDetailTabs } from '@/components/agencies/AgencyDetailTabs'
import { useAgency, useUpdateAgency } from '@/hooks/useAgencies'
import { isNotFoundError } from '@/lib/api'
import type { UpdateAgencyPayload } from '@/types/clients'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function AgencyDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const { data: agency, isLoading, isError, error } = useAgency(id)
  const { mutateAsync: updateAgency, isPending: isSaving } = useUpdateAgency()

  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<UpdateAgencyPayload>({})

  function handleEdit() {
    if (!agency) return
    setEditData({
      name: agency.name,
      trading_name: agency.trading_name,
      cnpj: agency.cnpj,
      address: agency.address,
      city: agency.city,
      state: agency.state,
      cep: agency.cep,
      website: agency.website,
      notes: agency.notes,
    })
    setIsEditing(true)
  }

  function handleCancel() {
    setIsEditing(false)
    setEditData({})
  }

  async function handleSave() {
    if (!agency) return
    try {
      await updateAgency({ id: agency.id, payload: editData })
      toast.success('Agencia atualizada')
      setIsEditing(false)
      setEditData({})
    } catch {
      toast.error('Erro ao atualizar agencia')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 rounded bg-muted/40 animate-pulse" />
        <div className="h-6 w-40 rounded bg-muted/40 animate-pulse" />
        <div className="h-8 w-full rounded bg-muted/40 animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded bg-muted/40 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (isError && isNotFoundError(error)) {
    notFound()
  }

  if (isError || !agency) {
    return (
      <div className="rounded-md border border-border py-16 flex flex-col items-center justify-center text-center gap-4">
        <p className="text-sm text-muted-foreground">
          Erro ao carregar detalhes da agencia.
        </p>
        <a href={`/agencies/${id}`} className="text-sm text-primary hover:underline">
          Tentar novamente
        </a>
      </div>
    )
  }

  return (
    <div>
      <AgencyHeader
        agency={agency}
        isEditing={isEditing}
        isSaving={isSaving}
        onEdit={handleEdit}
        onSave={handleSave}
        onCancel={handleCancel}
      />
      <AgencyDetailTabs
        agency={agency}
        isEditing={isEditing}
        editData={editData}
        onEditChange={setEditData}
      />
    </div>
  )
}
