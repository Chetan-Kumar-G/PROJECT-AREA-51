import { Component, ReactNode, Suspense, lazy, useEffect, useState } from 'react'
import { CosmicCanvas } from '../scene/Scene'
import { ExploreSurfaceButton, SitePickerHost } from '../surface/ExploreSurface'
import { UNITY_SITE_BY_ID } from '../surface/sites'
import { ExpeditionOverlay } from '../expedition/ExpeditionOverlay'
import { MissionControlHost } from '../missionControl/MissionControl'
import { PresentReturn } from '../relive/PresentReturn'
import { missionControl } from '../missionControl/missionState'
import { useExpedition, expedition } from '../expedition/expedition'
import { Labels } from './Labels'
import { useStore } from '../store/store'
import { nav, interrupt } from '../store/nav'
import { sub, len, SUN_POS } from '../astro/coords'
import { labelState } from '../scene/labelState'
import { Browser, Info, TimeBar, StatusBar, Diagnostics, TourCard } from './Shell'
import { ScaleBreadcrumbs } from './ScaleBreadcrumbs'
import { TravelProgressHUD } from '../travel/TravelProgressHUD'
import { subscribeTravelEngine, travelEngineState, travelSettings } from '../travel/travelEngine'
import { BY_ID } from '../data/catalog'
import { ModuleBoundary, ModuleLoader } from './ModuleBoundary'
import { TopNav } from './TopNav'
import { installInput } from '../input/appInput'
import { useRelive } from '../relive/player'
import { Search } from './Search'
import { Home, exploreSolarSystem } from './Home'
import { Opening } from '../opening/Opening'
import { useOpening, startOpening, finishOpening } from '../opening/openingState'

// Lazy-loaded heavy modules for production bundle optimization and code-splitting
const TravelHUD = lazy(() => import('../travel/TravelHUD').then((m) => ({ default: m.TravelHUD })))
const CockpitOverlay = lazy(() => import('../travel/CockpitOverlay').then((m) => ({ default: m.CockpitOverlay })))
const NavMapModal = lazy(() => import('../travel/NavMapModal').then((m) => ({ default: m.NavMapModal })))
const HelpModal = lazy(() => import('./HelpModal').then((m) => ({ default: m.HelpModal })))
const AboutModal = lazy(() => import('./AboutModal').then((m) => ({ default: m.AboutModal })))
const SurfaceExperience = lazy(() => import('../surface/SurfaceExperience'))
const MarsExperience = lazy(() => import('../mars/MarsExperience'))
const MarsSiteExperience = lazy(() => import('../mars/MarsSiteExperience'))
const SpacecraftArchive = lazy(() => import('../surface/SpacecraftArchive'))
const ReliveMission = lazy(() => import('../relive/ReliveMission'))

class Boundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null }
  static getDerivedStateFromError(err: Error) {
    return { err }
  }
  render() {
    if (this.state.err) {
      return (
        <div className="fallback glass">
          <h2>The 3D view could not start</h2>
          <p>{this.state.err.message}</p>
          <p>
            WebGL may be disabled or unsupported. Try another browser, enable hardware acceleration, or use Performance quality.
          </p>
          <button className="btn primary" onClick={() => this.setState({ err: null })}>
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function webglOk(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

function Loader() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setInterval(() => {
      if (labelState.camera) {
        setReady(true)
        clearInterval(t)
      }
    }, 100)
    return () => clearInterval(t)
  }, [])
  return (
    <div className={'loader' + (ready ? ' gone' : '')} aria-hidden={ready}>
      <div className="ring" />
      <span>Preparing the Solar System…</span>
    </div>
  )
}

export function App() {
  // the ONE gameplay keyboard owner: every scene reads its bindings (WASD move, arrows look) from here
  useEffect(() => installInput(), [])
  const phase = useStore((s) => s.phase)
  const {
    quality,
    leftOpen,
    rightOpen,
    showStats,
    showOrbits,
    showLabels,
    navMapOpen,
    error,
    selectedId,
    timeOpen,
    set,
  } = useStore()
  const surfaceSiteId = useStore((s) => s.surfaceSiteId)
  const expeditionStage = useExpedition((s) => s.stage)
  // warp flight in progress: large panels step aside so the flight is the focus (restored on arrival)
  const [inFlight, setInFlight] = useState(false)
  useEffect(() => subscribeTravelEngine(() => setInFlight(travelEngineState.phase === 'traveling')), [])
  // The bottom stack (dock, time bar) wraps to more rows on narrow screens; panels and the time bar are positioned
  // from its MEASURED height (CSS vars --dock-h / --timebar-h) instead of fixed per-breakpoint guesses.
  useEffect(() => {
    const root = document.documentElement
    const ro = new ResizeObserver(() => {
      const dock = document.querySelector('.dock') as HTMLElement | null
      const tb = document.querySelector('.timebar') as HTMLElement | null
      root.style.setProperty('--dock-h', `${dock ? Math.ceil(dock.getBoundingClientRect().height) : 0}px`)
      root.style.setProperty('--timebar-h', `${tb ? Math.ceil(tb.getBoundingClientRect().height) : 0}px`)
    })
    let watched: Element[] = []
    const watch = () => {
      const now = Array.from(document.querySelectorAll('.dock, .timebar'))
      if (now.length === watched.length && now.every((el, i) => el === watched[i])) return // nothing (un)mounted
      watched = now
      ro.disconnect()
      now.forEach((el) => ro.observe(el))
      if (!now.some((el) => el.classList.contains('timebar'))) root.style.setProperty('--timebar-h', '0px')
    }
    watch()
    // re-attach only when the dock / time bar mount or unmount (cheap identity check per DOM mutation)
    const mo = new MutationObserver(watch)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => { ro.disconnect(); mo.disconnect() }
  }, [])
  // panel shortcuts (never while typing): I = Inspector, L = Catalogue list, T = Timeline
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (!t || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
      if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return
      const s = useStore.getState()
      if (s.phase === 'intro' || s.phase === 'travel' || s.surfaceSiteId) return
      if (e.code === 'KeyI' && s.selectedId) s.set({ rightOpen: !s.rightOpen })
      else if (e.code === 'KeyL') s.set({ leftOpen: !s.leftOpen })
      else if (e.code === 'KeyT') s.set({ timeOpen: !s.timeOpen })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const [about, setAbout] = useState(false)
  const [help, setHelp] = useState(false)
  const [archive, setArchive] = useState(false)
  const [gl, setGl] = useState<boolean | null>(null)
  const [speed, setSpeed] = useState(nav.speedMult)
  const [flightSpeed, setFlightSpeed] = useState(travelSettings.speed)
  const [reduceMotion, setReduceMotion] = useState(travelSettings.reduceMotion)
  /** the dock's advanced settings (speed, flight time, motion, quality, diagnostics) live in a popover */
  const [dockMore, setDockMore] = useState(false)
  useEffect(() => {
    if (!dockMore) return
    const down = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest?.('.dock-more')) setDockMore(false) }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setDockMore(false) } }
    window.addEventListener('pointerdown', down)
    window.addEventListener('keydown', key, true)
    return () => { window.removeEventListener('pointerdown', down); window.removeEventListener('keydown', key, true) }
  }, [dockMore])
  const [, force] = useState(0)

  useEffect(() => setGl(webglOk()), [])
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 500)
    return () => clearInterval(t)
  }, [])

  const reliveId = useRelive((r) => r.id)
  const openingStage = useOpening((o) => o.stage)
  // the opening cinematic owns the screen until it ends (it boots once the renderer has drawn: stage 'idle' before)
  const cinematic = openingStage !== 'done'
  const hasActiveModal = archive || help || about || navMapOpen

  const inSolar = len(sub(nav.pos, SUN_POS)) < 0.02
  const isTour = phase === 'tour'
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 860
  const showInfo = rightOpen && !!selectedId && (!isTour || !isMobile) && phase !== 'travel' && !inFlight
  const st = useStore.getState()

  if (gl === false) {
    return (
      <div className="fallback glass">
        <h2>WebGL is not available</h2>
        <p>Abandoned but Not Forgotten requires WebGL 2.0 or WebGL 1.0. Please enable hardware acceleration in your browser settings.</p>
      </div>
    )
  }

  const timeRelevant = phase !== 'intro' && phase !== 'travel' && (inSolar || phase === 'tour')
  const showTimebar = timeRelevant && timeOpen && !inFlight
  const showBrowser = phase !== 'intro' && phase !== 'travel' && leftOpen && phase !== 'tour' && !inFlight
  const sel = selectedId ? BY_ID[selectedId] : null
  const showChip = !!sel && !showInfo && !inFlight && (phase === 'explore' || phase === 'tour')

  return (
    <div
      className="app"
      data-timebar={showTimebar ? 'on' : undefined}
      data-left={showBrowser ? 'open' : undefined}
      data-right={showInfo ? 'open' : undefined}
      data-inflight={inFlight ? 'on' : undefined}
      data-surface={surfaceSiteId ? 'on' : undefined}
      data-reliving={reliveId ? 'on' : undefined}
    >
      <Boundary>
        <CosmicCanvas />
      </Boundary>
      {archive && (
        <Boundary>
          <Suspense fallback={<ModuleLoader label="Loading Spacecraft Archive…" />}>
            <SpacecraftArchive onClose={() => setArchive(false)} />
          </Suspense>
        </Boundary>
      )}
      {surfaceSiteId && (
        <Boundary>
          <Suspense fallback={<ModuleLoader label="Preparing the surface…" />}>
            {UNITY_SITE_BY_ID[surfaceSiteId] ? (UNITY_SITE_BY_ID[surfaceSiteId].site ? <MarsSiteExperience key={surfaceSiteId} /> : <MarsExperience />) : <SurfaceExperience />}
          </Suspense>
        </Boundary>
      )}
      {reliveId && (
        <Boundary>
          <Suspense fallback={<ModuleLoader label="Preparing the mission…" />}>
            <ReliveMission />
          </Suspense>
        </Boundary>
      )}
      {!surfaceSiteId && <ExpeditionOverlay />}
      {!surfaceSiteId && phase !== 'intro' && <ExploreSurfaceButton hidden={inFlight || hasActiveModal} />}
      <SitePickerHost />
      <MissionControlHost />
      <PresentReturn />
      {/* orbital labels are hidden on a surface: unmount them there (they ticked every frame for nothing) */}
      {phase !== 'intro' && phase !== 'travel' && !surfaceSiteId && <Labels />}
      <Loader />

      {/* Opening cinematic: Milky Way overview → Solar System (drives the orbital renderer above) */}
      <Opening />

      {/* Top Application Header (hidden in Travel Mode and during the opening) */}
      {phase !== 'travel' && !cinematic && (
        <header className="top glass">
          <button
            className="brand"
            onClick={() => {
              finishOpening()
              st.set({ phase: 'intro', selectedId: null, rightOpen: false, leftOpen: false })
            }}
            title="Home"
            aria-label="Abandoned but Not Forgotten: home"
            data-testid="brand-home"
          >
            <span className="logo" aria-hidden>
              ✦
            </span>
            <div>
              <b>ABANDONED BUT NOT FORGOTTEN</b>
              <div className="sub">
                <span className="live-dot" />
                <span>EVERY MACHINE HAS A STORY</span>
              </div>
            </div>
          </button>

          <Search hasActiveModal={hasActiveModal} />

          <TopNav
            goSolarSystem={exploreSolarSystem}
            openExplore={() => missionControl.open('explore')}
            openMissions={() => missionControl.open('catalogue')}
            openDiscoveries={() => missionControl.open('discovered')}
            openRelive={() => missionControl.open('relive')}
            startTour={() => st.startTour()}
            enterTravel={() => st.enterTravelMode()}
            openArchive={() => setArchive(true)}
            replayOpening={startOpening}
            openHelp={() => setHelp(true)}
            openAbout={() => setAbout(true)}
          />
        </header>
      )}

      {/* Where am I in the Solar System */}
      {phase !== 'intro' && <ScaleBreadcrumbs />}

      {/* Floating Travel Progress HUD (the opening has its own captions) */}
      {expeditionStage === 'idle' && !cinematic && <TravelProgressHUD />}

      {/* Homepage, over the live Solar System */}
      {phase === 'intro' && !cinematic && !reliveId && !surfaceSiteId && <Home />}

      {/* TRAVEL MODE INTERACTIVE SIMULATION */}
      {phase === 'travel' && (
        <>
          <ModuleBoundary name="Cockpit Overlay">
            <Suspense fallback={<ModuleLoader label="Loading Cockpit…" />}>
              <CockpitOverlay />
            </Suspense>
          </ModuleBoundary>

          <ModuleBoundary name="Flight Systems HUD">
            <Suspense fallback={<ModuleLoader label="Loading Flight HUD…" />}>
              <TravelHUD />
            </Suspense>
          </ModuleBoundary>

          {navMapOpen && (
            <ModuleBoundary name="Tactical Nav Map">
              <Suspense fallback={<ModuleLoader label="Loading Navigation Map…" />}>
                <NavMapModal onClose={() => set({ navMapOpen: false })} />
              </Suspense>
            </ModuleBoundary>
          )}
        </>
      )}

      {/* Main Exploration Mode UI (Hidden in Event Mode) */}
      {phase !== 'intro' && phase !== 'travel' && (
        <>
          {showBrowser && <Browser />}
          {!leftOpen && phase !== 'tour' && !inFlight && (
            <button
              className="btn reopen glass"
              onClick={() => set({ leftOpen: true })}
              title="Show object catalogue"
              aria-label="Show object catalogue"
            >
              ☰ Objects
            </button>
          )}

          {phase === 'tour' && <TourCard />}
          {showInfo && <Info />}
          {showChip && sel && (
            <div className="sel-chip glass" role="group" aria-label={`Selected: ${sel.name}`}>
              <span className="sel-chip-name">{sel.name}</span>
              <span className="sel-chip-cat">{sel.category.replace('-', ' ')}</span>
              <button className="sel-chip-btn" onClick={() => set({ rightOpen: true })} title="Open the Inspector (I)">Details</button>
              <button className="sel-chip-btn" onClick={() => st.travel(sel.id)} title="Fly here">Fly here</button>
              {(sel.id === 'moon' || sel.id === 'mars') && (
                <button className="sel-chip-btn" onClick={() => expedition.start(sel.id as 'moon' | 'mars')} title="Depart from Earth, fly there and land at a historic site">Expedition</button>
              )}
              <button className="sel-chip-x" onClick={() => st.select(null)} aria-label="Clear selection" title="Clear selection">✕</button>
            </div>
          )}

          {showTimebar && <TimeBar />}


          <StatusBar />

          {/* Bottom Dock Controls */}
          <div className="dock glass" role="toolbar" aria-label="Solar System controls">
            {timeRelevant && (
              <button
                className={'tog time-toggle' + (timeOpen ? ' on' : '')}
                onClick={() => set({ timeOpen: !timeOpen })}
                aria-pressed={timeOpen}
                aria-label={timeOpen ? 'Hide timeline (T)' : 'Show timeline (T)'}
                title={timeOpen ? 'Hide timeline (T)' : 'Show timeline (T)'}
              >
                <span aria-hidden>◷</span> {new Date(useStore.getState().simMs).toISOString().slice(0, 10)}
              </button>
            )}
            <button
              className="btn ghost"
              onClick={() => {
                interrupt()
                nav.followId = null
                nav.orbit = false
                if (useStore.getState().phase === 'tour') useStore.getState().tourExit()
              }}
              title="Stop tracking target and fly freely"
            >
              ✈ Free flight
            </button>

            <span className="divider" />

            <button
              className={'tog' + (showOrbits ? ' on' : '')}
              aria-pressed={showOrbits}
              onClick={() => set({ showOrbits: !showOrbits })}
              title="Toggle Keplerian planetary orbits"
            >
              ◯ Orbits
            </button>
            <button
              className={'tog' + (showLabels ? ' on' : '')}
              aria-pressed={showLabels}
              onClick={() => set({ showLabels: !showLabels })}
              title="Toggle celestial object labels"
            >
              Aa Labels
            </button>
            <div className="dock-more">
              <button
                className={'tog' + (dockMore ? ' on' : '')}
                aria-expanded={dockMore}
                aria-controls="dock-settings"
                onClick={() => setDockMore((v) => !v)}
                title="View settings: camera speed, flight time, motion, quality, diagnostics"
                data-testid="dock-settings"
              >
                ⚙ <span className="dock-more-label">Settings</span>
              </button>
              {dockMore && (
                <div id="dock-settings" className="dock-popover glass" role="group" aria-label="View settings">
                  <label title="Camera translation speed multiplier">
                    Speed
                    <select
                      value={speed}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        nav.speedMult = v
                        setSpeed(v)
                      }}
                    >
                      {[0.1, 0.5, 1, 3, 10, 50].map((v) => (
                        <option key={v} value={v}>
                          ×{v}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label title="Warp flight time compression (flights are shortened; the HUD shows the real light time)">
                    Flight
                    <select
                      value={flightSpeed}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        travelSettings.speed = v
                        setFlightSpeed(v)
                      }}
                      aria-label="Warp flight speed"
                    >
                      <option value={0.5}>Cinematic</option>
                      <option value={1}>Normal</option>
                      <option value={2}>Fast</option>
                    </select>
                  </label>
                  <button
                    className={'tog' + (reduceMotion ? ' on' : '')}
                    aria-pressed={reduceMotion}
                    onClick={() => {
                      travelSettings.reduceMotion = !reduceMotion
                      setReduceMotion(!reduceMotion)
                    }}
                    title="Reduce motion: no warp streaks during flights"
                  >
                    Reduce motion
                  </button>

                  <label title="Rendering resolution and particle density">
                    Quality
                    <select
                      value={quality}
                      onChange={(e) =>
                        set({ quality: e.target.value as 'high' | 'balanced' | 'performance' })
                      }
                    >
                      <option value="high">High</option>
                      <option value="balanced">Balanced</option>
                      <option value="performance">Performance</option>
                    </select>
                  </label>

                  <button
                    className={'tog' + (showStats ? ' on' : '')}
                    aria-pressed={showStats}
                    onClick={() => set({ showStats: !showStats })}
                    title="Toggle telemetry & diagnostics"
                    aria-label="Diagnostics"
                  >
                    Diagnostics
                  </button>
                </div>
              )}
            </div>
          </div>

          {showStats && <Diagnostics />}
        </>
      )}

      {help && (
        <ModuleBoundary name="Controls & Reference">
          <Suspense fallback={<ModuleLoader label="Loading Reference…" />}>
            <HelpModal onClose={() => setHelp(false)} />
          </Suspense>
        </ModuleBoundary>
      )}

      {about && (
        <ModuleBoundary name="Scientific Notes">
          <Suspense fallback={<ModuleLoader label="Loading Scientific Notes…" />}>
            <AboutModal onClose={() => setAbout(false)} />
          </Suspense>
        </ModuleBoundary>
      )}

      {error && (
        <div className="banner glass" role="alert">
          <span>{error}</span>
          <button className="btn" onClick={() => location.reload()}>
            Recover Scene
          </button>
        </div>
      )}
    </div>
  )
}
