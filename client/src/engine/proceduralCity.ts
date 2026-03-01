/**
 * Procedural city generator v2 — block-based layout for 福田CBD.
 *
 * Strategy:
 *  1. Lay a road grid with jittered spacing → rectangular city blocks
 *  2. Classify blocks into zones (CBD / commercial / residential / park / plaza)
 *  3. Fill each block with buildings arranged in rows, with gaps and courtyards
 *  4. Place street furniture in structured patterns
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
  'cbd_building', 'cbd_building_v1', 'cbd_building_v2',
]
const RESIDENTIAL_KEYS = [
  'apartment_block', 'apartment_block_v1', 'apartment_block_v2',
  'village_building', 'village_building_v1', 'village_building_v2',
]
const COMMERCIAL_KEYS = [
  'shop_building', 'shop_building_v1', 'shop_building_v2',
]

export interface ProceduralCityResult {
  cols: number
  rows: number
  tilemap: TileType[][]
  objects: SceneObject[]
}

type BlockZone = 'cbd' | 'commercial' | 'residential' | 'park' | 'plaza'

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

  // ── helpers ────────────────────────────────────────────────────────
  function fill(x: number, y: number, w: number, h: number, t: TileType) {
    for (let r = y; r < y + h; r++)
      for (let c = x; c < x + w; c++)
        if (r >= 0 && r < rows && c >= 0 && c < cols) grid[r][c] = t
  }
  function isRoad(t: TileType) {
    return t === 'road_h' || t === 'road_v' || t === 'road_cross'
  }

  // ══════════════════════════════════════════════════════════════════
  // 1. ROAD GRID
  // ══════════════════════════════════════════════════════════════════

  // Generate jittered road positions for a more organic feel.
  // Main roads: ~20-26 tile spacing, 3 tiles wide.
  // Secondary roads: subdivide any gap > 16 tiles, 1 tile wide.

  function generateRoadPositions(total: number, baseSpacing: number): { main: number[]; all: number[] } {
    const main: number[] = []
    const count = Math.max(2, Math.floor(total / baseSpacing))
    const spacing = total / (count + 1)
    for (let i = 1; i <= count; i++) {
      const jitter = Math.round((rng() - 0.5) * spacing * 0.15)
      const pos = Math.round(spacing * i) + jitter
      main.push(Math.max(4, Math.min(total - 5, pos)))
    }
    // Subdivide large gaps
    const all = [...main]
    const sorted = [0, ...main, total].sort((a, b) => a - b)
    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = sorted[i + 1] - sorted[i]
      if (gap > 16) {
        const jitter = Math.round((rng() - 0.5) * 2)
        all.push(Math.round((sorted[i] + sorted[i + 1]) / 2) + jitter)
      }
    }
    all.sort((a, b) => a - b)
    return { main, all }
  }

  const hRoadsData = generateRoadPositions(rows, 22)
  const vRoadsData = generateRoadPositions(cols, 26)
  const hRoads = hRoadsData.main
  const vRoads = vRoadsData.main
  const allHRoads = hRoadsData.all
  const allVRoads = vRoadsData.all

  // Paint roads: main = halfW 1 (3 tiles), secondary = halfW 0 (1 tile)
  for (const ry of allHRoads) {
    const isMain = hRoads.includes(ry)
    const hw = isMain ? 1 : 0
    // Sidewalks
    fill(0, ry - hw - 1, cols, 1, 'sidewalk')
    fill(0, ry + hw + 1, cols, 1, 'sidewalk')
    // Road
    for (let rr = ry - hw; rr <= ry + hw; rr++) fill(0, rr, cols, 1, 'road_h')
  }
  for (const rx of allVRoads) {
    const isMain = vRoads.includes(rx)
    const hw = isMain ? 1 : 0
    fill(rx - hw - 1, 0, 1, rows, 'sidewalk')
    fill(rx + hw + 1, 0, 1, rows, 'sidewalk')
    for (let cc = rx - hw; cc <= rx + hw; cc++) fill(cc, 0, 1, rows, 'road_v')
  }

  // Mark crossings
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!isRoad(grid[r][c])) continue
      let hasH = false, hasV = false
      for (let d = -1; d <= 1; d++) {
        if (c + d >= 0 && c + d < cols && grid[r][c + d] === 'road_v') hasV = true
        if (r + d >= 0 && r + d < rows && grid[r + d]?.[c] === 'road_h') hasH = true
      }
      if (hasH && hasV) grid[r][c] = 'road_cross'
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // 2. IDENTIFY BLOCKS
  // ══════════════════════════════════════════════════════════════════

  const blocks: CityBlock[] = []
  const hBounds = [...new Set([0, ...allHRoads, rows])].sort((a, b) => a - b)
  const vBounds = [...new Set([0, ...allVRoads, cols])].sort((a, b) => a - b)

  for (let hi = 0; hi < hBounds.length - 1; hi++) {
    for (let vi = 0; vi < vBounds.length - 1; vi++) {
      // Scan inward from each edge to find the building interior
      const y0 = hBounds[hi], y1 = hBounds[hi + 1]
      const x0 = vBounds[vi], x1 = vBounds[vi + 1]

      let bx0 = x0, by0 = y0, bx1 = x1, by1 = y1
      // Scan top edge
      outer_top: for (let r = y0; r < y1; r++) {
        for (let c = x0; c < x1; c++) {
          if (grid[r][c] === 'building') { by0 = r; break outer_top }
        }
      }
      // Scan bottom edge
      outer_bot: for (let r = y1 - 1; r >= by0; r--) {
        for (let c = x0; c < x1; c++) {
          if (grid[r][c] === 'building') { by1 = r + 1; break outer_bot }
        }
      }
      // Scan left edge
      outer_left: for (let c = x0; c < x1; c++) {
        for (let r = by0; r < by1; r++) {
          if (grid[r][c] === 'building') { bx0 = c; break outer_left }
        }
      }
      // Scan right edge
      outer_right: for (let c = x1 - 1; c >= bx0; c--) {
        for (let r = by0; r < by1; r++) {
          if (grid[r][c] === 'building') { bx1 = c + 1; break outer_right }
        }
      }

      const w = bx1 - bx0, h = by1 - by0
      if (w >= 4 && h >= 4) {
        blocks.push({ x: bx0, y: by0, w, h, zone: 'residential' })
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // 3. ASSIGN ZONES
  // ══════════════════════════════════════════════════════════════════

  const cx = cols / 2, cy = rows / 2
  const maxDist = Math.sqrt(cx * cx + cy * cy)

  // Sort blocks by area descending so we can pick the biggest ones for parks
  const blocksByArea = [...blocks].sort((a, b) => b.w * b.h - a.w * a.h)
  const parkTarget = Math.max(3, Math.floor(blocks.length * 0.10))
  const plazaTarget = Math.max(2, Math.floor(blocks.length * 0.05))
  let parkN = 0, plazaN = 0
  const parkSet = new Set<CityBlock>()
  const plazaSet = new Set<CityBlock>()

  // Pick parks: prefer larger blocks in outer areas
  for (const b of blocksByArea) {
    if (parkN >= parkTarget) break
    const d = Math.sqrt(((b.x + b.w / 2) - cx) ** 2 + ((b.y + b.h / 2) - cy) ** 2) / maxDist
    if (d > 0.25 && b.w * b.h >= 50 && rng() < 0.5) {
      b.zone = 'park'; parkSet.add(b); parkN++
    }
  }
  // Pick plazas: prefer center
  for (const b of blocksByArea) {
    if (plazaN >= plazaTarget) break
    if (parkSet.has(b)) continue
    const d = Math.sqrt(((b.x + b.w / 2) - cx) ** 2 + ((b.y + b.h / 2) - cy) ** 2) / maxDist
    if (d < 0.4 && b.w * b.h >= 30 && rng() < 0.4) {
      b.zone = 'plaza'; plazaSet.add(b); plazaN++
    }
  }

  // Assign building zones
  for (const b of blocks) {
    if (parkSet.has(b) || plazaSet.has(b)) continue
    const d = Math.sqrt(((b.x + b.w / 2) - cx) ** 2 + ((b.y + b.h / 2) - cy) ** 2) / maxDist
    if (d < 0.22) b.zone = 'cbd'
    else if (d < 0.40) b.zone = rng() < 0.55 ? 'commercial' : 'residential'
    else b.zone = rng() < 0.18 ? 'commercial' : 'residential'
  }

  // ══════════════════════════════════════════════════════════════════
  // 4. FILL BLOCKS
  // ══════════════════════════════════════════════════════════════════

  const placed = Array.from({ length: rows }, () => new Uint8Array(cols))

  for (const block of blocks) {
    switch (block.zone) {
      case 'park':  fillPark(block); break
      case 'plaza': fillPlaza(block); break
      default:      fillBuildings(block); break
    }
  }

  // ── Park ────────────────────────────────────────────────────────
  function fillPark(b: CityBlock) {
    // Fill with grass
    for (let r = b.y; r < b.y + b.h; r++)
      for (let c = b.x; c < b.x + b.w; c++)
        if (grid[r][c] === 'building') grid[r][c] = rng() > 0.35 ? 'grass' : 'grass_lush'

    // Cross paths
    const mr = b.y + Math.floor(b.h / 2)
    const mc = b.x + Math.floor(b.w / 2)
    fill(b.x, mr, b.w, 1, 'park_path')
    fill(mc, b.y, 1, b.h, 'park_path')

    // Trees in grid (every 4 tiles)
    for (let r = b.y + 1; r < b.y + b.h - 1; r += 4)
      for (let c = b.x + 1; c < b.x + b.w - 1; c += 4)
        if (grid[r][c] === 'grass' || grid[r][c] === 'grass_lush')
          objects.push({ sprite: DUMMY, pngKey: rng() > 0.5 ? 'palm_tree' : 'street_tree', col: c, row: r, scale: 1.3 + rng() * 0.5 })

    // Benches along paths
    for (let c = b.x + 2; c < b.x + b.w - 2; c += 5)
      if ((grid[mr + 1]?.[c] === 'grass' || grid[mr + 1]?.[c] === 'grass_lush'))
        objects.push({ sprite: DUMMY, pngKey: 'bench', col: c, row: mr + 1, scale: 1.2 })

    // Fountain
    if (b.w > 6 && b.h > 6)
      objects.push({ sprite: DUMMY, pngKey: 'fountain', col: mc, row: mr, scale: 1.5 })
  }

  // ── Plaza ───────────────────────────────────────────────────────
  function fillPlaza(b: CityBlock) {
    for (let r = b.y; r < b.y + b.h; r++)
      for (let c = b.x; c < b.x + b.w; c++)
        if (grid[r][c] === 'building') grid[r][c] = 'tile_plaza'

    // Edge trees
    for (let c = b.x + 1; c < b.x + b.w - 1; c += 4) {
      objects.push({ sprite: DUMMY, pngKey: 'palm_tree', col: c, row: b.y + 1, scale: 1.4 })
      if (b.h > 5)
        objects.push({ sprite: DUMMY, pngKey: 'palm_tree', col: c, row: b.y + b.h - 2, scale: 1.4 })
    }
    // Center feature
    const mc = b.x + Math.floor(b.w / 2), mr = b.y + Math.floor(b.h / 2)
    objects.push({ sprite: DUMMY, pngKey: rng() > 0.5 ? 'fountain' : 'billboard', col: mc, row: mr, scale: 1.6 })
  }

  // ── Buildings ───────────────────────────────────────────────────
  function fillBuildings(b: CityBlock) {
    // 1-tile sidewalk margin inside the block
    for (let r = b.y; r < b.y + b.h; r++)
      for (let c = b.x; c < b.x + b.w; c++)
        if (r === b.y || r === b.y + b.h - 1 || c === b.x || c === b.x + b.w - 1)
          if (grid[r][c] === 'building') grid[r][c] = 'sidewalk'

    const ix = b.x + 1, iy = b.y + 1
    const iw = b.w - 2, ih = b.h - 2
    if (iw < 2 || ih < 2) return

    // For large residential blocks, add an alley through the middle
    if (b.zone === 'residential' && iw > 8 && ih > 8) {
      const alleyR = iy + Math.floor(ih / 2)
      fill(ix, alleyR, iw, 1, 'alley')
    }

    // Building sizes by zone
    const sizes = b.zone === 'cbd'
      ? { ws: [3, 4, 5], hs: [3, 4, 5] }
      : b.zone === 'commercial'
        ? { ws: [2, 3, 4], hs: [2, 3] }
        : { ws: [2, 3], hs: [2, 3, 4] }

    // Place buildings row by row
    let curR = iy
    while (curR + 2 <= iy + ih) {
      const bh = sizes.hs[Math.floor(rng() * sizes.hs.length)]
      if (curR + bh > iy + ih) break

      let curC = ix
      while (curC + 2 <= ix + iw) {
        const bw = sizes.ws[Math.floor(rng() * sizes.ws.length)]
        if (curC + bw > ix + iw) break

        // Skip ~15% for courtyards
        if (rng() < 0.15) {
          for (let r = curR; r < curR + bh; r++)
            for (let c = curC; c < curC + bw; c++)
              if (grid[r]?.[c] === 'building') grid[r][c] = 'concrete'
          curC += bw + 1
          continue
        }

        // Check all tiles available
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
            scale: heightScale(key),
            tileW: bw, tileH: bh,
          })
        }
        curC += bw + 1
      }
      curR += bh + 1
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

  function heightScale(key: string): number {
    if (key.startsWith('office_tower')) return 1.5 + rng() * 1.5
    if (key.startsWith('cbd_building')) return 1.2 + rng() * 1.0
    if (key.startsWith('apartment')) return 0.8 + rng() * 0.6
    if (key.startsWith('village')) return 0.6 + rng() * 0.5
    return 0.5 + rng() * 0.4
  }

  // ══════════════════════════════════════════════════════════════════
  // 5. CLEANUP leftover 'building' tiles
  // ══════════════════════════════════════════════════════════════════

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== 'building' || placed[r][c]) continue
      let nearRoad = false
      for (let d = -2; d <= 2 && !nearRoad; d++)
        for (let e = -2; e <= 2 && !nearRoad; e++) {
          const nr = r + d, nc = c + e
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && (isRoad(grid[nr][nc]) || grid[nr][nc] === 'sidewalk'))
            nearRoad = true
        }
      grid[r][c] = nearRoad ? (rng() > 0.5 ? 'concrete' : 'sidewalk') : (rng() > 0.4 ? 'grass' : 'grass_lush')
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // 6. STREET FURNITURE
  // ══════════════════════════════════════════════════════════════════

  // Street trees: every 8 tiles on sidewalks adjacent to roads
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

  // Traffic lights: only at main road crossings, max 1 per corner
  for (const ry of hRoads) {
    for (const rx of vRoads) {
      // Place up to 2 traffic lights per intersection (diagonal corners)
      for (const [dr, dc] of [[-2, -2], [2, 2]] as const) {
        const tr = ry + dr, tc = rx + dc
        if (tr >= 0 && tr < rows && tc >= 0 && tc < cols && grid[tr]?.[tc] === 'sidewalk')
          objects.push({ sprite: DUMMY, pngKey: 'traffic_light', col: tc, row: tr, scale: 1.5 })
      }
    }
  }

  // Street lamps along main roads every 10 tiles
  for (const ry of hRoads)
    for (let c = 5; c < cols - 5; c += 10) {
      const lr = ry - 2
      if (lr >= 0 && lr < rows && grid[lr]?.[c] === 'sidewalk')
        objects.push({ sprite: DUMMY, pngKey: 'street_lamp', col: c, row: lr, scale: 1.4 })
    }
  for (const rx of vRoads)
    for (let r = 5; r < rows - 5; r += 10) {
      const lc = rx - 2
      if (lc >= 0 && lc < cols && grid[r]?.[lc] === 'sidewalk')
        objects.push({ sprite: DUMMY, pngKey: 'street_lamp', col: lc, row: r, scale: 1.4 })
    }

  // Bus stops along main horizontal roads
  for (const ry of hRoads)
    for (let c = 15; c < cols - 15; c += 25 + Math.floor(rng() * 10)) {
      const br = ry + 2
      if (br < rows && grid[br]?.[c] === 'sidewalk')
        objects.push({ sprite: DUMMY, pngKey: 'bus_stop', col: c, row: br, scale: 1.5 })
    }

  // Metro entrances at major intersections
  let metroN = 0
  for (const ry of hRoads) {
    for (const rx of vRoads) {
      if (metroN >= 8) break
      const mr = ry + 2, mc = rx + 2
      if (mr < rows && mc < cols && grid[mr]?.[mc] === 'sidewalk') {
        objects.push({ sprite: DUMMY, pngKey: 'metro_entrance', col: mc, row: mr, scale: 1.5 })
        metroN++
      }
    }
  }

  // Sparse small furniture
  for (let r = 0; r < rows; r += 3)
    for (let c = 0; c < cols; c += 3) {
      if (grid[r][c] !== 'sidewalk') continue
      const roll = rng()
      if (roll < 0.015) objects.push({ sprite: DUMMY, pngKey: 'trash_bin', col: c, row: r, scale: 1.0 })
      else if (roll < 0.025) objects.push({ sprite: DUMMY, pngKey: 'fire_hydrant', col: c, row: r, scale: 1.0 })
      else if (roll < 0.03) objects.push({ sprite: DUMMY, pngKey: 'mailbox', col: c, row: r, scale: 1.0 })
      else if (roll < 0.033) objects.push({ sprite: DUMMY, pngKey: 'bollard', col: c, row: r, scale: 0.8 })
    }

  // Green area extras (sparse — only check every 4th tile)
  for (let r = 0; r < rows; r += 2)
    for (let c = 0; c < cols; c += 2) {
      const t = grid[r][c]
      if ((t === 'grass' || t === 'grass_lush') && rng() < 0.06)
        objects.push({ sprite: DUMMY, pngKey: rng() > 0.5 ? 'street_tree' : 'palm_tree', col: c, row: r, scale: 1.2 + rng() * 0.6 })
      if ((t === 'grass' || t === 'grass_lush') && rng() < 0.01)
        objects.push({ sprite: DUMMY, pngKey: 'flower_bed', col: c, row: r, scale: 1.0 })
    }

  return { cols, rows, tilemap: grid, objects }
}
