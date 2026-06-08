import { NextRequest, NextResponse } from 'next/server'
import { getTodosParticipantes, getParticipanteById } from '@/lib/db/queries/participantes'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (id) {
    const participante = await getParticipanteById(id)
    if (!participante) {
      return NextResponse.json({ error: 'Participante não encontrado' }, { status: 404 })
    }
    return NextResponse.json(participante)
  }

  const participantes = await getTodosParticipantes()
  return NextResponse.json(participantes)
}
