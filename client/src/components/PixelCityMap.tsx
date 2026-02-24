/**
 * PixelCityMap - 深圳像素城市场景视图
 *
 * 渲染层次（从下到上）：
 * 1. 背景层：场景设计图（建筑、树木、地面）
 * 2. 可动元素层：单车、摩托车、轿车、出租车、船只、公交车（vehicles_sheet.png）
 * 3. Bot角色层：人物精灵（szpc_chars_sheet1/2.png）
 * 4. UI层：名字标签、情绪气泡、选中圆圈
 *
 * 大地图：地图尺寸为视口2倍，可拖拽平移，随Bot数量自动扩展可步行区域
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

// ── Vehicle spritesheet ───────────────────────────────────────────────────
// vehicles_sheet.png: 512x384, 8 cols x 6 rows, each cell 64x64
// Cols 0-3: facing right (frames 0-3), Cols 4-7: facing left (mirrored, frames 0-3)
// Rows: 0=bicycle, 1=moto_delivery, 2=car_red, 3=taxi, 4=boat, 5=bus
const VEHICLE_SHEET_URL = 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663220928499/PdIOwZOVEteFseeO.png'
const V_CELL = 64
const V_COLS = 4  // frames per direction
const V_ROWS = 6

type VehicleType = 'bicycle' | 'moto' | 'car' | 'taxi' | 'boat' | 'bus'

interface VehicleConfig {
  row: number
  scale: number
  speed: number       // normalized units per second
  frameRate: number   // frames per second
  zOffset: number     // z-sort offset relative to y
}

const VEHICLE_CONFIGS: Record<VehicleType, VehicleConfig> = {
  bicycle:  { row: 0, scale: 1.4, speed: 0.06, frameRate: 8,  zOffset: 0 },
  moto:     { row: 1, scale: 1.5, speed: 0.10, frameRate: 10, zOffset: 0 },
  car:      { row: 2, scale: 1.8, speed: 0.08, frameRate: 8,  zOffset: 0 },
  taxi:     { row: 3, scale: 1.8, speed: 0.09, frameRate: 8,  zOffset: 0 },
  boat:     { row: 4, scale: 2.0, speed: 0.04, frameRate: 4,  zOffset: 0 },
  bus:      { row: 5, scale: 2.2, speed: 0.05, frameRate: 6,  zOffset: 0 },
}

// ── Vehicle road lanes per scene ──────────────────────────────────────────
// Each lane: { type, y (normalized), xMin, xMax, dir: 1=right/-1=left }
interface VehicleLane {
  type: VehicleType
  y: number       // normalized y position of lane center
  xMin: number    // patrol range
  xMax: number
  dir: 1 | -1
}

const SCENE_VEHICLE_LANES: Record<string, VehicleLane[]> = {
  '宝安城中村': [
    { type: 'bicycle', y: 0.35, xMin: 0.05, xMax: 0.90, dir: 1 },
    { type: 'bicycle', y: 0.62, xMin: 0.05, xMax: 0.90, dir: -1 },
    { type: 'moto',    y: 0.35, xMin: 0.05, xMax: 0.90, dir: -1 },
    { type: 'moto',    y: 0.62, xMin: 0.05, xMax: 0.90, dir: 1 },
    { type: 'bicycle', y: 0.50, xMin: 0.10, xMax: 0.50, dir: 1 },
    { type: 'bicycle', y: 0.50, xMin: 0.50, xMax: 0.90, dir: -1 },
  ],
  '南山科技园': [
    { type: 'bicycle', y: 0.55, xMin: 0.05, xMax: 0.95, dir: 1 },
    { type: 'bicycle', y: 0.75, xMin: 0.05, xMax: 0.95, dir: -1 },
    { type: 'moto',    y: 0.55, xMin: 0.05, xMax: 0.95, dir: -1 },
    { type: 'car',     y: 0.80, xMin: 0.05, xMax: 0.95, dir: 1 },
    { type: 'taxi',    y: 0.80, xMin: 0.05, xMax: 0.95, dir: -1 },
    { type: 'bus',     y: 0.85, xMin: 0.05, xMax: 0.95, dir: 1 },
  ],
  '福田CBD': [
    { type: 'car',     y: 0.55, xMin: 0.05, xMax: 0.95, dir: 1 },
    { type: 'car',     y: 0.60, xMin: 0.05, xMax: 0.95, dir: -1 },
    { type: 'taxi',    y: 0.65, xMin: 0.05, xMax: 0.95, dir: 1 },
    { type: 'taxi',    y: 0.70, xMin: 0.05, xMax: 0.95, dir: -1 },
    { type: 'bus',     y: 0.75, xMin: 0.05, xMax: 0.95, dir: 1 },
    { type: 'moto',    y: 0.55, xMin: 0.05, xMax: 0.95, dir: 1 },
    { type: 'bicycle', y: 0.80, xMin: 0.05, xMax: 0.95, dir: -1 },
  ],
  '华强北': [
    { type: 'moto',    y: 0.30, xMin: 0.05, xMax: 0.95, dir: 1 },
    { type: 'moto',    y: 0.30, xMin: 0.05, xMax: 0.95, dir: -1 },
    { type: 'bicycle', y: 0.50, xMin: 0.05, xMax: 0.95, dir: 1 },
    { type: 'bicycle', y: 0.50, xMin: 0.05, xMax: 0.95, dir: -1 },
    { type: 'moto',    y: 0.70, xMin: 0.05, xMax: 0.95, dir: 1 },
    { type: 'car',     y: 0.85, xMin: 0.05, xMax: 0.95, dir: -1 },
  ],
  '东门老街': [
    { type: 'bicycle', y: 0.30, xMin: 0.05, xMax: 0.95, dir: 1 },
    { type: 'bicycle', y: 0.55, xMin: 0.05, xMax: 0.95, dir: -1 },
    { type: 'moto',    y: 0.30, xMin: 0.05, xMax: 0.95, dir: -1 },
    { type: 'bicycle', y: 0.75, xMin: 0.05, xMax: 0.95, dir: 1 },
    { type: 'moto',    y: 0.75, xMin: 0.05, xMax: 0.95, dir: -1 },
  ],
  '南山公寓': [
    { type: 'car',     y: 0.50, xMin: 0.05, xMax: 0.95, dir: 1 },
    { type: 'car',     y: 0.55, xMin: 0.05, xMax: 0.95, dir: -1 },
    { type: 'bicycle', y: 0.60, xMin: 0.05, xMax: 0.95, dir: 1 },
    { type: 'moto',    y: 0.75, xMin: 0.05, xMax: 0.95, dir: -1 },
    { type: 'taxi',    y: 0.75, xMin: 0.05, xMax: 0.95, dir: 1 },
    { type: 'bus',     y: 0.80, xMin: 0.05, xMax: 0.95, dir: -1 },
  ],
  '深圳湾公园': [
    { type: 'bicycle', y: 0.32, xMin: 0.02, xMax: 0.98, dir: 1 },
    { type: 'bicycle', y: 0.32, xMin: 0.02, xMax: 0.98, dir: -1 },
    { type: 'bicycle', y: 0.36, xMin: 0.02, xMax: 0.98, dir: 1 },
    { type: 'boat',    y: 0.70, xMin: 0.02, xMax: 0.98, dir: 1 },
    { type: 'boat',    y: 0.75, xMin: 0.02, xMax: 0.98, dir: -1 },
    { type: 'boat',    y: 0.80, xMin: 0.02, xMax: 0.98, dir: 1 },
  ],
}

// ── Vehicle instance state ────────────────────────────────────────────────
interface VehicleState {
  id: string
  type: VehicleType
  lane: VehicleLane
  x: number         // normalized x
  y: number         // normalized y (from lane)
  dir: 1 | -1
  frame: number
  frameTimer: number
  // For large map: wrap around
}

// ── Spritesheet configuration ────────────────────────────────────────────
const SHEET_CELL_W = 196
const SHEET_CELL_H = 153
const SHEET_COLS = 6

interface SpriteConfig {
  sheet: 1 | 2
  row: number
  frameCount: number
  scale: number
  offsetY: number
}

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

const FALLBACK_CONFIGS: SpriteConfig[] = [
  { sheet: 2, row: 0, frameCount: 5, scale: 0.55, offsetY: 0.90 },
  { sheet: 1, row: 4, frameCount: 5, scale: 0.55, offsetY: 0.90 },
  { sheet: 2, row: 1, frameCount: 5, scale: 0.55, offsetY: 0.90 },
  { sheet: 1, row: 1, frameCount: 5, scale: 0.55, offsetY: 0.90 },
  { sheet: 2, row: 3, frameCount: 5, scale: 0.55, offsetY: 0.90 },
  { sheet: 1, row: 3, frameCount: 5, scale: 0.55, offsetY: 0.90 },
  { sheet: 2, row: 2, frameCount: 5, scale: 0.55, offsetY: 0.90 },
  { sheet: 1, row: 2, frameCount: 5, scale: 0.55, offsetY: 0.90 },
  { sheet: 2, row: 4, frameCount: 5, scale: 0.60, offsetY: 0.90 },
  { sheet: 1, row: 0, frameCount: 5, scale: 0.55, offsetY: 0.85 },
]

// ── Walkable zones per scene ──────────────────────────────────────────────
const SCENE_WALK_ZONES: Record<string, [number, number, number, number][]> = {
  '宝安城中村': [
    [0.15, 0.22, 0.70, 0.26],
    [0.12, 0.50, 0.30, 0.32],
    [0.55, 0.50, 0.32, 0.32],
    [0.68, 0.22, 0.20, 0.28],
  ],
  '南山科技园': [
    [0.22, 0.30, 0.56, 0.16],
    [0.10, 0.46, 0.80, 0.26],
    [0.15, 0.72, 0.70, 0.16],
  ],
  '福田CBD': [
    [0.18, 0.38, 0.64, 0.32],
    [0.05, 0.70, 0.90, 0.16],
  ],
  '华强北': [
    [0.03, 0.18, 0.44, 0.65],
    [0.52, 0.18, 0.44, 0.65],
    [0.08, 0.80, 0.84, 0.14],
  ],
  '东门老街': [
    [0.12, 0.20, 0.76, 0.22],
    [0.12, 0.38, 0.20, 0.36],
    [0.42, 0.38, 0.46, 0.36],
    [0.12, 0.72, 0.76, 0.18],
  ],
  '南山公寓': [
    [0.22, 0.40, 0.56, 0.20],
    [0.60, 0.52, 0.28, 0.26],
    [0.08, 0.70, 0.84, 0.14],
  ],
  '深圳湾公园': [
    [0.02, 0.02, 0.40, 0.24],
    [0.44, 0.28, 0.54, 0.20],
    [0.02, 0.28, 0.88, 0.10],
    [0.02, 0.40, 0.60, 0.12],
  ],
}

// ── Scene metadata ────────────────────────────────────────────────────────
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

// ── Character constants ───────────────────────────────────────────────────
const CHAR_WALK_SPEED = 0.8
const WALK_FRAME_DURATION = 0.12
const WANDER_INTERVAL = 3.5

// ── Large map constants ───────────────────────────────────────────────────
// Map world size is MAP_SCALE times the viewport
const MAP_SCALE = 2.0

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

// ── Image cache ───────────────────────────────────────────────────────────
const imageCache: Record<string, HTMLImageElement | null> = {}
const imageLoaded: Record<string, boolean> = {}

function preloadImage(url: string): HTMLImageElement {
  if (!imageCache[url]) {
    const img = new Image()
    // No crossOrigin: CDN doesn't support CORS headers, but we only need drawImage (no pixel read)
    img.onload = () => { imageLoaded[url] = true }
    img.onerror = () => { imageLoaded[url] = false }
    img.src = url
    imageCache[url] = img
    imageLoaded[url] = false
  }
  return imageCache[url]!
}

// ── Random point in walk zones ────────────────────────────────────────────
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

// ── Get sprite config for a bot ───────────────────────────────────────────
function getSpriteConfig(occupation: string | undefined, paletteIndex: number): SpriteConfig {
  if (occupation && SPRITE_CONFIGS[occupation]) return SPRITE_CONFIGS[occupation]
  return FALLBACK_CONFIGS[paletteIndex % FALLBACK_CONFIGS.length]
}

// ── Initialize vehicles for a scene ──────────────────────────────────────
function initVehicles(location: string, botCount: number): VehicleState[] {
  const lanes = SCENE_VEHICLE_LANES[location] || []
  const vehicles: VehicleState[] = []
  
  // Base count per lane + extra based on bot count
  const extraPerLane = Math.floor(botCount / 5)
  
  lanes.forEach((lane, laneIdx) => {
    // 3-6 vehicles per lane base, more with more bots
    const count = 3 + Math.min(extraPerLane, 4)
    for (let i = 0; i < count; i++) {
      const config = VEHICLE_CONFIGS[lane.type]
      // Spread vehicles evenly across the lane range
      const spread = lane.xMax - lane.xMin
      const x = lane.xMin + (i / count) * spread + Math.random() * (spread / count) * 0.5
      vehicles.push({
        id: `v_${location}_${laneIdx}_${i}`,
        type: lane.type,
        lane,
        x: Math.max(lane.xMin, Math.min(lane.xMax, x)),
        y: lane.y,
        dir: lane.dir,
        frame: Math.floor(Math.random() * V_COLS),
        frameTimer: Math.random() * (1 / config.frameRate),
      })
    }
  })
  
  return vehicles
}

// ── Draw vehicle from spritesheet ─────────────────────────────────────────
function drawVehicle(
  ctx: CanvasRenderingContext2D,
  v: VehicleState,
  imgDrawX: number, imgDrawY: number, imgDrawW: number, imgDrawH: number,
) {
  const sheet = imageCache[VEHICLE_SHEET_URL]
  if (!sheet || !imageLoaded[VEHICLE_SHEET_URL]) return
  
  const config = VEHICLE_CONFIGS[v.type]
  const frameCol = v.frame % V_COLS
  // Cols 0-3: right, Cols 4-7: left
  const sheetCol = v.dir === 1 ? frameCol : frameCol + V_COLS
  
  const sx = sheetCol * V_CELL
  const sy = config.row * V_CELL
  
  const renderW = Math.round(V_CELL * config.scale)
  const renderH = Math.round(V_CELL * config.scale)
  
  const cx = imgDrawX + v.x * imgDrawW
  const cy = imgDrawY + v.y * imgDrawH
  
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(
    sheet,
    sx, sy, V_CELL, V_CELL,
    cx - renderW / 2,
    cy - renderH * 0.75,
    renderW, renderH
  )
  ctx.restore()
}

export default function PixelCityMap({
  world, selectedBotId, onBotClick, onLocationClick, currentLocation
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const botStatesRef = useRef<Record<string, BotRenderState>>({})
  const vehiclesRef = useRef<VehicleState[]>([])
  const bubblesRef = useRef<EmotionBubble[]>([])
  const animFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const pulseRef = useRef(0)
  const [hoveredBotId, setHoveredBotId] = useState<string | null>(null)

  // Drag-to-pan (large map)
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
    preloadImage(VEHICLE_SHEET_URL)
  }, [])

  // Initialize vehicles when location changes
  useEffect(() => {
    const botCount = world ? Object.keys(world.bots).filter(id => world.bots[id].status === 'alive').length : 10
    vehiclesRef.current = initVehicles(activeLocation, botCount)
    panOffsetRef.current = { x: 0, y: 0 }
  }, [activeLocation])

  // Update bot states when world changes
  useEffect(() => {
    if (!world) return
    const allBotIds = Object.keys(world.bots).filter(id => world.bots[id].status === 'alive')

    // Re-init vehicles if bot count changed significantly
    const currentVehicleCount = vehiclesRef.current.length
    const expectedMin = initVehicles(activeLocation, allBotIds.length).length
    if (Math.abs(currentVehicleCount - expectedMin) > 3) {
      vehiclesRef.current = initVehicles(activeLocation, allBotIds.length)
    }

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

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.scale(dpr, dpr)

    // ── Background ────────────────────────────────────────────────────
    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0, 0, cssW, cssH)

    // ── Large map: background image scaled to MAP_SCALE, pan offset ───
    const bgUrl = SCENE_IMAGES[activeLocation]
    const bgImg = bgUrl ? preloadImage(bgUrl) : null

    // World size (larger than viewport)
    const worldW = cssW * MAP_SCALE
    const worldH = cssH * MAP_SCALE

    // Pan limits: allow panning up to (worldW - cssW) / 2 in each direction
    const maxPanX = (worldW - cssW) / 2
    const maxPanY = (worldH - cssH) / 2

    // Clamp pan
    const panX = Math.max(-maxPanX, Math.min(maxPanX, panOffsetRef.current.x))
    const panY = Math.max(-maxPanY, Math.min(maxPanY, panOffsetRef.current.y))
    panOffsetRef.current.x = panX
    panOffsetRef.current.y = panY

    // Image draw position: centered, then offset by pan
    // The image fills the world area, centered in viewport + pan
    let imgDrawX = (cssW - worldW) / 2 + panX
    let imgDrawY = (cssH - worldH) / 2 + panY
    let imgDrawW = worldW
    let imgDrawH = worldH

    if (bgImg && imageLoaded[bgUrl!]) {
      // Maintain aspect ratio within world bounds
      const imgAspect = bgImg.width / bgImg.height
      const worldAspect = worldW / worldH
      if (worldAspect > imgAspect) {
        imgDrawW = worldW
        imgDrawH = worldW / imgAspect
        imgDrawX = (cssW - worldW) / 2 + panX
        imgDrawY = (cssH - imgDrawH) / 2 + panY
      } else {
        imgDrawH = worldH
        imgDrawW = worldH * imgAspect
        imgDrawX = (cssW - imgDrawW) / 2 + panX
        imgDrawY = (cssH - worldH) / 2 + panY
      }
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(bgImg, imgDrawX, imgDrawY, imgDrawW, imgDrawH)

      // ── Procedural ground extension: fill areas outside image ────────
      // Tile a simple pixel pattern to fill gaps
      const tileColor = meta.ambientColor + '18'
      ctx.fillStyle = tileColor
      // Left gap
      if (imgDrawX > 0) ctx.fillRect(0, 0, imgDrawX, cssH)
      // Right gap
      if (imgDrawX + imgDrawW < cssW) ctx.fillRect(imgDrawX + imgDrawW, 0, cssW - imgDrawX - imgDrawW, cssH)
      // Top gap
      if (imgDrawY > 0) ctx.fillRect(0, 0, cssW, imgDrawY)
      // Bottom gap
      if (imgDrawY + imgDrawH < cssH) ctx.fillRect(0, imgDrawY + imgDrawH, cssW, cssH - imgDrawY - imgDrawH)
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

    // ── Z-sort drawable list ──────────────────────────────────────────
    interface ZDrawable { zY: number; draw: (c: CanvasRenderingContext2D) => void }
    const drawables: ZDrawable[] = []

    // ── Update & draw vehicles ────────────────────────────────────────
    vehiclesRef.current.forEach(v => {
      const config = VEHICLE_CONFIGS[v.type]
      
      // Animate frames
      v.frameTimer += dt
      const frameDuration = 1 / config.frameRate
      if (v.frameTimer >= frameDuration) {
        v.frameTimer -= frameDuration
        v.frame = (v.frame + 1) % V_COLS
      }
      
      // Move along lane
      v.x += v.dir * config.speed * dt
      
      // Wrap around when reaching lane end
      if (v.dir === 1 && v.x > v.lane.xMax + 0.05) {
        v.x = v.lane.xMin - 0.05
      } else if (v.dir === -1 && v.x < v.lane.xMin - 0.05) {
        v.x = v.lane.xMax + 0.05
      }
      
      // Only draw if within visible area
      const vCx = imgDrawX + v.x * imgDrawW
      const vCy = imgDrawY + v.y * imgDrawH
      if (vCx < -50 || vCx > cssW + 50 || vCy < -50 || vCy > cssH + 50) return
      
      const vConfig = VEHICLE_CONFIGS[v.type]
      const renderH = V_CELL * vConfig.scale
      
      // Shadow
      drawables.push({
        zY: vCy - 0.5,
        draw: (c) => {
          c.save()
          c.beginPath()
          c.ellipse(vCx, vCy + 2, V_CELL * vConfig.scale * 0.4, V_CELL * vConfig.scale * 0.12, 0, 0, Math.PI * 2)
          c.fillStyle = 'rgba(0,0,0,0.25)'
          c.fill()
          c.restore()
        }
      })
      
      // Vehicle sprite
      const vSnap = { ...v }
      drawables.push({
        zY: vCy,
        draw: (c) => drawVehicle(c, vSnap, imgDrawX, imgDrawY, imgDrawW, imgDrawH)
      })
    })

    // ── Bot characters ────────────────────────────────────────────────
    Object.entries(botStatesRef.current).forEach(([botId, bs]) => {
      bs.frameTimer += dt

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
          const speed = CHAR_WALK_SPEED / (cssW * MAP_SCALE)
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

      const config = getSpriteConfig(bs.occupation, bs.paletteIndex)
      const renderW = Math.round(SHEET_CELL_W * config.scale)
      const renderH = Math.round(SHEET_CELL_H * config.scale)
      const cx = imgDrawX + bs.x * imgDrawW
      const cy = imgDrawY + bs.y * imgDrawH
      const zY = cy

      // Skip if off-screen
      if (cx < -renderW || cx > cssW + renderW || cy < -renderH || cy > cssH + renderH) return

      const isSelected = selectedBotId === botId
      const isHovered = hoveredBotId === botId
      const isFlipped = bs.dir === 'left'

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

      const walkFrame = bs.state === 'idle' ? 0 : (bs.frame % 5) + 1
      drawables.push({
        zY,
        draw: (c) => {
          const sheetUrl = config.sheet === 1
            ? 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663220928499/RrSdJdSxhCsEfKnc.png'
            : 'https://files.manuscdn.com/user_upload_by_module/session_file/310519663220928499/bOyMUWIKYLqLPQIT.png'
          const sheet = imageCache[sheetUrl]
          if (!sheet || !imageLoaded[sheetUrl]) {
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
            c.drawImage(sheet, sx, sy, SHEET_CELL_W, SHEET_CELL_H, -renderW / 2, dy, renderW, renderH)
          } else {
            c.drawImage(sheet, sx, sy, SHEET_CELL_W, SHEET_CELL_H, dx, dy, renderW, renderH)
          }

          if (isSelected) {
            c.globalAlpha = 0.4
            c.globalCompositeOperation = 'screen'
            if (isFlipped) {
              c.drawImage(sheet, sx, sy, SHEET_CELL_W, SHEET_CELL_H, -renderW / 2, dy, renderW, renderH)
            } else {
              c.drawImage(sheet, sx, sy, SHEET_CELL_W, SHEET_CELL_H, dx, dy, renderW, renderH)
            }
            c.globalCompositeOperation = 'source-over'
          }
          c.restore()
        }
      })

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
          c.fillStyle = botColor
          c.globalAlpha = 0.95
          c.fillText(botName, cx, labelY)
          c.restore()
        }
      })
    })

    // ── Emotion bubbles ───────────────────────────────────────────────
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
          c.fillStyle = 'rgba(30,30,40,0.85)'
          c.beginPath()
          c.roundRect(bx - 14, by - 14, 28, 24, 6)
          c.fill()
          c.beginPath()
          c.moveTo(bx - 4, by + 10)
          c.lineTo(bx + 4, by + 10)
          c.lineTo(bx, by + 16)
          c.closePath()
          c.fill()
          c.font = `14px sans-serif`
          c.textAlign = 'center'
          c.fillText(bubble.emoji, bx, by + 4)
          c.restore()
        }
      })
    })

    // ── Z-sort and draw ───────────────────────────────────────────────
    drawables.sort((a, b) => a.zY - b.zY)
    drawables.forEach(d => d.draw(ctx))

    // ── Pan indicator (minimap hint) ──────────────────────────────────
    if (Math.abs(panX) > 10 || Math.abs(panY) > 10) {
      const indicatorAlpha = 0.5
      ctx.save()
      ctx.globalAlpha = indicatorAlpha
      // Small compass arrows at edge
      const arrowSize = 8
      const margin = 20
      ctx.fillStyle = meta.ambientColor
      ctx.font = `${arrowSize * 2}px sans-serif`
      ctx.textAlign = 'center'
      if (panX < -10) ctx.fillText('◀', margin, cssH / 2)
      if (panX > 10) ctx.fillText('▶', cssW - margin, cssH / 2)
      if (panY < -10) ctx.fillText('▲', cssW / 2, margin + arrowSize)
      if (panY > 10) ctx.fillText('▼', cssW / 2, cssH - margin)
      ctx.restore()
    }

    // ── Vignette ─────────────────────────────────────────────────────
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

  // Hit testing
  const getBotAtPoint = useCallback((mx: number, my: number): string | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const dpr = window.devicePixelRatio || 1
    const cssW = canvas.width / dpr
    const cssH = canvas.height / dpr

    const worldW = cssW * MAP_SCALE
    const worldH = cssH * MAP_SCALE
    const panX = panOffsetRef.current.x
    const panY = panOffsetRef.current.y

    const bgUrl = SCENE_IMAGES[activeLocation]
    const bgImg = bgUrl ? imageCache[bgUrl] : null
    let imgDrawX = (cssW - worldW) / 2 + panX
    let imgDrawY = (cssH - worldH) / 2 + panY
    let imgDrawW = worldW
    let imgDrawH = worldH

    if (bgImg && imageLoaded[bgUrl!]) {
      const imgAspect = bgImg.width / bgImg.height
      const worldAspect = worldW / worldH
      if (worldAspect > imgAspect) {
        imgDrawW = worldW
        imgDrawH = worldW / imgAspect
        imgDrawX = (cssW - worldW) / 2 + panX
        imgDrawY = (cssH - imgDrawH) / 2 + panY
      } else {
        imgDrawH = worldH
        imgDrawW = worldH * imgAspect
        imgDrawX = (cssW - imgDrawW) / 2 + panX
        imgDrawY = (cssH - worldH) / 2 + panY
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
      panOffsetRef.current = {
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy,
      }
      return
    }
    const { mx, my } = getCanvasPos(e.clientX, e.clientY)
    setHoveredBotId(getBotAtPoint(mx, my))
  }, [getBotAtPoint, getCanvasPos])

  // Touch support for mobile pan
  const touchStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX, y: e.touches[0].clientY,
        panX: panOffsetRef.current.x, panY: panOffsetRef.current.y,
      }
    }
  }, [])
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1 && touchStartRef.current) {
      e.preventDefault()
      const dx = e.touches[0].clientX - touchStartRef.current.x
      const dy = e.touches[0].clientY - touchStartRef.current.y
      panOffsetRef.current = {
        x: touchStartRef.current.panX + dx,
        y: touchStartRef.current.panY + dy,
      }
    }
  }, [])

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          cursor: isDraggingRef.current ? 'grabbing' : hoveredBotId ? 'pointer' : 'grab',
          imageRendering: 'pixelated',
          userSelect: 'none',
          touchAction: 'none',
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={() => {}}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setHoveredBotId(null); isDraggingRef.current = false }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => { touchStartRef.current = null }}
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
      {/* Map scale indicator */}
      <div className="absolute top-3 right-3 text-xs font-mono text-white/30 bg-black/30 px-2 py-0.5 rounded pointer-events-none">
        拖拽探索 {MAP_SCALE}x 地图
      </div>
    </div>
  )
}
