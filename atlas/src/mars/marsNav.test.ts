import { describe, it, expect } from 'vitest'
import { SOURCES, MISSION_BY_ID } from '../missions'
import { UNITY_SITES } from '../surface/sites'
import { MARS_DESTINATIONS, MARS_ELSEWHERE, distanceKm, bearingTo, hopSeconds, othersFrom } from './marsDestinations'
import { missionStory, CHAPTERS } from './missionChapters'
import { marsHop } from '../relive/expeditionFlight'
import { targetFor } from '../expedition/expedition'
import { R_MARS } from '../relive/geo'
import { opportunitySolOf } from '../replay/replay'

describe('Mars destination registry', () => {
  it('derives one destination per explorable Mars scene, with its catalogue mission (no second mission system)', () => {
    const mars = UNITY_SITES.filter((s) => s.bodyId === 'mars')
    expect(MARS_DESTINATIONS.map((d) => d.siteId).sort()).toEqual(mars.map((s) => s.id).sort())
    for (const d of MARS_DESTINATIONS) expect(MISSION_BY_ID[d.missionId]).toBeTruthy()
  })

  it('keeps stationary landers as landers and rovers as rovers', () => {
    const mode = Object.fromEntries(MARS_DESTINATIONS.map((d) => [d.missionId, d.mode]))
    for (const m of ['viking-1', 'viking-2', 'phoenix', 'insight']) expect(mode[m]).toBe('lander')
    for (const m of ['mer-opportunity', 'mer-spirit', 'msl-curiosity', 'mars-pathfinder']) expect(mode[m]).toBe('rover')
  })

  it('reports Mars surface missions without a scene instead of placing them (Perseverance has no sourced coordinate)', () => {
    expect(MARS_ELSEWHERE.some((e) => e.missionId === 'mars-2020')).toBe(true)
  })

  it('computes great-circle distances on the Mars sphere (quarter circumference along the equator, symmetric)', () => {
    const q = distanceKm({ latDeg: 0, lonEastDeg: 0 }, { latDeg: 0, lonEastDeg: 90 })
    expect(q).toBeCloseTo((Math.PI / 2) * R_MARS / 1000, 3)
    const v1 = MARS_DESTINATIONS.find((d) => d.missionId === 'viking-1')!, pf = MARS_DESTINATIONS.find((d) => d.missionId === 'mars-pathfinder')!
    expect(distanceKm(v1, pf)).toBeCloseTo(distanceKm(pf, v1), 6)
    expect(distanceKm(v1, pf)).toBeGreaterThan(700)
    expect(distanceKm(v1, pf)).toBeLessThan(1000)
    expect(bearingTo({ latDeg: 0, lonEastDeg: 0 }, { latDeg: 10, lonEastDeg: 0 })).toBeCloseTo(0, 6)
    expect(bearingTo({ latDeg: 0, lonEastDeg: 0 }, { latDeg: 0, lonEastDeg: 10 })).toBeCloseTo(90, 6)
  })

  it('lists the other sites nearest first', () => {
    const o = othersFrom('victoria-crater')
    expect(o).toHaveLength(MARS_DESTINATIONS.length - 1)
    for (let i = 1; i < o.length; i++) expect(o[i].km).toBeGreaterThanOrEqual(o[i - 1].km)
    expect(hopSeconds(0)).toBeGreaterThanOrEqual(240)
  })
})

describe('carrier hop flight', () => {
  it('starts at the first site, ends ~300 m above the second, follows the great circle and never goes to orbit', () => {
    const A = targetFor('victoria-crater')!, B = targetFor('mars-spirit')!
    const sc = marsHop(A, B, Date.UTC(2004, 0, 20, 14))
    expect(sc.kind).toBe('expedition')
    expect(sc.direction).toBe('hop')
    const end = sc.phases[sc.phases.length - 1].t1
    const f0 = sc.frame!(0), f1 = sc.frame!(end - 0.01)
    // one planet-centred frame throughout (the ground at each site is the measured terrain; no flat local plane)
    expect(f0.env).toBe('mars')
    expect(f1.env).toBe('mars')
    expect(f0.alt).toBeCloseTo(300, 0)
    expect(f1.alt).toBeLessThan(320)
    // in the middle: above Mars, below orbital altitudes, along the great circle (between A and B)
    let maxAlt = 0
    for (let t = sc.phases[1].t0; t < sc.phases[1].t1; t += (sc.phases[1].t1 - sc.phases[1].t0) / 50) {
      const f = sc.frame!(t)
      expect(f.env).toBe('mars')
      maxAlt = Math.max(maxAlt, f.alt)
    }
    expect(maxAlt).toBeLessThanOrEqual(450e3 + 1)
    expect(maxAlt).toBeGreaterThan(60e3 - 1)
    // timed to reach the destination at its scene moment
    expect(sc.epochMs + end * 1000).toBeCloseTo(Date.UTC(2004, 0, 20, 14), -1)
  })
})

describe('Mars mission stories', () => {
  const sites = MARS_DESTINATIONS
  it('builds chapters in the brief order and a dated timeline for every explorable mission', () => {
    for (const d of sites) {
      const s = missionStory(d.missionId, d.siteId)!
      expect(s.chapters.length).toBeGreaterThanOrEqual(5)
      const order = CHAPTERS.map((c) => c.id)
      const got = s.chapters.map((c) => order.indexOf(c.id))
      expect([...got].sort((a, b) => a - b)).toEqual(got)
      expect(s.timeline.length).toBeGreaterThanOrEqual(3)
      const ms = (d: string) => Date.parse(d.length === 4 ? d + '-07-01' : d.length === 7 ? d + '-15' : d)
      for (let i = 1; i < s.timeline.length; i++) expect(ms(s.timeline[i].date!)).toBeGreaterThanOrEqual(ms(s.timeline[i - 1].date!))
    }
  })

  it('cites only sources that exist, and every line is sourced unless it is the labelled scene reconstruction', () => {
    for (const d of sites) {
      const s = missionStory(d.missionId, d.siteId)!
      for (const c of s.chapters) for (const it of c.items) {
        if (it.knowledge === 'reconstruction') continue
        expect(it.sources.length, it.text).toBeGreaterThan(0)
        for (const id of it.sources) expect(SOURCES[id], `${id} in ${it.id}`).toBeTruthy()
      }
    }
  })

  it('leaves unsourced chapters out (and says so) instead of filling them', () => {
    const s = missionStory('msl-curiosity', 'mars-curiosity')!
    expect(s.unsourced).toContain('challenges')
    expect(s.chapters.find((c) => c.id === 'challenges')).toBeUndefined()
  })

  it('places Opportunity events on its sol axis (Victoria entry, 11 Sep 2007 = sol ~1291)', () => {
    expect(opportunitySolOf('2007-09-11')!.sol).toBeGreaterThanOrEqual(1290)
    expect(opportunitySolOf('2007-09-11')!.sol).toBeLessThanOrEqual(1292)
    expect(opportunitySolOf('2006-09')!.approx).toBe(true)
    expect(opportunitySolOf('2003-07-08')).toBeNull()
  })
})
