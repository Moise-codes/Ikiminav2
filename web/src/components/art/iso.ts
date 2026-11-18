/**
 * Minimal isometric projection used by the line-art illustrations.
 * Screen space: +x goes down-right, +y goes down-left, +z goes up.
 */
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

export function rightFace(
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
): string {
  return points([
    project(x + w, y, z),
    project(x + w, y + d, z),
    project(x + w, y + d, z + h),
    project(x + w, y, z + h),
  ])
}

export function leftFace(
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
): string {
  return points([
    project(x, y + d, z),
    project(x + w, y + d, z),
    project(x + w, y + d, z + h),
    project(x, y + d, z + h),
  ])
}

export function topCenter(x: number, y: number, z: number, w: number, d: number): Pt {
  return project(x + w / 2, y + d / 2, z)
}

/** Polyline across the iso ground plane, used for the wiring between tiles. */
export function groundPath(waypoints: Pt[], z = 0): string {
  return waypoints
    .map(([x, y], index) => {
      const [sx, sy] = project(x, y, z)
      return `${index === 0 ? 'M' : 'L'}${sx.toFixed(2)} ${sy.toFixed(2)}`
    })
    .join(' ')
}
