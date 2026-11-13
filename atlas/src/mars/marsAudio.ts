/**
 * Mars surface sound (the Unity scenes: Victoria and the landing sites) — the planetary audio manager, driven by the
 * player's own pose reports, and the weather-state interface.
 *
 *   THEIA       speed → motor pitch and level; heading change → turning; pitch / roll change per metre → surface
 *               roughness (rocky ground: fewer, sharper wheel grains; soft regolith: duller); reversing lowers the
 *               motor note. Nothing sounds while it stands still.
 *   the carrier its descent burn (arrival 'descent') and lift-off burn (departure 'liftoff'), at its real distance
 *   wind / dust from the WEATHER STATE below — calm by default; a dust storm only when the user starts the simulated
 *               one (there is no weather model or historical weather for these scenes). The same state drives the
 *               Unity view's airborne dust, haze and sky (SetWeather), so sound and picture change together.
 * All levels pass through the Mars acoustic profile (−20 dB, high frequencies lost with distance; acoustics.ts).
 */
import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import { planetaryAudio } from '../audio/planetaryAudio'
import { send, type MarsPose, type MarsReady } from './marsBridge'

export interface MarsWeather {
  /** 'calm' or a simulated storm (SIMULATED: no weather model or historical observation drives it) */
  mode: 'calm' | 'storm'
  /** current airborne dust 0..1 and wind (m/s) — ramp toward the mode's target */
  dust: number
  windMs: number
  setStorm: (on: boolean) => void
}
/** calm: a light breeze; storm: strong, dusty wind (ILLUSTRATIVE values) */
const CALM = { dust: 0.05, windMs: 3 }, STORM = { dust: 1, windMs: 22 }

export const useMarsWeather = create<MarsWeather>((set) => ({
  mode: 'calm', ...CALM,
  setStorm: (on) => set({ mode: on ? 'storm' : 'calm' }),
}))
if (typeof window !== 'undefined') (window as unknown as { __marsWeather?: unknown }).__marsWeather = { state: () => useMarsWeather.getState() }

/** the weather ramps (a storm builds over ~25 s and clears over ~20 s) and is sent to the Unity view */
function stepWeather(dt: number) {
  const W = useMarsWeather.getState()
  const target = W.mode === 'storm' ? STORM : CALM
  const k = 1 - Math.exp(-dt / (W.mode === 'storm' ? 9 : 7))
  const dust = W.dust + (target.dust - W.dust) * k, windMs = W.windMs + (target.windMs - W.windMs) * k
  if (Math.abs(dust - W.dust) > 1e-4 || Math.abs(windMs - W.windMs) > 1e-3) useMarsWeather.setState({ dust, windMs })
  return { dust, windMs }
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

/** while a Mars surface view runs: claim the soundscape and feed it from the pose (10 per second) */
export function useMarsSurfaceAudio(running: boolean, pose: MarsPose | null, ready: MarsReady | null, paused: boolean) {
  const prev = useRef<{ pose: MarsPose; t: number; rough: number; lastDust: number } | null>(null)
  useEffect(() => {
    if (!running) return
    planetaryAudio.claim('mars-surface')
    return () => planetaryAudio.release('mars-surface')
  }, [running])
  // the weather keeps evolving between pose reports (and reaches Unity even while the rover is parked)
  useEffect(() => {
    if (!running) return
    let last = performance.now()
    const iv = window.setInterval(() => {
      const now = performance.now()
      const w = stepWeather((now - last) / 1000)
      last = now
      const p = prev.current
      if (!p || Math.abs(w.dust - p.lastDust) > 0.01) { send('SetWeather', JSON.stringify({ dust: w.dust, windMs: w.windMs })); if (p) p.lastDust = w.dust }
    }, 250)
    return () => window.clearInterval(iv)
  }, [running])
  useEffect(() => {
    if (!running || !pose) return
    const now = performance.now() / 1000
    const p = prev.current
    const dt = p ? Math.max(0.02, Math.min(0.5, now - p.t)) : 0.1
    const turnRate = p ? wrap(pose.heading - p.pose.heading) / dt : 0
    const moved = p ? Math.hypot(pose.x - p.pose.x, pose.z - p.pose.z) : 0
    const tilt = p ? Math.abs(pose.pitchDeg - p.pose.pitchDeg) + Math.abs(pose.rollDeg - p.pose.rollDeg) : 0
    // roughness: how much the chassis rocks per metre driven, smoothed (0 smooth regolith … 1 rocky)
    const inst = moved > 0.05 ? Math.min(1, tilt / moved / 6) : p?.rough ?? 0.3
    const rough = p ? p.rough + (inst - p.rough) * 0.15 : 0.3
    prev.current = { pose, t: now, rough, lastDust: p?.lastDust ?? -1 }
    const toRover = Math.hypot(pose.camX - pose.x, pose.camY - pose.y, pose.camZ - pose.z)
    // pan: where THEIA is relative to the camera's view direction (x east, z north; camYaw clockwise from north)
    const bear = Math.atan2(pose.x - pose.camX, pose.z - pose.camZ)
    const pan = Math.sin(wrap(bear - pose.camYaw)) * 0.8
    const W = useMarsWeather.getState()
    const thrusters = []
    const cr = ready?.carrier
    const burning = pose.arrivalPhase === 'descent' || pose.departPhase === 'liftoff'
    if (cr && burning) {
      const cy = (pose.carrierAlt ?? 0)
      const dC = Math.hypot(pose.camX - cr.x, pose.camZ - cr.z, pose.camY - (pose.y + cy))
      const cb = Math.atan2(cr.x - pose.camX, cr.z - pose.camZ)
      thrusters.push({ thrust: 1, distanceM: dC, pressure: 1, pan: Math.sin(wrap(cb - pose.camYaw)) * 0.8, kind: 'carrier' as const })
    }
    planetaryAudio.update('mars-surface', {
      medium: 'mars', windMs: W.windMs, dust: W.dust, thrusters,
      vehicle: pose.mode === 'Explore' || pose.departPhase === 'return' || pose.arrivalPhase === 'deploy' ? { speed: pose.speed, turnRate, roughness: rough, distanceM: toRover, pan, reversing: pose.speed < -0.05 } : null,
      paused,
    })
  }, [running, pose, ready, paused])
}

/** a part was selected for inspection on Mars: its mechanism, when the record says what kind it is (ILLUSTRATIVE) */
export function instrumentSound(category: string | undefined, name: string, distanceM: number) {
  const n = name.toLowerCase()
  const kind = /drill|abrasion|rat\b/.test(n) ? 'drill' : category === 'camera' || /cam\b|camera|imager/.test(n) ? 'camera' : /arm|idd|scoop|sampl|deployment device/.test(n) || category === 'sampling' ? 'arm' : null
  if (kind) planetaryAudio.instrument(kind, 'mars', distanceM)
}
