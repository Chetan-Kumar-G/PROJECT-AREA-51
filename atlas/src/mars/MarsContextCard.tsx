import { MISSION_BY_ID, OBJECT_BY_ID, type Component } from '../missions'
import { plainObject, plainComponent } from '../discovery/plain'
import { missionStory } from './missionChapters'
import './marsNav.css'

/**
 * The compact contextual panel (audit U1) — replaces the docked record side windows on Mars. It sits low on the screen
 * so the vehicle the camera frames stays in view, and holds only what matters at a glance:
 *   name · mission · location · what it is for (plain words) · one key discovery (sourced)
 *   Explore (inspect its instruments — only THIS object's catalogue components, never another mission's)
 *   View details (the full record, on demand) · Mission story (chapters and timeline) · Relive (where available)
 *
 * mode 'nearby': THEIA is close to it (replaces the "E Inspect" prompt). mode 'inspect': its record is open and the
 * camera frames it.
 */
export function MarsContextCard({
  mode, objectId, label, kindLabel, locationText, component, framed, onComponent, onExplore, onDetails, onStory, onRelive, onClose,
}: {
  mode: 'nearby' | 'inspect'
  objectId: string | null
  label: string
  kindLabel: string
  locationText: string
  component: string | null
  /** what the camera does for a component: 'part' (framed and highlighted), 'inside', or 'whole' (frames the vehicle) */
  framed: (c: Component) => 'part' | 'inside' | 'whole'
  onComponent: (id: string | null) => void
  onExplore: () => void
  onDetails: () => void
  onStory: () => void
  onRelive?: () => void
  onClose: () => void
}) {
  const obj = objectId ? OBJECT_BY_ID[objectId] : undefined
  const mission = obj ? MISSION_BY_ID[obj.missionId] : undefined
  const purpose = objectId ? plainObject(objectId) : null
  // the key discovery: the object's own first sourced finding, else the mission story's first discovery line
  const key = obj?.findings?.[0] ?? (mission ? missionStory(mission.id)?.chapters.find((c) => c.id === 'discoveries')?.items[0] : undefined)
  const comps = obj?.components ?? []
  const sel = comps.find((c) => c.id === component)
  return (
    <section className={`mctx glass mctx-${mode}`} role={mode === 'inspect' ? 'dialog' : 'region'} aria-label={`${label}: summary`} data-testid="mars-context-card" data-mode={mode}>
      <header className="mctx-head">
        <div>
          <span className="eyebrow">{kindLabel}{mission ? ` · ${mission.name.toUpperCase()}` : ''}</span>
          <h2>{label}</h2>
          <span className="muted small">{locationText}</span>
        </div>
        {mode === 'inspect' && <button className="discovery-close" onClick={onClose} aria-label="Back to exploring (Esc)" title="Back to exploring (Esc)">✕</button>}
      </header>
      {purpose && <p className="mctx-purpose" data-testid="mctx-purpose">{purpose}</p>}
      {key && <p className="mctx-key small" data-testid="mctx-key"><b>Key discovery:</b> {key.text}</p>}
      {mode === 'inspect' && comps.length > 0 && (
        <div className="mctx-parts" role="group" aria-label="Instruments and parts">
          <button className={component === null ? 'on' : ''} onClick={() => onComponent(null)}>Whole {obj?.category.includes('rover') ? 'rover' : 'vehicle'}</button>
          {comps.map((c) => {
            const f = framed(c)
            return (
              <button key={c.id} className={component === c.id ? 'on' : ''} onClick={() => onComponent(c.id)} data-part={f === 'part' ? c.part ?? c.id : undefined} data-testid="mctx-part"
                title={f === 'part' ? 'framed and highlighted on the model' : f === 'inside' ? 'inside the body: the view frames the body' : 'the view frames the whole vehicle'}>
                {c.name}{f === 'inside' ? ' · inside' : ''}
              </button>
            )
          })}
        </div>
      )}
      {mode === 'inspect' && sel && (
        <p className="mctx-part-line small" data-testid="mctx-part-line"><b>{sel.name}:</b> {plainComponent(objectId!, sel.id) ?? sel.description}</p>
      )}
      <div className="mctx-actions">
        {mode === 'nearby' && <button className="btn small" onClick={onExplore} data-testid="mctx-explore"><kbd>E</kbd> Explore</button>}
        <button className="btn small ghost" onClick={onDetails} data-testid="mctx-details">View details</button>
        {mission && <button className="btn small ghost" onClick={onStory} data-testid="mctx-story">📖 Mission story</button>}
        {onRelive && <button className="btn small" onClick={onRelive} data-testid="relive-mission">⏪ Relive the mission</button>}
      </div>
    </section>
  )
}
