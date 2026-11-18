import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  meta?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-4 border-b border-rule pb-6', className)}>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          {eyebrow ? <p className="t-eyebrow">{eyebrow}</p> : null}
          <h1 className="mt-2 text-[26px] leading-tight font-medium tracking-[-0.028em] text-ink">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-[68ch] text-[13.5px] leading-[1.6] text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {meta}
    </div>
  )
}

export function Panel({
  title,
  action,
  children,
  className,
  padded = true,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <section className={cn('rounded-xl border border-rule bg-surface', className)}>
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-2.5">
          <h2 className="text-[12px] font-medium tracking-[0.01em] text-ink">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className={padded ? 'p-4' : undefined}>{children}</div>
    </section>
  )
}
