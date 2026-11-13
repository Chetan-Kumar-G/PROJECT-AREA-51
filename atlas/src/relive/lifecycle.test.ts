import { describe, expect, it } from 'vitest'
import { APOLLO_11 } from './scripts/apollo11'
import { OPPORTUNITY, MER_OVERVIEW_T0 } from './scripts/opportunity'
import { frameAt } from './flight'
import { validateScript } from './timeline'
import { eventRecord } from './records'

const day = (sc: typeof APOLLO_11, id: string) => new Date(sc.epochMs + sc.events.find((e) => e.id === id)!.t * 1000).toISOString().slice(0, 10)

describe('complete historical lifecycles (Milestone 4)', () => {
  it('Apollo 11 runs from the terminal count to the crew released from quarantine (SP-4029)', () => {
    const ids = APOLLO_11.events.map((e) => e.id)
    for (const id of ['liftoff', 'sic-sep', 'eoi', 'tli-ign', 'docking', 'loi-ign', 'undock', 'pdi', 'landing', 'first-step', 'pse', 'lrrr', 'lm-liftoff', 'redocking', 'tei-ign', 'entry', 'drogue', 'splashdown', 'crew-aboard', 'mqf', 'samples-houston', 'lrl', 'released']) expect(ids).toContain(id)
    expect(ids[ids.length - 1]).toBe('released')
    expect(day(APOLLO_11, 'released')).toBe('1969-08-10')
    expect(validateScript(APOLLO_11)).toEqual([])
  })

  it('Opportunity runs from launch to NASA declaring the mission complete, with its discoveries', () => {
    const ids = OPPORTUNITY.events.map((e) => e.id)
    for (const id of ['liftoff', 'sep', 'entry', 'chute', 'airbags', 'impact', 'petals', 'egress', 'water', 'victoria-arrival', 'endeavour', 'last-contact', 'end']) expect(ids).toContain(id)
    expect(ids[ids.length - 1]).toBe('end')
    expect(day(OPPORTUNITY, 'last-contact')).toBe('2018-06-10')
    expect(day(OPPORTUNITY, 'end')).toBe('2019-02-13')
    expect(OPPORTUNITY.events.filter((e) => e.kind === 'discovery').length).toBeGreaterThanOrEqual(3)
    expect(validateScript(OPPORTUNITY)).toEqual([])
  })

  it('camera shot cues are in time order (the director takes the last cue whose time has passed)', () => {
    for (const sc of [APOLLO_11, OPPORTUNITY]) for (let k = 1; k < sc.shots.length; k++) expect(sc.shots[k].t, `${sc.id} shot ${k}`).toBeGreaterThanOrEqual(sc.shots[k - 1].t)
  })

  it('jump targets exist and are in mission order', () => {
    for (const sc of [APOLLO_11, OPPORTUNITY]) {
      const idx = sc.jumps!.map((j) => sc.events.findIndex((e) => e.id === j.event))
      expect(idx.every((i) => i >= 0)).toBe(true)
      for (let k = 1; k < idx.length; k++) expect(idx[k]).toBeGreaterThan(idx[k - 1])
      expect(sc.jumps!.length).toBeGreaterThanOrEqual(8)
    }
  })

  it("Opportunity's surface years are a surface reconstruction on measured terrain (rover + lander), not an orbital marker", () => {
    const mer = frameAt('mer-opportunity', MER_OVERVIEW_T0 + 86400 * 365 * 5)
    expect(mer.env).toBe('mars-local')
    expect(mer.site?.pkg).toBe('victoria')
    expect(mer.objects.map((o) => o.model).sort()).toEqual(['mer-lander', 'mer-rover'])
    expect(frameAt('mer-opportunity', MER_OVERVIEW_T0 - 60).env).toBe('mars-local') // egress itself is reconstructed
    const ap = frameAt('apollo-11', APOLLO_11.events.find((e) => e.id === 'lrl')!.t)
    expect(ap.env).toBe('earth')
    expect(ap.objects).toEqual([])
  })

  it('events in the told periods say so on their record (not "reconstructed 3-D")', () => {
    const r = (sc: typeof APOLLO_11, id: string) => eventRecord(sc, sc.events.find((e) => e.id === id)!).visual.reconstruction
    expect(r(OPPORTUNITY, 'endeavour')).toMatch(/^Reconstructed 3-D/) // the rover is shown at its data-derived position
    expect(r(APOLLO_11, 'lrl')).toMatch(/^Told from the record/)
    expect(r(OPPORTUNITY, 'chute')).toMatch(/^Reconstructed 3-D/)
  })

  it('every replay event in the extended periods is a dated, sourced mission record', () => {
    for (const e of OPPORTUNITY.events.filter((x) => x.t >= MER_OVERVIEW_T0)) {
      expect(e.basis).toBe('sourced')
      expect(e.published).toBeTruthy()
      expect(['day', 'month']).toContain(e.precision)
    }
  })
})
