/**
 * Pathfinder — navigation mesh construction + A* search
 * Supports pedestrian, vehicle, and boat movement modes.
 *
 * Optimizations:
 * - Binary heap for open list (O(log n) pop vs O(n) linear scan)
 * - Path cache with TTL to avoid redundant A* for same from→to
 * - Pre-indexed walkable tiles per row band for randomWalkableTile
 * - Chunk-aware routing to bound long-distance searches on large maps
 */

import type { TileType } from './sceneTiles'
import { DEFAULT_CHUNK_SIZE, chunkKey, parseChunkKey, worldToChunk } from './world/coords'

export type NavMode = 'pedestrian' | 'vehicle' | 'boat'

export interface SearchBounds {
  minCol: number
  maxCol: number
  minRow: number
  maxRow: number
}

export interface ChunkedPathOptions {
  chunkSize?: number
  chunkPadding?: number
}

interface ChunkGraph {
  chunkSize: number
  neighbors: Map<string, string[]>
}

const PEDESTRIAN_WALKABLE = new Set<TileType>([
  'road_h', 'road_v', 'road_cross',
  'road_cross_zebra_n', 'road_cross_zebra_s', 'road_cross_zebra_w', 'road_cross_zebra_e',
  'road_stop_h', 'road_stop_v',
  'sidewalk', 'sidewalk_edge',
  'alley',
  'grass', 'grass_lush',
  'concrete', 'tile_plaza',
  'park_path',
])

const VEHICLE_DRIVABLE = new Set<TileType>([
  'road_h', 'road_v', 'road_cross',
  'road_cross_zebra_n', 'road_cross_zebra_s', 'road_cross_zebra_w', 'road_cross_zebra_e',
  'road_stop_h', 'road_stop_v',
])

const BOAT_NAVIGABLE = new Set<TileType>([
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

// ── Binary min-heap for A* open list ─────────────────────────────

interface Node {
  col: number
  row: number
  g: number
  f: number
  parent: Node | null
}

class MinHeap {
  private data: Node[] = []

  get length() { return this.data.length }

  push(node: Node) {
    this.data.push(node)
    this._bubbleUp(this.data.length - 1)
  }

  pop(): Node | undefined {
    const top = this.data[0]
    const last = this.data.pop()
    if (this.data.length > 0 && last) {
      this.data[0] = last
      this._sinkDown(0)
    }
    return top
  }

  private _bubbleUp(i: number) {
    const d = this.data
    while (i > 0) {
      const p = (i - 1) >> 1
      if (d[p].f <= d[i].f) break
      ;[d[p], d[i]] = [d[i], d[p]]
      i = p
    }
  }

  private _sinkDown(i: number) {
    const d = this.data
    const n = d.length
    while (true) {
      let smallest = i
      const l = 2 * i + 1
      const r = 2 * i + 2
      if (l < n && d[l].f < d[smallest].f) smallest = l
      if (r < n && d[r].f < d[smallest].f) smallest = r
      if (smallest === i) break
      ;[d[smallest], d[i]] = [d[i], d[smallest]]
      i = smallest
    }
  }
}

// ── Path cache ───────────────────────────────────────────────────

interface CachedPath {
  path: [number, number][]
  ts: number
}

const PATH_CACHE = new Map<string, CachedPath>()
const CACHE_TTL = 5000  // 5 seconds
const MAX_CACHE_SIZE = 200

function prunePathCache() {
  if (PATH_CACHE.size <= MAX_CACHE_SIZE) return
  const now = Date.now()
  PATH_CACHE.forEach((entry, key) => {
    if (now - entry.ts > CACHE_TTL) PATH_CACHE.delete(key)
  })
  if (PATH_CACHE.size > MAX_CACHE_SIZE) {
    const entries = Array.from(PATH_CACHE.entries())
    entries.sort((a, b) => a[1].ts - b[1].ts)
    const toRemove = entries.slice(0, Math.floor(entries.length / 2))
    toRemove.forEach(([k]) => PATH_CACHE.delete(k))
  }
}

// ── Chunk graph cache ────────────────────────────────────────────

const CHUNK_GRAPH_CACHE = new WeakMap<boolean[][], Map<number, ChunkGraph>>()

function getChunkGraph(mesh: boolean[][], chunkSize: number): ChunkGraph {
  let perMesh = CHUNK_GRAPH_CACHE.get(mesh)
  if (!perMesh) {
    perMesh = new Map()
    CHUNK_GRAPH_CACHE.set(mesh, perMesh)
  }

  const cached = perMesh.get(chunkSize)
  if (cached) return cached

  const graph = buildChunkGraph(mesh, chunkSize)
  perMesh.set(chunkSize, graph)
  return graph
}

function buildChunkGraph(mesh: boolean[][], chunkSize: number): ChunkGraph {
  const neighbors = new Map<string, Set<string>>()
  const rows = mesh.length
  const cols = mesh[0]?.length ?? 0

  const ensureChunk = (key: string) => {
    if (!neighbors.has(key)) {
      neighbors.set(key, new Set())
    }
  }

  const connectChunks = (a: string, b: string) => {
    ensureChunk(a)
    ensureChunk(b)
    neighbors.get(a)?.add(b)
    neighbors.get(b)?.add(a)
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!mesh[row][col]) continue
      const current = chunkKey(
        worldToChunk(col, row, chunkSize).cx,
        worldToChunk(col, row, chunkSize).cy,
      )
      ensureChunk(current)

      for (const [dc, dr] of [[1, 0], [0, 1]] as [number, number][]) {
        const nextCol = col + dc
        const nextRow = row + dr
        if (nextRow >= rows || nextCol >= cols || !mesh[nextRow][nextCol]) continue

        const targetCoord = worldToChunk(nextCol, nextRow, chunkSize)
        const target = chunkKey(targetCoord.cx, targetCoord.cy)
        if (target !== current) {
          connectChunks(current, target)
        }
      }
    }
  }

  const normalizedNeighbors = new Map<string, string[]>()
  neighbors.forEach((adjacent, key) => {
    normalizedNeighbors.set(key, Array.from(adjacent))
  })

  return {
    chunkSize,
    neighbors: normalizedNeighbors,
  }
}

// ── A* pathfinding ──────────────────────────────────────────────

const DIRS: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]]

function heuristic(ac: number, ar: number, bc: number, br: number): number {
  return Math.abs(ac - bc) + Math.abs(ar - br)
}

function normalizeBounds(mesh: boolean[][], bounds?: SearchBounds): SearchBounds {
  const rows = mesh.length
  const cols = mesh[0]?.length ?? 0
  const fallback = {
    minCol: 0,
    maxCol: Math.max(0, cols - 1),
    minRow: 0,
    maxRow: Math.max(0, rows - 1),
  }

  if (!bounds) return fallback

  return {
    minCol: Math.max(0, Math.min(cols - 1, bounds.minCol)),
    maxCol: Math.max(0, Math.min(cols - 1, bounds.maxCol)),
    minRow: Math.max(0, Math.min(rows - 1, bounds.minRow)),
    maxRow: Math.max(0, Math.min(rows - 1, bounds.maxRow)),
  }
}

function cacheKeyForPath(
  from: [number, number],
  to: [number, number],
  bounds: SearchBounds,
): string {
  return [
    from[0], from[1], to[0], to[1],
    bounds.minCol, bounds.maxCol, bounds.minRow, bounds.maxRow,
  ].join(',')
}

function findPathInternal(
  mesh: boolean[][],
  from: [number, number],
  to: [number, number],
  bounds?: SearchBounds,
): [number, number][] {
  const rows = mesh.length
  const cols = mesh[0]?.length ?? 0
  if (rows === 0 || cols === 0) return []

  const [fc, fr] = from
  const [tc, tr] = to

  if (fr < 0 || fr >= rows || fc < 0 || fc >= cols) return []
  if (tr < 0 || tr >= rows || tc < 0 || tc >= cols) return []
  if (!mesh[tr][tc]) return []

  const normalizedBounds = normalizeBounds(mesh, bounds)
  if (
    fc < normalizedBounds.minCol || fc > normalizedBounds.maxCol ||
    fr < normalizedBounds.minRow || fr > normalizedBounds.maxRow ||
    tc < normalizedBounds.minCol || tc > normalizedBounds.maxCol ||
    tr < normalizedBounds.minRow || tr > normalizedBounds.maxRow
  ) {
    return []
  }

  const cacheKey = cacheKeyForPath(from, to, normalizedBounds)
  const cached = PATH_CACHE.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.path.map(p => [p[0], p[1]] as [number, number])
  }

  const open = new MinHeap()
  open.push({ col: fc, row: fr, g: 0, f: heuristic(fc, fr, tc, tr), parent: null })

  const closed = new Set<number>()
  const key = (col: number, row: number) => row * cols + col

  const gMap = new Map<number, number>()
  gMap.set(key(fc, fr), 0)

  while (open.length > 0) {
    const current = open.pop()!

    if (current.col === tc && current.row === tr) {
      const path: [number, number][] = []
      let node: Node | null = current
      while (node) {
        path.push([node.col, node.row])
        node = node.parent
      }
      path.reverse()
      PATH_CACHE.set(cacheKey, { path, ts: Date.now() })
      prunePathCache()
      return path
    }

    const currentKey = key(current.col, current.row)
    if (closed.has(currentKey)) continue
    closed.add(currentKey)

    for (const [dc, dr] of DIRS) {
      const nextCol = current.col + dc
      const nextRow = current.row + dr
      if (
        nextRow < normalizedBounds.minRow || nextRow > normalizedBounds.maxRow ||
        nextCol < normalizedBounds.minCol || nextCol > normalizedBounds.maxCol
      ) {
        continue
      }
      if (!mesh[nextRow][nextCol]) continue

      const nextKey = key(nextCol, nextRow)
      if (closed.has(nextKey)) continue

      const nextG = current.g + 1
      const previousG = gMap.get(nextKey)
      if (previousG !== undefined && nextG >= previousG) continue

      gMap.set(nextKey, nextG)
      open.push({
        col: nextCol,
        row: nextRow,
        g: nextG,
        f: nextG + heuristic(nextCol, nextRow, tc, tr),
        parent: current,
      })
    }
  }

  PATH_CACHE.set(cacheKey, { path: [], ts: Date.now() })
  return []
}

function findChunkRoute(
  mesh: boolean[][],
  from: [number, number],
  to: [number, number],
  chunkSize: number,
): string[] | null {
  const graph = getChunkGraph(mesh, chunkSize)
  const fromChunk = worldToChunk(from[0], from[1], chunkSize)
  const toChunk = worldToChunk(to[0], to[1], chunkSize)
  const startKey = chunkKey(fromChunk.cx, fromChunk.cy)
  const endKey = chunkKey(toChunk.cx, toChunk.cy)

  if (startKey === endKey) return [startKey]

  if (!graph.neighbors.has(startKey) || !graph.neighbors.has(endKey)) {
    return null
  }

  const queue = [startKey]
  const visited = new Set<string>([startKey])
  const parents = new Map<string, string | null>()
  parents.set(startKey, null)

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) break
    if (current === endKey) break

    const adjacent = graph.neighbors.get(current) ?? []
    adjacent.forEach((next) => {
      if (visited.has(next)) return
      visited.add(next)
      parents.set(next, current)
      queue.push(next)
    })
  }

  if (!parents.has(endKey)) return null

  const route: string[] = []
  let cursor: string | null = endKey
  while (cursor) {
    route.push(cursor)
    cursor = parents.get(cursor) ?? null
  }
  route.reverse()
  return route
}

function getBoundsForChunkRoute(
  mesh: boolean[][],
  route: string[],
  chunkSize: number,
  padding: number,
): SearchBounds {
  const rows = mesh.length
  const cols = mesh[0]?.length ?? 0
  let minCx = Infinity
  let maxCx = -Infinity
  let minCy = Infinity
  let maxCy = -Infinity

  route.forEach((key) => {
    const { cx, cy } = parseChunkKey(key)
    minCx = Math.min(minCx, cx)
    maxCx = Math.max(maxCx, cx)
    minCy = Math.min(minCy, cy)
    maxCy = Math.max(maxCy, cy)
  })

  const minCol = (minCx - padding) * chunkSize
  const maxCol = ((maxCx + padding + 1) * chunkSize) - 1
  const minRow = (minCy - padding) * chunkSize
  const maxRow = ((maxCy + padding + 1) * chunkSize) - 1

  return {
    minCol: Math.max(0, minCol),
    maxCol: Math.min(cols - 1, maxCol),
    minRow: Math.max(0, minRow),
    maxRow: Math.min(rows - 1, maxRow),
  }
}

/**
 * A* search on the nav mesh. Returns tile coordinate path from `from` to `to` (inclusive).
 * Returns empty array if unreachable. Results are cached for 5 seconds.
 */
export function findPath(
  mesh: boolean[][],
  from: [number, number],
  to: [number, number],
): [number, number][] {
  return findPathInternal(mesh, from, to)
}

/**
 * Run A* within a bounded rectangle. Useful for chunk-local or chunk-route searches.
 */
export function findPathInBounds(
  mesh: boolean[][],
  from: [number, number],
  to: [number, number],
  bounds: SearchBounds,
): [number, number][] {
  return findPathInternal(mesh, from, to, bounds)
}

/**
 * Hierarchical pathfinding for large maps:
 * 1. Find a coarse route through connected chunks
 * 2. Run A* within the chunk-route bounds
 * 3. Fall back to full-map A* if the bounded search misses a valid detour
 */
export function findPathChunked(
  mesh: boolean[][],
  from: [number, number],
  to: [number, number],
  options: ChunkedPathOptions = {},
): [number, number][] {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE
  const chunkPadding = options.chunkPadding ?? 0
  const fromChunk = worldToChunk(from[0], from[1], chunkSize)
  const toChunk = worldToChunk(to[0], to[1], chunkSize)

  if (fromChunk.cx === toChunk.cx && fromChunk.cy === toChunk.cy) {
    const bounds = getBoundsForChunkRoute(
      mesh,
      [chunkKey(fromChunk.cx, fromChunk.cy)],
      chunkSize,
      chunkPadding,
    )
    return findPathInternal(mesh, from, to, bounds)
  }

  const route = findChunkRoute(mesh, from, to, chunkSize)
  if (route && route.length > 0) {
    const bounds = getBoundsForChunkRoute(mesh, route, chunkSize, chunkPadding)
    const boundedPath = findPathInternal(mesh, from, to, bounds)
    if (boundedPath.length > 0) {
      return boundedPath
    }
  }

  return findPathInternal(mesh, from, to)
}

// ── Walkable tile index ─────────────────────────────────────────

let _walkableAll: [number, number][] | null = null
let _walkableMesh: boolean[][] | null = null

function ensureWalkableIndex(mesh: boolean[][]) {
  if (_walkableMesh === mesh) return
  _walkableMesh = mesh
  _walkableAll = []
  for (let r = 0; r < mesh.length; r++) {
    for (let c = 0; c < (mesh[0]?.length ?? 0); c++) {
      if (mesh[r][c]) _walkableAll.push([c, r])
    }
  }
}

/**
 * Pick a random walkable tile, optionally biased toward a specific row range.
 */
export function randomWalkableTile(
  mesh: boolean[][],
  nearRow?: number,
  rowRange: number = 6,
): [number, number] {
  ensureWalkableIndex(mesh)
  if (!_walkableAll || _walkableAll.length === 0) return [0, 0]

  if (nearRow !== undefined) {
    const rMin = Math.max(0, nearRow - rowRange)
    const rMax = Math.min(mesh.length - 1, nearRow + rowRange)
    const nearby = _walkableAll.filter(([, r]) => r >= rMin && r <= rMax)
    if (nearby.length > 0) {
      return nearby[Math.floor(Math.random() * nearby.length)]
    }
  }

  return _walkableAll[Math.floor(Math.random() * _walkableAll.length)]
}
