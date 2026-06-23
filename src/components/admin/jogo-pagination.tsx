'use client'
import { Button } from '@/components/ui/button'

type Props = {
  total: number
  page: number
  perPage: number
  onPageChange: (page: number) => void
}

export function JogoPagination({ total, page, perPage, onPageChange }: Props) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between mt-4">
      <span className="text-sm text-muted-foreground">
        {total} jogo{total === 1 ? '' : 's'} total
      </span>
      <div className="flex gap-2 items-center">
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page === 1}>
          Anterior
        </Button>
        <span className="text-sm py-1">Página {page} de {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
          Próxima
        </Button>
      </div>
    </div>
  )
}
