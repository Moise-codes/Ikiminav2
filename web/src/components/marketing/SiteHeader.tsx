import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ArrowRight, Menu, X } from 'lucide-react'
import { MARKETING_NAV } from '@/lib/constants'
import { cn } from '@/lib/cn'
import { useI18n } from '@/lib/i18nContext'
import { Wordmark } from '@/components/ui/Logo'
import { buttonClass } from '@/components/ui/Button'

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { lang, setLang, t } = useI18n()

  useEffect(() => setOpen(false), [location.pathname])

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur-md">
      <div className="relative mx-auto flex h-16 w-full max-w-[1240px] items-center gap-6 border-x border-rule px-6 sm:px-8 lg:px-12">
        <Wordmark />

        <nav aria-label="Primary" className="ml-4 hidden items-center gap-6 md:flex">
          {MARKETING_NAV.map((item) => {
            const key = item.to === '/product' ? 'nav.product' : item.to === '/how-it-works' ? 'nav.howItWorks' : item.to === '/pricing' ? 'nav.pricing' : item.to === '/guides' ? 'nav.guides' : item.to === '/contact' ? 'nav.contact' : ''
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'text-[13px] font-medium transition-colors',
                    isActive ? 'text-ink' : 'text-muted hover:text-ink',
                  )
                }
              >
                {key ? t(key) : item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link to="/signin" className={buttonClass('quiet', 'sm', 'hidden sm:inline-flex')}>
            {t('nav.signIn')}
          </Link>
          <div className="hidden sm:inline-flex items-center rounded-full border border-rule-strong bg-paper-2/80 p-1 backdrop-blur-sm">
            {(['rw', 'fr', 'en'] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={cn(
                  'min-w-[44px] rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-[0.04em] transition-all duration-200',
                  lang === code
                    ? 'bg-ink text-white shadow-sm'
                    : 'text-muted hover:bg-surface hover:text-ink',
                )}
                aria-label={code === 'rw' ? 'Kinyarwanda' : code === 'fr' ? 'French' : 'English'}
              >
                {code === 'rw' ? 'KIN' : code.toUpperCase()}
              </button>
            ))}
          </div>
          <Link to="/signup" className={buttonClass('ink', 'sm', 'hidden sm:inline-flex')}>
            {t('nav.createGroup')}
          </Link>

          <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
            <DialogPrimitive.Trigger
              aria-label="Open menu"
              className="inline-flex size-9 items-center justify-center rounded-xl border border-rule-strong bg-surface text-ink transition-colors hover:bg-paper-2 md:hidden"
            >
              <Menu aria-hidden className="size-4" />
            </DialogPrimitive.Trigger>
            <DialogPrimitive.Portal>
              <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-[1px] md:hidden" />
              <DialogPrimitive.Content className="fixed inset-x-0 top-0 z-50 border-b border-rule-strong bg-surface px-6 pb-6 pt-4 md:hidden">
                <div className="flex items-center justify-between">
                  <Wordmark />
                  <DialogPrimitive.Close
                    aria-label="Close menu"
                    className="inline-flex size-9 items-center justify-center rounded-xl border border-rule-strong bg-surface text-ink transition-colors hover:bg-paper-2"
                  >
                    <X aria-hidden className="size-4" />
                  </DialogPrimitive.Close>
                </div>
                <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
                <nav aria-label="Mobile" className="mt-5 flex flex-col">
                  {MARKETING_NAV.map((item) => {
                    const key = item.to === '/product' ? 'nav.product' : item.to === '/how-it-works' ? 'nav.howItWorks' : item.to === '/pricing' ? 'nav.pricing' : item.to === '/guides' ? 'nav.guides' : item.to === '/contact' ? 'nav.contact' : ''
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="border-b border-rule py-3 text-[15px] font-medium text-ink"
                      >
                        {key ? t(key) : item.label}
                      </Link>
                    )
                  })}
                </nav>
                <div className="mt-5 flex flex-col gap-2">
                  <div className="mb-3 inline-flex items-center self-start rounded-full border border-rule-strong bg-paper-2/80 p-1">
                    {(['rw', 'fr', 'en'] as const).map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setLang(code)}
                        className={cn(
                          'min-w-[48px] rounded-full px-3.5 py-2 text-[12px] font-semibold tracking-[0.04em] transition-all duration-200',
                          lang === code
                            ? 'bg-ink text-white shadow-sm'
                            : 'text-muted hover:bg-surface hover:text-ink',
                        )}
                      >
                        {code === 'rw' ? 'KIN' : code.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <Link to="/signup" className={buttonClass('ink', 'md', 'w-full')}>
                    {t('nav.createGroup')}
                    <ArrowRight aria-hidden className="size-3.5" />
                  </Link>
                  <Link to="/signin" className={buttonClass('outline', 'md', 'w-full')}>
                    {t('nav.signIn')}
                  </Link>
                </div>
              </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
          </DialogPrimitive.Root>
        </div>
      </div>
    </header>
  )
}
