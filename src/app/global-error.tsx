"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global error:", error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertTriangle className="w-12 h-12 text-danger" />
            <h2 className="text-xl font-display tracking-wide text-center">Algo deu errado</h2>
            <p className="text-muted-foreground text-center text-sm">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            <div className="flex gap-3">
              <Button onClick={reset} variant="outline">Tentar novamente</Button>
              <Button onClick={() => window.location.href = "/"}>Voltar ao início</Button>
            </div>
          </CardContent>
        </Card>
      </body>
    </html>
  )
}
