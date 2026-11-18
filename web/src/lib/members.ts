import type { Membership, PaymentMethod } from './types'
import { phonePretty } from './format'

/**
 * MembershipResponse carries no name for the member — only a user_id or an
 * invited phone. Until the API returns a display name, this is the honest
 * label: "You", the invited number, or a short membership reference.
 */
export function memberLabel(membership: Membership | null | undefined, meId?: string): string {
  if (!membership) return 'Unknown member'
  if (meId && membership.user_id === meId) return 'You'
  if (membership.invited_phone) return phonePretty(membership.invited_phone)
  if (membership.user_id) return `Member ${membership.user_id.slice(0, 6).toUpperCase()}`
  return `Membership ${membership.id.slice(0, 6).toUpperCase()}`
}

export function memberReference(membership: Membership): string {
  return membership.id.slice(0, 8).toUpperCase()
}

export const METHODS = [
  { value: 'cash' as PaymentMethod, label: 'Cash' },
  { value: 'mtn_momo' as PaymentMethod, label: 'MTN MoMo' },
  { value: 'airtel_money' as PaymentMethod, label: 'Airtel Money' },
  { value: 'bank' as PaymentMethod, label: 'Bank transfer' },
]

/** Round-half-up, matching the backend's interest calculation. */
export function estimateInterest(principal: number, interestPct: number, months: number): number {
  return Math.round((principal * interestPct * months) / 100)
}
