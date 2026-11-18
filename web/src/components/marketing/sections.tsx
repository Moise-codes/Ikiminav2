import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Check, ChevronRight, Play } from 'lucide-react'
import { Section, SplitHeading } from '@/components/blueprint/Blueprint'
import { buttonClass } from '@/components/ui/Button'
import { Accordion, AccordionItem } from '@/components/ui/nav'
import {
  CtaGeometry,
  SceneContributions,
  SceneCubeNetwork,
  SceneDistribution,
  SceneFines,
  SceneLoans,
  SceneStatement,
  SceneWindowStack,
} from '@/components/art/Scenes'
import { PARTNER_LOGOS } from './BrandLogos'
import { cn } from '@/lib/cn'
import { Reveal } from '@/components/ui/reveal'
import { useI18n } from '@/lib/i18nContext'
import { ItsindaHero } from '@/components/art/ItsindaHero'
import { CountUp } from '@/components/ui/count-up'
import { BlurReveal } from '@/components/ui/blur-reveal'

/* ------------------------------------------------------------------- hero */

export function Hero() {
  const { t } = useI18n()
  return (
    <Section className="overflow-hidden" innerClassName="!px-0">
      <div className="px-6 pt-24 pb-10 text-center sm:px-8 lg:px-12 lg:pt-32">
        <Reveal>
          <h1 className="t-display mx-auto mt-6 max-w-[18ch] text-balance">
            <BlurReveal text={t('hero.title')} />
          </h1>
          <p className="mx-auto mt-6 max-w-[58ch] text-[17px] leading-[1.6] text-muted text-pretty">
            <BlurReveal text={t('hero.subtitle')} delay={0.4} step={0.03} />
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3" style={{ animation: 'km-rise 0.8s cubic-bezier(0.22,1,0.36,1) 0.9s both' }}>
            <Link to="/signup" className={buttonClass('ink', 'lg')}>
              {t('hero.cta1')}
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <Link to="/how-it-works" className={buttonClass('outline', 'lg')}>
              <Play aria-hidden className="size-3.5" />
              {t('hero.cta2')}
            </Link>
          </div>
        </Reveal>
      </div>

      <div className="relative mx-auto max-w-[1100px]">
        <ItsindaHero />
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------- logo strip */

export function LogoStrip() {
  const { t } = useI18n()
  const track = [...PARTNER_LOGOS, ...PARTNER_LOGOS]

  return (
    <Section tone="paper" className="overflow-hidden border-t-0">
      <div className="flex flex-col gap-6 py-6 lg:flex-row lg:items-center lg:gap-12">
        <p className="shrink-0 text-[11px] leading-[1.5] tracking-[0.01em] text-faint">
          {t('logos.line1')}
          <br />
          {t('logos.line2')}
        </p>

        <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_5%,#000_95%,transparent)]">
          <div className="marquee-track flex w-max items-center">
            {track.map((partner, index) => (
              <div
                key={`${partner.name}-${index}`}
                className="flex h-11 w-[172px] shrink-0 items-center justify-center border-r border-rule px-5"
                title={partner.name}
              >
                <partner.Logo className="h-7 w-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  )
}

/* ---------------------------------------------------------------- product */

export function ProductSection() {
  const [active, setActive] = useState(0)
  const { t } = useI18n()
  const tabs = [0, 1, 2, 3].map((i) => ({
    title: t(`product.tab.${i}.title`),
    body: t(`product.tab.${i}.body`),
    detail: t(`product.tab.${i}.detail`),
  }))

  return (
    <Section id="product">
      <Reveal>
        <div className="grid items-center gap-12 section-y lg:grid-cols-[1.02fr_1fr] lg:gap-16">
          <div>
            <h2 className="t-h2 mt-4 max-w-[18ch] text-balance">
              <BlurReveal text={t('product.heading')} />
            </h2>
            <p className="mt-5 max-w-[50ch] text-[15px] leading-[1.65] text-muted">
              {t('product.subtitle')}
            </p>

            <div className="mt-9 grid gap-px sm:grid-cols-2">
              {tabs.map((tab, index) => {
                const isActive = index === active
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActive(index)}
                    aria-pressed={isActive}
                    className={cn(
                      'group flex flex-col gap-2 border p-5 text-left transition-all duration-200',
                      isActive
                        ? 'border-rule-strong bg-surface shadow-lift'
                        : 'border-transparent text-muted hover:border-rule hover:bg-surface/40',
                    )}
                  >
                    <span
                      className={cn(
                        'flex items-center justify-between gap-2 text-[14px] font-medium tracking-[-0.01em]',
                        isActive ? 'text-ink' : 'text-muted',
                      )}
                    >
                      {tab.title}
                      <ChevronRight
                        aria-hidden
                        className={cn(
                          'size-3.5 transition-transform',
                          isActive ? 'text-ink' : 'text-faint group-hover:translate-x-0.5',
                        )}
                      />
                    </span>
                    <span className="text-[13px] leading-[1.6]">{tab.body}</span>
                  </button>
                )
              })}
            </div>

            <p className="mt-5 flex items-start gap-3 border-l border-ink pl-4 text-[13px] leading-[1.6] text-ink-2">
              {tabs[active].detail}
            </p>
          </div>

          <div className="relative">
            <SceneWindowStack className="w-full" active={active} />
          </div>
        </div>
      </Reveal>
    </Section>
  )
}

/* --------------------------------------------------------------- rulebook */

export function RulebookSection() {
  const { t } = useI18n()
  const rules = [0, 1, 2, 3, 4].map((i) => ({
    rule: t(`rules.${i}.rule`),
    effect: t(`rules.${i}.effect`),
  }))

  return (
    <Section tone="surface">
      <Reveal>
        <div className="grid gap-12 section-y lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <SplitHeading lead={t('rules.lead')} trail={t('rules.trail')} className="max-w-[13ch]" />
            <p className="mt-6 max-w-[42ch] text-[15px] leading-[1.65] text-muted">
              {t('rules.subtitle')}
            </p>
            <Link to="/how-it-works" className={buttonClass('outline', 'md', 'mt-8')}>
              {t('rules.cta')}
              <ArrowUpRight aria-hidden className="size-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-rule border-y border-rule">
            {rules.map((item, index) => (
              <div key={index} className="grid grid-cols-[auto_1fr] gap-5 py-6 lg:gap-8">
                <span className="tnum mt-1 text-[11px] text-faint">0{index + 1}</span>
                <div>
                  <h3 className="text-[15px] font-medium tracking-[-0.01em] text-ink">{item.rule}</h3>
                  <p className="mt-2 max-w-[54ch] text-[13.5px] leading-[1.65] text-muted">
                    {item.effect}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  )
}

/* --------------------------------------------------------------- use cases */

function UseCaseCard({
  title,
  body,
  scene,
  className,
}: {
  title: string
  body: string
  scene: ReactNode
  className?: string
}) {
  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border border-rule bg-surface transition-colors duration-200 hover:border-rule-strong',
        className,
      )}
    >
      <div className="flex h-[230px] items-center justify-center border-b border-rule bg-paper/40 px-6">
        <div className="w-full max-w-[400px] transition-transform duration-500 group-hover:scale-[1.03]">
          {scene}
        </div>
      </div>
      <div className="p-6">
        <h3 className="t-h3 text-ink">{title}</h3>
        <p className="mt-2 max-w-[46ch] text-[13.5px] leading-[1.6] text-muted">{body}</p>
      </div>
    </article>
  )
}

export function UseCases() {
  const { t } = useI18n()
  return (
    <Section>
      <Reveal>
        <div className="section-y">
          <div className="max-w-[48ch]">
            <h2 className="t-h2 mt-4 text-balance">
              <BlurReveal text={t('usecases.heading')} />
            </h2>
            <p className="mt-5 text-[15px] leading-[1.65] text-muted">
              {t('usecases.subtitle')}
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-6">
            <UseCaseCard
              className="md:col-span-4"
              title={t('usecases.0.title')}
              body={t('usecases.0.body')}
              scene={<SceneContributions className="w-full" />}
            />
            <UseCaseCard
              className="md:col-span-2"
              title={t('usecases.1.title')}
              body={t('usecases.1.body')}
              scene={<SceneFines className="w-full" />}
            />
            <UseCaseCard
              className="md:col-span-2"
              title={t('usecases.2.title')}
              body={t('usecases.2.body')}
              scene={<SceneLoans className="w-full" />}
            />
            <UseCaseCard
              className="md:col-span-2"
              title={t('usecases.3.title')}
              body={t('usecases.3.body')}
              scene={<SceneDistribution className="w-full" />}
            />
            <UseCaseCard
              className="md:col-span-2"
              title={t('usecases.4.title')}
              body={t('usecases.4.body')}
              scene={<SceneStatement className="w-full" />}
            />
          </div>
        </div>
      </Reveal>
    </Section>
  )
}

/* ------------------------------------------------------------------ stats */

export function StatsBand() {
  const { t } = useI18n()
  const stats = [
    { value: 0, label: t('stats.0.label'), note: t('stats.0.note') },
    { value: 3, label: t('stats.1.label'), note: t('stats.1.note') },
    { value: 2, label: t('stats.2.label'), note: t('stats.2.note') },
    { value: 1, label: t('stats.3.label'), note: t('stats.3.note') },
  ]
  return (
    <Section tone="paper-2">
      <Reveal>
        <div className="section-y-sm">
          <div className="mt-8 grid gap-y-10 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-rule">
            {stats.map((stat) => (
              <div key={stat.label} className="lg:px-8 lg:first:pl-0 lg:last:pr-0">
                <span className="tnum text-[56px] leading-none font-medium tracking-[-0.045em] text-ink">
                  <CountUp value={stat.value} />
                </span>
                <p className="mt-4 text-[14px] font-medium tracking-[-0.01em] text-ink">{stat.label}</p>
                <p className="mt-1.5 max-w-[28ch] text-[12.5px] leading-[1.6] text-muted">{stat.note}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  )
}

/* ----------------------------------------------------------- integrations */

export function IntegrationsSection() {
  const { t } = useI18n()
  return (
    <Section tone="surface">
      <Reveal>
        <div className="grid items-center gap-12 section-y lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <div>
            <h2 className="t-h2 mt-4 max-w-[18ch] text-balance">
              <BlurReveal text={t('integrations.heading')} />
            </h2>
            <p className="mt-5 max-w-[48ch] text-[15px] leading-[1.65] text-muted">
              {t('integrations.subtitle')}
            </p>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-4">
              {PARTNER_LOGOS.map((partner) => (
                <li key={partner.name} className="flex flex-col gap-1">
                  <partner.Logo className="h-6 w-auto" />
                  <span className="text-[10px] tracking-[0.06em] text-faint uppercase">
                    {partner.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <SceneCubeNetwork className="w-full" />
        </div>
      </Reveal>
    </Section>
  )
}

/* ---------------------------------------------------------------- pricing */

export interface Plan {
  name: string
  description: string
  price: string
  unit?: string
  note?: string
  cta: { label: string; to: string }
  featured?: boolean
  features: string[]
}

export function PricingSection({ withHeading = true }: { withHeading?: boolean }) {
  const { t } = useI18n()
  const plans: Plan[] = [
    {
      name: t('pricing.plan.0.name'),
      description: t('pricing.plan.0.desc'),
      price: 'RWF 0',
      unit: t('pricing.perMonth'),
      note: t('pricing.plan.0.note'),
      cta: { label: t('nav.createGroup'), to: '/signup' },
      features: [
        'Unlimited members',
        'Contributions and late fines',
        'Loan requests and schedules',
        'Member statements',
        'Phone and OTP sign-in',
      ],
    },
    {
      name: t('pricing.plan.1.name'),
      description: t('pricing.plan.1.desc'),
      price: 'RWF 0',
      unit: t('pricing.perMonth'),
      note: t('pricing.plan.1.note'),
      cta: { label: t('nav.createGroup'), to: '/signup' },
      featured: true,
      features: [
        'Everything in Single group',
        'MTN MoMo collection requests',
        'Airtel Money payouts',
        'Late-member reports by period',
        'Year-end pot distribution',
        'SMS receipts to members',
      ],
    },
    {
      name: t('pricing.plan.2.name'),
      description: t('pricing.plan.2.desc'),
      price: 'RWF 0',
      unit: t('pricing.perMonth'),
      note: t('pricing.plan.2.note'),
      cta: { label: t('pricing.cta.contact'), to: '/contact' },
      features: [
        'Many groups under one login',
        'Consolidated reports',
        'Custom rules per group',
        'Named onboarding support',
      ],
    },
  ]

  return (
    <Section id="pricing">
      <Reveal>
        <div className="section-y">
          {withHeading ? (
            <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
              <SplitHeading lead={t('pricing.lead')} trail={t('pricing.trail')} className="max-w-[12ch]" />
              <p className="max-w-[44ch] text-[15px] leading-[1.65] text-muted">
                {t('pricing.subtitle')}
              </p>
            </div>
          ) : null}

          <div className="mt-12 grid gap-px border border-rule bg-rule md:grid-cols-3">
            {plans.map((plan) => (
              <div key={plan.name} className="flex flex-col bg-surface p-7">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[16px] font-medium tracking-[-0.01em] text-ink">{plan.name}</h3>
                  {plan.featured ? (
                    <span className="rounded-xs bg-paper-2 px-2 py-1 text-[10px] font-medium tracking-[0.06em] text-ink uppercase">
                      {t('pricing.featured')}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 min-h-[44px] max-w-[34ch] text-[13px] leading-[1.6] text-muted">
                  {plan.description}
                </p>

                <div className="mt-6 flex items-baseline gap-2 border-t border-rule pt-6">
                  <span className="tnum text-[40px] leading-none font-medium tracking-[-0.04em] text-ink">
                    {plan.price}
                  </span>
                  {plan.unit ? <span className="text-[12px] text-faint">{plan.unit}</span> : null}
                </div>
                {plan.note ? <p className="mt-2 text-[11.5px] text-faint">{plan.note}</p> : null}

                <Link
                  to={plan.cta.to}
                  className={buttonClass(plan.featured ? 'ink' : 'outline', 'md', 'mt-6 w-full')}
                >
                  {plan.cta.label}
                  <ArrowRight aria-hidden className="size-3.5" />
                </Link>

                <div className="mt-8 border-t border-rule pt-5">
                  <p className="text-[11.5px] font-medium text-ink">{t('pricing.included')}</p>
                  <ul className="mt-1 divide-y divide-dotted divide-rule">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 py-2.5 text-[12.5px] text-muted">
                        <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ink" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[11.5px] leading-relaxed text-faint">
            {t('pricing.footnote')}
          </p>
        </div>
      </Reveal>
    </Section>
  )
}

export const PLANS: Plan[] = [
  {
    name: 'Single group',
    description: 'For one ibimina getting off the notebook.',
    price: 'RWF 0',
    unit: '/ month',
    note: 'No card, no trial clock',
    cta: { label: 'Create a group', to: '/signup' },
    features: [
      'Unlimited members',
      'Contributions and late fines',
      'Loan requests and schedules',
      'Member statements',
      'Phone and OTP sign-in',
    ],
  },
  {
    name: 'Group',
    description: 'For a group that collects and pays out on mobile money.',
    price: 'RWF 0',
    unit: '/ month',
    note: 'No charge per member',
    cta: { label: 'Create a group', to: '/signup' },
    featured: true,
    features: [
      'Everything in Single group',
      'MTN MoMo collection requests',
      'Airtel Money payouts',
      'Late-member reports by period',
      'Year-end pot distribution',
      'SMS receipts to members',
    ],
  },
  {
    name: 'Cooperative',
    description: 'For federations supervising more than one group.',
    price: 'RWF 0',
    unit: '/ month',
    note: 'No charge per group',
    cta: { label: 'Contact us', to: '/contact' },
    features: [
      'Many groups under one login',
      'Consolidated reports',
      'Custom rules per group',
      'Named onboarding support',
    ],
  },
]

/* -------------------------------------------------------------------- FAQ */

export const FAQS = [
  {
    question: 'What happens when a member pays late?',
    answer:
      'Their period stays unpaid, and the treasurer can record a fine as its own ledger line with the reason attached. The fine never hides inside the contribution amount, so both numbers stay auditable.',
  },
  {
    question: 'Can an entry be edited or deleted?',
    answer:
      'No. The ledger is append-only. To fix a mistake the treasurer records a reversal that points at the original row and carries a reason. Both rows remain visible to every member.',
  },
  {
    question: 'Who can approve a loan?',
    answer:
      'The president or the treasurer — and never the member who requested it. The database rejects self-approval, and every decision stores who made it and when.',
  },
  {
    question: 'Do members need a smartphone?',
    answer:
      'No. Members are identified by phone number, and notifications go out by SMS. A member without the app can still pay cash to the treasurer and receive an SMS receipt.',
  },
  {
    question: 'How is the pot balance calculated?',
    answer:
      'Contributions, plus fines, plus repayments, minus loans committed and payouts made. Fines are counted separately from contributions so you can always see what came from what.',
  },
  {
    question: 'What happens at the end of the year?',
    answer:
      'The president records a distribution for the period — either equal shares or proportional to the contributions each member actually paid. Every share is stored against a membership.',
  },
]

export function FaqSection() {
  const { t } = useI18n()
  const faqs = [0, 1, 2, 3, 4, 5].map((i) => ({
    question: t(`faq.${i}.q`),
    answer: t(`faq.${i}.a`),
  }))
  return (
    <Section tone="surface">
      <Reveal>
        <div className="grid gap-12 section-y lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <SplitHeading lead={t('faq.lead')} trail={t('faq.trail')} className="max-w-[10ch]" />
            <p className="mt-6 max-w-[34ch] text-[14px] leading-[1.65] text-muted">
              {t('faq.subtitle')}
            </p>
          </div>
          <Accordion>
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`faq-${index}`}
                question={faq.question}
                answer={faq.answer}
              />
            ))}
          </Accordion>
        </div>
      </Reveal>
    </Section>
  )
}

/* -------------------------------------------------------------------- CTA */

export function CloseCta() {
  const { t } = useI18n()
  return (
    <Section>
      <Reveal>
        <div className="grid items-center gap-12 section-y lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <SplitHeading
              lead={t('cta.lead')}
              trail={t('cta.trail')}
              className="max-w-[15ch]"
            />
            <p className="mt-6 max-w-[44ch] text-[15px] leading-[1.65] text-muted">
              {t('cta.subtitle')}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/signup" className={buttonClass('ink', 'lg')}>
                {t('hero.cta1')}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
              <Link to="/how-it-works" className={buttonClass('outline', 'lg')}>
                <Play aria-hidden className="size-3.5" />
                {t('hero.cta2')}
              </Link>
            </div>
          </div>
          <CtaGeometry className="mx-auto w-full max-w-[420px]" />
        </div>
      </Reveal>
    </Section>
  )
}
