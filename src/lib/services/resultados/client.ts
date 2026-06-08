export async function syncResultados() {
  if (!process.env.MICROSERVICE_URL) {
    throw new Error('MICROSERVICE_URL não configurada')
  }

  const response = await fetch(`${process.env.MICROSERVICE_URL}/resultados/lote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) throw new Error('Falha ao sincronizar resultados')

  return response.json() as Promise<Array<{
    sofascoreId: string
    resultadoA: number
    resultadoB: number
    status: string
  }>>
}
