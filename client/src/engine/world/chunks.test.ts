import { describe, expect, test } from "vitest";
import { getChunkCoordsInRadius, getChunkLocalCoord, getChunkSeed, getChunkWorldCoord, isChunkCoordWithinRadius, sliceWorldIntoChunks } from "@/engine/world/chunks";
import type { TileType } from "@/engine/sceneTiles";

describe("world chunk helpers", () => {
  test("enumerates chunk coords in a square radius", () => {
    const coords = getChunkCoordsInRadius({ cx: 3, cy: -2 }, 1);
    expect(coords).toHaveLength(9);
    expect(coords[0]).toEqual({ cx: 2, cy: -3 });
    expect(coords[8]).toEqual({ cx: 4, cy: -1 });
  });

  test("checks chunk radius inclusion", () => {
    expect(isChunkCoordWithinRadius({ cx: 0, cy: 0 }, { cx: 1, cy: -1 }, 1)).toBe(true);
    expect(isChunkCoordWithinRadius({ cx: 0, cy: 0 }, { cx: 2, cy: 0 }, 1)).toBe(false);
  });

  test("generates deterministic chunk seeds", () => {
    expect(getChunkSeed(1, 2, 99)).toBe(getChunkSeed(1, 2, 99));
    expect(getChunkSeed(1, 2, 99)).not.toBe(getChunkSeed(2, 1, 99));
  });

  test("slices a finite tilemap into chunk payloads", () => {
    const tiles: TileType[][] = [
      ["grass", "road_h", "water"],
      ["building", "sidewalk", "grass"],
    ];
    const chunks = sliceWorldIntoChunks({
      tiles,
      objects: [
        { col: 0, row: 0, sprite: { type: "placeholder", color: "#000000" }, pngKey: "office_tower" },
        { col: 2, row: 1, sprite: { type: "placeholder", color: "#ffffff" }, pngKey: "landmark_pingan" },
      ],
      origin: { wx: 63, wy: 63 },
      chunkSize: 2,
      seed: 7,
      revision: 3,
    });

    expect(Array.from(chunks.keys()).sort()).toEqual(["31,31", "31,32", "32,31", "32,32"]);

    const topLeft = chunks.get("31,31");
    expect(topLeft?.tiles[1][1]).toBe("grass");
    expect(topLeft?.objects[0]).toMatchObject({
      wx: 63,
      wy: 63,
      tx: 1,
      ty: 1,
      localCol: 1,
      localRow: 1,
      col: 1,
      row: 1,
    });

    const bottomRight = chunks.get("32,32");
    expect(bottomRight?.tiles[0][0]).toBe("sidewalk");
    expect(bottomRight?.objects[0]).toMatchObject({
      wx: 65,
      wy: 64,
      tx: 1,
      ty: 0,
    });
    expect(bottomRight?.revision).toBe(3);
  });

  test("converts chunk local coordinates back into world coordinates", () => {
    const chunk = { cx: -1, cy: 2 };
    expect(getChunkLocalCoord(chunk, { wx: -1, wy: 128 })).toEqual({ tx: 63, ty: 0 });
    expect(getChunkWorldCoord(chunk, { tx: 63, ty: 0 })).toEqual({ wx: -1, wy: 128 });
  });

  test("rejects world coordinates outside the target chunk", () => {
    expect(() => getChunkLocalCoord({ cx: 0, cy: 0 }, { wx: 64, wy: 0 })).toThrow("outside chunk");
  });
});
