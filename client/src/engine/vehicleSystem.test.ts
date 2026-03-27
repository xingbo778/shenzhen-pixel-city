import { describe, expect, test } from "vitest";
import { getVisibleVehicleIds, tickVehicles, type VehicleState } from "@/engine/vehicleSystem";

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
