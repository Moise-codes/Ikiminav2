import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'ink' | 'outline' | 'quiet' | 'inverse'
export type ButtonSize = 'sm' | 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl border font-medium tracking-[-0.01em] whitespace-nowrap transition-all duration-200 disabled:pointer-events-none disabled:opacity-45 hover:-translate-y-0.5'

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-[13px]',
  lg: 'h-12 px-6 text-sm',
}

const VARIANTS: Record<ButtonVariant, string> = {
  ink: 'border-ink bg-ink text-white hover:bg-ink-2 hover:border-ink-2 shadow-lift',
  outline: 'border-rule-strong bg-transparent text-ink hover:border-ink hover:bg-surface',
  quiet: 'border-transparent bg-transparent text-muted hover:text-ink',
  inverse: 'border-transparent bg-surface text-ink hover:bg-paper-2',
}

export function buttonClass(
  variant: ButtonVariant = 'ink',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(BASE, SIZES[size], VARIANTS[variant], className)
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  iconAfter?: ReactNode
}

export function Button({
  variant = 'ink',
  size = 'md',
  loading = false,
  icon,
  iconAfter,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : icon}
      {children}
      {iconAfter}
    </button>
  )
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-xl border border-transparent text-muted transition-colors hover:border-rule-strong hover:text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
