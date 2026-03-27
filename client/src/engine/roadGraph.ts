import type { TileType } from './sceneTiles'

export type LaneAxis = 'h' | 'v'
export type LaneSurface = 'road' | 'water'

export interface TrafficLaneSegment {
  axis: LaneAxis
  surface: LaneSurface
  lanePos: number
  min: number
  max: number
}

export interface TrafficLaneOptions {
  minRoadLength?: number
  minWaterLength?: number
}

export function isRoadTile(tile: TileType, horizontal: boolean): boolean {
  if (tile === 'road_cross' || tile.startsWith('road_cross_zebra')) return true
  if (horizontal) return tile === 'road_h' || tile === 'road_stop_h'
  return tile === 'road_v' || tile === 'road_stop_v'
}

export function isWaterTile(tile: TileType): boolean {
  return tile === 'water' || tile === 'water_edge'
}

export function extractTrafficLaneSegments(
  tilemap: TileType[][],
  options: TrafficLaneOptions = {},
): TrafficLaneSegment[] {
  const rows = tilemap.length
  const cols = tilemap[0]?.length ?? 0
  const minRoadLength = options.minRoadLength ?? 8
  const minWaterLength = options.minWaterLength ?? 10
  const segments: TrafficLaneSegment[] = []

  for (let row = 0; row < rows; row++) {
    extractAxisSegments(cols, (col) => tilemap[row][col], true, minRoadLength).forEach(({ min, max }) => {
      segments.push({ axis: 'h', surface: 'road', lanePos: row, min, max })
    })
    extractSurfaceSegments(cols, (col) => tilemap[row][col], isWaterTile, minWaterLength).forEach(({ min, max }) => {
      segments.push({ axis: 'h', surface: 'water', lanePos: row, min, max })
    })
  }

  for (let col = 0; col < cols; col++) {
    extractAxisSegments(rows, (row) => tilemap[row][col], false, minRoadLength).forEach(({ min, max }) => {
      segments.push({ axis: 'v', surface: 'road', lanePos: col, min, max })
    })
    extractSurfaceSegments(rows, (row) => tilemap[row][col], isWaterTile, minWaterLength).forEach(({ min, max }) => {
      segments.push({ axis: 'v', surface: 'water', lanePos: col, min, max })
    })
  }

  return segments
}

function extractAxisSegments(
  length: number,
  getTile: (index: number) => TileType,
  horizontal: boolean,
  minLength: number,
): Array<{ min: number; max: number }> {
  return extractSurfaceSegments(length, getTile, (tile) => isRoadTile(tile, horizontal), minLength)
}

function extractSurfaceSegments(
  length: number,
  getTile: (index: number) => TileType,
  isWalkable: (tile: TileType) => boolean,
  minLength: number,
): Array<{ min: number; max: number }> {
  const segments: Array<{ min: number; max: number }> = []
  let start = -1

  for (let index = 0; index < length; index++) {
    if (isWalkable(getTile(index))) {
      if (start < 0) start = index
      continue
    }
    if (start >= 0 && index - start > minLength) {
      segments.push({ min: start, max: index - 1 })
    }
    start = -1
  }

  if (start >= 0 && length - start > minLength) {
    segments.push({ min: start, max: length - 1 })
  }

  return segments
}
