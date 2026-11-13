/**
 * Measured Mars terrain for the Relive engine (no three.js here: the flight models use it too).
 *
 * One planet-attached terrain per landing site, from the SAME site packages the Unity player draws
 * (frontend/public/mars-sites/<pkg>/, built by scripts/mars/*.py from USGS controlled HiRISE / CTX DTMs and MGS MOLA):
 *   tile     the HiRISE DTM (Victoria: 2 m; landing sites: 1 m read every 4th post)  — the ground under the hardware
 *   horizon  ~24 m posts out to ~9 km
 *   far      200-250 m posts out to 30-50 km
 * Coordinates are the package frame: metres east / north of the site origin, `up` along the origin's vertical, with the
 * sphere's curvature included — so a point is SITE·R + e·east + n·north + u·up on the planet (planet-centred frames) or
 * (east, up, −north) in a site-local frame. This is how the replay and the expedition flights stand on real terrain
 * that continues into the globe, instead of an illustrative plane or a bare sphere.
 */
export interface TerrainLayer {
  name: 'tile' | 'horizon' | 'far'
  w: number
  h: number
  se: number
  sn: number
  e0: number
  n0: number
  up: Float32Array
  /** ground image for this layer (same extent as the grid), or null */
  tex: string | null
  /** how the pipeline cut this layer out under the finer ones (far.json / horizon.json `cutout`) */
  cutout: string
}
export interface TerrainPkg { id: string; layers: TerrainLayer[]; halfM: number; loaded: boolean; failed?: boolean; /** the package origin (°N, °E) */ origin: [number, number] | null }

const pkgs = new Map<string, TerrainPkg>()
const R_MOON_M = 1737.4e3

/**
 * The Moon's measured terrain (the same files the lunar surface view walks on, frontend/public/assets/terrain/):
 * the LROC NAC DTM (2 m, read every 4th post) and the LOLA horizon (250 m, ±24 km), both in the site's local frame
 * (x east, z south, metres relative to the LM). Here they get the sphere's curvature (a drop of (x² + z²) / 2R) so they
 * sit on the globe, and the horizon is cut out under the DTM (the underlay then keeps it continuous beneath it).
 */
async function moonLayers(site: string): Promise<{ layers: TerrainLayer[]; origin: [number, number] | null }> {
  const get = async (json: string) => {
    try {
      const [m, b] = await Promise.all([fetch(json).then((r) => (r.ok ? r.json() : null)), fetch(json.replace(/\.json$/, '.bin')).then((r) => (r.ok ? r.arrayBuffer() : null))])
      return m && b ? { m, q: new Uint16Array(b) } : null
    } catch { return null }
  }
  const [dtm, hz] = await Promise.all([get(`/assets/terrain/${site}.json`), get(`/assets/terrain/${site}.horizon.json`)])
  const layers: TerrainLayer[] = []
  const drop = (x: number, z: number) => (x * x + z * z) / (2 * R_MOON_M)
  if (dtm) {
    const m = dtm.m, st = 4
    const W = m.width, H = m.height, w = Math.floor((W - 1) / st) + 1, h = Math.floor((H - 1) / st) + 1
    const up = new Float32Array(w * h)
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const v = dtm.q[r * st * W + c * st]
      const x = m.x0 + c * st * m.cellM, z = m.z0 + r * st * m.cellM
      up[r * w + c] = v === 0 ? NaN : m.hMin + ((v - 1) / 65534) * (m.hMax - m.hMin) - m.lmHeightDtm - drop(x, z)
    }
    // rows run south: the north edge (first row) is at z0 -> north = -z0
    layers.push({ name: 'tile', w, h, se: m.cellM * st, sn: m.cellM * st, e0: m.x0, n0: -m.z0, up, tex: null, cutout: '' })
  }
  if (hz) {
    const m = hz.m, W = m.width, H = m.height
    const up = new Float32Array(W * H)
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const x = m.x0 + c * m.cellM, z = m.z0 + r * m.cellM
      up[r * W + c] = m.hMin + (hz.q[r * W + c] / 65535) * (m.hMax - m.hMin) - drop(x, z)
    }
    const L: TerrainLayer = { name: 'far', w: W, h: H, se: m.cellM, sn: m.cellM, e0: m.x0, n0: -m.z0, up, tex: null, cutout: 'lunar horizon: cut under the DTM' }
    // cut out under the DTM (more than one horizon cell inside its data), so the two never fight
    const T = layers[0]
    if (T) for (let r = 1; r < H - 1; r++) for (let c = 1; c < W - 1; c++) {
      let all = true
      for (const [dr, dc] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const e = L.e0 + (c + dc) * L.se, n = L.n0 - (r + dr) * L.sn
        if (!Number.isFinite(sampleLayer(T, e, n))) { all = false; break }
      }
      if (all) up[r * W + c] = NaN
    }
    layers.push(L)
  }
  return { layers, origin: dtm ? [dtm.m.lmLat, dtm.m.lmLon] : null }
}
const listeners = new Set<() => void>()
export const onTerrain = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f) } }
const BASE = '/mars-sites/'

async function layer(id: string, name: TerrainLayer['name'], json: string, bin: string, tex: string | null, stride = 1): Promise<TerrainLayer | null> {
  try {
    const [m, b] = await Promise.all([fetch(BASE + id + '/' + json).then((r) => (r.ok ? r.json() : null)), fetch(BASE + id + '/' + bin).then((r) => (r.ok ? r.arrayBuffer() : null))])
    if (!m || !b) return null
    const q = new Uint16Array(b)
    const W = m.width, H = m.height
    const w = Math.floor((W - 1) / stride) + 1, h = Math.floor((H - 1) / stride) + 1
    const up = new Float32Array(w * h)
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const v = q[r * stride * W + c * stride]
      up[r * w + c] = v === 65535 ? NaN : m.upMinM + v * m.quantStepM
    }
    const se = m.spacingM[0] * stride, sn = (m.spacingM[1] ?? m.spacingM[0]) * stride
    return { name, w, h, se, sn, e0: m.gridEastOfOriginM, n0: m.gridNorthOfOriginM, up, tex: tex ? BASE + id + '/' + tex : null, cutout: String(m.cutout ?? '') }
  } catch {
    return null
  }
}

/** start loading a package (idempotent); returns what is loaded so far */
export function terrainPkg(id: string | undefined | null): TerrainPkg | null {
  if (!id) return null
  const have = pkgs.get(id)
  if (have) return have
  const p: TerrainPkg = { id, layers: [], halfM: 0, loaded: false, origin: null }
  pkgs.set(id, p)
  if (typeof fetch === 'undefined' || typeof window === 'undefined') { p.failed = true; return p }
  if (id.startsWith('moon:')) {
    moonLayers(id.slice(5)).then(({ layers, origin }) => {
      p.layers = layers
      underlay(p.layers)
      p.origin = origin
      const far = p.layers.find((l) => l.name === 'far') ?? p.layers[p.layers.length - 1]
      p.halfM = far ? Math.min(-far.e0, far.n0) : 0
      p.loaded = true
      p.failed = p.layers.length === 0
      listeners.forEach((f) => f())
    })
    return p
  }
  const victoria = id === 'victoria'
  Promise.all([
    victoria ? layer(id, 'tile', 'tile2m.json', 'tile2m.bin', 'tile_albedo.jpg') : layer(id, 'tile', 'terrain.json', 'height.bin', 'albedo.jpg', 4),
    layer(id, 'horizon', 'horizon.json', 'horizon.bin', victoria ? 'horizon_albedo.jpg' : 'far_albedo.jpg'),
    layer(id, 'far', 'far.json', 'far.bin', 'far_albedo.jpg'),
    fetch(BASE + id + '/' + (victoria ? 'surroundings.json' : 'terrain.json')).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]).then(([t, hz, fr, meta]) => {
    const o = meta ? (meta as { origin?: number[]; originLatLon?: number[] }).origin ?? (meta as { originLatLon?: number[] }).originLatLon : null
    p.origin = o ? [o[0], o[1]] : null
    p.layers = [t, hz, fr].filter((x): x is TerrainLayer => !!x)
    underlay(p.layers)
    const far = p.layers.find((l) => l.name === 'far') ?? p.layers[p.layers.length - 1]
    p.halfM = far ? Math.min(-far.e0, far.n0) : 0
    p.loaded = true
    p.failed = p.layers.length === 0
    listeners.forEach((f) => f())
  })
  return p
}

/** the terrain meshes are built with at most this many posts per side (larger layers are drawn every s-th post) */
export const MAX_GRID = 1000
/** the post stride a layer is DRAWN at (scene/marsSurface.tsx layerGeometry) */
export const layerStride = (L: TerrainLayer) => Math.max(1, Math.ceil(Math.max(L.w, L.h) / MAX_GRID))

/** bilinear sample of a layer's full-resolution posts (used to build the layers, not to stand things on them) */
function sampleLayer(L: TerrainLayer, east: number, north: number): number {
  const fc = (east - L.e0) / L.se, fr = (L.n0 - north) / L.sn
  const c = Math.floor(fc), r = Math.floor(fr)
  if (c < 0 || r < 0 || c >= L.w - 1 || r >= L.h - 1) return NaN
  const a = L.up[r * L.w + c], b = L.up[r * L.w + c + 1], d = L.up[(r + 1) * L.w + c], e = L.up[(r + 1) * L.w + c + 1]
  const tc = fc - c, tr = fr - r
  return (a * (1 - tc) + b * tc) * (1 - tr) + (d * (1 - tc) + e * tc) * tr
}

/**
 * Height of the DRAWN surface of a layer: the same posts (every layerStride-th), the same triangles (diagonal b–d:
 * a-d-b and b-d-e) as the mesh. groundUp used to sample the full-resolution posts bilinearly, while the 24 m ring and the
 * far ring are drawn as triangles between their posts and large layers every 2nd–4th post: the rover stood up to
 * metres above or below the ground it was drawn on (shadows detached from the wheels; parts of it under the terrain).
 */
function sampleDrawn(L: TerrainLayer, east: number, north: number): number {
  const s = layerStride(L)
  const w = Math.floor((L.w - 1) / s) + 1, h = Math.floor((L.h - 1) / s) + 1
  const fc = (east - L.e0) / L.se / s, fr = (L.n0 - north) / L.sn / s
  const c = Math.floor(fc), r = Math.floor(fr)
  if (c < 0 || r < 0 || c >= w - 1 || r >= h - 1) return NaN
  const at = (cc: number, rr: number) => L.up[rr * s * L.w + cc * s]
  const ha = at(c, r), hb = at(c + 1, r), hd = at(c, r + 1), he = at(c + 1, r + 1)
  if (!Number.isFinite(ha) || !Number.isFinite(hb) || !Number.isFinite(hd) || !Number.isFinite(he)) return NaN // the mesh drops that cell
  const tc = fc - c, tr = fr - r
  return tc + tr <= 1 ? ha + (hb - ha) * tc + (hd - ha) * tr : he + (hd - he) * (1 - tc) + (hb - he) * (1 - tr)
}

/**
 * Make each coarser layer continuous UNDER the finer ones (a browser mesh drops every triangle with a missing corner,
 * which opened a one-cell gap along every layer boundary — the sky showed through as dark ribbons):
 *  - a node the pipeline cut out because a finer layer covers it takes the finer layer's height, 1 m (24 m ring) or
 *    3 m (far ring) lower — hidden beneath it, never seen;
 *  - the landing-site far rings (build_far.py) were lowered by up to 25 m next to the finer layers so the Unity mesher's
 *    coarse facets cannot poke through them; this renderer does not need that, and inside the HiRISE strip's gaps it
 *    showed as a trench, so that documented drop (25 m, fading over 4 far posts beyond the first) is added back.
 * Nodes no layer covers stay missing (true gaps in the data).
 */
function underlay(layers: TerrainLayer[]) {
  for (let i = 1; i < layers.length; i++) {
    const L = layers[i], finer = layers.slice(0, i)
    const fineAt = (e: number, n: number) => { for (const F of finer) { const v = sampleLayer(F, e, n); if (Number.isFinite(v)) return v } return NaN }
    const fine = new Uint8Array(L.w * L.h)
    for (let r = 0; r < L.h; r++) for (let c = 0; c < L.w; c++) {
      const e = L.e0 + c * L.se, n = L.n0 - r * L.sn
      const v = fineAt(e, n)
      if (Number.isFinite(v)) fine[r * L.w + c] = 1
    }
    // the documented 25 m drop of build_far.py, added back (only for rings built that way)
    if (L.name === 'far' && /25 m/.test(L.cutout)) {
      const D = new Float32Array(L.w * L.h).fill(1e9)
      for (let k = 0; k < D.length; k++) if (fine[k]) D[k] = 0
      // two-pass chamfer distance (in posts), as distance_transform_edt approximately
      const a = 1, b = Math.SQRT2
      for (let r = 0; r < L.h; r++) for (let c = 0; c < L.w; c++) {
        const k = r * L.w + c
        if (c > 0) D[k] = Math.min(D[k], D[k - 1] + a)
        if (r > 0) { D[k] = Math.min(D[k], D[k - L.w] + a); if (c > 0) D[k] = Math.min(D[k], D[k - L.w - 1] + b); if (c < L.w - 1) D[k] = Math.min(D[k], D[k - L.w + 1] + b) }
      }
      for (let r = L.h - 1; r >= 0; r--) for (let c = L.w - 1; c >= 0; c--) {
        const k = r * L.w + c
        if (c < L.w - 1) D[k] = Math.min(D[k], D[k + 1] + a)
        if (r < L.h - 1) { D[k] = Math.min(D[k], D[k + L.w] + a); if (c < L.w - 1) D[k] = Math.min(D[k], D[k + L.w + 1] + b); if (c > 0) D[k] = Math.min(D[k], D[k + L.w - 1] + b) }
      }
      for (let k = 0; k < D.length; k++) if (!fine[k] && Number.isFinite(L.up[k])) L.up[k] += Math.min(1, Math.max(0, 1 - (D[k] - 1) / 4)) * 25
    }
    const below = L.name === 'far' ? 3 : 1
    for (let r = 0; r < L.h; r++) for (let c = 0; c < L.w; c++) {
      const k = r * L.w + c
      if (Number.isFinite(L.up[k]) || !fine[k]) continue
      L.up[k] = fineAt(L.e0 + c * L.se, L.n0 - r * L.sn) - below
    }
    // slivers: where a finer layer's bilinear sample is just undefined at its own edge, a node bordering data takes
    // the mean of its valid neighbours (3 passes reach only 1-2 posts; true gaps in the data stay open)
    for (let pass = 0; pass < 3; pass++) {
      const fill: [number, number][] = []
      for (let r = 1; r < L.h - 1; r++) for (let c = 1; c < L.w - 1; c++) {
        const k = r * L.w + c
        if (Number.isFinite(L.up[k])) continue
        let sum = 0, cnt = 0
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const v = L.up[k + dr * L.w + dc]; if (Number.isFinite(v)) { sum += v; cnt++ } }
        if (cnt >= 3) fill.push([k, sum / cnt - (fine[k] ? below : 0)])
      }
      if (!fill.length) break
      for (const [k, v] of fill) L.up[k] = v
    }
  }
}

/** ground height (package frame `up`, m) at (east, north): the highest DRAWN layer surface there (what is visible); NaN if unknown */
export function groundUp(id: string | undefined | null, east: number, north: number): number {
  const p = id ? pkgs.get(id) ?? terrainPkg(id) : null
  if (!p?.loaded) return NaN
  // the VISIBLE ground where layers overlap is the highest drawn surface (depth test): a coarser product can stand up to a
  // metre or more above a finer one near the edge of its coverage (different instruments and registrations), and a rover
  // put on the finer layer was then under the visible ground
  let best = NaN
  for (const L of p.layers) {
    const v = sampleDrawn(L, east, north)
    if (Number.isFinite(v) && !(v <= best)) best = v
  }
  return best
}

/** the site package of a surface site id (UNITY_SITES ids) */
export const pkgOfSite = (siteId: string): string | null => (siteId === 'victoria-crater' ? 'victoria' : siteId.startsWith('mars-') ? siteId.slice(5) : /^apollo-1[2-7]$/.test(siteId) ? 'moon:' + siteId : null)

// ─────────────────────────────────────────────────────────── Opportunity's route (scripts/mars/build_opportunity_replay.py)
export interface OppRoute {
  anchors: Record<'landing' | 'endurance' | 'final' | 'endeavourCentre' | 'endeavourArrival', { eastM: number; northM: number; how: string; rimRadiusM?: number }>
  victoria: { startSol: number[]; eastM: number[]; northM: number[]; how: string }
}
let route: OppRoute | null = null
let routeLoading = false
/** the replay's data-derived positions (null until loaded; the flight model falls back to the landing anchor) */
export function oppRoute(): OppRoute | null {
  if (route || routeLoading || typeof fetch === 'undefined' || typeof window === 'undefined') return route
  routeLoading = true
  fetch(BASE + 'victoria/opportunity_route.json').then((r) => (r.ok ? r.json() : null)).then((j) => { route = j; listeners.forEach((f) => f()) }).catch(() => {})
  return null
}
/** the landing site in the Victoria package frame, from the same tie (used before the route file has loaded) */
export const OPP_LANDING_EN: [number, number] = [-1523.2138905976713, 6322.488063755625]
