import { useState } from 'react'
import { PerformanceMonitor } from '@react-three/drei'
import type { Quality } from '../store/store'

/**
 * Render resolution that follows the frame rate. It starts at the quality setting's resolution and, when the
 * scene cannot hold a smooth frame rate on this device, steps the resolution down (and back up when there is room).
 * Put `monitor` inside the <Canvas> and pass `dpr` to it.
 */
export function useAdaptiveDpr(quality: Quality) {
  const cap = quality === 'performance' ? 1 : quality === 'balanced' ? 1.5 : 2
  const [factor, setFactor] = useState(1)
  const base = Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, cap)
  const dpr = Math.max(0.6, Math.round(base * factor * 100) / 100)
  const monitor = (
    <PerformanceMonitor
      flipflops={4}
      onDecline={() => setFactor((f) => Math.max(0.5, f - 0.2))}
      onIncline={() => setFactor((f) => Math.min(1, f + 0.1))}
      onFallback={() => setFactor((f) => Math.max(0.5, f - 0.1))}
    />
  )
  return { dpr, monitor }
}
