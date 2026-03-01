/**
 * Buildings3D — textured BoxGeometry buildings sized to their tile footprint.
 *
 * Each building occupies a specific number of tiles (tileW × tileH).
 * The box width/depth matches the footprint exactly (with a small margin).
 * `scale` only affects height, never the footprint.
 */

import * as THREE from 'three'
import type { SceneObject } from '../sceneTiles'
import { TILE_SIZE }        from './ThreeScene'
import { isFurnitureKey }   from './StreetFurniture3D'

// ── Building base height table ───────────────────────────────────────
const MODEL_META: Record<string, { h: number; color: string }> = {
  office_tower:       { h: 6.0, color: '#4488BB' },
  office_tower_v1:    { h: 5.5, color: '#44AA88' },
  office_tower_v2:    { h: 7.0, color: '#8899BB' },
  cbd_building:       { h: 4.5, color: '#336699' },
  cbd_building_v1:    { h: 4.0, color: '#667788' },
  cbd_building_v2:    { h: 5.0, color: '#AA9955' },
  apartment_block:    { h: 3.0, color: '#AA9977' },
  apartment_block_v1: { h: 2.6, color: '#88AABB' },
  apartment_block_v2: { h: 2.8, color: '#CC8877' },
  shop_building:      { h: 1.5, color: '#CCAA66' },
  shop_building_v1:   { h: 1.3, color: '#CC7744' },
  shop_building_v2:   { h: 1.4, color: '#EEEEEE' },
  village_building:   { h: 2.5, color: '#888877' },
  village_building_v1:{ h: 2.2, color: '#AA7744' },
  village_building_v2:{ h: 2.3, color: '#668866' },
  palm_tree:          { h: 2.0, color: '#226611' },
  street_tree:        { h: 1.5, color: '#336622' },
  metro_entrance:     { h: 0.8, color: '#114499' },
  fountain:           { h: 0.5, color: '#4488CC' },
}

const DEFAULT_META = { h: 2.0, color: '#666677' }

// ── Texture loading ──────────────────────────────────────────────────
const texLoader = new THREE.TextureLoader()
const texCache  = new Map<string, THREE.Texture>()

function loadTex(url: string): THREE.Texture {
  if (texCache.has(url)) return texCache.get(url)!
  const tex = texLoader.load(url)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  texCache.set(url, tex)
  return tex
}

function getBuildingTextures(key: string) {
  const base = `/sprites/buildings/textures/${key}`
  return {
    facade: loadTex(`${base}_facade.png`),
    roof:   loadTex(`${base}_roof.png`),
  }
}

// ── Seeded random ────────────────────────────────────────────────────
let _seed = 1
function sr(): number {
  _seed = (_seed * 16807 + 0) % 2147483647
  return (_seed - 1) / 2147483646
}

// ── Build a single building sized to its tile footprint ──────────────

const MARGIN = 0.12  // gap between building edge and tile boundary

function buildTexturedBox(
  key: string,
  heightScale: number,
  tileW: number,
  tileH: number,
): THREE.Object3D {
  const meta  = MODEL_META[key] ?? DEFAULT_META
  const color = new THREE.Color(meta.color)

  // Footprint: exactly tileW × tileH tiles, minus margin
  const width  = tileW * TILE_SIZE - MARGIN * 2
  const depth  = tileH * TILE_SIZE - MARGIN * 2

  // Height: base height × heightScale with slight random variation
  const hv     = 0.85 + sr() * 0.3
  const height = meta.h * heightScale * hv

  const { facade, roof } = getBuildingTextures(key)

  const facadeMat = new THREE.MeshLambertMaterial({ map: facade })
  const roofMat   = new THREE.MeshLambertMaterial({ map: roof })
  const bottomMat = new THREE.MeshLambertMaterial({ color: 0x222222 })

  const materials = [
    facadeMat, facadeMat,   // +x, -x
    roofMat,   bottomMat,   // +y, -y
    facadeMat, facadeMat,   // +z, -z
  ]

  const obj = new THREE.Object3D()

  // Main body
  const geom = new THREE.BoxGeometry(width, height, depth)
  const mesh = new THREE.Mesh(geom, materials)
  mesh.castShadow    = false
  mesh.receiveShadow = false
  mesh.position.y    = height / 2
  obj.add(mesh)

  // Stepped setback for tall buildings
  if (meta.h >= 4.0 && sr() > 0.4) {
    const setbackH = height * (0.12 + sr() * 0.18)
    const setbackW = width * 0.65
    const setbackD = depth * 0.65
    const setbackGeom = new THREE.BoxGeometry(setbackW, setbackH, setbackD)
    const setbackMat = new THREE.MeshLambertMaterial({ color: color.clone().multiplyScalar(0.9) })
    const setback = new THREE.Mesh(setbackGeom, [
      setbackMat, setbackMat,
      roofMat, setbackMat,
      setbackMat, setbackMat,
    ])
    setback.castShadow = true
    setback.position.y = height + setbackH / 2
    obj.add(setback)
  }

  // Rooftop antenna for some tall buildings
  if (meta.h >= 3.5 && sr() > 0.55) {
    const antennaH = height * (0.08 + sr() * 0.12)
    const antennaGeom = new THREE.CylinderGeometry(0.02, 0.04, antennaH, 4)
    const antennaMat = new THREE.MeshLambertMaterial({ color: 0x888888 })
    const antenna = new THREE.Mesh(antennaGeom, antennaMat)
    antenna.castShadow = true
    antenna.position.y = height + antennaH / 2
    antenna.position.x = (sr() - 0.5) * width * 0.2
    antenna.position.z = (sr() - 0.5) * depth * 0.2
    obj.add(antenna)
  }

  return obj
}

// ── Public API ────────────────────────────────────────────────────────

export interface Buildings3DHandle {
  group:   THREE.Group
  dispose: () => void
}

export async function buildBuildings3D(objects: SceneObject[]): Promise<Buildings3DHandle> {
  const group = new THREE.Group()
  _seed = 12345

  objects.forEach(obj => {
    const key = obj.pngKey ?? ''
    if (!key) return
    if (isFurnitureKey(key)) return

    const heightScale = obj.scale ?? 1
    const tileW = obj.tileW ?? 2
    const tileH = obj.tileH ?? 2

    // Position: top-left corner of the cluster + half the footprint
    const posX = (obj.col + tileW / 2) * TILE_SIZE
    const posZ = (obj.row + tileH / 2) * TILE_SIZE

    const instance = buildTexturedBox(key, heightScale, tileW, tileH)
    instance.position.x = posX
    instance.position.z = posZ
    group.add(instance)
  })

  function dispose() {
    group.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach(m => {
          if (m.map) m.map.dispose()
          m.dispose()
        })
      }
    })
    texCache.clear()
  }

  return { group, dispose }
}

export function preloadBuildings(keys: string[]): void {
  keys.forEach(k => getBuildingTextures(k))
}
