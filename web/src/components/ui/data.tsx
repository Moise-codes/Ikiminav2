import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { rwf, rwfSigned } from '@/lib/format'
import { IconButton } from './Button'

export function Money({
  amount,
  signed = false,
  className,
}: {
  amount: number | null | undefined
  signed?: boolean
  className?: string
}) {
  if (amount === null || amount === undefined) {
    return <span className={cn('tnum text-faint', className)}>—</span>
  }
  const tone = signed ? (amount < 0 ? 'text-debit' : amount > 0 ? 'text-ink' : 'text-muted') : 'text-ink'
  return (
    <span className={cn('tnum', tone, className)}>{signed ? rwfSigned(amount) : rwf(amount)}</span>
  )
}

export interface Column<T> {
  key: string
  header: string
  align?: 'left' | 'right'
  width?: string
  render: (row: T) => ReactNode
}

interface TableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  isLoading?: boolean
  empty?: ReactNode
  footer?: ReactNode
  dense?: boolean
  className?: string
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  isLoading,
  empty,
  footer,
  dense,
  className,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="divide-y divide-rule">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-4 px-1 py-3.5">
            <div className="h-3 w-1/3 animate-pulse rounded-xs bg-paper-2" />
            <div className="ml-auto h-3 w-16 animate-pulse rounded-xs bg-paper-2" />
          </div>
        ))}
      </div>
    )
  }

  if (rows.length === 0 && empty) {
    return <>{empty}</>
  }

  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-rule-strong">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={column.width ? { width: column.width } : undefined}
                  className={cn(
                    'px-3 pb-2 pt-1 text-[10px] font-medium tracking-[0.09em] text-faint uppercase first:pl-0 last:pr-0',
                    column.align === 'right' ? 'text-right' : 'text-left',
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-rule/80 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-paper-2/70',
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-3 align-middle text-[13px] text-ink first:pl-0 last:pr-0',
                      dense ? 'py-2' : 'py-3',
                      column.align === 'right' ? 'text-right' : 'text-left',
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer ? <div className="pt-3">{footer}</div> : null}
    </div>
  )
}

export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  unit = 'entries',
}: {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
  unit?: string
}) {
  if (totalPages <= 1) {
    return (
      <p className="text-[11px] text-faint">
        {total} {total === 1 ? unit.replace(/s$/, '') : unit}
      </p>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="flex items-center gap-2 text-[11px] text-faint">
        <span>
          Page {page} of {totalPages}
        </span>
        <span aria-hidden className="h-3 w-px bg-rule" />
        <span>
          {total} {unit}
        </span>
      </p>
      <div className="flex items-center gap-1">
        <IconButton
          label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="disabled:opacity-35"
        >
          <ChevronLeft aria-hidden className="size-4" />
        </IconButton>
        <IconButton
          label="Next page"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="disabled:opacity-35"
        >
          <ChevronRight aria-hidden className="size-4" />
        </IconButton>
      </div>
    </div>
  )
}

export function Stat({
  label,
  value,
  suffix,
  note,
  emphasis = false,
}: {
  label: string
  value: ReactNode
  suffix?: string
  note?: ReactNode
  emphasis?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium tracking-[0.09em] text-faint uppercase">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'tnum leading-none',
            emphasis ? 'text-[30px] font-medium tracking-[-0.03em]' : 'text-[22px] tracking-[-0.02em]',
          )}
        >
          {value}
        </span>
        {suffix ? <span className="text-[11px] font-medium text-faint">{suffix}</span> : null}
      </div>
      {note ? <span className="text-[11px] leading-snug text-muted">{note}</span> : null}
    </div>
  )
}

export function KeyValueList({
  items,
  className,
}: {
  items: { label: string; value: ReactNode }[]
  className?: string
}) {
  return (
    <dl className={cn('grid gap-0', className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-baseline justify-between gap-4 border-b border-rule/80 py-2 last:border-0"
        >
          <dt className="text-[12px] text-muted">{item.label}</dt>
          <dd className="text-right text-[13px] font-medium text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
