// Dev helper: print every event of every Relive script and expedition (id · kind · basis · title · text).
// Used to write the visitor-friendly story layer (src/relive/story.ts). Run: npx vite-node scripts/dump-relive-events.ts
import { RELIVE_SCRIPTS } from '../src/relive/player'
import { moonOutbound, moonReturn, marsOutbound, marsReturn } from '../src/relive/expeditionFlight'
import { targetFor } from '../src/expedition/expedition'

const scripts = Object.values(RELIVE_SCRIPTS)
const moon = targetFor('tranquility-base')!
const mars = targetFor('victoria-crater')!
const now = Date.UTC(2026, 10, 11)
scripts.push(moonOutbound(moon, now), moonReturn(moon, now), marsOutbound(mars, now), marsReturn(mars, now))
for (const s of scripts) {
  console.log(`\n=== ${s.id} (${s.kind ?? 'relive'}) ${s.events.length} events`)
  for (const e of s.events) console.log(`${e.id} @${Math.round(e.t)} | ${e.kind} | ${e.basis} | ${e.title} | ${e.text}`)
}
