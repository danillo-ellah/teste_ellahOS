'use client'

import { use, useState } from 'react'
import { notFound } from 'next/navigation'
import { toast } from 'sonner'
import { ClientHeader } from '@/components/clients/ClientHeader'
import { ClientDetailTabs } from '@/components/clients/ClientDetailTabs'
import { useClient, useUpdateClient } from '@/hooks/useClients'
import type { UpdateClientPayload } from '@/types/clients'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ClientDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const { data: client, isLoading, isError, error } = useClient(id)
  const { mutateAsync: updateClient, isPending: isSaving } = useUpdateClient()

  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<UpdateClientPayload>({})

  function handleEdit() {
    if (!client) return
    setEditData({
      name: client.name,
      trading_name: client.trading_name,
      cnpj: client.cnpj,
      segment: client.segment,
      address: client.address,
      city: client.city,
      state: client.state,
      cep: client.cep,
      website: client.website,
      notes: client.notes,
    })
    setIsEditing(true)
  }

  function handleCancel() {
    setIsEditing(false)
    setEditData({})
  }

  async function handleSave() {
    if (!client) return
    try {
      await updateClient({ id: client.id, payload: editData })
      toast.success('Cliente atualizado')
      setIsEditing(false)
      setEditData({})
    } catch {
      toast.error('Erro ao atualizar cliente')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 rounded bg-muted/40 animate-pulse" />
        <div className="h-6 w-40 rounded bg-muted/40 animate-pulse" />
        <div className="h-8 w-full rounded bg-muted/40 animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 rounded bg-muted/40 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (isError && error?.message?.includes('not found')) {
    notFound()
  }

  if (isError || !client) {
    return (
      <div className="rounded-md border border-border py-16 flex flex-col items-center justify-center text-center gap-4">
        <p className="text-sm text-muted-foreground">
          Erro ao carregar detalhes do cliente.
        </p>
        <a href={`/clients/${id}`} className="text-sm text-primary hover:underline">
          Tentar novamente
        </a>
      </div>
    )
  }

  return (
    <div>
      <ClientHeader
        client={client}
        isEditing={isEditing}
        isSaving={isSaving}
        onEdit={handleEdit}
        onSave={handleSave}
        onCancel={handleCancel}
      />
      <ClientDetailTabs
        client={client}
        isEditing={isEditing}
        editData={editData}
        onEditChange={setEditData}
      />
    </div>
  )
}
