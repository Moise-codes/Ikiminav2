import type { ReactNode } from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/cn'

export const Tabs = TabsPrimitive.Root

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <TabsPrimitive.List
      className={cn('flex items-center gap-5 overflow-x-auto border-b border-rule', className)}
    >
      {children}
    </TabsPrimitive.List>
  )
}

export function TabsTrigger({
  value,
  children,
  count,
}: {
  value: string
  children: ReactNode
  count?: number
}) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        'relative -mb-px flex shrink-0 items-center gap-2 border-b border-transparent pb-2.5 pt-1 text-[13px] text-muted transition-colors',
        'hover:text-ink data-[state=active]:border-ink data-[state=active]:text-ink',
      )}
    >
      {children}
      {count !== undefined ? (
        <span className="tnum rounded-xs bg-paper-2 px-1 py-0.5 text-[10px] font-medium text-muted">
          {count}
        </span>
      ) : null}
    </TabsPrimitive.Trigger>
  )
}

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string
  children: ReactNode
  className?: string
}) {
  return (
    <TabsPrimitive.Content value={value} className={cn('pt-5 outline-hidden', className)}>
      {children}
    </TabsPrimitive.Content>
  )
}

export function Accordion({ children }: { children: ReactNode }) {
  return (
    <AccordionPrimitive.Root type="single" collapsible className="w-full">
      {children}
    </AccordionPrimitive.Root>
  )
}

export function AccordionItem({
  value,
  question,
  answer,
}: {
  value: string
  question: string
  answer: ReactNode
}) {
  return (
    <AccordionPrimitive.Item
      value={value}
      className="mb-2 rounded-xl border border-rule bg-surface px-4 transition-colors data-[state=open]:border-rule-strong"
    >
      <AccordionPrimitive.Header>
        <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between gap-6 py-3.5 text-left text-[12px] font-medium tracking-[0.035em] text-ink uppercase transition-colors hover:text-ink-2">
          {question}
          <Plus
            aria-hidden
            className="size-4 shrink-0 text-ink transition-transform duration-200 group-data-[state=open]:rotate-45"
          />
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content className="overflow-hidden data-[state=open]:accordion-down data-[state=closed]:accordion-up">
        <div className="max-w-[62ch] pb-4 text-[13px] leading-relaxed text-muted">{answer}</div>
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  )
}
