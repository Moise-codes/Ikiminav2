import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Scale } from 'lucide-react'
import { Panel } from '@/components/app/PageHeader'
import { useGroupContext } from '@/components/app/groupContext'
import { DistributionDialog, RecordPenaltyDialog } from '@/components/app/dialogs'
import { Badge, Callout, EmptyState, Skeleton } from '@/components/ui/feedback'
import { KeyValueList, Money, Stat } from '@/components/ui/data'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/form'
import { useDistributions, useLateMembers, useStatement, useSummary } from '@/lib/queries'
import { currentPeriod, dateLabel, periodLabel, previousPeriods, rwf } from '@/lib/format'
import { memberLabel } from '@/lib/members'
import type { Membership } from '@/lib/types'

export default function GroupReports() {
  const { group, members, canRecord, canManageGroup, meId, membership } = useGroupContext()
  const [params, setParams] = useSearchParams()
  const selectedMemberId = params.get('member') ?? ''

  const [period, setPeriod] = useState(currentPeriod(group.frequency))
  const [fineTarget, setFineTarget] = useState<Membership | null>(null)
  const [distributeOpen, setDistributeOpen] = useState(false)

  const summary = useSummary(group.id)
  const statement = useStatement(group.id, selectedMemberId || undefined)
  const late = useLateMembers(group.id, period)
  const distributions = useDistributions(group.id)

  const memberById = new Map(members.map((member) => [member.id, member]))
  const periods = previousPeriods(group.frequency, 18)
  const selectableMembers = canRecord ? members : membership ? [membership] : []

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Group summary">
          {summary.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : summary.data ? (
            <div className="grid gap-5 sm:grid-cols-3">
              <Stat
                label="Pot balance"
                value={<Money amount={summary.data.available_pot_rwf} />}
                suffix="RWF"
                emphasis
              />
              <Stat
                label="Contributed"
                value={<Money amount={summary.data.total_contributed_rwf} />}
                suffix="RWF"
              />
              <Stat
                label="Fines collected"
                value={<Money amount={summary.data.total_penalties_rwf} />}
                suffix="RWF"
              />
              <Stat
                label="Loaned"
                value={<Money amount={summary.data.total_loaned_rwf} />}
                suffix="RWF"
              />
              <Stat
                label="Repaid"
                value={<Money amount={summary.data.total_repaid_rwf} />}
                suffix="RWF"
              />
              <Stat
                label="Interest earned"
                value={<Money amount={summary.data.interest_earned_rwf} />}
                suffix="RWF"
              />
            </div>
          ) : (
            <EmptyState title="No summary" description="The report could not be computed." />
          )}
        </Panel>

        <Panel title="Member statement">
          <div className="flex flex-col gap-3">
            <Select
              aria-label="Choose a member"
              value={selectedMemberId}
              onChange={(event) => {
                const next = new URLSearchParams(params)
                if (event.target.value) next.set('member', event.target.value)
                else next.delete('member')
                setParams(next, { replace: true })
              }}
              className="h-8 text-[12px]"
            >
              <option value="">Choose a member</option>
              {selectableMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {memberLabel(member, meId)}
                </option>
              ))}
            </Select>

            {!selectedMemberId ? (
              <p className="text-[12px] leading-relaxed text-muted">
                {canRecord
                  ? 'Pick a member to see what they have paid, been fined, borrowed and still owe.'
                  : 'Your own statement is available here — nobody else’s.'}
              </p>
            ) : statement.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : statement.data ? (
              <div className="flex flex-col gap-2">
                <KeyValueList
                  items={[
                    { label: 'Contributed', value: <Money amount={statement.data.total_contributed_rwf} /> },
                    { label: 'Fined', value: <Money amount={statement.data.total_penalties_rwf} /> },
                    { label: 'Borrowed', value: <Money amount={statement.data.total_borrowed_rwf} /> },
                    { label: 'Repaid', value: <Money amount={statement.data.total_repaid_rwf} /> },
                    {
                      label: 'Outstanding',
                      value: <Money amount={statement.data.outstanding_rwf} />,
                    },
                  ]}
                />
                <Callout>
                  The API currently returns an empty <code>periods</code> array, so this statement is
                  totals-only. Per-period rows come from the ledger tab.
                </Callout>
              </div>
            ) : (
              <EmptyState
                title="Statement unavailable"
                description="A member can read their own statement; a leader can read anyone's in the group."
              />
            )}
          </div>
        </Panel>
      </div>

      {canRecord ? (
        <Panel
          title="Late members"
          action={
            <Select
              aria-label="Period"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="h-7 w-[170px] text-[11px]"
            >
              {periods.map((item) => (
                <option key={item} value={item}>
                  {periodLabel(item)}
                </option>
              ))}
            </Select>
          }
          padded={false}
        >
          <div className="px-4 pb-3">
            {late.isLoading ? (
              <Skeleton className="my-3 h-20 w-full" />
            ) : !late.data || late.data.late_count === 0 ? (
              <p className="py-4 text-[12px] text-credit">
                Every active member has paid {periodLabel(period)}. Nothing to chase.
              </p>
            ) : (
              <table className="w-full border-collapse text-[12px] [&_td]:pr-4 [&_th]:pr-4 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
                <thead>
                  <tr className="border-b border-rule-strong">
                    <th scope="col" className="pb-1.5 text-left text-[10px] font-medium tracking-[0.08em] text-faint uppercase">
                      Member
                    </th>
                    <th scope="col" className="pb-1.5 text-left text-[10px] font-medium tracking-[0.08em] text-faint uppercase">
                      Role
                    </th>
                    <th scope="col" className="pb-1.5 text-right text-[10px] font-medium tracking-[0.08em] text-faint uppercase">
                      Expected
                    </th>
                    <th scope="col" className="pb-1.5 text-right text-[10px] font-medium tracking-[0.08em] text-faint uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {late.data.late_members.map((lateMember) => {
                    const membershipRecord = memberById.get(lateMember.membership_id)
                    return (
                      <tr key={lateMember.membership_id} className="border-b border-rule/70 last:border-0">
                        <td className="py-2 text-ink">
                          {membershipRecord ? memberLabel(membershipRecord, meId) : 'Member'}
                        </td>
                        <td className="py-2">
                          <Badge tone={lateMember.role === 'member' ? 'outline' : 'ink'}>
                            {lateMember.role}
                          </Badge>
                        </td>
                        <td className="tnum py-2 text-right text-ink">{rwf(lateMember.expected_rwf)}</td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={() => membershipRecord && setFineTarget(membershipRecord)}
                            className="inline-flex items-center gap-1 text-[11px] text-muted transition-colors hover:text-warn"
                          >
                            <Scale aria-hidden className="size-3" />
                            Fine
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
            <p className="mt-2 text-[11px] text-faint">
              Expected amount is the member's own suggested contribution, or the group default of{' '}
              {rwf(group.default_contribution_rwf)} RWF.
            </p>
          </div>
        </Panel>
      ) : null}

      <Panel
        title="Pot distributions"
        action={
          canManageGroup ? (
            <Button size="sm" variant="outline" onClick={() => setDistributeOpen(true)}>
              Record distribution
            </Button>
          ) : null
        }
        padded={false}
      >
        <div className="px-4 pb-3">
          {distributions.isLoading ? (
            <Skeleton className="my-3 h-16 w-full" />
          ) : (distributions.data?.items ?? []).length === 0 ? (
            <p className="py-4 text-[12px] leading-relaxed text-muted">
              No distribution has been recorded. At the end of the cycle the president splits the pot
              — equally or in proportion to what each member paid in.
            </p>
          ) : (
            <table className="w-full border-collapse text-[12px] [&_td]:pr-4 [&_th]:pr-4 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
              <thead>
                <tr className="border-b border-rule-strong">
                  {['Period', 'Total', 'Basis', 'Shares', 'Recorded'].map((header, index) => (
                    <th
                      key={header}
                      scope="col"
                      className={`pb-1.5 text-[10px] font-medium tracking-[0.08em] text-faint uppercase ${
                        index === 0 || index === 2 || index === 4 ? 'text-left' : 'text-right'
                      }`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(distributions.data?.items ?? []).map((distribution) => (
                  <tr key={distribution.id} className="border-b border-rule/70 last:border-0">
                    <td className="py-2 text-ink">{periodLabel(distribution.period)}</td>
                    <td className="tnum py-2 text-right text-ink">
                      <Money amount={distribution.total_amount_rwf} />
                    </td>
                    <td className="py-2 text-muted">
                      {distribution.equal_shares ? 'Equal shares' : 'Proportional'}
                    </td>
                    <td className="tnum py-2 text-right text-muted">{distribution.shares.length}</td>
                    <td className="py-2 text-muted">{dateLabel(distribution.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Panel>

      {fineTarget ? (
        <RecordPenaltyDialog
          open={Boolean(fineTarget)}
          onOpenChange={(open) => {
            if (!open) setFineTarget(null)
          }}
          group={group}
          members={members}
          meId={meId}
          defaultPeriod={period}
          presetMemberId={fineTarget.id}
        />
      ) : null}

      <DistributionDialog
        open={distributeOpen}
        onOpenChange={setDistributeOpen}
        group={group}
        potBalance={summary.data?.available_pot_rwf ?? 0}
      />
    </div>
  )
}
