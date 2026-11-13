import { Vec3, raDecDistToRoot, galacticLBToUnit, sunRelativeToRoot, SUN_POS, LY_PER_AU, add, scale } from '../astro/coords'
import { planetRootPos, moonOffsetLy } from '../astro/ephemeris'
import { SOLAR_BODIES, SOLAR_BODY_BY_ID, SolarBody, CHARON_PLUTO_MASS_RATIO, PLUTO_BODY, PLANET_RADIUS_KM } from './solarSystem'
import { positionAtMs, periodDays, periapsisKm, apoapsisKm, KM_PER_AU } from '../astro/kepler'

export type Category =
  | 'supercluster' | 'cluster' | 'group' | 'sheet' | 'galaxy' | 'galactic-structure'
  | 'nebula' | 'star' | 'star-cluster' | 'planet' | 'moon' | 'star-system'
  | 'dwarf-planet' | 'asteroid'

export type Provenance = 'curated-approximate' | 'illustrative' | 'computed-model' | 'live-catalogue' | 'user-dataset'
export type Visual = 'cluster' | 'galaxy' | 'milkyway' | 'nebula' | 'star' | 'starcluster' | 'sun' | 'planet' | 'marker'

export type PositionSpec =
  | { kind: 'origin' }
  | { kind: 'equatorial'; raDeg: number; decDeg: number; distanceLy: number }
  | { kind: 'galactic'; lDeg: number; bDeg: number; distanceLy: number } // from the Sun
  | { kind: 'sun' }
  | { kind: 'offset'; from: string; xyzLy: Vec3 } // illustrative offset from another object
  | { kind: 'planet'; body: string }
  | { kind: 'moon'; parent: string }
  | { kind: 'solar-body'; id: string }

export interface CosmicObject {
  id: string
  name: string
  aliases: string[]
  category: Category
  visual: Visual
  position: PositionSpec
  /** physical hierarchy (star -> planetary system). Not the same as membership. */
  parents: string[]
  /** membership in large-scale structures (galaxy -> group/cluster). May be several. */
  memberOf: string[]
  /** simple spatial proximity, not physical association */
  nearby: string[]
  /** physical extent, light-years (diameter). */
  extentLy?: number
  /** exaggerated visual radius for solar-system bodies, in AU (documented as not to scale) */
  displayRadiusAU?: number
  distance?: { valueLy: number; uncertaintyLy?: number; basis: string }
  color: string
  provenance: Provenance
  confidence: 'high' | 'medium' | 'low'
  source: { catalogue: string; identifier?: string; note?: string }
  info: string
  props?: Record<string, string>
  schematic?: boolean
  importance: number // label priority 0..1
  viewDistanceLy: number // comfortable arrival distance
  links?: { label: string; url: string }[]
}

const sim = (n: string) => ({ label: 'SIMBAD', url: `https://simbad.cds.unistra.fr/simbad/sim-id?Ident=${encodeURIComponent(n)}` })

export const OBJECTS: CosmicObject[] = [
  {
    id: 'milky-way', name: 'Milky Way Galaxy', aliases: ['The Galaxy', 'Milky Way'], category: 'galaxy', visual: 'milkyway',
    position: { kind: 'origin' }, parents: [], memberOf: [], nearby: [],
    extentLy: 105700, color: '#cfe4ff', provenance: 'curated-approximate', confidence: 'high',
    source: { catalogue: 'Bland-Hawthorn & Gerhard 2016, ARA&A 54, 529' },
    info: 'A barred spiral galaxy. The 3D model drawn here is an ILLUSTRATIVE procedural model (bulge, disk, four logarithmic arms) – not a measured map. The Sun is placed ~26,700 ly from the centre.',
    props: { 'Diameter': '~105,700 ly (stellar disk)', 'Sun–centre distance': '26,673 ly (GRAVITY 2019)', 'Model': 'Procedural / illustrative' },
    importance: 1, viewDistanceLy: 180000, links: [sim('Milky Way')],
  },
  {
    id: 'orion-arm', name: 'Orion Arm (Orion Spur)', aliases: ['Orion Spur', 'Local Arm'], category: 'galactic-structure', visual: 'marker',
    position: { kind: 'sun' }, parents: [], memberOf: ['milky-way'], nearby: ['sun'],
    extentLy: 10000, color: '#7fe8ff', provenance: 'illustrative', confidence: 'medium', schematic: true,
    source: { catalogue: 'Xu et al. 2016, Sci. Adv. 2, e1600878 (maser parallaxes)', note: 'Drawn as a schematic line through the Sun; length ~20,000 ly, width ~3,500 ly.' },
    info: 'A minor spiral structure ("spur") between the Sagittarius and Perseus arms that hosts the Solar System. Its drawn path here is schematic.',
    props: { 'Length': '~20,000 ly', 'Width': '~3,500 ly', 'Drawn as': 'Schematic line' }, importance: 0.8, viewDistanceLy: 9000,
  },
  // --- Solar System ---
  {
    id: 'sun', name: 'Sun', aliases: ['Sol'], category: 'star', visual: 'sun',
    position: { kind: 'sun' }, parents: [], memberOf: ['milky-way', 'orion-arm'], nearby: [],
    displayRadiusAU: 0.05, color: '#ffd27a', provenance: 'computed-model', confidence: 'high',
    source: { catalogue: 'NASA Solar System Exploration', note: 'Radius 695,700 km (0.00465 AU). Display radius exaggerated ~10×.' },
    info: 'The G2V star at the centre of the Solar System, ~26,673 ly from the Galactic Centre.',
    props: { 'True radius': '695,700 km', 'Display radius': 'Exaggerated (~10×)', 'Spectral type': 'G2V' }, importance: 1, viewDistanceLy: 0.0006,
  },
  ...[
    ['mercury', 'Mercury', '#b5a79a', 2439.7, '4,879 km diameter. Fastest planet; 88-day year.', { 'Mean radius': '2,439.7 km', 'Orbital period': '87.97 d', 'Semi-major axis': '0.387 AU' }],
    ['venus', 'Venus', '#e8c98a', 6051.8, 'Thick CO₂ atmosphere, hottest planet (~465 °C).', { 'Mean radius': '6,051.8 km', 'Orbital period': '224.7 d', 'Semi-major axis': '0.723 AU' }],
    ['earth', 'Earth', '#4f9bff', 6371.0, 'Our home planet; the only known world with life. Photorealistic scientific surface map with specular oceans and dynamic clouds.', { 'Mean radius': '6,371.0 km', 'Orbital period': '365.256 d', 'Semi-major axis': '1.000 AU', 'Moons': '1 (Moon)' }],
    ['mars', 'Mars', '#d9704a', 3389.5, 'Cold desert world with the largest volcano in the Solar System. Natural satellites: Phobos and Deimos.', { 'Mean radius': '3,389.5 km', 'Orbital period': '687.0 d', 'Semi-major axis': '1.524 AU', 'Moons': '2 (Phobos, Deimos)' }],
    ['jupiter', 'Jupiter', '#d8b48a', 69911, 'Largest planet; gas giant with 95+ known moons including the four Galilean satellites.', { 'Mean radius': '69,911 km', 'Orbital period': '11.86 yr', 'Semi-major axis': '5.203 AU', 'Moons': '95+ (Io, Europa, Ganymede, Callisto...)' }],
    ['saturn', 'Saturn', '#e6d29a', 58232, 'Gas giant with a prominent ring system and major moons including Titan and Enceladus.', { 'Mean radius': '58,232 km', 'Orbital period': '29.46 yr', 'Semi-major axis': '9.537 AU', 'Moons': '146+ (Titan, Enceladus, Rhea...)' }],
    ['uranus', 'Uranus', '#9fe3e8', 25362, 'Ice giant rotating on its side (axial tilt 98°) with major moons Miranda, Ariel, Umbriel, Titania, Oberon.', { 'Mean radius': '25,362 km', 'Orbital period': '84.0 yr', 'Semi-major axis': '19.19 AU', 'Moons': '28+ (Titania, Oberon, Ariel...)' }],
    ['neptune', 'Neptune', '#5877ff', 24622, 'Outermost major planet: ice giant with supersonic winds and retrograde giant moon Triton.', { 'Mean radius': '24,622 km', 'Orbital period': '164.8 yr', 'Semi-major axis': '30.07 AU', 'Moons': '16+ (Triton, Proteus, Nereid...)' }],
  ].map(([id, name, color, rKm, info, props]) => ({
    id: id as string, name: name as string, aliases: [] as string[], category: 'planet' as Category, visual: 'planet' as Visual,
    position: { kind: 'planet', body: id as string } as PositionSpec, parents: ['sun'], memberOf: ['solar-system'], nearby: [],
    displayRadiusAU: (rKm as number) / KM_PER_AU, extentLy: ((rKm as number) * 2 * LY_PER_AU) / KM_PER_AU, color: color as string, provenance: 'computed-model' as Provenance, confidence: 'medium' as const,
    source: { catalogue: 'JPL approximate Keplerian elements (1800–2050); NASA planetary fact sheets', note: 'Position is an approximate model, not JPL Horizons.' },
    info: info as string, props: props as Record<string, string>, importance: id === 'earth' || id === 'jupiter' || id === 'saturn' ? 0.9 : 0.6,
    viewDistanceLy: (id === 'saturn' ? 350000 : (rKm as number) * 3.5) * (LY_PER_AU / KM_PER_AU),
  } as CosmicObject)),
  ...SOLAR_BODIES.map(solarBodyToCosmicObject),
]

export const BY_ID: Record<string, CosmicObject> = Object.fromEntries(OBJECTS.map((o) => [o.id, o]))

export const KM_TO_LY = LY_PER_AU / KM_PER_AU

export function solarBodyToCosmicObject(b: SolarBody): CosmicObject {
  const isMoon = b.cls === 'moon'
  const rKm = b.physical.meanRadiusKm
  const extentLy = (rKm * 2 * LY_PER_AU) / KM_PER_AU
  const viewDistanceLy = Math.max((rKm * 3.5 * LY_PER_AU) / KM_PER_AU, 5e-12)

  const props: Record<string, string> = {
    'Mean radius': `${rKm.toLocaleString()} km${b.physical.radiusSigmaKm ? ` ± ${b.physical.radiusSigmaKm} km` : ''}`,
  }
  if (b.physical.triaxialKm) {
    props['Triaxial shape'] = `${b.physical.triaxialKm.map((x) => x.toFixed(1)).join(' × ')} km`
  }
  if (b.physical.gmKm3s2) {
    props['GM (mass parameter)'] = `${b.physical.gmKm3s2.toFixed(5)} km³/s²`
  }
  if (b.physical.densityGcc) {
    props['Bulk density'] = `${b.physical.densityGcc.toFixed(3)} g/cm³`
  }
  if (b.rotation.kind === 'synchronous') {
    props['Rotation'] = 'Synchronous (tidally locked to primary)'
  } else if (b.rotation.kind === 'synchronous-binary') {
    props['Rotation'] = `Mutually tidally locked with ${b.rotation.companion}`
  } else if (b.rotation.kind === 'spin') {
    props['Rotation period'] = `${b.rotation.periodHours.toFixed(2)} h`
  } else {
    props['Rotation'] = b.rotation.kind
  }

  props['Semi-major axis'] = `${b.orbit.elements.aKm.toLocaleString()} km (${(b.orbit.elements.aKm / KM_PER_AU).toFixed(4)} AU)`
  props['Eccentricity'] = b.orbit.elements.e.toFixed(4)
  props['Inclination'] = `${b.orbit.elements.iDeg.toFixed(2)}°`
  props['Orbital period'] = `${periodDays(b.orbit.elements).toFixed(3)} d`
  props['Periapsis'] = `${periapsisKm(b.orbit.elements).toLocaleString()} km`
  props['Apoapsis'] = `${apoapsisKm(b.orbit.elements).toLocaleString()} km`
  props['Reference frame'] = b.orbit.frameLabel

  return {
    id: b.id,
    name: b.name,
    aliases: b.aliases,
    category: (b.cls === 'dwarf-planet' ? 'dwarf-planet' : b.cls === 'asteroid' ? 'asteroid' : 'moon') as Category,
    visual: 'planet',
    position: { kind: 'solar-body', id: b.id },
    parents: [b.parent],
    memberOf: isMoon ? [b.parent] : ['solar-system'],
    nearby: [],
    extentLy,
    displayRadiusAU: rKm / KM_PER_AU,
    color: b.appearance.color,
    provenance: 'computed-model',
    confidence: b.confidence,
    source: {
      catalogue: b.orbit.source,
      note: b.notes ? b.notes.join(' ') : b.orbit.uncertainty,
    },
    info: b.info,
    props,
    importance: b.importance,
    viewDistanceLy,
  }
}

export function solarBodyRootPos(b: SolarBody, ms: number): Vec3 {
  if (b.parent === 'sun') {
    if (b.id === 'pluto') {
      const bary = add(SUN_POS, scale(positionAtMs(PLUTO_BODY.orbit.elements, ms), KM_TO_LY))
      const charonRel = positionAtMs(SOLAR_BODY_BY_ID.charon.orbit.elements, ms)
      const plutoOffset = scale(charonRel, (-CHARON_PLUTO_MASS_RATIO / (1 + CHARON_PLUTO_MASS_RATIO)) * KM_TO_LY)
      return add(bary, plutoOffset)
    }
    const relKm = positionAtMs(b.orbit.elements, ms)
    return add(SUN_POS, scale(relKm, KM_TO_LY))
  }
  if (b.parent === 'pluto') {
    const bary = add(SUN_POS, scale(positionAtMs(PLUTO_BODY.orbit.elements, ms), KM_TO_LY))
    if (b.id === 'charon') {
      const charonRel = positionAtMs(b.orbit.elements, ms)
      const charonOffset = scale(charonRel, (1 / (1 + CHARON_PLUTO_MASS_RATIO)) * KM_TO_LY)
      return add(bary, charonOffset)
    }
    const relKm = positionAtMs(b.orbit.elements, ms)
    return add(bary, scale(relKm, KM_TO_LY))
  }
  const planetPos = planetRootPos(b.parent, ms)
  const relKm = positionAtMs(b.orbit.elements, ms)
  return add(planetPos, scale(relKm, KM_TO_LY))
}

export const MOON_DISPLAY_AU = 0.03

const posCache = new Map<string, Vec3>()
let frameCacheMs = -1
const frameDynamicPosCache = new Map<string, Vec3>()

/** Root-frame position (galactic ly). Time-dependent for planets/moon/solar bodies. */
export function positionOf(o: CosmicObject, ms: number): Vec3 {
  const p = o.position
  switch (p.kind) {
    case 'origin': return [0, 0, 0]
    case 'sun': return SUN_POS
    case 'planet':
    case 'moon':
    case 'solar-body': {
      if (ms !== frameCacheMs) {
        frameCacheMs = ms
        frameDynamicPosCache.clear()
      } else {
        const cached = frameDynamicPosCache.get(o.id)
        if (cached) return cached
      }

      let res: Vec3
      if (p.kind === 'planet') {
        res = planetRootPos(p.body, ms)
      } else if (p.kind === 'moon') {
        const b = SOLAR_BODY_BY_ID.moon
        if (b) res = solarBodyRootPos(b, ms)
        else res = add(planetRootPos(p.parent, ms), moonOffsetLy(ms, MOON_DISPLAY_AU))
      } else {
        const b = SOLAR_BODY_BY_ID[p.id]
        if (!b) return SUN_POS
        res = solarBodyRootPos(b, ms)
      }
      frameDynamicPosCache.set(o.id, res)
      return res
    }
    case 'offset': {
      return positionOf(BY_ID[p.from], ms)
    }
    default: {
      const hit = posCache.get(o.id)
      if (hit) return hit
      const v = p.kind === 'equatorial'
        ? raDecDistToRoot(p.raDeg, p.decDeg, p.distanceLy)
        : sunRelativeToRoot(galacticLBToUnit(p.lDeg, p.bDeg), p.distanceLy)
      posCache.set(o.id, v)
      return v
    }
  }
}

export const isDynamic = (o: CosmicObject) =>
  o.position.kind === 'planet' || o.position.kind === 'moon' || o.position.kind === 'solar-body'

/** Visual radius in ly (extent/2 or exaggerated display radius). */
export function radiusLyOf(o: CosmicObject): number {
  if (o.displayRadiusAU) return o.displayRadiusAU * LY_PER_AU
  if (o.extentLy) return o.extentLy / 2
  return 0
}

export function searchObjects(q: string, list: CosmicObject[] = OBJECTS): CosmicObject[] {
  const raw = q.trim().toLowerCase()
  const n = normalizeName(q)
  if (!n) return []
  const tokens = raw.split(/\s+/).filter(Boolean)
  return list
    .map((o) => {
      const allNames = [o.name, o.id, ...o.aliases]
      const namesNorm = allNames.map(normalizeName)
      let score = 0
      if (namesNorm.some((x) => x === n)) score = 5
      else if (namesNorm.some((x) => x.startsWith(n))) score = 4
      else if (allNames.some((name) => tokens.every((tok) => name.toLowerCase().includes(tok)))) score = 3
      else if (namesNorm.some((x) => x.includes(n))) score = 2
      else if (tokens.some((tok) => namesNorm.some((x) => x.includes(tok)))) score = 1
      return { o, score }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.o.importance - a.o.importance)
    .map((r) => r.o)
}

export function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function childrenOf(id: string): CosmicObject[] {
  return OBJECTS.filter((o) => o.parents.includes(id) || o.memberOf.includes(id))
}
