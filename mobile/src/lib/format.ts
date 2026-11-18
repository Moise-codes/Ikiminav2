const GROUP = new Intl.NumberFormat('en-GB')

export function rwf(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return GROUP.format(amount)
}

export function rwfSigned(amount: number): string {
  return amount < 0 ? `\u2212${GROUP.format(Math.abs(amount))}` : GROUP.format(amount)
}

export function dateLabel(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function phonePretty(phone: string | null | undefined): string {
  if (!phone) return '—'
  const match = /^\+250(\d{3})(\d{3})(\d{3})$/.exec(phone)
  return match ? `+250 ${match[1]} ${match[2]} ${match[3]}` : phone
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function periodLabel(period: string): string {
  const monthly = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period)
  if (monthly) return `${MONTHS[Number(monthly[2]) - 1]} ${monthly[1]}`
  const weekly = /^(\d{4})-W(\d{2})$/.exec(period)
  if (weekly) return `Week ${Number(weekly[2])}, ${weekly[1]}`
  return period
}

export function currentPeriod(frequency: string): string {
  const now = new Date()
  if (frequency === 'weekly') {
    const target = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    const dayNumber = target.getUTCDay() || 7
    target.setUTCDate(target.getUTCDate() + 4 - dayNumber)
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
    const week = Math.min(
      Math.ceil(((target.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7),
      49,
    )
    return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
  }
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function contributionDayLabel(frequency: string, day: number): string {
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  if (frequency === 'weekly') return `Every ${weekdays[day] ?? 'Monday'}`
  if (frequency === 'biweekly') return `Every two months, on the ${day}th`
  return `The ${day}th of each month`
}
