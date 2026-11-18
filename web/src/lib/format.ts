import type { Frequency, LoanStatus, PaymentMethod, Role } from './types'

const GROUP_FORMAT = new Intl.NumberFormat('en-GB')

/** Integer RWF with thousands separators: 1284000 -> "1,284,000" */
export function rwf(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return GROUP_FORMAT.format(amount)
}

/** Same, with the currency marked: "1,284,000 RWF" */
export function rwfLong(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return `${GROUP_FORMAT.format(amount)} RWF`
}

/** Ledger-style signed amount, using a real minus sign for reversals. */
export function rwfSigned(amount: number): string {
  if (amount < 0) return `\u2212${GROUP_FORMAT.format(Math.abs(amount))}`
  return GROUP_FORMAT.format(amount)
}

/** For stat bands where space is tight: 1,284,000 -> "1.28M" */
export function rwfCompact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(2).replace(/\.00$/, '')}M`
  if (abs >= 10_000) return `${Math.round(amount / 1_000)}k`
  return GROUP_FORMAT.format(amount)
}

export function percentFromBp(basisPoints: number): string {
  const pct = basisPoints / 100
  return `${pct.toFixed(pct % 1 === 0 ? 0 : 2)}%`
}

export function percent(pct: number): string {
  return `${pct.toFixed(pct % 1 === 0 ? 0 : 2)}%`
}

/* ------------------------------------------------------------------ dates */

const DATE_FMT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const DATE_TIME_FMT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function dateLabel(iso: string | null | undefined): string {
  if (!iso) return '—'
  return DATE_FMT.format(new Date(iso))
}

export function dateTimeLabel(iso: string | null | undefined): string {
  if (!iso) return '—'
  return DATE_TIME_FMT.format(new Date(iso))
}

export function toDateInputValue(iso: string | null | undefined): string {
  const date = iso ? new Date(iso) : new Date()
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

/* ---------------------------------------------------------------- periods */

/**
 * The API's period format: `YYYY-MM` for monthly/biweekly groups and
 * `YYYY-WNN` for weekly groups. The backend regex accepts W00–W49.
 */
export function isoWeekOf(date: Date): { year: number; week: number } {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNumber = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return { year: target.getUTCFullYear(), week: Math.min(week, 49) }
}

export function formatPeriod(date: Date, frequency: Frequency): string {
  if (frequency === 'weekly') {
    const { year, week } = isoWeekOf(date)
    return `${year}-W${String(week).padStart(2, '0')}`
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function currentPeriod(frequency: Frequency): string {
  return formatPeriod(new Date(), frequency)
}

export function previousPeriods(frequency: Frequency, count = 12): string[] {
  const periods: string[] = []
  const cursor = new Date()
  for (let index = 0; index < count; index += 1) {
    periods.push(formatPeriod(cursor, frequency))
    if (frequency === 'weekly') cursor.setDate(cursor.getDate() - 7)
    else cursor.setMonth(cursor.getMonth() - 1)
  }
  return periods
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const MONTH_SHORT = MONTH_NAMES.map((month) => month.slice(0, 3))

export function periodLabel(period: string): string {
  if (!period) return '—'
  const monthly = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period)
  if (monthly) {
    const month = Number(monthly[2]) - 1
    return `${MONTH_SHORT[month]} ${monthly[1]}`
  }
  const weekly = /^(\d{4})-W(\d{2})$/.exec(period)
  if (weekly) {
    return `Week ${Number(weekly[2])}, ${weekly[1]}`
  }
  return period
}

export function periodLabelLong(period: string): string {
  const monthly = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period)
  if (monthly) {
    return `${MONTH_NAMES[Number(monthly[2]) - 1]} ${monthly[1]}`
  }
  return periodLabel(period)
}

/* ----------------------------------------------------------- contribution */

export function ordinal(value: number): string {
  const remainderTen = value % 10
  const remainderHundred = value % 100
  if (remainderTen === 1 && remainderHundred !== 11) return `${value}st`
  if (remainderTen === 2 && remainderHundred !== 12) return `${value}nd`
  if (remainderTen === 3 && remainderHundred !== 13) return `${value}rd`
  return `${value}th`
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** "Every Monday" / "The 5th of each month" / "The 5th, every two months" */
export function contributionDayLabel(frequency: Frequency, day: number): string {
  if (frequency === 'weekly') return `Every ${WEEKDAYS[day] ?? 'Monday'}`
  if (frequency === 'biweekly') return `The ${ordinal(day)}, every two months`
  return `The ${ordinal(day)} of each month`
}

export function frequencyLabel(frequency: Frequency): string {
  if (frequency === 'weekly') return 'Weekly'
  if (frequency === 'biweekly') return 'Every two months'
  return 'Monthly'
}

/* ------------------------------------------------------------------ misc */

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  if (parts.length === 0) return '?'
  return parts.map((part) => part.charAt(0).toUpperCase()).join('')
}

/** +250788123456 -> +250 788 123 456 */
export function phonePretty(phone: string | null | undefined): string {
  if (!phone) return '—'
  const match = /^\+250(\d{3})(\d{3})(\d{3})$/.exec(phone)
  if (!match) return phone
  return `+250 ${match[1]} ${match[2]} ${match[3]}`
}

export const ROLE_LABEL: Record<Role, string> = {
  president: 'President',
  treasurer: 'Treasurer',
  member: 'Member',
}

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Cash',
  mtn_momo: 'MTN MoMo',
  airtel_money: 'Airtel Money',
  bank: 'Bank',
}

export const LOAN_STATUS_LABEL: Record<LoanStatus, string> = {
  requested: 'Awaiting decision',
  approved: 'Approved',
  rejected: 'Rejected',
  disbursed: 'Disbursed',
  repaid: 'Repaid',
  overdue: 'Overdue',
  written_off: 'Written off',
}

export function daysBetween(from: string | Date, to: string | Date = new Date()): number {
  const start = typeof from === 'string' ? new Date(from) : from
  const end = typeof to === 'string' ? new Date(to) : to
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}
