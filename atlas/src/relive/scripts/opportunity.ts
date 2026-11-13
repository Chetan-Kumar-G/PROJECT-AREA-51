/**
 * Opportunity (MER-B) — launch, cruise, approach, entry, descent and landing, and the drive off the lander.
 *
 * Sources: the PDS MER mission description (phase-by-phase, with the published times), the archived JPL MER mission
 * pages (launch vehicle, spacecraft, EDL hardware), and the app's catalogue (launch 03:18:15 UTC; landing site).
 * Many EDL steps are published IN ORDER but WITHOUT times; those are 'sequence' events placed between their sourced
 * neighbours, and the UI marks them "≈". The few derived times say how they were computed.
 */
import type { MissionEvent, MissionScript, Phase, Segment, ShotCue, TelemetryTrack } from '../types'

const PDS = 'pds-mer-mission'
const LV = 'jpl-mer-launch-vehicle'
const SC = 'jpl-mer-spacecraft'
const EDL = 'jpl-mer-edl'
const CAT = 'nasa-opportunity'
const RECON = 'desai-knocke-2004'
const WET = 'nasa-pr-2004-074'

const EPOCH = Date.UTC(2003, 6, 8, 3, 18, 15) // 7 July 2003 20:18:15 PDT (catalogue, NASA); PDS gives 03:18 UTC
const at = (ms: number) => (ms - EPOCH) / 1000
/**
 * First impact: 04:55 UTC 25 January 2004, to the minute (PDS; NASA's mission page gives 04:54). PDS does not name
 * the time standard; at the 198.7 million km Earth–Mars range it gives, the signal took about 11 minutes to reach Earth.
 */
export const MER_LANDING = at(Date.UTC(2004, 0, 25, 4, 55, 0))
/** EDL times reconstructed from Opportunity's accelerometer and gyro data, s after entry (Desai & Knocke 2004, preliminary) */
export const MER_EDL_RECON = { chute: 250.3, heatshield: 270.3, landerDescent: 280.3, rad: 336.3 }
/** steps the reconstruction does not give: pre-entry predicted intervals from the same paper (6-DOF means) */
const RAD_TO_CUT = 347.9 - 343.7
const RAD_TO_IMPACT = 348.6 - 343.7
const AIRBAGS_BEFORE_RAD = 0.5
/** the entry interface, placed back from first impact by the reconstructed RAD time + the predicted RAD-to-impact time */
export const MER_ENTRY = MER_LANDING - (MER_EDL_RECON.rad + RAD_TO_IMPACT)
const E = (dt: number) => MER_ENTRY + dt
const CHUTE = E(MER_EDL_RECON.chute)
const RAD = E(MER_EDL_RECON.rad)
const REST = MER_LANDING + 120
const EGRESS = at(Date.UTC(2004, 0, 31, 11, 1, 0))
const APPROACH = at(Date.UTC(2003, 11, 10, 0, 0, 0))
/** after egress the replay follows the rover on measured terrain through the surface years (relive/oppSurface.ts) */
export const MER_OVERVIEW_T0 = EGRESS + 600
/** a published date: day (placed at 00:00 UTC) or month (placed on the 1st); shown no more precisely */
const D = (y: number, m: number, d?: number) => at(Date.UTC(y, m - 1, d ?? 1))
const LAST_CONTACT = D(2018, 6, 10)
const MISSION_END = D(2019, 2, 13)
/** the absolute time of every EDL step inherits the first-impact anchor's minute precision */
const ANCHOR_PM = 30

const SEQ = (note: string): Partial<MissionEvent> => ({ basis: 'sequence', record: 'sequence', timeNote: note })
const DER = (note: string, precision: MissionEvent['precision'] = 'minute'): Partial<MissionEvent> => ({ basis: 'derived', record: 'derived', precision, timeNote: note })
const RCN = (note: string): Partial<MissionEvent> => ({
  basis: 'derived', record: 'flight-reconstruction', precision: 'second', uncertaintyS: ANCHOR_PM, confidence: 'medium',
  timeNote: `${note} Reconstructed from the vehicle's own accelerometer and gyro data (Desai & Knocke 2004, preliminary); the interval from entry is known to 0.1 s, the absolute time only as well as the 04:55 UTC first-impact anchor (to the minute).`,
})
const PLN = (note: string): Partial<MissionEvent> => ({ basis: 'derived', record: 'planned', precision: 'second', uncertaintyS: ANCHOR_PM, confidence: 'low', timeNote: note })

const ev = (id: string, t: number, title: string, text: string, kind: MissionEvent['kind'], sources: string[], extra: Partial<MissionEvent> = {}): MissionEvent => ({
  id, t, basis: 'sourced', title, text, kind, sources, ...extra,
})

const EVENTS: MissionEvent[] = [
  ev('liftoff', 0, 'Liftoff', 'A Delta II 7925H ("Heavy") lifts off from Space Launch Complex 17B, Cape Canaveral, on the RS-27A main engine and six of its nine strap-on solid motors. Launch azimuth 99°.', 'liftoff', [CAT, PDS, LV], { cue: 'ignition', published: '7 July 2003, 20:18:15 PDT (8 July, 03:18:15 UTC)', precision: 'second', standard: 'UTC', record: 'mission-record' }),
  ev('gem-burnout', 58, 'First six solid motors burn out', 'The six ground-lit graphite-epoxy motors (GEMs) burn out.', 'cutoff', [LV], SEQ('Not timed in the sources read; it comes just before the air-lit motors ignite.')),
  ev('gem-airlit', 60, 'Three air-lit solid motors ignite', 'The remaining three GEMs, with extended nozzles, ignite once the vehicle is lighter.', 'ignition', [LV], { ...DER('JPL: lit "a minute into flight".'), cue: 'ignition' }),
  ev('meco', 265, 'Stage I cutoff', 'The first-stage RS-27A engine shuts down.', 'cutoff', [LV], SEQ('Not timed in the sources read; the boost to orbit takes about 9 minutes (PDS).')),
  ev('stage2-ign', 278, 'Stage II ignition', 'The restartable AJ10-118K second stage fires for the first time.', 'ignition', [LV], { ...SEQ('Not timed in the sources read.'), cue: 'staging' }),
  ev('fairing', 290, 'Payload fairing jettisoned', 'The 2.9 m fairing is jettisoned shortly after Stage II ignition, at about 130 km.', 'jettison', [LV], { ...SEQ('JPL: "shortly after the ignition of Stage II", ~130 km.'), cue: 'pyro' }),
  ev('seco1', 540, 'Parking orbit', 'Stage II shuts itself off in low Earth orbit; a long coast of about an hour follows.', 'orbit', [PDS, LV], DER('PDS: the boost "took approximately 9 minutes".')),
  ev('stage2-restart', 540 + 3600, 'Stage II restart', 'At the right point in the orbit, the second stage fires again for the final alignment and velocity.', 'ignition', [PDS, LV], { ...DER('PDS: coast "of approximately 60 minutes" after the ~9-minute boost.'), cue: 'ignition' }),
  ev('spin', 4230, 'Spin-up', 'A spin table spins the third stage and spacecraft up like a top for stability.', 'burn', [LV], SEQ('Not timed in the sources read.')),
  ev('stage3-ign', 4260, 'Stage III ignition', 'The Star-48B solid motor burns for about 90 seconds — most of the velocity needed to leave Earth.', 'ignition', [LV], { ...SEQ('Not timed in the sources read; the burn lasts ~90 s (JPL).'), cue: 'ignition', durationS: 90 }),
  ev('stage3-out', 4350, 'Stage III burnout', 'On a Type I trajectory to Mars.', 'cutoff', [LV, PDS], SEQ('Ignition + ~90 s (JPL); the ignition time itself is not published.')),
  ev('despin', 4420, 'Yo-yo despin', 'Yo-yo weights unwind to slow the spin from 70 rpm to about 12 rpm.', 'burn', [LV, PDS], { ...SEQ('Not timed in the sources read.'), cue: 'pyro' }),
  ev('sep', 83 * 60, 'Spacecraft separation', 'The spacecraft separates from the third stage, about 83 minutes after launch.', 'separation', [PDS, LV], { ...DER('PDS: "approximately 83 minutes after launch".'), cue: 'pyro' }),
  ev('cruise', 83 * 60 + 600, 'Cruise', 'The cruise phase begins: checkout, calibration and navigation. Up to six trajectory correction maneuvers were planned; no science during cruise.', 'coast', [PDS, SC], SEQ('PDS: the cruise phase "began soon after separation".')),
  ev('approach', APPROACH, 'Approach phase', 'Forty-five days before entry: final navigation and trajectory correction maneuvers.', 'coast', [PDS], { ...DER('PDS mission-phase start date (date only).', 'day'), published: '2003-12-10' }),
  ev('entry-turn', MER_ENTRY - 70 * 60, 'Turn to entry attitude', 'The spacecraft turns to its entry attitude, 70 minutes before entry.', 'burn', [PDS], { ...DER('Entry − 70 min (PDS); entry itself is placed from the first-impact anchor (see Atmospheric entry).'), uncertaintyS: ANCHOR_PM }),
  ev('cruise-sep', MER_ENTRY - 15 * 60, 'Cruise stage separation', 'The cruise stage, with its solar arrays, is jettisoned 15 minutes before entry.', 'separation', [PDS, SC, RECON], { ...DER('Entry − 15 min (PDS; Desai & Knocke 2004).'), uncertaintyS: ANCHOR_PM, cue: 'pyro' }),
  ev('entry', MER_ENTRY, 'Atmospheric entry', 'The entry vehicle reaches the entry interface, 3522.2 km from the centre of Mars, at 5.4 km/s — heat shield first.', 'entry', [PDS, EDL, RECON], {
    ...DER(`Placed back from the 04:55 UTC first impact (PDS, to the minute) by ${(MER_EDL_RECON.rad + RAD_TO_IMPACT).toFixed(1)} s: the reconstructed RAD firing at entry + ${MER_EDL_RECON.rad} s plus the predicted ${RAD_TO_IMPACT.toFixed(1)} s from RAD to first impact (Desai & Knocke 2004). PDS: EDL "started six minutes prior to landing".`, 'second'),
    uncertaintyS: ANCHOR_PM,
  }),
  ev('chute', CHUTE, 'Parachute deploys', 'The parachute opens 250.3 s after entry, 7.52 km above the surface at 434 m/s (764 N/m²) — later and lower than predicted, because the atmosphere was about 12 % less dense than modelled.', 'parachute', [RECON, SC, PDS], { ...RCN('Entry + 250.3 s.'), cue: 'chute' }),
  ev('heatshield', E(MER_EDL_RECON.heatshield), 'Heat shield released', 'Six separation nuts and push-off springs release the heat shield, 20 s after the parachute opens.', 'jettison', [RECON, PDS, SC], { ...RCN('Entry + 270.3 s.'), cue: 'pyro' }),
  ev('lander-sep', E(MER_EDL_RECON.landerDescent), 'Lander separation', 'The lander leaves the backshell and rappels down a metal tape to the end of a ~20 m braided Zylon bridle.', 'separation', [RECON, PDS, SC], { ...RCN('Entry + 280.3 s (lander descent initiation).'), cue: 'pyro' }),
  ev('radar', E(310), 'Radar acquires the ground', 'The radar altimeter on a lower corner of the lander acquires the ground about 2.4 km above it.', 'comms', [PDS, SC, RECON], { ...SEQ('Order from PDS; altitude 2.4 km (Desai & Knocke 2004); the time is not published.'), cue: 'beep' }),
  ev('dimes', E(318), 'DIMES descent images', 'The Descent Image Motion Estimation System takes three images of the ground.', 'comms', [PDS], SEQ('Order from PDS; not timed in the sources read.')),
  ev('airbags', RAD - AIRBAGS_BEFORE_RAD, 'Airbags inflate', 'Gas generators inflate four airbags of six lobes each around the lander, about half a second before the retro-rockets fire.', 'deploy', [RECON, PDS, SC], { ...PLN('Design interval: "approximately 0.5 s prior to RAD firing" (Desai & Knocke 2004), from the reconstructed RAD time.'), cue: 'airbag' }),
  ev('rad', RAD, 'RAD and TIRS rockets fire', 'The three RAD rockets on the backshell fire 336.3 s after entry and 86 s after the parachute opened, 127.1 m above the ground at 71.1 m/s; three sideways TIRS rockets help hold the backshell vertical.', 'burn', [RECON, PDS, SC], { ...RCN('Entry + 336.3 s (86 s after parachute deploy).'), cue: 'retro' }),
  ev('bridle-cut', RAD + RAD_TO_CUT, 'Bridle cut', 'The bridle is cut 8.5 m above the surface; the lander falls free in its airbags.', 'separation', [PDS, RECON], { ...PLN(`Height from PDS (8.5 m); the time is not reconstructed: the predicted ${RAD_TO_CUT.toFixed(1)} s after RAD (Desai & Knocke 2004).`), cue: 'pyro' }),
  ev('impact', MER_LANDING, 'First impact', 'First impact at 04:55 UTC, 25 January 2004 — 13:23 local solar time at Meridiani Planum.', 'landing', [PDS, CAT], {
    cue: 'bounce', published: '04:55 UTC', precision: 'minute', standard: 'UTC', record: 'mission-record',
    timeNote: 'PDS gives 04:55 UTC (to the minute); NASA\'s mission page gives 04:54 UTC. PDS does not name the time standard; the signal took about 11 minutes to reach Earth (Earth–Mars range 198.7 million km, PDS).',
  }),
  ev('rest', REST, 'At rest in Eagle crater', 'After 26 bounces the lander rolls into a small crater, about 20 m across, later named Eagle — about 14.9 km from its target point. It comes to rest on its +Y side petal.', 'landing', [PDS, CAT, RECON], SEQ('PDS gives the 26 bounces but not how long they took.')),
  ev('retract', REST + 1800, 'Airbags retracted', 'The airbags are deflated and pulled in toward the lander, out of the rover\'s path.', 'deploy', [SC, EDL], { ...SEQ('JPL: about 3 hours were allotted to retract the airbags and open the petals.'), cue: 'retract' }),
  ev('petals', REST + 3 * 3600, 'Petals open', 'Petal motors right the lander and open it flat; the base petal ends tilted 5°. The rover unfolds its solar arrays — EDL complete.', 'deploy', [PDS, SC, EDL], { ...SEQ('JPL: within the ~3 hours allotted after landing.'), cue: 'petals' }),
  ev('egress', EGRESS, 'Egress — six wheels on Mars', 'On sol 7, Opportunity drives off the lander onto Martian soil; engineers received the confirmation at 11:01 UTC, 31 January 2004.', 'surface', [PDS], {
    cue: 'egress', published: '03:01 PST, 31 January 2004 (11:01 UTC)', precision: 'minute', standard: 'UTC-ERT', record: 'mission-record',
    timeNote: 'PDS: the time the confirmation was RECEIVED on Earth; the drive itself happened minutes earlier (one-way light time).',
  }),

  // ── surface operations, discoveries and the end (NASA mission page 'In Depth'; NASA news release 2004-074)
  ev('water', D(2004, 3, 2), 'Evidence that Meridiani was once wet', 'NASA announces that the rocks of the El Capitan outcrop at Eagle crater were "soaking wet in the past": sulfate salts measured by the alpha particle X-ray spectrometer, the hydrated iron sulfate jarosite found by the Moessbauer spectrometer, and textures — vugs, spherules and crossbedding.', 'discovery', [WET], {
    published: 'NASA news release 2004-074, 2 March 2004', precision: 'day', standard: 'UTC', record: 'mission-record', location: 'El Capitan outcrop, Eagle crater', vehicle: 'Opportunity: APXS, Moessbauer spectrometer, Pancam, Microscopic Imager',
    timeNote: 'The date of NASA\'s announcement; the outcrop had been surveyed over the preceding three weeks (same release).',
  }),
  ev('eagle-exit', D(2004, 3, 22), 'Out of Eagle crater', 'Opportunity climbs out of Eagle crater and heads for Endurance crater, about 750 m away.', 'surface', [CAT], { published: '22 March 2004', precision: 'day', record: 'mission-record' }),
  ev('endurance', D(2004, 7, 26), 'Into Endurance crater — sol 180', 'Moving into Endurance crater on sol 180, double the 90-sol primary mission.', 'surface', [CAT], { published: 'sol 180 (26 July 2004)', precision: 'day', record: 'mission-record', location: 'Endurance crater, Meridiani Planum' }),
  ev('heat-shield-rock', D(2005, 1), 'Heat Shield Rock: a meteorite', 'Near its own discarded heat shield, Opportunity finds a basketball-sized rock that turns out to be an iron-nickel meteorite.', 'discovery', [CAT], { published: 'January 2005', precision: 'month', record: 'mission-record', location: 'Beside the discarded heat shield, Meridiani Planum' }),
  ev('freed', D(2005, 6), 'Free from the sand', 'After six weeks stuck with its wheels buried in sand, controllers free the rover a few centimetres at a time.', 'surface', [CAT], { published: 'June 2005', precision: 'month', record: 'mission-record', location: 'Purgatory Dune, about 2 km south of Endurance crater' }),
  ev('victoria-arrival', D(2006, 9), 'Victoria crater', 'After a 21-month trip Opportunity reaches the rim of Victoria crater, about 800 m across, and drives onto Cape Verde.', 'surface', [CAT], { published: 'September 2006', precision: 'month', record: 'mission-record', location: 'Victoria crater rim (Cape Verde)' }),
  ev('dust-2007', D(2007, 7, 18), 'Dust storms', 'Severe dust storms: by 18 July the solar panels give only 128 watt-hours and all science is suspended for about six weeks.', 'comms', [CAT], { published: '18 July 2007', precision: 'day', record: 'mission-record', location: 'Victoria crater rim' }),
  ev('victoria-entry', D(2007, 9, 11), 'Into Victoria crater', 'Opportunity drives into Victoria crater and stays inside for almost a year.', 'surface', [CAT], { published: '11 September 2007', precision: 'day', record: 'mission-record', location: 'Inside Victoria crater' }),
  ev('viking-record', D(2010, 5, 20), 'Longest working life on Mars', 'Opportunity passes Viking 1\'s record for the longest continuous operation on the surface of Mars: 6 years and 116 days.', 'surface', [CAT], { published: '20 May 2010', precision: 'day', record: 'mission-record', location: 'On the way to Endeavour crater' }),
  ev('endeavour', D(2011, 8, 9), 'Endeavour crater', 'After nearly three years and about 21 km, Opportunity arrives at Endeavour crater, about 22 km across.', 'surface', [CAT], { published: '9 August 2011', precision: 'day', record: 'mission-record', location: 'Endeavour crater rim' }),
  ev('lrv-record', D(2013, 5, 16), 'Farther than any NASA vehicle', 'NASA announces that Opportunity has passed the farthest distance driven by a NASA vehicle on another world: 35.744 km, set by the Apollo 17 Lunar Roving Vehicle.', 'surface', [CAT], { published: '16 May 2013 (announcement)', precision: 'day', record: 'mission-record', location: 'Endeavour crater rim' }),
  ev('solander', D(2013, 8), 'Solander Point', 'At Solander Point: the contact between a rock layer formed in acidic, wet conditions and an older one from a more neutral environment.', 'discovery', [CAT], { published: 'August 2013', precision: 'month', record: 'mission-record', location: 'Solander Point, Endeavour crater rim' }),
  ev('marathon', D(2015, 3, 25), 'A marathon on Mars', 'NASA announces that Opportunity has driven 42.195 km — the first human enterprise to exceed marathon distance on another world.', 'surface', [CAT], { published: '25 March 2015 (announcement)', precision: 'day', record: 'mission-record', location: 'Endeavour crater rim' }),
  ev('steepest', D(2016, 3, 10), 'Steepest slope', 'Approaching a target near the crest of Knudsen crater, Opportunity drives at a 32° tilt — the steepest slope driven by any rover on Mars.', 'surface', [CAT], { published: '10 March 2016', precision: 'day', record: 'mission-record', location: 'Knudsen crater, Endeavour crater rim' }),
  ev('perseverance-valley', D(2017, 5), 'Perseverance Valley', 'Opportunity reaches a gully named Perseverance Valley, which scientists were confident was carved by fluid.', 'surface', [CAT], { published: 'first week of May 2017', precision: 'month', record: 'mission-record', location: 'Perseverance Valley, Endeavour crater rim' }),
  ev('last-contact', LAST_CONTACT, 'Last signal', 'A planet-wide dust storm cuts the power to the solar panels; the last signal from Opportunity is heard on 10 June 2018.', 'comms', [CAT], { published: '10 June 2018', precision: 'day', record: 'mission-record', location: 'Perseverance Valley, Endeavour crater rim', cue: 'beep' }),
  ev('end', MISSION_END, 'NASA declares the mission complete', 'Designed for 90 sols and 1,000 m, Opportunity exceeded its planned lifetime 60 times; its odometer read 45.16 km.', 'end', [CAT], { published: '13 February 2019', precision: 'day', record: 'mission-record', location: 'Perseverance Valley, Endeavour crater rim', vehicle: 'Opportunity rover (silent)' }),
]

const START = -10
const END = MISSION_END + 6 * 3600

const WHERE: Record<string, [string, string]> = {
  count: ['Space Launch Complex 17B, Cape Canaveral Air Force Station, Florida', 'Delta II 7925H with the MER-B spacecraft'],
  boost: ['Ascent over the Atlantic, launch azimuth 99°', 'Delta II 7925H: RS-27A first stage and nine strap-on solid motors'],
  parking: ['Low Earth parking orbit', 'Delta II second stage with the spacecraft'],
  departure: ['Earth departure', 'Delta II second stage, Star-48B third stage, then MER-B'],
  cruise: ['Interplanetary space, Type I trajectory', 'MER-B: cruise stage with the aeroshell'],
  approach: ['Mars approach', 'MER-B: cruise stage with the aeroshell'],
  entry: ['Mars atmosphere over Meridiani Planum', 'Entry vehicle: heat shield, backshell, lander'],
  descent: ['Over Meridiani Planum', 'Backshell, parachute, bridle and airbag lander'],
  bounces: ['Meridiani Planum, into Eagle crater', 'Airbag-protected lander'],
  unfold: ['Eagle crater, Meridiani Planum', 'Lander and the Opportunity rover'],
  egress: ['Eagle crater, Meridiani Planum', 'Opportunity rover'],
  'surface-years': ['Meridiani Planum: Eagle, Endurance, Victoria and Endeavour craters', 'Opportunity rover'],
  conclusion: ['Perseverance Valley, Endeavour crater rim', 'Opportunity rover'],
}
const P = (id: string, t0: number, t1: number, env: Phase['env'], title: string, summary: string): Phase => ({ id, t0, t1, env, title, summary, location: WHERE[id]?.[0], vehicle: WHERE[id]?.[1] })
const PHASES: Phase[] = [
  P('count', START, 0, 'pad', 'Launch', 'Space Launch Complex 17B, Cape Canaveral · 7 July 2003, 23:18 EDT'),
  P('boost', 0, 540, 'pad', 'Boost', 'Delta II 7925H: RS-27A and nine strap-on solid motors'),
  P('parking', 540, 4140, 'earth-near', 'Parking orbit', 'About an hour of coast in low Earth orbit'),
  P('departure', 4140, 83 * 60 + 600, 'earth-near', 'Departure for Mars', 'Stage II restart, spin-up, Star-48B, despin, separation'),
  P('cruise', 83 * 60 + 600, APPROACH, 'interplanetary', 'Cruise', '156 days on a Type I trajectory'),
  P('approach', APPROACH, MER_ENTRY - 15 * 60, 'interplanetary', 'Approach', 'The last 45 days before entry'),
  P('entry', MER_ENTRY - 15 * 60, CHUTE, 'mars-near', 'Entry', 'Into the atmosphere at 5.4 km/s'),
  P('descent', CHUTE, MER_LANDING, 'mars-descent', 'Descent', 'Parachute, bridle, airbags, retro-rockets'),
  P('bounces', MER_LANDING, REST, 'mars-descent', 'Bouncing to a stop', '26 bounces across Meridiani Planum'),
  P('unfold', REST, EGRESS - 120, 'mars-surface', 'Eagle crater', 'Airbags in, petals open, solar arrays out'),
  P('egress', EGRESS - 120, MER_OVERVIEW_T0, 'mars-surface', 'Egress', 'Sol 7: onto Martian soil'),
  P('surface-years', MER_OVERVIEW_T0, LAST_CONTACT, 'mars-surface', 'Fourteen years on Meridiani Planum', 'Eagle, Endurance, Victoria and Endeavour craters: the rover at its data-derived position for each dated milestone'),
  P('conclusion', LAST_CONTACT, END, 'mars-surface', 'Silence and the end of the mission', 'The 2018 dust storm in Perseverance Valley; NASA declares the mission complete'),
]

const S = (t0: number, t1: number, play: number): Segment => ({ t0, t1, play })
/** the surface years: about 7 s of playback from one dated milestone to the next (an establishing view, then the rover) */
const SURFACE_STOPS = [MER_OVERVIEW_T0, ...EVENTS.filter((e) => e.t > MER_OVERVIEW_T0).map((e) => e.t), END]
const SURFACE_PACING: Segment[] = SURFACE_STOPS.slice(1).map((t1, i) => S(SURFACE_STOPS[i], t1, i === 0 ? 4 : 7))
const SEGMENTS: Segment[] = [
  S(START, 0, 10), S(0, 70, 26), S(70, 300, 22), S(300, 560, 16), S(560, 4100, 14), S(4100, 4400, 18), S(4400, 6000, 14),
  S(6000, APPROACH, 22), S(APPROACH, MER_ENTRY - 75 * 60, 12), S(MER_ENTRY - 75 * 60, MER_ENTRY - 14 * 60, 14), S(MER_ENTRY - 14 * 60, MER_ENTRY, 12),
  S(MER_ENTRY, CHUTE - 5, 26), S(CHUTE - 5, MER_LANDING - 14, 34), S(MER_LANDING - 14, MER_LANDING + 3, 22), S(MER_LANDING + 3, REST, 26),
  S(REST, REST + 3 * 3600 + 600, 20), S(REST + 3 * 3600 + 600, EGRESS - 120, 10), S(EGRESS - 120, MER_OVERVIEW_T0, 18),
  ...SURFACE_PACING,
]

const TELEMETRY: TelemetryTrack[] = [
  { name: 'distance', unit: 'km', frame: 'from the centre of Mars at the entry interface (PDS)', sources: [PDS], samples: [{ t: MER_ENTRY, v: 3522.2 }], interp: false },
  { name: 'speed', unit: 'm/s', frame: 'entry 5.4 km/s (PDS); parachute 434 m/s and RAD 71.1 m/s wind-relative, reconstructed from flight data (Desai & Knocke 2004); not interpolated', sources: [PDS, RECON], samples: [{ t: MER_ENTRY, v: 5400 }, { t: CHUTE, v: 434 }, { t: RAD, v: 71.1 }], interp: false },
  { name: 'altitude', unit: 'm', frame: 'above the ground: parachute 7.52 km and RAD 127.1 m reconstructed (Desai & Knocke 2004), bridle cut 8.5 m (PDS); not interpolated', sources: [RECON, PDS], samples: [{ t: CHUTE, v: 7520 }, { t: RAD, v: 127.1 }, { t: RAD + RAD_TO_CUT, v: 8.5 }], interp: false },
]

const C = (t: number, kind: ShotCue['shot']['kind'], dist: number, elev = 0, azim = 0, fov = 45, label?: string): ShotCue => ({ t, shot: { kind, dist, elev, azim, fov }, label })
/**
 * The surface years, one storyboard entry per dated milestone: an establishing view sized to its setting (the crater
 * or terrain the event is about, with the rover in it), then the rover itself up close. Distances in metres.
 */
const STORYBOARD: Record<string, { set: [ShotCue['shot']['kind'], number, number, number]; close: [ShotCue['shot']['kind'], number, number, number]; label: string }> = {
  water: { set: ['top', 45, 55, 20], close: ['side', 5, 12, 60], label: 'Eagle crater outcrop' },
  'eagle-exit': { set: ['top', 70, 50, 200], close: ['chase', 9, 16, 200], label: 'Out of Eagle crater' },
  endurance: { set: ['top', 260, 50, 30], close: ['chase', 10, 18, 160], label: 'Endurance crater' },
  'heat-shield-rock': { set: ['top', 60, 45, 90], close: ['side', 6, 10, 70], label: 'Heat Shield Rock' },
  freed: { set: ['top', 40, 40, 140], close: ['low', 7, 6, 120], label: 'Purgatory dune' },
  'victoria-arrival': { set: ['top', 1150, 58, 20], close: ['chase', 12, 16, 200], label: 'Victoria crater' },
  'dust-2007': { set: ['top', 300, 40, 300], close: ['orbit', 14, 12, 0], label: 'Dust storm' },
  'victoria-entry': { set: ['top', 650, 52, 60], close: ['chase', 11, 20, 180], label: 'Into Victoria crater' },
  'viking-record': { set: ['top', 250, 45, 130], close: ['chase', 14, 14, 200], label: 'Toward Endeavour' },
  endeavour: { set: ['top', 3500, 30, 260], close: ['chase', 14, 16, 200], label: 'Endeavour crater' },
  'lrv-record': { set: ['top', 500, 35, 240], close: ['side', 10, 10, 90], label: 'Endeavour rim' },
  solander: { set: ['top', 450, 40, 250], close: ['chase', 12, 14, 200], label: 'Endeavour rim' },
  marathon: { set: ['top', 500, 35, 230], close: ['side', 10, 10, 110], label: 'A marathon on Mars' },
  steepest: { set: ['top', 400, 30, 260], close: ['side', 8, 4, 90], label: 'Knudsen crater slope' },
  'perseverance-valley': { set: ['top', 380, 40, 250], close: ['chase', 12, 18, 200], label: 'Perseverance Valley' },
  'last-contact': { set: ['top', 300, 35, 240], close: ['orbit', 16, 14, 0], label: 'Silence' },
  end: { set: ['top', 420, 38, 250], close: ['orbit', 16, 18, 0], label: 'Mission complete' },
}
function SURFACE_SHOTS(): ShotCue[] {
  const out: ShotCue[] = [C(MER_OVERVIEW_T0, 'chase', 9, 16, 200, 45, 'Leaving the lander')]
  const ev = EVENTS.filter((e) => e.t >= MER_OVERVIEW_T0).sort((a, b) => a.t - b.t)
  ev.forEach((e, i) => {
    const sb = STORYBOARD[e.id]
    if (!sb) return
    const next = ev[i + 1]?.t ?? END
    const [k1, d1, el1, az1] = sb.set, [k2, d2, el2, az2] = sb.close
    out.push(C(e.t, k1, d1, el1, az1, 45, sb.label))
    out.push(C(e.t + (next - e.t) * 0.3, k2, d2, el2, az2, 45))
  })
  return out
}
const SHOTS: ShotCue[] = [
  C(START, 'ground', 420, 5, 200, 30, 'SLC-17B'),
  C(-3, 'low', 70, 4, 210, 44),
  C(8, 'ground', 700, 8, 210, 28),
  C(45, 'chase', 160, -10, 20, 42),
  C(250, 'side', 90, 4, 80, 45, 'Staging'),
  // the 2.9 m fairing halves separating: close enough to see them split (was framed from 90 m: a few pixels)
  C(282, 'side', 24, 6, 70, 45, 'Fairing'),
  C(320, 'side', 60, 4, 80, 45),
  // the parking orbit begins over the night side (night launch): seen from the Sun's side so Earth is visible
  { ...C(560, 'wide', 2.6, 18, 0, 40, 'Parking orbit'), shot: { kind: 'wide', dist: 2.6, elev: 18, azim: 0, fov: 40, lit: true } },
  C(4120, 'chase', 40, 8, 200, 45, 'Departure'),
  C(4410, 'side', 25, 10, 100, 42),
  // the cruise: the spacecraft itself first (cruise stage, solar arrays toward the Sun), then the whole trajectory between
  // the planets (direction and distance), then the spacecraft again before the approach
  C(5600, 'chase', 14, 10, 160, 45, 'Cruise stage'),
  C(5600 + 14 * 86400, 'wide', 1, 25, 0, 40, 'Earth to Mars'),
  C(APPROACH - 25 * 86400, 'chase', 16, 12, 150, 45, 'Approaching Mars'),
  // the approach: the spacecraft itself (an AU-scale wide shot here showed only the Sun and Earth)
  C(APPROACH, 'chase', 16, 12, 150, 45, 'Approach'),
  C(MER_ENTRY - 16 * 60, 'side', 14, 6, 90, 42, 'Cruise stage separation'),
  C(MER_ENTRY - 4 * 60, 'chase', 30, 14, 200, 45, 'Entry'),
  C(CHUTE - 2, 'side', 60, 4, 90, 45, 'Parachute'),
  // lander on its bridle under the backshell: a side view (a ground view from 7 km below showed a dot)
  C(CHUTE + 28, 'side', 48, -12, 150, 50),
  C(MER_LANDING - 14, 'side', 70, 6, 100, 50, 'Airbags and retro-rockets'),
  C(MER_LANDING + 2, 'ground', 90, 8, 200, 45, 'Bouncing'),
  C(REST - 40, 'low', 16, 12, 230, 45, 'Eagle crater'),
  C(REST + 600, 'orbit', 9, 24, 40, 45),
  C(EGRESS - 120, 'low', 7, 10, 160, 45, 'Egress'),
  ...SURFACE_SHOTS(),
]

export const OPPORTUNITY: MissionScript = {
  id: 'mer-opportunity',
  missionId: 'mer-opportunity',
  title: 'Opportunity (MER-B)',
  subtitle: 'Launch to Perseverance Valley · 7 July 2003 – 13 February 2019',
  epochMs: EPOCH,
  epochNote: 'Mission time 0 = liftoff, 03:18:15 UTC 8 July 2003 (7 July, 20:18:15 PDT; NASA). PDS gives 03:18 UTC.',
  vehicle: 'delta-ii-7925h',
  clock: 'days',
  phases: PHASES,
  events: EVENTS,
  segments: SEGMENTS,
  telemetry: TELEMETRY,
  shots: SHOTS,
  illustrative: [
    'Delta II proportions are illustrative except the 2.9 m payload fairing and the 1168 mm (46 in) strap-on motors (JPL); the jettison of the spent strap-on motors is not described in the sources read, so they are faded out rather than shown separating.',
    'The ascent altitude profile and the parking-orbit altitude are illustrative; only the ~130 km fairing-jettison altitude, the 99° azimuth and the phase durations are published in the sources read.',
    'The Earth–Mars path is an illustrative Type I arc (less than half an orbit, as PDS describes); Earth and Mars are at their computed positions on the launch and landing dates.',
    'Cruise stage (2.65 m × 1.6 m with the aeroshell), aeroshell colours, parachute, bridle (~20 m), airbags (four bags of six lobes) and lander petals follow the JPL descriptions; their exact shapes are simplified.',
    'The entry track over Meridiani Planum, the bounce trajectory (only the count, 26, is published) and the terrain around Eagle crater (about 20 m across) are illustrative.',
    'Descent heights between the reconstructed points (parachute 7.52 km, RAD 127.1 m) and the bridle cut (8.5 m) are interpolated; the radar and DIMES steps are placed in their published order only.',
    'Times marked ≈ are published in order but not timed; they are placed between their sourced neighbours.',
    'The rover is the NASA 3D Resources model in its deployed configuration; its folded cruise configuration is not modelled.',
    'After egress the rover is shown on MEASURED terrain (USGS HiRISE / CTX DTMs and MGS MOLA, the Victoria package) at a data-derived position for each dated milestone: Eagle crater (traverse origin), Endurance crater (the traverse box of sols 94-319), Victoria crater (the recorded drives, sols 951-1686), Endeavour crater (rim measured in the CTX / MOLA data) and Perseverance Valley (the last traverse point, sol 5081). Between milestones the route is ILLUSTRATIVE (straight lines); the Purgatory dune spot, the Endeavour arrival spot and the spots inside Eagle and Endurance are ILLUSTRATIVE. The rover model is not articulated: arm work is shown by stopping at the target, not by moving the arm. Its lighting is illustrative: a date-only milestone has no time of day.',
    'Sound is synthesised sound design, not archival audio.',
  ],
  jumps: [
    { label: 'Launch', event: 'liftoff' }, { label: 'Earth orbit', event: 'seco1' }, { label: 'Departure', event: 'sep' }, { label: 'Mars arrival', event: 'entry' },
    { label: 'Landing', event: 'impact' }, { label: 'Egress', event: 'egress' }, { label: 'Discovery: water', event: 'water' }, { label: 'Victoria crater', event: 'victoria-arrival' },
    { label: 'Endeavour crater', event: 'endeavour' }, { label: 'Conclusion', event: 'end' },
  ],
  conclusion: {
    title: 'Opportunity: mission complete',
    text: 'Designed to last 90 sols and to drive 1,000 m, Opportunity worked on Mars for more than 14 years — over 60 times its planned lifetime. Its last signal was heard on 10 June 2018, during a planet-wide dust storm, in Perseverance Valley on the rim of Endeavour crater. When NASA declared the mission complete on 13 February 2019, its odometer read 45.16 km.',
    sources: [CAT],
  },
}
