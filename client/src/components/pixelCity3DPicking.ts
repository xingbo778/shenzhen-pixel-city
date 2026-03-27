import * as THREE from "three";
import type { GameEntity } from "@/engine/gameEntity";
import { TILE_SIZE } from "@/engine/three/ThreeScene";

const PICK_HEIGHT = TILE_SIZE * 2.5;
const PICK_RADIUS_PX = 24;

export function pickBotAtCanvasPoint(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  camera: THREE.Camera,
  entities: Record<string, GameEntity>,
  tileSize: number,
  threshold = PICK_RADIUS_PX,
): string | null {
  const rect = canvas.getBoundingClientRect();
  const point = new THREE.Vector3();
  let bestId: string | null = null;
  let bestDistance = threshold;

  camera.updateMatrixWorld();

  for (const [botId, entity] of Object.entries(entities)) {
    point
      .set(
        (entity.pixelX / (tileSize || 1)) * TILE_SIZE,
        PICK_HEIGHT,
        (entity.pixelY / (tileSize || 1)) * TILE_SIZE,
      )
      .project(camera);

    if (point.z < -1 || point.z > 1) continue;

    const screenX = rect.left + ((point.x + 1) * rect.width) / 2;
    const screenY = rect.top + ((1 - point.y) * rect.height) / 2;
    const distance = Math.hypot(screenX - clientX, screenY - clientY);
    if (distance <= bestDistance) {
      bestDistance = distance;
      bestId = botId;
    }
  }

  return bestId;
}
