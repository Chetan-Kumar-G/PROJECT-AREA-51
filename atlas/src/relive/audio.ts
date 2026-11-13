/**
 * Relive Mission audio: the replay's one-shot cues, on the app's ONE audio engine (the mission bus of
 * CosmicAudioEngine; no context of its own). Original synthesis only (nothing to license); the UI says it is not
 * archival audio. The continuous layers (engines, airflow, wind, dust) are the planetary audio manager's, driven by the
 * Relive scene every frame (scene/ReliveScene.tsx → planetaryAudio).
 *
 * Every cue knows how it reaches the listener (acoustics.ts): EXTERNAL cues (ignition, staging, pyrotechnics, parachute,
 * airbags, impacts, retro-rockets, mechanisms) are propagated through the medium around the camera at the moment the
 * event plays — silent in vacuum and on the Moon, quieter and muffled on Mars, attenuated with distance; RADIO cues
 * (the comms beep) are heard anywhere. Cues fire only when PLAYBACK crosses an event (relive/player.ts), never on a
 * seek, so scrubbing does not replay them; pausing silences the layers.
 */
import { audio } from '../audio/CosmicAudioEngine'
import { propagate, type Medium } from '../audio/acoustics'
import type { AudioCue } from './types'

/** each cue's path, and its power as the distance (m) at which it reaches full scale under 1/d spreading (illustrative) */
const CUE: Record<AudioCue, { path: 'external' | 'radio'; power: number }> = {
  ignition: { path: 'external', power: 1500 }, staging: { path: 'external', power: 800 }, pyro: { path: 'external', power: 250 },
  chute: { path: 'external', power: 150 }, bounce: { path: 'external', power: 150 }, touchdown: { path: 'external', power: 100 },
  splash: { path: 'external', power: 600 }, sonic: { path: 'external', power: 3000 }, beep: { path: 'radio', power: 1 },
  airbag: { path: 'external', power: 150 }, retro: { path: 'external', power: 300 }, retract: { path: 'external', power: 40 },
  petals: { path: 'external', power: 40 }, egress: { path: 'external', power: 30 },
}

class MissionAudio {
  private noise: AudioBuffer | null = null
  enabled = true
  /** the replay's own volume (0..1) on the mission bus */
  volume = 1
  /** where the listener is and how far the event is (set by the Relive scene every frame) */
  private where: { medium: Medium; distanceM: number; pressure: number } = { medium: 'space', distanceM: 1e9, pressure: 0 }
  /** for checks */
  readonly stats = { contexts: 0, cuesRequested: 0, cuesPlayed: 0, cuesSilenced: 0, last: [] as { cue: AudioCue; medium: Medium; gain: number }[], running: () => audio.status() === 'running' }

  async start() { await audio.unlock() }
  stop() { /* the shared engine stays; the planetary layers are released by the scene */ }

  setContext(medium: Medium, distanceM: number, pressure: number) { this.where = { medium, distanceM, pressure } }

  cue(c: AudioCue) {
    this.stats.cuesRequested++
    const bus = audio.bus('mission')
    if (!bus || !this.enabled) return
    const spec = CUE[c]
    const pr = spec.path === 'radio' ? { gain: 0.25, cutoffHz: 6000, audible: true } : propagate(this.where.medium, this.where.distanceM, this.where.pressure)
    const level = Math.min(1.2, pr.gain * spec.power) * this.volume
    this.stats.last.push({ cue: c, medium: this.where.medium, gain: level })
    if (this.stats.last.length > 40) this.stats.last.shift()
    if (!pr.audible || level < 1e-3) { this.stats.cuesSilenced++; return }
    this.stats.cuesPlayed++
    const ctx = bus.ctx
    if (!this.noise) {
      const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0)
      let last = 0
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5 }
      this.noise = buf
    }
    const now = ctx.currentTime
    const out = ctx.createGain(); out.gain.value = level
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.max(80, pr.cutoffHz)
    lp.connect(out); out.connect(bus.node)
    const burst = (dur: number, f: number, q: number, peak: number, type: BiquadFilterType = 'lowpass', at = 0) => {
      const s = ctx.createBufferSource(); s.buffer = this.noise
      const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, now + at); g.gain.linearRampToValueAtTime(peak, now + at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, now + at + dur)
      s.connect(fl); fl.connect(g); g.connect(lp)
      s.start(now + at, Math.random() * 2); s.stop(now + at + dur + 0.05)
    }
    const tone = (f0: number, f1: number, dur: number, peak: number, type: OscillatorType = 'sine', at = 0) => {
      const o = ctx.createOscillator(); o.type = type
      o.frequency.setValueAtTime(f0, now + at); o.frequency.exponentialRampToValueAtTime(f1, now + at + dur)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, now + at); g.gain.linearRampToValueAtTime(peak, now + at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, now + at + dur)
      o.connect(g); g.connect(lp); o.start(now + at); o.stop(now + at + dur + 0.05)
    }
    switch (c) {
      case 'ignition': burst(2.4, 220, 0.7, 1.2); break
      case 'staging': burst(0.9, 900, 0.8, 1.4, 'bandpass'); break
      case 'pyro': burst(0.25, 2600, 1.2, 1.0, 'bandpass'); break
      case 'chute': burst(0.2, 1800, 1, 1, 'bandpass'); burst(1.4, 900, 0.5, 0.7, 'highpass', 0.1); break // mortar, then the canopy filling
      case 'bounce': tone(90, 40, 0.5, 1.1, 'triangle'); burst(0.35, 300, 0.7, 0.8); break
      case 'touchdown': tone(70, 35, 0.8, 0.9, 'triangle'); break
      case 'splash': burst(2.2, 600, 0.4, 1.2); break
      case 'sonic': burst(0.6, 400, 0.6, 1.0); break
      case 'beep': tone(1250, 1250, 0.22, 0.5, 'square'); break
      case 'airbag': burst(0.15, 1500, 1, 0.9, 'bandpass'); burst(1.1, 500, 0.6, 0.8, 'lowpass', 0.05); break // gas generators fill the bags
      case 'retro': burst(2.6, 260, 0.6, 1.1); break // three solid retro-rockets, about 2.6 s
      case 'retract': for (let k = 0; k < 3; k++) tone(150, 170, 0.9, 0.35, 'sawtooth', k * 1.1); break // retraction winches
      case 'petals': tone(120, 135, 1.6, 0.35, 'sawtooth'); tone(125, 140, 1.6, 0.3, 'sawtooth', 0.4); break // petal actuators
      case 'egress': burst(0.06, 900, 1.5, 0.5, 'bandpass'); burst(0.06, 900, 1.5, 0.5, 'bandpass', 0.5); tone(180, 230, 2, 0.25, 'sawtooth'); break // wheels onto the ramp
    }
  }
}

export const missionAudio = new MissionAudio()
if (typeof window !== 'undefined') (window as unknown as { __missionAudio?: unknown }).__missionAudio = missionAudio
