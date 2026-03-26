// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import TopHeader from "@/components/TopHeader";
import { MOCK_WORLD } from "@/lib/mockData";

let container: HTMLDivElement;
let root: Root;

function setInputValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

async function renderHeader(props?: Partial<React.ComponentProps<typeof TopHeader>>) {
  const onEngineUrlChange = vi.fn();
  const onRefresh = vi.fn();
  const onDataSourceModeChange = vi.fn();

  await act(async () => {
    root.render(
      <TopHeader
        world={MOCK_WORLD}
        isConnected
        isLoading={false}
        lastUpdated={new Date("2026-03-26T12:00:00+08:00")}
        engineUrl="http://localhost:8000"
        dataSourceMode="auto"
        onEngineUrlChange={onEngineUrlChange}
        onDataSourceModeChange={onDataSourceModeChange}
        onRefresh={onRefresh}
        {...props}
      />
    );
  });

  return { onEngineUrlChange, onRefresh, onDataSourceModeChange };
}

describe("TopHeader", () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  test("does not submit engine url on every keystroke", async () => {
    const { onEngineUrlChange } = await renderHeader();
    const input = container.querySelector('input[placeholder="http://localhost:8000"]') as HTMLInputElement;

    await act(async () => {
      setInputValue(input, "http://127.0.0.1:9000");
    });

    expect(onEngineUrlChange).not.toHaveBeenCalled();
  });

  test("submits the draft url on apply click and enter", async () => {
    const { onEngineUrlChange } = await renderHeader();
    const input = container.querySelector('input[placeholder="http://localhost:8000"]') as HTMLInputElement;
    const applyButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("应用")
    ) as HTMLButtonElement;

    await act(async () => {
      setInputValue(input, "http://127.0.0.1:9000");
    });
    await act(async () => {
      applyButton.click();
    });

    expect(onEngineUrlChange).toHaveBeenCalledWith("http://127.0.0.1:9000");
    onEngineUrlChange.mockClear();
    await act(async () => {
      setInputValue(input, "http://127.0.0.1:9100");
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(onEngineUrlChange).toHaveBeenCalledWith("http://127.0.0.1:9100");
  });

  test("disables refresh while loading and triggers refresh when idle", async () => {
    const firstRender = await renderHeader({ isLoading: true });
    const loadingRefreshButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("刷新")
    ) as HTMLButtonElement;

    expect(loadingRefreshButton.disabled).toBe(true);

    const secondRender = await renderHeader({ isLoading: false });
    const refreshButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("刷新")
    ) as HTMLButtonElement;

    await act(async () => {
      refreshButton.click();
    });

    expect(firstRender.onRefresh).not.toHaveBeenCalled();
    expect(secondRender.onRefresh).toHaveBeenCalledTimes(1);
  });

  test("switches data source mode from select", async () => {
    const { onDataSourceModeChange } = await renderHeader();
    const select = container.querySelector("select") as HTMLSelectElement;

    await act(async () => {
      select.value = "mock";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(onDataSourceModeChange).toHaveBeenCalledWith("mock");
  });

  test("shows active mode hint and disables url input in mock mode", async () => {
    await renderHeader({ dataSourceMode: "mock" });
    const input = container.querySelector('input[placeholder="http://localhost:8000"]') as HTMLInputElement;

    expect(container.textContent).toContain("始终使用内置演示数据，不依赖 world_engine");
    expect(container.textContent).toContain("MOCK");
    expect(input.disabled).toBe(true);
  });
});
