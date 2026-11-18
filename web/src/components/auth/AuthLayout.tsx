import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Mark } from '@/components/ui/Logo'
import { useI18n } from '@/lib/i18nContext'
import { cn } from '@/lib/cn'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
  side?: {
    statement: string
    points: string[]
  }
  hideSideDivider?: boolean
  useDisplayFont?: boolean
}

export function AuthLayout({ title, subtitle, children, footer, side, hideSideDivider, useDisplayFont }: AuthLayoutProps) {
  const { t, lang, setLang } = useI18n()

  const resolvedSide = side ?? {
    statement: t('auth.sideDefaultStatement'),
    points: [t('auth.sideDefaultPoint1'), t('auth.sideDefaultPoint2'), t('auth.sideDefaultPoint3')],
  }

  return (
    <div className="relative grid min-h-screen overflow-hidden bg-paper lg:grid-cols-[1.05fr_0.95fr]">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-40 -left-40 size-[420px] rounded-full bg-accent/20 blur-3xl animate-pulse" />
        <div
          className="absolute top-1/3 right-0 size-[520px] rounded-full bg-accent-2/15 blur-3xl animate-pulse"
          style={{ animationDelay: '1.4s' }}
        />
        <div className="absolute bottom-0 left-1/3 size-[360px] rounded-full bg-ink/5 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #1a1a1a 1px, transparent 1px), linear-gradient(to bottom, #1a1a1a 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-rule bg-ink px-12 py-10 font-[family-name:var(--font-display)] text-white lg:flex">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-24 size-72 rounded-full bg-accent/40 blur-3xl animate-pulse" />
          <div
            className="absolute bottom-0 right-0 size-96 rounded-full bg-accent-2/30 blur-3xl animate-pulse"
            style={{ animationDelay: '1.2s' }}
          />
          <div className="absolute top-1/2 left-1/3 size-64 rounded-full bg-white/5 blur-2xl" />
        </div>

        <Link to="/" className="relative z-10 flex items-center gap-2 text-white transition-opacity hover:opacity-80">
          <Mark className="size-6 text-white" />
          <span className="text-[17px] font-semibold tracking-[-0.03em] text-white">Itsinda</span>
        </Link>

        <div className="relative z-10 max-w-[46ch]">
          <p className="text-[clamp(26px,2.6vw,38px)] leading-[1.08] font-semibold tracking-[-0.03em] text-white">
            {resolvedSide.statement}
          </p>
          <ul
            className={cn(
              'mt-10 flex flex-col gap-4',
              hideSideDivider ? 'pt-0' : 'border-t border-white/15 pt-8',
            )}
          >
            {resolvedSide.points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-[15px] leading-relaxed text-white/80">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-[12px] text-white/55">
          {t('auth.builtFor')}
        </p>
      </aside>

      <main className="relative z-10 flex flex-col">
        <div className="flex items-center justify-between border-b border-rule/60 px-6 py-4 backdrop-blur-sm">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <Mark className="size-5 text-ink" />
            <span className="text-[15px] font-semibold tracking-[-0.03em] text-ink">Itsinda</span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <div className="inline-flex items-center rounded-full border border-rule-strong bg-paper-2/80 p-1">
              {(['rw', 'fr', 'en'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={cn(
                    'min-w-[40px] rounded-full px-2.5 py-1.5 text-[10px] font-semibold tracking-[0.04em] transition-all duration-200',
                    lang === code
                      ? 'bg-ink text-white shadow-sm'
                      : 'text-muted hover:bg-surface hover:text-ink',
                  )}
                >
                  {code === 'rw' ? 'KIN' : code.toUpperCase()}
                </button>
              ))}
            </div>
            <Link to="/" className="text-[12px] text-muted transition-colors hover:text-ink">
              {t('auth.backToSite')}
            </Link>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className={cn('w-full max-w-[420px]', useDisplayFont && 'font-[family-name:var(--font-display)]')}>
            <h1 className="t-h3 text-ink">{title}</h1>
            <p className={cn('mt-2 text-[15px] leading-relaxed text-muted', useDisplayFont && 'font-normal')}>{subtitle}</p>
            <div className="mt-8 rounded-2xl border border-rule bg-surface/95 p-6 shadow-pop backdrop-blur-md sm:p-8">
              {children}
            </div>
            {footer ? <div className={cn('mt-6 text-[13px] text-muted', useDisplayFont && '[&_a]:font-medium')}>{footer}</div> : null}
          </div>
        </div>
      </main>
    </div>
  )
}
