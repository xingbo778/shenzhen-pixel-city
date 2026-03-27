/**
 * Home - 深圳像素城市主页面
 * 布局：顶部 Header + 左侧地图(60%) + 右侧面板(40%)
 *       右侧面板：上半 Bot 卡片网格 + 下半 标签页信息面板
 *       点击 Bot 卡片时右侧切换为 Bot 详情
 */

import { useState, useCallback, useRef, useEffect, useMemo, lazy, Suspense } from "react";
import { useWorldData, sendMessage, setEngineUrl, type DataSourceMode } from "@/hooks/useWorldData";
import { OVERVIEW_TO_SCENE_KEY } from "@/config/scenes";
import BotCard from "@/components/BotCard";
import TopHeader from "@/components/TopHeader";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft } from "lucide-react";

const ENGINE_URL_STORAGE_KEY = "szpc.engineUrl";
const DATA_SOURCE_MODE_STORAGE_KEY = "szpc.dataSourceMode";

function getInitialEngineUrl() {
  const fallback = (import.meta.env.VITE_ENGINE_URL as string) || "http://localhost:8000";
  if (typeof window === "undefined") return fallback;

  try {
    return window.localStorage.getItem(ENGINE_URL_STORAGE_KEY) || fallback;
  } catch {
    return fallback;
  }
}

function getInitialDataSourceMode(): DataSourceMode {
  if (typeof window === "undefined") return "auto";
  try {
    const saved = window.localStorage.getItem(DATA_SOURCE_MODE_STORAGE_KEY);
    if (saved === "auto" || saved === "real" || saved === "mock") return saved;
  } catch {
    // ignore storage failures
  }
  return "auto";
}

const PixelCityMap3D = lazy(() => import("@/components/PixelCityMap3D"));
const CityOverviewMap = lazy(() => import("@/components/CityOverviewMap"));
const BotDetailPanel = lazy(() => import("@/components/BotDetailPanel"));
const RightPanel = lazy(() => import("@/components/RightPanel"));

function PanelFallback({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function RealModeEmptyState({
  engineUrl,
  error,
  onRetry,
}: {
  engineUrl: string;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/92 backdrop-blur-sm">
      <div className="max-w-md px-6 text-center">
        <div className="text-sm font-medium text-foreground">REAL 模式未连接到 world_engine</div>
        <div className="mt-2 text-xs leading-relaxed text-muted-foreground">
          当前只允许使用真实后端数据，演示数据已禁用。
        </div>
        <div className="mt-3 rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-left text-xs text-muted-foreground">
          <div>地址: {engineUrl}</div>
          <div className="mt-1">错误: {error || "未获取到 world_engine 响应"}</div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onRetry}>
            重试连接
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [engineUrl, setEngineUrlState] = useState(getInitialEngineUrl);
  const [dataSourceMode, setDataSourceMode] = useState<DataSourceMode>(getInitialDataSourceMode);
  const { world, moments, isConnected, isLoading, lastUpdated, error, refresh } = useWorldData(3000, engineUrl, dataSourceMode);

  const handleEngineUrlChange = useCallback((url: string) => {
    const normalizedUrl = url.trim().replace(/\/$/, "");
    if (!normalizedUrl) {
      toast.error("请输入有效的 world_engine 地址");
      return;
    }

    setEngineUrlState(normalizedUrl);
    setEngineUrl(normalizedUrl);
    toast.success(`world_engine 已切换到 ${normalizedUrl}`);
  }, []);

  useEffect(() => {
    setEngineUrl(engineUrl);
    try {
      window.localStorage.setItem(ENGINE_URL_STORAGE_KEY, engineUrl);
    } catch {
      // ignore storage failures
    }
  }, [engineUrl]);

  useEffect(() => {
    try {
      window.localStorage.setItem(DATA_SOURCE_MODE_STORAGE_KEY, dataSourceMode);
    } catch {
      // ignore storage failures
    }
  }, [dataSourceMode]);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [currentMapLocation, setCurrentMapLocation] = useState<string>('宝安城中村');
  const [showBotDetail, setShowBotDetail] = useState(false);
  const [mapLayer, setMapLayer] = useState<'overview' | 'scene'>('overview');
  const [zoomAnimating, setZoomAnimating] = useState(false);

  const handleBotClick = useCallback((botId: string) => {
    setSelectedBotId(botId);
    setShowBotDetail(true);
  }, []);

  const handleLocationClick = useCallback((location: string) => {
    setSelectedLocation(location);
    setCurrentMapLocation(location);
    setShowBotDetail(false);
  }, []);

  const handleOverviewLocationSelect = useCallback((locationKey: string) => {
    const sceneName = OVERVIEW_TO_SCENE_KEY[locationKey] || '宝安城中村';
    setZoomAnimating(true);
    setTimeout(() => {
      setCurrentMapLocation(sceneName);
      setSelectedLocation(sceneName);
      setMapLayer('scene');
      setZoomAnimating(false);
    }, 350);
  }, []);

  const handleSendMessage = useCallback(async (botId: string, msg: string) => {
    const ok = await sendMessage(botId, msg);
    if (ok) {
      toast.success(`消息已发送给 ${world?.bots[botId]?.name || botId}`);
    } else {
      toast.error("发送失败，请检查 world_engine 是否运行");
    }
  }, [world]);

  const aliveBots = useMemo(() =>
    world
      ? Object.entries(world.bots).filter(([, b]) => b.status === "alive")
      : [],
    [world]
  );

  const selectedBot = selectedBotId && world ? world.bots[selectedBotId] : null;

  // Lazy-load Bot cards
  const [visibleBotIds, setVisibleBotIds] = useState<Set<string>>(new Set());
  const botCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        setVisibleBotIds(prev => {
          const next = new Set(prev);
          entries.forEach(e => {
            const id = (e.target as HTMLElement).dataset.botid;
            if (id) { if (e.isIntersecting) next.add(id); }
          });
          return next;
        });
      },
      { threshold: 0.01 }
    );
    Object.entries(botCardRefs.current).forEach(([, el]) => { if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [aliveBots]);

  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col">
      {/* 顶部 Header */}
      <TopHeader
        world={world}
        isConnected={isConnected}
        isLoading={isLoading}
        lastUpdated={lastUpdated}
        engineUrl={engineUrl}
        dataSourceMode={dataSourceMode}
        onEngineUrlChange={handleEngineUrlChange}
        onDataSourceModeChange={setDataSourceMode}
        onRefresh={refresh}
      />

      {/* 主体区域 */}
      <div className="flex flex-1 overflow-hidden">

        {/* 左侧：像素城市地图 */}
        <div className="relative w-[60%] border-r border-white/[0.06] overflow-hidden">
          {/* 地图标题 */}
          <div className="absolute top-2 left-3 z-10 pointer-events-none">
            <span className="text-xs text-muted-foreground">
              {mapLayer === 'overview' ? 'PIXEL MAP · SHENZHEN' : `SCENE · ${currentMapLocation.toUpperCase()}`}
            </span>
          </div>

          {/* 返回全景按钮 */}
          {mapLayer === 'scene' && (
            <Button
              onClick={() => setMapLayer('overview')}
              variant="outline"
              size="sm"
              data-testid="back-to-overview"
              className="absolute top-2 right-3 z-20 h-7 text-xs backdrop-blur-sm"
            >
              <ArrowLeft className="size-3.5" />
              全城视图
            </Button>
          )}

          {/* 全景提示 */}
          {mapLayer === 'overview' && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 text-xs text-muted-foreground pointer-events-none">
              点击地点进入场景
            </div>
          )}

          {/* 缩放动画遮罩 */}
          {zoomAnimating && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/85 backdrop-blur-sm">
              <div className="text-sm text-primary">
                进入 {currentMapLocation}...
              </div>
            </div>
          )}

          {/* 加载状态 */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-background/70 backdrop-blur-sm">
              <div className="text-center">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent mx-auto mb-2 animate-spin" />
                <div className="text-xs text-primary">
                  连接 world_engine...
                </div>
              </div>
            </div>
          )}

          {dataSourceMode === "mock" && !isLoading && (
            <div className="absolute top-10 left-3 z-10 rounded-md border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] text-emerald-300 backdrop-blur-sm">
              MOCK MODE · 使用内置演示数据
            </div>
          )}

          {dataSourceMode === "real" && !isConnected && !isLoading && !world && (
            <RealModeEmptyState engineUrl={engineUrl} error={error} onRetry={refresh} />
          )}

          {/* 错误提示 */}
          {dataSourceMode !== "mock" && dataSourceMode !== "real" && !isConnected && !isLoading && (
            <Alert variant="destructive" className="absolute bottom-8 left-3 right-3 z-10">
              <AlertTriangle className="size-4" />
              <AlertDescription className="text-xs">
                <div>无法连接到 world_engine ({engineUrl})。</div>
                <div className="mt-1 text-destructive/80">
                  {error || "请确保 world_engine_v8.py 正在运行，或修改上方地址。"}
                </div>
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => refresh()}
                  >
                    重试连接
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* 全景层 */}
          {mapLayer === 'overview' && (
            <Suspense fallback={<PanelFallback label="加载全景地图..." />}>
              <div className="absolute inset-0">
                <CityOverviewMap
                  world={world}
                  onLocationSelect={handleOverviewLocationSelect}
                />
              </div>
            </Suspense>
          )}

          {/* 场景层 */}
          {mapLayer === 'scene' && (
            <Suspense fallback={<PanelFallback label="加载 3D 场景..." />}>
              <div className="absolute inset-0">
                <PixelCityMap3D
                  world={world}
                  selectedBotId={selectedBotId}
                  onBotClick={handleBotClick}
                  onLocationClick={handleLocationClick}
                  currentLocation={currentMapLocation}
                />
              </div>
            </Suspense>
          )}
        </div>

        {/* 右侧面板 */}
        <div className="flex flex-col w-[40%] overflow-hidden">

          {/* Bot 状态网格（上半部分） */}
          <div
            className="shrink-0 overflow-y-auto border-b border-white/[0.06] transition-[height] duration-300"
            style={{ height: showBotDetail ? "0" : "45%" }}
          >
            <div className="px-2 pt-2 pb-1 flex items-center justify-between sticky top-0 z-10 glass-panel-solid border-0 border-b border-white/[0.06]">
              <span className="text-xs text-muted-foreground">
                BOT STATUS · {aliveBots.length} ACTIVE
              </span>
              {selectedBotId && (
                <button
                  onClick={() => { setSelectedBotId(null); setShowBotDetail(false); }}
                  className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                >
                  清除选择
                </button>
              )}
            </div>
            <div className="p-2 grid grid-cols-2 gap-1.5">
              {aliveBots.map(([botId, bot]) => (
                <div
                  key={botId}
                  data-botid={botId}
                  data-testid={`bot-card-shell-${botId}`}
                  ref={el => { botCardRefs.current[botId] = el; }}
                  style={{ minHeight: 80 }}
                >
                  {(visibleBotIds.has(botId) || selectedBotId === botId) ? (
                    <BotCard
                      botId={botId}
                      bot={bot}
                      isSelected={selectedBotId === botId}
                      onClick={() => handleBotClick(botId)}
                    />
                  ) : (
                    <div className="w-full h-full rounded-md bg-white/[0.02]" style={{ minHeight: 80 }} />
                  )}
                </div>
              ))}
              {aliveBots.length === 0 && (
                <div className="col-span-2 flex items-center justify-center h-20 text-xs text-muted-foreground/40">
                  {isLoading ? "加载中..." : "暂无存活 Bot"}
                </div>
              )}
            </div>
          </div>

          {/* Bot 详情面板 */}
          {showBotDetail && selectedBot && (
            <div
              data-testid="bot-detail-panel"
              className="shrink-0 overflow-hidden border-b border-white/[0.06]"
              style={{ height: "45%" }}
            >
              <Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-muted-foreground">加载 Bot 详情...</div>}>
                <BotDetailPanel
                  botId={selectedBotId}
                  bot={selectedBot}
                  onClose={() => setShowBotDetail(false)}
                  onSendMessage={handleSendMessage}
                />
              </Suspense>
            </div>
          )}

          {/* 下半部分：标签页信息面板 */}
          <div className="flex-1 overflow-hidden">
            <Suspense fallback={<div className="flex h-full items-center justify-center text-xs text-muted-foreground">加载侧边栏...</div>}>
              <RightPanel
                world={world}
                moments={moments}
                selectedLocation={selectedLocation}
                onBotClick={handleBotClick}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
