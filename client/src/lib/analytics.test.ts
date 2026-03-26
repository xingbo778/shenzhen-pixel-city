import { describe, expect, test, vi } from "vitest";
import { getAnalyticsConfig, injectAnalyticsScript } from "@/lib/analytics";

describe("analytics", () => {
  test("builds config only when env is complete", () => {
    expect(getAnalyticsConfig({})).toBeNull();
    expect(getAnalyticsConfig({
      VITE_ANALYTICS_ENDPOINT: "https://stats.example.com/",
      VITE_ANALYTICS_WEBSITE_ID: "site-123",
    })).toEqual({
      endpoint: "https://stats.example.com",
      websiteId: "site-123",
    });
  });

  test("injects script once", () => {
    const appendChild = vi.fn();
    const created = {
      defer: false,
      src: "",
      dataset: {} as Record<string, string>,
    };
    const doc = {
      querySelector: vi.fn().mockReturnValueOnce(null).mockReturnValueOnce(created),
      createElement: vi.fn().mockReturnValue(created),
      head: { appendChild },
    } as unknown as Document;

    injectAnalyticsScript(doc, {
      endpoint: "https://stats.example.com",
      websiteId: "site-123",
    });
    injectAnalyticsScript(doc, {
      endpoint: "https://stats.example.com",
      websiteId: "site-123",
    });

    expect(created.src).toBe("https://stats.example.com/umami");
    expect(created.dataset.websiteId).toBe("site-123");
    expect(appendChild).toHaveBeenCalledTimes(1);
  });
});
