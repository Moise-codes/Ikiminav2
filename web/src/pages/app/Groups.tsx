import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { PageHeader, Panel } from '@/components/app/PageHeader'
import { buttonClass } from '@/components/ui/Button'
import { Badge, EmptyState } from '@/components/ui/feedback'
import { Table, type Column } from '@/components/ui/data'
import { Input } from '@/components/ui/form'
import { useGroups } from '@/lib/queries'
import { contributionDayLabel, frequencyLabel, rwf } from '@/lib/format'
import { GROUP_STATUS_LABEL } from '@/lib/constants'
import type { Group } from '@/lib/types'

export default function Groups() {
  const navigate = useNavigate()
  const groupsQuery = useGroups()
  const [query, setQuery] = useState('')

  const groups = groupsQuery.data?.items ?? []
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return groups
    return groups.filter(
      (group) =>
        group.name.toLowerCase().includes(term) ||
        (group.district ?? '').toLowerCase().includes(term) ||
        (group.sector ?? '').toLowerCase().includes(term),
    )
  }, [groups, query])

  const columns: Column<Group>[] = [
    {
      key: 'name',
      header: 'Group',
      render: (group) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-ink">{group.name}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted">
            {[group.district, group.sector].filter(Boolean).join(' / ') || 'No location recorded'}
          </p>
        </div>
      ),
    },
    {
      key: 'cycle',
      header: 'Cycle',
      render: (group) => (
        <div>
          <p className="text-[12px] text-ink">{frequencyLabel(group.frequency)}</p>
          <p className="text-[11px] text-muted">
            {contributionDayLabel(group.frequency, group.contribution_day)}
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Contribution',
      align: 'right',
      render: (group) => (
        <div>
          <p className="tnum text-[13px] text-ink">{rwf(group.default_contribution_rwf)}</p>
          <p className="text-[10px] text-faint">RWF</p>
        </div>
      ),
    },
    {
      key: 'interest',
      header: 'Loan interest',
      align: 'right',
      render: (group) => <span className="tnum text-[12px] text-muted">{group.loan_interest_pct}% / mo</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (group) => (
        <Badge tone={group.status === 'active' ? 'credit' : 'warn'}>
          {GROUP_STATUS_LABEL[group.status]}
        </Badge>
      ),
    },
    {
      key: 'rules',
      header: 'Rules',
      align: 'right',
      render: (group) => <span className="tnum text-[11px] text-faint">v{group.rules_version}</span>,
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Groups"
        title="Every book you keep"
        description="A group holds its own rules, members and ledger. Open one to record the period."
        actions={
          <Link to="/app/groups/new" className={buttonClass('ink', 'sm')}>
            <Plus aria-hidden className="size-3.5" />
            New group
          </Link>
        }
      />

      <Panel
        title={`${filtered.length} ${filtered.length === 1 ? 'group' : 'groups'}`}
        action={
          <div className="relative">
            <Search aria-hidden className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or district"
              aria-label="Search groups"
              className="h-8 w-[220px] pl-8 text-[12px]"
            />
          </div>
        }
        padded={false}
      >
        <div className="px-4 pb-3">
          <Table
            columns={columns}
            rows={filtered}
            rowKey={(group) => group.id}
            onRowClick={(group) => navigate(`/app/groups/${group.id}`)}
            isLoading={groupsQuery.isLoading}
            empty={
              <EmptyState
                title={query ? 'No group matches that' : 'No groups yet'}
                description={
                  query
                    ? 'Try the district, the sector, or the first word of the group name.'
                    : 'Create a group to set the contribution amount, the due day and the loan rules once.'
                }
                action={
                  query ? null : (
                    <Link to="/app/groups/new" className={buttonClass('ink', 'md')}>
                      Create a group
                    </Link>
                  )
                }
              />
            }
          />
        </div>
      </Panel>
    </div>
  )
}
