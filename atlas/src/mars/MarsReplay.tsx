import { useEffect, useMemo, useRef, useState } from 'react'
import { useSurface } from '../surface/surfaceState'
import { useStore } from '../store/store'
import { input } from '../input/appInput'
import { citeGroups } from '../missions'
import { send, onMars, type MarsPose, type MarsReady } from './marsBridge'
import { replayFor, replayState, opportunitySolOf, type ReplayDef } from '../replay/replay'
import { missionStory, storyDate, CHAPTERS, type StoryItem } from './missionChapters'
import { MissionStory } from './MissionStory'
import '../replay/replay.css'
import './marsNav.css'

/** save the present-day exploration state, then hand the scene to the replay */
export function beginMarsReplay(objectId: string, ready: MarsReady, pose: MarsPose | null) {
  const S = useSurface.getState()
  if (!pose) return
  replayState.saved = {
    savedAt: Date.now(),
    bodyId: 'mars',
    siteId: S.siteId!,
    objectId,
    panelTab: S.panel?.tab ?? null,
    component: S.component,
    simMs: useStore.getState().simMs,
    pose: { x: pose.x, z: pose.z, heading: pose.heading, camYawOffset: pose.camYawOffset, camPitch: pose.camPitch, camDist: pose.camDist },
  }
  S.set({ replay: { objectId }, panel: null, component: null, banner: null })
  send('ReplayStart', String(ready.route!.firstSol))
}

/** "Go back to present": end the replay and restore the saved exploration state exactly (not the landing point) */
function goBackToPresent() {
  const saved = replayState.saved
  const S = useSurface.getState()
  if (!saved) return S.set({ replay: null })
  const off = onMars((kind, data) => {
    if (kind !== 'restored') return
    off()
    replayState.lastRestore = { at: Date.now(), pose: data, snapshot: saved }
  })
  send('ReplayEnd')
  send('RestoreState', JSON.stringify(saved.pose))
  S.set({ replay: null, panel: saved.panelTab ? { objectId: saved.objectId, tab: saved.panelTab as never } : null, component: saved.component })
}

const RATES = [1, 4, 15, 40]

/** a beat of the replay: a sourced story item placed on the sol axis of the recorded drives, or the data's own bounds */
interface Beat { id: string; sol: number; approx: boolean; title: string; text: string; sources: string[]; knowledge: StoryItem['knowledge']; chapter: string; date: string | null }

/**
 * Historical replay at Victoria crater (audit S1 / test D). The 3-D part covers ONLY what the data covers: Opportunity
 * on its recorded drives here, sol `firstSol`..`lastSol`. The timeline is a bottom strip on that same sol axis:
 *   - beats = the mission story's sourced, dated items that fall in this span (plus the start and end of the recorded
 *     drives, from the traverse file); everything else is in "Whole mission story", never mixed into the 3-D span;
 *   - play / pause / resume, previous / next beat, a mark per beat; the narrative card follows the scene as the sol passes
 *     each beat, and selecting a beat moves Opportunity to its recorded position for that sol.
 * No persistent side window: the scene stays visible.
 */
export function MarsReplay({ ready, pose }: { ready: MarsReady; pose: MarsPose | null }) {
  const objectId = useSurface((s) => s.replay!.objectId)
  const def = useMemo(() => replayFor(objectId, { solRange: [ready.route!.firstSol, ready.route!.lastSol] }) as ReplayDef, [objectId, ready])
  const [lo, hi] = def.solRange!
  const beats = useMemo<Beat[]>(() => {
    const st = missionStory(def.missionId, 'victoria-crater')
    const out: Beat[] = [
      { id: 'drives-start', sol: lo, approx: false, title: 'The recorded drives at Victoria begin', text: `From sol ${lo}, Opportunity is shown at each recorded drive position near Victoria crater.`, sources: [], knowledge: 'reconstruction', chapter: 'Data', date: null },
    ]
    for (const it of st?.timeline ?? []) {
      const s = opportunitySolOf(it.date!)
      if (!s) continue
      const inSpan = s.sol >= lo - (s.approx ? 40 : 0) && s.sol <= hi
      if (!inSpan) continue
      out.push({ id: it.id, sol: Math.max(lo, s.sol), approx: s.approx, title: it.title ?? CHAPTERS.find((c) => c.id === it.chapter)!.title, text: it.text, sources: it.sources, knowledge: it.knowledge, chapter: CHAPTERS.find((c) => c.id === it.chapter)!.title, date: it.date! })
    }
    out.push({ id: 'drives-end', sol: hi, approx: false, title: 'The last recorded drive in this scene', text: `Sol ${hi}: after this, Opportunity's route leaves this terrain. Its later journey (to Endeavour crater) is told in the whole mission story.`, sources: [], knowledge: 'reconstruction', chapter: 'Data', date: null })
    return out.sort((a, b) => a.sol - b.sol)
  }, [def, lo, hi])
  const [sol, setSol] = useState(lo)
  const [playing, setPlaying] = useState(true)
  const [rate, setRate] = useState(15)
  const [selected, setSelected] = useState<number>(0)
  const [follow, setFollow] = useState(true)
  const [storyOpen, setStoryOpen] = useState(false)
  const solRef = useRef(lo)
  const lastSend = useRef(0)

  const seek = (s: number) => {
    solRef.current = Math.max(lo, Math.min(hi + 0.999, s))
    setSol(solRef.current)
    send('ReplaySol', solRef.current.toFixed(3))
  }

  // the replay clock (React owns it; Unity follows)
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let t = performance.now()
    let ui = 0
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - t) / 1000)
      t = now
      solRef.current += rate * dt
      if (solRef.current >= hi + 0.999) {
        solRef.current = hi + 0.999
        setPlaying(false)
      }
      if (now - lastSend.current > 33) {
        lastSend.current = now
        send('ReplaySol', solRef.current.toFixed(3))
      }
      if (now - ui > 100) {
        ui = now
        setSol(solRef.current)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, rate, hi])

  // the narrative card follows the scene while playing: the last beat the sol has passed
  const passed = beats.reduce((k, b, i) => (b.sol <= sol + 1e-6 ? i : k), 0)
  useEffect(() => { if (follow) setSelected(passed) }, [passed, follow])

  const selRef = useRef(0)
  selRef.current = selected
  const jumpTo = (i: number) => {
    const k = Math.max(0, Math.min(beats.length - 1, i))
    setFollow(true) // the card stays on this beat until the scene passes the next one
    setSelected(k)
    setPlaying(false)
    seek(beats[k].sol)
  }

  useEffect(() => {
    const offs = [
      input.on('playPause', () => { setFollow(true); setPlaying((p) => !p) }, 'HISTORICAL_REPLAY'),
      input.on('nextEvent', () => jumpTo(selRef.current + 1), 'HISTORICAL_REPLAY'),
      input.on('prevEvent', () => jumpTo(selRef.current - 1), 'HISTORICAL_REPLAY'),
      input.on('back', () => { if (!storyOpen) goBackToPresent() }, 'HISTORICAL_REPLAY'),
    ]
    return () => offs.forEach((f) => f())
  }, [beats, storyOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const pct = (s: number) => ((s - lo) / (hi + 1 - lo)) * 100
  const cur = beats[selected]

  return (
    <div className="replay-root replay-root-mars" data-testid="replay-root" role="region" aria-label="Historical replay">
      <header className="replay-top glass">
        <div>
          <span className="eyebrow replay-eyebrow">⏪ HISTORICAL REPLAY · OPPORTUNITY AT VICTORIA CRATER</span>
          <b className="replay-title">{def.title}</b>
          <span className="replay-when mono" data-testid="replay-when">
            sol {Math.floor(sol)} · {pose?.utc ? new Date(pose.utc).toUTCString().slice(5, 16) : '…'} (Earth date, UTC)
          </span>
        </div>
        <button className="btn big replay-back" data-testid="go-back-to-present" onClick={goBackToPresent}>
          ⏩ GO BACK TO PRESENT <kbd>Esc</kbd>
        </button>
      </header>
      {!storyOpen && (
        <footer className="replay-bottom glass" data-testid="replay-strip">
          {cur && (
            <article className="replay-beat" data-testid="replay-beat" data-beat={cur.id} aria-live="polite">
              <div className="mstory-meta">
                <time>sol {cur.approx ? '≈' : ''}{cur.sol}{cur.date ? ` · ${storyDate(cur.date)}` : ''}</time>
                <span className="mstory-chapter">{cur.chapter}</span>
                <span className={`mstory-know k-${cur.knowledge}`}>{cur.knowledge === 'record' ? 'Mission record' : cur.knowledge === 'derived' ? 'Worked out' : 'Recorded traverse data'}</span>
              </div>
              <b>{cur.title}</b>
              <p className="small">
                {cur.text}{' '}
                {cur.sources.length > 0 && <span className="cite">{citeGroups(cur.sources).map((g) => <a key={g.label} href={g.url} target="_blank" rel="noreferrer" title={g.titles}>[{g.label}]</a>)}</span>}
              </p>
              <p className="muted small">In the scene: Opportunity at its recorded drive position for sol {Math.floor(sol)} (WUSTL / PDS traverse, locally registered, ~15 m).{cur.approx ? ' This date is given to the month only, so its sol is approximate.' : ''}</p>
            </article>
          )}
          <div className="replay-controls">
            <button className="btn small" onClick={() => jumpTo(selected - 1)} disabled={selected === 0} aria-label="Previous event" data-testid="replay-prev">◀</button>
            <button className="btn" onClick={() => { setFollow(true); if (sol >= hi + 0.99) { seek(lo); setPlaying(true) } else setPlaying(!playing) }} aria-label={playing ? 'Pause' : 'Play'} data-testid="replay-play">
              {playing ? '❚❚ Pause' : sol > lo + 0.5 && sol < hi + 0.99 ? '▶ Resume' : '▶ Play'} <kbd>Space</kbd>
            </button>
            <button className="btn small" onClick={() => jumpTo(selected + 1)} disabled={selected >= beats.length - 1} aria-label="Next event" data-testid="replay-next">▶</button>
            <label className="small">
              Speed{' '}
              <select value={rate} onChange={(e) => setRate(+e.target.value)} aria-label="Replay speed">
                {RATES.map((r) => <option key={r} value={r}>{r} sol/s</option>)}
              </select>
            </label>
            <span className="muted small">Sol {lo} → {hi} · {ready.route!.points.toLocaleString('en-US')} recorded drive points</span>
            <button className="btn small ghost" onClick={() => { setPlaying(false); setStoryOpen(true) }} data-testid="replay-whole-story">📖 Whole mission story</button>
          </div>
          <div className="replay-scrub">
            <input type="range" min={lo} max={hi + 0.999} step={0.01} value={sol}
              onChange={(e) => { setPlaying(false); setFollow(true); seek(+e.target.value) }} aria-label="Mission sol" data-testid="replay-scrubber" />
            {beats.map((b, i) => (
              <button key={b.id} className={'replay-mark' + (selected === i ? ' on' : '') + (b.knowledge === 'reconstruction' ? ' data' : '')} style={{ left: `${Math.max(0, Math.min(100, pct(b.sol)))}%` }}
                onClick={() => jumpTo(i)} title={`${b.title} (sol ${b.approx ? '≈' : ''}${b.sol})`} aria-label={b.title} />
            ))}
          </div>
          <p className="muted small replay-note">{def.sceneNote}</p>
        </footer>
      )}
      {storyOpen && <MissionStory missionId={def.missionId} siteId="victoria-crater" onClose={() => setStoryOpen(false)} />}
    </div>
  )
}
