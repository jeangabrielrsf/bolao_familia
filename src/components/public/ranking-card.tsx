import Link from "next/link"
import { RankingTable } from "@/components/public/RankingTable"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronRight, Trophy } from "lucide-react"
import type { RankingEntry } from "@/lib/utils/types"

interface RankingCardProps {
  ranking: RankingEntry[]
  title?: string
  subtitle?: string
  maxItems?: number
  showViewAll?: boolean
  viewAllHref?: string
}

export function RankingCard({
  ranking,
  title = "Ranking",
  subtitle,
  maxItems,
  showViewAll = false,
  viewAllHref = "/ranking",
}: RankingCardProps) {
  const displayRanking = maxItems ? ranking.slice(0, maxItems) : ranking

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-secondary" />
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {showViewAll && ranking.length > (maxItems ?? 0) && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={viewAllHref}>Ver completo <ChevronRight className="w-4 h-4" /></Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <RankingTable ranking={displayRanking} />
      </CardContent>
    </Card>
  )
}
