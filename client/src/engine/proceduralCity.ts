/**
 * Procedural city generator v3 — modelled after real 福田CBD layout.
 *
 * Geography (north → south):
 *   莲花山公园 → 红荔路 → 市民中心 → 福华路 → 购物公园/写字楼群 → 深南大道 → 会展中心 → 滨河大道
 *
 * Major N-S roads (west → east):
 *   彩田路 → 金田路 → 益田路(中轴) → 民田路 → 新洲路
 *
 * The generator paints named roads first, then fills zones between them
 * with appropriate buildings, parks, and plazas.
 */

import type { TileType, SceneObject } from './sceneTiles'
import type { SpriteData } from './spriteSystem'

const DUMMY: SpriteData = [['#888']]

function createRng(seed: number) {
  let s = seed | 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >> 17
    s ^= s << 5
    return ((s >>> 0) / 0xFFFFFFFF)
  }
}

const CBD_KEYS = [
  'office_tower', 'office_tower_v1', 'office_tower_v2',
  'office_tower_v3', 'office_tower_v4', 'office_tower_v5',
  'cbd_building', 'cbd_building_v1', 'cbd_building_v2',
  'cbd_building_v3', 'cbd_building_v4', 'cbd_building_v5',
]
const RESIDENTIAL_KEYS = [
  'apartment_block', 'apartment_block_v1', 'apartment_block_v2',
  'apartment_block_v3', 'apartment_block_v4',
  'village_building', 'village_building_v1', 'village_building_v2',
  'village_building_v3',
]
const COMMERCIAL_KEYS = [
  'shop_building', 'shop_building_v1', 'shop_building_v2',
  'shop_building_v3',
]

export interface ProceduralCityResult {
  cols: number
  rows: number
  tilemap: TileType[][]
  objects: SceneObject[]
  roadLabels: RoadLabel[]
  landmarkLabels: LandmarkLabel[]
}

export interface RoadLabel {
  name: string
  col: number
  row: number
  direction: 'h' | 'v'
}

export interface LandmarkLabel {
  name: string
  col: number
  row: number
  w: number
  h: number
}

type BlockZone = 'cbd' | 'commercial' | 'residential' | 'park' | 'plaza' | 'civic'

interface CityBlock {
  x: number; y: number; w: number; h: number
  zone: BlockZone
}

export function generateCity(
  cols: number,
  rows: number,
  seed = 42,
): ProceduralCityResult {
  const rng = createRng(seed)
  const grid: TileType[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 'building' as TileType),
  )
  const objects: SceneObject[] = []
  const roadLabels: RoadLabel[] = []
  const landmarkLabels: LandmarkLabel[] = []

  function set(c: number, r: number, t: TileType) {
    if (r >= 0 && r < rows && c >= 0 && c < cols) grid[r][c] = t
  }
  function fill(x: number, y: number, w: number, h: number, t: TileType) {
    for (let r = y; r < y + h; r++)
      for (let c = x; c < x + w; c++) set(c, r, t)
  }
  function isRoad(t: TileType) {
    return t === 'road_h' || t === 'road_v' || t === 'road_cross'
      || t === 'road_stop_h' || t === 'road_stop_v'
      || t.startsWith('road_cross_zebra')
  }

  // ══════════════════════════════════════════════════════════════════
  // 1. NAMED ROAD GRID — based on real Futian CBD
  // ══════════════════════════════════════════════════════════════════

  // Map proportions: cols=160, rows=100
  // North = row 0, South = row 99
  // West = col 0, East = col 159

  // ── East-West roads (row positions, north to south) ──
  const ROAD_HONGLI    = Math.round(rows * 0.12)  // 红荔路 (north boundary)
  const ROAD_FUHUA     = Math.round(rows * 0.38)  // 福华路 (mid-north)
  const ROAD_SHENNAN   = Math.round(rows * 0.58)  // 深南大道 (main axis, widest)
  const ROAD_BINHE     = Math.round(rows * 0.82)  // 滨河大道 (south)

  // ── North-South roads (col positions, west to east) ──
  const ROAD_CAITIAN   = Math.round(cols * 0.12)  // 彩田路
  const ROAD_JINTIAN   = Math.round(cols * 0.30)  // 金田路
  const ROAD_YITIAN    = Math.round(cols * 0.50)  // 益田路 (central axis)
  const ROAD_MINTIAN   = Math.round(cols * 0.68)  // 民田路
  const ROAD_XINZHOU   = Math.round(cols * 0.88)  // 新洲路

  // Road widths
  const MAIN_HW    = 2  // half-width for 深南大道 (5 tiles total)
  const MAJOR_HW   = 1  // half-width for 红荔/福华/滨河 (3 tiles)
  const NS_MAIN_HW = 1  // half-width for N-S roads (3 tiles)

  // Paint E-W roads
  interface HRoad { name: string; row: number; hw: number }
  const hRoads: HRoad[] = [
    { name: '红荔路',   row: ROAD_HONGLI,  hw: MAJOR_HW },
    { name: '福华路',   row: ROAD_FUHUA,   hw: MAJOR_HW },
    { name: '深南大道', row: ROAD_SHENNAN,  hw: MAIN_HW },
    { name: '滨河大道', row: ROAD_BINHE,    hw: MAJOR_HW },
  ]

  // Paint N-S roads
  interface VRoad { name: string; col: number; hw: number }
  const vRoads: VRoad[] = [
    { name: '彩田路', col: ROAD_CAITIAN, hw: NS_MAIN_HW },
    { name: '金田路', col: ROAD_JINTIAN, hw: NS_MAIN_HW },
    { name: '益田路', col: ROAD_YITIAN,  hw: NS_MAIN_HW },
    { name: '民田路', col: ROAD_MINTIAN, hw: NS_MAIN_HW },
    { name: '新洲路', col: ROAD_XINZHOU, hw: NS_MAIN_HW },
  ]

  // Secondary streets — only 1 per gap, and only if the gap is large (>20 tiles)
  // Real Futian CBD has large blocks; we don't want a fine grid
  const secondaryH: number[] = []
  const hGaps = [
    [0, ROAD_HONGLI],
    [ROAD_HONGLI, ROAD_FUHUA],
    [ROAD_FUHUA, ROAD_SHENNAN],
    [ROAD_SHENNAN, ROAD_BINHE],
    [ROAD_BINHE, rows],
  ]
  for (const [y0, y1] of hGaps) {
    const gap = y1 - y0
    if (gap > 20) {
      const ry = Math.round((y0 + y1) / 2 + (rng() - 0.5) * 3)
      if (ry > y0 + 5 && ry < y1 - 5) secondaryH.push(ry)
    }
  }

  const secondaryV: number[] = []
  const vGaps = [
    [0, ROAD_CAITIAN],
    [ROAD_CAITIAN, ROAD_JINTIAN],
    [ROAD_JINTIAN, ROAD_YITIAN],
    [ROAD_YITIAN, ROAD_MINTIAN],
    [ROAD_MINTIAN, ROAD_XINZHOU],
    [ROAD_XINZHOU, cols],
  ]
  for (const [x0, x1] of vGaps) {
    const gap = x1 - x0
    if (gap > 20) {
      const rx = Math.round((x0 + x1) / 2 + (rng() - 0.5) * 3)
      if (rx > x0 + 5 && rx < x1 - 5) secondaryV.push(rx)
    }
  }

  // ── STEP A: Paint ALL road surfaces first (no sidewalks yet) ──
  // This ensures roads never get overwritten by sidewalks at intersections.

  // Build a set of which rows/cols are road center-lines (for crossing detection)
  const hRoadRows = new Set<number>()
  const vRoadCols = new Set<number>()

  for (const rd of hRoads) {
    for (let rr = rd.row - rd.hw; rr <= rd.row + rd.hw; rr++) {
      fill(0, rr, cols, 1, 'road_h')
      hRoadRows.add(rr)
    }
    roadLabels.push({ name: rd.name, col: Math.round(cols * 0.5), row: rd.row, direction: 'h' })
  }
  for (const ry of secondaryH) {
    fill(0, ry, cols, 1, 'road_h')
    hRoadRows.add(ry)
  }

  for (const rd of vRoads) {
    for (let cc = rd.col - rd.hw; cc <= rd.col + rd.hw; cc++) {
      fill(cc, 0, 1, rows, 'road_v')
      vRoadCols.add(cc)
    }
    roadLabels.push({ name: rd.name, col: rd.col, row: Math.round(rows * 0.5), direction: 'v' })
  }
  for (const rx of secondaryV) {
    fill(rx, 0, 1, rows, 'road_v')
    vRoadCols.add(rx)
  }

  // ── STEP B: Mark crossings with proper zebra crosswalk placement ──
  // Real intersection layout (Shenzhen-style):
  //   - Center tiles: road_cross (clean asphalt)
  //   - Edge tiles adjacent to non-road: road_cross_zebra_* (crosswalk stripes)
  //   - Road tiles just before the intersection: road_stop_h/v (stop line)

  // First, mark all H∩V overlap tiles as road_cross
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (hRoadRows.has(r) && vRoadCols.has(c)) {
        grid[r][c] = 'road_cross'
      }
    }
  }

  // Second pass: convert edge crossing tiles to zebra variants
  // A crossing tile at the boundary of the intersection gets crosswalk stripes
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== 'road_cross') continue

      const above = r > 0 ? grid[r - 1][c] : 'building'
      const below = r < rows - 1 ? grid[r + 1][c] : 'building'
      const left  = c > 0 ? grid[r][c - 1] : 'building'
      const right = c < cols - 1 ? grid[r][c + 1] : 'building'

      // North edge: tile above is NOT part of the intersection
      if (above !== 'road_cross' && !above.startsWith('road_cross_zebra')) {
        grid[r][c] = 'road_cross_zebra_n'
        continue
      }
      if (below !== 'road_cross' && !below.startsWith('road_cross_zebra')) {
        grid[r][c] = 'road_cross_zebra_s'
        continue
      }
      if (left !== 'road_cross' && !left.startsWith('road_cross_zebra')) {
        grid[r][c] = 'road_cross_zebra_w'
        continue
      }
      if (right !== 'road_cross' && !right.startsWith('road_cross_zebra')) {
        grid[r][c] = 'road_cross_zebra_e'
        continue
      }
    }
  }

  // Third pass: place stop lines on road tiles just before intersections
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 'road_h') {
        // Check if the next tile to the right is a crossing
        if (c + 1 < cols && (grid[r][c + 1] === 'road_cross' || grid[r][c + 1]?.startsWith('road_cross_zebra'))) {
          grid[r][c] = 'road_stop_h'
        }
      } else if (grid[r][c] === 'road_v') {
        if (r + 1 < rows && (grid[r + 1][c] === 'road_cross' || grid[r + 1][c]?.startsWith('road_cross_zebra'))) {
          grid[r][c] = 'road_stop_v'
        }
      }
    }
  }

  // ── STEP C: Paint sidewalks only on tiles that are still 'building' ──
  // This way sidewalks never overwrite road surfaces or crossings.
  function setSidewalkIfBuilding(c: number, r: number) {
    if (r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] === 'building')
      grid[r][c] = 'sidewalk'
  }

  for (const rd of hRoads) {
    for (let c = 0; c < cols; c++) {
      setSidewalkIfBuilding(c, rd.row - rd.hw - 1)
      setSidewalkIfBuilding(c, rd.row + rd.hw + 1)
    }
  }
  for (const rd of vRoads) {
    for (let r = 0; r < rows; r++) {
      setSidewalkIfBuilding(rd.col - rd.hw - 1, r)
      setSidewalkIfBuilding(rd.col + rd.hw + 1, r)
    }
  }
  for (const ry of secondaryH) {
    for (let c = 0; c < cols; c++) {
      setSidewalkIfBuilding(c, ry - 1)
      setSidewalkIfBuilding(c, ry + 1)
    }
  }
  for (const rx of secondaryV) {
    for (let r = 0; r < rows; r++) {
      setSidewalkIfBuilding(rx - 1, r)
      setSidewalkIfBuilding(rx + 1, r)
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // 2. NAMED LANDMARKS — fill special zones
  // ══════════════════════════════════════════════════════════════════

  // 莲花山公园 — compact park north of 红荔路, between 金田路 and 益田路
  const lianhuaX = ROAD_JINTIAN + 3
  const lianhuaY = 2
  const lianhuaW = ROAD_YITIAN - ROAD_JINTIAN - 6
  const lianhuaH = Math.min(ROAD_HONGLI - 5, 8)
  if (lianhuaW > 4 && lianhuaH > 4) {
    fillParkZone(lianhuaX, lianhuaY, lianhuaW, lianhuaH)
    landmarkLabels.push({ name: '莲花山公园', col: lianhuaX, row: lianhuaY, w: lianhuaW, h: lianhuaH })
  }

  // 市民中心 — small civic plaza centered on 益田路, between 红荔路 and 福华路
  // Only occupies the center portion, surrounding blocks get buildings
  const civicW = 14, civicH = 10
  const civicX = ROAD_YITIAN - Math.floor(civicW / 2)
  const civicY = ROAD_HONGLI + 4
  if (civicX > 0 && civicY + civicH < ROAD_FUHUA) {
    fillCivicCenter(civicX, civicY, civicW, civicH)
    landmarkLabels.push({ name: '市民中心', col: civicX, row: civicY, w: civicW, h: civicH })
  }

  // 购物公园 — compact plaza between 福华路 and 深南大道
  const mallW = 10, mallH = 8
  const mallX = ROAD_YITIAN + 3
  const mallY = ROAD_FUHUA + 3
  if (mallX + mallW < ROAD_MINTIAN && mallY + mallH < ROAD_SHENNAN) {
    fillPlazaZone(mallX, mallY, mallW, mallH)
    landmarkLabels.push({ name: '购物公园', col: mallX, row: mallY, w: mallW, h: mallH })
  }

  // 会展中心 — compact expo hall between 深南大道 and 滨河大道
  const expoW = 18, expoH = 8
  const expoX = ROAD_YITIAN - Math.floor(expoW / 2)
  const expoY = ROAD_SHENNAN + 4
  if (expoX > ROAD_JINTIAN && expoY + expoH < ROAD_BINHE) {
    fillExpoCenter(expoX, expoY, expoW, expoH)
    landmarkLabels.push({ name: '会展中心', col: expoX, row: expoY, w: expoW, h: expoH })
  }

  // 中心公园 — narrow strip park west of 彩田路 (real 中心公园 is a narrow N-S strip)
  const cparkX = 2
  const cparkY = ROAD_HONGLI + 3
  const cparkW = Math.min(ROAD_CAITIAN - 4, 6)
  const cparkH = ROAD_SHENNAN - ROAD_HONGLI - 6
  if (cparkW > 3 && cparkH > 6) {
    fillCentralPark(cparkX, cparkY, cparkW, cparkH)
    landmarkLabels.push({ name: '中心公园', col: cparkX, row: cparkY, w: cparkW, h: cparkH })
  }

  // ══════════════════════════════════════════════════════════════════
  // 3. IDENTIFY REMAINING BLOCKS & FILL WITH BUILDINGS
  // ══════════════════════════════════════════════════════════════════

  const placed = Array.from({ length: rows }, () => new Uint8Array(cols))

  // Mark already-filled landmark/road/park tiles as placed
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (grid[r][c] !== 'building') placed[r][c] = 1

  // Flood-fill to find contiguous building regions
  const visited = Array.from({ length: rows }, () => new Uint8Array(cols))
  const blocks: CityBlock[] = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (visited[r][c] || grid[r][c] !== 'building') continue

      // BFS to find bounding box of this contiguous building region
      let minR = r, maxR = r, minC = c, maxC = c
      const queue: [number, number][] = [[r, c]]
      visited[r][c] = 1
      while (queue.length > 0) {
        const [qr, qc] = queue.shift()!
        if (qr < minR) minR = qr
        if (qr > maxR) maxR = qr
        if (qc < minC) minC = qc
        if (qc > maxC) maxC = qc
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const nr = qr + dr, nc = qc + dc
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc] && grid[nr][nc] === 'building') {
            visited[nr][nc] = 1
            queue.push([nr, nc])
          }
        }
      }

      const w = maxC - minC + 1, h = maxR - minR + 1
      if (w < 2 || h < 2) continue

      const cy = minR + h / 2

      let zone: BlockZone = 'residential'
      if (cy > ROAD_FUHUA && cy < ROAD_SHENNAN) {
        zone = rng() < 0.8 ? 'cbd' : 'commercial'
      } else if (Math.abs(cy - ROAD_SHENNAN) < 10) {
        zone = rng() < 0.6 ? 'cbd' : 'commercial'
      } else if (cy < ROAD_HONGLI) {
        zone = rng() < 0.3 ? 'commercial' : 'residential'
      } else if (cy > ROAD_BINHE) {
        zone = rng() < 0.2 ? 'commercial' : 'residential'
      } else if (cy > ROAD_HONGLI && cy < ROAD_FUHUA) {
        zone = rng() < 0.5 ? 'commercial' : (rng() < 0.5 ? 'cbd' : 'residential')
      } else {
        zone = rng() < 0.4 ? 'commercial' : 'residential'
      }

      blocks.push({ x: minC, y: minR, w, h, zone })
    }
  }

  // Fill each block with buildings
  for (const block of blocks) {
    fillBuildingBlock(block)
  }

  // ── Park zone filler ──────────────────────────────────────────────
  function fillParkZone(bx: number, by: number, bw: number, bh: number) {
    for (let r = by; r < by + bh; r++)
      for (let c = bx; c < bx + bw; c++)
        if (r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] === 'building')
          grid[r][c] = rng() > 0.3 ? 'grass' : 'grass_lush'

    // Cross paths
    const mr = by + Math.floor(bh / 2)
    const mc = bx + Math.floor(bw / 2)
    if (bw > 8) fill(bx + 1, mr, bw - 2, 1, 'park_path')
    if (bh > 8) fill(mc, by + 1, 1, bh - 2, 'park_path')

    // Trees
    for (let r = by + 1; r < by + bh - 1; r += 3)
      for (let c = bx + 1; c < bx + bw - 1; c += 3)
        if ((grid[r]?.[c] === 'grass' || grid[r]?.[c] === 'grass_lush') && rng() < 0.6)
          objects.push({ sprite: DUMMY, pngKey: rng() > 0.4 ? 'palm_tree' : 'street_tree', col: c, row: r, scale: 1.3 + rng() * 0.5 })

    // Benches along paths
    if (bw > 8)
      for (let c = bx + 2; c < bx + bw - 2; c += 5)
        if (mr + 1 < rows && (grid[mr + 1]?.[c] === 'grass' || grid[mr + 1]?.[c] === 'grass_lush'))
          objects.push({ sprite: DUMMY, pngKey: 'bench', col: c, row: mr + 1, scale: 1.2 })

    // Fountain at center
    if (bw > 8 && bh > 8)
      objects.push({ sprite: DUMMY, pngKey: 'fountain', col: mc, row: mr, scale: 1.5 })
  }

  // ── Central park filler (中心公园) — continuous green, no cross paths ──
  function fillCentralPark(bx: number, by: number, bw: number, bh: number) {
    for (let r = by; r < by + bh; r++)
      for (let c = bx; c < bx + bw; c++)
        if (r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] === 'building')
          grid[r][c] = rng() > 0.25 ? 'grass_lush' : 'grass'

    // Winding path along one edge only (not crossing the park)
    const pathC = bx + 1
    for (let r = by + 1; r < by + bh - 1; r++)
      if (r >= 0 && r < rows && pathC < cols) grid[r][pathC] = 'park_path'

    // Dense trees throughout (no grid pattern — organic placement)
    for (let r = by + 1; r < by + bh - 1; r += 2)
      for (let c = bx + 2; c < bx + bw - 1; c += 2)
        if ((grid[r]?.[c] === 'grass' || grid[r]?.[c] === 'grass_lush') && rng() < 0.45)
          objects.push({
            sprite: DUMMY,
            pngKey: rng() > 0.3 ? 'street_tree' : 'palm_tree',
            col: c, row: r,
            scale: 1.2 + rng() * 0.8,
          })

    // Benches along the path
    for (let r = by + 3; r < by + bh - 3; r += 6)
      if (pathC + 1 < cols)
        objects.push({ sprite: DUMMY, pngKey: 'bench', col: pathC + 1, row: r, scale: 1.2 })
  }

  // ── Civic center filler (市民中心) ─────────────────────────────────
  function fillCivicCenter(bx: number, by: number, bw: number, bh: number) {
    // Only the inner area becomes plaza, keep outer tiles as building for infill
    const pad = 1
    for (let r = by + pad; r < by + bh - pad; r++)
      for (let c = bx + pad; c < bx + bw - pad; c++)
        if (r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] === 'building')
          grid[r][c] = 'tile_plaza'

    // 市民中心 landmark building
    const cbw = Math.min(8, Math.floor(bw * 0.5))
    const cbh = Math.min(6, Math.floor(bh * 0.5))
    const cbx = bx + Math.floor((bw - cbw) / 2)
    const cby = by + Math.floor((bh - cbh) / 2)
    objects.push({
      sprite: DUMMY, pngKey: 'landmark_civic',
      col: cbx, row: cby, scale: 1.0,
      tileW: cbw, tileH: cbh,
    })

    // A few palm trees
    for (let c = bx + 2; c < bx + bw - 2; c += 5)
      objects.push({ sprite: DUMMY, pngKey: 'palm_tree', col: c, row: by + 1, scale: 1.5 })

    objects.push({ sprite: DUMMY, pngKey: 'fountain', col: bx + Math.floor(bw / 2), row: by + bh - 2, scale: 1.3 })
  }

  // ── Plaza zone filler (购物公园 etc.) ─────────────────────────────
  function fillPlazaZone(bx: number, by: number, bw: number, bh: number) {
    for (let r = by; r < by + bh; r++)
      for (let c = bx; c < bx + bw; c++)
        if (r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] === 'building')
          grid[r][c] = 'tile_plaza'

    // A few trees and a center feature
    for (let c = bx + 2; c < bx + bw - 2; c += 4)
      objects.push({ sprite: DUMMY, pngKey: 'palm_tree', col: c, row: by + 1, scale: 1.4 })
    const mc = bx + Math.floor(bw / 2), mr = by + Math.floor(bh / 2)
    objects.push({ sprite: DUMMY, pngKey: 'fountain', col: mc, row: mr, scale: 1.6 })
  }

  // ── Expo center filler (会展中心) ──────────────────────────────────
  function fillExpoCenter(bx: number, by: number, bw: number, bh: number) {
    // Compact plaza for the expo building only
    for (let r = by; r < by + bh; r++)
      for (let c = bx; c < bx + bw; c++)
        if (r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] === 'building')
          grid[r][c] = 'tile_plaza'

    // 会展中心 landmark building — fills most of the zone
    const ebw = Math.min(16, bw - 2)
    const ebh = Math.min(6, bh - 2)
    const ebx = bx + Math.floor((bw - ebw) / 2)
    const eby = by + Math.floor((bh - ebh) / 2)
    objects.push({
      sprite: DUMMY, pngKey: 'landmark_expo',
      col: ebx, row: eby, scale: 1.0,
      tileW: ebw, tileH: ebh,
    })
  }

  // ── Building block filler ─────────────────────────────────────────
  function fillBuildingBlock(b: CityBlock) {
    // Only add sidewalk margin on edges not already adjacent to road/sidewalk
    const ix = b.x, iy = b.y
    const iw = b.w, ih = b.h
    if (iw < 2 || ih < 2) return

    // Alley for larger residential blocks
    if (b.zone === 'residential' && iw > 10 && ih > 10) {
      const alleyR = iy + Math.floor(ih / 2)
      fill(ix, alleyR, iw, 1, 'alley')
    }

    const sizes = b.zone === 'cbd'
      ? { ws: [3, 4, 5, 6, 7], hs: [3, 4, 5, 6] }
      : b.zone === 'commercial'
        ? { ws: [3, 4, 5, 6], hs: [3, 4, 5] }
        : { ws: [2, 3, 4, 5], hs: [2, 3, 4] }

    let curR = iy
    while (curR + 2 <= iy + ih) {
      const bh = sizes.hs[Math.floor(rng() * sizes.hs.length)]
      if (curR + bh > iy + ih) break

      let curC = ix
      while (curC + 2 <= ix + iw) {
        const bw = sizes.ws[Math.floor(rng() * sizes.ws.length)]
        if (curC + bw > ix + iw) break

        // Courtyard gaps (rare in CBD, occasional elsewhere)
        const courtProb = b.zone === 'cbd' ? 0.03 : 0.08
        if (rng() < courtProb) {
          for (let r = curR; r < curR + bh; r++)
            for (let c = curC; c < curC + bw; c++)
              if (grid[r]?.[c] === 'building') grid[r][c] = 'concrete'
          curC += bw
          continue
        }

        let ok = true
        for (let r = curR; r < curR + bh && ok; r++)
          for (let c = curC; c < curC + bw && ok; c++)
            if (r >= rows || c >= cols || grid[r][c] !== 'building' || placed[r][c]) ok = false

        if (ok) {
          for (let r = curR; r < curR + bh; r++)
            for (let c = curC; c < curC + bw; c++)
              placed[r][c] = 1

          const key = pickKey(b.zone)
          objects.push({
            sprite: DUMMY, pngKey: key,
            col: curC, row: curR,
            scale: heightScale(key, b),
            tileW: bw, tileH: bh,
          })
        }
        curC += bw  // no gap between buildings (they share walls like real CBD)
      }
      curR += bh  // no gap between rows either
    }
  }

  function pickKey(zone: BlockZone): string {
    const r = rng()
    if (zone === 'cbd') {
      return r < 0.7 ? CBD_KEYS[Math.floor(rng() * CBD_KEYS.length)]
        : r < 0.85 ? COMMERCIAL_KEYS[Math.floor(rng() * COMMERCIAL_KEYS.length)]
          : RESIDENTIAL_KEYS[Math.floor(rng() * RESIDENTIAL_KEYS.length)]
    }
    if (zone === 'commercial') {
      return r < 0.15 ? CBD_KEYS[Math.floor(rng() * CBD_KEYS.length)]
        : r < 0.6 ? COMMERCIAL_KEYS[Math.floor(rng() * COMMERCIAL_KEYS.length)]
          : RESIDENTIAL_KEYS[Math.floor(rng() * RESIDENTIAL_KEYS.length)]
    }
    return r < 0.1 ? CBD_KEYS[Math.floor(rng() * CBD_KEYS.length)]
      : r < 0.25 ? COMMERCIAL_KEYS[Math.floor(rng() * COMMERCIAL_KEYS.length)]
        : RESIDENTIAL_KEYS[Math.floor(rng() * RESIDENTIAL_KEYS.length)]
  }

  function heightScale(key: string, b: CityBlock): number {
    const distToShennan = Math.abs((b.y + b.h / 2) - ROAD_SHENNAN)
    const nearShennan = distToShennan < 18
    const bonus = nearShennan ? 1.0 + (1 - distToShennan / 18) * 1.0 : 0
    // Larger footprint buildings get taller (realistic)
    const footprintBonus = Math.min(1.0, (b.w + b.h) / 20)

    if (key.startsWith('office_tower')) return 2.0 + rng() * 2.5 + bonus + footprintBonus
    if (key.startsWith('cbd_building')) return 1.5 + rng() * 1.5 + bonus + footprintBonus * 0.7
    if (key.startsWith('apartment')) return 1.0 + rng() * 1.0
    if (key.startsWith('shop')) return 0.5 + rng() * 0.5
    if (key.startsWith('village')) return 0.7 + rng() * 0.6
    return 0.5 + rng() * 0.5
  }

  // ══════════════════════════════════════════════════════════════════
  // 4. AGGRESSIVE INFILL — fill every remaining building tile
  // ══════════════════════════════════════════════════════════════════

  function canPlace(r: number, c: number, tw: number, th: number): boolean {
    for (let dr = 0; dr < th; dr++)
      for (let dc = 0; dc < tw; dc++) {
        const nr = r + dr, nc = c + dc
        if (nr >= rows || nc >= cols || grid[nr][nc] !== 'building' || placed[nr][nc]) return false
      }
    return true
  }
  function markPlaced(r: number, c: number, tw: number, th: number) {
    for (let dr = 0; dr < th; dr++)
      for (let dc = 0; dc < tw; dc++)
        placed[r + dr][c + dc] = 1
  }
  function pickInfillKey(r: number): string {
    const nearShennan = Math.abs(r - ROAD_SHENNAN) < 12
    if (nearShennan) return CBD_KEYS[Math.floor(rng() * CBD_KEYS.length)]
    const nearCore = r > ROAD_HONGLI && r < ROAD_BINHE
    if (nearCore && rng() < 0.5) return COMMERCIAL_KEYS[Math.floor(rng() * COMMERCIAL_KEYS.length)]
    return RESIDENTIAL_KEYS[Math.floor(rng() * RESIDENTIAL_KEYS.length)]
  }

  // Try sizes from large to small
  const infillSizes: [number, number][] = [[4, 4], [4, 3], [3, 4], [3, 3], [3, 2], [2, 3], [2, 2]]
  for (const [tw, th] of infillSizes) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!canPlace(r, c, tw, th)) continue
        markPlaced(r, c, tw, th)
        const key = pickInfillKey(r)
        const nearShennan = Math.abs(r - ROAD_SHENNAN) < 15
        objects.push({
          sprite: DUMMY, pngKey: key,
          col: c, row: r,
          scale: (nearShennan ? 1.0 : 0.5) + rng() * 1.0,
          tileW: tw, tileH: th,
        })
      }
    }
  }

  // Remaining single tiles become sidewalk (very few should be left)
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      if (grid[r][c] === 'building' && !placed[r][c])
        grid[r][c] = 'concrete'

  // ══════════════════════════════════════════════════════════════════
  // 5. STREET FURNITURE
  // ══════════════════════════════════════════════════════════════════

  // Street trees on sidewalks adjacent to roads
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== 'sidewalk') continue
      let adj = false
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const)
        if (r + dr >= 0 && r + dr < rows && c + dc >= 0 && c + dc < cols && isRoad(grid[r + dr][c + dc])) { adj = true; break }
      if (adj && (c + r) % 8 === 0)
        objects.push({ sprite: DUMMY, pngKey: rng() > 0.4 ? 'street_tree' : 'palm_tree', col: c, row: r, scale: 1.3 + rng() * 0.4 })
    }
  }

  // Traffic lights at major intersections
  const majorHRows = hRoads.map(r => r.row)
  const majorVCols = vRoads.map(r => r.col)
  for (const ry of majorHRows) {
    for (const rx of majorVCols) {
      for (const [dr, dc] of [[-2, -2], [2, 2]] as const) {
        const tr = ry + dr, tc = rx + dc
        if (tr >= 0 && tr < rows && tc >= 0 && tc < cols && grid[tr]?.[tc] === 'sidewalk')
          objects.push({ sprite: DUMMY, pngKey: 'traffic_light', col: tc, row: tr, scale: 1.5 })
      }
    }
  }

  // Street lamps along major roads
  for (const rd of hRoads)
    for (let c = 5; c < cols - 5; c += 10) {
      const lr = rd.row - rd.hw - 1
      if (lr >= 0 && lr < rows && grid[lr]?.[c] === 'sidewalk')
        objects.push({ sprite: DUMMY, pngKey: 'street_lamp', col: c, row: lr, scale: 1.4 })
    }
  for (const rd of vRoads)
    for (let r = 5; r < rows - 5; r += 10) {
      const lc = rd.col - rd.hw - 1
      if (lc >= 0 && lc < cols && grid[r]?.[lc] === 'sidewalk')
        objects.push({ sprite: DUMMY, pngKey: 'street_lamp', col: lc, row: r, scale: 1.4 })
    }

  // Bus stops along 深南大道
  for (let c = 15; c < cols - 15; c += 25 + Math.floor(rng() * 10)) {
    const br = ROAD_SHENNAN + MAIN_HW + 2
    if (br < rows && grid[br]?.[c] === 'sidewalk')
      objects.push({ sprite: DUMMY, pngKey: 'bus_stop', col: c, row: br, scale: 1.5 })
  }

  // Metro entrances at major intersections (up to 8)
  let metroN = 0
  for (const ry of majorHRows) {
    for (const rx of majorVCols) {
      if (metroN >= 8) break
      const mr = ry + 3, mc = rx + 3
      if (mr < rows && mc < cols && grid[mr]?.[mc] === 'sidewalk') {
        objects.push({ sprite: DUMMY, pngKey: 'metro_entrance', col: mc, row: mr, scale: 1.5 })
        metroN++
      }
    }
  }

  // Sparse small furniture on sidewalks
  for (let r = 0; r < rows; r += 3)
    for (let c = 0; c < cols; c += 3) {
      if (grid[r][c] !== 'sidewalk') continue
      const roll = rng()
      if (roll < 0.015) objects.push({ sprite: DUMMY, pngKey: 'trash_bin', col: c, row: r, scale: 1.0 })
      else if (roll < 0.025) objects.push({ sprite: DUMMY, pngKey: 'fire_hydrant', col: c, row: r, scale: 1.0 })
      else if (roll < 0.03) objects.push({ sprite: DUMMY, pngKey: 'mailbox', col: c, row: r, scale: 1.0 })
    }

  // Green area extras
  for (let r = 0; r < rows; r += 2)
    for (let c = 0; c < cols; c += 2) {
      const t = grid[r][c]
      if ((t === 'grass' || t === 'grass_lush') && rng() < 0.05)
        objects.push({ sprite: DUMMY, pngKey: rng() > 0.5 ? 'street_tree' : 'palm_tree', col: c, row: r, scale: 1.2 + rng() * 0.6 })
    }

  // ── Place 平安金融中心 (tallest building, near 益田路 & 深南大道) ──
  const pingAnCol = ROAD_YITIAN + 4
  const pingAnRow = ROAD_SHENNAN - 8
  if (pingAnCol + 5 < cols && pingAnRow >= 0 && pingAnRow + 6 < rows) {
    objects.push({
      sprite: DUMMY, pngKey: 'landmark_pingan',
      col: pingAnCol, row: pingAnRow, scale: 1.0,
      tileW: 5, tileH: 6,
    })
    landmarkLabels.push({ name: '平安金融中心', col: pingAnCol, row: pingAnRow, w: 5, h: 6 })
  }

  // ── Place 京基100 (second tallest, west of 益田路) ──
  const kk100Col = ROAD_CAITIAN + 4
  const kk100Row = ROAD_SHENNAN - 6
  if (kk100Col + 4 < cols && kk100Row >= 0 && kk100Row + 5 < rows) {
    objects.push({
      sprite: DUMMY, pngKey: 'landmark_kk100',
      col: kk100Col, row: kk100Row, scale: 1.0,
      tileW: 4, tileH: 5,
    })
    landmarkLabels.push({ name: '京基100', col: kk100Col, row: kk100Row, w: 4, h: 5 })
  }

  return { cols, rows, tilemap: grid, objects, roadLabels, landmarkLabels }
}
