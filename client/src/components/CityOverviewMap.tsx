/**
 * CityOverviewMap - 深圳全城鸟瞰图
 * 使用设计图 szpc_overview_map.png 作为背景
 * 在各场景区域叠加可点击热区 + Bot 光点
 *
 * 设计哲学：城市运营中心（NOC Dashboard）风格
 * 深色背景 #0d1117，设计图作为主视觉
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import type { WorldState } from '@/types/world'
import { BOT_COLORS } from '@/types/world'

// CDN URLs for scene images (uploaded via manus-upload-file)
const OVERVIEW_MAP_URL = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663220928499/lWxSeVupnykEUilP.jpg'

// Location hit regions on the overview map image
// The overview map image is 1456x816, these are normalized (0-1) bounding boxes [x, y, w, h]
// Based on visual analysis of szpc_overview_map.png
export const OVERVIEW_LOCATIONS: Record<string, {
  // Center point for Bot dots (normalized 0-1 of image)
  cx: number; cy: number
  // Hit box (normalized)
  x: number; y: number; w: number; h: number
  label: string; color: string; icon: string
}> = {
  'baoan_urban_village': {
    cx: 0.155, cy: 0.195,
    x: 0.02,  y: 0.01,  w: 0.27, h: 0.38,
    label: '城中村', color: '#C4956A', icon: '🏘️'
  },
  'nanshan_tech_park': {
    cx: 0.155, cy: 0.53,
    x: 0.02,  y: 0.39,  w: 0.27, h: 0.28,
    label: '科技园', color: '#4D96FF', icon: '🏢'
  },
  'futian_cbd': {
    cx: 0.46,  cy: 0.42,
    x: 0.30,  y: 0.01,  w: 0.35, h: 0.75,
    label: 'Futian CBD', color: '#FFD700', icon: '🏙️'
  },
  'huaqiangbei': {
    cx: 0.80,  cy: 0.30,
    x: 0.66,  y: 0.01,  w: 0.33, h: 0.48,
    label: '华强北', color: '#FF4DC8', icon: '📱'
  },
  'dongmen_oldstreet': {
    cx: 0.80,  cy: 0.68,
    x: 0.66,  y: 0.50,  w: 0.33, h: 0.48,
    label: '东门老街', color: '#FF6B6B', icon: '🏮'
  },
  'nanshan_apartments': {
    cx: 0.155, cy: 0.77,
    x: 0.02,  y: 0.68,  w: 0.27, h: 0.30,
    label: '南山公寓', color: '#69DB7C', icon: '🏠'
  },
  'shenzhen_bay_park': {
    cx: 0.46,  cy: 0.82,
    x: 0.30,  y: 0.77,  w: 0.35, h: 0.22,
    label: '深圳湾公园', color: '#74C0FC', icon: '🌊'
  },
}

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
  const bgImageRef = useRef<HTMLImageElement | null>(null)
  const bgLoadedRef = useRef(false)

  // Preload background image
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => { bgLoadedRef.current = true; bgImageRef.current = img }
    img.src = OVERVIEW_MAP_URL
  }, [])

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
      ctx.fillStyle = '#0d1117'
      ctx.fillRect(0, 0, W, H)

      // Draw overview map image (letterboxed / cover)
      if (bgLoadedRef.current && bgImageRef.current) {
        const img = bgImageRef.current
        // Scale to cover canvas maintaining aspect ratio
        const imgAspect = img.width / img.height
        const canvasAspect = W / H
        let drawW: number, drawH: number, drawX: number, drawY: number
        if (canvasAspect > imgAspect) {
          drawW = W
          drawH = W / imgAspect
          drawX = 0
          drawY = (H - drawH) / 2
        } else {
          drawH = H
          drawW = H * imgAspect
          drawX = (W - drawW) / 2
          drawY = 0
        }
        ctx.drawImage(img, drawX, drawY, drawW, drawH)

        // Draw hover highlight + bot dots on each location
        const bots = botsByLocation()
        Object.entries(OVERVIEW_LOCATIONS).forEach(([key, loc]) => {
          const rx = drawX + loc.x * drawW
          const ry = drawY + loc.y * drawH
          const rw = loc.w * drawW
          const rh = loc.h * drawH
          const cx = drawX + loc.cx * drawW
          const cy = drawY + loc.cy * drawH
          const isHovered = hoveredRef.current === key
          const botList = bots[key] || []

          // Hover highlight overlay
          if (isHovered) {
            ctx.fillStyle = 'rgba(255,255,255,0.12)'
            ctx.strokeStyle = loc.color + 'CC'
            ctx.lineWidth = 2
            ctx.fillRect(rx, ry, rw, rh)
            ctx.strokeRect(rx, ry, rw, rh)

            // Location label
            ctx.font = 'bold 13px "Noto Sans SC", sans-serif'
            ctx.textAlign = 'center'
            const labelW = ctx.measureText(loc.label).width + 16
            ctx.fillStyle = 'rgba(0,0,0,0.75)'
            ctx.fillRect(cx - labelW / 2, cy - 22, labelW, 18)
            ctx.fillStyle = loc.color
            ctx.fillText(loc.label, cx, cy - 8)
          }

          // Bot count badge (always visible if bots present)
          if (botList.length > 0) {
            // Pulsing ring
            const pulse = Math.sin(t * 3 + loc.cx * 10) * 0.5 + 0.5
            const ringR = 10 + pulse * 4
            ctx.strokeStyle = loc.color + '66'
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
            ctx.stroke()

            // Badge background
            ctx.fillStyle = loc.color
            ctx.beginPath()
            ctx.arc(cx, cy, 9, 0, Math.PI * 2)
            ctx.fill()

            // Bot count
            ctx.fillStyle = '#000'
            ctx.font = 'bold 9px monospace'
            ctx.textAlign = 'center'
            ctx.fillText(String(botList.length), cx, cy + 3)

            // Orbiting bot dots
            botList.slice(0, 4).forEach((botId, i) => {
              const angle = t * 1.2 + i * (Math.PI * 2 / Math.min(botList.length, 4))
              const orbitR = 16 + i * 2
              const bx = cx + Math.cos(angle) * orbitR
              const by = cy + Math.sin(angle) * orbitR
              const botColor = BOT_COLORS[botId] || '#4D96FF'
              ctx.fillStyle = botColor
              ctx.beginPath()
              ctx.arc(bx, by, 2.5, 0, Math.PI * 2)
              ctx.fill()
            })
          }
        })
      } else {
        // Loading state
        ctx.fillStyle = 'rgba(77,150,255,0.5)'
        ctx.font = '12px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('加载地图中...', W / 2, H / 2)
      }

      // Scan line effect (subtle) - guard against H=0
      if (H > 0) {
        const scanY = (t * 60) % H
        const scanGrad = ctx.createLinearGradient(0, scanY - 15, 0, scanY + 15)
        scanGrad.addColorStop(0, 'rgba(77,150,255,0)')
        scanGrad.addColorStop(0.5, 'rgba(77,150,255,0.03)')
        scanGrad.addColorStop(1, 'rgba(77,150,255,0)')
        ctx.fillStyle = scanGrad
        ctx.fillRect(0, scanY - 15, W, 30)
      }

      animFrameRef.current = requestAnimationFrame(render)
    }

    animFrameRef.current = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [botsByLocation])

  // Convert mouse event to image-normalized coordinates, find hit location
  const getHitLocation = useCallback((e: React.MouseEvent<HTMLCanvasElement>): string | null => {
    const canvas = canvasRef.current
    if (!canvas || !bgImageRef.current) return null
    const rect = canvas.getBoundingClientRect()
    const W = rect.width, H = rect.height
    const img = bgImageRef.current
    const imgAspect = img.width / img.height
    const canvasAspect = W / H
    let drawW: number, drawH: number, drawX: number, drawY: number
    if (canvasAspect > imgAspect) {
      drawW = W; drawH = W / imgAspect; drawX = 0; drawY = (H - drawH) / 2
    } else {
      drawH = H; drawW = H * imgAspect; drawX = (W - drawW) / 2; drawY = 0
    }
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    // Normalize to image space
    const nx = (px - drawX) / drawW
    const ny = (py - drawY) / drawH

    let found: string | null = null
    Object.entries(OVERVIEW_LOCATIONS).forEach(([key, loc]) => {
      if (nx >= loc.x && nx <= loc.x + loc.w && ny >= loc.y && ny <= loc.y + loc.h) {
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
              background: 'rgba(13,17,23,0.9)',
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
