/**
 * useMapDrag — shared pan/zoom mouse interaction for map components.
 */

import { useRef, useCallback } from "react";
import type { SceneConfig } from "@/engine/sceneTiles";
import { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from "@/config/scenes";

export interface MapDragState {
  panCol: number;
  panRow: number;
  zoom: number;
}

export function useMapDrag(sceneConfig: SceneConfig | undefined) {
  const zoomRef = useRef(1.0);
  const panColRef = useRef(0);
  const panRowRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: panColRef.current,
      panY: panRowRef.current,
    };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDraggingRef.current) return;
      const cols = sceneConfig?.cols ?? 36;
      const rows = sceneConfig?.rows ?? 24;
      const dx =
        (e.clientX - dragStartRef.current.x) /
        (containerRef.current?.clientWidth ?? 800);
      const dy =
        (e.clientY - dragStartRef.current.y) /
        (containerRef.current?.clientHeight ?? 600);
      panColRef.current = dragStartRef.current.panX - dx * cols * 0.8;
      panRowRef.current = dragStartRef.current.panY - dy * rows * 0.8;
    },
    [sceneConfig],
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    zoomRef.current = Math.max(
      ZOOM_MIN,
      Math.min(ZOOM_MAX, zoomRef.current + delta),
    );
  }, []);

  const resetCamera = useCallback(
    (cols: number, rows: number) => {
      panColRef.current = cols / 2;
      panRowRef.current = rows / 2;
      zoomRef.current = 1.0;
    },
    [],
  );

  return {
    containerRef,
    zoomRef,
    panColRef,
    panRowRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    resetCamera,
  };
}
