import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'

/**
 * Routers are mounted without the `/api/v1` prefix on the API. On an Android
 * emulator `localhost` is the device itself — use 10.0.2.2 there, or set
 * EXPO_PUBLIC_API_URL to your machine's LAN address for a physical handset.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  'http://localhost:8000'

const ACCESS_KEY = 'itsinda_access_token'
const REFRESH_KEY = 'itsinda_refresh_token'

let accessToken: string | null = null
let refreshToken: string | null = null

export const tokenStore = {
  get access() {
    return accessToken
  },
  async hydrate() {
    accessToken = await SecureStore.getItemAsync(ACCESS_KEY)
    refreshToken = await SecureStore.getItemAsync(REFRESH_KEY)
  },
  async set(pair: { access_token: string; refresh_token: string }) {
    accessToken = pair.access_token
    refreshToken = pair.refresh_token
    await SecureStore.setItemAsync(ACCESS_KEY, pair.access_token)
    await SecureStore.setItemAsync(REFRESH_KEY, pair.refresh_token)
  },
  async clear() {
    accessToken = null
    refreshToken = null
    await SecureStore.deleteItemAsync(ACCESS_KEY)
    await SecureStore.deleteItemAsync(REFRESH_KEY)
  },
}

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | undefined>
  auth?: boolean
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const params = new URLSearchParams()
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value))
    })
  }
  const suffix = params.toString()
  return `${API_BASE_URL}${path}${suffix ? `?${suffix}` : ''}`
}

let refreshInFlight: Promise<boolean> | null = null

async function rotate(): Promise<boolean> {
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
        await tokenStore.clear()
        return false
      }
      await tokenStore.set(await response.json())
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

async function send(path: string, options: RequestOptions) {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.auth !== false && accessToken) headers.Authorization = `Bearer ${accessToken}`
  return fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(path, options)
  if (response.status === 401 && options.auth !== false && !path.startsWith('/auth/refresh')) {
    if (await rotate()) response = await send(path, options)
  }
  if (response.status === 204) return undefined as T
  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  if (!response.ok) {
    const error = payload?.error
    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN',
      error?.message ?? 'Request failed. Check your connection.',
    )
  }
  if (payload && typeof payload === 'object' && 'data' in payload) return payload.data as T
  return payload as T
}

export const api = {
  login: (phone: string, password: string) =>
    request<{ user: User; tokens: { access_token: string; refresh_token: string }; message: string }>(
      '/auth/login',
      { method: 'POST', body: { phone, password }, auth: false },
    ),
  register: (body: { full_name: string; phone: string; password: string; preferred_language: string }) =>
    request<{ message: string }>('/auth/register', {
      method: 'POST',
      body,
      auth: false,
    }),
  verifyPhone: (phone: string, code: string) =>
    request<{ user: User; tokens: { access_token: string; refresh_token: string } }>(
      '/auth/verify-phone',
      { method: 'POST', body: { phone, code }, auth: false },
    ),
  resendOtp: (phone: string) =>
    request<{ message: string }>('/auth/resend-otp', {
      method: 'POST',
      body: { phone, purpose: 'verify_phone' },
      auth: false,
    }),
  me: () => request<User>('/auth/me'),
  updateMe: (body: { full_name?: string; preferred_language?: string }) =>
    request<User>('/auth/me', { method: 'PATCH', body }),
  logout: () =>
    request<{ revoked_sessions: unknown }>('/auth/logout', { method: 'POST', body: {} }),
  groups: () => request<Page<Group>>('/groups', { query: { per_page: 50 } }),
  group: (id: string) => request<Group>(`/groups/${id}`),
  members: (id: string) => request<Page<Membership>>(`/groups/${id}/members`, { query: { per_page: 100 } }),
  summary: (id: string) => request<GroupSummary>(`/reports/groups/${id}/summary`),
  contributions: (groupId: string) =>
    request<Page<Contribution>>('/contributions', { query: { group_id: groupId, per_page: 30 } }),
  loans: (groupId: string) =>
    request<Page<Loan>>(`/groups/${groupId}/loans`, { query: { per_page: 50 } }),
  schedule: (groupId: string, loanId: string) =>
    request<ScheduleItem[]>(`/groups/${groupId}/loans/${loanId}/schedule`),
  requestLoan: (groupId: string, body: { principal_rwf: number; term_months: number; purpose?: string }) =>
    request<Loan>(`/groups/${groupId}/loans`, { method: 'POST', body }),
  statement: (groupId: string, membershipId: string) =>
    request<Statement>(`/reports/groups/${groupId}/members/${membershipId}/statement`),
  lateMembers: (groupId: string, period: string) =>
    request<{ late_count: number; late_members: { membership_id: string; expected_rwf: number }[] }>(
      `/reports/groups/${groupId}/late-members`,
      { query: { period } },
    ),
}

/* --------------------------------------------------------------- wire types */

export interface User {
  id: string
  full_name: string
  phone: string | null
  phone_operator: string | null
  email: string | null
  preferred_language: string
  status: string
  created_at: string
}

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

export interface Group {
  id: string
  name: string
  description: string | null
  district: string | null
  sector: string | null
  default_contribution_rwf: number
  frequency: string
  contribution_day: number
  loan_interest_pct: number
  loan_interest_bp: number
  max_loan_multiple: number | null
  status: string
  rules_version: number
}

export interface Membership {
  id: string
  group_id: string
  user_id: string | null
  invited_phone: string | null
  role: string
  status: string
  suggested_contribution_rwf: number | null
  joined_at: string | null
}

export interface GroupSummary {
  group_id: string
  total_contributed_rwf: number
  total_penalties_rwf: number
  total_loaned_rwf: number
  total_repaid_rwf: number
  interest_earned_rwf: number
  available_pot_rwf: number
}

export interface Contribution {
  id: string
  membership_id: string
  period: string
  type: string
  amount_rwf: number
  paid_at: string
  method: string
  reference: string | null
}

export interface Loan {
  id: string
  membership_id: string
  principal_rwf: number
  term_months: number
  status: string
  total_due_rwf: number | null
  outstanding_rwf: number | null
  purpose: string | null
  requested_at: string
}

export interface ScheduleItem {
  id: string
  installment_no: number
  due_date: string
  principal_rwf: number
  interest_rwf: number
  total_rwf: number
  paid_rwf: number
}

export interface Statement {
  membership_id: string
  total_contributed_rwf: number
  total_penalties_rwf: number
  total_borrowed_rwf: number
  total_repaid_rwf: number
  outstanding_rwf: number
}
