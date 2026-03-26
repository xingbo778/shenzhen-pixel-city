import { useState, useEffect, useCallback, useRef } from "react";
import type { WorldState, Moment } from "@/types/world";
import { MOCK_WORLD, MOCK_MOMENTS } from "@/lib/mockData";
import { parseMomentsPayload, parseWorldPayload } from "@/lib/worldValidation";

// 全局 engineUrl，支持运行时动态修改
let _engineUrl = (import.meta.env.VITE_ENGINE_URL as string) || "http://localhost:8000";

export function setEngineUrl(url: string) {
  _engineUrl = url.replace(/\/$/, ""); // 去掉末尾斜杠
}

export function getEngineUrl() {
  return _engineUrl;
}

export interface WorldDataState {
  world: WorldState | null;
  moments: Moment[];
  isConnected: boolean;
  isLoading: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

export type DataSourceMode = "auto" | "real" | "mock";

export function useWorldData(pollInterval = 3000, engineUrl?: string, mode: DataSourceMode = "auto") {
  const [state, setState] = useState<WorldDataState>({
    world: null,
    moments: [],
    isConnected: false,
    isLoading: true,
    lastUpdated: null,
    error: null,
  });

  // 用 ref 追踪最新的 engineUrl，避免 stale closure
  const engineUrlRef = useRef(engineUrl || _engineUrl);
  useEffect(() => {
    engineUrlRef.current = engineUrl || _engineUrl;
  }, [engineUrl]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const hasConnectedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const fetchWorld = useCallback(async () => {
    if (mode === "mock") {
      hasConnectedRef.current = false;
      setState({
        world: MOCK_WORLD,
        moments: MOCK_MOMENTS,
        isConnected: false,
        isLoading: false,
        lastUpdated: new Date(),
        error: null,
      });
      return;
    }

    const requestId = ++requestIdRef.current;
    const url = engineUrlRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const [worldRes, momentsRes] = await Promise.all([
        fetch(`${url}/world`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]) }),
        fetch(`${url}/moments`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]) }),
      ]);

      if (!worldRes.ok) throw new Error(`HTTP ${worldRes.status}`);

      const worldData = parseWorldPayload(await worldRes.json());
      const momentsData = momentsRes.ok ? parseMomentsPayload(await momentsRes.json()) : [];

      if (!isMountedRef.current || requestId !== requestIdRef.current) return;

      hasConnectedRef.current = true;
      setState(prev => ({
        ...prev,
        world: worldData,
        moments: momentsData,
        isConnected: true,
        isLoading: false,
        lastUpdated: new Date(),
        error: null,
      }));
    } catch (err) {
      if (!isMountedRef.current || requestId !== requestIdRef.current) return;
      if (err instanceof DOMException && err.name === "AbortError") return;
      setState(prev => {
        // After first successful connection, keep last real data on disconnect
        // Only use mock data in auto mode when we've NEVER connected successfully
        const useMock = mode === "auto" && !hasConnectedRef.current;
        return {
          ...prev,
          world: useMock ? (prev.world || MOCK_WORLD) : prev.world,
          moments: useMock ? (prev.moments.length > 0 ? prev.moments : MOCK_MOMENTS) : prev.moments,
          isConnected: false,
          isLoading: false,
          error: err instanceof Error ? err.message : "连接失败",
        };
      });
    }
  }, [mode]);

  // 当 engineUrl 变化时立即重新拉取
  useEffect(() => {
    if (engineUrl || mode === "mock") {
      engineUrlRef.current = engineUrl || _engineUrl;
      hasConnectedRef.current = false;
      setState(prev => ({
        ...prev,
        isConnected: false,
        isLoading: true,
        error: null,
      }));
      fetchWorld();
    }
  }, [engineUrl, mode, fetchWorld]);

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
      abortRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchWorld, pollInterval]);

  return { ...state, refresh: fetchWorld };
}

// 发送消息给 Bot
export async function sendMessage(targetId: string, message: string, senderAlias = "观察者") {
  const url = _engineUrl;
  try {
    const res = await fetch(`${url}/admin/send_message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: senderAlias, to: targetId, message }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// 获取 Bot 详情
export async function fetchBotDetail(botId: string) {
  const url = _engineUrl;
  try {
    const res = await fetch(`${url}/bot/${botId}/detail`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
