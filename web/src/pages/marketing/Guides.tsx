import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { Section } from '@/components/blueprint/Blueprint'
import { BlurReveal } from '@/components/ui/blur-reveal'
import { CloseCta } from '@/components/marketing/sections'
import { GUIDES } from './guideContent'

export default function Guides() {
  return (
    <>
      <Section>
        <div className="max-w-[58ch] section-y">
          <h1 className="t-h1 mt-5 text-balance"><BlurReveal text="Running the book, in plain language" /></h1>
          <p className="mt-6 text-[16px] leading-[1.65] text-muted">
            Written for treasurers, not accountants. Each guide covers one decision a group has to
            make and what goes wrong when it is made informally.
          </p>
        </div>
      </Section>

      <Section tone="surface">
        <div className="divide-y divide-rule">
          {GUIDES.map((guide, index) => (
            <Link
              key={guide.slug}
              to={`/guides/${guide.slug}`}
              className="group grid gap-4 py-10 lg:grid-cols-[96px_1fr_auto] lg:items-start lg:gap-10"
            >
              <span className="tnum text-[11px] tracking-[0.08em] text-faint">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h2 className="text-[18px] font-medium tracking-[-0.02em] text-ink transition-colors group-hover:text-ink-2">
                  {guide.title}
                </h2>
                <p className="mt-2 max-w-[64ch] text-[13px] leading-relaxed text-muted">
                  {guide.summary}
                </p>
                <p className="mt-3 text-[11px] text-faint">
                  {guide.readingTime} · updated {guide.updated}
                </p>
              </div>
              <ArrowUpRight
                aria-hidden
                className="size-4 shrink-0 text-faint transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink"
              />
            </Link>
          ))}
        </div>
      </Section>

      <CloseCta />
    </>
  )
}
