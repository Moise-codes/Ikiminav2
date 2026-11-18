/**
 * Wire types for the Itsinda API.
 * Field names mirror the Pydantic response models exactly — do not rename.
 * All money is integer Rwandan francs (RWF). All timestamps are ISO 8601.
 */

export type UUID = string

export type Language = 'rw' | 'en' | 'fr'
export type Role = 'president' | 'treasurer' | 'member'
export type MembershipStatus = 'invited' | 'active' | 'suspended' | 'left'
export type Frequency = 'weekly' | 'biweekly' | 'monthly'
export type GroupStatus = 'active' | 'suspended' | 'closed'
export type ContributionType = 'payment' | 'penalty' | 'reversal'
export type PaymentMethod = 'cash' | 'mtn_momo' | 'airtel_money' | 'bank'
export type DisputeStatus = 'open' | 'upheld' | 'rejected'
export type LoanStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'disbursed'
  | 'repaid'
  | 'overdue'
  | 'written_off'
export type UserStatus = 'active' | 'locked' | 'deactivated' | 'anonymized'
export type DevicePlatform = 'android' | 'ios' | 'web'
export type PhoneOperator = 'mtn' | 'airtel'
export type PaymentChannel = 'mtn_momo' | 'airtel_money'
export type PaymentStatus = 'pending' | 'successful' | 'failed'

export interface Pagination {
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface Page<T> {
  items: T[]
  pagination: Pagination
}

/* ------------------------------------------------------------------ auth */

export interface UserProfile {
  id: UUID
  full_name: string
  phone: string | null
  phone_operator: PhoneOperator | null
  phone_verified_at: string | null
  email: string | null
  email_verified_at: string | null
  preferred_language: Language
  status: UserStatus
  is_platform_admin: boolean
  privacy_notice_version: string
  privacy_accepted_at: string
  created_at: string
  updated_at: string
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  refresh_expires_in: number
}

export interface AuthResponse {
  user: UserProfile
  tokens: TokenPair | null
  message: string
}

export interface SessionInfo {
  id: UUID
  user_agent: string | null
  ip: string | null
  created_at: string
  current: boolean
}

export interface DeviceResponse {
  id: UUID
  platform: DevicePlatform
  app_version: string | null
  is_active: boolean
  created_at: string
}

/* ---------------------------------------------------------------- groups */

export interface Group {
  id: UUID
  name: string
  description: string | null
  district: string | null
  sector: string | null
  default_contribution_rwf: number
  frequency: Frequency
  contribution_day: number
  loan_interest_bp: number
  loan_interest_pct: number
  max_loan_multiple: number | null
  status: GroupStatus
  rules_version: number
  created_by: UUID
  created_at: string
  updated_at: string
}

export interface Membership {
  id: UUID
  group_id: UUID
  user_id: UUID | null
  invited_phone: string | null
  role: Role
  status: MembershipStatus
  suggested_contribution_rwf: number | null
  joined_at: string | null
  left_at: string | null
  added_by_user_id: UUID
  created_at: string
  updated_at: string
}

export interface DistributionShare {
  id: UUID
  distribution_id: UUID
  membership_id: UUID
  amount_rwf: number
  created_at: string
}

export interface PotDistribution {
  id: UUID
  group_id: UUID
  period: string
  total_amount_rwf: number
  equal_shares: boolean
  notes: string | null
  recorded_by_user_id: UUID
  created_at: string
  shares: DistributionShare[]
}

/* ----------------------------------------------------------------- ledger */

export interface Contribution {
  id: UUID
  group_id: UUID
  membership_id: UUID
  period: string
  type: ContributionType
  amount_rwf: number
  reverses_id: UUID | null
  paid_at: string
  method: PaymentMethod
  reference: string | null
  recorded_by_user_id: UUID
  idempotency_key: string | null
  created_at: string
}

export interface ContributionDispute {
  id: UUID
  group_id: UUID
  contribution_id: UUID
  raised_by_membership_id: UUID
  reason: string
  status: DisputeStatus
  resolved_by_membership_id: UUID | null
  resolution_note: string | null
  created_at: string
  resolved_at: string | null
}

/* ------------------------------------------------------------------ loans */

export interface Loan {
  id: UUID
  group_id: UUID
  membership_id: UUID
  principal_rwf: number
  interest_bp: number
  term_months: number
  purpose: string | null
  status: LoanStatus
  total_due_rwf: number | null
  outstanding_rwf: number | null
  decided_by_membership_id: UUID | null
  decided_at: string | null
  decision_reason: string | null
  disbursed_at: string | null
  requested_at: string
}

export interface LoanScheduleItem {
  id: UUID
  loan_id: UUID
  installment_no: number
  due_date: string
  principal_rwf: number
  interest_rwf: number
  total_rwf: number
  paid_rwf: number
}

export interface Repayment {
  id: UUID
  loan_id: UUID
  group_id: UUID
  membership_id: UUID
  type: string
  amount_rwf: number
  principal_part_rwf: number
  interest_part_rwf: number
  reverses_id: UUID | null
  paid_at: string
  method: PaymentMethod
  reference: string | null
  recorded_by_user_id: UUID
  created_at: string
}

/* ---------------------------------------------------------------- reports */

export interface GroupSummary {
  group_id: UUID
  total_contributed_rwf: number
  total_penalties_rwf: number
  total_loaned_rwf: number
  total_repaid_rwf: number
  interest_earned_rwf: number
  available_pot_rwf: number
}

export interface MemberStatement {
  membership_id: string
  total_contributed_rwf: number
  total_penalties_rwf: number
  total_borrowed_rwf: number
  total_repaid_rwf: number
  outstanding_rwf: number
  periods: Record<string, unknown>[]
}

export interface LateMember {
  membership_id: string
  user_id: string | null
  role: Role
  expected_rwf: number
}

export interface LateMembersResponse {
  group_id: UUID
  period: string
  late_count: number
  late_members: LateMember[]
}

/* --------------------------------------------------------------- payments */

export interface PaymentInitiation {
  transaction_id: string
  reference_id: string
  status: PaymentStatus
}

export interface PaymentStatusResponse {
  reference_id: string
  status: PaymentStatus
  external_transaction_id: string | null
  finished_at: string | null
}
