import { useState } from 'react'
import { Check, HandCoins, X } from 'lucide-react'
import { Panel } from '@/components/app/PageHeader'
import { useGroupContext } from '@/components/app/groupContext'
import { LoanDecisionDialog, LoanRequestDialog, RepaymentDialog } from '@/components/app/dialogs'
import { Badge, Callout, EmptyState, Skeleton } from '@/components/ui/feedback'
import { Money, Table, type Column } from '@/components/ui/data'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/overlay'
import { useLoanSchedule, useLoans } from '@/lib/queries'
import { dateLabel, LOAN_STATUS_LABEL, rwf } from '@/lib/format'
import { LOAN_STATUSES } from '@/lib/constants'
import { memberLabel } from '@/lib/members'
import { cn } from '@/lib/cn'
import type { Loan } from '@/lib/types'

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  ...LOAN_STATUSES.filter((status) =>
    ['requested', 'approved', 'overdue', 'repaid', 'rejected'].includes(status),
  ).map((status) => ({ value: status, label: LOAN_STATUS_LABEL[status] })),
]

function statusTone(status: Loan['status']) {
  if (status === 'requested') return 'warn' as const
  if (status === 'overdue' || status === 'rejected') return 'debit' as const
  if (status === 'repaid') return 'credit' as const
  return 'neutral' as const
}

function LoanDetailDialog({
  loan,
  groupId,
  onClose,
  onDecide,
  onRepay,
  canDecide,
  borrower,
}: {
  loan: Loan | null
  groupId: string
  onClose: () => void
  onDecide: (action: 'approve' | 'reject') => void
  onRepay: (nextDue?: {
    installment_no: number
    total_rwf: number
    principal_rwf: number
    interest_rwf: number
  }) => void
  canDecide: boolean
  borrower: string
}) {
  const schedule = useLoanSchedule(groupId, loan?.id)
  const nextDue = schedule.data?.find((item) => item.paid_rwf < item.total_rwf)

  return (
    <Dialog
      open={Boolean(loan)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Loan detail"
      description={loan ? `${borrower} · requested ${dateLabel(loan.requested_at)}` : undefined}
      size="lg"
      footer={
        loan ? (
          <>
            {loan.status === 'requested' && canDecide ? (
              <>
                <Button variant="outline" size="sm" icon={<X aria-hidden className="size-3.5" />} onClick={() => onDecide('reject')}>
                  Reject
                </Button>
                <Button size="sm" icon={<Check aria-hidden className="size-3.5" />} onClick={() => onDecide('approve')}>
                  Approve
                </Button>
              </>
            ) : null}
            {['approved', 'disbursed', 'overdue'].includes(loan.status) ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onRepay(
                    nextDue
                      ? {
                          installment_no: nextDue.installment_no,
                          total_rwf: nextDue.total_rwf,
                          principal_rwf: nextDue.principal_rwf,
                          interest_rwf: nextDue.interest_rwf,
                        }
                      : undefined,
                  )
                }
              >
                Record repayment
              </Button>
            ) : null}
          </>
        ) : null
      }
    >
      {loan ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Principal', value: rwf(loan.principal_rwf) },
              { label: 'Total due', value: rwf(loan.total_due_rwf) },
              { label: 'Outstanding', value: rwf(loan.outstanding_rwf) },
              { label: 'Term', value: `${loan.term_months} mo` },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-rule bg-paper px-3 py-2">
                <p className="text-[10px] tracking-[0.08em] text-faint uppercase">{item.label}</p>
                <p className="tnum mt-1 text-[13px] font-medium text-ink">{item.value}</p>
              </div>
            ))}
          </div>

          {loan.purpose ? (
            <p className="text-[12px] leading-relaxed text-muted">
              <span className="text-faint">Purpose: </span>
              {loan.purpose}
            </p>
          ) : null}

          {loan.decision_reason ? (
            <Callout tone={loan.status === 'rejected' ? 'debit' : 'neutral'} title="Decision note">
              {loan.decision_reason}
            </Callout>
          ) : null}

          <div>
            <p className="mb-2 text-[11px] font-medium tracking-[0.08em] text-faint uppercase">
              Repayment schedule
            </p>
            {schedule.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !schedule.data || schedule.data.length === 0 ? (
              <p className="rounded-xl border border-dashed border-rule-strong px-3 py-4 text-[12px] text-muted">
                The schedule is generated when a leader approves the loan.
              </p>
            ) : (
              <table className="w-full border-collapse text-[12px] [&_td]:pr-4 [&_th]:pr-4 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
                <thead>
                  <tr className="border-b border-rule-strong">
                    {['#', 'Due', 'Principal', 'Interest', 'Total', 'Paid'].map((header, index) => (
                      <th
                        key={header}
                        scope="col"
                        className={cn(
                          'pb-1.5 text-[10px] font-medium tracking-[0.08em] text-faint uppercase',
                          index === 0 ? 'text-left' : index === 1 ? 'text-left' : 'text-right',
                        )}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schedule.data.map((item) => {
                    const settled = item.paid_rwf >= item.total_rwf
                    return (
                      <tr key={item.id} className="border-b border-rule/70 last:border-0">
                        <td className="py-1.5 text-muted">{item.installment_no}</td>
                        <td className="py-1.5 text-muted">{dateLabel(item.due_date)}</td>
                        <td className="tnum py-1.5 text-right text-ink">{rwf(item.principal_rwf)}</td>
                        <td className="tnum py-1.5 text-right text-muted">{rwf(item.interest_rwf)}</td>
                        <td className="tnum py-1.5 text-right text-ink">{rwf(item.total_rwf)}</td>
                        <td className="py-1.5 text-right">
                          {settled ? (
                            <Badge tone="credit">Paid</Badge>
                          ) : (
                            <span className="tnum text-muted">{rwf(item.paid_rwf)}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : null}
    </Dialog>
  )
}

export default function GroupLoans() {
  const { group, members, canDecideLoans, meId } = useGroupContext()
  const [status, setStatus] = useState('')
  const [detail, setDetail] = useState<Loan | null>(null)
  const [decision, setDecision] = useState<{ loan: Loan; action: 'approve' | 'reject' } | null>(null)
  const [repayTarget, setRepayTarget] = useState<{
    loan: Loan
    nextDue?: { installment_no: number; total_rwf: number; principal_rwf: number; interest_rwf: number }
  } | null>(null)
  const [requestOpen, setRequestOpen] = useState(false)

  const loans = useLoans(group.id, status || undefined)
  const memberById = new Map(members.map((member) => [member.id, member]))
  const rows = loans.data?.items ?? []

  const columns: Column<Loan>[] = [
    {
      key: 'borrower',
      header: 'Borrower',
      render: (loan) => (
        <span className="text-[12px] font-medium text-ink">
          {memberLabel(memberById.get(loan.membership_id), meId)}
        </span>
      ),
    },
    {
      key: 'principal',
      header: 'Principal',
      align: 'right',
      render: (loan) => <Money amount={loan.principal_rwf} />,
    },
    {
      key: 'term',
      header: 'Term',
      align: 'right',
      render: (loan) => <span className="tnum text-[12px] text-muted">{loan.term_months} mo</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (loan) => <Badge tone={statusTone(loan.status)}>{LOAN_STATUS_LABEL[loan.status]}</Badge>,
    },
    {
      key: 'requested',
      header: 'Requested',
      render: (loan) => <span className="text-[12px] text-muted">{dateLabel(loan.requested_at)}</span>,
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      align: 'right',
      render: (loan) => <Money amount={loan.outstanding_rwf} />,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="Loans"
        action={
          <Button size="sm" icon={<HandCoins aria-hidden className="size-3.5" />} onClick={() => setRequestOpen(true)}>
            Request a loan
          </Button>
        }
        padded={false}
      >
        <div className="flex flex-wrap items-center gap-1.5 border-b border-rule px-4 py-3">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatus(filter.value)}
              aria-pressed={status === filter.value}
              className={cn(
                'h-7 rounded-xl border px-2.5 text-[11px] font-medium transition-colors',
                status === filter.value
                  ? 'border-ink bg-ink text-white'
                  : 'border-rule-strong text-muted hover:border-ink hover:text-ink',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="px-4 pb-3">
          <Table
            columns={columns}
            rows={rows}
            rowKey={(loan) => loan.id}
            onRowClick={(loan) => setDetail(loan)}
            isLoading={loans.isLoading}
            empty={
              <EmptyState
                title={status ? 'No loans in that state' : 'No loans yet'}
                description={
                  status
                    ? 'Clear the filter to see every loan the group has recorded.'
                    : 'A member requests a loan, a leader who is not the borrower decides it, and the schedule is generated at approval.'
                }
              />
            }
          />
        </div>
      </Panel>

      <p className="text-[11px] leading-relaxed text-faint">
        Interest is {group.loan_interest_pct}% per month and is fixed at approval — changing the rule
        later does not rewrite an existing loan.
      </p>

      <LoanDetailDialog
        loan={detail}
        groupId={group.id}
        borrower={detail ? memberLabel(memberById.get(detail.membership_id), meId) : ''}
        canDecide={canDecideLoans}
        onClose={() => setDetail(null)}
        onDecide={(action) => {
          if (!detail) return
          setDecision({ loan: detail, action })
          setDetail(null)
        }}
        onRepay={(nextDue) => {
          if (!detail) return
          setRepayTarget({ loan: detail, nextDue })
          setDetail(null)
        }}
      />

      <LoanDecisionDialog
        open={Boolean(decision)}
        onOpenChange={(open) => {
          if (!open) setDecision(null)
        }}
        loan={decision?.loan ?? null}
        action={decision?.action ?? 'approve'}
        borrower={decision ? memberLabel(memberById.get(decision.loan.membership_id), meId) : ''}
        groupId={group.id}
      />

      {repayTarget ? (
        <RepaymentDialog
          open={Boolean(repayTarget)}
          onOpenChange={(open) => {
            if (!open) setRepayTarget(null)
          }}
          loan={repayTarget.loan}
          groupId={group.id}
          nextDue={repayTarget.nextDue}
        />
      ) : null}

      <LoanRequestDialog open={requestOpen} onOpenChange={setRequestOpen} group={group} />
    </div>
  )
}
