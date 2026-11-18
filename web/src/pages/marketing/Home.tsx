import {
  CloseCta,
  FaqSection,
  Hero,
  IntegrationsSection,
  LogoStrip,
  PricingSection,
  ProductSection,
  RulebookSection,
  StatsBand,
  UseCases,
} from '@/components/marketing/sections'

export default function Home() {
  return (
    <>
      <Hero />
      <LogoStrip />
      <ProductSection />
      <RulebookSection />
      <UseCases />
      <StatsBand />
      <IntegrationsSection />
      <PricingSection />
      <FaqSection />
      <CloseCta />
    </>
  )
}
