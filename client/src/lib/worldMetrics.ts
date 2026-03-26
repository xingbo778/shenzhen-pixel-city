import type { WorldState } from "@/types/world";

export interface WorldMetrics {
  aliveBots: number;
  totalMoney: number;
  avgHappiness: number;
}

export function getWorldMetrics(world: WorldState | null): WorldMetrics {
  const aliveBotList = world ? Object.values(world.bots).filter((bot) => bot.status === "alive") : [];
  const aliveBots = aliveBotList.length;
  const totalMoney = aliveBotList.reduce((sum, bot) => sum + (bot.money || 0), 0);
  const avgHappiness = Math.round(
    aliveBotList.reduce((sum, bot) => sum + (bot.emotions?.happiness || 0), 0) / Math.max(aliveBots, 1)
  );

  return { aliveBots, totalMoney, avgHappiness };
}

