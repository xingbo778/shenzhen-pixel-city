/**
 * Pathfinder — navigation mesh construction + A* search
 * Supports pedestrian, vehicle, and boat movement modes.
 */

import type { TileType } from './sceneTiles'

export type NavMode = 'pedestrian' | 'vehicle' | 'boat'

const PEDESTRIAN_WALKABLE: Set<TileType> = new Set([
  'road_h', 'road_v', 'road_cross',
  'sidewalk', 'sidewalk_edge',
  'alley',
  'grass', 'grass_lush',
  'concrete', 'tile_plaza',
  'park_path',
])

const VEHICLE_DRIVABLE: Set<TileType> = new Set([
  'road_h', 'road_v', 'road_cross',
])

const BOAT_NAVIGABLE: Set<TileType> = new Set([
  'water', 'water_edge',
])

/**
 * Build a boolean passability grid from the tile map.
 */
export function buildNavMesh(tilemap: TileType[][], mode: NavMode): boolean[][] {
  const passable =
    mode === 'pedestrian' ? PEDESTRIAN_WALKABLE :
    mode === 'vehicle' ? VEHICLE_DRIVABLE :
    BOAT_NAVIGABLE

  return tilemap.map(row => row.map(tile => passable.has(tile)))
}

// ── A* pathfinding ──────────────────────────────────────────────

interface Node {
  col: number
  row: number
  g: number
  f: number
  parent: Node | null
}

const DIRS: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]]

function heuristic(a: [number, number], b: [number, number]): number {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])
}

/**
 * A* search on the nav mesh. Returns tile coordinate path from `from` to `to` (inclusive).
 * Returns empty array if unreachable.
 */
export function findPath(
  mesh: boolean[][],
  from: [number, number],
  to: [number, number],
): [number, number][] {
  const rows = mesh.length
  const cols = mesh[0]?.length ?? 0
  if (rows === 0 || cols === 0) return []

  const [fc, fr] = from
  const [tc, tr] = to

  if (fr < 0 || fr >= rows || fc < 0 || fc >= cols) return []
  if (tr < 0 || tr >= rows || tc < 0 || tc >= cols) return []
  if (!mesh[tr][tc]) return []

  // If start is blocked, allow it (entity might be on a building edge)
  const startNode: Node = { col: fc, row: fr, g: 0, f: heuristic(from, to), parent: null }

  const open: Node[] = [startNode]
  const closed = new Set<number>()
  const key = (c: number, r: number) => r * cols + c

  const gMap = new Map<number, number>()
  gMap.set(key(fc, fr), 0)

  while (open.length > 0) {
    // Pop node with lowest f
    let bestIdx = 0
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i
    }
    const current = open[bestIdx]
    open[bestIdx] = open[open.length - 1]
    open.pop()

    if (current.col === tc && current.row === tr) {
      // Reconstruct path
      const path: [number, number][] = []
      let n: Node | null = current
      while (n) {
        path.push([n.col, n.row])
        n = n.parent
      }
      path.reverse()
      return path
    }

    const ck = key(current.col, current.row)
    if (closed.has(ck)) continue
    closed.add(ck)

    for (const [dc, dr] of DIRS) {
      const nc = current.col + dc
      const nr = current.row + dr
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue
      if (!mesh[nr][nc]) continue
      const nk = key(nc, nr)
      if (closed.has(nk)) continue

      const ng = current.g + 1
      const prev = gMap.get(nk)
      if (prev !== undefined && ng >= prev) continue

      gMap.set(nk, ng)
      open.push({
        col: nc,
        row: nr,
        g: ng,
        f: ng + heuristic([nc, nr], to),
        parent: current,
      })
    }
  }

  return []
}

/**
 * Pick a random walkable tile, optionally biased toward a specific row range.
 */
export function randomWalkableTile(
  mesh: boolean[][],
  nearRow?: number,
  rowRange: number = 6,
): [number, number] {
  const rows = mesh.length
  const cols = mesh[0]?.length ?? 0
  const candidates: [number, number][] = []

  const rMin = nearRow !== undefined ? Math.max(0, nearRow - rowRange) : 0
  const rMax = nearRow !== undefined ? Math.min(rows - 1, nearRow + rowRange) : rows - 1

  for (let r = rMin; r <= rMax; r++) {
    for (let c = 0; c < cols; c++) {
      if (mesh[r][c]) candidates.push([c, r])
    }
  }

  if (candidates.length === 0) {
    // Fallback: any walkable tile
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (mesh[r][c]) candidates.push([c, r])
      }
    }
  }

  if (candidates.length === 0) return [0, 0]
  return candidates[Math.floor(Math.random() * candidates.length)]
}
