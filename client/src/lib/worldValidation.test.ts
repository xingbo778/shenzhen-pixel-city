import { describe, expect, test } from "vitest";
import { MOCK_MOMENTS, MOCK_WORLD } from "@/lib/mockData";
import { parseMomentsPayload, parseWorldPayload } from "@/lib/worldValidation";

describe("worldValidation", () => {
  test("accepts a valid world payload", () => {
    expect(parseWorldPayload(MOCK_WORLD)).toEqual(MOCK_WORLD);
  });

  test("rejects an invalid world payload", () => {
    expect(() => parseWorldPayload({ bots: {} })).toThrow();
  });

  test("accepts moments arrays and envelopes", () => {
    expect(parseMomentsPayload(MOCK_MOMENTS)).toEqual(MOCK_MOMENTS);
    expect(parseMomentsPayload({ moments: MOCK_MOMENTS })).toEqual(MOCK_MOMENTS);
  });
});

