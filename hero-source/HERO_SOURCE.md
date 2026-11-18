# Itsinda Hero Section — Full Source Code

This document contains all source code for the Itsinda web frontend hero section,
including the 3D animations, blur-reveal text, org-logo flow, and isometric scenes.
Share this with Claude (or any AI) along with your logo and org assets to
regenerate a polished, production-ready hero.

---

## 1. Hero Section (`web/src/components/marketing/sections.tsx` — Hero function)

```tsx
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Check, ChevronRight, Play } from 'lucide-react'
import { Section, SplitHeading } from '@/components/blueprint/Blueprint'
import { buttonClass } from '@/components/ui/Button'
import { Accordion, AccordionItem } from '@/components/ui/nav'
import {
  SceneContributions,
  SceneCubeNetwork,
  SceneDistribution,
  SceneFines,
  SceneHeroFloat,
  SceneLoans,
  SceneStatement,
  SceneWindowStack,
} from '@/components/art/Scenes'
import { PARTNER_LOGOS } from './BrandLogos'
import { cn } from '@/lib/cn'
import { Reveal } from '@/components/ui/reveal'
import { CountUp } from '@/components/ui/count-up'
import { BlurReveal } from '@/components/ui/blur-reveal'
import { HeroFlow } from '@/components/art/HeroFlow'

export function Hero() {
  return (
    <Section className="overflow-hidden" innerClassName="!px-0" crosshairs>
      <div className="px-6 pt-24 pb-10 text-center sm:px-8 lg:px-12 lg:pt-32">
        <Reveal>
          <p className="t-eyebrow">The ledger for ibimina</p>
          <h1 className="t-display mx-auto mt-6 max-w-[18ch] text-balance">
            <BlurReveal text="Every franc your group saves, on the record" />
          </h1>
          <p className="mx-auto mt-6 max-w-[58ch] text-[17px] leading-[1.6] text-muted text-pretty">
            <BlurReveal text="Record contributions, approve loans with a repayment schedule, charge late fines and hand every member a statement. Phone-first, in RWF, with MTN MoMo and Airtel Money." delay={0.4} step={0.03} />
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3" style={{ animation: 'km-rise 0.8s cubic-bezier(0.22,1,0.36,1) 0.9s both' }}>
            <Link to="/signup" className={buttonClass('ink', 'lg')}>
              Create a group
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <Link to="/how-it-works" className={buttonClass('outline', 'lg')}>
              <Play aria-hidden className="size-3.5" />
              See how it works
            </Link>
          </div>
        </Reveal>
      </div>

      <div className="relative mx-auto mt-6 h-[260px] max-w-[1100px] sm:h-[320px] lg:h-[360px]">
        <div aria-hidden className="absolute inset-0 rounded-3xl bg-gradient-to-br from-accent/10 via-transparent to-accent-2/10" />
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-6">
          <SceneHeroFloat className="w-[520px] max-w-full float-y" />
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-[1100px] px-6">
        <Reveal delay={200}>
          <HeroFlow />
        </Reveal>
      </div>
    </Section>
  )
}
```

---

## 2. BlurReveal Component (`web/src/components/ui/blur-reveal.tsx`)

```tsx
import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'

export function BlurReveal({
  text,
  className,
  delay = 0,
  step = 0.06,
}: {
  text: string
  className?: string
  delay?: number
  step?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const words = el.querySelectorAll<HTMLSpanElement>('[data-br-word]')
    words.forEach((w, i) => {
      w.style.opacity = '0.001'
      w.style.filter = 'blur(10px)'
      w.style.transform = 'translateY(10px)'
      w.style.transition = `opacity 0.6s ease ${delay + i * step}s, filter 0.6s ease ${delay + i * step}s, transform 0.6s ease ${delay + i * step}s`
    })
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        words.forEach((w) => {
          w.style.opacity = '1'
          w.style.filter = 'blur(0px)'
          w.style.transform = 'translateY(0px)'
        })
      })
    })
  }, [text, delay, step])

  const words = text.split(' ')
  return (
    <span ref={ref} className={cn('inline', className)}>
      {words.map((w, i) => (
        <span key={i} data-br-word style={{ display: 'inline-block' }}>
          {w}
          {i < words.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </span>
  )
}
```

---

## 3. HeroFlow Component (`web/src/components/art/HeroFlow.tsx`)

```tsx
import { PARTNER_LOGOS } from '@/components/marketing/BrandLogos'
import { Mark } from '@/components/ui/Logo'
import { cn } from '@/lib/cn'

export function HeroFlow({ className }: { className?: string }) {
  const flow = [...PARTNER_LOGOS, ...PARTNER_LOGOS]
  return (
    <div
      className={cn('relative', className)}
      style={{ perspective: '1200px', perspectiveOrigin: '50% 40%' }}
    >
      {/* floor / conveyor base */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: '140%',
          height: '60%',
          transform: 'rotateX(62deg) rotateZ(-8deg) translateZ(-40px)',
          transformStyle: 'preserve-3d',
          background: 'linear-gradient(180deg, #f4f3ef 0%, #eae9e2 100%)',
          borderRadius: '24px',
          boxShadow: '0 40px 80px -20px rgba(0,0,0,0.18)',
        }}
      />
      {/* shading gradient over the floor */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20"
        style={{
          background:
            'linear-gradient(90deg, rgba(250,250,250,0.85) 0%, transparent 15%, transparent 85%, rgba(250,250,250,0.85) 100%)',
        }}
      />
      {/* flowing cards */}
      <div
        className="relative flex items-center gap-5"
        style={{
          transform: 'rotateX(62deg) rotateZ(-8deg) translateZ(0px)',
          transformStyle: 'preserve-3d',
          animation: 'km-marquee 24s linear infinite',
          width: 'max-content',
          paddingTop: '3rem',
          paddingBottom: '3rem',
          marginLeft: '-10%',
        }}
      >
        {[...flow, ...flow].map((partner, index) => (
          <div
            key={`card-${partner.name}-${index}`}
            className="relative shrink-0"
            style={{ transformStyle: 'preserve-3d', width: '150px', height: '100px' }}
          >
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl border border-rule bg-surface shadow-pop"
              style={{ transform: 'translateZ(12px)', backfaceVisibility: 'hidden' }}
            >
              <partner.Logo className="h-8 w-auto" />
              <span className="text-[9px] font-medium tracking-[0.06em] text-muted uppercase">
                {partner.name}
              </span>
            </div>
            <div
              className="absolute left-0 right-0 top-0 h-3 bg-paper-2"
              style={{ transform: 'rotateX(90deg) translateZ(-6px)', transformOrigin: 'top' }}
            />
            <div
              className="absolute top-0 bottom-0 right-0 w-3 bg-paper-2"
              style={{ transform: 'rotateY(90deg) translateZ(-144px)', transformOrigin: 'right' }}
            />
          </div>
        ))}
        {/* destination card with Itsinda logo */}
        <div
          className="relative shrink-0"
          style={{ transformStyle: 'preserve-3d', width: '150px', height: '100px' }}
        >
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-ink bg-ink shadow-pop"
            style={{ transform: 'translateZ(24px)', backfaceVisibility: 'hidden' }}
          >
            <Mark className="size-8 text-white" />
            <span className="text-[9px] font-semibold tracking-[0.06em] text-white uppercase">
              Itsinda
            </span>
          </div>
          <div
            className="absolute left-0 right-0 top-0 h-3 bg-ink-2"
            style={{ transform: 'rotateX(90deg) translateZ(-6px)', transformOrigin: 'top' }}
          />
          <div
            className="absolute top-0 bottom-0 right-0 w-3 bg-ink-2"
            style={{ transform: 'rotateY(90deg) translateZ(-144px)', transformOrigin: 'right' }}
          />
        </div>
      </div>
    </div>
  )
}
```

---

## 4. SceneHeroFloat Component (`web/src/components/art/Scenes.tsx`)

```tsx
import { IsoFrame, IsoPlate, IsoBox, IsoTile, IsoCard, IsoLine } from './iso'
import { Banknote, HandCoins, FileText } from 'lucide-react'

export function SceneHeroFloat({ className }: { className?: string }) {
  return (
    <IsoFrame width={520} height={200} className={className}>
      <g transform="translate(150 130)">
        <IsoPlate x={-42} y={-18} z={-2} w={260} d={78} fill="none" stroke="#e2e1da" dashed />
        <IsoTile x={0} y={0} w={42} d={36} h={15} icon={Banknote} />
        <IsoTile x={82} y={0} w={42} d={36} h={15} icon={HandCoins} />
        <IsoTile x={164} y={0} w={42} d={36} h={15} icon={FileText} />
        <IsoLine from={[42, 18]} to={[82, 18]} z={0} dots={false} animated />
        <IsoLine from={[124, 18]} to={[164, 18]} z={0} dots={false} animated />
        <IsoCard x={-20} y={-56} width={104} height={36} title="RWF 5,000 in" lines={1} />
        <IsoCard x={190} y={-50} width={106} height={36} title="Loan approved" lines={1} />
      </g>
    </IsoFrame>
  )
}
```

---

## 5. Iso Primitives (`web/src/components/art/iso.ts`)

```ts
export type Pt = [number, number]

const COS30 = Math.cos(Math.PI / 6)

export function project(x: number, y: number, z = 0): Pt {
  return [(x - y) * COS30, (x + y) * 0.5 - z]
}

export function points(list: Pt[]): string {
  return list.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
}

export function topFace(x: number, y: number, z: number, w: number, d: number): string {
  return points([
    project(x, y, z),
    project(x + w, y, z),
    project(x + w, y + d, z),
    project(x, y + d, z),
  ])
}

export function rightFace(x, y, z, w, d, h) {
  return points([
    project(x + w, y, z),
    project(x + w, y + d, z),
    project(x + w, y + d, z + h),
    project(x + w, y, z + h),
  ])
}

export function leftFace(x, y, z, w, d, h) {
  return points([
    project(x, y + d, z),
    project(x + w, y + d, z),
    project(x + w, y + d, z + h),
    project(x, y + d, z + h),
  ])
}

export function topCenter(x, y, z, w, d) {
  return project(x + w / 2, y + d / 2, z)
}
```

---

## 6. Itsinda Logo SVG (`web/public/itsinda-mark.svg`)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="64" height="64">
  <title>Itsinda</title>
  <g fill="#111111" stroke="#111111" stroke-width="6" stroke-linejoin="round">
    <polygon points="40,40 160,40 160,72 120,72 120,80 80,108 80,72 40,72"/>
    <polygon points="80,122 120,94 120,128 160,128 160,160 40,160 40,128 80,128"/>
  </g>
</svg>
```

---

## 7. Brand Logos (`web/src/components/marketing/BrandLogos.tsx`)

```tsx
export function MtnLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 32" className={className} role="img" aria-label="MTN Mobile Money">
      <rect x="0" y="3" width="56" height="26" rx="4" fill="#FFCB05" />
      <text x="28" y="21.5" textAnchor="middle" fontFamily="sans-serif" fontSize="15" fontWeight="700" fill="#111111">MTN</text>
      <text x="64" y="21.5" fontFamily="sans-serif" fontSize="14" fontWeight="500" fill="#111111">MoMo</text>
    </svg>
  )
}

export function AirtelLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 32" className={className} role="img" aria-label="Airtel Money">
      <text x="0" y="23" fontFamily="sans-serif" fontSize="22" fontWeight="600" fill="#E40000">airtel</text>
      <text x="62" y="23" fontFamily="sans-serif" fontSize="16" fontWeight="400" fill="#E40000">money</text>
    </svg>
  )
}

// ... (AfricasTalkingLogo, FirebaseLogo, ResendLogo, BankLogo follow similar pattern)

export const PARTNER_LOGOS = [
  { name: 'MTN Mobile Money', Logo: MtnLogo },
  { name: 'Airtel Money', Logo: AirtelLogo },
  { name: "Africa's Talking SMS", Logo: AfricasTalkingLogo },
  { name: 'Firebase push', Logo: FirebaseLogo },
  { name: 'Resend email', Logo: ResendLogo },
  { name: 'Bank of Kigali', Logo: BankLogo },
]
```

---

## 8. CSS Keyframes & Utilities (`web/src/index.css`)

```css
@keyframes km-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

@keyframes km-rise {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes km-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes km-scale {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes km-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@utility marquee-track { animation: km-marquee 38s linear infinite; }
@utility rise-in { animation: km-rise 0.8s var(--ease-out-soft) both; }
@utility fade-in { animation: km-fade 0.6s var(--ease-out-soft) both; }
@utility scale-in { animation: km-scale 0.6s var(--ease-out-soft) both; }
@utility float-y { animation: km-float 4s ease-in-out infinite; }
```

---

## Design Tokens

- **Colors**: paper `#fafafa`, ink `#1a1a1a`, muted `#666666`, accent (green) `#17ad17`, accent-2 (orange) `#f08519`, debit `#e53935`
- **Fonts**: Outfit (display), Plus Jakarta Sans (body)
- **Radius**: xs 6px, sm 10px, md 14px, lg 20px, xl 28px
- **Shadow**: lift `0 1px 2px rgba(0,0,0,0.04), 0 12px 32px -16px rgba(0,0,0,0.12)`, pop `0 30px 70px -30px rgba(0,0,0,0.25)`

---

## Prompt for Claude (or any AI)

> "Using the Itsinda brand (logo: itsinda-mark.svg, colors: #1a1a1a ink, #fafafa paper, #17ad17 green accent, #f08519 orange accent, fonts: Outfit + Plus Jakarta Sans), create a production-ready hero section for a Rwandan savings group platform. The hero should have:
> 1. A large heading with word-by-word blur+translate reveal animation
> 2. A subtext paragraph with the same blur reveal (staggered)
> 3. Two CTA buttons (primary dark, secondary outline)
> 4. A 3D isometric conveyor animation showing partner org logos (MTN, Airtel, Africa's Talking, Firebase, Resend, Bank of Kigali) flowing along a tilted plane toward an Itsinda destination card
> 5. The conveyor should have depth (box cards with front/top/side faces), shading gradient from start to end, and smooth infinite looping
> 6. An isometric scene below showing contribution/loan/fine tiles with animated flow lines
> 7. Smooth scroll animations on all sections
> 8. Everything should be clean, professional, and branded Itsinda — not Aoutive"
