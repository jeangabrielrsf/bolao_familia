interface JogoPayload {
  sofascoreId: string
  timeA: string | null
  timeB: string | null
  dataHora: string
  grupo: string
}

interface ResultadoSync {
  sofascoreId: string
  resultadoA: number
  resultadoB: number
  status: string
  local?: string | null
  cidade?: string | null
  vencedor?: number | null
  placarPenaltisA?: number | null
  placarPenaltisB?: number | null
}

export async function syncResultados(jogos: JogoPayload[]) {
  if (!process.env.MICROSERVICE_URL) {
    throw new Error('MICROSERVICE_URL não configurada')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)

  try {
    const response = await fetch(`${process.env.MICROSERVICE_URL}/resultados/lote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jogos,
        force_refresh: true,
      }),
      signal: controller.signal,
    })

    if (!response.ok) throw new Error('Falha ao sincronizar resultados')

    return response.json() as Promise<ResultadoSync[]>
  } finally {
    clearTimeout(timeout)
  }
}
