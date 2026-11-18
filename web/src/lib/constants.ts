import type {
  ContributionType,
  DisputeStatus,
  Frequency,
  GroupStatus,
  LoanStatus,
  MembershipStatus,
  PaymentMethod,
  Role,
} from './types'

export const ROLE_HELP: Record<Role, string> = {
  president: 'Decides loans, rules and membership. Chairs the group.',
  treasurer: 'Records money in and out. Approves loans with the president.',
  member: 'Contributes, requests loans and sees their own statement.',
}

export const MEMBERSHIP_STATUS_LABEL: Record<MembershipStatus, string> = {
  invited: 'Invited',
  active: 'Active',
  suspended: 'Suspended',
  left: 'Left',
}

export const GROUP_STATUS_LABEL: Record<GroupStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  closed: 'Closed',
}

export const CONTRIBUTION_TYPE_LABEL: Record<ContributionType, string> = {
  payment: 'Contribution',
  penalty: 'Late fine',
  reversal: 'Reversal',
}

export const DISPUTE_STATUS_LABEL: Record<DisputeStatus, string> = {
  open: 'Open',
  upheld: 'Upheld',
  rejected: 'Rejected',
}

export const LOAN_STATUSES: LoanStatus[] = [
  'requested',
  'approved',
  'disbursed',
  'overdue',
  'repaid',
  'rejected',
  'written_off',
]

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'mtn_momo', label: 'MTN MoMo' },
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'bank', label: 'Bank transfer' },
]

export const FREQUENCIES: { value: Frequency; label: string; hint: string }[] = [
  { value: 'weekly', label: 'Weekly', hint: 'Members contribute once a week.' },
  { value: 'biweekly', label: 'Every two months', hint: 'Members contribute every two months.' },
  { value: 'monthly', label: 'Monthly', hint: 'Members contribute once a month.' },
]

/** The 30 districts of Rwanda, grouped the way people actually say them. */
export const RWANDA_PROVINCES: { province: string; districts: string[] }[] = [
  { province: 'Kigali', districts: ['Gasabo', 'Kicukiro', 'Nyarugenge'] },
  {
    province: 'Northern',
    districts: ['Burera', 'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo'],
  },
  {
    province: 'Southern',
    districts: [
      'Gisagara',
      'Huye',
      'Kamonyi',
      'Muhanga',
      'Nyamagabe',
      'Nyanza',
      'Nyaruguru',
      'Ruhango',
    ],
  },
  {
    province: 'Eastern',
    districts: [
      'Bugesera',
      'Gatsibo',
      'Kayonza',
      'Kirehe',
      'Ngoma',
      'Nyagatare',
      'Rwamagana',
    ],
  },
  {
    province: 'Western',
    districts: [
      'Karongi',
      'Ngororero',
      'Nyabihu',
      'Nyamasheke',
      'Rubavu',
      'Rusizi',
      'Rutsiro',
    ],
  },
]

export const ALL_DISTRICTS = RWANDA_PROVINCES.flatMap((entry) => entry.districts)

export const MARKETING_NAV = [
  { label: 'Product', to: '/product' },
  { label: 'How it works', to: '/how-it-works' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Guides', to: '/guides' },
  { label: 'Contact', to: '/contact' },
]

export const APP_NAV = [
  { label: 'Overview', to: '/app', icon: 'overview' },
  { label: 'Groups', to: '/app/groups', icon: 'groups' },
  { label: 'Loans', to: '/app/loans', icon: 'loans' },
  { label: 'Members', to: '/app/members', icon: 'members' },
  { label: 'Reports', to: '/app/reports', icon: 'reports' },
] as const

/** Legacy-era language names, as the API stores them. */
export const LANGUAGES: { value: 'rw' | 'en' | 'fr'; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'rw', label: 'Kinyarwanda' },
  { value: 'fr', label: 'French' },
]
