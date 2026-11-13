/**
 * The main asteroid belt in the orbital scene: ~10,300 real main-belt asteroids (JPL SBDB, H < 13.5) between Mars's
 * and Jupiter's orbits, each on its own Keplerian orbit for the simulation date (scene/asteroidBelt.ts).
 *
 * Placement follows the planets' orbit-line convention exactly: a group at the Sun's camera-relative position, scaled
 * by the scene's adaptive scale, rotated from the ecliptic frame (the planets' elements' frame) into the scene, holding
 * true-scale geometry (here: positions in AU). Nothing is placed in hand-made world coordinates.
 *
 * Former implementation (replaced): orbits were solved per vertex on the GPU through a custom uniform matrix, and the
 * fragment shader cut round dots with `discard` plus `smoothstep(0.25, 0.10, d²)` — reversed edges, which GLSL leaves
 * UNDEFINED. On Chrome / ANGLE / Direct3D 11 the belt then drew only from some camera angles (nothing from above the
 * ecliptic), and from the default overview its minimum-1-px, constant-alpha points saturated into a solid disc around
 * the Sun that also covered Mars's orbit (a few eccentric, highly inclined objects beyond the main belt were included).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '../store/store'
import { nav } from '../store/nav'
import { SUN_POS, LY_PER_AU, toThree, sub, len, eclipticToGalactic } from '../astro/coords'
import { jdTdbFromUtcMs } from '../astro/time'
import { isMainBelt, prepareOrbits, positionsAU, hash01, type AsteroidRow, type BeltOrbits } from './asteroidBelt'

interface AsteroidPayload {
  epochJdTdb: number
  rows: AsteroidRow[]
}

/** ecliptic J2000 axes → three.js scene axes (pure rotation; the same transform the planets use) */
function eclipticToSceneQuaternion(): THREE.Quaternion {
  const x = toThree(eclipticToGalactic([1, 0, 0])), y = toThree(eclipticToGalactic([0, 1, 0])), z = toThree(eclipticToGalactic([0, 0, 1]))
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...x), new THREE.Vector3(...y), new THREE.Vector3(...z))
  return new THREE.Quaternion().setFromRotationMatrix(m)
}

/** re-propagate the orbits when the simulation clock has moved this far (days); positions change ~0.25°/day */
const REPROPAGATE_DAYS = 0.5
/** visible within this distance of the Sun (ly, ~2,200 AU) — the same range as the planetary orbit lines */
const VISIBLE_LY = 0.035

export function AsteroidBeltLayer() {
  const groupRef = useRef<THREE.Group>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const showOrbits = useStore((s) => s.showOrbits)
  const [data, setData] = useState<AsteroidPayload | null>(null)
  const lastJd = useRef<number | null>(null)

  useEffect(() => {
    let active = true
    fetch('/assets/astronomy/data/main_belt_sbdb_h13.5.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`)
        return res.json()
      })
      .then((json: AsteroidPayload) => {
        if (active) setData(json)
      })
      .catch((err) => {
        console.warn('[AsteroidBeltLayer] Could not load main belt asteroid dataset:', err)
      })
    return () => {
      active = false
    }
  }, [])

  const quat = useMemo(eclipticToSceneQuaternion, [])
  // ONE uniforms object for the material's lifetime: an inline object literal is replaced on every React re-render,
  // and the per-frame writes below would then go to an object the GPU no longer reads
  const uniforms = useMemo(() => ({ uAuPerUnit: { value: 1 }, uAlpha: { value: 1 } }), [])

  const built = useMemo(() => {
    if (!data || !data.rows.length) return null
    const rows = data.rows.filter(isMainBelt)
    const orbits: BeltOrbits = prepareOrbits(rows, data.epochJdTdb)
    const N = rows.length
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(N * 3)
    const colors = new Float32Array(N * 3)
    const sizes = new Float32Array(N)
    for (let k = 0; k < N; k++) {
      const [num, a, , , , , , H] = rows[k]
      // composition trend across the belt: stony S-types dominate inside ~2.5 AU, dark carbonaceous C-types outside
      // ~2.8 AU; plus a per-asteroid variation in tone and brightness so it reads as many separate bodies
      const t = THREE.MathUtils.clamp((a - 2.4) / 0.6, 0, 1)
      const tone = 0.82 + 0.36 * hash01(num) // ±18 % brightness
      const warm = (hash01(num * 7 + 3) - 0.5) * 0.08 // slight hue shift
      colors[k * 3] = THREE.MathUtils.lerp(0.78, 0.5, t) * tone + warm
      colors[k * 3 + 1] = THREE.MathUtils.lerp(0.7, 0.48, t) * tone
      colors[k * 3 + 2] = THREE.MathUtils.lerp(0.6, 0.47, t) * tone - warm
      // brighter (lower absolute magnitude H) = larger body = slightly larger dot; H 3–13.5 in this sample
      sizes[k] = THREE.MathUtils.clamp(0.75 + (13.5 - H) * 0.16, 0.75, 2.4)
    }
    const posAttr = new THREE.BufferAttribute(pos, 3)
    posAttr.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute('position', posAttr)
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    // the group is placed every frame; the bounding sphere (AU) only has to contain the belt
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 5)
    return { geo, orbits, pos }
  }, [data])

  useFrame(() => {
    const g = groupRef.current
    if (!g || !matRef.current || !built) return

    const rel = sub(SUN_POS, nav.pos)
    const dSun = len(rel)
    g.visible = showOrbits && dSun < VISIBLE_LY
    if (!g.visible) return

    // propagate the real orbits to the simulation date (only when it has moved: playing time, date picker, replays)
    const jd = jdTdbFromUtcMs(useStore.getState().simMs)
    if (lastJd.current === null || Math.abs(jd - lastJd.current) > REPROPAGATE_DAYS) {
      positionsAU(built.orbits, jd, built.pos)
      ;(built.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true
      lastJd.current = jd
    }

    // same placement as the planets' orbit lines: camera-relative Sun position / S, true-scale contents
    const S = nav.scale
    const t3 = toThree(rel)
    g.position.set(t3[0] / S, t3[1] / S, t3[2] / S)
    g.quaternion.copy(quat)
    g.scale.setScalar(LY_PER_AU / S) // 1 AU of the geometry = LY_PER_AU light-years

    // AU per scene unit, so the shader can size and fade dots by their TRUE distance from the camera
    uniforms.uAuPerUnit.value = S / LY_PER_AU
    // fade in as the Solar System is approached; soften when the camera is right at a planet
    const approach = THREE.MathUtils.clamp((VISIBLE_LY - dSun) / 0.015, 0, 1)
    const atPlanet = nav.nearestSurface < 1e-4 ? THREE.MathUtils.clamp(nav.nearestSurface / 1e-4, 0.25, 1) : 1
    uniforms.uAlpha.value = approach * atPlanet
  })

  if (!built) return null

  return (
    <group ref={groupRef} name="asteroid-belt-frame">
      <points geometry={built.geo} frustumCulled={false} raycast={() => null} name="asteroid-belt" renderOrder={-1}>
        <shaderMaterial
          ref={matRef}
          transparent
          depthWrite={false}
          uniforms={uniforms}
          vertexShader={`
            #include <common>
            #include <logdepthbuf_pars_vertex>
            attribute vec3 aColor;
            attribute float aSize;
            uniform float uAuPerUnit;
            varying vec3 vColor;
            varying float vCover;
            varying float vPx;
            void main() {
              vec4 mv = modelViewMatrix * vec4(position, 1.0);
              gl_Position = projectionMatrix * mv;
              // apparent size from the true camera distance: ~2 px at 6 AU, sub-pixel beyond ~20 AU
              float dAu = max(length(mv.xyz) * uAuPerUnit, 0.05);
              float px = aSize * clamp(6.0 / dAu, 0.12, 2.2);
              gl_PointSize = max(px, 1.0);
              vPx = gl_PointSize;
              // a dot smaller than a pixel is drawn as one pixel with its coverage as opacity, with a floor so the far
              // belt still reads as a fine grain (and not as a saturated disc: 10,000 full-opacity pixels)
              // (the floor drops from 0.22 within ~15 AU to 0.06 beyond ~45 AU, where the whole belt is a few dozen pixels wide)
              vCover = clamp(px * px, mix(0.22, 0.06, smoothstep(15.0, 45.0, dAu)), 1.0);
              vColor = aColor;
              #include <logdepthbuf_vertex>
            }
          `}
          fragmentShader={`
            #include <common>
            #include <logdepthbuf_pars_fragment>
            uniform float uAlpha;
            varying vec3 vColor;
            varying float vCover;
            varying float vPx;
            void main() {
              #include <logdepthbuf_fragment>
              // round, soft dots only where a dot spans several pixels: for 1-px points gl_PointCoord is not reliably the
              // pixel centre on every GPU path (on ANGLE / D3D11 it is not), so a mask there would erase them
              vec2 c = gl_PointCoord - vec2(0.5);
              float disc = vPx < 1.75 ? 1.0 : 1.0 - smoothstep(0.12, 0.25, dot(c, c)); // edge0 < edge1, no discard
              gl_FragColor = vec4(vColor, uAlpha * vCover * disc * 0.85);
            }
          `}
        />
      </points>
    </group>
  )
}
