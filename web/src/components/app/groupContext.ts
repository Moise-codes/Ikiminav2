import { useOutletContext } from 'react-router-dom'
import type { Group, Membership, Role } from '@/lib/types'

export interface GroupContextValue {
  group: Group
  groupId: string
  role: Role | null
  isMember: boolean
  canRecord: boolean
  canDecideLoans: boolean
  canManageGroup: boolean
  members: Membership[]
  membership: Membership | null
  meId?: string
}

export function useGroupContext(): GroupContextValue {
  return useOutletContext<GroupContextValue>()
}
