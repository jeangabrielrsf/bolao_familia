'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const links = [
  { href: '/', label: 'Início' },
  { href: '/participantes', label: 'Participantes' },
  { href: '/jogos', label: 'Jogos' },
  { href: '/ranking', label: 'Ranking' },
  { href: '/regras', label: 'Regras' },
]

export function Header() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [authLoaded, setAuthLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/admin/auth')
      .then((res) => res.json())
      .then((data) => setIsAdmin(data.autenticado))
      .catch(() => setIsAdmin(false))
      .finally(() => setAuthLoaded(true))
  }, [])

  return (
    <header className="bg-primary text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            ⚽ Bolão Copa 2026
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                {link.label}
              </Link>
            ))}
            {authLoaded && isAdmin && (
              <Link
                href="/admin"
                className="px-3 py-2 rounded-md text-sm font-medium bg-secondary text-primary-dark hover:bg-secondary-dark transition-colors"
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
