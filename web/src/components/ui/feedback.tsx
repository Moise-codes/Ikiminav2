import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'ink' | 'credit' | 'warn' | 'debit' | 'outline'

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-transparent bg-paper-2 text-ink-2',
  ink: 'border-ink bg-ink text-white',
  credit: 'border-credit/25 bg-credit-wash text-credit',
  warn: 'border-warn/25 bg-warn-wash text-warn',
  debit: 'border-debit/25 bg-debit-wash text-debit',
  outline: 'border-rule-strong bg-transparent text-muted',
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-xs border px-1.5 py-0.5 text-[10px] font-medium tracking-[0.04em] uppercase',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string
  description: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-2 rounded-xl border border-dashed border-rule-strong bg-surface/60 px-5 py-8',
        className,
      )}
    >
      <h3 className="text-[15px] font-medium text-ink">{title}</h3>
      <p className="max-w-[52ch] text-[13px] leading-relaxed text-muted">{description}</p>
      {action ? <div className="pt-1.5">{action}</div> : null}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-paper-2', className)} />
}

export function Callout({
  tone = 'neutral',
  title,
  children,
}: {
  tone?: 'neutral' | 'credit' | 'warn' | 'debit'
  title?: string
  children: ReactNode
}) {
  const tones = {
    neutral: 'border-rule bg-paper-2 text-ink-2',
    credit: 'border-credit/25 bg-credit-wash text-credit',
    warn: 'border-warn/25 bg-warn-wash text-warn',
    debit: 'border-debit/25 bg-debit-wash text-debit',
  } as const

  return (
    <div className={cn('rounded-xl border px-3 py-2.5 text-[12px] leading-relaxed', tones[tone])}>
      {title ? <p className="mb-0.5 font-medium">{title}</p> : null}
      <div className={tone === 'neutral' ? 'text-muted' : undefined}>{children}</div>
    </div>
  )
}
