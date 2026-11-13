/**
 * PLAIN LANGUAGE for historical hardware and instruments — what a visitor reads first when they find or inspect
 * something on the Moon or Mars. The full sourced record (missions/catalog/*) is unchanged and stays one click away.
 *
 * Every line is a re-wording of that object's or component's own catalogue text (description / design / findings),
 * never a new fact. Shared Apollo hardware (descent stages, ALSEP stations, rovers) is written once per kind.
 */

/** object id → one or two plain sentences */
const OBJECTS: Record<string, string> = {
  'a11-lm-descent': 'The bottom half of the Apollo 11 Lunar Module, Eagle. It carried Neil Armstrong and Buzz Aldrin down to the Moon, then stayed behind as the launch pad for their trip home.',
  'a11-easep-pse': 'A small science station with a seismometer that felt moonquakes and sent the readings to Earth.',
  'a11-lrrr': 'A panel of special glass cubes. Scientists on Earth bounce laser light off it to measure the distance to the Moon.',
  'a14-lrrr': 'A panel of special glass cubes. Scientists on Earth bounce laser light off it to measure the distance to the Moon.',
  'a15-lrrr': 'A panel of special glass cubes. Scientists on Earth bounce laser light off it to measure the distance to the Moon.',
  'a17-sep': 'An experiment that measured the electrical properties of the lunar ground.',
  'ch3-lander': 'Vikram, the lander of India’s Chandrayaan-3 mission (ISRO, not NASA).',
  'ch3-rover': 'Pragyan, the small rover of India’s Chandrayaan-3 mission (ISRO, not NASA).',
  'opportunity-rover': 'Opportunity, one of NASA’s two Mars Exploration Rovers. It was sent to look for clues that water once flowed on Mars, and it found them.',
  'spirit-rover': 'Spirit, Opportunity’s twin. It explored Gusev crater on the other side of Mars.',
  'mer-a-lander': 'The lander that carried Spirit to Mars. It bounced to a stop on airbags, then opened its petals so the rover could drive off.',
  'viking-1-lander': 'Viking 1, the first successful US lander on Mars. It photographed the surface, scooped up soil and tested it for signs of life.',
  'viking-2-lander': 'Viking 2, Viking 1’s twin. It landed far to the north, on the plains of Utopia Planitia, and ran the same experiments.',
  'pathfinder-lander': 'The lander that carried the first Mars rover, Sojourner. It landed on airbags and opened like a flower.',
  'sojourner-rover': 'Sojourner, the first rover on Mars, only 65 centimetres long.',
  'phoenix-lander': 'A lander near Mars’ north pole that dug into the ground and found ice hidden under the soil.',
  'curiosity-rover': 'Curiosity, a car-sized rover powered by a nuclear generator. It studies rocks to learn whether Mars could once have supported life.',
  'insight-lander': 'InSight, a lander that listened for marsquakes to learn what Mars is like deep inside.',
  'perseverance-rover': 'Perseverance, NASA’s rover in Jezero crater.',
  'ingenuity-helicopter': 'Ingenuity, the small helicopter that flew on Mars.',
  'huygens-probe': 'Huygens, the European probe that landed on Saturn’s moon Titan (ESA, not NASA).',
}

/** kinds of shared Apollo hardware (the descent stages, ALSEP stations and lunar rovers repeat across missions) */
const LM = /^a1\d-lm-descent$/, ALSEP = /^a1\d-alsep$/, LRV = /^a1\d-lrv$/

function objectKindLine(id: string): string | null {
  const n = /^a(1\d)-/.exec(id)?.[1]
  if (LM.test(id)) return `The bottom half of the Apollo ${n} Lunar Module. The top half flew the astronauts back up to orbit; this part stayed behind as their launch pad.`
  if (ALSEP.test(id)) return `The central station of the science experiments the Apollo ${n} astronauts set up. It received commands from Earth and radioed the measurements back.`
  if (LRV.test(id)) return `The Apollo ${n} lunar rover. The astronauts drove it to explore much farther from their lander. It folded up to travel inside the Lunar Module.`
  return null
}

/** component lines: by `kind:component` for shared Apollo hardware, by component id elsewhere */
const PARTS: Record<string, string> = {
  'lm:legs': 'Four legs with round feet held the lander up on the Moon’s surface.',
  'lm:ladder': 'The astronauts climbed down this ladder to step onto the Moon.',
  'lm:engine': 'The rocket engine that slowed the lander for a gentle landing. Its power could be turned up and down.',
  'lm:body': 'The eight-sided box that held the fuel tanks and the equipment the astronauts used outside.',
  'alsep:antenna': 'A small antenna pointed at Earth, to send the station’s measurements home.',
  'alsep:station': 'The station’s “brain”: it received commands from Earth and sent the experiments’ data back.',
  'lrv:wheels': 'Wheels woven from steel wire, with no air inside, so they could never go flat.',
  'lrv:controls': 'Two folding seats and a T-shaped handle to drive, steer and brake.',
  'lrv:antenna': 'A large mesh dish antenna for talking to Earth.',
  'lrv:chassis': 'The frame folded in three parts so the rover fit inside the Lunar Module.',
  // Apollo 11 science
  seismometer: 'It felt moonquakes and meteorite impacts and sent the readings to Earth.',
  'solar-panels': 'Two solar panels powered the station during the lunar day.',
  antenna: 'Sent the measurements back to Earth.',
  'dust-detector': 'Measured how much Moon dust settled on it.',
  array: 'Special glass cubes reflect light straight back to where it came from, so a laser pulse fired from Earth returns to Earth.',
  support: 'Held the mirror panel aimed at Earth.',
  // Mars Exploration Rovers (Opportunity merb-, Spirit mera-)
  pma: 'The rover’s “neck”: a mast holding its cameras up high, turning to look in any direction.',
  pancam: 'The rover’s main eyes: a pair of cameras that take colour panoramas.',
  navcam: 'Cameras that help the rover see where to drive.',
  minites: 'Senses the heat (infrared light) coming from rocks, to tell what minerals they are made of.',
  'solar-array': 'Solar panels that turn sunlight into power. Dust settling on them slowly reduced the power.',
  solar: 'Solar panels that turn sunlight into power.',
  batteries: 'Batteries that store energy for the night and help keep the rover warm.',
  mobility: 'Six wheels on a bendy “rocker-bogie” suspension that lets the rover climb over rocks.',
  idd: 'The rover’s arm. It carries four science tools to touch rocks and soil.',
  telecom: 'Antennas for talking to Earth directly, or through spacecraft orbiting Mars.',
  web: 'An insulated box that keeps the electronics warm on freezing Martian nights.',
  avionics: 'The rover’s computer brain.',
  apxs: 'Tells which chemical elements a rock or a patch of soil is made of.',
  mossbauer: 'One of the four tools on the arm. It identifies iron-bearing minerals, such as the jarosite Opportunity found.',
  mi: 'A close-up camera on the arm, like a magnifying glass.',
  rat: 'This tool gently ground away the dusty outer layer of a rock, so scientists could study what was underneath.',
  hazcams: 'Cameras on the front and back that spot obstacles.',
  petals: 'Side panels with motors that turned the lander the right way up and opened it.',
  airbags: 'Airbags inflated seconds before touchdown to cushion the bouncing landing.',
  // Viking 1 and 2 (vl1-, vl2-)
  cameras: 'Cameras that slowly scanned all the way around to make 360° pictures.',
  sampler: 'An arm that scooped up Martian soil for the experiments. A magnet on its end collected magnetic dust.',
  biology: 'Experiments that tested the soil for signs of tiny living things.',
  gcms: 'An instrument that found out which chemicals were in the soil.',
  xrfs: 'An instrument that found out which elements the soil was made of.',
  meteorology: 'A boom with sensors that measured temperature and wind.',
  hga: 'A dish antenna for sending data straight to Earth.',
  legs: 'The landing legs that hold the lander on the surface.',
  pressure: 'Measured the air pressure.',
  rtg: 'Nuclear power sources that turned heat into electricity.',
  comms: 'Radios for talking to Earth and to the orbiter overhead.',
  // InSight
  seis: 'A super-sensitive seismometer that felt marsquakes, meteorite impacts and even passing dust devils.',
  hp3: 'A heat probe with a self-hammering “mole” that was meant to burrow into the ground and measure the heat inside Mars.',
  wts: 'A dome placed over the seismometer to shield it from wind and temperature changes.',
  rise: 'Radio tracking that measured how Mars wobbles, which reveals the size of its core.',
  ida: 'The robotic arm that lifted the instruments off the deck and set them down on the ground.',
  idc: 'A camera on the arm.',
  icc: 'A wide fisheye camera under the deck.',
  sensors: 'Sensors that measured the weather and changes in the magnetic field.',
  // Mars Pathfinder and Sojourner
  camera: 'A camera on a pop-up mast that looked out over the landing site.',
  met: 'A weather station.',
  ramps: 'Sojourner rolled down this ramp onto Mars.',
  antennas: 'Antennas for talking to Earth.',
  wheels: 'Six wheels on a bendy suspension that raised the rover to full height after landing.',
  computer: 'A small computer that steered around obstacles by itself, because radio messages from Earth took 10 to 15 minutes to arrive.',
  // Phoenix
  arm: 'A robotic arm that dug trenches and uncovered ice hidden under the soil.',
  rac: 'A camera on the robotic arm.',
  ssi: 'A stereo camera on the deck that photographed the landscape.',
  tega: 'Tiny ovens that heated soil samples to see what came out — including water.',
  meca: 'A small laboratory with a microscope and chemistry cells for studying the soil.',
  // Curiosity
  mastcam: 'Colour cameras on the mast that take panoramas and video.',
  chemcam: 'Zaps a rock with a laser and reads the glowing spark to learn what the rock is made of.',
  drill: 'Drills into rock and collects the powder for the rover’s onboard laboratories.',
  mahli: 'A close-up camera, like a geologist’s magnifying glass.',
  chemin: 'Shines X-rays through rock powder to identify its minerals.',
  sam: 'A laboratory that searches for carbon-based chemicals connected with life.',
  rems: 'A weather station: pressure, temperature, humidity, wind and ultraviolet light.',
  rad: 'Measures the high-energy radiation that reaches the surface.',
  dan: 'Sends neutrons into the ground to look for hydrogen, a sign of water.',
  mardi: 'Filmed the descent to the surface in colour.',
  mmrtg: 'A nuclear power source that turns heat into electricity, with no moving parts.',
}

/** the plain one-to-two-sentence explanation of an object (null when none is written: show its name only) */
export function plainObject(objectId: string): string | null {
  return OBJECTS[objectId] ?? objectKindLine(objectId)
}

/** the plain explanation of one component of an object (instrument, mechanism) */
export function plainComponent(objectId: string, componentId: string): string | null {
  const kind = LM.test(objectId) ? 'lm' : ALSEP.test(objectId) ? 'alsep' : LRV.test(objectId) ? 'lrv' : null
  if (kind && PARTS[`${kind}:${componentId}`]) return PARTS[`${kind}:${componentId}`]
  // mission-prefixed ids (merb-rat, vl1-cameras, ins-seis, msl-chemcam, …) share the plain line of their instrument
  const bare = componentId.replace(/^(merb|mera|vl1|vl2|ins|mpf|soj|phx|msl)-/, '')
  if (componentId === 'phx-solar') return 'Two eight-sided solar panel wings.'
  if (componentId === 'ins-solar') return 'Two round solar panels, each about 2.2 metres across.'
  if (componentId === 'mpf-petals') return 'Three triangular solar panels that opened like flower petals.'
  if (componentId === 'mpf-airbags') return 'Airbags that cushioned the landing, then were pulled back in.'
  if (componentId === 'soj-solar') return 'Solar cells on top powered the little rover.'
  if (componentId === 'soj-cameras') return 'Cameras that photographed the lander, the land around it and the rover’s own tracks.'
  if (componentId === 'soj-apxs') return 'Tested rocks and soil to find out what they were made of.'
  if (componentId === 'msl-cameras') return 'Curiosity carries 17 cameras in all.'
  if (componentId === 'msl-arm') return 'The robotic arm, about 2.2 metres long, holding a turret of tools.'
  if (componentId === 'phx-met') return 'A weather station that sent daily weather reports.'
  if (/^vl\d-seismometer$/.test(componentId)) return 'Listened for marsquakes.'
  if (/^vl\d-cameras$/.test(componentId)) return PARTS.cameras
  if (/^vl\d-legs$/.test(componentId)) return 'Three legs held the lander on the surface.'
  if (componentId === 'phx-legs') return 'Three landing legs.'
  if (componentId === 'mera-solar') return 'Solar panels that turn sunlight into power, up to 140 watts in full sunshine.'
  return PARTS[componentId] ?? PARTS[bare] ?? null
}
