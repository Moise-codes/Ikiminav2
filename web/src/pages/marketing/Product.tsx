import { Section } from '@/components/blueprint/Blueprint'
import { BlurReveal } from '@/components/ui/blur-reveal'
import {
  CloseCta,
  IntegrationsSection,
  LogoStrip,
  ProductSection,
  RulebookSection,
} from '@/components/marketing/sections'

export default function Product() {
  return (
    <>
      <Section>
        <div className="max-w-[58ch] section-y">
          <h1 className="t-h1 mt-5 text-balance">
            <BlurReveal text="The four records a savings group cannot afford to lose" />
          </h1>
          <p className="mt-6 text-[16px] leading-[1.65] text-muted">
            Itsinda is not a wallet and it is not a bank. It is the book — the one that says who
            paid, who borrowed, who is late, and what the pot holds after all of it.
          </p>
        </div>
      </Section>
      <LogoStrip />
      <ProductSection />
      <RulebookSection />
      <IntegrationsSection />
      <CloseCta />
    </>
  )
}
