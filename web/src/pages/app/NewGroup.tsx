import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { PageHeader, Panel } from '@/components/app/PageHeader'
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
import { useCreateGroupMutation } from '@/lib/queries'
import { ALL_DISTRICTS, FREQUENCIES } from '@/lib/constants'
import { contributionDayLabel, ordinal } from '@/lib/format'
import type { Frequency } from '@/lib/types'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function NewGroup() {
  const navigate = useNavigate()
  const mutation = useCreateGroupMutation()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [district, setDistrict] = useState('')
  const [sector, setSector] = useState('')
  const [amount, setAmount] = useState('5000')
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [day, setDay] = useState('5')
  const [interest, setInterest] = useState('5')
  const [maxMultiple, setMaxMultiple] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (name.trim().length < 3) return setError('Give the group a name of at least 3 characters.')
    const amountValue = Number(amount)
    if (!Number.isFinite(amountValue) || amountValue < 100) {
      return setError('The contribution must be at least 100 RWF.')
    }

    try {
      const group = await mutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        district: district || null,
        sector: sector.trim() || null,
        default_contribution_rwf: amountValue,
        frequency,
        contribution_day: Number(day),
        loan_interest_pct: Number(interest) || 0,
        max_loan_multiple: maxMultiple ? Number(maxMultiple) : null,
      })
      toast.success(`${group.name} created. You are the president.`)
      navigate(`/app/groups/${group.id}`)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not create the group.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Link
        to="/app/groups"
        className="inline-flex items-center gap-1.5 text-[12px] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        All groups
      </Link>

      <PageHeader
        eyebrow="New group"
        title="Set the rule once"
        description="These numbers become the group's rules. You can change them later, but only forward from a named period."
      />

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Panel title="The group">
          <div className="flex flex-col gap-4">
            <Field label="Group name" htmlFor="group-name">
              <Input
                id="group-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ibimina Dufatanye"
                minLength={3}
                maxLength={80}
                required
              />
            </Field>
            <Field label="What is it for?" htmlFor="group-description" optional>
              <Textarea
                id="group-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Monthly savings for school fees and small loans."
                maxLength={500}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="District" htmlFor="group-district" optional>
                <Select
                  id="group-district"
                  value={district}
                  onChange={(event) => setDistrict(event.target.value)}
                >
                  <option value="">Not set</option>
                  {ALL_DISTRICTS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Sector" htmlFor="group-sector" optional>
                <Input
                  id="group-sector"
                  value={sector}
                  onChange={(event) => setSector(event.target.value)}
                  placeholder="Remera"
                  maxLength={50}
                />
              </Field>
            </div>
          </div>
        </Panel>

        <Panel title="The rules">
          <div className="flex flex-col gap-4">
            <Field label="Contribution per member" htmlFor="group-amount">
              <MoneyInput
                id="group-amount"
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
              hint={FREQUENCIES.find((item) => item.value === frequency)?.hint}
            />

            <Field
              label={frequency === 'weekly' ? 'Due day of the week' : 'Due day of the month'}
              htmlFor="group-day"
              hint={contributionDayLabel(frequency, Number(day))}
            >
              <Select id="group-day" value={day} onChange={(event) => setDay(event.target.value)}>
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
              <Field label="Loan interest" htmlFor="group-interest" hint="% per month">
                <Input
                  id="group-interest"
                  type="number"
                  min={0}
                  max={50}
                  step="0.5"
                  value={interest}
                  onChange={(event) => setInterest(event.target.value)}
                  className="tnum"
                />
              </Field>
              <Field label="Loan cap" htmlFor="group-cap" optional hint="× contributions">
                <Input
                  id="group-cap"
                  type="number"
                  min={1}
                  max={20}
                  value={maxMultiple}
                  onChange={(event) => setMaxMultiple(event.target.value)}
                  placeholder="3"
                  className="tnum"
                />
              </Field>
            </div>

            <FormNote>
              Leaving the loan cap empty means no multiple is enforced. The pot balance is still
              checked when a leader approves the loan.
            </FormNote>
          </div>
        </Panel>
      </div>

      {error ? <FormError>{error}</FormError> : null}

      <div className="flex items-center justify-between border-t border-rule pt-4">
        <p className="text-[11px] text-faint">You become the president of this group.</p>
        <Button type="submit" loading={mutation.isPending} iconAfter={<ArrowRight aria-hidden className="size-3.5" />}>
          Create group
        </Button>
      </div>
    </form>
  )
}
