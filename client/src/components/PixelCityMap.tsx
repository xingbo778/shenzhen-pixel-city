/**
 * PixelCityMap - 深圳像素城市场景视图
 * 使用设计图作为背景底图，真实角色精灵图在上层行走
 *
 * 设计哲学：高质量像素艺术场景 + 真实精灵图角色
 * - 每个场景用对应的设计图作为背景
 * - 角色使用 szpc_chars_sheet1/2.png 中的真实精灵
 * - 可步行区域基于设计图视觉分析精确定义
 */

import { useRef, useEffect, useCallback, useState } from 'react'
import type { WorldState } from '@/types/world'
import { BOT_COLORS, getEmotionColor, getDominantEmotion } from '@/types/world'

// ── Scene background images ─────────────────────────────────────────────
const SCENE_IMAGES: Record<string, string> = {
  '宝安城中村':  'https://files.manuscdn.com/user_upload_by_module/session_file/310519663220928499/YvCkMHkYoJrfPzRK.jpg',
  '南山科技园':  'https://files.manuscdn.com/user_upload_by_module/session_file/310519663220928499/QndyhTwuFLKRbpQX.jpg',
  '福田CBD':     'https://files.manuscdn.com/user_upload_by_module/session_file/310519663220928499/QndyhTwuFLKRbpQX.jpg',
  '华强北':      'https://files.manuscdn.com/user_upload_by_module/session_file/310519663220928499/fuUjYdNszROpoznh.jpg',
  '东门老街':    'https://files.manuscdn.com/user_upload_by_module/session_file/310519663220928499/MawmexshRXeTNzwm.jpg',
  '南山公寓':    'https://files.manuscdn.com/user_upload_by_module/session_file/310519663220928499/bBPZGZJDDPQTggJX.jpg',
  '深圳湾公园':  'https://files.manuscdn.com/user_upload_by_module/session_file/310519663220928499/qMkeoTdcqlLTdfUU.jpg',
}

// ── Spritesheet configuration ────────────────────────────────────────────
// Sheet1 (szpc_chars_sheet1.png): 外卖骑手(0), 程序员(1), 城中村大叔(2), 华强北商人(3), 白领(4)
// Sheet2 (szpc_chars_sheet2.png): 创业者(0), 深漂青年(1), 广场舞大妈(2), 保安(3), 跑步者(4)
// Each sheet: 1376x768, 7 cols x 5 rows, cell = 196x153px
// Cols 0-5: animation frames (0=idle, 1-5=walk), Col 6: portrait (skip)

const SHEET_CELL_W = 196   // 1376 / 7
const SHEET_CELL_H = 153   // 768 / 5
const SHEET_COLS = 6       // usable animation frames per character

interface SpriteConfig {
  sheet: 1 | 2
  row: number
  frameCount: number   // number of walk frames (cols 1..frameCount)
  scale: number        // render scale
  offsetY: number      // vertical offset to align feet to anchor point (0-1 of cell height)
}

// Map occupation/role → spritesheet config
const SPRITE_CONFIGS: Record<string, SpriteConfig> = {
  '外卖骑手':   { sheet: 1, row: 0, frameCount: 5, scale: 0.55, offsetY: 0.85 },
  '程序员':     { sheet: 1, row: 1, frameCount: 5, scale: 0.55, offsetY: 0.90 },
  '城中村大叔': { sheet: 1, row: 2, frameCount: 5, scale: 0.55, offsetY: 0.90 },
  '华强北商人': { sheet: 1, row: 3, frameCount: 5, scale: 0.55, offsetY: 0.90 },
  '白领':       { sheet: 1, row: 4, frameCount: 5, scale: 0.55, offsetY: 0.90 },
  '创业者':     { sheet: 2, row: 0, frameCount: 5, scale: 0.55, offsetY: 0.90 },
  '深漂青年':   { sheet: 2, row: 1, frameCount: 5, scale: 0.55, offsetY: 0.90 },
  '广场舞大妈': { sheet: 2, row: 2, frameCount: 5, scale: 0.55, offsetY: 0.90 },
  '保安':       { sheet: 2, row: 3, frameCount: 5, scale: 0.55, offsetY: 0.90 },
  '跑步者':     { sheet: 2, row: 4, frameCount: 5, scale: 0.60, offsetY: 0.90 },
}

// Fallback sprite configs by index (for bots without occupation)
const FALLBACK_CONFIGS: SpriteConfig[] = [
  { sheet: 2, row: 0, frameCount: 5, scale: 0.55, offsetY: 0.90 }, // 创业者
  { sheet: 1, row: 4, frameCount: 5, scale: 0.55, offsetY: 0.90 }, // 白领
  { sheet: 2, row: 1, frameCount: 5, scale: 0.55, offsetY: 0.90 }, // 深漂青年
  { sheet: 1, row: 1, frameCount: 5, scale: 0.55, offsetY: 0.90 }, // 程序员
  { sheet: 2, row: 3, frameCount: 5, scale: 0.55, offsetY: 0.90 }, // 保安
  { sheet: 1, row: 3, frameCount: 5, scale: 0.55, offsetY: 0.90 }, // 华强北商人
  { sheet: 2, row: 2, frameCount: 5, scale: 0.55, offsetY: 0.90 }, // 广场舞大妈
  { sheet: 1, row: 2, frameCount: 5, scale: 0.55, offsetY: 0.90 }, // 城中村大叔
  { sheet: 2, row: 4, frameCount: 5, scale: 0.60, offsetY: 0.90 }, // 跑步者
  { sheet: 1, row: 0, frameCount: 5, scale: 0.55, offsetY: 0.85 }, // 外卖骑手
]

// ── Walkable zones per scene (normalized 0-1 relative to scene image) ──
// Based on visual analysis of design images
// Each zone: [x, y, w, h] - characters walk within these rectangles
const SCENE_WALK_ZONES: Record<string, [number, number, number, number][]> = {
  '宝安城中村': [
    // Dirt alleys between buildings (avoid rooftops and building footprints)
    [0.15, 0.22, 0.70, 0.26],  // upper alley (between top buildings)
    [0.12, 0.50, 0.30, 0.32],  // left-center alley
    [0.55, 0.50, 0.32, 0.32],  // right-center alley
    [0.68, 0.22, 0.20, 0.28],  // right shop fronts
  ],
  '南山科技园': [
    // Central paved plaza (avoid buildings top 35% and left 22%)
    [0.22, 0.30, 0.56, 0.16],  // upper plaza near SILICON VALLEY
    [0.10, 0.46, 0.80, 0.26],  // main central plaza
    [0.15, 0.72, 0.70, 0.16],  // lower entrance area with coffee stalls
  ],
  '福田CBD': [
    [0.18, 0.38, 0.64, 0.32],  // main plaza
    [0.05, 0.70, 0.90, 0.16],  // street level
  ],
  '华强北': [
    // Dense pedestrian street - almost entire scene is walkable
    [0.03, 0.18, 0.44, 0.65],  // left half crowd area
    [0.52, 0.18, 0.44, 0.65],  // right half crowd area
    [0.08, 0.80, 0.84, 0.14],  // bottom storefronts
  ],
  '东门老街': [
    // Stone-paved plaza (avoid shop buildings on edges and two trees)
    [0.12, 0.20, 0.76, 0.22],  // upper plaza (in front of shops)
    [0.12, 0.38, 0.20, 0.36],  // left of trees
    [0.42, 0.38, 0.46, 0.36],  // right of trees
    [0.12, 0.72, 0.76, 0.18],  // lower plaza
  ],
  '南山公寓': [
    // Courtyards and parking areas between apartment blocks
    [0.22, 0.40, 0.56, 0.20],  // central road between buildings
    [0.60, 0.52, 0.28, 0.26],  // right courtyard
    [0.08, 0.70, 0.84, 0.14],  // lower road
  ],
  '深圳湾公园': [
    // Grass areas and promenade ONLY (avoid water below y=0.52)
    [0.02, 0.02, 0.40, 0.24],  // left grass (tai chi area)
    [0.44, 0.28, 0.54, 0.20],  // right grass area
    [0.02, 0.28, 0.88, 0.10],  // bike road
    [0.02, 0.40, 0.60, 0.12],  // wooden promenade (not water)
  ],
}

// ── Scene metadata ────────────────────────────────────────────────────
const SCENE_META: Record<string, { ambientColor: string; name: string }> = {
  '宝安城中村':  { ambientColor: '#C4956A', name: '宝安城中村' },
  '南山科技园':  { ambientColor: '#4D96FF', name: '南山科技园' },
  '福田CBD':     { ambientColor: '#FFD700', name: '福田CBD' },
  '华强北':      { ambientColor: '#FF4DC8', name: '华强北' },
  '东门老街':    { ambientColor: '#FF6B6B', name: '东门老街' },
  '南山公寓':    { ambientColor: '#69DB7C', name: '南山公寓' },
  '深圳湾公园':  { ambientColor: '#74C0FC', name: '深圳湾公园' },
}

const SCENE_NAMES = Object.keys(SCENE_META)

// ── Character constants ───────────────────────────────────────────────
const CHAR_WALK_SPEED = 0.8   // pixels per frame (normalized)
const WALK_FRAME_DURATION = 0.12  // seconds per animation frame
const WANDER_INTERVAL = 3.5

type Direction = 'left' | 'right' | 'down' | 'up'
type CharState = 'idle' | 'walk' | 'sleep'

interface BotRenderState {
  x: number; y: number
  targetX: number; targetY: number
  dir: Direction
  state: CharState
  frame: number
  frameTimer: number
  paletteIndex: number
  occupation?: string
  wanderTimer: number
  currentLocation?: string
  trail?: { x: number; y: number; alpha: number }[]
  trailTimer?: number
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

// ── Image cache ───────────────────────────────────────────────────────
const imageCache: Record<string, HTMLImageElement | null> = {}
const imageLoaded: Record<string, boolean> = {}

function preloadImage(url: string): HTMLImageElement {
  if (!imageCache[url]) {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => { imageLoaded[url] = true }
    img.onerror = () => { imageLoaded[url] = false }
    img.src = url
    imageCache[url] = img
    imageLoaded[url] = false
  }
  return imageCache[url]!
}

// ── Random point in walk zones ────────────────────────────────────────
function getRandomWalkPoint(location: string): { x: number; y: number } {
  const zones = SCENE_WALK_ZONES[location] || [[0.1, 0.3, 0.8, 0.5]]
  const zone = zones[Math.floor(Math.random() * zones.length)]
  return {
    x: zone[0] + Math.random() * zone[2],
    y: zone[1] + Math.random() * zone[3],
  }
}

function getInitialWalkPoint(location: string, index: number, total: number): { x: number; y: number } {
  const zones = SCENE_WALK_ZONES[location] || [[0.1, 0.3, 0.8, 0.5]]
  const zone = zones[index % zones.length]
  const t = total > 1 ? index / (total - 1) : 0.5
  return {
    x: zone[0] + t * zone[2] * 0.8 + 0.1 * zone[2],
    y: zone[1] + (0.3 + Math.random() * 0.4) * zone[3],
  }
}

// ── Get sprite config for a bot ───────────────────────────────────────
function getSpriteConfig(occupation: string | undefined, paletteIndex: number): SpriteConfig {
  if (occupation && SPRITE_CONFIGS[occupation]) {
    return SPRITE_CONFIGS[occupation]
  }
  return FALLBACK_CONFIGS[paletteIndex % FALLBACK_CONFIGS.length]
}

// ── Draw character from spritesheet ──────────────────────────────────
function drawCharFromSheet(
  ctx: CanvasRenderingContext2D,
  config: SpriteConfig,
  frame: number,
  dir: Direction,
  cx: number,  // center x in canvas pixels
  cy: number,  // anchor y (feet position) in canvas pixels
  isFlipped: boolean,
  alpha: number = 1,
) {
          const sheetUrl2 = config.sheet === 1
            ? 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663220928499/RrSdJdSxhCsEfKnc.png'
            : 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663220928499/bOyMUWIKYLqLPQIT.png'
          const sheet = imageCache[sheetUrl2]
          if (!sheet || !imageLoaded[sheetUrl2]) return

  // Clamp frame to valid range
  const walkFrame = Math.min(frame, config.frameCount - 1)
  const col = frame === 0 ? 0 : (walkFrame % config.frameCount) + 1  // col 0 = idle, 1-5 = walk
  const actualCol = Math.min(col, SHEET_COLS - 1)

  const sx = actualCol * SHEET_CELL_W
  const sy = config.row * SHEET_CELL_H

  const renderW = Math.round(SHEET_CELL_W * config.scale)
  const renderH = Math.round(SHEET_CELL_H * config.scale)

  // Anchor: feet at cy, horizontally centered at cx
  const dx = cx - renderW / 2
  const dy = cy - renderH * config.offsetY

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.imageSmoothingEnabled = false

  if (isFlipped) {
    // Flip horizontally: translate to center, scale -1, then draw at negative offset
    ctx.translate(cx, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(
      sheet,
      sx, sy, SHEET_CELL_W, SHEET_CELL_H,
      -renderW / 2,
      dy,
      renderW, renderH
    )
  } else {
    ctx.drawImage(
      sheet,
      sx, sy, SHEET_CELL_W, SHEET_CELL_H,
      dx,
      dy,
      renderW, renderH
    )
  }

  ctx.restore()
}

// Placeholder for canvas width (will be replaced in render)
let canvas_w_placeholder = 800

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

  // Drag-to-pan
  const panOffsetRef = useRef({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const didDragRef = useRef(false)

  const activeLocation = currentLocation || SCENE_NAMES[0]
  const meta = SCENE_META[activeLocation] || SCENE_META['南山科技园']

  // Preload all images
  useEffect(() => {
    Object.values(SCENE_IMAGES).forEach(url => preloadImage(url))
    preloadImage('https://files.manuscdn.com/user_upload_by_module/session_file/310519663220928499/RrSdJdSxhCsEfKnc.png')
    preloadImage('https://files.manuscdn.com/user_upload_by_module/session_file/310519663220928499/bOyMUWIKYLqLPQIT.png')
  }, [])

  // Update bot states when world changes
  useEffect(() => {
    if (!world) return
    const allBotIds = Object.keys(world.bots).filter(id => world.bots[id].status === 'alive')

    allBotIds.forEach((botId, i) => {
      const bot = world.bots[botId]
      if (!bot) return
      const isHere = bot.location === activeLocation

      if (!botStatesRef.current[botId]) {
        const pt = getInitialWalkPoint(activeLocation, i, allBotIds.length)
        const target = getRandomWalkPoint(activeLocation)
        botStatesRef.current[botId] = {
          x: pt.x, y: pt.y,
          targetX: target.x, targetY: target.y,
          dir: 'down',
          state: bot.is_sleeping ? 'sleep' : (isHere ? 'walk' : 'idle'),
          frame: 0, frameTimer: 0,
          paletteIndex: i % 10,
          occupation: bot.occupation,
          wanderTimer: Math.random() * WANDER_INTERVAL,
          currentLocation: bot.location,
          trail: [],
          trailTimer: 0,
        }
      } else {
        const bs = botStatesRef.current[botId]
        if (bs.currentLocation && bs.currentLocation !== bot.location) {
          bs.trail = [{ x: bs.x, y: bs.y, alpha: 1.0 }]
          bs.trailTimer = 0
        }
        bs.currentLocation = bot.location
        bs.occupation = bot.occupation
        if (isHere && Math.abs(bs.x - bs.targetX) < 0.01 && Math.abs(bs.y - bs.targetY) < 0.01) {
          const wt = getRandomWalkPoint(activeLocation)
          bs.targetX = wt.x; bs.targetY = wt.y
          bs.state = bot.is_sleeping ? 'sleep' : 'walk'
        } else if (!isHere) {
          bs.state = bot.is_sleeping ? 'sleep' : 'idle'
        }
      }

      // Spawn emotion bubble
      if (Math.random() < 0.006) {
        const emotion = getDominantEmotion(bot.emotions)
        const bs = botStatesRef.current[botId]
        if (bs) {
          bubblesRef.current.push({
            botId, emoji: emotion.emoji,
            x: bs.x, y: bs.y, alpha: 1, timer: 2.5,
          })
        }
      }
    })

    Object.keys(botStatesRef.current).forEach(id => {
      if (!allBotIds.includes(id)) delete botStatesRef.current[id]
    })
  }, [world, activeLocation])

  // Main render loop
  const render = useCallback((timestamp: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05)
    lastTimeRef.current = timestamp
    pulseRef.current = (pulseRef.current + dt * 1.5) % (Math.PI * 2)
    const pulse = Math.sin(pulseRef.current)

    const dpr = window.devicePixelRatio || 1
    const cssW = canvas.width / dpr
    const cssH = canvas.height / dpr
    canvas_w_placeholder = cssW

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)

    // ── Background ────────────────────────────────────────────────
    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0, 0, cssW, cssH)

    // ── Draw scene background image ───────────────────────────────
    const bgUrl = SCENE_IMAGES[activeLocation]
    const bgImg = bgUrl ? preloadImage(bgUrl) : null
    let imgDrawX = 0, imgDrawY = 0, imgDrawW = cssW, imgDrawH = cssH

    if (bgImg && imageLoaded[bgUrl!]) {
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      const imgAspect = bgImg.width / bgImg.height
      const canvasAspect = cssW / cssH
      if (canvasAspect > imgAspect) {
        imgDrawW = cssW + panOffsetRef.current.x * 2
        imgDrawH = imgDrawW / imgAspect
        imgDrawX = panOffsetRef.current.x
        imgDrawY = (cssH - imgDrawH) / 2 + panOffsetRef.current.y
      } else {
        imgDrawH = cssH + Math.abs(panOffsetRef.current.y) * 2
        imgDrawW = imgDrawH * imgAspect
        imgDrawX = (cssW - imgDrawW) / 2 + panOffsetRef.current.x
        imgDrawY = panOffsetRef.current.y
      }
      ctx.drawImage(bgImg, imgDrawX, imgDrawY, imgDrawW, imgDrawH)
    } else {
      ctx.fillStyle = meta.ambientColor + '22'
      ctx.fillRect(0, 0, cssW, cssH)
      ctx.fillStyle = meta.ambientColor + '44'
      ctx.font = 'bold 48px "Noto Sans SC", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(meta.name, cssW / 2, cssH / 2)
      ctx.font = '14px monospace'
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.fillText('加载场景图中...', cssW / 2, cssH / 2 + 40)
    }

    // ── Bot characters ────────────────────────────────────────────
    interface ZDrawable { zY: number; draw: (c: CanvasRenderingContext2D) => void }
    const drawables: ZDrawable[] = []

    Object.entries(botStatesRef.current).forEach(([botId, bs]) => {
      bs.frameTimer += dt

      // Auto-wander
      if (bs.state === 'idle') {
        bs.wanderTimer = (bs.wanderTimer ?? 0) + dt
        if (bs.wanderTimer > WANDER_INTERVAL + Math.random() * 2) {
          bs.wanderTimer = 0
          const wt = getRandomWalkPoint(activeLocation)
          bs.targetX = wt.x; bs.targetY = wt.y
          bs.state = 'walk'
        }
      }

      if (bs.state === 'walk') {
        if (bs.frameTimer >= WALK_FRAME_DURATION) {
          bs.frameTimer -= WALK_FRAME_DURATION
          bs.frame = (bs.frame + 1) % 5
        }
        const dx = bs.targetX - bs.x
        const dy = bs.targetY - bs.y
        const dist = Math.hypot(dx, dy)
        if (dist < 0.005) {
          bs.x = bs.targetX; bs.y = bs.targetY
          bs.state = 'idle'; bs.frame = 0; bs.wanderTimer = 0
        } else {
          const speed = CHAR_WALK_SPEED / cssW
          bs.x += (dx / dist) * speed
          bs.y += (dy / dist) * speed
          if (Math.abs(dx) > Math.abs(dy)) {
            bs.dir = dx > 0 ? 'right' : 'left'
          } else {
            bs.dir = dy > 0 ? 'down' : 'up'
          }
        }
      }

      // Trail
      if (!bs.trail) bs.trail = []
      bs.trailTimer = (bs.trailTimer ?? 0) + dt
      if (bs.state === 'walk' && bs.trailTimer > 0.15) {
        bs.trailTimer = 0
        bs.trail.push({ x: bs.x, y: bs.y, alpha: 1.0 })
        if (bs.trail.length > 15) bs.trail.shift()
      }
      bs.trail.forEach(pt => { pt.alpha -= dt * 0.8 })
      bs.trail = bs.trail.filter(pt => pt.alpha > 0.05)

      // Draw trail
      if (bs.trail.length > 1) {
        const trailColor = BOT_COLORS[botId] || '#4d96ff'
        drawables.push({
          zY: -9999,
          draw: (c) => {
            c.save()
            c.setLineDash([3, 3])
            c.lineWidth = 1.5
            for (let ti = 1; ti < bs.trail!.length; ti++) {
              const pt0 = bs.trail![ti - 1]
              const pt1 = bs.trail![ti]
              const alpha = Math.min(pt0.alpha, pt1.alpha) * 0.4
              c.strokeStyle = trailColor
              c.globalAlpha = alpha
              c.beginPath()
              c.moveTo(imgDrawX + pt0.x * imgDrawW, imgDrawY + pt0.y * imgDrawH)
              c.lineTo(imgDrawX + pt1.x * imgDrawW, imgDrawY + pt1.y * imgDrawH)
              c.stroke()
            }
            c.setLineDash([])
            c.restore()
          }
        })
      }

      // Get sprite config
      const config = getSpriteConfig(bs.occupation, bs.paletteIndex)
      const renderW = Math.round(SHEET_CELL_W * config.scale)
      const renderH = Math.round(SHEET_CELL_H * config.scale)

      // Convert normalized position to canvas pixels
      // cx = horizontal center, cy = feet anchor point
      const cx = imgDrawX + bs.x * imgDrawW
      const cy = imgDrawY + bs.y * imgDrawH
      const zY = cy

      const isSelected = selectedBotId === botId
      const isHovered = hoveredBotId === botId
      const isFlipped = bs.dir === 'left'

      // Shadow
      drawables.push({
        zY: zY - 0.3,
        draw: (c) => {
          c.save()
          c.beginPath()
          c.ellipse(cx, cy + 2, renderW * 0.35, renderW * 0.12, 0, 0, Math.PI * 2)
          c.fillStyle = 'rgba(0,0,0,0.35)'
          c.fill()
          c.restore()
        }
      })

      // Selection ring
      if (isSelected) {
        const color = BOT_COLORS[botId] || '#4d96ff'
        drawables.push({
          zY: zY - 0.2,
          draw: (c) => {
            c.save()
            c.beginPath()
            c.ellipse(cx, cy + 2, renderW * 0.45, renderW * 0.15, 0, 0, Math.PI * 2)
            c.strokeStyle = color
            c.lineWidth = 2.5
            c.globalAlpha = 0.7 + pulse * 0.3
            c.stroke()
            c.restore()
          }
        })
      }

      // Hover highlight
      if (isHovered && !isSelected) {
        drawables.push({
          zY: zY - 0.15,
          draw: (c) => {
            c.save()
            c.beginPath()
            c.ellipse(cx, cy + 2, renderW * 0.4, renderW * 0.13, 0, 0, Math.PI * 2)
            c.strokeStyle = 'rgba(255,255,255,0.6)'
            c.lineWidth = 1.5
            c.stroke()
            c.restore()
          }
        })
      }

      // Character sprite from spritesheet
      const walkFrame = bs.state === 'idle' ? 0 : (bs.frame % 5) + 1
      drawables.push({
        zY,
        draw: (c) => {
          const sheetUrl = config.sheet === 1
            ? 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663220928499/RrSdJdSxhCsEfKnc.png'
            : 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663220928499/bOyMUWIKYLqLPQIT.png'
          const sheet = imageCache[sheetUrl]
          if (!sheet || !imageLoaded[sheetUrl]) {
            // Fallback: colored circle
            c.save()
            c.beginPath()
            c.arc(cx, cy - renderH * 0.5, renderW * 0.3, 0, Math.PI * 2)
            c.fillStyle = BOT_COLORS[botId] || '#4d96ff'
            c.fill()
            c.restore()
            return
          }

          const col = Math.min(walkFrame, SHEET_COLS - 1)
          const sx = col * SHEET_CELL_W
          const sy = config.row * SHEET_CELL_H
          const dx = cx - renderW / 2
          const dy = cy - renderH * config.offsetY

          c.save()
          c.globalAlpha = isSelected ? 1.0 : (isHovered ? 0.95 : 0.92)
          c.imageSmoothingEnabled = false

          if (isFlipped) {
            c.translate(cx, 0)
            c.scale(-1, 1)
            c.drawImage(sheet, sx, sy, SHEET_CELL_W, SHEET_CELL_H,
              -renderW / 2, dy, renderW, renderH)
          } else {
            c.drawImage(sheet, sx, sy, SHEET_CELL_W, SHEET_CELL_H,
              dx, dy, renderW, renderH)
          }

          // Selected: bright outline effect
          if (isSelected) {
            c.globalAlpha = 0.4
            c.globalCompositeOperation = 'screen'
            if (isFlipped) {
              c.drawImage(sheet, sx, sy, SHEET_CELL_W, SHEET_CELL_H,
                -renderW / 2, dy, renderW, renderH)
            } else {
              c.drawImage(sheet, sx, sy, SHEET_CELL_W, SHEET_CELL_H,
                dx, dy, renderW, renderH)
            }
            c.globalCompositeOperation = 'source-over'
          }

          c.restore()
        }
      })

      // Name label
      const botColor = BOT_COLORS[botId] || '#4d96ff'
      const botName = world?.bots[botId]?.name?.slice(0, 4) ?? botId
      const labelY = cy - renderH * config.offsetY - 6
      drawables.push({
        zY: zY + 1,
        draw: (c) => {
          c.save()
          c.font = `bold 10px 'Noto Sans SC', monospace`
          c.textAlign = 'center'
          const lw = c.measureText(botName).width
          // Label background
          c.fillStyle = 'rgba(0,0,0,0.75)'
          c.beginPath()
          const lx = cx - lw / 2 - 4
          const ly = labelY - 11
          const lrw = lw + 8
          const lrh = 13
          const r = 3
          c.moveTo(lx + r, ly)
          c.lineTo(lx + lrw - r, ly)
          c.arcTo(lx + lrw, ly, lx + lrw, ly + r, r)
          c.lineTo(lx + lrw, ly + lrh - r)
          c.arcTo(lx + lrw, ly + lrh, lx + lrw - r, ly + lrh, r)
          c.lineTo(lx + r, ly + lrh)
          c.arcTo(lx, ly + lrh, lx, ly + lrh - r, r)
          c.lineTo(lx, ly + r)
          c.arcTo(lx, ly, lx + r, ly, r)
          c.closePath()
          c.fill()
          // Label text
          c.fillStyle = botColor
          c.globalAlpha = 0.95
          c.fillText(botName, cx, labelY)
          c.restore()
        }
      })
    })

    // ── Emotion bubbles ───────────────────────────────────────────
    bubblesRef.current = bubblesRef.current.filter(b => b.timer > 0)
    bubblesRef.current.forEach(bubble => {
      bubble.timer -= dt
      bubble.alpha = Math.min(1, bubble.timer / 0.5)
      bubble.y -= dt * 0.003

      const bs = botStatesRef.current[bubble.botId]
      if (!bs) return
      const config = getSpriteConfig(bs.occupation, bs.paletteIndex)
      const renderH = Math.round(SHEET_CELL_H * config.scale)
      const bx = imgDrawX + bs.x * imgDrawW
      const by = imgDrawY + bs.y * imgDrawH - renderH * config.offsetY - 30

      drawables.push({
        zY: imgDrawY + bs.y * imgDrawH - 200,
        draw: (c) => {
          c.save()
          c.globalAlpha = bubble.alpha
          // Bubble background
          c.fillStyle = 'rgba(30,30,40,0.85)'
          c.beginPath()
          c.roundRect(bx - 14, by - 14, 28, 24, 6)
          c.fill()
          // Bubble tail
          c.beginPath()
          c.moveTo(bx - 4, by + 10)
          c.lineTo(bx + 4, by + 10)
          c.lineTo(bx, by + 16)
          c.closePath()
          c.fill()
          // Emoji
          c.font = `14px sans-serif`
          c.textAlign = 'center'
          c.fillText(bubble.emoji, bx, by + 4)
          c.restore()
        }
      })
    })

    // ── Z-sort and draw ───────────────────────────────────────────
    drawables.sort((a, b) => a.zY - b.zY)
    drawables.forEach(d => d.draw(ctx))

    // ── Subtle vignette ───────────────────────────────────────────
    const vignette = ctx.createRadialGradient(cssW/2, cssH/2, cssH*0.3, cssW/2, cssH/2, cssH*0.8)
    vignette.addColorStop(0, 'transparent')
    vignette.addColorStop(1, 'rgba(0,0,0,0.2)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, cssW, cssH)

    ctx.restore()
    animFrameRef.current = requestAnimationFrame(render)
  }, [world, selectedBotId, hoveredBotId, activeLocation, meta])

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

  // Reset pan when location changes
  useEffect(() => {
    panOffsetRef.current = { x: 0, y: 0 }
  }, [activeLocation])

  // Hit testing
  const getBotAtPoint = useCallback((mx: number, my: number): string | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const dpr = window.devicePixelRatio || 1
    const cssW = canvas.width / dpr
    const cssH = canvas.height / dpr

    const bgUrl = SCENE_IMAGES[activeLocation]
    const bgImg = bgUrl ? imageCache[bgUrl] : null
    let imgDrawX = 0, imgDrawY = 0, imgDrawW = cssW, imgDrawH = cssH
    if (bgImg && imageLoaded[bgUrl!]) {
      const imgAspect = bgImg.width / bgImg.height
      const canvasAspect = cssW / cssH
      if (canvasAspect > imgAspect) {
        imgDrawW = cssW + panOffsetRef.current.x * 2
        imgDrawH = imgDrawW / imgAspect
        imgDrawX = panOffsetRef.current.x
        imgDrawY = (cssH - imgDrawH) / 2 + panOffsetRef.current.y
      } else {
        imgDrawH = cssH + Math.abs(panOffsetRef.current.y) * 2
        imgDrawW = imgDrawH * imgAspect
        imgDrawX = (cssW - imgDrawW) / 2 + panOffsetRef.current.x
        imgDrawY = panOffsetRef.current.y
      }
    }

    for (const [botId, bs] of Object.entries(botStatesRef.current)) {
      const config = getSpriteConfig(bs.occupation, bs.paletteIndex)
      const renderW = Math.round(SHEET_CELL_W * config.scale)
      const renderH = Math.round(SHEET_CELL_H * config.scale)
      const cx = imgDrawX + bs.x * imgDrawW
      const cy = imgDrawY + bs.y * imgDrawH
      const bx = cx - renderW / 2
      const by = cy - renderH * config.offsetY
      if (mx >= bx && mx <= bx + renderW && my >= by && my <= by + renderH) {
        return botId
      }
    }
    return null
  }, [activeLocation])

  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return { mx: 0, my: 0 }
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    return {
      mx: (clientX - rect.left) * (canvas.width / rect.width) / dpr,
      my: (clientY - rect.top) * (canvas.height / rect.height) / dpr,
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true
    didDragRef.current = false
    dragStartRef.current = {
      x: e.clientX, y: e.clientY,
      panX: panOffsetRef.current.x, panY: panOffsetRef.current.y,
    }
  }, [])

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false
    if (!didDragRef.current) {
      const { mx, my } = getCanvasPos(e.clientX, e.clientY)
      const botId = getBotAtPoint(mx, my)
      if (botId) onBotClick(botId)
    }
    didDragRef.current = false
  }, [getBotAtPoint, onBotClick, getCanvasPos])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDragRef.current = true
      const maxPan = 200
      panOffsetRef.current = {
        x: Math.max(-maxPan, Math.min(maxPan, dragStartRef.current.panX + dx)),
        y: Math.max(-maxPan, Math.min(maxPan, dragStartRef.current.panY + dy)),
      }
      return
    }
    const { mx, my } = getCanvasPos(e.clientX, e.clientY)
    setHoveredBotId(getBotAtPoint(mx, my))
  }, [getBotAtPoint, getCanvasPos])

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          cursor: isDraggingRef.current ? 'grabbing' : hoveredBotId ? 'pointer' : 'grab',
          imageRendering: 'pixelated',
          userSelect: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={() => {}}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setHoveredBotId(null); isDraggingRef.current = false }}
      />
      {/* Location selector tabs */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 flex-wrap justify-center max-w-full px-2">
        {SCENE_NAMES.map(loc => (
          <button
            key={loc}
            onClick={() => onLocationClick(loc)}
            className={`px-2 py-0.5 text-xs font-mono border transition-all ${
              loc === activeLocation
                ? 'border-opacity-80 text-white'
                : 'bg-black/50 border-white/15 text-white/50 hover:border-white/40 hover:text-white/80'
            }`}
            style={loc === activeLocation ? {
              background: meta.ambientColor + '33',
              borderColor: meta.ambientColor + 'AA',
              color: meta.ambientColor,
            } : {}}
          >
            {loc}
          </button>
        ))}
      </div>
    </div>
  )
}
