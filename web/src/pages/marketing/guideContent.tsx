import type { ReactNode } from 'react'

export interface Guide {
  slug: string
  title: string
  summary: string
  readingTime: string
  updated: string
  body: ReactNode
}

function P({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-[14px] leading-[1.75] text-ink-2">{children}</p>
}

function H({ children }: { children: ReactNode }) {
  return <h2 className="mt-9 text-[17px] font-medium tracking-[-0.015em] text-ink">{children}</h2>
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 flex flex-col gap-2 border-l border-rule pl-4">
      {items.map((item) => (
        <li key={item} className="text-[13px] leading-relaxed text-muted">
          {item}
        </li>
      ))}
    </ul>
  )
}

export const GUIDES: Guide[] = [
  {
    slug: 'running-a-contribution-round',
    title: 'Running a contribution round without arguments',
    summary:
      'How to take a room full of cash, record it once, and close the period with a number everyone accepts.',
    readingTime: '6 min read',
    updated: 'November 2026',
    body: (
      <>
        <P>
          A contribution round fails in one of two ways: someone’s payment is written twice, or
          someone’s payment is never written at all. Both are avoidable, and neither needs a new
          policy — they need an order of operations.
        </P>
        <H>Announce the period before the money moves</H>
        <P>
          A period is a label, not a date. Monthly groups use <code>2026-11</code>, weekly groups use{' '}
          <code>2026-W45</code>. Say which period is being collected before the first franc changes
          hands, otherwise the same payment gets credited to two months.
        </P>
        <H>Record in the order the money arrived</H>
        <P>
          Read the room once, in seating order, and record as you go. Each row needs four facts:
          member, period, amount, method. If money arrives by MoMo, capture the transaction reference
          as well — that reference is the only thing that settles a dispute three weeks later.
        </P>
        <List
          items={[
            'Cash: count in front of the member, then record.',
            'MoMo or Airtel: record the reference, not just the amount.',
            'Bank: record the deposit slip number.',
            'Never record a payment you have not seen land.',
          ]}
        />
        <H>Close by reading the totals back</H>
        <P>
          Before people leave, read three numbers aloud: collected this period, expected this period,
          and the pot balance. If the room agrees with all three, the period is closed. If someone
          disagrees, you have found the problem while everyone is still in the room — which is the
          only cheap moment to fix it.
        </P>
        <H>What about the member who pays next week?</H>
        <P>
          Record it against the period it belongs to, not the day it arrived. The ledger stores both
          the period and the paid-at timestamp, so “he was late but he paid” stays distinguishable
          from “he paid on time”. That distinction is what the fine rule reads.
        </P>
      </>
    ),
  },
  {
    slug: 'group-rules-that-hold',
    title: 'Writing group rules that survive the first dispute',
    summary:
      'Six numbers to agree on paper, because the seventh month is when informal agreements stop being remembered the same way by everyone.',
    readingTime: '7 min read',
    updated: 'November 2026',
    body: (
      <>
        <P>
          Every group has rules. The question is whether they are stored somewhere a new member can
          read, in numbers, with a date attached. Rules kept in memory change owner every time the
          committee changes.
        </P>
        <H>The six numbers worth writing down</H>
        <List
          items={[
            'Contribution amount per member, in RWF.',
            'Frequency: weekly, every two months, or monthly.',
            'The day it falls due — a weekday for weekly groups, a date for monthly ones.',
            'The fine for a missed period, and the grace period before it applies.',
            'Loan interest, per month, as a percentage.',
            'The maximum loan as a multiple of what the member has contributed.',
          ]}
        />
        <H>Write the rule, then the reason</H>
        <P>
          A rule without a reason gets broken quietly. “Maximum loan is three times your
          contributions” is a rule; “so one default cannot empty the pot” is the reason. When a
          member asks for an exception, the group can discuss the reason instead of arguing about the
          number.
        </P>
        <H>Change rules forward, never backwards</H>
        <P>
          When the group raises the contribution from 5,000 to 7,000, the change should take effect
          from a named period — say 2027-01. Loans approved before that date keep the interest rate
          they were approved at. Retroactive rule changes are how a ledger loses credibility.
        </P>
        <H>Sign it with the period, not a date</H>
        <P>
          Dates are easy to misremember; periods are checkable against the ledger. “Effective
          2027-01” can be verified against every row in January. “From next meeting” cannot.
        </P>
      </>
    ),
  },
  {
    slug: 'year-end-distribution',
    title: 'Year-end distribution: equal or proportional?',
    summary:
      'Both methods are defensible. What matters is that the group chooses one before the money is counted, not after.',
    readingTime: '5 min read',
    updated: 'November 2026',
    body: (
      <>
        <P>
          At the end of the cycle the pot is divided. Two methods are common, and groups usually
          discover which one they meant after the total is on the table. Decide first.
        </P>
        <H>Equal shares</H>
        <P>
          The pot is divided by the number of active members. This rewards membership and attendance
          rather than the size of each contribution, and it is simple to explain. It also means a
          member who paid every period receives the same as one who paid half — which is fine only if
          the group said so in advance.
        </P>
        <H>Proportional shares</H>
        <P>
          The pot is divided in proportion to what each member actually contributed. This rewards
          discipline and survives scrutiny, but it needs a clean ledger — every contribution recorded
          against a member and a period. Fines are not contributions; they should not inflate a
          member’s share.
        </P>
        <H>Record the split, per membership</H>
        <P>
          Whatever method is used, the outcome should be stored as a share against each membership
          with the total and the basis recorded once. “We divided it equally in December” is not
          auditable; a stored share per member is.
        </P>
        <H>Check the arithmetic before the cash leaves</H>
        <P>
          The shares must add up to the total, and no share may be zero — a member who is active has
          a claim on the pot. Count the members, divide, and read the numbers back before anyone
          leaves the room.
        </P>
      </>
    ),
  },
]

export function findGuide(slug: string | undefined): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug)
}
