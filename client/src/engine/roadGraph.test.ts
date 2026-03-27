import { describe, expect, test } from "vitest";
import { extractTrafficLaneSegments } from "@/engine/roadGraph";
import type { TileType } from "@/engine/sceneTiles";

describe("roadGraph", () => {
  test("extracts horizontal and vertical road lanes from tilemaps", () => {
    const B: TileType = "building";
    const H: TileType = "road_h";
    const V: TileType = "road_v";

    const tilemap: TileType[][] = [
      [B, B, B, V, B, B, B, B, B, B, B, B],
      [B, B, B, V, B, B, B, B, B, B, B, B],
      [B, B, B, V, B, B, B, B, B, B, B, B],
      [H, H, H, H, H, H, H, H, H, H, H, H],
      [B, B, B, V, B, B, B, B, B, B, B, B],
      [B, B, B, V, B, B, B, B, B, B, B, B],
      [B, B, B, V, B, B, B, B, B, B, B, B],
      [B, B, B, V, B, B, B, B, B, B, B, B],
      [B, B, B, V, B, B, B, B, B, B, B, B],
      [B, B, B, V, B, B, B, B, B, B, B, B],
      [B, B, B, V, B, B, B, B, B, B, B, B],
      [B, B, B, V, B, B, B, B, B, B, B, B],
    ];

    const segments = extractTrafficLaneSegments(tilemap, { minRoadLength: 4 });

    expect(segments).toContainEqual({
      axis: "h",
      surface: "road",
      lanePos: 3,
      min: 0,
      max: 11,
    });
    expect(segments).toContainEqual({
      axis: "v",
      surface: "road",
      lanePos: 3,
      min: 4,
      max: 11,
    });
  });

  test("extracts long horizontal water lanes for ambient boats", () => {
    const B: TileType = "building";
    const W: TileType = "water";

    const tilemap: TileType[][] = [
      [B, B, B, B, B, B, B, B, B, B, B, B],
      [W, W, W, W, W, W, W, W, W, W, W, W],
      [B, B, B, B, B, B, B, B, B, B, B, B],
    ];

    const segments = extractTrafficLaneSegments(tilemap, { minWaterLength: 4 });

    expect(segments).toContainEqual({
      axis: "h",
      surface: "water",
      lanePos: 1,
      min: 0,
      max: 11,
    });
  });
});
