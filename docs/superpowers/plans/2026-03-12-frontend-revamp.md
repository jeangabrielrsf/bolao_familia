# Frontend Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repaginar completamente o frontend do Bolão Copa 2026 com tema claro/escuro, shadcn/ui-style components, design inspirado no protótipo `prototypes/06-hybrid-shadcn/`, e rollout faseado por rota.

**Architecture:** Substituir componentes UI custom por componentes shadcn/ui-style (usando Radix UI primitives + Tailwind CSS v4 com CSS variables). Adicionar `next-themes` para toggle de tema com detecção automática de `prefers-color-scheme`. Refatorar cada rota progressivamente para usar o novo design system.

**Tech Stack:** Next.js 16.2.7, React 19, TypeScript 5, Tailwind CSS 4, Radix UI, next-themes, Sonner, lucide-react, clsx, tailwind-merge

**Spec:** `docs/superpowers/specs/2026-03-12-frontend-revamp-design.md`

---

## File Structure

### New Files
```
src/lib/utils.ts                          — cn() helper (clsx + tailwind-merge)
src/components/providers/theme-provider.tsx — ThemeProvider wrapper (next-themes)
src/components/layout/theme-toggle.tsx     — Botão toggle sol/lua
src/components/ui/skeleton.tsx            — Skeleton loading
src/components/ui/alert-dialog.tsx        — AlertDialog (Radix)
src/components/ui/tooltip.tsx             — Tooltip (Radix)
src/components/ui/accordion.tsx           — Accordion (Radix)
src/components/public/hero.tsx            — Hero section da home
src/components/public/ranking-podium.tsx  — Podium top 3
```

### Modified Files
```
src/app/globals.css                       — CSS variables light/dark + @theme inline
src/app/layout.tsx                        — ThemeProvider, Bebas Neue, anti-FOUC, Toaster
src/components/layout/Header.tsx          — Navbar translúcida, mobile menu, theme toggle
src/components/layout/Footer.tsx          — Novo estilo
src/components/ui/button.tsx              — shadcn/ui style (substituir Button.tsx)
src/components/ui/card.tsx                — shadcn/ui style (substituir Card.tsx)
src/components/ui/badge.tsx               — shadcn/ui style (substituir Badge.tsx)
src/components/ui/table.tsx               — shadcn/ui style (substituir Table.tsx)
src/components/ui/input.tsx               — shadcn/ui style (substituir Input.tsx)
src/components/ui/select.tsx              — shadcn/ui style (substituir Select.tsx)
src/components/ui/dialog.tsx              — shadcn/ui style (substituir Modal.tsx)
src/components/ui/tabs.tsx                — shadcn/ui style (substituir Tabs.tsx)
src/components/public/GameCard.tsx        — Novo visual com hover effects
src/components/public/RankingTable.tsx    — Novo visual com progresso
src/components/public/ParticipantCard.tsx — Novo visual com hover
src/components/public/PalpitesTable.tsx   — Novo visual
src/components/admin/StatsCard.tsx        — Novo visual
src/components/admin/UploadForm.tsx       — Novo visual
src/components/admin/PreviewTable.tsx     — Novo visual
src/app/(public)/page.tsx                 — Hero, stats, jogos, ranking
src/app/(public)/jogos/page.tsx           — Page header, filter, cards
src/app/(public)/jogos/[id]/page.tsx      — Detail redesenhado
src/app/(public)/ranking/page.tsx         — Podium + stats + table
src/app/(public)/participantes/page.tsx   — Grid redesenhado
src/app/(public)/participantes/[id]/page.tsx — Profile redesenhado
src/app/(public)/regras/page.tsx          — Accordion layout
src/app/admin/page.tsx                    — Dashboard redesenhado
src/app/admin/login/page.tsx              — Login redesenhado
src/app/admin/upload/page.tsx             — Upload redesenhado
src/app/admin/participantes/page.tsx      — CRUD redesenhado
src/app/admin/jogos/page.tsx              — Jogos redesenhado
src/app/admin/resultados/page.tsx         — Resultados redesenhado
src/app/admin/config/page.tsx             — Config redesenhado
```

### Deleted Files (after migration)
```
src/components/ui/Button.tsx   → substituído por button.tsx
src/components/ui/Card.tsx     → substituído por card.tsx
src/components/ui/Badge.tsx    → substituído por badge.tsx
src/components/ui/Table.tsx    → substituído por table.tsx
src/components/ui/Input.tsx    → substituído por input.tsx
src/components/ui/Select.tsx   → substituído por select.tsx
src/components/ui/Modal.tsx    → substituído por dialog.tsx
src/components/ui/Tabs.tsx     → substituído por tabs.tsx
```

---

### Task 1: Install Dependencies + Configure shadcn/ui

**Files:**
- Create: `src/lib/utils.ts`
- Create: `components.json`
- Modify: `package.json`

- [ ] **Step 1: Install npm dependencies**

```bash
npm install next-themes sonner lucide-react class-variance-authority clsx tailwind-merge @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-alert-dialog @radix-ui/react-tooltip @radix-ui/react-accordion @radix-ui/react-slot @radix-ui/react-select @radix-ui/react-label tailwindcss-animate
```

- [ ] **Step 2: Create `src/lib/utils.ts`**

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 3: Create `components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 4: Verify build still works**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/utils.ts components.json
git commit -m "feat: install shadcn/ui dependencies and create cn helper"
```

---

### Task 2: Configure globals.css with Light/Dark CSS Variables

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace `src/app/globals.css`**

```css
@import "tailwindcss";

@plugin "tailwindcss-animate";

@custom-variant dark (&:is(.dark *));

:root {
  --background: #fafafa;
  --foreground: #111827;
  --card: #ffffff;
  --card-foreground: #111827;
  --border: #e5e7eb;
  --muted: #f3f4f6;
  --muted-foreground: #6b7280;
  --primary: #00A651;
  --primary-foreground: #ffffff;
  --primary-light: #4caf50;
  --primary-dark: #0d3311;
  --secondary: #FFD700;
  --secondary-foreground: #1a1a1a;
  --secondary-light: #ffff52;
  --secondary-dark: #c7a500;
  --accent: #FFD700;
  --accent-foreground: #1a1a1a;
  --accent-light: #5e92f3;
  --accent-dark: #003c8f;
  --success: #2e7d32;
  --warning: #f9a825;
  --danger: #c62828;
  --ring: #00A651;
  --radius: 0.5rem;
}

.dark {
  --background: #0a0e1a;
  --foreground: #e2e8f0;
  --card: rgba(26, 31, 46, 0.7);
  --card-foreground: #e2e8f0;
  --border: rgba(255, 255, 255, 0.1);
  --muted: #151b2e;
  --muted-foreground: #8892a8;
  --primary: #00A651;
  --primary-foreground: #ffffff;
  --primary-light: #4caf50;
  --primary-dark: #0d3311;
  --secondary: #FFD700;
  --secondary-foreground: #1a1a1a;
  --secondary-light: #ffff52;
  --secondary-dark: #c7a500;
  --accent: #FFD700;
  --accent-foreground: #1a1a1a;
  --accent-light: #5e92f3;
  --accent-dark: #003c8f;
  --success: #2e7d32;
  --warning: #f9a825;
  --danger: #c62828;
  --ring: #00A651;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-border: var(--border);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary-light: var(--primary-light);
  --color-primary-dark: var(--primary-dark);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary-light: var(--secondary-light);
  --color-secondary-dark: var(--secondary-dark);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent-light: var(--accent-light);
  --color-accent-dark: var(--accent-dark);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-danger: var(--danger);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Bebas Neue", "Inter", ui-sans-serif, system-ui, sans-serif;
}

body {
  background: var(--background);
  color: var(--foreground);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.dark .card-glass {
  backdrop-filter: blur(12px);
  background: var(--card);
  border: 1px solid var(--border);
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.animate-fade-in-up { animation: fade-in-up 0.6s ease-out; }
.animate-shimmer {
  background: linear-gradient(90deg, var(--primary) 0%, var(--accent) 50%, var(--primary) 100%);
  background-size: 200% 100%;
  animation: shimmer 2.5s infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animate-fade-in-up, .animate-shimmer { animation: none; }
  * { transition-duration: 0.01ms !important; }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: configure CSS variables for light/dark themes"
```

---

### Task 3: ThemeProvider + ThemeToggle + Anti-FOUC

**Files:**
- Create: `src/components/providers/theme-provider.tsx`
- Create: `src/components/layout/theme-toggle.tsx`

- [ ] **Step 1: Create `src/components/providers/theme-provider.tsx`**

```tsx
"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  )
}
```

- [ ] **Step 2: Create `src/components/layout/theme-toggle.tsx`**

```tsx
"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return <div className="w-9 h-9" />

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={cn(
        "relative w-9 h-9 rounded-md flex items-center justify-center",
        "hover:bg-muted transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
      )}
      aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
    >
      {theme === "dark" ? <Sun className="w-4 h-4 text-secondary" /> : <Moon className="w-4 h-4 text-foreground" />}
    </button>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/providers/theme-provider.tsx src/components/layout/theme-toggle.tsx
git commit -m "feat: add ThemeProvider and ThemeToggle components"
```

---

### Task 4: Update layout.tsx (Fonts, ThemeProvider, Toaster, Anti-FOUC)

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Replace `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Inter, Bebas_Neue } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const bebasNeue = Bebas_Neue({ subsets: ['latin'], weight: ['400'], variable: '--font-display' })

export const metadata: Metadata = {
  title: 'Bolão Copa do Mundo 2026',
  description: 'Bolão da família para a Copa do Mundo 2026',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme-preference');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}if(t==='dark')document.documentElement.classList.add('dark')}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} ${bebasNeue.variable} font-sans min-h-screen flex flex-col antialiased`}>
        <ThemeProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
        <Toaster position="bottom-right" toastOptions={{ style: { background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' } }} />
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: integrate ThemeProvider, Bebas Neue font, Toaster, and anti-FOUC script"
```

---

### Task 5: Create shadcn/ui Button + Card + Badge + Table

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/table.tsx`

- [ ] **Step 1: Create `src/components/ui/button.tsx`**

```tsx
import { forwardRef } from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-danger text-white hover:bg-danger/90",
        outline: "border border-border bg-background hover:bg-muted hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

- [ ] **Step 2: Create `src/components/ui/card.tsx`**

```tsx
import { forwardRef } from "react"
import { cn } from "@/lib/utils"

const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-lg border border-border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md", className)} {...props} />
  )
)
Card.displayName = "Card"

const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
)
CardHeader.displayName = "CardHeader"

const CardTitle = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
)
CardTitle.displayName = "CardTitle"

const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
)
CardDescription.displayName = "CardDescription"

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
)
CardContent.displayName = "CardContent"

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

- [ ] **Step 3: Create `src/components/ui/badge.tsx`**

```tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-muted text-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        success: "border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        warning: "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        destructive: "border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
        outline: "text-foreground",
        info: "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
```

- [ ] **Step 4: Create `src/components/ui/table.tsx`**

```tsx
import { forwardRef } from "react"
import { cn } from "@/lib/utils"

const Table = forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  )
)
Table.displayName = "Table"

const TableHeader = forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
)
TableHeader.displayName = "TableHeader"

const TableBody = forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
)
TableBody.displayName = "TableBody"

const TableFooter = forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tfoot ref={ref} className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)} {...props} />
)
TableFooter.displayName = "TableFooter"

const TableRow = forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn("border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)} {...props} />
  )
)
TableRow.displayName = "TableRow"

const TableHead = forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th ref={ref} className={cn("h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0", className)} {...props} />
  )
)
TableHead.displayName = "TableHead"

const TableCell = forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />
  )
)
TableCell.displayName = "TableCell"

const TableCaption = forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
)
TableCaption.displayName = "TableCaption"

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/button.tsx src/components/ui/card.tsx src/components/ui/badge.tsx src/components/ui/table.tsx
git commit -m "feat: add shadcn/ui Button, Card, Badge, and Table components"
```

---

### Task 6: Create shadcn/ui Input + Select + Dialog + Tabs

**Files:**
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/select.tsx`
- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/ui/tabs.tsx`

- [ ] **Step 1: Create `src/components/ui/input.tsx`**

```tsx
import { forwardRef } from "react"
import { cn } from "@/lib/utils"

const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = "Input"

export { Input }
```

- [ ] **Step 2: Create `src/components/ui/select.tsx`**

```tsx
"use client"

import { forwardRef } from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        className={cn(
          "flex h-10 w-full appearance-none rounded-md border border-border bg-background px-3 py-2 pr-8 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
    </div>
  )
)
Select.displayName = "Select"

export { Select }
```

- [ ] **Step 3: Create `src/components/ui/dialog.tsx`**

```tsx
"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<React.ComponentRef<typeof DialogPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className)} {...props} />
  )
)
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<React.ComponentRef<typeof DialogPrimitive.Content>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>>(
  ({ className, children, ...props }, ref) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg", className)}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
)
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<React.ComponentRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(
  ({ className, ...props }, ref) => <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
)
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<React.ComponentRef<typeof DialogPrimitive.Description>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>>(
  ({ className, ...props }, ref) => <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
)
DialogDescription.displayName = DialogPrimitive.Description.displayName

export { Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription }
```

- [ ] **Step 4: Create `src/components/ui/tabs.tsx`**

```tsx
"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<React.ComponentRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.List ref={ref} className={cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)} {...props} />
  )
)
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<React.ComponentRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Trigger ref={ref} className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm", className)} {...props} />
  )
)
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<React.ComponentRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.Content ref={ref} className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)} {...props} />
  )
)
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/input.tsx src/components/ui/select.tsx src/components/ui/dialog.tsx src/components/ui/tabs.tsx
git commit -m "feat: add shadcn/ui Input, Select, Dialog, and Tabs components"
```

---

### Task 7: Create Skeleton + AlertDialog + Tooltip + Accordion

**Files:**
- Create: `src/components/ui/skeleton.tsx`
- Create: `src/components/ui/alert-dialog.tsx`
- Create: `src/components/ui/tooltip.tsx`
- Create: `src/components/ui/accordion.tsx`

- [ ] **Step 1: Create `src/components/ui/skeleton.tsx`**

```tsx
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />
}

export { Skeleton }
```

- [ ] **Step 2: Create `src/components/ui/alert-dialog.tsx`**

```tsx
"use client"

import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const AlertDialog = AlertDialogPrimitive.Root
const AlertDialogTrigger = AlertDialogPrimitive.Trigger
const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = React.forwardRef<React.ComponentRef<typeof AlertDialogPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>>(
  ({ className, ...props }, ref) => (
    <AlertDialogPrimitive.Overlay className={cn("fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className)} {...props} ref={ref} />
  )
)
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const AlertDialogContent = React.forwardRef<React.ComponentRef<typeof AlertDialogPrimitive.Content>, React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>>(
  ({ className, ...props }, ref) => (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content ref={ref} className={cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg", className)} {...props} />
    </AlertDialogPortal>
  )
)
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef<React.ComponentRef<typeof AlertDialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>>(
  ({ className, ...props }, ref) => <AlertDialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
)
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const AlertDialogDescription = React.forwardRef<React.ComponentRef<typeof AlertDialogPrimitive.Description>, React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>>(
  ({ className, ...props }, ref) => <AlertDialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
)
AlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName

const AlertDialogAction = React.forwardRef<React.ComponentRef<typeof AlertDialogPrimitive.Action>, React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>>(
  ({ className, ...props }, ref) => <AlertDialogPrimitive.Action ref={ref} className={cn(buttonVariants(), className)} {...props} />
)
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const AlertDialogCancel = React.forwardRef<React.ComponentRef<typeof AlertDialogPrimitive.Cancel>, React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>>(
  ({ className, ...props }, ref) => <AlertDialogPrimitive.Cancel ref={ref} className={cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className)} {...props} />
)
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export { AlertDialog, AlertDialogPortal, AlertDialogOverlay, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel }
```

- [ ] **Step 3: Create `src/components/ui/tooltip.tsx`**

```tsx
"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<React.ComponentRef<typeof TooltipPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>>(
  ({ className, sideOffset = 4, ...props }, ref) => (
    <TooltipPrimitive.Content ref={ref} sideOffset={sideOffset} className={cn("z-50 overflow-hidden rounded-md border bg-background px-3 py-1.5 text-sm text-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95", className)} {...props} />
  )
)
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
```

- [ ] **Step 4: Create `src/components/ui/accordion.tsx`**

```tsx
"use client"

import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<React.ComponentRef<typeof AccordionPrimitive.Item>, React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>>(
  ({ className, ...props }, ref) => <AccordionPrimitive.Item ref={ref} className={cn("border-b border-border", className)} {...props} />
)
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<React.ComponentRef<typeof AccordionPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>>(
  ({ className, children, ...props }, ref) => (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger ref={ref} className={cn("flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180", className)} {...props}>
        {children}
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
)
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

const AccordionContent = React.forwardRef<React.ComponentRef<typeof AccordionPrimitive.Content>, React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>>(
  ({ className, children, ...props }, ref) => (
    <AccordionPrimitive.Content ref={ref} className="overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down" {...props}>
      <div className={cn("pb-4 pt-0", className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
)
AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/skeleton.tsx src/components/ui/alert-dialog.tsx src/components/ui/tooltip.tsx src/components/ui/accordion.tsx
git commit -m "feat: add Skeleton, AlertDialog, Tooltip, and Accordion components"
```

---

### Task 8: Refactor Header (Navbar translúcida + mobile menu + theme toggle)

**Files:**
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: Replace `src/components/layout/Header.tsx`**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "feat: refactor Header with translucent navbar, mobile menu, and theme toggle"
```

---

### Task 9: Refactor Footer

**Files:**
- Modify: `src/components/layout/Footer.tsx`

- [ ] **Step 1: Replace `src/components/layout/Footer.tsx`**

```tsx
export function Footer() {
  return (
    <footer className="border-t border-border bg-background mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <p className="text-center text-sm text-muted-foreground font-display tracking-wide">
          BOLÃO COPA DO MUNDO 2026 &copy; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/Footer.tsx
git commit -m "feat: refactor Footer with new design"
```

---

### Task 10: Delete Old Uppercase UI Components

**Files:**
- Delete: `src/components/ui/Button.tsx`
- Delete: `src/components/ui/Card.tsx`
- Delete: `src/components/ui/Badge.tsx`
- Delete: `src/components/ui/Table.tsx`
- Delete: `src/components/ui/Input.tsx`
- Delete: `src/components/ui/Select.tsx`
- Delete: `src/components/ui/Modal.tsx`
- Delete: `src/components/ui/Tabs.tsx`

- [ ] **Step 1: Delete old component files**

```bash
rm src/components/ui/Button.tsx src/components/ui/Card.tsx src/components/ui/Badge.tsx src/components/ui/Table.tsx src/components/ui/Input.tsx src/components/ui/Select.tsx src/components/ui/Modal.tsx src/components/ui/Tabs.tsx
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove old uppercase UI components replaced by shadcn/ui"
```

---

### Task 11: Migrate Home Page + Hero + GameCard + RankingTable

**Files:**
- Create: `src/components/public/hero.tsx`
- Modify: `src/components/public/GameCard.tsx`
- Modify: `src/components/public/RankingTable.tsx`
- Modify: `src/app/(public)/page.tsx`

- [ ] **Step 1: Create `src/components/public/hero.tsx`**

```tsx
import { Users, Trophy, Calendar } from "lucide-react"

interface HeroProps {
  totalParticipantes: number
  totalJogos: number
}

export function Hero({ totalParticipantes, totalJogos }: HeroProps) {
  return (
    <section className="relative overflow-hidden py-12 sm:py-16">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 border border-secondary/30">
          <Trophy className="w-4 h-4 text-secondary" />
          <span className="text-sm font-medium text-secondary-foreground">Copa do Mundo 2026</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display tracking-wide text-foreground">BOLÃO DA FAMÍLIA</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Faça seus palpites e dispute o ranking com a família!</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg mx-auto pt-4">
          <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-card border border-border">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-2xl font-display text-primary">{totalParticipantes}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Participantes</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-card border border-border">
            <Calendar className="w-5 h-5 text-primary" />
            <span className="text-2xl font-display text-primary">{totalJogos}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Jogos</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-card border border-border col-span-2 sm:col-span-1">
            <Trophy className="w-5 h-5 text-secondary" />
            <span className="text-2xl font-display text-primary">380</span>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Pts Máx</span>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Replace `src/components/public/GameCard.tsx`**

```tsx
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { FASE_LABELS } from "@/lib/utils/constants"
import { Calendar, ChevronRight } from "lucide-react"

interface GameCardProps {
  id?: string
  timeA: string
  timeB: string
  dataHora: Date
  grupo: string | null
  fase: string
  resultadoA: number | null
  resultadoB: number | null
  status: string
}

export function GameCard({ id, timeA, timeB, dataHora, grupo, fase, resultadoA, resultadoB, status }: GameCardProps) {
  const dataFormatada = dataHora.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
  const horaFormatada = dataHora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  const finalizado = status === "finalizado"

  const content = (
    <Card className="group cursor-pointer hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          {grupo ? <Badge variant="info">Grupo {grupo}</Badge> : <Badge>{FASE_LABELS[fase] ?? fase}</Badge>}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {dataFormatada} · {horaFormatada}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-right"><span className="font-display text-lg tracking-wide">{timeA}</span></div>
          <div className="shrink-0">
            {finalizado ? (
              <span className="text-2xl font-display font-bold text-primary tabular-nums">{resultadoA} - {resultadoB}</span>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">vs</span>
            )}
          </div>
          <div className="flex-1 text-left"><span className="font-display text-lg tracking-wide">{timeB}</span></div>
        </div>
      </CardContent>
      <CardFooter className="px-4 pb-4 pt-0">
        {finalizado && <Badge variant="success">Finalizado</Badge>}
        {status === "em_andamento" && <Badge variant="warning">Em andamento</Badge>}
        {status === "agendado" && (
          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
            Ver palpites <ChevronRight className="w-3 h-3" />
          </div>
        )}
      </CardFooter>
    </Card>
  )

  if (id) {
    return <Link href={`/jogos/${id}`} className="block focus:outline-none focus:ring-2 focus:ring-ring rounded-lg">{content}</Link>
  }
  return content
}
```

- [ ] **Step 3: Replace `src/components/public/RankingTable.tsx`**

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import type { RankingEntry } from "@/lib/utils/types"

interface RankingTableProps { ranking: RankingEntry[] }

const posicaoBadges: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" }

export function RankingTable({ ranking }: RankingTableProps) {
  if (ranking.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <span className="text-6xl mb-4">⚽</span>
        <h3 className="text-xl font-semibold mb-2">Nenhum participante ainda</h3>
        <p className="text-muted-foreground text-center max-w-md">Os participantes aparecerão aqui quando cadastrados.</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Participante</TableHead>
          <TableHead className="text-right">Pts</TableHead>
          <TableHead className="text-center">Exatas</TableHead>
          <TableHead className="text-center">Vencedores</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ranking.map((entry, index) => {
          const posicao = index + 1
          return (
            <TableRow key={entry.participanteId}>
              <TableCell>{posicaoBadges[posicao] ? <span className="text-lg">{posicaoBadges[posicao]}</span> : <span className="text-muted-foreground font-medium">{posicao}</span>}</TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  {entry.fotoUrl ? (
                    <img src={entry.fotoUrl} alt={entry.nome} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">{entry.nome.charAt(0).toUpperCase()}</div>
                  )}
                  <span className="font-medium">{entry.nome}</span>
                </div>
              </TableCell>
              <TableCell className="text-right"><span className="font-display text-xl text-primary">{entry.pontos}</span></TableCell>
              <TableCell className="text-center">{entry.placaresExatos}</TableCell>
              <TableCell className="text-center">{entry.vencedoresCorretos}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
```

- [ ] **Step 4: Replace `src/app/(public)/page.tsx`**

```tsx
import Link from "next/link"
import { getJogosDoDia, getTodosJogos } from "@/lib/db/queries/jogos"
import { getRanking } from "@/lib/db/queries/ranking"
import { getTodosParticipantes } from "@/lib/db/queries/participantes"
import { GameCard } from "@/components/public/GameCard"
import { RankingTable } from "@/components/public/RankingTable"
import { Hero } from "@/components/public/hero"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronRight, Trophy } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const [jogosDoDia, ranking, todosJogos, participantes] = await Promise.all([
    getJogosDoDia(), getRanking(), getTodosJogos(), getTodosParticipantes(),
  ])
  const top5 = ranking.slice(0, 5)

  return (
    <div className="space-y-10">
      <Hero totalParticipantes={participantes.length} totalJogos={todosJogos.length} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display tracking-wide">Jogos do Dia</h2>
            <Button variant="ghost" size="sm" asChild><Link href="/jogos">Ver todos <ChevronRight className="w-4 h-4" /></Link></Button>
          </div>
          {jogosDoDia.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jogosDoDia.map((jogo) => (
                <GameCard key={jogo.id} id={jogo.id} timeA={jogo.timeA} timeB={jogo.timeB} dataHora={jogo.dataHora} grupo={jogo.grupo} fase={jogo.fase} resultadoA={jogo.resultadoA} resultadoB={jogo.resultadoB} status={jogo.status} />
              ))}
            </div>
          ) : (
            <Card><CardContent className="flex flex-col items-center justify-center py-12">
              <span className="text-6xl mb-4">⚽</span>
              <h3 className="text-xl font-semibold mb-2">Nenhum jogo hoje</h3>
              <p className="text-muted-foreground text-center max-w-md">Os jogos da fase de grupos serão exibidos aqui em breve.</p>
            </CardContent></Card>
          )}
        </section>
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Trophy className="w-5 h-5 text-secondary" /><h2 className="text-2xl font-display tracking-wide">Ranking</h2></div>
            <Button variant="ghost" size="sm" asChild><Link href="/ranking">Ver completo <ChevronRight className="w-4 h-4" /></Link></Button>
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Top 5 participantes</CardTitle></CardHeader>
            <CardContent className="p-0"><RankingTable ranking={top5} /></CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/components/public/hero.tsx src/components/public/GameCard.tsx src/components/public/RankingTable.tsx "src/app/(public)/page.tsx"
git commit -m "feat: revamp home page with hero, stats, and new card designs"
```

---

### Task 12: Migrate Jogos Pages

**Files:**
- Modify: `src/app/(public)/jogos/page.tsx`
- Modify: `src/app/(public)/jogos/[id]/page.tsx`

- [ ] **Step 1: Replace `src/app/(public)/jogos/page.tsx`**

```tsx
import Link from 'next/link'
import { getTodosJogos } from '@/lib/db/queries/jogos'
import { GameCard } from '@/components/public/GameCard'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { FASE_LABELS } from '@/lib/utils/constants'

export const dynamic = 'force-dynamic'

const faseOrder = ['grupos', 'oitavas', 'quartas', 'semifinal', 'terceiro', 'final']

export default async function JogosPage() {
  const jogos = await getTodosJogos()

  const fasesMap = new Map<string, typeof jogos>()
  for (const jogo of jogos) {
    const fase = jogo.fase
    if (!fasesMap.has(fase)) fasesMap.set(fase, [])
    fasesMap.get(fase)!.push(jogo)
  }

  const fasesOrdenadas = faseOrder.filter((f) => fasesMap.has(f))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      <h1 className="text-3xl font-display tracking-wide">Jogos</h1>

      {fasesOrdenadas.map((fase) => {
        const jogosDaFase = fasesMap.get(fase)!

        if (fase === 'grupos') {
          const gruposMap = new Map<string, typeof jogos>()
          for (const jogo of jogosDaFase) {
            const grupo = jogo.grupo ?? '?'
            if (!gruposMap.has(grupo)) gruposMap.set(grupo, [])
            gruposMap.get(grupo)!.push(jogo)
          }

          const gruposOrdenados = Array.from(gruposMap.entries()).sort(([a], [b]) =>
            a.localeCompare(b)
          )

          return (
            <section key={fase} className="space-y-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-display tracking-wide">{FASE_LABELS[fase]}</h2>
                <Badge>{jogosDaFase.length} jogos</Badge>
              </div>

              {gruposOrdenados.map(([grupo, jogosDoGrupo]) => (
                <div key={grupo} className="space-y-3">
                  <h3 className="text-lg font-semibold">Grupo {grupo}</h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {jogosDoGrupo.map((jogo) => (
                      <GameCard
                        key={jogo.id}
                        id={jogo.id}
                        timeA={jogo.timeA}
                        timeB={jogo.timeB}
                        dataHora={jogo.dataHora}
                        grupo={jogo.grupo}
                        fase={jogo.fase}
                        resultadoA={jogo.resultadoA}
                        resultadoB={jogo.resultadoB}
                        status={jogo.status}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )
        }

        return (
          <section key={fase} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-display tracking-wide">{FASE_LABELS[fase]}</h2>
              <Badge>{jogosDaFase.length} jogos</Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {jogosDaFase.map((jogo) => (
                <GameCard
                  key={jogo.id}
                  id={jogo.id}
                  timeA={jogo.timeA}
                  timeB={jogo.timeB}
                  dataHora={jogo.dataHora}
                  grupo={jogo.grupo}
                  fase={jogo.fase}
                  resultadoA={jogo.resultadoA}
                  resultadoB={jogo.resultadoB}
                  status={jogo.status}
                />
              ))}
            </div>
          </section>
        )
      })}

      {jogos.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <span className="text-6xl mb-4">⚽</span>
            <h3 className="text-xl font-semibold mb-2">Nenhum jogo encontrado</h3>
            <p className="text-muted-foreground text-center max-w-md">Os jogos aparecerão aqui quando cadastrados.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Replace `src/app/(public)/jogos/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getJogoById } from '@/lib/db/queries/jogos'
import { getConfiguracao } from '@/lib/db/queries/config'
import { getRanking } from '@/lib/db/queries/ranking'
import { calcularPontosJogo } from '@/lib/utils/helpers'
import { FASE_LABELS } from '@/lib/utils/constants'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Calendar, ChevronLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

const statusLabels: Record<string, string> = {
  agendado: 'Agendado',
  em_andamento: 'Em andamento',
  finalizado: 'Finalizado',
}

const statusVariants: Record<string, 'default' | 'warning' | 'success'> = {
  agendado: 'default',
  em_andamento: 'warning',
  finalizado: 'success',
}

export default async function JogoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [jogo, config, ranking] = await Promise.all([
    getJogoById(id),
    getConfiguracao(),
    getRanking(),
  ])

  if (!jogo) notFound()

  const rankingMap = new Map(ranking.map((r, idx) => [r.participanteId, { ...r, posicao: idx + 1 }]))

  const palpitesComPontos = jogo.palpites.map((palpite) => {
    let pontos = 0
    let tipo: 'exato' | 'vencedor' | 'erro' = 'erro'

    if (jogo.status === 'finalizado' && jogo.resultadoA !== null && jogo.resultadoB !== null) {
      const resultado = calcularPontosJogo(
        palpite.placarA,
        palpite.placarB,
        jogo.resultadoA,
        jogo.resultadoB,
        config
      )
      pontos = resultado.pontos
      tipo = resultado.tipo
    }

    const rankingEntry = rankingMap.get(palpite.participanteId)
    const posicaoRanking = rankingEntry?.posicao ?? null

    return { ...palpite, pontos, tipo, posicaoRanking }
  })

  palpitesComPontos.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos
    return a.participante.nome.localeCompare(b.participante.nome)
  })

  const dataFormatada = jogo.dataHora.toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const horaFormatada = jogo.dataHora.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/jogos"><ChevronLeft className="w-4 h-4" /> Voltar aos jogos</Link>
      </Button>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {jogo.grupo ? <Badge variant="info">Grupo {jogo.grupo}</Badge> : <Badge variant="info">{FASE_LABELS[jogo.fase] ?? jogo.fase}</Badge>}
              <Badge variant={statusVariants[jogo.status] ?? 'default'}>{statusLabels[jogo.status] ?? jogo.status}</Badge>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {dataFormatada} · {horaFormatada}
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 py-4">
            <div className="flex-1 text-right">
              <span className="text-xl sm:text-2xl font-display tracking-wide">{jogo.timeA}</span>
            </div>
            <div className="shrink-0">
              {jogo.status === 'finalizado' ? (
                <span className="text-3xl sm:text-4xl font-display font-bold text-primary tabular-nums">{jogo.resultadoA} - {jogo.resultadoB}</span>
              ) : (
                <span className="text-lg font-medium text-muted-foreground">vs</span>
              )}
            </div>
            <div className="flex-1 text-left">
              <span className="text-xl sm:text-2xl font-display tracking-wide">{jogo.timeB}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-2xl font-display tracking-wide">Palpites ({palpitesComPontos.length})</h2>

        {palpitesComPontos.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participante</TableHead>
                  <TableHead>Palpite</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {palpitesComPontos.map((palpite) => (
                  <TableRow key={palpite.id}>
                    <TableCell>
                      <Link href={`/participantes/${palpite.participanteId}`} className="flex items-center gap-3 hover:text-primary transition-colors">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                          {palpite.participante.fotoUrl ? (
                            <img src={palpite.participante.fotoUrl} alt={palpite.participante.nome} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-muted-foreground">{palpite.participante.nome.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{palpite.participante.nome}</span>
                          {palpite.posicaoRanking && <span className="text-xs text-muted-foreground">{palpite.posicaoRanking}º no ranking</span>}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell><span className="font-semibold tabular-nums">{palpite.placarA} x {palpite.placarB}</span></TableCell>
                    <TableCell className="text-right">
                      {jogo.status === 'finalizado' ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-display text-lg text-primary">{palpite.pontos}</span>
                          {palpite.tipo === 'exato' && <Badge variant="success">Exato</Badge>}
                          {palpite.tipo === 'vencedor' && <Badge variant="info">Vencedor</Badge>}
                          {palpite.tipo === 'erro' && <Badge variant="destructive">Erro</Badge>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <span className="text-6xl mb-4">⚽</span>
              <h3 className="text-xl font-semibold mb-2">Nenhum palpite registrado</h3>
              <p className="text-muted-foreground text-center max-w-md">Os palpites aparecerão aqui quando cadastrados.</p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/(public)/jogos/page.tsx" "src/app/(public)/jogos/[id]/page.tsx"
git commit -m "feat: revamp jogos listing and detail pages"
```

---

### Task 13: Migrate Ranking Page + Podium

**Files:**
- Create: `src/components/public/ranking-podium.tsx`
- Modify: `src/app/(public)/ranking/page.tsx`

- [ ] **Step 1: Create `src/components/public/ranking-podium.tsx`**

```tsx
import type { RankingEntry } from "@/lib/utils/types"

interface RankingPodiumProps { ranking: RankingEntry[] }

const podiumStyles = [
  { border: "border-t-4 border-t-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/10", label: "1º", size: "w-20 h-20" },
  { border: "border-t-4 border-t-gray-300", bg: "bg-gray-50 dark:bg-gray-800/30", label: "2º", size: "w-16 h-16" },
  { border: "border-t-4 border-t-amber-600", bg: "bg-amber-50 dark:bg-amber-900/10", label: "3º", size: "w-16 h-16" },
]

export function RankingPodium({ ranking }: RankingPodiumProps) {
  const top3 = ranking.slice(0, 3)
  if (top3.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {top3.map((entry, index) => {
        const style = podiumStyles[index]
        return (
          <div key={entry.participanteId} className={`rounded-lg border border-border ${style.border} ${style.bg} p-6 flex flex-col items-center gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}>
            <span className="text-sm font-medium text-muted-foreground">{style.label}</span>
            <div className={`${style.size} rounded-full overflow-hidden bg-background flex items-center justify-center ring-2 ring-border`}>
              {entry.fotoUrl ? (
                <img src={entry.fotoUrl} alt={entry.nome} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-display font-bold text-primary">{entry.nome.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <span className="font-semibold text-center">{entry.nome}</span>
            <span className="text-2xl font-display font-bold text-primary">{entry.pontos} pts</span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Replace `src/app/(public)/ranking/page.tsx`**

```tsx
import { getRanking } from '@/lib/db/queries/ranking'
import { RankingTable } from '@/components/public/RankingTable'
import { RankingPodium } from '@/components/public/ranking-podium'
import { Card, CardContent } from '@/components/ui/card'
import { Trophy, Target, BarChart3 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function RankingPage() {
  const ranking = await getRanking()

  const maiorPontuacao = ranking.length > 0 ? ranking[0].pontos : 0
  const mediaPontos = ranking.length > 0 ? Math.round(ranking.reduce((sum, r) => sum + r.pontos, 0) / ranking.length) : 0
  const totalExatos = ranking.reduce((sum, r) => sum + r.placaresExatos, 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      <h1 className="text-3xl font-display tracking-wide">Ranking</h1>

      {ranking.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <span className="text-6xl mb-4">🏆</span>
            <h3 className="text-xl font-semibold mb-2">Nenhum participante ainda</h3>
            <p className="text-muted-foreground text-center max-w-md">Os participantes aparecerão aqui quando cadastrados.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Maior pontuação</p>
                  <p className="text-xl font-display text-primary">{maiorPontuacao} pts</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Média de pontos</p>
                  <p className="text-xl font-display text-primary">{mediaPontos} pts</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Placares exatos</p>
                  <p className="text-xl font-display text-primary">{totalExatos}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <RankingPodium ranking={ranking} />

          <Card>
            <RankingTable ranking={ranking} />
          </Card>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/public/ranking-podium.tsx "src/app/(public)/ranking/page.tsx"
git commit -m "feat: revamp ranking page with podium and stats summary"
```

---

### Task 14: Migrate Participantes Pages

**Files:**
- Modify: `src/components/public/ParticipantCard.tsx`
- Modify: `src/components/public/PalpitesTable.tsx`
- Modify: `src/app/(public)/participantes/page.tsx`
- Modify: `src/app/(public)/participantes/[id]/page.tsx`

- [ ] **Step 1: Replace `src/components/public/ParticipantCard.tsx`**

```tsx
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

interface ParticipantCardProps {
  id: string
  nome: string
  fotoUrl: string | null
}

export function ParticipantCard({ id, nome, fotoUrl }: ParticipantCardProps) {
  return (
    <Link href={`/participantes/${id}`} className="rounded-lg focus:ring-2 focus:ring-ring focus:outline-none block">
      <Card className="group hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg transition-all duration-300">
        <CardContent className="flex flex-col items-center gap-3 p-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-muted flex items-center justify-center ring-2 ring-border group-hover:ring-primary/30 transition-all">
            {fotoUrl ? (
              <img src={fotoUrl} alt={nome} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-display font-bold text-primary">{nome.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <span className="font-semibold text-sm text-center">{nome}</span>
        </CardContent>
      </Card>
    </Link>
  )
}
```

- [ ] **Step 2: Replace `src/components/public/PalpitesTable.tsx`**

```tsx
import { calcularPontosJogo } from '@/lib/utils/helpers'
import type { ConfiguracaoPontuacao } from '@/lib/utils/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

interface JogoPalpite {
  timeA: string
  timeB: string
  dataHora: Date
  resultadoA: number | null
  resultadoB: number | null
  status: string
}

interface PalpiteRow {
  id: string
  placarA: number
  placarB: number
  jogo: JogoPalpite
}

interface PalpitesTableProps {
  titulo: string
  palpites: PalpiteRow[]
  config: ConfiguracaoPontuacao
}

export function PalpitesTable({ titulo, palpites, config }: PalpitesTableProps) {
  return (
    <Card>
      <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jogo</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Palpite</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead className="text-right">Pts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {palpites.map((palpite) => {
              const finalizado = palpite.jogo.status === 'finalizado'
              const resultadoA = palpite.jogo.resultadoA
              const resultadoB = palpite.jogo.resultadoB
              let ptsJogo = 0
              if (finalizado && resultadoA !== null && resultadoB !== null) {
                ptsJogo = calcularPontosJogo(
                  palpite.placarA, palpite.placarB,
                  resultadoA, resultadoB,
                  config
                ).pontos
              }
              const dataFormatada = palpite.jogo.dataHora.toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit',
              })
              return (
                <TableRow key={palpite.id}>
                  <TableCell>{palpite.jogo.timeA} vs {palpite.jogo.timeB}</TableCell>
                  <TableCell>{dataFormatada}</TableCell>
                  <TableCell>{palpite.placarA} x {palpite.placarB}</TableCell>
                  <TableCell>{finalizado ? `${resultadoA} x ${resultadoB}` : '-'}</TableCell>
                  <TableCell className="text-right">
                    {finalizado ? (
                      <Badge variant={ptsJogo > 0 ? 'success' : 'default'}>{ptsJogo}</Badge>
                    ) : '-'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Replace `src/app/(public)/participantes/page.tsx`**

```tsx
import { getTodosParticipantes } from '@/lib/db/queries/participantes'
import { ParticipantCard } from '@/components/public/ParticipantCard'
import { Card, CardContent } from '@/components/ui/card'
import { Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ParticipantesPage() {
  const participantes = await getTodosParticipantes()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-display tracking-wide">Participantes</h1>
        <p className="text-muted-foreground mt-1">{participantes.length} participante{participantes.length !== 1 ? 's' : ''} cadastrado{participantes.length !== 1 ? 's' : ''}</p>
      </div>

      {participantes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum participante</h3>
            <p className="text-muted-foreground text-center max-w-md">Os participantes aparecerão aqui quando cadastrados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {participantes.map((p) => (
            <ParticipantCard key={p.id} id={p.id} nome={p.nome} fotoUrl={p.fotoUrl} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Replace `src/app/(public)/participantes/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { getParticipanteById } from '@/lib/db/queries/participantes'
import { getRanking } from '@/lib/db/queries/ranking'
import { getConfiguracao } from '@/lib/db/queries/config'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { PalpitesTable } from '@/components/public/PalpitesTable'
import { FASE_LABELS } from '@/lib/utils/constants'
import { Trophy, Award } from 'lucide-react'

export const dynamic = 'force-dynamic'

const tipoExtraLabels: Record<string, string> = {
  artilheiro: 'Artilheiro',
  campeao: 'Campeão',
  vice: 'Vice-campeão',
  terceiro: '3º Colocado',
  quarto: '4º Colocado',
}

export default async function ParticipanteProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [participante, ranking, config] = await Promise.all([
    getParticipanteById(id),
    getRanking(),
    getConfiguracao(),
  ])

  if (!participante) notFound()

  const rankingEntry = ranking.find((r) => r.participanteId === id)
  const posicao = rankingEntry ? ranking.indexOf(rankingEntry) + 1 : null
  const pontos = rankingEntry?.pontos ?? 0

  const palpitesGrupos = participante.palpites.filter((p) => p.jogo.fase === 'grupos')
  const palpitesEliminatorias = participante.palpites.filter((p) => p.jogo.fase !== 'grupos')

  const gruposMap = new Map<string, typeof participante.palpites>()
  for (const palpite of palpitesGrupos) {
    const grupo = palpite.jogo.grupo ?? '?'
    if (!gruposMap.has(grupo)) gruposMap.set(grupo, [])
    gruposMap.get(grupo)!.push(palpite)
  }

  const fasesMap = new Map<string, typeof participante.palpites>()
  for (const palpite of palpitesEliminatorias) {
    const fase = palpite.jogo.fase
    if (!fasesMap.has(fase)) fasesMap.set(fase, [])
    fasesMap.get(fase)!.push(palpite)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-28 h-28 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 ring-4 ring-border">
            {participante.fotoUrl ? (
              <img src={participante.fotoUrl} alt={participante.nome} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-display font-bold text-primary">{participante.nome.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="text-center sm:text-left space-y-2">
            <h1 className="text-2xl font-display tracking-wide">{participante.nome}</h1>
            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <div className="flex items-center gap-1"><Trophy className="w-4 h-4 text-primary" /><Badge variant="success">{pontos} pts</Badge></div>
              {posicao && <div className="flex items-center gap-1"><Award className="w-4 h-4 text-secondary" /><Badge variant="info">{posicao}º no ranking</Badge></div>}
            </div>
          </div>
        </CardContent>
      </Card>

      {gruposMap.size > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-display tracking-wide">Palpites - Fase de Grupos</h2>
          {Array.from(gruposMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([grupo, palpites]) => (
              <PalpitesTable key={grupo} titulo={`Grupo ${grupo}`} palpites={palpites} config={config} />
            ))}
        </section>
      )}

      {fasesMap.size > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-display tracking-wide">Palpites - Eliminatórias</h2>
          {Array.from(fasesMap.entries()).map(([fase, palpites]) => (
            <PalpitesTable key={fase} titulo={FASE_LABELS[fase] ?? fase} palpites={palpites} config={config} />
          ))}
        </section>
      )}

      {participante.extras.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-display tracking-wide">Palpites Extras</h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Palpite</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participante.extras.map((extra) => (
                  <TableRow key={extra.id}>
                    <TableCell>{tipoExtraLabels[extra.tipo] ?? extra.tipo}</TableCell>
                    <TableCell className="font-semibold">{extra.valor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/components/public/ParticipantCard.tsx src/components/public/PalpitesTable.tsx "src/app/(public)/participantes/page.tsx" "src/app/(public)/participantes/[id]/page.tsx"
git commit -m "feat: revamp participantes listing and profile pages"
```

---

### Task 15: Migrate Regras Page

**Files:**
- Modify: `src/app/(public)/regras/page.tsx`

- [ ] **Step 1: Replace `src/app/(public)/regras/page.tsx`**

```tsx
import { Card, CardContent } from '@/components/ui/card'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table'

export default function RegrasPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-display tracking-wide">Regras</h1>
        <p className="text-muted-foreground mt-1">Tudo sobre a pontuação e funcionamento do bolão</p>
      </div>

      <Accordion type="multiple" defaultValue={['pontuacao', 'desempate', 'como-funciona']} className="space-y-0">
        <AccordionItem value="pontuacao" className="border border-border rounded-lg px-4">
          <AccordionTrigger>
            <h2 className="text-xl font-display tracking-wide">Pontuação</h2>
          </AccordionTrigger>
          <AccordionContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Palpite</TableHead>
                  <TableHead className="text-right">Pontos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow><TableCell>Placar exato</TableCell><TableCell className="text-right font-display text-lg text-primary">10</TableCell></TableRow>
                <TableRow><TableCell>Vencedor correto (sem placar exato)</TableCell><TableCell className="text-right font-display text-lg text-primary">6</TableCell></TableRow>
                <TableRow><TableCell>Campeão</TableCell><TableCell className="text-right font-display text-lg text-primary">10</TableCell></TableRow>
                <TableRow><TableCell>Vice-campeão</TableCell><TableCell className="text-right font-display text-lg text-primary">10</TableCell></TableRow>
                <TableRow><TableCell>3º lugar</TableCell><TableCell className="text-right font-display text-lg text-primary">10</TableCell></TableRow>
                <TableRow><TableCell>4º lugar</TableCell><TableCell className="text-right font-display text-lg text-primary">10</TableCell></TableRow>
                <TableRow><TableCell>Artilheiro da Copa</TableCell><TableCell className="text-right font-display text-lg text-primary">10</TableCell></TableRow>
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-bold">Total máximo</TableCell>
                  <TableCell className="text-right font-display text-xl text-primary">380</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="desempate" className="border border-border rounded-lg px-4">
          <AccordionTrigger>
            <h2 className="text-xl font-display tracking-wide">Critérios de Desempate</h2>
          </AccordionTrigger>
          <AccordionContent>
            <ol className="list-decimal list-inside space-y-2">
              <li>Maior número de <strong>placares exatos</strong></li>
              <li>Maior número de <strong>vencedores corretos</strong></li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="como-funciona" className="border border-border rounded-lg px-4">
          <AccordionTrigger>
            <h2 className="text-xl font-display tracking-wide">Como Funciona</h2>
          </AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc list-inside space-y-2">
              <li>Cada participante faz seus palpites para todos os jogos da Copa do Mundo 2026</li>
              <li>Os pontos são calculados automaticamente conforme os resultados reais</li>
              <li>Palpites extras (campeão, vice, 3º, 4º e artilheiro) valem pontos adicionais</li>
              <li>O ranking é atualizado em tempo real conforme os jogos são finalizados</li>
              <li>Ao final da Copa, o participante com mais pontos será o vencedor do bolão</li>
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/(public)/regras/page.tsx"
git commit -m "feat: revamp regras page with accordion layout"
```

---

### Task 16: Migrate Admin StatsCard + Dashboard + Login

**Files:**
- Modify: `src/components/admin/StatsCard.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/login/page.tsx`

- [ ] **Step 1: Replace `src/components/admin/StatsCard.tsx`**

```tsx
import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  titulo: string
  valor: string | number
  icone?: ReactNode
  variant?: 'default' | 'success' | 'warning'
}

const variantClasses: Record<string, string> = {
  default: 'border-l-4 border-l-primary',
  success: 'border-l-4 border-l-green-500',
  warning: 'border-l-4 border-l-yellow-500',
}

const iconVariantClasses: Record<string, string> = {
  default: 'text-primary',
  success: 'text-green-500',
  warning: 'text-yellow-500',
}

export function StatsCard({ titulo, valor, icone, variant = 'default' }: StatsCardProps) {
  return (
    <Card className={cn(variantClasses[variant], 'hover:-translate-y-0.5 transition-transform')}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {icone && <div className={`text-2xl ${iconVariantClasses[variant]}`}>{icone}</div>}
          <div>
            <p className="text-sm text-muted-foreground font-medium">{titulo}</p>
            <p className="text-2xl font-display text-foreground">{valor}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Replace `src/app/admin/page.tsx`**

```tsx
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { StatsCard } from '@/components/admin/StatsCard'
import { getTodosParticipantes } from '@/lib/db/queries/participantes'
import { getJogosDoDia, getTodosJogos } from '@/lib/db/queries/jogos'
import { getRanking } from '@/lib/db/queries/ranking'
import { prisma } from '@/lib/db/client'
import { Users, Calendar, Trophy, Upload, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

const statusMap: Record<string, { variant: 'success' | 'destructive' | 'warning'; label: string }> = {
  sucesso: { variant: 'success', label: 'Sucesso' },
  falha: { variant: 'destructive', label: 'Falha' },
  pendente_revisao: { variant: 'warning', label: 'Pendente' },
}

const posicaoBadges: Record<number, { variant: 'secondary' | 'default' | 'destructive'; label: string }> = {
  1: { variant: 'secondary', label: '1º' },
  2: { variant: 'default', label: '2º' },
  3: { variant: 'destructive', label: '3º' },
}

const adminLinks = [
  { href: '/admin/upload', label: 'Upload de Palpites' },
  { href: '/admin/participantes', label: 'Participantes' },
  { href: '/admin/jogos', label: 'Jogos' },
  { href: '/admin/resultados', label: 'Resultados' },
  { href: '/admin/config', label: 'Configurações' },
]

export default async function AdminDashboardPage() {
  const [participantes, jogosHoje, todosJogos, ranking, uploadsRecentes, ultimosUploads] = await Promise.all([
    getTodosParticipantes(),
    getJogosDoDia(),
    getTodosJogos(),
    getRanking(),
    prisma.uploadLog.count({
      where: {
        // eslint-disable-next-line react-hooks/purity
        criadoEm: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.uploadLog.findMany({
      take: 5,
      orderBy: { criadoEm: 'desc' },
      include: { participante: true },
    }),
  ])

  const top3 = ranking.slice(0, 3)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      <h1 className="text-3xl font-display tracking-wide">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard titulo="Total de Participantes" valor={participantes.length} icone={<Users />} variant="default" />
        <StatsCard titulo="Jogos Hoje" valor={jogosHoje.length} icone={<Calendar />} variant="success" />
        <StatsCard titulo="Total de Jogos" valor={todosJogos.length} icone={<Trophy />} variant="default" />
        <StatsCard titulo="Uploads Recentes" valor={uploadsRecentes} icone={<Upload />} variant="warning" />
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-display tracking-wide">Top 3 do Ranking</h2>
        {top3.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-8"><p className="text-muted-foreground">Nenhum participante cadastrado ainda.</p></CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {top3.map((entry, index) => {
              const posicao = index + 1
              const badge = posicaoBadges[posicao]
              return (
                <Card key={entry.participanteId}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    <div className="flex-1 min-w-0"><p className="font-medium truncate">{entry.nome}</p></div>
                    <span className="text-lg font-display text-primary">{entry.pontos} pts</span>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-display tracking-wide">Últimos Uploads</h2>
        {ultimosUploads.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-8"><p className="text-muted-foreground">Nenhum upload registrado.</p></CardContent></Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participante</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ultimosUploads.map((upload) => {
                  const status = statusMap[upload.status] ?? { variant: 'warning' as const, label: upload.status }
                  return (
                    <TableRow key={upload.id}>
                      <TableCell>{upload.participante.nome}</TableCell>
                      <TableCell>{upload.tipoArquivo}</TableCell>
                      <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{upload.criadoEm.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-display tracking-wide">Navegação</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {adminLinks.map((link) => (
            <Button key={link.href} variant="outline" asChild className="h-auto py-4 flex flex-col gap-1">
              <Link href={link.href}>
                <span className="font-medium">{link.label}</span>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Link>
            </Button>
          ))}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Replace `src/app/admin/login/page.tsx`**

```tsx
'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export default function AdminLoginPage() {
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/auth')
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((data) => {
        if (data.autenticado) {
          window.location.href = '/admin'
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        window.location.href = '/admin'
      } else {
        setError(data.error || 'Erro ao autenticar')
      }
    } catch {
      setError('Erro de conexão')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 animate-fade-in-up">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-display tracking-wide">Administração</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="senha" className="text-sm font-medium">Senha</label>
              <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required />
            </div>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</> : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/StatsCard.tsx src/app/admin/page.tsx src/app/admin/login/page.tsx
git commit -m "feat: revamp admin dashboard, login, and stats card"
```

---

### Task 17: Migrate Admin Upload Page

**Files:**
- Modify: `src/components/admin/UploadForm.tsx`
- Modify: `src/components/admin/PreviewTable.tsx`
- Modify: `src/app/admin/upload/page.tsx`

- [ ] **Step 1: Replace `src/components/admin/UploadForm.tsx`**

```tsx
'use client'

import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PalpiteDTO, PalpiteExtraDTO, ValidationResult } from '@/lib/utils/types'

interface UploadFormProps {
  onUploadSuccess: (
    preview: { palpites: PalpiteDTO[]; extras: PalpiteExtraDTO[]; fonte: 'excel' | 'foto' | 'pdf' },
    validacao: ValidationResult
  ) => void
  onFileSelect?: (file: File | null) => void
  participanteId: string
}

export function UploadForm({ onUploadSuccess, onFileSelect, participanteId }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ACCEPTED_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
  ]

  function validateFile(f: File): string | null {
    if (!ACCEPTED_TYPES.includes(f.type)) return 'Formato não suportado. Use .xlsx, .jpg, .png, .webp ou .pdf'
    if (f.size > 10 * 1024 * 1024) return 'Arquivo muito grande (máximo 10MB)'
    return null
  }

  function handleFileSelect(f: File) {
    setError(null)
    const validationError = validateFile(f)
    if (validationError) { setError(validationError); return }
    setFile(f)
    onFileSelect?.(f)
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) { e.preventDefault(); e.stopPropagation(); setDragging(true) }
  function handleDragLeave(e: DragEvent<HTMLDivElement>) { e.preventDefault(); e.stopPropagation(); setDragging(false) }
  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault(); e.stopPropagation(); setDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleFileSelect(droppedFile)
  }
  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) handleFileSelect(selected)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true); setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('participanteId', participanteId)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        const errorDetails = data.detalhes || data.validacao?.erros
        if (Array.isArray(errorDetails) && errorDetails.length > 0) {
          setError(`${data.error || 'Erros de validação'}:\n• ${errorDetails.join('\n• ')}`)
        } else { setError(data.error || 'Erro ao processar arquivo') }
        return
      }
      onUploadSuccess(data.preview, data.validacao)
    } catch { setError('Erro de conexão ao enviar arquivo') }
    finally { setUploading(false) }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn("border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary')}
        >
          <input ref={fileInputRef} type="file" accept=".xlsx,.jpg,.jpeg,.png,.webp,.pdf" onChange={handleInputChange} className="hidden" />
          {file ? (
            <div className="space-y-2">
              <FileText className="w-8 h-8 mx-auto text-primary" />
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">{formatSize(file.size)}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Arraste um arquivo aqui ou clique para selecionar</p>
              <p className="text-sm text-muted-foreground">.xlsx, .jpg, .png, .webp ou .pdf (máx. 10MB)</p>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        {file && (
          <div className="flex justify-end">
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : 'Enviar'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Replace `src/components/admin/PreviewTable.tsx`**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import type { PalpiteDTO, PalpiteExtraDTO, ValidationResult } from '@/lib/utils/types'

interface PreviewTableProps {
  preview: { palpites: PalpiteDTO[]; extras: PalpiteExtraDTO[]; fonte: 'excel' | 'foto' | 'pdf' }
  validacao: ValidationResult
  jogos: Array<{ id: string; timeA: string; timeB: string; grupo?: string | null; fase: string }>
  onEdit: (palpites: PalpiteDTO[], extras: PalpiteExtraDTO[]) => void
}

const EXTRA_LABELS: Record<string, string> = {
  artilheiro: 'Artilheiro', campeao: 'Campeão', vice: 'Vice-campeão', terceiro: '3º Colocado', quarto: '4º Colocado',
}
const EXTRA_ORDER = ['artilheiro', 'campeao', 'vice', 'terceiro', 'quarto'] as const

export function PreviewTable({ preview, validacao, jogos, onEdit }: PreviewTableProps) {
  const [palpites, setPalpites] = useState<PalpiteDTO[]>(preview.palpites)
  const [extras, setExtras] = useState<PalpiteExtraDTO[]>(preview.extras)
  const jogosComPalpite = jogos.filter((jogo) => palpites.some((p) => p.jogoId === jogo.id))

  useEffect(() => { onEdit(palpites, extras) }, [palpites, extras, onEdit])

  function handlePlacarChange(jogoId: string, field: 'placarA' | 'placarB', value: string) {
    const num = Math.max(0, parseInt(value) || 0)
    setPalpites((prev) => prev.map((p) => (p.jogoId === jogoId ? { ...p, [field]: num } : p)))
  }

  function handleExtraChange(tipo: string, value: string) {
    setExtras((prev) => prev.map((e) => (e.tipo === tipo ? { ...e, valor: value } : e)))
  }

  return (
    <div className="space-y-6">
      {validacao.alertas.length > 0 && (
        <div className="space-y-2">
          {validacao.alertas.map((alerta, i) => <Badge key={i} variant="warning">{alerta}</Badge>)}
        </div>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Time A</TableHead>
              <TableHead className="text-center">Placar A</TableHead>
              <TableHead className="text-center w-8">x</TableHead>
              <TableHead className="text-center">Placar B</TableHead>
              <TableHead>Time B</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jogosComPalpite.map((jogo, index) => {
              const palpite = palpites.find((p) => p.jogoId === jogo.id)
              return (
                <TableRow key={jogo.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-medium">{jogo.timeA}</TableCell>
                  <TableCell className="text-center">
                    <Input type="number" min="0" value={palpite?.placarA ?? 0} onChange={(e) => handlePlacarChange(jogo.id, 'placarA', e.target.value)} className="w-16 mx-auto text-center" />
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">x</TableCell>
                  <TableCell className="text-center">
                    <Input type="number" min="0" value={palpite?.placarB ?? 0} onChange={(e) => handlePlacarChange(jogo.id, 'placarB', e.target.value)} className="w-16 mx-auto text-center" />
                  </TableCell>
                  <TableCell className="font-medium">{jogo.timeB}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Extras</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EXTRA_ORDER.map((tipo) => {
              const extra = extras.find((e) => e.tipo === tipo)
              return (
                <div key={tipo} className="flex flex-col gap-1">
                  <label className="text-sm font-medium">{EXTRA_LABELS[tipo]}</label>
                  <Input type="text" value={extra?.valor ?? ''} onChange={(e) => handleExtraChange(tipo, e.target.value)} />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Replace `src/app/admin/upload/page.tsx`**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { UploadForm } from '@/components/admin/UploadForm'
import { PreviewTable } from '@/components/admin/PreviewTable'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { PalpiteDTO, PalpiteExtraDTO, ValidationResult } from '@/lib/utils/types'

interface Participante { id: string; nome: string }
interface Jogo { id: string; timeA: string; timeB: string; grupo?: string | null; fase: string }
type Step = 'select' | 'upload' | 'preview' | 'confirming' | 'success' | 'error'

export default function AdminUploadPage() {
  const [step, setStep] = useState<Step>('select')
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [participanteId, setParticipanteId] = useState('')
  const [preview, setPreview] = useState<{ palpites: PalpiteDTO[]; extras: PalpiteExtraDTO[]; fonte: 'excel' | 'foto' | 'pdf' } | null>(null)
  const [validacao, setValidacao] = useState<ValidationResult | null>(null)
  const [editedPalpites, setEditedPalpites] = useState<PalpiteDTO[]>([])
  const [editedExtras, setEditedExtras] = useState<PalpiteExtraDTO[]>([])
  const [showReplaceDialog, setShowReplaceDialog] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fetchError, setFetchError] = useState('')

  useEffect(() => {
    fetch('/api/participantes').then((r) => r.json()).then((data) => setParticipantes(data)).catch(() => setFetchError('Erro ao carregar participantes'))
    fetch('/api/jogos').then((r) => r.json()).then((data) => setJogos(data)).catch(() => setFetchError((prev) => prev ? prev + ' e jogos' : 'Erro ao carregar jogos'))
  }, [])

  const handleUploadSuccess = useCallback(
    (previewData: { palpites: PalpiteDTO[]; extras: PalpiteExtraDTO[]; fonte: 'excel' | 'foto' | 'pdf' }, validacaoData: ValidationResult) => {
      setPreview(previewData); setValidacao(validacaoData)
      setEditedPalpites(previewData.palpites); setEditedExtras(previewData.extras)
      setStep('preview')
    }, []
  )

  async function handleConfirmClick() {
    if (!participanteId) return
    try {
      const res = await fetch(`/api/participantes?id=${participanteId}`)
      if (res.ok) { const data = await res.json(); if (data.palpites && data.palpites.length > 0) { setShowReplaceDialog(true); return } }
      else { setShowReplaceDialog(true); return }
    } catch { setShowReplaceDialog(true); return }
    await doConfirm()
  }

  async function doConfirm() {
    if (!preview || !participanteId) return
    setConfirming(true); setStep('confirming'); setShowReplaceDialog(false)
    try {
      let arquivoBase64 = ''; let arquivoNome = ''; let arquivoContentType = ''
      if (selectedFile) {
        arquivoNome = selectedFile.name; arquivoContentType = selectedFile.type
        const arrayBuffer = await selectedFile.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer); let binary = ''
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
        arquivoBase64 = btoa(binary)
      }
      const res = await fetch('/api/admin/upload/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participanteId, palpites: editedPalpites, extras: editedExtras, fonte: preview.fonte, arquivoBase64, arquivoNome, arquivoContentType }),
      })
      if (!res.ok) { const data = await res.json(); setErrorMessage(data.error || 'Erro ao confirmar upload'); setStep('error'); return }
      setStep('success'); toast.success('Palpites salvos com sucesso!')
    } catch { setErrorMessage('Erro de conexão ao confirmar'); setStep('error') }
    finally { setConfirming(false) }
  }

  function handleReset() {
    setStep('select'); setParticipanteId(''); setPreview(null); setValidacao(null)
    setEditedPalpites([]); setEditedExtras([]); setErrorMessage(''); setSelectedFile(null)
  }

  const handleEdit = useCallback((palpites: PalpiteDTO[], extras: PalpiteExtraDTO[]) => {
    setEditedPalpites(palpites); setEditedExtras(extras)
  }, [])

  if (step === 'success') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in-up">
        <h1 className="text-3xl font-display tracking-wide">Upload de Palpites</h1>
        <Card><CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <Badge variant="success">Sucesso</Badge>
          <p>Palpites salvos com sucesso!</p>
          <Button onClick={handleReset}>Novo Upload</Button>
        </CardContent></Card>
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in-up">
        <h1 className="text-3xl font-display tracking-wide">Upload de Palpites</h1>
        <Card><CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <Badge variant="destructive">Erro</Badge>
          <p>{errorMessage}</p>
          <Button onClick={handleReset}>Tentar Novamente</Button>
        </CardContent></Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in-up">
      <h1 className="text-3xl font-display tracking-wide">Upload de Palpites</h1>

      {fetchError && (
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Badge variant="destructive">{fetchError}</Badge>
          <Button variant="secondary" onClick={() => window.location.reload()}>Tentar Novamente</Button>
        </CardContent></Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="participante" className="text-sm font-medium">Participante</label>
            <Select id="participante" value={participanteId} onChange={(e) => setParticipanteId(e.target.value)} disabled={step !== 'select'}>
              <option value="">Selecione um participante</option>
              {participantes.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </Select>
          </div>
        </CardContent>
      </Card>

      {step === 'select' && participanteId && (
        <UploadForm participanteId={participanteId} onUploadSuccess={handleUploadSuccess} onFileSelect={setSelectedFile} />
      )}

      {step === 'preview' && preview && (
        <div className="space-y-6">
          <PreviewTable preview={preview} validacao={validacao!} jogos={jogos} onEdit={handleEdit} />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleReset}>Cancelar</Button>
            <Button onClick={handleConfirmClick} disabled={confirming}>
              {confirming ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Confirmar e Salvar'}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Substituir Palpites</DialogTitle>
            <DialogDescription>
              Este participante já possui palpites salvos. Deseja substituir todos os palpites existentes? Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReplaceDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={doConfirm}>Substituir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/UploadForm.tsx src/components/admin/PreviewTable.tsx src/app/admin/upload/page.tsx
git commit -m "feat: revamp admin upload page with new components and toasts"
```

---

### Task 18: Migrate Admin Participantes CRUD

**Files:**
- Modify: `src/app/admin/participantes/page.tsx`

- [ ] **Step 1: Replace `src/app/admin/participantes/page.tsx`**

```tsx
'use client'

import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Loader2, Users } from 'lucide-react'

interface Participante { id: string; nome: string; fotoUrl: string | null }

export default function AdminParticipantesPage() {
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selected, setSelected] = useState<Participante | null>(null)
  const [formNome, setFormNome] = useState('')
  const [formFoto, setFormFoto] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchParticipantes = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/participantes')
      if (!res.ok) throw new Error('Erro ao carregar')
      const data = await res.json()
      setParticipantes(data); setError('')
    } catch { setError('Erro ao carregar participantes') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchParticipantes()
  }, [fetchParticipantes])

  function openAddModal() { setFormNome(''); setFormFoto(null); setFormError(''); setShowAddDialog(true) }
  function openEditModal(p: Participante) { setSelected(p); setFormNome(p.nome); setFormFoto(null); setFormError(''); setShowEditDialog(true) }
  function openDeleteModal(p: Participante) { setSelected(p); setShowDeleteDialog(true) }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (!formNome.trim()) { setFormError('Nome é obrigatório'); return }
    setSubmitting(true); setFormError('')
    try {
      const formData = new FormData()
      formData.append('nome', formNome.trim())
      if (formFoto) formData.append('foto', formFoto)
      const res = await fetch('/api/admin/participantes', { method: 'POST', body: formData })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Erro ao criar') }
      setShowAddDialog(false); fetchParticipantes(); toast.success('Participante criado com sucesso!')
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Erro ao criar participante') }
    finally { setSubmitting(false) }
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault()
    if (submitting || !selected) return
    if (!formNome.trim()) { setFormError('Nome é obrigatório'); return }
    setSubmitting(true); setFormError('')
    try {
      const formData = new FormData()
      formData.append('id', selected.id); formData.append('nome', formNome.trim())
      if (formFoto) formData.append('foto', formFoto)
      const res = await fetch('/api/admin/participantes', { method: 'PUT', body: formData })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Erro ao atualizar') }
      setShowEditDialog(false); fetchParticipantes(); toast.success('Participante atualizado!')
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Erro ao atualizar participante') }
    finally { setSubmitting(false) }
  }

  async function handleDelete() {
    if (!selected) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/participantes?id=${selected.id}`, { method: 'DELETE' })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Erro ao excluir') }
      setShowDeleteDialog(false); setSelected(null); fetchParticipantes(); toast.success('Participante excluído!')
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Erro ao excluir participante') }
    finally { setSubmitting(false) }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <h1 className="text-3xl font-display tracking-wide">Participantes</h1>
        <Card><CardContent className="p-4 space-y-3">
          <Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" />
        </CardContent></Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display tracking-wide">Participantes</h1>
        <Button onClick={openAddModal}>Novo Participante</Button>
      </div>

      {error && (
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Badge variant="destructive">{error}</Badge>
          <Button variant="secondary" size="sm" onClick={fetchParticipantes}>Tentar Novamente</Button>
        </CardContent></Card>
      )}

      {participantes.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Nenhum participante</h3>
          <p className="text-muted-foreground">Cadastre o primeiro participante.</p>
        </CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Foto</TableHead><TableHead>Nome</TableHead><TableHead className="text-right">Ações</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {participantes.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.fotoUrl ? (
                      <img src={p.fotoUrl} alt={p.nome} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary font-bold text-sm">{p.nome.charAt(0).toUpperCase()}</div>
                    )}
                  </TableCell>
                  <TableCell>{p.nome}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="secondary" size="sm" onClick={() => openEditModal(p)}>Editar</Button>
                      <Button variant="destructive" size="sm" onClick={() => openDeleteModal(p)}>Excluir</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Participante</DialogTitle><DialogDescription>Cadastre um novo participante no bolão.</DialogDescription></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="add-nome" className="text-sm font-medium">Nome</label>
              <Input id="add-nome" value={formNome} onChange={(e) => setFormNome(e.target.value)} placeholder="Nome do participante" required />
              {formError && <p className="text-sm text-danger">{formError}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Foto</label>
              <input type="file" accept="image/*" onChange={(e) => setFormFoto(e.target.files?.[0] || null)} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-dark" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>{submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Participante</DialogTitle><DialogDescription>Edite os dados do participante.</DialogDescription></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="edit-nome" className="text-sm font-medium">Nome</label>
              <Input id="edit-nome" value={formNome} onChange={(e) => setFormNome(e.target.value)} placeholder="Nome do participante" required />
              {formError && <p className="text-sm text-danger">{formError}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Foto</label>
              {selected?.fotoUrl && <img src={selected.fotoUrl} alt={selected.nome} className="w-16 h-16 rounded-full object-cover mb-2" />}
              <input type="file" accept="image/*" onChange={(e) => setFormFoto(e.target.files?.[0] || null)} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-white hover:file:bg-primary-dark" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>{submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Participante</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{selected?.nome}</strong>? Todos os palpites, extras e logs de upload associados serão excluídos. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {formError && <Badge variant="destructive">{formError}</Badge>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={submitting} className="bg-danger text-white hover:bg-danger/90">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Excluindo...</> : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/participantes/page.tsx
git commit -m "feat: revamp admin participantes CRUD with dialogs and toasts"
```

---

### Task 19: Migrate Admin Jogos + Resultados + Config Pages

**Files:**
- Modify: `src/app/admin/jogos/page.tsx`
- Modify: `src/app/admin/resultados/page.tsx`
- Modify: `src/app/admin/config/page.tsx`

- [ ] **Step 1: Replace `src/app/admin/jogos/page.tsx`**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { FASE_LABELS } from '@/lib/utils/constants'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

type Fase = 'grupos' | 'oitavas' | 'quartas' | 'semifinal' | 'terceiro' | 'final'
type StatusJogo = 'agendado' | 'em_andamento' | 'finalizado'
interface Jogo { id: string; grupo: string | null; fase: Fase; dataHora: string; timeA: string; timeB: string; resultadoA: number | null; resultadoB: number | null; status: StatusJogo }
interface JogoSaveState { resultadoA: string; resultadoB: string; saving: boolean }

const FASE_ORDER: Fase[] = ['grupos', 'oitavas', 'quartas', 'semifinal', 'terceiro', 'final']
const STATUS_BADGE: Record<StatusJogo, { variant: 'default' | 'warning' | 'success'; label: string }> = {
  agendado: { variant: 'default', label: 'Agendado' },
  em_andamento: { variant: 'warning', label: 'Em Andamento' },
  finalizado: { variant: 'success', label: 'Finalizado' },
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminJogosPage() {
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveStates, setSaveStates] = useState<Record<string, JogoSaveState>>({})

  const fetchJogos = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/jogos')
      if (!res.ok) throw new Error('Erro ao carregar')
      const data = await res.json(); setJogos(data); setError('')
    } catch { setError('Erro ao carregar jogos') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchJogos()
  }, [fetchJogos])

  function getSaveState(jogoId: string): JogoSaveState {
    return saveStates[jogoId] || { resultadoA: '', resultadoB: '', saving: false }
  }
  function updateSaveState(jogoId: string, partial: Partial<JogoSaveState>) {
    setSaveStates((prev) => ({ ...prev, [jogoId]: { ...(prev[jogoId] || { resultadoA: '', resultadoB: '', saving: false }), ...partial } }))
  }

  async function handleSave(jogo: Jogo) {
    const state = getSaveState(jogo.id)
    const rA = state.resultadoA.trim(); const rB = state.resultadoB.trim()
    if (rA === '' || rB === '') { toast.error('Preencha ambos os resultados'); return }
    const numA = parseInt(rA, 10); const numB = parseInt(rB, 10)
    if (isNaN(numA) || isNaN(numB) || numA < 0 || numB < 0) { toast.error('Resultados inválidos'); return }
    updateSaveState(jogo.id, { saving: true })
    try {
      const res = await fetch('/api/admin/jogos', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jogo.id, resultadoA: numA, resultadoB: numB }),
      })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Erro ao salvar') }
      const updated = await res.json()
      setJogos((prev) => prev.map((j) => (j.id === updated.id ? updated : j)))
      updateSaveState(jogo.id, { resultadoA: '', resultadoB: '', saving: false })
      toast.success(`${jogo.timeA} vs ${jogo.timeB} salvo!`)
    } catch (err) {
      updateSaveState(jogo.id, { saving: false })
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    }
  }

  function groupByFase(jogosList: Jogo[]): Record<Fase, Jogo[]> {
    const groups: Record<string, Jogo[]> = {}
    for (const jogo of jogosList) { if (!groups[jogo.fase]) groups[jogo.fase] = []; groups[jogo.fase].push(jogo) }
    return groups as Record<Fase, Jogo[]>
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <h1 className="text-3xl font-display tracking-wide">Jogos</h1>
        <Card><CardContent className="p-4 space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></CardContent></Card>
      </div>
    )
  }

  const grouped = groupByFase(jogos)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      <h1 className="text-3xl font-display tracking-wide">Jogos</h1>

      {error && (
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Badge variant="destructive">{error}</Badge>
          <Button variant="secondary" size="sm" onClick={fetchJogos}>Tentar Novamente</Button>
        </CardContent></Card>
      )}

      {jogos.length === 0 && !error && (
        <Card><CardContent className="flex flex-col items-center justify-center py-12"><p className="text-muted-foreground">Nenhum jogo cadastrado.</p></CardContent></Card>
      )}

      {FASE_ORDER.map((fase) => {
        const faseJogos = grouped[fase]
        if (!faseJogos || faseJogos.length === 0) return null
        return (
          <div key={fase} className="space-y-3">
            <h2 className="text-xl font-display tracking-wide">{FASE_LABELS[fase] || fase}</h2>
            <div className="space-y-3">
              {faseJogos.map((jogo) => {
                const state = getSaveState(jogo.id)
                const statusInfo = STATUS_BADGE[jogo.status]
                return (
                  <Card key={jogo.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {jogo.fase === 'grupos' && jogo.grupo && <Badge variant="info">Grupo {jogo.grupo}</Badge>}
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          </div>
                          <p className="font-medium">{jogo.timeA} vs {jogo.timeB}</p>
                          <p className="text-sm text-muted-foreground">{formatDateTime(jogo.dataHora)}</p>
                          {jogo.resultadoA !== null && jogo.resultadoB !== null && (
                            <p className="text-sm font-semibold mt-1">Resultado: {jogo.resultadoA} x {jogo.resultadoB}</p>
                          )}
                          {jogo.status === 'agendado' && <p className="text-sm text-muted-foreground italic">A realizar</p>}
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-muted-foreground">{jogo.timeA}</label>
                            <Input type="number" min="0" aria-label={`Resultado ${jogo.timeA}`} className="w-16 text-center" value={state.resultadoA} onChange={(e) => updateSaveState(jogo.id, { resultadoA: e.target.value })} disabled={state.saving} />
                          </div>
                          <span className="pb-2 text-muted-foreground font-bold">x</span>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs text-muted-foreground">{jogo.timeB}</label>
                            <Input type="number" min="0" aria-label={`Resultado ${jogo.timeB}`} className="w-16 text-center" value={state.resultadoB} onChange={(e) => updateSaveState(jogo.id, { resultadoB: e.target.value })} disabled={state.saving} />
                          </div>
                          <Button size="sm" onClick={() => handleSave(jogo)} disabled={state.saving}>
                            {state.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Replace `src/app/admin/resultados/page.tsx`**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FASE_LABELS } from '@/lib/utils/constants'
import { toast } from 'sonner'
import { Loader2, RefreshCw } from 'lucide-react'

type Fase = 'grupos' | 'oitavas' | 'quartas' | 'semifinal' | 'terceiro' | 'final'
type StatusJogo = 'agendado' | 'em_andamento' | 'finalizado'
interface Jogo { id: string; grupo: string | null; fase: Fase; dataHora: string; timeA: string; timeB: string; resultadoA: number | null; resultadoB: number | null; status: StatusJogo; sofascoreId: string | null }
interface SyncResult { sofascoreId: string; timeA: string; timeB: string; resultadoA: number; resultadoB: number }

const FASE_ORDER: Fase[] = ['grupos', 'oitavas', 'quartas', 'semifinal', 'terceiro', 'final']
const STATUS_BADGE: Record<StatusJogo, { variant: 'default' | 'warning' | 'success'; label: string }> = {
  agendado: { variant: 'default', label: 'Agendado' },
  em_andamento: { variant: 'warning', label: 'Em Andamento' },
  finalizado: { variant: 'success', label: 'Finalizado' },
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function groupByFase(jogosList: Jogo[]): Record<Fase, Jogo[]> {
  const groups: Record<string, Jogo[]> = {}
  for (const jogo of jogosList) { if (!groups[jogo.fase]) groups[jogo.fase] = []; groups[jogo.fase].push(jogo) }
  return groups as Record<Fase, Jogo[]>
}

export default function AdminResultadosPage() {
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncResults, setSyncResults] = useState<{ atualizados: number; resultados: SyncResult[] } | null>(null)

  const fetchJogos = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/jogos')
      if (!res.ok) throw new Error('Erro ao carregar')
      const data = await res.json(); setJogos(data); setError('')
    } catch { setError('Erro ao carregar jogos') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchJogos()
  }, [fetchJogos])

  async function handleSync() {
    setSyncing(true); setSyncResults(null)
    try {
      const res = await fetch('/api/resultados/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao sincronizar')
      setSyncResults({ atualizados: data.atualizados, resultados: data.resultados })
      await fetchJogos()
      toast.success(`${data.atualizados} jogo(s) atualizado(s)!`)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erro ao sincronizar') }
    finally { setSyncing(false) }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <h1 className="text-3xl font-display tracking-wide">Resultados</h1>
        <Card><CardContent className="p-4 space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></CardContent></Card>
      </div>
    )
  }

  const grouped = groupByFase(jogos)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-display tracking-wide">Resultados</h1>
        <Button onClick={handleSync} disabled={syncing}>
          {syncing ? <><Loader2 className="w-4 h-4 animate-spin" /> Sincronizando...</> : <><RefreshCw className="w-4 h-4" /> Sincronizar Resultados</>}
        </Button>
      </div>

      {error && (
        <Card><CardContent className="p-4 flex items-center gap-2">
          <Badge variant="destructive">{error}</Badge>
          <Button variant="secondary" size="sm" onClick={fetchJogos}>Tentar Novamente</Button>
        </CardContent></Card>
      )}

      {syncResults && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <Badge variant="success">{syncResults.atualizados} jogo{syncResults.atualizados !== 1 ? 's' : ''} atualizado{syncResults.atualizados !== 1 ? 's' : ''}</Badge>
            {syncResults.atualizados === 0 && <p className="text-sm text-muted-foreground">Nenhum jogo foi atualizado nesta sincronização.</p>}
            {syncResults.resultados.length > 0 && (
              <div className="space-y-2">
                {syncResults.resultados.map((r) => (
                  <div key={r.sofascoreId} className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <span className="font-medium">{r.timeA} vs {r.timeB}</span>
                    <Badge variant="info">{r.resultadoA} x {r.resultadoB}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {jogos.length === 0 && !error && (
        <Card><CardContent className="flex flex-col items-center justify-center py-12"><p className="text-muted-foreground">Nenhum jogo cadastrado.</p></CardContent></Card>
      )}

      {jogos.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-display tracking-wide">Jogos Cadastrados</h2>
          {FASE_ORDER.map((fase) => {
            const faseJogos = grouped[fase]
            if (!faseJogos || faseJogos.length === 0) return null
            return (
              <div key={fase} className="space-y-3">
                <h3 className="text-lg font-medium">{FASE_LABELS[fase] || fase}</h3>
                <div className="space-y-2">
                  {faseJogos.map((jogo) => {
                    const statusInfo = STATUS_BADGE[jogo.status]
                    return (
                      <Card key={jogo.id}>
                        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {jogo.fase === 'grupos' && jogo.grupo && <Badge variant="info">Grupo {jogo.grupo}</Badge>}
                              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                            </div>
                            <p className="font-medium">{jogo.timeA} vs {jogo.timeB}</p>
                            <p className="text-sm text-muted-foreground">{formatDateTime(jogo.dataHora)}</p>
                          </div>
                          <div className="text-right">
                            {jogo.resultadoA !== null && jogo.resultadoB !== null ? (
                              <Badge variant="success">{jogo.resultadoA} x {jogo.resultadoB}</Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">A realizar</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Replace `src/app/admin/config/page.tsx`**

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { ConfiguracaoPontuacao } from '@/lib/utils/types'

interface Jogo { id: string }

const CAMPOS: { chave: keyof ConfiguracaoPontuacao; label: string }[] = [
  { chave: 'placarExato', label: 'Placar Exato' },
  { chave: 'vencedorCorreto', label: 'Vencedor Correto' },
  { chave: 'campeao', label: 'Campeão' },
  { chave: 'vice', label: 'Vice-campeão' },
  { chave: 'terceiro', label: '3º Colocado' },
  { chave: 'quarto', label: '4º Colocado' },
  { chave: 'artilheiro', label: 'Artilheiro' },
]

export default function AdminConfigPage() {
  const [config, setConfig] = useState<ConfiguracaoPontuacao | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [totalJogos, setTotalJogos] = useState(0)

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/config')
      if (!res.ok) throw new Error('Erro ao carregar configuração')
      const data: ConfiguracaoPontuacao = await res.json(); setConfig(data)
    } catch { toast.error('Erro ao carregar configuração') }
    finally { setLoading(false) }
  }, [])

  const fetchJogos = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/jogos')
      if (res.ok) { const data: Jogo[] = await res.json(); setTotalJogos(data.length) }
    } catch {}
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConfig(); fetchJogos()
  }, [fetchConfig, fetchJogos])

  function handleChange(chave: keyof ConfiguracaoPontuacao, valor: string) {
    if (!config) return
    setConfig({ ...config, [chave]: parseInt(valor) || 0 })
  }

  async function handleSalvar() {
    if (!config) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config),
      })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || 'Erro ao salvar') }
      toast.success('Configuração salva com sucesso!')
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erro ao salvar configuração') }
    finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <h1 className="text-3xl font-display tracking-wide">Configurações de Pontuação</h1>
        <Card><CardContent className="p-4 space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <h1 className="text-3xl font-display tracking-wide">Configurações de Pontuação</h1>
        <Card><CardContent className="flex flex-col items-center justify-center py-12"><p className="text-muted-foreground">Erro ao carregar configuração.</p></CardContent></Card>
      </div>
    )
  }

  const maximoPossivel = totalJogos * config.placarExato + config.campeao + config.vice + config.terceiro + config.quarto + config.artilheiro

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in-up">
      <h1 className="text-3xl font-display tracking-wide">Configurações de Pontuação</h1>

      <form onSubmit={(e) => { e.preventDefault(); handleSalvar() }}>
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CAMPOS.map(({ chave, label }) => (
                <div key={chave} className="flex flex-col gap-1">
                  <label className="text-sm font-medium">{label}</label>
                  <Input type="number" min="0" value={config[chave]} onChange={(e) => handleChange(chave, e.target.value)} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Máximo possível por participante</p>
              <p className="text-2xl font-display text-primary">{maximoPossivel} pontos</p>
              <p className="text-xs text-muted-foreground">
                {totalJogos} jogos × {config.placarExato} pts + extras ({config.campeao + config.vice + config.terceiro + config.quarto + config.artilheiro} pts)
              </p>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : 'Salvar'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/jogos/page.tsx src/app/admin/resultados/page.tsx src/app/admin/config/page.tsx
git commit -m "feat: revamp admin jogos, resultados, and config pages"
```

---

### Task 20: Run Lint + Tests + Final Verification

- [ ] **Step 1: Run lint**

```bash
npm run lint
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

- [ ] **Step 3: Run build**

```bash
npm run build
```

- [ ] **Step 4: Start dev server and visually verify both themes**

```bash
npm run dev
```

Navigate to each page and verify:
- [ ] Home: hero, stats, jogos do dia, ranking
- [ ] Jogos: listing with groups, detail with palpites
- [ ] Ranking: podium, stats, table
- [ ] Participantes: grid, profile with palpites
- [ ] Regras: accordion sections
- [ ] Admin: dashboard, login, upload, participantes CRUD, jogos, resultados, config
- [ ] Theme toggle works (light/dark)
- [ ] Mobile menu works
- [ ] Toasts appear on admin actions
- [ ] Empty states show correctly
- [ ] Loading states with skeletons

- [ ] **Step 5: Final commit if any fixes**

```bash
git add -A
git commit -m "fix: address lint and visual issues from frontend revamp"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Install deps + cn helper | package.json, src/lib/utils.ts |
| 2 | CSS variables light/dark | src/app/globals.css |
| 3 | ThemeProvider + ThemeToggle | providers/, layout/ |
| 4 | Layout update (fonts, Toaster) | src/app/layout.tsx |
| 5 | Button + Card + Badge + Table | src/components/ui/ |
| 6 | Input + Select + Dialog + Tabs | src/components/ui/ |
| 7 | Skeleton + AlertDialog + Tooltip + Accordion | src/components/ui/ |
| 8 | Header (navbar, mobile, toggle) | src/components/layout/Header.tsx |
| 9 | Footer | src/components/layout/Footer.tsx |
| 10 | Delete old uppercase components | src/components/ui/ |
| 11 | Home + Hero + GameCard + RankingTable | src/app/(public)/page.tsx |
| 12 | Jogos pages | src/app/(public)/jogos/ |
| 13 | Ranking + Podium | src/app/(public)/ranking/ |
| 14 | Participantes pages | src/app/(public)/participantes/ |
| 15 | Regras (accordion) | src/app/(public)/regras/ |
| 16 | Admin Dashboard + Login | src/app/admin/ |
| 17 | Admin Upload | src/app/admin/upload/ |
| 18 | Admin Participantes CRUD | src/app/admin/participantes/ |
| 19 | Admin Jogos + Resultados + Config | src/app/admin/ |
| 20 | Lint + Tests + Final Verification | all |
