import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { points, project, rightFace, topCenter, topFace, leftFace, type Pt } from './iso'

export const HAIRLINE = '#d5d4cc'
export const PLATE = '#f1f0ea'
export const SHADE_RIGHT = '#eeede7'
export const SHADE_LEFT = '#f6f5f1'

interface IsoBoxProps {
  x: number
  y: number
  z?: number
  w: number
  d: number
  h: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
}

/** A solid iso box: opaque top, two shaded vertical faces, hairline edges. */
export function IsoBox({
  x,
  y,
  z = 0,
  w,
  d,
  h,
  fill = '#ffffff',
  stroke = HAIRLINE,
  strokeWidth = 1,
  opacity = 1,
}: IsoBoxProps) {
  return (
    <g opacity={opacity} strokeLinejoin="round">
      <polygon points={leftFace(x, y, z, w, d, h)} fill={SHADE_LEFT} stroke={stroke} strokeWidth={strokeWidth} />
      <polygon points={rightFace(x, y, z, w, d, h)} fill={SHADE_RIGHT} stroke={stroke} strokeWidth={strokeWidth} />
      <polygon points={topFace(x, y, z + h, w, d)} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
    </g>
  )
}

/** A flat slab lying on the ground plane. */
export function IsoPlate({
  x,
  y,
  z = 0,
  w,
  d,
  fill = '#ffffff',
  stroke = HAIRLINE,
  dashed = false,
}: {
  x: number
  y: number
  z?: number
  w: number
  d: number
  fill?: string
  stroke?: string
  dashed?: boolean
}) {
  return (
    <polygon
      points={topFace(x, y, z, w, d)}
      fill={fill}
      stroke={stroke}
      strokeWidth={1}
      strokeDasharray={dashed ? '3 4' : undefined}
    />
  )
}

/** An icon chip: iso tile with a black top plate and a white glyph. */
export function IsoTile({
  x,
  y,
  z = 0,
  w = 10,
  d = 10,
  h = 7,
  icon: Icon,
  dark = true,
  glyphSize = 13,
}: {
  x: number
  y: number
  z?: number
  w?: number
  d?: number
  h?: number
  icon?: LucideIcon
  dark?: boolean
  glyphSize?: number
}) {
  const [cx, cy] = topCenter(x, y, z + h, w, d)
  return (
    <g>
      <IsoBox x={x} y={y} z={z} w={w} d={d} h={h} />
      <polygon
        points={topFace(x + 1.1, y + 1.1, z + h + 0.35, w - 2.2, d - 2.2)}
        fill={dark ? '#111111' : '#ffffff'}
        stroke={dark ? '#111111' : HAIRLINE}
        strokeWidth={1}
      />
      {Icon ? (
        <g transform={`translate(${cx - glyphSize / 2}, ${cy - glyphSize / 2})`}>
          <Icon width={glyphSize} height={glyphSize} color={dark ? '#ffffff' : '#111111'} strokeWidth={1.8} />
        </g>
      ) : null}
    </g>
  )
}

/** Dashed connector between two ground points, with terminal dots. */
export function IsoLine({
  from,
  to,
  z = 0,
  animated = false,
  dots = true,
}: {
  from: Pt
  to: Pt
  z?: number
  animated?: boolean
  dots?: boolean
}) {
  const [x1, y1] = project(from[0], from[1], z)
  const [x2, y2] = project(to[0], to[1], z)
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={HAIRLINE}
        strokeWidth={1}
        strokeDasharray={animated ? '4 5' : undefined}
        className={animated ? 'flow-dash' : undefined}
      />
      {dots ? (
        <>
          <circle cx={x1} cy={y1} r={1.8} fill="#111111" />
          <circle cx={x2} cy={y2} r={1.8} fill="#111111" />
        </>
      ) : null}
    </g>
  )
}

/** Free-floating paper card with a hairline border, drawn on a caption anchor. */
export function IsoCard({
  x,
  y,
  width = 78,
  height = 34,
  title,
  lines = 2,
}: {
  x: number
  y: number
  width?: number
  height?: number
  title?: string
  lines?: number
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={2}
        fill="#ffffff"
        stroke={HAIRLINE}
        strokeWidth={1}
      />
      {title ? (
        <text
          x={x + 7}
          y={y + 13}
          fontSize={7}
          fill="#111111"
          fontFamily="Inter Tight Variable, sans-serif"
          letterSpacing="0.02em"
        >
          {title}
        </text>
      ) : null}
      {Array.from({ length: lines }).map((_, index) => (
        <rect
          key={index}
          x={x + 7}
          y={y + 20 + index * 6}
          width={width - 22 - index * 10}
          height={2}
          rx={1}
          fill={PLATE}
        />
      ))}
    </g>
  )
}

/** The frame every scene sits in — viewBox, no background. */
export function IsoFrame({
  width = 640,
  height = 420,
  children,
  className,
}: {
  width?: number
  height?: number
  children: ReactNode
  className?: string
}) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="presentation"
      aria-hidden
      fill="none"
    >
      {children}
    </svg>
  )
}

export { points }
