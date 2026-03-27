import { describe, expect, test } from "vitest";
import { getChunksIntersectingWorldBounds, sceneConfigToWorldChunks } from "@/engine/world/sceneChunks";
import type { SceneConfig } from "@/engine/sceneTiles";

describe("sceneConfigToWorldChunks", () => {
  test("converts an existing scene config into world chunks", () => {
    const sceneConfig: SceneConfig = {
      name: "test-scene",
      cols: 3,
      rows: 2,
      tilemap: [
        ["grass", "road_h", "water"],
        ["building", "sidewalk", "grass"],
      ],
      objects: [
        { col: 1, row: 0, sprite: [["#"]], pngKey: "office_tower" },
      ],
      ambientColor: "#000000",
      lightColor: "#ffffff",
      walkableRowStart: 0,
    };

    const chunks = sceneConfigToWorldChunks(sceneConfig, {
      origin: { wx: 63, wy: 63 },
      chunkSize: 2,
      seed: 17,
      revision: 4,
    });

    expect(Array.from(chunks.keys()).sort()).toEqual(["31,31", "31,32", "32,31", "32,32"]);
    expect(chunks.get("32,31")?.objects[0]).toMatchObject({
      wx: 64,
      wy: 63,
      tx: 0,
      ty: 1,
      pngKey: "office_tower",
    });
    expect(chunks.get("32,31")?.revision).toBe(4);
  });

  test("selects only chunks intersecting a world tile viewport", () => {
    const sceneConfig: SceneConfig = {
      name: "test-scene",
      cols: 6,
      rows: 4,
      tilemap: [
        ["grass", "grass", "grass", "grass", "grass", "grass"],
        ["grass", "grass", "grass", "grass", "grass", "grass"],
        ["grass", "grass", "grass", "grass", "grass", "grass"],
        ["grass", "grass", "grass", "grass", "grass", "grass"],
      ],
      objects: [],
      ambientColor: "#000000",
      lightColor: "#ffffff",
      walkableRowStart: 0,
    };

    const chunks = sceneConfigToWorldChunks(sceneConfig, { chunkSize: 2 });
    const visible = getChunksIntersectingWorldBounds(chunks, {
      minCol: 1,
      maxCol: 4,
      minRow: 0,
      maxRow: 2,
    }, 2);

    expect(visible.map(chunk => chunk.key).sort()).toEqual([
      "0,0", "0,1", "1,0", "1,1", "2,0", "2,1",
    ]);
  });
});
