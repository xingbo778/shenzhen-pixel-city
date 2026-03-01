/**
 * TileGrid3D — builds a flat ground mesh from the tilemap.
 *
 * Each tile type gets a distinct canvas-painted texture so the ground
 * looks like the existing 2D tile renderer, but lies in 3D space.
 * For performance all tiles of the same type share the same material,
 * and we use InstancedMesh per tile type.
 */

import * as THREE from 'three'
import type { TileType } from '../sceneTiles'
import { TILE_COLORS }   from '../sceneTiles'
import { TILE_SIZE }     from './ThreeScene'

// ── Texture cache ─────────────────────────────────────────────────────
const TEX_CACHE = new Map<TileType, THREE.CanvasTexture>()

function paintTileCanvas(type: TileType): HTMLCanvasElement {
  const S  = 64
  const c  = document.createElement('canvas')
  c.width  = S
  c.height = S
  const ctx = c.getContext('2d')!
  const col = TILE_COLORS[type]

  ctx.fillStyle = col.base
  ctx.fillRect(0, 0, S, S)

  if (col.detail) {
    // Fine noise
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = col.detail
      const px = Math.floor(Math.random() * S)
      const py = Math.floor(Math.random() * S)
      const pw = 1 + Math.floor(Math.random() * 2)
      ctx.fillRect(px, py, pw, 1)
    }
  }

  if (col.line) {
    ctx.strokeStyle = col.line
    ctx.lineWidth   = 0.5

    if (type === 'road_h') {
      // Centre dashed yellow line
      ctx.strokeStyle = col.line
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(0,  S / 2); ctx.lineTo(S, S / 2)
      ctx.stroke()
      ctx.setLineDash([])
      // White edge lines
      ctx.strokeStyle = col.line2 ?? '#ffffff'
      ctx.lineWidth   = 0.75
      ctx.beginPath()
      ctx.moveTo(0, 3);     ctx.lineTo(S, 3)
      ctx.moveTo(0, S - 3); ctx.lineTo(S, S - 3)
      ctx.stroke()
    } else if (type === 'road_v') {
      ctx.strokeStyle = col.line
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(S / 2, 0); ctx.lineTo(S / 2, S)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.strokeStyle = col.line2 ?? '#ffffff'
      ctx.lineWidth   = 0.75
      ctx.beginPath()
      ctx.moveTo(3, 0);     ctx.lineTo(3, S)
      ctx.moveTo(S - 3, 0); ctx.lineTo(S - 3, S)
      ctx.stroke()
    } else if (type === 'road_cross') {
      ctx.strokeStyle = col.line
      ctx.lineWidth   = 0.75
      ctx.setLineDash([3, 5])
      ctx.beginPath()
      ctx.moveTo(0,  S / 2); ctx.lineTo(S, S / 2)
      ctx.moveTo(S / 2, 0); ctx.lineTo(S / 2, S)
      ctx.stroke()
      ctx.setLineDash([])
    } else if (type === 'sidewalk' || type === 'sidewalk_edge') {
      ctx.strokeStyle = col.line
      ctx.lineWidth   = 0.5
      ctx.beginPath()
      for (let x = 8; x < S; x += 8) {
        ctx.moveTo(x, 0); ctx.lineTo(x, S)
      }
      ctx.stroke()
    } else if (type === 'grass' || type === 'grass_lush') {
      for (let i = 0; i < 20; i++) {
        const bx = Math.random() * S
        const by = Math.random() * S
        ctx.strokeStyle = col.line
        ctx.lineWidth   = 0.5
        ctx.beginPath()
        ctx.moveTo(bx, by + 2)
        ctx.lineTo(bx - 1, by - 2)
        ctx.moveTo(bx, by + 2)
        ctx.lineTo(bx + 1, by - 2)
        ctx.stroke()
      }
    } else if (type === 'tile_plaza') {
      ctx.strokeStyle = col.line
      ctx.lineWidth   = 0.5
      for (let x = 0; x < S; x += 8) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, S); ctx.stroke()
      }
      for (let y = 0; y < S; y += 8) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke()
      }
    } else if (type === 'water' || type === 'water_edge') {
      ctx.strokeStyle = col.line
      ctx.lineWidth   = 0.5
      ctx.setLineDash([4, 3])
      for (let y = 4; y < S; y += 10) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke()
      }
      ctx.setLineDash([])
    }
  }

  return c
}

function getTileTexture(type: TileType): THREE.CanvasTexture {
  if (TEX_CACHE.has(type)) return TEX_CACHE.get(type)!
  const canvas  = paintTileCanvas(type)
  const tex     = new THREE.CanvasTexture(canvas)
  tex.wrapS     = THREE.RepeatWrapping
  tex.wrapT     = THREE.RepeatWrapping
  tex.repeat.set(1, 1)
  tex.colorSpace = THREE.SRGBColorSpace
  TEX_CACHE.set(type, tex)
  return tex
}

// ── Public API ────────────────────────────────────────────────────────

export interface TileGrid3DHandle {
  group:   THREE.Group
  dispose: () => void
}

export function buildTileGrid3D(tilemap: TileType[][]): TileGrid3DHandle {
  const group  = new THREE.Group()
  const rows   = tilemap.length
  const cols   = tilemap[0]?.length ?? 0

  // Group tiles by type → InstancedMesh per type
  const typeInstances = new Map<TileType, THREE.Matrix4[]>()
  const geom = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE)
  const rotMat = new THREE.Matrix4().makeRotationX(-Math.PI / 2)

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const type = tilemap[r][c]
      if (!typeInstances.has(type)) typeInstances.set(type, [])
      const m = new THREE.Matrix4()
      m.makeTranslation(
        (c + 0.5) * TILE_SIZE,
        0,
        (r + 0.5) * TILE_SIZE,
      )
      m.multiply(rotMat)
      typeInstances.get(type)!.push(m)
    }
  }

  const allMeshes: THREE.InstancedMesh[] = []

  typeInstances.forEach((matrices, type) => {
    const mat  = new THREE.MeshLambertMaterial({
      map:  getTileTexture(type),
      side: THREE.FrontSide,
    })
    const mesh = new THREE.InstancedMesh(geom, mat, matrices.length)
    mesh.receiveShadow = true
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
    mesh.instanceMatrix.needsUpdate = true
    group.add(mesh)
    allMeshes.push(mesh)
  })

  function dispose() {
    allMeshes.forEach(m => {
      m.dispose()
      ;(m.material as THREE.Material).dispose()
    })
    geom.dispose()
  }

  return { group, dispose }
}
