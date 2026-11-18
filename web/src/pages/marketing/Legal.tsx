import { Section } from '@/components/blueprint/Blueprint'

type LegalKind = 'privacy' | 'terms'

const PRIVACY = {
  eyebrow: 'Privacy notice',
  title: 'What we hold, and why',
  intro:
    'Itsinda collects the minimum needed to keep a savings group’s ledger. This notice describes what the platform stores today, in the terms used by Law N° 058/2021 on personal data protection in Rwanda.',
  sections: [
    {
      heading: 'What we collect',
      paragraphs: [
        'A phone number is the identity on Itsinda. We also store your name, an optional email address if you add one for recovery, and the language you prefer.',
        'We store the group data you and your leaders create: contributions, fines, loans, repayments, distributions and the membership roles inside each group.',
      ],
    },
    {
      heading: 'How it is protected',
      paragraphs: [
        'Passwords are stored as Argon2id hashes and are never readable by us. One-time codes are stored as keyed hashes rather than plain text, and expire within minutes.',
        'Session tokens rotate. Changing a password or signing out of all devices revokes existing sessions immediately. Phone numbers are masked in application logs.',
      ],
    },
    {
      heading: 'Who can see your ledger',
      paragraphs: [
        'Members of a group can see that group’s records. Presidents and treasurers can add to them. Nobody outside the group can read it, and a suspended or removed membership loses access.',
        'Every change to money or roles is written to an audit record with who did it and when.',
      ],
    },
    {
      heading: 'Keeping and correcting records',
      paragraphs: [
        'Financial entries are append-only by design: a contribution is never silently altered or deleted, because the ledger is the group’s evidence of what happened.',
        'If you ask us to delete your account, personal details are anonymised. Financial rows remain so that the group’s totals still reconcile — they simply stop pointing at a named person.',
      ],
    },
    {
      heading: 'Your rights',
      paragraphs: [
        'You may ask what we hold about you, ask for a correction, withdraw consent for optional channels such as email, or ask for anonymisation of your account.',
        'Write to hello@itsinda.rw and we will respond within 30 days.',
      ],
    },
  ],
}

const TERMS = {
  eyebrow: 'Terms of use',
  title: 'The rules of the platform',
  intro:
    'Itsinda is a record-keeping platform for savings groups. It is not a bank, a deposit taker, a lender, or a custodian of your money.',
  sections: [
    {
      heading: 'What Itsinda is',
      paragraphs: [
        'Itsinda provides software that records a group’s contributions, fines, loans and distributions, and produces statements from those records.',
        'Money moves between members and their own mobile money or bank accounts. Itsinda does not pool funds, does not earn interest on them, and does not guarantee a member’s contribution or repayment.',
      ],
    },
    {
      heading: 'Your responsibilities',
      paragraphs: [
        'The group is responsible for the rules it sets and for the accuracy of what its leaders record. Record a payment only when the money has actually arrived.',
        'Keep your phone and password secure. Actions taken with your session are treated as yours — sign out of all devices if you think a session is compromised.',
      ],
    },
    {
      heading: 'Records and corrections',
      paragraphs: [
        'Entries cannot be edited or deleted. A mistake is corrected by recording a reversal with a reason, which leaves both rows visible to the group.',
        'This is deliberate: the value of the ledger is that its history cannot be quietly rewritten.',
      ],
    },
    {
      heading: 'Availability and change',
      paragraphs: [
        'We aim to keep the service available, but we do not promise uninterrupted access. Mobile money collection and payout depend on the network operator and can fail on their side.',
        'We may change these terms; material changes will be announced in the product before they take effect.',
      ],
    },
  ],
}

export default function Legal({ kind }: { kind: LegalKind }) {
  const content = kind === 'privacy' ? PRIVACY : TERMS

  return (
    <>
      <Section>
        <div className="max-w-[58ch] section-y">
          <p className="t-eyebrow">{content.eyebrow}</p>
          <h1 className="t-h1 mt-5 text-balance">{content.title}</h1>
          <p className="mt-6 text-[16px] leading-[1.65] text-muted">{content.intro}</p>
          <p className="mt-4 text-[11px] text-faint">Last reviewed November 2026.</p>
        </div>
      </Section>

      <Section tone="surface">
        <div className="max-w-[66ch] section-y">
          {content.sections.map((section) => (
            <section key={section.heading} className="border-t border-rule py-7 first:border-0 first:pt-0">
              <h2 className="text-[17px] font-medium tracking-[-0.015em] text-ink">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-[13px] leading-[1.75] text-muted">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </Section>
    </>
  )
}
