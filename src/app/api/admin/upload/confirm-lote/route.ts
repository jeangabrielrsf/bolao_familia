import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'

interface GrupoConfirm {
  nomeParticipante: string
  apelido: string
  nomeCompleto: string
  palpites: Array<{ jogoId: string; placarA: number; placarB: number }>
  extras: Array<{ tipo: string; valor: string }>
}

const VALID_TIPOS = ['artilheiro', 'campeao', 'vice', 'terceiro', 'quarto'] as const
const MAX_GRUPOS = 50

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { grupos } = body as { grupos: GrupoConfirm[] }

    if (!Array.isArray(grupos) || grupos.length === 0) {
      return NextResponse.json({ error: 'grupos deve ser um array não vazio' }, { status: 400 })
    }

    if (grupos.length > MAX_GRUPOS) {
      return NextResponse.json({ error: `Máximo de ${MAX_GRUPOS} grupos por lote` }, { status: 400 })
    }

    const gruposVistos = new Set<string>()
    for (const g of grupos) {
      if (!g.nomeParticipante || typeof g.nomeParticipante !== 'string') {
        return NextResponse.json({ error: 'nomeParticipante inválido' }, { status: 400 })
      }
      if (!g.apelido || typeof g.apelido !== 'string') {
        return NextResponse.json({ error: 'apelido inválido' }, { status: 400 })
      }
      if (!g.nomeCompleto || typeof g.nomeCompleto !== 'string') {
        return NextResponse.json({ error: 'nomeCompleto inválido' }, { status: 400 })
      }

      if (gruposVistos.has(g.nomeCompleto)) {
        return NextResponse.json({ error: `Grupo duplicado no lote: ${g.nomeCompleto}` }, { status: 400 })
      }
      gruposVistos.add(g.nomeCompleto)

      if (!Array.isArray(g.palpites) || g.palpites.length === 0) {
        return NextResponse.json({ error: `palpites vazio para ${g.nomeCompleto}` }, { status: 400 })
      }

      const jogoIdsVistos = new Set<string>()
      for (const p of g.palpites) {
        if (!p.jogoId || typeof p.jogoId !== 'string') {
          return NextResponse.json({ error: `jogoId inválido em ${g.nomeCompleto}` }, { status: 400 })
        }
        if (jogoIdsVistos.has(p.jogoId)) {
          return NextResponse.json({ error: `jogoId duplicado em ${g.nomeCompleto}: ${p.jogoId}` }, { status: 400 })
        }
        jogoIdsVistos.add(p.jogoId)
        if (!Number.isInteger(p.placarA) || p.placarA < 0) {
          return NextResponse.json({ error: `placarA inválido em ${g.nomeCompleto}` }, { status: 400 })
        }
        if (!Number.isInteger(p.placarB) || p.placarB < 0) {
          return NextResponse.json({ error: `placarB inválido em ${g.nomeCompleto}` }, { status: 400 })
        }
      }

      if (!Array.isArray(g.extras) || g.extras.length === 0) {
        return NextResponse.json({ error: `extras vazio para ${g.nomeCompleto}` }, { status: 400 })
      }
      for (const e of g.extras) {
        if (!VALID_TIPOS.includes(e.tipo as typeof VALID_TIPOS[number])) {
          return NextResponse.json({ error: `tipo inválido em ${g.nomeCompleto}: ${e.tipo}` }, { status: 400 })
        }
        if (!e.valor || typeof e.valor !== 'string' || e.valor.trim() === '') {
          return NextResponse.json({ error: `valor inválido em ${g.nomeCompleto}` }, { status: 400 })
        }
      }
    }

    const nomesParticipantes = [...new Set(grupos.map(g => g.nomeParticipante.toLowerCase()))]
    const participantesExistentes = await prisma.participante.findMany({
      where: { nome: { in: nomesParticipantes.map(n => n.charAt(0).toUpperCase() + n.slice(1)) } },
    })
    const participantesMap = new Map<string, string>()
    for (const p of participantesExistentes) {
      participantesMap.set(p.nome.toLowerCase(), p.id)
    }

    const novosNomes = nomesParticipantes.filter(n => !participantesMap.has(n))
    let participantesCriados = 0
    for (const nome of novosNomes) {
      const p = await prisma.participante.create({ data: { nome: nome.charAt(0).toUpperCase() + nome.slice(1) } })
      participantesMap.set(nome, p.id)
      participantesCriados++
    }

    const nomesCompletos = grupos.map(g => g.nomeCompleto)
    const gruposExistentes = await prisma.palpiteGrupo.findMany({
      where: { nome: { in: nomesCompletos } },
      select: { id: true, nome: true, participanteId: true },
    })
    const gruposMap = new Map<string, string>()
    for (const g of gruposExistentes) {
      gruposMap.set(g.nome, g.id)
    }

    let gruposCriados = 0
    const gruposParaCriar = grupos.filter(g => !gruposMap.has(g.nomeCompleto))
    for (const grupo of gruposParaCriar) {
      const pg = await prisma.palpiteGrupo.create({
        data: {
          participanteId: participantesMap.get(grupo.nomeParticipante.toLowerCase())!,
          nome: grupo.nomeCompleto,
          apelido: grupo.apelido,
          fonte: 'excel',
        },
      })
      gruposMap.set(grupo.nomeCompleto, pg.id)
      gruposCriados++
    }

    const palpitesData: Array<{ palpiteGrupoId: string; jogoId: string; placarA: number; placarB: number; fonte: 'excel' }> = []
    const extrasData: Array<{ palpiteGrupoId: string; tipo: 'artilheiro' | 'campeao' | 'vice' | 'terceiro' | 'quarto'; valor: string; fonte: 'excel' }> = []
    const uploadLogData: Array<{ participanteId: string; tipoArquivo: string; arquivoUrl: string; status: 'sucesso' }> = []
    const gruposParaLimpar: string[] = []

    for (const grupo of grupos) {
      const grupoId = gruposMap.get(grupo.nomeCompleto)!
      const participanteId = participantesMap.get(grupo.nomeParticipante.toLowerCase())!

      if (gruposExistentes.some(g => g.nome === grupo.nomeCompleto)) {
        gruposParaLimpar.push(grupoId)
      }

      for (const p of grupo.palpites) {
        palpitesData.push({ palpiteGrupoId: grupoId, jogoId: p.jogoId, placarA: p.placarA, placarB: p.placarB, fonte: 'excel' })
      }
      for (const e of grupo.extras) {
        extrasData.push({ palpiteGrupoId: grupoId, tipo: e.tipo as 'artilheiro' | 'campeao' | 'vice' | 'terceiro' | 'quarto', valor: e.valor, fonte: 'excel' })
      }
      uploadLogData.push({ participanteId, tipoArquivo: 'excel', arquivoUrl: '', status: 'sucesso' })
    }

    await prisma.$transaction(async (tx) => {
      if (gruposParaLimpar.length > 0) {
        await tx.palpite.deleteMany({ where: { palpiteGrupoId: { in: gruposParaLimpar } } })
        await tx.palpiteExtra.deleteMany({ where: { palpiteGrupoId: { in: gruposParaLimpar } } })
      }

      await tx.palpite.createMany({ data: palpitesData })
      await tx.palpiteExtra.createMany({ data: extrasData })
      await tx.uploadLog.createMany({ data: uploadLogData })
    }, { timeout: 15000 })

    console.log(`[confirm-lote] Sucesso: ${gruposCriados} grupo(s) criado(s), ${participantesCriados} participante(s) novo(s)`)
    return NextResponse.json({ success: true, gruposCriados, participantesCriados })
  } catch (error) {
    console.error('[confirm-lote] Erro:', error)
    return NextResponse.json({ error: 'Erro ao confirmar upload em lote' }, { status: 500 })
  }
}
