'use client'

import { useState } from 'react'
import { Mail, Phone, Plus, Star, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ContactDialog } from './ContactDialog'
import { ConfirmDialog } from './ConfirmDialog'
import {
  useContacts,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
} from '@/hooks/useContacts'
import type { Contact } from '@/types/clients'

interface ContactsSectionProps {
  clientId?: string
  agencyId?: string
}

export function ContactsSection({ clientId, agencyId }: ContactsSectionProps) {
  const entityId = clientId ?? agencyId ?? ''
  const { data: contacts, isLoading } = useContacts(clientId, agencyId)
  const { mutateAsync: createContact, isPending: isCreating } = useCreateContact()
  const { mutateAsync: updateContact, isPending: isUpdating } = useUpdateContact()
  const { mutateAsync: deleteContact } = useDeleteContact()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null)

  function handleAdd() {
    setEditingContact(null)
    setDialogOpen(true)
  }

  function handleEdit(contact: Contact) {
    setEditingContact(contact)
    setDialogOpen(true)
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    try {
      await deleteContact({ id: deleteTarget.id, entityId })
      toast.success('Contato removido')
      setDeleteTarget(null)
    } catch {
      toast.error('Erro ao remover contato')
    }
  }

  async function handleSave(data: {
    name: string
    email?: string
    phone?: string
    role?: string
    is_primary: boolean
  }) {
    try {
      if (editingContact) {
        await updateContact({
          id: editingContact.id,
          payload: {
            name: data.name,
            email: data.email || null,
            phone: data.phone || null,
            role: data.role || null,
            is_primary: data.is_primary,
          },
        })
        toast.success('Contato atualizado')
      } else {
        await createContact({
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          role: data.role || null,
          is_primary: data.is_primary,
          ...(clientId ? { client_id: clientId } : {}),
          ...(agencyId ? { agency_id: agencyId } : {}),
        })
        toast.success('Contato adicionado')
      }
      setDialogOpen(false)
    } catch {
      toast.error('Erro ao salvar contato')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-16 rounded-md bg-muted/40 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Contatos</h3>
        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleAdd}>
          <Plus className="size-3.5" />
          Adicionar
        </Button>
      </div>

      {(!contacts || contacts.length === 0) && (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Nenhum contato cadastrado.
        </p>
      )}

      <div className="space-y-2">
        {contacts?.map((contact) => (
          <div
            key={contact.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 group"
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium truncate">{contact.name}</span>
                {contact.is_primary && (
                  <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0">
                    <Star className="size-2.5 fill-current" />
                    Principal
                  </Badge>
                )}
                {contact.role && (
                  <span className="text-xs text-muted-foreground truncate">
                    {contact.role}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {contact.email && (
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="size-3 shrink-0" />
                    {contact.email}
                  </span>
                )}
                {contact.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="size-3 shrink-0" />
                    {contact.phone}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleEdit(contact)}
                aria-label={`Editar ${contact.name}`}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => setDeleteTarget(contact)}
                aria-label={`Remover ${contact.name}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contact={editingContact}
        onSave={handleSave}
        isPending={isCreating || isUpdating}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Remover contato"
        description={`Tem certeza que deseja remover o contato "${deleteTarget?.name}"?`}
        confirmLabel="Remover"
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
