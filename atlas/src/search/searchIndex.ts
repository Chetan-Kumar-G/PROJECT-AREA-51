/**
 * SEARCH MISSIONS, PLANETS AND DISCOVERIES — the index behind the header search.
 *
 * Built from the data the app already ships (no network): the Solar System catalogue (planets, moons, dwarf planets),
 * the explorable landing sites (six Apollo sites, eight Mars sites), the mission catalogue, the historical replays, the
 * historical hardware and its instruments, and the measured landmarks of the Mars sites. Pure data: what a result DOES
 * is decided by the caller (ui/Search.tsx), so this module stays testable without a browser.
 */
import { OBJECTS as BODIES, normalizeName } from '../data/catalog'
import { MISSIONS, OBJECTS as HARDWARE, MISSION_BY_ID } from '../missions'
import { SURFACE_SITES, UNITY_SITES } from '../surface/sites'
import { SITE_DISCOVERIES } from '../discovery/siteDiscoveries'
import { REPLAYS } from '../missionControl/missionState'

export type SearchKind = 'planet' | 'moon' | 'small-body' | 'site' | 'mission' | 'replay' | 'hardware' | 'instrument' | 'landmark'

export interface SearchEntry {
  key: string
  kind: SearchKind
  name: string
  /** one line of context under the name */
  detail: string
  /** extra words that should match (aliases, mission names, full instrument names) */
  terms: string[]
  /** a Solar System body to fly to */
  bodyId?: string
  /** an explorable landing site to enter */
  siteId?: string
  /** a catalogued mission (opens its record) */
  missionId?: string
  /** a historical replay to open */
  scriptId?: string
  /** ordering among equal text matches */
  weight: number
}

export const KIND_LABEL: Record<SearchKind, string> = {
  planet: 'Planet',
  moon: 'Moon',
  'small-body': 'Dwarf planet / asteroid',
  site: 'Landing site',
  mission: 'Mission',
  replay: 'Relive mission',
  hardware: 'Historical hardware',
  instrument: 'Instrument',
  landmark: 'Landmark',
}

const ALL_SITES = [
  ...SURFACE_SITES.filter((s) => s.available).map((s) => ({ id: s.id, bodyId: s.bodyId, name: s.name, missionIds: s.missionIds, objectIds: s.objects.map((o) => o.objectId) })),
  ...UNITY_SITES.map((s) => ({ id: s.id, bodyId: s.bodyId, name: s.name, missionIds: s.missionIds, objectIds: [...s.objectIds, ...Object.values(SITE_DISCOVERIES[s.id]?.objects ?? {})] })),
]

/** the explorable site that shows a piece of hardware (by placement first, then by its mission) */
export function siteForObject(objectId: string, missionId: string): string | null {
  return ALL_SITES.find((s) => s.objectIds.includes(objectId))?.id ?? ALL_SITES.find((s) => s.missionIds.includes(missionId))?.id ?? null
}

export const siteForMission = (missionId: string): string | null => ALL_SITES.find((s) => s.missionIds.includes(missionId))?.id ?? null

const bodyName = (id: string) => BODIES.find((o) => o.id === id)?.name ?? id

function build(): SearchEntry[] {
  const out: SearchEntry[] = []

  // Solar System bodies (the Milky Way and the Orion Spur are the opening's context, not destinations)
  for (const o of BODIES) {
    const kind: SearchKind | null =
      o.category === 'planet' || o.id === 'sun' ? 'planet' : o.category === 'moon' ? 'moon' : o.category === 'dwarf-planet' || o.category === 'asteroid' ? 'small-body' : null
    if (!kind) continue
    const parent = o.parents[0] && o.parents[0] !== 'sun' ? bodyName(o.parents[0]) : null
    out.push({
      key: `body:${o.id}`, kind, name: o.name, terms: [o.id, ...o.aliases], bodyId: o.id,
      detail: o.id === 'sun' ? 'Star · centre of the Solar System' : parent ? `Moon of ${parent}` : kind === 'planet' ? 'Planet' : o.category.replace('-', ' '),
      weight: o.id === 'moon' || o.id === 'mars' ? 1 : kind === 'planet' ? 0.9 : o.importance * 0.6,
    })
  }

  for (const s of ALL_SITES) {
    const missions = s.missionIds.map((id) => MISSION_BY_ID[id]?.name).filter(Boolean) as string[]
    out.push({ key: `site:${s.id}`, kind: 'site', name: s.name, terms: [...missions, s.id], siteId: s.id, detail: `${bodyName(s.bodyId)} · explore ${missions.join(', ')}`, weight: 0.95 })
  }

  for (const r of REPLAYS) {
    const m = MISSION_BY_ID[r.missionId]
    if (!m) continue
    out.push({ key: `replay:${r.scriptId}`, kind: 'replay', name: `Relive ${m.name}`, terms: [m.name, r.vehicle, 'relive', 'replay'], scriptId: r.scriptId, missionId: m.id, detail: r.vehicle, weight: 1 })
  }

  for (const m of MISSIONS) {
    const year = m.launch.value?.slice(0, 4)
    out.push({
      key: `mission:${m.id}`, kind: 'mission', name: m.name, terms: [m.id, m.agency], missionId: m.id, siteId: siteForMission(m.id) ?? undefined,
      detail: `${m.agency} · ${bodyName(m.target)}${year ? ` · launched ${year}` : ''}`,
      weight: m.nasaMission ? 0.85 : 0.7,
    })
  }

  for (const h of HARDWARE) {
    const m = MISSION_BY_ID[h.missionId]
    const site = siteForObject(h.id, h.missionId)
    out.push({ key: `hw:${h.id}`, kind: 'hardware', name: h.name, terms: [m?.name ?? '', h.builtBy], missionId: h.missionId, siteId: site ?? undefined, detail: `${m?.name ?? h.missionId}${site ? '' : ' · catalogue record'}`, weight: 0.8 })
    for (const c of h.components) {
      out.push({
        key: `inst:${h.id}:${c.id}`, kind: 'instrument', name: c.name, terms: [c.fullName ?? '', h.name, m?.name ?? ''], missionId: h.missionId, siteId: site ?? undefined,
        detail: `${c.fullName && c.fullName !== c.name ? `${c.fullName} · ` : ''}on ${h.name}`, weight: 0.6,
      })
    }
  }

  for (const [siteId, cfg] of Object.entries(SITE_DISCOVERIES)) {
    const site = ALL_SITES.find((s) => s.id === siteId)
    for (const l of cfg.landmarks) {
      out.push({ key: `lm:${siteId}:${l.id}`, kind: 'landmark', name: l.name, terms: [site?.name ?? ''], siteId, detail: `Landmark · ${site?.name ?? siteId}`, weight: 0.7 })
    }
  }

  // the same id can be reached twice (e.g. one instrument listed on two records): keep the first
  const seen = new Set<string>()
  return out.filter((e) => (seen.has(e.key) ? false : (seen.add(e.key), true)))
}

export const SEARCH_INDEX: SearchEntry[] = build()

/** ranked matches: exact name > name prefix > every word present > substring of any term */
export function search(q: string, index: SearchEntry[] = SEARCH_INDEX, limit = 12): SearchEntry[] {
  const n = normalizeName(q)
  if (!n) return []
  const words = q.toLowerCase().split(/\s+/).filter(Boolean)
  return index
    .map((e) => {
      const name = normalizeName(e.name)
      const terms = e.terms.filter(Boolean).map(normalizeName)
      const hay = (e.name + ' ' + e.terms.join(' ') + ' ' + e.detail).toLowerCase()
      let score = 0
      if (name === n || terms.includes(n)) score = 5
      else if (name.startsWith(n) || terms.some((t) => t.startsWith(n))) score = 4
      else if (words.every((w) => hay.includes(w))) score = 3
      else if (name.includes(n) || terms.some((t) => t.includes(n))) score = 2
      return { e, score }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.e.weight - a.e.weight || a.e.name.localeCompare(b.e.name))
    .slice(0, limit)
    .map((r) => r.e)
}
