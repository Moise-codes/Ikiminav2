import { useState } from 'react'
import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import { ArrowLeft, MoreHorizontal, Plus, Receipt, ShieldAlert } from 'lucide-react'
import { PageHeader } from '@/components/app/PageHeader'
import { useGroupContext, type GroupContextValue } from '@/components/app/groupContext'
import { RecordContributionDialog, RecordPenaltyDialog } from '@/components/app/dialogs'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/feedback'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/overlay'
import { EmptyState, Skeleton, Callout } from '@/components/ui/feedback'
import { useGroup, useMembers, useMyMembership } from '@/lib/queries'
import { useSession } from '@/lib/session'
import { contributionDayLabel, frequencyLabel, rwf } from '@/lib/format'
import { GROUP_STATUS_LABEL, ROLE_HELP } from '@/lib/constants'
import { cn } from '@/lib/cn'

const TABS = [
  { label: 'Overview', to: '', end: true },
  { label: 'Ledger', to: 'ledger' },
  { label: 'Members', to: 'members' },
  { label: 'Loans', to: 'loans' },
  { label: 'Reports', to: 'reports' },
  { label: 'Rules', to: 'rules' },
]

export { useGroupContext }

export default function GroupLayout() {
  const { groupId } = useParams()
  const { user } = useSession()
  const groupQuery = useGroup(groupId)
  const membersQuery = useMembers(groupId)
  const perms = useMyMembership(groupId, user?.id)

  const [contributionOpen, setContributionOpen] = useState(false)
  const [penaltyOpen, setPenaltyOpen] = useState(false)

  if (groupQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (groupQuery.isError || !groupQuery.data) {
    return (
      <EmptyState
        title="This group is not available"
        description="It may have been closed, or your membership may have ended. Check the groups you belong to."
        action={
          <Link to="/app/groups" className="text-[12px] font-medium text-ink underline underline-offset-2">
            Back to groups
          </Link>
        }
      />
    )
  }

  const group = groupQuery.data
  const members = membersQuery.data?.items ?? []

  const context: GroupContextValue = {
    group,
    groupId: group.id,
    role: perms.role,
    isMember: perms.isMember,
    canRecord: perms.canRecord,
    canDecideLoans: perms.canDecideLoans,
    canManageGroup: perms.canManageGroup,
    members,
    membership: perms.membership,
    meId: user?.id,
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/app/groups"
        className="inline-flex items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        All groups
      </Link>

      <PageHeader
        eyebrow={[group.district, group.sector].filter(Boolean).join(' / ') || 'Group'}
        title={group.name}
        description={
          group.description ??
          `${frequencyLabel(group.frequency)}, ${contributionDayLabel(group.frequency, group.contribution_day).toLowerCase()}.`
        }
        actions={
          <>
            {perms.canRecord ? (
              <>
                <Button size="sm" icon={<Plus aria-hidden className="size-3.5" />} onClick={() => setContributionOpen(true)}>
                  Record payment
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Receipt aria-hidden className="size-3.5" />}
                  onClick={() => setPenaltyOpen(true)}
                >
                  Charge fine
                </Button>
              </>
            ) : null}
            <Menu>
              <MenuTrigger
                aria-label="Group actions"
                className="inline-flex size-8 items-center justify-center rounded-xl border border-rule-strong text-muted transition-colors hover:border-ink hover:text-ink"
              >
                <MoreHorizontal aria-hidden className="size-4" />
              </MenuTrigger>
              <MenuContent>
                <MenuItem onSelect={() => (window.location.href = `/app/groups/${group.id}/reports`)}>
                  Late members this period
                </MenuItem>
                <MenuItem onSelect={() => (window.location.href = `/app/groups/${group.id}/rules`)}>
                  View the rules
                </MenuItem>
              </MenuContent>
            </Menu>
          </>
        }
        meta={
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-muted">
            <span className="flex items-center gap-2">
              <span className="text-faint">Contribution</span>
              <span className="tnum font-medium text-ink">{rwf(group.default_contribution_rwf)} RWF</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-faint">Interest</span>
              <span className="tnum font-medium text-ink">{group.loan_interest_pct}% / month</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="text-faint">Rules</span>
              <span className="text-ink">v{group.rules_version}</span>
            </span>
            <Badge tone={group.status === 'active' ? 'credit' : 'warn'}>
              {GROUP_STATUS_LABEL[group.status]}
            </Badge>
            {context.role ? <Badge tone="ink">{context.role}</Badge> : <Badge tone="outline">no seat</Badge>}
          </div>
        }
      />

      {!perms.isMember ? (
        <Callout tone="warn" title="You are not an active member">
          You can read this group only if your membership is active. Ask a president to reactivate it.
        </Callout>
      ) : null}

      {context.role ? (
        <p className="text-[11px] text-faint">{ROLE_HELP[context.role]}</p>
      ) : null}

      <nav
        aria-label="Group sections"
        className="flex items-center gap-5 overflow-x-auto border-b border-rule [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.label}
            to={tab.to === '' ? `/app/groups/${group.id}` : `/app/groups/${group.id}/${tab.to}`}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                '-mb-px shrink-0 border-b border-transparent pb-2.5 pt-1 text-[13px] transition-colors',
                isActive ? 'border-ink text-ink' : 'text-muted hover:text-ink',
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet context={context} />

      {perms.canRecord ? (
        <>
          <RecordContributionDialog
            open={contributionOpen}
            onOpenChange={setContributionOpen}
            group={group}
            members={members}
            meId={user?.id}
          />
          <RecordPenaltyDialog
            open={penaltyOpen}
            onOpenChange={setPenaltyOpen}
            group={group}
            members={members}
            meId={user?.id}
          />
        </>
      ) : null}

      {!perms.canRecord && perms.isMember ? (
        <p className="flex items-center gap-1.5 text-[11px] text-faint">
          <ShieldAlert aria-hidden className="size-3.5" />
          Only the president and treasurer can add entries.
        </p>
      ) : null}
    </div>
  )
}
