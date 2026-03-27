export interface WorldCoord {
  wx: number
  wy: number
}

export interface ChunkCoord {
  cx: number
  cy: number
}

export interface LocalTileCoord {
  tx: number
  ty: number
}

export interface ChunkBounds {
  minWx: number
  minWy: number
  maxWx: number
  maxWy: number
}

export const DEFAULT_CHUNK_SIZE = 64

export function floorDiv(value: number, divisor: number): number {
  if (!Number.isInteger(value)) {
    throw new Error(`floorDiv expected an integer value, received ${value}`)
  }
  if (!Number.isInteger(divisor) || divisor <= 0) {
    throw new Error(`floorDiv expected a positive integer divisor, received ${divisor}`)
  }
  return Math.floor(value / divisor)
}

export function positiveModulo(value: number, divisor: number): number {
  if (!Number.isInteger(value)) {
    throw new Error(`positiveModulo expected an integer value, received ${value}`)
  }
  if (!Number.isInteger(divisor) || divisor <= 0) {
    throw new Error(`positiveModulo expected a positive integer divisor, received ${divisor}`)
  }
  return ((value % divisor) + divisor) % divisor
}

export function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`
}

export function parseChunkKey(key: string): ChunkCoord {
  const match = /^(-?\d+),(-?\d+)$/.exec(key)
  if (!match) {
    throw new Error(`Invalid chunk key: ${key}`)
  }
  return {
    cx: Number(match[1]),
    cy: Number(match[2]),
  }
}

export function worldToChunk(wx: number, wy: number, chunkSize = DEFAULT_CHUNK_SIZE): ChunkCoord {
  return {
    cx: floorDiv(wx, chunkSize),
    cy: floorDiv(wy, chunkSize),
  }
}

export function worldToLocal(wx: number, wy: number, chunkSize = DEFAULT_CHUNK_SIZE): LocalTileCoord {
  return {
    tx: positiveModulo(wx, chunkSize),
    ty: positiveModulo(wy, chunkSize),
  }
}

export function chunkToWorldOrigin(cx: number, cy: number, chunkSize = DEFAULT_CHUNK_SIZE): WorldCoord {
  return {
    wx: cx * chunkSize,
    wy: cy * chunkSize,
  }
}

export function chunkToWorldBounds(cx: number, cy: number, chunkSize = DEFAULT_CHUNK_SIZE): ChunkBounds {
  const origin = chunkToWorldOrigin(cx, cy, chunkSize)
  return {
    minWx: origin.wx,
    minWy: origin.wy,
    maxWx: origin.wx + chunkSize - 1,
    maxWy: origin.wy + chunkSize - 1,
  }
}

export function localToWorld(
  cx: number,
  cy: number,
  tx: number,
  ty: number,
  chunkSize = DEFAULT_CHUNK_SIZE,
): WorldCoord {
  if (!Number.isInteger(tx) || tx < 0 || tx >= chunkSize) {
    throw new Error(`localToWorld expected tx in [0, ${chunkSize}), received ${tx}`)
  }
  if (!Number.isInteger(ty) || ty < 0 || ty >= chunkSize) {
    throw new Error(`localToWorld expected ty in [0, ${chunkSize}), received ${ty}`)
  }

  const origin = chunkToWorldOrigin(cx, cy, chunkSize)
  return {
    wx: origin.wx + tx,
    wy: origin.wy + ty,
  }
}

export function toChunkKeyFromWorld(wx: number, wy: number, chunkSize = DEFAULT_CHUNK_SIZE): string {
  const { cx, cy } = worldToChunk(wx, wy, chunkSize)
  return chunkKey(cx, cy)
}
