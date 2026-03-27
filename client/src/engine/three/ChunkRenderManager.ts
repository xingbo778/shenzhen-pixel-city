import * as THREE from 'three'
import { TILE_SIZE } from '@/engine/three/ThreeScene'
import { buildTileGrid3D, type TileGrid3DHandle } from '@/engine/three/TileGrid3D'
import { buildBuildings3D, type Buildings3DHandle } from '@/engine/three/Buildings3D'
import { buildStreetFurniture3D, type StreetFurniture3DHandle } from '@/engine/three/StreetFurniture3D'
import { DEFAULT_CHUNK_SIZE, chunkToWorldOrigin } from '@/engine/world/coords'
import type { WorldChunk } from '@/engine/world/chunks'

export interface ChunkRenderHandle {
  chunkKey: string
  chunk: WorldChunk
  group: THREE.Group
  tileGrid: TileGrid3DHandle
  buildings: Buildings3DHandle | null
  furniture: StreetFurniture3DHandle | null
  updateLOD(camera: THREE.Camera): void
  dispose(): void
}

interface PendingChunkBuild {
  cancelled: boolean
}

export class ChunkRenderManager {
  private readonly scene: THREE.Scene
  private readonly chunkSize: number
  private readonly handles = new Map<string, ChunkRenderHandle>()
  private readonly pending = new Map<string, PendingChunkBuild>()

  constructor(scene: THREE.Scene, chunkSize = DEFAULT_CHUNK_SIZE) {
    this.scene = scene
    this.chunkSize = chunkSize
  }

  getLoadedChunkKeys(): string[] {
    return Array.from(this.handles.keys()).sort()
  }

  getHandle(chunkKey: string): ChunkRenderHandle | undefined {
    return this.handles.get(chunkKey)
  }

  async setVisibleChunks(chunks: WorldChunk[]): Promise<void> {
    const targetKeys = new Set(chunks.map(chunk => chunk.key))

    for (const [key, pending] of Array.from(this.pending.entries())) {
      if (!targetKeys.has(key)) {
        pending.cancelled = true
        this.pending.delete(key)
      }
    }

    for (const [key, handle] of Array.from(this.handles.entries())) {
      if (!targetKeys.has(key)) {
        this.scene.remove(handle.group)
        handle.dispose()
        this.handles.delete(key)
      }
    }

    await Promise.all(
      chunks.map(async chunk => {
        if (this.handles.has(chunk.key) || this.pending.has(chunk.key)) return

        const pending: PendingChunkBuild = { cancelled: false }
        this.pending.set(chunk.key, pending)
        try {
          const handle = await buildChunkRenderHandle(chunk, this.chunkSize)
          if (pending.cancelled) {
            handle.dispose()
            return
          }
          this.scene.add(handle.group)
          this.handles.set(chunk.key, handle)
        } finally {
          this.pending.delete(chunk.key)
        }
      }),
    )
  }

  updateLOD(camera: THREE.Camera): void {
    for (const handle of Array.from(this.handles.values())) {
      handle.updateLOD(camera)
    }
  }

  dispose(): void {
    for (const pending of Array.from(this.pending.values())) {
      pending.cancelled = true
    }
    this.pending.clear()

    for (const handle of Array.from(this.handles.values())) {
      this.scene.remove(handle.group)
      handle.dispose()
    }
    this.handles.clear()
  }
}

export async function buildChunkRenderHandle(
  chunk: WorldChunk,
  chunkSize = DEFAULT_CHUNK_SIZE,
): Promise<ChunkRenderHandle> {
  const group = new THREE.Group()
  const origin = chunkToWorldOrigin(chunk.cx, chunk.cy, chunkSize)
  group.position.set(origin.wx * TILE_SIZE, 0, origin.wy * TILE_SIZE)
  group.name = `chunk:${chunk.key}`

  const tileGrid = buildTileGrid3D(chunk.tiles)
  group.add(tileGrid.group)

  const [buildings, furniture] = await Promise.all([
    buildBuildings3D(chunk.objects),
    buildStreetFurniture3D(chunk.objects),
  ])

  group.add(buildings.group)
  group.add(furniture.group)

  return {
    chunkKey: chunk.key,
    chunk,
    group,
    tileGrid,
    buildings,
    furniture,
    updateLOD(camera: THREE.Camera) {
      buildings.updateLOD(camera)
    },
    dispose() {
      tileGrid.dispose()
      buildings.dispose()
      furniture.dispose()
    },
  }
}
