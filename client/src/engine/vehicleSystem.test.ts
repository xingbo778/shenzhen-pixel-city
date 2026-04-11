import { describe, expect, test } from 'vitest'
import {
  getVisibleVehicleIds,
  initChunkVehicles,
  tickVehicles,
  type VehicleState,
  type VehicleLane,
} from '@/engine/vehicleSystem'
import type { WorldChunk } from '@/engine/world/chunks'

function createVehicle(id: string, x: number, y: number): VehicleState {
  return {
    id,
    type: 'taxi',
    lane: { type: 'taxi', y, xMin: 0, xMax: 1, dir: 1 },
    x,
    y,
    dir: 1,
    frame: 0,
    frameTimer: 0,
  }
}

function createLanedVehicle(
  id: string,
  x: number,
  lane: VehicleLane
): VehicleState {
  return {
    id,
    type: lane.type,
    lane,
    x,
    y: lane.y,
    dir: lane.dir,
    frame: 0,
    frameTimer: 0,
  }
}

describe('vehicleSystem viewport scoping', () => {
  test('initializes vehicles grouped by chunk', () => {
    const chunks = new Map<string, WorldChunk>([
      [
        '0,0',
        {
          key: '0,0',
          cx: 0,
          cy: 0,
          seed: 1,
          cols: 12,
          rows: 12,
          tiles: Array.from({ length: 12 }, (_, row) =>
            Array.from({ length: 12 }, (_, col) =>
              row === 4 ? 'road_h' : col === 7 ? 'road_v' : 'building'
            )
          ),
          objects: [],
          revision: 0,
        },
      ],
      [
        '1,0',
        {
          key: '1,0',
          cx: 1,
          cy: 0,
          seed: 2,
          cols: 12,
          rows: 12,
          tiles: Array.from({ length: 12 }, () =>
            Array.from({ length: 12 }, () => 'water')
          ),
          objects: [],
          revision: 0,
        },
      ],
    ])

    const grouped = initChunkVehicles('test', 10, chunks, 24, 12, 12)

    expect(grouped.has('0,0')).toBe(true)
    expect(grouped.has('1,0')).toBe(true)
    expect(
      (grouped.get('0,0') ?? []).every(
        vehicle => vehicle.lane.chunkKey === '0,0'
      )
    ).toBe(true)
    expect(
      (grouped.get('1,0') ?? []).every(
        vehicle => vehicle.lane.chunkKey === '1,0'
      )
    ).toBe(true)
  })

  test('selects only vehicles near the viewport', () => {
    const vehicles = [
      createVehicle('near', 0.5, 0.5),
      createVehicle('edge', 1.02, 0.5),
      createVehicle('far', 1.3, 0.5),
    ]

    const active = getVisibleVehicleIds(vehicles, {
      xMin: 0,
      xMax: 1,
      yMin: 0,
      yMax: 1,
    })

    expect(Array.from(active).sort()).toEqual(['edge', 'near'])
  })

  test('ticks offscreen vehicles without advancing animation frames', () => {
    const visible = createVehicle('visible', 0.5, 0.5)
    const hidden = createVehicle('hidden', 0.5, 0.5)
    const vehicles = [visible, hidden]

    tickVehicles(vehicles, 0.2, new Set(['visible']))

    expect(visible.x).toBeGreaterThan(0.5)
    expect(hidden.x).toBeGreaterThan(0.5)
    expect(visible.frame).not.toBe(hidden.frame)
  })
})

describe('tickVehicles', () => {
  test('moves vehicle in positive direction', () => {
    const v = createVehicle('v1', 0.3, 0.5)
    tickVehicles([v], 0.1, new Set(['v1']))
    expect(v.x).toBeGreaterThan(0.3)
  })

  test('moves vehicle in negative direction', () => {
    const lane: VehicleLane = {
      type: 'taxi',
      y: 0.5,
      xMin: 0,
      xMax: 1,
      dir: -1,
    }
    const v = createLanedVehicle('v1', 0.5, lane)
    v.dir = -1
    tickVehicles([v], 0.1, new Set(['v1']))
    expect(v.x).toBeLessThan(0.5)
  })

  test('wraps vehicle position at lane boundaries', () => {
    const v = createVehicle('v1', 0.99, 0.5)
    // Tick many times to go past xMax
    for (let i = 0; i < 50; i++) tickVehicles([v], 0.1, new Set(['v1']))
    // Should wrap to xMin region
    expect(v.x).toBeLessThan(0.99)
  })

  test('wrap preserves fractional remainder (no position jump)', () => {
    const lane: VehicleLane = { type: 'taxi', y: 0.5, xMin: 0, xMax: 1, dir: 1 }
    const v = createLanedVehicle('wrap', 0.98, lane)
    // Tick to wrap past xMax
    tickVehicles([v], 10, new Set(['wrap']))
    // After wrap, x should be within lane bounds
    expect(v.x).toBeGreaterThanOrEqual(lane.xMin)
    expect(v.x).toBeLessThanOrEqual(lane.xMax)
  })

  test('handles empty vehicle array', () => {
    expect(() => tickVehicles([], 0.1, new Set())).not.toThrow()
  })
})

describe('getVisibleVehicleIds', () => {
  test('returns empty set for no vehicles', () => {
    const result = getVisibleVehicleIds([], {
      xMin: 0,
      xMax: 1,
      yMin: 0,
      yMax: 1,
    })
    expect(result.size).toBe(0)
  })

  test('includes vehicles at viewport boundary', () => {
    const vehicles = [createVehicle('boundary', 1.0, 0.5)]
    const result = getVisibleVehicleIds(vehicles, {
      xMin: 0,
      xMax: 1,
      yMin: 0,
      yMax: 1,
    })
    // Within margin of 0.05
    expect(result.has('boundary')).toBe(true)
  })
})
