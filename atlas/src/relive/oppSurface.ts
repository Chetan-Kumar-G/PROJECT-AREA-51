/**
 * Opportunity's surface years (2004–2019) as a SURFACE reconstruction on measured terrain — replacing the orbital
 * overview with a marker. The rover is where the data put it, at each dated milestone of the script:
 *
 *   Eagle crater (landing → March 2004)   traverse origin (WUSTL MERB_traverse_5130), in the Victoria package frame
 *   Endurance crater (July 2004)          centre of the box the sols 94–319 traverse points occupy
 *   Purgatory dune (April–June 2005)      ~2 km south of Endurance (the script's sourced location) — APPROXIMATE
 *   Victoria crater (Sept 2006 – 2008)    the recorded drives, sols 951–1686 (real positions, ~15 m RMS)
 *   Endeavour crater (Aug 2011 →)         rim measured in the CTX/MOLA far ring; arrival spot ILLUSTRATIVE
 *   Perseverance Valley (2017 → 2019)     the last traverse point, sol 5081 (Doppler-registered)
 * Between dated milestones the rover moves in a straight line at constant speed (ILLUSTRATIVE route between them; the
 * Victoria part follows the recorded drives). It stands on the measured ground (marsSurfaceData.groundUp), tilted to
 * its slope and turned along its direction of travel; the lander stays where it landed in Eagle crater.
 * Positions are in the site-local frame of the Victoria package: x east, y up, z south (metres).
 */
import { v3, type V3 } from './geo'
import { groundUp, oppRoute, OPP_LANDING_EN } from './marsSurfaceData'
import { marsHeight } from './craters'

export interface Waypoint { t: number; en: [number, number]; at: string }

const SOL_S = 88775.244
const near = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1])

/** the illustrative Eagle-crater patch around the landing point: drawn out to EAGLE_PATCH_M, its relief fades to zero
 *  between EAGLE_FADE_M and EAGLE_HOLE_M, and the measured layers are opened inside EAGLE_HOLE_M (scene/marsSurface.tsx) */
export const EAGLE_PATCH_M = 58
export const EAGLE_HOLE_M = 56
const EAGLE_FADE_M = 42

/** the illustrative relief of the patch (Eagle crater ~20 m across, PDS; depth and small bowls ILLUSTRATIVE), faded out */
export function eagleRelief(east: number, north: number): number {
  const L = OPP_LANDING_EN
  const d = near([east, north], L)
  if (d >= EAGLE_HOLE_M) return 0
  const k = Math.min(1, Math.max(0, (d - EAGLE_FADE_M) / (EAGLE_HOLE_M - EAGLE_FADE_M)))
  return marsHeight(east - L[0], -(north - L[1])) * (1 - k * k * (3 - 2 * k))
}

/**
 * The ground as DRAWN, in the local frame (y) at (east, north): the measured terrain's drawn surface (groundUp) plus, near
 * the landing site, the illustrative Eagle relief. The patch used to sit at ONE height (the measured height at the
 * landing point) while the measured terrain around it rises and falls by metres over 120 m: where the measured layer was
 * higher it covered the patch, and Opportunity, standing on the patch, was under the visible ground.
 */
export function oppGround(east: number, north: number): number {
  const g = groundUp('victoria', east, north)
  const base = Number.isFinite(g) ? g : (() => { const h = groundUp('victoria', OPP_LANDING_EN[0], OPP_LANDING_EN[1]); return Number.isFinite(h) ? h : 0 })()
  return base + eagleRelief(east, north)
}

/** MER-B wheel contact points about the rover's centre (x across, z along; rover ~1.6 m long, PDS; layout ILLUSTRATIVE) */
const MER_WHEELS: [number, number][] = [[-0.6, 0.7], [-0.6, 0], [-0.6, -0.68], [0.6, 0.7], [0.6, 0], [0.6, -0.68]]

/**
 * Rest the (rigid) rover model on the drawn ground under its six wheels: the plane that best fits the ground heights at
 * the wheels gives its tilt; it is then raised just enough that no wheel is below the ground, so the wheel that carries
 * it touches and the others are within the fit's residual. The model's origin is the bottom of its bounding box (the
 * wheels: NasaModel), so no height offset is added.
 */
export function roverContact(east: number, north: number, dir: [number, number]): { y: number; up: V3; gaps: number[] } {
  const ax: [number, number] = [dir[1], -dir[0]] // across (to the right of travel) in (east, north)
  const pts = MER_WHEELS.map(([x, z]) => { const e = east + ax[0] * x + dir[0] * z, n = north + ax[1] * x + dir[1] * z; return { x, z, h: oppGround(e, n) } })
  // least squares h = a + b x + c z (the wheel layout is symmetric: the normal equations decouple)
  const a0 = pts.reduce((s, p) => s + p.h, 0) / pts.length
  const b = pts.reduce((s, p) => s + p.x * (p.h - a0), 0) / pts.reduce((s, p) => s + p.x * p.x, 0)
  const zm = pts.reduce((s, p) => s + p.z, 0) / pts.length
  const c = pts.reduce((s, p) => s + (p.z - zm) * (p.h - a0), 0) / pts.reduce((s, p) => s + (p.z - zm) * (p.z - zm), 0)
  const a = a0 - c * zm
  const lift = Math.max(...pts.map((p) => p.h - (a + b * p.x + c * p.z)))
  const y = a + lift
  const gaps = pts.map((p) => y + b * p.x + c * p.z - p.h) // >= 0: the wheel's height above the ground under it
  // the plane's normal in the local frame (x east, y up, z south): d/d(across) = b, d/d(along) = c
  const gE = b * ax[0] + c * dir[0], gN = b * ax[1] + c * dir[1]
  return { y, up: v3.norm([-gE, 1, gN]), gaps }
}

let cached: { key: string; wps: Waypoint[] } | null = null
/** the dated waypoints (data-derived where the route file says so), for the script's milestone times */
export function oppWaypoints(ev: (id: string) => number, landingT: number, egressT: number): Waypoint[] {
  const R = oppRoute()
  const key = R ? 'route' : 'none'
  if (cached?.key === key) return cached.wps
  const L = OPP_LANDING_EN
  const lander: [number, number] = [L[0], L[1] + 3.2]
  const wps: Waypoint[] = [
    { t: egressT, en: lander, at: 'Eagle crater: just off the lander (sol 7)' },
    { t: ev('water'), en: [L[0] - 6, L[1] + 4], at: 'Eagle crater outcrop (spot inside the crater ILLUSTRATIVE)' },
    { t: ev('eagle-exit'), en: [L[0] + 12, L[1] - 9], at: 'Eagle crater rim' },
  ]
  if (R) {
    const A = R.anchors
    const end: [number, number] = [A.endurance.eastM, A.endurance.northM]
    wps.push({ t: ev('endurance') - 30 * 86400, en: [end[0] - 75, end[1] + 10], at: 'Endurance crater rim' })
    wps.push({ t: ev('endurance'), en: [end[0] - 40, end[1] + 6], at: 'Inside Endurance crater (centre from the traverse; spot ILLUSTRATIVE)' })
    wps.push({ t: ev('heat-shield-rock'), en: [end[0] + 10, end[1] - 600], at: 'South of Endurance, near the discarded heat shield (spot ILLUSTRATIVE)' })
    wps.push({ t: ev('freed') - 60 * 86400, en: [end[0] + 20, end[1] - 2000], at: 'Purgatory dune, about 2 km south of Endurance (APPROXIMATE)' })
    wps.push({ t: ev('freed'), en: [end[0] + 22, end[1] - 2004], at: 'Purgatory dune (APPROXIMATE)' })
    // Victoria: the recorded drives, one waypoint per drive record
    const V = R.victoria
    const landingMsT = landingT
    for (let i = 0; i < V.startSol.length; i += 1) {
      const t = landingMsT + (V.startSol[i] - 1 + 0.5) * SOL_S
      wps.push({ t, en: [V.eastM[i], V.northM[i]], at: `Victoria crater, recorded drive, sol ${V.startSol[i]}` })
    }
    const arr: [number, number] = [A.endeavourArrival.eastM, A.endeavourArrival.northM]
    const fin: [number, number] = [A.final.eastM, A.final.northM]
    const C: [number, number] = [A.endeavourCentre.eastM, A.endeavourCentre.northM]
    wps.push({ t: ev('endeavour'), en: arr, at: 'Endeavour crater rim (arrival spot ILLUSTRATIVE)' })
    // along the rim from the arrival spot to the last traverse point (ILLUSTRATIVE path between them)
    const a0 = Math.atan2(arr[1] - C[1], arr[0] - C[0]), a1 = Math.atan2(fin[1] - C[1], fin[0] - C[0])
    const r0 = near(arr, C), r1 = near(fin, C)
    const pv = ev('perseverance-valley')
    for (const id of ['lrv-record', 'solander', 'marathon', 'steepest']) {
      const t = ev(id)
      const k = Math.min(1, Math.max(0, (t - ev('endeavour')) / (pv - ev('endeavour'))))
      const a = a0 + (a1 - a0) * k, r = r0 + (r1 - r0) * k
      wps.push({ t, en: [C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r], at: 'Endeavour crater west rim (spot ILLUSTRATIVE)' })
    }
    wps.push({ t: pv, en: fin, at: 'Perseverance Valley: the last traverse point (sol 5081)' })
  }
  wps.sort((a, b) => a.t - b.t)
  cached = { key, wps }
  return wps
}

export function oppPosition(wps: Waypoint[], t: number): { en: [number, number]; at: string; moving: boolean } {
  if (t <= wps[0].t) return { en: wps[0].en, at: wps[0].at, moving: false }
  for (let i = 1; i < wps.length; i++) {
    if (t <= wps[i].t) {
      const a = wps[i - 1], b = wps[i]
      const k = (t - a.t) / Math.max(1, b.t - a.t)
      return { en: [a.en[0] + (b.en[0] - a.en[0]) * k, a.en[1] + (b.en[1] - a.en[1]) * k], at: k < 0.5 ? a.at : b.at, moving: near(a.en, b.en) > 1 }
    }
  }
  const z = wps[wps.length - 1]
  return { en: z.en, at: z.at, moving: false }
}

/** the rover's pose at t: position on the ground (local frame), heading along the travel, tilted to the slope */
export function oppRoverPose(wps: Waypoint[], t: number): { pos: V3; fwd: V3; side: V3; at: string; en: [number, number] } {
  const p = oppPosition(wps, t)
  // heading: from the most recent movement (looking back up to a year for where it came from)
  let dir: [number, number] = [0, -1]
  for (const dt of [2 * 86400, 20 * 86400, 120 * 86400, 365 * 86400]) {
    const q = oppPosition(wps, t - dt).en
    if (near(q, p.en) > 0.5) { const l = near(q, p.en); dir = [(p.en[0] - q[0]) / l, (p.en[1] - q[1]) / l]; break }
  }
  const [e, n] = p.en
  const { y, up } = roverContact(e, n, dir)
  const hdir: V3 = v3.norm(v3.sub([dir[0], 0, -dir[1]], v3.mul(up, v3.dot([dir[0], 0, -dir[1]], up))))
  // the model's front is fwd × side (see the egress frames: fwd up, side east, front toward −z)
  const side = v3.norm(v3.cross(hdir, up))
  return { pos: [e, y, -n], fwd: up, side, at: p.at, en: p.en }
}

// read-only probes for the browser checks (the drawn ground under a point, a rover pose's wheel contact)
if (typeof window !== 'undefined') (window as unknown as { __oppGround?: unknown }).__oppGround = { ground: oppGround, contact: roverContact, relief: eagleRelief }
