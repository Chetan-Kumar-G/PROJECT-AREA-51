import { describe, expect, it } from 'vitest'
import { comparePresent, type PresentSnapshot } from './presentState'

const base = (): PresentSnapshot => ({
  savedAt: 0,
  replayId: 'mer-opportunity',
  world: { bodyId: 'mars', siteId: 'victoria-crater', siteName: 'Victoria crater', environment: 'unity:victoria', playerBuild: 'abc', explorer: 'THEIA (conceptual rover)' },
  pose: { x: 10, z: -4, heading: 1.2, camYaw: 1.4, camPitch: 0.3, camDist: 8, inspect: { hw: 'opportunity-rover', component: 'solar' } },
  ui: { panel: { objectId: 'opportunity-rover', tab: 'inspect' }, component: 'merb-solar', panelCollapsed: false, mapOpen: false, helpOpen: false, catalogueOpen: false, paused: false, camMode: 'third', lmModel: 'nasa', discovered: ['opportunity-rover'], minimap: 'hidden', site: null },
  discovery: { 'opportunity-rover': 3 },
  app: { phase: 'explore', selectedId: 'mars', simMs: 1, quality: 'balanced' },
})

describe('present-state comparison', () => {
  it('equal states have no differences; tiny numeric noise is tolerated', () => {
    const b = base()
    b.pose!.x += 0.02
    b.pose!.camYaw += 0.004
    expect(comparePresent(base(), b)).toEqual([])
  })
  it('reports a moved explorer, a changed camera, a closed record, a lost discovery and another world', () => {
    const b = base()
    b.pose!.x += 3
    b.pose!.camPitch = 0.6
    b.ui.panel = null
    b.discovery = { 'opportunity-rover': 1 }
    const d = comparePresent(base(), b)
    expect(d.some((x) => x.startsWith('position moved'))).toBe(true)
    expect(d.some((x) => x.startsWith('camera pitch'))).toBe(true)
    expect(d.some((x) => x.startsWith('hud panel'))).toBe(true)
    expect(d.some((x) => x.startsWith('discovery'))).toBe(true)
    const c = base()
    c.world = { ...c.world!, siteId: 'mars-spirit' }
    expect(comparePresent(base(), c)[0]).toMatch(/^world/)
  })
  it('discoveries made later only add (a level going up is not a difference)', () => {
    const b = base()
    b.discovery = { 'opportunity-rover': 4, 'opportunity-rover/merb-pma': 2 }
    expect(comparePresent(base(), b)).toEqual([])
  })
})
