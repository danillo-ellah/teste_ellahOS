'use client'

import { use, useState } from 'react'
import { notFound } from 'next/navigation'
import { toast } from 'sonner'
import { PersonHeader } from '@/components/people/PersonHeader'
import { PersonDetailTabs } from '@/components/people/PersonDetailTabs'
import { usePerson, useUpdatePerson } from '@/hooks/usePeople'
import { isNotFoundError } from '@/lib/api'
import type { UpdatePersonPayload } from '@/types/people'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function PersonDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const { data: person, isLoading, isError, error } = usePerson(id)
  const { mutateAsync: updatePerson, isPending: isSaving } = useUpdatePerson()

  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<UpdatePersonPayload>({})

  function handleEdit() {
    if (!person) return
    setEditData({
      full_name: person.full_name,
      cpf: person.cpf,
      rg: person.rg,
      birth_date: person.birth_date,
      drt: person.drt,
      email: person.email,
      phone: person.phone,
      address: person.address,
      city: person.city,
      state: person.state,
      cep: person.cep,
      profession: person.profession,
      default_role: person.default_role,
      default_rate: person.default_rate,
      is_internal: person.is_internal,
      bank_info: person.bank_info,
      notes: person.notes,
    })
    setIsEditing(true)
  }

  function handleCancel() {
    setIsEditing(false)
    setEditData({})
  }

  async function handleSave() {
    if (!person) return
    try {
      await updatePerson({ id: person.id, payload: editData })
      toast.success('Dados atualizados')
      setIsEditing(false)
      setEditData({})
    } catch {
      toast.error('Erro ao atualizar dados')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 rounded bg-muted/40 animate-pulse" />
        <div className="h-6 w-40 rounded bg-muted/40 animate-pulse" />
        <div className="h-8 w-full rounded bg-muted/40 animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-16 rounded bg-muted/40 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (isError && isNotFoundError(error)) {
    notFound()
  }

  if (isError || !person) {
    return (
      <div className="rounded-md border border-border py-16 flex flex-col items-center justify-center text-center gap-4">
        <p className="text-sm text-muted-foreground">
          Erro ao carregar detalhes da pessoa.
        </p>
        <a href={`/people/${id}`} className="text-sm text-primary hover:underline">
          Tentar novamente
        </a>
      </div>
    )
  }

  return (
    <div>
      <PersonHeader
        person={person}
        isEditing={isEditing}
        isSaving={isSaving}
        onEdit={handleEdit}
        onSave={handleSave}
        onCancel={handleCancel}
      />
      <PersonDetailTabs
        person={person}
        isEditing={isEditing}
        editData={editData}
        onEditChange={setEditData}
      />
    </div>
  )
}
