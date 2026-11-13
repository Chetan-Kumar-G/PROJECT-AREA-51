/**
 * PLANETARY AUDIO — the environment, vehicle, suit and radio layers of the one audio engine (CosmicAudioEngine buses).
 *
 * Every view that shows a place (the Relive engine, the Mars surface, the Moon surface) CLAIMS this manager while it is
 * active and describes, every frame, where the listener is and what is sounding (`SceneAudio`). The manager decides
 * what can be heard there with the acoustic model (acoustics.ts): an external sound needs a medium between it and the
 * listener — none on the Moon or in space; on Mars it is ~20 dB quieter and loses its high end within metres. Sounds
 * that reach the listener through the suit or a structure, or by radio, do not need an atmosphere.
 *
 * All sounds are ORIGINAL SYNTHESIS (no recordings; nothing to license), each with a classification (see the
 * attribution document, docs/transformation/08-PLANETARY-AUDIO.md):
 *   wind (Earth / Mars)          physically informed environment sound (Mars: low-frequency, subdued — Perseverance)
 *   dust                         illustrative reconstruction (grains carried by storm-strength wind)
 *   THEIA motors / wheels        mechanical sound of a conceptual vehicle, illustrative (Perseverance's chassis
 *                                microphone heard "clanky, squeaky" wheels — the character, not a copy)
 *   rocket / carrier engines     mechanical, illustrative, propagated through the medium
 *   entry airflow                illustrative reconstruction, only with air around the vehicle
 *   suit fan / breathing (Moon)  illustrative reconstruction, inside Neil's suit (contact path)
 *   radio tones                  illustrative reconstruction (radio path)
 * Layers are persistent nodes on the buses (no per-frame node creation); grains and one-shots are short-lived nodes.
 */
import { audio } from './CosmicAudioEngine'
import { canHear, propagate, PROFILES, type Medium, type Path } from './acoustics'

export interface ThrusterSource { thrust: number; distanceM: number; pressure: number; pan?: number; kind: 'rocket' | 'carrier' | 'retro' }
export interface VehicleSource { speed: number; turnRate: number; roughness: number; distanceM: number; pan?: number; reversing?: boolean }
export interface SceneAudio {
  /** where the LISTENER is (the camera) */
  medium: Medium
  /** wind speed at the listener (m/s) */
  windMs?: number
  /** airborne dust 0..1 (a storm) */
  dust?: number
  /** THEIA (or another rover) driving */
  vehicle?: VehicleSource | null
  thrusters?: ThrusterSource[]
  /** entry / ascent airflow past the vehicle 0..1, at a distance */
  airflow?: { level: number; distanceM: number; pressure: number } | null
  /** inside a suit (the Moon): its fan and the explorer's breathing */
  suit?: boolean
  paused?: boolean
}

type Owner = 'relive' | 'mars-surface' | 'moon-surface'

function brownNoise(ctx: AudioContext, seconds = 4): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5 }
  return buf
}
function whiteNoise(ctx: AudioContext, seconds = 2): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  return buf
}

interface Layer { gain: GainNode; filter: BiquadFilterNode; pan?: StereoPannerNode }

class PlanetaryAudio {
  private owner: Owner | null = null
  private built: { ctx: AudioContext } | null = null
  private brown: AudioBuffer | null = null
  private white: AudioBuffer | null = null
  private sources: AudioScheduledSourceNode[] = []
  private L: Record<string, Layer> = {}
  private motorOsc: OscillatorNode[] = []
  private gust = 0
  private gustV = 0
  private grainAcc = 0
  private breath = 0
  private lastT = 0
  /** for checks: the current audible levels of each layer (after the acoustic model), and grains played */
  readonly stats = { owner: () => this.owner, levels: {} as Record<string, number>, grains: 0, oneShots: 0, medium: 'space' as Medium }

  private build(): boolean {
    if (this.built) return true
    const amb = audio.bus('ambience'), mech = audio.bus('mechanical')
    if (!amb || !mech) return false
    const ctx = amb.ctx
    this.brown = brownNoise(ctx)
    this.white = whiteNoise(ctx)
    const layer = (bus: GainNode, buf: AudioBuffer, type: BiquadFilterType, f: number, q = 0.7, pan = false): Layer => {
      const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true
      const filter = ctx.createBiquadFilter(); filter.type = type; filter.frequency.value = f; filter.Q.value = q
      const gain = ctx.createGain(); gain.gain.value = 0
      s.connect(filter); filter.connect(gain)
      let p: StereoPannerNode | undefined
      if (pan) { p = ctx.createStereoPanner(); gain.connect(p); p.connect(bus) } else gain.connect(bus)
      s.start(0, Math.random() * buf.duration)
      this.sources.push(s)
      return { gain, filter, pan: p }
    }
    this.L.wind = layer(amb.node, this.brown, 'lowpass', 400)
    this.L.dust = layer(amb.node, this.white, 'bandpass', 700, 0.8)
    this.L.engine = layer(mech.node, this.brown, 'lowpass', 120, 0.7, true)
    this.L.air = layer(mech.node, this.white, 'bandpass', 600, 0.6)
    this.L.suit = layer(amb.node, this.brown, 'lowpass', 160)
    this.L.breath = layer(amb.node, this.white, 'bandpass', 900, 1.2)
    // THEIA's electric drive: two detuned saw oscillators through a band-pass (the medium's low-pass after it)
    const mf = ctx.createBiquadFilter(); mf.type = 'bandpass'; mf.frequency.value = 900; mf.Q.value = 1.4
    const mlp = ctx.createBiquadFilter(); mlp.type = 'lowpass'; mlp.frequency.value = 2000
    const mg = ctx.createGain(); mg.gain.value = 0
    const mp = ctx.createStereoPanner()
    for (const det of [-7, 6]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 120; o.detune.value = det; o.connect(mf); o.start(); this.motorOsc.push(o); this.sources.push(o) }
    mf.connect(mlp); mlp.connect(mg); mg.connect(mp); mp.connect(mech.node)
    this.L.motor = { gain: mg, filter: mlp, pan: mp }
    this.built = { ctx }
    return true
  }

  /** a view takes the soundscape (the previous owner's layers fade) */
  claim(owner: Owner) { this.owner = owner; this.build() }
  /** a view lets go (everything fades to silence unless another view has claimed it since) */
  release(owner: Owner) {
    if (this.owner !== owner) return
    this.owner = null
    this.silence()
  }
  private silence() {
    if (!this.built) return
    const t = this.built.ctx.currentTime
    for (const l of Object.values(this.L)) l.gain.gain.setTargetAtTime(0, t, 0.25)
    for (const k of Object.keys(this.stats.levels)) this.stats.levels[k] = 0
  }

  private set(name: string, level: number, cutoff?: number, pan?: number, tc = 0.2) {
    const l = this.L[name]
    if (!l || !this.built) return
    const t = this.built.ctx.currentTime
    l.gain.gain.setTargetAtTime(Math.max(0, level), t, tc)
    if (cutoff !== undefined && cutoff > 0) l.filter.frequency.setTargetAtTime(Math.max(40, Math.min(18000, cutoff)), t, 0.2)
    if (pan !== undefined && l.pan) l.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), t, 0.1)
    this.stats.levels[name] = Math.max(0, level)
  }

  /** every frame from the owning view */
  update(owner: Owner, s: SceneAudio) {
    if (this.owner !== owner) return
    if (!this.build() || !this.built) return
    const now = performance.now() / 1000
    const dt = this.lastT ? Math.min(0.2, now - this.lastT) : 0.016
    this.lastT = now
    this.stats.medium = s.medium
    if (s.paused) { this.silence(); return }
    const P = PROFILES[s.medium]

    // ── environment: wind (only where there is air), a slow random gust walk
    this.gustV += (Math.random() - 0.5) * dt * 1.6 - this.gustV * dt * 0.6
    this.gust = Math.max(-1, Math.min(1, this.gust + this.gustV * dt))
    const wind = s.windMs ?? 0
    const dust = Math.max(0, Math.min(1, s.dust ?? 0))
    if (P.ambience === 'wind' && wind > 0) {
      const w = Math.min(1, wind / 25) * (0.75 + 0.25 * this.gust)
      if (s.medium === 'mars') {
        // Mars: turbulence on the microphone dominates; low and subdued (not an Earth wind turned down)
        this.set('wind', 0.06 + 0.5 * Math.pow(w, 1.3) + 0.25 * dust, 180 + 260 * w + 120 * dust)
      } else {
        this.set('wind', 0.05 + 0.35 * Math.pow(w, 1.2), 500 + 1400 * w)
      }
      // dust: grains carried by storm-strength wind (Mars only; illustrative)
      this.set('dust', s.medium === 'mars' ? Math.max(0, dust - 0.25) * 0.12 * (0.7 + 0.3 * this.gust) : 0, 550 + 500 * dust)
    } else { this.set('wind', 0); this.set('dust', 0) }

    // ── engines (rockets, the carrier, retro-rockets): through the medium, from the source's air
    let eng = 0, engCut = 120, engPan = 0
    for (const th of s.thrusters ?? []) {
      if (th.thrust <= 0) continue
      const pr = propagate(s.medium, th.distanceM, th.pressure)
      // source power as the distance (m) at which it reaches full scale under 1/d spreading (illustrative): a launch
      // vehicle is overwhelming kilometres away, the conceptual carrier tens of metres, MER's RAD retro-rockets ~100 m
      const base = th.kind === 'rocket' ? 1500 : th.kind === 'retro' ? 100 : 60
      const g = Math.min(0.9, pr.gain * base * th.thrust)
      if (g > eng) { eng = g; engCut = Math.min(pr.cutoffHz, th.kind === 'rocket' ? 260 : 900); engPan = th.pan ?? 0 }
    }
    this.set('engine', eng, engCut, engPan, 0.12)

    // ── airflow past a vehicle (entry, ascent): needs air at the vehicle AND between it and the listener
    if (s.airflow && s.airflow.level > 0) {
      const pr = propagate(s.medium, s.airflow.distanceM, s.airflow.pressure)
      this.set('air', Math.min(0.5, pr.gain * 3 * s.airflow.level), Math.min(pr.cutoffHz, 400 + 1400 * s.airflow.level))
    } else this.set('air', 0)

    // ── THEIA (rover) driving: motors and wheels, only while it moves
    const v = s.vehicle
    const sp = v ? Math.abs(v.speed) : 0
    if (v && canHear(s.medium, 'external') && (sp > 0.03 || Math.abs(v.turnRate) > 0.08)) {
      const pr = propagate(s.medium, v.distanceM, 1)
      const drive = Math.min(1, sp / 4)
      const turning = Math.min(1, Math.abs(v.turnRate) / 0.6)
      // the motor's pitch follows the wheel speed; turning in place still runs the steering and wheel motors
      const f = 110 + 260 * drive + 60 * turning + (v.reversing ? -25 : 0)
      const t = this.built.ctx.currentTime
      for (const o of this.motorOsc) o.frequency.setTargetAtTime(f, t, 0.15)
      this.set('motor', Math.min(0.6, pr.gain * 9 * (0.25 + 0.75 * Math.max(drive, turning * 0.6))), Math.min(pr.cutoffHz * 1.4, 2400), v.pan ?? 0, 0.12)
      // wheels: short grains of surface noise; a rocky surface gives fewer, sharper grains than soft regolith
      const perM = 2.5 + 5 * v.roughness
      this.grainAcc += (sp + turning * 0.3) * perM * dt
      while (this.grainAcc >= 1) {
        this.grainAcc -= 1
        this.grain(pr.gain, pr.cutoffHz, v.roughness, v.pan ?? 0)
      }
    } else this.set('motor', 0, undefined, undefined, 0.25)

    // ── inside Neil's suit (Moon): a quiet fan and slow breathing — the contact path, no atmosphere needed
    if (s.suit && canHear(s.medium, 'contact')) {
      this.breath += dt / 4.2
      const ph = this.breath % 1
      const b = ph < 0.4 ? Math.sin((ph / 0.4) * Math.PI) : ph < 0.55 ? 0 : Math.sin(((ph - 0.55) / 0.45) * Math.PI) * 0.7
      this.set('suit', 0.05, 170)
      this.set('breath', 0.03 * b, 800 + 300 * b, undefined, 0.08)
    } else { this.set('suit', 0); this.set('breath', 0) }
  }

  /** a wheel grain: 15–60 ms of filtered noise, random strength (sharper and brighter on rock) */
  private grain(gain: number, cutoff: number, rough: number, pan: number) {
    if (!this.built || !this.white) return
    const mech = audio.bus('mechanical')
    if (!mech) return
    const ctx = this.built.ctx
    const t = ctx.currentTime + Math.random() * 0.03
    const s = ctx.createBufferSource(); s.buffer = this.white
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = Math.min(cutoff, rough > 0.5 ? 1600 : 650) * (0.8 + 0.4 * Math.random()); f.Q.value = rough > 0.5 ? 2.2 : 0.9
    const g = ctx.createGain()
    const peak = Math.min(0.5, gain * (rough > 0.5 ? 14 : 8) * (0.4 + 0.6 * Math.random()))
    const dur = 0.015 + Math.random() * (rough > 0.5 ? 0.03 : 0.05)
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan + (Math.random() - 0.5) * 0.3))
    s.connect(f); f.connect(g); g.connect(p); p.connect(mech.node)
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.02)
    this.stats.grains++
  }

  /**
   * a one-shot instrument / mechanism sound (inspection of a part) — only where it can be heard: on Mars muffled by the
   * thin air, on the Moon and in space nothing (an instrument is not in contact with the listener)
   */
  instrument(kind: 'camera' | 'arm' | 'drill' | 'motor', medium: Medium, distanceM: number) {
    if (!this.built || !this.white) return
    const pr = propagate(medium, distanceM, 1)
    if (!pr.audible) return
    const mech = audio.bus('mechanical')
    if (!mech) return
    const ctx = this.built.ctx, now = ctx.currentTime
    const g = ctx.createGain(); g.connect(mech.node)
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = pr.cutoffHz * 1.4; lp.connect(g)
    const level = Math.min(0.5, pr.gain * 10)
    const servo = (f0: number, f1: number, dur: number, at = 0) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'
      o.frequency.setValueAtTime(f0, now + at); o.frequency.linearRampToValueAtTime(f1, now + at + dur)
      const og = ctx.createGain(); og.gain.setValueAtTime(0, now + at); og.gain.linearRampToValueAtTime(level, now + at + 0.05); og.gain.setValueAtTime(level, now + at + dur - 0.06); og.gain.linearRampToValueAtTime(0, now + at + dur)
      o.connect(og); og.connect(lp); o.start(now + at); o.stop(now + at + dur + 0.02)
    }
    const click = (at: number) => {
      const s = ctx.createBufferSource(); s.buffer = this.white
      const cg = ctx.createGain(); cg.gain.setValueAtTime(level * 1.2, now + at); cg.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.03)
      s.connect(cg); cg.connect(lp); s.start(now + at); s.stop(now + at + 0.05)
    }
    if (kind === 'camera') { servo(300, 340, 0.35); click(0.4); click(0.55) }
    else if (kind === 'arm') { servo(160, 210, 0.9); servo(210, 180, 0.6, 1.0) }
    else if (kind === 'drill') { servo(90, 95, 1.6); for (let k = 0; k < 10; k++) click(0.1 + k * 0.15) }
    else servo(140, 170, 0.5)
    this.stats.oneShots++
  }

  /** a short radio tone pair (the radio path: heard anywhere, on the mission bus) */
  radio() {
    const m = audio.bus('mission')
    if (!m) return
    const ctx = m.ctx, now = ctx.currentTime
    for (const [f, at] of [[2525, 0], [2475, 0.28]] as [number, number][]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f
      const g = ctx.createGain(); g.gain.setValueAtTime(0, now + at); g.gain.linearRampToValueAtTime(0.06, now + at + 0.01); g.gain.setValueAtTime(0.06, now + at + 0.24); g.gain.linearRampToValueAtTime(0, now + at + 0.25)
      o.connect(g); g.connect(m.node); o.start(now + at); o.stop(now + at + 0.27)
    }
    this.stats.oneShots++
  }

  /** for the attribution panel: can a path be heard where the listener is */
  hearable(medium: Medium, path: Path) { return canHear(medium, path) }
}

export const planetaryAudio = new PlanetaryAudio()
if (typeof window !== 'undefined') (window as unknown as { __planetaryAudio?: unknown }).__planetaryAudio = planetaryAudio
