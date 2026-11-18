import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Panel } from '@/components/app/PageHeader'
import { useGroupContext } from '@/components/app/groupContext'
import { Badge, Callout, EmptyState, Skeleton } from '@/components/ui/feedback'
import { Money, Stat, Table, type Column } from '@/components/ui/data'
import { buttonClass } from '@/components/ui/Button'
import { useContributions, useLateMembers, useLoans, useSummary } from '@/lib/queries'
import { currentPeriod, periodLabel, rwf } from '@/lib/format'
import { memberLabel } from '@/lib/members'
import { CONTRIBUTION_TYPE_LABEL } from '@/lib/constants'
import type { Contribution, Loan } from '@/lib/types'

export default function GroupOverview() {
  const { group, canDecideLoans, canRecord, members, meId } = useGroupContext()
  const period = currentPeriod(group.frequency)

  const summary = useSummary(group.id)
  const recent = useContributions({ groupId: group.id, perPage: 6 })
  const periodPayments = useContributions({ groupId: group.id, period, perPage: 100 })
  const loans = useLoans(group.id)
  const late = useLateMembers(group.id, period)

  const activeMembers = members.filter((member) => member.status === 'active')
  const paidThisPeriod = new Set(
    (periodPayments.data?.items ?? [])
      .filter((entry) => entry.type === 'payment')
      .map((entry) => entry.membership_id),
  ).size
  const openLoans = (loans.data?.items ?? []).filter(
    (loan) => loan.status === 'requested' || loan.status === 'approved' || loan.status === 'overdue',
  )

  const memberById = new Map(members.map((member) => [member.id, member]))

  const recentColumns: Column<Contribution>[] = [
    {
      key: 'member',
      header: 'Member',
      render: (entry) => (
        <span className="text-[12px] text-ink">
          {memberLabel(memberById.get(entry.membership_id), meId)}
        </span>
      ),
    },
    {
      key: 'period',
      header: 'Period',
      render: (entry) => <span className="text-[12px] text-muted">{periodLabel(entry.period)}</span>,
    },
    {
      key: 'type',
      header: 'Entry',
      render: (entry) => (
        <Badge
          tone={
            entry.type === 'reversal' ? 'debit' : entry.type === 'penalty' ? 'warn' : 'neutral'
          }
        >
          {CONTRIBUTION_TYPE_LABEL[entry.type]}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (entry) => <Money amount={entry.amount_rwf} signed />,
    },
  ]

  if (summary.isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-5 rounded-xl border border-rule bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Pot balance"
          value={<Money amount={summary.data?.available_pot_rwf} />}
          suffix="RWF"
          note="Contributions + fines + repayments − loans − payouts"
          emphasis
        />
        <Stat
          label="Contributed"
          value={<Money amount={summary.data?.total_contributed_rwf} />}
          suffix="RWF"
          note="All payment entries, all time"
        />
        <Stat
          label="Out on loan"
          value={<Money amount={summary.data?.total_loaned_rwf} />}
          suffix="RWF"
          note="Principal committed to loans"
        />
        <Stat
          label="Interest earned"
          value={<Money amount={summary.data?.interest_earned_rwf} />}
          suffix="RWF"
          note="Interest portion of repayments"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title={`This period — ${periodLabel(period)}`}
          action={
            <Link
              to={`/app/groups/${group.id}/ledger`}
              className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink"
            >
              Open ledger
              <ArrowRight aria-hidden className="size-3" />
            </Link>
          }
        >
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="tnum text-[28px] leading-none font-medium tracking-[-0.03em] text-ink">
                {paidThisPeriod}
                <span className="text-[15px] text-faint"> / {activeMembers.length}</span>
              </p>
              <p className="mt-1.5 text-[12px] text-muted">members have paid this period</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-faint">Expected</p>
              <p className="tnum text-[13px] text-ink">
                {rwf(activeMembers.length * group.default_contribution_rwf)} RWF
              </p>
            </div>
          </div>

          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-xs bg-paper-2">
            <div
              className="h-full bg-ink transition-[width] duration-500"
              style={{
                width: `${
                  activeMembers.length === 0
                    ? 0
                    : Math.min(100, Math.round((paidThisPeriod / activeMembers.length) * 100))
                }%`,
              }}
            />
          </div>

          {canRecord && late.data && late.data.late_count > 0 ? (
            <Callout tone="warn" title={`${late.data.late_count} member(s) have not paid`}>
              They are visible on the reports tab, where a fine can be recorded against the period.
            </Callout>
          ) : null}

          {canRecord && late.data && late.data.late_count === 0 ? (
            <p className="mt-4 flex items-center gap-1.5 text-[11px] text-credit">
              Every active member has paid {periodLabel(period)}.
            </p>
          ) : null}
        </Panel>

        <Panel
          title="Loans in flight"
          action={
            <Link
              to={`/app/groups/${group.id}/loans`}
              className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink"
            >
              All loans
              <ArrowRight aria-hidden className="size-3" />
            </Link>
          }
        >
          {openLoans.length === 0 ? (
            <p className="text-[12px] leading-relaxed text-muted">
              No loan is open. Members can request one from the loans tab; a leader who is not the
              borrower decides it.
            </p>
          ) : (
            <ul className="divide-y divide-rule">
              {openLoans.slice(0, 4).map((loan: Loan) => (
                <li key={loan.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] text-ink">
                      {memberLabel(memberById.get(loan.membership_id), meId)}
                    </p>
                    <p className="tnum mt-0.5 text-[11px] text-muted">
                      {rwf(loan.principal_rwf)} RWF · {loan.term_months} mo
                    </p>
                  </div>
                  <Badge
                    tone={
                      loan.status === 'requested'
                        ? 'warn'
                        : loan.status === 'overdue'
                          ? 'debit'
                          : 'credit'
                    }
                  >
                    {loan.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          {canDecideLoans && openLoans.some((loan) => loan.status === 'requested') ? (
            <Link
              to={`/app/groups/${group.id}/loans`}
              className={buttonClass('outline', 'sm', 'mt-3 w-full')}
            >
              Decide open requests
              <ArrowUpRight aria-hidden className="size-3.5" />
            </Link>
          ) : null}
        </Panel>
      </div>

      <Panel title="Latest entries" padded={false}>
        <div className="px-4 pb-3">
          <Table
            columns={recentColumns}
            rows={recent.data?.items ?? []}
            rowKey={(entry) => entry.id}
            isLoading={recent.isLoading}
            dense
            empty={
              <EmptyState
                title="Nothing recorded yet"
                description={
                  canRecord
                    ? 'Record the first contribution against a member and a period — the pot updates immediately.'
                    : 'Once the treasurer records the first payment it will appear here.'
                }
              />
            }
            footer={
              recent.data ? (
                <p className="flex items-center gap-1.5 text-[11px] text-faint">
                  Showing the most recent {recent.data.items.length} of {recent.data.pagination.total}{' '}
                  entries · newest first
                </p>
              ) : null
            }
          />
        </div>
      </Panel>

      {recent.data && recent.data.items.length > 0 ? (
        <p className="text-[11px] text-faint">
          Entries are ordered by the day the money was paid, not the day it was typed in.
        </p>
      ) : null}
    </div>
  )
}
