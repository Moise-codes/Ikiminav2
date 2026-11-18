import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Section, SplitHeading } from '@/components/blueprint/Blueprint'
import { BlurReveal } from '@/components/ui/blur-reveal'
import { buttonClass } from '@/components/ui/Button'
import { Badge } from '@/components/ui/feedback'
import { CloseCta, FaqSection } from '@/components/marketing/sections'
import { Money } from '@/components/ui/data'
import { dateLabel } from '@/lib/format'

const STEPS = [
  {
    title: 'Open the group and set the rule',
    body: 'Name the group, choose weekly or monthly, set the contribution amount, the day it falls due, the loan interest and the maximum multiple of a member’s savings they may borrow.',
    detail: ['Contribution amount', 'Due day', 'Interest %', 'Loan cap'],
  },
  {
    title: 'Invite members by phone number',
    body: 'Members are identified by their Rwandan mobile number — no email required. Someone who already has an account joins immediately; anyone else is stored as an invitation with the number attached.',
    detail: ['President', 'Treasurer', 'Member'],
  },
  {
    title: 'Record the period',
    body: 'Everyone pays, the treasurer records each payment against a member and a period. Cash, MTN MoMo, Airtel Money or bank — with a reference when there is one.',
    detail: ['2026-11', '2026-12', '2027-W01'],
  },
  {
    title: 'Fine the gap, not the person',
    body: 'After the due day the late list is computed from the rules. A fine is written as its own line with a reason, so it never distorts what the member actually contributed.',
    detail: ['Late list', 'Fine amount', 'Reason'],
  },
  {
    title: 'Lend, then follow the schedule',
    body: 'A member requests a loan, a leader who is not the borrower decides it, and the repayment schedule is generated from the group’s due-day rule. Interest is frozen at approval.',
    detail: ['Requested', 'Approved', 'Repaid'],
  },
  {
    title: 'Close the year',
    body: 'The president records a distribution: equal shares, or proportional to what each member paid in. Every share is stored against a membership, so it can be defended later.',
    detail: ['Equal', 'Proportional'],
  },
]

const EXAMPLE_ROWS = [
  { period: '2026-09', type: 'Contribution', amount: 10000, method: 'MTN MoMo' },
  { period: '2026-10', type: 'Contribution', amount: 10000, method: 'Cash' },
  { period: '2026-10', type: 'Late fine', amount: 1000, method: 'Cash' },
  { period: '2026-10', type: 'Reversal', amount: -1000, method: 'Cash' },
  { period: '2026-11', type: 'Contribution', amount: 10000, method: 'Airtel Money' },
]

export default function HowItWorks() {
  return (
    <>
      <Section>
        <div className="max-w-[58ch] section-y">
          <h1 className="t-h1 mt-5 text-balance"><BlurReveal text="From the first contribution to the year-end split" /></h1>
          <p className="mt-6 text-[16px] leading-[1.65] text-muted">
            Six steps, in the order a group actually lives them. Nothing here needs a spreadsheet,
            and nothing here depends on remembering what was agreed in January.
          </p>
        </div>
      </Section>

      <Section tone="surface">
        <div className="divide-y divide-rule">
          {STEPS.map((step, index) => (
            <div key={step.title} className="grid gap-5 py-9 lg:grid-cols-[96px_1fr_260px] lg:gap-10">
              <span className="tnum text-[11px] tracking-[0.08em] text-faint">
                STEP {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h2 className="text-[17px] font-medium tracking-[-0.015em] text-ink">{step.title}</h2>
                <p className="mt-2 max-w-[62ch] text-[13px] leading-relaxed text-muted">{step.body}</p>
              </div>
              <ul className="flex flex-wrap items-start gap-1.5 lg:justify-end">
                {step.detail.map((item) => (
                  <li key={item}>
                    <Badge tone="outline">{item}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid gap-12 section-y lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16">
          <div>
            <SplitHeading lead="What a member’s month" trail="actually looks like" />
            <p className="mt-4 max-w-[48ch] text-[14px] leading-relaxed text-muted">
              The same rows the treasurer sees, shown to the member. A fine, then the correction that
              cancelled it — both still there, both attributable.
            </p>
            <Link to="/signup" className={buttonClass('ink', 'md', 'mt-6')}>
              Open a group
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </div>

          <div className="rounded-xl border border-rule bg-surface">
            <div className="flex items-center justify-between border-b border-rule px-4 py-3">
              <p className="text-[12px] font-medium text-ink">Uwimana Jean · statement</p>
              <Badge tone="credit">Active</Badge>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-rule">
                  {['Period', 'Entry', 'Method', 'Amount'].map((header, index) => (
                    <th
                      key={header}
                      scope="col"
                      className={`pb-2 pt-2.5 text-[10px] font-medium tracking-[0.09em] text-faint uppercase ${
                        index === 3 ? 'pr-4 text-right' : 'pl-4 text-left'
                      }`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EXAMPLE_ROWS.map((row) => (
                  <tr key={`${row.period}-${row.type}`} className="border-b border-rule/70 last:border-0">
                    <td className="py-2.5 pl-4 text-[12px] text-muted">{dateLabel(`${row.period}-05`)}</td>
                    <td className="py-2.5">
                      <Badge
                        tone={
                          row.type === 'Reversal' ? 'debit' : row.type === 'Late fine' ? 'warn' : 'neutral'
                        }
                      >
                        {row.type}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-[12px] text-muted">{row.method}</td>
                    <td className="py-2.5 pr-4 text-right">
                      <Money amount={row.amount} signed />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-rule bg-paper/60 px-4 py-2.5">
              <span className="text-[11px] text-muted">Net contributed this quarter</span>
              <span className="tnum text-[13px] font-medium text-ink">
                <Money amount={29000} /> RWF
              </span>
            </div>
          </div>
        </div>
      </Section>

      <FaqSection />
      <CloseCta />
    </>
  )
}
