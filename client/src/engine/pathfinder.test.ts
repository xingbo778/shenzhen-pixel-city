import { describe, expect, test, beforeEach } from 'vitest'
import {
  findPath,
  findPathChunked,
  findPathInBounds,
  buildNavMesh,
  randomWalkableTile,
  clearPathCache,
} from '@/engine/pathfinder'

function createMesh(cols: number, rows: number, fill = false): boolean[][] {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => fill)
  )
}

function carvePath(mesh: boolean[][], points: Array<[number, number]>) {
  points.forEach(([col, row]) => {
    mesh[row][col] = true
  })
}

describe('pathfinder', () => {
  beforeEach(() => clearPathCache())

  // ── findPath basic ────────────────────────────────────────────

  test('returns empty array for unreachable target', () => {
    const mesh = createMesh(5, 5, false)
    mesh[0][0] = true
    mesh[4][4] = true
    // No path connects them
    expect(findPath(mesh, [0, 0], [4, 4])).toEqual([])
  })

  test('returns single-step path for adjacent tiles', () => {
    const mesh = createMesh(3, 3, true)
    const path = findPath(mesh, [0, 0], [1, 0])
    expect(path).toEqual([
      [0, 0],
      [1, 0],
    ])
  })

  test('returns empty for out-of-bounds start', () => {
    const mesh = createMesh(3, 3, true)
    expect(findPath(mesh, [-1, 0], [2, 2])).toEqual([])
  })

  test('returns empty for out-of-bounds target', () => {
    const mesh = createMesh(3, 3, true)
    expect(findPath(mesh, [0, 0], [5, 5])).toEqual([])
  })

  test('returns empty when target is not walkable', () => {
    const mesh = createMesh(3, 3, true)
    mesh[2][2] = false
    expect(findPath(mesh, [0, 0], [2, 2])).toEqual([])
  })

  test('finds shortest path on simple grid', () => {
    const mesh = createMesh(5, 5, true)
    const path = findPath(mesh, [0, 0], [4, 4])
    // Manhattan distance = 8, so path length = 9 (start + 8 steps)
    expect(path.length).toBe(9)
    expect(path[0]).toEqual([0, 0])
    expect(path[path.length - 1]).toEqual([4, 4])
  })

  test('navigates around obstacles', () => {
    const mesh = createMesh(5, 3, true)
    // Block the middle row except edges
    mesh[1][1] = false
    mesh[1][2] = false
    mesh[1][3] = false
    const path = findPath(mesh, [0, 0], [4, 2])
    expect(path.length).toBeGreaterThan(0)
    expect(path[path.length - 1]).toEqual([4, 2])
    // Path must not pass through walls
    path.forEach(([c, r]) => expect(mesh[r][c]).toBe(true))
  })

  test('finds long open-grid paths without tripping the safety cap', () => {
    const size = 400
    const mesh = createMesh(size, size, true)
    const path = findPath(mesh, [0, 0], [size - 1, size - 1])
    expect(path.length).toBe(size * 2 - 1)
    expect(path[0]).toEqual([0, 0])
    expect(path[path.length - 1]).toEqual([size - 1, size - 1])
  })

  test('returns empty for zero-size mesh', () => {
    expect(findPath([], [0, 0], [1, 1])).toEqual([])
  })

  // ── findPathInBounds ──────────────────────────────────────────

  test('findPathInBounds limits search to the provided rectangle', () => {
    const mesh = createMesh(7, 5, false)
    carvePath(mesh, [
      [1, 2],
      [1, 1],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [5, 0],
      [5, 1],
      [5, 2],
    ])

    expect(findPath(mesh, [1, 2], [5, 2]).length).toBeGreaterThan(0)
    expect(
      findPathInBounds(mesh, [1, 2], [5, 2], {
        minCol: 1,
        maxCol: 5,
        minRow: 1,
        maxRow: 4,
      })
    ).toEqual([])
  })

  // ── findPathChunked ───────────────────────────────────────────

  test('findPathChunked matches direct search on open multi-chunk routes', () => {
    const mesh = createMesh(12, 8, true)

    const direct = findPath(mesh, [0, 0], [11, 7])
    const chunked = findPathChunked(mesh, [0, 0], [11, 7], {
      chunkSize: 4,
    })

    expect(chunked).toEqual(direct)
    expect(chunked.length).toBe(19)
  })

  test('findPathChunked falls back to full-map search when chunk-route bounds miss a detour', () => {
    const mesh = createMesh(12, 8, false)

    carvePath(mesh, [
      [1, 5],
      [2, 5],
      [3, 5],
      [4, 5],
      [7, 5],
      [8, 5],
      [9, 5],
      [10, 5],
      [1, 4],
      [1, 3],
      [1, 2],
      [1, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [5, 1],
      [6, 1],
      [7, 1],
      [8, 1],
      [9, 1],
      [10, 1],
      [10, 2],
      [10, 3],
      [10, 4],
      [4, 4],
      [8, 4],
    ])

    expect(
      findPathInBounds(mesh, [1, 5], [10, 5], {
        minCol: 0,
        maxCol: 11,
        minRow: 4,
        maxRow: 7,
      })
    ).toEqual([])

    const chunked = findPathChunked(mesh, [1, 5], [10, 5], {
      chunkSize: 4,
    })
    const direct = findPath(mesh, [1, 5], [10, 5])

    expect(chunked).toEqual(direct)
    expect(chunked.length).toBeGreaterThan(0)
  })

  test('findPathChunked same-chunk search uses bounded A*', () => {
    const mesh = createMesh(8, 8, true)
    const path = findPathChunked(mesh, [1, 1], [3, 3], { chunkSize: 8 })
    expect(path.length).toBe(5) // Manhattan 4 + start
    expect(path[0]).toEqual([1, 1])
    expect(path[path.length - 1]).toEqual([3, 3])
  })

  // ── buildNavMesh ──────────────────────────────────────────────

  test('buildNavMesh marks pedestrian tiles correctly', () => {
    const tilemap = [
      ['road_h', 'building', 'sidewalk'],
      ['water', 'grass', 'road_v'],
    ] as const
    const mesh = buildNavMesh(tilemap as unknown as string[][], 'pedestrian')
    expect(mesh[0][0]).toBe(true) // road_h walkable
    expect(mesh[0][1]).toBe(false) // building not walkable
    expect(mesh[0][2]).toBe(true) // sidewalk walkable
    expect(mesh[1][0]).toBe(false) // water not walkable for pedestrian
    expect(mesh[1][1]).toBe(true) // grass walkable
    expect(mesh[1][2]).toBe(true) // road_v walkable
  })

  test('buildNavMesh marks boat tiles correctly', () => {
    const tilemap = [['water', 'road_h', 'water_edge']] as const
    const mesh = buildNavMesh(tilemap as unknown as string[][], 'boat')
    expect(mesh[0][0]).toBe(true) // water navigable
    expect(mesh[0][1]).toBe(false) // road not navigable for boat
    expect(mesh[0][2]).toBe(true) // water_edge navigable
  })

  test('buildNavMesh marks vehicle tiles correctly', () => {
    const tilemap = [['road_h', 'sidewalk', 'road_cross', 'grass']] as const
    const mesh = buildNavMesh(tilemap as unknown as string[][], 'vehicle')
    expect(mesh[0][0]).toBe(true) // road_h drivable
    expect(mesh[0][1]).toBe(false) // sidewalk not drivable
    expect(mesh[0][2]).toBe(true) // road_cross drivable
    expect(mesh[0][3]).toBe(false) // grass not drivable
  })

  // ── randomWalkableTile ────────────────────────────────────────

  test('randomWalkableTile returns a walkable tile', () => {
    const mesh = createMesh(10, 10, false)
    mesh[5][5] = true
    mesh[5][6] = true
    const tile = randomWalkableTile(mesh)
    expect(mesh[tile[1]][tile[0]]).toBe(true)
  })

  test('randomWalkableTile returns [0,0] on empty mesh', () => {
    const mesh = createMesh(5, 5, false)
    expect(randomWalkableTile(mesh)).toEqual([0, 0])
  })

  test('randomWalkableTile biases toward nearRow', () => {
    const mesh = createMesh(10, 20, true)
    // Repeated calls near row 15 should mostly return rows in range
    const results = Array.from({ length: 50 }, () =>
      randomWalkableTile(mesh, 15, 3)
    )
    const inRange = results.filter(([, r]) => r >= 12 && r <= 18)
    expect(inRange.length).toBeGreaterThan(40) // Most should be near
  })

  // ── clearPathCache ────────────────────────────────────────────

  test('clearPathCache does not throw', () => {
    expect(() => clearPathCache()).not.toThrow()
  })

  // ── iteration limit safety ────────────────────────────────────

  test('A* does not hang on a large disconnected mesh', () => {
    // Create a large mesh with start and end in disconnected islands
    const mesh = createMesh(300, 300, false)
    // Island 1: top-left corner
    for (let r = 0; r < 100; r++) {
      for (let c = 0; c < 100; c++) {
        mesh[r][c] = true
      }
    }
    // Island 2: bottom-right corner (disconnected)
    for (let r = 200; r < 300; r++) {
      for (let c = 200; c < 300; c++) {
        mesh[r][c] = true
      }
    }

    const start = performance.now()
    const path = findPath(mesh, [0, 0], [250, 250])
    const elapsed = performance.now() - start

    expect(path).toEqual([]) // unreachable
    expect(elapsed).toBeLessThan(2000) // should not hang (iteration limit)
  })
})
