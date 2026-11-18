import { Section } from '@/components/blueprint/Blueprint'
import { BlurReveal } from '@/components/ui/blur-reveal'
import { CloseCta, FaqSection, PricingSection } from '@/components/marketing/sections'

export default function Pricing() {
  return (
    <>
      <Section>
        <div className="max-w-[58ch] section-y">
          <h1 className="t-h1 mt-5 text-balance"><BlurReveal text="Nothing to pay, for any group" /></h1>
          <p className="mt-6 text-[16px] leading-[1.65] text-muted">
            Itsinda is free to use. No per-member charge, no trial clock and no card required — every
            plan is listed at zero Rwandan francs. Operator fees for moving money are set by MTN and
            Airtel.
          </p>
        </div>
      </Section>
      <PricingSection withHeading={false} />
      <FaqSection />
      <CloseCta />
    </>
  )
}
