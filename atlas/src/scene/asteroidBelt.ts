/**
 * MAIN ASTEROID BELT — selection and orbit propagation (pure; tested in asteroidBelt.test.ts).
 *
 * Data: /assets/astronomy/data/main_belt_sbdb_h13.5.json — real osculating elements of 10,842 asteroids brighter than
 * H 13.5 from the JPL Small-Body Database (fetched by scripts/build_solar_system_assets.py). Rows:
 *   [number, a (AU), e, i (deg), node (deg), argument of perihelion (deg), M (deg) at epochJdTdb, H]
 *
 * Which of them are drawn as "the main belt": the classical main belt between Mars and Jupiter,
 *   2.1 AU ≤ a ≤ 3.3 AU                       (the inner and outer boundaries of the main belt)
 *   q = a(1−e) > Mars's aphelion (≈1.666 AU)  (the JPL definition of a main-belt asteroid: no Mars-crossers)
 *   Q = a(1+e) < Jupiter's perihelion (≈4.95 AU)
 * so every drawn orbit lies entirely outside Mars's orbit and inside Jupiter's. Both planetary limits come from the
 * same JPL Keplerian elements the planets are drawn with (astro/ephemeris.ts), not from hard-coded numbers. The
 * Hilda / Cybele objects beyond 3.3 AU in the file are not drawn (they are not the main belt).
 *
 * Positions are heliocentric ECLIPTIC J2000 coordinates in AU — the frame the planets' elements use — and are placed
 * in the scene by the same ecliptic → galactic → three.js transform as the planets (AsteroidBeltLayer).
 */
import { PLANET_ELEMENTS, solveKepler } from '../astro/ephemeris'

export type AsteroidRow = [number, number, number, number, number, number, number, number]

export const MARS_APHELION_AU = PLANET_ELEMENTS.mars.el.a * (1 + PLANET_ELEMENTS.mars.el.e)
export const JUPITER_PERIHELION_AU = PLANET_ELEMENTS.jupiter.el.a * (1 - PLANET_ELEMENTS.jupiter.el.e)
export const BELT_A_MIN_AU = 2.1
export const BELT_A_MAX_AU = 3.3

const D2R = Math.PI / 180
/** Gaussian year: mean motion n = 2π / (365.2568983 d · a^1.5) */
const YEAR_DAYS = 365.2568983

export function isMainBelt(r: AsteroidRow): boolean {
  const a = r[1], e = r[2]
  return a >= BELT_A_MIN_AU && a <= BELT_A_MAX_AU && a * (1 - e) > MARS_APHELION_AU && a * (1 + e) < JUPITER_PERIHELION_AU
}

/** Orbit constants per asteroid, precomputed once (rotation of the orbit into the ecliptic frame). */
export interface BeltOrbits {
  n: number
  a: Float64Array
  e: Float64Array
  /** P and Q vectors of each orbit (perihelion direction, and 90° ahead in the orbit plane): 3 + 3 per asteroid */
  pq: Float64Array
  M0: Float64Array
  nRadPerDay: Float64Array
  epochJd: number
}

export function prepareOrbits(rows: AsteroidRow[], epochJd: number): BeltOrbits {
  const n = rows.length
  const o: BeltOrbits = { n, a: new Float64Array(n), e: new Float64Array(n), pq: new Float64Array(n * 6), M0: new Float64Array(n), nRadPerDay: new Float64Array(n), epochJd }
  rows.forEach((r, k) => {
    const [, a, e, iDeg, nodeDeg, wDeg, MDeg] = r
    const i = iDeg * D2R, node = nodeDeg * D2R, w = wDeg * D2R
    const cw = Math.cos(w), sw = Math.sin(w), cn = Math.cos(node), sn = Math.sin(node), ci = Math.cos(i), si = Math.sin(i)
    o.a[k] = a
    o.e[k] = e
    o.pq.set([cw * cn - sw * sn * ci, cw * sn + sw * cn * ci, sw * si, -sw * cn - cw * sn * ci, -sw * sn + cw * cn * ci, cw * si], k * 6)
    o.M0[k] = MDeg * D2R
    o.nRadPerDay[k] = (2 * Math.PI) / (YEAR_DAYS * Math.pow(a, 1.5))
  })
  return o
}

/** Heliocentric ecliptic positions (AU) of every asteroid at the given Julian date (TDB), written into `out` (x, y, z). */
export function positionsAU(o: BeltOrbits, jd: number, out: Float32Array): Float32Array {
  const dt = jd - o.epochJd
  for (let k = 0; k < o.n; k++) {
    const a = o.a[k], e = o.e[k]
    const M = (o.M0[k] + o.nRadPerDay[k] * dt) % (2 * Math.PI)
    const E = solveKepler(M < 0 ? M + 2 * Math.PI : M, e)
    const x = a * (Math.cos(E) - e)
    const y = a * Math.sqrt(1 - e * e) * Math.sin(E)
    const p = o.pq, j = k * 6
    out[k * 3] = p[j] * x + p[j + 3] * y
    out[k * 3 + 1] = p[j + 1] * x + p[j + 4] * y
    out[k * 3 + 2] = p[j + 2] * x + p[j + 5] * y
  }
  return out
}

/** small deterministic hash → [0, 1) (per-asteroid variation that does not flicker between renders) */
export function hash01(n: number): number {
  let h = (n * 2654435761) >>> 0
  h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13
  return (h >>> 0) / 4294967296
}
