// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { MOCK_MOMENTS, MOCK_WORLD } from "@/lib/mockData";
import Home from "@/pages/Home";

const { refreshMock, useWorldDataMock } = vi.hoisted(() => {
  const refreshMock = vi.fn();
  const useWorldDataMock = vi.fn(
    (_pollInterval: number, _engineUrl?: string, mode?: "auto" | "real" | "mock") => {
      if (mode === "mock") {
        return {
          world: MOCK_WORLD,
          moments: MOCK_MOMENTS,
          isConnected: false,
          isLoading: false,
          lastUpdated: new Date("2026-03-26T12:00:00+08:00"),
          error: null,
          refresh: refreshMock,
        };
      }

      if (mode === "real") {
        return {
          world: null,
          moments: [],
          isConnected: false,
          isLoading: false,
          lastUpdated: null,
          error: "connection refused",
          refresh: refreshMock,
        };
      }

      return {
        world: null,
        moments: [],
        isConnected: false,
        isLoading: false,
        lastUpdated: null,
        error: "timeout",
        refresh: refreshMock,
      };
    }
  );

  return { refreshMock, useWorldDataMock };
});

vi.mock("@/hooks/useWorldData", () => ({
  useWorldData: useWorldDataMock,
  sendMessage: vi.fn().mockResolvedValue(true),
  setEngineUrl: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/PixelCityMap3D", () => ({
  default: () => <div>PixelCityMap3D</div>,
}));

vi.mock("@/components/CityOverviewMap", () => ({
  default: () => <div>CityOverviewMap</div>,
}));

vi.mock("@/components/BotDetailPanel", () => ({
  default: () => <div>BotDetailPanel</div>,
}));

vi.mock("@/components/RightPanel", () => ({
  default: () => <div>RightPanel</div>,
}));

let container: HTMLDivElement;
let root: Root;

describe("Home mode states", () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    refreshMock.mockClear();
    useWorldDataMock.mockClear();
    window.localStorage.clear();
    class MockIntersectionObserver {
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  test("shows mock badge and hides offline alert in mock mode", async () => {
    window.localStorage.setItem("szpc.dataSourceMode", "mock");

    await act(async () => {
      root.render(<Home />);
    });

    expect(container.textContent).toContain("MOCK MODE");
    expect(container.textContent).toContain("使用内置演示数据");
    expect(container.textContent).not.toContain("无法连接到 world_engine");
  });

  test("shows empty state in real mode when no world data is available", async () => {
    window.localStorage.setItem("szpc.dataSourceMode", "real");

    await act(async () => {
      root.render(<Home />);
    });

    expect(container.textContent).toContain("REAL 模式未连接到 world_engine");
    expect(container.textContent).toContain("connection refused");
  });

  test("shows offline alert and retry button in auto mode", async () => {
    window.localStorage.setItem("szpc.dataSourceMode", "auto");

    await act(async () => {
      root.render(<Home />);
    });

    expect(container.textContent).toContain("无法连接到 world_engine");
    const retryButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("重试连接")
    ) as HTMLButtonElement;

    await act(async () => {
      retryButton.click();
    });

    expect(refreshMock).toHaveBeenCalledTimes(1);
  });
});
