'use client'

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Table, TableRow, TableCell } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'

interface Participante {
  id: string
  nome: string
  fotoUrl: string | null
}

export default function AdminParticipantesPage() {
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selected, setSelected] = useState<Participante | null>(null)

  const [formNome, setFormNome] = useState('')
  const [formFoto, setFormFoto] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchParticipantes = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/participantes')
      if (!res.ok) throw new Error('Erro ao carregar')
      const data = await res.json()
      setParticipantes(data)
      setError('')
    } catch {
      setError('Erro ao carregar participantes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchParticipantes()
  }, [fetchParticipantes])

  function openAddModal() {
    setFormNome('')
    setFormFoto(null)
    setFormError('')
    setShowAddModal(true)
  }

  function openEditModal(p: Participante) {
    setSelected(p)
    setFormNome(p.nome)
    setFormFoto(null)
    setFormError('')
    setShowEditModal(true)
  }

  function openDeleteModal(p: Participante) {
    setSelected(p)
    setShowDeleteModal(true)
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (!formNome.trim()) {
      setFormError('Nome é obrigatório')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      const formData = new FormData()
      formData.append('nome', formNome.trim())
      if (formFoto) formData.append('foto', formFoto)

      const res = await fetch('/api/admin/participantes', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao criar')
      }

      setShowAddModal(false)
      fetchParticipantes()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao criar participante')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (!selected) return
    if (!formNome.trim()) {
      setFormError('Nome é obrigatório')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      const formData = new FormData()
      formData.append('id', selected.id)
      formData.append('nome', formNome.trim())
      if (formFoto) formData.append('foto', formFoto)

      const res = await fetch('/api/admin/participantes', {
        method: 'PUT',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao atualizar')
      }

      setShowEditModal(false)
      fetchParticipantes()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao atualizar participante')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!selected) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/participantes?id=${selected.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erro ao excluir')
      }

      setShowDeleteModal(false)
      setSelected(null)
      fetchParticipantes()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao excluir participante')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-6">Participantes</h1>
        <Card padding="md">
          <p className="text-center text-muted">Carregando...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary">Participantes</h1>
        <Button onClick={openAddModal}>Novo Participante</Button>
      </div>

      {error && (
        <Card padding="md">
          <div className="flex items-center gap-2">
            <Badge variant="danger">{error}</Badge>
            <Button variant="secondary" size="sm" onClick={fetchParticipantes}>
              Tentar Novamente
            </Button>
          </div>
        </Card>
      )}

      {participantes.length === 0 ? (
        <Card padding="md">
          <p className="text-center text-muted">Nenhum participante cadastrado.</p>
        </Card>
      ) : (
        <Card padding="none">
          <Table headers={['Foto', 'Nome', 'Ações']}>
            {participantes.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  {p.fotoUrl ? (
                    <img
                      src={p.fotoUrl}
                      alt={p.nome}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary font-bold text-sm">
                      {p.nome.charAt(0).toUpperCase()}
                    </div>
                  )}
                </TableCell>
                <TableCell>{p.nome}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openEditModal(p)}>
                      Editar
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => openDeleteModal(p)}>
                      Excluir
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        </Card>
      )}

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Novo Participante"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            label="Nome"
            value={formNome}
            onChange={(e) => setFormNome(e.target.value)}
            placeholder="Nome do participante"
            error={formError}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">Foto</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFormFoto(e.target.files?.[0] || null)}
              className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-dark"
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar Participante"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <Input
            label="Nome"
            value={formNome}
            onChange={(e) => setFormNome(e.target.value)}
            placeholder="Nome do participante"
            error={formError}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">Foto</label>
            {selected?.fotoUrl && (
              <img
                src={selected.fotoUrl}
                alt={selected.nome}
                className="w-16 h-16 rounded-full object-cover mb-2"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFormFoto(e.target.files?.[0] || null)}
              className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-dark"
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Excluir Participante"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-foreground">
            Tem certeza que deseja excluir <strong>{selected?.nome}</strong>? Todos os palpites, extras e logs de upload associados serão excluídos. Essa ação não pode ser desfeita.
          </p>
          {formError && <Badge variant="danger">{formError}</Badge>}
        </div>
      </Modal>
    </div>
  )
}
