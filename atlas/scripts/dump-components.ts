// Dev helper: every catalogue component with its sourced description (for writing the plain visitor lines).
// Run: npx vite-node scripts/dump-components.ts
import { OBJECTS } from '../src/missions'
for (const o of OBJECTS) for (const c of o.components) console.log(`${o.id}/${c.id} | ${c.fullName ?? c.name} | ${c.description} | M: ${c.measures?.text ?? ''}`)
