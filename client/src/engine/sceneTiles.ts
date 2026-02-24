/**
 * 深圳像素城市 - 瓦片地图系统
 * 设计哲学：城市运营中心 NOC Dashboard
 * 每个场景用 tilemap 定义，每格有具体类型（道路/人行道/草地/建筑/水面）
 * 建筑物用像素点阵精灵绘制，道路有中线和斑马线
 */

// ── Tile Types ────────────────────────────────────────────────────
export type TileType =
  | 'road_h'        // 水平道路
  | 'road_v'        // 垂直道路
  | 'road_cross'    // 十字路口
  | 'road_tl'       // 路口（左上）
  | 'road_tr'       // 路口（右上）
  | 'road_bl'       // 路口（左下）
  | 'road_br'       // 路口（右下）
  | 'sidewalk'      // 人行道
  | 'sidewalk_edge' // 人行道边缘（有路缘石）
  | 'grass'         // 草地
  | 'grass_dark'    // 深草地
  | 'water'         // 水面
  | 'water_edge'    // 水边
  | 'concrete'      // 水泥地
  | 'tile_floor'    // 瓷砖地面（室内）
  | 'tile_checker'  // 棋盘格
  | 'sand'          // 沙地
  | 'building'      // 建筑占位（不可走）
  | 'park_path'     // 公园小路
  | 'plaza'         // 广场地砖

// ── Tile Color Palettes ───────────────────────────────────────────
export const TILE_COLORS: Record<TileType, { base: string; detail?: string; line?: string }> = {
  road_h:        { base: '#1E1E28', detail: '#2A2A38', line: '#FFDD00' },
  road_v:        { base: '#1E1E28', detail: '#2A2A38', line: '#FFDD00' },
  road_cross:    { base: '#1E1E28', detail: '#2A2A38', line: '#FFFFFF' },
  road_tl:       { base: '#1E1E28', detail: '#2A2A38' },
  road_tr:       { base: '#1E1E28', detail: '#2A2A38' },
  road_bl:       { base: '#1E1E28', detail: '#2A2A38' },
  road_br:       { base: '#1E1E28', detail: '#2A2A38' },
  sidewalk:      { base: '#3A3A48', detail: '#44444E' },
  sidewalk_edge: { base: '#3A3A48', detail: '#555560', line: '#666670' },
  grass:         { base: '#1C3A1C', detail: '#244424' },
  grass_dark:    { base: '#142A14', detail: '#1C341C' },
  water:         { base: '#0A1A3A', detail: '#0E2248', line: '#1A3A6A' },
  water_edge:    { base: '#0A1A3A', detail: '#1A2A4A', line: '#2A4A7A' },
  concrete:      { base: '#2A2A38', detail: '#303040' },
  tile_floor:    { base: '#2E2E3E', detail: '#363648' },
  tile_checker:  { base: '#282838', detail: '#323244' },
  sand:          { base: '#3A3020', detail: '#443828' },
  building:      { base: '#1A1A28', detail: '#1A1A28' },
  park_path:     { base: '#2E2818', detail: '#382E1E', line: '#443A24' },
  plaza:         { base: '#303040', detail: '#3A3A4C', line: '#444456' },
}

// ── Tile Map Layout ───────────────────────────────────────────────
// Each scene is a 2D array of TileType
// Abbreviations for compact notation:
const R = 'road_h' as TileType
const V = 'road_v' as TileType
const X = 'road_cross' as TileType
const S = 'sidewalk' as TileType
const E = 'sidewalk_edge' as TileType
const G = 'grass' as TileType
const K = 'grass_dark' as TileType
const W = 'water' as TileType
const A = 'water_edge' as TileType
const C = 'concrete' as TileType
const T = 'tile_floor' as TileType
const H = 'tile_checker' as TileType
const B = 'building' as TileType
const P = 'park_path' as TileType
const Z = 'plaza' as TileType

// ── Scene Tilemap Definitions ─────────────────────────────────────

/** 宝安城中村：密集握手楼，窄巷，水泥地 */
const VILLAGE_MAP: TileType[][] = [
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [C,C,C,C,V,C,C,C,C,C,C,C,V,C,C,C,C,C,C,V,C,C,C,C],
  [C,C,C,C,V,C,C,C,C,C,C,C,V,C,C,C,C,C,C,V,C,C,C,C],
  [R,R,R,R,X,R,R,R,R,R,R,R,X,R,R,R,R,R,R,X,R,R,R,R],
  [C,C,C,C,V,C,C,C,C,C,C,C,V,C,C,C,C,C,C,V,C,C,C,C],
  [C,C,C,C,V,C,C,C,C,C,C,C,V,C,C,C,C,C,C,V,C,C,C,C],
  [C,C,C,C,V,C,C,C,C,C,C,C,V,C,C,C,C,C,C,V,C,C,C,C],
  [R,R,R,R,X,R,R,R,R,R,R,R,X,R,R,R,R,R,R,X,R,R,R,R],
  [C,C,C,C,V,C,C,C,C,C,C,C,V,C,C,C,C,C,C,V,C,C,C,C],
  [C,C,C,C,V,C,C,C,C,C,C,C,V,C,C,C,C,C,C,V,C,C,C,C],
  [S,S,S,S,E,S,S,S,S,S,S,S,E,S,S,S,S,S,S,E,S,S,S,S],
  [R,R,R,R,X,R,R,R,R,R,R,R,X,R,R,R,R,R,R,X,R,R,R,R],
  [S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S],
  [C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C],
  [C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C],
]

/** 南山科技园：宽阔马路，广场，写字楼 */
const TECH_MAP: TileType[][] = [
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z],
  [Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z],
  [S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S],
  [R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R],
  [R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R],
  [S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S],
  [H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H],
  [H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H],
  [H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H],
  [S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S],
  [R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R],
  [R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R],
  [S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S],
  [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],
]

/** 福田CBD：超宽马路，高楼，地铁 */
const CBD_MAP: TileType[][] = [
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z],
  [Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z],
  [Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z,Z],
  [S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S],
  [R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R],
  [R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R],
  [R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R],
  [S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S],
  [H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H],
  [H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H,H],
  [S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S],
  [R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R],
  [R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R],
  [S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S],
]

/** 华强北：密集商铺，小巷，电子市场 */
const HUAQIANG_MAP: TileType[][] = [
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C],
  [C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C],
  [S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S],
  [R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R],
  [R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R],
  [S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S],
  [C,C,C,V,C,C,C,C,C,C,C,V,C,C,C,C,C,C,C,V,C,C,C,C],
  [C,C,C,V,C,C,C,C,C,C,C,V,C,C,C,C,C,C,C,V,C,C,C,C],
  [R,R,R,X,R,R,R,R,R,R,R,X,R,R,R,R,R,R,R,X,R,R,R,R],
  [C,C,C,V,C,C,C,C,C,C,C,V,C,C,C,C,C,C,C,V,C,C,C,C],
  [C,C,C,V,C,C,C,C,C,C,C,V,C,C,C,C,C,C,C,V,C,C,C,C],
  [S,S,S,E,S,S,S,S,S,S,S,E,S,S,S,S,S,S,S,E,S,S,S,S],
  [R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R],
  [S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S,S],
]

/** 东门老街：石板路，老街巷，红灯笼 */
const DONGMEN_MAP: TileType[][] = [
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P],
  [P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P],
  [C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C],
  [R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R],
  [R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R],
  [C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C],
  [P,P,P,V,P,P,P,P,P,P,P,V,P,P,P,P,P,P,P,V,P,P,P,P],
  [P,P,P,V,P,P,P,P,P,P,P,V,P,P,P,P,P,P,P,V,P,P,P,P],
  [R,R,R,X,R,R,R,R,R,R,R,X,R,R,R,R,R,R,R,X,R,R,R,R],
  [P,P,P,V,P,P,P,P,P,P,P,V,P,P,P,P,P,P,P,V,P,P,P,P],
  [P,P,P,V,P,P,P,P,P,P,P,V,P,P,P,P,P,P,P,V,P,P,P,P],
  [C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C],
  [R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R],
  [C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C,C],
]

/** 南山公寓：住宅区，绿化带，小路 */
const APARTMENT_MAP: TileType[][] = [
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B],
  [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
  [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
  [P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P],
  [R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R],
  [R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R],
  [P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P],
  [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
  [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
  [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
  [P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P],
  [R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R],
  [R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R],
  [P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P],
  [G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G],
]

/** 深圳湾公园：草地，海边，小路，树木 */
const PARK_MAP: TileType[][] = [
  [K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K],
  [K,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,K],
  [K,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,K],
  [K,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,K],
  [K,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,K],
  [K,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,K],
  [K,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,K],
  [P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P],
  [P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P,P],
  [K,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,K],
  [K,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,K],
  [A,A,A,A,A,A,A,A,A,A,A,A,A,A,A,A,A,A,A,A,A,A,A,A],
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
]

// ── Building Sprites (pixel-agents 风格点阵) ─────────────────────
import type { SpriteData } from './spriteSystem'

const _ = ''

/** 高层写字楼 (24x32) - 南山科技园 / 福田CBD */
export const OFFICE_TOWER: SpriteData = (() => {
  const Wc = '#8899BB', L = '#AABBDD', D = '#445566', F = '#334455', Gc = '#CCDDFF'
  const rows: string[][] = []
  rows.push([_,_,_,_,_,_,_,_,_,_,_,F,F,_,_,_,_,_,_,_,_,_,_,_])
  rows.push([_,_,_,_,_,_,_,_,_,_,_,F,F,_,_,_,_,_,_,_,_,_,_,_])
  rows.push([_,_,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,_,_])
  rows.push([_,_,F,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,F,_,_])
  rows.push([_,_,F,Gc,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,Gc,F,_,_])
  for (let floor = 0; floor < 5; floor++) {
    rows.push([_,F,F,D,Wc,Wc,D,Wc,Wc,D,Wc,Wc,D,Wc,Wc,D,Wc,Wc,D,Wc,Wc,D,F,_])
    rows.push([_,F,D,Wc,Gc,Wc,Wc,Gc,Wc,Wc,Gc,Wc,Wc,Gc,Wc,Wc,Gc,Wc,Wc,Gc,Wc,Wc,F,_])
    rows.push([_,F,D,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,F,_])
    rows.push([_,F,D,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,F,_])
  }
  rows.push([_,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,_])
  rows.push([_,F,D,D,D,D,D,D,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,D,D,D,D,D,D,F,_])
  rows.push([_,F,D,D,D,D,D,D,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,D,D,D,D,D,D,F,_])
  rows.push([_,_,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,_,_])
  return rows
})()

/** 城中村握手楼 (20x28) - 宝安城中村 */
export const VILLAGE_BUILDING: SpriteData = (() => {
  const Wc = '#8B7355', D = '#6B5335', Rc = '#AA4422', Gc = '#AABB88', T = '#CC8844'
  const rows: string[][] = []
  rows.push([_,_,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,_,_])
  rows.push([_,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,_])
  rows.push([T,T,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,T,T])
  for (let floor = 0; floor < 5; floor++) {
    const ie = floor % 2 === 0
    rows.push([Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc])
    rows.push([Wc,D,ie?Gc:Wc,ie?Gc:Wc,Wc,Wc,D,ie?Gc:Wc,ie?Gc:Wc,Wc,Wc,D,ie?Gc:Wc,ie?Gc:Wc,Wc,Wc,D,ie?Gc:Wc,ie?Gc:Wc,Wc])
    rows.push([Wc,D,ie?Gc:Wc,ie?Gc:Wc,Wc,Wc,D,ie?Gc:Wc,ie?Gc:Wc,Wc,Wc,D,ie?Gc:Wc,ie?Gc:Wc,Wc,Wc,D,ie?Gc:Wc,ie?Gc:Wc,Wc])
    rows.push([Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc])
  }
  rows.push([Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc])
  rows.push([Wc,D,D,D,D,D,D,D,Gc,Gc,Gc,Gc,Gc,Gc,D,D,D,D,D,Wc])
  rows.push([Wc,D,D,D,D,D,D,D,Gc,Gc,Gc,Gc,Gc,Gc,D,D,D,D,D,Wc])
  rows.push([Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc])
  return rows
})()

/** 购物中心 (28x24) - 东门老街 / 华强北 */
export const MALL_BUILDING: SpriteData = (() => {
  const Wc = '#CC9944', D = '#AA7722', Rc = '#DD4444', Gc = '#88CCFF', L = '#FFEE88'
  const rows: string[][] = []
  rows.push([_,_,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,_,_])
  rows.push([_,Rc,Rc,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,Rc,Rc,_])
  rows.push([_,Rc,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,Rc,_])
  rows.push([_,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,_])
  for (let floor = 0; floor < 4; floor++) {
    rows.push([Wc,Wc,D,Gc,Gc,Gc,D,Gc,Gc,Gc,D,Gc,Gc,Gc,D,Gc,Gc,Gc,D,Gc,Gc,Gc,D,Gc,Gc,Gc,D,Wc])
    rows.push([Wc,D,Gc,Gc,L,Gc,Gc,Gc,L,Gc,Gc,Gc,L,Gc,Gc,Gc,L,Gc,Gc,Gc,L,Gc,Gc,Gc,L,Gc,Gc,Wc])
    rows.push([Wc,D,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Wc])
    rows.push([Wc,Wc,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,Wc,Wc])
  }
  rows.push([Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc])
  rows.push([Wc,D,D,D,D,D,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,D,D,D,D,D,Wc])
  rows.push([Wc,D,D,D,D,D,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,Gc,D,D,D,D,D,Wc])
  rows.push([Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc])
  return rows
})()

/** 公寓楼 (18x26) - 南山公寓 */
export const APARTMENT: SpriteData = (() => {
  const Wc = '#778899', D = '#556677', Gc = '#AACCEE', Y = '#FFDD88', Rc = '#AA3333'
  const rows: string[][] = []
  rows.push([_,_,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,_,_])
  rows.push([_,Rc,Rc,D,D,D,D,D,D,D,D,D,D,D,D,Rc,Rc,_])
  for (let floor = 0; floor < 6; floor++) {
    const hl = Math.random() > 0.4
    rows.push([Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc])
    rows.push([Wc,D,hl?Y:Gc,hl?Y:Gc,Wc,Wc,D,hl?Y:Gc,hl?Y:Gc,Wc,Wc,D,hl?Y:Gc,hl?Y:Gc,Wc,Wc,D,Wc])
    rows.push([Wc,D,hl?Y:Gc,hl?Y:Gc,Wc,Wc,D,hl?Y:Gc,hl?Y:Gc,Wc,Wc,D,hl?Y:Gc,hl?Y:Gc,Wc,Wc,D,Wc])
    rows.push([Wc,Wc,D,D,D,D,D,D,D,D,D,D,D,D,D,D,Wc,Wc])
  }
  rows.push([Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc])
  rows.push([Wc,D,D,D,D,D,D,D,Gc,Gc,Gc,Gc,D,D,D,D,D,Wc])
  rows.push([Wc,D,D,D,D,D,D,D,Gc,Gc,Gc,Gc,D,D,D,D,D,Wc])
  rows.push([Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc])
  return rows
})()

/** 公园树木 (12x16) - 深圳湾公园 */
export const PARK_TREE: SpriteData = [
  [_,_,_,_,_,'#2D5A1B',_,_,_,_,_,_],
  [_,_,_,_,'#2D5A1B','#3D7A2B','#2D5A1B',_,_,_,_,_],
  [_,_,_,'#2D5A1B','#3D7A2B','#4D9A3B','#3D7A2B','#2D5A1B',_,_,_,_],
  [_,_,'#2D5A1B','#3D7A2B','#4D9A3B','#5DAA4B','#4D9A3B','#3D7A2B','#2D5A1B',_,_,_],
  [_,'#2D5A1B','#3D7A2B','#4D9A3B','#5DAA4B','#6DBB5B','#5DAA4B','#4D9A3B','#3D7A2B','#2D5A1B',_,_],
  [_,'#2D5A1B','#3D7A2B','#4D9A3B','#5DAA4B','#6DBB5B','#5DAA4B','#4D9A3B','#3D7A2B','#2D5A1B',_,_],
  [_,_,'#2D5A1B','#3D7A2B','#4D9A3B','#5DAA4B','#4D9A3B','#3D7A2B','#2D5A1B',_,_,_],
  [_,_,_,'#2D5A1B','#3D7A2B','#4D9A3B','#3D7A2B','#2D5A1B',_,_,_,_],
  [_,_,_,_,_,'#5A3A1A','#5A3A1A',_,_,_,_,_],
  [_,_,_,_,_,'#5A3A1A','#5A3A1A',_,_,_,_,_],
  [_,_,_,_,_,'#5A3A1A','#5A3A1A',_,_,_,_,_],
  [_,_,_,_,'#4A2A0A','#5A3A1A','#5A3A1A','#4A2A0A',_,_,_,_],
  [_,_,_,_,'#4A2A0A','#5A3A1A','#5A3A1A','#4A2A0A',_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_,_,_,_,_],
]

/** 路灯 (8x16) */
export const STREET_LAMP: SpriteData = [
  [_,_,_,'#888888','#888888',_,_,_],
  [_,_,'#888888','#FFEE88','#FFEE88','#888888',_,_],
  [_,_,'#888888','#FFEE88','#FFEE88','#888888',_,_],
  [_,_,_,'#888888','#888888',_,_,_],
  [_,_,_,_,'#666666',_,_,_],
  [_,_,_,_,'#666666',_,_,_],
  [_,_,_,_,'#666666',_,_,_],
  [_,_,_,_,'#666666',_,_,_],
  [_,_,_,_,'#666666',_,_,_],
  [_,_,_,_,'#666666',_,_,_],
  [_,_,_,_,'#666666',_,_,_],
  [_,_,_,_,'#666666',_,_,_],
  [_,_,'#555555','#555555','#555555','#555555',_,_],
  [_,'#555555','#555555','#555555','#555555','#555555','#555555',_],
  [_,_,_,_,_,_,_,_],
  [_,_,_,_,_,_,_,_],
]

/** 便利店 (16x16) */
export const CONVENIENCE_STORE: SpriteData = (() => {
  const Wc = '#DDDDDD', Rc = '#EE4444', Gc = '#88CCFF', Y = '#FFEE44', D = '#888888'
  return [
    [_,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,_],
    [Rc,Rc,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Rc,Rc],
    [Rc,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Rc],
    [Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc,Rc],
    [Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc],
    [Wc,D,Gc,Gc,Gc,D,Wc,Wc,Wc,Wc,D,Gc,Gc,Gc,D,Wc],
    [Wc,D,Gc,Gc,Gc,D,Wc,Wc,Wc,Wc,D,Gc,Gc,Gc,D,Wc],
    [Wc,D,Gc,Gc,Gc,D,Wc,Wc,Wc,Wc,D,Gc,Gc,Gc,D,Wc],
    [Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc],
    [Wc,D,Gc,Gc,Gc,D,Wc,Wc,Wc,Wc,D,Gc,Gc,Gc,D,Wc],
    [Wc,D,Gc,Gc,Gc,D,Wc,Wc,Wc,Wc,D,Gc,Gc,Gc,D,Wc],
    [Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc],
    [Wc,Wc,Wc,Wc,Wc,Wc,Gc,Gc,Gc,Gc,Wc,Wc,Wc,Wc,Wc,Wc],
    [Wc,Wc,Wc,Wc,Wc,Wc,Gc,Gc,Gc,Gc,Wc,Wc,Wc,Wc,Wc,Wc],
    [D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D],
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  ]
})()

/** 地铁站入口 (20x12) */
export const METRO_ENTRANCE: SpriteData = (() => {
  const Bc = '#1144AA', L = '#2255CC', Wc = '#AABBDD', Y = '#FFDD00', D = '#0A2255'
  return [
    [_,_,Bc,Bc,Bc,Bc,Bc,Bc,Bc,Bc,Bc,Bc,Bc,Bc,Bc,Bc,Bc,Bc,_,_],
    [_,Bc,Bc,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Bc,Bc,_],
    [_,Bc,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Bc,_],
    [_,Bc,Bc,Bc,Bc,Bc,Bc,Bc,Bc,Bc,Bc,Bc,Bc,Bc,Bc,Bc,Bc,Bc,Bc,_],
    [Bc,Bc,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,Bc,Bc],
    [Bc,L,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,L,Bc],
    [Bc,L,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,Wc,L,Bc],
    [Bc,L,Wc,Wc,D,D,D,D,D,D,D,D,D,D,D,D,Wc,Wc,L,Bc],
    [Bc,L,Wc,Wc,D,D,D,D,D,D,D,D,D,D,D,D,Wc,Wc,L,Bc],
    [Bc,Bc,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,Bc,Bc],
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  ]
})()

// ── Scene Object Config ───────────────────────────────────────────
export interface SceneObject {
  sprite: SpriteData
  col: number
  row: number
  zY?: number
}

export interface SceneConfig {
  name: string
  cols: number
  rows: number
  tilemap: TileType[][]
  objects: SceneObject[]
  ambientColor: string
  lightColor: string
  walkableRowStart: number  // bots walk from this row down
}

export const SCENE_CONFIGS: Record<string, SceneConfig> = {
  '宝安城中村': {
    name: '宝安城中村',
    cols: 24, rows: 18,
    tilemap: VILLAGE_MAP,
    ambientColor: '#FF9F43',
    lightColor: '#FFAA55',
    walkableRowStart: 13,
    objects: [
      { sprite: VILLAGE_BUILDING, col: 0, row: 0 },
      { sprite: VILLAGE_BUILDING, col: 11, row: 0 },
      { sprite: STREET_LAMP, col: 5, row: 12 },
      { sprite: STREET_LAMP, col: 17, row: 12 },
      { sprite: CONVENIENCE_STORE, col: 6, row: 13 },
    ],
  },
  '南山科技园': {
    name: '南山科技园',
    cols: 24, rows: 18,
    tilemap: TECH_MAP,
    ambientColor: '#4D96FF',
    lightColor: '#88BBFF',
    walkableRowStart: 10,
    objects: [
      { sprite: OFFICE_TOWER, col: 0, row: 0 },
      { sprite: OFFICE_TOWER, col: 14, row: 0 },
      { sprite: METRO_ENTRANCE, col: 6, row: 12 },
      { sprite: STREET_LAMP, col: 9, row: 11 },
      { sprite: STREET_LAMP, col: 13, row: 11 },
    ],
  },
  '福田CBD': {
    name: '福田CBD',
    cols: 24, rows: 18,
    tilemap: CBD_MAP,
    ambientColor: '#C77DFF',
    lightColor: '#DD99FF',
    walkableRowStart: 12,
    objects: [
      { sprite: OFFICE_TOWER, col: 0, row: 0 },
      { sprite: OFFICE_TOWER, col: 8, row: 0 },
      { sprite: OFFICE_TOWER, col: 16, row: 0 },
      { sprite: METRO_ENTRANCE, col: 4, row: 12 },
      { sprite: STREET_LAMP, col: 12, row: 11 },
    ],
  },
  '华强北': {
    name: '华强北',
    cols: 24, rows: 18,
    tilemap: HUAQIANG_MAP,
    ambientColor: '#00F5FF',
    lightColor: '#44FFFF',
    walkableRowStart: 13,
    objects: [
      { sprite: MALL_BUILDING, col: 0, row: 0 },
      { sprite: MALL_BUILDING, col: 14, row: 0 },
      { sprite: CONVENIENCE_STORE, col: 7, row: 13 },
      { sprite: STREET_LAMP, col: 4, row: 12 },
      { sprite: STREET_LAMP, col: 18, row: 12 },
    ],
  },
  '东门老街': {
    name: '东门老街',
    cols: 24, rows: 18,
    tilemap: DONGMEN_MAP,
    ambientColor: '#FF6B6B',
    lightColor: '#FF8888',
    walkableRowStart: 13,
    objects: [
      { sprite: MALL_BUILDING, col: 1, row: 0 },
      { sprite: VILLAGE_BUILDING, col: 15, row: 0 },
      { sprite: CONVENIENCE_STORE, col: 4, row: 13 },
      { sprite: STREET_LAMP, col: 9, row: 12 },
      { sprite: STREET_LAMP, col: 19, row: 12 },
    ],
  },
  '南山公寓': {
    name: '南山公寓',
    cols: 24, rows: 18,
    tilemap: APARTMENT_MAP,
    ambientColor: '#6BCB77',
    lightColor: '#88DD88',
    walkableRowStart: 12,
    objects: [
      { sprite: APARTMENT, col: 1, row: 0 },
      { sprite: APARTMENT, col: 13, row: 0 },
      { sprite: STREET_LAMP, col: 7, row: 11 },
      { sprite: CONVENIENCE_STORE, col: 17, row: 12 },
    ],
  },
  '深圳湾公园': {
    name: '深圳湾公园',
    cols: 24, rows: 18,
    tilemap: PARK_MAP,
    ambientColor: '#00F5FF',
    lightColor: '#44FFEE',
    walkableRowStart: 7,
    objects: [
      { sprite: PARK_TREE, col: 1, row: 1 },
      { sprite: PARK_TREE, col: 5, row: 2 },
      { sprite: PARK_TREE, col: 10, row: 1 },
      { sprite: PARK_TREE, col: 15, row: 2 },
      { sprite: PARK_TREE, col: 19, row: 1 },
      { sprite: STREET_LAMP, col: 8, row: 9 },
      { sprite: STREET_LAMP, col: 14, row: 9 },
    ],
  },
}
