import { useMemo, useState } from 'react'
import type { MarsPose, MarsReady } from './marsBridge'
import { MARS_DESTINATIONS, MARS_DESTINATION_BY_ID, MARS_ELSEWHERE, compassWord, distanceKm, bearingTo, hopSeconds, othersFrom, useMarsSession, type MarsGuideTarget } from './marsDestinations'
import { expedition } from '../expedition/expedition'
import './marsNav.css'

const deg = (r: number) => (r * 180) / Math.PI
const latLon = (lat: number, lon: number) => `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(((lon + 540) % 360) - 180).toFixed(2)}°${((lon + 540) % 360) - 180 >= 0 ? 'E' : 'W'}`
const bearingXZ = (x0: number, z0: number, x1: number, z1: number) => (deg(Math.atan2(x1 - x0, z1 - z0)) + 360) % 360

/** the nearby destinations at this site: historical hardware, measured landmarks, the THEIA carrier */
export function nearbyTargets(siteId: string, ready: MarsReady): MarsGuideTarget[] {
  const d = MARS_DESTINATION_BY_ID[siteId]
  const out: MarsGuideTarget[] = ready.objects.map((o) => ({ kind: 'hardware' as const, id: o.id, label: o.label ?? d?.hardware.find((h) => h.sceneId === o.id)?.name ?? o.id, x: o.x, z: o.z, radius: 12 }))
  for (const l of d?.landmarks ?? []) out.push({ kind: 'landmark', id: l.id, label: l.name, x: l.x, z: l.z, radius: Math.max(10, l.radius * 0.6) })
  if (ready.carrier) out.push({ kind: 'carrier', id: 'carrier', label: 'THEIA carrier (conceptual)', x: ready.carrier.x, z: ready.carrier.z, radius: 14 })
  return out
}

/**
 * The unified Mars map (audit N1): one dialog, two layers.
 *   This site — the measured terrain square, the historical hardware, measured landmarks and the carrier; pick one and
 *               the destination guide leads THEIA there (you drive; nothing is skipped).
 *   Mars      — every explorable landing site on the Mars albedo map, with great-circle distances from here; the
 *               missions with no scene yet are listed. Another site is reached only by the carrier hop.
 */
export function MarsWorldMap({ siteId, ready, pose, onClose, initial = 'here' }: { siteId: string; ready: MarsReady; pose: MarsPose; onClose: () => void; initial?: 'here' | 'mars' }) {
  const [tab, setTab] = useState<'here' | 'mars'>(initial)
  const [pick, setPick] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const visited = useMarsSession((s) => s.visited)
  const guide = useMarsSession((s) => s.guide[siteId] ?? null)
  const setGuide = useMarsSession((s) => s.setGuide)
  const here = MARS_DESTINATION_BY_ID[siteId]
  const targets = useMemo(() => nearbyTargets(siteId, ready), [siteId, ready])
  const others = useMemo(() => othersFrom(siteId), [siteId])

  // ── local layer geometry (site frame: x east, z north)
  const [e0, e1] = ready.site.extentEastM
  const [n0, n1] = ready.site.extentNorthM
  const pad = 60
  const W = e1 - e0 + 2 * pad, H = n1 - n0 + 2 * pad
  const X = (x: number) => x - e0 + pad
  const Y = (z: number) => n1 - z + pad
  const sel = pick ? MARS_DESTINATION_BY_ID[pick] : null
  const go = (to: string) => { if (expedition.hop(to)) onClose() }

  return (
    <div className="surf-overlay" role="dialog" aria-modal="true" aria-label="Mars map" onClick={onClose} data-testid="mars-world-map">
      <div className="surf-pause glass mars-map mwm" onClick={(e) => e.stopPropagation()}>
        <header className="mwm-head">
          <div className="mwm-tabs" role="tablist" aria-label="Map layer">
            <button role="tab" aria-selected={tab === 'here'} className={tab === 'here' ? 'on' : ''} onClick={() => setTab('here')} data-testid="map-tab-here">This site</button>
            <button role="tab" aria-selected={tab === 'mars'} className={tab === 'mars' ? 'on' : ''} onClick={() => setTab('mars')} data-testid="map-tab-mars">Mars</button>
          </div>
          <b className="mwm-title">{tab === 'here' ? `${here?.name ?? siteId} — ${here?.region ?? ''}` : 'Mars — explorable landing sites'}</b>
          <button className="discovery-close" onClick={onClose} aria-label="Close the map (Esc)" title="Close (Esc)">✕</button>
        </header>

        {tab === 'here' && (
          <div className="mwm-body">
            <svg viewBox={`0 0 ${W} ${H}`} className="mars-map-svg mwm-svg" role="img" aria-label="Map of this site">
              <rect x={pad} y={pad} width={e1 - e0} height={n1 - n0} className="mm-extent" />
              {/* the site's ground image over its measured square (Victoria: the same HiRISE image the player draws) */}
              <image href={`/mars-sites/${ready.siteId ?? 'victoria'}/albedo.jpg`} x={pad} y={pad} width={e1 - e0} height={n1 - n0} preserveAspectRatio="none" opacity={0.92} />
              {!ready.siteId && <circle cx={X(0)} cy={Y(0)} r={400} className="mm-rim" />}
              {guide && <line x1={X(pose.x)} y1={Y(pose.z)} x2={X(guide.x)} y2={Y(guide.z)} className="mwm-guide-line" />}
              {targets.map((t, i) => {
                // markers a few tens of metres apart (a rover beside its lander or the carrier) share one label
                const lead = targets.findIndex((u) => Math.hypot(u.x - t.x, u.z - t.z) < 60)
                const label = lead === i ? targets.filter((u) => Math.hypot(u.x - t.x, u.z - t.z) < 60).map((u) => u.label).join(' · ') : null
                return (
                <g key={t.kind + t.id} transform={`translate(${X(t.x)} ${Y(t.z)})`} className={`mwm-t mwm-${t.kind}${guide?.id === t.id ? ' on' : ''}`} onClick={() => setGuide(siteId, t)} role="button" aria-label={`Guide me to ${t.label}`}>
                  {t.kind === 'carrier' ? <rect x={-9} y={-9} width={18} height={18} /> : t.kind === 'landmark' ? <path d="M0,-13 L12,9 L-12,9 Z" /> : <circle r={11} />}
                  {label && <text y={-19} textAnchor="middle" className="mm-label">{label}</text>}
                </g>
                )
              })}
              <g transform={`translate(${X(pose.x)} ${Y(pose.z)}) rotate(${deg(pose.heading)})`}><path d="M0,-22 L13,15 L0,8 L-13,15 Z" className="mm-you" /></g>
            </svg>
            <aside className="mwm-side">
              <h3>Nearby</h3>
              <p className="muted small">Pick a destination: a marker on the compass and minimap leads THEIA there. You drive.</p>
              <ul className="mwm-list">
                {targets.map((t) => {
                  const d = Math.hypot(t.x - pose.x, t.z - pose.z)
                  return (
                    <li key={t.kind + t.id}>
                      <span><b>{t.label}</b><span className="muted small"> · {t.kind === 'hardware' ? 'historical hardware' : t.kind === 'landmark' ? 'measured landmark' : 'your carrier'} · {d < 1000 ? `${d.toFixed(0)} m` : `${(d / 1000).toFixed(2)} km`} {compassWord(bearingXZ(pose.x, pose.z, t.x, t.z))}</span></span>
                      <button className={'btn small' + (guide?.id === t.id ? ' on' : '')} onClick={() => setGuide(siteId, guide?.id === t.id ? null : t)} data-testid="guide-to" data-target={t.id}>{guide?.id === t.id ? 'Guiding ✓' : 'Guide me'}</button>
                    </li>
                  )
                })}
              </ul>
              <button className="btn ghost small" onClick={() => setTab('mars')}>Other landing sites ▸</button>
            </aside>
          </div>
        )}

        {tab === 'mars' && !confirm && (
          <div className="mwm-body">
            <svg viewBox="0 0 360 180" className="mwm-globe" role="img" aria-label="Map of Mars with the explorable landing sites">
              <image href="/assets/astronomy/textures/mars_albedo_2k.jpg" x={0} y={0} width={360} height={180} preserveAspectRatio="none" />
              {[-60, -30, 0, 30, 60].map((l) => <line key={l} x1={0} x2={360} y1={90 - l} y2={90 - l} className="mwm-grat" />)}
              {[-120, -60, 0, 60, 120].map((l) => <line key={l} y1={0} y2={180} x1={l + 180} x2={l + 180} className="mwm-grat" />)}
              {MARS_DESTINATIONS.map((d) => {
                const x = ((d.lonEastDeg + 540) % 360), y = 90 - d.latDeg
                const cur = d.siteId === siteId
                return (
                  <g key={d.siteId} transform={`translate(${x} ${y})`} className={'mwm-site' + (cur ? ' here' : '') + (visited[d.siteId] ? ' visited' : '') + (pick === d.siteId ? ' on' : '')}
                    onClick={() => setPick(d.siteId)} role="button" aria-label={`${d.name}${cur ? ' (you are here)' : ''}`} data-testid="map-site" data-site={d.siteId}>
                    <circle r={cur ? 3.4 : 2.6} />
                    <text y={-4.5} textAnchor="middle">{d.name.replace(/ \(MER-[AB]\)/, '')}</text>
                  </g>
                )
              })}
            </svg>
            <aside className="mwm-side">
              {sel ? (
                <div className="mwm-card" data-testid="map-site-card">
                  <span className="eyebrow">{sel.mode === 'rover' ? 'ROVER MISSION' : 'STATIONARY LANDER'} · {sel.missionName.toUpperCase()}</span>
                  <h3>{sel.name}</h3>
                  <p className="muted small">{sel.region} · {latLon(sel.latDeg, sel.lonEastDeg)}{sel.landingDate ? ` · landed ${sel.landingDate.slice(0, 10)}` : ''}</p>
                  <p className="small">{sel.hardware.map((h) => h.name).join(' · ')}{sel.landmarks.length ? ` · ${sel.landmarks.map((l) => l.name).join(' · ')}` : ''}</p>
                  {sel.siteId === siteId ? <p className="mwm-here">You are here.</p> : (
                    <>
                      <p className="small"><b>{Math.round(distanceKm(here, sel)).toLocaleString('en-US')} km</b> {compassWord(bearingTo(here, sel))} of here · carrier hop of about {Math.round(hopSeconds(distanceKm(here, sel)) / 60)} min{visited[sel.siteId] ? ' · visited ✓' : ''}</p>
                      <button className="btn" onClick={() => setConfirm(sel.siteId)} data-testid="travel-to">Travel here with the carrier ▸</button>
                    </>
                  )}
                </div>
              ) : <p className="muted small">Pick a landing site on the map.</p>}
              <h3>From here</h3>
              <ul className="mwm-list">
                {others.map(({ d, km, bearing }) => (
                  <li key={d.siteId}><button className="linklike" onClick={() => setPick(d.siteId)}>{d.name}</button><span className="muted small">{Math.round(km).toLocaleString('en-US')} km {compassWord(bearing)}{visited[d.siteId] ? ' · ✓' : ''}</span></li>
                ))}
              </ul>
              {MARS_ELSEWHERE.length > 0 && (
                <details className="mwm-elsewhere"><summary>Not explorable yet ({MARS_ELSEWHERE.length})</summary>
                  <ul>{MARS_ELSEWHERE.map((e) => <li key={e.missionId}><b>{e.name}</b> <span className="muted small">— {e.reason}</span></li>)}</ul>
                </details>
              )}
            </aside>
          </div>
        )}

        {tab === 'mars' && confirm && (() => {
          const to = MARS_DESTINATION_BY_ID[confirm]
          const km = distanceKm(here, to)
          return (
            <div className="mwm-transport" data-testid="transport">
              <span className="eyebrow">DISTANT TRAVEL · THEIA CARRIER (CONCEPTUAL)</span>
              <h3>{here.name} → {to.name}</h3>
              <ol className="mwm-steps">
                <li>THEIA drives back to the carrier and boards it; the door closes.</li>
                <li>The carrier lifts off with THEIA in its cargo bay.</li>
                <li>It flies <b>{Math.round(km).toLocaleString('en-US')} km</b> along the shortest path over Mars ({compassWord(bearingTo(here, to))}), about {Math.round(hopSeconds(km) / 60)} minutes of flight, shown compressed.</li>
                <li>It lands near {to.name} on the measured terrain, and THEIA drives out.</li>
              </ol>
              <p className="muted small">The carrier and its flight are conceptual (not a NASA design). Real: both sites' sourced coordinates and the distance between them. You stay on Mars the whole way; "Return to orbit" later still takes you back to where this surface visit began.</p>
              <div className="mwm-actions">
                <button className="btn big" onClick={() => go(confirm)} data-testid="board-and-go">Board the carrier and go</button>
                <button className="btn ghost" onClick={() => setConfirm(null)}>Back</button>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

/**
 * The destination guide (nearby navigation): where the chosen target is relative to THEIA and the camera, and an
 * arrival notice when THEIA reaches it. Session-persistent per site (marsDestinations.useMarsSession).
 */
export function MarsGuideChip({ siteId, pose, onOpenMap }: { siteId: string; pose: MarsPose; onOpenMap: () => void }) {
  const guide = useMarsSession((s) => s.guide[siteId] ?? null)
  const setGuide = useMarsSession((s) => s.setGuide)
  const [arrived, setArrived] = useState<string | null>(null)
  if (!guide) return arrived ? <div className="surf-chip mwm-arrived" role="status" data-testid="guide-arrived">✓ Arrived at {arrived}</div> : null
  const d = Math.hypot(guide.x - pose.x, guide.z - pose.z)
  if (d < guide.radius) {
    window.setTimeout(() => { setGuide(siteId, null); setArrived(guide.label); window.setTimeout(() => setArrived(null), 5000) }, 0)
  }
  const b = bearingXZ(pose.x, pose.z, guide.x, guide.z)
  const rel = ((b - ((deg(pose.camYaw) + 360) % 360) + 540) % 360) - 180
  const hint = Math.abs(rel) < 15 ? 'ahead' : `${rel > 0 ? 'right' : 'left'} ${Math.abs(rel).toFixed(0)}°`
  return (
    <div className="surf-chip mwm-guide" data-testid="guide-chip" role="status">
      <i className="mwm-arrow" style={{ transform: `rotate(${rel}deg)` }} aria-hidden>▲</i>
      <span>To <b>{guide.label}</b> · {d < 1000 ? `${d.toFixed(0)} m` : `${(d / 1000).toFixed(2)} km`} · {hint}</span>
      <button className="linklike" onClick={onOpenMap}>map</button>
      <button className="linklike" onClick={() => setGuide(siteId, null)} aria-label="Stop guiding">✕</button>
    </div>
  )
}
