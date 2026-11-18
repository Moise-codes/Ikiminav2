import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'

/**
 * The Itsinda mark, drawn from the supplied brand file (itsinda-mark.svg) so it
 * inherits currentColor instead of the file's cream plate.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label="Itsinda"
      className={cn('size-5', className)}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinejoin="round"
    >
      <polygon points="40,40 160,40 160,72 120,72 120,80 80,108 80,72 40,72" />
      <polygon points="80,122 120,94 120,128 160,128 160,160 40,160 40,128 80,128" />
    </svg>
  )
}

export function Wordmark({
  to = '/',
  className,
  markClassName,
  labelClassName,
}: {
  to?: string
  className?: string
  markClassName?: string
  labelClassName?: string
}) {
  return (
    <Link
      to={to}
      className={cn('flex items-center gap-2 text-ink', className)}
      aria-label="Itsinda home"
    >
      <Mark className={markClassName} />
      <span
        className={cn(
          'text-[15px] font-medium tracking-[-0.03em]',
          labelClassName,
        )}
      >
        Itsinda
      </span>
    </Link>
  )
}
