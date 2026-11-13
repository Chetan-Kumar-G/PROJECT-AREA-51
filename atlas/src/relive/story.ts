/**
 * VISITOR STORY LAYER — what an event card says by default.
 *
 * Every mission event keeps its full sourced record (scripts/*.ts, records.ts): exact title, technical text, time
 * precision, confidence, sources. This file only adds the PRESENTATION a child or general visitor sees first:
 * a short title, one or two plain sentences, and (optionally) the technical name so the real term is still learned.
 *
 * Rules followed when writing these (and for any future mission):
 *  - no fact appears here that is not in the event's own sourced text (scripts/*.ts) or the mission's catalogue record;
 *    this is a re-wording, not a source
 *  - simple words first; the technical term, when it matters, goes in `term`
 *  - numbers only when they help the story, and only the published ones
 *  - the scene itself is the main storyteller: the text explains what you are watching
 *
 * Events without an entry fall back to a plain version of their own title and first sentence (storyFor), so a new
 * script never shows an empty card.
 */
import type { MissionEvent, MissionScript } from './types'

export interface StoryLine {
  title: string
  text: string
  /** the technical name, shown small under the text ("This step is called …") */
  term?: string
  /** why it mattered (students: what happened → the text; how → the text and the 3-D view; why → this line) */
  why?: string
}

type Book = Record<string, StoryLine>

const APOLLO_11: Book = {
  'sic-start-cmd': { title: 'Engines, start!', text: 'The command goes out to start the five giant engines at the bottom of the Saturn V rocket.', term: 'S-IC engine start command' },
  'sic-ignition': { title: 'The first engine lights', text: 'The middle engine starts first, then the other four follow.', term: 'S-IC ignition' },
  'sic-thrust-ok': { title: 'All five engines are running', text: 'Huge arms still hold the rocket down on the pad while the engines build up full power.' },
  'range-zero': { title: 'Zero on the clock', text: 'This is the official start of the mission clock: 16 July 1969, 9:32 in the morning in Florida.', term: 'Range zero' },
  holddown: { title: 'The arms let go', text: 'The arms holding the rocket swing free. The rocket starts to move.' },
  liftoff: { title: 'Liftoff!', text: 'Apollo 11 rises from Launch Complex 39A at the Kennedy Space Center.' },
  yaw: { title: 'Steering away from the tower', text: 'The rocket leans slightly so it safely clears the launch tower.', term: 'Tower clearance yaw maneuver' },
  roll: { title: 'Turning onto course', text: 'The rocket rolls and tilts to point along its path into space.', term: 'Pitch and roll program' },
  mach1: { title: 'Faster than sound', text: 'The rocket passes the speed of sound, about 4 nautical miles up.', term: 'Mach 1' },
  maxq: { title: 'The bumpiest moment', text: 'The air pushes hardest on the rocket here. After this, the air gets thinner and the ride gets smoother.', term: 'Maximum dynamic pressure (Max Q)' },
  'sic-ceco': { title: 'The middle engine switches off', text: 'One engine stops early so the astronauts are not pushed too hard as the rocket gets lighter.', term: 'Centre engine cutoff' },
  'sic-oeco': { title: 'The first stage is finished', text: 'The other four engines stop. Their fuel is used up.', term: 'Outboard engine cutoff' },
  'sic-sep': { title: 'The first stage drops away', text: 'The empty bottom part of the rocket separates and falls back toward the ocean.', term: 'Stage separation' },
  'sii-ign': { title: 'The second stage lights', text: 'Five new engines start, pushing the rest of the rocket higher.', term: 'S-II ignition' },
  'sii-interstage': { title: 'A ring falls away', text: 'The ring that joined the two stages is no longer needed and drops off.', term: 'Interstage jettison' },
  'les-jett': { title: 'The rescue tower flies off', text: 'The small rocket tower on top could have pulled the crew to safety. It is not needed any more, so it flies away.', term: 'Launch escape tower jettison' },
  'sii-ceco': { title: 'Another engine switches off', text: 'The middle engine of the second stage stops first.' },
  'sic-impact': { title: 'The first stage reaches the ocean', text: 'The used first stage falls into the Atlantic Ocean, far from the launch site.' },
  'sii-oeco': { title: 'The second stage is finished', text: 'Its engines stop, about 100 nautical miles above Earth.' },
  'sii-sep': { title: 'The second stage drops away', text: 'Now only the third stage and the spacecraft keep going.', term: 'Stage separation' },
  'sivb-ign1': { title: 'The third stage lights', text: 'A single engine pushes the spacecraft the last part of the way into orbit.', term: 'S-IVB first burn' },
  'sivb-cut1': { title: 'Right on target', text: 'The engine stops. The rocket is almost exactly where it was planned to be.' },
  eoi: { title: 'In orbit around Earth', text: 'Apollo 11 is now circling Earth, about 100 nautical miles up.', term: 'Earth orbit insertion' },
  'sii-impact': { title: 'The second stage reaches the ocean', text: 'The used second stage falls into the Atlantic, far out at sea.' },
  'tli-ign': { title: 'Off to the Moon!', text: 'The third-stage engine starts again to push Apollo 11 out of Earth orbit.', term: 'Translunar injection' },
  'tli-cut': { title: 'Engine off, Moon ahead', text: 'After almost six minutes the engine stops. Apollo 11 is fast enough to reach the Moon.' },
  tli: { title: 'Leaving Earth behind', text: 'The spacecraft is now coasting toward the Moon.' },
  'csm-sep': { title: 'The spacecraft separates', text: 'The command ship, Columbia, moves away from the rocket stage. Panels open to show the lunar module inside.', term: 'CSM separation' },
  docking: { title: 'Turning around and connecting', text: 'Columbia turns around and links nose-to-nose with the lunar module, Eagle.', term: 'Transposition and docking' },
  ejection: { title: 'Pulling Eagle out', text: 'Columbia pulls Eagle free of the rocket stage. The two travel together from now on.' },
  evasive: { title: 'Moving to a safe distance', text: 'A short engine burn moves the spacecraft away from the empty rocket stage.' },
  slingshot: { title: 'The old stage goes its own way', text: 'The empty stage fires its small thrusters to fly past the Moon, away from the astronauts.' },
  mcc1: { title: 'A small course correction', text: 'A three-second engine burn keeps Apollo 11 on track. It was the only correction needed on the way out.', term: 'Midcourse correction' },
  'lm-inspect': { title: 'A first look inside Eagle', text: 'Armstrong and Aldrin float into the lunar module to check it.' },
  equigravisphere: { title: 'The Moon starts to pull harder', text: 'From here on, the Moon’s gravity pulls on the spacecraft more strongly than Earth’s.' },
  'loi-ign': { title: 'Braking at the Moon', text: 'The main engine fires for about six minutes to slow down, so the Moon can capture the spacecraft.', term: 'Lunar orbit insertion' },
  'loi-cut': { title: 'In orbit around the Moon', text: 'Apollo 11 is now circling the Moon.' },
  'loc-ign': { title: 'A rounder orbit', text: 'A short burn makes the orbit more circular and lower.', term: 'Orbit circularization' },
  'lm-final-prep': { title: 'Getting ready to land', text: 'Armstrong and Aldrin climb into Eagle to prepare for the landing.' },
  undock: { title: 'Eagle and Columbia part ways', text: 'Eagle separates. Michael Collins stays behind in Columbia, orbiting the Moon.', term: 'Undocking' },
  doi: { title: 'Heading down', text: 'Eagle’s engine fires for about 30 seconds to lower its path toward the landing site.', term: 'Descent orbit insertion' },
  alt50k: { title: 'Fifteen kilometres up', text: 'Eagle is about 50,000 feet above the Moon, ready to start the final descent.' },
  pdi: { title: 'The landing begins', text: 'Eagle’s engine starts for the last 12 minutes of the trip down.', term: 'Powered descent' },
  a1202: { title: 'An alarm!', text: 'The guidance computer flashes a warning code: 1202. It is the first of several alarms during the landing.', term: '1202 program alarm' },
  alt30k: { title: 'The radar sees the ground', text: 'Eagle’s landing radar starts measuring its speed over the surface.' },
  approach: { title: 'The landing site comes into view', text: 'Eagle begins the final approach to its landing site.', term: 'Approach phase' },
  lpd: { title: 'Picking a new spot', text: 'The landing spot is changed during the final approach.', term: 'Landing point redesignation' },
  lowfuel: { title: 'Fuel is running low', text: 'A warning light shows the descent fuel is getting low.' },
  dust: { title: 'Dust starts to fly', text: 'The engine begins blowing lunar dust across the surface below.' },
  landing: { title: '“The Eagle has landed.”', text: 'Eagle touches down on the Sea of Tranquility. People are on the Moon for the first time.' },
  pdc: { title: 'Engine off', text: 'The descent engine shuts down. Eagle is resting on the surface.' },
  'eva-start': { title: 'The hatch opens', text: 'The first moonwalk is about to begin.', term: 'Start of EVA (spacewalk)' },
  'first-step': { title: 'One small step', text: 'Neil Armstrong steps onto the Moon: “That’s one small step for a man … one giant leap for mankind.”' },
  'lmp-surface': { title: 'Buzz Aldrin joins him', text: 'Aldrin climbs down the ladder and steps onto the Moon too.' },
  flag: { title: 'Planting the flag', text: 'The astronauts set up the United States flag.' },
  pse: { title: 'A Moon-quake detector', text: 'They set up a seismometer to feel tiny shakes and quakes inside the Moon.', term: 'Passive seismic experiment' },
  lrrr: { title: 'A mirror for lasers', text: 'They place a special mirror. Scientists on Earth bounce lasers off it to measure the distance to the Moon. It needs no power at all.', term: 'Laser Ranging Retro-Reflector' },
  'pse-data': { title: 'The first Moon data reach Earth', text: 'The seismometer starts sending its readings home.' },
  'eva-end': { title: 'Back inside', text: 'After about two and a half hours outside, both astronauts climb back into Eagle.' },
  'jettison-eq': { title: 'Leaving things behind', text: 'Equipment they no longer need is thrown out onto the surface. It is still there today.' },
  'lm-liftoff': { title: 'Leaving the Moon', text: 'The top part of Eagle blasts off. The bottom part stays on the Moon as a launch pad, and you can still visit it here.', term: 'Lunar ascent' },
  'lm-insertion': { title: 'Back in lunar orbit', text: 'Eagle’s ascent stage reaches orbit to meet Columbia.' },
  csi: { title: 'Chasing Columbia', text: 'Eagle begins the careful moves to catch up with Columbia.', term: 'Rendezvous' },
  tpi: { title: 'The final approach', text: 'Eagle fires its engine toward Columbia.' },
  redocking: { title: 'Together again', text: 'Eagle and Columbia link up again above the Moon.', term: 'Docking' },
  'ascent-jett': { title: 'Goodbye, Eagle', text: 'The crew is back in Columbia. Eagle’s top half is let go and left in orbit around the Moon.' },
  'tei-ign': { title: 'Heading home!', text: 'The main engine fires for about two and a half minutes to leave the Moon.', term: 'Trans-Earth injection' },
  'tei-cut': { title: 'On the way back to Earth', text: 'After 30 trips around the Moon, Apollo 11 is homeward bound.' },
  'mcc-te': { title: 'A tiny correction', text: 'A ten-second burn adjusts the course home. It is the only one needed.' },
  'tv-final': { title: 'A message to everyone', text: 'In a final TV broadcast, each astronaut thanks the people who made the mission possible.' },
  'cmsm-sep': { title: 'The capsule goes on alone', text: 'The service module is let go. Only the small cone-shaped capsule will come home.', term: 'CM/SM separation' },
  entry: { title: 'Hitting the atmosphere', text: 'Columbia slams into the air at about 11 kilometres a second. Its heat shield glows as it protects the crew.', term: 'Atmospheric entry' },
  'visual-contact': { title: 'Spotted!', text: 'Recovery aircraft can see the capsule.' },
  'radar-contact': { title: 'The ship finds it on radar', text: 'The recovery ship tracks the capsule as it comes down.' },
  drogue: { title: 'A small parachute first', text: 'A small parachute steadies the capsule and slows it down.', term: 'Drogue parachute' },
  mains: { title: 'Three big parachutes', text: 'The three main parachutes open for a gentle descent. NASA’s timeline does not list the exact moment.' },
  vhf: { title: '“We can hear you!”', text: 'Radio contact is made with the recovery teams.' },
  splashdown: { title: 'Splashdown!', text: 'Columbia lands in the Pacific Ocean, near the ship USS Hornet. At first it floats upside down.' },
  'apex-up': { title: 'Turned the right way up', text: 'Floating balloons flip the capsule upright.' },
  collar: { title: 'A floating ring', text: 'Swimmers attach an inflatable ring around the capsule to keep it steady.' },
  hatch: { title: 'The hatch opens', text: 'The capsule is opened so the crew can climb out.' },
  'crew-egress': { title: 'Out of Columbia', text: 'Armstrong, Aldrin and Collins leave their spacecraft.' },
  'crew-aboard': { title: 'Safe on the ship', text: 'About an hour after splashdown, the crew is aboard USS Hornet.' },
  mqf: { title: 'Into quarantine', text: 'Nobody knew yet if the Moon had germs, so the crew stays in a sealed trailer on the ship.', term: 'Mobile quarantine facility' },
  'cm-lifted': { title: 'Columbia comes aboard', text: 'The capsule is lifted out of the water onto the ship.' },
  'samples-out': { title: 'The Moon rocks', text: 'The two boxes of Moon samples are taken out of the capsule.' },
  'samples-houston': { title: 'Moon rocks in Houston', text: 'Samples and film arrive in Houston for scientists to study.' },
  'mqf-houston': { title: 'Quarantine travels to Houston', text: 'The sealed trailer, with the crew still inside, arrives in Houston.' },
  lrl: { title: 'Into the laboratory', text: 'The crew moves into a special laboratory to finish their quarantine.', term: 'Lunar Receiving Laboratory' },
  released: { title: 'Mission complete', text: 'The astronauts are released from quarantine. Apollo 11 is officially over.' },
}

const OPPORTUNITY: Book = {
  liftoff: { title: 'Liftoff!', text: 'A Delta II rocket carrying the Opportunity rover leaves Cape Canaveral on its way to Mars.', why: 'Mars and Earth line up for a short trip only every 26 months, so the launch had to happen within a few weeks.' },
  'gem-burnout': { title: 'Booster rockets burn out', text: 'Six small booster rockets strapped to the side have used up their fuel.', term: 'Solid motor burnout' },
  'gem-airlit': { title: 'Three more boosters light', text: 'Three more side boosters start now that the rocket is lighter.', term: 'Air-lit solid motors' },
  meco: { title: 'The first stage is finished', text: 'The main engine stops. Its job is done.', term: 'Main engine cutoff' },
  'stage2-ign': { title: 'The second stage lights', text: 'A smaller engine takes over to push the spacecraft into orbit.' },
  fairing: { title: 'The protective cover separates!', text: 'The rocket has reached space. The nose cover that protected the spacecraft is no longer needed, so it splits away.', term: 'Payload fairing jettison', why: 'Above the thick air the cover is just extra weight, and dropping it lets the rocket go faster.' },
  seco1: { title: 'Coasting around Earth', text: 'The engine stops and the rocket circles Earth for about an hour, waiting for the right moment.', term: 'Parking orbit' },
  'stage2-restart': { title: 'Lining up for Mars', text: 'The second stage fires again to get the direction and speed exactly right.' },
  spin: { title: 'Spinning like a top', text: 'The last stage and the spacecraft are spun up. Spinning keeps them steady, like a spinning top.', term: 'Spin-up' },
  'stage3-ign': { title: 'The big push to Mars', text: 'A solid rocket motor burns for about a minute and a half. It gives the speed needed to leave Earth.', term: 'Third-stage ignition', why: 'Leaving Earth for Mars needs much more speed than staying in orbit around Earth.' },
  'stage3-out': { title: 'On the way to Mars!', text: 'The motor is finished. The spacecraft is now on its path to Mars.' },
  despin: { title: 'Slowing the spin', text: 'Weights on cables unwind, like a figure skater stretching out their arms, to slow the spinning.', term: 'Yo-yo despin' },
  sep: { title: 'The spacecraft flies free', text: 'About 83 minutes after launch, the spacecraft separates from the rocket.', term: 'Spacecraft separation', why: 'From here the spacecraft flies on its own, steering with small thrusters.' },
  cruise: { title: 'A long journey through space', text: 'For months the spacecraft travels to Mars. The team checks it and makes small steering corrections along the way.', term: 'Cruise phase', why: 'Mars is so far away that it takes months to get there, even at high speed.' },
  approach: { title: 'Mars is getting closer', text: 'Forty-five days before arrival, the team makes the final navigation checks.', term: 'Approach phase' },
  'entry-turn': { title: 'Turning to face Mars', text: 'The spacecraft turns so its heat shield will hit the atmosphere first.' },
  'cruise-sep': { title: 'Letting go of the cruise stage', text: 'Fifteen minutes before arrival, the part with the solar panels that powered the trip is let go.', term: 'Cruise stage separation' },
  entry: { title: 'The spacecraft enters the atmosphere', text: 'It hits the thin Martian air at about 5.4 kilometres a second. The heat shield faces forward to take the heat.', term: 'Atmospheric entry', why: 'Air rubbing against the heat shield slows the spacecraft from thousands of kilometres an hour.' },
  chute: { title: 'The parachute opens!', text: 'A big parachute opens to slow the lander down. It opened a little later and lower than planned, because the Martian air was thinner than expected.', term: 'Parachute deployment', why: 'The Martian air is too thin for a parachute alone to land safely, so it is only one of several steps.' },
  heatshield: { title: 'The heat shield drops away', text: 'Its job is done. Springs push the heat shield away from the spacecraft.', term: 'Heat shield separation' },
  'lander-sep': { title: 'The lander lowers on a rope', text: 'The lander slides out of its shell and hangs below it on a strong rope about 20 metres long.', term: 'Lander separation and bridle deploy' },
  radar: { title: 'The radar sees the ground', text: 'A radar on the lander starts measuring the height, about 2.4 kilometres above the surface.' },
  dimes: { title: 'Snapshots on the way down', text: 'A camera takes three pictures of the ground to work out how fast the wind is pushing the lander sideways.', term: 'DIMES descent images' },
  airbags: { title: 'Cushions protect the landing!', text: 'The lander is close to the surface. Big airbags inflate all around it, so it can bounce safely.', term: 'Airbag inflation', why: 'Airbags let a light lander survive hitting rocky ground without needing exact rocket control.' },
  rad: { title: 'Rockets slow the fall', text: 'About 130 metres above the ground, rockets on the shell above fire to slow the falling lander.', term: 'Retro-rockets (RAD and TIRS)', why: 'Without the rockets, the lander would still be falling too fast for the airbags.' },
  'bridle-cut': { title: 'The rope is cut', text: 'Eight and a half metres above the ground, the rope is cut. The lander drops in its airbags.' },
  impact: { title: 'First bounce on Mars!', text: 'The airbags hit the ground on 25 January 2004, in the early afternoon local time at Meridiani Planum.', why: 'Bouncing spreads the impact out, so the rover inside is not damaged.' },
  rest: { title: 'A hole-in-one', text: 'After 26 bounces, the lander rolls into a small crater and stops. The crater was later named Eagle.', why: 'By luck the crater walls showed exposed layers of rock: exactly what the scientists wanted to study.' },
  retract: { title: 'The airbags are pulled in', text: 'The airbags deflate and are pulled in so they will not block the rover.' },
  petals: { title: 'The lander opens like a flower', text: 'Its side panels, called petals, fold open and the rover unfolds its solar panels.', why: 'The petals turn the lander upright and make a ramp so the rover can drive off.' },
  egress: { title: 'The rover begins its journey!', text: 'On its seventh day on Mars, Opportunity rolls off the lander onto the Martian soil, ready to explore.', term: 'Rover egress', why: 'Only once the rover is on the ground can it start driving to the rocks it came to study.' },
  water: { title: 'Mars once had water!', text: 'Opportunity finds salts, minerals and rock shapes at Eagle crater showing these rocks were once soaking wet.', why: 'Water is needed for life as we know it, so finding signs of ancient water told scientists Mars was once very different.' },
  'eagle-exit': { title: 'Out of the first crater', text: 'Opportunity climbs out of Eagle crater and heads for a bigger crater called Endurance.' },
  endurance: { title: 'Twice as long as planned', text: 'Opportunity drives into Endurance crater, already double the time its mission was planned to last.', why: 'Deeper craters show older rock layers, like pages from further back in Mars’s history book.' },
  'heat-shield-rock': { title: 'A rock from space', text: 'Near its own discarded heat shield, Opportunity finds a basketball-sized rock. It is a meteorite made of iron and nickel.', why: 'A rock that fell from space shows that pieces of other worlds land on Mars too, and what they are made of.' },
  freed: { title: 'Stuck in the sand!', text: 'For six weeks the wheels were stuck deep in sand. The team frees the rover a few centimetres at a time.', why: 'Careful driving saved the mission. Rovers after it were planned with soft sand in mind.' },
  'victoria-arrival': { title: 'A giant crater', text: 'After 21 months of driving, Opportunity reaches Victoria crater, about 800 metres wide.', why: 'Victoria’s cliffs expose layers of rock tens of metres thick, a record of a long period of Mars’s past.' },
  'dust-2007': { title: 'Dust storms!', text: 'Huge dust storms block the sunlight, so the solar panels make very little power. Science stops for about six weeks.', why: 'A solar-powered rover needs sunlight. Less light means less power to stay warm and to work.' },
  'victoria-entry': { title: 'Into Victoria crater', text: 'Opportunity drives inside Victoria crater and explores it for almost a year. You can explore it here too.', why: 'Inside the crater the rover could reach rock layers that are hidden everywhere else.' },
  'viking-record': { title: 'A new record', text: 'Opportunity becomes the longest-working machine on the surface of Mars, beating Viking 1.', why: 'It showed how long a well-built robot can keep working on another planet.' },
  endeavour: { title: 'An even bigger crater', text: 'After almost three years and about 21 kilometres, Opportunity reaches Endeavour crater, about 22 kilometres wide.', why: 'The rim of a big crater can show rock that is older than the plains Opportunity had crossed.' },
  'lrv-record': { title: 'Farther than the Moon buggy', text: 'Opportunity has now driven farther than any NASA vehicle on another world, beating the Apollo 17 lunar rover.' },
  solander: { title: 'Two kinds of ancient water', text: 'At Solander Point, two rock layers meet: an older one formed in milder water, and a younger one formed in acidic water.', why: 'Different kinds of water mean Mars’s past changed over time, which matters for whether life could have lived there.' },
  marathon: { title: 'A marathon on Mars!', text: 'Opportunity has driven 42.195 kilometres: the length of a marathon race.', why: 'Nobody had ever driven that far on another world.' },
  steepest: { title: 'The steepest climb', text: 'Opportunity drives on a 32-degree slope, the steepest any rover has driven on Mars.' },
  'perseverance-valley': { title: 'A valley carved by water', text: 'Opportunity reaches Perseverance Valley, which scientists think was carved by flowing liquid.', why: 'A valley carved by liquid is more evidence that water once flowed on Mars.' },
  'last-contact': { title: 'The last message', text: 'A dust storm covers the whole planet and blocks the sunlight its solar panels need. Opportunity’s last signal is heard on 10 June 2018.', why: 'The rover depended on sunlight; without power it could no longer talk to Earth.' },
  end: { title: 'Mission complete', text: 'Built to last 90 Martian days and drive 1 kilometre, Opportunity worked for more than 14 years and drove 45 kilometres. It rests on Mars today.', why: 'Opportunity changed what we know about Mars and showed how long a robot explorer can last.' },
}

/** conceptual expeditions (THEIA and its carrier): the same plain style, always marked as not a real mission */
const EXP_MOON_OUT: Book = {
  leo: { title: 'Circling Earth', text: 'The expedition craft waits in orbit, 300 kilometres up.' },
  burn: { title: 'Off to the Moon', text: 'The departure stage fires to send the craft toward the Moon.' },
  'stage-sep': { title: 'The empty stage drops off', text: 'The used stage is let go.' },
  coast: { title: 'Coasting to the Moon', text: 'This trip takes as long as Apollo 11’s did.' },
  loi: { title: 'Braking into lunar orbit', text: 'The craft slows down so the Moon can capture it.' },
  doi: { title: 'Heading down', text: 'A short burn lowers the path toward the landing site.' },
  pdi: { title: 'Landing', text: 'The engine burns all the way down to Tranquility Base.' },
  hover: { title: 'Touching down beside history', text: 'The craft hovers, then lands next to the Apollo 11 hardware.' },
}
const EXP_MOON_BACK: Book = {
  liftoff: { title: 'Liftoff from the Moon', text: 'Leaving Tranquility Base. The historic hardware stays exactly where it was left.' },
  orbit: { title: 'In lunar orbit', text: 'Circling the Moon, 100 kilometres up.' },
  tei: { title: 'Heading home', text: 'The engine fires to leave the Moon for Earth.' },
  earth: { title: 'Back at Earth', text: 'Safely in orbit around Earth again.' },
}
const EXP_MARS_OUT: Book = {
  leo: { title: 'Circling Earth', text: 'The capsule, with the THEIA rover inside, waits in orbit on its departure stage.' },
  burn: { title: 'Off to Mars', text: 'The departure stage fires to send the capsule toward Mars.' },
  'stage-sep': { title: 'The empty stage drops off', text: 'The used stage is let go.' },
  cruise: { title: 'The long trip to Mars', text: 'This trip takes as long as Opportunity’s did.' },
  entry: { title: 'Into the Martian air', text: 'The capsule enters the atmosphere heat shield first.' },
  chute: { title: 'The parachute opens', text: 'The parachute opens and the heat shield falls away.' },
  powered: { title: 'Engines take over', text: 'The lander drops out and flies down on its rocket engines.' },
  handoff: { title: 'Landing at Victoria crater', text: 'The carrier lands, opens its ramp and THEIA drives out.' },
}
const EXP_MARS_BACK: Book = {
  rise: { title: 'Lifting off', text: 'Engines at full power, with THEIA safe in the cargo bay.' },
  orbit: { title: 'Back above Mars', text: 'In orbit again. Returning to the explorer.' },
}

const EXP_MARS_HOP: Book = {
  'hop-liftoff': { title: 'Lifting off', text: 'THEIA is aboard. The carrier climbs away to fly to another landing site.' },
  'hop-cruise': { title: 'Across Mars', text: 'The carrier follows the shortest path over the planet, high above the surface.' },
  'hop-apex': { title: 'Halfway there', text: 'The highest point of the hop. From here the carrier starts coming down.' },
  'hop-descent': { title: 'Coming in to land', text: 'The engines fire to slow the carrier down over the next site.' },
  'hop-handoff': { title: 'Touchdown next', text: 'The carrier lands on the real measured terrain, and THEIA drives out.' },
}

const BOOKS: Record<string, Book> = { 'apollo-11': APOLLO_11, 'mer-opportunity': OPPORTUNITY }

/** the end-of-mission screen: what happened, and what the machines left behind (from each script's conclusion) */
export const CONCLUSIONS: Record<string, { title: string; text: string; left: string }> = {
  'apollo-11': {
    title: 'Apollo 11 came home',
    text: 'After about eight days, the crew splashed down in the Pacific Ocean and went into quarantine. They were released on 10 August 1969.',
    left: 'On the Moon they left Eagle’s descent stage, a seismometer (it stopped answering on 27 August 1969) and a laser mirror that needs no power.',
  },
  'mer-opportunity': {
    title: 'Opportunity’s long journey',
    text: 'Built for 90 Martian days, Opportunity explored for more than 14 years and drove 45 kilometres. Its last signal came during a planet-wide dust storm in June 2018.',
    left: 'It still sits in Perseverance Valley, on the rim of Endeavour crater.',
  },
}

function bookFor(sc: MissionScript): Book | null {
  if (BOOKS[sc.id]) return BOOKS[sc.id]
  if (sc.kind === 'expedition') {
    if (sc.direction === 'hop') return EXP_MARS_HOP
    const back = sc.direction === 'return'
    return sc.dest === 'moon' ? (back ? EXP_MOON_BACK : EXP_MOON_OUT) : back ? EXP_MARS_BACK : EXP_MARS_OUT
  }
  return null
}

/** first sentence of a text (the fallback stays short) */
const firstSentence = (s: string) => {
  const m = /^(.+?[.!?])(\s|$)/.exec(s)
  return m ? m[1] : s
}

/** the visitor-facing wording of an event; falls back to the event's own title and first sentence */
export function storyFor(sc: MissionScript, e: MissionEvent): StoryLine {
  const s = bookFor(sc)?.[e.id]
  if (s) return s
  return { title: e.title, text: firstSentence(e.text) }
}

/** plain-language explanation of how precisely an event's time is known (shown in "How do we know?") */
export function timeKnownAs(precision: string, basis: MissionEvent['basis']): string {
  if (basis === 'conceptual') return 'This is a conceptual expedition step, not a real mission event.'
  if (basis === 'sequence') return 'NASA did not publish an exact time for this event. We know the order it happened in, so it is placed between the events around it.'
  if (basis === 'derived') return 'This time was worked out from other published times (for example, “so many seconds after entry”).'
  if (precision === 'second' || precision === 'decisecond' || precision === 'centisecond') return 'NASA published this time to the second.'
  if (precision === 'minute') return 'NASA published this time to the minute.'
  if (precision === 'hour') return 'NASA published the hour of this event, but not the exact minute.'
  if (precision === 'day') return 'NASA published the day of this event, but not the time of day.'
  if (precision === 'month') return 'NASA published the month of this event, but not the day.'
  return 'This time comes from the published mission record.'
}

if (import.meta.env?.DEV && typeof window !== 'undefined') (window as unknown as { __story?: unknown }).__story = { storyFor }

/**
 * The compact mission-completion summary (shown in a corner over the final scene, not over it). Every value is a
 * catalogue fact or the script's own sourced event text, with the same source ids.
 */
export const COMPLETION: Record<string, { stats: { k: string; v: string }[]; achievements: string[]; status: string; sources: string[] }> = {
  'mer-opportunity': {
    stats: [
      { k: 'Planned', v: '90 Martian days, about 1 km' },
      { k: 'Worked on Mars', v: 'more than 14 years (landed 25 Jan 2004, last signal 10 Jun 2018)' },
      { k: 'Distance driven', v: '45.16 km' },
    ],
    achievements: [
      'Found evidence in Eagle crater’s rocks that they were once soaked in water',
      'Explored Endurance, Victoria and Endeavour craters',
      'Found an iron-nickel meteorite (Heat Shield Rock)',
      'Drove farther than any NASA vehicle on another world, then past a marathon',
    ],
    status: 'Mission complete: NASA declared the end of the mission on 13 February 2019.',
    sources: ['nasa-opportunity', 'nasa-pr-2004-074'],
  },
}
