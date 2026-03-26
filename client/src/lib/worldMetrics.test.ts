import { describe, expect, test } from "vitest";
import { MOCK_WORLD } from "@/lib/mockData";
import { getWorldMetrics } from "@/lib/worldMetrics";

describe("getWorldMetrics", () => {
  test("counts only alive bots", () => {
    const world = {
      ...MOCK_WORLD,
      bots: {
        ...MOCK_WORLD.bots,
        bot_dead: {
          ...MOCK_WORLD.bots.bot_1,
          id: "bot_dead",
          status: "dead" as const,
          money: 999999,
          emotions: {
            ...MOCK_WORLD.bots.bot_1.emotions,
            happiness: 1,
          },
        },
      },
    };

    const metrics = getWorldMetrics(world);

    expect(metrics.aliveBots).toBe(Object.values(MOCK_WORLD.bots).length);
    expect(metrics.totalMoney).toBe(
      Object.values(MOCK_WORLD.bots).reduce((sum, bot) => sum + bot.money, 0)
    );
  });
});

