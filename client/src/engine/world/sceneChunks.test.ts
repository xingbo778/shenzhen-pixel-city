import { describe, expect, test } from "vitest";
import { sceneConfigToWorldChunks } from "@/engine/world/sceneChunks";
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
});
