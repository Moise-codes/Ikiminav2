import type { ReactNode } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as MenuPrimitive from '@radix-ui/react-dropdown-menu'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
}: DialogProps) {
  const widths = { sm: 'max-w-[420px]', md: 'max-w-[540px]', lg: 'max-w-[720px]' }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-ink/25 fade-in backdrop-blur-[1px]" />
        <DialogPrimitive.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-md border border-rule-strong bg-surface shadow-pop rise-in',
            widths[size],
          )}
        >
          <div className="flex items-start justify-between gap-6 border-b border-rule px-5 py-4">
            <div className="flex flex-col gap-1">
              <DialogPrimitive.Title className="text-[15px] font-medium tracking-[-0.01em] text-ink">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="text-[12px] leading-relaxed text-muted">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              aria-label="Close"
              className="rounded-xl p-1 text-muted transition-colors hover:bg-paper-2 hover:text-ink"
            >
              <X aria-hidden className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="max-h-[min(70vh,640px)] overflow-y-auto px-5 py-4">{children}</div>
          {footer ? (
            <div className="flex items-center justify-end gap-2 border-t border-rule bg-paper/60 px-5 py-3">
              {footer}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export const Menu = MenuPrimitive.Root
export const MenuTrigger = MenuPrimitive.Trigger

export function MenuContent({
  children,
  align = 'end',
  className,
}: {
  children: ReactNode
  align?: 'start' | 'end'
  className?: string
}) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        align={align}
        sideOffset={6}
        className={cn(
          'z-50 min-w-[200px] rounded-md border border-rule-strong bg-surface p-1 shadow-lift fade-in',
          className,
        )}
      >
        {children}
      </MenuPrimitive.Content>
    </MenuPrimitive.Portal>
  )
}

export function MenuItem({
  children,
  onSelect,
  destructive = false,
  disabled = false,
}: {
  children: ReactNode
  onSelect?: () => void
  destructive?: boolean
  disabled?: boolean
}) {
  return (
    <MenuPrimitive.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-xs px-2.5 py-1.5 text-[12px] outline-hidden transition-colors select-none',
        destructive
          ? 'text-debit data-highlighted:bg-debit-wash'
          : 'text-ink data-highlighted:bg-paper-2',
        disabled && 'pointer-events-none opacity-40',
      )}
    >
      {children}
    </MenuPrimitive.Item>
  )
}

export function MenuSeparator() {
  return <MenuPrimitive.Separator className="my-1 h-px bg-rule" />
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <MenuPrimitive.Label className="px-2.5 py-1.5 text-[10px] font-medium tracking-[0.09em] text-faint uppercase">
      {children}
    </MenuPrimitive.Label>
  )
}
