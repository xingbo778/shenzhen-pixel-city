/**
 * 深圳像素城市 - 场景瓦片系统
 * 移植 pixel-agents 的 SpriteData 点阵风格
 * 每个地点有独立的建筑精灵和地面颜色
 */

import type { SpriteData } from './spriteSystem'

// ── Floor Tile Colors ────────────────────────────────────────────

export const FLOOR_COLORS = {
  concrete:   '#2A2A3A',  // 水泥地
  grass:      '#1A3A1A',  // 草地
  wood:       '#3A2A1A',  // 木地板
  tile_white: '#3A3A4A',  // 白瓷砖
  tile_dark:  '#1A1A2A',  // 深色瓷砖
  sand:       '#3A3020',  // 沙地
  water:      '#0A1A3A',  // 水面
  road:       '#252530',  // 道路
}

// ── Building Sprites (pixel-agents 风格点阵) ─────────────────────

const _ = ''

/** 高层写字楼 (24x32) - 南山科技园 / 福田CBD */
export const OFFICE_TOWER: SpriteData = (() => {
  const W = '#8899BB'  // 玻璃幕墙
  const L = '#AABBDD'  // 反光
  const D = '#445566'  // 暗面
  const F = '#334455'  // 框架
  const G = '#CCDDFF'  // 发光窗
  const rows: string[][] = []
  // 顶部天线
  rows.push([_,_,_,_,_,_,_,_,_,_,_,F,F,_,_,_,_,_,_,_,_,_,_,_])
  rows.push([_,_,_,_,_,_,_,_,_,_,_,F,F,_,_,_,_,_,_,_,_,_,_,_])
  // 顶层
  rows.push([_,_,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,_,_])
  rows.push([_,_,F,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,F,_,_])
  rows.push([_,_,F,G,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,G,F,_,_])
  // 主体楼层（重复）
  for (let floor = 0; floor < 5; floor++) {
    rows.push([_,F,F,D,W,W,D,W,W,D,W,W,D,W,W,D,W,W,D,W,W,D,F,_])
    rows.push([_,F,D,W,G,W,W,G,W,W,G,W,W,G,W,W,G,W,W,G,W,W,F,_])
    rows.push([_,F,D,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,F,_])
    rows.push([_,F,D,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,F,_])
  }
  // 底部入口
  rows.push([_,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,_])
  rows.push([_,F,D,D,D,D,D,D,G,G,G,G,G,G,G,G,D,D,D,D,D,D,F,_])
  rows.push([_,F,D,D,D,D,D,D,G,G,G,G,G,G,G,G,D,D,D,D,D,D,F,_])
  rows.push([_,_,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,_,_])
  return rows
})()

/** 城中村握手楼 (20x28) - 宝安城中村 */
export const VILLAGE_BUILDING: SpriteData = (() => {
  const W = '#8B7355'  // 旧墙
  const D = '#6B5335'  // 暗墙
  const R = '#AA4422'  // 红砖
  const G = '#AABB88'  // 旧玻璃
  const T = '#CC8844'  // 瓦片
  const rows: string[][] = []
  // 屋顶
  rows.push([_,_,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,_,_])
  rows.push([_,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,_])
  rows.push([T,T,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,T,T])
  // 楼层
  for (let floor = 0; floor < 5; floor++) {
    const isEven = floor % 2 === 0
    rows.push([W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W])
    rows.push([W,D,isEven?G:W,isEven?G:W,W,W,D,isEven?G:W,isEven?G:W,W,W,D,isEven?G:W,isEven?G:W,W,W,D,isEven?G:W,isEven?G:W,W])
    rows.push([W,D,isEven?G:W,isEven?G:W,W,W,D,isEven?G:W,isEven?G:W,W,W,D,isEven?G:W,isEven?G:W,W,W,D,isEven?G:W,isEven?G:W,W])
    rows.push([R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R])
  }
  // 底层
  rows.push([W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W])
  rows.push([W,D,D,D,D,D,D,D,G,G,G,G,G,G,D,D,D,D,D,W])
  rows.push([W,D,D,D,D,D,D,D,G,G,G,G,G,G,D,D,D,D,D,W])
  rows.push([W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W])
  return rows
})()

/** 购物中心 (28x24) - 东门老街 / 华强北 */
export const MALL_BUILDING: SpriteData = (() => {
  const W = '#CC9944'  // 金色外墙
  const D = '#AA7722'  // 暗金
  const R = '#DD4444'  // 红色招牌
  const G = '#88CCFF'  // 玻璃
  const L = '#FFEE88'  // 灯光
  const rows: string[][] = []
  // 顶部招牌
  rows.push([_,_,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,_,_])
  rows.push([_,R,R,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,R,R,_])
  rows.push([_,R,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,R,_])
  rows.push([_,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,_])
  // 主体
  for (let floor = 0; floor < 4; floor++) {
    rows.push([W,W,D,G,G,G,D,G,G,G,D,G,G,G,D,G,G,G,D,G,G,G,D,G,G,G,D,W])
    rows.push([W,D,G,G,L,G,G,G,L,G,G,G,L,G,G,G,L,G,G,G,L,G,G,G,L,G,G,W])
    rows.push([W,D,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,W])
    rows.push([W,W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W,W])
  }
  // 底层入口
  rows.push([W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W])
  rows.push([W,D,D,D,D,D,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,D,D,D,D,D,W])
  rows.push([W,D,D,D,D,D,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,D,D,D,D,D,W])
  rows.push([W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W])
  return rows
})()

/** 公寓楼 (18x26) - 南山公寓 */
export const APARTMENT: SpriteData = (() => {
  const W = '#778899'  // 外墙
  const D = '#556677'  // 暗面
  const G = '#AACCEE'  // 窗户
  const Y = '#FFDD88'  // 亮灯窗
  const R = '#AA3333'  // 屋顶
  const rows: string[][] = []
  rows.push([_,_,R,R,R,R,R,R,R,R,R,R,R,R,R,R,_,_])
  rows.push([_,R,R,D,D,D,D,D,D,D,D,D,D,D,D,R,R,_])
  for (let floor = 0; floor < 6; floor++) {
    const hasLight = Math.random() > 0.4
    rows.push([W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W])
    rows.push([W,D,hasLight?Y:G,hasLight?Y:G,W,W,D,hasLight?Y:G,hasLight?Y:G,W,W,D,hasLight?Y:G,hasLight?Y:G,W,W,D,W])
    rows.push([W,D,hasLight?Y:G,hasLight?Y:G,W,W,D,hasLight?Y:G,hasLight?Y:G,W,W,D,hasLight?Y:G,hasLight?Y:G,W,W,D,W])
    rows.push([W,W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W,W])
  }
  rows.push([W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W])
  rows.push([W,D,D,D,D,D,D,D,G,G,G,G,D,D,D,D,D,W])
  rows.push([W,D,D,D,D,D,D,D,G,G,G,G,D,D,D,D,D,W])
  rows.push([W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W])
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

/** 便利店 (16x16) - 华强北 */
export const CONVENIENCE_STORE: SpriteData = (() => {
  const W = '#DDDDDD'
  const R = '#EE4444'
  const G = '#88CCFF'
  const Y = '#FFEE44'
  const D = '#888888'
  return [
    [_,R,R,R,R,R,R,R,R,R,R,R,R,R,R,_],
    [R,R,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,R,R],
    [R,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,R],
    [R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R],
    [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
    [W,D,G,G,G,D,W,W,W,W,D,G,G,G,D,W],
    [W,D,G,G,G,D,W,W,W,W,D,G,G,G,D,W],
    [W,D,G,G,G,D,W,W,W,W,D,G,G,G,D,W],
    [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
    [W,D,G,G,G,D,W,W,W,W,D,G,G,G,D,W],
    [W,D,G,G,G,D,W,W,W,W,D,G,G,G,D,W],
    [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
    [W,W,W,W,W,W,G,G,G,G,W,W,W,W,W,W],
    [W,W,W,W,W,W,G,G,G,G,W,W,W,W,W,W],
    [D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D],
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  ]
})()

/** 地铁站入口 (20x12) */
export const METRO_ENTRANCE: SpriteData = (() => {
  const B = '#1144AA'
  const L = '#2255CC'
  const W = '#AABBDD'
  const Y = '#FFDD00'
  const D = '#0A2255'
  return [
    [_,_,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,_,_],
    [_,B,B,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,B,B,_],
    [_,B,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,Y,B,_],
    [_,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,B,_],
    [B,B,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,B,B],
    [B,L,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,L,B],
    [B,L,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,L,B],
    [B,L,W,W,D,D,D,D,D,D,D,D,D,D,D,D,W,W,L,B],
    [B,L,W,W,D,D,D,D,D,D,D,D,D,D,D,D,W,W,L,B],
    [B,B,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,B,B],
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
    [_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_,_],
  ]
})()

// ── Scene Layout Config ──────────────────────────────────────────

export interface SceneObject {
  sprite: SpriteData
  col: number  // tile column
  row: number  // tile row
  zY?: number  // z-sort override
}

export interface SceneConfig {
  name: string
  cols: number
  rows: number
  floorColor: string
  floorPattern: 'solid' | 'grid' | 'checker'
  objects: SceneObject[]
  ambientColor: string  // overall tint
  lightColor: string    // accent light
}

export const SCENE_CONFIGS: Record<string, SceneConfig> = {
  '宝安城中村': {
    name: '宝安城中村',
    cols: 20, rows: 16,
    floorColor: FLOOR_COLORS.concrete,
    floorPattern: 'grid',
    ambientColor: '#FF9F43',
    lightColor: '#FFAA55',
    objects: [
      { sprite: VILLAGE_BUILDING, col: 1, row: 0 },
      { sprite: VILLAGE_BUILDING, col: 10, row: 0 },
      { sprite: STREET_LAMP, col: 5, row: 8 },
      { sprite: STREET_LAMP, col: 14, row: 8 },
      { sprite: CONVENIENCE_STORE, col: 4, row: 9 },
    ],
  },
  '南山科技园': {
    name: '南山科技园',
    cols: 20, rows: 16,
    floorColor: FLOOR_COLORS.tile_white,
    floorPattern: 'checker',
    ambientColor: '#4D96FF',
    lightColor: '#88BBFF',
    objects: [
      { sprite: OFFICE_TOWER, col: 0, row: 0 },
      { sprite: OFFICE_TOWER, col: 13, row: 0 },
      { sprite: METRO_ENTRANCE, col: 5, row: 9 },
      { sprite: STREET_LAMP, col: 8, row: 8 },
      { sprite: STREET_LAMP, col: 11, row: 8 },
    ],
  },
  '福田CBD': {
    name: '福田CBD',
    cols: 20, rows: 16,
    floorColor: FLOOR_COLORS.tile_dark,
    floorPattern: 'checker',
    ambientColor: '#C77DFF',
    lightColor: '#DD99FF',
    objects: [
      { sprite: OFFICE_TOWER, col: 0, row: 0 },
      { sprite: OFFICE_TOWER, col: 7, row: 0 },
      { sprite: OFFICE_TOWER, col: 14, row: 0 },
      { sprite: METRO_ENTRANCE, col: 4, row: 10 },
      { sprite: STREET_LAMP, col: 10, row: 8 },
    ],
  },
  '华强北': {
    name: '华强北',
    cols: 20, rows: 16,
    floorColor: FLOOR_COLORS.road,
    floorPattern: 'grid',
    ambientColor: '#00F5FF',
    lightColor: '#44FFFF',
    objects: [
      { sprite: MALL_BUILDING, col: 0, row: 0 },
      { sprite: MALL_BUILDING, col: 12, row: 0 },
      { sprite: CONVENIENCE_STORE, col: 6, row: 9 },
      { sprite: STREET_LAMP, col: 3, row: 8 },
      { sprite: STREET_LAMP, col: 15, row: 8 },
    ],
  },
  '东门老街': {
    name: '东门老街',
    cols: 20, rows: 16,
    floorColor: FLOOR_COLORS.wood,
    floorPattern: 'grid',
    ambientColor: '#FF6B6B',
    lightColor: '#FF8888',
    objects: [
      { sprite: MALL_BUILDING, col: 1, row: 0 },
      { sprite: VILLAGE_BUILDING, col: 13, row: 0 },
      { sprite: CONVENIENCE_STORE, col: 3, row: 9 },
      { sprite: STREET_LAMP, col: 8, row: 8 },
      { sprite: STREET_LAMP, col: 16, row: 8 },
    ],
  },
  '南山公寓': {
    name: '南山公寓',
    cols: 20, rows: 16,
    floorColor: FLOOR_COLORS.concrete,
    floorPattern: 'solid',
    ambientColor: '#6BCB77',
    lightColor: '#88DD88',
    objects: [
      { sprite: APARTMENT, col: 1, row: 0 },
      { sprite: APARTMENT, col: 11, row: 0 },
      { sprite: STREET_LAMP, col: 6, row: 8 },
      { sprite: CONVENIENCE_STORE, col: 14, row: 9 },
    ],
  },
  '深圳湾公园': {
    name: '深圳湾公园',
    cols: 20, rows: 16,
    floorColor: FLOOR_COLORS.grass,
    floorPattern: 'solid',
    ambientColor: '#00F5FF',
    lightColor: '#44FFEE',
    objects: [
      { sprite: PARK_TREE, col: 1, row: 2 },
      { sprite: PARK_TREE, col: 5, row: 1 },
      { sprite: PARK_TREE, col: 9, row: 3 },
      { sprite: PARK_TREE, col: 14, row: 1 },
      { sprite: PARK_TREE, col: 17, row: 2 },
      { sprite: STREET_LAMP, col: 7, row: 9 },
      { sprite: STREET_LAMP, col: 12, row: 9 },
    ],
  },
}
