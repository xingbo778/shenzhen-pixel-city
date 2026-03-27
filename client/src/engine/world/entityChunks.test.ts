import { describe, expect, test } from "vitest";
import { EntityChunkIndex } from "@/engine/world/entityChunks";

describe("EntityChunkIndex", () => {
  test("indexes entities by chunk and queries radius", () => {
    const index = new EntityChunkIndex(4);

    index.upsert({ id: "a", col: 0, row: 0 });
    index.upsert({ id: "b", col: 3, row: 3 });
    index.upsert({ id: "c", col: 4, row: 0 });
    index.upsert({ id: "d", col: -1, row: -1 });

    expect(index.getChunkKeyForEntity("a")).toBe("0,0");
    expect(index.getChunkKeyForEntity("c")).toBe("1,0");
    expect(index.getIdsInRadius(0, 0, 0).sort()).toEqual(["a", "b"]);
    expect(index.getIdsInRadius(0, 0, 1).sort()).toEqual(["a", "b", "c", "d"]);
  });

  test("moves entities between chunks on upsert", () => {
    const index = new EntityChunkIndex(4);

    index.upsert({ id: "bot_1", col: 0, row: 0 });
    expect(index.getChunkKeyForEntity("bot_1")).toBe("0,0");

    index.upsert({ id: "bot_1", col: 8, row: 1 });
    expect(index.getChunkKeyForEntity("bot_1")).toBe("2,0");
    expect(index.getIdsInRadius(0, 0, 0)).toEqual([]);
    expect(index.getIdsInRadius(2, 0, 0)).toEqual(["bot_1"]);
  });

  test("removes entities and clears empty chunks", () => {
    const index = new EntityChunkIndex(4);

    index.upsert({ id: "bot_1", col: 0, row: 0 });
    index.upsert({ id: "bot_2", col: 1, row: 1 });
    index.remove("bot_1");
    expect(index.getChunkKeyForEntity("bot_1")).toBeUndefined();
    expect(index.getIdsInRadius(0, 0, 0)).toEqual(["bot_2"]);

    index.remove("bot_2");
    expect(index.getIdsInRadius(0, 0, 0)).toEqual([]);
  });

  test("collects entity ids for explicit chunk keys", () => {
    const index = new EntityChunkIndex(4);

    index.upsert({ id: "a", col: 0, row: 0 });
    index.upsert({ id: "b", col: 4, row: 0 });
    index.upsert({ id: "c", col: 8, row: 0 });

    expect(index.getIdsForChunkKeys(["0,0", "2,0"]).sort()).toEqual(["a", "c"]);
  });
});
