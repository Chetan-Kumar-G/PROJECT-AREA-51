import { useEffect } from 'react'
import { ControlsPanel } from '../input/ControlsPanel'
import '../input/controls.css'

export function HelpModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  return (
    <div className="modal" onClick={onClose} role="dialog" aria-modal="true" aria-label="Controls and help">
      <div className="card glass" onClick={(e) => e.stopPropagation()}>
        <div className="eyebrow">Help</div>
        <h2>Controls &amp; navigation</h2>

        <div className="help-grid">
          <div className="help-box">
            <h4>Mouse & Touch Controls</h4>
            <table className="help-table">
              <tbody>
                <tr><td>Left Drag</td><td>Rotate camera (Yaw / Pitch)</td></tr>
                <tr><td>Right Drag / Shift+Drag</td><td>Pan camera along screen plane</td></tr>
                <tr><td>Mouse Wheel</td><td>Dolly (Zoom in / out)</td></tr>
                <tr><td>Double Click</td><td>Direct flight to target landmark</td></tr>
                <tr><td>Touch Drag</td><td>Rotate view</td></tr>
                <tr><td>Pinch</td><td>Zoom / Dolly</td></tr>
              </tbody>
            </table>
          </div>

          <div className="help-box">
            <h4>Keyboard</h4>
            {/* rendered from the input manager's bindings, so it only lists controls that work */}
            <ControlsPanel mode="MAIN_MENU" extra={[{ keys: '/ / Ctrl+K', label: 'Search missions, planets and discoveries' }]} />
          </div>
        </div>

        <div className="help-box">
          <h4>Where to go</h4>
          <p style={{ margin: '4px 0', fontSize: '13px', color: 'var(--txt-dim)', lineHeight: 1.5 }}>
            Select a planet to inspect it, double-click to fly there. Select the Moon or Mars and choose <b>Explore</b> to land at a
            historic site, or open <b>Missions</b> (<kbd>G</kbd>) to relive a documented mission, land at a site or review what you
            have discovered. Free flight is confined to the Solar System; the Milky Way is shown only in the opening, which you can
            replay from the <b>More</b> menu.
          </p>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn primary" onClick={onClose}>
            Close Reference
          </button>
        </div>
      </div>
    </div>
  )
}
export default HelpModal
