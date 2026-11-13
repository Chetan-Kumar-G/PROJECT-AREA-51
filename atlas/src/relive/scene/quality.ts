/**
 * Relive render quality (Milestone 5). Three fixed profiles and Auto:
 *
 *   Balanced  render scale 1.0, 1024 px PCF shadows, planets 192 × 96 segments
 *   High      render scale up to 1.5, 2048 px soft shadows, planets 320 × 160
 *   Ultra     render scale up to 2.0, 4096 px soft shadows, planets 512 × 256
 *   Auto      starts from High (Balanced on software / very small GPUs) and adapts the render scale to the measured
 *             frame time: down when the 95th-percentile frame is slower than ~24 ms, back up when there is headroom.
 *
 * Every profile keeps the same models, effects and shadows; only resolution, shadow-map size and planet tessellation
 * change. The chosen profile is kept per browser.
 */
export type ReliveQuality = 'auto' | 'balanced' | 'high' | 'ultra'
export type FixedProfile = Exclude<ReliveQuality, 'auto'>

export interface Profile {
  label: string
  /** maximum render scale (device pixels per CSS pixel), capped by the display's own pixel ratio */
  dpr: number
  shadowMap: number
  softShadows: boolean
  /** planet sphere tessellation */
  globe: [number, number]
}

export const PROFILES: Record<FixedProfile, Profile> = {
  balanced: { label: 'Balanced', dpr: 1.0, shadowMap: 1024, softShadows: false, globe: [192, 96] },
  high: { label: 'High', dpr: 1.5, shadowMap: 2048, softShadows: true, globe: [320, 160] },
  ultra: { label: 'Ultra', dpr: 2.0, shadowMap: 4096, softShadows: true, globe: [512, 256] },
}

const KEY = 'cosmic-atlas.relive.quality'
export function readQuality(): ReliveQuality {
  try {
    const v = window.localStorage.getItem(KEY)
    return v === 'balanced' || v === 'high' || v === 'ultra' || v === 'auto' ? v : 'auto'
  } catch {
    return 'auto'
  }
}
export function writeQuality(q: ReliveQuality) {
  try { window.localStorage.setItem(KEY, q) } catch { /* private mode */ }
}

/** Auto's starting profile from what the browser says about the GPU (refined at run time by the frame-time loop) */
export function autoProfile(gpu: string | null): FixedProfile {
  const g = (gpu ?? '').toLowerCase()
  if (/swiftshader|llvmpipe|software|microsoft basic/.test(g)) return 'balanced'
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency ?? 4 : 4
  if (cores <= 4) return 'balanced'
  return 'high'
}

/** the profile in effect: a fixed choice, or Auto's starting point */
export function effectiveProfile(q: ReliveQuality, gpu: string | null): FixedProfile {
  return q === 'auto' ? autoProfile(gpu) : q
}

let gpuName: string | null | undefined
/** the GPU the browser reports (one throwaway WebGL context, once) */
export function detectGpu(): string | null {
  if (gpuName !== undefined) return gpuName
  gpuName = null
  try {
    const c = document.createElement('canvas')
    const ctx = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null
    const dbg = ctx?.getExtension('WEBGL_debug_renderer_info')
    gpuName = dbg && ctx ? String(ctx.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : null
    ctx?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch { gpuName = null }
  return gpuName
}

/** what the scene components read while a replay renders (set by the scene for the profile it was created with) */
export const quality = {
  profile: PROFILES.high as Profile,
  /** Auto: the render scale the frame-time loop settled on (CSS px → device px) */
  scale: 1,
  /** measured frames per second (rolling, ~1 s) */
  fps: 0,
  p95: 0,
}

/**
 * Auto's dynamic resolution: given recent frame times (ms), the next render scale. Steps down by 15 % when the 95th
 * percentile is slower than 24 ms (below ~42 fps); steps up by 10 % when frames keep pace with a 60 Hz display
 * (p95 under 18.5 ms) and `mayRaise` (the caller waits a while after a step down, so it does not oscillate).
 * Range [0.6, cap].
 */
export function nextScale(scale: number, frames: number[], cap: number, mayRaise = true): number {
  if (frames.length < 60) return scale
  const s = [...frames].sort((a, b) => a - b)
  const p95 = s[Math.min(s.length - 1, Math.floor(s.length * 0.95))]
  if (p95 > 24) return Math.max(0.6, +(scale * 0.85).toFixed(3))
  if (mayRaise && p95 < 18.5 && scale < cap) return Math.min(cap, +(scale * 1.1).toFixed(3))
  return scale
}
