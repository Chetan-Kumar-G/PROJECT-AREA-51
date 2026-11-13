import { useRef } from 'react'
import type React from 'react'

/**
 * Pointer gestures on the Unity Mars view, for mouse and touch alike: one pointer dragging orbits the camera, two
 * touch pointers pinching zoom (spread = closer), the wheel zooms as before. Zoom is in wheel notches (Unity scales the
 * camera distance by 10 % per notch), so a pinch to twice the finger spread is ~7 notches closer.
 */
export function useViewGestures(drag: (dx: number, dy: number) => void, zoom: (notches: number) => void) {
  const ptrs = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef(0)
  const spread = () => { const [a, b] = [...ptrs.current.values()]; return Math.hypot(a.x - b.x, a.y - b.y) }
  const end = (e: React.PointerEvent) => {
    ptrs.current.delete(e.pointerId)
    if (ptrs.current.size < 2) pinch.current = 0
  }
  return {
    onPointerDown(e: React.PointerEvent) {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
      if (ptrs.current.size === 2) pinch.current = spread()
    },
    onPointerMove(e: React.PointerEvent) {
      const p = ptrs.current.get(e.pointerId)
      if (!p) return
      const dx = e.clientX - p.x, dy = e.clientY - p.y
      p.x = e.clientX
      p.y = e.clientY
      if (ptrs.current.size === 1) drag(dx, dy)
      else if (ptrs.current.size === 2) {
        const d = spread()
        if (pinch.current > 0 && d > 0) zoom(-Math.log(d / pinch.current) / Math.log(1.1))
        pinch.current = d
      }
    },
    onPointerUp: end,
    onPointerCancel: end,
    onWheel(e: React.WheelEvent) { zoom(Math.sign(e.deltaY)) },
  }
}
