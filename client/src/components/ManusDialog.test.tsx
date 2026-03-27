// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ManusDialog } from "@/components/ManusDialog";

let container: HTMLDivElement;
let root: Root;

describe("ManusDialog", () => {
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

  test("syncs open prop in uncontrolled mode after mount", async () => {
    const onLogin = vi.fn();

    await act(async () => {
      root.render(<ManusDialog open={false} onLogin={onLogin} />);
    });
    expect(document.body.textContent).not.toContain("Login with Manus");

    await act(async () => {
      root.render(<ManusDialog open onLogin={onLogin} />);
    });
    expect(document.body.textContent).toContain("Login with Manus");
  });
});
