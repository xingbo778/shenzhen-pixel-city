import { describe, expect, test } from "vitest";
import {
  DEFAULT_CHUNK_SIZE,
  chunkKey,
  chunkToWorldBounds,
  chunkToWorldOrigin,
  localToWorld,
  parseChunkKey,
  toChunkKeyFromWorld,
  worldToChunk,
  worldToLocal,
} from "@/engine/world/coords";

describe("world chunk coordinates", () => {
  test("maps positive world coordinates into chunk and local coordinates", () => {
    expect(worldToChunk(0, 0)).toEqual({ cx: 0, cy: 0 });
    expect(worldToChunk(63, 63)).toEqual({ cx: 0, cy: 0 });
    expect(worldToChunk(64, 64)).toEqual({ cx: 1, cy: 1 });
    expect(worldToLocal(64, 65)).toEqual({ tx: 0, ty: 1 });
  });

  test("maps negative world coordinates with floor division semantics", () => {
    expect(worldToChunk(-1, -1)).toEqual({ cx: -1, cy: -1 });
    expect(worldToLocal(-1, -1)).toEqual({ tx: DEFAULT_CHUNK_SIZE - 1, ty: DEFAULT_CHUNK_SIZE - 1 });
    expect(worldToChunk(-64, -64)).toEqual({ cx: -1, cy: -1 });
    expect(worldToChunk(-65, -65)).toEqual({ cx: -2, cy: -2 });
    expect(worldToLocal(-65, -65)).toEqual({ tx: DEFAULT_CHUNK_SIZE - 1, ty: DEFAULT_CHUNK_SIZE - 1 });
  });

  test("round trips chunk key and world origin helpers", () => {
    expect(chunkKey(-2, 5)).toBe("-2,5");
    expect(parseChunkKey("-2,5")).toEqual({ cx: -2, cy: 5 });
    expect(chunkToWorldOrigin(-2, 5)).toEqual({ wx: -128, wy: 320 });
    expect(toChunkKeyFromWorld(-65, 320)).toBe("-2,5");
  });

  test("computes chunk bounds and local to world conversion", () => {
    expect(chunkToWorldBounds(1, -1)).toEqual({
      minWx: 64,
      minWy: -64,
      maxWx: 127,
      maxWy: -1,
    });

    expect(localToWorld(1, -1, 0, 0)).toEqual({ wx: 64, wy: -64 });
    expect(localToWorld(1, -1, 63, 63)).toEqual({ wx: 127, wy: -1 });
  });

  test("rejects malformed chunk keys", () => {
    expect(() => parseChunkKey("1|2")).toThrow("Invalid chunk key");
  });
});
