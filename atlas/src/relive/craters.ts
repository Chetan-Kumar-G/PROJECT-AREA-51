/**
 * Illustrative relief shared by the scene and the flight models (pure functions, no three.js): small deterministic
 * crater fields, and the patch around Eagle crater where Opportunity landed (~20 m across, PDS; depth illustrative).
 */
export /** craters: deterministic small bowls (illustrative regolith relief) */
function craterField(seed: number, count: number, span: number, rMin: number, rMax: number, keepClear: number) {
  let s = seed
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const cs: { x: number; z: number; r: number }[] = []
  for (let i = 0; i < count; i++) {
    const cr = rMin + Math.pow(r(), 2.4) * (rMax - rMin)
    const x = (r() - 0.5) * span, z = (r() - 0.5) * span
    if (Math.hypot(x, z) < keepClear + cr) continue
    cs.push({ x, z, r: cr })
  }
  return (x: number, z: number) => {
    let h = 0
    for (const c of cs) {
      const d = Math.hypot(x - c.x, z - c.z) / c.r
      if (d < 1) h -= c.r * 0.18 * (1 - d * d)
      else if (d < 1.35) h += c.r * 0.05 * (1 - (d - 1) / 0.35)
    }
    return h + Math.sin(x * 0.013) * Math.cos(z * 0.011) * 1.4
  }
}

/** Eagle crater and its surroundings, in metres about the landing point (x east, z south) */
export const marsHeight = (() => {
  const f = craterField(23, 260, 5000, 1, 40, 30)
  return (x: number, z: number) => {
    const r = Math.hypot(x, z)
    const eagle = r < 10 ? -2 * (1 - (r * r) / 100) : r < 13 ? 0.4 * (1 - (r - 10) / 3) : 0 // Eagle ~20 m across (PDS); depth illustrative
    return f(x, z) * 0.35 + eagle
  }
})()
