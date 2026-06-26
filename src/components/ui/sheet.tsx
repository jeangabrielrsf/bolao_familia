'use client'
import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Side = 'right' | 'bottom'

type SheetContentProps = React.ComponentProps<typeof DialogPrimitive.Content> & {
  side?: Side
  onOpenChange?: (open: boolean) => void
  overlayClassName?: string
  zIndex?: number
}

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & { overlayClassName?: string }
>(({ className, overlayClassName, ...props }, ref) => (
  <DialogPrimitive.Overlay
    className={cn(
      'fixed inset-0 bg-black/60',
      'data-[state=open]:animate-in data-[state=open]:fade-in-0',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
      overlayClassName,
      className,
    )}
    style={{ zIndex: 60 }}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = 'SheetOverlay'

const sideClasses: Record<Side, string> = {
  right: cn(
    'inset-y-0 right-0 h-full w-3/4 sm:max-w-md border-l',
    'data-[state=open]:animate-in data-[state=open]:slide-in-from-right',
    'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right',
  ),
  bottom: cn(
    'inset-x-0 bottom-0 max-h-[90vh] rounded-t-xl border-t',
    'data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom',
    'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom',
  ),
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = 'right', className, children, onOpenChange, overlayClassName, zIndex = 50, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <SheetOverlay overlayClassName={overlayClassName} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed gap-4 bg-background p-6 shadow-lg',
        sideClasses[side],
        className,
      )}
      style={{ zIndex: zIndex + 10 }}
      onPointerDownOutside={() => onOpenChange?.(false)}
      onEscapeKeyDown={() => onOpenChange?.(false)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
SheetContent.displayName = 'SheetContent'

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-2 text-left', className)} {...props} />
)
SheetHeader.displayName = 'SheetHeader'

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold text-foreground', className)}
    {...props}
  />
))
SheetTitle.displayName = 'SheetTitle'

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
SheetDescription.displayName = 'SheetDescription'

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
}
