import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Mark } from '@/components/ui/Logo'

const COLUMNS = [
  {
    title: 'The ledger',
    links: [
      { label: 'Product', to: '/product' },
      { label: 'How it works', to: '/how-it-works' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Guides', to: '/guides' },
    ],
  },
  {
    title: 'Groups',
    links: [
      { label: 'Create a group', to: '/signup' },
      { label: 'Sign in', to: '/signin' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy notice', to: '/privacy' },
      { label: 'Terms of use', to: '/terms' },
    ],
  },
]

export function SiteFooter() {
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
              The ledger for Rwandan savings groups. Contributions, loans, fines and statements —
              recorded once, never overwritten.
            </p>
            <p className="mt-5 text-[11px] leading-relaxed text-faint">
              Kigali, Rwanda. Amounts in RWF. Data handled under Law N° 058/2021.
            </p>
          </div>

          {COLUMNS.map((column) => (
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
          <p className="text-[11px] text-faint">© 2026 Itsinda. All rights reserved.</p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-ink transition-colors hover:text-muted"
          >
            Put your group on the record
            <ArrowUpRight aria-hidden className="size-3" />
          </Link>
        </div>
      </div>
    </footer>
  )
}
