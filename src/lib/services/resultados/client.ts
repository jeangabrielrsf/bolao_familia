export async function syncResultados() {
  if (!process.env.MICROSERVICE_URL) {
    throw new Error('MICROSERVICE_URL não configurada')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch(`${process.env.MICROSERVICE_URL}/resultados/lote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
