/**
 * "Returning to the present": the transition after a historical replay, and an honest note of the state check
 * (presentState.ts verifyPresent) — the same place and view, or exactly what differs.
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePresent } from './presentState'
import { useRelive } from './player'

export function PresentReturn() {
  const returning = usePresent((s) => s.returning)
  const check = usePresent((s) => s.lastCheck)
  const [fade, setFade] = useState(false)
  const reliving = useRelive((s) => !!s.id)
  useEffect(() => {
    if (!returning) return
    setFade(true)
    const a = window.setTimeout(() => setFade(false), 1500)
    const b = window.setTimeout(() => usePresent.getState().set({ returning: null }), 9000)
    return () => { window.clearTimeout(a); window.clearTimeout(b) }
  }, [returning])
  // a new replay started meanwhile: the note belongs to the present, never over a replay
  if (!returning || reliving) return null
  const mine = check && check.at >= returning.at ? check : null
  const where = returning.siteName ? returning.siteName.split(' — ')[0] : 'the explorer'
  return createPortal(
    <>
      {fade && (
        <div className="present-fade" aria-hidden>
          <span className="eyebrow">RETURNING TO THE PRESENT</span>
          <b>{where}</b>
        </div>
      )}
      <div className="present-toast glass" role="status" aria-live="polite" data-testid="present-toast" data-path={returning.path} data-ok={mine ? String(mine.ok) : 'pending'}>
        <span className="eyebrow">BACK IN THE PRESENT</span>
        <b>{where}</b>
        {!mine ? (
          <span className="small muted">Checking your exploration state…</span>
        ) : mine.ok ? (
          <span className="small">{returning.path === 'orbit' ? 'The explorer is as you left it.' : 'Same position, heading, camera, open panels and discoveries as before the replay.'}{returning.path === 'rebuilt' ? ' (The surface had to be reloaded; your saved state was applied.)' : ''}</span>
        ) : (
          <span className="small warn">Restored, with {mine.diffs.length} difference{mine.diffs.length > 1 ? 's' : ''}: {mine.diffs.slice(0, 3).join('; ')}</span>
        )}
      </div>
    </>,
    document.body,
  )
}
