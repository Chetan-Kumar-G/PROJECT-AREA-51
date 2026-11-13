/**
 * OPENING CINEMATIC — from a Milky Way overview into the Solar System.
 *
 * It drives the EXISTING orbital renderer (scene/Scene.tsx) and flight engine (travel/travelEngine.ts): the camera is
 * placed above the procedural Milky Way model, holds there while "you are here" marks the Sun, then the travel engine
 * flies it to the Sun on its logarithmic distance curve (nine orders of magnitude in ~16 s) and stops where all eight
 * planetary orbits are in view. No second renderer, no extra loading, and the Unity player is never touched.
 *
 * The Milky Way is introductory context only: it is an ILLUSTRATIVE procedural model (bulge, disk, four logarithmic
 * arms), not a photograph or a measured map, and it is not a navigable destination — after the opening, free flight is
 * confined to the Solar System (store/nav.ts SOLAR_BOUNDARY_LY).
 *
 * First visit: plays automatically. Returning visitors start in the Solar System (the choice is kept in localStorage)
 * and can replay it from the homepage or the More menu. Reduce motion replaces the flight with a fade.
 */
import { create } from 'zustand'
import { useStore } from '../store/store'
import { nav, interrupt, setCameraAt, SOLAR_BOUNDARY_LY } from '../store/nav'
import { initiateTravel, cancelTravel, subscribeTravelEngine, travelEngineState, travelSettings } from '../travel/travelEngine'
import { SUN_POS, fromThree, add } from '../astro/coords'

export type OpeningStage = 'idle' | 'galaxy' | 'flight' | 'fade' | 'done'

interface OpeningUI {
  stage: OpeningStage
  /** flight progress 0..1 (captions follow it) */
  progress: number
  reduceMotion: boolean
  set: (p: Partial<OpeningUI>) => void
}

const SEEN_KEY = 'abnf.opening.seen'
const MOTION_KEY = 'abnf.opening.reduceMotion'

function readFlag(key: string): boolean | null {
  try {
    const v = window.localStorage.getItem(key)
    return v === null ? null : v === '1'
  } catch {
    return null
  }
}
function writeFlag(key: string, v: boolean) {
  try {
    window.localStorage.setItem(key, v ? '1' : '0')
  } catch {
    /* private mode: the preference just isn't kept */
  }
}

export const useOpening = create<OpeningUI>((set) => ({
  stage: 'idle',
  progress: 0,
  reduceMotion: (typeof window !== 'undefined' && readFlag(MOTION_KEY)) ?? travelSettings.reduceMotion,
  set: (p) => set(p),
}))

/** Camera framing at the end of the opening: ~50 AU from the Sun, above the ecliptic, every planetary orbit in view. */
export const SOLAR_OVERVIEW_LY = 0.0008
/** Milky Way overview: ~85,000 ly from the Galactic Centre, high above the disk. */
const GALAXY_DIST_LY = 85000
const GALAXY_HOLD_MS = 4200
const FLIGHT_SEC = 16

let holdTimer: ReturnType<typeof setTimeout> | null = null
let unsub: (() => void) | null = null
const clearTimers = () => {
  if (holdTimer) clearTimeout(holdTimer)
  holdTimer = null
  unsub?.()
  unsub = null
}

/** the cinematic owns the camera (galaxy hold, flight or fade) */
export const openingActive = () => {
  const s = useOpening.getState().stage
  return s === 'galaxy' || s === 'flight' || s === 'fade'
}

export const hasSeenOpening = () => readFlag(SEEN_KEY) === true

export function setOpeningReduceMotion(v: boolean) {
  writeFlag(MOTION_KEY, v)
  useOpening.getState().set({ reduceMotion: v })
}

/** place the camera at the Solar System overview, immediately */
function placeInSolarSystem() {
  initiateTravel('sun', useStore.getState().simMs, { instant: true, viewDistanceLy: SOLAR_OVERVIEW_LY })
}

/** Begin the cinematic from the Milky Way overview. */
export function startOpening() {
  clearTimers()
  interrupt()
  cancelTravel()
  const st = useStore.getState()
  if (st.phase !== 'intro') st.setPhase('intro')
  st.set({ selectedId: null, rightOpen: false, leftOpen: false, showOrbits: true })
  nav.followId = null
  nav.lastFollowPos = null
  // above the disk, looking down at the Galactic Centre with the Sun's side of the disk toward the viewer
  const up: [number, number, number] = [-0.18, 0.86, 0.47]
  const k = GALAXY_DIST_LY / Math.hypot(...up)
  setCameraAt(add([0, 0, 0], fromThree([up[0] * k, up[1] * k, up[2] * k])), [SUN_POS[0] * 0.45, 0, 0])
  useOpening.getState().set({ stage: 'galaxy', progress: 0 })
  holdTimer = setTimeout(() => (useOpening.getState().reduceMotion ? fadeToSolarSystem() : flyToSolarSystem()), GALAXY_HOLD_MS)
}

function flyToSolarSystem() {
  holdTimer = null
  useOpening.getState().set({ stage: 'flight', progress: 0 })
  initiateTravel('sun', useStore.getState().simMs, { viewDistanceLy: SOLAR_OVERVIEW_LY, durationSec: FLIGHT_SEC, onArrive: () => finishOpening() })
  unsub = subscribeTravelEngine(() => {
    if (useOpening.getState().stage !== 'flight') return
    // any input interrupts a flight: the opening then completes at once instead of leaving the camera in the galaxy
    if (travelEngineState.phase === 'cancelled' || travelEngineState.phase === 'idle') return skipOpening()
    useOpening.getState().set({ progress: travelEngineState.progress })
  })
}

function fadeToSolarSystem() {
  useOpening.getState().set({ stage: 'fade' })
  holdTimer = setTimeout(() => {
    placeInSolarSystem()
    holdTimer = setTimeout(() => finishOpening(), 700)
  }, 700)
}

/** End the opening now (Skip intro, Esc, or any interaction that needs the Solar System). Safe to call any time. */
export function skipOpening() {
  if (!openingActive()) return
  clearTimers()
  cancelTravel()
  placeInSolarSystem()
  finishOpening()
}

/** mark the opening complete; the homepage and the normal controls take over */
export function finishOpening() {
  const wasActive = openingActive()
  clearTimers()
  if (wasActive && nav.flight) cancelTravel()
  if (wasActive && Math.hypot(nav.pos[0] - SUN_POS[0], nav.pos[1] - SUN_POS[1], nav.pos[2] - SUN_POS[2]) > SOLAR_BOUNDARY_LY) placeInSolarSystem()
  writeFlag(SEEN_KEY, true)
  useOpening.getState().set({ stage: 'done', progress: 1 })
}

/** App start: first visit plays the opening; returning visitors start in the Solar System. */
export function bootOpening() {
  if (hasSeenOpening()) {
    placeInSolarSystem()
    useOpening.getState().set({ stage: 'done', progress: 1 })
  } else startOpening()
}

if (typeof window !== 'undefined')
  (window as unknown as { __opening?: unknown }).__opening = { state: () => useOpening.getState(), start: startOpening, skip: skipOpening }
