import { describe, it, expect } from 'vitest'
import { OBJECTS } from '../missions'
import { plainObject, plainComponent } from './plain'
import { RELIVE_SCRIPTS } from '../relive/player'
import { storyFor } from '../relive/story'

describe('plain language for visitors', () => {
  it('every catalogued object has a plain explanation', () => {
    const missing = OBJECTS.filter((o) => !plainObject(o.id)).map((o) => o.id)
    expect(missing).toEqual([])
  })
  it('every instrument and mechanism has a plain explanation', () => {
    const missing = OBJECTS.flatMap((o) => o.components.filter((c) => !plainComponent(o.id, c.id)).map((c) => `${o.id}/${c.id}`))
    expect(missing).toEqual([])
  })
  it('the lines stay short (one or two sentences)', () => {
    for (const o of OBJECTS) {
      expect((plainObject(o.id) ?? '').length, o.id).toBeLessThan(240)
      for (const c of o.components) expect((plainComponent(o.id, c.id) ?? '').length, `${o.id}/${c.id}`).toBeLessThan(200)
    }
  })
  it('every Relive event has a visitor title and a short explanation', () => {
    for (const sc of Object.values(RELIVE_SCRIPTS)) {
      for (const e of sc.events) {
        const s = storyFor(sc, e)
        expect(s.title.length, `${sc.id}/${e.id}`).toBeGreaterThan(2)
        expect(s.title.length, `${sc.id}/${e.id}`).toBeLessThan(48)
        expect(s.text.length, `${sc.id}/${e.id}`).toBeLessThan(260)
        // the default card never shows internal record vocabulary
        expect(`${s.title} ${s.text}`, `${sc.id}/${e.id}`).not.toMatch(/confidence|HOW TIMED|time not published/i)
      }
    }
  })
})
