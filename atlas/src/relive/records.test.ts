import { describe, expect, it } from 'vitest'
import { APOLLO_11, get } from './scripts/apollo11'
import { OPPORTUNITY, MER_ENTRY } from './scripts/opportunity'
import { eventRecord, getPrecision, missionRecords } from './records'
import { SOURCES } from '../missions/sources'

const SCRIPTS = [APOLLO_11, OPPORTUNITY]
const ids = new Set(Object.keys(SOURCES))

describe('historical event records (Milestone 3)', () => {
  it('every event is a complete record: id, mission, name, date, time and standard, MET, place, vehicle, sources, confidence, class, visual and audio', () => {
    for (const sc of SCRIPTS) {
      for (const r of missionRecords(sc)) {
        expect(r.id && r.missionId && r.name && r.description).toBeTruthy()
        expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(r.timestamp.length).toBeGreaterThanOrEqual(8) // 'Jan 2005' (month only) is the shortest
        expect(r.met.length).toBeGreaterThan(3)
        expect(r.location, `${sc.id}/${r.id} location`).not.toBe('')
        expect(r.vehicle, `${sc.id}/${r.id} vehicle`).not.toBe('')
        expect(r.sources.length).toBeGreaterThan(0)
        for (const s of r.sources) expect(ids.has(s), `${sc.id}/${r.id} source ${s}`).toBe(true)
        expect(['high', 'medium', 'low']).toContain(r.confidence)
        expect(r.classificationLabel).toBeTruthy()
        expect(r.visual.phase).toBeTruthy()
        expect(r.audio).toMatch(/^(Synthesised|No cue)/)
        if (r.classification !== 'mission-record') expect(r.timeNote, `${sc.id}/${r.id} needs a time note`).toBeTruthy()
      }
    }
  })

  it('events are in historical order', () => {
    for (const sc of SCRIPTS) for (let i = 1; i < sc.events.length; i++) expect(sc.events[i].t, `${sc.id} ${sc.events[i].id}`).toBeGreaterThanOrEqual(sc.events[i - 1].t)
  })

  it('no time is shown more precisely than its source gives it', () => {
    for (const sc of SCRIPTS) {
      for (const e of sc.events) {
        const r = eventRecord(sc, e)
        if (r.precision === 'minute') expect(r.timestamp, `${e.id}: ${r.timestamp}`).not.toMatch(/\d{2}:\d{2}:\d{2}/)
        if (r.precision === 'day') expect(r.timestamp).not.toMatch(/\d{2}:\d{2}/)
        if (r.precision === 'unknown') { expect(r.timestamp.startsWith('≈')).toBe(true); expect(r.timestamp).not.toMatch(/\d{2}:\d{2}:\d{2}/) }
        if (r.precision === 'second') expect(r.timestamp).not.toMatch(/:\d{2}\.\d/)
      }
    }
  })

  it('Apollo 11: each time is the SP-4029 GET verbatim; precision read from the printed value', () => {
    for (const e of APOLLO_11.events) {
      if (e.basis !== 'sourced') { expect(e.published).toBeUndefined(); continue }
      expect(e.published).toBeTruthy()
      // the last entry (release from quarantine) is published as a date, not a GET
      if (/^-?\d{3}:\d{2}:\d{2}/.test(e.published!)) expect(get(e.published!)).toBeCloseTo(e.t, 6)
      else expect(e.precision).toBe('day')
    }
    expect(getPrecision('055:30:00.00')).toBe('minute') // crew activity, logged to the minute
    expect(getPrecision('109:24:15.00')).toBe('second')
    expect(getPrecision('102:45:39.90')).toBe('centisecond')
    expect(getPrecision('000:00:00.00')).toBe('centisecond') // range zero: exact by definition
    const landing = APOLLO_11.events.find((e) => e.id === 'landing')!
    expect(eventRecord(APOLLO_11, landing).timestamp).toBe('20 Jul 1969, 20:17:39.90 UTC')
    expect(eventRecord(APOLLO_11, landing).met).toBe('GET 102:45:39.90')
    const inspect = APOLLO_11.events.find((e) => e.id === 'lm-inspect')!
    expect(eventRecord(APOLLO_11, inspect).timestamp).toBe('18 Jul 1969, 21:02 UTC')
  })

  it('Opportunity: time standards and uncertainty are stated', () => {
    const r = (id: string) => eventRecord(OPPORTUNITY, OPPORTUNITY.events.find((e) => e.id === id)!)
    expect(r('liftoff').timestamp).toBe('8 Jul 2003, 03:18:15 UTC')
    expect(r('impact').timestamp).toBe('25 Jan 2004, 04:55 UTC')
    expect(r('impact').precision).toBe('minute')
    expect(r('egress').standard).toBe('UTC-ERT')
    expect(r('egress').timestamp).toBe('31 Jan 2004, 11:01 UTC (received on Earth)')
    expect(r('chute').classification).toBe('flight-reconstruction')
    expect(r('chute').uncertaintyS).toBe(30)
    expect(r('chute').timestamp).toMatch(/±30 s$/)
    expect(r('approach').timestamp).toBe('10 Dec 2003')
    expect(r('meco').precision).toBe('unknown')
    expect(OPPORTUNITY.events.find((e) => e.id === 'chute')!.t - MER_ENTRY).toBeCloseTo(250.3, 6)
  })
})
