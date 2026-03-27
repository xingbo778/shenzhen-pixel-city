/**
 * PixelCityMap3D — Three.js-powered city map.
 *
 * Rendering layers:
 *  1. TileGrid3D    — flat ground plane (PlaneGeometry per tile type, instanced)
 *  2. Buildings3D   — textured BoxGeometry buildings (AI-generated facade/roof textures)
 *  3. CharacterSprites3D — THREE.Sprite billboards (always face camera)
 *  4. CSS2DRenderer — emotion bubble DOM labels
 *
 * All existing game logic (pathfinding, A*, vehicles, activity mapping) is
 * reused unchanged from the 2D engine.
 */

import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import type { WorldState } from '@/types/world'
import { getDominantEmotion } from '@/types/world'
import { SCENE_META, SCENE_NAMES } from '@/config/scenes'
import { SCENE_CONFIGS } from '@/engine/sceneTiles'
import { buildNavMesh, randomWalkableTile, findPathChunked } from '@/engine/pathfinder'
import { createEntity, tickEntity, assignActivityPath } from '@/engine/gameEntity'
import type { GameEntity } from '@/engine/gameEntity'
import { useGameLoop } from '@/hooks/useGameLoop'

import { createThreeScene, setCameraTarget } from '@/engine/three/ThreeScene'
import type { ThreeSceneHandle }   from '@/engine/three/ThreeScene'
import { initBuildingTextureLoader, preloadBuildings } from '@/engine/three/Buildings3D'
import { clearFurnitureCache }  from '@/engine/three/StreetFurniture3D'
import {
  createCharacterSprites3D,
  createBubbleLabel,
  tickBubbleLabels,
} from '@/engine/three/CharacterSprites3D'
import type { CharacterSprites3DHandle, BubbleLabel } from '@/engine/three/CharacterSprites3D'
import { clearVehicleCache } from '@/engine/three/Vehicles3D'
import { ChunkRenderManager } from '@/engine/three/ChunkRenderManager'
import { sceneConfigToWorldChunks } from '@/engine/world/sceneChunks'
import { DEFAULT_CHUNK_SIZE, worldToChunk } from '@/engine/world/coords'
import { getChunkKeysInRadius, type WorldChunk } from '@/engine/world/chunks'
import { EntityChunkIndex } from '@/engine/world/entityChunks'
import CityPlanView from './CityPlanView'
import { Button } from '@/components/ui/button'
import { useMapDrag } from '@/hooks/useMapDrag'
import { pickBotAtCanvasPoint } from '@/components/pixelCity3DPicking'

// ── Constants ──────────────────────────────────────────────────────────
// Approximate game-loop tile size in CSS pixels (used for entity <-> world mapping)
const VIRTUAL_TILE_PX = 32
const CHUNK_RENDER_RADIUS = 1
const CHUNK_PRELOAD_RADIUS = 2
const ENTITY_SIMULATION_RADIUS = 1

interface Props {
  world: WorldState | null
  selectedBotId: string | null
  onBotClick: (botId: string) => void
  onLocationClick: (location: string) => void
  currentLocation?: string
}

type NavMeshCache = { loc: string; ped: boolean[][]; boat: boolean[][] } | null

export default function PixelCityMap3D({
  world, selectedBotId, onBotClick, onLocationClick, currentLocation,
}: Props) {
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null)

  // Three.js handles
  const threeRef      = useRef<ThreeSceneHandle | null>(null)
  const chunkRenderManagerRef = useRef<ChunkRenderManager | null>(null)
  const charRef       = useRef<CharacterSprites3DHandle | null>(null)
  const bubblesRef    = useRef<BubbleLabel[]>([])

  // Game logic refs (reused from PixelCityMap)
  const entitiesRef   = useRef<Record<string, GameEntity>>({})
  const navMeshRef    = useRef<NavMeshCache>(null)
  const sceneChunksRef = useRef<Map<string, WorldChunk>>(new Map())
  const chunkTargetSetRef = useRef<string>('')
  const entityChunkIndexRef = useRef(new EntityChunkIndex(DEFAULT_CHUNK_SIZE))

  const [viewMode, setViewMode] = useState<'3d' | 'plan'>('3d')

  const activeLocation = currentLocation || SCENE_NAMES[0]
  const meta           = SCENE_META[activeLocation] || SCENE_META['南山科技园']
  const sceneConfig    = SCENE_CONFIGS[activeLocation]

  // Camera pan / zoom (extracted hook)
  const {
    containerRef, zoomRef, panColRef, panRowRef,
    handleMouseDown, handleMouseMove, handleMouseUp, handleWheel,
    resetCamera,
  } = useMapDrag(sceneConfig)

  const upsertEntityChunk = useCallback((entity: GameEntity) => {
    entityChunkIndexRef.current.upsert(entity)
  }, [])

  const removeEntityChunk = useCallback((entityId: string) => {
    entityChunkIndexRef.current.remove(entityId)
  }, [])

  const getActiveEntityIds = useCallback((col: number, row: number) => {
    const centerChunk = worldToChunk(Math.floor(col), Math.floor(row), DEFAULT_CHUNK_SIZE)
    return new Set(entityChunkIndexRef.current.getIdsInRadius(
      centerChunk.cx,
      centerChunk.cy,
      ENTITY_SIMULATION_RADIUS,
    ))
  }, [])

  const updateVisibleChunks = useCallback((col: number, row: number) => {
    const manager = chunkRenderManagerRef.current
    if (!manager || sceneChunksRef.current.size === 0) return

    const centerChunk = worldToChunk(Math.floor(col), Math.floor(row), DEFAULT_CHUNK_SIZE)
    const visibleKeys = getChunkKeysInRadius(centerChunk, CHUNK_RENDER_RADIUS)
      .filter(key => sceneChunksRef.current.has(key))
      .sort()
    const warmKeys = getChunkKeysInRadius(centerChunk, CHUNK_PRELOAD_RADIUS)
      .filter(key => sceneChunksRef.current.has(key))
      .sort()
    const nextKey = `${visibleKeys.join('|')}::${warmKeys.join('|')}`
    if (nextKey === chunkTargetSetRef.current) return
    chunkTargetSetRef.current = nextKey
    const visibleChunks = visibleKeys
      .map(key => sceneChunksRef.current.get(key))
      .filter((chunk): chunk is WorldChunk => !!chunk)
    const warmChunks = warmKeys
      .map(key => sceneChunksRef.current.get(key))
      .filter((chunk): chunk is WorldChunk => !!chunk)
    void manager.setChunkTargets({ visibleChunks, warmChunks })
  }, [])

  // ── Nav mesh (recompute when location changes) ─────────────────────
  const navMesh = useMemo(() => {
    if (!sceneConfig) return null
    return {
      loc:  activeLocation,
      ped:  buildNavMesh(sceneConfig.tilemap, 'pedestrian'),
      boat: buildNavMesh(sceneConfig.tilemap, 'boat'),
    }
  }, [activeLocation, sceneConfig])
  useEffect(() => { navMeshRef.current = navMesh }, [navMesh])

  // ── Three.js scene init ────────────────────────────────────────────
  useEffect(() => {
    const canvas    = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const three = createThreeScene(canvas, container)
    initBuildingTextureLoader(three.renderer)
    threeRef.current = three

    const w = container.clientWidth
    const h = container.clientHeight
    three.resize(w, h)

    return () => {
      chunkRenderManagerRef.current?.dispose()
      chunkRenderManagerRef.current = null
      three.dispose()
      threeRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- containerRef is a stable ref object from useMapDrag

  // ── Rebuild chunked world renderables on location change ───────────
  useEffect(() => {
    if (!threeRef.current || !sceneConfig) return
    const { scene } = threeRef.current

    chunkRenderManagerRef.current?.dispose()
    chunkRenderManagerRef.current = null
    clearFurnitureCache()
    clearVehicleCache()

    // Create sprites handle if needed
    if (!charRef.current) {
      charRef.current = createCharacterSprites3D()
      scene.add(charRef.current.group)
    }

    const manager = new ChunkRenderManager(scene)
    chunkRenderManagerRef.current = manager

    const allKeys = sceneConfig.objects.map(o => o.pngKey).filter((k): k is string => !!k)
    const keys = Array.from(new Set(allKeys))
    preloadBuildings(keys)

    // Reset camera to map centre
    resetCamera(sceneConfig.cols, sceneConfig.rows)
    sceneChunksRef.current = sceneConfigToWorldChunks(sceneConfig)
    chunkTargetSetRef.current = ''
    updateVisibleChunks(panColRef.current, panRowRef.current)

    // Reset entities for new location
    entitiesRef.current = {}
    entityChunkIndexRef.current.clear()
    demoSpawnedRef.current = false

    return () => {
      sceneChunksRef.current = new Map()
      chunkTargetSetRef.current = ''
      if (chunkRenderManagerRef.current === manager) {
        chunkRenderManagerRef.current.dispose()
        chunkRenderManagerRef.current = null
      }
    }
  }, [activeLocation, updateVisibleChunks])   // eslint-disable-line react-hooks/exhaustive-deps

  // ── Entity sync (real bots + demo fallback) ─────────────────────────
  const demoSpawnedRef = useRef(false)

  useEffect(() => {
    if (!sceneConfig || !navMeshRef.current) return
    const tilemap = sceneConfig.tilemap
    const navMesh = navMeshRef.current.ped
    const rows    = tilemap.length

    // Real bots from world engine
    if (world) {
      const aliveBotIds = Object.keys(world.bots).filter(id => world.bots[id].status === 'alive')

      aliveBotIds.forEach(botId => {
        const bot = world.bots[botId]
        if (!bot) return

        if (!entitiesRef.current[botId]) {
          const spawn  = randomWalkableTile(navMesh, Math.floor(rows * 0.5))
          const entity = createEntity(botId, spawn[0], spawn[1], VIRTUAL_TILE_PX)
          assignActivityPath(entity, bot.current_activity || bot.occupation || '', tilemap, navMesh)
          entitiesRef.current[botId] = entity
          upsertEntityChunk(entity)
        } else {
          const entity   = entitiesRef.current[botId]
          const activity = bot.current_activity || bot.occupation || ''
          if (entity.activity !== activity || entity.pathIdx >= entity.path.length) {
            assignActivityPath(entity, activity, tilemap, navMesh)
          }
        }

        if (Math.random() < 0.006) {
          const emotion = getDominantEmotion(bot.emotions)
          const entity  = entitiesRef.current[botId]
          if (entity && threeRef.current) {
            const label  = createBubbleLabel(emotion.emoji)
            threeRef.current.scene.add(label)
            bubblesRef.current.push({ id: botId, obj: label, timer: 2.5, alpha: 1 })
          }
        }
      })

      Object.keys(entitiesRef.current).forEach(id => {
        if (!aliveBotIds.includes(id)) {
          delete entitiesRef.current[id]
          removeEntityChunk(id)
        }
      })
    }

    // Demo fallback: spawn wandering NPCs when no world data
    if (!world && !demoSpawnedRef.current) {
      demoSpawnedRef.current = true
      const DEMO_COUNT = 30
      const occupations = ['walk_around', '散步', '逛街', 'work', 'rest', 'exercise']
      for (let i = 0; i < DEMO_COUNT; i++) {
        const demoId = `demo_${i}`
        // Spread across the map
        const targetRow = Math.floor(rows * (0.1 + (i / DEMO_COUNT) * 0.8))
        const spawn = randomWalkableTile(navMesh, targetRow, 15)
        const entity = createEntity(demoId, spawn[0], spawn[1], VIRTUAL_TILE_PX)
        entity.activity = occupations[i % occupations.length]
        // Use nearby destination (rowRange=20) to keep A* fast
        const dest = randomWalkableTile(navMesh, spawn[1], 20)
        const path = findPathChunked(navMesh, [spawn[0], spawn[1]], dest)
        if (path.length > 1) {
          entity.path = path
          entity.pathIdx = 1
        }
        entitiesRef.current[demoId] = entity
        upsertEntityChunk(entity)
      }
    }
  }, [world, activeLocation, sceneConfig, removeEntityChunk, upsertEntityChunk])

  // ── Resize handler ────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      threeRef.current?.resize(width, height)
    })
    obs.observe(container)
    return () => obs.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- containerRef is a stable ref object from useMapDrag

  // ── Game + render loop ────────────────────────────────────────────
  useGameLoop((dt) => {
    const three      = threeRef.current
    const sc         = sceneConfig
    const navMesh    = navMeshRef.current?.ped
    if (!three || !sc) return
    const col  = Math.max(0, Math.min(sc.cols - 1, panColRef.current))
    const row  = Math.max(0, Math.min(sc.rows - 1, panRowRef.current))
    const activeEntityIds = getActiveEntityIds(col, row)
    const activeEntities: Record<string, GameEntity> = {}

    // Tick entities — throttle A* to max 2 per frame to avoid hitching
    let pathsThisFrame = 0
    Object.entries(entitiesRef.current).forEach(([botId, entity]) => {
      if (!activeEntityIds.has(botId)) return
      activeEntities[botId] = entity
      tickEntity(entity, dt, VIRTUAL_TILE_PX)
      upsertEntityChunk(entity)

      if (entity.pathIdx >= entity.path.length && navMesh && pathsThisFrame < 2) {
        pathsThisFrame++
        if (botId.startsWith('demo_')) {
          const dest = randomWalkableTile(navMesh, entity.row, 25)
          const path = findPathChunked(navMesh, [entity.col, entity.row], dest)
          if (path.length > 1) {
            entity.path = path
            entity.pathIdx = 1
          }
        } else {
          const bot      = world?.bots[botId]
          const activity = bot?.current_activity || bot?.occupation || ''
          assignActivityPath(entity, activity, sc.tilemap, navMesh)
        }
      }
    })

    // Tick 3D vehicles + building LOD
    chunkRenderManagerRef.current?.tick(dt)
    chunkRenderManagerRef.current?.updateLOD(three.camera)

    // Bubble labels
    bubblesRef.current = tickBubbleLabels(
      bubblesRef.current,
      activeEntities,
      VIRTUAL_TILE_PX,
      dt,
      three.scene,
    )

    // Sync character sprites
    charRef.current?.sync(activeEntities, world, VIRTUAL_TILE_PX, selectedBotId, three.camera)

    // Update camera
    updateVisibleChunks(col, row)
    setCameraTarget(three.camera, col, row, zoomRef.current)

    three.render()
  })

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    pointerDownRef.current = { x: e.clientX, y: e.clientY }
    handleMouseDown(e)
  }, [handleMouseDown])

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const down = pointerDownRef.current
    pointerDownRef.current = null
    handleMouseUp()

    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) return

    const canvas = canvasRef.current
    const camera = threeRef.current?.camera
    if (!canvas || !camera) return

    const botId = pickBotAtCanvasPoint(
      e.clientX,
      e.clientY,
      canvas,
      camera,
      entitiesRef.current,
      VIRTUAL_TILE_PX,
    )
    if (botId) onBotClick(botId)
  }, [handleMouseUp, onBotClick])

  const handleCanvasMouseLeave = useCallback(() => {
    pointerDownRef.current = null
    handleMouseUp()
  }, [handleMouseUp])

  return (
    <div
      ref={containerRef}
      data-testid="scene-map-container"
      className="relative w-full h-full"
      style={{ background: '#0d1117' }}
    >
      {viewMode === 'plan' && sceneConfig ? (
        <CityPlanView sceneConfig={sceneConfig} />
      ) : (
        <canvas
          ref={canvasRef}
          data-testid="scene-3d-canvas"
          className="w-full h-full"
          style={{
            cursor: 'grab',
            display: 'block',
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseLeave}
          onWheel={handleWheel}
        />
      )}

      {/* View mode toggle */}
      <div className="absolute top-3 left-3 flex gap-1">
        <Button
          data-testid="scene-view-3d"
          onClick={() => setViewMode('3d')}
          variant={viewMode === '3d' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 px-2.5 text-xs font-mono backdrop-blur-sm"
        >
          3D
        </Button>
        <Button
          data-testid="scene-view-plan"
          onClick={() => setViewMode('plan')}
          variant={viewMode === 'plan' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 px-2.5 text-xs font-mono backdrop-blur-sm"
        >
          俯视图
        </Button>
      </div>

      {/* Location selector */}
      <div
        className="absolute bottom-3 left-0 right-0 flex gap-1.5 justify-center overflow-x-auto px-2 pb-0.5"
        style={{ scrollbarWidth: 'none' }}
      >
        {SCENE_NAMES.map(loc => (
          <Button
            key={loc}
            onClick={() => onLocationClick(loc)}
            variant={loc === activeLocation ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2.5 text-xs font-mono backdrop-blur-sm"
            style={loc === activeLocation ? {
              background:  meta.ambientColor + '33',
              borderColor: meta.ambientColor + 'AA',
              color:       meta.ambientColor,
            } : {}}
          >
            {loc}
          </Button>
        ))}
      </div>

      {viewMode === '3d' && (
        <div className="absolute top-3 right-3 text-xs text-muted-foreground backdrop-blur-sm bg-black/20 px-2.5 py-1 rounded-md pointer-events-none">
          拖拽平移 · 滚轮缩放 · 3D
        </div>
      )}
    </div>
  )
}
