// FIXED: Crosshair component and all its usages removed.
// The Section component no longer renders any corner markers.

import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type SectionTone = 'paper' | 'paper-2' | 'surface' | 'ink'

const TONE: Record<SectionTone, string> = {
  paper: 'bg-paper',
  'paper-2': 'bg-paper-2',
  surface: 'bg-surface',
  ink: 'bg-ink text-paper',
}

interface SectionProps {
  id?: string
  tone?: SectionTone
  className?: string
  innerClassName?: string
  children: ReactNode
}

export function Section({
  id,
  tone = 'paper',
  className,
  innerClassName,
  children,
}: SectionProps) {
  return (
    <section id={id} className={cn('relative border-t border-rule', TONE[tone], className)}>
      <div
        className={cn(
          'relative mx-auto w-full max-w-[1240px] border-x border-rule px-6 sm:px-8 lg:px-12',
          innerClassName,
        )}
      >
        {children}
      </div>
    </section>
  )
}

export function Column({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1320px]', className)}>{children}</div>
}

export function Rule({ className }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-rule', className)} />
}

export function SplitHeading({
  lead,
  trail,
  className,
}: {
  lead: string
  trail: string
  className?: string
}) {
  return (
    <h2 className={cn('t-h2 text-ink', className)}>
      {lead}{' '}
      <span className="text-faint">{trail}</span>
    </h2>
  )
}
