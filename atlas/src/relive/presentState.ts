/**
 * The present-day exploration state, kept apart from a historical replay (Relive overhaul, Milestone 2).
 *
 * Starting a replay takes a SNAPSHOT of where the user is: the world and site, which Unity environment and explorer,
 * the explorer's exact pose and the camera, the HUD (open record, inspected part, map, catalogue, minimap, camera
 * mode), the discoveries, the simulation clock and the quality setting.
 *
 * Normally the surface itself is kept loaded and paused under the replay (player.ts: suspendedSiteId), so returning is
 * exact by construction; on return the state is captured again and COMPARED with the snapshot (`lastCheck`). If the
 * surface was lost meanwhile (WebGL context lost, player failure), the site is opened again WITHOUT its landing and the
 * snapshot is applied to it (`pendingRestore`, consumed by the surface once its renderer is ready). Either way the user
 * comes back to the same place — never to the default landing point.
 *
 * The replay never writes any of this: it has its own clock and scene (player.ts / ReliveScene).
 */
import { create } from 'zustand'
import { useStore } from '../store/store'
import { useSurface, surfaceControl, surfaceDebug, marsHooks } from '../surface/surfaceState'
import { useDiscovery } from '../discovery/progress'
import { SITE_BY_ID, UNITY_SITE_BY_ID } from '../surface/sites'

export interface PresentPose {
  /** Mars (Unity): THEIA's pose and the chase camera; Moon (R3F): the astronaut and the orbit camera */
  x: number; z: number; y?: number
  heading: number
  camYaw: number; camPitch: number; camDist: number
  camYawOffset?: number
  camPos?: [number, number, number]
  fov?: number
  /** Unity mode at capture (Explore / Inspect / Paused) and what it was inspecting */
  unityMode?: string
  inspect?: { hw: string; component: string } | null
}

export interface PresentSnapshot {
  savedAt: number
  replayId: string
  world: null | {
    bodyId: 'moon' | 'mars'
    siteId: string
    siteName: string
    /** 'unity:victoria' (the built-in scene), 'unity:<package>' (a landing-site package) or 'r3f:moon' */
    environment: string
    playerBuild: string | null
    explorer: 'THEIA (conceptual rover)' | 'astronaut'
  }
  pose: PresentPose | null
  ui: {
    panel: { objectId: string; tab: string } | null
    /** inspected part: the shared store (Moon, Victoria) or the landing-site inspector's own (see siteUi) */
    component: string | null
    panelCollapsed: boolean
    mapOpen: boolean
    helpOpen: boolean
    catalogueOpen: boolean
    paused: boolean
    camMode: string
    lmModel: string
    discovered: string[]
    minimap: string | null
    site: Record<string, unknown> | null
  }
  discovery: Record<string, number>
  app: { phase: string; selectedId: string | null; simMs: number; quality: string }
}

/** landing-site scenes keep a few HUD values in their own React state; they register accessors here */
export const presentHooks: {
  siteUi: null | (() => Record<string, unknown>)
  applySiteUi: null | ((u: Record<string, unknown>) => void)
} = { siteUi: null, applySiteUi: null }

const MINIMAP_KEY = 'cosmic-atlas.mars.minimap'
const readMinimap = () => { try { return window.localStorage.getItem(MINIMAP_KEY) } catch { return null } }

function capturePose(world: PresentSnapshot['world']): PresentPose | null {
  if (!world) return null
  if (world.bodyId === 'mars') {
    const p = marsHooks.pose?.() as Record<string, any> | null | undefined // eslint-disable-line @typescript-eslint/no-explicit-any
    if (!p) return null
    return {
      x: p.x, z: p.z, y: p.y, heading: p.heading, camYaw: p.camYaw, camPitch: p.camPitch, camDist: p.camDist, camYawOffset: p.camYawOffset,
      camPos: [p.camX, p.camY, p.camZ], fov: p.fov, unityMode: p.mode, inspect: p.inspect ?? null,
    }
  }
  const s = surfaceControl.snapshot?.()
  if (!s) return null
  const cam = surfaceDebug.camera?.() as { pos?: number[] } | undefined
  return { x: s.pos[0], y: s.pos[1], z: s.pos[2], heading: s.yaw, camYaw: s.camYaw, camPitch: s.camPitch, camDist: s.camDist, camPos: cam?.pos as [number, number, number] | undefined }
}

export function capturePresent(replayId: string): PresentSnapshot {
  const st = useStore.getState()
  const S = useSurface.getState()
  const sid = st.surfaceSiteId
  const moon = sid ? SITE_BY_ID[sid] : undefined
  const mars = sid ? UNITY_SITE_BY_ID[sid] : undefined
  const world: PresentSnapshot['world'] = sid && (moon || mars)
    ? {
        bodyId: moon ? 'moon' : 'mars',
        siteId: sid,
        siteName: (moon ?? mars)!.name,
        environment: moon ? 'r3f:moon' : mars!.site ? `unity:${mars!.site}` : 'unity:victoria',
        playerBuild: moon ? null : (marsHooks.build?.() ?? null),
        explorer: moon ? 'astronaut' : 'THEIA (conceptual rover)',
      }
    : null
  return {
    savedAt: Date.now(),
    replayId,
    world,
    pose: capturePose(world),
    ui: {
      panel: S.panel ? { objectId: S.panel.objectId, tab: S.panel.tab } : null,
      component: S.component,
      panelCollapsed: S.panelCollapsed,
      mapOpen: S.mapOpen,
      helpOpen: S.helpOpen,
      catalogueOpen: S.catalogueOpen,
      paused: S.paused,
      camMode: S.camMode,
      lmModel: S.lmModel,
      discovered: [...S.discovered],
      minimap: readMinimap(),
      site: world?.bodyId === 'mars' && presentHooks.siteUi ? presentHooks.siteUi() : null,
    },
    discovery: sid ? { ...(useDiscovery.getState().bySite[sid] ?? {}) } : {},
    app: { phase: st.phase, selectedId: st.selectedId, simMs: st.simMs, quality: st.quality },
  }
}

/** what differs between two snapshots (tolerances: 5 cm, 0.01 rad, 5 cm camera distance); discoveries may only grow */
export function comparePresent(a: PresentSnapshot, b: PresentSnapshot): string[] {
  const d: string[] = []
  if (JSON.stringify(a.world) !== JSON.stringify(b.world)) d.push(`world ${JSON.stringify(a.world)} → ${JSON.stringify(b.world)}`)
  if (a.pose && b.pose) {
    const dp = Math.hypot(a.pose.x - b.pose.x, a.pose.z - b.pose.z)
    if (dp > 0.05) d.push(`position moved ${dp.toFixed(3)} m`)
    const ang = (u: number, v: number) => Math.abs(Math.atan2(Math.sin(u - v), Math.cos(u - v)))
    if (ang(a.pose.heading, b.pose.heading) > 0.01) d.push(`heading ${a.pose.heading.toFixed(3)} → ${b.pose.heading.toFixed(3)}`)
    if (ang(a.pose.camYaw, b.pose.camYaw) > 0.01) d.push(`camera yaw ${a.pose.camYaw.toFixed(3)} → ${b.pose.camYaw.toFixed(3)}`)
    if (Math.abs(a.pose.camPitch - b.pose.camPitch) > 0.01) d.push(`camera pitch ${a.pose.camPitch.toFixed(3)} → ${b.pose.camPitch.toFixed(3)}`)
    if (Math.abs(a.pose.camDist - b.pose.camDist) > 0.05) d.push(`camera distance ${a.pose.camDist.toFixed(2)} → ${b.pose.camDist.toFixed(2)}`)
    if (JSON.stringify(a.pose.inspect ?? null) !== JSON.stringify(b.pose.inspect ?? null)) d.push(`inspection ${JSON.stringify(a.pose.inspect)} → ${JSON.stringify(b.pose.inspect)}`)
  } else if (!!a.pose !== !!b.pose) d.push('pose missing')
  const ua = { ...a.ui, site: undefined }, ub = { ...b.ui, site: undefined }
  for (const k of Object.keys(ua) as (keyof typeof ua)[]) {
    if (JSON.stringify(ua[k]) !== JSON.stringify(ub[k])) d.push(`hud ${k}: ${JSON.stringify(ua[k])} → ${JSON.stringify(ub[k])}`)
  }
  if (JSON.stringify(a.ui.site) !== JSON.stringify(b.ui.site)) d.push(`site hud ${JSON.stringify(a.ui.site)} → ${JSON.stringify(b.ui.site)}`)
  for (const [k, v] of Object.entries(a.discovery)) if ((b.discovery[k] ?? 0) < v) d.push(`discovery ${k} ${v} → ${b.discovery[k] ?? 0}`)
  for (const k of ['phase', 'selectedId', 'simMs', 'quality'] as const) if (a.app[k] !== b.app[k]) d.push(`app ${k}: ${a.app[k]} → ${b.app[k]}`)
  return d
}

export interface PresentCheck { at: number; path: 'kept' | 'rebuilt' | 'orbit'; siteName: string | null; diffs: string[]; ok: boolean }

/** UI state for the "returning to the present" transition and the result of the last check */
export const usePresent = create<{ returning: null | { siteName: string | null; path: PresentCheck['path']; at: number }; lastCheck: PresentCheck | null; set: (p: Partial<{ returning: null | { siteName: string | null; path: PresentCheck['path']; at: number }; lastCheck: PresentCheck | null }>) => void }>((set) => ({
  returning: null,
  lastCheck: null,
  set: (p) => set(p),
}))

export const present = {
  /** the snapshot of the running replay (null when none) */
  saved: null as PresentSnapshot | null,
  /** a snapshot waiting for its surface to come back (rebuilt path) */
  pendingRestore: null as PresentSnapshot | null,
}

/** after the surface is visible again: capture, compare, publish the result */
export function verifyPresent(snap: PresentSnapshot, path: PresentCheck['path']) {
  const now = capturePresent(snap.replayId)
  const diffs = comparePresent(snap, now)
  const check: PresentCheck = { at: Date.now(), path, siteName: snap.world?.siteName ?? null, diffs, ok: diffs.length === 0 }
  usePresent.getState().set({ lastCheck: check })
  if (diffs.length) console.warn('[Present] state differs after the replay:', diffs)
  return check
}

/** the rebuilt path: surfaces call this once their renderer is ready for this site (returns the UI to apply) */
export function takePendingRestore(siteId: string): PresentSnapshot | null {
  const p = present.pendingRestore
  if (!p || p.world?.siteId !== siteId) return null
  present.pendingRestore = null
  return p
}

/** Unity RestoreState payload from a snapshot pose */
export const unityRestoreJson = (p: PresentPose) => JSON.stringify({ x: p.x, z: p.z, heading: p.heading, camYawOffset: p.camYawOffset ?? 0, camPitch: p.camPitch, camDist: p.camDist })

if (typeof window !== 'undefined') (window as unknown as { __present?: unknown }).__present = {
  capture: capturePresent,
  compare: comparePresent,
  saved: () => present.saved,
  pending: () => present.pendingRestore,
  lastCheck: () => usePresent.getState().lastCheck,
}
