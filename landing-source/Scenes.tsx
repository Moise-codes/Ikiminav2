import {
  Banknote,
  CalendarClock,
  Coins,
  FileText,
  HandCoins,
  Landmark,
  ListChecks,
  MessageSquare,
  Percent,
  Receipt,
  Scale,
  ShieldCheck,
  Smartphone,
  Users,
  Wallet,
} from 'lucide-react'
import { IsoCard, IsoFrame, IsoBox, IsoLine, IsoPlate, IsoTile, HAIRLINE } from './IsoPrimitives'
import { project, topCenter, topFace } from './iso'

function MarkGlyph({
  x,
  y,
  size = 22,
  color = '#ffffff',
}: {
  x: number
  y: number
  size?: number
  color?: string
}) {
  const scale = size / 200
  return (
    <g
      transform={`translate(${x - size / 2} ${y - size / 2}) scale(${scale})`}
      fill={color}
      stroke={color}
      strokeWidth={10}
      strokeLinejoin="round"
    >
      <polygon points="40,40 160,40 160,72 120,72 120,80 80,108 80,72 40,72" />
      <polygon points="80,122 120,94 120,128 160,128 160,160 40,160 40,128 80,128" />
    </g>
  )
}

/** Hero foreground: three tiles standing in front of the voxel field. */
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

/** Product section: the ledger page in perspective, built from content blocks. */
export function SceneWindowStack({ className, active = 0 }: { className?: string; active?: number }) {
  const page = { x: -86, y: -86, w: 172, d: 172, h: 10 }
  const configs = [
    {
      bars: [
        { y: -34, w: 96, tone: '#e4e2da', amount: '#cfcdc4' },
        { y: -10, w: 118, tone: '#e4e2da', amount: '#cfcdc4' },
        { y: 14, w: 78, tone: '#dbd9d0', amount: '#cfcdc4' },
        { y: 38, w: 104, tone: '#e4e2da', amount: '#cfcdc4' },
        { y: 62, w: 54, tone: '#17ad17', amount: '#17ad17' },
      ],
      tiles: [Users, Percent, ShieldCheck],
    },
    {
      bars: [
        { y: -34, w: 60, tone: '#e4e2da', amount: '#cfcdc4' },
        { y: -10, w: 140, tone: '#e4e2da', amount: '#cfcdc4' },
        { y: 14, w: 90, tone: '#dbd9d0', amount: '#cfcdc4' },
        { y: 38, w: 120, tone: '#e4e2da', amount: '#cfcdc4' },
        { y: 62, w: 80, tone: '#f08519', amount: '#f08519' },
      ],
      tiles: [Landmark, Banknote, Percent],
    },
    {
      bars: [
        { y: -34, w: 88, tone: '#fde8e8', amount: '#f08519' },
        { y: -10, w: 70, tone: '#fde8e8', amount: '#f08519' },
        { y: 14, w: 100, tone: '#fde8e8', amount: '#f08519' },
        { y: 38, w: 50, tone: '#fde8e8', amount: '#f08519' },
        { y: 62, w: 40, tone: '#e53935', amount: '#e53935' },
      ],
      tiles: [ShieldCheck, Percent, Users],
    },
    {
      bars: [
        { y: -34, w: 110, tone: '#e8f5e8', amount: '#17ad17' },
        { y: -10, w: 95, tone: '#e8f5e8', amount: '#17ad17' },
        { y: 14, w: 130, tone: '#e8f5e8', amount: '#17ad17' },
        { y: 38, w: 85, tone: '#e8f5e8', amount: '#17ad17' },
        { y: 62, w: 120, tone: '#17ad17', amount: '#17ad17' },
      ],
      tiles: [Receipt, Landmark, Users],
    },
  ]
  const config = configs[active] ?? configs[0]
  const bars = config.bars
  const [iconA, iconB, iconC] = config.tiles

  return (
    <IsoFrame width={520} height={380} className={className}>
      <g transform="translate(260 150)">
        <IsoPlate x={-76} y={-96} z={-14} w={page.w} d={page.d} fill="#fbfaf7" />
        <IsoPlate x={-81} y={-91} z={-7} w={page.w} d={page.d} fill="#fdfcfa" />
        <IsoBox {...page} fill="#ffffff" stroke="#111111" />

        {/* document head */}
        <polygon points={topFace(-72, -72, page.h + 0.5, 62, 24)} fill="#111111" stroke="#111111" />
        <polygon points={topFace(0, -66, page.h + 0.5, 40, 7)} fill="#d5d4cc" stroke="none" />
        <polygon points={topFace(0, -54, page.h + 0.5, 26, 7)} fill="#e4e2da" stroke="none" />

        {bars.map((bar, index) => (
          <g key={index}>
            <polygon
              points={topFace(-72, bar.y, page.h + 0.5, bar.w, 11)}
              fill={bar.tone}
              stroke="none"
            />
            <polygon
              points={topFace(46, bar.y, page.h + 0.5, 26, 11)}
              fill={bar.amount}
              stroke="none"
            />
          </g>
        ))}

        <IsoTile x={-142} y={16} w={40} d={34} h={15} icon={iconA} />
        <IsoTile x={104} y={-104} w={40} d={34} h={15} icon={iconB} />
        <IsoTile x={-16} y={152} w={40} d={34} h={15} icon={iconC} dark={false} />
        <IsoCard x={-64} y={-134} width={104} height={32} title={["Period 2026-11","Loan #042","Fines · Nov","Statement"][active] ?? "Period 2026-11"} lines={1} />
      </g>
    </IsoFrame>
  )
}

/** Integrations: one engine, everything around it wired in. */
export function SceneCubeNetwork({ className }: { className?: string }) {
  const hub = { x: 130, y: 96, w: 96, d: 96, h: 66 }
  const [hubX, hubY] = topCenter(hub.x, hub.y, hub.h, hub.w, hub.d)

  const satellites = [
    { x: 4, y: 4, icon: Smartphone },
    { x: -6, y: 96, icon: MessageSquare },
    { x: 262, y: 14, icon: Landmark },
    { x: 286, y: 92, icon: Banknote },
    { x: 150, y: 214, icon: Receipt },
  ]

  return (
    <IsoFrame width={560} height={400} className={className}>
      <g transform="translate(140 130)">
        <polygon
          points={topFace(0, 24, 0, 372, 250)}
          fill="none"
          stroke="#eeede7"
          strokeDasharray="3 5"
        />
        {satellites.map((satellite) => (
          <IsoLine
            key={`line-${satellite.x}-${satellite.y}`}
            from={[satellite.x + 20, satellite.y + 18]}
            to={[hub.x + 48, hub.y + 48]}
            z={0}
          />
        ))}

        {/* glass housing */}
        <polygon
          points={topFace(hub.x - 22, hub.y - 22, hub.h + 34, hub.w + 44, hub.d + 44)}
          fill="none"
          stroke="#d5d4cc"
        />
        <polygon
          points={topFace(hub.x - 22, hub.y - 22, 0, hub.w + 44, hub.d + 44)}
          fill="none"
          stroke="#d5d4cc"
        />
        <IsoBox {...hub} fill="#ffffff" />
        <polygon
          points={topFace(hub.x + 14, hub.y + 14, hub.h + 4, hub.w - 28, hub.d - 28)}
          fill="#111111"
          stroke="#111111"
        />
        <MarkGlyph x={hubX} y={hubY} size={32} />

        {satellites.map((satellite) => (
          <IsoTile
            key={`tile-${satellite.x}-${satellite.y}`}
            x={satellite.x}
            y={satellite.y}
            w={40}
            d={34}
            h={15}
            icon={satellite.icon}
          />
        ))}
      </g>
    </IsoFrame>
  )
}

/** Bento 1 — the contribution run. */
export function SceneContributions({ className }: { className?: string }) {
  return (
    <IsoFrame width={480} height={300} className={className}>
      <g transform="translate(120 140)">
        <IsoPlate x={0} y={26} w={188} d={44} fill="#fbfaf7" />
        <IsoTile x={10} y={32} w={38} d={32} h={15} icon={Banknote} />
        <IsoTile x={58} y={32} w={38} d={32} h={15} icon={Smartphone} />
        <IsoTile x={106} y={32} w={38} d={32} h={15} icon={Wallet} />
        <IsoLine from={[148, 48]} to={[186, 48]} z={0} animated />
        <IsoBox x={186} y={14} w={66} d={66} h={46} />
        <polygon points={topFace(196, 24, 50, 46, 46)} fill="#111111" stroke="#111111" />
        <MarkGlyph x={topCenter(186, 14, 46, 66, 66)[0]} y={topCenter(186, 14, 46, 66, 66)[1]} size={22} />
        <IsoCard x={16} y={-34} width={104} height={34} title="RWF 5,000" lines={1} />
        <IsoCard x={196} y={-56} width={112} height={34} title="Period closed" lines={1} />
      </g>
    </IsoFrame>
  )
}

/** Bento 2 — a loan decided at the centre of the group. */
export function SceneLoans({ className }: { className?: string }) {
  const hub = { x: 54, y: 62, w: 84, d: 84, h: 34 }
  const [hubX, hubY] = topCenter(hub.x, hub.y, hub.h, hub.w, hub.d)

  return (
    <IsoFrame width={480} height={300} className={className}>
      <g transform="translate(130 120)">
        <polygon points={topFace(hub.x + 1, hub.y + 1, hub.h + 1, hub.w - 2, hub.d - 2)} fill="#111111" stroke="#111111" />
        <MarkGlyph x={hubX} y={hubY} size={24} />
        <IsoBox {...hub} fill="#ffffff" />

        <IsoTile x={-92} y={36} w={38} d={32} h={13} icon={Coins} dark={false} />
        <IsoTile x={168} y={-6} w={38} d={32} h={13} icon={Scale} dark={false} />
        <IsoTile x={104} y={128} w={38} d={32} h={13} icon={CalendarClock} dark={false} />

        <IsoLine from={[-54, 52]} to={[hub.x, hub.y + 42]} z={0} />
        <IsoLine from={[hub.x + hub.w, hub.y + 42]} to={[168, 10]} z={0} />
        <IsoLine from={[hub.x + 42, hub.y + hub.d]} to={[104, 144]} z={0} />

        <IsoCard x={-96} y={-30} width={96} height={32} title="Principal" lines={1} />
        <IsoCard x={170} y={-56} width={98} height={32} title="Approved" lines={1} />
      </g>
    </IsoFrame>
  )
}

/** Bento 3 — fines for the members who missed the period. */
export function SceneFines({ className }: { className?: string }) {
  return (
    <IsoFrame width={480} height={300} className={className}>
      <g transform="translate(96 150)">
        <IsoBox x={0} y={0} w={60} d={60} h={42} />
        <polygon points={topFace(8, 8, 46, 44, 44)} fill="#111111" stroke="#111111" />
        <MarkGlyph x={topCenter(0, 0, 42, 60, 60)[0]} y={topCenter(0, 0, 42, 60, 60)[1]} size={20} />

        <IsoLine from={[66, 26]} to={[110, 4]} z={0} dots={false} />
        {[0, 1, 2].map((index) => (
          <g key={index}>
            <IsoPlate x={110} y={-14 + index * 30} w={122} d={26} fill="#ffffff" />
            <IsoCard
              x={120}
              y={-10 + index * 30}
              width={100}
              height={20}
              title="Missed period"
              lines={0}
            />
          </g>
        ))}

        <IsoCard x={-44} y={-78} width={104} height={32} title="10% fine" lines={1} />
      </g>
    </IsoFrame>
  )
}

/** Bento 4 — year-end pot split between members. */
export function SceneDistribution({ className }: { className?: string }) {
  return (
    <IsoFrame width={480} height={300} className={className}>
      <g transform="translate(92 158)">
        <IsoBox x={0} y={0} w={58} d={58} h={38} />
        <polygon points={topFace(7, 7, 42, 44, 44)} fill="#111111" stroke="#111111" />
        <MarkGlyph x={topCenter(0, 0, 38, 58, 58)[0]} y={topCenter(0, 0, 38, 58, 58)[1]} size={18} />

        {[0, 1, 2, 3].map((index) => {
          const y = -30 + index * 26
          return (
            <g key={index}>
              <IsoLine from={[62, 28]} to={[122, y + 12]} z={0} dots={false} />
              <IsoPlate x={122} y={y} w={112} d={22} fill="#ffffff" />
              <IsoCard x={132} y={y + 3} width={92} height={17} title={`Share ${index + 1}`} lines={0} />
            </g>
          )
        })}
      </g>
    </IsoFrame>
  )
}

/** Bento 5 — the member statement, printable and disputable. */
export function SceneStatement({ className }: { className?: string }) {
  return (
    <IsoFrame width={480} height={300} className={className}>
      <g transform="translate(120 150)">
        {[2, 1, 0].map((index) => (
          <g key={index} transform={`translate(${index * 12} ${index * 15})`}>
            <polygon points={topFace(0, 0, 34, 132, 16)} fill="#ffffff" stroke={HAIRLINE} />
            <polygon points={topFace(0, 16, 6, 132, 6)} fill="#fbfaf7" stroke={HAIRLINE} />
            <line
              x1={project(0, 22, 6)[0]}
              y1={project(0, 22, 6)[1]}
              x2={project(0, 22, 34)[0]}
              y2={project(0, 22, 34)[1]}
              stroke={HAIRLINE}
            />
            {[0, 1, 2].map((row) => (
              <line
                key={row}
                x1={project(14, 12, 26 - row * 6)[0]}
                y1={project(14, 12, 26 - row * 6)[1]}
                x2={project(112 - row * 14, 12, 26 - row * 6)[0]}
                y2={project(112 - row * 14, 12, 26 - row * 6)[1]}
                stroke={HAIRLINE}
              />
            ))}
          </g>
        ))}
        <IsoTile x={-46} y={52} w={40} d={34} h={14} icon={FileText} />
        <IsoTile x={148} y={18} w={40} d={34} h={14} icon={ListChecks} dark={false} />
        <IsoCard x={-30} y={-92} width={106} height={32} title="Statement" lines={1} />
      </g>
    </IsoFrame>
  )
}

/** CTA geometry: circles, a triangle and a quarter arc on one grid. */
export function CtaGeometry({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 300" className={className} role="presentation" aria-hidden fill="none">
      <g stroke="#d5d4cc" strokeWidth="1">
        <path d="M180 140v140" />
        <path d="M0 140h360" />
        <circle cx="96" cy="212" r="66" />
        <circle cx="180" cy="212" r="52" />
        <circle cx="264" cy="212" r="66" />
        <path d="M180 74l44 66h-88z" />
        <path d="M180 6l52 66h-104z" />
        <path d="M180 140a76 76 0 0 1-76-76h76z" />
        <path d="M180 140a76 76 0 0 0 76-76h-76z" />
      </g>
    </svg>
  )
}
