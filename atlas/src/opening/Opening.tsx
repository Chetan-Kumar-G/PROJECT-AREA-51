import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useOpening, bootOpening, skipOpening, setOpeningReduceMotion, openingActive } from './openingState'
import { labelState } from '../scene/labelState'
import './opening.css'

interface Caption { eyebrow: string; title: string; text: string }

/** captions follow the camera; every statement is a published value, and the galaxy is labelled as a model */
function captionFor(stage: string, p: number): Caption {
  if (stage === 'galaxy')
    return {
      eyebrow: 'THE MILKY WAY · ILLUSTRATIVE MODEL',
      title: 'Our galaxy',
      text: 'A barred spiral of 100 to 400 billion stars, about 100,000 light-years across. This is a procedural model built from its published structure, not a photograph: no image of our galaxy from outside exists.',
    }
  if (stage === 'fade' || p < 0.42)
    return {
      eyebrow: 'THE ORION SPUR',
      title: 'One star among billions',
      text: 'The Sun lies about 26,700 light-years from the Galactic Centre, in a minor spiral arm between the Sagittarius and Perseus arms.',
    }
  if (p < 0.8)
    return {
      eyebrow: 'ENTERING THE SOLAR SYSTEM',
      title: 'Light-years become hours',
      text: 'The nearest star is 4.2 light-years away. Neptune orbits about 4 light-hours from the Sun.',
    }
  return {
    eyebrow: 'OUR SOLAR SYSTEM',
    title: 'The Sun and eight planets',
    text: 'And on two of its worlds, the machines we sent to explore them.',
  }
}

/** marks the Sun's position over the galaxy while it is too small to see */
function SunMarker() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let raf = 0
    const v = new THREE.Vector3()
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const el = ref.current
      const cam = labelState.camera
      const sun = labelState.items.find((i) => i.id === 'sun')
      if (!el || !cam || !sun) return
      v.copy(sun.pos).project(cam)
      const onScreen = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1
      el.style.display = onScreen ? 'block' : 'none'
      el.style.transform = `translate(${((v.x + 1) / 2) * window.innerWidth}px, ${((1 - v.y) / 2) * window.innerHeight}px)`
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div ref={ref} className="opening-sun" aria-hidden>
      <span className="ring" />
      <span className="tag">You are here · the Sun (approximate)</span>
    </div>
  )
}

/** App-level controller + overlay of the opening cinematic */
export function Opening() {
  const { stage, progress, reduceMotion } = useOpening()

  // boot once the orbital renderer has drawn its first frame (it owns the camera's initial pose)
  useEffect(() => {
    if (useOpening.getState().stage !== 'idle') return
    const t = setInterval(() => {
      if (!labelState.camera) return
      clearInterval(t)
      bootOpening()
    }, 100)
    return () => clearInterval(t)
  }, [])

  // Esc skips (capture: before any other handler)
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && openingActive()) {
        e.preventDefault()
        e.stopPropagation()
        skipOpening()
      }
    }
    window.addEventListener('keydown', k, true)
    return () => window.removeEventListener('keydown', k, true)
  }, [])

  if (stage !== 'galaxy' && stage !== 'flight' && stage !== 'fade') return null
  const c = captionFor(stage, progress)
  return (
    <div className="opening" data-stage={stage} data-testid="opening">
      {(stage === 'galaxy' || (stage === 'flight' && progress < 0.35)) && <SunMarker />}
      <div className={'opening-fade' + (stage === 'fade' ? ' on' : '')} />
      <div className="opening-brand">
        <span className="opening-kicker">ABANDONED BUT NOT FORGOTTEN</span>
        <span className="opening-tag">Every machine has a story. Every mission left a legacy.</span>
      </div>
      <div className="opening-caption" key={c.title} aria-live="polite">
        <span className="eyebrow">{c.eyebrow}</span>
        <h2>{c.title}</h2>
        <p>{c.text}</p>
      </div>
      <div className="opening-controls">
        <label className="opening-motion">
          <input type="checkbox" checked={reduceMotion} onChange={(e) => setOpeningReduceMotion(e.target.checked)} />
          Reduce motion
        </label>
        <button className="btn" onClick={skipOpening} data-testid="opening-skip">
          Skip intro <kbd>Esc</kbd>
        </button>
      </div>
      {stage === 'flight' && (
        <div className="opening-progress" aria-hidden>
          <i style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
    </div>
  )
}
