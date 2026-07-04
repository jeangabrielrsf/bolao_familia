import { prisma } from '@/lib/db/client'
import { getClassificacaoGrupos } from '@/lib/services/bracket/standings'
import { getMelhores8Terceiros } from '@/lib/services/bracket/best-thirds'
import { projetarChaveamento } from '@/lib/services/bracket/projector'
import { atualizarBracket } from '@/lib/services/bracket/updater'
import { CopaTabs } from '@/components/public/copa-tabs'
import { Badge } from '@/components/ui/badge'
import type { JogoComTimes } from '@/lib/services/bracket/types'

export const dynamic = 'force-dynamic'
export const revalidate = 60

export default async function CopaPage() {
  // Dispara atualização do bracket (persiste times pras próximas fases).
  // atualizarBracket() tem cache de 60s, então custo é baixo.
  // Best-effort: se falhar, segue com dados em memória (projetor calcula sem o DB).
  try {
    await atualizarBracket()
  } catch (err) {
    console.error('[copa] falha ao atualizar bracket:', err)
  }

  const jogos = await prisma.jogo.findMany({ orderBy: { dataHora: 'asc' } })

  const jogosGrupos = jogos.filter(j => j.fase === 'grupos') as JogoComTimes[]
  const jogosMataMata = jogos.filter(j => j.fase !== 'grupos') as JogoComTimes[]

  const classificacao = getClassificacaoGrupos(jogosGrupos)
  const melhoresTerceiros = getMelhores8Terceiros(classificacao)
  const bracket = projetarChaveamento({ classificacao, melhoresTerceiros, jogosMataMata })

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <h1 className="font-display text-3xl tracking-wide">Copa do Mundo 2026</h1>
          <Badge variant="outline" className="text-xs">Fase de grupos</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          11 jun – 19 jul · EUA 🇺🇸 · México 🇲🇽 · Canadá 🇨🇦
        </p>
      </div>
      <CopaTabs classificacao={classificacao} bracket={bracket} jogos={jogosGrupos} />
    </main>
  )
}
