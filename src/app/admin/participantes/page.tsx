'use client'

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { Loader2, Users, ChevronLeft } from 'lucide-react'

interface Participante { id: string; nome: string; fotoUrl: string | null }

export default function AdminParticipantesPage() {
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
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
      setParticipantes(data); setError('')
    } catch { setError('Erro ao carregar participantes') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchParticipantes()
  }, [fetchParticipantes])

  function openAddModal() { setFormNome(''); setFormFoto(null); setFormError(''); setShowAddDialog(true) }
  function openEditModal(p: Participante) { setSelected(p); setFormNome(p.nome); setFormFoto(null); setFormError(''); setShowEditDialog(true) }
  function openDeleteModal(p: Participante) { setSelected(p); setShowDeleteDialog(true) }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (!formNome.trim()) { setFormError('Nome é obrigatório'); return }
    setSubmitting(true); setFormError('')
    try {
      const formData = new FormData()
      formData.append('nome', formNome.trim())
      if (formFoto) formData.append('foto', formFoto)
      const res = await fetch('/api/admin/participantes', { method: 'POST', body: formData })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Erro ao criar') }
      setShowAddDialog(false); fetchParticipantes(); toast.success('Participante criado com sucesso!')
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Erro ao criar participante') }
    finally { setSubmitting(false) }
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault()
    if (submitting || !selected) return
    if (!formNome.trim()) { setFormError('Nome é obrigatório'); return }
    setSubmitting(true); setFormError('')
    try {
      const formData = new FormData()
      formData.append('id', selected.id); formData.append('nome', formNome.trim())
      if (formFoto) formData.append('foto', formFoto)
      const res = await fetch('/api/admin/participantes', { method: 'PUT', body: formData })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Erro ao atualizar') }
      setShowEditDialog(false); fetchParticipantes(); toast.success('Participante atualizado!')
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Erro ao atualizar participante') }
    finally { setSubmitting(false) }
  }

  async function handleDelete() {
    if (!selected) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/participantes?id=${selected.id}`, { method: 'DELETE' })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Erro ao excluir') }
      setShowDeleteDialog(false); setSelected(null); fetchParticipantes(); toast.success('Participante excluído!')
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Erro ao excluir participante') }
    finally { setSubmitting(false) }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin"><ChevronLeft className="w-4 h-4" /> Voltar ao Dashboard</Link>
        </Button>
        <h1 className="text-3xl font-display tracking-wide">Participantes</h1>
        <Card><CardContent className="p-4 space-y-3">
          <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
        </CardContent></Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in-up">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin"><ChevronLeft className="w-4 h-4" /> Voltar ao Dashboard</Link>
      </Button>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display tracking-wide">Participantes</h1>
        <Button onClick={openAddModal}>Novo Participante</Button>
      </div>

      {error && (
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Badge variant="destructive">{error}</Badge>
          <Button variant="secondary" size="sm" onClick={fetchParticipantes}>Tentar Novamente</Button>
        </CardContent></Card>
      )}

      {participantes.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Nenhum participante</h3>
          <p className="text-muted-foreground">Cadastre o primeiro participante.</p>
        </CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Foto</TableHead><TableHead>Nome</TableHead><TableHead className="text-right">Ações</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {participantes.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.fotoUrl ? (
                      <Image src={p.fotoUrl} alt={p.nome} width={40} height={40} className="rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary font-bold text-sm">{p.nome.charAt(0).toUpperCase()}</div>
                    )}
                  </TableCell>
                  <TableCell>{p.nome}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="secondary" size="sm" onClick={() => openEditModal(p)}>Editar</Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar dados do participante</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="destructive" size="sm" onClick={() => openDeleteModal(p)}>Excluir</Button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir participante e todos os palpites</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Participante</DialogTitle><DialogDescription>Cadastre um novo participante no bolão.</DialogDescription></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="add-nome" className="text-sm font-medium">Nome</label>
              <Input id="add-nome" value={formNome} onChange={(e) => setFormNome(e.target.value)} placeholder="Nome do participante" required />
              {formError && <p className="text-sm text-danger">{formError}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Foto</label>
              <input type="file" accept="image/*" onChange={(e) => setFormFoto(e.target.files?.[0] || null)} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-dark" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>{submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Participante</DialogTitle><DialogDescription>Edite os dados do participante.</DialogDescription></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="edit-nome" className="text-sm font-medium">Nome</label>
              <Input id="edit-nome" value={formNome} onChange={(e) => setFormNome(e.target.value)} placeholder="Nome do participante" required />
              {formError && <p className="text-sm text-danger">{formError}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Foto</label>
              {selected?.fotoUrl && <Image src={selected.fotoUrl} alt={selected.nome} width={64} height={64} className="rounded-full object-cover mb-2" />}
              <input type="file" accept="image/*" onChange={(e) => setFormFoto(e.target.files?.[0] || null)} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-dark" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>{submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Participante</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{selected?.nome}</strong>? Todos os palpites, extras e logs de upload associados serão excluídos. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {formError && <Badge variant="destructive">{formError}</Badge>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting} className="bg-danger text-white hover:bg-danger/90">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Excluindo...</> : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
