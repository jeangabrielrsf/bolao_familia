export async function syncResultados(sofascoreIds: string[]) {
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
        sofascore_ids: sofascoreIds,
        force_refresh: true,
      }),
      signal: controller.signal,
    })

    if (!response.ok) throw new Error('Falha ao sincronizar resultados')

    return response.json() as Promise<Array<{
      sofascoreId: string
      resultadoA: number
      resultadoB: number
      status: string
    }>>
  } finally {
    clearTimeout(timeout)
  }
}
