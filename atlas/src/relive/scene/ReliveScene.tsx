/**
 * The Relive Mission 3-D view: one R3F canvas (the orbital canvas and the Unity player are paused while it runs).
 * Every frame: mission time from the player clock → flight frame → objects placed relative to the subject
 * (floating origin, float64 maths) → camera director (blend + ease) → environment.
 */
import { Suspense, memo, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { clock, useRelive } from '../player'
import { frameAt, type Frame, type ModelKind } from '../flight'
import { groundUp } from '../marsSurfaceData'
import { oppGround } from '../oppSurface'
import { metAt, playLength, rateAt } from '../timeline'
import { live } from './live'
import { Environment, PathLine, rel } from './env'
import { ModelFor, SIZE } from './models'
import { Marker, MarsHaze, Plasma } from './effects'
import { lerpPose, shotPose, type Pose } from './director'
import { v3, type V3, R_EARTH, R_MARS } from '../geo'
import { planetaryAudio, type ThrusterSource } from '../../audio/planetaryAudio'
import { mediumAt, pressureRatio } from '../../audio/acoustics'
import { missionAudio } from '../audio'
import { PROFILES, quality, nextScale, type FixedProfile, type ReliveQuality } from './quality'

function basis(fwd: V3, side?: V3): THREE.Quaternion {
  const y = new THREE.Vector3(...fwd).normalize()
  let z = new THREE.Vector3(...(side ?? [1, 0, 0]))
  z.sub(y.clone().multiplyScalar(z.dot(y)))
  if (z.lengthSq() < 1e-8) { z = new THREE.Vector3(1, 0, 0).sub(y.clone().multiplyScalar(y.x)); if (z.lengthSq() < 1e-8) z.set(0, 0, 1) }
  z.normalize()
  const x = new THREE.Vector3().crossVectors(y, z)
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z))
}

const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _m = new THREE.Matrix4()
/** basis() without allocations: writes the orientation into q (called for every object, every frame) */
function setBasis(q: THREE.Quaternion, fwd: V3, side?: V3) {
  _y.set(fwd[0], fwd[1], fwd[2]).normalize()
  if (side) _z.set(side[0], side[1], side[2]); else _z.set(1, 0, 0)
  _z.addScaledVector(_y, -_z.dot(_y))
  if (_z.lengthSq() < 1e-8) { _z.set(1, 0, 0).addScaledVector(_y, -_y.x); if (_z.lengthSq() < 1e-8) _z.set(0, 0, 1) }
  _z.normalize()
  _x.crossVectors(_y, _z)
  q.setFromRotationMatrix(_m.makeBasis(_x, _y, _z))
}

/**
 * Everything a mission's replay will show: the environments and the models, sampled over its whole timeline (every
 * event, every phase, and evenly in mission and playback time). They are mounted when the replay opens — behind the
 * intro card — and kept mounted, so playing, seeking and jumping never build a planet, a terrain patch or a model.
 */
function missionPlan(scriptId: string): { envs: string[]; models: [string, ModelKind][] } {
  const sc = clock.script
  if (!sc) return { envs: [], models: [] }
  const envs = new Set<string>(), models = new Map<string, ModelKind>()
  const fr = (t: number) => (sc.frame ? sc.frame(t) : frameAt(scriptId, t))
  const t0 = sc.phases[0].t0, t1 = sc.phases[sc.phases.length - 1].t1, L = playLength(sc.segments)
  const ts: number[] = []
  for (const e of sc.events) ts.push(e.t, e.t + 1, e.t + 5, e.t + 30)
  for (const p of sc.phases) ts.push(p.t0, (p.t0 + p.t1) / 2, p.t1 - 1)
  for (let i = 0; i <= 400; i++) { ts.push(t0 + ((t1 - t0) * i) / 400); ts.push(metAt(sc.segments, (L * i) / 400)) }
  for (const t of ts) {
    try {
      const f = fr(t)
      envs.add(f.env)
      for (const o of f.objects) if (!models.has(o.key)) models.set(o.key, o.model)
    } catch { /* a sample outside a model's range: skipped */ }
  }
  return { envs: [...envs], models: [...models] }
}

function pressureOf(env: string, alt: number): number {
  if (env === 'earth') return Math.exp(-Math.max(0, alt) / 8500)
  if (env === 'mars' || env === 'mars-local') return 0.15 * Math.exp(-Math.max(0, alt) / 11100)
  return 0
}

/**
 * The replay's soundscape, every frame, from what the frame shows (audio/planetaryAudio.ts, audio/acoustics.ts): where
 * the camera is (Earth's or Mars's air at its real height, the Moon, space), which engines burn and how far they are,
 * the air around the vehicle (a launch fades out as it leaves the atmosphere; entry airflow only begins with air), the
 * wind and dust on the Mars surface. Cues (relive/audio.ts) use the same listener context.
 */
const MOON_R = 1737.4e3
function sceneAudio(f: import('../flight').Frame, eye: THREE.Vector3) {
  const body = f.env === 'earth' ? 'earth' : f.env === 'mars' || f.env === 'mars-local' ? 'mars' : f.env === 'moon' ? 'moon' : null
  const R = body === 'earth' ? R_EARTH : body === 'mars' ? R_MARS : MOON_R
  const camAlt = f.env === 'mars-local' ? f.alt + eye.y : body ? Math.hypot(f.focus[0] + eye.x, f.focus[1] + eye.y, f.focus[2] + eye.z) - R : 1e12
  const medium = mediumAt(body, camAlt)
  const atSubject = pressureRatio(body, f.alt)
  const thrusters: ThrusterSource[] = []
  for (const o of f.objects) {
    if (!(o.thrust && o.thrust > 0)) continue
    const p = rel(o.pos)
    const d = Math.hypot(p[0] - eye.x, p[1] - eye.y, p[2] - eye.z)
    thrusters.push({ thrust: o.thrust, distanceM: d, pressure: atSubject, kind: o.model === 'mer-backshell' ? 'retro' : o.model.startsWith('exp-') ? 'carrier' : 'rocket' })
  }
  const dist = eye.length()
  const speed = Math.hypot(...f.vel)
  // aerodynamic noise scales with density × speed² (ILLUSTRATIVE normalisation)
  const airflow = body && body !== 'moon' ? Math.min(1, atSubject * Math.pow(speed / (body === 'mars' ? 900 : 700), 2)) : 0
  const S = useRelive.getState()
  const onPad = f.env === 'earth' && f.alt < 300
  const onMars = f.env === 'mars-local'
  planetaryAudio.update('relive', {
    medium, thrusters, airflow: airflow > 0.01 ? { level: airflow, distanceM: dist, pressure: atSubject } : null,
    windMs: onPad ? 5 : onMars ? 4 + 18 * (f.dust ?? 0) : 0, dust: f.dust ?? 0,
    paused: S.status !== 'playing',
  })
  missionAudio.setContext(medium, dist, atSubject)
}

function World({ scriptId }: { scriptId: string }) {
  const plan = useMemo(() => missionPlan(scriptId), [scriptId])
  const [env, setEnv] = useState<string | null>(null)
  const [envs, setEnvs] = useState<string[]>(plan.envs)
  const [keys, setKeys] = useState<[string, ModelKind][]>(plan.models)
  const known = useRef(new Map<string, ModelKind>(plan.models))
  const envGroups = useRef(new Map<string, THREE.Group>())
  const seen = useRef(new Set<string>())
  const groups = useRef(new Map<string, THREE.Group>())
  const cam = useRef<{ eye: THREE.Vector3; target: THREE.Vector3; fov: number; env: string } | null>(null)
  const markerOn = useRef(false)
  const cue = useRef({ idx: -1, wall: -1e9, env: '', lastU: -1 })
  const [marker, setMarker] = useState(false)
  const { camera, scene, gl } = useThree()
  useEffect(() => { planetaryAudio.claim('relive'); return () => planetaryAudio.release('relive') }, [])
  if (typeof window !== 'undefined') (window as unknown as { __reliveScene?: unknown }).__reliveScene = { scene, camera, live, gl }

  useFrame((_, dtRaw) => {
    const sc = clock.script
    if (!sc) return
    const perf0 = performance.now()
    const dt = Math.min(0.1, dtRaw)
    const t = clock.t
    const f = sc.frame ? sc.frame(t) : frameAt(scriptId, t)
    live.frame = f
    live.t = t
    live.wall = clock.wall
    live.rate = rateAt(sc.segments, clock.u)
    live.objs.clear()
    for (const o of f.objects) live.objs.set(o.key, o)
    live.pressure = pressureOf(f.env, f.alt)
    // daylight factor from the Sun's elevation at the subject (only meaningful inside an atmosphere)
    const se = f.sun[0] * f.up[0] + f.sun[1] * f.up[1] + f.sun[2] * f.up[2]
    const inAir = f.env === 'earth' || f.env === 'mars-local'
    const dayTrue = inAir ? Math.min(1, Math.max(0, (se + 0.12) / 0.3)) : 1
    // presentation (disclosed under "How do we know?"): while a surface phase is fast-forwarded (more than 30 min of
    // mission time per second) day and night would flash past several times a second, so the light is held at day;
    // a real night keeps a floor so the hardware stays visible instead of a black screen
    // Mars surface only (the night launch on Earth stays a night launch, lit by its engines)
    const fast = f.env === 'mars-local' && live.rate > 1800
    const dark = f.env === 'mars-local' && dayTrue < 0.45
    if (fast || dark) {
      // the Sun's real compass direction, raised to 35° above the horizon, so the light falls from above
      const h = [f.sun[0] - f.up[0] * se, f.sun[1] - f.up[1] * se, f.sun[2] - f.up[2] * se]
      const hl = Math.hypot(h[0], h[1], h[2]) || 1
      const c = Math.cos(0.61), s = Math.sin(0.61)
      live.sunOverride = [(h[0] / hl) * c + f.up[0] * s, (h[1] / hl) * c + f.up[1] * s, (h[2] / hl) * c + f.up[2] * s]
      live.day = fast ? 0.9 : 0.45
    } else {
      live.sunOverride = null
      live.day = dayTrue
    }
    // a dust storm (Opportunity 2007, 2018) dims the sunlight on the surface (ILLUSTRATIVE strength)
    if (f.dust) live.day *= 1 - 0.62 * f.dust
    // environments and models stay mounted: switching shows / hides them (nothing is built or compiled here)
    if (f.env !== env) {
      setEnv(f.env)
      if (!envs.includes(f.env)) setEnvs((x) => (x.includes(f.env) ? x : [...x, f.env]))
    }
    let added = false
    for (const o of f.objects) if (known.current.get(o.key) !== o.model) { known.current.set(o.key, o.model); added = true }
    if (added) setKeys([...known.current])
    // place the hardware (relative to the subject); every model not in this frame is hidden
    seen.current.clear()
    for (const o of f.objects) {
      const g = groups.current.get(o.key)
      if (!g) continue
      seen.current.add(o.key)
      g.position.set(...rel(o.pos))
      setBasis(g.quaternion, o.fwd, o.side)
      g.visible = (o.fade ?? 1) > 0.15
    }
    for (const [k, g] of groups.current) if (!seen.current.has(k)) g.visible = false
    // camera director: frame the parts within 400 m of the subject (the whole stack, the canopies, ...)
    let size = 3
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]
    // the frame's focus point can drift from the hardware far from a body (hundreds of metres in the departure and
    // cruise frames): frame what is within 400 m of the NEAREST visible part, so the camera never aims at empty space
    let nearest = Infinity
    for (const o of f.objects) if ((o.fade ?? 1) >= 0.5) nearest = Math.min(nearest, Math.hypot(...rel(o.pos)))
    const reach = Number.isFinite(nearest) ? Math.max(400, nearest + 400) : 400
    for (const o of f.objects) {
      if ((o.fade ?? 1) < 0.5) continue
      if (o.p?.scenery) continue // drawn, but not what the shot is about (the lander left in Eagle crater)
      const r = rel(o.pos), L = SIZE[o.model] ?? 2
      if (Math.hypot(...r) > reach) continue
      const tip = [r[0] + o.fwd[0] * L, r[1] + o.fwd[1] * L, r[2] + o.fwd[2] * L]
      for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], r[i], tip[i]); hi[i] = Math.max(hi[i], r[i], tip[i]) }
    }
    let center: V3 = [0, 0, 0]
    if (lo[0] < Infinity) {
      center = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2]
      size = Math.max(3, Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]))
    }
    live.subject = size
    // the active shot; blends run on wall-clock time (so they finish while paused), a seek or a new environment cuts
    const cues = sc.shots
    let idx = 0
    for (let k = 0; k < cues.length; k++) if (cues[k].t <= t) idx = k
    const speed = useRelive.getState().speed
    const jumped = cue.current.lastU >= 0 && Math.abs(clock.u - cue.current.lastU) > Math.max(0.6, dt * speed * 4)
    cue.current.lastU = clock.u
    if (idx !== cue.current.idx) { cue.current.idx = idx; cue.current.wall = jumped ? -1e9 : clock.wall; cue.current.env = f.env }
    if (f.env !== cue.current.env) { cue.current.env = f.env; cue.current.wall = -1e9 }
    const wl = Math.min(1, Math.max(0, (clock.wall - cue.current.wall) / 1.8))
    const w = wl * wl * (3 - 2 * wl)
    const a: Pose = shotPose(cues[Math.max(0, idx - 1)].shot, f, clock.wall, size, center)
    const b: Pose = shotPose(cues[idx].shot, f, clock.wall, size, center)
    const p = lerpPose(a, b, w)
    const want = { eye: new THREE.Vector3(...terrainSafeEye(f, p.eye, p.target)), target: new THREE.Vector3(...p.target) }
    const c = cam.current
    const cut = !c || jumped || c.env !== f.env || c.eye.distanceTo(want.eye) > 50 * Math.max(10, want.eye.length())
    if (cut) cam.current = { eye: want.eye.clone(), target: want.target.clone(), fov: p.fov, env: f.env }
    else {
      const k = 1 - Math.exp(-dt * 3.5)
      // ease in log-distance so the camera does not crawl through huge range changes
      const L0 = c!.eye.length(), L1 = want.eye.length()
      const dir = c!.eye.clone().normalize().lerp(want.eye.clone().normalize(), k).normalize()
      c!.eye.copy(dir.multiplyScalar(Math.exp(Math.log(Math.max(1e-3, L0)) + (Math.log(Math.max(1e-3, L1)) - Math.log(Math.max(1e-3, L0))) * k)))
      c!.target.lerp(want.target, k)
      c!.fov += (p.fov - c!.fov) * k
    }
    const C = cam.current!
    // free camera: orbit / zoom around the director's target; when switched off it eases back to the cinematic shot
    const U = live.user
    if (!U.free) { const k = 1 - Math.exp(-dt * 4); U.yaw -= U.yaw * k; U.pitch -= U.pitch * k; U.zoom += (1 - U.zoom) * k }
    let eye = C.eye
    if (Math.abs(U.yaw) > 1e-4 || Math.abs(U.pitch) > 1e-4 || Math.abs(U.zoom - 1) > 1e-4) {
      const upV = new THREE.Vector3(...f.up)
      const off = C.eye.clone().sub(C.target).applyAxisAngle(upV, U.yaw)
      const right = off.clone().cross(upV)
      if (right.lengthSq() > 1e-12) off.applyAxisAngle(right.normalize(), U.pitch)
      eye = C.target.clone().add(off.multiplyScalar(U.zoom))
    }
    { const se = terrainSafeEye(f, [eye.x, eye.y, eye.z], [C.target.x, C.target.y, C.target.z], false); eye = new THREE.Vector3(...se) } // the free camera never goes under the ground either
    live.camEye = [eye.x, eye.y, eye.z]
    camera.position.copy(eye)
    camera.up.set(...f.up)
    camera.lookAt(C.target)
    const pc = camera as THREE.PerspectiveCamera
    if (Math.abs(pc.fov - C.fov) > 0.01) { pc.fov = C.fov; pc.updateProjectionMatrix() }
    const dist = C.eye.length()
    // where the framed subject is on screen (NDC) and how much of the screen it covers: the story card picks the
    // corner farthest from it, so captions never sit on the vehicle
    camera.updateMatrixWorld()
    const sp = new THREE.Vector3(...center).project(camera)
    const halfH = Math.max(1e-6, eye.distanceTo(new THREE.Vector3(...center)) * Math.tan(((C.fov / 2) * Math.PI) / 180))
    live.subjectScreen = { x: sp.z < 1 ? sp.x : 0, y: sp.z < 1 ? sp.y : 0, r: Math.min(2, size / 2 / halfH) }
    // the parts' bounding box on screen (NDC), so a tall stack (canopy, bridle, lander) leaves its empty sky usable
    if (lo[0] < Infinity) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, behind = false
      const q = new THREE.Vector3()
      for (let k = 0; k < 8; k++) {
        q.set(k & 1 ? hi[0] : lo[0], k & 2 ? hi[1] : lo[1], k & 4 ? hi[2] : lo[2]).project(camera)
        if (q.z >= 1) behind = true
        x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y)
      }
      live.subjectRect = behind ? null : [x0, y0, x1, y1]
    } else live.subjectRect = null
    const on = size / dist < 0.0035 * (C.fov / 45)
    if (on !== markerOn.current) { markerOn.current = on; setMarker(on) }
    sceneAudio(f, eye)
    live.updateMs = performance.now() - perf0 // for profiling: the scene's own per-frame work (frame model + director)
  })

  // pre-compile every environment's shaders once everything has mounted (each with only its own lights visible: the
  // program cache is keyed by the light set), so the first visit to a phase does not stall on shader compilation
  useEffect(() => {
    let alive = true
    const id = window.setTimeout(async () => {
      for (const e of envs) {
        if (!alive) return
        const restore: [THREE.Object3D, boolean][] = []
        for (const [name, g] of envGroups.current) { restore.push([g, g.visible]); g.visible = name === e }
        const show = (root: THREE.Object3D) => root.traverse((o) => { if (!o.visible) { restore.push([o, false]); o.visible = true } })
        const eg = envGroups.current.get(e); if (eg) show(eg)
        for (const g of groups.current.values()) show(g)
        let p: Promise<unknown> | null = null
        try { p = gl.compileAsync(scene, camera) } catch { p = null }
        for (const [o, v] of restore) o.visible = v
        if (p) await p.catch(() => {})
      }
      live.warm = true
    }, 700)
    return () => { alive = false; window.clearTimeout(id) }
  }, [envs.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const objs = useMemo(() => keys.map(([key, model]) => (
    <group key={key + ':' + model} visible={false} ref={(g) => { if (g) groups.current.set(key, g); else if (groups.current.get(key)?.userData.model === model) groups.current.delete(key) }} userData={{ model }}>
      <ModelFor kind={model} k={key} />
    </group>
  )), [keys])

  return (
    <>
      {envs.map((e) => (
        <group key={e} visible={e === env} ref={(g) => { if (g) envGroups.current.set(e, g); else envGroups.current.delete(e) }}>
          <Suspense fallback={null}><Environment env={e} /></Suspense>
        </group>
      ))}
      <PathLine />
      {objs}
      <Plasma size={env?.startsWith('mars') ? 2.2 : 3.2} />
      <Marker visible={marker} />
      <MarsHaze />
    </>
  )
}

/** Auto: dynamic resolution from the measured frame times (fixed profiles keep their render scale) */
function AdaptiveQuality({ auto, cap }: { auto: boolean; cap: number }) {
  const setDpr = useThree((st) => st.setDpr)
  const buf = useRef<number[]>([])
  const last = useRef({ check: 0, down: -1e9 })
  useFrame((_, dt) => {
    const b = buf.current
    b.push(dt * 1000)
    if (b.length > 120) b.shift()
    const now = performance.now()
    if (now - last.current.check < 2000) return
    last.current.check = now
    const sorted = [...b].sort((x, y) => x - y)
    quality.fps = Math.round(1000 / (b.reduce((a, x) => a + x, 0) / Math.max(1, b.length)))
    quality.p95 = +(sorted[Math.floor(sorted.length * 0.95)] ?? 0).toFixed(1)
    if (!auto || useRelive.getState().status !== 'playing') return
    const scale = nextScale(quality.scale, b, 1, now - last.current.down > 10000)
    if (scale !== quality.scale) {
      if (scale < quality.scale) last.current.down = now
      quality.scale = scale
      setDpr(Math.max(0.5, cap * scale))
      b.length = 0
    }
  })
  return null
}

/**
 * The canvas for one quality profile (a different profile is a fresh canvas: shadow type and map size are fixed at
 * creation). Memoised: the overlay re-renders ten times a second, the 3-D scene must not.
 */
export const ReliveScene = memo(function ReliveScene({ scriptId, mode, profile }: { scriptId: string; mode: ReliveQuality; profile: FixedProfile }) {
  // the first frame is computed before the environment mounts, so its local patches know their site
  useMemo(() => { const sc = clock.script; live.frame = sc ? (sc.frame ? sc.frame(clock.t) : frameAt(scriptId, clock.t)) : null }, [scriptId])
  const P = PROFILES[profile]
  quality.profile = P
  const cap = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, P.dpr)
  useEffect(() => { quality.scale = 1; live.warm = false }, [profile])
  return (
    <Canvas
      key={profile}
      className="relive-canvas"
      shadows={P.softShadows ? 'soft' : true}
      dpr={cap}
      gl={{ logarithmicDepthBuffer: true, antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.95 }}
      camera={{ fov: 45, near: 0.05, far: 1e13, position: [0, 2, 10] }}
      onCreated={({ gl }) => { gl.setClearColor('#000002') }}
    >
      <World scriptId={scriptId} />
      <AdaptiveQuality auto={mode === 'auto'} cap={cap} />
    </Canvas>
  )
})

export const _sceneTest = { basis, v3 }

/**
 * On a measured local surface (env 'mars-local' with a terrain package: Opportunity's years on Meridiani), the director's
 * shot is moved out of the ground: the eye stays >= 1.2 m above the DRAWN surface, and when the drawn terrain (a crater
 * wall, a rise) stands between the eye and the subject the eye rises until the subject is in view (up to 60 m).
 * Shots are relative to the frame's focus; in this environment the frame IS the package frame (x east, y up, z south).
 * Before, a 'low' egress shot put the eye inside the measured terrain (the screen showed the underside of the ground).
 */
function terrainSafeEye(f: Frame, eye: V3, target: V3, sight = true): V3 {
  if (f.env !== 'mars-local' || !f.site?.pkg) return eye
  const ground = (xw: number, zw: number) => (f.site!.pkg === 'victoria' ? oppGround(xw, -zw) : groundUp(f.site!.pkg, xw, -zw))
  const F = f.focus
  const E: V3 = [F[0] + eye[0], F[1] + eye[1], F[2] + eye[2]], T: V3 = [F[0] + target[0], F[1] + target[1], F[2] + target[2]]
  const clear = (e: V3) => {
    const g0 = ground(e[0], e[2])
    if (Number.isFinite(g0) && e[1] < g0 + 1.2) return false
    if (!sight) return true
    const d: V3 = [e[0] - T[0], e[1] - T[1], e[2] - T[2]]
    const len = Math.hypot(d[0], d[1], d[2])
    const n = Math.min(60, Math.max(6, Math.ceil(len / 1.5)))
    for (let i = 1; i < n; i++) {
      const u = i / n
      if (u * len < 2) continue // the subject's own footprint
      const x = T[0] + d[0] * u, y = T[1] + d[1] * u, z = T[2] + d[2] * u
      const g = ground(x, z)
      if (Number.isFinite(g) && g + 0.3 > y) return false
    }
    return true
  }
  let e: V3 = E
  if (!clear(e)) {
    const g0 = ground(E[0], E[2])
    if (Number.isFinite(g0) && e[1] < g0 + 1.2) e = [e[0], g0 + 1.2, e[2]]
    for (let k = 0; k < 120 && !clear(e); k++) e = [e[0], e[1] + 0.5, e[2]]
  }
  return [e[0] - F[0], e[1] - F[1], e[2] - F[2]]
}
