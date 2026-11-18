import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Mark } from '@/components/ui/Logo'
import { useI18n } from '@/lib/i18nContext'

export function SiteFooter() {
  const { t } = useI18n()

  const columns = [
    {
      title: t('footer.ledger'),
      links: [
        { label: t('nav.product'), to: '/product' },
        { label: t('nav.howItWorks'), to: '/how-it-works' },
        { label: t('nav.pricing'), to: '/pricing' },
        { label: t('nav.guides'), to: '/guides' },
      ],
    },
    {
      title: t('footer.groups'),
      links: [
        { label: t('nav.createGroup'), to: '/signup' },
        { label: t('nav.signIn'), to: '/signin' },
        { label: t('nav.contact'), to: '/contact' },
      ],
    },
    {
      title: t('footer.legal'),
      links: [
        { label: t('footer.privacy'), to: '/privacy' },
        { label: t('footer.terms'), to: '/terms' },
      ],
    },
  ]

  return (
    <footer className="relative border-t border-rule bg-paper-2">
      <div className="relative mx-auto w-full max-w-[1240px] border-x border-rule px-6 sm:px-8 lg:px-12">
        <div className="grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-[34ch]">
            <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-70">
              <Mark className="size-5 text-ink" />
              <span className="text-[15px] font-medium tracking-[-0.03em] text-ink">Itsinda</span>
            </Link>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              {t('footer.desc')}
            </p>
            <p className="mt-5 text-[11px] leading-relaxed text-faint">
              {t('footer.location')}
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-[11px] font-medium tracking-[0.09em] text-faint uppercase">
                {column.title}
              </h3>
              <ul className="mt-3 flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="inline-flex items-center gap-1 text-[13px] text-muted transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-rule py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-faint">{t('footer.rights')}</p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium text-ink transition-colors hover:bg-paper hover:text-accent"
          >
            {t('footer.cta')}
            <ArrowUpRight aria-hidden className="size-3" />
          </Link>
        </div>
      </div>
    </footer>
  )
}
