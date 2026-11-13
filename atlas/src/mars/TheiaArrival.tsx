/**
 * E3/E4: the arrival (and departure) panel shared by every Mars scene — the conceptual THEIA carrier lands on the measured terrain, opens its
 * ramp and THEIA drives out. The phase comes from the Unity player (pose.arrivalPhase); Esc / Skip ends in the same
 * landed state (never a cut that leaves THEIA inside).
 */
import type { MarsPose, MarsReady } from './marsBridge'

const PHASES: { id: string; label: string; text: string }[] = [
  { id: 'descent', label: 'Powered descent', text: 'The carrier descends on its engines toward a flat patch clear of the historical hardware.' },
  { id: 'touchdown', label: 'Touchdown', text: 'Footpads on the measured terrain; engines off.' },
  { id: 'door', label: 'Ramp opening', text: 'The rear door lowers into a ramp to the ground.' },
  { id: 'deploy', label: 'THEIA drives out', text: 'THEIA rolls down the ramp onto Mars.' },
  { id: 'ready', label: 'THEIA on Mars', text: 'THEIA on the measured ground beside the carrier. You take the controls next.' },
]

const DEPART: { id: string; label: string; text: string }[] = [
  { id: 'return', label: 'THEIA drives back', text: 'THEIA drives itself back to the carrier, around the historical hardware, and lines up behind the ramp.' },
  { id: 'board', label: 'Boarding', text: 'THEIA climbs the ramp into the cargo bay.' },
  { id: 'door', label: 'Ramp closing', text: 'The ramp rises and seals the bay.' },
  { id: 'liftoff', label: 'Liftoff', text: 'Engines ignite and the carrier climbs away. The historical hardware stays exactly where it is.' },
]

/** E4: "Return to orbit" at a Mars scene. The phase comes from the Unity player (pose.departPhase). */
export function TheiaDeparture({ siteName, latLonText, pose, onSkip }: { siteName: string; latLonText: string; pose: MarsPose | null; onSkip: () => void }) {
  const phase = pose?.departPhase || 'return'
  const k = Math.max(0, DEPART.findIndex((p) => p.id === phase))
  const lapse = pose?.timeLapse ?? 1
  return (
    <div className="surf-intro mars-arrival theia-arrival" role="status" aria-live="polite" data-testid="theia-departure" data-phase={phase}>
      <span className="eyebrow">RETURN TO ORBIT · {DEPART[k].label.toUpperCase()}</span>
      <b>{siteName}</b>
      <span className="muted small">{latLonText} · Mars</span>
      <ol className="theia-steps" aria-label="Departure sequence">
        {DEPART.map((p, i) => (
          <li key={p.id} className={i < k ? 'done' : i === k ? 'on' : ''}>{p.label}</li>
        ))}
      </ol>
      <span className="small">{DEPART[k].text}</span>
      {phase === 'return' && pose?.routeM ? (
        <span className="small" data-testid="theia-return-route">
          Route back: {pose.routeM.toFixed(0)} m{lapse > 1.05 ? <> · <b>time-lapse ×{lapse.toFixed(1)}</b> (shown faster than THEIA drives)</> : ''}
        </span>
      ) : null}
      {phase === 'liftoff' && pose?.carrierAlt != null && pose.carrierAlt > 0.5 ? <span className="small">Altitude {pose.carrierAlt.toFixed(0)} m</span> : null}
      <span className="muted small mars-honest" title="The drive back is automatic and the timings are illustrative.">
        THEIA and its carrier are imagined vehicles, not NASA hardware.
      </span>
      <button className="btn ghost small" onClick={onSkip}>Skip <kbd>Esc</kbd></button>
    </div>
  )
}

export function TheiaArrival({ siteName, latLonText, pose, ready, onSkip }: { siteName: string; latLonText: string; pose: MarsPose | null; ready: MarsReady | null; onSkip: () => void }) {
  const phase = pose?.arrivalPhase || 'descent'
  const k = Math.max(0, PHASES.findIndex((p) => p.id === phase))
  const pick = ready?.carrier?.pick
  return (
    <div className="surf-intro mars-arrival theia-arrival" role="status" aria-live="polite" data-testid="theia-arrival" data-phase={phase}>
      <span className="eyebrow">ARRIVAL · {PHASES[k].label.toUpperCase()}</span>
      <b>{siteName}</b>
      <span className="muted small">{latLonText} · Mars</span>
      <ol className="theia-steps" aria-label="Landing sequence">
        {PHASES.map((p, i) => (
          <li key={p.id} className={i < k ? 'done' : i === k ? 'on' : ''}>{p.label}</li>
        ))}
      </ol>
      <span className="small">{PHASES[k].text}</span>
      <span className="muted small mars-honest" title={`Landing spot chosen automatically${pick ? ` (${pick.valid} flat, clear candidates of ${pick.tested}; ground relief under the footpads ${pick.footprintReliefM.toFixed(2)} m)` : ''}.`}>
        THEIA and its carrier are imagined vehicles, not NASA hardware.
      </span>
      <button className="btn ghost small" onClick={onSkip}>Skip <kbd>Esc</kbd></button>
    </div>
  )
}
