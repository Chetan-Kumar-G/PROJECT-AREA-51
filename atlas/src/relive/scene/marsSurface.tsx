/**
 * The measured Mars terrain in the Relive scene (data: relive/marsSurfaceData.ts) — one system for every Mars view:
 * the Opportunity replay, the expedition flights from Earth, the carrier hop and "Return to orbit".
 *
 *   planet-centred frames ('mars' env): the layers sit ON the sphere at the site (SITE·R + e·east + n·north + u·up);
 *     the globe is opened under the terrain (a disc a little smaller than the far ring) so a crater below the
 *     reference sphere is not buried, and the far ring's outer band is blended radially onto the sphere so terrain
 *     and globe meet without a step. Level of detail: 1 m / 2 m HiRISE → 24 m → 200-250 m → the globe; the layers are
 *     nested cut-outs, so they are drawn together and hand over to the globe at ~2,500 km, where the site is a few
 *     pixels across (no popping, no holes).
 *   site-local frames ('mars-local' env, x east / y up / z south): the same meshes, untransformed.
 * The ground image of each layer is toned to the globe's own colour around the site (a per-channel gain measured from
 * both images), so the terrain does not change colour where it meets the globe.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { live } from './live'
import { R_MARS, R_MOON, enu, v3, type V3 } from '../geo'
import { MAX_GRID, onTerrain, terrainPkg, type TerrainLayer, type TerrainPkg } from '../marsSurfaceData'

const rel = (p: V3): [number, number, number] => { const f = live.frame!.focus; return [p[0] - f[0], p[1] - f[1], p[2] - f[2]] }
/** the globe is opened inside this fraction of the far ring's half-width (the far ring meets the sphere there) */
const HOLE_FRAC = 0.86
const SHOW = { far: 2.5e6 }
const GLOBE_MAP = '/assets/astronomy/textures/mars_albedo_2k.jpg'

/** the hole in each body's globe (set by its surface terrain, read by that globe's shader) */
export const globeHoles = { mars: { dir: new THREE.Vector3(0, 0, 1), cos: { value: 2 } }, moon: { dir: new THREE.Vector3(0, 0, 1), cos: { value: 2 } } }
export const globeHole = globeHoles.mars
/**
 * A disc opened in the measured layers (mesh-local x = east, z = south), where an illustrative surface replaces them:
 * Opportunity's Eagle-crater patch (scene/env.tsx MarsLocal). r = 0: none.
 */
export const surfaceHole = { c: new THREE.Vector2(0, 0), r: { value: 0 } }

/**
 * The measured layers' material: the surface hole, and an ILLUSTRATIVE fine grain near the camera (procedural, a few
 * per cent of brightness at 1-2 m scale, gone by ~400 m) so the ground under a rover has texture at the scale of its
 * wheels; the 24 m and 200 m posts have no detail of their own at that scale (the colour stays the measured / globe map).
 */
function patchLayerMaterial(mat: THREE.MeshStandardMaterial) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uSurfHoleC = { value: surfaceHole.c }
    sh.uniforms.uSurfHoleR = surfaceHole.r
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vLocalXZ;\nvarying float vViewDist;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocalXZ = position.xz;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvViewDist = -mvPosition.z;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', GRAIN_COMMON)
      .replace('void main() {', 'void main() {\n  if (uSurfHoleR > 0.0 && distance(vLocalXZ, uSurfHoleC) < uSurfHoleR) discard;')
      .replace('#include <map_fragment>', GRAIN_APPLY)
  }
  mat.customProgramCacheKey = () => 'mars-layer'
}
const GRAIN_COMMON = [
  '#include <common>',
  'varying vec2 vLocalXZ;',
  'varying float vViewDist;',
  'uniform vec2 uSurfHoleC;',
  'uniform float uSurfHoleR;',
  'float gHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
  'float gNoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);',
  '  return mix(mix(gHash(i), gHash(i + vec2(1.0, 0.0)), u.x), mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), u.x), u.y); }',
].join('\n')
const GRAIN_APPLY = [
  '#include <map_fragment>',
  '  float gFade = 1.0 - smoothstep(60.0, 400.0, vViewDist);',
  '  if (gFade > 0.0) {',
  '    float gv = gNoise(vLocalXZ * 0.9) * 0.6 + gNoise(vLocalXZ * 3.1) * 0.4;',
  '    diffuseColor.rgb *= mix(1.0, 0.86 + 0.28 * gv, gFade);',
  '  }',
].join('\n')
const GLOBE_MAPS = { mars: '/assets/astronomy/textures/mars_albedo_2k.jpg', moon: '/assets/astronomy/textures/moon_albedo_2k.jpg' }

/**
 * The texture coordinates of the GLOBE's own map (SphereGeometry convention: u = atan2(z, −x)/2π, v = 1 − acos(y)/π in
 * the Mars-fixed frame, which llUnit shares), for a package point: the far ring (and the landing sites' 24 m ring, which
 * has no image of its own) is coloured exactly like the globe where they meet; its relief is the measured terrain.
 */
function globeUv(origin: [number, number], east: number, north: number, up: number, R = R_MARS): [number, number] {
  const D = Math.PI / 180, la = origin[0] * D, lo = origin[1] * D
  const U: V3 = [Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)]
  const { e, n } = enu(U)
  const p = v3.add(v3.add(v3.mul(U, R + up), v3.mul(e, east)), v3.mul(n, north))
  const d = v3.norm(p)
  let u = Math.atan2(d[2], -d[0]) / (2 * Math.PI)
  if (u < 0) u += 1
  return [u, 1 - Math.acos(Math.max(-1, Math.min(1, d[1]))) / Math.PI]
}

function layerGeometry(L: TerrainLayer, feather: number, globeOrigin: [number, number] | null, R = R_MARS): THREE.BufferGeometry {
  const stride = Math.max(1, Math.ceil(Math.max(L.w, L.h) / MAX_GRID))
  const w = Math.floor((L.w - 1) / stride) + 1, h = Math.floor((L.h - 1) / stride) + 1
  const pos = new Float32Array(w * h * 3), uv = new Float32Array(w * h * 2)
  const ok = new Uint8Array(w * h)
  const half = Math.min(-L.e0, L.n0)
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
    const R0 = r * stride, C0 = c * stride
    const e = L.e0 + C0 * L.se, n = L.n0 - R0 * L.sn
    let u = L.up[R0 * L.w + C0]
    const k = r * w + c
    if (Number.isFinite(u)) {
      ok[k] = 1
      if (feather > 0) {
        // the outer band of the far ring is laid onto the reference sphere: radially, from 0.70 of the half-width to the
        // edge of the globe's opening (HOLE_FRAC), where the globe takes over; beyond it (the corners) it IS the sphere
        const d = Math.hypot(e, n) / half
        const f = Math.min(1, Math.max(0, (d - 0.7) / (HOLE_FRAC - 0.7)))
        const sphere = Math.sqrt(Math.max(0, R * R - e * e - n * n)) - R
        u = u * (1 - f * f * (3 - 2 * f)) + sphere * (f * f * (3 - 2 * f))
      }
    }
    pos[k * 3] = e; pos[k * 3 + 1] = Number.isFinite(u) ? u : 0; pos[k * 3 + 2] = -n
    if (globeOrigin) { const g = globeUv(globeOrigin, e, n, Number.isFinite(u) ? u : 0, R); uv[k * 2] = g[0]; uv[k * 2 + 1] = g[1] }
    else { uv[k * 2] = C0 / (L.w - 1); uv[k * 2 + 1] = 1 - R0 / (L.h - 1) }
  }
  const idx: number[] = []
  for (let r = 0; r < h - 1; r++) for (let c = 0; c < w - 1; c++) {
    const a = r * w + c, b = a + 1, d = a + w, e = d + 1
    if (ok[a] && ok[b] && ok[d] && ok[e]) idx.push(a, d, b, b, d, e)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}

/** mean colour of an image (or of a lat/lon window of the equirectangular globe map) */
async function meanColour(url: string, win?: { lat: number; lon: number; halfDeg: number }): Promise<[number, number, number] | null> {
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = url
    await img.decode()
    const c = document.createElement('canvas')
    let sx = 0, sy = 0, sw = img.width, sh = img.height
    if (win) {
      const x = (((win.lon + 540) % 360) / 360) * img.width, y = ((90 - win.lat) / 180) * img.height
      const hw = Math.max(2, (win.halfDeg / 360) * img.width), hh = Math.max(2, (win.halfDeg / 180) * img.height)
      sx = Math.max(0, x - hw); sy = Math.max(0, y - hh); sw = Math.min(img.width - sx, 2 * hw); sh = Math.min(img.height - sy, 2 * hh)
    }
    c.width = 64; c.height = 64
    const g = c.getContext('2d')!
    g.drawImage(img, sx, sy, sw, sh, 0, 0, 64, 64)
    const d = g.getImageData(0, 0, 64, 64).data
    let r = 0, gg = 0, b = 0
    for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2] }
    const n = d.length / 4
    // sRGB means are compared as they are displayed (both maps are sRGB)
    return [r / n / 255, gg / n / 255, b / n / 255]
  } catch {
    return null
  }
}

interface Built { pkg: string; meshes: { name: TerrainLayer['name']; mesh: THREE.Mesh }[] }

export function MarsSurface({ planet, body = 'mars' }: { planet: boolean; body?: 'mars' | 'moon' }) {
  const R = body === 'moon' ? R_MOON : R_MARS
  const GLOBE = GLOBE_MAPS[body]
  const hole = globeHoles[body]
  const { camera } = useThree()
  const [ver, setVer] = useState(0)
  const [pkgId, setPkgId] = useState<string | null>(() => live.frame?.site?.pkg ?? null)
  useEffect(() => onTerrain(() => setVer((v) => v + 1)), [])
  const group = useRef<THREE.Group>(null!)
  const built = useMemo<Built | null>(() => {
    const p: TerrainPkg | null = terrainPkg(pkgId)
    if (!p?.loaded || !p.layers.length) return null
    const loader = new THREE.TextureLoader()
    const meshes = p.layers.map((L, i) => {
      // the far ring, and the 24 m ring of the landing sites (no image of its own), use the globe's map: same colour
      // (the Moon's layers have no image of their own: the globe's map, the relief does the rest)
      const useGlobe = !!p.origin && (L.name === 'far' || (L.name === 'horizon' && p.id !== 'victoria') || p.id.startsWith('moon:'))
      const geo = layerGeometry(L, planet && L.name === 'far' ? 1 : 0, useGlobe ? p.origin : null, R)
      const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.97, metalness: 0, polygonOffset: true, polygonOffsetFactor: i * 1.5, polygonOffsetUnits: i * 2 })
      mat.userData.globe = useGlobe
      patchLayerMaterial(mat)
      const src = useGlobe ? GLOBE : L.tex
      if (src) loader.load(src, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; mat.map = t; mat.needsUpdate = true })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.receiveShadow = true
      mesh.frustumCulled = false
      mesh.renderOrder = 2 - i
      return { name: L.name, mesh }
    })
    return { pkg: p.id, meshes }
  }, [pkgId, ver, planet]) // eslint-disable-line react-hooks/exhaustive-deps

  // colour: each layer with its own ground image is toned to the globe's mean colour around the site (both images
  // measured); layers that use the globe's map need no correction
  useEffect(() => {
    if (!built) return
    let alive = true
    const p = terrainPkg(built.pkg)
    if (!p?.origin) return
    const ll = { lat: p.origin[0], lon: p.origin[1] }
    const half = Math.max(0.2, ((p.halfM || 30000) / R_MARS) * (180 / Math.PI))
    meanColour(GLOBE, { ...ll, halfDeg: half }).then(async (g) => {
      if (!alive || !g) return
      for (const m of built.meshes) {
        const mat = m.mesh.material as THREE.MeshStandardMaterial
        const L = p.layers.find((l) => l.name === m.name)
        if (mat.userData.globe || !L?.tex) continue
        const f = await meanColour(L.tex)
        if (!alive || !f) return
        const gain = [g[0] / Math.max(0.02, f[0]), g[1] / Math.max(0.02, f[1]), g[2] / Math.max(0.02, f[2])].map((x) => Math.min(2, Math.max(0.4, x)))
        mat.color.setRGB(gain[0], gain[1], gain[2])
      }
    })
    return () => { alive = false }
  }, [built])

  useEffect(() => () => { built?.meshes.forEach((m) => { m.mesh.geometry.dispose(); (m.mesh.material as THREE.Material).dispose() }) }, [built])

  useFrame(() => {
    const f = live.frame
    const want = f?.site?.kind === body ? f.site.pkg ?? null : null
    if (want !== pkgId) setPkgId(want)
    const g = group.current
    if (!g) return
    if (!f || !f.site || !built || built.pkg !== want) { g.visible = false; if (planet) hole.cos.value = 2; return }
    g.visible = true
    let camDist: number
    if (planet) {
      const s = f.site
      g.position.set(...rel(s.pos))
      const { e, n, u } = enu(s.up as V3)
      const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...e), new THREE.Vector3(...u), new THREE.Vector3(...v3.mul(n, -1)))
      g.quaternion.setFromRotationMatrix(m)
      // camera distance from the site (for the level of detail)
      const cw = new THREE.Vector3(...live.camEye).sub(new THREE.Vector3(...rel(s.pos)))
      camDist = cw.length()
      const half = terrainPkg(built.pkg)?.halfM ?? 0
      const showFar = camDist < SHOW.far
      if (showFar && half > 0) {
        hole.dir.set(...(s.up as V3)).normalize()
        hole.cos.value = Math.cos((half * HOLE_FRAC) / R)
      } else hole.cos.value = 2
    } else {
      g.position.set(...rel([0, 0, 0]))
      g.quaternion.identity()
      camDist = new THREE.Vector3(...live.camEye).add(new THREE.Vector3(...rel([0, 0, 0]))).length()
    }
    // every coarser layer is cut out under the finer ones, so they are shown together (no holes, no popping); the whole
    // terrain hands over to the globe beyond SHOW.far, where it is a few pixels across
    const on = !planet || camDist < SHOW.far
    for (const m of built.meshes) m.mesh.visible = on
  })

  void camera
  if (!built) return <group ref={group} />
  return (
    <group ref={group}>
      {built.meshes.map((m) => <primitive key={m.name} object={m.mesh} />)}
    </group>
  )
}

/** the Mars globe's material gets the hole (discard inside the cap's disc), nothing else changes */
export function patchGlobeHole(mat: THREE.MeshStandardMaterial, body: 'mars' | 'moon' = 'mars') {
  const hole = globeHoles[body]
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uHoleDir = { value: hole.dir }
    sh.uniforms.uHoleCos = hole.cos
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObjDir;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjDir = normalize(position);')
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vObjDir;\nuniform vec3 uHoleDir;\nuniform float uHoleCos;').replace('void main() {', 'void main() {\n  if (dot(normalize(vObjDir), uHoleDir) > uHoleCos) discard;')
  }
  mat.customProgramCacheKey = () => body + '-globe-hole'
}
