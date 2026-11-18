/**
 * Itsinda mobile design tokens — aligned with web brand.
 */
export const colors = {
  paper: '#fafaf8',
  paper2: '#f3f2ed',
  surface: '#ffffff',
  ink: '#1a1a1a',
  ink2: '#3f3e39',
  muted: '#747369',
  faint: '#a5a49c',
  rule: '#e7e5de',
  ruleStrong: '#d5d3ca',
  accent: '#17ad17',
  accentWash: '#edf8ed',
  accent2: '#f08519',
  credit: '#1f6f4a',
  creditWash: '#edf3ef',
  warn: '#965900',
  warnWash: '#f8f1e2',
  debit: '#9d2b2b',
  debitWash: '#f8eceb',
  white: '#ffffff',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
} as const

export const font = {
  regular: 'InterTight_400Regular',
  medium: 'InterTight_500Medium',
  semibold: 'InterTight_600SemiBold',
} as const

export const type = {
  display: { fontSize: 32, letterSpacing: -1.1, lineHeight: 36 },
  h1: { fontSize: 26, letterSpacing: -0.8, lineHeight: 31 },
  h2: { fontSize: 19, letterSpacing: -0.4, lineHeight: 24 },
  body: { fontSize: 14, lineHeight: 21 },
  small: { fontSize: 12.5, lineHeight: 18 },
  micro: { fontSize: 10.5, letterSpacing: 0.8, lineHeight: 14 },
} as const
