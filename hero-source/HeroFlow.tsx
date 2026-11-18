import { PARTNER_LOGOS } from '@/components/marketing/BrandLogos'
import { Mark } from '@/components/ui/Logo'
import { cn } from '@/lib/cn'

/**
 * Hero flow: a real 3D isometric conveyor. Organisation logo cards travel
 * along a tilted plane toward the Itsinda destination card, with depth,
 * shading and smooth motion.
 */
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
          background:
            'linear-gradient(180deg, #f4f3ef 0%, #eae9e2 100%)',
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
            {/* card face */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl border border-rule bg-surface shadow-pop"
              style={{ transform: 'translateZ(12px)', backfaceVisibility: 'hidden' }}
            >
              <partner.Logo className="h-8 w-auto" />
              <span className="text-[9px] font-medium tracking-[0.06em] text-muted uppercase">
                {partner.name}
              </span>
            </div>
            {/* card top edge (depth) */}
            <div
              className="absolute left-0 right-0 top-0 h-3 bg-paper-2"
              style={{ transform: 'rotateX(90deg) translateZ(-6px)', transformOrigin: 'top' }}
            />
            {/* card side edge (depth) */}
            <div
              className="absolute top-0 bottom-0 right-0 w-3 bg-paper-2"
              style={{ transform: 'rotateY(90deg) translateZ(-144px)', transformOrigin: 'right' }}
            />
          </div>
        ))}
        {/* destination card */}
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
