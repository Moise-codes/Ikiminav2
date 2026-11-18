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
  SceneHeroFloat,
  SceneLoans,
  SceneStatement,
  SceneWindowStack,
} from '@/components/art/Scenes'
import { PARTNER_LOGOS } from './BrandLogos'
import { cn } from '@/lib/cn'
import { Reveal } from '@/components/ui/reveal'
import { HeroFlow } from '@/components/art/HeroFlow'
import { CountUp } from '@/components/ui/count-up'
import { BlurReveal } from '@/components/ui/blur-reveal'

/* ------------------------------------------------------------------- hero */

export function Hero() {
  return (
    <Section className="overflow-hidden" innerClassName="!px-0" crosshairs>
      <div className="px-6 pt-24 pb-10 text-center sm:px-8 lg:px-12 lg:pt-32">
        <Reveal>
          <p className="t-eyebrow">The ledger for ibimina</p>
          <h1 className="t-display mx-auto mt-6 max-w-[18ch] text-balance">
            <BlurReveal text="Every franc your group saves, on the record" />
          </h1>
          <p className="mx-auto mt-6 max-w-[58ch] text-[17px] leading-[1.6] text-muted text-pretty">
            <BlurReveal text="Record contributions, approve loans with a repayment schedule, charge late fines and hand every member a statement. Phone-first, in RWF, with MTN MoMo and Airtel Money." delay={0.4} step={0.03} />
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3" style={{ animation: 'km-rise 0.8s cubic-bezier(0.22,1,0.36,1) 0.9s both' }}>
            <Link to="/signup" className={buttonClass('ink', 'lg')}>
              Create a group
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <Link to="/how-it-works" className={buttonClass('outline', 'lg')}>
              <Play aria-hidden className="size-3.5" />
              See how it works
            </Link>
          </div>
        </Reveal>
      </div>

      <div className="relative mx-auto mt-6 h-[260px] max-w-[1100px] sm:h-[320px] lg:h-[360px]">
        <div aria-hidden className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent/10 via-transparent to-accent-2/10" />
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-6">
          <SceneHeroFloat className="w-[520px] max-w-full float-y" />
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-[1100px] px-6">
        <Reveal delay={200}>
          <HeroFlow />
        </Reveal>
      </div>

    </Section>
  )
}

/* ------------------------------------------------------------- logo strip */

export function LogoStrip() {
  const track = [...PARTNER_LOGOS, ...PARTNER_LOGOS]

  return (
    <Section tone="paper" className="overflow-hidden">
      <div className="flex flex-col gap-6 py-9 lg:flex-row lg:items-center lg:gap-12">
        <p className="shrink-0 text-[11px] leading-[1.5] tracking-[0.01em] text-faint">
          Works with the rails
          <br />
          your group already uses
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

const PRODUCT_TABS = [
  {
    title: 'Contributions',
    body: 'Record money in against a member and a period. Cash, MoMo, Airtel or bank, each with a reference.',
    detail: 'Every row carries who recorded it, when it was paid, and which period it settles.',
  },
  {
    title: 'Loans',
    body: 'A request, a decision, then a schedule the borrower can read.',
    detail: 'Interest is snapshotted at approval, so a later rule change never rewrites an old loan.',
  },
  {
    title: 'Fines & reversals',
    body: 'Late fines sit on their own line. Mistakes are corrected with a reversal, not an edit.',
    detail: 'The original stays visible. The reversal carries the reason and the person who made it.',
  },
  {
    title: 'Reports',
    body: 'Pot balance, member statements, and who has not paid this period.',
    detail: 'Late lists are computed from the group rules — not from whoever remembers.',
  },
]

export function ProductSection() {
  const [active, setActive] = useState(0)

  return (
    <Section id="product">
      <Reveal>
      <div className="grid items-center gap-12 section-y lg:grid-cols-[1.02fr_1fr] lg:gap-16">
        <div>
          <p className="t-eyebrow">Inside the ledger</p>
          <h2 className="t-h2 mt-4 max-w-[18ch] text-balance">
            <BlurReveal text="One ledger, every job the treasurer does" />
          </h2>
          <p className="mt-5 max-w-[50ch] text-[15px] leading-[1.65] text-muted">
            Itsinda keeps the four things your group actually argues about: who paid, who borrowed,
            who is late, and what the pot holds.
          </p>

          <div className="mt-9 grid gap-px sm:grid-cols-2">
            {PRODUCT_TABS.map((tab, index) => {
              const isActive = index === active
              return (
                <button
                  key={tab.title}
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
            {PRODUCT_TABS[active].detail}
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

const LEDGER_RULES = [
  {
    rule: 'Append-only entries',
    effect: 'No update, no delete. A mistake becomes a reversal row with a reason attached.',
  },
  {
    rule: 'One president, one treasurer',
    effect: 'Enforced by the database, so a group cannot end up with two people claiming the pot.',
  },
  {
    rule: 'No self-approval',
    effect: 'The member who requests a loan can never be the one who decides it.',
  },
  {
    rule: 'Integer RWF only',
    effect: '1,000 RWF is 1000. No floats, no rounding drift, no cents to argue over.',
  },
  {
    rule: 'Every change audited',
    effect: 'Roles, rules and money movements are written with the before and after state.',
  },
]

export function RulebookSection() {
  return (
    <Section tone="surface">
      <Reveal>
      <div className="grid gap-12 section-y lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SplitHeading lead="Rules a spreadsheet" trail="cannot enforce" className="max-w-[13ch]" />
          <p className="mt-6 max-w-[42ch] text-[15px] leading-[1.65] text-muted">
            Most group disputes come from a number nobody can explain. Itsinda stores the rule
            itself, not just the total, so the answer to “why is this amount here?” is always one
            click away.
          </p>
          <Link to="/how-it-works" className={buttonClass('outline', 'md', 'mt-8')}>
            How a period closes
            <ArrowUpRight aria-hidden className="size-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-rule border-y border-rule">
          {LEDGER_RULES.map((item, index) => (
            <div key={item.rule} className="grid grid-cols-[auto_1fr] gap-5 py-6 lg:gap-8">
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
  return (
    <Section>
      <Reveal>
      <div className="section-y">
        <div className="max-w-[48ch]">
          <p className="t-eyebrow">Use cases</p>
          <h2 className="t-h2 mt-4 text-balance">
            <BlurReveal text="Where the money goes, and who decides" />
          </h2>
          <p className="mt-5 text-[15px] leading-[1.65] text-muted">
            Five moments that make or break trust in a savings group. Each one is a screen, not a
            policy document.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-6">
          <UseCaseCard
            className="md:col-span-4"
            title="The contribution run"
            body="Take the room's money in one pass: member, period, amount, method. The pot updates the moment the last row is saved."
            scene={<SceneContributions className="w-full" />}
          />
          <UseCaseCard
            className="md:col-span-2"
            title="Late fines"
            body="See who missed the period, then fine them the agreed percentage — on its own line."
            scene={<SceneFines className="w-full" />}
          />
          <UseCaseCard
            className="md:col-span-2"
            title="A loan cycle"
            body="Request, decide, disburse, then follow the installment whose due date is next."
            scene={<SceneLoans className="w-full" />}
          />
          <UseCaseCard
            className="md:col-span-2"
            title="Year-end split"
            body="Distribute the pot equally or in proportion to what each member actually paid in."
            scene={<SceneDistribution className="w-full" />}
          />
          <UseCaseCard
            className="md:col-span-2"
            title="Member statements"
            body="A member opens their own statement: paid, fined, borrowed, outstanding."
            scene={<SceneStatement className="w-full" />}
          />
        </div>
      </div>
      </Reveal>
    </Section>
  )
}

/* ------------------------------------------------------------------ stats */

const STATS = [
  { value: '0', label: 'floats in the money path', note: 'Every amount is a whole franc.' },
  { value: '3', label: 'roles the database enforces', note: 'President, treasurer, member.' },
  { value: '2', label: 'mobile money networks', note: 'MTN MoMo and Airtel Money.' },
  { value: '1', label: 'way to fix a mistake', note: 'A reversal with a reason.' },
]

export function StatsBand() {
  return (
    <Section tone="paper-2">
      <Reveal>
      <div className="section-y-sm">
        <p className="t-eyebrow">On the record</p>
        <div className="mt-8 grid gap-y-10 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-rule">
          {STATS.map((stat) => (
            <div key={stat.label} className="lg:px-8 lg:first:pl-0 lg:last:pr-0">
              <span className="tnum text-[56px] leading-none font-medium tracking-[-0.045em] text-ink">
                <CountUp value={parseInt(stat.value, 10) || 0} />
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
  return (
    <Section tone="surface">
      <Reveal>
      <div className="grid items-center gap-12 section-y lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        <div>
          <p className="t-eyebrow">Integrations</p>
          <h2 className="t-h2 mt-4 max-w-[18ch] text-balance">
            <BlurReveal text="Connect the rails your members already use" />
          </h2>
          <p className="mt-5 max-w-[48ch] text-[15px] leading-[1.65] text-muted">
            Pull a contribution from a member's wallet, push a payout back, and send the receipt by
            SMS. The ledger is written when the network confirms, not when someone types it in.
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

/** Itsinda does not charge groups. Every plan is listed at zero. */
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

export function PricingSection({ withHeading = true }: { withHeading?: boolean }) {
  return (
    <Section id="pricing">
      <Reveal>
      <div className="section-y">
        {withHeading ? (
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <SplitHeading lead="Free for" trail="every group" className="max-w-[12ch]" />
            <p className="max-w-[44ch] text-[15px] leading-[1.65] text-muted">
              Itsinda does not charge groups or members. Whatever your size, the price is the same:
              zero Rwandan francs. Operator fees for moving money are set by MTN and Airtel.
            </p>
          </div>
        ) : null}

        <div className="mt-12 grid gap-px border border-rule bg-rule md:grid-cols-3">
          {PLANS.map((plan) => (
            <div key={plan.name} className="flex flex-col bg-surface p-7">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[16px] font-medium tracking-[-0.01em] text-ink">{plan.name}</h3>
                {plan.featured ? (
                  <span className="rounded-xs bg-paper-2 px-2 py-1 text-[10px] font-medium tracking-[0.06em] text-ink uppercase">
                    Most groups
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
                <p className="text-[11.5px] font-medium text-ink">What's included:</p>
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
          All amounts in Rwandan francs. Mobile money operator charges are set by MTN and Airtel and
          are not charged by Itsinda.
        </p>
      </div>
      </Reveal>
    </Section>
  )
}

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
  return (
    <Section tone="surface">
      <Reveal>
      <div className="grid gap-12 section-y lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SplitHeading lead="Your questions," trail="answered" className="max-w-[10ch]" />
          <p className="mt-6 max-w-[34ch] text-[14px] leading-[1.65] text-muted">
            If something here is still unclear, write to us and we will answer with a screenshot of
            the screen.
          </p>
        </div>
        <Accordion>
          {FAQS.map((faq, index) => (
            <AccordionItem
              key={faq.question}
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
  return (
    <Section>
      <Reveal>
      <div className="grid items-center gap-12 section-y lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div>
          <SplitHeading
            lead="Ready to put your group"
            trail="on the record?"
            className="max-w-[15ch]"
          />
          <p className="mt-6 max-w-[44ch] text-[15px] leading-[1.65] text-muted">
            Create the group, set the contribution amount and the day it is due, then invite members
            by phone number.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/signup" className={buttonClass('ink', 'lg')}>
              Create a group
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <Link to="/how-it-works" className={buttonClass('outline', 'lg')}>
              <Play aria-hidden className="size-3.5" />
              See how it works
            </Link>
          </div>
        </div>
        <CtaGeometry className="mx-auto w-full max-w-[420px]" />
      </div>
      </Reveal>
    </Section>
  )
}
