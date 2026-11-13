/**
 * PLANETARY ACOUSTICS — what an EXTERNAL sound does between a source and the listener in each environment (pure; tested
 * in acoustics.test.ts). The audio engine asks this before it lets any external sound be heard.
 *
 * Sources (docs/transformation/08-PLANETARY-AUDIO.md has the full research notes):
 *   Mars  — Maurice et al. 2022, "In situ recording of Mars soundscape", Nature 605, 653–658: Perseverance's
 *           microphones recorded 20 Hz–50 kHz; two speeds of sound ~10 m/s apart, split at 240 Hz, in the low-pressure
 *           CO2 atmosphere; sound attenuation with distance above ~2 kHz from CO2 vibrational relaxation. NASA (Sounds of
 *           Mars podcast) and LANL: the same source sounds about 20 dB quieter than on Earth; besides the wind there are
 *           few natural sounds.
 *   Moon  — an exosphere, not an atmosphere (NASA): no medium to carry sound between separate objects.
 *   Space — vacuum: no external sound at all.
 *   Earth — the reference (1 atm, ~343 m/s).
 *
 * What is modelled (ILLUSTRATIVE parameters, fitted to those statements, not a physical solver):
 *   - a level offset for the medium (Mars −20 dB),
 *   - spherical spreading with distance (−6 dB per doubling beyond 1 m, clamped near the source),
 *   - a distance-dependent low-pass for the medium's high-frequency absorption (Mars: strong above ~2 kHz, a few
 *     metres already remove most of the high end; Earth: gentle),
 *   - the medium's pressure scale, so a vehicle leaving an atmosphere fades out with the air around it.
 * The 10 m/s difference between Mars's two sound speeds is far below what a listener can notice in a scene; it is
 * documented, not rendered.
 */
export type Medium = 'earth' | 'moon' | 'mars' | 'space'

export interface AcousticProfile {
  medium: Medium
  /** can an external sound travel from a separate source to the listener at all */
  carries: boolean
  /** level of the same source relative to Earth (dB) */
  levelDb: number
  /** speed of sound (m/s) — for the record; Mars ~240 m/s (Maurice et al. 2022) */
  soundSpeed: number | null
  /** low-pass cutoff (Hz) for a source at distance d (m) — the medium's high-frequency absorption */
  cutoffAt: (d: number) => number
  /** surface pressure (Pa), the scale height (m) — for an atmosphere that thins with altitude */
  surfacePa: number
  scaleHeightM: number
  /** what the default ambience of the open environment is */
  ambience: 'wind' | 'silence'
  /** shown in the audio panel */
  note: string
}

export const PROFILES: Record<Medium, AcousticProfile> = {
  earth: {
    medium: 'earth', carries: true, levelDb: 0, soundSpeed: 343,
    cutoffAt: (d) => Math.max(2500, 16000 / (1 + d / 1500)),
    surfacePa: 101325, scaleHeightM: 8500, ambience: 'wind',
    note: 'Earth: a dense atmosphere carries sound well; distance mainly makes it quieter.',
  },
  mars: {
    medium: 'mars', carries: true, levelDb: -20, soundSpeed: 240,
    // strong CO2 absorption above ~2 kHz: the high end goes first, within metres (ILLUSTRATIVE curve)
    cutoffAt: (d) => Math.max(260, 2200 / (1 + d / 6)),
    surfacePa: 600, scaleHeightM: 11100, ambience: 'wind',
    note: 'Mars: about 1 % of Earth’s air pressure, mostly CO₂. The same sound is about 20 dB quieter and high pitches fade within metres (Perseverance microphone, Maurice et al. 2022).',
  },
  moon: {
    medium: 'moon', carries: false, levelDb: -Infinity, soundSpeed: null,
    cutoffAt: () => 0, surfacePa: 0, scaleHeightM: 1, ambience: 'silence',
    note: 'Moon: no atmosphere to carry sound. Outside, the only sounds are those inside Neil’s suit and on the radio.',
  },
  space: {
    medium: 'space', carries: false, levelDb: -Infinity, soundSpeed: null,
    cutoffAt: () => 0, surfacePa: 0, scaleHeightM: 1, ambience: 'silence',
    note: 'Space: a vacuum. No external sound; only sounds inside a spacecraft or on the radio.',
  },
}

/** the medium around a point: an atmosphere becomes 'space' where its pressure is negligible */
export function mediumAt(body: 'earth' | 'moon' | 'mars' | null, altitudeM: number): Medium {
  if (!body || body === 'moon') return body === 'moon' ? 'moon' : 'space'
  const P = PROFILES[body]
  return P.surfacePa * Math.exp(-Math.max(0, altitudeM) / P.scaleHeightM) < 1 ? 'space' : body
}

/** pressure relative to the body's surface (0..1) at an altitude */
export function pressureRatio(body: 'earth' | 'mars' | 'moon' | null, altitudeM: number): number {
  if (!body || body === 'moon') return 0
  return Math.exp(-Math.max(0, altitudeM) / PROFILES[body].scaleHeightM)
}

export interface Propagation { gain: number; cutoffHz: number; audible: boolean }

/**
 * An external sound from a source `distanceM` away, in `medium`, with the air around the SOURCE at `pressure` (0..1 of
 * the surface value; a rocket in the upper atmosphere radiates little sound): the gain (linear, 1 = Earth at 1 m) and
 * the low-pass cutoff. In a vacuum, or with no air around the source, nothing is heard.
 */
export function propagate(medium: Medium, distanceM: number, pressure = 1): Propagation {
  const P = PROFILES[medium]
  if (!P.carries || pressure <= 0) return { gain: 0, cutoffHz: 0, audible: false }
  const d = Math.max(1, distanceM)
  const spread = 1 / d // −6 dB per doubling of distance
  const level = Math.pow(10, P.levelDb / 20)
  // the radiated sound scales with the density of the air at the source (dominant for engines and airflow)
  const g = Math.min(1, spread * level) * Math.min(1, pressure)
  return { gain: g, cutoffHz: P.cutoffAt(d), audible: g > 1e-4 }
}

/** how a sound reaches the listener: through the air (external), through a structure / suit (contact), or by radio */
export type Path = 'external' | 'contact' | 'radio'

/** may this sound be heard at all in this medium (radio and contact paths do not need an atmosphere) */
export const canHear = (medium: Medium, path: Path) => path !== 'external' || PROFILES[medium].carries
