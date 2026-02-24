import { useState, useEffect, useCallback, useRef } from "react";
import type { WorldState, Moment } from "@/types/world";
import { MOCK_WORLD, MOCK_MOMENTS } from "@/lib/mockData";

// world_engine 的 API 地址，支持环境变量覆盖
const ENGINE_URL = (import.meta.env.VITE_ENGINE_URL as string) || "http://localhost:8000";

export interface WorldDataState {
  world: WorldState | null;
  moments: Moment[];
  isConnected: boolean;
  isLoading: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

export function useWorldData(pollInterval = 3000) {
  const [state, setState] = useState<WorldDataState>({
    world: null,
    moments: [],
    isConnected: false,
    isLoading: true,
    lastUpdated: null,
    error: null,
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const fetchWorld = useCallback(async () => {
    try {
      const [worldRes, momentsRes] = await Promise.all([
        fetch(`${ENGINE_URL}/world`, { signal: AbortSignal.timeout(5000) }),
        fetch(`${ENGINE_URL}/moments`, { signal: AbortSignal.timeout(5000) }),
      ]);

      if (!worldRes.ok) throw new Error(`HTTP ${worldRes.status}`);

      const worldData: WorldState = await worldRes.json();
      const momentsData = momentsRes.ok ? await momentsRes.json() : { moments: [] };

      if (!isMountedRef.current) return;

      setState(prev => ({
        ...prev,
        world: worldData,
        moments: momentsData.moments || [],
        isConnected: true,
        isLoading: false,
        lastUpdated: new Date(),
        error: null,
      }));
    } catch (err) {
      if (!isMountedRef.current) return;
      // 连接失败时使用 Mock 数据，让界面可以正常展示
      setState(prev => ({
        ...prev,
        world: prev.world || MOCK_WORLD,
        moments: prev.moments.length > 0 ? prev.moments : MOCK_MOMENTS,
        isConnected: false,
        isLoading: false,
        error: err instanceof Error ? err.message : "连接失败",
      }));
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchWorld();

    const schedule = () => {
      timerRef.current = setTimeout(() => {
        fetchWorld().then(() => {
          if (isMountedRef.current) schedule();
        });
      }, pollInterval);
    };
    schedule();

    return () => {
      isMountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchWorld, pollInterval]);

  return { ...state, refresh: fetchWorld };
}

// 发送消息给 Bot
export async function sendMessage(targetId: string, message: string, senderAlias = "观察者") {
  const res = await fetch(`${ENGINE_URL}/admin/send_message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from: senderAlias, to: targetId, message }),
  });
  return res.ok;
}

// 获取 Bot 详情
export async function fetchBotDetail(botId: string) {
  const res = await fetch(`${ENGINE_URL}/bot/${botId}/detail`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  return res.json();
}
