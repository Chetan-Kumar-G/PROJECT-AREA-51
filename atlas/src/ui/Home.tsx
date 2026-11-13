import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/store'
import { initiateTravel } from '../travel/travelEngine'
import { MISSION_BY_ID } from '../missions'
import { relive } from '../relive/player'
import { expedition } from '../expedition/expedition'
import { missionControl } from '../missionControl/missionState'
import { leaveForSite } from '../missionControl/MissionControl'
import { openSitePicker } from '../surface/ExploreSurface'
import { sitesForBody, unitySitesForBody } from '../surface/sites'
import { startOpening, SOLAR_OVERVIEW_LY } from '../opening/openingState'
import './home.css'

/** enter the interactive Solar System explorer from the homepage */
export function exploreSolarSystem() {
  const st = useStore.getState()
  // the object list opens beside the view on wide screens; on a phone it would cover the whole Solar System
  // (and on a portrait tablet, where it opened over the whole view)
  const w = typeof window === 'undefined' ? 1440 : window.innerWidth, h = typeof window === 'undefined' ? 900 : window.innerHeight
  st.set({ phase: 'explore', leftOpen: w > 760 && !(w <= 1100 && h > w) })
  initiateTravel('sun', st.simMs, { viewDistanceLy: SOLAR_OVERVIEW_LY })
}

interface MissionCard {
  missionId: string
  world: 'moon' | 'mars'
  /** what the card opens: a historical replay, or the explorable landing site */
  relive?: string
  siteId?: string
  blurb: string
}

/** only missions with something implemented behind them (a replay or an explorable site) */
const CARDS: MissionCard[] = [
  { missionId: 'apollo-11', world: 'moon', relive: 'apollo-11', siteId: 'tranquility-base', blurb: 'Saturn V to splashdown on the published mission clock, and the descent stage still standing at Tranquility Base.' },
  { missionId: 'mer-opportunity', world: 'mars', relive: 'mer-opportunity', siteId: 'victoria-crater', blurb: 'Launch, airbag landing and fifteen years on Meridiani Planum; drive Victoria crater where it worked.' },
  { missionId: 'mer-spirit', world: 'mars', siteId: 'mars-spirit', blurb: 'Opportunity’s twin, at Columbia Memorial Station inside Gusev crater.' },
  { missionId: 'msl-curiosity', world: 'mars', siteId: 'mars-curiosity', blurb: 'The nuclear-powered rover at Bradbury Landing on the floor of Gale crater.' },
  { missionId: 'mars-pathfinder', world: 'mars', siteId: 'mars-pathfinder', blurb: 'The first rover on Mars, Sojourner, beside its lander in Ares Vallis.' },
  { missionId: 'viking-1', world: 'mars', siteId: 'mars-viking-1', blurb: 'The first successful US landing on Mars, 20 July 1976, on Chryse Planitia.' },
  { missionId: 'phoenix', world: 'mars', siteId: 'mars-phoenix', blurb: 'The arctic lander that dug down to water ice at 68° north.' },
  { missionId: 'insight', world: 'mars', siteId: 'mars-insight', blurb: 'The geophysics lander that listened for marsquakes in Elysium Planitia.' },
]

const year = (iso?: string | null) => (iso ? iso.slice(0, 4) : '')

/** the mission strip: whole cards only (no card cut at the edge), scrolled by page with the arrow buttons */
function useStrip() {
  const ref = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ start: true, end: false })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const upd = () => setEdge({ start: el.scrollLeft < 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 })
    upd()
    el.addEventListener('scroll', upd, { passive: true })
    window.addEventListener('resize', upd)
    return () => { el.removeEventListener('scroll', upd); window.removeEventListener('resize', upd) }
  }, [])
  const page = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth, behavior: 'smooth' })
  return { ref, edge, page }
}

export function Home() {
  const moonSites = sitesForBody('moon').filter((s) => s.available).length
  const marsSites = unitySitesForBody('mars').length
  const cards = CARDS.filter((c) => MISSION_BY_ID[c.missionId])
  const strip = useStrip()

  return (
    <div className="home" data-testid="home">
      <section className="home-hero" aria-labelledby="home-title">
        <span className="home-kicker">NASA mission heritage · The Moon · Mars</span>
        <h1 id="home-title">Abandoned but Not Forgotten</h1>
        <p className="home-tag">Every machine has a story. Every mission left a legacy.</p>
        <p className="home-lede">
          Landers, rovers and experiments still stand where their crews and controllers left them. Land on measured terrain,
          inspect the hardware instrument by instrument, and relive the missions from launch to their documented end.
        </p>

        <div className="home-entries" role="list" aria-label="Start exploring">
          <button role="listitem" className="home-entry moon" onClick={() => openSitePicker('moon')} data-testid="open-sites-moon">
            <span className="home-entry-ic" aria-hidden>◐</span>
            <b>Explore the Moon</b>
            <small>{moonSites} Apollo landing sites, on foot</small>
          </button>
          <button role="listitem" className="home-entry mars" onClick={() => openSitePicker('mars')} data-testid="open-sites-mars">
            <span className="home-entry-ic" aria-hidden>●</span>
            <b>Explore Mars</b>
            <small>{marsSites} landing sites with the THEIA rover</small>
          </button>
          <button role="listitem" className="home-entry relive primary" onClick={() => missionControl.open('relive', { dest: 'all' })} data-testid="home-relive">
            <span className="home-entry-ic" aria-hidden>▶</span>
            <b>Relive a mission</b>
            <small>Apollo 11 · Opportunity, launch to end</small>
          </button>
          <button role="listitem" className="home-entry solar" onClick={exploreSolarSystem} data-testid="home-explore-solar">
            <span className="home-entry-ic" aria-hidden>☀</span>
            <b>Explore the Solar System</b>
            <small>The Sun, planets and moons</small>
          </button>
        </div>

        <nav className="home-secondary" aria-label="More ways in">
          <button className="home-link" onClick={() => missionControl.open('catalogue', { dest: 'all' })} data-testid="home-missions">
            Mission catalogue and sources →
          </button>
          <span className="home-sep" aria-hidden />
          <button className="home-link" onClick={() => expedition.start('moon')} data-testid="start-expedition-moon" title="A conceptual flight from Earth (not a historical mission)">
            Fly to the Moon <span className="home-conceptual">conceptual</span>
          </button>
          <button className="home-link" onClick={() => expedition.start('mars')} data-testid="start-expedition-mars" title="A conceptual flight from Earth with the THEIA rover (not a historical mission)">
            Fly to Mars <span className="home-conceptual">conceptual</span>
          </button>
          <button className="home-link" onClick={startOpening} data-testid="home-replay-opening">Replay the opening</button>
        </nav>
      </section>

      <section className="home-missions" aria-labelledby="home-missions-h">
        <header>
          <h2 id="home-missions-h" className="home-section-h">Missions you can explore</h2>
          <div className="home-strip-nav">
            <button className="btn ghost icon" onClick={() => strip.page(-1)} disabled={strip.edge.start} aria-label="Previous missions">‹</button>
            <button className="btn ghost icon" onClick={() => strip.page(1)} disabled={strip.edge.end} aria-label="More missions">›</button>
          </div>
        </header>
        <div className="home-cards" ref={strip.ref}>
          {cards.map((c) => {
            const m = MISSION_BY_ID[c.missionId]
            const endYear = m.end?.value ? year(m.end.value) : m.status.value === 'operating' ? 'today' : ''
            const end = endYear === year(m.launch.value) ? '' : endYear
            return (
              <article key={c.missionId} className={'home-card ' + c.world} data-testid={`home-card-${c.missionId}`}>
                <div className="home-card-top">
                  <span className="home-card-meta">{c.world === 'moon' ? 'Moon' : 'Mars'} · {year(m.launch.value)}{end ? `–${end}` : ''}</span>
                  <button className="home-card-record" onClick={() => missionControl.open('catalogue', { dest: c.world, focus: c.missionId })} title="The mission record with sources">
                    Record
                  </button>
                </div>
                <h3>{m.name}</h3>
                <p>{c.blurb}</p>
                <div className="home-card-actions">
                  {c.relive && (
                    <button className="btn primary small" onClick={() => relive.open(c.relive!)} data-testid={`relive-${c.relive}`}>▶ Relive</button>
                  )}
                  {c.siteId && (
                    <button className={'btn small' + (c.relive ? ' ghost' : '')} onClick={() => leaveForSite(c.siteId!)} data-testid={`home-land-${c.siteId}`}>
                      {c.world === 'moon' ? 'Walk the site' : 'Visit the site'}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
