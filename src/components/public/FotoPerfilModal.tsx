'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'

interface FotoPerfilModalProps {
  src: string
  alt: string
}

export function FotoPerfilModal({ src, alt }: FotoPerfilModalProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="w-28 h-28 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 ring-4 ring-border relative cursor-pointer transition-opacity hover:opacity-80 focus:outline-none focus:ring-4 focus:ring-primary/50">
          <Image src={src} alt={alt} fill unoptimized className="object-cover" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-2 sm:max-w-3xl">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <div className="relative aspect-square w-full">
          <Image src={src} alt={alt} fill unoptimized className="object-contain rounded-lg" priority />
        </div>
      </DialogContent>
    </Dialog>
  )
}
