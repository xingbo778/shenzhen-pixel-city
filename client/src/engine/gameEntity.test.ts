import { describe, expect, test } from "vitest";
import { getVisibleEntityIds, type GameEntity } from "@/engine/gameEntity";

function createEntity(id: string, pixelX: number, pixelY: number): GameEntity {
  return {
    id,
    col: 0,
    row: 0,
    pixelX,
    pixelY,
    path: [],
    pathIdx: 0,
    facing: "front",
    animFrame: 0,
    frameTimer: 0,
    activity: "",
    isBoat: false,
  };
}

describe("gameEntity visibility", () => {
  test("returns entities inside viewport with margin", () => {
    const entities = {
      inside: createEntity("inside", 100, 100),
      margin: createEntity("margin", 210, 100),
      outside: createEntity("outside", 260, 100),
    };

    const visible = getVisibleEntityIds(entities, {
      minX: 0,
      maxX: 200,
      minY: 0,
      maxY: 200,
    }, 20);

    expect(Array.from(visible).sort()).toEqual(["inside", "margin"]);
  });
});
