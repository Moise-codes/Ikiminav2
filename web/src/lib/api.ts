import type {
  AuthResponse,
  Contribution,
  ContributionDispute,
  DeviceResponse,
  Group,
  GroupSummary,
  LateMembersResponse,
  Loan,
  LoanScheduleItem,
  MemberStatement,
  Membership,
  Page,
  PaymentInitiation,
  PaymentStatusResponse,
  PotDistribution,
  Repayment,
  SessionInfo,
  TokenPair,
  UserProfile,
} from './types'

/**
 * The API mounts its routers without the `/api/v1` prefix (the prefix only
 * applies to the docs and the readiness probe), so paths here start at
 * `/auth`, `/groups`, `/reports` …
 */
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000'

const ACCESS_KEY = 'itsinda.access_token'
const REFRESH_KEY = 'itsinda.refresh_token'
const SESSION_EVENT = 'itsinda:session'

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

let accessToken: string | null = readStored(ACCESS_KEY)
let refreshToken: string | null = readStored(REFRESH_KEY)

export const tokenStore = {
  get access(): string | null {
    return accessToken
  },
  get refresh(): string | null {
    return refreshToken
  },
  set(pair: TokenPair): void {
    accessToken = pair.access_token
    refreshToken = pair.refresh_token
    window.localStorage.setItem(ACCESS_KEY, pair.access_token)
    window.localStorage.setItem(REFRESH_KEY, pair.refresh_token)
    window.dispatchEvent(new Event(SESSION_EVENT))
  },
  clear(): void {
    accessToken = null
    refreshToken = null
    window.localStorage.removeItem(ACCESS_KEY)
    window.localStorage.removeItem(REFRESH_KEY)
    window.dispatchEvent(new Event(SESSION_EVENT))
  },
}

export const sessionEvents = {
  name: SESSION_EVENT,
  subscribe(listener: () => void): () => void {
    window.addEventListener(SESSION_EVENT, listener)
    window.addEventListener('storage', listener)
    return () => {
      window.removeEventListener(SESSION_EVENT, listener)
      window.removeEventListener('storage', listener)
    }
  },
}

/* --------------------------------------------------------------- errors */

export class ApiError extends Error {
  status: number
  code: string
  details?: Record<string, unknown>

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

/** Plain-English message for the codes the backend can raise. */
const CODE_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: 'Please sign in to continue.',
  TOKEN_EXPIRED: 'Your session expired. Sign in again.',
  TOKEN_REVOKED: 'This session was ended elsewhere.',
  ACCOUNT_LOCKED: 'Too many failed attempts. The account is locked for 15 minutes.',
  ACCOUNT_INACTIVE: 'This account is not active.',
  INVALID_CREDENTIALS: 'Phone number or password is incorrect.',
  PHONE_NOT_VERIFIED: 'Verify your phone number first.',
  PHONE_ALREADY_REGISTERED: 'That phone number already has an account.',
  EMAIL_ALREADY_REGISTERED: 'That email is already in use.',
  NOT_A_GROUP_MEMBER: 'You are not a member of this group.',
  MEMBERSHIP_SUSPENDED: 'Your membership is suspended.',
  MEMBERSHIP_NOT_ACTIVE: 'Your membership is not active yet.',
  ROLE_NOT_ALLOWED: 'Your role does not allow this action.',
  MEMBER_ALREADY_INVITED: 'That person is already in this group.',
  TREASURER_EXISTS: 'This group already has an active treasurer.',
  CANNOT_SUSPEND_PRESIDENT: 'The president cannot be suspended. Transfer the role first.',
  CANNOT_REMOVE_PRESIDENT: 'The president cannot be removed. Transfer the role first.',
  NO_ACTIVE_MEMBERS: 'This group has no active members to distribute to.',
  POT_INSUFFICIENT: 'The group pot does not cover this amount yet.',
  MEMBER_NOT_ACTIVE: 'That member is not active in this group.',
  OVERDUE_LOAN: 'This member already has an overdue loan.',
  MAX_ACTIVE_LOANS: 'This member already has the maximum number of active loans.',
  LOAN_NOT_REQUESTED: 'This loan has already been decided.',
  LOAN_NOT_DISBURSED: 'Only an approved loan can take repayments.',
  SELF_DECISION: 'A member cannot decide on their own loan.',
  CANNOT_REVERSE_REVERSAL: 'A reversal cannot itself be reversed.',
  DISPUTE_EXISTS: 'There is already an open dispute on this entry.',
  INVALID_PHONE: 'Enter a Rwandan mobile number, e.g. 0788 123 456.',
  INVALID_CONTRIBUTION_DAY: 'That day does not match the contribution frequency.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Wait a moment and try again.',
  TOO_MANY_ATTEMPTS: 'Too many attempts. Wait a moment and try again.',
}

function messageFor(code: string, fallback: string): string {
  return CODE_MESSAGES[code] ?? fallback
}

interface ErrorEnvelope {
  statusCode?: number
  error?: { code?: string; message?: string; details?: Record<string, unknown> }
  detail?: unknown
}

function toApiError(status: number, payload: unknown): ApiError {
  const body = (payload ?? {}) as ErrorEnvelope

  if (body.error?.code) {
    return new ApiError(
      status,
      body.error.code,
      messageFor(body.error.code, body.error.message ?? 'Request failed.'),
      body.error.details,
    )
  }

  // FastAPI request validation errors bypass the envelope: {"detail": [...]}
  if (Array.isArray(body.detail)) {
    const parts = body.detail.map((item) => {
      const entry = item as { loc?: unknown[]; msg?: string }
      const field = Array.isArray(entry.loc) ? entry.loc[entry.loc.length - 1] : undefined
      return field ? `${String(field)}: ${entry.msg ?? 'invalid'}` : (entry.msg ?? 'invalid')
    })
    return new ApiError(status, 'VALIDATION_ERROR', parts.join('. '), { fields: body.detail })
  }

  if (typeof body.detail === 'string') {
    return new ApiError(status, 'VALIDATION_ERROR', body.detail)
  }

  return new ApiError(status, 'UNKNOWN', status === 500 ? 'Something went wrong on our side.' : 'Request failed.')
}

/* -------------------------------------------------------------- requests */

type QueryValue = string | number | boolean | null | undefined

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, QueryValue>
  idempotencyKey?: string
  auth?: boolean
  signal?: AbortSignal
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${API_BASE_URL}${path}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

let refreshInFlight: Promise<boolean> | null = null

async function rotateSession(): Promise<boolean> {
  if (!refreshToken) return false
  if (refreshInFlight) return refreshInFlight

  const pending = (async () => {
    try {
      const response = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
      if (!response.ok) {
        tokenStore.clear()
        return false
      }
      tokenStore.set((await response.json()) as TokenPair)
      return true
    } catch {
      return false
    }
  })()

  refreshInFlight = pending
  try {
    return await pending
  } finally {
    refreshInFlight = null
  }
}

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey
  if (options.auth !== false && accessToken) headers.Authorization = `Bearer ${accessToken}`

  return fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  })
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(path, options)

  const retriable =
    response.status === 401 &&
    options.auth !== false &&
    !path.startsWith('/auth/refresh') &&
    Boolean(tokenStore.refresh)

  if (retriable) {
    const refreshed = await rotateSession()
    if (refreshed) response = await send(path, options)
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = { detail: text }
    }
  }

  if (!response.ok) throw toApiError(response.status, payload)
  return unwrap<T>(payload)
}

/* ------------------------------------------------------------- endpoints */

export interface RegisterBody {
  full_name: string
  phone: string
  password: string
  preferred_language?: 'rw' | 'en' | 'fr'
}

export interface CreateGroupBody {
  name: string
  description?: string | null
  district?: string | null
  sector?: string | null
  default_contribution_rwf: number
  frequency: 'weekly' | 'biweekly' | 'monthly'
  contribution_day: number
  loan_interest_pct?: number
  max_loan_multiple?: number | null
}

export interface UpdateRulesBody {
  effective_from_period: string
  name?: string
  description?: string | null
  default_contribution_rwf?: number
  frequency?: 'weekly' | 'biweekly' | 'monthly'
  contribution_day?: number
  loan_interest_pct?: number
  max_loan_multiple?: number | null
}

export interface RecordContributionBody {
  membership_id: string
  period: string
  amount_rwf: number
  method: 'cash' | 'mtn_momo' | 'airtel_money' | 'bank'
  paid_at?: string
  reference?: string | null
  idempotency_key?: string
}

export interface RecordPenaltyBody {
  membership_id: string
  period: string
  amount_rwf: number
  reason: string
  method?: 'cash' | 'mtn_momo' | 'airtel_money' | 'bank'
  idempotency_key?: string
}

export interface RepaymentBody {
  amount_rwf: number
  principal_part_rwf: number
  interest_part_rwf: number
  method: 'cash' | 'mtn_momo' | 'airtel_money' | 'bank'
  paid_at?: string
  reference?: string | null
  idempotency_key?: string
}

export const authApi = {
  register(body: RegisterBody) {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body,
      auth: false,
    })
  },
  verifyPhone(phone: string, code: string) {
    return request<AuthResponse>('/auth/verify-phone', {
      method: 'POST',
      body: { phone, code },
      auth: false,
    })
  },
  resendOtp(phone: string, purpose: 'verify_phone' | 'login_2fa' = 'verify_phone') {
    return request<{ message: string }>('/auth/resend-otp', {
      method: 'POST',
      body: { phone, purpose },
      auth: false,
    })
  },
  login(phone: string, password: string) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { phone, password },
      auth: false,
    })
  },
  logout(allSessions = false) {
    return request<{ revoked_sessions: unknown }>('/auth/logout', {
      method: 'POST',
      body: { refresh_token: tokenStore.refresh, all_sessions: allSessions },
    })
  },
  me() {
    return request<UserProfile>('/auth/me')
  },
  updateMe(body: { full_name?: string; preferred_language?: 'rw' | 'en' | 'fr' }) {
    return request<UserProfile>('/auth/me', { method: 'PATCH', body })
  },
  sessions() {
    return request<SessionInfo[]>('/auth/sessions')
  },
  changePhone(newPhone: string) {
    return request<{ message: string }>('/auth/phone/change', {
      method: 'POST',
      body: { new_phone: newPhone },
    })
  },
  confirmPhoneChange(newPhone: string, code: string) {
    return request<{ user: UserProfile }>('/auth/phone/change/confirm', {
      method: 'POST',
      body: { new_phone: newPhone, code },
    })
  },
  addEmail(email: string) {
    return request<{ message: string }>('/auth/email', { method: 'POST', body: { email } })
  },
  forgotPassword(phone: string) {
    return request<{ message: string }>('/auth/password/forgot', {
      method: 'POST',
      body: { phone },
      auth: false,
    })
  },
  resetPassword(phone: string, code: string, newPassword: string) {
    return request<{ message: string }>('/auth/password/reset', {
      method: 'POST',
      body: { phone, code, new_password: newPassword },
      auth: false,
    })
  },
  registerDevice(body: { token: string; platform: 'android' | 'ios' | 'web'; app_version?: string }) {
    return request<DeviceResponse>('/auth/devices', { method: 'POST', body })
  },
}

export const groupsApi = {
  list(params: { page?: number; per_page?: number } = {}) {
    return request<Page<Group>>('/groups', { query: params })
  },
  get(groupId: string) {
    return request<Group>(`/groups/${groupId}`)
  },
  create(body: CreateGroupBody) {
    return request<Group>('/groups', { method: 'POST', body })
  },
  updateRules(groupId: string, body: UpdateRulesBody) {
    return request<Group>(`/groups/${groupId}/rules`, { method: 'PATCH', body })
  },
  members(groupId: string, params: { page?: number; per_page?: number } = {}) {
    return request<Page<Membership>>(`/groups/${groupId}/members`, { query: params })
  },
  inviteMember(
    groupId: string,
    body: { phone: string; role?: 'president' | 'treasurer' | 'member'; suggested_contribution_rwf?: number },
  ) {
    return request<Membership>(`/groups/${groupId}/members`, { method: 'POST', body })
  },
  updateMember(
    groupId: string,
    membershipId: string,
    body: { role?: 'president' | 'treasurer' | 'member'; status?: 'active' | 'suspended'; suggested_contribution_rwf?: number },
  ) {
    return request<Membership>(`/groups/${groupId}/members/${membershipId}`, {
      method: 'PATCH',
      body,
    })
  },
  removeMember(groupId: string, membershipId: string) {
    return request<void>(`/groups/${groupId}/members/${membershipId}`, { method: 'DELETE' })
  },
  distributions(groupId: string, params: { page?: number; per_page?: number } = {}) {
    return request<Page<PotDistribution>>(`/groups/${groupId}/distributions`, { query: params })
  },
  distribute(
    groupId: string,
    body: { period: string; total_amount_rwf: number; equal_shares?: boolean; notes?: string | null },
  ) {
    return request<PotDistribution>(`/groups/${groupId}/distributions`, { method: 'POST', body })
  },
}

export const contributionsApi = {
  list(params: {
    group_id?: string
    membership_id?: string
    period?: string
    page?: number
    per_page?: number
  }) {
    return request<Page<Contribution>>('/contributions', { query: params })
  },
  record(body: RecordContributionBody) {
    return request<Contribution>('/contributions', { method: 'POST', body })
  },
  penalty(body: RecordPenaltyBody) {
    return request<Contribution>('/contributions/penalties', { method: 'POST', body })
  },
  reverse(body: { contribution_id: string; reason: string; idempotency_key?: string }) {
    return request<Contribution>('/contributions/reverse', { method: 'POST', body })
  },
  raiseDispute(body: { contribution_id: string; reason: string }) {
    return request<ContributionDispute>('/contributions/disputes', { method: 'POST', body })
  },
  resolveDispute(disputeId: string, body: { status: 'upheld' | 'rejected'; resolution_note?: string }) {
    return request<ContributionDispute>(`/contributions/disputes/${disputeId}`, {
      method: 'PATCH',
      body,
    })
  },
}

export const loansApi = {
  list(groupId: string, params: { status?: string; page?: number; per_page?: number } = {}) {
    return request<Page<Loan>>(`/groups/${groupId}/loans`, { query: params })
  },
  request(
    groupId: string,
    body: { principal_rwf: number; term_months: number; purpose?: string | null },
  ) {
    return request<Loan>(`/groups/${groupId}/loans`, { method: 'POST', body })
  },
  approve(groupId: string, loanId: string, decisionReason?: string) {
    return request<Loan>(`/groups/${groupId}/loans/${loanId}/approve`, {
      method: 'POST',
      body: { decision_reason: decisionReason ?? null },
    })
  },
  reject(groupId: string, loanId: string, decisionReason: string) {
    return request<Loan>(`/groups/${groupId}/loans/${loanId}/reject`, {
      method: 'POST',
      body: { decision_reason: decisionReason },
    })
  },
  schedule(groupId: string, loanId: string) {
    return request<LoanScheduleItem[]>(`/groups/${groupId}/loans/${loanId}/schedule`)
  },
  repay(groupId: string, loanId: string, body: RepaymentBody) {
    return request<Repayment>(`/groups/${groupId}/loans/${loanId}/repayments`, {
      method: 'POST',
      body,
    })
  },
}

export const reportsApi = {
  summary(groupId: string) {
    return request<GroupSummary>(`/reports/groups/${groupId}/summary`)
  },
  statement(groupId: string, membershipId: string) {
    return request<MemberStatement>(
      `/reports/groups/${groupId}/members/${membershipId}/statement`,
    )
  },
  lateMembers(groupId: string, period: string) {
    return request<LateMembersResponse>(`/reports/groups/${groupId}/late-members`, {
      query: { period },
    })
  },
}

export const paymentsApi = {
  requestToPay(body: {
    membership_id: string
    amount_rwf: number
    payer_phone: string
    payer_message?: string
    payee_note?: string
    idempotency_key?: string
  }) {
    return request<PaymentInitiation>('/payments/mtn/request-to-pay', { method: 'POST', body })
  },
  transfer(body: {
    membership_id: string
    amount_rwf: number
    payee_phone: string
    payer_message?: string
    payee_note?: string
    idempotency_key?: string
  }) {
    return request<PaymentInitiation>('/payments/mtn/transfer', { method: 'POST', body })
  },
  status(referenceId: string, channel: 'collection' | 'disbursement' | 'airtel' = 'collection') {
    return request<PaymentStatusResponse>(`/payments/mtn/status/${referenceId}`, {
      query: { channel },
    })
  },
}

export { API_BASE_URL as apiBaseUrl }
