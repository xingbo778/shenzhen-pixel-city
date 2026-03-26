/**
 * TopHeader - 城市运营中心顶部横幅
 * 包含：系统标题、虚拟时间、天气、全局统计、新闻滚动条
 */

import { WEATHER_ICONS } from "@/types/world";
import type { WorldState } from "@/types/world";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getWorldMetrics } from "@/lib/worldMetrics";
import { useEffect, useState } from "react";
import { DatabaseZap, RefreshCw, ServerCrash, TestTube2 } from "lucide-react";
import type { DataSourceMode } from "@/hooks/useWorldData";

interface Props {
  world: WorldState | null;
  isConnected: boolean;
  isLoading: boolean;
  lastUpdated: Date | null;
  engineUrl: string;
  dataSourceMode: DataSourceMode;
  onEngineUrlChange: (url: string) => void;
  onDataSourceModeChange: (mode: DataSourceMode) => void;
  onRefresh: () => void;
}

export default function TopHeader({
  world,
  isConnected,
  isLoading,
  lastUpdated,
  engineUrl,
  dataSourceMode,
  onEngineUrlChange,
  onDataSourceModeChange,
  onRefresh,
}: Props) {
  const time = world?.time;
  const weather = world?.weather;
  const weatherIcon = weather ? (WEATHER_ICONS[weather.current] || "🌤️") : "🌤️";
  const { aliveBots, totalMoney, avgHappiness } = getWorldMetrics(world);
  const [draftUrl, setDraftUrl] = useState(engineUrl);

  useEffect(() => {
    setDraftUrl(engineUrl);
  }, [engineUrl]);

  const normalizedDraft = draftUrl.trim();
  const isDirty = normalizedDraft !== engineUrl;

  const modeMeta: Record<DataSourceMode, {
    label: string;
    hint: string;
    badgeClassName: string;
    icon: typeof DatabaseZap;
  }> = {
    auto: {
      label: "AUTO",
      hint: "优先真实后端，首次连接失败时自动回退到演示数据",
      badgeClassName: "border-cyan-400/30 text-cyan-300",
      icon: DatabaseZap,
    },
    real: {
      label: "REAL",
      hint: "只使用 world_engine；若后端不可用则显示空状态与错误信息",
      badgeClassName: "border-amber-400/30 text-amber-300",
      icon: ServerCrash,
    },
    mock: {
      label: "MOCK",
      hint: "始终使用内置演示数据，不依赖 world_engine",
      badgeClassName: "border-emerald-400/30 text-emerald-300",
      icon: TestTube2,
    },
  };
  const activeModeMeta = modeMeta[dataSourceMode];
  const ModeIcon = activeModeMeta.icon;

  const handleSubmit = () => {
    if (!normalizedDraft) return;
    onEngineUrlChange(normalizedDraft);
  };

  const newsItems = world?.news_feed || [];
  const hotTopics = world?.hot_topics || [];
  const allNews = [
    ...newsItems.map(n => `【${n.source}】${n.headline}`),
    ...hotTopics.map(t => `🔥 ${t}`),
  ];

  return (
    <header className="shrink-0 flex flex-col glass-panel-solid border-t-0 border-x-0">
      {/* 主行 */}
      <div className="flex items-center gap-4 px-4 py-2">
        {/* 标题 */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-base font-orbitron font-bold text-primary tracking-wider">
            深圳像素城市
          </div>
          <Badge variant="outline" className="text-[10px] font-orbitron">
            LIVE SIM
          </Badge>
          <Badge variant="outline" className={`text-[10px] font-orbitron ${activeModeMeta.badgeClassName}`}>
            <ModeIcon className="size-3" />
            {activeModeMeta.label}
          </Badge>
        </div>

        {/* 虚拟时间 */}
        {time && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">虚拟时间</span>
            <span className="text-sm font-mono-data text-primary">
              {time.virtual_datetime?.slice(0, 16) || `第${time.tick}轮`}
            </span>
          </div>
        )}

        {/* 天气 */}
        {weather && (
          <div className="flex items-center gap-1 shrink-0">
            <span>{weatherIcon}</span>
            <span className="text-xs text-muted-foreground">{weather.current}</span>
          </div>
        )}

        {/* 全局统计 */}
        <div className="flex items-center gap-4 shrink-0">
          <StatItem label="在线" value={`${aliveBots}人`} className="text-green-400" />
          <StatItem label="总资产" value={`¥${totalMoney}`} className="text-yellow-300" />
          <StatItem label="平均快乐" value={`${avgHappiness}%`} className="text-purple-400" />
          {world?.generation_count !== undefined && (
            <StatItem label="世代" value={`G${world.generation_count}`} className="text-orange-400" />
          )}
        </div>

        <div className="flex-1" />

        {/* 连接状态 + Engine URL */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
              }`}
            />
            <span className={`text-xs ${isConnected ? "text-green-400" : "text-red-400"}`}>
              {isConnected ? "已连接" : "离线"}
            </span>
          </div>
          <select
            value={dataSourceMode}
            onChange={e => onDataSourceModeChange(e.target.value as DataSourceMode)}
            className="h-7 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 text-xs text-muted-foreground outline-none focus:border-primary/40"
          >
            <option value="auto">AUTO</option>
            <option value="real">REAL</option>
            <option value="mock">MOCK</option>
          </select>
          <input
            type="text"
            value={draftUrl}
            onChange={e => setDraftUrl(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className="text-xs px-2.5 py-1 rounded-md outline-none w-44 bg-white/[0.04] border border-white/[0.08] text-muted-foreground focus:border-primary/40 transition-colors"
            placeholder="http://localhost:8000"
            disabled={dataSourceMode === "mock"}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleSubmit}
            disabled={dataSourceMode === "mock" || !normalizedDraft || !isDirty}
          >
            应用
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={isLoading ? "size-3.5 animate-spin" : "size-3.5"} />
            刷新
          </Button>
          {lastUpdated && (
            <span className="text-[10px] text-muted-foreground/50">
              {lastUpdated.toLocaleTimeString("zh-CN")}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-1 text-[10px] text-muted-foreground/70 border-t border-white/[0.04]">
        数据模式:
        <span className="ml-1 text-foreground/80">{activeModeMeta.hint}</span>
      </div>

      {/* 新闻滚动条 */}
      {allNews.length > 0 && (
        <div className="flex items-center overflow-hidden h-[22px] border-t border-white/[0.06] bg-white/[0.02]">
          <div className="shrink-0 px-2.5 text-[10px] font-orbitron text-primary border-r border-white/[0.08]">
            NEWS
          </div>
          <div className="flex-1 overflow-hidden relative">
            <div className="flex gap-8 whitespace-nowrap text-xs text-muted-foreground/60 animate-ticker">
              {[...allNews, ...allNews].map((item, i) => (
                <span key={i} className="shrink-0">{item}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 世界叙事 */}
      {world?.world_narrative && (
        <div className="px-4 py-1 text-xs truncate text-muted-foreground/40 border-t border-white/[0.04]">
          📖 {world.world_narrative}
        </div>
      )}
    </header>
  );
}

function StatItem({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-mono-data ${className}`}>{value}</span>
    </div>
  );
}
