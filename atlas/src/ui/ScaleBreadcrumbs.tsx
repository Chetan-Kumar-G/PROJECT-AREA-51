import { useStore } from '../store/store'
import { initiateTravel } from '../travel/travelEngine'
import { BY_ID } from '../data/catalog'
import { SOLAR_OVERVIEW_LY } from '../opening/openingState'

/** Where am I: Solar System › parent planet › selected body (the navigable scope is the Solar System) */
export function ScaleBreadcrumbs() {
  const selectedId = useStore((s) => s.selectedId)
  const simMs = useStore((s) => s.simMs)
  const phase = useStore((s) => s.phase)

  if (phase === 'intro' || phase === 'travel') return null

  const crumbs: { label: string; action: () => void }[] = [
    { label: 'Solar System', action: () => initiateTravel('sun', simMs, { viewDistanceLy: SOLAR_OVERVIEW_LY }) },
  ]
  const sel = selectedId ? BY_ID[selectedId] : null
  if (sel && sel.id !== 'sun' && sel.id !== 'milky-way' && sel.id !== 'orion-arm') {
    const parent = sel.parents[0] && sel.parents[0] !== 'sun' ? BY_ID[sel.parents[0]] : null
    if (parent) crumbs.push({ label: parent.name, action: () => initiateTravel(parent.id, simMs) })
    crumbs.push({ label: sel.name, action: () => initiateTravel(sel.id, simMs) })
  }

  return (
    <div className="scale-breadcrumbs-bar glass" aria-label="Location in the Solar System">
      <div className="breadcrumbs-list">
        <span className="crumb-root-icon">☀</span>
        {crumbs.map((c, i) => (
          <span key={i} className="crumb-item">
            {i > 0 && <span className="crumb-separator">›</span>}
            <button className={`crumb-btn ${i === crumbs.length - 1 ? 'active' : ''}`} onClick={c.action} title={`Fly to ${c.label}`}>
              {c.label}
            </button>
          </span>
        ))}
      </div>

      {/* the frame and scale are shown once, in the readout above the dock (they were repeated here) */}
    </div>
  )
}
