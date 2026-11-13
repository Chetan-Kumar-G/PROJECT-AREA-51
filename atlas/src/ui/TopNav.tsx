import { useEffect, useRef, useState } from 'react'
import { AudioPlayer } from './AudioPlayer'

/**
 * Top navigation (styles: "Top navigation" section of styles.css).
 *
 *   inline      Solar System · Explore · Missions · Discoveries      (collapse into "More" below 1000 px)
 *   More        Relive a mission, Solar System tour, Travel Mode, Spacecraft archive, Replay the opening,
 *               Help, Scientific notes                               (always in the menu)
 *
 * The search field sits beside the brand (App.tsx). Every control has one inline element and/or one menu item;
 * CSS breakpoints decide which is visible, so nothing is ever clipped or unreachable.
 */
export interface TopNavActions {
  goSolarSystem(): void
  openExplore(): void
  openMissions(): void
  openDiscoveries(): void
  openRelive(): void
  startTour(): void
  enterTravel(): void
  openArchive(): void
  replayOpening(): void
  openHelp(): void
  openAbout(): void
}

type Item = { key: string; label: string; icon: string; title: string; run: () => void; className?: string; testid?: string }

export function TopNav(a: TopNavActions) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const primary: Item[] = [
    { key: 'solar', icon: '☀', label: 'Solar System', title: 'Fly to the Solar System overview', run: a.goSolarSystem, testid: 'nav-solar' },
    { key: 'explore', icon: '◉', label: 'Explore', title: 'Land at a Moon or Mars site (Missions › Explore)', run: a.openExplore, className: 'mc-nav-btn', testid: 'nav-explore' },
    { key: 'missions', icon: '✪', label: 'Missions', title: 'Historical missions: relive, catalogue and sources (G)', run: a.openMissions, testid: 'nav-missions' },
    { key: 'discoveries', icon: '◇', label: 'Discoveries', title: 'The historical hardware and instruments you have found', run: a.openDiscoveries, testid: 'nav-discoveries' },
  ]
  const experiences: Item[] = [
    { key: 'relive', icon: '▶', label: 'Relive a mission', title: 'Apollo 11 and Opportunity, from launch to their documented conclusions', run: a.openRelive, testid: 'nav-relive' },
    { key: 'tour', icon: '✦', label: 'Solar System tour', title: 'A guided flight from the Sun to Neptune', run: a.startTour, testid: 'nav-tour' },
    { key: 'travel', icon: '▲', label: 'Travel Mode', title: 'Pilot a spacecraft through the Solar System', run: a.enterTravel, testid: 'nav-travel' },
    { key: 'archive', icon: '◇', label: 'Spacecraft archive', title: 'Official NASA 3D models, validated against sourced dimensions', run: a.openArchive, testid: 'nav-archive' },
    { key: 'opening', icon: '◎', label: 'Replay the opening', title: 'From the Milky Way into the Solar System', run: a.replayOpening, testid: 'nav-replay-opening' },
  ]
  const help: Item[] = [
    { key: 'help', icon: '?', label: 'Help & controls', title: 'Keyboard and navigation controls', run: a.openHelp },
    { key: 'notes', icon: 'ⓘ', label: 'Scientific notes', title: 'Data sources, accuracy and credits', run: a.openAbout },
  ]

  // close on outside click / Escape; focus the first item on open and return focus to the button on close
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        btnRef.current?.focus()
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []).filter((b) => b.offsetParent !== null)
        if (!items.length) return
        e.preventDefault()
        const i = items.indexOf(document.activeElement as HTMLButtonElement)
        const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length
        items[next].focus()
      }
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey, true)
    requestAnimationFrame(() => {
      const first = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []).find((b) => b.offsetParent !== null)
      first?.focus()
    })
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  const run = (it: Item) => {
    setOpen(false)
    it.run()
  }

  const menuItem = (it: Item) => (
    <button key={it.key} role="menuitem" className="nav-menu-item" onClick={() => run(it)} title={it.title} data-testid={it.testid ? `${it.testid}-menu` : undefined}>
      <span aria-hidden className="nav-menu-ic">{it.icon}</span>
      {it.label}
    </button>
  )

  return (
    <nav className="topnav" aria-label="Main navigation">
      <div className="nav-group nav-primary">
        {primary.map((it) => (
          <button key={it.key} className={'btn ghost ' + (it.className ?? '')} onClick={it.run} title={it.title} data-testid={it.testid}>
            <span aria-hidden>{it.icon}</span>
            <span className="nav-label">{it.label}</span>
          </button>
        ))}
      </div>
      <AudioPlayer />

      <div className="nav-more" ref={wrapRef}>
        <button
          ref={btnRef}
          className={'btn ghost nav-more-btn' + (open ? ' on' : '')}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls="nav-more-menu"
          onClick={() => setOpen((o) => !o)}
          title="More"
          data-testid="nav-more"
        >
          <span aria-hidden>☰</span>
          <span className="nav-label">More</span>
        </button>
        {open && (
          <div id="nav-more-menu" className="nav-menu glass" role="menu" aria-label="More" ref={menuRef}>
            <div className="nav-menu-sec menu-primary" role="group" aria-label="Navigate">
              <div className="nav-menu-h">Navigate</div>
              {primary.map(menuItem)}
            </div>
            <div className="nav-menu-sec menu-always" role="group" aria-label="Experiences">
              <div className="nav-menu-h">Experiences</div>
              {experiences.map(menuItem)}
            </div>
            <div className="nav-menu-sec menu-always" role="group" aria-label="Help">
              <div className="nav-menu-h">Help</div>
              {help.map(menuItem)}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
