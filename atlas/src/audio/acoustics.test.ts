import { describe, expect, it } from 'vitest'
import { PROFILES, canHear, mediumAt, pressureRatio, propagate } from './acoustics'

describe('planetary acoustics', () => {
  it('no sound travels through a vacuum: the Moon and space carry nothing external', () => {
    for (const m of ['moon', 'space'] as const) {
      expect(PROFILES[m].carries).toBe(false)
      expect(propagate(m, 5).audible).toBe(false)
      expect(propagate(m, 5).gain).toBe(0)
      expect(canHear(m, 'external')).toBe(false)
      // a suit / structure (contact) and the radio do not need air
      expect(canHear(m, 'contact')).toBe(true)
      expect(canHear(m, 'radio')).toBe(true)
    }
  })

  it('Mars is about 20 dB quieter than Earth at the same distance (Maurice et al. 2022)', () => {
    const e = propagate('earth', 10)
    const m = propagate('mars', 10)
    const db = 20 * Math.log10(m.gain / e.gain)
    expect(db).toBeGreaterThan(-24)
    expect(db).toBeLessThan(-16)
  })

  it('high frequencies die out with distance on Mars (CO2 relaxation), much faster than on Earth', () => {
    const near = propagate('mars', 2).cutoffHz
    const far = propagate('mars', 60).cutoffHz
    expect(far).toBeLessThan(near)
    expect(far).toBeLessThan(propagate('earth', 60).cutoffHz)
    expect(far).toBeGreaterThanOrEqual(200)
  })

  it('sound falls off with distance and stops when the air does', () => {
    expect(propagate('earth', 40).gain).toBeLessThan(propagate('earth', 10).gain)
    expect(propagate('earth', 10, 0).audible).toBe(false)
  })

  it('the medium follows the body and the altitude (the Moon is always a vacuum)', () => {
    expect(mediumAt('moon', 0)).toBe('moon')
    expect(mediumAt('earth', 0)).toBe('earth')
    expect(mediumAt('mars', 0)).toBe('mars')
    expect(mediumAt(null, 0)).toBe('space')
    expect(mediumAt('earth', 400e3)).toBe('space')
    expect(pressureRatio('earth', 0)).toBeCloseTo(1, 5)
    expect(pressureRatio('earth', 20e3)).toBeLessThan(0.1)
    expect(pressureRatio('moon', 0)).toBe(0)
  })
})
