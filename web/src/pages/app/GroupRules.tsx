import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import { Panel } from '@/components/app/PageHeader'
import { useGroupContext } from '@/components/app/groupContext'
import { Badge, Callout } from '@/components/ui/feedback'
import { KeyValueList } from '@/components/ui/data'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/overlay'
import {
  Field,
  FormError,
  FormNote,
  Input,
  MoneyInput,
  Segmented,
  Select,
} from '@/components/ui/form'
import { ApiError } from '@/lib/api'
import { useUpdateRulesMutation } from '@/lib/queries'
import { contributionDayLabel, currentPeriod, frequencyLabel, ordinal, previousPeriods, rwf } from '@/lib/format'
import { FREQUENCIES } from '@/lib/constants'
import type { Frequency } from '@/lib/types'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function GroupRules() {
  const { group, canManageGroup } = useGroupContext()
  const [open, setOpen] = useState(false)
  const mutation = useUpdateRulesMutation(group.id)

  const [effectiveFrom, setEffectiveFrom] = useState(currentPeriod(group.frequency))
  const [amount, setAmount] = useState(String(group.default_contribution_rwf))
  const [frequency, setFrequency] = useState<Frequency>(group.frequency)
  const [day, setDay] = useState(String(group.contribution_day))
  const [interest, setInterest] = useState(String(group.loan_interest_pct))
  const [cap, setCap] = useState(group.max_loan_multiple ? String(group.max_loan_multiple) : '')
  const [error, setError] = useState<string | null>(null)

  function openEditor() {
    setEffectiveFrom(currentPeriod(group.frequency))
    setAmount(String(group.default_contribution_rwf))
    setFrequency(group.frequency)
    setDay(String(group.contribution_day))
    setInterest(String(group.loan_interest_pct))
    setCap(group.max_loan_multiple ? String(group.max_loan_multiple) : '')
    setError(null)
    setOpen(true)
  }

  async function submit() {
    setError(null)
    try {
      await mutation.mutateAsync({
        effective_from_period: effectiveFrom,
        default_contribution_rwf: Number(amount),
        frequency,
        contribution_day: Number(day),
        loan_interest_pct: Number(interest),
        max_loan_multiple: cap ? Number(cap) : null,
      })
      toast.success('Rules updated. Existing loans keep their approved interest.')
      setOpen(false)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not update the rules.')
    }
  }

  const periods = previousPeriods(group.frequency, 6)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel
          title="Current rules"
          action={
            canManageGroup ? (
              <Button size="sm" variant="outline" icon={<Pencil aria-hidden className="size-3" />} onClick={openEditor}>
                Edit
              </Button>
            ) : null
          }
        >
          <KeyValueList
            items={[
              { label: 'Contribution', value: `${rwf(group.default_contribution_rwf)} RWF` },
              { label: 'Frequency', value: frequencyLabel(group.frequency) },
              {
                label: 'Due',
                value: contributionDayLabel(group.frequency, group.contribution_day),
              },
              { label: 'Loan interest', value: `${group.loan_interest_pct}% per month` },
              {
                label: 'Loan cap',
                value: group.max_loan_multiple ? `${group.max_loan_multiple}× contributions` : 'Not capped',
              },
              { label: 'Rules version', value: <Badge tone="outline">v{group.rules_version}</Badge> },
            ]}
          />
        </Panel>

        <div className="flex flex-col gap-3">
          <Callout tone="warn" title="Rules change forward, never backwards">
            A change takes effect from a named period. Loans approved before that period keep the
            interest rate they were approved at, and past contributions are not recalculated.
          </Callout>
          <Callout title="What the rules control">
            The contribution amount drives the "expected" figure on late reports. The due day drives
            the repayment schedule when a loan is approved. The interest is stored as basis points
            internally and shown to you as a percentage.
          </Callout>
          <p className="text-[11px] leading-relaxed text-faint">
            Only the president can change the rules. Every change writes a new rule version with the
            period it applies from.
          </p>
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Change the group rules"
        description="Only the numbers you change are applied. Existing loans keep their approved interest."
        footer={
          <>
            <Button variant="quiet" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={mutation.isPending} onClick={submit}>
              Save rules
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Effective from period" htmlFor="rules-period" hint="Forward dated">
            <Select
              id="rules-period"
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
            >
              {periods.map((period) => (
                <option key={period} value={period}>
                  {period}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Contribution per member" htmlFor="rules-amount">
            <MoneyInput
              id="rules-amount"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </Field>

          <Segmented
            label="Frequency"
            value={frequency}
            onChange={(value) => {
              setFrequency(value)
              setDay(value === 'weekly' ? '0' : '5')
            }}
            options={FREQUENCIES.map((item) => ({ value: item.value, label: item.label }))}
          />

          <Field
            label={frequency === 'weekly' ? 'Due weekday' : 'Due day of month'}
            htmlFor="rules-day"
            hint={contributionDayLabel(frequency, Number(day))}
          >
            <Select id="rules-day" value={day} onChange={(event) => setDay(event.target.value)}>
              {frequency === 'weekly'
                ? WEEKDAYS.map((label, index) => (
                    <option key={label} value={index}>
                      {label}
                    </option>
                  ))
                : Array.from({ length: 28 }, (_, index) => index + 1).map((value) => (
                    <option key={value} value={value}>
                      {ordinal(value)} of the month
                    </option>
                  ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Loan interest" htmlFor="rules-interest" hint="% per month">
              <Input
                id="rules-interest"
                type="number"
                min={0}
                max={50}
                step="0.5"
                value={interest}
                onChange={(event) => setInterest(event.target.value)}
                className="tnum"
              />
            </Field>
            <Field label="Loan cap" htmlFor="rules-cap" optional hint="× contributions">
              <Input
                id="rules-cap"
                type="number"
                min={1}
                max={20}
                value={cap}
                onChange={(event) => setCap(event.target.value)}
                className="tnum"
              />
            </Field>
          </div>

          {error ? <FormError>{error}</FormError> : null}
          <FormNote>
            A group with the same day but a new frequency needs the day set again — weekly uses 0–6,
            monthly uses 1–28.
          </FormNote>
        </div>
      </Dialog>
    </div>
  )
}
