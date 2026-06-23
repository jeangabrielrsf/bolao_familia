import { prisma } from '@/lib/db/client'
import { getClassificacaoGrupos } from '@/lib/services/bracket/standings'
import { getMelhores8Terceiros } from '@/lib/services/bracket/best-thirds'
import { projetarChaveamento } from '@/lib/services/bracket/projector'
import { atualizarBracket } from '@/lib/services/bracket/updater'
import { CopaTabs } from '@/components/public/copa-tabs'
import type { JogoComTimes } from '@/lib/services/bracket/types'

export const dynamic = 'force-dynamic'
export const revalidate = 60

export default async function CopaPage() {
  await atualizarBracket()

  const jogos = await prisma.jogo.findMany({ orderBy: { dataHora: 'asc' } })

  const jogosGrupos = jogos.filter(j => j.fase === 'grupos') as JogoComTimes[]
  const jogosMataMata = jogos.filter(j => j.fase !== 'grupos') as JogoComTimes[]

  const classificacao = getClassificacaoGrupos(jogosGrupos)
  const melhoresTerceiros = getMelhores8Terceiros(classificacao)
  const bracket = projetarChaveamento({ classificacao, melhoresTerceiros, jogosMataMata })

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl tracking-wide mb-6">Copa do Mundo 2026</h1>
      <CopaTabs classificacao={classificacao} bracket={bracket} jogos={jogosGrupos} />
    </main>
  )
}
