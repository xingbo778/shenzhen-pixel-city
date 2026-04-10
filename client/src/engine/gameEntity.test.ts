import { describe, expect, test } from 'vitest'
import {
  createEntity,
  tickEntity,
  getVisibleEntityIds,
  type GameEntity,
} from '@/engine/gameEntity'

function makeEntity(
  id: string,
  col: number,
  row: number,
  tileSize = 32
): GameEntity {
  return createEntity(id, col, row, tileSize)
}

describe('createEntity', () => {
  test('initializes at correct pixel position', () => {
    const e = makeEntity('a', 3, 5, 32)
    expect(e.col).toBe(3)
    expect(e.row).toBe(5)
    expect(e.pixelX).toBe(3 * 32 + 16)
    expect(e.pixelY).toBe(5 * 32 + 16)
    expect(e.facing).toBe('front')
    expect(e.path).toEqual([])
    expect(e.isBoat).toBe(false)
  })

  test('creates boat entity', () => {
    const e = createEntity('boat1', 0, 0, 32, true)
    expect(e.isBoat).toBe(true)
  })
})

describe('tickEntity', () => {
  test('does not move entity with no path', () => {
    const e = makeEntity('a', 5, 5, 32)
    const prevX = e.pixelX
    const prevY = e.pixelY
    tickEntity(e, 0.1, 32)
    expect(e.pixelX).toBe(prevX)
    expect(e.pixelY).toBe(prevY)
  })

  test('moves entity toward path target', () => {
    const e = makeEntity('a', 0, 0, 32)
    e.path = [
      [0, 0],
      [1, 0],
    ]
    e.pathIdx = 1
    const prevX = e.pixelX
    tickEntity(e, 0.1, 32)
    expect(e.pixelX).toBeGreaterThan(prevX)
  })

  test('advances path index when reaching target tile', () => {
    const e = makeEntity('a', 0, 0, 32)
    e.path = [
      [0, 0],
      [1, 0],
      [2, 0],
    ]
    e.pathIdx = 1
    // Simulate many ticks to reach first waypoint
    for (let i = 0; i < 100; i++) tickEntity(e, 0.05, 32)
    expect(e.pathIdx).toBeGreaterThanOrEqual(2)
  })

  test('updates facing direction based on movement', () => {
    const e = makeEntity('a', 0, 0, 32)
    e.path = [
      [0, 0],
      [1, 0],
    ] // moving right
    e.pathIdx = 1
    tickEntity(e, 0.1, 32)
    expect(e.facing).toBe('right')
  })

  test('updates facing to front when moving down', () => {
    const e = makeEntity('a', 0, 0, 32)
    e.path = [
      [0, 0],
      [0, 1],
    ] // moving down
    e.pathIdx = 1
    tickEntity(e, 0.1, 32)
    expect(e.facing).toBe('front')
  })

  test('advances animation frame over time', () => {
    const e = makeEntity('a', 0, 0, 32)
    e.path = [
      [0, 0],
      [5, 0],
    ]
    e.pathIdx = 1
    expect(e.animFrame).toBe(0)
    // Tick enough to pass FRAME_DURATION (0.14s)
    tickEntity(e, 0.15, 32)
    expect(e.animFrame).toBe(1)
  })

  test('boat entity moves slower than pedestrian', () => {
    const ped = makeEntity('ped', 0, 0, 32)
    ped.path = [
      [0, 0],
      [5, 0],
    ]
    ped.pathIdx = 1

    const boat = createEntity('boat', 0, 0, 32, true)
    boat.path = [
      [0, 0],
      [5, 0],
    ]
    boat.pathIdx = 1

    tickEntity(ped, 0.5, 32)
    tickEntity(boat, 0.5, 32)

    expect(ped.pixelX).toBeGreaterThan(boat.pixelX)
  })
})

describe('getVisibleEntityIds', () => {
  function entityAt(id: string, px: number, py: number): GameEntity {
    const e = makeEntity(id, 0, 0, 32)
    e.pixelX = px
    e.pixelY = py
    return e
  }

  test('returns entities inside viewport with margin', () => {
    const entities = {
      inside: entityAt('inside', 100, 100),
      margin: entityAt('margin', 210, 100),
      outside: entityAt('outside', 260, 100),
    }

    const visible = getVisibleEntityIds(
      entities,
      { minX: 0, maxX: 200, minY: 0, maxY: 200 },
      20
    )

    expect(Array.from(visible).sort()).toEqual(['inside', 'margin'])
  })

  test('returns empty set for no entities', () => {
    const visible = getVisibleEntityIds(
      {},
      { minX: 0, maxX: 100, minY: 0, maxY: 100 }
    )
    expect(visible.size).toBe(0)
  })

  test('default margin is 0', () => {
    const entities = {
      edge: entityAt('edge', 200, 100),
      past: entityAt('past', 201, 100),
    }
    const visible = getVisibleEntityIds(entities, {
      minX: 0,
      maxX: 200,
      minY: 0,
      maxY: 200,
    })
    expect(visible.has('edge')).toBe(true)
    expect(visible.has('past')).toBe(false)
  })
})
