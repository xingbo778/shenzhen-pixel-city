import type { SceneConfig } from '@/engine/sceneTiles'
import { DEFAULT_CHUNK_SIZE, type WorldCoord } from './coords'
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
