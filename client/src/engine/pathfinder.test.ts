import { describe, expect, test } from "vitest";
import { findPath, findPathChunked, findPathInBounds } from "@/engine/pathfinder";

function createMesh(cols: number, rows: number, fill = false): boolean[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));
}

function carvePath(mesh: boolean[][], points: Array<[number, number]>) {
  points.forEach(([col, row]) => {
    mesh[row][col] = true;
  });
}

describe("pathfinder", () => {
  test("findPathInBounds limits search to the provided rectangle", () => {
    const mesh = createMesh(7, 5, false);
    carvePath(mesh, [
      [1, 2], [1, 1], [1, 0],
      [2, 0], [3, 0], [4, 0], [5, 0],
      [5, 1], [5, 2],
    ]);

    expect(findPath(mesh, [1, 2], [5, 2]).length).toBeGreaterThan(0);
    expect(findPathInBounds(mesh, [1, 2], [5, 2], {
      minCol: 1,
      maxCol: 5,
      minRow: 1,
      maxRow: 4,
    })).toEqual([]);
  });

  test("findPathChunked matches direct search on open multi-chunk routes", () => {
    const mesh = createMesh(12, 8, true);

    const direct = findPath(mesh, [0, 0], [11, 7]);
    const chunked = findPathChunked(mesh, [0, 0], [11, 7], { chunkSize: 4 });

    expect(chunked).toEqual(direct);
    expect(chunked.length).toBe(19);
  });

  test("findPathChunked falls back to full-map search when chunk-route bounds miss a detour", () => {
    const mesh = createMesh(12, 8, false);

    carvePath(mesh, [
      [1, 5], [2, 5], [3, 5], [4, 5],
      [7, 5], [8, 5], [9, 5], [10, 5],
      [1, 4], [1, 3], [1, 2], [1, 1],
      [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1],
      [10, 2], [10, 3], [10, 4],
      [4, 4], [8, 4],
    ]);

    expect(findPathInBounds(mesh, [1, 5], [10, 5], {
      minCol: 0,
      maxCol: 11,
      minRow: 4,
      maxRow: 7,
    })).toEqual([]);

    const chunked = findPathChunked(mesh, [1, 5], [10, 5], { chunkSize: 4 });
    const direct = findPath(mesh, [1, 5], [10, 5]);

    expect(chunked).toEqual(direct);
    expect(chunked.length).toBeGreaterThan(0);
  });
});
