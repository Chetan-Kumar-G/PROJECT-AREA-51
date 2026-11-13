// Dev helper: which catalogue objects have a child-friendly story, and its first line; plus every object/component.
// Run: npx vite-node scripts/dump-stories.ts
import { STORIES } from '../src/missions/stories'
import { OBJECTS } from '../src/missions'

for (const o of OBJECTS) {
  const s = STORIES[o.id]
  console.log(`${o.id} | ${o.name} | ${s ? 'STORY: ' + s.concise[0].text.slice(0, 140) : 'no story'} | parts: ${o.components.map((c) => c.id).join(',')}`)
}
