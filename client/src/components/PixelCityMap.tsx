/**
 * PixelCityMap - 像素深圳城市地图
 * 设计哲学：城市运营中心（NOC Dashboard）
 * - 深色底板，霓虹发光地点标记
 * - Bot 用彩色像素头像在地图上实时移动
 * - 复用 pixel-agents 的 Canvas 渲染思路（分层绘制、Z轴排序、平滑插值）
 */

import { useRef, useEffect, useCallback, useState } from "react";
import type { WorldState, BotState } from "@/types/world";
import { LOCATION_MAP_CONFIG, BOT_COLORS, getEmotionColor } from "@/types/world";

interface BotPosition {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}

interface Props {
  world: WorldState | null;
  selectedBotId: string | null;
  onBotClick: (botId: string) => void;
  onLocationClick: (location: string) => void;
}

// 像素字体渲染（模拟 pixel-agents 的 sprite 系统）
function drawPixelText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  size = 10
) {
  ctx.font = `${size}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(text, x, y);
}

// 绘制发光圆圈（地点标记）
function drawGlowCircle(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number, color: string, alpha = 0.8
) {
  // 外发光
  const gradient = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 2);
  gradient.addColorStop(0, color + "66");
  gradient.addColorStop(1, "transparent");
  ctx.beginPath();
  ctx.arc(x, y, r * 2, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // 主圆
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = alpha;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

// 绘制 Bot 像素头像（8x8 像素点阵风格）
function drawBotAvatar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  color: string,
  name: string,
  isSleeping: boolean,
  isSelected: boolean,
  emotionColor: string,
  size = 14
) {
  // 选中高亮
  if (isSelected) {
    ctx.beginPath();
    ctx.arc(x, y, size + 4, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 情绪光晕
  const glowGrad = ctx.createRadialGradient(x, y, size * 0.5, x, y, size * 1.8);
  glowGrad.addColorStop(0, emotionColor + "44");
  glowGrad.addColorStop(1, "transparent");
  ctx.beginPath();
  ctx.arc(x, y, size * 1.8, 0, Math.PI * 2);
  ctx.fillStyle = glowGrad;
  ctx.fill();

  // 头像背景
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fillStyle = "#0d1a2e";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = isSleeping ? 1 : 2;
  ctx.globalAlpha = isSleeping ? 0.6 : 1;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // 像素人形（简化的 8x8 风格）
  const s = size * 0.35;
  // 头部
  ctx.fillStyle = color;
  ctx.fillRect(x - s * 0.7, y - s * 1.8, s * 1.4, s * 1.2);
  // 身体
  ctx.fillRect(x - s * 0.9, y - s * 0.6, s * 1.8, s * 1.2);
  // 腿
  ctx.fillRect(x - s * 0.8, y + s * 0.6, s * 0.7, s * 0.8);
  ctx.fillRect(x + s * 0.1, y + s * 0.6, s * 0.7, s * 0.8);

  // 名字标签
  ctx.font = "9px 'Noto Sans SC', sans-serif";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.globalAlpha = 0.9;
  ctx.fillText(name.slice(0, 3), x, y + size + 12);
  ctx.globalAlpha = 1;

  // 睡觉 zzz
  if (isSleeping) {
    ctx.font = "10px sans-serif";
    ctx.fillText("💤", x + size * 0.8, y - size * 0.8);
  }
}

// 绘制道路网络（深圳简化路网）
function drawRoads(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = "rgba(77, 150, 255, 0.12)";
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 8]);

  // 横向主干道
  const roads = [
    // 连接宝安-南山科技园-福田CBD
    [[0.05, 0.35], [0.32, 0.28], [0.62, 0.22], [0.85, 0.20]],
    // 连接南山公寓-华强北-东门老街
    [[0.22, 0.68], [0.52, 0.48], [0.72, 0.58], [0.90, 0.62]],
    // 连接深圳湾公园-南山科技园
    [[0.38, 0.82], [0.32, 0.28]],
    // 纵向：宝安-南山公寓-深圳湾
    [[0.15, 0.52], [0.22, 0.68], [0.38, 0.82]],
    // 纵向：华强北-福田CBD
    [[0.52, 0.48], [0.62, 0.22]],
    // 纵向：东门-华强北
    [[0.72, 0.58], [0.52, 0.48]],
  ];

  for (const road of roads) {
    ctx.beginPath();
    road.forEach(([rx, ry], i) => {
      const px = rx * w, py = ry * h;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

// 绘制地点连线（当有 Bot 在两地之间移动时）
function drawConnectionLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number, color: string
) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color + "40";
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
}

export default function PixelCityMap({ world, selectedBotId, onBotClick, onLocationClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const botPositionsRef = useRef<Record<string, BotPosition>>({});
  const animFrameRef = useRef<number>(0);
  const [hoveredBot, setHoveredBot] = useState<string | null>(null);
  const [hoveredLoc, setHoveredLoc] = useState<string | null>(null);
  const pulseRef = useRef(0);

  // 更新 Bot 目标位置（当 world 数据变化时）
  useEffect(() => {
    if (!world || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const w = canvas.width, h = canvas.height;

    Object.entries(world.bots).forEach(([botId, bot]) => {
      const locConfig = LOCATION_MAP_CONFIG[bot.location];
      if (!locConfig) return;

      // 在地点周围随机散布，避免重叠
      const botsAtLoc = world.locations[bot.location]?.bots || [];
      const idx = botsAtLoc.indexOf(botId);
      const total = botsAtLoc.length;
      const angle = (idx / Math.max(total, 1)) * Math.PI * 2;
      const spread = Math.min(total * 6, 30);
      const tx = (locConfig.x / 100) * w + Math.cos(angle) * spread;
      const ty = (locConfig.y / 100) * h + Math.sin(angle) * spread;

      if (!botPositionsRef.current[botId]) {
        botPositionsRef.current[botId] = { x: tx, y: ty, targetX: tx, targetY: ty };
      } else {
        botPositionsRef.current[botId].targetX = tx;
        botPositionsRef.current[botId].targetY = ty;
      }
    });
  }, [world]);

  // 主渲染循环（复用 pixel-agents 的 gameLoop 思路）
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr, h = canvas.height / dpr;
    pulseRef.current = (pulseRef.current + 0.03) % (Math.PI * 2);
    const pulse = Math.sin(pulseRef.current);

    // 清空画布，应用 DPR 缩放变换
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    // 背景：深色渐变
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, "#060b14");
    bgGrad.addColorStop(1, "#0a1428");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 网格线（科技感底纹）
    ctx.strokeStyle = "rgba(77, 150, 255, 0.04)";
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    if (!world) {
      // 离线状态
      ctx.font = "14px 'Orbitron', sans-serif";
      ctx.fillStyle = "rgba(77, 150, 255, 0.4)";
      ctx.textAlign = "center";
      ctx.fillText("等待连接 world_engine...", w / 2, h / 2);
      animFrameRef.current = requestAnimationFrame(render);
      return;
    }

    // 绘制道路
    drawRoads(ctx, w, h);

    // 绘制地点标记
    Object.entries(LOCATION_MAP_CONFIG).forEach(([locName, cfg]) => {
      const x = (cfg.x / 100) * w;
      const y = (cfg.y / 100) * h;
      const botsHere = world.locations[locName]?.bots?.length || 0;
      const isHovered = hoveredLoc === locName;

      // 地点发光圆
      const r = 18 + (isHovered ? 4 : 0);
      drawGlowCircle(ctx, x, y, r, cfg.color, 0.6 + pulse * 0.2);

      // 地点图标
      ctx.font = `${isHovered ? 20 : 18}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(cfg.icon, x, y + 6);

      // 地点名称
      ctx.font = "10px 'Noto Sans SC', sans-serif";
      ctx.fillStyle = cfg.color;
      ctx.globalAlpha = 0.9;
      ctx.fillText(cfg.label, x, y + r + 14);
      ctx.globalAlpha = 1;

      // Bot 数量徽章
      if (botsHere > 0) {
        ctx.beginPath();
        ctx.arc(x + r * 0.7, y - r * 0.7, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#ff6b6b";
        ctx.fill();
        ctx.font = "bold 9px 'JetBrains Mono', monospace";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.fillText(String(botsHere), x + r * 0.7, y - r * 0.7 + 3);
      }
    });

    // 平滑插值 Bot 位置（lerp，复用 pixel-agents characters.ts 的移动逻辑）
    const lerpFactor = 0.08;
    Object.entries(botPositionsRef.current).forEach(([, pos]) => {
      pos.x += (pos.targetX - pos.x) * lerpFactor;
      pos.y += (pos.targetY - pos.y) * lerpFactor;
    });

    // 绘制 Bot（按 Y 轴排序，实现 Z 轴深度感，复用 pixel-agents renderer.ts 的 zY 排序）
    const aliveBots = Object.entries(world.bots)
      .filter(([, b]) => b.status === "alive")
      .sort(([idA, bA], [idB, bB]) => {
        const posA = botPositionsRef.current[idA];
        const posB = botPositionsRef.current[idB];
        return (posA?.y || 0) - (posB?.y || 0);
      });

    aliveBots.forEach(([botId, bot]) => {
      const pos = botPositionsRef.current[botId];
      if (!pos) return;

      const color = BOT_COLORS[botId] || "#4d96ff";
      const emotionColor = getEmotionColor(bot.emotions);
      const isSelected = selectedBotId === botId;
      const isHovered = hoveredBot === botId;

      drawBotAvatar(
        ctx, pos.x, pos.y,
        color,
        bot.name,
        bot.is_sleeping,
        isSelected || isHovered,
        emotionColor,
        isHovered ? 16 : 14
      );
    });

    // 扫描线叠加（科技感）
    ctx.fillStyle = "rgba(0, 0, 0, 0.03)";
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }

    ctx.restore();
    animFrameRef.current = requestAnimationFrame(render);
  }, [world, selectedBotId, hoveredBot, hoveredLoc]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  // 处理鼠标点击
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !world) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    // 检查是否点击了 Bot
    for (const [botId, pos] of Object.entries(botPositionsRef.current)) {
      const dist = Math.hypot(mx - pos.x, my - pos.y);
      if (dist < 18) {
        onBotClick(botId);
        return;
      }
    }

    // 检查是否点击了地点
    const w = canvas.width, h = canvas.height;
    for (const [locName, cfg] of Object.entries(LOCATION_MAP_CONFIG)) {
      const lx = (cfg.x / 100) * w;
      const ly = (cfg.y / 100) * h;
      const dist = Math.hypot(mx - lx, my - ly);
      if (dist < 28) {
        onLocationClick(locName);
        return;
      }
    }
  }, [world, onBotClick, onLocationClick]);

  // 处理鼠标移动（hover 检测）
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !world) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    // Bot hover
    let foundBot: string | null = null;
    for (const [botId, pos] of Object.entries(botPositionsRef.current)) {
      if (Math.hypot(mx - pos.x, my - pos.y) < 18) { foundBot = botId; break; }
    }
    setHoveredBot(foundBot);

    // 地点 hover
    const w = canvas.width, h = canvas.height;
    let foundLoc: string | null = null;
    for (const [locName, cfg] of Object.entries(LOCATION_MAP_CONFIG)) {
      const lx = (cfg.x / 100) * w;
      const ly = (cfg.y / 100) * h;
      if (Math.hypot(mx - lx, my - ly) < 28) { foundLoc = locName; break; }
    }
    setHoveredLoc(foundLoc);
  }, [world]);

  // 响应式 Canvas 尺寸
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      // 设置物理像素尺寸
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      // CSS 尺寸保持不变（由 className w-full h-full 控制）
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ cursor: hoveredBot || hoveredLoc ? "pointer" : "default", imageRendering: "pixelated" }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { setHoveredBot(null); setHoveredLoc(null); }}
    />
  );
}
