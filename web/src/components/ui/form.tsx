import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

const CONTROL =
  'w-full rounded-xl border border-rule-strong bg-surface text-[14px] text-ink placeholder:text-faint transition-all duration-200 focus:border-accent focus:ring-2 focus:ring-accent/20 focus:outline-hidden disabled:bg-paper-2 disabled:text-muted'

interface FieldProps {
  label: string
  htmlFor?: string
  hint?: ReactNode
  error?: string | null
  optional?: boolean
  children: ReactNode
  className?: string
}

export function Field({ label, htmlFor, hint, error, optional, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[12px] font-medium text-ink">
          {label}
          {optional ? <span className="ml-1.5 font-normal text-faint">optional</span> : null}
        </label>
        {hint ? <span className="text-[11px] text-faint">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <p role="alert" className="text-[11px] leading-snug text-debit">
          {error}
        </p>
      ) : null}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export function Input({ className, invalid, ...rest }: InputProps) {
  return (
    <input
      className={cn(CONTROL, 'h-10 px-3', invalid && 'border-debit', className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  )
}

interface MoneyInputProps extends Omit<InputProps, 'type' | 'inputMode'> {
  suffix?: string
}

export function MoneyInput({ className, suffix = 'RWF', invalid, ...rest }: MoneyInputProps) {
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        step={100}
        className={cn(CONTROL, 'tnum h-10 px-3 pr-12', invalid && 'border-debit', className)}
        aria-invalid={invalid || undefined}
        {...rest}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-medium text-faint">
        {suffix}
      </span>
    </div>
  )
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL, 'min-h-[86px] resize-y px-3 py-2', className)} {...rest} />
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export function Select({ className, children, invalid, ...rest }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(CONTROL, 'h-10 appearance-none pl-3 pr-9', invalid && 'border-debit', className)}
        aria-invalid={invalid || undefined}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-muted"
      />
    </div>
  )
}

export function CodeInput({ className, ...rest }: InputProps) {
  return (
    <input
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      className={cn(
        CONTROL,
        'tnum h-12 px-3 text-center text-xl tracking-[0.5em] font-semibold [font-family:var(--font-display)]',
        className,
      )}
      {...rest}
    />
  )
}

interface SegmentedProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  hint?: string
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: SegmentedProps<T>) {
  const groupId = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-ink">{label}</span>
      <div role="group" aria-labelledby={groupId} className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={cn(
                'h-9 rounded-xl border px-4 text-xs font-medium transition-all duration-200',
                active
                  ? 'border-ink bg-ink text-white'
                  : 'border-rule-strong bg-transparent text-muted hover:border-ink hover:text-ink',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      {hint ? <span className="text-[11px] text-muted">{hint}</span> : null}
    </div>
  )
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-debit/30 bg-debit-wash px-3 py-2 text-[12px] leading-snug text-debit"
    >
      {children}
    </p>
  )
}

export function FormNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-rule bg-paper-2 px-3 py-2 text-[12px] leading-snug text-muted">
      {children}
    </p>
  )
}
