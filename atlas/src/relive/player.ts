/**
 * Relive Mission player — the mission state machine, the playback clock, snapshots and resume points.
 *
 *   idle ──open()──▶ intro ──play()──▶ playing ⇄ paused ──(end of script)──▶ ended ──close()──▶ idle
 *                                         ▲                                   │
 *                                         └────────── restart() / seek() ─────┘
 *
 * The clock runs on requestAnimationFrame outside React: `clock` is read by the 3-D scene every frame, and the store
 * is updated at ~10 Hz for the HUD. Crossing an event fires the listeners (audio cues, the event card).
 *
 * Snapshot: opening a mission saves the explorer's present state (selection, simulation clock, panels) and closing
 * restores it exactly. Resume: the playback position is remembered per mission in localStorage.
 */
import { create } from 'zustand'
import { APOLLO_11 } from './scripts/apollo11'
import { OPPORTUNITY } from './scripts/opportunity'
import type { MissionEvent, MissionScript } from './types'
import { eventIndexAt, eventsCrossed, metAt, phaseAt, playAt, playLength, rateAt } from './timeline'
import { useStore } from '../store/store'
import { capturePresent, present, usePresent, verifyPresent } from './presentState'

export const RELIVE_SCRIPTS: Record<string, MissionScript> = { [APOLLO_11.id]: APOLLO_11, [OPPORTUNITY.id]: OPPORTUNITY }

export type ReliveStatus = 'idle' | 'intro' | 'playing' | 'paused' | 'ended'
export const SPEEDS = [0.5, 1, 2, 4, 8]

interface ReliveUI {
  id: string | null
  status: ReliveStatus
  u: number
  t: number
  length: number
  speed: number
  phaseId: string | null
  eventIdx: number
  /** the event card currently shown (index), with the time it was raised */
  card: { i: number; at: number } | null
  rate: number
  resumeU: number | null
  /** the present-day surface the replay was started from: kept loaded (hidden, paused) and shown again on close */
  suspendedSiteId: string | null
  set: (p: Partial<ReliveUI>) => void
}

export const useRelive = create<ReliveUI>((set) => ({
  id: null, status: 'idle', u: 0, t: 0, length: 0, speed: 1, phaseId: null, eventIdx: -1, card: null, rate: 1, resumeU: null, suspendedSiteId: null,
  set: (p) => set(p),
}))

/** read every frame by the scene (no React) */
export const clock = { u: 0, t: 0, script: null as MissionScript | null, wall: 0 }

type Listener = (e: MissionEvent, script: MissionScript) => void
/** for checks: every event crossed during playback (id, playback position), newest last; a seek never adds to it */
export const fired: { id: string; u: number }[] = []
const listeners = new Set<Listener>()
export const onReliveEvent = (fn: Listener) => { listeners.add(fn); return () => { listeners.delete(fn) } }

const KEY = (id: string) => `cosmic-atlas.relive.${id}`
const store = {
  get: (k: string) => { try { return window.localStorage.getItem(k) } catch { return null } },
  set: (k: string, v: string) => { try { window.localStorage.setItem(k, v) } catch { /* private mode */ } },
}

interface Snapshot { phase: string; selectedId: string | null; simMs: number; playing: boolean; leftOpen: boolean; rightOpen: boolean; timeOpen: boolean }
let snapshot: Snapshot | null = null
/** expeditions: what happens when the flight completes (open the surface, return to orbit) */
let onComplete: (() => void) | null = null
let completed = false
let raf = 0
let last = 0
let lastUi = 0
let lastSave = 0

function tick(now: number) {
  raf = requestAnimationFrame(tick)
  const S = useRelive.getState()
  const sc = clock.script
  if (!sc) return
  const dt = Math.min(0.1, (now - (last || now)) / 1000)
  last = now
  clock.wall += dt
  if (S.status === 'playing') {
    const u0 = clock.u
    clock.u = Math.min(S.length, clock.u + dt * S.speed)
    const t0 = clock.t
    clock.t = metAt(sc.segments, clock.u)
    const crossed = eventsCrossed(sc.events, t0, clock.t)
    if (crossed.length) {
      for (const e of crossed) { fired.push({ id: e.id, u: clock.u }); if (fired.length > 500) fired.shift(); for (const fn of listeners) fn(e, sc) }
      const last = crossed[crossed.length - 1]
      S.set({ card: { i: sc.events.indexOf(last), at: clock.wall } })
    }
    if (clock.u >= S.length && u0 < S.length) {
      S.set({ status: 'ended' })
      save(true)
      if (sc.kind === 'expedition') relive.complete()
    }
    if (now - lastSave > 4000) { lastSave = now; save() }
  }
  if (now - lastUi > 100) {
    lastUi = now
    S.set({ u: clock.u, t: clock.t, phaseId: phaseAt(sc.phases, clock.t).id, eventIdx: eventIndexAt(sc.events, clock.t), rate: rateAt(sc.segments, clock.u) })
  }
}

function save(done = false) {
  const S = useRelive.getState()
  if (!S.id || clock.script?.kind === 'expedition') return
  store.set(KEY(S.id), done ? '0' : String(Math.round(clock.u * 10) / 10))
}

/** the event the player is at: the one just jumped to (its card shows during the lead-in) or the last one crossed */
export function currentEventIndex(S: Pick<ReliveUI, 'card' | 'eventIdx'> = useRelive.getState()): number {
  return S.card ? Math.max(S.card.i, S.eventIdx) : S.eventIdx
}

export const relive = {
  /** open a historical replay; `resume` continues from the saved position straight away (no intro card) */
  open(id: string, opts?: { resume?: boolean; restart?: boolean }) {
    const sc = RELIVE_SCRIPTS[id]
    if (!sc) return
    relive.openScript(sc)
    if (opts?.resume && useRelive.getState().resumeU !== null) relive.resume()
    else if (opts?.restart) { useRelive.getState().set({ resumeU: null }); relive.play() }
  },
  /** open any script; expeditions auto-play and call `done` when they finish (instead of showing an ending) */
  openScript(sc: MissionScript, done?: () => void) {
    RELIVE_SCRIPTS[sc.id] = sc
    onComplete = done ?? null
    completed = false
    const id = sc.id
    const st = useStore.getState()
    // a historical replay keeps the present-day surface (Mission Control can start one from there); expeditions move on
    const suspend = sc.kind !== 'expedition' && !!st.surfaceSiteId ? st.surfaceSiteId : null
    // the present-day state, before anything changes (historical replays only; one snapshot per replay session)
    if (sc.kind !== 'expedition' && !present.saved) present.saved = capturePresent(sc.id)
    usePresent.getState().set({ returning: null })
    // a carrier hop between two Mars sites stays on the surface (the next site loads under the flight; no orbit)
    const hop = sc.kind === 'expedition' && sc.direction === 'hop'
    if (st.surfaceSiteId && !suspend && !hop) st.exitSurface()
    if (useStore.getState().phase === 'travel') useStore.getState().exitTravelMode()
    if (useStore.getState().phase === 'tour') useStore.getState().tourExit()
    const g = useStore.getState()
    if (!snapshot) snapshot = { phase: g.phase, selectedId: g.selectedId, simMs: g.simMs, playing: g.playing, leftOpen: g.leftOpen, rightOpen: g.rightOpen, timeOpen: g.timeOpen }
    useStore.getState().set({ playing: false, navMapOpen: false })
    clock.script = sc
    clock.u = 0
    clock.t = metAt(sc.segments, 0)
    const saved = Number(store.get(KEY(id)) ?? '0')
    const L = playLength(sc.segments)
    const exp = sc.kind === 'expedition'
    useRelive.getState().set({ suspendedSiteId: suspend, id, status: exp ? 'playing' : 'intro', u: 0, t: clock.t, length: L, speed: 1, card: null, phaseId: sc.phases[0].id, eventIdx: -1, resumeU: !exp && saved > 5 && saved < L - 5 ? saved : null })
    if (!raf && typeof requestAnimationFrame !== 'undefined') { last = 0; raf = requestAnimationFrame(tick) }
  },
  play() {
    const S = useRelive.getState()
    if (!S.id) return
    if (S.status === 'ended') relive.seek(0)
    S.set({ status: 'playing' })
  },
  pause() {
    const S = useRelive.getState()
    if (S.status === 'playing') { S.set({ status: 'paused' }); save() }
  },
  toggle() {
    const S = useRelive.getState()
    if (S.status === 'playing') relive.pause()
    else relive.play()
  },
  seek(u: number) {
    const S = useRelive.getState()
    const sc = clock.script
    if (!sc) return
    clock.u = Math.max(0, Math.min(S.length, u))
    clock.t = metAt(sc.segments, clock.u)
    S.set({ u: clock.u, t: clock.t, card: null, status: S.status === 'ended' ? 'paused' : S.status === 'intro' ? 'paused' : S.status, eventIdx: eventIndexAt(sc.events, clock.t), phaseId: phaseAt(sc.phases, clock.t).id })
  },
  /** jump just before an event (2 s of playback lead-in) and show its card */
  seekEvent(i: number) {
    const sc = clock.script
    if (!sc) return
    const e = sc.events[Math.max(0, Math.min(sc.events.length - 1, i))]
    relive.seek(Math.max(0, playAt(sc.segments, e.t) - 2))
    useRelive.getState().set({ card: { i: sc.events.indexOf(e), at: clock.wall } })
  },
  /** the event after / before the one the player is at (a jump's target counts as "at", during its 2 s lead-in) */
  nextEvent() {
    const sc = clock.script
    if (!sc) return
    const i = currentEventIndex() + 1
    if (i < sc.events.length) relive.seekEvent(i)
  },
  prevEvent() {
    const sc = clock.script
    if (!sc) return
    relive.seekEvent(Math.max(0, currentEventIndex() - 1))
  },
  /** jump to a mission time (seconds of MET) */
  seekMet(t: number) {
    const sc = clock.script
    if (sc) relive.seek(playAt(sc.segments, t))
  },
  seekPhase(id: string) {
    const sc = clock.script
    const p = sc?.phases.find((x) => x.id === id)
    if (sc && p) relive.seek(playAt(sc.segments, p.t0) + 0.01)
  },
  setSpeed(s: number) {
    useRelive.getState().set({ speed: s })
  },
  faster() {
    const s = useRelive.getState().speed
    relive.setSpeed(SPEEDS[Math.min(SPEEDS.length - 1, SPEEDS.indexOf(s) + 1)])
  },
  slower() {
    const s = useRelive.getState().speed
    relive.setSpeed(SPEEDS[Math.max(0, SPEEDS.indexOf(s) - 1)])
  },
  resume() {
    const r = useRelive.getState().resumeU
    if (r !== null) relive.seek(r)
    useRelive.getState().set({ resumeU: null })
    relive.play()
  },
  /** expedition finished (or skipped to its end): hand over to whatever comes next, without restoring the old state */
  complete() {
    if (completed) return
    completed = true
    const done = onComplete
    snapshot = null
    window.setTimeout(() => { relive.close(); done?.() }, 350)
  },
  /** skip an expedition flight to its end */
  finish() {
    const S = useRelive.getState()
    relive.seek(S.length)
    S.set({ status: 'ended' })
    relive.complete()
  },
  /**
   * leave the mission and return to the explorer exactly as it was. `toPresent: false` = the caller goes somewhere
   * else next (another site): the kept surface is not brought back.
   */
  close(opts?: { toPresent?: boolean }) {
    const snap = present.saved
    present.saved = null
    const kept = useRelive.getState().suspendedSiteId
    save(useRelive.getState().status === 'ended')
    if (raf && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(raf)
    raf = 0
    clock.script = null
    useRelive.getState().set({ id: null, status: 'idle', card: null, suspendedSiteId: null })
    onComplete = null
    if (snapshot) {
      const s = snapshot
      snapshot = null
      useStore.getState().set({ phase: s.phase as never, selectedId: s.selectedId, simMs: s.simMs, playing: s.playing, leftOpen: s.leftOpen, rightOpen: s.rightOpen, timeOpen: s.timeOpen })
    }
    if (snap && opts?.toPresent !== false) returnToPresent(snap, kept)
  },
  active: () => useRelive.getState().id !== null,
}

/**
 * Back to the present after a replay: the surface that was kept under the replay is simply shown again (then checked
 * against the snapshot); if it was lost, the site opens again without its landing and the snapshot is applied to it
 * (presentState.ts: pendingRestore).
 */
function returnToPresent(snap: import('./presentState').PresentSnapshot, kept: string | null) {
  const w = snap.world
  usePresent.getState().set({ returning: { siteName: w?.siteName ?? null, path: !w ? 'orbit' : kept && useStore.getState().surfaceSiteId === w.siteId ? 'kept' : 'rebuilt', at: Date.now() } })
  if (!w) { window.setTimeout(() => verifyPresent(snap, 'orbit'), 300); return }
  const st = useStore.getState()
  if (st.surfaceSiteId === w.siteId) { window.setTimeout(() => verifyPresent(snap, 'kept'), 1500); return }
  present.pendingRestore = snap
  if (st.surfaceSiteId) st.exitSurface()
  useStore.getState().set({ phase: 'explore' })
  useStore.getState().setSim(snap.app.simMs)
  useStore.getState().enterSurface(w.siteId)
}

/** test hook: lose the kept surface during a replay (as a WebGL context loss would), to exercise the rebuilt return */
export function simulateSurfaceLoss(): boolean {
  const S = useRelive.getState()
  if (!S.id || !S.suspendedSiteId) return false
  S.set({ suspendedSiteId: null })
  useStore.getState().exitSurface()
  return true
}

if (typeof window !== 'undefined') (window as unknown as { __relive?: unknown }).__relive = { relive, state: () => useRelive.getState(), clock, simulateSurfaceLoss, fired }
