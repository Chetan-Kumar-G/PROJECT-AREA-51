import { useEffect } from 'react'
import { ASSET_REGISTRY, AstronomicalAsset } from '../data/assetRegistry'

const CLASS_LABEL: Record<AstronomicalAsset['provenanceClass'], string> = {
  observational: 'Observational imagery',
  'processed-scientific': 'Processed from spacecraft data',
  procedural: 'Procedural illustration (not an observation)',
  'educational-simulation': 'Educational simulation',
  cinematic: 'Cinematic reconstruction',
  unverified: 'Origin not documented upstream',
}

/** Image credits generated from the asset registry (CC BY assets require visible attribution). */
function ImageCredits() {
  const groups = new Map<string, { a: AstronomicalAsset; names: string[] }>()
  for (const a of Object.values(ASSET_REGISTRY)) {
    const key = `${a.attribution}|${a.license}|${a.provenanceClass}`
    const g = groups.get(key) ?? { a, names: [] }
    g.names.push(a.name.replace(/\s*\(.*?\)\s*$/, ''))
    groups.set(key, g)
  }
  return (
    <section aria-label="Image credits" style={{ marginTop: 14 }}>
      <h3 style={{ fontSize: 14, margin: '0 0 6px' }}>Image credits &amp; licences</h3>
      <ul style={{ fontSize: 12.5 }}>
        {[...groups.values()].map(({ a, names }) => (
          <li key={a.attribution + a.license}>
            <b>{a.attribution}</b> — {a.license}. <i>{CLASS_LABEL[a.provenanceClass]}</i>
            {(a.sourceUrl ?? '').startsWith('http') && (
              <>
                {' '}
                (<a className="link" href={a.sourceUrl} target="_blank" rel="noreferrer">source</a>)
              </>
            )}
            <div style={{ color: 'var(--mut)' }}>{names.length} map{names.length > 1 ? 's' : ''}: {names.slice(0, 6).join(', ')}{names.length > 6 ? ', …' : ''}</div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function AboutModal({ onClose }: { onClose: () => void }) {
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
    <div className="modal" onClick={onClose} role="dialog" aria-modal="true" aria-label="Scientific notes">
      <div className="card glass" onClick={(e) => e.stopPropagation()}>
        <div className="eyebrow">Abandoned but Not Forgotten · Scientific notes</div>
        <h2>Data, accuracy &amp; credits</h2>
        <p className="muted small" style={{ marginTop: 0 }}>Every machine has a story. Every mission left a legacy.</p>
        <ul>
          <li>
            <b>Three kinds of content.</b> Everything is labelled as one of: <i>recorded / data-based</i> (terrain from LROC and
            HiRISE elevation models, catalogue dates and coordinates), <i>documented / reconstructed</i> (hardware rebuilt from
            published dimensions, replay events placed from mission records), or <i>illustrative / conceptual</i> (the THEIA
            rover and its carrier, sky colour, the Milky Way model). Sources are linked wherever a fact is shown.
          </li>
          <li>
            <b>Mission records.</b> Dates, landing coordinates and hardware come from NASA, NSSDCA, JPL, PDS, LROC, HiRISE and
            USGS sources cited per fact in the Missions panel; unverified or conflicting dates are marked as such.
          </li>
          <li>
            <b>Solar System ephemerides.</b> Planet positions use approximate Keplerian elements (NASA JPL, valid 1800–2050).
            The planet Inspector can compare them live with JPL Horizons.
          </li>
          <li>
            <b>Scale.</b> Planets and moons are drawn at their true mean radii and the Moon at its true distance; the Sun's display
            radius is enlarged (~10×). Very small bodies keep a minimum on-screen size.
          </li>
          <li>
            <b>The Milky Way in the opening</b> is a procedural model (bulge, disk and four logarithmic arms) built from published
            structure, not a photograph; the Sun's position in it (~26,700 ly from the centre, GRAVITY 2019) is approximate.
            Navigation beyond the Solar System is not offered.
          </li>
        </ul>
        <ImageCredits />
        <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
export default AboutModal
