'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Início' },
  { href: '/participantes', label: 'Participantes' },
  { href: '/jogos', label: 'Jogos' },
  { href: '/ranking', label: 'Ranking' },
  { href: '/regras', label: 'Regras' },
]

export function Header() {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)
  const [authLoaded, setAuthLoaded] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    fetch('/api/admin/auth')
      .then((res) => res.json())
      .then((data) => setIsAdmin(data.autenticado))
      .catch(() => setIsAdmin(false))
      .finally(() => setAuthLoaded(true))
  }, [])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  return (
    <header className="sticky top-0 z-50 border-t-[3px] border-primary bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="font-display text-2xl tracking-wide text-foreground hover:text-primary transition-colors">
            BOLÃO 2026
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link key={link.href} href={link.href}
                className={cn("px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  pathname === link.href ? "text-primary border-b-2 border-secondary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {link.label}
              </Link>
            ))}
            {authLoaded && isAdmin && (
              <Link href="/admin" className="px-3 py-2 text-sm font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors ml-2">
                Admin
              </Link>
            )}
            <ThemeToggle />
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle />
            <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-md hover:bg-muted transition-colors" aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav className="md:hidden pb-4 border-t border-border pt-4 space-y-1">
            {links.map((link) => (
              <Link key={link.href} href={link.href}
                className={cn("block px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  pathname === link.href ? "text-primary bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {link.label}
              </Link>
            ))}
            {authLoaded && isAdmin && (
              <Link href="/admin" className="block px-3 py-2 text-sm font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
                Admin
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  )
}