/**
 * On-screen touch controls (surface/TouchControls.tsx TouchStick / TouchButtons) write here; the Moon scene and the
 * Unity Mars bridge add it to the keyboard axes. A tiny module of its own so the Mars bridge does not import the Moon
 * scene to read it. forward / right in -1..1.
 */
export const virtualInput = { forward: 0, right: 0, run: false, jump: false }
