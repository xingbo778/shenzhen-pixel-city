import type { SceneObject, TileType } from '@/engine/sceneTiles'
import {
  type ChunkBounds,
  type ChunkCoord,
  type LocalTileCoord,
  type WorldCoord,
  DEFAULT_CHUNK_SIZE,
  chunkKey,
  chunkToWorldBounds,
  chunkToWorldOrigin,
  localToWorld,
  parseChunkKey,
  worldToChunk,
  worldToLocal,
} from './coords'

export interface ChunkDimensions {
  cols: number
  rows: number
}

export interface ChunkObject extends SceneObject {
  wx: number
  wy: number
  tx: number
  ty: number
  localCol: number
  localRow: number
}

export interface WorldChunk {
  key: string
  cx: number
  cy: number
  seed: number
  cols: number
  rows: number
  tiles: TileType[][]
  objects: ChunkObject[]
  revision: number
}

export interface ChunkSliceInput {
  tiles: TileType[][]
  objects?: SceneObject[]
  origin?: WorldCoord
  seed?: number
  revision?: number
  chunkSize?: number
}

export function isChunkCoordWithinRadius(
  center: ChunkCoord,
  target: ChunkCoord,
  radius: number,
): boolean {
  return Math.abs(center.cx - target.cx) <= radius && Math.abs(center.cy - target.cy) <= radius
}

export function getChunkCoordsInRadius(center: ChunkCoord, radius: number): ChunkCoord[] {
  const coords: ChunkCoord[] = []
  for (let cy = center.cy - radius; cy <= center.cy + radius; cy++) {
    for (let cx = center.cx - radius; cx <= center.cx + radius; cx++) {
      coords.push({ cx, cy })
    }
  }
  return coords
}

export function getChunkKeysInRadius(center: ChunkCoord, radius: number): string[] {
  return getChunkCoordsInRadius(center, radius).map(({ cx, cy }) => chunkKey(cx, cy))
}

export function getChunkBoundsByKey(key: string, chunkSize = DEFAULT_CHUNK_SIZE): ChunkBounds {
  const { cx, cy } = parseChunkKey(key)
  return chunkToWorldBounds(cx, cy, chunkSize)
}

export function getChunkDimensions(tiles: TileType[][]): ChunkDimensions {
  const rows = tiles.length
  const cols = tiles.reduce((max, row) => Math.max(max, row?.length ?? 0), 0)
  return { cols, rows }
}

export function getChunkSeed(cx: number, cy: number, worldSeed = 0): number {
  // Deterministic 32-bit hash suitable for chunk-local procedural generation.
  let hash = Math.imul(cx ^ 0x9e3779b9, 0x85ebca6b)
  hash = Math.imul(hash ^ cy ^ 0xc2b2ae35, 0x27d4eb2d)
  hash = Math.imul(hash ^ worldSeed, 0x165667b1)
  return (hash ^ (hash >>> 15)) >>> 0
}

export function sliceWorldIntoChunks({
  tiles,
  objects = [],
  origin = { wx: 0, wy: 0 },
  seed = 0,
  revision = 0,
  chunkSize = DEFAULT_CHUNK_SIZE,
}: ChunkSliceInput): Map<string, WorldChunk> {
  const chunks = new Map<string, WorldChunk>()
  const rows = tiles.length

  for (let row = 0; row < rows; row++) {
    const cols = tiles[row]?.length ?? 0
    for (let col = 0; col < cols; col++) {
      const wx = origin.wx + col
      const wy = origin.wy + row
      const { cx, cy } = worldToChunk(wx, wy, chunkSize)
      const { tx, ty } = worldToLocal(wx, wy, chunkSize)
      const key = chunkKey(cx, cy)
      const chunk = getOrCreateChunk(chunks, cx, cy, seed, revision, chunkSize)
      if (!chunk.tiles[ty]) {
        chunk.tiles[ty] = []
      }
      chunk.tiles[ty][tx] = tiles[row][col]
      chunk.cols = Math.max(chunk.cols, tx + 1)
      chunk.rows = Math.max(chunk.rows, ty + 1)
    }
  }

  for (const object of objects) {
    const wx = origin.wx + object.col
    const wy = origin.wy + object.row
    const { cx, cy } = worldToChunk(wx, wy, chunkSize)
    const { tx, ty } = worldToLocal(wx, wy, chunkSize)
    const chunk = getOrCreateChunk(chunks, cx, cy, seed, revision, chunkSize)
    chunk.objects.push({
      ...object,
      wx,
      wy,
      tx,
      ty,
      localCol: tx,
      localRow: ty,
      col: tx,
      row: ty,
    })
  }

  return chunks
}

export function getChunkOrigin(chunk: Pick<WorldChunk, 'cx' | 'cy'>, chunkSize = DEFAULT_CHUNK_SIZE): WorldCoord {
  return chunkToWorldOrigin(chunk.cx, chunk.cy, chunkSize)
}

export function getChunkLocalCoord(
  chunk: Pick<WorldChunk, 'cx' | 'cy'>,
  world: WorldCoord,
  chunkSize = DEFAULT_CHUNK_SIZE,
): LocalTileCoord {
  const coord = worldToChunk(world.wx, world.wy, chunkSize)
  if (coord.cx !== chunk.cx || coord.cy !== chunk.cy) {
    throw new Error(`World coord ${world.wx},${world.wy} is outside chunk ${chunk.cx},${chunk.cy}`)
  }
  return worldToLocal(world.wx, world.wy, chunkSize)
}

export function getChunkWorldCoord(
  chunk: Pick<WorldChunk, 'cx' | 'cy'>,
  local: LocalTileCoord,
  chunkSize = DEFAULT_CHUNK_SIZE,
): WorldCoord {
  return localToWorld(chunk.cx, chunk.cy, local.tx, local.ty, chunkSize)
}

function getOrCreateChunk(
  chunks: Map<string, WorldChunk>,
  cx: number,
  cy: number,
  seed: number,
  revision: number,
  chunkSize: number,
): WorldChunk {
  const key = chunkKey(cx, cy)
  const existing = chunks.get(key)
  if (existing) return existing

  const chunk: WorldChunk = {
    key,
    cx,
    cy,
    seed: getChunkSeed(cx, cy, seed),
    cols: 0,
    rows: 0,
    tiles: [],
    objects: [],
    revision,
  }
  chunks.set(key, chunk)
  return chunk
}
