import { useMemo } from 'react'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import {
  contributionsApi,
  groupsApi,
  loansApi,
  paymentsApi,
  reportsApi,
  type CreateGroupBody,
  type RecordContributionBody,
  type RecordPenaltyBody,
  type RepaymentBody,
  type UpdateRulesBody,
} from './api'
import type { Membership, Role } from './types'

/** Invalidate every query whose key starts with one of the given roots. */
function invalidate(client: QueryClient, ...roots: string[]) {
  return Promise.all(
    roots.map((root) => client.invalidateQueries({ predicate: (q) => q.queryKey[0] === root })),
  )
}

export const keys = {
  groups: ['groups'] as const,
  group: (id: string) => ['group', id] as const,
  members: (id: string) => ['members', id] as const,
  contributions: ['contributions'] as const,
  loans: (id: string) => ['loans', id] as const,
  schedule: (groupId: string, loanId: string) => ['schedule', groupId, loanId] as const,
  summary: (id: string) => ['summary', id] as const,
  statement: (groupId: string, membershipId: string) => ['statement', groupId, membershipId] as const,
  late: (id: string, period: string) => ['late', id, period] as const,
  distributions: (id: string) => ['distributions', id] as const,
  sessions: ['sessions'] as const,
}

/* ----------------------------------------------------------------- groups */

export function useGroups(page = 1, perPage = 50) {
  return useQuery({
    queryKey: [...keys.groups, page, perPage],
    queryFn: () => groupsApi.list({ page, per_page: perPage }),
    placeholderData: keepPreviousData,
  })
}

export function useGroup(groupId: string | undefined) {
  return useQuery({
    queryKey: groupId ? keys.group(groupId) : ['group', 'none'],
    queryFn: () => groupsApi.get(groupId as string),
    enabled: Boolean(groupId),
  })
}

export function useMembers(groupId: string | undefined, page = 1, perPage = 100) {
  return useQuery({
    queryKey: groupId ? [...keys.members(groupId), page, perPage] : ['members', 'none'],
    queryFn: () => groupsApi.members(groupId as string, { page, per_page: perPage }),
    enabled: Boolean(groupId),
    placeholderData: keepPreviousData,
  })
}

/** The signed-in user's own membership in a group — drives every permission check. */
export function useMyMembership(groupId: string | undefined, userId: string | undefined) {
  const membersQuery = useMembers(groupId)
  const membership: Membership | null = useMemo(() => {
    if (!membersQuery.data || !userId) return null
    return membersQuery.data.items.find((item) => item.user_id === userId) ?? null
  }, [membersQuery.data, userId])

  const role: Role | null = membership && membership.status === 'active' ? membership.role : null

  return {
    membership,
    role,
    isMember: Boolean(membership && membership.status === 'active'),
    canRecord: role === 'president' || role === 'treasurer',
    canDecideLoans: role === 'president' || role === 'treasurer',
    canManageGroup: role === 'president',
    isLoading: membersQuery.isLoading,
  }
}

/* ----------------------------------------------------------------- ledger */

export function useContributions(params: {
  groupId?: string
  membershipId?: string
  period?: string
  page?: number
  perPage?: number
}) {
  const { groupId, membershipId, period, page = 1, perPage = 25 } = params
  return useQuery({
    queryKey: [
      'contributions',
      groupId ?? null,
      membershipId ?? null,
      period ?? null,
      page,
      perPage,
    ],
    queryFn: () =>
      contributionsApi.list({
        group_id: groupId,
        membership_id: membershipId,
        period,
        page,
        per_page: perPage,
      }),
    enabled: Boolean(groupId || membershipId),
    placeholderData: keepPreviousData,
  })
}

export function useSummary(groupId: string | undefined) {
  return useQuery({
    queryKey: groupId ? keys.summary(groupId) : ['summary', 'none'],
    queryFn: () => reportsApi.summary(groupId as string),
    enabled: Boolean(groupId),
  })
}

export function useStatement(groupId: string | undefined, membershipId: string | undefined) {
  return useQuery({
    queryKey:
      groupId && membershipId ? keys.statement(groupId, membershipId) : ['statement', 'none'],
    queryFn: () => reportsApi.statement(groupId as string, membershipId as string),
    enabled: Boolean(groupId && membershipId),
  })
}

export function useLateMembers(groupId: string | undefined, period: string) {
  return useQuery({
    queryKey: groupId ? keys.late(groupId, period) : ['late', 'none', period],
    queryFn: () => reportsApi.lateMembers(groupId as string, period),
    enabled: Boolean(groupId && period),
  })
}

export function useDistributions(groupId: string | undefined) {
  return useQuery({
    queryKey: groupId ? keys.distributions(groupId) : ['distributions', 'none'],
    queryFn: () => groupsApi.distributions(groupId as string, { per_page: 50 }),
    enabled: Boolean(groupId),
  })
}

/* ------------------------------------------------------------------ loans */

export function useLoans(groupId: string | undefined, status?: string) {
  return useQuery({
    queryKey: groupId ? [...keys.loans(groupId), status ?? 'all'] : ['loans', 'none'],
    queryFn: () => loansApi.list(groupId as string, { status, per_page: 100 }),
    enabled: Boolean(groupId),
    placeholderData: keepPreviousData,
  })
}

export function useLoanSchedule(groupId: string | undefined, loanId: string | undefined) {
  return useQuery({
    queryKey: groupId && loanId ? keys.schedule(groupId, loanId) : ['schedule', 'none'],
    queryFn: () => loansApi.schedule(groupId as string, loanId as string),
    enabled: Boolean(groupId && loanId),
  })
}

/* -------------------------------------------------------------- mutations */

export function useRecordContributionMutation(groupId?: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: RecordContributionBody) => contributionsApi.record(body),
    onSuccess: async () => {
      await invalidate(client, 'contributions', 'summary', 'late', 'statement')
      if (groupId) await client.invalidateQueries({ queryKey: keys.group(groupId) })
    },
  })
}

export function useRecordPenaltyMutation(groupId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: RecordPenaltyBody) => contributionsApi.penalty(body),
    onSuccess: async () => {
      await invalidate(client, 'contributions', 'summary', 'late', 'statement')
      void groupId
    },
  })
}

export function useReverseContributionMutation(groupId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { contribution_id: string; reason: string }) =>
      contributionsApi.reverse(body),
    onSuccess: async () => {
      await invalidate(client, 'contributions', 'summary', 'statement')
      void groupId
    },
  })
}

export function useRaiseDisputeMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { contribution_id: string; reason: string }) =>
      contributionsApi.raiseDispute(body),
    onSuccess: () => invalidate(client, 'contributions'),
  })
}

export function useRequestLoanMutation(groupId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { principal_rwf: number; term_months: number; purpose?: string | null }) =>
      loansApi.request(groupId, body),
    onSuccess: () => invalidate(client, 'loans', 'summary'),
  })
}

export function useDecideLoanMutation(groupId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      loanId,
      action,
      reason,
    }: {
      loanId: string
      action: 'approve' | 'reject'
      reason?: string
    }) =>
      action === 'approve'
        ? loansApi.approve(groupId, loanId, reason)
        : loansApi.reject(groupId, loanId, reason ?? ''),
    onSuccess: async (_data, variables) => {
      await invalidate(client, 'loans', 'summary')
      await client.invalidateQueries({ queryKey: keys.schedule(groupId, variables.loanId) })
    },
  })
}

export function useRepaymentMutation(groupId: string, loanId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: RepaymentBody) => loansApi.repay(groupId, loanId, body),
    onSuccess: async () => {
      await invalidate(client, 'loans', 'summary', 'contributions')
      await client.invalidateQueries({ queryKey: keys.schedule(groupId, loanId) })
    },
  })
}

export function useCreateGroupMutation() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateGroupBody) => groupsApi.create(body),
    onSuccess: () => invalidate(client, 'groups'),
  })
}

export function useUpdateRulesMutation(groupId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateRulesBody) => groupsApi.updateRules(groupId, body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: keys.group(groupId) })
      await invalidate(client, 'groups')
    },
  })
}

export function useInviteMemberMutation(groupId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      phone: string
      role?: Role
      suggested_contribution_rwf?: number
    }) => groupsApi.inviteMember(groupId, body),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.members(groupId) }),
  })
}

export function useUpdateMemberMutation(groupId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      membershipId,
      ...body
    }: {
      membershipId: string
      role?: Role
      status?: 'active' | 'suspended'
      suggested_contribution_rwf?: number
    }) => groupsApi.updateMember(groupId, membershipId, body),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.members(groupId) }),
  })
}

export function useRemoveMemberMutation(groupId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (membershipId: string) => groupsApi.removeMember(groupId, membershipId),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.members(groupId) }),
  })
}

export function useDistributePotMutation(groupId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      period: string
      total_amount_rwf: number
      equal_shares?: boolean
      notes?: string | null
    }) => groupsApi.distribute(groupId, body),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: keys.distributions(groupId) })
      await invalidate(client, 'summary')
    },
  })
}

export function useRequestToPayMutation() {
  return useMutation({
    mutationFn: (body: Parameters<typeof paymentsApi.requestToPay>[0]) =>
      paymentsApi.requestToPay(body),
  })
}

export function useTransferMutation() {
  return useMutation({
    mutationFn: (body: Parameters<typeof paymentsApi.transfer>[0]) =>
      paymentsApi.transfer(body),
  })
}
