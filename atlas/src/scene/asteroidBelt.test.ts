import { describe, it, expect } from 'vitest'
import { MARS_APHELION_AU, JUPITER_PERIHELION_AU, isMainBelt, prepareOrbits, positionsAU, type AsteroidRow } from './asteroidBelt'
import { planetEclipticAU } from '../astro/ephemeris'

// same pattern as the other data tests (no Node typings in this project): fs loaded at run time
const fs: { readFileSync(p: URL, enc: string): string } = await import(/* @vite-ignore */ 'node:' + 'fs')
const data = JSON.parse(fs.readFileSync(new URL('../../public/assets/astronomy/data/main_belt_sbdb_h13.5.json', import.meta.url), 'utf8')) as { epochJdTdb: number; rows: AsteroidRow[] }
const rows = data.rows.filter(isMainBelt)
const orbits = prepareOrbits(rows, data.epochJdTdb)
const MS_PER_DAY = 86400000
const jdOf = (ms: number) => 2440587.5 + ms / MS_PER_DAY

describe('main asteroid belt', () => {
  it('uses the planets’ own elements for the boundaries (Mars aphelion ≈ 1.666 AU, Jupiter perihelion ≈ 4.95 AU)', () => {
    expect(MARS_APHELION_AU).toBeCloseTo(1.666, 2)
    expect(JUPITER_PERIHELION_AU).toBeCloseTo(4.951, 2)
  })

  it('selects the classical main belt from the JPL sample (2.1–3.3 AU, no Mars- or Jupiter-crossers)', () => {
    expect(rows.length).toBeGreaterThan(9000)
    for (const r of rows) {
      expect(r[1]).toBeGreaterThanOrEqual(2.1)
      expect(r[1]).toBeLessThanOrEqual(3.3)
    }
  })

  it('every asteroid, at any date, lies between Mars’s orbit and Jupiter’s orbit', () => {
    const out = new Float32Array(orbits.n * 3)
    for (const ms of [Date.UTC(1969, 6, 20), Date.UTC(2004, 0, 25), Date.UTC(2026, 10, 12), Date.UTC(2050, 0, 1)]) {
      positionsAU(orbits, jdOf(ms), out)
      let rMin = Infinity, rMax = 0
      for (let k = 0; k < orbits.n; k++) {
        const r = Math.hypot(out[k * 3], out[k * 3 + 1], out[k * 3 + 2])
        rMin = Math.min(rMin, r); rMax = Math.max(rMax, r)
      }
      expect(rMin).toBeGreaterThan(MARS_APHELION_AU)
      expect(rMax).toBeLessThan(JUPITER_PERIHELION_AU)
      // and the planets themselves really are inside / outside it on that date
      expect(Math.hypot(...planetEclipticAU('mars', ms))).toBeLessThan(rMin + 0.001)
      expect(Math.hypot(...planetEclipticAU('jupiter', ms))).toBeGreaterThan(rMax)
    }
  })

  it('is a thin, Sun-centred disk in the planets’ plane (ecliptic), not a sphere or an offset ring', () => {
    const out = positionsAU(orbits, jdOf(Date.UTC(2026, 10, 12)), new Float32Array(orbits.n * 3))
    let cx = 0, cy = 0, cz = 0, zAbs = 0
    for (let k = 0; k < orbits.n; k++) { cx += out[k * 3]; cy += out[k * 3 + 1]; cz += out[k * 3 + 2]; zAbs += Math.abs(out[k * 3 + 2]) }
    const n = orbits.n
    expect(Math.hypot(cx / n, cy / n, cz / n)).toBeLessThan(0.15) // centred on the Sun
    expect(zAbs / n).toBeLessThan(0.45) // mean height above / below the ecliptic: a few tenths of an AU
    // most of the population sits in the 2.2–3.2 AU core
    let core = 0
    for (let k = 0; k < n; k++) { const r = Math.hypot(out[k * 3], out[k * 3 + 1]); if (r >= 2.0 && r <= 3.4) core++ }
    expect(core / n).toBeGreaterThan(0.8)
  })

  it('moves along the real orbits (Kepler’s third law: inner asteroids advance faster)', () => {
    const a = new Float32Array(orbits.n * 3), b = new Float32Array(orbits.n * 3)
    positionsAU(orbits, data.epochJdTdb, a)
    positionsAU(orbits, data.epochJdTdb + 100, b)
    const angle = (k: number) => {
      const t0 = Math.atan2(a[k * 3 + 1], a[k * 3]), t1 = Math.atan2(b[k * 3 + 1], b[k * 3])
      return Math.abs(((t1 - t0 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI)
    }
    const inner = [...Array(orbits.n).keys()].filter((k) => orbits.a[k] < 2.3 && orbits.e[k] < 0.1).slice(0, 50)
    const outer = [...Array(orbits.n).keys()].filter((k) => orbits.a[k] > 3.1 && orbits.e[k] < 0.1).slice(0, 50)
    const mean = (ks: number[]) => ks.reduce((s, k) => s + angle(k), 0) / ks.length
    expect(mean(inner)).toBeGreaterThan(mean(outer) * 1.3)
  })
})
