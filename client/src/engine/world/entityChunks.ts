import type { GameEntity } from '@/engine/gameEntity'
import { DEFAULT_CHUNK_SIZE, chunkKey, worldToChunk } from './coords'

export class EntityChunkIndex {
  private readonly chunkSize: number
  private readonly chunkToIds = new Map<string, Set<string>>()
  private readonly entityToChunk = new Map<string, string>()

  constructor(chunkSize = DEFAULT_CHUNK_SIZE) {
    this.chunkSize = chunkSize
  }

  clear(): void {
    this.chunkToIds.clear()
    this.entityToChunk.clear()
  }

  upsert(entity: Pick<GameEntity, 'id' | 'col' | 'row'>): void {
    const { cx, cy } = worldToChunk(entity.col, entity.row, this.chunkSize)
    const nextKey = chunkKey(cx, cy)
    const prevKey = this.entityToChunk.get(entity.id)

    if (prevKey === nextKey) return

    if (prevKey) {
      const prevSet = this.chunkToIds.get(prevKey)
      if (prevSet) {
        prevSet.delete(entity.id)
        if (prevSet.size === 0) this.chunkToIds.delete(prevKey)
      }
    }

    let nextSet = this.chunkToIds.get(nextKey)
    if (!nextSet) {
      nextSet = new Set<string>()
      this.chunkToIds.set(nextKey, nextSet)
    }
    nextSet.add(entity.id)
    this.entityToChunk.set(entity.id, nextKey)
  }

  remove(entityId: string): void {
    const prevKey = this.entityToChunk.get(entityId)
    if (!prevKey) return
    const prevSet = this.chunkToIds.get(prevKey)
    if (prevSet) {
      prevSet.delete(entityId)
      if (prevSet.size === 0) this.chunkToIds.delete(prevKey)
    }
    this.entityToChunk.delete(entityId)
  }

  getChunkKeyForEntity(entityId: string): string | undefined {
    return this.entityToChunk.get(entityId)
  }

  getIdsInRadius(centerCx: number, centerCy: number, radius: number): string[] {
    const ids = new Set<string>()
    for (let cy = centerCy - radius; cy <= centerCy + radius; cy++) {
      for (let cx = centerCx - radius; cx <= centerCx + radius; cx++) {
        const set = this.chunkToIds.get(chunkKey(cx, cy))
        if (!set) continue
        Array.from(set).forEach(id => ids.add(id))
      }
    }
    return Array.from(ids)
  }

  getIdsForChunkKeys(keys: string[]): string[] {
    const ids = new Set<string>()
    keys.forEach((key) => {
      const set = this.chunkToIds.get(key)
      if (!set) return
      Array.from(set).forEach(id => ids.add(id))
    })
    return Array.from(ids)
  }
}
