/**
 * Partner marks for the logo strip.
 *
 * These are simplified stand-ins drawn in each brand's own colour and typeface
 * so the wall reads correctly at a glance. Replace with the official SVG files
 * from each partner's brand kit before launch — the layout accepts any logo
 * occupying a 140×32 viewBox.
 */

const FONT = 'Inter Tight Variable, Inter Tight, sans-serif'

export function MtnLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 32" className={className} role="img" aria-label="MTN Mobile Money">
      <rect x="0" y="3" width="56" height="26" rx="4" fill="#FFCB05" />
      <text
        x="28"
        y="21.5"
        textAnchor="middle"
        fontFamily={FONT}
        fontSize="15"
        fontWeight="700"
        letterSpacing="-0.02em"
        fill="#111111"
      >
        MTN
      </text>
      <text
        x="64"
        y="21.5"
        fontFamily={FONT}
        fontSize="14"
        fontWeight="500"
        letterSpacing="-0.02em"
        fill="#111111"
      >
        MoMo
      </text>
    </svg>
  )
}

export function AirtelLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 32" className={className} role="img" aria-label="Airtel Money">
      <text
        x="0"
        y="23"
        fontFamily={FONT}
        fontSize="22"
        fontWeight="600"
        letterSpacing="-0.035em"
        fill="#E40000"
      >
        airtel
      </text>
      <text
        x="62"
        y="23"
        fontFamily={FONT}
        fontSize="16"
        fontWeight="400"
        letterSpacing="-0.02em"
        fill="#E40000"
      >
        money
      </text>
    </svg>
  )
}

export function AfricasTalkingLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 32" className={className} role="img" aria-label="Africa's Talking">
      <rect x="0" y="5" width="22" height="22" rx="5" fill="#0B7B5B" />
      <rect x="5" y="16" width="3" height="7" rx="1.5" fill="#ffffff" />
      <rect x="10" y="12" width="3" height="11" rx="1.5" fill="#ffffff" />
      <rect x="15" y="9" width="3" height="14" rx="1.5" fill="#ffffff" />
      <text
        x="29"
        y="16"
        fontFamily={FONT}
        fontSize="11.5"
        fontWeight="500"
        letterSpacing="-0.01em"
        fill="#111111"
      >
        Africa’s
      </text>
      <text
        x="29"
        y="26"
        fontFamily={FONT}
        fontSize="11.5"
        fontWeight="500"
        letterSpacing="-0.01em"
        fill="#111111"
      >
        Talking
      </text>
    </svg>
  )
}

export function FirebaseLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 32" className={className} role="img" aria-label="Firebase">
      <path d="M9 27l3.4-21.5 4.6 8.6z" fill="#FFA000" />
      <path d="M9 27l11.8-9.4 3.3 5.1z" fill="#FFCA28" />
      <path d="M9 27l2.5-16 9.3 6.6z" fill="#F57C00" />
      <text
        x="28"
        y="21.5"
        fontFamily={FONT}
        fontSize="14.5"
        fontWeight="500"
        letterSpacing="-0.02em"
        fill="#111111"
      >
        Firebase
      </text>
    </svg>
  )
}

export function ResendLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 32" className={className} role="img" aria-label="Resend">
      <rect x="0" y="5" width="22" height="22" rx="6" fill="#111111" />
      <path d="M6 20V12h6a3 3 0 0 1 0 6H6" stroke="#ffffff" strokeWidth="2" fill="none" />
      <path d="M11 18l4 4" stroke="#ffffff" strokeWidth="2" />
      <text
        x="30"
        y="21.5"
        fontFamily={FONT}
        fontSize="14.5"
        fontWeight="500"
        letterSpacing="-0.02em"
        fill="#111111"
      >
        Resend
      </text>
    </svg>
  )
}

export function BankLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 32" className={className} role="img" aria-label="Bank of Kigali">
      <rect x="0" y="5" width="22" height="22" rx="4" fill="#0A5C36" />
      <path
        d="M4 12h14M4 16h9M4 20h12"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <text
        x="30"
        y="16"
        fontFamily={FONT}
        fontSize="11.5"
        fontWeight="500"
        letterSpacing="-0.01em"
        fill="#111111"
      >
        Bank of
      </text>
      <text
        x="30"
        y="26"
        fontFamily={FONT}
        fontSize="11.5"
        fontWeight="500"
        letterSpacing="-0.01em"
        fill="#111111"
      >
        Kigali
      </text>
    </svg>
  )
}

export const PARTNER_LOGOS = [
  { name: 'MTN Mobile Money', Logo: MtnLogo },
  { name: 'Airtel Money', Logo: AirtelLogo },
  { name: 'Africa’s Talking SMS', Logo: AfricasTalkingLogo },
  { name: 'Firebase push', Logo: FirebaseLogo },
  { name: 'Resend email', Logo: ResendLogo },
  { name: 'Bank of Kigali', Logo: BankLogo },
]
