/**
 * MISSIONS panel (formerly "Mission Control"; see missionState.ts). Rendered into document.body so it is reachable over every view —
 * the homepage, the orbital explorer and both planetary surfaces (the surface layout hides the app's other children).
 * While it is open it owns the keyboard (input mode UI_INTERACTION): the rover / astronaut stop until it closes.
 */
import { useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MISSIONS, MISSION_BY_ID, citeGroups, objectsForMission, type Fact, type Mission } from '../missions'
import { SITE_BY_ID, SURFACE_SITES, UNITY_SITES, UNITY_SITE_BY_ID, sitesForBody, unitySitesForBody } from '../surface/sites'
import { useStore } from '../store/store'
import { relive } from '../relive/player'
import { metAt, phaseAt } from '../relive/timeline'
import { expedition } from '../expedition/expedition'
import { useDiscovery } from '../discovery/progress'
import { SITE_DISCOVERIES } from '../discovery/siteDiscoveries'
import { useSurface } from '../surface/surfaceState'
import { input } from '../input/appInput'
import { REPLAYS, exploreContext, missionControl, replayFor, replayScript, replaySpan, savedReplayPosition, useMissionControl, type Destination, type MissionTab } from './missionState'
import './missionControl.css'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** a catalogue date as published: date-only stays date-only (no invented time of day) */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return 'not published'
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?(?:T(\d{2}):(\d{2}))?/.exec(iso)
  if (!m) return iso
  const [, y, mo, d, hh, mm] = m
  const date = `${d ? Number(d) + ' ' : ''}${MONTHS[Number(mo) - 1]} ${y}`
  return hh ? `${date}, ${hh}:${mm} UTC` : date
}
const fmtMs = (ms: number) => fmtDate(new Date(ms).toISOString())
const fact = (f?: Fact<string>) => (f?.value ? fmtDate(f.value) : 'not published')
const STATUS: Record<string, string> = { completed: 'Completed', ended: 'Ended', operating: 'Operating', lost: 'Lost', unknown: 'Unknown' }
const DEST: Record<string, string> = { moon: 'Moon', mars: 'Mars' }
const destName = (t: string) => DEST[t] ?? t.charAt(0).toUpperCase() + t.slice(1)

function Sources({ ids }: { ids: string[] }) {
  const g = citeGroups([...new Set(ids)])
  if (!g.length) return null
  return (
    <span className="mc-src">
      {g.map((x) => (
        <a key={x.label} href={x.url} target="_blank" rel="noreferrer" title={x.titles}>[{x.label}]</a>
      ))}
    </span>
  )
}

/** land at a site from anywhere (panel, search, homepage): ends a running flight, leaves the current surface */
export function leaveForSite(id: string) {
  missionControl.close()
  if (expedition.active()) expedition.cancel()
  const st = useStore.getState()
  if (st.surfaceSiteId === id) return
  if (st.surfaceSiteId) st.exitSurface()
  // Mars: THEIA arrives in its conceptual carrier on the measured terrain (E3)
  if (UNITY_SITE_BY_ID[id]?.bodyId === 'mars') expedition.markArrival(id)
  if (SITE_BY_ID[id]) useStore.getState().setSim(SITE_BY_ID[id].daylight.ms)
  useStore.getState().set({ phase: 'explore' })
  useStore.getState().enterSurface(id)
}

// ─────────────────────────────────────────────────────────────────── Relive Mission

function ReliveTab({ dest }: { dest: Destination }) {
  const list = REPLAYS.filter((r) => dest === 'all' || MISSION_BY_ID[r.missionId]?.target === dest)
  if (!list.length) return <p className="muted">No historical replay is available for this destination yet.</p>
  return (
    <div className="mc-cards">
      {list.map((r) => {
        const m = MISSION_BY_ID[r.missionId]
        const sc = replayScript(r)
        if (!m || !sc) return null
        const span = replaySpan(sc)
        const saved = savedReplayPosition(sc.id)
        return (
          <article key={r.scriptId} className="mc-card" data-testid={`mc-replay-${r.scriptId}`} data-coverage={r.coverage}>
            <header className="mc-card-h">
              <span className="eyebrow">RELIVE MISSION · {m.agency} · {destName(m.target).toUpperCase()}</span>
              <span className={`mc-badge ${r.coverage}`}>{r.coverage === 'full' ? 'Full lifecycle' : 'Partial lifecycle'}</span>
            </header>
            <h3>{m.name}</h3>
            <p className="mc-summary">{m.summary}</p>
            <dl className="mc-facts">
              <div><dt>Launch</dt><dd>{fact(m.launch)}</dd></div>
              <div><dt>{m.landing ? 'Landing' : 'Arrival'}</dt><dd>{fact(m.landing ?? m.arrival)}</dd></div>
              <div><dt>Status</dt><dd>{STATUS[m.status.value ?? 'unknown']}{m.end?.value ? ` · ${fmtDate(m.end.value)}` : ''}</dd></div>
              <div><dt>Vehicle</dt><dd>{r.vehicle}</dd></div>
            </dl>
            <p className="mc-coverage">
              <b>Replay covers:</b> {span.first.title} ({fmtMs(span.first.ms)}) → {span.last.title} ({fmtMs(span.last.ms)}). {sc.phases.length} phases, {span.events} dated events.
              {r.notReplayed && <> <span className="mc-gap">{r.notReplayed}</span></>}
              {r.note && <> <span className="mc-note">{r.note}</span></>}
            </p>
            <p className="mc-prov muted small">
              {span.sourced} of {span.events} event times read from sources{span.sequence ? `, ${span.sequence} placed in their published order (time not published)` : ''}; {span.sources} sources. The 3-D scenes are reconstructions, not mission footage; the sound is synthesised.
              {' '}<Sources ids={sc.events.flatMap((e) => e.sources)} />
            </p>
            <div className="mc-actions">
              {saved !== null ? (
                <>
                  <button className="btn exp-start-btn" onClick={() => { missionControl.close(); relive.open(sc.id, { resume: true }) }} data-testid={`mc-resume-${sc.id}`} title="Continue the historical replay where you left it">
                    ⏵ Resume · {phaseAt(sc.phases, metAt(sc.segments, saved)).title}
                  </button>
                  <button className="btn" onClick={() => { missionControl.close(); relive.open(sc.id, { restart: true }) }} data-testid={`mc-relive-${sc.id}`}>▶ From the beginning</button>
                </>
              ) : (
                <button className="btn exp-start-btn" onClick={() => { missionControl.close(); relive.open(sc.id) }} data-testid={`mc-relive-${sc.id}`}>
                  ▶ Relive {m.name}
                </button>
              )}
              <span className="muted small">Your present-day exploration is kept and restored when you return.</span>
            </div>
          </article>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────── Explore Planet

function ExploreTab({ dest }: { dest: Destination }) {
  const here = useStore((s) => s.surfaceSiteId)
  const bodies = (dest === 'all' ? ['moon', 'mars'] : [dest]) as ('moon' | 'mars')[]
  return (
    <div className="mc-explore">
      {bodies.map((b) => {
        const sites = b === 'moon' ? sitesForBody('moon').filter((s) => s.available) : unitySitesForBody('mars')
        return (
          <section key={b} className="mc-world" data-testid={`mc-explore-${b}`}>
            <header className="mc-world-h">
              <h3>{b === 'moon' ? 'The Moon' : 'Mars'}</h3>
              <span className="muted small">{b === 'moon' ? 'You explore on foot, as an astronaut, on measured LROC terrain.' : 'You drive THEIA, a CONCEPTUAL rover (not NASA hardware), on measured HiRISE terrain.'}</span>
              <button className="btn ghost small" onClick={() => { missionControl.close(); expedition.start(b) }} data-testid={`mc-expedition-${b}`} title="A conceptual journey from Earth (not a historical mission)">
                Expedition from Earth <span className="mc-tag">conceptual</span>
              </button>
            </header>
            <ul className="mc-sites">
              {sites.map((s) => {
                const missions = s.missionIds.map((id) => MISSION_BY_ID[id]?.name).filter(Boolean).join(', ')
                const isHere = here === s.id
                return (
                  <li key={s.id} className={isHere ? 'here' : ''}>
                    <div>
                      <b>{s.name}</b>
                      <span className="muted small">{missions}</span>
                    </div>
                    {isHere ? (
                      <span className="mc-here" data-testid={`mc-here-${s.id}`}>● You are here</span>
                    ) : (
                      <button className="btn small" onClick={() => leaveForSite(s.id)} data-testid={`mc-land-${s.id}`}>
                        {here ? 'Go there' : 'Land'}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────── Mission Catalogue

function CatalogueTab({ dest }: { dest: Destination }) {
  const list = MISSIONS.filter((m) => dest === 'all' || m.target === dest)
  return (
    <div className="mc-catalogue" role="list">
      {list.map((m) => <CatalogueRow key={m.id} m={m} />)}
    </div>
  )
}

function CatalogueRow({ m }: { m: Mission }) {
  const focus = useMissionControl((s) => s.focus)
  const ref = useRef<HTMLDetailsElement>(null)
  useEffect(() => { if (focus === m.id) ref.current?.scrollIntoView({ block: 'center' }) }, [focus, m.id])
  const r = replayFor(m.id)
  const sites = [...SURFACE_SITES.filter((s) => s.available && s.missionIds.includes(m.id)), ...UNITY_SITES.filter((s) => s.missionIds.includes(m.id))]
  const objects = objectsForMission(m.id)
  const ids = [...m.launch.sources, ...(m.landing?.sources ?? []), ...(m.arrival?.sources ?? []), ...(m.end?.sources ?? []), ...m.status.sources]
  const unverified = [m.launch, m.landing, m.arrival, m.end].filter((f) => f && f.status !== 'verified').length
  return (
    <details ref={ref} className={'mc-row' + (focus === m.id ? ' focus' : '')} open={focus === m.id ? true : undefined} role="listitem" data-testid={`mc-mission-${m.id}`}>
      <summary>
        <span className="mc-row-name"><b>{m.name}</b><span className="muted small">{m.agency}{m.nasaMission ? '' : ' · not NASA'} · {destName(m.target)}</span></span>
        <span className="mc-row-date">{fact(m.launch)}</span>
        <span className="mc-row-status">{STATUS[m.status.value ?? 'unknown']}</span>
        <span className={`mc-badge ${r ? r.coverage : 'none'}`}>{r ? (r.coverage === 'full' ? 'Full replay' : 'Partial replay') : sites.length ? 'Explore site' : 'Catalogue only'}</span>
      </summary>
      <div className="mc-row-body">
        <p>{m.summary}</p>
        <dl className="mc-facts">
          <div><dt>Launch</dt><dd>{fact(m.launch)}</dd></div>
          {m.arrival && <div><dt>Arrival</dt><dd>{fact(m.arrival)}</dd></div>}
          {m.landing && <div><dt>Landing</dt><dd>{fact(m.landing)}</dd></div>}
          <div><dt>Status</dt><dd>{STATUS[m.status.value ?? 'unknown']}{m.end?.value ? ` · ended ${fmtDate(m.end.value)}` : ''}</dd></div>
          {objects.length > 0 && <div><dt>Hardware</dt><dd>{objects.map((o) => o.name).join(', ')}</dd></div>}
          <div><dt>Replay</dt><dd>{r ? (r.coverage === 'full' ? 'Full historical lifecycle' : `Partial — ${r.notReplayed}`) : 'No historical replay yet'}</dd></div>
        </dl>
        <p className="mc-prov muted small">
          {m.milestones.length} dated milestones · {unverified ? `${unverified} date(s) conflicting or unverified (see the record)` : 'dates verified against the sources'} · <Sources ids={ids} />
        </p>
        <div className="mc-actions">
          {r && <button className="btn small" onClick={() => { missionControl.close(); relive.open(r.scriptId) }}>▶ Relive</button>}
          {sites.map((s) => (
            <button key={s.id} className="btn ghost small" onClick={() => leaveForSite(s.id)}>◉ Explore {s.name.split(' — ')[0]}</button>
          ))}
        </div>
      </div>
    </details>
  )
}

// ─────────────────────────────────────────────────────────────────── Discovered

function DiscoveredTab({ dest }: { dest: Destination }) {
  const bySite = useDiscovery((s) => s.bySite)
  const surf = useSurface()
  const here = useStore((s) => s.surfaceSiteId)
  const rows = Object.entries(bySite)
    .filter(([sid, lv]) => Object.values(lv).some((v) => v >= 1) && (dest === 'all' || (UNITY_SITE_BY_ID[sid] ?? SITE_BY_ID[sid])?.bodyId === dest))
    .map(([sid, lv]) => {
      const cfg = SITE_DISCOVERIES[sid]
      const objs = cfg ? Object.values(cfg.objects) : []
      const site = UNITY_SITE_BY_ID[sid] ?? SITE_BY_ID[sid]
      const vals = Object.values(lv)
      return { sid, name: site?.name ?? sid, missions: site?.missionIds.map((id) => MISSION_BY_ID[id]?.name).join(', '), objs, lv, found: vals.filter((v) => v >= 1).length, inspected: vals.filter((v) => v >= 3).length, completed: vals.filter((v) => v >= 4).length }
    })
  const moonHere = here && SITE_BY_ID[here] && (dest === 'all' || dest === 'moon') ? surf.discovered : []
  if (!rows.length && !moonHere.length) return <p className="muted" data-testid="mc-discovered-empty">Nothing discovered yet in this session. Explore a landing site: hardware you come close to is recorded here.</p>
  return (
    <ul className="mc-found" data-testid="mc-discovered">
      {rows.map((r) => (
        <li key={r.sid}>
          <b>{r.name}</b>
          <span className="muted small">{r.missions}</span>
          <span className="small">{r.found} discovered · {r.inspected} inspected · {r.completed} completed</span>
          <span className="muted small">{r.objs.filter((o) => (r.lv[o] ?? 0) >= 1).length} of {r.objs.length} historical vehicles found</span>
        </li>
      ))}
      {moonHere.length > 0 && (
        <li>
          <b>{SITE_BY_ID[here!].name}</b>
          <span className="small">{moonHere.length} found on this visit</span>
          <span className="muted small">Moon discoveries are kept for the current visit only (not yet across visits).</span>
        </li>
      )}
    </ul>
  )
}

// ─────────────────────────────────────────────────────────────────── panel

const TABS: { id: MissionTab; label: string }[] = [
  { id: 'relive', label: 'Relive Mission' },
  { id: 'explore', label: 'Explore Planet' },
  { id: 'catalogue', label: 'Mission Catalogue' },
  { id: 'discovered', label: 'Discovered' },
]

function MissionControlPanel() {
  const M = useMissionControl()
  const ctx = useMemo(() => exploreContext(), [M.open]) // eslint-disable-line react-hooks/exhaustive-deps
  const ref = useRef<HTMLDivElement>(null)
  // keyboard: capture so Esc / G close the panel and never reach the explorer underneath (pause, map, …)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.code === 'Escape' || (e.code === 'KeyG' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.repeat)) {
        e.preventDefault(); e.stopPropagation(); missionControl.close()
      }
    }
    window.addEventListener('keydown', down, true)
    requestAnimationFrame(() => ref.current?.querySelector<HTMLButtonElement>('[role=tab][aria-selected=true]')?.focus())
    return () => window.removeEventListener('keydown', down, true)
  }, [])
  const where = ctx.where === 'surface' ? `Exploring ${ctx.siteName}` : ctx.where === 'orbit' ? (ctx.bodyId ? `In orbit · ${destName(ctx.bodyId)} selected` : 'Orbital explorer') : 'Homepage'
  const onTabKey = (e: React.KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === M.tab)
    const to = e.key === 'ArrowRight' ? (i + 1) % TABS.length : e.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length : -1
    if (to < 0) return
    e.preventDefault()
    M.set({ tab: TABS[to].id })
    requestAnimationFrame(() => document.getElementById(`mc-tab-${TABS[to].id}`)?.focus())
  }
  // on a phone the tab row scrolls sideways: keep the selected tab in view
  const tabsRef = useRef<HTMLDivElement>(null)
  useEffect(() => { tabsRef.current?.querySelector<HTMLElement>('[role=tab][aria-selected=true]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }) }, [M.tab])
  return (
    <div className="mc-overlay" role="dialog" aria-modal="true" aria-label="Missions" data-testid="mission-control" onClick={() => missionControl.close()}>
      <div className="mc-panel glass" ref={ref} onClick={(e) => e.stopPropagation()}>
        <header className="mc-head">
          <div>
            <span className="eyebrow">ABANDONED BUT NOT FORGOTTEN</span>
            <h2>Missions</h2>
            <span className="muted small" data-testid="mc-context">{where}</span>
          </div>
          <div className="mc-dest" role="group" aria-label="Destination">
            {(['moon', 'mars', 'all'] as Destination[]).map((d) => (
              <button key={d} className={'chip' + (M.dest === d ? ' on' : '')} aria-pressed={M.dest === d} onClick={() => M.set({ dest: d })} data-testid={`mc-dest-${d}`}>
                {d === 'all' ? 'All destinations' : destName(d)}
              </button>
            ))}
          </div>
          <button className="mc-close" onClick={() => missionControl.close()} aria-label="Close Missions" title="Close (Esc or G)">✕</button>
        </header>
        {ctx.bodyId && M.dest === ctx.bodyId && (
          <p className="mc-ctx-note small muted">Showing {destName(ctx.bodyId)} missions because you are {ctx.where === 'surface' ? 'on' : 'looking at'} {destName(ctx.bodyId)}. Choose “All destinations” to see the others.</p>
        )}
        <div className="mc-tabs" role="tablist" aria-label="Missions sections" onKeyDown={onTabKey} ref={tabsRef}>
          {TABS.map((t) => (
            <button key={t.id} id={`mc-tab-${t.id}`} role="tab" aria-selected={M.tab === t.id} aria-controls="mc-body" tabIndex={M.tab === t.id ? 0 : -1} className={M.tab === t.id ? 'on' : ''} onClick={() => M.set({ tab: t.id })} data-testid={`mc-tab-${t.id}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="mc-body" id="mc-body" role="tabpanel" aria-labelledby={`mc-tab-${M.tab}`}>
          {M.tab === 'relive' && <ReliveTab dest={M.dest} />}
          {M.tab === 'explore' && <ExploreTab dest={M.dest} />}
          {M.tab === 'catalogue' && <CatalogueTab dest={M.dest} />}
          {M.tab === 'discovered' && <DiscoveredTab dest={M.dest} />}
        </div>
        <footer className="mc-foot muted small">
          Relive Mission replays documented history (dated, sourced events). Explore Planet is the present day. The THEIA expedition is conceptual and is never part of a historical replay. <kbd>G</kbd> opens and closes Missions.
        </footer>
      </div>
    </div>
  )
}

/** mounted once (App): the G shortcut and the panel */
export function MissionControlHost() {
  const open = useMissionControl((s) => s.open)
  useEffect(() => input.on('missionControl', () => missionControl.toggle()), [])
  if (!open) return null
  return createPortal(<MissionControlPanel />, document.body)
}

/** the entry button for HUDs (top navigation has its own item) */
export function MissionControlButton({ className = 'btn ghost' }: { className?: string }) {
  return (
    <button className={className + ' mc-btn'} onClick={() => missionControl.open()} data-testid="open-mission-control" title="Missions: explore, relive historical missions, catalogue, discoveries (G)">
      ✪ Missions <kbd>G</kbd>
    </button>
  )
}
