import { describe, expect, test } from "vitest";
import { getVisibleVehicleIds, initChunkVehicles, tickVehicles, type VehicleState } from "@/engine/vehicleSystem";
import type { WorldChunk } from "@/engine/world/chunks";

function createVehicle(id: string, x: number, y: number): VehicleState {
  return {
    id,
    type: "taxi",
    lane: { type: "taxi", y, xMin: 0, xMax: 1, dir: 1 },
    x,
    y,
    dir: 1,
    frame: 0,
    frameTimer: 0,
  };
}

describe("vehicleSystem viewport scoping", () => {
  test("initializes vehicles grouped by chunk", () => {
    const chunks = new Map<string, WorldChunk>([
      ["0,0", {
        key: "0,0",
        cx: 0,
        cy: 0,
        seed: 1,
        cols: 12,
        rows: 12,
        tiles: Array.from({ length: 12 }, (_, row) =>
          Array.from({ length: 12 }, (_, col) => row === 4 ? "road_h" : (col === 7 ? "road_v" : "building"))),
        objects: [],
        revision: 0,
      }],
      ["1,0", {
        key: "1,0",
        cx: 1,
        cy: 0,
        seed: 2,
        cols: 12,
        rows: 12,
        tiles: Array.from({ length: 12 }, () => Array.from({ length: 12 }, () => "water")),
        objects: [],
        revision: 0,
      }],
    ]);

    const grouped = initChunkVehicles("test", 10, chunks, 24, 12, 12);

    expect(grouped.has("0,0")).toBe(true);
    expect(grouped.has("1,0")).toBe(true);
    expect((grouped.get("0,0") ?? []).every(vehicle => vehicle.lane.chunkKey === "0,0")).toBe(true);
    expect((grouped.get("1,0") ?? []).every(vehicle => vehicle.lane.chunkKey === "1,0")).toBe(true);
  });

  test("selects only vehicles near the viewport", () => {
    const vehicles = [
      createVehicle("near", 0.5, 0.5),
      createVehicle("edge", 1.02, 0.5),
      createVehicle("far", 1.3, 0.5),
    ];

    const active = getVisibleVehicleIds(vehicles, {
      xMin: 0,
      xMax: 1,
      yMin: 0,
      yMax: 1,
    });

    expect(Array.from(active).sort()).toEqual(["edge", "near"]);
  });

  test("ticks offscreen vehicles without advancing animation frames", () => {
    const visible = createVehicle("visible", 0.5, 0.5);
    const hidden = createVehicle("hidden", 0.5, 0.5);
    const vehicles = [visible, hidden];

    tickVehicles(vehicles, 0.2, new Set(["visible"]));

    expect(visible.x).toBeGreaterThan(0.5);
    expect(hidden.x).toBeGreaterThan(0.5);
    expect(visible.frame).not.toBe(hidden.frame);
  });
});
