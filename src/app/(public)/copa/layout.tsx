import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Copa do Mundo 2026 — Classificação e Chaveamento',
  description: 'Acompanhe a classificação dos grupos e o chaveamento mata-mata da Copa 2026.',
}

export default function CopaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
