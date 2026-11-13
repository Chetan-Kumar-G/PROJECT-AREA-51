import { useEffect, useMemo, useRef, useState } from 'react'
import { citeGroups } from '../missions'
import { CHAPTERS, missionStory, storyDate, type StoryItem } from './missionChapters'
import './marsNav.css'

const KNOW: Record<StoryItem['knowledge'], { label: string; title: string }> = {
  record: { label: 'Mission record', title: 'What the cited mission record says happened' },
  derived: { label: 'Worked out', title: 'Computed here from the mission records (for example, days between two dated events)' },
  reconstruction: { label: 'Reconstruction', title: 'How the 3-D scene was rebuilt (not a photograph)' },
}
const WHERE: Record<NonNullable<StoryItem['where']>, string> = {
  here: 'Here, at this site',
  earth: 'On Earth',
  cruise: 'Between Earth and Mars',
  'elsewhere-on-mars': 'Elsewhere on Mars (not in this scene)',
}

function Cite({ ids }: { ids: string[] }) {
  if (!ids.length) return null
  return (
    <span className="cite">
      {citeGroups(ids).map((g) => (
        <a key={g.label} href={g.url} target="_blank" rel="noreferrer" title={g.titles}>[{g.label}]</a>
      ))}
    </span>
  )
}

/**
 * Mission story (audit S1): chapters (introduction → legacy) and the chronological timeline of one Mars mission, from
 * sourced records only (missionChapters.ts). A bottom sheet, not a side window: the 3-D scene stays visible above it.
 * Play steps through the dated events; previous / next and the timeline marks select one; "Show here" asks the scene to
 * show it when it happened at this site (onShow).
 */
export function MissionStory({ missionId, siteId, onShow, onClose }: { missionId: string; siteId: string | null; onShow?: (item: StoryItem) => void; onClose: () => void }) {
  const story = useMemo(() => missionStory(missionId, siteId), [missionId, siteId])
  const [view, setView] = useState<'timeline' | 'chapters'>('timeline')
  const [chapter, setChapter] = useState(story?.chapters[0]?.id ?? 'intro')
  const [sel, setSel] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timer = useRef<number | null>(null)
  const tl = story?.timeline ?? []

  useEffect(() => {
    if (!playing) return
    timer.current = window.setTimeout(() => {
      if (sel >= tl.length - 1) setPlaying(false)
      else setSel(sel + 1)
    }, 6500)
    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [playing, sel, tl.length])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
      else if (view === 'timeline' && e.key === 'ArrowRight') { e.stopPropagation(); setPlaying(false); setSel((s) => Math.min(tl.length - 1, s + 1)) }
      else if (view === 'timeline' && e.key === 'ArrowLeft') { e.stopPropagation(); setPlaying(false); setSel((s) => Math.max(0, s - 1)) }
      else if (view === 'timeline' && e.key === ' ') { e.preventDefault(); e.stopPropagation(); setPlaying((p) => !p) }
    }
    window.addEventListener('keydown', k, true)
    return () => window.removeEventListener('keydown', k, true)
  }, [view, tl.length, onClose])

  if (!story) return null
  const cur = tl[sel]
  // positions on the strip: by date, with a minimum spacing so marks stay clickable
  const t0 = tl.length ? Date.parse(tl[0].date!.length < 10 ? tl[0].date!.slice(0, 4) + '-01-01' : tl[0].date!) : 0
  const t1 = tl.length ? Date.parse(tl[tl.length - 1].date!.length < 10 ? tl[tl.length - 1].date!.slice(0, 4) + '-12-31' : tl[tl.length - 1].date!) : 1
  const raw = tl.map((it) => { const d = it.date!; const ms = Date.parse(d.length === 4 ? d + '-07-01' : d.length === 7 ? d + '-15' : d); return (ms - t0) / Math.max(1, t1 - t0) })
  const pos: number[] = []
  raw.forEach((x, i) => pos.push(Math.max(x, i ? pos[i - 1] + 0.018 : 0)))
  const scale = pos.length && pos[pos.length - 1] > 1 ? 1 / pos[pos.length - 1] : 1

  return (
    <section className="mstory glass" role="dialog" aria-label={`${story.missionName}: mission story`} data-testid="mission-story">
      <header className="mstory-head">
        <div>
          <span className="eyebrow">MISSION STORY · SOURCED RECORDS ONLY</span>
          <b>{story.missionName}</b>
        </div>
        <div className="mstory-views" role="tablist" aria-label="Story view">
          <button role="tab" aria-selected={view === 'timeline'} className={view === 'timeline' ? 'on' : ''} onClick={() => setView('timeline')} data-testid="story-view-timeline">Timeline</button>
          <button role="tab" aria-selected={view === 'chapters'} className={view === 'chapters' ? 'on' : ''} onClick={() => setView('chapters')} data-testid="story-view-chapters">Chapters</button>
        </div>
        <button className="discovery-close" onClick={onClose} aria-label="Close the mission story (Esc)" title="Close (Esc)">✕</button>
      </header>

      {view === 'timeline' && cur && (
        <>
          <article className="mstory-card" data-testid="story-card" data-item={cur.id} aria-live="polite">
            <div className="mstory-meta">
              <time>{storyDate(cur.date!)}</time>
              <span className="mstory-chapter">{CHAPTERS.find((c) => c.id === cur.chapter)?.title}</span>
              <span className={`mstory-know k-${cur.knowledge}`} title={KNOW[cur.knowledge].title}>{KNOW[cur.knowledge].label}</span>
              {cur.where && <span className="mstory-where">{WHERE[cur.where]}</span>}
            </div>
            {cur.title && <h3>{cur.title}</h3>}
            <p>{cur.text} <Cite ids={cur.sources} /></p>
            {cur.where === 'here' && onShow && <button className="btn small" onClick={() => onShow(cur)} data-testid="story-show-here">◎ Show it here</button>}
          </article>
          <div className="mstory-controls">
            <button className="btn small" onClick={() => { setPlaying(false); setSel(Math.max(0, sel - 1)) }} disabled={sel === 0} aria-label="Previous event" data-testid="story-prev">◀ Previous</button>
            <button className="btn small" onClick={() => { if (sel >= tl.length - 1) setSel(0); setPlaying(!playing) }} aria-label={playing ? 'Pause' : 'Play'} data-testid="story-play">{playing ? '❚❚ Pause' : '▶ Play'}</button>
            <button className="btn small" onClick={() => { setPlaying(false); setSel(Math.min(tl.length - 1, sel + 1)) }} disabled={sel >= tl.length - 1} aria-label="Next event" data-testid="story-next">Next ▶</button>
            <span className="muted small">{sel + 1} / {tl.length}</span>
          </div>
          <div className="mstory-strip" role="listbox" aria-label="Mission events by date">
            <i className="mstory-line" />
            {tl.map((it, i) => (
              <button key={it.id} role="option" aria-selected={i === sel} className={`mstory-mark c-${it.chapter}${i === sel ? ' on' : ''}${it.where === 'here' ? ' here' : ''}`}
                style={{ left: `${(pos[i] * scale * 96 + 2).toFixed(2)}%` }} title={`${storyDate(it.date!)} — ${it.title ?? it.text.slice(0, 60)}`}
                onClick={() => { setPlaying(false); setSel(i) }} data-testid="story-mark" />
            ))}
            <span className="mstory-end l">{tl[0] && storyDate(tl[0].date!).split(' · ')[0]}</span>
            <span className="mstory-end r">{tl[tl.length - 1] && storyDate(tl[tl.length - 1].date!).split(' · ')[0]}</span>
          </div>
        </>
      )}

      {view === 'chapters' && (
        <div className="mstory-chapters">
          <nav className="mstory-toc" aria-label="Chapters">
            {story.chapters.map((c, i) => (
              <button key={c.id} className={chapter === c.id ? 'on' : ''} onClick={() => setChapter(c.id)} data-testid="story-chapter">{i + 1}. {c.title}</button>
            ))}
          </nav>
          <div className="mstory-chapter-body">
            {story.chapters.filter((c) => c.id === chapter).map((c) => (
              <div key={c.id}>
                <h3>{c.title}</h3>
                <ul>
                  {c.items.map((it) => (
                    <li key={it.id} className={`k-${it.knowledge}`}>
                      {it.date && <time>{storyDate(it.date)}</time>}
                      {it.title && <b>{it.title}. </b>}
                      {it.text} <Cite ids={it.sources} />
                      <span className={`mstory-know k-${it.knowledge}`} title={KNOW[it.knowledge].title}>{KNOW[it.knowledge].label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {story.unsourced.length > 0 && (
              <p className="muted small" data-testid="story-unsourced">Not yet in the sourced records, so not told here: {story.unsourced.map((u) => CHAPTERS.find((c) => c.id === u)?.title).join(', ')}.</p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
