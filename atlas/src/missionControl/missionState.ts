/**
 * MISSIONS panel (formerly "Mission Control") — the one entry point to the three experiences, reachable from everywhere (homepage, orbital explorer,
 * Moon surface, Mars surface), not only from the homepage cards:
 *
 *   Explore Planet     present-day exploration of the landing sites (astronaut on the Moon, THEIA on Mars)
 *   Relive Mission     the documented historical lifecycle of a real mission (relive/scripts/*)
 *   Mission Catalogue  every catalogued mission, with what can be explored or replayed
 *   Discovered         what the user has found this session
 *
 * The conceptual THEIA expedition is listed under Explore Planet and is never presented as a historical replay.
 *
 * Context: on a surface the panel opens on that world's missions; in orbit on the selected body's (Moon / Mars); on the
 * homepage on all of them. The user can always widen it to "All destinations".
 */
import { create } from 'zustand'
import { useStore } from '../store/store'
import { SITE_BY_ID, UNITY_SITE_BY_ID } from '../surface/sites'
import { RELIVE_SCRIPTS } from '../relive/player'
import type { MissionScript } from '../relive/types'

export type MissionTab = 'relive' | 'explore' | 'catalogue' | 'discovered'
export type Destination = 'moon' | 'mars' | 'all'

interface MissionControlUI {
  open: boolean
  tab: MissionTab
  dest: Destination
  /** a mission record to open and scroll to (search results, homepage cards) */
  focus: string | null
  set: (p: Partial<MissionControlUI>) => void
}

export const useMissionControl = create<MissionControlUI>((set) => ({ open: false, tab: 'relive', dest: 'all', focus: null, set: (p) => set(p) }))

export interface ExploreContext {
  where: 'home' | 'orbit' | 'surface'
  bodyId: 'moon' | 'mars' | null
  siteId: string | null
  siteName: string | null
}

/** where the user is right now (decides which missions are relevant) */
export function exploreContext(): ExploreContext {
  const st = useStore.getState()
  const sid = st.surfaceSiteId
  if (sid) {
    const s = SITE_BY_ID[sid] ?? UNITY_SITE_BY_ID[sid]
    const b = s?.bodyId === 'moon' || s?.bodyId === 'mars' ? s.bodyId : null
    return { where: 'surface', bodyId: b, siteId: sid, siteName: s?.name ?? sid }
  }
  if (st.phase === 'intro') return { where: 'home', bodyId: null, siteId: null, siteName: null }
  const sel = st.selectedId === 'moon' || st.selectedId === 'mars' ? st.selectedId : null
  return { where: 'orbit', bodyId: sel, siteId: null, siteName: null }
}

export const missionControl = {
  open(tab?: MissionTab, opts: { dest?: Destination; focus?: string | null } = {}) {
    // the Moon's mouse-look locks the pointer: give it back, or the panel could not be clicked
    if (typeof document !== 'undefined' && document.pointerLockElement) document.exitPointerLock()
    const c = exploreContext()
    useMissionControl.getState().set({ open: true, tab: tab ?? useMissionControl.getState().tab, dest: opts.dest ?? c.bodyId ?? 'all', focus: opts.focus ?? null })
  },
  close() {
    useMissionControl.getState().set({ open: false })
  },
  toggle() {
    if (useMissionControl.getState().open) missionControl.close()
    else missionControl.open()
  },
  isOpen: () => useMissionControl.getState().open,
}

// ──────────────────────────────────────────────────────────────────────────── historical replays

/**
 * What each historical replay covers. `coverage` is 'full' only when the script plays the mission from launch to its
 * documented conclusion; otherwise the panel says where the replay stops and what is only summarised.
 */
export interface ReplayEntry {
  scriptId: string
  missionId: string
  /** launch vehicle and spacecraft, as the script draws them */
  vehicle: string
  coverage: 'full' | 'partial'
  /** what is not replayed (partial coverage) */
  notReplayed?: string
  /** how parts of the lifecycle are shown (e.g. told over an overview rather than reconstructed) */
  note?: string
}

export const REPLAYS: ReplayEntry[] = [
  {
    scriptId: 'apollo-11',
    missionId: 'apollo-11',
    vehicle: 'Saturn V · Command and Service Module Columbia · Lunar Module Eagle',
    coverage: 'full',
    note: 'Launch to splashdown is reconstructed in 3-D; the recovery and the quarantine (to 10 August 1969) are told from the record over an Earth overview.',
  },
  {
    scriptId: 'mer-opportunity',
    missionId: 'mer-opportunity',
    vehicle: 'Delta II 7925H · cruise stage · aeroshell, parachute and airbag lander · Opportunity rover',
    coverage: 'full',
    note: 'Launch to egress is reconstructed in 3-D. The surface years (2004–2019) are dated milestones and discoveries over an orbital overview of Meridiani Planum — not reconstructed drive by drive.',
  },
]

export const replayFor = (missionId: string) => REPLAYS.find((r) => r.missionId === missionId) ?? null

/** first and last events of a replay with their UTC dates (MET 0 + event time) */
export function replaySpan(sc: MissionScript): { first: { title: string; ms: number }; last: { title: string; ms: number }; events: number; sourced: number; sequence: number; sources: number } {
  const ev = sc.events
  const f = ev[0], l = ev[ev.length - 1]
  return {
    first: { title: f.title, ms: sc.epochMs + f.t * 1000 },
    last: { title: l.title, ms: sc.epochMs + l.t * 1000 },
    events: ev.length,
    sourced: ev.filter((e) => e.basis === 'sourced').length,
    sequence: ev.filter((e) => e.basis === 'sequence').length,
    sources: new Set(ev.flatMap((e) => e.sources)).size,
  }
}

export const replayScript = (r: ReplayEntry): MissionScript | null => RELIVE_SCRIPTS[r.scriptId] ?? null

/** the saved playback position of a replay (Relive keeps it in localStorage), in seconds of playback */
export function savedReplayPosition(scriptId: string): number | null {
  try {
    const v = Number(window.localStorage.getItem(`cosmic-atlas.relive.${scriptId}`) ?? '0')
    return v > 5 ? v : null
  } catch {
    return null
  }
}

if (typeof window !== 'undefined') (window as unknown as { __missionControl?: unknown }).__missionControl = { ...missionControl, state: () => useMissionControl.getState(), context: exploreContext }
