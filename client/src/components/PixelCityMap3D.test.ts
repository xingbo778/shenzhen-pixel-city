// @vitest-environment jsdom

import * as THREE from "three";
import { describe, expect, test } from "vitest";
import { pickBotAtCanvasPoint } from "@/components/pixelCity3DPicking";
import type { GameEntity } from "@/engine/gameEntity";

function makeEntity(id: string, pixelX: number, pixelY: number): GameEntity {
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

describe("pickBotAtCanvasPoint", () => {
  test("returns the nearest projected bot under the pointer", () => {
    const canvas = document.createElement("canvas");
    Object.defineProperty(canvas, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        width: 400,
        height: 300,
        right: 400,
        bottom: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
    camera.position.set(0, 10, 10);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    const entities = {
      near: makeEntity("near", 0, 0),
      far: makeEntity("far", 32 * 6, 32 * 6),
    };

    const picked = pickBotAtCanvasPoint(200, 110, canvas, camera, entities, 32, 80);
    expect(picked).toBe("near");
  });

  test("returns null when nothing is close enough to the pointer", () => {
    const canvas = document.createElement("canvas");
    Object.defineProperty(canvas, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        width: 400,
        height: 300,
        right: 400,
        bottom: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
    camera.position.set(0, 10, 10);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    const entities = {
      bot: makeEntity("bot", 0, 0),
    };

    const picked = pickBotAtCanvasPoint(20, 20, canvas, camera, entities, 32, 10);
    expect(picked).toBeNull();
  });
});
