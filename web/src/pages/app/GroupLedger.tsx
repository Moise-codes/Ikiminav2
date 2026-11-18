import { useState } from 'react'
import { Receipt, RotateCcw } from 'lucide-react'
import { Panel } from '@/components/app/PageHeader'
import { useGroupContext } from '@/components/app/groupContext'
import { RecordContributionDialog, RecordPenaltyDialog, ReverseContributionDialog } from '@/components/app/dialogs'
import { Badge, EmptyState } from '@/components/ui/feedback'
import { Money, Pagination, Table, type Column } from '@/components/ui/data'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/form'
import { useContributions } from '@/lib/queries'
import { dateLabel, periodLabel, previousPeriods } from '@/lib/format'
import { CONTRIBUTION_TYPE_LABEL, PAYMENT_METHODS } from '@/lib/constants'
import { memberLabel } from '@/lib/members'
import type { Contribution } from '@/lib/types'

export default function GroupLedger() {
  const { group, members, canRecord, meId } = useGroupContext()
  const [period, setPeriod] = useState('')
  const [memberId, setMemberId] = useState('')
  const [page, setPage] = useState(1)

  const [contributionOpen, setContributionOpen] = useState(false)
  const [penaltyOpen, setPenaltyOpen] = useState(false)
  const [reverseTarget, setReverseTarget] = useState<Contribution | null>(null)

  const contributions = useContributions({
    groupId: group.id,
    period: period || undefined,
    membershipId: memberId || undefined,
    page,
    perPage: 25,
  })

  const memberById = new Map(members.map((member) => [member.id, member]))
  const periods = previousPeriods(group.frequency, 18)
  const rows = contributions.data?.items ?? []

  const columns: Column<Contribution>[] = [
    {
      key: 'paid',
      header: 'Paid',
      render: (entry) => <span className="text-[12px] text-muted">{dateLabel(entry.paid_at)}</span>,
    },
    {
      key: 'period',
      header: 'Period',
      render: (entry) => <span className="text-[12px] text-ink">{periodLabel(entry.period)}</span>,
    },
    {
      key: 'member',
      header: 'Member',
      render: (entry) => (
        <div className="min-w-0">
          <p className="truncate text-[12px] text-ink">
            {memberLabel(memberById.get(entry.membership_id), meId)}
          </p>
          <p className="truncate text-[10px] text-faint">
            {memberById.get(entry.membership_id)?.role ?? 'removed member'}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Entry',
      render: (entry) => (
        <Badge
          tone={entry.type === 'reversal' ? 'debit' : entry.type === 'penalty' ? 'warn' : 'neutral'}
        >
          {CONTRIBUTION_TYPE_LABEL[entry.type]}
        </Badge>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      render: (entry) => (
        <span className="text-[12px] text-muted">
          {PAYMENT_METHODS.find((method) => method.value === entry.method)?.label ?? entry.method}
        </span>
      ),
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (entry) => (
        <span className="tnum text-[11px] text-faint">{entry.reference ?? '—'}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (entry) => <Money amount={entry.amount_rwf} signed />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (entry) =>
        canRecord && entry.type !== 'reversal' ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              setReverseTarget(entry)
            }}
            className="inline-flex items-center gap-1 text-[11px] text-muted transition-colors hover:text-debit"
          >
            <RotateCcw aria-hidden className="size-3" />
            Reverse
          </button>
        ) : null,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="Ledger"
        action={
          canRecord ? (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setPenaltyOpen(true)}>
                Charge fine
              </Button>
              <Button size="sm" icon={<Receipt aria-hidden className="size-3.5" />} onClick={() => setContributionOpen(true)}>
                Record payment
              </Button>
            </div>
          ) : null
        }
        padded={false}
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-rule px-4 py-3">
          <Select
            aria-label="Filter by period"
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value)
              setPage(1)
            }}
            className="h-8 w-[190px] text-[12px]"
          >
            <option value="">All periods</option>
            {periods.map((item) => (
              <option key={item} value={item}>
                {periodLabel(item)}
              </option>
            ))}
          </Select>

          <Select
            aria-label="Filter by member"
            value={memberId}
            onChange={(event) => {
              setMemberId(event.target.value)
              setPage(1)
            }}
            className="h-8 w-[220px] text-[12px]"
          >
            <option value="">Every member</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {memberLabel(member, meId)} — {member.status}
              </option>
            ))}
          </Select>

          <p className="ml-auto text-[11px] text-faint">
            {contributions.data ? `${contributions.data.pagination.total} entries` : 'Loading'}
          </p>
        </div>

        <div className="px-4 pb-3">
          <Table
            columns={columns}
            rows={rows}
            rowKey={(entry) => entry.id}
            isLoading={contributions.isLoading}
            empty={
              <EmptyState
                title={period || memberId ? 'Nothing matches these filters' : 'The ledger is empty'}
                description={
                  period || memberId
                    ? 'Clear a filter to see the rest of the book.'
                    : 'Record the first contribution and the period total appears on the overview immediately.'
                }
              />
            }
            footer={
              contributions.data ? (
                <Pagination
                  page={contributions.data.pagination.page}
                  totalPages={contributions.data.pagination.total_pages}
                  total={contributions.data.pagination.total}
                  onPageChange={setPage}
                  unit="entries"
                />
              ) : null
            }
          />
        </div>
      </Panel>

      <p className="text-[11px] leading-relaxed text-faint">
        A reversal does not erase the original row. Both stay in the book, which is why a member's
        statement can always explain itself.
      </p>

      {canRecord ? (
        <>
          <RecordContributionDialog
            open={contributionOpen}
            onOpenChange={setContributionOpen}
            group={group}
            members={members}
            meId={meId}
            defaultPeriod={period || undefined}
          />
          <RecordPenaltyDialog
            open={penaltyOpen}
            onOpenChange={setPenaltyOpen}
            group={group}
            members={members}
            meId={meId}
            defaultPeriod={period || undefined}
          />
        </>
      ) : null}

      <ReverseContributionDialog
        open={Boolean(reverseTarget)}
        onOpenChange={(open) => {
          if (!open) setReverseTarget(null)
        }}
        contribution={reverseTarget}
        memberLabelText={
          reverseTarget ? memberLabel(memberById.get(reverseTarget.membership_id), meId) : ''
        }
      />
    </div>
  )
}
