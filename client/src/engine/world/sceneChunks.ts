import type { SceneConfig } from '@/engine/sceneTiles'
import { DEFAULT_CHUNK_SIZE, chunkKey, type WorldCoord, worldToChunk } from './coords'
import { type WorldChunk, sliceWorldIntoChunks } from './chunks'

export interface SceneChunkOptions {
  origin?: WorldCoord
  chunkSize?: number
  seed?: number
  revision?: number
}

export function sceneConfigToWorldChunks(
  sceneConfig: SceneConfig,
  {
    origin = { wx: 0, wy: 0 },
    chunkSize = DEFAULT_CHUNK_SIZE,
    seed = 0,
    revision = 0,
  }: SceneChunkOptions = {},
): Map<string, WorldChunk> {
  return sliceWorldIntoChunks({
    tiles: sceneConfig.tilemap,
    objects: sceneConfig.objects,
    origin,
    chunkSize,
    seed,
    revision,
  })
}

export interface WorldTileBounds {
  minCol: number
  maxCol: number
  minRow: number
  maxRow: number
}

export function getChunksIntersectingWorldBounds(
  chunks: Map<string, WorldChunk>,
  bounds: WorldTileBounds,
  chunkSize = DEFAULT_CHUNK_SIZE,
): WorldChunk[] {
  const minChunk = worldToChunk(bounds.minCol, bounds.minRow, chunkSize)
  const maxChunk = worldToChunk(bounds.maxCol, bounds.maxRow, chunkSize)
  const visibleChunks: WorldChunk[] = []

  for (let cy = minChunk.cy; cy <= maxChunk.cy; cy++) {
    for (let cx = minChunk.cx; cx <= maxChunk.cx; cx++) {
      const chunk = chunks.get(chunkKey(cx, cy))
      if (chunk) visibleChunks.push(chunk)
    }
  }

  return visibleChunks
}
