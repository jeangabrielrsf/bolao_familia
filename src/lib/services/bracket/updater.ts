import { prisma } from '@/lib/db/client'
import { getClassificacaoGrupos } from './standings'
import { getMelhores8Terceiros } from './best-thirds'
import { projetarChaveamento } from './projector'
import { getCache, setCache } from './cache'

const CACHE_KEY = 'bracket:atual'
const CACHE_TTL_MS = 60_000

export async function atualizarBracket() {
  const cached = getCache<ReturnType<typeof projetarChaveamento>>(CACHE_KEY)
  if (cached) return cached

  const jogosGrupos = await prisma.jogo.findMany({ where: { fase: 'grupos' } })
  const jogosMataMata = await prisma.jogo.findMany({ where: { fase: { not: 'grupos' } } })

  const classificacao = getClassificacaoGrupos(jogosGrupos)
  const melhoresTerceiros = getMelhores8Terceiros(classificacao)
  const bracket = projetarChaveamento({ classificacao, melhoresTerceiros, jogosMataMata })

  for (const slot of bracket) {
    if (slot.timeA !== null || slot.timeB !== null) {
      await prisma.jogo.update({
        where: { id: slot.jogoId },
        data: { timeA: slot.timeA, timeB: slot.timeB },
      })
    }
  }

  setCache(CACHE_KEY, bracket, CACHE_TTL_MS)
  return bracket
}
