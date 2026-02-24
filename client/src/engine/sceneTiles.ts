/**
 * 深圳像素城市 - 瓦片地图系统 v2.0
 * 设计哲学：参考图风格的俯视角像素城市
 * - 精细建筑立面：空调外机、窗户、天台水箱、外墙纹理
 * - 行道树：圆形多层次树冠，密集排列
 * - 停放车辆：俯视角小轿车
 * - 绿化护栏：沿街绿色铁栅栏
 * - 丰富地面纹理
 */

import type { SpriteData } from './spriteSystem'

// ── Tile Types ────────────────────────────────────────────────────
export type TileType =
  | 'road_h'        // 水平道路（深灰沥青）
  | 'road_v'        // 垂直道路
  | 'road_cross'    // 十字路口
  | 'sidewalk'      // 人行道（浅灰砖）
  | 'sidewalk_edge' // 人行道边缘（路缘石）
  | 'grass'         // 草地（深绿）
  | 'grass_lush'    // 茂密草地（更深绿）
  | 'water'         // 水面（深蓝）
  | 'water_edge'    // 水边
  | 'concrete'      // 水泥地
  | 'tile_plaza'    // 广场地砖（浅色）
  | 'building'      // 建筑占位（不可走）
  | 'park_path'     // 公园小路（棕色砖）
  | 'fence_green'   // 绿色护栏地面（草+护栏）
  | 'alley'         // 小巷（深色水泥）

// ── Tile Color Palettes ───────────────────────────────────────────
export const TILE_COLORS: Record<TileType, { base: string; detail?: string; line?: string; line2?: string }> = {
  road_h:        { base: '#484848', detail: '#525252', line: '#FFCC00', line2: '#FFFFFF' },
  road_v:        { base: '#484848', detail: '#525252', line: '#FFCC00', line2: '#FFFFFF' },
  road_cross:    { base: '#484848', detail: '#525252', line: '#FFFFFF' },
  sidewalk:      { base: '#A09080', detail: '#B0A090', line: '#888070' },
  sidewalk_edge: { base: '#888070', detail: '#706858', line: '#C0B0A0' },
  grass:         { base: '#3A6A28', detail: '#4A7A34', line: '#2E5420' },
  grass_lush:    { base: '#2A5A1A', detail: '#3A6A24', line: '#1E4414' },
  water:         { base: '#1A3A5A', detail: '#1E4468', line: '#2A5A8A' },
  water_edge:    { base: '#2A4A6A', detail: '#3A5A7A', line: '#4A7AAA' },
  concrete:      { base: '#686860', detail: '#747468', line: '#585850' },
  tile_plaza:    { base: '#C0B090', detail: '#D0C0A0', line: '#A09070' },
  building:      { base: '#1A1A20', detail: '#1A1A20' },
  park_path:     { base: '#8A6A40', detail: '#9A7A50', line: '#7A5A30' },
  fence_green:   { base: '#3A6A28', detail: '#4A7A34', line: '#1A4A10' },
  alley:         { base: '#383830', detail: '#404038', line: '#303028' },
}

const _ = ''

// ── Map Layout Abbreviations ──────────────────────────────────────
const R  : TileType = 'road_h'
const V  : TileType = 'road_v'
const X  : TileType = 'road_cross'
const S  : TileType = 'sidewalk'
const E  : TileType = 'sidewalk_edge'
const G  : TileType = 'grass'
const GL : TileType = 'grass_lush'
const W  : TileType = 'water'
const WE : TileType = 'water_edge'
const C  : TileType = 'concrete'
const P  : TileType = 'tile_plaza'
const B  : TileType = 'building'
const PP : TileType = 'park_path'
const FG : TileType = 'fence_green'
const AL : TileType = 'alley'

// ── Scene Tilemaps ────────────────────────────────────────────────

/** 宝安城中村：握手楼群 + 窄巷 + 主街道 */
const VILLAGE_MAP: TileType[][] = [
  [B, B, B, B, B, B, B, B, B, B, AL,AL,B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, AL,AL,B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, AL,AL,B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, AL,AL,B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, AL,AL,B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, AL,AL,B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, AL,AL,B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, AL,AL,B, B, B, B, B, B, B, B, B, B, B, B],
  [AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL],
  [AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL,AL],
  [C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C],
  [FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG],
  [S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S],
  [E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E],
  [R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R],
  [R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R],
  [E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E],
  [FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG,FG],
]

/** 南山科技园：宽阔广场 + 玻璃幕墙大楼 + 绿化带 */
const TECH_MAP: TileType[][] = [
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
  [S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S],
  [E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E],
  [R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R],
  [R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R],
  [E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E],
  [S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
]

/** 福田CBD：高楼林立 + 宽马路 + 地铁站 */
const CBD_MAP: TileType[][] = [
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P],
  [P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P, P],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
  [S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S],
  [E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E],
  [R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R],
  [R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R],
  [R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R],
  [E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E],
  [S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S],
]

/** 华强北：电子街 + 密集商铺 */
const HUAQIANG_MAP: TileType[][] = [
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C],
  [C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C],
  [S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S],
  [E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E],
  [R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R],
  [R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R],
  [E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E],
  [S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S],
  [C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C],
  [C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C],
]

/** 东门老街：老街 + 红灯笼 + 骑楼 */
const DONGMEN_MAP: TileType[][] = [
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C],
  [S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S],
  [S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S],
  [E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E],
  [R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R],
  [R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R],
  [E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E],
  [S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S],
  [S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S],
  [C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C],
]

/** 南山公寓：住宅区 + 绿化 + 小路 */
const APARTMENT_MAP: TileType[][] = [
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B, B],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
  [S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S],
  [E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E],
  [R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R],
  [R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R, R],
  [E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E, E],
  [S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S, S],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
  [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G],
]

/** 深圳湾公园：草地 + 海边 + 小路 + 树木 */
const PARK_MAP: TileType[][] = [
  [GL,GL,GL,GL,GL,GL,GL,GL,GL,GL,GL,GL,GL,GL,GL,GL,GL,GL,GL,GL,GL,GL,GL,GL],
  [GL,G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, GL],
  [GL,G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, GL],
  [GL,G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, GL],
  [GL,G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, GL],
  [GL,G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, GL],
  [GL,G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, GL],
  [PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP],
  [PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP,PP],
  [GL,G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, GL],
  [GL,G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, GL],
  [WE,WE,WE,WE,WE,WE,WE,WE,WE,WE,WE,WE,WE,WE,WE,WE,WE,WE,WE,WE,WE,WE,WE,WE],
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
]

// ── Pixel Sprites ─────────────────────────────────────────────────

/** 城中村握手楼（俯视角，有空调外机、窗户、天台水箱）24x32 */
export const VILLAGE_BUILDING: SpriteData = (() => {
  // 颜色定义
  const WL = '#C8C8B8'  // 外墙浅色
  const WD = '#A8A898'  // 外墙深色（阴影）
  const WS = '#B8B8A8'  // 外墙中间色
  const WN = '#989888'  // 外墙污迹
  const WT = '#D8D8C8'  // 外墙高光
  const WI = '#4A6080'  // 窗户玻璃（深蓝灰）
  const WF = '#3A5070'  // 窗框
  const AC = '#E0E0D8'  // 空调外机白
  const AG = '#C0C0B8'  // 空调格栅
  const RO = '#886644'  // 屋顶（红棕）
  const RT = '#AA8866'  // 屋顶高光
  const TK = '#707070'  // 水箱（深灰）
  const TL = '#909090'  // 水箱高光
  const DR = '#2A2A2A'  // 车库门（深色）
  const DL = '#3A3A3A'  // 车库门格栅

  const rows: string[][] = []

  // 天台 (3行)
  rows.push([RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO])
  rows.push([RT,RT,TK,TK,TL,RO,RO,RO,RO,RO,RO,RO,TK,TK,TL,RO,RO,RO,RO,RO,TK,TK,TL,RO])
  rows.push([RO,RO,TK,TK,TK,RO,RO,RO,RO,RO,RO,RO,TK,TK,TK,RO,RO,RO,RO,RO,TK,TK,TK,RO])

  // 5层楼，每层4行
  for (let floor = 0; floor < 5; floor++) {
    const shade = floor % 2 === 0
    // 楼层顶部横梁
    rows.push([WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD])
    // 窗户行1
    rows.push([WS,WF,WI,WI,WF,WS,WF,WI,WI,WF,WS,WF,WI,WI,WF,WS,WF,WI,WI,WF,WS,WF,WI,WF])
    // 窗户行2 + 空调外机
    rows.push([WS,WF,WI,WI,WF,WS,WF,WI,WI,WF,WS,WF,WI,WI,WF,WS,WF,WI,WI,WF,WS,AC,AG,WS])
    // 楼层底部
    rows.push([shade?WN:WL,WL,WL,WL,WL,WL,WL,WL,WL,WL,WL,WL,WL,WL,WL,WL,WL,WL,WL,WL,WL,WL,WL,shade?WN:WL])
  }

  // 底层（车库门）
  rows.push([WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD])
  rows.push([WS,DR,DL,DL,DL,DR,WS,DR,DL,DL,DL,DR,WS,DR,DL,DL,DL,DR,WS,DR,DL,DL,DR,WS])
  rows.push([WS,DR,DL,DL,DL,DR,WS,DR,DL,DL,DL,DR,WS,DR,DL,DL,DL,DR,WS,DR,DL,DL,DR,WS])
  rows.push([WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD])

  return rows
})()

/** 科技园玻璃幕墙写字楼（俯视角）24x28 */
export const OFFICE_TOWER: SpriteData = (() => {
  const WL = '#B8C8D8'  // 幕墙浅色
  const WD = '#8899AA'  // 幕墙深色
  const GL = '#AACCEE'  // 玻璃（亮）
  const GD = '#7799BB'  // 玻璃（暗）
  const GH = '#CCEEFF'  // 玻璃高光
  const FR = '#445566'  // 框架（深）
  const RO = '#667788'  // 屋顶
  const RT = '#889AAA'  // 屋顶高光
  const AC = '#E0E8F0'  // 空调外机
  const AG = '#C0C8D0'  // 空调格栅

  const rows: string[][] = []

  // 屋顶设备层 (3行)
  rows.push([RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO])
  rows.push([RT,RT,AC,AG,AC,RT,RT,RT,RT,RT,RT,RT,RT,RT,RT,RT,RT,AC,AG,AC,RT,RT,RT,RT])
  rows.push([RO,RO,AC,AG,AC,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,RO,AC,AG,AC,RO,RO,RO,RO])

  // 6层玻璃幕墙，每层4行
  for (let floor = 0; floor < 6; floor++) {
    const alt = floor % 2 === 0
    rows.push([FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR])
    rows.push([FR,GL,GH,GL,FR,GL,GH,GL,FR,GL,GH,GL,FR,GL,GH,GL,FR,GL,GH,GL,FR,GL,GH,FR])
    rows.push([FR,alt?GD:GL,GL,alt?GD:GL,FR,alt?GD:GL,GL,alt?GD:GL,FR,alt?GD:GL,GL,alt?GD:GL,FR,alt?GD:GL,GL,alt?GD:GL,FR,alt?GD:GL,GL,alt?GD:GL,FR,alt?GD:GL,GL,FR])
    rows.push([WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD,WD])
  }

  // 底层大堂
  rows.push([FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR,FR])
  rows.push([WL,GL,GH,GH,GL,WL,GL,GH,GH,GL,WL,GL,GH,GH,GL,WL,GL,GH,GH,GL,WL,GL,GH,WL])

  return rows
})()

/** 行道树（圆形树冠，俯视角）16x16 */
export const STREET_TREE: SpriteData = (() => {
  const T1 = '#1A4A0A'  // 树冠最深
  const T2 = '#2A6A18'  // 树冠深
  const T3 = '#3A8A28'  // 树冠中
  const T4 = '#4AA038'  // 树冠亮
  const T5 = '#5AB848'  // 树冠高光
  const T6 = '#6ACC58'  // 树冠最亮高光
  const TR = '#5A3A1A'  // 树干
  const SH = '#1A3A08'  // 阴影

  return [
    [_,  _,  _,  _,  T1, T1, T1, T1, T1, _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  T1, T2, T3, T3, T3, T2, T1, _,  _,  _,  _,  _,  _],
    [_,  _,  T1, T2, T3, T4, T5, T4, T3, T2, T1, _,  _,  _,  _,  _],
    [_,  T1, T2, T3, T4, T5, T6, T5, T4, T3, T2, T1, _,  _,  _,  _],
    [_,  T1, T2, T4, T5, T6, T6, T6, T5, T4, T2, T1, _,  _,  _,  _],
    [T1, T2, T3, T4, T6, T6, T6, T6, T6, T4, T3, T2, T1, _,  _,  _],
    [T1, T2, T3, T4, T5, T6, T6, T6, T5, T4, T3, T2, T1, _,  _,  _],
    [T1, T2, T3, T4, T4, T5, T5, T5, T4, T4, T3, T2, T1, _,  _,  _],
    [_,  T1, T2, T3, T4, T4, T4, T4, T4, T3, T2, T1, _,  _,  _,  _],
    [_,  T1, T2, T3, T3, T3, T3, T3, T3, T3, T2, T1, _,  _,  _,  _],
    [_,  _,  T1, T2, T2, SH, SH, SH, T2, T2, T1, _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  TR, TR, _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  TR, TR, _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  TR, TR, _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
  ]
})()

/** 灌木丛（不规则绿色团块）12x8 */
export const BUSH_CLUSTER: SpriteData = (() => {
  const B1 = '#1A4A0A'
  const B2 = '#2A6A18'
  const B3 = '#3A8028'
  const B4 = '#4A9838'
  const B5 = '#5AAA48'
  return [
    [_,  B1, B2, B3, B2, B1, _,  B1, B2, B3, B1, _],
    [B1, B2, B3, B4, B5, B3, B2, B2, B3, B4, B2, B1],
    [B2, B3, B4, B5, B5, B4, B3, B3, B4, B5, B3, B2],
    [B2, B3, B4, B5, B4, B4, B3, B4, B5, B4, B3, B2],
    [B1, B2, B3, B4, B3, B3, B2, B3, B4, B3, B2, B1],
    [_,  B1, B2, B3, B2, B2, B1, B2, B3, B2, B1, _],
    [_,  _,  B1, B2, B1, B1, _,  B1, B2, B1, _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
  ]
})()

/** 停放的小轿车（俯视角）14x8 */
export const PARKED_CAR_WHITE: SpriteData = (() => {
  const CB = '#E8E8E8'  // 车身（白）
  const CS = '#C8C8C8'  // 车身阴影
  const CD = '#A8A8A8'  // 车身深色
  const CW = '#888888'  // 车窗（深灰）
  const CG = '#666666'  // 车窗深
  const CT = '#444444'  // 轮胎
  const CH = '#F8F8F8'  // 车顶高光
  const CR = '#FF4444'  // 尾灯（红）
  const CF = '#FFFF88'  // 前灯（黄）
  return [
    [_,  CT, CT, CD, CD, CD, CD, CD, CD, CD, CD, CT, CT, _],
    [CT, CD, CS, CB, CB, CB, CB, CB, CB, CB, CB, CS, CD, CT],
    [CT, CS, CB, CW, CG, CW, CH, CH, CW, CG, CW, CB, CS, CT],
    [CT, CS, CB, CW, CG, CW, CH, CH, CW, CG, CW, CB, CS, CT],
    [CT, CS, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CS, CT],
    [CT, CD, CS, CF, CB, CB, CB, CB, CB, CB, CR, CS, CD, CT],
    [_,  CT, CT, CD, CD, CD, CD, CD, CD, CD, CD, CT, CT, _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
  ]
})()

/** 停放的小轿车（深色款）14x8 */
export const PARKED_CAR_DARK: SpriteData = (() => {
  const CB = '#484848'
  const CS = '#383838'
  const CD = '#282828'
  const CW = '#5A7A9A'
  const CG = '#3A5A7A'
  const CT = '#1A1A1A'
  const CH = '#6A8AAA'
  const CR = '#FF4444'
  const CF = '#FFFF88'
  return [
    [_,  CT, CT, CD, CD, CD, CD, CD, CD, CD, CD, CT, CT, _],
    [CT, CD, CS, CB, CB, CB, CB, CB, CB, CB, CB, CS, CD, CT],
    [CT, CS, CB, CW, CG, CW, CH, CH, CW, CG, CW, CB, CS, CT],
    [CT, CS, CB, CW, CG, CW, CH, CH, CW, CG, CW, CB, CS, CT],
    [CT, CS, CB, CB, CB, CB, CB, CB, CB, CB, CB, CB, CS, CT],
    [CT, CD, CS, CF, CB, CB, CB, CB, CB, CB, CR, CS, CD, CT],
    [_,  CT, CT, CD, CD, CD, CD, CD, CD, CD, CD, CT, CT, _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
  ]
})()

/** 绿色护栏（水平，8x4）*/
export const GREEN_FENCE_H: SpriteData = [
  ['#1A4A10','#1A4A10','#1A4A10','#1A4A10','#1A4A10','#1A4A10','#1A4A10','#1A4A10'],
  ['#2A6A20','#1A4A10','#2A6A20','#1A4A10','#2A6A20','#1A4A10','#2A6A20','#1A4A10'],
  ['#2A6A20','#1A4A10','#2A6A20','#1A4A10','#2A6A20','#1A4A10','#2A6A20','#1A4A10'],
  ['#1A4A10','#1A4A10','#1A4A10','#1A4A10','#1A4A10','#1A4A10','#1A4A10','#1A4A10'],
]

/** 路灯（8x18）*/
export const STREET_LAMP: SpriteData = [
  [_,  _,  _,  '#AAAAAA','#AAAAAA',_,  _,  _],
  [_,  _,  '#AAAAAA','#FFEE88','#FFEE88','#AAAAAA',_,  _],
  [_,  _,  '#AAAAAA','#FFEE88','#FFEE88','#AAAAAA',_,  _],
  [_,  _,  _,  '#888888','#888888',_,  _,  _],
  [_,  _,  _,  _,  '#777777',_,  _,  _],
  [_,  _,  _,  _,  '#777777',_,  _,  _],
  [_,  _,  _,  _,  '#777777',_,  _,  _],
  [_,  _,  _,  _,  '#777777',_,  _,  _],
  [_,  _,  _,  _,  '#777777',_,  _,  _],
  [_,  _,  _,  _,  '#777777',_,  _,  _],
  [_,  _,  _,  _,  '#777777',_,  _,  _],
  [_,  _,  _,  _,  '#777777',_,  _,  _],
  [_,  _,  _,  _,  '#777777',_,  _,  _],
  [_,  _,  _,  _,  '#777777',_,  _,  _],
  [_,  _,  '#666666','#666666','#666666','#666666',_,  _],
  [_,  '#666666','#666666','#666666','#666666','#666666','#666666',_],
  [_,  _,  _,  _,  _,  _,  _,  _],
  [_,  _,  _,  _,  _,  _,  _,  _],
]

/** 垃圾桶（蓝色，6x8）*/
export const TRASH_BIN: SpriteData = [
  [_,  '#1A4A9A','#2A5AAA','#2A5AAA','#1A4A9A',_],
  ['#1A4A9A','#3A6ABB','#4A7ACC','#4A7ACC','#3A6ABB','#1A4A9A'],
  ['#2A5AAA','#4A7ACC','#5A8ADD','#5A8ADD','#4A7ACC','#2A5AAA'],
  ['#2A5AAA','#4A7ACC','#5A8ADD','#5A8ADD','#4A7ACC','#2A5AAA'],
  ['#2A5AAA','#4A7ACC','#5A8ADD','#5A8ADD','#4A7ACC','#2A5AAA'],
  ['#2A5AAA','#3A6ABB','#4A7ACC','#4A7ACC','#3A6ABB','#2A5AAA'],
  [_,  '#1A4A9A','#2A5AAA','#2A5AAA','#1A4A9A',_],
  [_,  _,  _,  _,  _,  _],
]

/** 便利店（16x14）*/
export const CONVENIENCE_STORE: SpriteData = (() => {
  const WL = '#EEEEEE'
  const WD = '#CCCCCC'
  const RC = '#EE3333'
  const YL = '#FFEE44'
  const GL = '#88CCFF'
  const GD = '#5599CC'
  const DR = '#444444'
  return [
    [_,  RC, RC, RC, RC, RC, RC, RC, RC, RC, RC, RC, RC, RC, RC, _],
    [RC, RC, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, RC, RC],
    [RC, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, RC],
    [RC, RC, RC, RC, RC, RC, RC, RC, RC, RC, RC, RC, RC, RC, RC, RC],
    [WL, WL, WL, WL, WL, WL, WL, WL, WL, WL, WL, WL, WL, WL, WL, WL],
    [WL, WD, GL, GL, GD, WD, WL, WL, WL, WL, WD, GL, GL, GD, WD, WL],
    [WL, WD, GL, GL, GD, WD, WL, WL, WL, WL, WD, GL, GL, GD, WD, WL],
    [WL, WD, GL, GL, GD, WD, WL, WL, WL, WL, WD, GL, GL, GD, WD, WL],
    [WL, WL, WL, WL, WL, WL, WL, WL, WL, WL, WL, WL, WL, WL, WL, WL],
    [WL, WD, GL, GL, GD, WD, WL, WL, WL, WL, WD, GL, GL, GD, WD, WL],
    [WL, WD, GL, GL, GD, WD, WL, WL, WL, WL, WD, GL, GL, GD, WD, WL],
    [WL, WL, WL, WL, WL, WL, DR, DR, DR, DR, WL, WL, WL, WL, WL, WL],
    [WL, WL, WL, WL, WL, WL, DR, DR, DR, DR, WL, WL, WL, WL, WL, WL],
    [WD, WD, WD, WD, WD, WD, WD, WD, WD, WD, WD, WD, WD, WD, WD, WD],
  ]
})()

/** 地铁站入口（20x12）*/
export const METRO_ENTRANCE: SpriteData = (() => {
  const BC = '#1144AA'
  const BL = '#2255CC'
  const WC = '#AABBDD'
  const YL = '#FFDD00'
  const DD = '#0A2255'
  return [
    [_,  _,  BC, BC, BC, BC, BC, BC, BC, BC, BC, BC, BC, BC, BC, BC, BC, BC, _,  _],
    [_,  BC, BC, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, BC, BC, _],
    [_,  BC, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, BC, _],
    [_,  BC, BC, BC, BC, BC, BC, BC, BC, BC, BC, BC, BC, BC, BC, BC, BC, BC, BC, _],
    [BC, BC, BL, BL, BL, BL, BL, BL, BL, BL, BL, BL, BL, BL, BL, BL, BL, BL, BC, BC],
    [BC, BL, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, BL, BC],
    [BC, BL, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, BL, BC],
    [BC, BL, WC, WC, DD, DD, DD, DD, DD, DD, DD, DD, DD, DD, DD, DD, WC, WC, BL, BC],
    [BC, BL, WC, WC, DD, DD, DD, DD, DD, DD, DD, DD, DD, DD, DD, DD, WC, WC, BL, BC],
    [BC, BC, BL, BL, BL, BL, BL, BL, BL, BL, BL, BL, BL, BL, BL, BL, BL, BL, BC, BC],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
  ]
})()

/** 华强北电子大厦招牌（32x10）*/
export const HUAQIANG_SIGN: SpriteData = (() => {
  const RC = '#EE1111', YL = '#FFEE00', WC = '#FFFFFF', DD = '#222222'
  return [
    [DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD],
    [DD,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,DD],
    [DD,RC,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,RC,DD],
    [DD,RC,YL,WC,WC,YL,WC,WC,WC,YL,WC,YL,WC,YL,YL,WC,YL,YL,WC,WC,WC,YL,WC,YL,WC,YL,YL,WC,YL,YL,RC,DD],
    [DD,RC,YL,WC,WC,YL,WC,YL,WC,YL,WC,YL,WC,YL,YL,WC,YL,YL,WC,YL,YL,YL,WC,YL,WC,YL,YL,WC,YL,YL,RC,DD],
    [DD,RC,YL,WC,WC,YL,WC,WC,WC,YL,WC,YL,WC,YL,YL,WC,YL,YL,WC,WC,YL,YL,WC,YL,WC,YL,YL,WC,YL,YL,RC,DD],
    [DD,RC,YL,WC,WC,YL,WC,YL,YL,YL,WC,YL,WC,YL,YL,WC,YL,YL,WC,YL,YL,YL,WC,YL,WC,YL,YL,WC,YL,YL,RC,DD],
    [DD,RC,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,YL,RC,DD],
    [DD,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,DD],
    [DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD,DD],
  ]
})()

/** 老街红灯笼（6x12）*/
export const RED_LANTERN: SpriteData = [
  [_,  _,  '#CC2200','#CC2200',_,  _],
  [_,  '#CC2200','#FF4400','#FF4400','#CC2200',_],
  ['#CC2200','#FF4400','#FF6600','#FF6600','#FF4400','#CC2200'],
  ['#CC2200','#FF4400','#FF6600','#FF6600','#FF4400','#CC2200'],
  ['#CC2200','#FF4400','#FF6600','#FF6600','#FF4400','#CC2200'],
  ['#CC2200','#FF4400','#FF6600','#FF6600','#FF4400','#CC2200'],
  ['#CC2200','#FF4400','#FF6600','#FF6600','#FF4400','#CC2200'],
  [_,  '#CC2200','#FF4400','#FF4400','#CC2200',_],
  [_,  _,  '#AA1100','#AA1100',_,  _],
  [_,  _,  '#FFDD00','#FFDD00',_,  _],
  [_,  _,  '#FFDD00','#FFDD00',_,  _],
  [_,  _,  _,  _,  _,  _],
]

/** 公园大树（12x16）*/
export const PARK_TREE: SpriteData = (() => {
  const T1 = '#1A4A08', T2 = '#2A6A14', T3 = '#3A8A24', T4 = '#4AA034', T5 = '#5AB844', T6 = '#6ACC54'
  const TR = '#5A3A1A', SH = '#142A06'
  return [
    [_,  _,  _,  _,  T1, T1, T1, T1, _,  _,  _,  _],
    [_,  _,  _,  T1, T2, T3, T3, T2, T1, _,  _,  _],
    [_,  _,  T1, T2, T3, T4, T5, T4, T3, T2, T1, _],
    [_,  T1, T2, T3, T4, T5, T6, T5, T4, T3, T2, T1],
    [_,  T1, T2, T4, T5, T6, T6, T6, T5, T4, T2, T1],
    [T1, T2, T3, T4, T6, T6, T6, T6, T6, T4, T3, T2],
    [T1, T2, T3, T4, T5, T6, T6, T6, T5, T4, T3, T2],
    [T1, T2, T3, T4, T4, T5, T5, T5, T4, T4, T3, T2],
    [_,  T1, T2, T3, T4, T4, T4, T4, T4, T3, T2, T1],
    [_,  T1, T2, T3, T3, SH, SH, T3, T3, T3, T2, T1],
    [_,  _,  T1, T2, T2, SH, SH, T2, T2, T1, _,  _],
    [_,  _,  _,  _,  TR, TR, TR, TR, _,  _,  _,  _],
    [_,  _,  _,  _,  TR, TR, TR, TR, _,  _,  _,  _],
    [_,  _,  _,  _,  TR, TR, TR, TR, _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
  ]
})()

/** 深圳湾海滨栈道（24x8）*/
export const BOARDWALK: SpriteData = (() => {
  const WD = '#8B6914', WL = '#A07820', RC = '#CC8833', BL = '#1A3A6A', WV = '#2A5A9A'
  return [
    [WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL],
    [WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD],
    [RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC],
    [WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL],
    [WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD,WL,WD],
    [RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC,RC],
    [BL,WV,BL,WV,BL,WV,BL,WV,BL,WV,BL,WV,BL,WV,BL,WV,BL,WV,BL,WV,BL,WV,BL,WV],
    [BL,BL,WV,BL,BL,WV,BL,BL,WV,BL,BL,WV,BL,BL,WV,BL,BL,WV,BL,BL,WV,BL,BL,WV],
  ]
})()

/** 公园凉亭（20x14）*/
export const PAVILION: SpriteData = (() => {
  const RC = '#CC4422', DD = '#8B2200', YL = '#FFDD88', GC = '#446644', WC = '#CCAA66'
  return [
    [_,  _,  _,  _,  RC, RC, RC, RC, RC, RC, RC, RC, RC, RC, RC, RC, _,  _,  _,  _],
    [_,  _,  _,  RC, RC, DD, DD, DD, DD, DD, DD, DD, DD, DD, DD, RC, RC, _,  _,  _],
    [_,  _,  RC, DD, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, DD, RC, _,  _],
    [_,  RC, DD, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, YL, DD, RC, _],
    [RC, DD, DD, DD, DD, DD, DD, DD, DD, DD, DD, DD, DD, DD, DD, DD, DD, DD, DD, RC],
    [WC, GC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, GC, WC],
    [WC, GC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, GC, WC],
    [WC, GC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, GC, WC],
    [WC, GC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, GC, WC],
    [WC, GC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, GC, WC],
    [WC, GC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, GC, WC],
    [WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC, WC],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
    [_,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],
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
  walkableRowStart: number
}

export const SCENE_CONFIGS: Record<string, SceneConfig> = {
  '宝安城中村': {
    name: '宝安城中村',
    cols: 24, rows: 18,
    tilemap: VILLAGE_MAP,
    ambientColor: '#FF9F43',
    lightColor: '#FFAA55',
    walkableRowStart: 12,
    objects: [
      // 两栋握手楼
      { sprite: VILLAGE_BUILDING, col: 0, row: 0 },
      { sprite: VILLAGE_BUILDING, col: 13, row: 0 },
      // 行道树（沿人行道密集排列）
      { sprite: STREET_TREE, col: 0, row: 11 },
      { sprite: STREET_TREE, col: 3, row: 11 },
      { sprite: STREET_TREE, col: 6, row: 11 },
      { sprite: STREET_TREE, col: 9, row: 11 },
      { sprite: STREET_TREE, col: 12, row: 11 },
      { sprite: STREET_TREE, col: 15, row: 11 },
      { sprite: STREET_TREE, col: 18, row: 11 },
      { sprite: STREET_TREE, col: 21, row: 11 },
      // 灌木丛（建筑前绿化）
      { sprite: BUSH_CLUSTER, col: 1, row: 10 },
      { sprite: BUSH_CLUSTER, col: 7, row: 10 },
      { sprite: BUSH_CLUSTER, col: 14, row: 10 },
      { sprite: BUSH_CLUSTER, col: 20, row: 10 },
      // 路灯
      { sprite: STREET_LAMP, col: 4, row: 12 },
      { sprite: STREET_LAMP, col: 19, row: 12 },
      // 便利店
      { sprite: CONVENIENCE_STORE, col: 5, row: 13 },
      // 停放车辆
      { sprite: PARKED_CAR_WHITE, col: 1, row: 14 },
      { sprite: PARKED_CAR_DARK, col: 10, row: 14 },
      { sprite: PARKED_CAR_WHITE, col: 17, row: 14 },
      // 垃圾桶
      { sprite: TRASH_BIN, col: 11, row: 12 },
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
      // 两栋写字楼
      { sprite: OFFICE_TOWER, col: 0, row: 0 },
      { sprite: OFFICE_TOWER, col: 13, row: 0 },
      // 广场绿化带树木
      { sprite: STREET_TREE, col: 1, row: 9 },
      { sprite: STREET_TREE, col: 5, row: 9 },
      { sprite: STREET_TREE, col: 9, row: 9 },
      { sprite: STREET_TREE, col: 13, row: 9 },
      { sprite: STREET_TREE, col: 17, row: 9 },
      { sprite: STREET_TREE, col: 21, row: 9 },
      // 人行道行道树
      { sprite: STREET_TREE, col: 0, row: 10 },
      { sprite: STREET_TREE, col: 4, row: 10 },
      { sprite: STREET_TREE, col: 8, row: 10 },
      { sprite: STREET_TREE, col: 12, row: 10 },
      { sprite: STREET_TREE, col: 16, row: 10 },
      { sprite: STREET_TREE, col: 20, row: 10 },
      // 地铁站
      { sprite: METRO_ENTRANCE, col: 5, row: 14 },
      // 路灯
      { sprite: STREET_LAMP, col: 3, row: 11 },
      { sprite: STREET_LAMP, col: 11, row: 11 },
      { sprite: STREET_LAMP, col: 19, row: 11 },
      // 停放车辆
      { sprite: PARKED_CAR_WHITE, col: 0, row: 12 },
      { sprite: PARKED_CAR_DARK, col: 8, row: 12 },
      { sprite: PARKED_CAR_WHITE, col: 16, row: 12 },
    ],
  },

  '福田CBD': {
    name: '福田CBD',
    cols: 24, rows: 18,
    tilemap: CBD_MAP,
    ambientColor: '#C77DFF',
    lightColor: '#DD99FF',
    walkableRowStart: 11,
    objects: [
      // 三栋高楼
      { sprite: OFFICE_TOWER, col: 0, row: 0 },
      { sprite: OFFICE_TOWER, col: 8, row: 0 },
      { sprite: OFFICE_TOWER, col: 16, row: 0 },
      // 广场树木
      { sprite: STREET_TREE, col: 2, row: 8 },
      { sprite: STREET_TREE, col: 7, row: 8 },
      { sprite: STREET_TREE, col: 12, row: 8 },
      { sprite: STREET_TREE, col: 17, row: 8 },
      { sprite: STREET_TREE, col: 22, row: 8 },
      // 绿化带
      { sprite: BUSH_CLUSTER, col: 0, row: 10 },
      { sprite: BUSH_CLUSTER, col: 6, row: 10 },
      { sprite: BUSH_CLUSTER, col: 12, row: 10 },
      { sprite: BUSH_CLUSTER, col: 18, row: 10 },
      // 地铁站
      { sprite: METRO_ENTRANCE, col: 3, row: 15 },
      // 路灯
      { sprite: STREET_LAMP, col: 6, row: 11 },
      { sprite: STREET_LAMP, col: 14, row: 11 },
      // 停放车辆
      { sprite: PARKED_CAR_DARK, col: 0, row: 13 },
      { sprite: PARKED_CAR_WHITE, col: 9, row: 13 },
      { sprite: PARKED_CAR_DARK, col: 18, row: 13 },
    ],
  },

  '华强北': {
    name: '华强北',
    cols: 24, rows: 18,
    tilemap: HUAQIANG_MAP,
    ambientColor: '#00F5FF',
    lightColor: '#44FFFF',
    walkableRowStart: 10,
    objects: [
      // 商场建筑
      { sprite: OFFICE_TOWER, col: 0, row: 0 },
      { sprite: OFFICE_TOWER, col: 13, row: 0 },
      // 华强北招牌
      { sprite: HUAQIANG_SIGN, col: 0, row: 5 },
      // 人行道行道树
      { sprite: STREET_TREE, col: 1, row: 10 },
      { sprite: STREET_TREE, col: 5, row: 10 },
      { sprite: STREET_TREE, col: 9, row: 10 },
      { sprite: STREET_TREE, col: 13, row: 10 },
      { sprite: STREET_TREE, col: 17, row: 10 },
      { sprite: STREET_TREE, col: 21, row: 10 },
      // 路灯
      { sprite: STREET_LAMP, col: 3, row: 11 },
      { sprite: STREET_LAMP, col: 19, row: 11 },
      // 便利店
      { sprite: CONVENIENCE_STORE, col: 6, row: 15 },
      // 停放车辆
      { sprite: PARKED_CAR_WHITE, col: 0, row: 12 },
      { sprite: PARKED_CAR_DARK, col: 10, row: 12 },
      { sprite: PARKED_CAR_WHITE, col: 18, row: 12 },
      // 垃圾桶
      { sprite: TRASH_BIN, col: 22, row: 10 },
    ],
  },

  '东门老街': {
    name: '东门老街',
    cols: 24, rows: 18,
    tilemap: DONGMEN_MAP,
    ambientColor: '#FF6B6B',
    lightColor: '#FF8888',
    walkableRowStart: 9,
    objects: [
      // 老街建筑
      { sprite: VILLAGE_BUILDING, col: 0, row: 0 },
      { sprite: VILLAGE_BUILDING, col: 13, row: 0 },
      // 红灯笼串（悬挂在建筑之间）
      { sprite: RED_LANTERN, col: 5, row: 5 },
      { sprite: RED_LANTERN, col: 8, row: 5 },
      { sprite: RED_LANTERN, col: 11, row: 5 },
      { sprite: RED_LANTERN, col: 14, row: 5 },
      { sprite: RED_LANTERN, col: 17, row: 5 },
      // 行道树
      { sprite: STREET_TREE, col: 0, row: 9 },
      { sprite: STREET_TREE, col: 4, row: 9 },
      { sprite: STREET_TREE, col: 8, row: 9 },
      { sprite: STREET_TREE, col: 12, row: 9 },
      { sprite: STREET_TREE, col: 16, row: 9 },
      { sprite: STREET_TREE, col: 20, row: 9 },
      // 路灯
      { sprite: STREET_LAMP, col: 6, row: 11 },
      { sprite: STREET_LAMP, col: 18, row: 11 },
      // 便利店
      { sprite: CONVENIENCE_STORE, col: 3, row: 15 },
      // 停放车辆
      { sprite: PARKED_CAR_WHITE, col: 1, row: 12 },
      { sprite: PARKED_CAR_DARK, col: 14, row: 12 },
      // 垃圾桶
      { sprite: TRASH_BIN, col: 10, row: 10 },
    ],
  },

  '南山公寓': {
    name: '南山公寓',
    cols: 24, rows: 18,
    tilemap: APARTMENT_MAP,
    ambientColor: '#6BCB77',
    lightColor: '#88DD88',
    walkableRowStart: 10,
    objects: [
      // 公寓楼
      { sprite: VILLAGE_BUILDING, col: 0, row: 0 },
      { sprite: VILLAGE_BUILDING, col: 13, row: 0 },
      // 绿化带（公寓前）
      { sprite: BUSH_CLUSTER, col: 0, row: 8 },
      { sprite: BUSH_CLUSTER, col: 4, row: 8 },
      { sprite: BUSH_CLUSTER, col: 8, row: 8 },
      { sprite: BUSH_CLUSTER, col: 12, row: 8 },
      { sprite: BUSH_CLUSTER, col: 16, row: 8 },
      { sprite: BUSH_CLUSTER, col: 20, row: 8 },
      // 行道树
      { sprite: STREET_TREE, col: 1, row: 9 },
      { sprite: STREET_TREE, col: 6, row: 9 },
      { sprite: STREET_TREE, col: 11, row: 9 },
      { sprite: STREET_TREE, col: 16, row: 9 },
      { sprite: STREET_TREE, col: 21, row: 9 },
      // 路灯
      { sprite: STREET_LAMP, col: 8, row: 10 },
      { sprite: STREET_LAMP, col: 20, row: 10 },
      // 便利店
      { sprite: CONVENIENCE_STORE, col: 17, row: 15 },
      // 停放车辆
      { sprite: PARKED_CAR_WHITE, col: 0, row: 12 },
      { sprite: PARKED_CAR_DARK, col: 7, row: 12 },
      { sprite: PARKED_CAR_WHITE, col: 15, row: 12 },
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
      // 大量公园树木（密集）
      { sprite: PARK_TREE, col: 0, row: 0 },
      { sprite: PARK_TREE, col: 3, row: 1 },
      { sprite: PARK_TREE, col: 7, row: 0 },
      { sprite: PARK_TREE, col: 11, row: 1 },
      { sprite: PARK_TREE, col: 15, row: 0 },
      { sprite: PARK_TREE, col: 19, row: 1 },
      { sprite: PARK_TREE, col: 22, row: 0 },
      { sprite: PARK_TREE, col: 1, row: 3 },
      { sprite: PARK_TREE, col: 5, row: 4 },
      { sprite: PARK_TREE, col: 9, row: 3 },
      { sprite: PARK_TREE, col: 13, row: 4 },
      { sprite: PARK_TREE, col: 17, row: 3 },
      { sprite: PARK_TREE, col: 21, row: 4 },
      // 灌木丛（路边）
      { sprite: BUSH_CLUSTER, col: 0, row: 6 },
      { sprite: BUSH_CLUSTER, col: 6, row: 6 },
      { sprite: BUSH_CLUSTER, col: 12, row: 6 },
      { sprite: BUSH_CLUSTER, col: 18, row: 6 },
      // 凉亭
      { sprite: PAVILION, col: 2, row: 7 },
      // 海滨栈道
      { sprite: BOARDWALK, col: 0, row: 10 },
      // 路灯
      { sprite: STREET_LAMP, col: 7, row: 9 },
      { sprite: STREET_LAMP, col: 15, row: 9 },
      // 公园树木（栈道旁）
      { sprite: PARK_TREE, col: 0, row: 9 },
      { sprite: PARK_TREE, col: 20, row: 9 },
    ],
  },
}
