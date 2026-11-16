// API Response Types

export interface ApiResponse<T> {
  statusCode: number
  data: T
}

export interface ApiError {
  statusCode: number
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

// Pagination
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

// Auth Types
export interface User {
  id: string
  full_name: string
  phone: string
  email?: string
  phone_verified: boolean
  email_verified: boolean
  preferred_language: 'rw' | 'en' | 'fr'
  status: 'active' | 'locked' | 'deactivated' | 'anonymized'
  is_platform_admin: boolean
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface LoginRequest {
  phone: string
  password: string
}

export interface RegisterRequest {
  full_name: string
  phone: string
  password: string
  email?: string
  preferred_language?: 'rw' | 'en' | 'fr'
}

export interface VerifyPhoneRequest {
  phone: string
  code: string
}

export interface RefreshRequest {
  refresh_token: string
}

// Group Types
export interface Group {
  id: string
  name: string
  description?: string
  district?: string
  sector?: string
  default_contribution_rwf: number
  frequency: 'weekly' | 'biweekly' | 'monthly'
  contribution_day: number
  loan_interest_bp: number
  max_loan_multiple?: number
  status: 'active' | 'suspended' | 'closed'
  rules_version: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface Membership {
  id: string
  group_id: string
  user_id?: string
  invited_phone?: string
  role: 'president' | 'treasurer' | 'member'
  status: 'invited' | 'active' | 'suspended' | 'left'
  suggested_contribution_rwf?: number
  joined_at?: string
  left_at?: string
  added_by_user_id: string
  created_at: string
  updated_at: string
  user?: User
}

export interface CreateGroupRequest {
  name: string
  description?: string
  district?: string
  sector?: string
  default_contribution_rwf: number
  frequency: 'weekly' | 'biweekly' | 'monthly'
  contribution_day: number
  loan_interest_bp?: number
  max_loan_multiple?: number
}

export interface UpdateGroupRulesRequest {
  default_contribution_rwf?: number
  frequency?: 'weekly' | 'biweekly' | 'monthly'
  contribution_day?: number
  loan_interest_bp?: number
  max_loan_multiple?: number
  effective_from_period?: string
}

export interface AddMemberRequest {
  phone: string
  role?: 'president' | 'treasurer' | 'member'
  suggested_contribution_rwf?: number
}

export interface UpdateMemberRequest {
  role?: 'president' | 'treasurer' | 'member'
  status?: 'invited' | 'active' | 'suspended' | 'left'
  suggested_contribution_rwf?: number
}

// Contribution Types
export interface Contribution {
  id: string
  group_id: string
  membership_id: string
  period: string
  type: 'payment' | 'reversal'
  amount_rwf: number
  reverses_id?: string
  paid_at: string
  method: 'cash' | 'mtn_momo' | 'airtel_money' | 'bank'
  reference?: string
  recorded_by_user_id: string
  idempotency_key?: string
  created_at: string
}

export interface RecordContributionRequest {
  membership_id: string
  period: string
  amount_rwf: number
  paid_at?: string
  method: 'cash' | 'mtn_momo' | 'airtel_money' | 'bank'
  reference?: string
  idempotency_key?: string
}

export interface ReverseContributionRequest {
  contribution_id: string
  reason: string
  idempotency_key?: string
}

export interface ContributionDispute {
  id: string
  group_id: string
  contribution_id: string
  raised_by_membership_id: string
  reason: string
  status: 'open' | 'upheld' | 'rejected'
  resolved_by_membership_id?: string
  resolution_note?: string
  created_at: string
  resolved_at?: string
}

export interface DisputeRequest {
  contribution_id: string
  reason: string
}

export interface DisputeResolveRequest {
  status: 'upheld' | 'rejected'
  resolution_note?: string
}

// Loan Types
export interface Loan {
  id: string
  group_id: string
  membership_id: string
  principal_rwf: number
  interest_bp: number
  term_months: number
  purpose?: string
  status: 'requested' | 'approved' | 'rejected' | 'disbursed' | 'repaid' | 'overdue' | 'written_off'
  total_due_rwf?: number
  outstanding_rwf?: number
  decided_by_membership_id?: string
  decided_at?: string
  decision_reason?: string
  disbursed_at?: string
  requested_at: string
  created_at: string
  updated_at: string
}

export interface LoanScheduleItem {
  id: string
  loan_id: string
  installment_no: number
  due_date: string
  principal_rwf: number
  interest_rwf: number
  total_rwf: number
  paid_rwf: number
}

export interface RequestLoanRequest {
  principal_rwf: number
  term_months: number
  purpose?: string
}

export interface ApproveLoanRequest {
  decision_reason?: string
}

export interface RejectLoanRequest {
  decision_reason?: string
}

export interface RecordRepaymentRequest {
  amount_rwf: number
  paid_at?: string
  principal_part_rwf: number
  interest_part_rwf: number
  method: 'cash' | 'mtn_momo' | 'airtel_money' | 'bank'
  reference?: string
  idempotency_key?: string
}

export interface Repayment {
  id: string
  loan_id: string
  group_id: string
  membership_id: string
  type: 'payment' | 'reversal'
  amount_rwf: number
  principal_part_rwf: number
  interest_part_rwf: number
  reverses_id?: string
  paid_at: string
  method: 'cash' | 'mtn_momo' | 'airtel_money' | 'bank'
  reference?: string
  recorded_by_user_id: string
  idempotency_key?: string
  created_at: string
}

// Report Types
export interface GroupSummary {
  group_id: string
  total_contributed_rwf: number
  total_loaned_rwf: number
  total_repaid_rwf: number
  interest_earned_rwf: number
  available_pot_rwf: number
}

export interface MemberStatement {
  membership_id: string
  member_name: string
  total_contributed_rwf: number
  total_loaned_rwf: number
  total_repaid_rwf: number
  outstanding_loans_rwf: number
  balance_rwf: number
  contributions: Contribution[]
  loans: Loan[]
  repayments: Repayment[]
}

export interface LateMember {
  membership_id: string
  member_name: string
  phone: string
  period: string
  amount_due_rwf: number
  amount_paid_rwf: number
  amount_outstanding_rwf: number
  days_late: number
}

export interface LateMembersResponse {
  group_id: string
  period: string
  late_members: LateMember[]
  total_late_count: number
  total_outstanding_rwf: number
}

// Payment Types
export interface MtnRequestToPayRequest {
  membership_id: string
  amount_rwf: number
  payer_phone: string
  payer_message: string
  payee_note: string
  idempotency_key?: string
}

export interface MtnTransferRequest {
  membership_id: string
  amount_rwf: number
  payee_phone: string
  payer_message: string
  payee_note: string
  idempotency_key?: string
}

export interface MtnStatusCheckResponse {
  reference_id: string
  status: string
  external_transaction_id?: string
  finished_at?: string
}

// Notification Types
export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  data?: Record<string, unknown>
  read_at?: string
  created_at: string
}
