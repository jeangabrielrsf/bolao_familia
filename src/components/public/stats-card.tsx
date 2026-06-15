import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatsCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  href?: string
}

export function StatsCard({ label, value, icon: Icon, iconColor = "text-primary", iconBg = "bg-primary/10", href }: StatsCardProps) {
  const content = (
    <Card className={cn("w-full h-full", href && "cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all")}>
      <CardContent className="p-4 h-full flex flex-col sm:flex-row items-center justify-center sm:justify-center gap-2 sm:gap-3 text-center sm:text-left">
        <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-display text-primary truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href} className="block focus:outline-none focus:ring-2 focus:ring-ring rounded-lg">{content}</Link>
  }

  return content
}
