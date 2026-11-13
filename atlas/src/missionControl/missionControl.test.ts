import { describe, expect, it, beforeEach } from 'vitest'
import { REPLAYS, exploreContext, missionControl, replayScript, replaySpan, useMissionControl } from './missionState'
import { MISSION_BY_ID, dateMs } from '../missions'
import { DEFAULT_BINDINGS } from '../input/inputManager'
import { useStore } from '../store/store'

describe('Mission Control', () => {
  beforeEach(() => {
    useStore.setState({ surfaceSiteId: null, phase: 'intro', selectedId: null })
    useMissionControl.setState({ open: false, tab: 'relive', dest: 'all' })
  })

  it('opens on the missions of the world the user is on (and all of them on the homepage)', () => {
    missionControl.open()
    expect(useMissionControl.getState().dest).toBe('all')
    useStore.setState({ phase: 'explore', selectedId: 'mars' })
    missionControl.open()
    expect(useMissionControl.getState().dest).toBe('mars')
    useStore.setState({ surfaceSiteId: 'tranquility-base' })
    expect(exploreContext()).toMatchObject({ where: 'surface', bodyId: 'moon', siteId: 'tranquility-base' })
    missionControl.open()
    expect(useMissionControl.getState().dest).toBe('moon')
    useStore.setState({ surfaceSiteId: 'mars-spirit' })
    missionControl.open()
    expect(useMissionControl.getState().dest).toBe('mars')
    missionControl.toggle()
    expect(useMissionControl.getState().open).toBe(false)
  })

  it('G opens Mission Control in every exploration mode and collides with no other key there', () => {
    for (const mode of ['MAIN_MENU', 'PLANETARY_EXPLORATION', 'VEHICLE_EXPLORATION'] as const) {
      const b = DEFAULT_BINDINGS[mode]
      expect(b.find((x) => x.action === 'missionControl')?.codes).toEqual(['KeyG'])
      expect(b.filter((x) => x.codes.includes('KeyG'))).toHaveLength(1)
    }
  })

  it('a replay is called "full" only when it runs from launch to the documented end of the mission', () => {
    for (const r of REPLAYS) {
      const sc = replayScript(r)!
      const m = MISSION_BY_ID[r.missionId]
      expect(sc).toBeTruthy()
      expect(m).toBeTruthy()
      const span = replaySpan(sc)
      const end = m.end?.value ? dateMs(m.end.value) : null
      const lastDay = new Date(span.last.ms).toISOString().slice(0, 10)
      if (r.coverage === 'full') {
        // the replay reaches the mission's documented end (an event on that day) and nothing before it is cut
        expect(end).not.toBeNull()
        const endDay = new Date(end!).toISOString().slice(0, 10)
        expect(sc.events.some((e) => new Date(sc.epochMs + e.t * 1000).toISOString().slice(0, 10) === endDay)).toBe(true)
        expect(lastDay >= endDay).toBe(true)
      } else {
        expect(r.notReplayed).toBeTruthy()
        if (end) expect(span.last.ms).toBeLessThan(end)
      }
      expect(span.first.ms).toBeLessThanOrEqual(dateMs(m.launch.value!) + 60e3)
    }
    expect(REPLAYS.find((r) => r.missionId === 'apollo-11')?.coverage).toBe('full')
    expect(REPLAYS.find((r) => r.missionId === 'mer-opportunity')?.coverage).toBe('full')
  })
})
