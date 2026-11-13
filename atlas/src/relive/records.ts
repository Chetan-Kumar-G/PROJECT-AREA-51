/**
 * Historical event records (Relive overhaul, Milestone 3): every replay event as a complete, structured record —
 * identifier, mission, name, date, timestamp at the precision the source gives (never finer), time standard, mission
 * elapsed time, duration, location, vehicle, description, sources, confidence, record class and the visual / audio
 * sequence that goes with it.
 *
 * Precision rules (the display never adds digits the source does not have):
 *   - an Apollo GET is shown exactly as "Apollo by the Numbers" prints it. That table prints every time with
 *     hundredths, so the precision is read from the value: non-zero hundredths = to 0.01 s; ':ss.00' with non-zero
 *     seconds = to the second; 'mm:00.00' = to the minute (crew activities are logged to the minute);
 *   - other times carry `precision` explicitly; an event placed only by its published ORDER shows '≈' and
 *     "time not published";
 *   - an interval known precisely whose absolute anchor is known only to the minute shows its ± uncertainty.
 */
import type { MissionEvent, MissionScript, Phase, TimePrecision, TimeStandard, EventRecordClass } from './types'
import { phaseAt } from './timeline'

export interface EventRecord {
  id: string
  missionId: string
  name: string
  /** UTC date of the event, YYYY-MM-DD */
  date: string
  /** the absolute time as shown (precision-limited, with ± and the standard) */
  timestamp: string
  /** the time verbatim from the source, if it gives one */
  published: string | null
  standard: TimeStandard
  standardLabel: string
  precision: TimePrecision
  precisionLabel: string
  uncertaintyS: number | null
  /** mission elapsed time as shown (GET for Apollo, L+ for the rest) */
  met: string
  durationS: number | null
  location: string
  vehicle: string
  description: string
  sources: string[]
  confidence: 'high' | 'medium' | 'low'
  classification: EventRecordClass
  classificationLabel: string
  /** how the time was obtained (sequence / derived events) */
  timeNote: string | null
  visual: { phaseId: string; phase: string; environment: string; shot: string | null; reconstruction: string }
  audio: string
}

const GET_RE = /^(-?)(\d{3}):(\d{2}):(\d{2})(?:\.(\d+))?$/

/** precision of an "Apollo by the Numbers" GET string */
export function getPrecision(published: string): TimePrecision {
  const m = GET_RE.exec(published)
  if (!m) return 'second'
  const [, , h, mi, s, frac = ''] = m
  if (Number(h) === 0 && Number(mi) === 0 && Number(s) === 0 && !/[1-9]/.test(frac)) return 'centisecond' // range zero: defined exactly
  if (/[1-9]/.test(frac)) return frac.length === 1 ? 'decisecond' : 'centisecond'
  if (Number(s) !== 0) return 'second'
  return 'minute'
}

export function eventPrecision(sc: MissionScript, e: MissionEvent): TimePrecision {
  if (e.precision) return e.precision
  if (e.basis === 'sequence') return 'unknown'
  if (e.published && sc.clock === 'get') return getPrecision(e.published)
  return 'second'
}

export const PRECISION_LABEL: Record<TimePrecision, string> = {
  centisecond: 'to 0.01 s', decisecond: 'to 0.1 s', second: 'to the second', minute: 'to the minute', hour: 'to the hour', day: 'date only', month: 'month only', unknown: 'time not published (placed in its published order)',
}
export const STANDARD_LABEL: Record<TimeStandard, string> = {
  GET: 'ground elapsed time from range zero (UTC from range zero + GET)',
  UTC: 'UTC as published',
  'UTC-SCET': 'UTC at the spacecraft (when it happened)',
  'UTC-ERT': 'UTC when the signal reached Earth (confirmation)',
}
export const RECORD_LABEL: Record<EventRecordClass, string> = {
  'mission-record': 'Mission record',
  'flight-reconstruction': 'Reconstructed from flight data',
  derived: 'Derived from published values',
  planned: 'Planned / design value',
  sequence: 'Order only (time not published)',
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const p2 = (n: number) => String(n).padStart(2, '0')

export function eventStandard(sc: MissionScript, e: MissionEvent): TimeStandard {
  return e.standard ?? (sc.clock === 'get' ? 'GET' : 'UTC')
}

/** the absolute (UTC) time of an event, shown no more precisely than the source gives it */
export function formatEventUtc(sc: MissionScript, e: MissionEvent): string {
  const prec = eventPrecision(sc, e)
  const ms = sc.epochMs + e.t * 1000
  const d = new Date(Math.round(ms / 10) * 10)
  const date = `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`
  const hm = `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`
  const s = p2(d.getUTCSeconds())
  // hundredths; dates before 1970 have negative epoch milliseconds, so keep the remainder positive
  const cs = String(((Math.round(ms / 10) % 100) + 100) % 100).padStart(2, '0')
  const std = eventStandard(sc, e)
  const tag = std === 'UTC-SCET' ? ' UTC (spacecraft)' : std === 'UTC-ERT' ? ' UTC (received on Earth)' : ' UTC'
  const pm = e.uncertaintyS ? ` ±${e.uncertaintyS} s` : ''
  switch (prec) {
    case 'centisecond': return `${date}, ${hm}:${s}.${cs}${tag}${pm}`
    case 'decisecond': return `${date}, ${hm}:${s}.${cs[0]}${tag}${pm}`
    case 'second': return `${date}, ${hm}:${s}${tag}${pm}`
    case 'minute': return `${date}, ${hm}${tag}${pm}`
    case 'hour': return `${date}, ${p2(d.getUTCHours())} h${tag}`
    case 'day': return date
    case 'month': return `${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`
    default: return `≈ ${date}, ${hm}${tag} (time not published)`
  }
}

/** mission elapsed time as shown: Apollo GET verbatim; long missions L+ days, truncated to the precision */
export function formatEventMet(sc: MissionScript, e: MissionEvent): string {
  const prec = eventPrecision(sc, e)
  if (sc.clock === 'get' && e.published && GET_RE.test(e.published)) return `GET ${e.published}`
  if (sc.clock === 'get' && (prec === 'day' || prec === 'month')) return `GET ≈ ${Math.floor(e.t / 3600)} h (date only)`
  if (sc.clock === 'get') {
    // a GET mission event without a published time: hours and minutes only, marked approximate
    const a = Math.abs(e.t), sg = e.t < 0 ? '-' : ''
    return `≈ GET ${sg}${String(Math.floor(a / 3600)).padStart(3, '0')}:${p2(Math.floor((a % 3600) / 60))}`
  }
  const t = Math.abs(e.t)
  const sign = e.t < 0 ? '−' : '+'
  const days = Math.floor(t / 86400), h = Math.floor((t % 86400) / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60)
  const base = `L${sign}${days} d ${p2(h)}:${p2(m)}`
  const approx = prec === 'unknown' ? '≈ ' : ''
  if (prec === 'day') return `L${sign}${days} d`
  if (prec === 'month') return `≈ L${sign}${days} d (month only)`
  if (prec === 'minute' || prec === 'unknown' || prec === 'hour') return `${approx}${base}${e.uncertaintyS ? ` ±${e.uncertaintyS} s` : ''}`
  return `${base}:${p2(s)}${e.uncertaintyS ? ` ±${e.uncertaintyS} s` : ''}`
}

function defaultRecord(e: MissionEvent): EventRecordClass {
  if (e.record) return e.record
  return e.basis === 'sourced' ? 'mission-record' : e.basis === 'derived' ? 'derived' : e.basis === 'sequence' ? 'sequence' : 'planned'
}
function defaultConfidence(e: MissionEvent, rec: EventRecordClass): 'high' | 'medium' | 'low' {
  if (e.confidence) return e.confidence
  return rec === 'mission-record' ? 'high' : rec === 'sequence' ? 'low' : 'medium'
}

export function eventRecord(sc: MissionScript, e: MissionEvent): EventRecord {
  const ph: Phase = phaseAt(sc.phases, e.t)
  const rec = defaultRecord(e)
  const prec = eventPrecision(sc, e)
  const std = eventStandard(sc, e)
  const shot = [...sc.shots].reverse().find((s) => s.t <= e.t && s.label)
  const ms = sc.epochMs + e.t * 1000
  return {
    id: e.id,
    missionId: sc.missionId,
    name: e.title,
    date: new Date(ms).toISOString().slice(0, 10),
    timestamp: formatEventUtc(sc, e),
    published: e.published ?? null,
    standard: std,
    standardLabel: STANDARD_LABEL[std],
    precision: prec,
    precisionLabel: PRECISION_LABEL[prec],
    uncertaintyS: e.uncertaintyS ?? null,
    met: formatEventMet(sc, e),
    durationS: e.durationS ?? null,
    location: e.location ?? ph.location ?? '',
    vehicle: e.vehicle ?? ph.vehicle ?? '',
    description: e.text,
    sources: e.sources,
    confidence: defaultConfidence(e, rec),
    classification: rec,
    classificationLabel: RECORD_LABEL[rec],
    timeNote: e.timeNote ?? null,
    visual: { phaseId: ph.id, phase: ph.title, environment: ph.env, shot: shot?.label ?? null, reconstruction: ph.told ? 'Told from the record over an overview view (not reconstructed in 3-D)' : 'Reconstructed 3-D sequence (not mission footage)' },
    audio: e.cue ? `Synthesised “${e.cue}” cue (sound design, not an archival recording)` : 'No cue',
  }
}

export const missionRecords = (sc: MissionScript) => sc.events.map((e) => eventRecord(sc, e))
