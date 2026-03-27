# Large World Migration Blueprint

## Goal

Evolve the current scene-based city renderer into a chunked streaming world that can support:

- maps roughly 100x larger than today
- eventual infinite expansion via procedural chunk generation
- bounded client memory, GPU usage, and simulation cost

This document is intentionally implementation-oriented. It defines the target runtime model, data contracts, and the migration order for this repository.

## Current Constraints

The current architecture is built around a single active scene:

- one `activeLocation`
- one full `sceneConfig`
- one full `tilemap`
- one full nav mesh per scene
- one-time rebuild of tile grid / buildings / furniture / vehicles on scene switch

This works for a small number of handcrafted maps, but it does not scale to a world that is 100x larger because:

- geometry creation scales with total map area
- pathfinding scales with full scene grids
- entity sync assumes one bounded scene
- data loading assumes full-scene payloads
- caches are organized around scene lifetime, not view lifetime

## Target Runtime Model

The new world model should be:

- world-space first
- chunk streamed
- view-relative
- simulation LOD based

Core rule:

Only the chunks near the camera should exist on the client as live renderable state.

## World Coordinates

Introduce three coordinate layers:

```ts
type TileCoord = { tx: number; ty: number }
type ChunkCoord = { cx: number; cy: number }
type WorldCoord = { wx: number; wy: number }
```

Definitions:

- `wx/wy`: absolute tile coordinates in the whole world
- `cx/cy`: chunk coordinate
- `tx/ty`: local tile coordinate inside one chunk

Recommended chunk sizing:

- start with `64x64` tiles per chunk
- if object density becomes high, evaluate `48x48`
- avoid `>128x128` because chunk rebuild cost starts to spike

Helper functions:

```ts
const CHUNK_SIZE = 64

function worldToChunk(wx: number, wy: number): ChunkCoord
function worldToLocal(wx: number, wy: number): TileCoord
function chunkToWorldOrigin(cx: number, cy: number): WorldCoord
function chunkKey(cx: number, cy: number): string
```

## Chunk Data Model

Replace full-scene config with chunk payloads.

```ts
type ChunkKey = string

interface WorldChunk {
  key: ChunkKey
  cx: number
  cy: number
  seed: number
  tiles: number[][]
  objects: SceneObject[]
  roads?: RoadSegment[]
  water?: WaterMask
  navMeta?: ChunkNavMeta
  revision: number
}
```

Rules:

- chunk payloads must be independent and serializable
- neighboring chunks may share edge metadata, but no chunk should require the full map to render
- all objects should store world-space placement or chunk-local placement plus chunk origin

## Client World Store

Replace the current single-scene runtime with a chunk store.

```ts
interface VisibleWorldState {
  centerChunk: ChunkCoord
  loadedChunks: Map<ChunkKey, WorldChunk>
  activeChunks: Set<ChunkKey>
  pendingChunks: Set<ChunkKey>
  failedChunks: Map<ChunkKey, Error>
}
```

Recommended visibility radii:

- render radius: `2` chunks
- preload radius: `3` chunks
- simulation radius: `2` chunks
- high-fidelity simulation radius: `1` chunk

This means the client keeps:

- inner ring: full render + full simulation
- middle ring: render + low-frequency simulation
- outer ring: preload only

## Rendering Lifecycle

All 3D subsystems should become chunk-scoped.

Target lifecycle:

1. Camera moves
2. Visible chunk set is recomputed
3. Missing chunks are requested/generated
4. New chunk render handles are built incrementally
5. Out-of-range chunks are detached and disposed

Suggested runtime shape:

```ts
interface ChunkRenderHandle {
  chunkKey: string
  tileGrid?: TileGrid3DHandle
  buildings?: Buildings3DHandle
  furniture?: StreetFurniture3DHandle
  vehicles?: Vehicles3DHandle
  group: THREE.Group
  dispose(): void
}
```

Important:

- one `THREE.Group` per chunk
- add/remove whole chunk groups from scene graph
- avoid full scene rebuild on camera movement
- create object pools for reusable meshes where possible

## Subsystem Changes

### Tile Grid

Current:

- one tile grid per scene

Target:

- one tile grid per chunk
- instanced by tile type inside chunk
- frustum cull at chunk level first, then rely on GPU

Likely file impact:

- `client/src/engine/three/TileGrid3D.ts`
- `client/src/components/PixelCityMap3D.tsx`

### Buildings

Current:

- full-scene `buildBuildings3D(sceneConfig.objects)`

Target:

- `buildBuildingsChunk3D(chunk.objects, chunkOrigin)`
- normal buildings remain template-driven
- landmarks become rare world objects, not assumed per scene

Likely file impact:

- `client/src/engine/three/Buildings3D.ts`
- `client/src/engine/sceneTiles.ts`

### Street Furniture

Target:

- chunk-local build and disposal
- instance repeated assets per chunk
- move away from scene-global assumptions

Likely file impact:

- `client/src/engine/three/StreetFurniture3D.ts`

### Characters

Target:

- sync only entities in active simulation chunks
- chunk membership updated from world position
- offscreen entities downgraded in simulation precision

Likely file impact:

- `client/src/engine/three/CharacterSprites3D.ts`
- `client/src/components/PixelCityMap3D.tsx`
- `client/src/engine/gameEntity.ts`

### Vehicles

Target:

- ambient vehicles generated per chunk road graph
- long lanes can span chunk edges through edge connectors
- avoid scene-specific lane tables

Likely file impact:

- `client/src/engine/vehicleSystem.ts`
- `client/src/engine/three/Vehicles3D.ts`

## Pathfinding Strategy

Full-map A* should not remain the default.

Target is hierarchical pathfinding:

### Layer 1: Intra-chunk

- standard A* inside one chunk
- cheap and synchronous

### Layer 2: Inter-chunk routing

- route through chunk portals or road graph
- coarse graph nodes are chunk exits / connectors / station nodes

### Layer 3: Long-distance travel

- asynchronous
- may be server-authoritative
- can resolve to waypoints, not full tile-by-tile paths

Suggested interfaces:

```ts
interface PortalNode {
  id: string
  cx: number
  cy: number
  wx: number
  wy: number
}

function findLocalPath(chunk: WorldChunk, from: TileCoord, to: TileCoord): Path
function findChunkRoute(from: ChunkCoord, to: ChunkCoord): ChunkCoord[]
function findWorldPath(from: WorldCoord, to: WorldCoord): Promise<PathPlan>
```

Likely file impact:

- `client/src/engine/pathfinder.ts`

## Simulation LOD

Simulation must become distance-aware.

### LOD 0: Full

- visible bots
- per-frame movement
- animation
- exact path following

### LOD 1: Near

- lower tick rate
- path updates throttled
- reduced collision / interaction checks

### LOD 2: Far

- summary state only
- coarse movement progress
- no animation state

### LOD 3: Dormant

- represented by schedule / destination / ETA only

Suggested entity model:

```ts
type SimulationLOD = 0 | 1 | 2 | 3

interface WorldEntityState {
  id: string
  wx: number
  wy: number
  lod: SimulationLOD
  activity: string
  destination?: WorldCoord
  etaMs?: number
}
```

## Data Transport

`useWorldData` should move away from whole-world payloads.

Target transport model:

- request chunk snapshots by key
- subscribe to chunk deltas near player/camera
- fetch global summaries separately

Split APIs:

```ts
GET /world/chunks?keys=cx,cy;cx,cy
GET /world/entities?center=cx,cy&radius=2
GET /world/summary
WS  /world/stream
```

Client should separately manage:

- chunk geometry data
- local entity states
- global UI summaries like news, weather, macro metrics

## Infinite World Extension

Once chunk streaming is stable, infinite expansion becomes a generation problem, not a renderer problem.

Target generation model:

- deterministic chunk seed from `(cx, cy)`
- layered generators:
  - biome / district
  - road skeleton
  - parcel layout
  - building/furniture population
  - special landmark overrides

```ts
function generateChunk(cx: number, cy: number, worldSeed: number): WorldChunk
```

Rules:

- same `(cx, cy, seed)` must generate identical results
- hand-authored zones can override generated output
- important narrative locations should be registered in a separate landmark index

## Migration Phases

### Phase 1: Coordinate and Data Foundations

Deliverables:

- add chunk/world coordinate utilities
- define `WorldChunk`
- stop assuming scene-local coordinates in new code

Primary files:

- new: `client/src/engine/world/chunks.ts`
- new: `client/src/engine/world/coords.ts`
- update: `client/src/engine/sceneTiles.ts`

### Phase 2: Chunked Rendering

Deliverables:

- chunk render manager
- chunk-scoped tile/building/furniture handles
- camera-driven load/unload

Primary files:

- `client/src/components/PixelCityMap3D.tsx`
- `client/src/engine/three/TileGrid3D.ts`
- `client/src/engine/three/Buildings3D.ts`
- `client/src/engine/three/StreetFurniture3D.ts`

### Phase 3: Chunked Simulation

Deliverables:

- entity chunk indexing
- simulation LOD
- local-only high-frequency updates

Primary files:

- `client/src/engine/gameEntity.ts`
- `client/src/components/PixelCityMap3D.tsx`
- `client/src/engine/three/CharacterSprites3D.ts`
- `client/src/engine/vehicleSystem.ts`

### Phase 4: Hierarchical Pathfinding

Deliverables:

- chunk portal graph
- local path + world route split
- long-distance async path planning

Primary files:

- `client/src/engine/pathfinder.ts`

### Phase 5: Server Streaming

Deliverables:

- chunk-based APIs
- local delta stream
- split summary vs local state payloads

Primary files:

- `client/src/hooks/useWorldData.ts`
- server transport layer

### Phase 6: Procedural Infinite World

Deliverables:

- deterministic chunk generator
- region rules
- override registry for handcrafted landmarks

## Recommended First Implementation Slice

Do not begin with procedural generation.

Best first slice:

1. keep current handcrafted scenes as chunk content
2. introduce chunk coordinates over a finite large map
3. render only nearby chunks
4. keep one camera and one world scene
5. delay server protocol changes until chunk rendering is stable

This minimizes risk because it preserves art assets and gameplay while replacing the scaling bottleneck.

## Concrete Repo Tasks

Suggested execution order for this repository:

1. Add `coords.ts` and `chunks.ts`
2. Introduce `ChunkKey`, `WorldChunk`, and chunk math tests
3. Add `ChunkRenderHandle` and `ChunkRenderManager`
4. Refactor `PixelCityMap3D.tsx` to consume visible chunk sets instead of one `sceneConfig`
5. Split `buildTileGrid3D` into chunk-local builder
6. Split `buildBuildings3D` into chunk-local builder
7. Move vehicle lanes off scene tables and onto chunk road metadata
8. Add entity indexing by chunk
9. Add simulation LOD
10. Replace full-scene pathfinding with chunk-local + portal routing

## Non-Goals For The First Migration

Avoid mixing these into the first chunk migration:

- multiplayer authority changes
- fully infinite generation
- complex persistence for every chunk
- detailed economy simulation refactors
- shader-heavy visual redesign

Those are separate projects. The first job is to change the world topology and lifetime model.
