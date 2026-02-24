/**
 * CityOverviewMap - 深圳全城鸟瞰图
 * 展示7个地点的相对位置，Bot 以彩色光点显示
 * 点击地点进入放大场景（CSS scale 动画）
 *
 * 设计哲学：城市运营中心（NOC Dashboard）风格
 * - 深色底 #060b14，科技蓝网格线
 * - 每个地点有独特的像素建筑轮廓
 * - Bot 光点有呼吸动画
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import type { WorldState } from '@/types/world'
import { BOT_COLORS } from '@/types/world'

// Location positions on the overview map (normalized 0-1)
export const OVERVIEW_LOCATIONS: Record<string, {
  x: number; y: number; label: string; color: string; icon: string
}> = {
  'baoan_urban_village': { x: 0.12, y: 0.55, label: '宝安城中村', color: '#FF8C42', icon: '🏘️' },
  'nanshan_tech_park':   { x: 0.28, y: 0.35, label: '南山科技园', color: '#4D96FF', icon: '🏢' },
  'futian_cbd':          { x: 0.52, y: 0.28, label: '福田CBD',    color: '#FFD700', icon: '🏙️' },
  'huaqiangbei':         { x: 0.62, y: 0.45, label: '华强北',     color: '#FF4D6D', icon: '📱' },
  'dongmen_oldstreet':   { x: 0.72, y: 0.60, label: '东门老街',   color: '#FF6B6B', icon: '🏮' },
  'nanshan_apartments':  { x: 0.35, y: 0.65, label: '南山公寓',   color: '#69DB7C', icon: '🏠' },
  'shenzhen_bay_park':   { x: 0.22, y: 0.80, label: '深圳湾公园', color: '#74C0FC', icon: '🌊' },
}

// Road connections between locations
const ROADS: [string, string][] = [
  ['baoan_urban_village', 'nanshan_tech_park'],
  ['nanshan_tech_park', 'futian_cbd'],
  ['futian_cbd', 'huaqiangbei'],
  ['huaqiangbei', 'dongmen_oldstreet'],
  ['nanshan_tech_park', 'nanshan_apartments'],
  ['nanshan_apartments', 'shenzhen_bay_park'],
  ['baoan_urban_village', 'shenzhen_bay_park'],
  ['nanshan_apartments', 'futian_cbd'],
]

interface Props {
  world: WorldState | null
  onLocationSelect: (location: string) => void
}

export default function CityOverviewMap({ world, onLocationSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const timeRef = useRef(0)
  const lastTimeRef = useRef(0)
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null)
  const hoveredRef = useRef<string | null>(null)

  // Count bots per location
  const botsByLocation = useCallback((): Record<string, string[]> => {
    const result: Record<string, string[]> = {}
    if (!world) return result
    Object.values(world.bots).forEach(bot => {
      const loc = bot.location || 'baoan_urban_village'
      if (!result[loc]) result[loc] = []
      result[loc].push(bot.id)
    })
    return result
  }, [world])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false

    function resize() {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas!.getBoundingClientRect()
      canvas!.width = rect.width * dpr
      canvas!.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    function render(ts: number) {
      const dt = Math.min((ts - lastTimeRef.current) / 1000, 0.05)
      lastTimeRef.current = ts
      timeRef.current += dt

      const t = timeRef.current
      const W = canvas!.getBoundingClientRect().width
      const H = canvas!.getBoundingClientRect().height

      // Background
      ctx.fillStyle = '#060b14'
      ctx.fillRect(0, 0, W, H)

      // Grid lines
      ctx.strokeStyle = 'rgba(77,150,255,0.06)'
      ctx.lineWidth = 1
      const gridSize = 32
      for (let x = 0; x < W; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
      }
      for (let y = 0; y < H; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      }

      // City name watermark
      ctx.fillStyle = 'rgba(77,150,255,0.04)'
      ctx.font = 'bold 80px "Orbitron", monospace'
      ctx.textAlign = 'center'
      ctx.fillText('SHENZHEN', W / 2, H / 2 + 30)

      // Draw roads
      ctx.lineWidth = 2
      ROADS.forEach(([a, b]) => {
        const la = OVERVIEW_LOCATIONS[a]
        const lb = OVERVIEW_LOCATIONS[b]
        if (!la || !lb) return
        const ax = la.x * W, ay = la.y * H
        const bx = lb.x * W, by = lb.y * H
        const grad = ctx.createLinearGradient(ax, ay, bx, by)
        grad.addColorStop(0, 'rgba(77,150,255,0.15)')
        grad.addColorStop(0.5, 'rgba(77,150,255,0.3)')
        grad.addColorStop(1, 'rgba(77,150,255,0.15)')
        ctx.strokeStyle = grad
        ctx.setLineDash([4, 6])
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(bx, by)
        ctx.stroke()
        ctx.setLineDash([])
      })

      // Draw locations
      const bots = botsByLocation()
      Object.entries(OVERVIEW_LOCATIONS).forEach(([key, loc]) => {
        const x = loc.x * W
        const y = loc.y * H
        const isHovered = hoveredRef.current === key
        const botList = bots[key] || []
        const hasBots = botList.length > 0

        // Pulse ring
        const pulse = Math.sin(t * 2 + loc.x * 5) * 0.5 + 0.5
        const ringR = 20 + pulse * 8
        ctx.strokeStyle = loc.color + '44'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(x, y, ringR, 0, Math.PI * 2)
        ctx.stroke()

        // Outer ring (hovered)
        if (isHovered) {
          ctx.strokeStyle = loc.color + 'AA'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(x, y, 26, 0, Math.PI * 2)
          ctx.stroke()
        }

        // Location dot
        const dotR = isHovered ? 14 : 10
        const grad = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, dotR)
        grad.addColorStop(0, loc.color + 'FF')
        grad.addColorStop(1, loc.color + '88')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(x, y, dotR, 0, Math.PI * 2)
        ctx.fill()

        // Inner bright core
        ctx.fillStyle = '#FFFFFF'
        ctx.beginPath()
        ctx.arc(x - 2, y - 2, 3, 0, Math.PI * 2)
        ctx.fill()

        // Bot count badge
        if (hasBots) {
          ctx.fillStyle = '#FF4D6D'
          ctx.beginPath()
          ctx.arc(x + 8, y - 8, 7, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#FFFFFF'
          ctx.font = 'bold 8px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(String(botList.length), x + 8, y - 5)
        }

        // Bot dots orbiting the location
        botList.forEach((botId, i) => {
          const angle = (t * 0.8 + i * (Math.PI * 2 / botList.length))
          const orbitR = 18 + i * 3
          const bx = x + Math.cos(angle) * orbitR
          const by = y + Math.sin(angle) * orbitR
          const botColor = BOT_COLORS[botId] || '#4D96FF'
          ctx.fillStyle = botColor
          ctx.beginPath()
          ctx.arc(bx, by, 3, 0, Math.PI * 2)
          ctx.fill()
          // Glow
          ctx.fillStyle = botColor + '44'
          ctx.beginPath()
          ctx.arc(bx, by, 5, 0, Math.PI * 2)
          ctx.fill()
        })

        // Label
        ctx.fillStyle = isHovered ? '#FFFFFF' : 'rgba(200,220,255,0.8)'
        ctx.font = isHovered ? 'bold 11px "Noto Sans SC", sans-serif' : '10px "Noto Sans SC", sans-serif'
        ctx.textAlign = 'center'
        const labelY = y + dotR + 14
        // Label background
        const labelW = ctx.measureText(loc.label).width + 8
        ctx.fillStyle = 'rgba(6,11,20,0.7)'
        ctx.fillRect(x - labelW / 2, labelY - 10, labelW, 14)
        ctx.fillStyle = isHovered ? loc.color : 'rgba(200,220,255,0.8)'
        ctx.fillText(loc.label, x, labelY)
      })

      // Scan line effect
      const scanY = (t * 80) % H
      const scanGrad = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20)
      scanGrad.addColorStop(0, 'rgba(77,150,255,0)')
      scanGrad.addColorStop(0.5, 'rgba(77,150,255,0.04)')
      scanGrad.addColorStop(1, 'rgba(77,150,255,0)')
      ctx.fillStyle = scanGrad
      ctx.fillRect(0, scanY - 20, W, 40)

      // Title
      ctx.fillStyle = 'rgba(77,150,255,0.6)'
      ctx.font = '10px "Orbitron", monospace'
      ctx.textAlign = 'left'
      ctx.fillText('SHENZHEN CITY MAP', 12, 20)

      // Click hint
      ctx.fillStyle = 'rgba(77,150,255,0.4)'
      ctx.font = '9px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('点击地点进入场景', W / 2, H - 10)

      animFrameRef.current = requestAnimationFrame(render)
    }

    animFrameRef.current = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [botsByLocation])

  const getHitLocation = useCallback((e: React.MouseEvent<HTMLCanvasElement>): string | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    // 将归一化坐标转换为像素坐标进行距离计算，避免宽高比影响
    const px = (e.clientX - rect.left)
    const py = (e.clientY - rect.top)
    const W = rect.width
    const H = rect.height
    const HIT_PX = 28  // 像素单位的点击半径

    let found: string | null = null
    let minDist = Infinity
    Object.entries(OVERVIEW_LOCATIONS).forEach(([key, loc]) => {
      const lx = loc.x * W
      const ly = loc.y * H
      const dx = px - lx, dy = py - ly
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < HIT_PX && dist < minDist) {
        minDist = dist
        found = key
      }
    })
    return found
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const found = getHitLocation(e)
    hoveredRef.current = found
    setHoveredLocation(found)
    canvas.style.cursor = found ? 'pointer' : 'default'
  }, [getHitLocation])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const found = getHitLocation(e)
    if (found) {
      console.log('[CityOverviewMap] clicked location:', found)
      onLocationSelect(found)
    }
  }, [getHitLocation, onLocationSelect])

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />
      {hoveredLocation && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none">
          <div
            className="px-3 py-1 rounded text-xs font-mono border"
            style={{
              background: 'rgba(6,11,20,0.9)',
              borderColor: OVERVIEW_LOCATIONS[hoveredLocation]?.color + '66',
              color: OVERVIEW_LOCATIONS[hoveredLocation]?.color,
            }}
          >
            {OVERVIEW_LOCATIONS[hoveredLocation]?.icon} {OVERVIEW_LOCATIONS[hoveredLocation]?.label} — 点击进入
          </div>
        </div>
      )}
    </div>
  )
}
