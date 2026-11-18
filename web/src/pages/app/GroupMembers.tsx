import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { MoreHorizontal, UserPlus } from 'lucide-react'
import { Panel } from '@/components/app/PageHeader'
import { useGroupContext } from '@/components/app/groupContext'
import { InviteMemberDialog, MemberRoleDialog } from '@/components/app/dialogs'
import { Badge, EmptyState } from '@/components/ui/feedback'
import { Money, Table, type Column } from '@/components/ui/data'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/Button'
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/overlay'
import { useRemoveMemberMutation } from '@/lib/queries'
import { ROLE_LABEL, dateLabel, phonePretty, rwf } from '@/lib/format'
import { MEMBERSHIP_STATUS_LABEL, ROLE_HELP } from '@/lib/constants'
import { memberLabel, memberReference } from '@/lib/members'
import type { Membership } from '@/lib/types'

export default function GroupMembers() {
  const { group, members, canManageGroup, meId, role } = useGroupContext()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Membership | null>(null)
  const removeMutation = useRemoveMemberMutation(group.id)

  const activeCount = members.filter((member) => member.status === 'active').length
  const invitedCount = members.filter((member) => member.status === 'invited').length

  async function removeMember(member: Membership) {
    try {
      await removeMutation.mutateAsync(member.id)
      toast.success('Membership ended. Their history stays in the ledger.')
    } catch {
      toast.error('Could not remove that member.')
    }
  }

  const columns: Column<Membership>[] = [
    {
      key: 'member',
      header: 'Member',
      render: (member) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-ink">{memberLabel(member, meId)}</p>
          <p className="tnum mt-0.5 text-[10px] text-faint">ref {memberReference(member)}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (member) => (
        <Badge tone={member.role === 'member' ? 'outline' : 'ink'}>{member.role}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (member) => (
        <Badge
          tone={
            member.status === 'active'
              ? 'credit'
              : member.status === 'suspended'
                ? 'debit'
                : member.status === 'invited'
                  ? 'warn'
                  : 'neutral'
          }
        >
          {MEMBERSHIP_STATUS_LABEL[member.status]}
        </Badge>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (member) => (
        <span className="text-[12px] text-muted">
          {member.joined_at ? dateLabel(member.joined_at) : member.invited_phone ? phonePretty(member.invited_phone) : '—'}
        </span>
      ),
    },
    {
      key: 'suggested',
      header: 'Contribution',
      align: 'right',
      render: (member) => (
        <span className="tnum text-[12px] text-ink">
          <Money amount={member.suggested_contribution_rwf ?? group.default_contribution_rwf} />
        </span>
      ),
    },
    {
      key: 'statement',
      header: '',
      align: 'right',
      render: (member) => (
        <Link
          to={`/app/groups/${group.id}/reports?member=${member.id}`}
          className="text-[11px] text-muted underline decoration-rule-strong underline-offset-2 hover:text-ink"
        >
          Statement
        </Link>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (member) =>
        canManageGroup ? (
          <Menu>
            <MenuTrigger asChild>
              <IconButton label={`Actions for ${memberLabel(member, meId)}`}>
                <MoreHorizontal aria-hidden className="size-4" />
              </IconButton>
            </MenuTrigger>
            <MenuContent>
              <MenuItem onSelect={() => setEditTarget(member)}>Change role or status</MenuItem>
              <MenuItem
                onSelect={() =>
                  (window.location.href = `/app/groups/${group.id}/reports?member=${member.id}`)
                }
              >
                Open statement
              </MenuItem>
              <MenuSeparator />
              <MenuItem destructive onSelect={() => void removeMember(member)}>
                End membership
              </MenuItem>
            </MenuContent>
          </Menu>
        ) : null,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title={`${activeCount} active · ${invitedCount} invited`}
        action={
          canManageGroup || role === 'treasurer' ? (
            <Button size="sm" icon={<UserPlus aria-hidden className="size-3.5" />} onClick={() => setInviteOpen(true)}>
              Invite member
            </Button>
          ) : null
        }
        padded={false}
      >
        <div className="px-4 pb-3">
          <Table
            columns={columns}
            rows={members}
            rowKey={(member) => member.id}
            empty={
              <EmptyState
                title="No members yet"
                description="Invite members by their Rwandan mobile number. Members without the app still receive SMS receipts."
                action={
                  canManageGroup ? (
                    <Button size="sm" onClick={() => setInviteOpen(true)}>
                      Invite the first member
                    </Button>
                  ) : null
                }
              />
            }
          />
        </div>
      </Panel>

      {role ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {(['president', 'treasurer', 'member'] as const).map((roleName) => (
            <div key={roleName} className="rounded-xl border border-rule bg-surface px-3 py-2.5">
              <p className="flex items-center justify-between text-[12px] font-medium text-ink">
                {ROLE_LABEL[roleName]}
                <span className="tnum text-[11px] text-faint">
                  {members.filter((member) => member.role === roleName && member.status === 'active').length}
                </span>
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">{ROLE_HELP[roleName]}</p>
            </div>
          ))}
        </div>
      ) : null}

      <p className="text-[11px] leading-relaxed text-faint">
        Removing a member ends their membership but keeps every franc they paid in the ledger, so the
        group totals still reconcile. Group amount: {rwf(group.default_contribution_rwf)} RWF.
      </p>

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        groupId={group.id}
        defaultContribution={group.default_contribution_rwf}
      />

      <MemberRoleDialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null)
        }}
        groupId={group.id}
        member={editTarget}
        label={editTarget ? memberLabel(editTarget, meId) : ''}
      />
    </div>
  )
}
