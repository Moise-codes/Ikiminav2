import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { ArrowRight, ArrowUpRight, Plus } from 'lucide-react'
import { PageHeader, Panel } from '@/components/app/PageHeader'
import { buttonClass } from '@/components/ui/Button'
import { Badge, EmptyState, Skeleton } from '@/components/ui/feedback'
import { Money, Stat } from '@/components/ui/data'
import { useGroups, keys } from '@/lib/queries'
import { loansApi, reportsApi } from '@/lib/api'
import { useSession } from '@/lib/session'
import {
  contributionDayLabel,
  currentPeriod,
  frequencyLabel,
  periodLabel,
  rwf,
} from '@/lib/format'
import type { Loan } from '@/lib/types'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { user } = useSession()
  const groupsQuery = useGroups()
  const groups = groupsQuery.data?.items ?? []

  const summaryQueries = useQueries({
    queries: groups.map((group) => ({
      queryKey: keys.summary(group.id),
      queryFn: () => reportsApi.summary(group.id),
    })),
  })

  const loanQueries = useQueries({
    queries: groups.map((group) => ({
      queryKey: [...keys.loans(group.id), 'all'],
      queryFn: () => loansApi.list(group.id, { per_page: 100 }),
    })),
  })

  const potTotal = summaryQueries.reduce((total, query) => total + (query.data?.available_pot_rwf ?? 0), 0)
  const contributedTotal = summaryQueries.reduce(
    (total, query) => total + (query.data?.total_contributed_rwf ?? 0),
    0,
  )

  const pending: { loan: Loan; groupName: string; groupId: string }[] = []
  loanQueries.forEach((query, index) => {
    const group = groups[index]
    if (!group || !query.data) return
    query.data.items
      .filter((loan) => loan.status === 'requested')
      .forEach((loan) => pending.push({ loan, groupName: group.name, groupId: group.id }))
  })

  const [today] = useState(() =>
    new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={today}
        title={`${greeting()}, ${user?.full_name?.split(' ')[0] ?? 'there'}`}
        description="What the books say across every group you belong to."
        actions={
          <Link to="/app/groups/new" className={buttonClass('ink', 'sm')}>
            <Plus aria-hidden className="size-3.5" />
            New group
          </Link>
        }
      />

      <section className="grid gap-5 border-b border-rule pb-5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Group pot"
          value={groupsQuery.isLoading ? '—' : <Money amount={potTotal} />}
          suffix="RWF"
          note="Across every group you belong to"
          emphasis
        />
        <Stat
          label="Contributed all time"
          value={groupsQuery.isLoading ? '—' : <Money amount={contributedTotal} />}
          suffix="RWF"
          note="Payments recorded in the ledger"
        />
        <Stat
          label="Groups"
          value={groups.length}
          note={groups.length === 1 ? 'One book to keep' : 'Each with its own rules'}
        />
        <Stat
          label="Awaiting decision"
          value={pending.length}
          note={pending.length === 0 ? 'No loan requests open' : 'Loans a leader has not decided'}
        />
      </section>

      {groupsQuery.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          title="No group yet"
          description="A group holds the rules — contribution amount, due day, loan interest — and everyone's record. Create one and invite the members you already have."
          action={
            <Link to="/app/groups/new" className={buttonClass('ink', 'md')}>
              Create your first group
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <Panel title="Your groups" padded={false}>
            <ul className="divide-y divide-rule">
              {groups.map((group, index) => {
                const summary = summaryQueries[index]?.data
                return (
                  <li key={group.id}>
                    <Link
                      to={`/app/groups/${group.id}`}
                      className="group flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-paper-2/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-ink">{group.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {frequencyLabel(group.frequency)} ·{' '}
                          {contributionDayLabel(group.frequency, group.contribution_day)} ·{' '}
                          {rwf(group.default_contribution_rwf)} RWF
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="tnum text-[13px] font-medium text-ink">
                            <Money amount={summary?.available_pot_rwf} />
                          </p>
                          <p className="text-[10px] text-faint">pot, RWF</p>
                        </div>
                        <ArrowUpRight
                          aria-hidden
                          className="size-3.5 text-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Panel>

          <Panel
            title="Loans awaiting a decision"
            action={
              <span className="tnum text-[11px] text-faint">
                {periodLabel(currentPeriod('monthly'))}
              </span>
            }
          >
            {pending.length === 0 ? (
              <p className="text-[12px] leading-relaxed text-muted">
                Nothing is waiting. When a member requests a loan, it appears here for the president
                or treasurer to decide.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-rule">
                {pending.slice(0, 5).map((entry) => (
                  <li key={entry.loan.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-medium text-ink">{entry.groupName}</p>
                      <p className="tnum mt-0.5 text-[11px] text-muted">
                        {rwf(entry.loan.principal_rwf)} RWF · {entry.loan.term_months} months
                      </p>
                    </div>
                    <Link
                      to={`/app/groups/${entry.groupId}/loans`}
                      className="shrink-0 text-[11px] font-medium text-ink underline decoration-rule-strong underline-offset-2 hover:decoration-ink"
                    >
                      Decide
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {groups.length > 0 ? (
        <Panel title="Where to go next" padded={false}>
          <div className="grid divide-y divide-rule sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              {
                title: 'Close this period',
                body: 'Record the payments collected this cycle.',
                to: `/app/groups/${groups[0].id}/ledger`,
                cta: 'Open ledger',
              },
              {
                title: 'Check who is late',
                body: 'The late list is computed from the rules, not memory.',
                to: `/app/groups/${groups[0].id}/reports`,
                cta: 'Open reports',
              },
              {
                title: 'Add a member',
                body: 'Invite by phone number, no email required.',
                to: `/app/groups/${groups[0].id}/members`,
                cta: 'Open members',
              },
            ].map((item) => (
              <Link key={item.title} to={item.to} className="flex flex-col gap-1.5 p-4 hover:bg-paper-2/60">
                <p className="text-[12px] font-medium text-ink">{item.title}</p>
                <p className="text-[11px] leading-relaxed text-muted">{item.body}</p>
                <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted">
                  {item.cta}
                  <ArrowRight aria-hidden className="size-3" />
                </span>
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}

      <p className="flex items-center gap-2 text-[11px] text-faint">
        <Badge tone="outline">RWF integer</Badge>
        Every amount on this page comes from the ledger, not a cached total.
      </p>
    </div>
  )
}
