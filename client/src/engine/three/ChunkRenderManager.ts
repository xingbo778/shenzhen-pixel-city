import * as THREE from 'three'
import { TILE_SIZE } from '@/engine/three/ThreeScene'
import { buildTileGrid3D, type TileGrid3DHandle } from '@/engine/three/TileGrid3D'
import { buildBuildings3D, type Buildings3DHandle } from '@/engine/three/Buildings3D'
import { buildStreetFurniture3D, type StreetFurniture3DHandle } from '@/engine/three/StreetFurniture3D'
import { buildVehicles3D, type Vehicles3DHandle } from '@/engine/three/Vehicles3D'
import { DEFAULT_CHUNK_SIZE, chunkToWorldOrigin } from '@/engine/world/coords'
import type { WorldChunk } from '@/engine/world/chunks'

export interface ChunkRenderHandle {
  chunkKey: string
  chunk: WorldChunk
  group: THREE.Group
  tileGrid: TileGrid3DHandle
  buildings: Buildings3DHandle | null
  furniture: StreetFurniture3DHandle | null
  vehicles: Vehicles3DHandle | null
  tick(dt: number): void
  updateLOD(camera: THREE.Camera): void
  dispose(): void
}

interface PendingChunkBuild {
  cancelled: boolean
}

interface ChunkTargetState {
  visibleChunks: WorldChunk[]
  warmChunks?: WorldChunk[]
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

  async setChunkTargets({ visibleChunks, warmChunks = visibleChunks }: ChunkTargetState): Promise<void> {
    const visibleKeys = new Set(visibleChunks.map(chunk => chunk.key))
    const retainedChunks = new Map<string, WorldChunk>()
    for (const chunk of warmChunks) retainedChunks.set(chunk.key, chunk)
    for (const chunk of visibleChunks) retainedChunks.set(chunk.key, chunk)
    const targetKeys = new Set(retainedChunks.keys())

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
        continue
      }
      handle.group.visible = visibleKeys.has(key)
    }

    await Promise.all(
      Array.from(retainedChunks.values()).map(async chunk => {
        if (this.handles.has(chunk.key) || this.pending.has(chunk.key)) return

        const pending: PendingChunkBuild = { cancelled: false }
        this.pending.set(chunk.key, pending)
        try {
          const handle = await buildChunkRenderHandle(chunk, this.chunkSize)
          if (pending.cancelled) {
            handle.dispose()
            return
          }
          handle.group.visible = visibleKeys.has(chunk.key)
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
      if (!handle.group.visible) continue
      handle.updateLOD(camera)
    }
  }

  tick(dt: number): void {
    for (const handle of Array.from(this.handles.values())) {
      if (!handle.group.visible) continue
      handle.tick(dt)
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
  const vehicleBudget = Math.max(6, Math.ceil((chunk.cols * chunk.rows) / 96))
  const vehicles = await buildVehicles3D(chunk.tiles, vehicleBudget)

  group.add(buildings.group)
  group.add(furniture.group)
  group.add(vehicles.group)

  return {
    chunkKey: chunk.key,
    chunk,
    group,
    tileGrid,
    buildings,
    furniture,
    vehicles,
    tick(dt: number) {
      vehicles.tick(dt)
    },
    updateLOD(camera: THREE.Camera) {
      buildings.updateLOD(camera)
    },
    dispose() {
      tileGrid.dispose()
      buildings.dispose()
      furniture.dispose()
      vehicles.dispose()
    },
  }
}
