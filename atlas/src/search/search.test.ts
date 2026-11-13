import { describe, it, expect } from 'vitest'
import { SEARCH_INDEX, search } from './searchIndex'

describe('search: missions, planets and discoveries', () => {
  it('finds planets and moons', () => {
    expect(search('mars')[0].bodyId).toBe('mars')
    expect(search('moon').some((e) => e.bodyId === 'moon')).toBe(true)
    expect(search('titan')[0].bodyId).toBe('titan')
  })
  it('finds every explorable landing site (six Apollo, eight Mars)', () => {
    const sites = SEARCH_INDEX.filter((e) => e.kind === 'site')
    expect(sites.filter((e) => e.siteId?.startsWith('mars-') || e.siteId === 'victoria-crater')).toHaveLength(8)
    expect(sites.length).toBeGreaterThanOrEqual(14)
  })
  it('finds missions, replays and hardware with somewhere to go', () => {
    expect(search('apollo 11').some((e) => e.kind === 'replay' && e.scriptId === 'apollo-11')).toBe(true)
    expect(search('opportunity').some((e) => e.kind === 'replay')).toBe(true)
    const cur = search('curiosity')
    expect(cur.some((e) => e.kind === 'mission' || e.kind === 'hardware')).toBe(true)
    expect(cur.find((e) => e.kind === 'site')?.siteId).toBe('mars-curiosity')
  })
  it('finds instruments and landmarks', () => {
    expect(SEARCH_INDEX.some((e) => e.kind === 'instrument')).toBe(true)
    expect(search('bonneville')[0]).toMatchObject({ kind: 'landmark', siteId: 'mars-spirit' })
  })
  it('has no galaxy or deep-sky destinations', () => {
    for (const q of ['andromeda', 'betelgeuse', 'laniakea', 'pleiades', 'milky way']) expect(search(q).filter((e) => e.bodyId)).toEqual([])
  })
  it('returns nothing for nonsense', () => {
    expect(search('zzqqxx')).toEqual([])
    expect(search('  ')).toEqual([])
  })
})
