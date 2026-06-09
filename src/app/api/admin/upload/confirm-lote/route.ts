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

    let gruposCriados = 0
    let participantesCriados = 0

    await prisma.$transaction(async (tx) => {
      for (const grupo of grupos) {
        let participante = await tx.participante.findFirst({
          where: { nome: { equals: grupo.nomeParticipante, mode: 'insensitive' } },
        })

        if (!participante) {
          participante = await tx.participante.create({
            data: { nome: grupo.nomeParticipante },
          })
          participantesCriados++
        }

        let palpiteGrupo = await tx.palpiteGrupo.findUnique({
          where: {
            participanteId_nome: {
              participanteId: participante.id,
              nome: grupo.nomeCompleto,
            },
          },
        })

        if (palpiteGrupo) {
          await tx.palpite.deleteMany({ where: { palpiteGrupoId: palpiteGrupo.id } })
          await tx.palpiteExtra.deleteMany({ where: { palpiteGrupoId: palpiteGrupo.id } })
        } else {
          palpiteGrupo = await tx.palpiteGrupo.create({
            data: {
              participanteId: participante.id,
              nome: grupo.nomeCompleto,
              apelido: grupo.apelido,
              fonte: 'excel',
            },
          })
          gruposCriados++
        }

        const grupoId = palpiteGrupo.id

        await tx.palpite.createMany({
          data: grupo.palpites.map(p => ({
            palpiteGrupoId: grupoId,
            jogoId: p.jogoId,
            placarA: p.placarA,
            placarB: p.placarB,
            fonte: 'excel' as const,
          })),
        })

        await tx.palpiteExtra.createMany({
          data: grupo.extras.map(e => ({
            palpiteGrupoId: grupoId,
            tipo: e.tipo as 'artilheiro' | 'campeao' | 'vice' | 'terceiro' | 'quarto',
            valor: e.valor,
            fonte: 'excel' as const,
          })),
        })

        await tx.uploadLog.create({
          data: {
            participanteId: participante.id,
            tipoArquivo: 'excel',
            arquivoUrl: '',
            status: 'sucesso',
          },
        })
      }
    })

    console.log(`[confirm-lote] Sucesso: ${gruposCriados} grupo(s) criado(s), ${participantesCriados} participante(s) novo(s)`)
    return NextResponse.json({ success: true, gruposCriados, participantesCriados })
  } catch (error) {
    console.error('[confirm-lote] Erro:', error)
    return NextResponse.json({ error: 'Erro ao confirmar upload em lote' }, { status: 500 })
  }
}
