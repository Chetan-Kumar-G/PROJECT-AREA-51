import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { MAT } from './materials'
import type { GaitPose } from '../controller'

/**
 * NEIL — the app's lunar explorer (a FICTIONAL avatar: not Neil Armstrong, not a historical astronaut).
 * Articulated procedural rig (a hierarchy of joints, animated by the gait solver in controller.ts) in a modern lunar
 * EVA suit following the pattern NASA documents for Apollo and Artemis suits: white thermal outer layer with ringed
 * joints, a hard upper torso with a chest display and control unit, a portable life-support backpack (PLSS) with vents
 * and umbilical hoses, a bubble helmet with a gold sun visor and helmet-mounted lights (as on modern EVA helmets; they
 * glow when the torch is on), gloves with fingers, overshoes with treads, and a name tag. Geometry is simplified. Forward = −z, feet at y = 0, height ≈ 1.9 m with the helmet.
 * Segment lengths: thigh 0.44 + shin 0.42 + boot 0.06 = LEG_LENGTH 0.92 m (used for no-slide gait).
 */
export interface AstronautHandle {
  root: THREE.Group
  head: THREE.Group
  /**
   * extra (optional): headYaw (rad, + = left) turns the helmet toward something; pointPitch (rad above horizontal)
   * raises the right arm straight out to point; talk (0..1) adds a small speaking nod
   */
  pose: (p: GaitPose, headPitch: number, extra?: { headYaw?: number; pointPitch?: number | null; talk?: number }) => void
}

function Capsule({ r, len, mat, y = 0 }: { r: number; len: number; mat: THREE.Material; y?: number }) {
  return (
    <mesh position={[0, y, 0]} material={mat} castShadow receiveShadow>
      <capsuleGeometry args={[r, len, 6, 14]} />
    </mesh>
  )
}

function Rings({ r, y, n = 3, mat }: { r: number; y: number; n?: number; mat: THREE.Material }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <mesh key={i} position={[0, y - i * 0.035, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat} castShadow>
          <torusGeometry args={[r, 0.016, 6, 18]} />
        </mesh>
      ))}
    </>
  )
}

/** the name tag texture (white on dark, like a suit name patch) */
function nameTag(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const c = document.createElement('canvas'); c.width = 256; c.height = 64
  const g = c.getContext('2d')!
  g.fillStyle = '#1d2a44'; g.fillRect(0, 0, 256, 64)
  g.strokeStyle = '#c9d4ea'; g.lineWidth = 4; g.strokeRect(4, 4, 248, 56)
  g.fillStyle = '#ffffff'; g.font = 'bold 40px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NEIL', 128, 34)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}

export const Astronaut = forwardRef<AstronautHandle, { visibleBody?: boolean; lamp?: boolean }>(function Astronaut({ visibleBody = true, lamp = false }, ref) {
  const m = useMemo(() => ({ suit: MAT.suit(), joint: MAT.suitJoint(), glove: MAT.glove(), boot: MAT.boot(), sole: MAT.sole(), visor: MAT.visor(), shell: MAT.helmetShell(), pack: MAT.suit(), metal: MAT.aluminium(), dark: MAT.darkMetal(),
    lens: new THREE.MeshStandardMaterial({ color: '#dfe6f2', emissive: '#f3f6ff', emissiveIntensity: 0, roughness: 0.2, metalness: 0.1 }),
    tag: new THREE.MeshStandardMaterial({ map: nameTag(), roughness: 0.8 }) }), [])
  m.lens.emissiveIntensity = lamp ? 2.2 : 0
  const root = useRef<THREE.Group>(null!)
  const hips = useRef<THREE.Group>(null!)
  const torso = useRef<THREE.Group>(null!)
  const head = useRef<THREE.Group>(null!)
  const hipL = useRef<THREE.Group>(null!), hipR = useRef<THREE.Group>(null!)
  const kneeL = useRef<THREE.Group>(null!), kneeR = useRef<THREE.Group>(null!)
  const shL = useRef<THREE.Group>(null!), shR = useRef<THREE.Group>(null!)
  const elL = useRef<THREE.Group>(null!), elR = useRef<THREE.Group>(null!)

  useImperativeHandle(ref, () => ({
    get root() { return root.current },
    get head() { return head.current },
    pose(p, headPitch, extra) {
      hips.current.position.y = 0.98 + p.bob
      torso.current.rotation.x = -p.lean
      hipL.current.rotation.x = p.hipL
      hipR.current.rotation.x = p.hipR
      kneeL.current.rotation.x = -p.kneeL
      kneeR.current.rotation.x = -p.kneeR
      shL.current.rotation.x = p.shoulderL
      shR.current.rotation.x = p.shoulderR
      elL.current.rotation.x = p.elbow
      elR.current.rotation.x = p.elbow
      const nod = extra?.talk ? Math.sin(performance.now() / 160) * 0.035 * extra.talk : 0
      head.current.rotation.x = THREE.MathUtils.clamp(headPitch + nod, -0.5, 0.45)
      head.current.rotation.y = THREE.MathUtils.clamp(extra?.headYaw ?? 0, -1.1, 1.1)
      if (extra?.pointPitch !== undefined && extra.pointPitch !== null) {
        // arm straight out toward the target: 0 = hanging, +π/2 = horizontal forward
        shR.current.rotation.x = Math.PI / 2 + THREE.MathUtils.clamp(extra.pointPitch, -0.9, 1.0)
        elR.current.rotation.x = 0.05
      }
    },
  }))

  const leg = (side: 1 | -1, hipRef: typeof hipL, kneeRef: typeof kneeL) => (
    <group ref={hipRef} position={[0.115 * side, -0.02, 0]}>
      <Rings r={0.1} y={-0.02} n={2} mat={m.joint} />
      <Capsule r={0.095} len={0.3} mat={m.suit} y={-0.22} />
      <group ref={kneeRef} position={[0, -0.44, 0]}>
        <Rings r={0.088} y={0.03} n={3} mat={m.joint} />
        <Capsule r={0.085} len={0.28} mat={m.suit} y={-0.21} />
        {/* lunar overshoe */}
        <group position={[0, -0.42, 0]}>
          <mesh position={[0, 0.045, -0.04]} material={m.boot} castShadow>
            <boxGeometry args={[0.15, 0.11, 0.3]} />
          </mesh>
          <mesh position={[0, -0.005, -0.04]} material={m.sole} castShadow>
            <boxGeometry args={[0.16, 0.025, 0.31]} />
          </mesh>
          {[-0.15, -0.09, -0.03, 0.03, 0.09].map((z) => (
            <mesh key={z} position={[0, -0.02, z - 0.04]} material={m.dark}>
              <boxGeometry args={[0.15, 0.012, 0.022]} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )

  const arm = (side: 1 | -1, shRef: typeof shL, elRef: typeof elL) => (
    <group ref={shRef} position={[0.29 * side, 0.2, 0]} rotation={[0, 0, 0.12 * side]}>
      <mesh material={m.joint} castShadow>
        <sphereGeometry args={[0.1, 14, 10]} />
      </mesh>
      <Capsule r={0.075} len={0.2} mat={m.suit} y={-0.16} />
      <group ref={elRef} position={[0, -0.31, 0]}>
        <Rings r={0.072} y={0.03} n={2} mat={m.joint} />
        <Capsule r={0.066} len={0.18} mat={m.suit} y={-0.14} />
        <mesh position={[0, -0.28, 0]} material={m.dark} castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.04, 14]} />
        </mesh>
        <mesh position={[0, -0.34, -0.01]} material={m.glove} castShadow>
          <boxGeometry args={[0.09, 0.09, 0.06]} />
        </mesh>
        {[-0.03, -0.01, 0.01, 0.03].map((x) => (
          <mesh key={x} position={[x, -0.415, -0.012]} material={m.glove} castShadow>
            <capsuleGeometry args={[0.009, 0.05, 3, 6]} />
          </mesh>
        ))}
        <mesh position={[0.05 * -side, -0.37, -0.02]} rotation={[0, 0, 0.6 * side]} material={m.glove} castShadow>
          <capsuleGeometry args={[0.01, 0.035, 3, 6]} />
        </mesh>
      </group>
    </group>
  )

  return (
    <group ref={root}>
      <group ref={hips} position={[0, 0.98, 0]}>
        <mesh material={m.suit} castShadow visible={visibleBody}>
          <cylinderGeometry args={[0.19, 0.2, 0.18, 16]} />
        </mesh>
        <group visible={visibleBody}>
          {leg(-1, hipL, kneeL)}
          {leg(1, hipR, kneeR)}
        </group>
        <group ref={torso} position={[0, 0.1, 0]}>
          <group visible={visibleBody}>
            <mesh position={[0, 0.22, 0]} material={m.suit} castShadow>
              <capsuleGeometry args={[0.22, 0.24, 6, 16]} />
            </mesh>
            {/* chest display and control unit */}
            <mesh position={[0, 0.3, -0.24]} material={m.metal} castShadow>
              <boxGeometry args={[0.24, 0.12, 0.07]} />
            </mesh>
            {/* name tag above the display: NEIL */}
            <mesh position={[0.1, 0.42, -0.215]} rotation={[0.12, 0, 0]} material={m.tag}>
              <planeGeometry args={[0.14, 0.035]} />
            </mesh>
            {/* umbilical hoses from the backpack to the chest unit */}
            {[-1, 1].map((sd) => (
              <mesh key={sd} position={[0.2 * sd, 0.18, -0.04]} rotation={[Math.PI / 2, 0, 0]} material={m.dark} castShadow>
                <torusGeometry args={[0.16, 0.014, 6, 16, Math.PI * 0.9]} />
              </mesh>
            ))}
            {/* backpack vents */}
            {[0.06, 0.16, 0.26, 0.36].map((y) => (
              <mesh key={y} position={[0, y + 0.02, 0.395]} material={m.dark}>
                <boxGeometry args={[0.3, 0.025, 0.01]} />
              </mesh>
            ))}
            {/* PLSS backpack + OPS on top */}
            <mesh position={[0, 0.26, 0.28]} material={m.pack} castShadow>
              <boxGeometry args={[0.46, 0.62, 0.22]} />
            </mesh>
            <mesh position={[0, 0.65, 0.27]} material={m.pack} castShadow>
              <boxGeometry args={[0.4, 0.16, 0.18]} />
            </mesh>
            <mesh position={[0.17, 0.78, 0.3]} material={m.dark}>
              <cylinderGeometry args={[0.008, 0.008, 0.16, 6]} />
            </mesh>
            {arm(-1, shL, elL)}
            {arm(1, shR, elR)}
          </group>
          {/* helmet: neck ring, bubble, gold visor */}
          <group ref={head} position={[0, 0.56, -0.02]}>
            <mesh position={[0, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.metal} visible={visibleBody}>
              <torusGeometry args={[0.15, 0.025, 8, 24]} />
            </mesh>
            <mesh position={[0, 0.1, 0]} material={m.shell} visible={visibleBody}>
              <sphereGeometry args={[0.2, 24, 18]} />
            </mesh>
            <mesh position={[0, 0.1, 0]} rotation={[-0.1, 0, 0]} material={m.visor} castShadow visible={visibleBody}>
              <sphereGeometry args={[0.205, 24, 18, Math.PI * 0.62, Math.PI * 0.76, Math.PI * 0.18, Math.PI * 0.5]} />
            </mesh>
            <mesh position={[0, 0.1, 0.02]} material={m.suit} castShadow visible={visibleBody}>
              <sphereGeometry args={[0.212, 20, 14, Math.PI * 1.42, Math.PI * 1.16, 0, Math.PI * 0.62]} />
            </mesh>
            {/* visor frame */}
            <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2 - 0.1, 0, 0]} material={m.metal} visible={visibleBody}>
              <torusGeometry args={[0.206, 0.008, 6, 32, Math.PI]} />
            </mesh>
            {/* helmet lights (the torch): a housing each side, the lens glows when it is on */}
            {[-1, 1].map((sd) => (
              <group key={sd} position={[0.205 * sd, 0.2, -0.04]} visible={visibleBody}>
                <mesh material={m.metal} castShadow><boxGeometry args={[0.05, 0.06, 0.09]} /></mesh>
                <mesh position={[0, 0, -0.047]} rotation={[Math.PI / 2, 0, 0]} material={m.lens}><cylinderGeometry args={[0.02, 0.02, 0.006, 14]} /></mesh>
              </group>
            ))}
          </group>
        </group>
      </group>
    </group>
  )
})
