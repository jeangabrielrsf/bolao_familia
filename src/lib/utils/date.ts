const TIMEZONE = 'America/Sao_Paulo'

export function formatarData(data: Date): string {
  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: TIMEZONE,
  })
}

export function formatarHora(data: Date): string {
  return data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  })
}

export function formatarDataHoraCompleta(data: Date): string {
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  })
}

export function inicioDiaBrasilia(): Date {
  const agora = new Date()
  const str = agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
  const [datePart] = str.split(',')
  const [month, day, year] = datePart.split('/').map(Number)
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

export function fimDiaBrasilia(): Date {
  const inicio = inicioDiaBrasilia()
  return new Date(inicio.getTime() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59 * 1000 + 999)
}
