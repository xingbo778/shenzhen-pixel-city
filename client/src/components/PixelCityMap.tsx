/**
 * PixelCityMap - 深圳像素城市地图
 * 深度复用 pixel-agents 渲染系统：
 * - getCachedSprite: SpriteData → HTMLCanvasElement (像素放大)
 * - 16x24 点阵角色，4方向行走动画，4帧循环
 * - Z轴 Y排序（pixel-agents renderer.ts 的 zY 排序）
 * - 情绪气泡 (pixel-agents BUBBLE_PERMISSION_SPRITE 风格)
 * - 场景切换：7个深圳地点，各有独立建筑和地面
 */

import { useRef, useEffect, useCallback, useState } from 'react'
import type { WorldState } from '@/types/world'
import { BOT_COLORS, getEmotionColor, getDominantEmotion } from '@/types/world'
import {
  getCachedSprite, getOutlineSprite, getCharacterSprites, getFrameSprite,
  type SpriteData, type Direction, type CharState
} from '@/engine/spriteSystem'
import { SCENE_CONFIGS } from '@/engine/sceneTiles'

const TILE_SIZE = 16   // pixels per tile (logical)
const ZOOM = 3         // pixel scale factor (like pixel-agents zoom)
const CHAR_ZOOM = 4    // character sprite zoom (larger than tiles for visibility)
const CHAR_WALK_SPEED = 0.08  // tiles per frame (smoother)
const WALK_FRAME_DURATION = 0.15  // seconds per walk frame
const WANDER_INTERVAL = 3.5  // seconds between wander target updates

interface BotRenderState {
  x: number; y: number        // current pixel pos (logical)
  targetX: number; targetY: number
  tileCol: number; tileRow: number
  dir: Direction
  state: CharState
  frame: number
  frameTimer: number
  paletteIndex: number
  wanderTimer: number
}

interface EmotionBubble {
  botId: string
  emoji: string
  x: number; y: number
  alpha: number
  timer: number
}

interface Props {
  world: WorldState | null
  selectedBotId: string | null
  onBotClick: (botId: string) => void
  onLocationClick: (location: string) => void
  currentLocation?: string
}

// ── Emotion Bubble Sprite (pixel-agents BUBBLE style) ────────────
function createEmotionBubble(emoji: string): SpriteData {
  const B = '#555566', F = '#EEEEFF'
  return [
    [B,B,B,B,B,B,B,B,B,B,B],
    [B,F,F,F,F,F,F,F,F,F,B],
    [B,F,F,F,F,F,F,F,F,F,B],
    [B,F,F,F,F,F,F,F,F,F,B],
    [B,F,F,F,F,F,F,F,F,F,B],
    [B,F,F,F,F,F,F,F,F,F,B],
    [B,F,F,F,F,F,F,F,F,F,B],
    [B,F,F,F,F,F,F,F,F,F,B],
    [B,B,B,B,B,B,B,B,B,B,B],
    [_,_,_,_,B,B,B,_,_,_,_],
    [_,_,_,_,_,B,_,_,_,_,_],
    [_,_,_,_,_,_,_,_,_,_,_],
  ]
}
const _ = ''
const BUBBLE_SPRITE = createEmotionBubble('')

// ── Floor rendering ───────────────────────────────────────────────
function drawFloor(
  ctx: CanvasRenderingContext2D,
  cols: number, rows: number,
  floorColor: string,
  pattern: 'solid' | 'grid' | 'checker',
  offsetX: number, offsetY: number,
  zoom: number
) {
  const s = TILE_SIZE * zoom
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let color = floorColor
      if (pattern === 'checker' && (r + c) % 2 === 1) {
        // slightly lighter alternate tile
        color = lightenHex(floorColor, 15)
      }
      ctx.fillStyle = color
      ctx.fillRect(offsetX + c * s, offsetY + r * s, s, s)
      if (pattern === 'grid') {
        ctx.strokeStyle = 'rgba(255,255,255,0.04)'
        ctx.lineWidth = 1
        ctx.strokeRect(offsetX + c * s + 0.5, offsetY + r * s + 0.5, s - 1, s - 1)
      }
    }
  }
}

function lightenHex(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount)
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount)
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount)
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

// ── Bot tile assignment (spread bots across walkable tiles) ───────
const BOT_TILE_OFFSETS = [
  { col: 3, row: 9 }, { col: 7, row: 10 }, { col: 11, row: 9 }, { col: 15, row: 10 },
  { col: 5, row: 11 }, { col: 9, row: 12 }, { col: 13, row: 11 }, { col: 17, row: 12 },
  { col: 2, row: 13 }, { col: 6, row: 13 }, { col: 10, row: 13 }, { col: 14, row: 13 },
]

function assignBotTiles(
  botIds: string[], cols: number, rows: number
): Record<string, { col: number; row: number }> {
  const result: Record<string, { col: number; row: number }> = {}
  botIds.forEach((id, i) => {
    const offset = BOT_TILE_OFFSETS[i % BOT_TILE_OFFSETS.length]
    const col = Math.min(cols - 2, offset.col)
    const row = Math.min(rows - 1, offset.row)
    result[id] = { col, row }
  })
  return result
}

export default function PixelCityMap({
  world, selectedBotId, onBotClick, onLocationClick, currentLocation
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const botStatesRef = useRef<Record<string, BotRenderState>>({})
  const bubblesRef = useRef<EmotionBubble[]>([])
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const pulseRef = useRef(0)
  const [hoveredBotId, setHoveredBotId] = useState<string | null>(null)

  // Active scene
  const activeLocation = currentLocation || Object.keys(SCENE_CONFIGS)[0]
  const scene = SCENE_CONFIGS[activeLocation] || SCENE_CONFIGS['南山科技园']

  // Update bot target positions when world changes
  useEffect(() => {
    if (!world) return
    // Show ALL bots on the map (not filtered by location)
    // Bots at current location wander freely; others are shown as visitors
    const allBotIds = Object.keys(world.bots).filter(id => world.bots[id].status === 'alive')
    const assignments = assignBotTiles(allBotIds, scene.cols, scene.rows)

    allBotIds.forEach((botId, i) => {
      const bot = world.bots[botId]
      if (!bot) return
      const assign = assignments[botId]

      // Bots at current location get random wander targets
      const isHere = bot.location === activeLocation
      const wanderCol = isHere
        ? 2 + Math.floor(Math.random() * (scene.cols - 4))
        : assign.col
      const wanderRow = isHere
        ? Math.floor(scene.rows * 0.55) + Math.floor(Math.random() * Math.floor(scene.rows * 0.4))
        : assign.row

      const tx = wanderCol * TILE_SIZE + TILE_SIZE / 2
      const ty = wanderRow * TILE_SIZE + TILE_SIZE / 2

      if (!botStatesRef.current[botId]) {
        // Initial position: start at assigned tile
        const sx = assign.col * TILE_SIZE + TILE_SIZE / 2
        const sy = assign.row * TILE_SIZE + TILE_SIZE / 2
        botStatesRef.current[botId] = {
          x: sx, y: sy, targetX: tx, targetY: ty,
          tileCol: assign.col, tileRow: assign.row,
          dir: 'down',
          state: bot.is_sleeping ? 'sleep' : (isHere ? 'walk' : 'idle'),
          frame: 0, frameTimer: 0,
          paletteIndex: i % 10,
          wanderTimer: Math.random() * WANDER_INTERVAL,  // stagger initial wander
        }
      } else {
        const bs = botStatesRef.current[botId]
        // Periodically give bots at current location new wander targets
        if (isHere && Math.abs(bs.x - bs.targetX) < 2 && Math.abs(bs.y - bs.targetY) < 2) {
          const newCol = 2 + Math.floor(Math.random() * (scene.cols - 4))
          const newRow = Math.floor(scene.rows * 0.55) + Math.floor(Math.random() * Math.floor(scene.rows * 0.4))
          bs.targetX = newCol * TILE_SIZE + TILE_SIZE / 2
          bs.targetY = newRow * TILE_SIZE + TILE_SIZE / 2
          bs.state = bot.is_sleeping ? 'sleep' : 'walk'
        } else if (!isHere) {
          bs.state = bot.is_sleeping ? 'sleep' : 'idle'
        }
      }

      // Spawn emotion bubble occasionally
      if (Math.random() < 0.008) {
        const emotion = getDominantEmotion(bot.emotions)
        const bs = botStatesRef.current[botId]
        if (bs) {
          bubblesRef.current.push({
            botId,
            emoji: emotion.emoji,
            x: bs.x, y: bs.y,
            alpha: 1,
            timer: 2.5,
          })
        }
      }
    })

    // Remove dead bots
    Object.keys(botStatesRef.current).forEach(id => {
      if (!allBotIds.includes(id)) delete botStatesRef.current[id]
    })
  }, [world, activeLocation, scene.cols, scene.rows])

  // Main render loop (pixel-agents gameLoop style)
  const render = useCallback((timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05)
    lastTimeRef.current = timestamp
    pulseRef.current = (pulseRef.current + dt * 1.5) % (Math.PI * 2)

    const dpr = window.devicePixelRatio || 1
    const cssW = canvas.width / dpr
    const cssH = canvas.height / dpr

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)

    // ── Background ──────────────────────────────────────────────
    ctx.fillStyle = '#060b14'
    ctx.fillRect(0, 0, cssW, cssH)

    // ── Scene offset: center the tile grid ──────────────────────
    const sceneW = scene.cols * TILE_SIZE * ZOOM
    const sceneH = scene.rows * TILE_SIZE * ZOOM
    const offsetX = Math.floor((cssW - sceneW) / 2)
    const offsetY = Math.floor((cssH - sceneH) / 2)

    // ── Floor tiles (pixel-agents renderTileGrid style) ─────────
    drawFloor(ctx, scene.cols, scene.rows, scene.floorColor, scene.floorPattern, offsetX, offsetY, ZOOM)

    // ── Ambient light overlay ───────────────────────────────────
    const pulse = Math.sin(pulseRef.current)
    const ambientGrad = ctx.createRadialGradient(
      offsetX + sceneW / 2, offsetY + sceneH / 2, 0,
      offsetX + sceneW / 2, offsetY + sceneH / 2, sceneW * 0.7
    )
    ambientGrad.addColorStop(0, scene.ambientColor + '18')
    ambientGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = ambientGrad
    ctx.fillRect(offsetX, offsetY, sceneW, sceneH)

    // ── Scene objects (buildings, trees, etc.) ──────────────────
    // Collect all drawables for Z-sort (pixel-agents renderScene style)
    interface ZDrawable { zY: number; draw: (c: CanvasRenderingContext2D) => void }
    const drawables: ZDrawable[] = []

    scene.objects.forEach(obj => {
      const cached = getCachedSprite(obj.sprite, ZOOM)
      const px = offsetX + obj.col * TILE_SIZE * ZOOM
      const py = offsetY + obj.row * TILE_SIZE * ZOOM
      const zY = obj.zY ?? (py + cached.height)
      drawables.push({
        zY,
        draw: (c) => c.drawImage(cached, px, py)
      })
    })

    // ── Bot characters ──────────────────────────────────────────
    Object.entries(botStatesRef.current).forEach(([botId, bs]) => {
      // Update animation
      bs.frameTimer += dt

      // Auto-wander: give idle bots new random targets periodically
      if (bs.state === 'idle') {
        bs.wanderTimer = (bs.wanderTimer ?? 0) + dt
        if (bs.wanderTimer > WANDER_INTERVAL + Math.random() * 2) {
          bs.wanderTimer = 0
          const newCol = 2 + Math.floor(Math.random() * (scene.cols - 4))
          const newRow = Math.floor(scene.rows * 0.5) + Math.floor(Math.random() * Math.floor(scene.rows * 0.45))
          bs.targetX = newCol * TILE_SIZE + TILE_SIZE / 2
          bs.targetY = newRow * TILE_SIZE + TILE_SIZE / 2
          bs.state = 'walk'
        }
      }

      if (bs.state === 'walk') {
        if (bs.frameTimer >= WALK_FRAME_DURATION) {
          bs.frameTimer -= WALK_FRAME_DURATION
          bs.frame = (bs.frame + 1) % 4
        }
        // Move toward target (lerp, pixel-agents characters.ts style)
        const dx = bs.targetX - bs.x, dy = bs.targetY - bs.y
        const dist = Math.hypot(dx, dy)
        if (dist < 1) {
          bs.x = bs.targetX; bs.y = bs.targetY
          bs.state = 'idle'; bs.frame = 0
          bs.wanderTimer = 0
        } else {
          const speed = CHAR_WALK_SPEED * TILE_SIZE
          bs.x += (dx / dist) * speed
          bs.y += (dy / dist) * speed
          // Update direction
          if (Math.abs(dx) > Math.abs(dy)) {
            bs.dir = dx > 0 ? 'right' : 'left'
          } else {
            bs.dir = dy > 0 ? 'down' : 'up'
          }
        }
      }

      const sprites = getCharacterSprites(bs.paletteIndex)
      const spriteData = getFrameSprite(sprites, bs.state, bs.dir, bs.frame)
      const cached = getCachedSprite(spriteData, CHAR_ZOOM)

      // Pixel position on canvas
      const px = offsetX + Math.round(bs.x * ZOOM) - cached.width / 2
      const py = offsetY + Math.round(bs.y * ZOOM) - cached.height
      const zY = offsetY + bs.y * ZOOM  // Y-sort anchor (pixel-agents style)

      const isSelected = selectedBotId === botId
      const isHovered = hoveredBotId === botId

      // White outline for selected/hovered (pixel-agents getOutlineSprite)
      if (isSelected || isHovered) {
        const outlineData = getOutlineSprite(spriteData)
        const outlineCached = getCachedSprite(outlineData, CHAR_ZOOM)
        const olAlpha = isSelected ? 0.9 : 0.5
        drawables.push({
          zY: zY - 0.1,
          draw: (c) => {
            c.save()
            c.globalAlpha = olAlpha
            c.drawImage(outlineCached, px - CHAR_ZOOM, py - CHAR_ZOOM)
            c.restore()
          }
        })
      }

      // Selection ring
      if (isSelected) {
        const color = BOT_COLORS[botId] || '#4d96ff'
        drawables.push({
          zY: zY - 0.2,
          draw: (c) => {
            c.save()
            c.beginPath()
            c.ellipse(
              offsetX + bs.x * ZOOM,
              offsetY + bs.y * ZOOM + 2,
              18, 6, 0, 0, Math.PI * 2
            )
            c.strokeStyle = color
            c.lineWidth = 2
            c.globalAlpha = 0.7 + pulse * 0.3
            c.stroke()
            c.restore()
          }
        })
      }

      // Shadow ellipse
      drawables.push({
        zY: zY - 0.3,
        draw: (c) => {
          c.save()
          c.beginPath()
          c.ellipse(
            offsetX + bs.x * ZOOM,
            offsetY + bs.y * ZOOM + 2,
            12, 5, 0, 0, Math.PI * 2
          )
          c.fillStyle = 'rgba(0,0,0,0.4)'
          c.fill()
          c.restore()
        }
      })

      drawables.push({ zY, draw: (c) => c.drawImage(cached, px, py) })

      // Name label
      const botColor = BOT_COLORS[botId] || '#4d96ff'
      drawables.push({
        zY: zY + 1,
        draw: (c) => {
          c.save()
          c.font = `bold 11px 'Noto Sans SC', monospace`
          c.textAlign = 'center'
          const label = world?.bots[botId]?.name?.slice(0, 3) ?? botId
          const lw = c.measureText(label).width
          c.fillStyle = 'rgba(6,11,20,0.75)'
          c.fillRect(
            offsetX + bs.x * ZOOM - lw / 2 - 3,
            offsetY + bs.y * ZOOM - cached.height - 14,
            lw + 6, 13
          )
          c.fillStyle = botColor
          c.globalAlpha = 0.95
          c.fillText(
            label,
            offsetX + bs.x * ZOOM,
            offsetY + bs.y * ZOOM - cached.height - 4
          )
          c.restore()
        }
      })
    })

    // ── Emotion bubbles (pixel-agents BUBBLE_PERMISSION_SPRITE style) ─
    bubblesRef.current = bubblesRef.current.filter(b => b.timer > 0)
    bubblesRef.current.forEach(bubble => {
      bubble.timer -= dt
      bubble.alpha = Math.min(1, bubble.timer / 0.5)
      bubble.y -= dt * 8  // float upward

      const bs = botStatesRef.current[bubble.botId]
      if (!bs) return

      const bx = offsetX + bs.x * ZOOM - 16
      const by = offsetY + bs.y * ZOOM - getCachedSprite(
        getFrameSprite(getCharacterSprites(bs.paletteIndex), bs.state, bs.dir, bs.frame), ZOOM
      ).height - 20

      const bubbleCached = getCachedSprite(BUBBLE_SPRITE, ZOOM)
      drawables.push({
        zY: offsetY + bs.y * ZOOM - 100,
        draw: (c) => {
          c.save()
          c.globalAlpha = bubble.alpha
          c.drawImage(bubbleCached, bx, by)
          c.font = `${ZOOM * 4}px sans-serif`
          c.textAlign = 'center'
          c.fillText(bubble.emoji, bx + bubbleCached.width / 2, by + bubbleCached.height * 0.65)
          c.restore()
        }
      })
    })

    // ── Z-sort and draw all (pixel-agents renderScene style) ────
    drawables.sort((a, b) => a.zY - b.zY)
    drawables.forEach(d => d.draw(ctx))

    // ── Scanline overlay (CRT effect) ───────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.025)'
    for (let y = 0; y < cssH; y += 3) {
      ctx.fillRect(0, y, cssW, 1)
    }

    // ── Location name watermark ─────────────────────────────────
    ctx.save()
    ctx.font = `bold 11px 'Orbitron', monospace`
    ctx.fillStyle = scene.ambientColor
    ctx.globalAlpha = 0.5
    ctx.textAlign = 'left'
    ctx.fillText(`[ ${scene.name} ]`, offsetX + 8, offsetY + 16)
    ctx.restore()

    ctx.restore()
    animFrameRef.current = requestAnimationFrame(render)
  }, [world, selectedBotId, hoveredBotId, activeLocation, scene])

  useEffect(() => {
    lastTimeRef.current = performance.now()
    animFrameRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [render])

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  // Hit testing for clicks and hover
  const getBotAtPoint = useCallback((mx: number, my: number): string | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const dpr = window.devicePixelRatio || 1
    const cssW = canvas.width / dpr
    const cssH = canvas.height / dpr
    const sceneW = scene.cols * TILE_SIZE * ZOOM
    const sceneH = scene.rows * TILE_SIZE * ZOOM
    const offsetX = (cssW - sceneW) / 2
    const offsetY = (cssH - sceneH) / 2

    for (const [botId, bs] of Object.entries(botStatesRef.current)) {
      const cx = offsetX + bs.x * ZOOM
      const cy = offsetY + bs.y * ZOOM
      const sprites = getCharacterSprites(bs.paletteIndex)
      const spriteData = getFrameSprite(sprites, bs.state, bs.dir, bs.frame)
      const cached = getCachedSprite(spriteData, CHAR_ZOOM)
      const bx = cx - cached.width / 2
      const by = cy - cached.height
      if (mx >= bx && mx <= bx + cached.width && my >= by && my <= by + cached.height) {
        return botId
      }
    }
    return null
  }, [scene.cols, scene.rows])

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width) / dpr
    const my = (e.clientY - rect.top) * (canvas.height / rect.height) / dpr
    const botId = getBotAtPoint(mx, my)
    if (botId) onBotClick(botId)
  }, [getBotAtPoint, onBotClick])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width) / dpr
    const my = (e.clientY - rect.top) * (canvas.height / rect.height) / dpr
    setHoveredBotId(getBotAtPoint(mx, my))
  }, [getBotAtPoint])

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          cursor: hoveredBotId ? 'pointer' : 'default',
          imageRendering: 'pixelated',
        }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredBotId(null)}
      />
      {/* Location selector tabs */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 flex-wrap justify-center max-w-full px-2">
        {Object.keys(SCENE_CONFIGS).map(loc => (
          <button
            key={loc}
            onClick={() => onLocationClick(loc)}
            className={`px-2 py-0.5 text-xs font-mono border transition-all ${
              loc === activeLocation
                ? 'bg-blue-500/30 border-blue-400 text-blue-300'
                : 'bg-black/40 border-white/10 text-white/50 hover:border-white/30 hover:text-white/80'
            }`}
            style={{ imageRendering: 'pixelated' }}
          >
            {loc}
          </button>
        ))}
      </div>
    </div>
  )
}
