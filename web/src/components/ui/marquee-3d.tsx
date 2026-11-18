import { PARTNER_LOGOS } from '@/components/marketing/BrandLogos'
import { cn } from '@/lib/cn'

export function Marquee3D({ className }: { className?: string }) {
  const track = [...PARTNER_LOGOS, ...PARTNER_LOGOS, ...PARTNER_LOGOS]
  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{ perspective: '900px' }}
    >
      <div
        className="flex gap-6"
        style={{
          transform: 'rotateX(18deg) rotateZ(-2deg)',
          transformStyle: 'preserve-3d',
          animation: 'km-marquee 28s linear infinite',
          width: 'max-content',
        }}
      >
        {track.map((partner, index) => (
          <div
            key={`${partner.name}-${index}`}
            className="flex h-14 w-[180px] shrink-0 items-center justify-center gap-3 rounded-2xl border border-rule bg-surface/80 px-4 shadow-lift backdrop-blur-md transition-transform hover:-translate-y-1"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <partner.Logo className="h-7 w-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
