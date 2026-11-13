/**
 * Relive Mission overlay: the full-screen mission player.
 *
 * Layout rule: the 3-D scene is the main storyteller and gets the screen. Around it:
 *   top      one compact row — mission · phase, mission clock, sound, cinematic, events, "How do we know?", settings, return
 *   card     a small story card (story.ts: plain title + one or two sentences), placed in the screen corner farthest
 *            from the vehicle (live.subjectScreen) and chosen once per event so it never jumps; it fades after a while;
 *            explanations can be switched off
 *   bottom   transport + phase jumps in one row, the scrubbable timeline under it
 * The full sourced record of each event (time precision, confidence, vehicle, how it is drawn, sources) is never
 * removed: it is behind "How do we know?" (progressive disclosure). Cinematic mode hides everything but the scene and
 * a subtitle line; moving the pointer shows a small way out.
 *
 * "Return to explorer" restores the explorer exactly as it was (player.ts snapshot).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { ReliveScene } from './scene/ReliveScene'
import { RELIVE_SCRIPTS, SPEEDS, clock, currentEventIndex, onReliveEvent, relive, useRelive } from './player'
import { formatClock, formatUtc, playAt, sampleTrack } from './timeline'
import { missionAudio } from './audio'
import { audio } from '../audio/CosmicAudioEngine'
import { citeGroups, MISSION_BY_ID } from '../missions'
import { replayFor } from '../missionControl/missionState'
import { eventRecord } from './records'
import { live } from './scene/live'
import { PROFILES, detectGpu, effectiveProfile, quality, readQuality, writeQuality, type ReliveQuality } from './scene/quality'
import type { MissionEvent, MissionScript, TelemetryTrack } from './types'
import { useStore } from '../store/store'
import { SITE_BY_ID, UNITY_SITE_BY_ID } from '../surface/sites'
import { expedition } from '../expedition/expedition'
import { v3 } from './geo'
import { COMPLETION, CONCLUSIONS, storyFor, timeKnownAs } from './story'
import './relive.css'

const ICON: Record<MissionEvent['kind'], string> = {
  discovery: '◈',
  countdown: '◷', ignition: '▲', liftoff: '▲', staging: '⇊', jettison: '✂', cutoff: '■', burn: '➶', orbit: '◌', docking: '⧉',
  separation: '⇵', coast: '…', landing: '⬇', surface: '▪', entry: '↘', parachute: '☂', splashdown: '≈', deploy: '⛭', comms: '◉', end: '◆',
}

const STATUS: Record<string, string> = { completed: 'Completed', ended: 'Ended', operating: 'Operating', lost: 'Lost', unknown: 'Unknown' }
const pubDate = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(iso)
  if (!m) return iso
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m[2]) - 1]
  // as precise as published: a date-only value gets no time of day
  return `${Number(m[3])} ${mon} ${m[1]}${m[4] ? `, ${m[4]}:${m[5]}${m[6] ? ':' + m[6] : ''} UTC` : ''}`
}

const pref = {
  get(key: string, dflt: boolean) { try { const v = window.localStorage.getItem(key); return v === null ? dflt : v === '1' } catch { return dflt } },
  set(key: string, v: boolean) { try { window.localStorage.setItem(key, v ? '1' : '0') } catch { /* private mode */ } },
}
const STORY_KEY = 'abnf.relive.explanations'

/** the mission's actual end (catalogue) and where this replay stops — shown under "How do we know?" on the end screen */
function HistoricalEnding({ script }: { script: MissionScript }) {
  const m = MISSION_BY_ID[script.missionId]
  const r = replayFor(script.missionId)
  const last = script.events[script.events.length - 1]
  if (!m) return null
  return (
    <dl className="relive-final" data-testid="relive-final">
      <div><dt>Final status</dt><dd>{STATUS[m.status.value ?? 'unknown']}{m.end?.value ? ` · ${pubDate(m.end.value)}` : ''}{m.end?.note ? ` — ${m.end.note}` : ''} <Cite ids={[...m.status.sources, ...(m.end?.sources ?? [])]} /></dd></div>
      <div><dt>Last replayed event</dt><dd>{last.title} · {eventRecord(script, last).timestamp}</dd></div>
      {r?.coverage === 'partial' && <div><dt>Not replayed</dt><dd>{r.notReplayed}</dd></div>}
      {r?.note && <div><dt>How it is shown</dt><dd>{r.note}</dd></div>}
    </dl>
  )
}

const AUTO_KEY = 'cosmic-atlas.relive.autoReturn'
const readAuto = () => { try { return window.localStorage.getItem(AUTO_KEY) === '1' } catch { return false } }
const AUTO_SEC = 10

/** "return to the present automatically": a per-browser choice; when on, a countdown the user can stop */
function AutoReturn({ label, onReturn }: { label: string; onReturn: () => void }) {
  const [auto, setAuto] = useState(readAuto)
  const [left, setLeft] = useState<number | null>(auto ? AUTO_SEC : null)
  const go = useRef(onReturn)
  go.current = onReturn
  useEffect(() => {
    if (left === null) return
    if (left <= 0) { go.current(); return }
    const t = window.setTimeout(() => setLeft(left - 1), 1000)
    return () => window.clearTimeout(t)
  }, [left])
  const toggle = (on: boolean) => {
    setAuto(on)
    try { window.localStorage.setItem(AUTO_KEY, on ? '1' : '0') } catch { /* private mode */ }
    setLeft(on ? AUTO_SEC : null)
  }
  return (
    <div className="relive-auto" data-testid="relive-auto">
      <label><input type="checkbox" checked={auto} onChange={(e) => toggle(e.target.checked)} data-testid="relive-auto-toggle" /> Return automatically when a replay ends</label>
      {left !== null && (
        <span className="small" data-testid="relive-auto-countdown">
          {label.replace(/^⟲ /, '')} in <b>{left} s</b> <button className="btn ghost small" onClick={() => setLeft(null)} data-testid="relive-auto-stay">Stay here</button>
        </span>
      )}
    </div>
  )
}

function Cite({ ids }: { ids: string[] }) {
  return (
    <span className="relive-cite">
      {citeGroups(ids).map((g) => <a key={g.label} href={g.url} target="_blank" rel="noreferrer" title={g.titles}>[{g.label}]</a>)}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────── telemetry (only when it has something to say)

function fmtValue(tr: TelemetryTrack, v: number): string {
  if (tr.name === 'altitude' || (tr.name === 'distance' && !tr.frame.startsWith('from the centre')))
    return v >= 10000 ? `${(v / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })} km` : `${Math.round(v).toLocaleString('en-US')} m`
  if (tr.name === 'speed') return v >= 1000 ? `${(v / 1000).toFixed(1)} km/s` : `${Math.round(v)} m/s`
  return `${Math.round(v).toLocaleString('en-US')} km`
}
const teleLabel = (tr: TelemetryTrack) =>
  tr.name === 'speed' ? 'Speed' : tr.name === 'distance' ? (tr.frame.startsWith('from the centre') ? 'Distance from the centre of Mars' : 'Height above Earth') : 'Height above the ground'

/** expeditions: the conceptual flight's own values, labelled as simulated */
function ComputedTelemetry({ script, t }: { script: MissionScript; t: number }) {
  const f = script.frame!(t)
  const body = f.env === 'earth' ? 'Earth' : f.env === 'moon' ? 'the Moon' : f.env.startsWith('mars') ? 'Mars' : f.env === 'cislunar' ? 'Earth' : null
  const alt = f.env === 'interplanetary' ? null : f.alt
  const sp = v3.len(f.vel)
  return (
    <section className="relive-tele glass" aria-label="Flight values (simulated)" data-testid="relive-telemetry" title="Simulated with two-body physics around the real Earth, Moon and Mars positions; the vehicle and its sequence are conceptual.">
      {alt !== null && body && (
        <div className="relive-tele-row"><span className="k">Height above {body}</span><b className="v">{alt >= 10000 ? `${Math.round(alt / 1000).toLocaleString('en-US')} km` : `${Math.round(alt)} m`}</b></div>
      )}
      <div className="relive-tele-row"><span className="k">Speed</span><b className="v">{sp >= 1000 ? `${(sp / 1000).toFixed(1)} km/s` : `${Math.round(sp)} m/s`}</b></div>
      <span className="tag">simulated</span>
    </section>
  )
}

/** historical values: shown only when a published value covers this moment (no empty boxes, nothing invented) */
function teleRows(script: MissionScript, t: number) {
  return (['altitude', 'speed', 'distance'] as const).map((n) => {
    for (const tr of script.telemetry.filter((x) => x.name === n)) {
      const s = sampleTrack(tr, t)
      if (s) return { tr, s }
    }
    return null
  }).filter(Boolean) as { tr: TelemetryTrack; s: { v: number; exact: boolean } }[]
}

function Telemetry({ script, t }: { script: MissionScript; t: number }) {
  const rows = teleRows(script, t)
  if (!rows.length) return null
  return (
    <section className="relive-tele glass" aria-label="Historical values" data-testid="relive-telemetry">
      {rows.map(({ tr, s }) => (
        <div key={tr.name + tr.frame} className="relive-tele-row" title={`${tr.frame}. ${s.exact ? 'Published value.' : 'Between two published values.'}`}>
          <span className="k">{teleLabel(tr)}</span>
          <b className="v">{s.exact ? '' : 'about '}{fmtValue(tr, s.v)}</b>
        </div>
      ))}
      <span className="tag ok" title="Values from the mission record; between published points they are estimated">historical</span>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────── story card + "How do we know?"

type Corner = 'bl' | 'br' | 'tl' | 'tr'
/** the corner farthest from the framed subject; when the subject fills the screen, the lower-left (a consistent spot) */
function pickCorner(): Corner {
  // the subject as a box in screen pixels (centre ± its framing radius), compared with each place the card can go:
  // the card goes where it overlaps the subject least (ties: bottom-left, bottom-right, top-left, top-right)
  const W = window.innerWidth, H = window.innerHeight
  const { x, y, r } = live.subjectScreen
  const cx = ((x + 1) / 2) * W, cy = ((1 - y) / 2) * H, rad = (r * H) / 2
  const R = live.subjectRect
  // the parts' projected box (tight), else a circle around the centre; padded a little so the card keeps its distance
  const pad = 12
  // (the box is built from part positions, so it has no width when the parts line up: widen it by the measured radius)
  const sub = R
    ? [Math.min(((R[0] + 1) / 2) * W, cx - rad * 0.6) - pad, ((1 - R[3]) / 2) * H - pad, Math.max(((R[2] + 1) / 2) * W, cx + rad * 0.6) + pad, ((1 - R[1]) / 2) * H + pad]
    : [cx - rad, cy - rad, cx + rad, cy + rad]
  const phone = W <= 560
  const cw = phone ? W - 16 : 350, ch = phone ? 150 : 170
  const bottomY = H - (phone ? 92 : 104) - ch, topY = phone ? 62 : 70
  const rects: [Corner, number, number][] = phone
    ? [['bl', 8, bottomY], ['tl', 8, topY]]
    : [['bl', 10, bottomY], ['br', W - 10 - cw, bottomY], ['tl', 10, topY], ['tr', W - 10 - cw, topY]]
  let best: Corner = 'bl', bo = Infinity
  const overlap: Partial<Record<Corner, number>> = {}
  for (const [c, rx, ry] of rects) {
    const ox = Math.max(0, Math.min(sub[2], rx + cw) - Math.max(sub[0], rx))
    const oy = Math.max(0, Math.min(sub[3], ry + ch) - Math.max(sub[1], ry))
    const o = ox * oy
    overlap[c] = o / (cw * ch)
    if (o < bo - 1) { bo = o; best = c }
  }
  lastOverlap = overlap
  return best
}
/** share of the card's area each place covered at the last pick (phones map tr→tl, br→bl) */
let lastOverlap: Partial<Record<Corner, number>> = {}
const coverOf = (c: Corner) => lastOverlap[c] ?? lastOverlap[c[0] === 't' ? 'tl' : 'bl'] ?? 0

function StoryCard({ script, i, corner, compact, onClose, onKnow }: { script: MissionScript; i: number; corner: Corner; compact: boolean; onClose: () => void; onKnow: () => void }) {
  const e = script.events[i]
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [i])
  if (!e) return null
  const s = storyFor(script, e)
  const conceptual = e.basis === 'conceptual' || script.kind === 'expedition'
  // compact: every place on screen would cover the vehicle, so only the title shows (tap it for the explanation)
  const mini = compact && !open
  return (
    <article className={'relive-card glass c-' + corner + (mini ? ' mini' : '')} data-testid="relive-card" data-corner={corner} data-compact={mini ? 'on' : undefined} aria-live="polite" data-event={e.id} key={e.id}>
      <header>
        <span className="ico" aria-hidden>{ICON[e.kind]}</span>
        {mini ? <button className="linkish mini-t" onClick={() => setOpen(true)} aria-expanded={false} title="Show the explanation">{s.title} <span aria-hidden>▸</span></button> : <b>{s.title}</b>}
        <button className="x" onClick={onClose} aria-label="Hide this explanation">×</button>
      </header>
      {!mini && <p>{s.text}</p>}
      {!mini && s.why && <p className="why" data-testid="story-why"><b>Why it mattered:</b> {s.why}</p>}
      {!mini && s.term && <p className="term">This step is called <i>{s.term}</i>.</p>}
      {!mini && <footer>
        {conceptual ? <span className="concept">Conceptual flight · not a real mission</span> : (
          <button className="linkish" onClick={onKnow} data-testid="relive-card-know">How do we know?</button>
        )}
      </footer>}
    </article>
  )
}

/** the full sourced record of one event, in plain words first (progressive disclosure) */
function EventEvidence({ script, e }: { script: MissionScript; e: MissionEvent }) {
  const r = eventRecord(script, e)
  return (
    <section className="relive-evidence" data-testid="relive-evidence">
      <h4>{e.title}</h4>
      <p>{e.text} <Cite ids={e.sources} /></p>
      <p className="plain">{timeKnownAs(r.precision, e.basis)}</p>
      <p className="plain">{r.visual.reconstruction.startsWith('Reconstructed') || /reconstruct/i.test(r.visual.reconstruction)
        ? 'The 3-D scene is a reconstruction built from the mission record. It is not NASA film footage.'
        : r.visual.reconstruction}{' '}The sound is recreated, not recorded on the mission.</p>
      <details>
        <summary>Full record</summary>
        <dl className="relive-rec" data-testid="relive-card-record" data-precision={r.precision} data-class={r.classification}>
          <div><dt>Time</dt><dd data-testid="relive-card-time">{r.timestamp} · {r.met}</dd></div>
          <div><dt>Precision</dt><dd>{r.precisionLabel} · {r.standardLabel}{r.published ? <> · published as “{r.published}”</> : null}</dd></div>
          {r.durationS !== null && <div><dt>Duration</dt><dd>about {r.durationS} s</dd></div>}
          <div><dt>Where</dt><dd>{r.location}</dd></div>
          <div><dt>Vehicle</dt><dd>{r.vehicle}</dd></div>
          <div><dt>Record</dt><dd>{r.classificationLabel} · confidence: {r.confidence}</dd></div>
          {r.timeNote && <div><dt>How timed</dt><dd>{r.timeNote}</dd></div>}
          <div><dt>Shown as</dt><dd>{r.visual.reconstruction} · {r.audio}</dd></div>
        </dl>
      </details>
    </section>
  )
}

/** "How do we know?" — this event's evidence, then how the whole replay is built and every source */
function KnowPanel({ script, eventIdx, onClose }: { script: MissionScript; eventIdx: number; onClose: () => void }) {
  const allSources = useMemo(() => [...new Set(script.events.flatMap((e) => e.sources).concat(script.telemetry.flatMap((t) => t.sources)))], [script])
  const e = eventIdx >= 0 ? script.events[eventIdx] : null
  const exp = script.kind === 'expedition'
  return (
    <aside className="relive-info glass" data-testid="relive-info-panel" aria-label="How do we know?">
      <header><b>How do we know?</b><button className="x" onClick={onClose} aria-label="Close">×</button></header>
      {exp ? (
        <p>This is a <b>conceptual</b> expedition: the craft, the rover THEIA and the flight are imagined, not a real mission. The planets, the Moon and their positions are real; the flight values are simulated with real physics.</p>
      ) : (
        <>
          {e && <EventEvidence script={script} e={e} />}
          <h5>How this replay is built</h5>
          <p className="small">{script.epochNote}</p>
          <p className="small">
            {script.events.filter((x) => x.basis === 'sourced').length} event times come straight from NASA records, {script.events.filter((x) => x.basis === 'derived').length} are
            worked out from other published times, and {script.events.filter((x) => x.basis === 'sequence').length} have no published time (only their order is known).
          </p>
          <h5>Drawn without a source</h5>
          <ul>
            {script.illustrative.map((x, i) => <li key={i}>{x}</li>)}
            {script.phases.some((p) => p.env === 'mars-surface' || p.env === 'mars-descent') && (
              <li>Presentation on the Mars surface: at night, and while time is fast-forwarded, the scene is lit from the Sun’s real direction but higher in the sky, so the hardware stays visible instead of going black or flashing between day and night.</li>
            )}
          </ul>
          <h5>Sources</h5>
          <ul className="small">{citeGroups(allSources).map((g) => <li key={g.label}><a href={g.url} target="_blank" rel="noreferrer">{g.label}</a> — {g.titles}</li>)}</ul>
        </>
      )}
    </aside>
  )
}

// ─────────────────────────────────────────────────────────────── events list and timeline

/** every event of the mission, by phase, in plain titles; click to jump */
function EventList({ script, current, onClose }: { script: MissionScript; current: number; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.querySelector('.on')?.scrollIntoView({ block: 'nearest' })
  }, [current])
  return (
    <aside className="relive-events glass" data-testid="relive-events" aria-label="Mission events">
      <header><b>Events</b><span className="muted small">{script.events.length} · click to jump</span><button className="x" onClick={onClose} aria-label="Close the event list">×</button></header>
      <div className="relive-events-body" ref={ref}>
        {script.phases.map((p) => {
          const evs = script.events.map((e, i) => ({ e, i })).filter(({ e }) => e.t >= p.t0 && (e.t < p.t1 || p === script.phases[script.phases.length - 1]))
          if (!evs.length) return null
          return (
            <section key={p.id}>
              <button className="ph-h" onClick={() => relive.seekPhase(p.id)} title="Jump to the start of this part">{p.title}</button>
              <ol>
                {evs.map(({ e, i }) => (
                  <li key={e.id}>
                    <button className={i === current ? 'on' : ''} onClick={() => relive.seekEvent(i)} data-testid={`relive-ev-${e.id}`} aria-current={i === current ? 'true' : undefined} title={e.title}>
                      <span className="ev-ic" aria-hidden>{ICON[e.kind]}</span>
                      <span className="ev-t">{storyFor(script, e).title}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )
        })}
      </div>
    </aside>
  )
}

function Timeline({ script, u, L }: { script: MissionScript; u: number; L: number }) {
  const bar = useRef<HTMLDivElement>(null)
  const drag = useRef(false)
  const seekAt = (x: number) => {
    const r = bar.current!.getBoundingClientRect()
    relive.seek(Math.max(0, Math.min(1, (x - r.left) / r.width)) * L)
  }
  const phases = useMemo(() => script.phases.map((p) => ({ p, a: playAt(script.segments, p.t0) / L, b: playAt(script.segments, p.t1) / L })), [script, L])
  const ticks = useMemo(() => script.events.map((e, i) => ({ e, i, x: playAt(script.segments, e.t) / L, title: storyFor(script, e).title })), [script, L])
  const S = useRelive()
  const cur = currentEventIndex(S)
  return (
    <div className="relive-tl" data-testid="relive-timeline">
      <div
        className="relive-tl-bar"
        ref={bar}
        role="slider"
        aria-label="Mission timeline"
        aria-valuemin={0}
        aria-valuemax={Math.round(L)}
        aria-valuenow={Math.round(u)}
        aria-valuetext={formatClock(script.clock, S.t)}
        tabIndex={0}
        onKeyDown={(ev) => {
          if (ev.key === 'ArrowRight') { ev.preventDefault(); ev.stopPropagation(); relive.seek(Math.min(L, u + L / 100)) }
          else if (ev.key === 'ArrowLeft') { ev.preventDefault(); ev.stopPropagation(); relive.seek(Math.max(0, u - L / 100)) }
        }}
        onPointerDown={(ev) => { drag.current = true; (ev.target as HTMLElement).setPointerCapture?.(ev.pointerId); seekAt(ev.clientX) }}
        onPointerMove={(ev) => { if (drag.current) seekAt(ev.clientX) }}
        onPointerUp={() => { drag.current = false }}
      >
        <div className="fill" style={{ width: `${(u / L) * 100}%` }} />
        {phases.map(({ p, a, b }) => (
          <div key={p.id} className={'ph ' + (S.phaseId === p.id ? 'on' : '')} style={{ left: `${a * 100}%`, width: `${(b - a) * 100}%` }} title={p.title}>
            {(b - a) > 0.06 && <span>{p.title}</span>}
          </div>
        ))}
        {ticks.map(({ e, i, x, title }) => (
          <button key={e.id} className={'tick' + (i === cur ? ' on' : '')} style={{ left: `${x * 100}%` }} title={title} aria-label={title}
            onPointerDown={(ev) => ev.stopPropagation()} onClick={() => relive.seekEvent(i)} />
        ))}
        <div className="head" style={{ left: `${(u / L) * 100}%` }} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────── settings menu

function Settings({ qmode, setQmode, profileLabel, vol, setVol, freeCam, setFreeCam, onClose }: {
  qmode: ReliveQuality; setQmode: (q: ReliveQuality) => void; profileLabel: string; vol: number; setVol: (v: number) => void
  freeCam: boolean; setFreeCam: (b: boolean) => void; onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const down = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node) && !(e.target as HTMLElement).closest?.('[data-testid=relive-settings]')) onClose() }
    window.addEventListener('pointerdown', down)
    return () => window.removeEventListener('pointerdown', down)
  }, [onClose])
  return (
    <div className="relive-menu glass" ref={ref} role="menu" aria-label="Player settings" data-testid="relive-settings-menu">
      <label className="relive-q" title={`Auto starts at ${profileLabel} and adapts the resolution to keep playback smooth.`}>
        <span>Quality</span>
        <select value={qmode} onChange={(e) => { const q = e.target.value as ReliveQuality; writeQuality(q); setQmode(q) }} data-testid="relive-quality" aria-label="Render quality">
          <option value="auto">Auto · {profileLabel}</option>
          <option value="balanced">Balanced</option>
          <option value="high">High</option>
          <option value="ultra">Ultra</option>
        </select>
        <span className="relive-fps" data-testid="relive-fps">{quality.fps ? `${quality.fps} fps` : ''}{qmode === 'auto' && quality.scale < 1 ? ` · ${Math.round(quality.scale * 100)} %` : ''}</span>
      </label>
      <label className="relive-vol"><span>Volume</span><input type="range" min={0} max={100} value={vol} onChange={(e) => setVol(Number(e.target.value))} aria-label="Replay volume" data-testid="relive-volume" /></label>
      <label className="relive-check"><input type="checkbox" checked={freeCam} onChange={(e) => setFreeCam(e.target.checked)} data-testid="relive-camera" /> Free look (drag to look around, scroll to zoom) <kbd>C</kbd></label>
      <p className="relive-keys muted small">Space play/pause · ← → events · + − speed · H cinematic · E explanations · L events · I how do we know · Esc return</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────── player

export default function ReliveMission() {
  const S = useRelive()
  const script = S.id ? RELIVE_SCRIPTS[S.id] : null
  const [info, setInfo] = useState(false)
  // the replay's sound button IS the app's master sound switch (one control for every sound in the app)
  const [sound, setSound] = useState(() => !audio.getIsMuted())
  useEffect(() => audio.subscribe(() => setSound(!audio.getIsMuted())), [])
  const [explain, setExplainState] = useState(() => pref.get(STORY_KEY, true))
  const setExplain = (v: boolean) => { pref.set(STORY_KEY, v); setExplainState(v) }
  const [cinema, setCinema] = useState(false)
  const [chrome, setChrome] = useState(true) // cinematic: controls revealed briefly on pointer movement
  const [menu, setMenu] = useState(false)
  const [corner, setCorner] = useState<Corner>('bl')
  const [compact, setCompact] = useState(false)
  /** choose the place now; compact when even the best place covers the vehicle */
  const place = (keepUnlessCovering: boolean) => {
    const best = pickCorner()
    setCorner((cur) => {
      const c = keepUnlessCovering && coverOf(cur) <= 0.25 ? cur : best
      setCompact(coverOf(c) > 0.25)
      return c
    })
  }
  const [, force] = useState(0)

  // audio: start on open (the click that opened it is the user gesture), cues on events
  useEffect(() => {
    if (!S.id) return
    missionAudio.start()
    const off = onReliveEvent((e) => { if (e.cue) missionAudio.cue(e.cue) })
    return () => { off(); missionAudio.stop() }
  }, [S.id])

  // story cards fade after a while (unless paused); 10 s gives a child time to read two sentences
  useEffect(() => {
    const iv = setInterval(() => {
      const st = useRelive.getState()
      if (st.card && st.status === 'playing' && clock.wall - st.card.at > 10) st.set({ card: null })
      force((x) => x + 1)
    }, 500)
    return () => clearInterval(iv)
  }, [])

  // a new card picks its corner once (away from the vehicle) a moment after the camera has cut to the event's shot
  // (the card waits ~0.8 s so the camera has settled on the new shot, then appears in one place and stays there)
  const cardKey = S.card ? `${S.card.i}:${S.card.at}` : ''
  const [placed, setPlaced] = useState('')
  const placedRef = useRef('')
  useEffect(() => {
    if (!S.card) { placedRef.current = ''; return }
    // a card is already on screen (events in quick succession): the next one replaces it in the same place, at once
    if (placedRef.current) {
      placedRef.current = cardKey; setPlaced(cardKey)
      // re-check once the camera has settled; move only if staying would cover the vehicle
      const t = window.setTimeout(() => place(true), 800)
      const t2 = window.setTimeout(() => place(true), 1600)
      return () => { window.clearTimeout(t); window.clearTimeout(t2) }
    }
    // stepping through events while paused: the camera cuts straight to the shot, so the card can show almost at once
    const wait = useRelive.getState().status === 'playing' ? 800 : 300
    const t = window.setTimeout(() => { place(false); placedRef.current = cardKey; setPlaced(cardKey) }, wait)
    // the shot's ease finishes ~1.8 s after a cut: one more look then (it moves only if it now covers the vehicle)
    const t2 = window.setTimeout(() => place(true), 1600)
    return () => { window.clearTimeout(t); window.clearTimeout(t2) }
  }, [cardKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // the shot can change while a card is up (the director cuts on its own schedule): every 2 s, move the card only if it
  // has come to cover the vehicle (never just because another place is marginally better)
  useEffect(() => {
    if (!placed) return
    const iv = window.setInterval(() => place(true), 2000)
    return () => window.clearInterval(iv)
  }, [placed]) // eslint-disable-line react-hooks/exhaustive-deps

  // cinematic mode: the controls hide; any pointer movement shows them for 2.5 s
  useEffect(() => {
    if (!cinema) { setChrome(true); return }
    setChrome(false)
    let t = 0
    const show = () => { setChrome(true); window.clearTimeout(t); t = window.setTimeout(() => setChrome(false), 2500) }
    window.addEventListener('pointermove', show)
    return () => { window.removeEventListener('pointermove', show); window.clearTimeout(t) }
  }, [cinema])

  // player controls: free camera, event list, volume (kept per browser)
  const [freeCam, setFreeCam] = useState(false)
  // render quality: Auto (adaptive) or a fixed profile, kept per browser
  const [qmode, setQmode] = useState<ReliveQuality>(readQuality)
  const profile = useMemo(() => effectiveProfile(qmode, detectGpu()), [qmode])
  const [list, setList] = useState(false)
  // the replay's volume is the Mission category of the shared audio settings (persisted there)
  const [vol, setVol] = useState(() => Math.round(audio.getSettings().mission * 100))
  useEffect(() => { live.user.free = freeCam }, [freeCam])
  useEffect(() => () => { live.user.free = false }, [])
  useEffect(() => { audio.setCategory('mission', vol / 100) }, [vol])
  const drag = useRef<{ x: number; y: number } | null>(null)
  // keyboard (capture: the explorer underneath never sees these keys)
  useEffect(() => {
    if (!S.id) return
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      let used = true
      switch (e.code) {
        case 'Space': relive.toggle(); break
        case 'ArrowRight': relive.nextEvent(); break
        case 'ArrowLeft': relive.prevEvent(); break
        case 'Equal': case 'NumpadAdd': relive.faster(); break
        case 'Minus': case 'NumpadSubtract': relive.slower(); break
        case 'KeyI': setInfo((x) => !x); break
        case 'KeyL': setList((x) => !x); break
        case 'KeyC': setFreeCam((x) => !x); break
        case 'KeyH': setCinema((x) => !x); break
        case 'KeyE': setExplain(!pref.get(STORY_KEY, true)); break
        case 'Home': relive.seek(0); relive.play(); break
        case 'Escape':
          if (menu) setMenu(false)
          else if (info) setInfo(false)
          else if (cinema) setCinema(false)
          else if (RELIVE_SCRIPTS[S.id!]?.kind === 'expedition') relive.finish()
          else relive.close()
          break
        default: used = false
      }
      if (used) { e.preventDefault(); e.stopPropagation() }
    }
    window.addEventListener('keydown', down, true)
    return () => window.removeEventListener('keydown', down, true)
  }, [S.id, info, cinema, menu]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!S.id || !script) return null
  const phase = script.phases.find((p) => p.id === S.phaseId) ?? script.phases[0]
  const back = S.suspendedSiteId ? (SITE_BY_ID[S.suspendedSiteId]?.name ?? UNITY_SITE_BY_ID[S.suspendedSiteId]?.name ?? 'the surface').split(' — ')[0] : null
  const backLabel = back ? `⟲ Back to ${back}` : '⟲ Return to explorer'
  const goSurface = (siteId: string) => {
    const kept = useRelive.getState().suspendedSiteId
    if (kept === siteId) { relive.close(); return } // the present-day visit to this site was kept: back to it exactly
    relive.close({ toPresent: false })
    if (kept) useStore.getState().exitSurface()
    const site = SITE_BY_ID[siteId]
    const st = useStore.getState()
    st.set({ phase: 'explore' })
    if (site) st.setSim(site.daylight.ms)
    st.enterSurface(siteId)
  }
  const playing = S.status === 'playing'
  const exp = script.kind === 'expedition'
  const outbound = script.direction !== 'return'
  const missionName = exp ? (script.direction === 'hop' ? script.title : outbound ? `Expedition to ${script.dest === 'moon' ? 'the Moon' : 'Mars'}` : 'Return to orbit') : script.title
  const cur = currentEventIndex(S)
  const showCard = explain && S.card && placed === cardKey && S.status !== 'intro' && S.status !== 'ended'
  const hideChrome = cinema && !chrome
  const ending = CONCLUSIONS[script.id]
  const hasTele = S.status !== 'intro' && S.status !== 'ended' && (exp || teleRows(script, S.t).length > 0)

  return (
    <div className="relive" role="dialog" aria-modal="true" aria-label={exp ? script.title : `Relive the mission: ${script.title}`} data-testid="relive-root" data-kind={exp ? 'expedition' : 'relive'}
      data-status={S.status} data-phase={S.phaseId ?? ''} data-cinema={cinema ? 'on' : undefined} data-chrome={hideChrome ? 'hidden' : undefined} data-has-tele={hasTele ? 'on' : undefined}>
      <div className="relive-stage" data-free={freeCam ? 'on' : undefined}
        onPointerDown={(e) => { if (!freeCam || e.button !== 0) return; drag.current = { x: e.clientX, y: e.clientY }; (e.target as HTMLElement).setPointerCapture?.(e.pointerId) }}
        onPointerMove={(e) => { if (!drag.current) return; live.user.yaw -= (e.clientX - drag.current.x) * 0.006; live.user.pitch = Math.max(-1.2, Math.min(1.2, live.user.pitch + (e.clientY - drag.current.y) * 0.005)); drag.current = { x: e.clientX, y: e.clientY } }}
        onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}
        onWheel={(e) => { if (freeCam) live.user.zoom = Math.max(0.3, Math.min(6, live.user.zoom * (e.deltaY > 0 ? 1.12 : 1 / 1.12))) }}>
        <ReliveScene scriptId={script.id} mode={qmode} profile={profile} />
      </div>

      {/* ───────── top toolbar: one compact row */}
      <header className="relive-top glass">
        <div className="relive-title" title={phase.summary}>
          <span className="eyebrow">{exp ? 'CONCEPTUAL EXPEDITION' : 'RELIVE THE MISSION'} · {missionName}</span>
          <b data-testid="relive-phase">{phase.title}</b>
        </div>
        <div className="relive-clock" data-testid="relive-clock" title={exp ? 'Conceptual flight clock' : `Mission clock (${script.clock === 'get' ? 'ground elapsed time' : 'time since launch'}) and the date at this moment. The replay is time-compressed between events.`}>
          <b data-testid="relive-met">{formatClock(script.clock, S.t)}</b>
          <span data-testid="relive-utc">{formatUtc(script.epochMs + S.t * 1000)}{S.rate * S.speed >= 1.5 ? ' · sped up' : ''}</span>
        </div>
        <div className="relive-actions">
          <button className="btn icon" onClick={() => { void audio.unlock(); audio.setMuted(sound) }} aria-pressed={sound} title="Sound (recreated, not archival audio)" aria-label={sound ? 'Mute sound' : 'Turn sound on'} data-testid="relive-sound">{sound ? 'Sound' : 'Muted'}</button>
          <button className="btn icon" onClick={() => setExplain(!explain)} aria-pressed={explain} title={explain ? 'Hide explanations (E)' : 'Show explanations (E)'} aria-label="Explanations" data-testid="relive-explain">Notes</button>
          <button className="btn" onClick={() => setCinema(!cinema)} aria-pressed={cinema} title="Cinematic mode: just the scene (H)" data-testid="relive-cinema"><span className="lbl">Cinematic</span></button>
          <button className="btn" onClick={() => setList(!list)} aria-pressed={list} data-testid="relive-events-toggle" title="All events (L)">☰ <span className="lbl">Events</span></button>
          <button className="btn" onClick={() => setInfo(!info)} aria-pressed={info} data-testid="relive-info" title="Sources, exact times and how this replay is built (I)">? <span className="lbl">How do we know?</span></button>
          <button className="btn icon" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-haspopup="menu" title="Quality, volume, free look" aria-label="Settings" data-testid="relive-settings">⚙</button>
          {exp ? (
            <>
              <button className="btn relive-exit" onClick={() => relive.finish()} data-testid="expedition-skip" title="Jump to the end of the flight (it still lands)">⏭ <span className="lbl">{outbound ? (script.dest === 'moon' ? 'Skip to the landing' : 'Skip to the surface') : 'Skip to orbit'}</span></button>
              {outbound && <button className="btn ghost" onClick={() => expedition.cancel()} data-testid="expedition-cancel">Cancel</button>}
            </>
          ) : (
            <button className="btn relive-exit" onClick={() => relive.close()} data-testid="relive-exit" title={backLabel.replace('⟲ ', '')}>⟲ <span className="lbl">{back ? `Back to ${back}` : 'Return'}</span></button>
          )}
        </div>
      </header>
      {menu && <Settings qmode={qmode} setQmode={setQmode} profileLabel={PROFILES[effectiveProfile('auto', detectGpu())].label} vol={vol} setVol={setVol} freeCam={freeCam} setFreeCam={setFreeCam} onClose={() => setMenu(false)} />}

      {list && S.status !== 'intro' && <EventList script={script} current={cur} onClose={() => setList(false)} />}
      {S.status !== 'intro' && S.status !== 'ended' && (exp ? <ComputedTelemetry script={script} t={S.t} /> : <Telemetry script={script} t={S.t} />)}

      {/* story: a corner card normally; a subtitle line in cinematic mode */}
      {showCard && !cinema && <StoryCard script={script} i={S.card!.i} corner={corner} compact={compact} onClose={() => S.set({ card: null })} onKnow={() => setInfo(true)} />}
      {showCard && cinema && (
        <div className={'relive-subtitle' + (corner[0] === 't' ? ' top' : '')} data-testid="relive-card" aria-live="polite">{storyFor(script, script.events[S.card!.i]).title}</div>
      )}

      {/* ───────── bottom: transport + phase jumps, then the timeline */}
      {S.status !== 'intro' && (
        <footer className="relive-bottom glass">
          <div className="relive-transport">
            <button className="btn" onClick={() => { relive.seek(0); relive.play() }} title="Restart (Home)" aria-label="Restart" data-testid="relive-restart">↺</button>
            <button className="btn" onClick={() => relive.prevEvent()} title="Previous event (←)" aria-label="Previous event" data-testid="relive-prev">⏮</button>
            <button className="btn play" onClick={() => relive.toggle()} title="Play / pause (Space)" aria-label={playing ? 'Pause' : 'Play'} data-testid="relive-play">{playing ? '⏸' : '▶'}</button>
            <button className="btn" onClick={() => relive.nextEvent()} title="Next event (→)" aria-label="Next event" data-testid="relive-next">⏭</button>
            <button className="btn" onClick={() => relive.setSpeed(SPEEDS[(SPEEDS.indexOf(S.speed) + 1) % SPEEDS.length])} title="Playback speed (+ / −)" data-testid="relive-speed">{S.speed}×</button>
            {script.jumps ? (
              <nav className="relive-jumps" aria-label="Jump to" data-testid="relive-jumps">
                {(() => {
                  const idx = script.jumps.map((j) => script.events.findIndex((e) => e.id === j.event))
                  // the section you are in: the last jump target at or before the current event
                  let active = -1
                  idx.forEach((i, k) => { if (i >= 0 && i <= cur) active = k })
                  return script.jumps.map((j, k) => idx[k] < 0 ? null : (
                    <button key={j.event} className={'chip' + (k === active ? ' on' : '')} aria-current={k === active ? 'step' : undefined} onClick={() => relive.seekEvent(idx[k])} data-testid={`relive-jump-${j.event}`}>{j.label}</button>
                  ))
                })()}
              </nav>
            ) : (
              <span className="muted small relive-phase-note">{script.phases.indexOf(phase) + 1} / {script.phases.length} · {phase.title}</span>
            )}
          </div>
          <Timeline script={script} u={S.u} L={S.length} />
        </footer>
      )}

      {cinema && (
        <button className="btn relive-cinema-exit" onClick={() => setCinema(false)} data-testid="relive-cinema-exit">Exit cinematic <kbd>Esc</kbd></button>
      )}

      {S.status === 'intro' && (
        <div className="relive-intro glass" data-testid="relive-intro">
          <span className="eyebrow">RELIVE THE MISSION</span>
          <h2>{script.title}</h2>
          <p className="sub">{script.subtitle}</p>
          <p>Watch the whole mission, from the first engine to the very end. Short explanations appear as you go; press <b>How do we know?</b> any time to see NASA’s records and sources.</p>
          <div className="row">
            <button className="btn exp-start-btn big" onClick={() => relive.play()} data-testid="relive-begin" autoFocus>▶ Begin</button>
            {S.resumeU !== null && <button className="btn big" onClick={() => relive.resume()} data-testid="relive-resume">⏵ Resume where you left off</button>}
          </div>
          <p className="muted small">The 3-D scenes are reconstructions from the mission records, not film footage. The sound is recreated.</p>
        </div>
      )}

      {S.status === 'ended' && !exp && (() => {
        const done = COMPLETION[script.id]
        return (
        // a compact corner panel: the final scene (the rover where it rests, the planet) stays in view behind it
        <div className={'glass relive-ended' + (done ? ' relive-ended-compact' : ' relive-intro')} data-testid="relive-ended">
          <span className="eyebrow">MISSION COMPLETE</span>
          <h2>{ending?.title ?? script.conclusion.title}</h2>
          {done ? (
            <>
              <dl className="relive-ended-stats" data-testid="relive-ended-stats">
                {done.stats.map((x) => <div key={x.k}><dt>{x.k}</dt><dd>{x.v}</dd></div>)}
              </dl>
              <ul className="relive-ended-achieve">{done.achievements.map((a) => <li key={a}>{a}</li>)}</ul>
              <p className="small"><b>Status.</b> {done.status} <Cite ids={done.sources} /></p>
            </>
          ) : <p>{ending?.text ?? script.conclusion.text}</p>}
          {ending && <p className="left-behind"><b>What it left behind.</b> {ending.left}</p>}
          <details className="relive-ended-more">
            <summary>How do we know?</summary>
            <p className="small">{script.conclusion.text} <Cite ids={script.conclusion.sources} /></p>
            <HistoricalEnding script={script} />
          </details>
          <div className="row">
            {script.id === 'apollo-11' && <button className="btn exp-start-btn big" onClick={() => goSurface('tranquility-base')} data-testid="relive-to-surface">Walk Tranquility Base</button>}
            {script.id === 'mer-opportunity' && <button className="btn exp-start-btn" onClick={() => goSurface('victoria-crater')} data-testid="relive-to-surface">Explore Victoria crater</button>}
            {script.jumps && (
              <select className="relive-ended-jump" aria-label="Replay a milestone" data-testid="relive-ended-jump" value="" onChange={(e) => { const ev = script.events.find((x) => x.id === e.target.value); if (ev) { relive.seek(playAt(script.segments, ev.t)); relive.play() } }}>
                <option value="">Replay a milestone…</option>
                {script.jumps.map((j) => <option key={j.event} value={j.event}>{j.label}</option>)}
              </select>
            )}
            <button className="btn" onClick={() => relive.close()} data-testid="relive-return-present">{back ? `⟲ Back to ${back}` : '⟲ Return to the explorer'}</button>
            <button className="btn ghost" onClick={() => { relive.seek(0); relive.play() }}>↺ Watch again</button>
          </div>
          <AutoReturn label={backLabel} onReturn={() => relive.close()} />
        </div>
        )
      })()}

      {info && <KnowPanel script={script} eventIdx={S.card ? S.card.i : cur} onClose={() => setInfo(false)} />}
    </div>
  )
}
