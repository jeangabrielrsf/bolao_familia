import { getRanking } from '@/lib/db/queries/ranking'
import { RankingTable } from '@/components/public/RankingTable'
import { Card } from '@/components/ui/Card'

export const dynamic = 'force-dynamic'

export default async function RankingPage() {
  const ranking = await getRanking()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-primary">Ranking</h1>

      <Card padding="none">
        <RankingTable ranking={ranking} />
      </Card>
    </div>
  )
}
