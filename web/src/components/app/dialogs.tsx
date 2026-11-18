import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Dialog } from '@/components/ui/overlay'
import { Button } from '@/components/ui/Button'
import {
  Field,
  FormError,
  FormNote,
  Input,
  MoneyInput,
  Segmented,
  Select,
  Textarea,
} from '@/components/ui/form'
import { ApiError } from '@/lib/api'
import {
  useDecideLoanMutation,
  useDistributePotMutation,
  useInviteMemberMutation,
  useRecordContributionMutation,
  useRecordPenaltyMutation,
  useRepaymentMutation,
  useRequestLoanMutation,
  useReverseContributionMutation,
  useUpdateMemberMutation,
} from '@/lib/queries'
import { METHODS, estimateInterest, memberLabel } from '@/lib/members'
import { currentPeriod, previousPeriods, rwf, periodLabel } from '@/lib/format'
import type { Contribution, Group, Loan, Membership, PaymentMethod, Role } from '@/lib/types'

function useMutationError() {
  const [error, setError] = useState<string | null>(null)
  const handle = (caught: unknown) => {
    setError(caught instanceof ApiError ? caught.message : 'Could not reach the server.')
  }
  return { error, setError, handle }
}

function PeriodSelect({
  value,
  onChange,
  frequency,
  id,
}: {
  value: string
  onChange: (value: string) => void
  frequency: Group['frequency']
  id: string
}) {
  const options = useMemo(() => previousPeriods(frequency, 14), [frequency])
  return (
    <Select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((period) => (
        <option key={period} value={period}>
          {periodLabel(period)}
        </option>
      ))}
    </Select>
  )
}

function MemberSelect({
  id,
  members,
  value,
  onChange,
  meId,
}: {
  id: string
  members: Membership[]
  value: string
  onChange: (value: string) => void
  meId?: string
}) {
  return (
    <Select id={id} value={value} onChange={(event) => onChange(event.target.value)} required>
      <option value="">Choose a member</option>
      {members
        .filter((member) => member.status === 'active')
        .map((member) => (
          <option key={member.id} value={member.id}>
            {memberLabel(member, meId)} — {member.role}
          </option>
        ))}
    </Select>
  )
}

/* ------------------------------------------------------- record a payment */

export function RecordContributionDialog({
  open,
  onOpenChange,
  group,
  members,
  meId,
  defaultPeriod,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: Group
  members: Membership[]
  meId?: string
  defaultPeriod?: string
}) {
  const mutation = useRecordContributionMutation(group.id)
  const { error, setError, handle } = useMutationError()
  const [membershipId, setMembershipId] = useState('')
  const [period, setPeriod] = useState(defaultPeriod ?? currentPeriod(group.frequency))
  const [amount, setAmount] = useState(String(group.default_contribution_rwf))
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [reference, setReference] = useState('')

  useEffect(() => {
    if (open) {
      setMembershipId('')
      setAmount(String(group.default_contribution_rwf))
      setMethod('cash')
      setReference('')
      setPeriod(defaultPeriod ?? currentPeriod(group.frequency))
      setError(null)
    }
  }, [open, group.default_contribution_rwf, group.frequency, defaultPeriod, setError])

  async function submit() {
    setError(null)
    if (!membershipId) return setError('Choose the member who paid.')
    const value = Number(amount)
    if (!Number.isFinite(value) || value < 100) return setError('Enter at least 100 RWF.')

    try {
      await mutation.mutateAsync({
        membership_id: membershipId,
        period,
        amount_rwf: value,
        method,
        reference: reference.trim() || null,
        idempotency_key: crypto.randomUUID(),
      })
      toast.success(`${rwf(value)} RWF recorded for ${periodLabel(period)}`)
      onOpenChange(false)
    } catch (caught) {
      handle(caught)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record a contribution"
      description="Money that has already been received. Use the reference from the mobile money message when there is one."
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={mutation.isPending} onClick={submit}>
            Record payment
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Member" htmlFor="contribution-member">
          <MemberSelect
            id="contribution-member"
            members={members}
            value={membershipId}
            onChange={setMembershipId}
            meId={meId}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Period" htmlFor="contribution-period">
            <PeriodSelect
              id="contribution-period"
              value={period}
              onChange={setPeriod}
              frequency={group.frequency}
            />
          </Field>
          <Field label="Amount" htmlFor="contribution-amount">
            <MoneyInput
              id="contribution-amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </Field>
        </div>

        <Field label="Method" htmlFor="contribution-method">
          <Select
            id="contribution-method"
            value={method}
            onChange={(event) => setMethod(event.target.value as PaymentMethod)}
          >
            {METHODS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Reference" htmlFor="contribution-reference" optional hint="MoMo / slip number">
          <Input
            id="contribution-reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            maxLength={64}
            placeholder="MP251117.1423.A12345"
          />
        </Field>

        {error ? <FormError>{error}</FormError> : null}
        <FormNote>
          Contribution default for this group is {rwf(group.default_contribution_rwf)} RWF. The
          period is which cycle the payment settles, not the day it arrived.
        </FormNote>
      </div>
    </Dialog>
  )
}

/* -------------------------------------------------------------- late fine */

export function RecordPenaltyDialog({
  open,
  onOpenChange,
  group,
  members,
  meId,
  defaultPeriod,
  presetMemberId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: Group
  members: Membership[]
  meId?: string
  defaultPeriod?: string
  presetMemberId?: string
}) {
  const mutation = useRecordPenaltyMutation(group.id)
  const { error, setError, handle } = useMutationError()
  const suggested = Math.round(group.default_contribution_rwf * 0.1)
  const [membershipId, setMembershipId] = useState(presetMemberId ?? '')
  const [period, setPeriod] = useState(defaultPeriod ?? currentPeriod(group.frequency))
  const [amount, setAmount] = useState(String(suggested))
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) {
      setMembershipId(presetMemberId ?? '')
      setPeriod(defaultPeriod ?? currentPeriod(group.frequency))
      setAmount(String(suggested))
      setReason('')
      setError(null)
    }
  }, [open, presetMemberId, defaultPeriod, suggested, group.frequency, setError])

  async function submit() {
    setError(null)
    if (!membershipId) return setError('Choose the member being fined.')
    const value = Number(amount)
    if (!Number.isFinite(value) || value < 100) return setError('Enter at least 100 RWF.')
    if (reason.trim().length < 3) return setError('Give a reason of at least 3 characters.')

    try {
      await mutation.mutateAsync({
        membership_id: membershipId,
        period,
        amount_rwf: value,
        reason: reason.trim(),
        idempotency_key: crypto.randomUUID(),
      })
      toast.success('Late fine recorded')
      onOpenChange(false)
    } catch (caught) {
      handle(caught)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Charge a late fine"
      description="Fines are their own ledger line, so the member's contribution total stays clean."
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={mutation.isPending} onClick={submit}>
            Record fine
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Member" htmlFor="penalty-member">
          <MemberSelect
            id="penalty-member"
            members={members}
            value={membershipId}
            onChange={setMembershipId}
            meId={meId}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Period missed" htmlFor="penalty-period">
            <PeriodSelect
              id="penalty-period"
              value={period}
              onChange={setPeriod}
              frequency={group.frequency}
            />
          </Field>
          <Field label="Fine amount" htmlFor="penalty-amount">
            <MoneyInput
              id="penalty-amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </Field>
        </div>
        <Field label="Reason" htmlFor="penalty-reason" hint="Shown on the statement">
          <Input
            id="penalty-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Missed the November period"
            maxLength={300}
            required
          />
        </Field>
        {error ? <FormError>{error}</FormError> : null}
        <FormNote>
          Suggested fine is {rwf(suggested)} RWF — 10% of the group's contribution amount. The group
          rules decide whether that is right; this is only a starting point.
        </FormNote>
      </div>
    </Dialog>
  )
}

/* ---------------------------------------------------------------- reversal */

export function ReverseContributionDialog({
  open,
  onOpenChange,
  contribution,
  memberLabelText,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contribution: Contribution | null
  memberLabelText: string
}) {
  const mutation = useReverseContributionMutation(contribution?.group_id ?? '')
  const { error, setError, handle } = useMutationError()
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) {
      setReason('')
      setError(null)
    }
  }, [open, setError])

  async function submit() {
    if (!contribution) return
    if (reason.trim().length < 3) return setError('Give a reason of at least 3 characters.')
    try {
      await mutation.mutateAsync({ contribution_id: contribution.id, reason: reason.trim() })
      toast.success('Reversal recorded')
      onOpenChange(false)
    } catch (caught) {
      handle(caught)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Reverse this entry"
      description="The original row stays. A reversal is added with today's date and your name on it."
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="ink" loading={mutation.isPending} onClick={submit}>
            Record reversal
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {contribution ? (
          <div className="rounded-xl border border-rule bg-paper px-3 py-2.5">
            <p className="text-[12px] text-muted">
              {memberLabelText} · {periodLabel(contribution.period)} · {contribution.type}
            </p>
            <p className="tnum mt-1 text-[15px] font-medium text-ink">
              {rwf(contribution.amount_rwf)} RWF
            </p>
          </div>
        ) : null}
        <Field label="Why is it being reversed?" htmlFor="reverse-reason">
          <Textarea
            id="reverse-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Recorded against the wrong member"
            maxLength={500}
            required
          />
        </Field>
        {error ? <FormError>{error}</FormError> : null}
        <FormNote>A reversed entry still counts in the period totals until the reports are read again — the reversal appears beside it.</FormNote>
      </div>
    </Dialog>
  )
}

/* ------------------------------------------------------------ loan request */

export function LoanRequestDialog({
  open,
  onOpenChange,
  group,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: Group
}) {
  const mutation = useRequestLoanMutation(group.id)
  const { error, setError, handle } = useMutationError()
  const [principal, setPrincipal] = useState('')
  const [months, setMonths] = useState('3')
  const [purpose, setPurpose] = useState('')

  useEffect(() => {
    if (open) {
      setPrincipal('')
      setMonths('3')
      setPurpose('')
      setError(null)
    }
  }, [open, setError])

  const principalValue = Number(principal) || 0
  const monthValue = Number(months) || 0
  const interest = estimateInterest(principalValue, group.loan_interest_pct, monthValue)
  const total = principalValue + interest

  async function submit() {
    setError(null)
    if (principalValue < 1) return setError('Enter the amount you are requesting.')
    if (monthValue < 1 || monthValue > 36) return setError('Choose a term between 1 and 36 months.')
    try {
      await mutation.mutateAsync({
        principal_rwf: principalValue,
        term_months: monthValue,
        purpose: purpose.trim() || null,
      })
      toast.success('Request sent to the leaders')
      onOpenChange(false)
    } catch (caught) {
      handle(caught)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Request a loan"
      description="A leader who is not you decides this. Interest is fixed at approval."
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={mutation.isPending} onClick={submit}>
            Send request
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Amount requested" htmlFor="loan-principal">
          <MoneyInput
            id="loan-principal"
            value={principal}
            onChange={(event) => setPrincipal(event.target.value)}
            placeholder="50000"
          />
        </Field>
        <Field label="Term" htmlFor="loan-months" hint="1–36 months">
          <Input
            id="loan-months"
            type="number"
            min={1}
            max={36}
            value={months}
            onChange={(event) => setMonths(event.target.value)}
            className="tnum"
          />
        </Field>
        <Field label="Purpose" htmlFor="loan-purpose" optional>
          <Input
            id="loan-purpose"
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            placeholder="School fees"
            maxLength={300}
          />
        </Field>

        {principalValue > 0 && monthValue > 0 ? (
          <div className="rounded-xl border border-rule bg-paper px-3 py-2.5">
            <div className="flex items-baseline justify-between text-[12px] text-muted">
              <span>Interest at {group.loan_interest_pct}% per month</span>
              <span className="tnum text-ink">{rwf(interest)} RWF</span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between border-t border-rule pt-1.5">
              <span className="text-[12px] font-medium text-ink">Total to repay</span>
              <span className="tnum text-[14px] font-medium text-ink">{rwf(total)} RWF</span>
            </div>
          </div>
        ) : null}

        {error ? <FormError>{error}</FormError> : null}
        {group.max_loan_multiple ? (
          <FormNote>
            This group caps a loan at {group.max_loan_multiple}× what a member has contributed.
          </FormNote>
        ) : null}
      </div>
    </Dialog>
  )
}

/* ---------------------------------------------------------- loan decision */

export function LoanDecisionDialog({
  open,
  onOpenChange,
  loan,
  action,
  borrower,
  groupId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: Loan | null
  action: 'approve' | 'reject'
  borrower: string
  groupId: string
}) {
  const mutation = useDecideLoanMutation(groupId)
  const { error, setError, handle } = useMutationError()
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) {
      setReason('')
      setError(null)
    }
  }, [open, setError])

  async function submit() {
    if (!loan) return
    if (action === 'reject' && reason.trim().length < 3) {
      return setError('A rejection needs a reason of at least 3 characters.')
    }
    try {
      await mutation.mutateAsync({ loanId: loan.id, action, reason: reason.trim() || undefined })
      toast.success(action === 'approve' ? 'Loan approved and scheduled' : 'Loan rejected')
      onOpenChange(false)
    } catch (caught) {
      handle(caught)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={action === 'approve' ? 'Approve this loan' : 'Reject this loan'}
      description={
        action === 'approve'
          ? 'Approving fixes the interest rate and generates the repayment schedule.'
          : 'The borrower sees the reason on their request.'
      }
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={action === 'approve' ? 'ink' : 'outline'}
            loading={mutation.isPending}
            onClick={submit}
          >
            {action === 'approve' ? 'Approve loan' : 'Reject loan'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {loan ? (
          <div className="rounded-xl border border-rule bg-paper px-3 py-2.5">
            <p className="text-[12px] text-muted">{borrower}</p>
            <p className="tnum mt-1 text-[15px] font-medium text-ink">
              {rwf(loan.principal_rwf)} RWF over {loan.term_months} months
            </p>
            {loan.total_due_rwf ? (
              <p className="tnum mt-0.5 text-[11px] text-muted">
                Total due {rwf(loan.total_due_rwf)} RWF
              </p>
            ) : null}
          </div>
        ) : null}
        <Field
          label={action === 'approve' ? 'Note' : 'Reason'}
          htmlFor="decision-reason"
          optional={action === 'approve'}
        >
          <Textarea
            id="decision-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={
              action === 'approve' ? 'Agreed at the November meeting' : 'Pot cannot cover it this month'
            }
            maxLength={300}
          />
        </Field>
        {error ? <FormError>{error}</FormError> : null}
      </div>
    </Dialog>
  )
}

/* ------------------------------------------------------------- repayment */

export function RepaymentDialog({
  open,
  onOpenChange,
  loan,
  groupId,
  nextDue,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: Loan
  groupId: string
  nextDue?: { installment_no: number; total_rwf: number; principal_rwf: number; interest_rwf: number }
}) {
  const mutation = useRepaymentMutation(groupId, loan.id)
  const { error, setError, handle } = useMutationError()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [reference, setReference] = useState('')

  useEffect(() => {
    if (open) {
      setAmount(String(nextDue?.total_rwf ?? ''))
      setMethod('cash')
      setReference('')
      setError(null)
    }
  }, [open, nextDue])

  const amountValue = Number(amount) || 0
  const principalPart = Math.min(amountValue, nextDue?.principal_rwf ?? amountValue)
  const interestPart = Math.max(0, amountValue - principalPart)

  async function submit() {
    setError(null)
    if (amountValue < 1) return setError('Enter the amount received.')
    try {
      await mutation.mutateAsync({
        amount_rwf: amountValue,
        principal_part_rwf: principalPart,
        interest_part_rwf: interestPart,
        method,
        reference: reference.trim() || null,
        idempotency_key: crypto.randomUUID(),
      })
      toast.success('Repayment recorded')
      onOpenChange(false)
    } catch (caught) {
      handle(caught)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record a repayment"
      description="Applied to the oldest unpaid installment first."
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={mutation.isPending} onClick={submit}>
            Record repayment
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {nextDue ? (
          <div className="rounded-xl border border-rule bg-paper px-3 py-2.5">
            <p className="text-[12px] text-muted">Installment {nextDue.installment_no} due</p>
            <p className="tnum mt-1 text-[15px] font-medium text-ink">{rwf(nextDue.total_rwf)} RWF</p>
            <p className="tnum mt-0.5 text-[11px] text-muted">
              {rwf(nextDue.principal_rwf)} principal + {rwf(nextDue.interest_rwf)} interest
            </p>
          </div>
        ) : (
          <FormNote>Every installment is already covered. A further payment will reduce the balance.</FormNote>
        )}

        <Field label="Amount received" htmlFor="repayment-amount">
          <MoneyInput
            id="repayment-amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </Field>

        {amountValue > 0 ? (
          <div className="flex items-center justify-between rounded-xl border border-rule px-3 py-2 text-[12px]">
            <span className="text-muted">
              Split: <span className="tnum text-ink">{rwf(principalPart)}</span> principal,{' '}
              <span className="tnum text-ink">{rwf(interestPart)}</span> interest
            </span>
          </div>
        ) : null}

        <Field label="Method" htmlFor="repayment-method">
          <Select
            id="repayment-method"
            value={method}
            onChange={(event) => setMethod(event.target.value as PaymentMethod)}
          >
            {METHODS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Reference" htmlFor="repayment-reference" optional>
          <Input
            id="repayment-reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            maxLength={64}
          />
        </Field>

        {error ? <FormError>{error}</FormError> : null}
      </div>
    </Dialog>
  )
}

/* ---------------------------------------------------------------- members */

export function InviteMemberDialog({
  open,
  onOpenChange,
  groupId,
  defaultContribution,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  defaultContribution: number
}) {
  const mutation = useInviteMemberMutation(groupId)
  const { error, setError, handle } = useMutationError()
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<Role>('member')
  const [suggested, setSuggested] = useState('')

  useEffect(() => {
    if (open) {
      setPhone('')
      setRole('member')
      setSuggested('')
      setError(null)
    }
  }, [open, setError])

  async function submit() {
    setError(null)
    if (phone.trim().length < 9) return setError('Enter the member’s Rwandan mobile number.')
    try {
      await mutation.mutateAsync({
        phone: phone.trim(),
        role,
        suggested_contribution_rwf: suggested ? Number(suggested) : undefined,
      })
      toast.success('Member invited')
      onOpenChange(false)
    } catch (caught) {
      handle(caught)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Invite a member"
      description="If the number already has an account they join right away. Otherwise the invitation waits against that number."
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={mutation.isPending} onClick={submit}>
            Send invitation
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Phone number" htmlFor="invite-phone" hint="Rwandan mobile">
          <Input
            id="invite-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="0788 123 456"
            inputMode="tel"
            required
          />
        </Field>
        <Field label="Role" htmlFor="invite-role">
          <Select
            id="invite-role"
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
          >
            <option value="member">Member</option>
            <option value="treasurer">Treasurer</option>
            <option value="president">President</option>
          </Select>
        </Field>
        <Field
          label="Suggested contribution"
          htmlFor="invite-contribution"
          optional
          hint="Defaults to the group amount"
        >
          <MoneyInput
            id="invite-contribution"
            value={suggested}
            onChange={(event) => setSuggested(event.target.value)}
            placeholder={String(defaultContribution)}
          />
        </Field>
        {error ? <FormError>{error}</FormError> : null}
        <FormNote>
          A second president or treasurer cannot be active at the same time — the change will be
          refused rather than guessed.
        </FormNote>
      </div>
    </Dialog>
  )
}

export function MemberRoleDialog({
  open,
  onOpenChange,
  groupId,
  member,
  label,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: string
  member: Membership | null
  label: string
}) {
  const mutation = useUpdateMemberMutation(groupId)
  const { error, setError, handle } = useMutationError()
  const [role, setRole] = useState<Role>('member')
  const [status, setStatus] = useState<'active' | 'suspended'>('active')
  const [suggested, setSuggested] = useState('')

  useEffect(() => {
    if (open && member) {
      setRole(member.role)
      setStatus(member.status === 'suspended' ? 'suspended' : 'active')
      setSuggested(member.suggested_contribution_rwf ? String(member.suggested_contribution_rwf) : '')
      setError(null)
    }
  }, [open, member, setError])

  async function submit() {
    if (!member) return
    try {
      await mutation.mutateAsync({
        membershipId: member.id,
        role,
        status,
        suggested_contribution_rwf: suggested ? Number(suggested) : undefined,
      })
      toast.success('Member updated')
      onOpenChange(false)
    } catch (caught) {
      handle(caught)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Change membership"
      description={label}
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={mutation.isPending} onClick={submit}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Segmented
          label="Role"
          value={role}
          onChange={setRole}
          options={[
            { value: 'member', label: 'Member' },
            { value: 'treasurer', label: 'Treasurer' },
            { value: 'president', label: 'President' },
          ]}
          hint="Promoting a new president demotes the current one."
        />
        <Segmented
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'suspended', label: 'Suspended' },
          ]}
        />
        <Field label="Suggested contribution" htmlFor="member-contribution" optional>
          <MoneyInput
            id="member-contribution"
            value={suggested}
            onChange={(event) => setSuggested(event.target.value)}
          />
        </Field>
        {error ? <FormError>{error}</FormError> : null}
      </div>
    </Dialog>
  )
}

/* ----------------------------------------------------------- distribution */

export function DistributionDialog({
  open,
  onOpenChange,
  group,
  potBalance,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: Group
  potBalance: number
}) {
  const mutation = useDistributePotMutation(group.id)
  const { error, setError, handle } = useMutationError()
  const [period, setPeriod] = useState(currentPeriod(group.frequency))
  const [total, setTotal] = useState(String(potBalance > 0 ? potBalance : ''))
  const [equal, setEqual] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open) {
      setPeriod(currentPeriod(group.frequency))
      setTotal(String(potBalance > 0 ? potBalance : ''))
      setEqual(false)
      setNotes('')
      setError(null)
    }
  }, [open, potBalance, group.frequency, setError])

  async function submit() {
    setError(null)
    const value = Number(total)
    if (!Number.isFinite(value) || value < 100) return setError('Enter at least 100 RWF.')
    try {
      await mutation.mutateAsync({
        period,
        total_amount_rwf: value,
        equal_shares: equal,
        notes: notes.trim() || null,
      })
      toast.success('Distribution recorded')
      onOpenChange(false)
    } catch (caught) {
      handle(caught)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record a pot distribution"
      description="Shares are stored per membership. This cannot be undone — it is a payout record."
      footer={
        <>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={mutation.isPending} onClick={submit}>
            Record distribution
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Period" htmlFor="distribution-period">
            <PeriodSelect
              id="distribution-period"
              value={period}
              onChange={setPeriod}
              frequency={group.frequency}
            />
          </Field>
          <Field label="Total to distribute" htmlFor="distribution-total">
            <MoneyInput
              id="distribution-total"
              value={total}
              onChange={(event) => setTotal(event.target.value)}
            />
          </Field>
        </div>

        <Segmented
          label="Basis"
          value={equal ? 'equal' : 'proportional'}
          onChange={(value) => setEqual(value === 'equal')}
          options={[
            { value: 'proportional', label: 'Proportional to contributions' },
            { value: 'equal', label: 'Equal shares' },
          ]}
          hint={
            equal
              ? 'Every active member receives the same amount.'
              : 'Each member receives a share of what they actually paid in.'
          }
        />

        <Field label="Notes" htmlFor="distribution-notes" optional>
          <Textarea
            id="distribution-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Year-end distribution agreed on 14 November"
            maxLength={500}
          />
        </Field>

        {error ? <FormError>{error}</FormError> : null}
        <FormNote>The pot currently holds {rwf(potBalance)} RWF, calculated from the ledger.</FormNote>
      </div>
    </Dialog>
  )
}
