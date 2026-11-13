import type { Frame, Obj } from '../flight'

/** mutable per-frame state shared by the scene's components (never React state) */
export const live = {
  frame: null as Frame | null,
  objs: new Map<string, Obj>(),
  /** ambient pressure 0..1 at the subject (1 = sea level), for plume expansion */
  pressure: 0,
  /** mission seconds per second right now */
  rate: 1,
  t: 0,
  wall: 0,
  /** framing extent of the subject (m) */
  subject: 10,
  /** 0 night ... 1 day, from the Sun's elevation at the subject */
  day: 1,
  /** free camera: the user's orbit / zoom around the director's target (eases back to the cinematic shot when off) */
  user: { free: false, yaw: 0, pitch: 0, zoom: 1 },
  /** the camera position actually used (subject-relative), for checks */
  camEye: [0, 0, 0] as [number, number, number],
  /** profiling: ms spent in the scene's per-frame update (flight frame + camera director) */
  updateMs: 0,
  /** presentation light direction on the Mars surface at night / while fast-forwarded (null = the real Sun) */
  sunOverride: null as [number, number, number] | null,
  /** the framed subject on screen: NDC centre (x right, y up, -1..1) and radius as a fraction of the half-height */
  subjectScreen: { x: 0, y: 0, r: 0.2 },
  /** the framed parts' bounding box on screen, NDC [x0, y0, x1, y1] (null when it reaches behind the camera) */
  subjectRect: null as [number, number, number, number] | null,
  /** every environment's shaders pre-compiled (set a moment after the replay opens) */
  warm: false,
}
