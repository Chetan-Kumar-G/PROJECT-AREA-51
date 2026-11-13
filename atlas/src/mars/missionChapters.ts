/**
 * MARS MISSION STORIES — chapters and a chronological timeline for every explorable Mars mission (audit S1).
 *
 * Built from two things only:
 *   1. the sourced catalogue (missions/catalog/mars.ts milestones, landing / end / status facts, the hardware records'
 *      design, components and findings) — placed into chapters automatically;
 *   2. CURATED lines below: each one restates, in plain words, a statement read on the cited page on 2026-11-12
 *      (NASA Science mission pages and NSSDCA records already in missions/sources.ts). Numbers and dates are copied,
 *      never rounded into something the page does not say. Where a page is silent (e.g. no deployment dates for
 *      InSight's instruments), the chapter says nothing rather than guessing.
 *
 * Every line carries its sources and what kind of knowledge it is:
 *   record          — what the mission record says happened
 *   derived         — computed here from records (e.g. launch → landing days)
 *   reconstruction  — what the 3-D scene shows, and how it was rebuilt
 * A chapter with nothing sourced is left out, and listed as "not yet sourced" — never filled with generic text.
 */
import { MISSION_BY_ID, OBJECT_BY_ID, dateMs, type Milestone } from '../missions'
import { SITE_DISCOVERIES } from '../discovery/siteDiscoveries'
import { UNITY_SITES } from '../surface/sites'

export type ChapterId = 'intro' | 'journey' | 'edl' | 'deployment' | 'science' | 'discoveries' | 'milestones' | 'challenges' | 'conclusion' | 'legacy'
export const CHAPTERS: { id: ChapterId; title: string }[] = [
  { id: 'intro', title: 'Introduction' },
  { id: 'journey', title: 'Launch and journey to Mars' },
  { id: 'edl', title: 'Entry, descent and landing' },
  { id: 'deployment', title: 'Deployment' },
  { id: 'science', title: 'Science operations' },
  { id: 'discoveries', title: 'Discoveries' },
  { id: 'milestones', title: 'Milestones' },
  { id: 'challenges', title: 'Challenges' },
  { id: 'conclusion', title: 'Conclusion' },
  { id: 'legacy', title: 'Legacy' },
]

export type Knowledge = 'record' | 'derived' | 'reconstruction'
export interface StoryItem {
  id: string
  chapter: ChapterId
  /** ISO date (UTC) when the line is about a dated moment; month-only allowed ("2005-01") */
  date?: string
  title?: string
  text: string
  sources: string[]
  knowledge: Knowledge
  /** where it happened relative to the explorable scene: 'here' = at this landing site as the scene shows it */
  where?: 'here' | 'earth' | 'cruise' | 'elsewhere-on-mars'
}

type Curated = Omit<StoryItem, 'id' | 'knowledge'> & { knowledge?: Knowledge }

const C: Record<string, Curated[]> = {
  'viking-1': [
    { chapter: 'edl', text: 'An aeroshell with a heat shield slowed the lander through the atmosphere. Parachutes opened 6 km up, and retro-rockets fired from 1.5 km until touchdown 40 seconds later at about 2.4 m/s.', sources: ['nssdca-viking1-lander'], where: 'here' },
    { chapter: 'edl', title: 'First picture from the surface', date: '1976-07-20T11:53:06Z', text: 'The first picture from the surface started to arrive 25 seconds after landing.', sources: ['nssdca-viking1-lander'], where: 'here' },
    { chapter: 'science', text: 'Two cameras scanned all the way around. A sampler arm with a scoop, a temperature sensor and a magnet reached the soil, and a weather boom measured temperature and wind.', sources: ['nssdca-viking1-lander'] },
    { chapter: 'science', text: 'Inside, a sealed compartment held the biology experiment and a gas chromatograph mass spectrometer to analyse soil samples.', sources: ['nssdca-viking1-lander'] },
    { chapter: 'challenges', text: 'The seismometer never unlocked from its launch position, and a stuck locking pin on the sampler arm took 5 days to shake loose. Everything else worked normally.', sources: ['nssdca-viking1-lander'] },
    { chapter: 'legacy', title: 'Thomas Mutch Memorial Station', date: '1981-01', text: 'In January 1981 the lander was named the Thomas Mutch Memorial Station, after the first leader of the Viking imaging team.', sources: ['nssdca-viking1-lander'] },
  ],
  'viking-2': [
    { chapter: 'edl', title: 'Touchdown in Utopia Planitia', date: '1976-09-03', text: 'The lander separated from its orbiter at 20:19 UT on 3 September 1976 and, after entering the atmosphere, landed safely at 22:37:50 UT.', sources: ['nasa-viking-2'], where: 'here' },
    { chapter: 'science', text: 'It carried two cameras, a biology laboratory, a seismometer and a weather station measuring temperature, pressure and wind.', sources: ['nasa-viking-2'] },
    { chapter: 'science', title: 'Testing the soil for life', date: '1976-09-12', text: 'From 12 September 1976 its biology experiments tested soil scooped up on three occasions.', sources: ['nasa-viking-2'], where: 'here' },
    { chapter: 'discoveries', text: 'Like its twin, the biology results were inconclusive about whether life exists, or ever existed, on the surface of Mars.', sources: ['nasa-viking-2'] },
    { chapter: 'discoveries', text: 'The two Viking landers returned 4,500 photos of their landing sites.', sources: ['nasa-viking-2'] },
    { chapter: 'milestones', title: 'Goals accomplished', date: '1976-11-16', text: 'NASA announced that both Viking missions had accomplished their goals, and extended them until May 1978.', sources: ['nasa-viking-2'] },
    { chapter: 'legacy', title: 'Gerald Soffen Memorial Station', date: '2001-07', text: 'In July 2001 the Viking 2 lander was renamed the Gerald Soffen Memorial Station.', sources: ['nasa-viking-2'] },
  ],
  'mars-pathfinder': [
    { chapter: 'intro', text: 'Mars Pathfinder was first designed as a technology demonstration: a new way to land on Mars, carrying an instrumented lander and a small rover.', sources: ['nasa-mars-pathfinder'] },
    { chapter: 'edl', title: 'Airbag landing', date: '1997-07-04', text: 'It landed inside a giant cushion of airbags, the first time this technique was used, and bounced like a beach ball about 15 times, up to 15 metres high.', sources: ['nasa-mars-pathfinder'], where: 'here' },
    { chapter: 'deployment', title: 'Sojourner rolls off', date: '1997-07-05', text: 'On the night of 5 July, late on its second Martian day, Sojourner rolled down the lander\'s rear ramp onto Mars.', sources: ['nasa-mars-pathfinder'], where: 'here' },
    { chapter: 'discoveries', text: 'Rounded pebbles and cobbles at the landing site looked like rocks formed in running water, which suggested that Mars was once warm and wet.', sources: ['nasa-mars-pathfinder'] },
    { chapter: 'discoveries', text: 'It returned more than 16,500 images from the lander and 550 from the rover.', sources: ['nasa-mars-pathfinder'] },
    { chapter: 'legacy', text: 'It proved a new way to land safely on Mars, and delivered Sojourner, the first robotic rover on the Martian surface.', sources: ['nasa-mars-pathfinder'] },
  ],
  'mer-spirit': [
    { chapter: 'edl', title: 'Parachute, rockets and airbags', date: '2004-01-03', text: 'A parachute opened, the heat shield dropped away and the lander hung below on a tether. Retro-rockets fired until it was about 8.5 m up, then four big airbags cushioned the fall.', sources: ['nasa-mer-spirit'], where: 'here' },
    { chapter: 'edl', title: '28 bounces', date: '2004-01-03', text: 'Spirit bounced 28 times and rolled to a stop about 250 to 300 metres away. Retro-rockets were needed because Mars\'s atmosphere is less than 1% as dense as Earth\'s.', sources: ['nasa-mer-spirit'], where: 'here' },
    { chapter: 'deployment', title: 'Petals open', date: '2004-01-03', text: 'About an hour and a half after landing, the lander opened its petals and the rover unfolded its solar panels.', sources: ['nasa-mer-spirit'], where: 'here' },
    { chapter: 'challenges', title: 'Flash-memory fault', date: '2004-01-21', text: 'A problem in its flash memory put Spirit into a fault mode less than three weeks after landing.', sources: ['nasa-mer-spirit'] },
    { chapter: 'milestones', title: 'First rock abrasion on Mars', date: '2004-02', text: 'It ground into a rock called Adirondack, the first time a rock had been abraded on Mars.', sources: ['nasa-mer-spirit'], where: 'here' },
    { chapter: 'discoveries', title: 'Columbia Hills bedrock', date: '2004', text: 'In the Columbia Hills it found a surprising variety of bedrock, showing a complicated geological history.', sources: ['nasa-mer-spirit'], where: 'elsewhere-on-mars' },
    { chapter: 'milestones', title: 'Dust devils clean the panels', date: '2005-03', text: 'Dust devils cleaned its solar panels, raising its power from the usual 60% to 93%.', sources: ['nasa-mer-spirit'] },
    { chapter: 'discoveries', title: 'Home Plate', date: '2006', text: 'At a bright plateau called Home Plate it found evidence of an ancient explosion.', sources: ['nasa-mer-spirit'], where: 'elsewhere-on-mars' },
    { chapter: 'discoveries', title: 'Nearly pure silica', date: '2007', text: 'Dragging a broken wheel, it scraped up nearly pure silica: strong evidence that ancient Mars was much wetter.', sources: ['nasa-mer-spirit'], where: 'elsewhere-on-mars' },
    { chapter: 'challenges', title: 'Stuck in soft soil', date: '2009-05-01', text: 'It became stuck in soft soil, with its wheels unable to get a grip.', sources: ['nasa-mer-spirit'], where: 'elsewhere-on-mars' },
    { chapter: 'challenges', title: 'Another wheel stops', date: '2009-11-28', text: 'Another wheel, the right rear one, stopped working.', sources: ['nasa-mer-spirit'] },
    { chapter: 'conclusion', text: 'Planned for 90 Martian days, Spirit worked for 6 years, 2 months and 19 days, more than 25 times longer, and drove 7.73 km.', sources: ['nasa-mer-spirit'] },
    { chapter: 'conclusion', text: 'NASA sent more than 1,300 commands to try to wake it before ending the recovery effort.', sources: ['nasa-mer-spirit'] },
    { chapter: 'legacy', text: 'Spirit uncovered strong evidence that Mars was once much wetter than it is now.', sources: ['nasa-mer-spirit'] },
  ],
  'mer-opportunity': [
    { chapter: 'edl', title: 'Airbag landing', date: '2004-01-25T04:54:00Z', text: 'Wrapped in airbags, it touched down and bounced at least 26 times. The descent went without any problems.', sources: ['nasa-opportunity'], where: 'elsewhere-on-mars' },
    { chapter: 'milestones', text: 'After driving into Victoria crater on 11 September 2007 it stayed inside for almost a year.', sources: ['nasa-opportunity'], where: 'here' },
    { chapter: 'discoveries', text: 'Opportunity found evidence that Mars may once have been able to sustain microbial life.', sources: ['nasa-opportunity'] },
    { chapter: 'challenges', title: 'Dust storms', date: '2007-07', text: 'Severe dust storms hit Mars. By 18 July 2007 its solar panels gave only 128 watt-hours a day.', sources: ['nasa-opportunity'] },
    { chapter: 'challenges', text: 'Once it got stuck with several wheels buried in sand, and was freed a few centimetres at a time.', sources: ['nasa-opportunity'] },
    { chapter: 'challenges', title: 'Memory reformatted', date: '2014-09-04', text: 'A faulty memory bank led controllers to reformat its flash memory. From May 2015 it ran using only its working memory.', sources: ['nasa-opportunity'] },
    { chapter: 'milestones', title: 'A marathon on Mars', date: '2015-03-25', text: 'It became the first human enterprise to travel more than a marathon\'s distance on another world.', sources: ['nasa-opportunity'], where: 'elsewhere-on-mars' },
    { chapter: 'milestones', title: 'Steepest slope', date: '2016-03-10', text: 'It drove up a 32-degree tilt, the steepest slope driven by any rover on Mars at the time.', sources: ['nasa-opportunity'], where: 'elsewhere-on-mars' },
    { chapter: 'legacy', text: 'It rests in Perseverance Valley, with 45.16 km on its odometer: one of the most successful and enduring missions to another planet.', sources: ['nasa-opportunity'] },
  ],
  phoenix: [
    { chapter: 'edl', title: 'Touchdown in the arctic', date: '2008-05-25T23:38:38Z', text: 'It touched down at 23:38:38 UT in the Green Valley of Vastitas Borealis: the first successful landing of a stationary lander since Viking 2, about 32 years earlier.', sources: ['nasa-phoenix'], where: 'here' },
    { chapter: 'science', title: 'First scoops', date: '2008-05-31', text: 'Its robotic arm scooped up dirt and started sampling the soil for ice.', sources: ['nasa-phoenix'], where: 'here' },
    { chapter: 'discoveries', text: 'Bright clumps in a trench dug by the arm, nicknamed "Dodo-Goldilocks", were probably water ice.', sources: ['nasa-phoenix'], where: 'here' },
    { chapter: 'discoveries', title: 'Water confirmed', date: '2008-07-31', text: 'NASA announced that a sample analysed by Phoenix\'s oven instrument (TEGA) confirmed water on Mars.', sources: ['nasa-phoenix'], where: 'here' },
    { chapter: 'discoveries', text: 'It found traces of perchlorate, a chemical that could be an energy source for microbes.', sources: ['nasa-phoenix'], where: 'here' },
    { chapter: 'conclusion', text: 'It completed its planned 90-day mission, which was then extended.', sources: ['nasa-phoenix'] },
    { chapter: 'legacy', text: 'The perchlorate result led scientists to look again at the data from the Viking landers.', sources: ['nasa-phoenix'] },
  ],
  'msl-curiosity': [
    { chapter: 'intro', text: 'Its goal: find out whether Mars was ever able to support microbial life. It was the largest and most capable rover ever sent to Mars when it launched in 2011.', sources: ['nasa-msl-curiosity'] },
    { chapter: 'discoveries', text: 'Its instruments found chemical and mineral evidence of past habitable environments on Mars.', sources: ['nasa-msl-curiosity'], where: 'elsewhere-on-mars' },
    { chapter: 'discoveries', text: 'It found the largest organic molecules discovered on Mars to date.', sources: ['nasa-msl-curiosity'], where: 'elsewhere-on-mars' },
    { chapter: 'milestones', title: '1 km up Mount Sharp', date: '2026-08-26', text: 'It had climbed 1 kilometre up the slope of Mount Sharp from the floor of Gale crater.', sources: ['nasa-msl-curiosity'], where: 'elsewhere-on-mars' },
    { chapter: 'legacy', text: 'It is still exploring the rock record from a time when Mars could have been home to microbial life.', sources: ['nasa-msl-curiosity'] },
  ],
  insight: [
    { chapter: 'intro', text: 'InSight was built to help uncover how all the rocky planets of the inner solar system formed, by studying the deep interior of Mars.', sources: ['nasa-insight'] },
    { chapter: 'edl', title: 'Landing on Elysium Planitia', date: '2018-11-26T19:52:59Z', text: 'It landed near the equator, on the western side of a flat, smooth plain called Elysium Planitia.', sources: ['nasa-insight'], where: 'here' },
    { chapter: 'deployment', text: 'Its robotic arm lifted a seismometer and a heat-flow probe off the deck and placed them on the ground.', sources: ['nasa-insight', 'nasa-insight-instruments'], where: 'here' },
    { chapter: 'science', text: 'The seismometer listened for the waves of marsquakes and the thumps of meteorite impacts. Wind, pressure, temperature and magnetic sensors helped it tell weather from quakes.', sources: ['nasa-insight-instruments'], where: 'here' },
    { chapter: 'science', text: 'A radio experiment tracked the lander\'s position precisely, to measure how much Mars\'s north pole wobbles.', sources: ['nasa-insight-instruments'] },
    { chapter: 'challenges', text: 'The heat probe, the "mole", was designed to dig almost 5 metres down. It met different soil than expected and could not reach that depth.', sources: ['nasa-insight-instruments'], where: 'here' },
  ],
}

/** components that do science (cameras, sampling, environmental and geological instruments) */
const SCIENCE_CATS = new Set(['camera', 'sampling', 'environmental', 'geological', 'instrument'])

const ICON_KIND: Record<Milestone['kind'], ChapterId> = {
  launch: 'journey', flyby: 'journey', arrival: 'journey', 'orbit-insertion': 'journey', landing: 'edl', 'surface-op': 'milestones', release: 'deployment', 'last-contact': 'conclusion', end: 'conclusion', other: 'milestones',
}

export interface MissionStory {
  missionId: string
  missionName: string
  chapters: { id: ChapterId; title: string; items: StoryItem[] }[]
  /** dated items, oldest first (the timeline) */
  timeline: StoryItem[]
  /** chapters with nothing sourced yet (shown honestly) */
  unsourced: ChapterId[]
}

const dayMs = (d: string) => dateMs(d.length === 4 ? `${d}-07-01` : d.length === 7 ? `${d}-15` : d)

/** the scene note for the reconstruction line (what the 3-D view itself is) */
function sceneLine(siteId: string | null, missionId: string): StoryItem | null {
  const site = UNITY_SITES.find((s) => s.id === siteId && s.missionIds.includes(missionId))
  if (!site) return null
  return {
    id: `${missionId}-scene`, chapter: 'intro', knowledge: 'reconstruction', where: 'here',
    text: `What you see here: ${site.scene.label.toLowerCase()} — the hardware at its sourced landing position on terrain rebuilt from USGS controlled HiRISE elevation data. ${site.scene.note}`,
    sources: [],
  }
}

export function missionStory(missionId: string, siteId: string | null = null): MissionStory | null {
  const m = MISSION_BY_ID[missionId]
  if (!m) return null
  const items: StoryItem[] = []
  const add = (it: Omit<StoryItem, 'id'>, k: string) => items.push({ id: `${missionId}-${k}`, ...it })
  add({ chapter: 'intro', text: m.summary, sources: [...new Set([...m.launch.sources])], knowledge: 'record' }, 'summary')
  const scene = sceneLine(siteId, missionId)
  if (scene) items.push(scene)
  // catalogue milestones (dated, sourced)
  m.milestones.forEach((e, i) => add({ chapter: ICON_KIND[e.kind], date: e.date, title: e.title, text: e.description, sources: e.sources, knowledge: 'record', where: e.kind === 'launch' ? 'earth' : e.kind === 'landing' ? 'here' : undefined }, `m${i}`))
  // derived: the journey's length
  if (m.launch.value && m.landing?.value) {
    const days = Math.round((dayMs(m.landing.value) - dayMs(m.launch.value)) / 86400e3)
    add({ chapter: 'journey', text: `The trip from launch to landing took about ${days} days.`, sources: [...m.launch.sources, ...m.landing.sources], knowledge: 'derived', where: 'cruise' }, 'cruise')
  }
  // the hardware records: what it carried and what it found
  const objIds = [...new Set([...(m.objectIds ?? []), ...Object.values(SITE_DISCOVERIES[siteId ?? '']?.objects ?? {})])].filter((id) => OBJECT_BY_ID[id]?.missionId === missionId)
  for (const oid of objIds) {
    const o = OBJECT_BY_ID[oid]
    const instruments = o.components.filter((c) => SCIENCE_CATS.has(c.category ?? '')).map((c) => c.name)
    if (instruments.length) add({ chapter: 'science', text: `${o.name}: ${instruments.join(', ')}.`, title: 'On board', sources: [...new Set(o.components.filter((c) => SCIENCE_CATS.has(c.category ?? '')).flatMap((c) => c.sources))], knowledge: 'record' }, `${oid}-instruments`)
    ;(o.findings ?? []).forEach((f, i) => add({ chapter: 'discoveries', text: f.text, sources: f.sources, knowledge: 'record' }, `${oid}-f${i}`))
    o.components.forEach((c) => (c.findings ?? []).forEach((f, i) => add({ chapter: 'discoveries', title: c.name, text: f.text, sources: f.sources, knowledge: 'record' }, `${oid}-${c.id}-f${i}`)))
  }
  ;(C[missionId] ?? []).forEach((c, i) => add({ ...c, knowledge: c.knowledge ?? 'record' }, `c${i}`))
  if (m.status.value) add({ chapter: 'conclusion', text: `Mission status: ${m.status.value}${m.status.note ? ` (${m.status.note})` : ''}.`, sources: m.status.sources, knowledge: 'record' }, 'status')
  // de-duplicate identical texts (a finding may be in the object and the curated list)
  const seen = new Set<string>()
  const uniq = items.filter((it) => { const k = it.text.trim().toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
  const chapters = CHAPTERS.map((c) => ({ ...c, items: uniq.filter((i) => i.chapter === c.id).sort((a, b) => (a.date && b.date ? dayMs(a.date) - dayMs(b.date) : a.date ? -1 : b.date ? 1 : 0)) }))
  return {
    missionId, missionName: m.name,
    chapters: chapters.filter((c) => c.items.length),
    timeline: uniq.filter((i) => i.date).sort((a, b) => dayMs(a.date!) - dayMs(b.date!)),
    unsourced: chapters.filter((c) => !c.items.length).map((c) => c.id),
  }
}

/** the readable date of a story item (month-only and year-only dates stay as precise as their source) */
export function storyDate(d: string): string {
  if (/^\d{4}$/.test(d)) return d
  const ms = dayMs(d)
  const dt = new Date(ms)
  if (/^\d{4}-\d{2}$/.test(d)) return dt.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) + (/T\d{2}:\d{2}/.test(d) ? ` · ${d.slice(11, 16)} UT` : '')
}

if (typeof window !== 'undefined') (window as unknown as { __marsStory?: unknown }).__marsStory = missionStory
