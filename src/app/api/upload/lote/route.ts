import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { getTodosJogos } from '@/lib/db/queries/jogos'
import { parseExcelMultiSheet } from '@/lib/services/upload/excel-parser'
import { validateUpload } from '@/lib/services/upload/validator'
import { prisma } from '@/lib/db/client'
import type { BatchGrupoPreview } from '@/lib/utils/types'

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Arquivo ausente' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande (máximo 10MB)' }, { status: 413 })
    }

    if (file.type !== EXCEL_MIME) {
      return NextResponse.json({ error: 'Upload em lote suporta apenas .xlsx' }, { status: 400 })
    }

    console.log(`[upload-lote] Arquivo recebido: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)

    const buffer = Buffer.from(await file.arrayBuffer())
    const jogos = await getTodosJogos()
    const jogosIds = jogos.map((j) => j.id)
    const timesJogos = jogos.map((j) => ({ timeA: j.timeA, timeB: j.timeB }))

    const grupos = parseExcelMultiSheet(buffer, jogosIds)

    if (grupos.length === 0) {
      return NextResponse.json({ error: 'Nenhuma aba de participante encontrada na planilha' }, { status: 400 })
    }

    console.log(`[upload-lote] ${grupos.length} grupo(s) extraído(s) da planilha`)

    const participantesExistentes = await prisma.participante.findMany({ select: { id: true, nome: true } })
    const participantesMap = new Map(participantesExistentes.map(p => [p.nome.toLowerCase(), p.id]))

    const preview: BatchGrupoPreview[] = grupos.map(grupo => ({
      nomeParticipante: grupo.nomeParticipante,
      apelido: grupo.apelido,
      nomeCompleto: grupo.nomeCompleto,
      participanteId: participantesMap.get(grupo.nomeParticipante.toLowerCase()) ?? null,
      palpites: grupo.palpites,
      extras: grupo.extras,
    }))

    const todosErros: string[] = []
    const todosAlertas: string[] = []
    for (const grupo of grupos) {
      const uploadResult = { palpites: grupo.palpites, extras: grupo.extras, fonte: 'excel' as const }
      const validacao = validateUpload(uploadResult, timesJogos)
      todosErros.push(...validacao.erros.map(e => `[${grupo.nomeCompleto}] ${e}`))
      todosAlertas.push(...validacao.alertas.map(a => `[${grupo.nomeCompleto}] ${a}`))
    }

    if (todosErros.length > 0) {
      console.log(`[upload-lote] Validação: ${todosErros.length} erro(s), ${todosAlertas.length} alerta(s)`)
    } else {
      console.log('[upload-lote] Validação OK')
    }

    const novosParticipantes = new Set(
      preview.filter(g => g.participanteId === null).map(g => g.nomeParticipante)
    )

    return NextResponse.json({
      grupos: preview,
      validacao: {
        valido: todosErros.length === 0,
        erros: todosErros,
        alertas: todosAlertas,
      },
      resumo: {
        totalGrupos: preview.length,
        participantesExistentes: preview.length - novosParticipantes.size,
        novosParticipantes: novosParticipantes.size,
      },
    })
  } catch (error) {
    console.error('[upload-lote] Erro:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
