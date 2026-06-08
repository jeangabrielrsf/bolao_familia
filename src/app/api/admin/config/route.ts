import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/middleware'
import { getConfiguracao, setConfiguracao } from '@/lib/db/queries/config'
import type { ConfiguracaoPontuacao } from '@/lib/utils/types'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const config = await getConfiguracao()
    return NextResponse.json(config)
  } catch (error) {
    console.error('GET config error:', error)
    return NextResponse.json({ error: 'Erro ao buscar configuração' }, { status: 500 })
  }
}

const CAMPOS: (keyof ConfiguracaoPontuacao)[] = [
  'placarExato', 'vencedorCorreto', 'campeao', 'vice', 'terceiro', 'quarto', 'artilheiro',
]

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  try {
    const body = await request.json()

    for (const campo of CAMPOS) {
      const valor = body[campo]
      if (typeof valor !== 'number' || !Number.isInteger(valor) || valor < 0) {
        return NextResponse.json(
          { error: `Campo "${campo}" deve ser um número inteiro não negativo` },
          { status: 400 }
        )
      }
    }

    await setConfiguracao({
      placarExato: body.placarExato,
      vencedorCorreto: body.vencedorCorreto,
      campeao: body.campeao,
      vice: body.vice,
      terceiro: body.terceiro,
      quarto: body.quarto,
      artilheiro: body.artilheiro,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PUT config error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar configuração' }, { status: 500 })
  }
}
