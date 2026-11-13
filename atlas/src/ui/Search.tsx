import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store/store'
import { search, KIND_LABEL, type SearchEntry } from '../search/searchIndex'
import { MISSION_BY_ID } from '../missions'
import { relive } from '../relive/player'
import { missionControl } from '../missionControl/missionState'
import { leaveForSite } from '../missionControl/MissionControl'
import { finishOpening } from '../opening/openingState'

const ICON: Record<SearchEntry['kind'], string> = {
  planet: '●', moon: '○', 'small-body': '◐', site: '◉', mission: '✪', replay: '▶', hardware: '🛰', instrument: '⚙', landmark: '⛰',
}

/** what choosing a result does — every result leads to something that exists in the app */
export function runSearchEntry(e: SearchEntry) {
  const st = useStore.getState()
  if (e.kind === 'replay' && e.scriptId) return relive.open(e.scriptId)
  if (e.bodyId) {
    finishOpening()
    if (st.surfaceSiteId) st.exitSurface()
    if (st.phase === 'intro') st.setPhase('explore')
    return useStore.getState().travel(e.bodyId)
  }
  if ((e.kind === 'site' || e.kind === 'landmark' || e.kind === 'hardware' || e.kind === 'instrument') && e.siteId) {
    finishOpening()
    return leaveForSite(e.siteId)
  }
  if (e.missionId) {
    const target = MISSION_BY_ID[e.missionId]?.target
    return missionControl.open('catalogue', { dest: target === 'moon' || target === 'mars' ? target : 'all', focus: e.missionId })
  }
}

const actionText = (e: SearchEntry) =>
  e.kind === 'replay' ? 'Relive' : e.bodyId ? 'Fly to' : e.siteId && e.kind !== 'mission' ? 'Land' : 'Record'

export function Search({ hasActiveModal = false }: { hasActiveModal?: boolean }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const results = useMemo(() => search(q, undefined, 10), [q])

  useEffect(() => {
    if (hasActiveModal) {
      setOpen(false)
      inputRef.current?.blur()
    }
  }, [hasActiveModal])

  // '/' or Ctrl+K focuses the search (never while typing, never over a modal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (hasActiveModal) return
      const t = e.target as HTMLElement | null
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return
      if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key === 'k')) {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasActiveModal])

  const choose = (e: SearchEntry) => {
    setOpen(false)
    setQ('')
    inputRef.current?.blur()
    runSearchEntry(e)
  }

  return (
    <div className="search" role="search">
      <span className="search-ic" aria-hidden>⌕</span>
      <input
        ref={inputRef}
        placeholder="Search missions, planets and discoveries"
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
          setActiveIndex(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 220)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            setOpen(false)
            inputRef.current?.blur()
          } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex((i) => (i + 1) % Math.max(1, results.length))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex((i) => (i - 1 + results.length) % Math.max(1, results.length))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            if (results[activeIndex]) choose(results[activeIndex])
          }
        }}
        aria-label="Search missions, planets and discoveries"
        data-testid="search-input"
      />
      {q ? (
        <button className="search-clear" onClick={() => { setQ(''); inputRef.current?.focus() }} title="Clear search" aria-label="Clear search">✕</button>
      ) : (
        <span className="search-kbd">/</span>
      )}

      {open && q && (
        <div className="results glass" role="listbox" aria-label="Search results">
          {results.map((r, idx) => (
            <button
              key={r.key}
              role="option"
              aria-selected={idx === activeIndex}
              className={'search-hit' + (idx === activeIndex ? ' active' : '')}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => choose(r)}
              data-testid={`search-hit-${r.key}`}
            >
              <span className="search-hit-main">
                <i aria-hidden>{ICON[r.kind]}</i>
                <span>
                  <b>{r.name}</b>
                  <small>{r.detail}</small>
                </span>
              </span>
              <em>{KIND_LABEL[r.kind]} · {actionText(r)}</em>
            </button>
          ))}
          {!results.length && <div className="empty">No planet, mission, site or instrument matches “{q}”.</div>}
        </div>
      )}
    </div>
  )
}
