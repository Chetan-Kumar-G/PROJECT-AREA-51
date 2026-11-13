/**
 * MARS DESTINATIONS — one registry for every place the explorer can go on Mars (audit N1).
 *
 * Nothing here is a second mission system: every entry is DERIVED from the records that already exist —
 *   sites       UNITY_SITES (surface/sites.ts): the explorable Mars scenes and their sourced origins
 *   hardware    SITE_DISCOVERIES (discovery/siteDiscoveries.ts) → catalogue objects (missions/catalog/*)
 *   landmarks   SITE_DISCOVERIES landmarks (measured in the controlled orthoimages)
 *   missions    MISSION_BY_ID (sourced names, dates, status)
 * plus the geometry between them (great-circle distance and bearing on the Mars sphere).
 *
 * NEARBY destinations are inside the current site's terrain (hardware, landmarks, the carrier): the explorer drives
 * there with the destination guide. DISTANT destinations are other sites: reached only by the carrier hop
 * (expedition.hop: board → conceptual surface-to-surface flight → landing), never by a jump cut.
 */
import { create } from 'zustand'
import { UNITY_SITES, UNITY_SITE_BY_ID, type UnitySite } from '../surface/sites'
import { SITE_DISCOVERIES, type SiteLandmark } from '../discovery/siteDiscoveries'
import { MISSION_BY_ID, OBJECT_BY_ID, MISSIONS } from '../missions'
import { R_MARS } from '../relive/geo'

export interface MarsHardwareRef {
  /** scene hardware id (as the Unity player reports it) */
  sceneId: string
  /** catalogue object id */
  objectId: string
  name: string
  /** the catalogue object's category (rover, lander, ...) */
  kind: string
}

export interface MarsDestination {
  siteId: string
  /** "Viking 1" — the part of the site name before the dash */
  name: string
  /** "Chryse Planitia" — the place */
  region: string
  missionId: string
  missionName: string
  latDeg: number
  lonEastDeg: number
  /** what the explorer does there: drive (rover missions) or walk around a stationary lander */
  mode: 'rover' | 'lander'
  hardware: MarsHardwareRef[]
  landmarks: SiteLandmark[]
  landingDate: string | null
  status: string | null
}

/** Mars missions with surface hardware that have no explorable scene yet (reported, never faked) */
export interface MarsElsewhere {
  missionId: string
  name: string
  reason: string
}

const split = (n: string) => {
  const i = n.indexOf(' — ')
  return i < 0 ? { name: n, region: '' } : { name: n.slice(0, i), region: n.slice(i + 3) }
}

function destinationOf(s: UnitySite): MarsDestination {
  const m = MISSION_BY_ID[s.missionIds[0]]
  const cfg = SITE_DISCOVERIES[s.id]
  const hardware = Object.entries(cfg?.objects ?? {}).map(([sceneId, objectId]) => {
    const o = OBJECT_BY_ID[objectId]
    return { sceneId, objectId, name: o?.name ?? sceneId, kind: String(o?.category ?? 'hardware') }
  })
  const { name, region } = split(s.name)
  return {
    siteId: s.id, name, region, missionId: m?.id ?? s.missionIds[0], missionName: m?.name ?? s.missionIds[0],
    latDeg: s.origin.latDeg, lonEastDeg: s.origin.lonEastDeg, mode: s.mode ?? 'rover', hardware, landmarks: cfg?.landmarks ?? [],
    landingDate: m?.landing?.value ?? null, status: m?.status?.value ?? null,
  }
}

export const MARS_DESTINATIONS: MarsDestination[] = UNITY_SITES.filter((s) => s.bodyId === 'mars').map(destinationOf)
export const MARS_DESTINATION_BY_ID: Record<string, MarsDestination> = Object.fromEntries(MARS_DESTINATIONS.map((d) => [d.siteId, d]))

/** catalogue Mars missions that left hardware on the surface but have no scene (derived: classes rover / lander / helicopter) */
export const MARS_ELSEWHERE: MarsElsewhere[] = MISSIONS
  .filter((m) => m.target === 'mars' && m.classes.some((c) => c === 'rover' || c === 'lander' || c === 'helicopter'))
  .filter((m) => !UNITY_SITES.some((s) => s.missionIds.includes(m.id)))
  .map((m) => ({
    missionId: m.id,
    name: m.name,
    reason: m.landingSite?.value ? 'No terrain package has been built for this landing site yet.' : 'No sourced landing coordinate in the catalogue yet, so it is not placed on the map.',
  }))

// ─────────────────────────────────────────────────────────────── geometry on the Mars sphere
const D2R = Math.PI / 180
/** great-circle distance between two destinations (km), on the sphere the flights use (R_MARS) */
export function distanceKm(a: { latDeg: number; lonEastDeg: number }, b: { latDeg: number; lonEastDeg: number }): number {
  const p1 = a.latDeg * D2R, p2 = b.latDeg * D2R, dl = (b.lonEastDeg - a.lonEastDeg) * D2R
  const h = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
  return (2 * R_MARS * Math.asin(Math.min(1, Math.sqrt(h)))) / 1000
}
/** initial bearing from a to b (degrees clockwise from north) */
export function bearingTo(a: { latDeg: number; lonEastDeg: number }, b: { latDeg: number; lonEastDeg: number }): number {
  const p1 = a.latDeg * D2R, p2 = b.latDeg * D2R, dl = (b.lonEastDeg - a.lonEastDeg) * D2R
  const y = Math.sin(dl) * Math.cos(p2)
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)
  return ((Math.atan2(y, x) / D2R) + 360) % 360
}

/**
 * The conceptual carrier hop between two sites: how long the flight shown takes (s). ILLUSTRATIVE: an average ground
 * speed of 2.6 km/s (below Mars's 3.4 km/s orbital speed), at least 4 minutes for the climb and the landing.
 */
export const HOP_GROUND_SPEED_MS = 2600
export const hopSeconds = (km: number) => Math.max(240, (km * 1000) / HOP_GROUND_SPEED_MS + 180)

export const compassWord = (deg: number) => ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(((deg % 360) + 360) % 360 / 45) % 8]

/** the other destinations, nearest first */
export function othersFrom(siteId: string): { d: MarsDestination; km: number; bearing: number }[] {
  const here = MARS_DESTINATION_BY_ID[siteId]
  if (!here) return []
  return MARS_DESTINATIONS.filter((d) => d.siteId !== siteId).map((d) => ({ d, km: distanceKm(here, d), bearing: bearingTo(here, d) })).sort((a, b) => a.km - b.km)
}

// ─────────────────────────────────────────────────────────────── session state (audit N2)
export interface MarsHop { from: string; to: string; at: number; km: number }
interface MarsSession {
  /** sites landed at in this browser session, with the first arrival time */
  visited: Record<string, number>
  /** the carrier hops flown this session (the journey), oldest first */
  journey: MarsHop[]
  /** per site: the nearby destination being guided to (survives a reload of the same site in the session) */
  guide: Record<string, MarsGuideTarget | null>
  visit: (siteId: string) => void
  hop: (h: MarsHop) => void
  setGuide: (siteId: string, t: MarsGuideTarget | null) => void
}
export interface MarsGuideTarget { kind: 'hardware' | 'landmark' | 'carrier'; id: string; label: string; x: number; z: number; radius: number }

const KEY = 'abnf.mars.session.v1'
type Saved = Pick<MarsSession, 'visited' | 'journey' | 'guide'>
const load = (): Saved => {
  try {
    const v = JSON.parse(window.sessionStorage.getItem(KEY) ?? 'null')
    if (v && typeof v === 'object') return { visited: v.visited ?? {}, journey: v.journey ?? [], guide: v.guide ?? {} }
  } catch { /* private mode */ }
  return { visited: {}, journey: [], guide: {} }
}
const save = (s: Saved) => { try { window.sessionStorage.setItem(KEY, JSON.stringify({ visited: s.visited, journey: s.journey, guide: s.guide })) } catch { /* private mode */ } }

export const useMarsSession = create<MarsSession>((set, get) => ({
  ...(typeof window === 'undefined' ? { visited: {}, journey: [], guide: {} } : load()),
  visit: (siteId) => {
    if (!UNITY_SITE_BY_ID[siteId] || get().visited[siteId]) return
    set({ visited: { ...get().visited, [siteId]: Date.now() } })
    save(get())
  },
  hop: (h) => { set({ journey: [...get().journey, h].slice(-50) }); save(get()) },
  setGuide: (siteId, t) => { set({ guide: { ...get().guide, [siteId]: t } }); save(get()) },
}))

if (typeof window !== 'undefined') (window as unknown as { __marsSession?: unknown }).__marsSession = { state: () => useMarsSession.getState(), destinations: MARS_DESTINATIONS, elsewhere: MARS_ELSEWHERE }
