/* =========================================================
   GHOSTS OF EXPLORATION — artifact database
   All photos/videos: NASA Image and Video Library (images.nasa.gov),
   public domain unless noted. Each media item keeps its NASA ID so it
   can be traced back to the original record.
   ========================================================= */

const NASA_VIDEO = (id) =>
  "https://images-assets.nasa.gov/video/" + encodeURIComponent(id) + "/" + encodeURIComponent(id) + "~mobile.mp4";
const NASA_PAGE = (id) => "https://images.nasa.gov/details/" + encodeURIComponent(id);
const IMG = (file) => "assets/nasa/" + file;

const VIDEOS = {
  apollo11: {
    id: "KSC-20090716-MH-NAS01-0001-Apollo_11_Restored_Moonwalk-HM_795",
    title: "Apollo 11 restored moonwalk footage",
    poster: IMG("v-apollo11.jpg"),
    note: "Long video (about 2.5 hours, large file). Skip around freely."
  },
  lrv: {
    id: "Apollo 15 Never Been on a Ride like this Before",
    title: "Apollo 15: “Never been on a ride like this before”",
    poster: IMG("v-lrv.jpg")
  },
  ingenuity: {
    id: "JPL-20240201-TECHf-0001-Mars Report Ingenuity",
    title: "The most extreme flights of Ingenuity (Mars Report)",
    poster: IMG("v-ingenuity.jpg")
  },
  marsquake: {
    id: "JPL-20190423-INSIGHf-0001-First Likely Marsquake Heard by NASAs InSight",
    title: "First likely marsquake heard by InSight",
    poster: IMG("v-marsquake.jpg")
  },
  meteoroid: {
    id: "JPL-20220919-INSIGHf-0001-InSight Captures Sound of a Meteoroid Striking Mars_1080",
    title: "InSight captures the sound of a meteoroid striking Mars",
    poster: IMG("v-meteoroid.jpg")
  },
  voyager: {
    id: "JPL-20240425-VOYAGEf-0001-Voyager 1 Team Reacts to Receiving Engineering Data From Spacecraft",
    title: "Voyager 1 team reacts as the spacecraft talks sense again (2024)",
    poster: IMG("v-voyager.jpg")
  }
};

/* status values:
   silent  = mission over, hardware still there, no longer talking
   lost    = contact lost unexpectedly / crashed during landing
   impact  = deliberately crashed (fragments + crater remain)
   retired = mission over but hardware still partly awake
   active  = still working today (shown for contrast)
*/
const STATUS = {
  silent:  { label: "Silent",          color: "#9fb3c8", desc: "Mission complete. Still there, no longer talking." },
  lost:    { label: "Lost",            color: "#ff7a7a", desc: "Contact was lost unexpectedly." },
  impact:  { label: "Impact site",     color: "#ffb347", desc: "Crashed on purpose (or by fate). A crater and fragments remain." },
  retired: { label: "Retired",         color: "#c9a7ff", desc: "Mission over, but the hardware is still partly awake." },
  active:  { label: "Still working",   color: "#5ee6a8", desc: "Still sending data home today." }
};

const TYPES = {
  rover:      "Rover",
  lander:     "Lander",
  vehicle:    "Moon car",
  experiment: "Science station",
  impactor:   "Impactor",
  probe:      "Deep-space probe",
  helicopter: "Helicopter",
  orbiter:    "Orbiter",
  telescope:  "Space telescope",
  debris:     "Landing debris"
};
// Plural labels for the map's filter chips (translated in i18n/<lang>/ui.json → typesPlural).
const TYPES_PLURAL = {
  rover: "Rovers", lander: "Landers", vehicle: "Moon cars", experiment: "Science stations", impactor: "Impactors",
  probe: "Deep-space probes", helicopter: "Helicopters", orbiter: "Orbiters", telescope: "Space telescopes", debris: "Landing debris"
};

const WORLDS = {
  moon: { name: "The Moon", short: "Moon", tagline: "384,400 km away · 1.3 light-seconds", color: "#cfd8e3" },
  mars: { name: "Mars", short: "Mars", tagline: "55–400 million km away · 3–22 light-minutes", color: "#ff8a5c" },
  deep: { name: "Elsewhere", short: "Elsewhere", tagline: "Earth orbit to interstellar space · up to a light-day away", color: "#8fb8ff" }
};

const ARTIFACTS = [
  /* ===================== THE MOON ===================== */
  {
    id: "ranger7", world: "moon", type: "impactor", status: "impact",
    name: "Ranger 7", mission: "Ranger program", year: 1964,
    lat: -10.63, lon: -20.68, place: "Mare Cognitum (“the Known Sea”)",
    dates: { launch: "28 Jul 1964", arrive: "31 Jul 1964 (impact)", last: "31 Jul 1964" },
    planned: "A one-way trip: photograph the Moon, then crash.",
    actual: "Sent 4,308 photos in its final 17 minutes.",
    stats: [["Photos sent", "4,308"], ["Time taking photos", "17 min"], ["Earlier Rangers that failed", "6"]],
    ghost: "I was built to crash. Six Rangers before me failed, so everyone held their breath. For the last 17 minutes of my life my six cameras clicked as fast as they could. I sent 4,308 pictures home, then I hit the Moon at about 2.6 km per second.",
    story: "Before people could land on the Moon, scientists needed to know what it looked like up close. Ranger 7 flew straight at the Moon, taking pictures all the way down. Its last photos showed craters smaller than a car!",
    deep: "Ranger 7's television cameras returned the first close-up images of the lunar surface taken by a U.S. spacecraft, resolving features under one metre across — roughly 1,000 times sharper than the best Earth-based telescope views of the time. The images showed that even the smooth maria were covered in craters of every size, a key input for designing Apollo landing gear.",
    discoveries: ["Showed craters as small as about 1 m across", "Revealed the maria were gently rolling, not jagged — good news for future landers", "Proved the Ranger design after six failed attempts"],
    legacy: "Ranger's pictures helped NASA choose safe landing zones for Surveyor and Apollo.",
    fun: "The mare where it crashed was renamed Mare Cognitum, “the Sea that has become Known,” because of its photos.",
    media: [{ f: "PIA02975.jpg", id: "PIA02975", cap: "The first image of the Moon taken by a U.S. spacecraft — Ranger 7, 17 minutes before impact." }],
    quiz: "I had six cameras and I was designed to crash into the Moon."
  },
  {
    id: "surveyor1", world: "moon", type: "lander", status: "silent",
    name: "Surveyor 1", mission: "Surveyor program", year: 1966,
    lat: -2.47, lon: -43.34, place: "Oceanus Procellarum (Ocean of Storms)",
    dates: { launch: "30 May 1966", arrive: "2 Jun 1966", last: "7 Jan 1967" },
    planned: "Prove a spacecraft could land softly on the Moon.",
    actual: "Landed perfectly on the first try and sent more than 11,000 pictures.",
    stats: [["Photos sent", "11,240"], ["Mass at landing", "~294 kg"], ["Months awake", "~7"]],
    ghost: "Some people worried the Moon was covered in deep, fluffy dust that would swallow a spaceship. I was the test. I touched down gently on three legs… and didn't sink. My pictures told the Apollo engineers: it's safe to land.",
    story: "Surveyor 1 was America's first spacecraft to land softly on another world. It used rockets to slow down, landed on three legs and then took thousands of pictures of the ground around it.",
    deep: "Surveyor 1 used a radar altimeter and throttleable vernier engines to make a fully automatic soft landing — the first by the United States (the Soviet Luna 9 had soft-landed four months earlier). Its footpads pressed only a few centimetres into the soil, confirming the regolith could bear the weight of the Apollo Lunar Module.",
    discoveries: ["The lunar soil is firm enough to support a spacecraft", "Measured how hot and cold the surface gets between day and night", "Survived its first two-week lunar night"],
    legacy: "Its landing technology and soil data fed straight into the design of the Apollo Lunar Module's legs.",
    fun: "NASA's Lunar Reconnaissance Orbiter photographed Surveyor 1 from orbit more than 40 years later — it's still standing there.",
    media: [{ f: "PIA12910.jpg", id: "PIA12910", cap: "Surveyor 1 spotted from orbit by the Lunar Reconnaissance Orbiter (arrow)." }],
    quiz: "I proved the Moon's surface was solid enough to land on."
  },
  {
    id: "surveyor3", world: "moon", type: "lander", status: "silent",
    name: "Surveyor 3", mission: "Surveyor program", year: 1967,
    lat: -3.016, lon: -23.418, place: "Oceanus Procellarum", nudge: [-1.2, 1.4],
    dates: { launch: "17 Apr 1967", arrive: "20 Apr 1967", last: "4 May 1967" },
    planned: "Land, take photos and dig into the soil with a robotic scoop.",
    actual: "Bounced twice on landing, then became the only robot on the Moon to be visited by humans.",
    stats: [["Bounces on landing", "2"], ["Trenches dug", "4"], ["Years until visitors", "2.5"]],
    ghost: "My landing was embarrassing — bright rocks confused my sensors and I bounced twice before settling down. I dug the first trenches ever made on another world. Then I slept… until two astronauts walked over and said hello in November 1969.",
    story: "Surveyor 3 had a little robotic scoop that dug into the Moon's soil. Two and a half years later the Apollo 12 astronauts landed right next to it, walked over, and cut off its camera to bring home!",
    deep: "Apollo 12 landed about 180 m from Surveyor 3 on purpose, a demonstration of pinpoint landing. Pete Conrad and Alan Bean removed roughly 10 kg of parts — the TV camera, cables and the scoop — so engineers could study how materials age in space. Bacteria found in the camera were once thought to have survived on the Moon, but later studies suggest they most likely came from contamination after the camera returned to Earth.",
    discoveries: ["Dug the first trenches on another world, measuring soil strength", "Its returned parts showed how 31 months on the Moon affected metal, glass and paint", "Helped prove pinpoint landing — Apollo 12 set down within walking distance"],
    legacy: "Pieces of Surveyor 3 are now in the Smithsonian's National Air and Space Museum.",
    fun: "Surveyor 3 and Apollo 12 are a rare pair: a robot explorer and the humans who came to check on it.",
    media: [
      { f: "AS12-48-7133.jpg", id: "AS12-48-7133", cap: "Pete Conrad beside Surveyor 3, with the Apollo 12 lunar module Intrepid on the horizon." },
      { f: "PIA12903.jpg", id: "PIA12903", cap: "The Lunar Reconnaissance Orbiter's view of the Apollo 12 and Surveyor 3 site." }
    ],
    quiz: "Astronauts walked over to me and took my camera home."
  },
  {
    id: "apollo11", world: "moon", type: "lander", status: "silent",
    name: "Tranquility Base", nick: "Apollo 11", mission: "Apollo 11", year: 1969,
    lat: 0.674, lon: 23.473, place: "Mare Tranquillitatis (Sea of Tranquility)",
    dates: { launch: "16 Jul 1969", arrive: "20 Jul 1969", last: "Retroreflector still used today" },
    planned: "Land two people on the Moon and bring them home safely.",
    actual: "Did exactly that — and left behind a mirror scientists still aim lasers at today.",
    stats: [["Time on the surface", "21.5 h"], ["Moonwalk length", "~2.5 h"], ["Rocks brought home", "21.5 kg"]],
    ghost: "I'm the bottom half of the lunar module Eagle. I was the launch pad for Neil and Buzz's trip home, so I stayed behind. Next to me is a small mirror. Every so often a laser beam from Earth finds it, bounces off, and tells scientists exactly how far away the Moon is.",
    story: "On 20 July 1969 Neil Armstrong and Buzz Aldrin landed the lunar module Eagle. When they left, the bottom half of Eagle stayed behind as a launch pad. They also left a flag, a seismometer to feel moonquakes, and a special mirror called a retroreflector.",
    deep: "The Early Apollo Scientific Experiments Package included a Passive Seismic Experiment, which returned data for about three weeks, and the Laser Ranging Retroreflector — 100 fused-silica corner cubes. Observatories still bounce lasers off it and the later Apollo 14 and 15 reflectors, measuring the Earth–Moon distance to within millimetres. The data show the Moon is drifting away by about 3.8 cm per year and test Einstein's theory of gravity.",
    discoveries: ["The Moon is moving away from Earth by about 3.8 cm every year", "First rocks returned from the Moon: volcanic basalts about 3.6–3.9 billion years old", "Moon dust is sticky, sharp and clings to everything"],
    legacy: "The laser-ranging mirrors are among the longest-running experiments in science — working for over 55 years without power.",
    fun: "Buzz Aldrin reported that the flag was knocked over by engine blast when Eagle's top half lifted off.",
    left: ["Eagle descent stage with a plaque: “We came in peace for all mankind”", "Laser Ranging Retroreflector", "Passive Seismic Experiment", "U.S. flag", "A silicon disk with goodwill messages from 73 world leaders", "An Apollo 1 mission patch and medals honouring cosmonauts Gagarin and Komarov", "Boots, backpacks and tools — left to save weight for Moon rocks"],
    media: [
      { f: "as11-40-5948.jpg", id: "as11-40-5948", cap: "Buzz Aldrin beside the seismometer he has just set up, with the lunar module Eagle behind." },
      { f: "as11-40-5903.jpg", id: "as11-40-5903", cap: "Buzz Aldrin at Tranquility Base. Neil Armstrong and the lunar module are reflected in his visor." },
      { f: "as11-40-5875.jpg", id: "as11-40-5875", cap: "Aldrin beside the U.S. flag at Tranquility Base." }
    ],
    video: "apollo11",
    quiz: "Scientists still bounce lasers off a mirror at my landing site."
  },
  {
    id: "apollo12", world: "moon", type: "experiment", status: "silent",
    name: "Apollo 12 ALSEP", nick: "Apollo 12", mission: "Apollo 12", year: 1969,
    lat: -3.012, lon: -23.422, place: "Oceanus Procellarum", nudge: [1.2, -1.4],
    dates: { launch: "14 Nov 1969", arrive: "19 Nov 1969", last: "30 Sep 1977 (switched off)" },
    planned: "Set up a nuclear-powered science station and run it for at least a year.",
    actual: "Sent data for almost eight years until NASA switched every Apollo station off in 1977.",
    stats: [["Years sending data", "~8"], ["Power source", "Nuclear (RTG)"], ["Moon ‘ringing’ time", "~55 min"]],
    ghost: "I'm a weather station for moonquakes. When my astronauts' empty lunar module was crashed into the Moon on purpose, I felt the Moon ring like a bell for nearly an hour. Nobody expected that. I listened for eight years, until someone on Earth switched me off.",
    story: "Apollo 12 left behind the first ALSEP — a set of science instruments powered by a small nuclear generator. It included a seismometer that felt moonquakes and meteorite strikes.",
    deep: "After the astronauts returned to orbit, mission controllers deliberately crashed the empty ascent stage of the lunar module. The seismometer recorded vibrations that lasted around 55 minutes — far longer than on Earth — showing the dry, fractured lunar crust scatters seismic waves instead of damping them. The Apollo 12, 14, 15, 16 and 17 stations formed a network until all were switched off on 30 September 1977.",
    discoveries: ["The Moon ‘rings’ for a long time after an impact", "Detected moonquakes and meteoroid strikes for years", "Measured the solar wind and the Moon's weak magnetic field"],
    legacy: "Apollo seismic data are still being re-analysed today and are guiding the seismometers planned for Artemis.",
    fun: "Apollo 12 landed so precisely that the astronauts walked to Surveyor 3, about 180 m away.",
    media: [{ f: "PIA12903.jpg", id: "PIA12903", cap: "Orbit view of the Apollo 12 site: tracks, the descent stage and the science station are still there." }],
    quiz: "I felt the Moon ring like a bell for almost an hour."
  },
  {
    id: "apollo14", world: "moon", type: "experiment", status: "silent",
    name: "Apollo 14 site", nick: "Fra Mauro", mission: "Apollo 14", year: 1971,
    lat: -3.645, lon: -17.471, place: "Fra Mauro highlands",
    dates: { launch: "31 Jan 1971", arrive: "5 Feb 1971", last: "Retroreflector still used today" },
    planned: "Explore the Fra Mauro highlands and collect rocks from deep below the surface.",
    actual: "Collected 42 kg of rock — and two golf balls are still out there.",
    stats: [["Rocks returned", "42.3 kg"], ["Golf balls", "2"], ["Handcart", "1 (MET)"]],
    ghost: "I'm a two-wheeled handcart called the MET — the astronauts nicknamed me the ‘rickshaw’. I carried their tools up a hill. Not far from me, two golf balls are still lying in the dust, hit by Alan Shepard with a homemade club.",
    story: "Apollo 14 astronauts used a two-wheeled cart to carry tools. Before leaving, Alan Shepard attached a golf club head to a tool handle and hit two golf balls on the Moon!",
    deep: "Apollo 14 targeted the Fra Mauro formation, believed to be ejecta from the giant impact that formed the Imbrium basin. Its rocks were mainly breccias — fragments welded together by impacts — helping date that impact. The crew also left a second laser retroreflector and an ALSEP science station.",
    discoveries: ["Breccia rocks record the giant impact that created the Imbrium basin", "A second retroreflector improved laser measurements", "Seismometers helped detect deep moonquakes"],
    legacy: "Lunar golf has become famous — in 2021 imaging specialists estimated where the balls landed using restored film.",
    fun: "Shepard's club was a 6-iron head clipped to a sample-collecting handle.",
    media: [{ f: "as14-66-9337.jpg", id: "as14-66-9337", cap: "A golf ball and a ‘javelin’ (a tool handle) still lying on the Moon at the Apollo 14 site." }],
    quiz: "Two golf balls are still lying near me."
  },
  {
    id: "apollo15", world: "moon", type: "vehicle", status: "silent",
    name: "Lunar Roving Vehicle 1", nick: "Apollo 15", mission: "Apollo 15", year: 1971,
    lat: 26.132, lon: 3.634, place: "Hadley–Apennine",
    dates: { launch: "26 Jul 1971", arrive: "30 Jul 1971", last: "2 Aug 1971 (parked)" },
    planned: "Carry two astronauts farther from their lander than ever before.",
    actual: "Drove 27.8 km and helped find the ‘Genesis Rock’.",
    stats: [["Distance driven", "27.8 km"], ["Top speed", "~13 km/h"], ["Weight on Earth", "210 kg"]],
    ghost: "I was the first car on the Moon. I folded up like origami to fit in the side of the lunar module. Dave and Jim drove me up mountain slopes at 13 km/h and called it the ride of their lives. When they left, they parked me so my camera could watch them blast off.",
    story: "Apollo 15 brought the first Moon buggy. It ran on batteries, had wire-mesh wheels and could carry two astronauts and their rocks over hills and around craters.",
    deep: "Each LRV was electrically powered by two silver-zinc batteries, with a motor in every wheel. It extended the crew's exploration range to several kilometres from the lander. On Apollo 15 the crew found a sample of anorthosite nicknamed the ‘Genesis Rock’ — a piece of the Moon's ancient crust about 4 billion years old.",
    discoveries: ["The Genesis Rock: a piece of the Moon's original crust", "Explored Hadley Rille, a channel carved by ancient lava", "A larger laser retroreflector (300 prisms) still in use"],
    legacy: "Three rovers are parked on the Moon. Engineers designing Artemis rovers still study their design.",
    fun: "The crew also left ‘Fallen Astronaut’, a small aluminium figure and a plaque honouring 14 astronauts and cosmonauts who died.",
    media: [{ f: "as15-86-11603.jpg", id: "as15-86-11603", cap: "Jim Irwin with Lunar Roving Vehicle 1, with Mount Hadley behind." }],
    video: "lrv",
    quiz: "I was the first car ever driven on the Moon."
  },
  {
    id: "apollo16", world: "moon", type: "vehicle", status: "silent",
    name: "Lunar Roving Vehicle 2", nick: "Apollo 16", mission: "Apollo 16", year: 1972,
    lat: -8.973, lon: 15.5, place: "Descartes Highlands",
    dates: { launch: "16 Apr 1972", arrive: "21 Apr 1972", last: "23 Apr 1972 (parked)" },
    planned: "Explore the highlands, thought to be made by ancient volcanoes.",
    actual: "Found the highlands were made by giant impacts, not volcanoes.",
    stats: [["Distance driven", "26.7 km"], ["Rocks returned", "95.8 kg"], ["First Moon telescope", "Yes"]],
    ghost: "My astronauts expected volcano rocks. Instead they kept finding rocks smashed together by giant impacts — the scientists had guessed wrong, and that's how science works. Near me lies a photo of a family from Earth and the first telescope ever used on the Moon.",
    story: "Apollo 16 explored the bright, hilly highlands. The astronauts drove 26.7 km and brought home almost 96 kg of rock. Charlie Duke left a photo of his family on the ground.",
    deep: "Pre-mission geologic maps predicted volcanic rocks at Descartes, but the samples were overwhelmingly impact breccias — a lesson in testing hypotheses with ground truth. The crew also deployed the Far Ultraviolet Camera/Spectrograph designed by George Carruthers, the first astronomical observatory on the Moon; its film was returned and the camera left behind.",
    discoveries: ["The highlands were shaped by impacts, not volcanoes", "The first telescope on the Moon photographed Earth's upper atmosphere in ultraviolet", "Studied the Moon's magnetic field at several spots"],
    legacy: "Artemis astronauts will return to the Moon's highlands, near the south pole.",
    fun: "Duke's family photo reads, “This is the family of Astronaut Duke from planet Earth.”",
    media: [{ f: "as16-113-18339.jpg", id: "as16-113-18339", cap: "John Young leaps while saluting the flag. The lunar module and rover are behind him." }],
    quiz: "My crew expected volcano rocks but found impact rocks instead."
  },
  {
    id: "apollo17", world: "moon", type: "vehicle", status: "silent",
    name: "Lunar Roving Vehicle 3", nick: "Apollo 17", mission: "Apollo 17", year: 1972,
    lat: 20.191, lon: 30.772, place: "Taurus–Littrow valley",
    dates: { launch: "7 Dec 1972", arrive: "11 Dec 1972", last: "14 Dec 1972 (parked)" },
    planned: "The final Apollo landing — the longest stay and the most science.",
    actual: "Three days of exploring, 110 kg of samples, and the discovery of orange soil.",
    stats: [["Distance driven", "~36 km"], ["Rocks returned", "110.5 kg"], ["Days on the surface", "3"]],
    ghost: "I'm the last car humans drove on the Moon. I lost a fender and Gene fixed it with duct tape and folded maps. Harrison — the only geologist to walk on the Moon — found orange soil near me. My camera filmed their liftoff. I've been waiting for company ever since.",
    story: "Apollo 17 was the last time people walked on the Moon. Gene Cernan and Harrison Schmitt drove about 36 km. They found strange orange soil made of tiny glass beads from an ancient volcanic eruption.",
    deep: "The orange soil at Shorty crater consists of volcanic glass beads formed in lava fountains about 3.6 billion years ago; later analyses found traces of water trapped inside them. The rover's remote-controlled TV camera broadcast the ascent stage's liftoff to Earth. The plaque on the descent stage reads: “Here man completed his first explorations of the Moon, December 1972 AD.”",
    discoveries: ["Orange volcanic glass beads — later found to hold traces of water", "Rocks recording the Moon's early history", "Measured heat flowing out of the Moon's interior"],
    legacy: "No humans have been back since December 1972. Artemis plans to change that.",
    fun: "The rover's camera, controlled from Houston, filmed Cernan and Schmitt leaving the Moon.",
    media: [
      { f: "as17-137-20979.jpg", id: "as17-137-20979", cap: "Lunar Roving Vehicle 3 at Taurus–Littrow." },
      { f: "as17-147-22548.jpg", id: "as17-147-22548", cap: "The Apollo 17 science station (ALSEP) set up on the valley floor." },
      { f: "as17-152-23272.jpg", id: "as17-152-23272", cap: "Earth rising over the Moon's horizon, seen by Apollo 17." }
    ],
    quiz: "I'm the last car humans have driven on the Moon."
  },
  {
    id: "sivb16", world: "moon", type: "impactor", status: "impact",
    name: "Apollo 16 S-IVB stage", mission: "Apollo 16", year: 1972,
    lat: 1.921, lon: -23.807, place: "Oceanus Procellarum",
    dates: { launch: "16 Apr 1972", arrive: "19 Apr 1972 (impact)", last: "Contact lost before impact" },
    planned: "Crash the rocket's empty third stage so seismometers could measure the shake.",
    actual: "Contact was lost before impact, and its crater stayed hidden until 2015.",
    stats: [["Stage mass", "~14 tonnes"], ["Years hidden", "43"], ["Found by", "LRO"]],
    ghost: "I was the third stage of a giant Saturn V rocket. After I sent Apollo 16 toward the Moon, I was supposed to crash where the seismometers could feel me. I went quiet before I hit, and nobody knew where I landed… until a spacecraft spotted my crater 43 years later.",
    story: "Rockets that carried Apollo astronauts were sometimes crashed into the Moon on purpose. The shaking helped scientists learn what the inside of the Moon is like.",
    deep: "The S-IVB impacts from Apollo 13–17 acted as known seismic sources: by timing how long vibrations took to reach the seismometers left by earlier crews, scientists probed the structure of the upper lunar crust. Apollo 16's stage lost tracking before impact; Lunar Reconnaissance Orbiter imagery finally identified its crater in 2015.",
    discoveries: ["Seismic signals revealed the layered, broken upper crust", "LRO images showed fresh impact craters can be matched to known dates"],
    legacy: "Matching dated impacts to crater shapes helps scientists date craters across the solar system.",
    fun: "Five Saturn V third stages are on the Moon.",
    media: [{ f: "GSFC_20171208_Archive_e000501.jpg", id: "GSFC_20171208_Archive_e000501", cap: "The Apollo 16 booster's impact crater, found in Lunar Reconnaissance Orbiter images." }],
    quiz: "I went quiet before I crashed, and my crater stayed hidden for 43 years."
  },
  {
    id: "lcross", world: "moon", type: "impactor", status: "impact",
    name: "LCROSS & Centaur", mission: "LCROSS", year: 2009,
    lat: -84.68, lon: -48.71, place: "Cabeus crater, near the south pole",
    dates: { launch: "18 Jun 2009", arrive: "9 Oct 2009 (impact)", last: "9 Oct 2009" },
    planned: "Smash a rocket stage into a dark polar crater and look for water in the splash.",
    actual: "Found water ice in the plume — a key reason Artemis is going to the south pole.",
    stats: [["Centaur impact speed", "~2.5 km/s"], ["Water seen in plume", "~155 kg"], ["Time between crashes", "~4 min"]],
    ghost: "My partner, a used Centaur rocket stage, hit Cabeus crater first. I flew straight through the cloud it kicked up, sniffing and photographing, and sent everything home. Four minutes later I crashed too. We found water — frozen in the dark for perhaps billions of years.",
    story: "LCROSS crashed an empty rocket into a crater that never sees sunlight, then flew through the dust cloud to look for water. It found some!",
    deep: "LCROSS's instruments detected water vapour and ice in the ejecta plume — roughly 5.6% water by mass in the excavated soil — along with other volatiles. The result confirmed that permanently shadowed craters can trap ice, a potential resource for drinking water, oxygen and rocket fuel.",
    discoveries: ["Water ice exists in permanently shadowed lunar craters", "Also found other frozen chemicals trapped in the cold traps"],
    legacy: "Polar ice is why NASA's Artemis program targets the Moon's south pole.",
    fun: "The cold traps where LCROSS hit are among the coldest places measured in the solar system.",
    media: [{ f: "ARC-2009-ACD09-0220-126.jpg", id: "ARC-2009-ACD09-0220-126", cap: "The LCROSS team at NASA Ames shakes hands after confirming the impact, 9 October 2009." }],
    quiz: "I flew through a cloud of dust and found water ice near the Moon's south pole."
  },
  {
    id: "grail", world: "moon", type: "impactor", status: "impact",
    name: "GRAIL Ebb & Flow", mission: "GRAIL", year: 2012,
    lat: 75.62, lon: -26.63, place: "Sally K. Ride Impact Site, near Goldschmidt crater",
    dates: { launch: "10 Sep 2011", arrive: "31 Dec 2011 / 1 Jan 2012 (orbit)", last: "17 Dec 2012 (impact)" },
    planned: "Two twin spacecraft chase each other around the Moon to map its gravity.",
    actual: "Made the best gravity map of any world, then were guided into a mountain together.",
    stats: [["Spacecraft", "2 twins"], ["Speed at impact", "~1.7 km/s"], ["Gap between impacts", "~30 s"]],
    ghost: "We're twins, Ebb and Flow. We chased each other around the Moon, measuring the tiny changes in distance between us. Those changes revealed the Moon's hidden insides. When our fuel ran low, we flew together into a mountain near the north pole.",
    story: "GRAIL was two spacecraft that flew one behind the other. When one passed over a heavy area of the Moon it sped up a tiny bit. Measuring that let scientists map what is under the surface.",
    deep: "GRAIL measured changes in the separation of the two spacecraft to within microns, producing a high-resolution gravity field. It showed the lunar crust is thinner than expected (about 34–43 km on average) and riddled with fractures from impacts. The impact site was named after Sally Ride, whose MoonKAM programme let school students choose targets for GRAIL's cameras.",
    discoveries: ["The Moon's crust is thinner and more fractured than thought", "Mapped buried structures, including ancient lava-filled cracks"],
    legacy: "Middle-school students around the world took more than 100,000 photos with GRAIL's MoonKAM cameras.",
    fun: "The impact site is named after Sally Ride, the first American woman in space.",
    media: [{ f: "PIA16493.jpg", id: "PIA16493", cap: "Ebb and Flow's final moments: the paths into the mountain near Goldschmidt crater." }],
    quiz: "We were twins who mapped the Moon's gravity by chasing each other."
  },
  {
    id: "ladee", world: "moon", type: "impactor", status: "impact",
    name: "LADEE", mission: "LADEE", year: 2014,
    lat: 11.85, lon: -93.25, place: "Eastern rim of Sundman V crater (far side)",
    dates: { launch: "7 Sep 2013", arrive: "6 Oct 2013 (orbit)", last: "18 Apr 2014 (impact)" },
    planned: "Study the Moon's extremely thin atmosphere and floating dust.",
    actual: "Found a permanent dust cloud around the Moon and detected neon in its atmosphere.",
    stats: [["Lowest orbits", "a few km"], ["Mission length", "~7 months"], ["Hit the far side", "Yes"]],
    ghost: "The Moon has an atmosphere — just a very, very thin one. I skimmed close above the surface to taste it. Then I crashed on the far side, where nobody on Earth could watch.",
    story: "LADEE flew low around the Moon to study the tiny wisps of gas and dust that float above it. At the end it crashed on the far side of the Moon.",
    deep: "LADEE (Lunar Atmosphere and Dust Environment Explorer) confirmed neon in the lunar exosphere and found a lopsided, permanent dust cloud kicked up by tiny meteoroid impacts, which grows during meteor showers. It also tested laser communication from lunar orbit.",
    discoveries: ["A permanent, lopsided dust cloud surrounds the Moon", "Neon, helium and argon in the thin lunar exosphere", "Laser communication from the Moon at record speeds"],
    legacy: "Laser communications it tested are now used by newer missions to send data home faster.",
    fun: "It was deliberately crashed on the far side so it couldn't hit any historic Apollo sites.",
    media: [],
    quiz: "I studied the Moon's super-thin atmosphere and crashed on the far side."
  },
  {
    id: "prospector", world: "moon", type: "impactor", status: "impact",
    name: "Lunar Prospector", mission: "Lunar Prospector", year: 1999,
    lat: -87.7, lon: 44, place: "Shoemaker crater, near the south pole",
    dates: { launch: "7 Jan 1998", arrive: "Moon orbit: 11 Jan 1998", last: "31 Jul 1999 (impact)" },
    planned: "Map what the Moon is made of from orbit for one year.",
    actual: "Mapped the whole Moon for 19 months, then crashed into a dark polar crater to look for water.",
    stats: [["Cost", "~$63 million"], ["Months in orbit", "19"], ["Cameras on board", "0"]],
    ghost: "I was small and cheap, and I carried no camera at all. Instead I sniffed the Moon's surface from orbit and found hints of hydrogen hiding in the dark craters at the poles. At the end, my team steered me into one of those craters. I also carried something precious: some of the ashes of Gene Shoemaker, the scientist who taught the Apollo astronauts geology.",
    story: "Lunar Prospector was a small spacecraft that mapped what the Moon is made of. It found clues that ice might be hiding in craters near the poles. It also carried the ashes of a famous scientist, so he could finally go to the Moon.",
    deep: "Lunar Prospector carried a neutron spectrometer, gamma-ray spectrometer, magnetometer and other instruments, but no camera. Its neutron data showed extra hydrogen at both poles, consistent with water ice in permanently shadowed craters. On 31 July 1999 it was steered into a crater near the south pole in the hope that the impact would release water vapour visible from Earth; none was detected. That crater was later named Shoemaker.",
    discoveries: ["Extra hydrogen at the poles: the first strong hint of water ice on the Moon", "Global maps of elements such as iron, thorium and potassium", "Patches of magnetic field in the Moon's crust"],
    legacy: "LCROSS confirmed its hint ten years later, finding water ice in another polar crater.",
    fun: "Gene Shoemaker was the first person whose ashes were sent to the Moon. He had hoped to be an astronaut himself, but a health condition kept him from flying.",
    media: [{ f: "PIA18162.jpg", id: "PIA18162", cap: "Artist's concept of Lunar Prospector in orbit, its instrument masts unfolded." }],
    quiz: "I carried the ashes of a famous scientist and crashed into a crater near the Moon's south pole."
  },

  /* ===================== MARS ===================== */
  {
    id: "viking1", world: "mars", type: "lander", status: "silent",
    name: "Viking 1 Lander", nick: "Thomas Mutch Memorial Station", mission: "Viking", year: 1976,
    lat: 22.27, lon: -47.95, place: "Chryse Planitia",
    dates: { launch: "20 Aug 1975", arrive: "20 Jul 1976", last: "13 Nov 1982" },
    planned: "Operate on the surface for at least 90 days and search for life.",
    actual: "Worked for more than six years.",
    stats: [["Planned", "90 days"], ["Actual", "6+ years"], ["Life experiments", "3"]],
    ghost: "I landed exactly seven years after the first people walked on the Moon. I took the very first photo from the surface of Mars, and I tested its soil for life. For six years I sent weather reports home. Then a wrong command pointed my antenna away from Earth, and I went silent.",
    story: "Viking 1 was the first U.S. spacecraft to land successfully on Mars. It took the first pictures from the surface and tested the soil to look for tiny living things.",
    deep: "Viking's three biology experiments gave puzzling results: one (Labeled Release) gave a positive-looking signal, but the GCMS found no organic molecules. Most scientists concluded the soil chemistry — possibly perchlorates, later found by Phoenix — explained the results, though debate continues. Viking 1 also returned years of daily weather data from Mars.",
    discoveries: ["The first images and weather reports from the Martian surface", "Mars's soil is chemically reactive", "Measured the atmosphere's makeup — mostly carbon dioxide"],
    legacy: "Viking's life-detection puzzle shaped every later Mars mission, including Curiosity and Perseverance.",
    fun: "Its weather station sent the first-ever daily weather forecasts from another planet.",
    media: [
      { f: "PIA00563.jpg", id: "PIA00563", cap: "The first colour image taken from the surface of Mars, by Viking Lander 1." },
      { f: "PIA00567.jpg", id: "PIA00567", cap: "Sunset at the Viking Lander 1 site." },
      { f: "PIA00565.jpg", id: "PIA00565", cap: "The U.S. flag painted on Viking Lander 1, seen against the Martian surface." }
    ],
    quiz: "I took the first photo from the surface of Mars."
  },
  {
    id: "viking2", world: "mars", type: "lander", status: "silent",
    name: "Viking 2 Lander", mission: "Viking", year: 1976,
    lat: 47.64, lon: 134.29, place: "Utopia Planitia",
    dates: { launch: "9 Sep 1975", arrive: "3 Sep 1976", last: "11 Apr 1980" },
    planned: "A second search for life, farther north than Viking 1.",
    actual: "Worked for more than three years and photographed frost on Mars.",
    stats: [["Years working", "3.5"], ["Latitude", "48° N"], ["Seasons seen", "~2 Mars winters"]],
    ghost: "I landed far to the north, on a plain full of rocks. In winter I watched a thin layer of frost form around me — water ice on Mars! My batteries finally gave out in 1980.",
    story: "Viking 2 landed on a rocky plain. During winter it photographed white frost on the ground — proof that water ice can form on Mars.",
    deep: "Viking Lander 2 recorded water-ice frost that persisted for about 100 days in winter. It also carried a working seismometer — the first on Mars — though it mostly picked up wind shaking the lander, a lesson InSight later solved by placing its seismometer directly on the ground.",
    discoveries: ["Thin water-ice frost forms on Mars in winter", "Weather records across Martian seasons", "First seismometer on Mars (mostly detected wind)"],
    legacy: "Its windy seismometer taught engineers to put InSight's sensor on the ground under a shield.",
    fun: "Viking 2 and InSight are both in the same broad region, more than 40 years apart.",
    media: [{ f: "PIA00573.jpg", id: "PIA00573", cap: "Frost on the ground at the Viking Lander 2 site." }],
    quiz: "I photographed frost on Mars."
  },
  {
    id: "pathfinder", world: "mars", type: "lander", status: "silent",
    name: "Mars Pathfinder", nick: "Carl Sagan Memorial Station", mission: "Mars Pathfinder", year: 1997,
    lat: 19.13, lon: -33.22, place: "Ares Vallis", nudge: [-1.2, 0],
    dates: { launch: "4 Dec 1996", arrive: "4 Jul 1997", last: "27 Sep 1997" },
    planned: "Test a cheap, new way of landing: bouncing on airbags.",
    actual: "Bounced about 15 times, then worked three times longer than planned.",
    stats: [["Airbag bounces", "~15"], ["Photos sent", "16,500+"], ["Planned life", "30 days"]],
    ghost: "I fell to Mars wrapped in giant airbags and bounced across the ground like a beach ball. When I stopped rolling, I opened my petals and let my small friend Sojourner drive out. I talked to Earth for almost three months.",
    story: "Pathfinder landed on Mars inside big airbags and bounced around until it stopped. Then it opened like a flower and released a small rover called Sojourner.",
    deep: "Pathfinder demonstrated the airbag landing system later used by Spirit and Opportunity. The base station returned more than 16,500 images, plus weather data and chemical analyses of rocks. The site, an ancient flood plain, had rounded pebbles that suggested water once flowed there.",
    discoveries: ["Rounded pebbles hint that floods once swept the area", "Dust devils and daily temperature swings measured", "Proved airbag landings work"],
    legacy: "The “faster, better, cheaper” mission showed Mars exploration could be done on a smaller budget.",
    fun: "Its landing on 4 July 1997 drew record numbers of visitors to NASA's websites.",
    media: [{ f: "PIA01121.jpg", id: "PIA01121", cap: "The Pathfinder lander seen by Sojourner." }],
    quiz: "I bounced across Mars on airbags."
  },
  {
    id: "sojourner", world: "mars", type: "rover", status: "silent",
    name: "Sojourner", mission: "Mars Pathfinder", year: 1997,
    lat: 19.13, lon: -33.22, place: "Ares Vallis", nudge: [1.4, 0],
    dates: { launch: "4 Dec 1996", arrive: "4 Jul 1997 (rolled off 6 Jul)", last: "27 Sep 1997 (via lander)" },
    planned: "Drive around for 7 days.",
    actual: "Kept going for 83 days.",
    stats: [["Planned", "7 sols"], ["Actual", "83 sols"], ["Mass", "10.6 kg"]],
    ghost: "I'm the first rover ever to drive on another planet. I'm about the size of a microwave oven. I visited rocks the scientists named Barnacle Bill and Yogi. I could only talk to Earth through the lander, so when the lander went quiet, so did I.",
    story: "Sojourner was the very first rover on another planet. It was tiny — just 10.6 kg — and drove slowly from rock to rock to find out what they were made of.",
    deep: "Sojourner carried an Alpha Proton X-ray Spectrometer to measure rock chemistry and navigated semi-autonomously using laser hazard detection. It stayed within about 12 m of the lander. Once the lander stopped transmitting, Sojourner could no longer relay data; engineers think its software may have kept it moving near the lander, trying to re-establish contact.",
    discoveries: ["Some rocks were rich in silica — different from typical Martian basalt", "Showed a small rover can drive itself around obstacles"],
    legacy: "Every Mars rover since — Spirit, Opportunity, Curiosity, Perseverance — grew from Sojourner's success.",
    fun: "Sojourner was named after Sojourner Truth, an American abolitionist and women's rights activist, chosen through a student essay contest.",
    media: [{ f: "PIA01551.jpg", id: "PIA01551", cap: "Sojourner newly deployed on the surface of Mars." }],
    quiz: "I was the first rover on another planet, about the size of a microwave."
  },
  {
    id: "polarlander", world: "mars", type: "lander", status: "lost",
    name: "Mars Polar Lander", mission: "Mars Surveyor '98", year: 1999,
    lat: -76.57, lon: 165.2, place: "Near the south polar layered terrain",
    dates: { launch: "3 Jan 1999", arrive: "3 Dec 1999", last: "3 Dec 1999 (lost during landing)" },
    planned: "Land near the south pole and dig for water ice.",
    actual: "Contact was lost during landing and never regained.",
    stats: [["Signals after landing", "0"], ["Probable cause", "Early engine shutdown"], ["Lessons learned", "Many"]],
    ghost: "I'm the ghost nobody has ever found. On the way down, a sensor in my leg may have mistaken a jolt for touchdown, and my engines shut off too early. I've been silent since 1999. My story helped make every Mars landing after me safer.",
    story: "Mars Polar Lander was meant to land near Mars's south pole. Something went wrong during landing and it was never heard from again. Engineers studied what might have happened so it wouldn't happen again.",
    deep: "The review board concluded the most probable cause was a software flaw: when the landing legs deployed, a vibration signal from the leg sensors could be misread as touchdown, shutting down the descent engines at around 40 m altitude. The lessons fed into the testing of Phoenix, which reused much of the design and landed successfully in 2008.",
    discoveries: ["(No science returned) — but the failure investigation changed how NASA tests landing software"],
    legacy: "Phoenix, built from the same design, landed safely nine years later — partly thanks to these lessons.",
    fun: "Orbiters have searched for it in photos many times; its exact location is still uncertain.",
    media: [{ f: "PIA04016.jpg", id: "PIA04016", cap: "“Rest in Peace Mars Polar Lander” — orbital image of the target area near the south pole." }],
    quiz: "I disappeared during landing near the south pole of Mars."
  },
  {
    id: "spirit", world: "mars", type: "rover", status: "silent",
    name: "Spirit", mission: "Mars Exploration Rover A", year: 2004,
    lat: -14.57, lon: 175.47, place: "Gusev Crater",
    dates: { launch: "10 Jun 2003", arrive: "4 Jan 2004", last: "22 Mar 2010" },
    planned: "Drive for 90 Mars days.",
    actual: "Kept exploring for more than six years.",
    stats: [["Planned", "90 sols"], ["Actual", "~2,200 sols"], ["Distance", "7.73 km"]],
    ghost: "One of my wheels broke, so I drove backwards, dragging it. That broken wheel scraped up white soil that turned out to be almost pure silica — the kind made by hot springs. Later I got stuck in soft sand at a place called Troy. I spent my last winter there, and my power ran out.",
    story: "Spirit was a golf-cart-sized rover. It climbed a hill, survived dust storms and kept going years longer than planned. Even its broken wheel made a discovery!",
    deep: "Spirit found evidence of ancient water in rocks at the Columbia Hills, and in 2007 its dragging wheel exposed soil about 90% silica, likely formed by hot springs or steam vents — environments that on Earth teem with microbes. It became embedded in soft sand at Troy in 2009; unable to tilt its solar panels toward the Sun for winter, it went silent in March 2010.",
    discoveries: ["Nearly pure silica deposits — a sign of hot springs or steam vents", "Rocks altered by water in the Columbia Hills", "Filmed dust devils sweeping across Gusev Crater"],
    legacy: "Perseverance is now collecting rock samples to test the kind of ideas Spirit raised about habitable environments.",
    fun: "Wind gusts sometimes cleaned dust off its solar panels — engineers called them ‘cleaning events’.",
    media: [
      { f: "PIA12203.jpg", id: "PIA12203", cap: "Spirit's panorama from Troy, where it became stuck in 2009." },
      { f: "PIA12337.jpg", id: "PIA12337", cap: "Computer reconstruction of Spirit's predicament, used by engineers to try to free it." },
      { f: "PIA05040.jpg", id: "PIA05040", cap: "Spirit stretching out its suspension after landing, January 2004." }
    ],
    quiz: "My broken wheel scraped up evidence of ancient hot springs."
  },
  {
    id: "opportunity", world: "mars", type: "rover", status: "silent",
    name: "Opportunity", nick: "Oppy", mission: "Mars Exploration Rover B", year: 2004,
    lat: -1.95, lon: -5.53, place: "Meridiani Planum (Perseverance Valley)",
    dates: { launch: "7 Jul 2003", arrive: "25 Jan 2004", last: "10 Jun 2018" },
    planned: "Drive for 90 Mars days and about 600 m.",
    actual: "Explored for more than 14 years and drove over a marathon.",
    stats: [["Planned", "90 sols"], ["Actual", "5,111 sols until last contact"], ["Distance", "45.16 km"]],
    ghost: "I landed inside a small crater — a hole-in-one — and found little round pebbles the scientists called blueberries. They formed in water. I kept driving for more than 14 years, farther than a marathon. Then a huge dust storm blocked out the Sun. My last message home was about power and darkness.",
    story: "Opportunity was supposed to last 90 days. It lasted more than 14 years! It found proof that Mars once had liquid water, then a planet-wide dust storm covered the Sun and its batteries ran out.",
    deep: "At Eagle crater Opportunity found hematite spherules (‘blueberries’) and layered rocks formed in acidic water. Later, at Endeavour crater, it found gypsum veins deposited by less acidic water — a friendlier environment. In June 2018 a global dust storm cut its solar power; its final data showed very low power and a dark, dust-choked sky. NASA ended the mission on 13 February 2019 after more than 1,000 recovery commands. The famous phrase “My battery is low and it's getting dark” is a journalist's poetic summary of that final data, not a literal message.",
    discoveries: ["Hematite ‘blueberries’ that formed in water", "Gypsum veins left by water flowing through cracks", "Completed a marathon distance on another world in 2015"],
    legacy: "Opportunity's discoveries made ‘follow the water’ the guiding idea for Mars exploration.",
    fun: "When Opportunity finished its marathon, the team on Earth ran a relay marathon to celebrate.",
    media: [
      { f: "PIA22222.jpg", id: "PIA22222", cap: "Opportunity's first selfie, made from microscope-camera images, 2018." },
      { f: "PIA16120.jpg", id: "PIA16120", cap: "Opportunity's shadow over Endeavour crater." },
      { f: "PIA22329.jpg", id: "PIA22329", cap: "Simulated views of how the 2018 dust storm darkened Opportunity's sky." },
      { f: "PIA22908.jpg", id: "PIA22908", cap: "The ‘Legacy’ panorama — among Opportunity's final images." }
    ],
    quiz: "I was planned for 90 days but explored for more than 14 years."
  },
  {
    id: "phoenix", world: "mars", type: "lander", status: "silent",
    name: "Phoenix", mission: "Phoenix Mars Lander", year: 2008,
    lat: 68.22, lon: -125.75, place: "Vastitas Borealis (northern plains)",
    dates: { launch: "4 Aug 2007", arrive: "25 May 2008", last: "2 Nov 2008" },
    planned: "Dig into the arctic ground of Mars and touch water ice.",
    actual: "Found and tasted ice, and saw snow falling from clouds.",
    stats: [["Planned", "90 sols"], ["Actual", "~157 sols"], ["Latitude", "68° N"]],
    ghost: "I dug a trench and found bright white chunks. A few days later they had vanished into the thin air — it was ice! My laser even saw snow falling from the clouds above me. Winter came, the Sun disappeared, and my solar panels broke under the weight of frozen carbon dioxide.",
    story: "Phoenix landed in the arctic of Mars. Its robotic arm dug into the soil and found real water ice just under the surface.",
    deep: "Phoenix confirmed water ice a few centimetres below the surface, found perchlorate salts and calcium carbonate in the soil, and its lidar detected snow falling from clouds (it evaporated before reaching the ground). As the polar winter set in, the lander lost power in November 2008. Images from orbit in 2010 showed a solar panel had broken under the weight of CO₂ ice.",
    discoveries: ["Water ice just under the surface of the northern plains", "Perchlorate salts in the soil", "Snow falling from Martian clouds"],
    legacy: "Its ice discovery helps planners choose where future astronauts could find water.",
    fun: "Phoenix carries a mini-DVD called ‘Visions of Mars’ — a library of stories and art about Mars for future explorers to find.",
    media: [
      { f: "PIA10906.jpg", id: "PIA10906", cap: "Disappearing ice: white chunks in Phoenix's trench vanished over four days." },
      { f: "PIA10701.jpg", id: "PIA10701", cap: "Phoenix (blue) on the Martian surface, seen from orbit by HiRISE." },
      { f: "PIA22223.jpg", id: "PIA22223", cap: "Phoenix seen from orbit nearly a decade after landing." }
    ],
    quiz: "I found ice just under the ground and saw snow falling on Mars."
  },
  {
    id: "insight", world: "mars", type: "experiment", status: "silent",
    name: "InSight", mission: "InSight", year: 2018,
    lat: 4.5, lon: 135.62, place: "Elysium Planitia",
    dates: { launch: "5 May 2018", arrive: "26 Nov 2018", last: "15 Dec 2022" },
    planned: "Listen to the inside of Mars for about two years.",
    actual: "Recorded more than 1,300 marsquakes over four years.",
    stats: [["Marsquakes", "1,319"], ["Biggest quake", "~magnitude 5"], ["Years listening", "4"]],
    ghost: "I'm Mars's doctor. I put a stethoscope — a seismometer — on the ground and listened. I heard more than 1,300 marsquakes and the thump of meteoroids hitting the surface. They told us Mars has a liquid metal core. Dust covered my solar panels until I couldn't stay awake any longer.",
    story: "InSight didn't drive anywhere. It sat still and listened for marsquakes. By studying how the quakes travelled through the planet, scientists worked out what the inside of Mars is like.",
    deep: "InSight's SEIS seismometer revealed a crust with several layers, a mantle and a liquid iron-rich core with a radius of roughly 1,830 km. It also recorded meteoroid impacts, which orbiters then photographed. Its heat probe (the ‘mole’) could not dig deep because the soil clumped instead of collapsing around it. Dust steadily reduced solar power, and contact ended in December 2022.",
    discoveries: ["Mars has a large liquid metal core", "The crust is made of layers", "Meteoroid impacts can be heard — and seen from orbit afterwards"],
    legacy: "InSight's seismic data are the first detailed look inside a planet other than Earth.",
    fun: "InSight carries two silicon chips holding the names of about 2.4 million people.",
    media: [
      { f: "PIA25287.jpg", id: "PIA25287", cap: "InSight's final selfie, its solar panels covered in dust (2022)." },
      { f: "PIA22956.jpg", id: "PIA22956", cap: "InSight placing its seismometer on the surface of Mars." },
      { f: "PIA25680.jpg", id: "PIA25680", cap: "One of InSight's last images." }
    ],
    video: "marsquake",
    video2: "meteoroid",
    quiz: "I listened to more than 1,300 marsquakes."
  },
  {
    id: "ingenuity", world: "mars", type: "helicopter", status: "retired",
    name: "Ingenuity", nick: "Ginny", mission: "Mars 2020", year: 2021,
    lat: 18.46, lon: 77.3, place: "Jezero Crater (‘Valinor Hills’)", nudge: [-1.3, -1.2],
    dates: { launch: "30 Jul 2020", arrive: "18 Feb 2021", last: "Flight 72, 18 Jan 2024" },
    planned: "Up to 5 test flights in 30 days.",
    actual: "Flew 72 times over almost three years.",
    stats: [["Planned flights", "5"], ["Actual flights", "72"], ["Total flying time", "~129 min"]],
    ghost: "Nobody had ever flown on another planet. The air on Mars is so thin that my blades had to spin about 2,500 times a minute. I was meant to fly five times. I flew 72. On my last flight a rotor blade was damaged, so now I stand still in the sand, a little weather station that remembers being a pilot.",
    story: "Ingenuity was a small helicopter that rode to Mars under the Perseverance rover. It became the first aircraft to fly on another planet and scouted the way for the rover.",
    deep: "Mars's atmosphere is about 1% as dense as Earth's, so Ingenuity's 1.2 m rotors spun at around 2,400–2,700 rpm. It flew 72 times, covering about 17 km and reaching heights of 24 m. During flight 72 its navigation system struggled over featureless sand, leading to a hard landing that damaged its blades. The helicopter can no longer fly but was left able to record data at its final airfield.",
    discoveries: ["Powered, controlled flight is possible on Mars", "Aerial scouting helped Perseverance plan its routes", "Photographed Perseverance's landing debris for engineers"],
    legacy: "Its success led to designs for larger Mars helicopters that could carry science instruments.",
    fun: "Ingenuity carries a postage-stamp-sized piece of fabric from the Wright brothers' 1903 Flyer.",
    media: [
      { f: "PIA26244.jpg", id: "PIA26244", cap: "Ingenuity's camera reveals the shadow of a rotor blade with a missing tip." },
      { f: "PIA26236.jpg", id: "PIA26236", cap: "Perseverance spots Ingenuity at its final airfield." },
      { f: "PIA26482.jpg", id: "PIA26482", cap: "Engineers' illustration of how the final hard landing probably happened." }
    ],
    video: "ingenuity",
    quiz: "I was the first aircraft to fly on another planet."
  },
  {
    id: "backshell", world: "mars", type: "debris", status: "silent",
    name: "Perseverance backshell & parachute", mission: "Mars 2020", year: 2021,
    lat: 18.4, lon: 77.5, place: "Jezero Crater", nudge: [1.3, 1.2],
    dates: { launch: "30 Jul 2020", arrive: "18 Feb 2021", last: "Job done on landing day" },
    planned: "Protect the rover through entry, then let go.",
    actual: "Did its job perfectly — and later posed for a photoshoot by Ingenuity.",
    stats: [["Parachute diameter", "21.5 m"], ["Entry speed", "~20,000 km/h"], ["Photographed from", "8 m up"]],
    ghost: "I'm the shell that wrapped Perseverance as it plunged through the Martian sky at about 20,000 km/h. I opened a giant parachute, let go, and crashed. A year later, a helicopter flew over to take my picture so engineers could see how I survived.",
    story: "Landing on Mars leaves pieces behind: heat shields, parachutes and protective shells. Ingenuity took photos of Perseverance's parachute and backshell so engineers could learn from them.",
    deep: "Ingenuity's 26th flight imaged the backshell and 21.5-m supersonic parachute from about 8 m altitude. The images showed the backshell's protective coating stayed intact and the parachute had no visible damage — useful data for designing future landings, including sample-return missions.",
    discoveries: ["Showed how entry hardware holds up after a real Mars landing"],
    legacy: "Every Mars landing leaves debris; studying it helps engineers make future landings safer.",
    fun: "Perseverance's parachute had a secret message coded into its pattern: “Dare Mighty Things.”",
    media: [{ f: "PIA25218.jpg", id: "PIA25218", cap: "Perseverance's backshell (left of centre) and parachute (right), photographed by Ingenuity." }],
    quiz: "I protected a rover as it plunged through Mars's sky, then a helicopter took my picture."
  },
  {
    id: "curiosity", world: "mars", type: "rover", status: "active",
    name: "Curiosity", mission: "Mars Science Laboratory", year: 2012,
    lat: -4.59, lon: 137.44, place: "Gale Crater (Mount Sharp)",
    dates: { launch: "26 Nov 2011", arrive: "6 Aug 2012", last: "Still working" },
    planned: "Two years to see if Gale Crater could ever have supported life.",
    actual: "Still climbing Mount Sharp more than a decade later.",
    stats: [["Landed", "2012"], ["Power", "Nuclear (RTG)"], ["Status", "Active"]],
    ghost: "I'm not a ghost — not yet! I'm still climbing Mount Sharp. I'm here so you can compare: the machines in this archive were once busy just like me.",
    story: "Curiosity is still working on Mars today. It found that Gale Crater once held a lake that could have supported tiny life forms.",
    deep: "Curiosity showed that ancient Gale Crater hosted long-lived lakes with the chemical ingredients and energy sources microbes could use. Its descent stage (the ‘sky crane’), heat shield and backshell are artifacts scattered nearby.",
    discoveries: ["Gale Crater once held a long-lasting lake", "Organic molecules preserved in ancient rocks"],
    legacy: "Its sky-crane landing system was reused to land Perseverance.",
    fun: "On its first anniversary it played ‘Happy Birthday’ using its soil-analysis instrument's vibrations.",
    media: [{ f: "PIA16239.jpg", id: "PIA16239", cap: "Curiosity's high-resolution self-portrait." }],
    quiz: null
  },

  /* ===================== DEEP SPACE ===================== */
  {
    id: "pioneer10", world: "deep", type: "probe", status: "silent",
    name: "Pioneer 10", mission: "Pioneer", year: 1972,
    dist: { au2025: 136, rate: 2.54 }, heading: "Toward Aldebaran, in the constellation Taurus",
    dates: { launch: "3 Mar 1972", arrive: "Jupiter: 3 Dec 1973", last: "23 Jan 2003" },
    planned: "A 21-month mission to Jupiter.",
    actual: "Kept talking for almost 31 years.",
    stats: [["First through", "Asteroid belt"], ["Last signal", "2003"], ["Est. distance", "live"]],
    ghost: "I was the first to cross the asteroid belt and the first to visit Jupiter. I carry a golden plaque with a drawing of two humans and a map to our Sun. My last faint signal reached Earth in 2003. In about two million years I'll pass near the star Aldebaran.",
    story: "Pioneer 10 was the first spacecraft to fly through the asteroid belt and past Jupiter. It carries a metal plaque that tells anyone who finds it where it came from.",
    deep: "Pioneer 10 measured Jupiter's intense radiation belts and magnetic field, information critical for protecting later spacecraft like Voyager and Galileo. Its plaque, designed by Carl Sagan and Frank Drake with artwork by Linda Salzman Sagan, shows a man and a woman, the spacecraft's outline and the Sun's position relative to 14 pulsars.",
    discoveries: ["The asteroid belt can be crossed safely", "Jupiter's radiation belts are dangerously strong", "First close-up images of Jupiter"],
    legacy: "Pioneer 10's measurements helped engineers protect every later Jupiter mission.",
    fun: "Its power came from RTGs — nuclear batteries that slowly faded over 30 years.",
    media: [{ f: "ARC-1972-AC72-2135.jpg", id: "ARC-1972-AC72-2135", cap: "Pioneer 10 being readied for launch, showing where the plaque is mounted." }],
    quiz: "I was the first to cross the asteroid belt, and I carry a plaque with a map to our Sun."
  },
  {
    id: "pioneer11", world: "deep", type: "probe", status: "silent",
    name: "Pioneer 11", mission: "Pioneer", year: 1973,
    dist: { au2025: 114, rate: 2.37 }, heading: "Toward the constellation Aquila",
    dates: { launch: "6 Apr 1973", arrive: "Saturn: 1 Sep 1979", last: "30 Sep 1995" },
    planned: "Follow Pioneer 10 to Jupiter, then go on to Saturn.",
    actual: "Became the first spacecraft to visit Saturn.",
    stats: [["Jupiter flyby", "1974"], ["Saturn flyby", "1979 (first)"], ["Last contact", "1995"]],
    ghost: "I flew so close to Jupiter that its gravity flung me across the solar system to Saturn. I was the first visitor to the ringed planet. I scouted the path that the Voyagers would follow. My power faded in 1995.",
    story: "Pioneer 11 was the first spacecraft to visit Saturn. It tested whether a spacecraft could safely fly past Saturn's rings.",
    deep: "Pioneer 11 used a Jupiter gravity assist in December 1974 to reach Saturn, passing within about 21,000 km of the cloud tops in September 1979. It discovered Saturn's F ring and a small moon, and confirmed the region where Voyager 2 later crossed the ring plane was safe.",
    discoveries: ["Discovered Saturn's F ring", "Measured Saturn's magnetic field", "Proved Voyager's route past Saturn was safe"],
    legacy: "Pioneer 11 was the trailblazer for Voyager and Cassini.",
    fun: "Like Pioneer 10, it carries the famous plaque with a map to our Sun.",
    media: [{ f: "ARC-1974-A74-9030-1.jpg", id: "ARC-1974-A74-9030-1", cap: "Scientists John Simpson and James Van Allen discuss Pioneer 11's mission to Jupiter and Saturn." }],
    quiz: "I was the first spacecraft to visit Saturn."
  },
  {
    id: "voyager1", world: "deep", type: "probe", status: "active",
    name: "Voyager 1", mission: "Voyager", year: 1977,
    dist: { au2025: 165, rate: 3.57 }, heading: "Toward the constellation Ophiuchus",
    dates: { launch: "5 Sep 1977", arrive: "Interstellar space: 25 Aug 2012", last: "Still talking (very slowly)" },
    planned: "A five-year mission to Jupiter and Saturn.",
    actual: "Nearly 50 years later, still sending data from interstellar space.",
    stats: [["Launched", "1977"], ["Entered interstellar space", "2012"], ["Est. distance", "live"]],
    ghost: "I'm the farthest human-made object. In 1990 I turned around and took a picture of Earth — a pale blue dot in a sunbeam. In 2012 I left the Sun's bubble and entered interstellar space. My instruments are being switched off one by one to save power, but I'm still listening and still talking.",
    story: "Voyager 1 visited Jupiter and Saturn, then kept going. It's now in interstellar space, the space between the stars. It carries a Golden Record with sounds and pictures from Earth.",
    deep: "Voyager 1 discovered active volcanoes on Jupiter's moon Io and studied Saturn's moon Titan before heading out of the solar system. It crossed the heliopause — the boundary of the solar wind's bubble — in August 2012. In late 2023 a failed memory chip made it send gibberish; engineers relocated its code and in April 2024 it began returning useful data again. Its signal now takes nearly a full day to reach Earth.",
    discoveries: ["Active volcanoes on Jupiter's moon Io", "Measured the edge of the Sun's influence", "Captured the ‘Pale Blue Dot’ photo of Earth"],
    legacy: "Voyager 1 is our only direct sample of interstellar space along its path.",
    fun: "The Golden Record includes greetings in 55 languages, music from many cultures and the sound of a human heartbeat.",
    media: [
      { f: "PIA00452.jpg", id: "PIA00452", cap: "Pale Blue Dot: Earth, less than a pixel in size, photographed by Voyager 1 in 1990." },
      { f: "PIA14113.jpg", id: "PIA14113", cap: "The Golden Record carried by both Voyagers." },
      { f: "PIA17049.jpg", id: "PIA17049", cap: "Artist's concept of Voyager in interstellar space." }
    ],
    video: "voyager",
    quiz: "I took the Pale Blue Dot photo and I'm the farthest spacecraft from Earth."
  },
  {
    id: "voyager2", world: "deep", type: "probe", status: "active",
    name: "Voyager 2", mission: "Voyager", year: 1977,
    dist: { au2025: 138, rate: 3.23 }, heading: "Toward the constellations Pavo and Telescopium",
    dates: { launch: "20 Aug 1977", arrive: "Interstellar space: 5 Nov 2018", last: "Still talking (very slowly)" },
    planned: "Jupiter and Saturn.",
    actual: "Also visited Uranus and Neptune — the only spacecraft ever to do so.",
    stats: [["Planets visited", "4"], ["Uranus", "1986"], ["Neptune", "1989"]],
    ghost: "I'm the only visitor Uranus and Neptune have ever had. In 2023 someone on Earth accidentally pointed my antenna two degrees away from home. For two weeks I couldn't hear a thing. Then a big antenna in Australia ‘shouted’ a command to me — and I turned back.",
    story: "Voyager 2 took the ‘grand tour’ of the four giant planets. It's still the only spacecraft to have visited Uranus and Neptune.",
    deep: "Voyager 2 used a rare planetary alignment for gravity assists from Jupiter to Saturn, Uranus and Neptune. It discovered new moons and rings and found Neptune's ‘Great Dark Spot’ and the geysers of Triton. It crossed into interstellar space in November 2018. In 2023 an incorrect command pointed its antenna 2° off Earth; the Deep Space Network's Canberra station sent a high-power ‘interstellar shout’ that restored contact.",
    discoveries: ["Ten new moons of Uranus", "Neptune's Great Dark Spot and supersonic winds", "Geysers on Neptune's moon Triton"],
    legacy: "Everything we know up close about Uranus and Neptune comes from Voyager 2.",
    fun: "Voyager 2 launched 16 days before Voyager 1 — but Voyager 1 took a faster route.",
    media: [{ f: "PIA17049.jpg", id: "PIA17049", cap: "Artist's concept of a Voyager spacecraft." }],
    quiz: "I'm the only spacecraft to have visited Uranus and Neptune."
  },
  {
    id: "near", world: "deep", type: "lander", status: "silent",
    name: "NEAR Shoemaker", mission: "NEAR", year: 2001,
    heading: "Resting on asteroid 433 Eros", fixedPlace: "Asteroid 433 Eros",
    dates: { launch: "17 Feb 1996", arrive: "Eros orbit: 14 Feb 2000", last: "28 Feb 2001" },
    planned: "Orbit an asteroid for one year.",
    actual: "Orbited for a year — then landed, even though it wasn't built to.",
    stats: [["First to", "Orbit an asteroid"], ["Landing speed", "~1.6 m/s"], ["Data from surface", "2 weeks"]],
    ghost: "I went into orbit around asteroid Eros on Valentine's Day 2000. A year later the team decided to try something bold: land me, even though I had no legs. I touched down at walking speed and kept sending science from the surface for two more weeks.",
    story: "NEAR Shoemaker was the first spacecraft to orbit an asteroid and the first to land on one. Asteroids are leftover building blocks from when the planets formed.",
    deep: "NEAR mapped Eros in detail, finding a rubble-covered, heavily cratered surface and a composition similar to ordinary chondrite meteorites. During a controlled descent on 12 February 2001 it returned close-up images, then measured the surface with its gamma-ray spectrometer until 28 February.",
    discoveries: ["Eros is a solid but cracked body covered in loose rubble", "Its make-up matches common meteorites that fall to Earth"],
    legacy: "Paved the way for asteroid sample-return missions like OSIRIS-REx.",
    fun: "The spacecraft was named for planetary geologist Eugene Shoemaker.",
    media: [{ f: "PIA02473.jpg", id: "PIA02473", cap: "Asteroid Eros seen by NEAR Shoemaker (3D anaglyph pairs)." }],
    quiz: "I was the first spacecraft to land on an asteroid."
  },
  {
    id: "deepimpact", world: "deep", type: "impactor", status: "impact",
    name: "Deep Impact impactor", mission: "Deep Impact", year: 2005,
    heading: "Crater on comet Tempel 1", fixedPlace: "Comet 9P/Tempel 1",
    dates: { launch: "12 Jan 2005", arrive: "4 Jul 2005 (impact)", last: "4 Jul 2005" },
    planned: "Smash into a comet to see what is inside.",
    actual: "Hit the comet at about 37,000 km/h and revealed a surprisingly powdery interior.",
    stats: [["Impactor mass", "~370 kg"], ["Impact speed", "~10.3 km/s"], ["Date", "4 July 2005"]],
    ghost: "I was a copper-heavy cannonball fired at a comet. My mothership watched as I slammed into Tempel 1. The flash and the cloud of fine powder told scientists what comets are made of inside.",
    story: "Deep Impact fired a small spacecraft into a comet on purpose. The crash threw out a huge cloud of dust, ice and gas so scientists could study it.",
    deep: "The impact excavated material that was finer and more powdery than expected, and revealed water ice and organic compounds. The Stardust-NExT mission flew by Tempel 1 in 2011 and photographed the resulting crater. Deep Impact's flyby spacecraft continued as the EPOXI mission until contact was lost in 2013.",
    discoveries: ["Comet interiors are fluffy and powdery", "Comets hold water ice and organic molecules"],
    legacy: "Hitting objects on purpose became a planetary-defence tool — NASA's DART changed an asteroid's orbit in 2022.",
    fun: "The impact happened on 4 July, U.S. Independence Day — fireworks in space.",
    media: [{ f: "PIA02137.jpg", id: "PIA02137", cap: "The flash of light after the impactor hit comet Tempel 1." }],
    quiz: "I was fired into a comet on purpose."
  },
  {
    id: "newhorizons", world: "deep", type: "probe", status: "active",
    name: "New Horizons", mission: "New Horizons", year: 2006,
    dist: { au2025: 62, rate: 2.9 }, heading: "Through the Kuiper Belt, toward Sagittarius",
    dates: { launch: "19 Jan 2006", arrive: "Pluto: 14 Jul 2015", last: "Still working" },
    planned: "Fly past Pluto.",
    actual: "Flew past Pluto and Arrokoth, the most distant world ever explored up close.",
    stats: [["Pluto flyby", "2015"], ["Arrokoth flyby", "2019"], ["Est. distance", "live"]],
    ghost: "I'm still awake! I'm here so you can compare. One day I'll be silent too, sailing beside the Pioneers and Voyagers.",
    story: "New Horizons showed us Pluto's icy heart-shaped plain and is still exploring the far edge of the solar system.",
    deep: "New Horizons revealed nitrogen-ice glaciers on Pluto and later flew past Arrokoth, a primitive Kuiper Belt object. It carries some of the ashes of Clyde Tombaugh, who discovered Pluto.",
    discoveries: ["Pluto has mountains of water ice and flowing nitrogen glaciers", "Arrokoth formed from two lobes that gently merged"],
    legacy: "It will eventually join the Pioneers and Voyagers on the road out of the solar system.",
    fun: "It launched on the fastest launch speed of any spacecraft at the time.",
    media: [{ f: "PIA20200.jpg", id: "PIA20200", cap: "Layered craters and icy plains on Pluto, from New Horizons." }],
    quiz: null
  },

  /* ===================== OTHER WORLDS ===================== */
  {
    id: "messenger", world: "deep", type: "impactor", status: "impact", body: "Mercury",
    name: "MESSENGER", mission: "MESSENGER", year: 2015,
    heading: "Crater on Mercury", fixedPlace: "Mercury, near the Shakespeare basin",
    dates: { launch: "3 Aug 2004", arrive: "Mercury orbit: 18 Mar 2011", last: "30 Apr 2015 (impact)" },
    planned: "Orbit Mercury for one Earth year.",
    actual: "Orbited for more than four years, then crashed when its fuel ran out.",
    stats: [["First to orbit", "Mercury"], ["Years in orbit", "4+"], ["Impact speed", "~14,000 km/h"]],
    ghost: "I'm the first spacecraft ever to circle Mercury, the planet closest to the Sun. I wore a sunshade like a giant umbrella so I wouldn't cook. I found ice hiding in craters at Mercury's poles, where sunlight never reaches. When my fuel ran out, I crashed into the planet I'd studied for four years.",
    story: "MESSENGER was the first spacecraft to orbit Mercury. Even though Mercury is the closest planet to the Sun, MESSENGER found frozen water hiding in the shadows of its polar craters.",
    deep: "To reach Mercury without falling straight into the Sun, MESSENGER needed six planetary flybys (one of Earth, two of Venus and three of Mercury) over more than six years. A ceramic-cloth sunshade kept its instruments near room temperature. In orbit it mapped the whole planet and confirmed water ice and dark organic-rich material in permanently shadowed polar craters. It also found strange shallow pits called hollows and a magnetic field shifted toward the north.",
    discoveries: ["Water ice in permanently shadowed craters at Mercury's poles", "Mysterious shallow pits called ‘hollows’ that seem to be forming even now", "Mercury's surface is surprisingly rich in substances like sulfur and potassium"],
    legacy: "BepiColombo, a joint European–Japanese mission, is following up on MESSENGER's discoveries.",
    fun: "Its final crash made a new crater about 16 m wide, but nobody could watch: it hit the side of Mercury facing away from Earth.",
    media: [
      { f: "PIA19445.jpg", id: "PIA19445", cap: "One of MESSENGER's last images, taken the day before it hit Mercury." },
      { f: "PIA18145.jpg", id: "PIA18145", cap: "Artist's impression of MESSENGER in orbit around Mercury." }
    ],
    quiz: "I was the first spacecraft to orbit the planet closest to the Sun."
  },
  {
    id: "pioneervenus", world: "deep", type: "impactor", status: "impact", body: "Venus",
    name: "Pioneer Venus probes", nick: "Pioneer Venus Multiprobe", mission: "Pioneer Venus 2", year: 1978,
    heading: "Scattered across Venus", fixedPlace: "Venus",
    dates: { launch: "8 Aug 1978", arrive: "9 Dec 1978 (entry)", last: "9 Dec 1978" },
    planned: "Drop four probes through Venus's clouds. None were built to survive hitting the ground.",
    actual: "One probe survived the impact and kept sending data from the surface for 67 minutes.",
    stats: [["Probes", "4 + carrier"], ["Built to survive landing", "No"], ["Signal from surface", "67 min"]],
    ghost: "We were four probes, one big and three small, dropped into the thick clouds of Venus at different spots. We measured the air all the way down. We were never meant to survive the landing, but one of us, the Day Probe, did. It whispered data from the scorching surface for 67 minutes before it fell silent.",
    story: "Pioneer Venus dropped four probes into Venus's thick, hot atmosphere to study its clouds and air. Amazingly, one probe survived crashing into the ground and kept talking for over an hour.",
    deep: "The large Sounder probe and three small probes (North, Day and Night) entered Venus's atmosphere at widely separated points on 9 December 1978, while the carrier bus burned up high above, measuring the upper atmosphere. They profiled the temperature, pressure, winds and sulfuric-acid clouds. The large probe measured a deuterium-to-hydrogen ratio far above Earth's, a sign that Venus may once have had much more water.",
    discoveries: ["Venus's clouds are layers of sulfuric acid droplets", "Only a small fraction of sunlight reaches the surface", "Clues that Venus may once have had far more water"],
    legacy: "NASA's DAVINCI mission plans to drop a new probe through Venus's atmosphere, building on what Pioneer Venus learned.",
    fun: "The surface of Venus is about 460 °C, hot enough to melt lead.",
    media: [
      { f: "ARC-1978-AC78-0238.jpg", id: "ARC-1978-AC78-0238", cap: "Artist's concept of the Pioneer Venus probes just after release, approaching Venus." },
      { f: "ARC-1978-AC78-9245.jpg", id: "ARC-1978-AC78-9245", cap: "Pioneer Venus multiprobe artwork." }
    ],
    quiz: "One of our probes survived crashing into Venus and talked for over an hour."
  },
  {
    id: "galileo", world: "deep", type: "probe", status: "impact", body: "Jupiter",
    name: "Galileo & its probe", nick: "Galileo", mission: "Galileo", year: 1995,
    heading: "Inside Jupiter", fixedPlace: "Jupiter's atmosphere",
    dates: { launch: "18 Oct 1989", arrive: "Jupiter: 7 Dec 1995", last: "21 Sep 2003 (plunged into Jupiter)" },
    planned: "Drop a probe into Jupiter and orbit the planet for about two years.",
    actual: "The probe sent data for 58 minutes, and the orbiter worked for almost 8 years.",
    stats: [["Probe signal", "~58 min"], ["Years orbiting Jupiter", "~8"], ["Moons studied", "Io, Europa, Ganymede, Callisto"]],
    ghost: "My main antenna got stuck and never opened, so I had to send everything home through a tiny backup antenna. I still sent a probe into Jupiter and found hints of a salty ocean under Europa's ice. To keep Earth germs away from that ocean, my team steered me into Jupiter at the end.",
    story: "Galileo was the first spacecraft to orbit Jupiter. It dropped a small probe into the giant planet's clouds, and it found that the moon Europa probably hides an ocean under its ice.",
    deep: "Galileo's probe plunged into Jupiter on 7 December 1995 and returned data for about 58 minutes before heat and pressure silenced it. Even though its high-gain antenna failed to unfurl, the orbiter made dozens of flybys of Jupiter's large moons, finding strong evidence for a salty liquid-water ocean beneath Europa's surface and a magnetic field at Ganymede. In 2003 it was deliberately sent into Jupiter so it could never crash onto Europa and contaminate it.",
    discoveries: ["Evidence of a salty ocean under Europa's icy shell", "Ganymede is the only moon known to make its own magnetic field", "Measured Jupiter's winds, clouds and chemistry from the inside"],
    legacy: "NASA's Europa Clipper mission is now on its way to study the ocean that Galileo discovered.",
    fun: "On the way to Jupiter, Galileo discovered Dactyl, the first moon ever found orbiting an asteroid.",
    media: [
      { f: "PIA18176.jpg", id: "PIA18176", cap: "Artist's rendering of Galileo flying past Jupiter's volcanic moon Io." },
      { f: "S89-44175.jpg", id: "S89-44175", cap: "Labelled drawing of the Galileo probe that dived into Jupiter." },
      { f: "PIA00708.jpg", id: "PIA00708", cap: "Jupiter's Great Red Spot in roughly true colour, taken by Galileo in 1996." }
    ],
    quiz: "I found hints of an ocean under Europa's ice, then dived into Jupiter to protect it."
  },
  {
    id: "cassini", world: "deep", type: "probe", status: "impact", body: "Saturn",
    name: "Cassini", mission: "Cassini–Huygens", year: 2017,
    heading: "Inside Saturn", fixedPlace: "Saturn's atmosphere",
    dates: { launch: "15 Oct 1997", arrive: "Saturn orbit: 1 Jul 2004", last: "15 Sep 2017 (Grand Finale plunge)" },
    planned: "A four-year tour of Saturn, its rings and moons.",
    actual: "Explored Saturn for 13 years, then dived between the planet and its rings 22 times before plunging in.",
    stats: [["Years at Saturn", "13"], ["Grand Finale dives", "22"], ["Huygens landed on", "Titan"]],
    ghost: "For 13 years I circled Saturn. I carried the Huygens probe, which landed on the moon Titan. I saw geysers of ice shooting from tiny Enceladus. When my fuel ran low, I dived between Saturn and its rings 22 times, then plunged into the planet, sending data until the very last second.",
    story: "Cassini explored Saturn, its rings and its moons for 13 years. It discovered that the small moon Enceladus sprays out water from an ocean hidden under its ice.",
    deep: "Cassini delivered the European Space Agency's Huygens probe, which landed on Titan in January 2005 and revealed a world of methane rivers and lakes. Cassini discovered water-ice plumes erupting from Enceladus's south pole, fed by a global subsurface ocean. In its 2017 Grand Finale it threaded the gap between Saturn and the rings, then entered Saturn's atmosphere on 15 September 2017, so it could never contaminate Enceladus or Titan.",
    discoveries: ["Enceladus sprays water from an ocean under its ice", "Titan has lakes and seas of liquid methane and ethane", "Close-up measurements of Saturn's rings and gravity"],
    legacy: "Its ocean discoveries make Enceladus and Titan top places to search for life. NASA's Dragonfly helicopter is headed to Titan.",
    fun: "Cassini's final signal reached Earth about 83 minutes after it was sent: that's how far away Saturn is.",
    media: [
      { f: "PIA21439.jpg", id: "PIA21439", cap: "Illustration of Cassini diving between Saturn and its innermost rings." },
      { f: "PIA21895.jpg", id: "PIA21895", cap: "Cassini's final image: the spot where it would enter Saturn's atmosphere." },
      { f: "PIA14599.jpg", id: "PIA14599", cap: "A plume of water ice shooting from Saturn's moon Enceladus, seen by Cassini." }
    ],
    quiz: "I saw ice geysers on Enceladus and dived into Saturn at the end of my mission."
  },
  {
    id: "dawn", world: "deep", type: "probe", status: "silent", body: "Ceres",
    name: "Dawn", mission: "Dawn", year: 2018,
    heading: "Still orbiting the dwarf planet Ceres", fixedPlace: "In orbit around Ceres",
    dates: { launch: "27 Sep 2007", arrive: "Ceres orbit: 6 Mar 2015", last: "1 Nov 2018 (mission ended)" },
    planned: "Orbit the giant asteroid Vesta, then the dwarf planet Ceres.",
    actual: "Did both, becoming the first spacecraft to orbit two different worlds beyond Earth.",
    stats: [["Worlds orbited", "2 (Vesta, Ceres)"], ["Engine type", "Ion"], ["Still in orbit", "Yes"]],
    ghost: "My ion engines pushed me with a force about as light as a sheet of paper resting on your hand, but they never stopped for long. Little by little I reached the asteroid Vesta, then the dwarf planet Ceres. I found that Ceres's bright spots are salt. My fuel for steering ran out in 2018, and now I circle Ceres in silence.",
    story: "Dawn used gentle ion engines to visit two worlds in the asteroid belt: Vesta and Ceres. It discovered that the mysterious bright spots on Ceres are salt left behind by salty water.",
    deep: "Dawn's xenon ion engines gave it a larger total change in speed than any spacecraft had achieved on its own. It orbited Vesta in 2011–2012 and Ceres from 2015, finding that Ceres's bright spots in Occator crater are mostly sodium carbonate deposited by brine from below, evidence that Ceres had, and may still have, salty liquid underground. When it ran out of hydrazine for pointing in 2018, it was left in a stable orbit around Ceres expected to last for decades.",
    discoveries: ["Ceres's bright spots are salt deposits from salty water", "Ceres may still have pockets of brine underground", "Vesta has a giant impact basin at its south pole"],
    legacy: "Dawn showed that ion engines can carry a spacecraft to several destinations, a technique future missions are using.",
    fun: "Dawn is still orbiting Ceres. It's a ghost that never landed.",
    media: [
      { f: "PIA21078.jpg", id: "PIA21078", cap: "Occator crater, home of Ceres's brightest spots, on the edge of the dwarf planet." },
      { f: "PIA19376.jpg", id: "PIA19376", cap: "Artist's rendering of Dawn with its long solar panels." }
    ],
    quiz: "I used ion engines to orbit two worlds, and I'm still circling Ceres."
  },
  {
    id: "magellan", world: "deep", type: "orbiter", status: "impact", body: "Venus",
    name: "Magellan", mission: "Magellan", year: 1994,
    heading: "Burned up in Venus's sky", fixedPlace: "Venus's atmosphere (some pieces may have reached the ground)",
    dates: { launch: "4 May 1989", arrive: "Venus orbit: 10 Aug 1990", last: "13 Oct 1994" },
    planned: "Map Venus through its clouds with radar.",
    actual: "Mapped 98% of the planet, tested a new braking trick, then was sent into the atmosphere.",
    stats: [["Surface mapped", "98%"], ["Launched from", "Space Shuttle"], ["Years at Venus", "4"]],
    ghost: "Venus hides under clouds so thick no camera can see through them, so I used radar instead. I bounced radio waves off the ground and turned the echoes into maps of volcanoes, lava plains and craters. At the end, my team turned my solar panels like the sails of a windmill and let me fall into the clouds I had seen through.",
    story: "Magellan was launched from a Space Shuttle and flew to Venus. It used radar to see through the thick clouds and made a map of almost the whole planet.",
    deep: "Magellan's synthetic-aperture radar mapped 98% of Venus at resolutions around 100–150 m, revealing a young surface shaped by volcanism, with few impact craters and no sign of Earth-like plate tectonics. In 1993 it became the first planetary spacecraft to use aerobraking to lower its orbit, a technique later used at Mars. In October 1994 controllers angled its solar panels to measure atmospheric drag in a final 'windmill' experiment before it entered the atmosphere.",
    discoveries: ["Venus is covered in volcanoes and old lava flows", "Its surface is young: few craters, all fairly fresh", "First test of aerobraking at another planet"],
    legacy: "Aerobraking, first tried by Magellan, helped later orbiters like Mars Global Surveyor save fuel.",
    fun: "Magellan was the first planetary spacecraft ever launched from a Space Shuttle.",
    media: [
      { f: "s30-72-047.jpg", id: "s30-72-047", cap: "Magellan, with its upper-stage rocket, is released from Space Shuttle Atlantis on 4 May 1989." },
      { f: "PIA00478.jpg", id: "PIA00478", cap: "A global view of Venus built from Magellan's radar maps." }
    ],
    quiz: "I saw through Venus's clouds with radar and mapped almost the whole planet."
  },
  {
    id: "mariner9", world: "deep", type: "orbiter", status: "silent", body: "Mars",
    name: "Mariner 9", mission: "Mariner 9", year: 1972,
    heading: "Probably still orbiting Mars", fixedPlace: "Orbit around Mars, silent since 1972",
    dates: { launch: "30 May 1971", arrive: "Mars orbit: 14 Nov 1971", last: "27 Oct 1972 (switched off)" },
    planned: "Orbit Mars and map its surface.",
    actual: "Became the first spacecraft to orbit another planet and mapped 85% of Mars.",
    stats: [["First to orbit", "another planet"], ["Mars mapped", "85%"], ["Photos sent", "7,329"]],
    ghost: "I was the first spacecraft ever to circle another planet. When I arrived, a dust storm covered all of Mars. Only the tops of four giant volcanoes poked through. So I waited. When the dust cleared, I showed you canyons, dry riverbeds and the biggest volcano in the solar system.",
    story: "Mariner 9 was the first spacecraft to orbit another planet. It arrived in the middle of a giant dust storm, waited for it to end, and then mapped most of Mars.",
    deep: "Mariner 9 reached Mars on 14 November 1971, narrowly ahead of the Soviet Mars 2 and 3 orbiters. A global dust storm hid the surface until early 1972; afterwards it mapped 85% of the planet, revealing Olympus Mons, the canyon system later named Valles Marineris in its honour, and dried channels suggesting water once flowed. It was switched off on 27 October 1972 in an orbit expected to last about 50 years, so it may by now have fallen into the atmosphere.",
    discoveries: ["Olympus Mons, the largest volcano in the solar system", "Valles Marineris, a canyon about 4,000 km long", "Dry riverbeds: water once flowed on Mars"],
    legacy: "Its maps were used to choose the landing sites for the Viking landers.",
    fun: "The giant canyon system it found was named after it: Valles Marineris means 'Mariner Valleys'.",
    media: [
      { f: "PIA02999.jpg", id: "PIA02999", cap: "Mariner 9's view of Olympus Mons standing above the global dust storm." },
      { f: "PIA02998.jpg", id: "PIA02998", cap: "The canyon system emerging as the dust storm cleared." }
    ],
    quiz: "I was the first spacecraft to orbit another planet, and I waited out a dust storm."
  },
  {
    id: "mco", world: "deep", type: "orbiter", status: "lost", body: "Mars",
    name: "Mars Climate Orbiter", mission: "Mars Surveyor '98", year: 1999,
    heading: "Lost at Mars", fixedPlace: "Burned up at Mars, or skipped back out into orbit around the Sun",
    dates: { launch: "11 Dec 1998", arrive: "23 Sep 1999 (arrival)", last: "23 Sep 1999" },
    planned: "Study Mars's weather and relay messages for Mars Polar Lander.",
    actual: "Arrived far too low because of a mix-up between two kinds of units, and was never heard from again.",
    stats: [["Planned height", "~150 km"], ["Actual height", "~57 km"], ["Cause", "Mixed-up units"]],
    ghost: "One computer told the other how hard my thrusters pushed in pounds. The other computer thought the numbers were in newtons. Nobody noticed. The tiny mistake grew and grew on my nine-month trip, and I reached Mars far too low. I slipped behind the planet and never came out.",
    story: "Mars Climate Orbiter was lost because two teams used different units, like one using inches and the other centimetres. Its path was a little off, and it flew much too close to Mars.",
    deep: "Ground software produced thruster impulse data in pound-force seconds, while the navigation software expected newton-seconds, a factor of about 4.45. The small, repeated error in modelling thruster firings went unnoticed during the cruise. At orbit insertion the spacecraft passed about 57 km above the surface instead of the intended ~150 km, and contact was lost. The review board's findings reshaped NASA's checks on software interfaces and navigation.",
    discoveries: ["(No science returned): its loss became engineering's most famous lesson in checking units"],
    legacy: "Engineering and science students around the world still learn its story as a warning: always check your units.",
    fun: "1 pound-force is about 4.45 newtons. That small difference was enough to lose a whole spacecraft.",
    media: [{ f: "KSC-98pc1079.jpg", id: "KSC-98pc1079", cap: "Technicians unpack Mars Climate Orbiter at Kennedy Space Center before launch, 1998." }],
    quiz: "I was lost at Mars because two teams used different units."
  },
  {
    id: "mgs", world: "deep", type: "orbiter", status: "lost", body: "Mars",
    name: "Mars Global Surveyor", mission: "Mars Global Surveyor", year: 2006,
    heading: "Still orbiting Mars, silent", fixedPlace: "Orbit around Mars",
    dates: { launch: "7 Nov 1996", arrive: "Mars orbit: 12 Sep 1997", last: "2 Nov 2006" },
    planned: "Map Mars from orbit for about two years.",
    actual: "Worked for more than nine years, longer than any Mars spacecraft before it.",
    stats: [["Planned", "~2 years"], ["Actual", "9+ years"], ["Photos", "240,000+"]],
    ghost: "I mapped Mars for nine years. I measured the height of the whole planet with a laser and took over 240,000 pictures. Then a mistake in a command sent months earlier made me turn one of my batteries towards the Sun. It overheated, and I went quiet. I'm still up here, circling.",
    story: "Mars Global Surveyor made the first detailed map of the heights and depths of Mars, using a laser. It also took photos of gullies that looked like water had flowed down them recently.",
    deep: "MGS used aerobraking to settle into its mapping orbit, then spent years mapping Mars with its Mars Orbiter Laser Altimeter (MOLA), camera, thermal spectrometer and magnetometer. MOLA produced the first precise global topographic map, and the magnetometer found stripes of magnetism in the ancient crust. Its camera imaged young gullies and, in 2005, became the first spacecraft to photograph another spacecraft orbiting Mars. A faulty command uploaded in June 2006 led to a battery overheating after a routine manoeuvre in November.",
    discoveries: ["The first precise 3D map of the whole of Mars", "Fresh gullies, possibly carved by water", "Ancient magnetic stripes in the crust"],
    legacy: "Its maps guided where Spirit, Opportunity and later missions landed.",
    fun: "It took a photo of Spirit's and Opportunity's tracks from orbit, and even spotted other spacecraft flying around Mars.",
    media: [{ f: "PIA17486.jpg", id: "PIA17486", cap: "Artist's concept of Mars Global Surveyor flying over Mars." }],
    quiz: "I mapped Mars for nine years, until a wrong command made my battery overheat."
  },
  {
    id: "vanguard1", world: "deep", type: "orbiter", status: "silent", body: "Earth",
    name: "Vanguard 1", mission: "Project Vanguard", year: 1964,
    heading: "Still circling Earth", fixedPlace: "Orbit around Earth: the oldest human-made object still up there",
    dates: { launch: "17 Mar 1958", arrive: "Earth orbit: 17 Mar 1958", last: "1964" },
    planned: "Prove that a small satellite could reach orbit, and test solar power in space.",
    actual: "Radioed home for six years, and it's still in orbit more than 65 years later.",
    stats: [["Size", "16 cm across"], ["Mass", "1.5 kg"], ["Expected to stay up", "~240 years"]],
    ghost: "I'm about the size of a grapefruit, and someone famous made fun of me for it. But I was the first satellite to run on sunlight, and I'm still up here. Every satellite launched since has flown beneath me. My radio went quiet in 1964, but I keep going round and round.",
    story: "Vanguard 1 was one of the very first satellites, small enough to hold in your hands. It was the first to use solar panels, and it's still circling Earth today.",
    deep: "Vanguard 1 was the fourth artificial satellite to reach orbit and the first powered by solar cells; its solar-powered transmitter worked until 1964. Tracking how its orbit changed showed that Earth is very slightly pear-shaped. Its high orbit (about 650 × 3,800 km) means it is expected to stay up for roughly another two centuries. The Vanguard programme began under the U.S. Naval Research Laboratory and moved to NASA when NASA was founded in 1958.",
    discoveries: ["Earth is very slightly pear-shaped", "Solar cells can power a satellite for years"],
    legacy: "Almost every satellite since, from weather satellites to the ISS, runs on solar power.",
    fun: "Soviet leader Nikita Khrushchev called it 'the grapefruit satellite'.",
    media: [{ f: "58PD-06149A.jpg", id: "58PD-06149A", cap: "The Vanguard rocket on its launch pad at Cape Canaveral, waiting to launch Vanguard 1 in 1958." }],
    quiz: "I'm the size of a grapefruit and the oldest human-made object still orbiting Earth."
  },
  {
    id: "mariner2", world: "deep", type: "probe", status: "silent",
    name: "Mariner 2", mission: "Mariner 2", year: 1963, orbit: { au: 0.86, ang: 1.2, y: 0.3 },
    heading: "Circling the Sun", fixedPlace: "Orbit around the Sun, between Venus and Earth",
    dates: { launch: "27 Aug 1962", arrive: "Venus flyby: 14 Dec 1962", last: "3 Jan 1963" },
    planned: "Fly past Venus and measure it.",
    actual: "Became the first spacecraft to successfully visit another planet.",
    stats: [["Closest to Venus", "~34,800 km"], ["First", "planetary visit"], ["Mass", "~200 kg"]],
    ghost: "I was the first spacecraft to visit another planet. People hoped Venus might be a warm, steamy jungle world. I measured it and found it scorching hot under its clouds. On the way, I was the first to feel the wind that blows from the Sun. Now I circle the Sun with no one listening.",
    story: "Mariner 2 was the first spacecraft to fly past another planet. It discovered that Venus is extremely hot, not the jungle world some people imagined.",
    deep: "Launched on an Atlas-Agena after its twin Mariner 1 was destroyed at launch, Mariner 2 flew past Venus on 14 December 1962 at about 34,800 km. Its microwave radiometer showed very high surface temperatures, and during the cruise it made the first direct measurements of the solar wind, confirming a continuous stream of charged particles from the Sun. Contact was lost on 3 January 1963; it remains in orbit around the Sun.",
    discoveries: ["Venus is extremely hot beneath its clouds", "The solar wind blows all the time"],
    legacy: "Every mission to the planets since builds on the path Mariner 2 opened.",
    fun: "Its twin, Mariner 1, was destroyed shortly after launch because of a tiny mistake in its guidance equations, often described as a missing hyphen.",
    media: [{ f: "PIA04594.jpg", id: "PIA04594", cap: "Artist's concept of Mariner 2, the first successful interplanetary spacecraft." }],
    quiz: "I was the first spacecraft to visit another planet: Venus, in 1962."
  },
  {
    id: "mariner4", world: "deep", type: "probe", status: "silent",
    name: "Mariner 4", mission: "Mariner 4", year: 1967, orbit: { au: 1.33, ang: 5.6, y: -0.3 },
    heading: "Circling the Sun", fixedPlace: "Orbit around the Sun, between Earth and Mars",
    dates: { launch: "28 Nov 1964", arrive: "Mars flyby: 15 Jul 1965", last: "21 Dec 1967" },
    planned: "Fly past Mars and take the first close-up pictures.",
    actual: "Sent home 21 pictures showing a cratered, Moon-like Mars.",
    stats: [["Pictures", "21 (and part of a 22nd)"], ["Closest to Mars", "~9,800 km"], ["Data speed", "8.3 bits/s"]],
    ghost: "I took the first close-up pictures of another planet. My pictures came home so slowly that people didn't want to wait for the computers. They printed my numbers on strips of paper and coloured them in by hand, like a paint-by-numbers. Mars turned out to be cratered and dry. No canals. No cities.",
    story: "Mariner 4 took the first close-up photos of Mars. Scientists were so excited they coloured in the first picture by hand with pastel chalks before the computers had finished!",
    deep: "Mariner 4 flew past Mars on 14–15 July 1965, returning 21 full images plus part of a 22nd at just 8.33 bits per second; each picture took hours to transmit. Engineers impatient to see the first image pinned printed strips of its brightness values to a board and coloured them with pastel chalks. The images revealed impact craters and a thin atmosphere, ending long-held ideas of a Mars with canals and civilisations. Contact ended in December 1967.",
    discoveries: ["Mars has a cratered surface, more like the Moon than Earth", "Its atmosphere is very thin, mostly carbon dioxide", "No sign of the 'canals' some people believed in"],
    legacy: "The hand-coloured first picture is now a treasured piece of space history at NASA's Jet Propulsion Laboratory.",
    fun: "Its data speed was 8.3 bits per second. A single phone photo today would take days to send that way.",
    media: [
      { f: "PIA14033.jpg", id: "PIA14033", cap: "The first image of Mars from Mariner 4, coloured in by hand from printed numbers." },
      { f: "PIA02979.jpg", id: "PIA02979", cap: "A crater on Mars photographed by Mariner 4 in 1965." }
    ],
    quiz: "My first picture of Mars was coloured in by hand before the computers finished."
  },
  {
    id: "isee3", world: "deep", type: "probe", status: "silent",
    name: "ISEE-3 / ICE", nick: "International Cometary Explorer", mission: "International Sun-Earth Explorer 3", year: 2014, orbit: { au: 0.97, ang: 0.4, y: 0.4 },
    heading: "Circling the Sun near Earth's path", fixedPlace: "Orbit around the Sun, close to Earth's path",
    dates: { launch: "12 Aug 1978", arrive: "Comet Giacobini–Zinner: 11 Sep 1985", last: "16 Sep 2014" },
    planned: "Watch the solar wind from a balance point between the Sun and Earth.",
    actual: "Did that, then was flung to a comet, and was woken up by volunteers 30 years later.",
    stats: [["First to visit", "a comet"], ["Woken by volunteers", "2014"], ["Years in space", "36+"]],
    ghost: "First I watched the solar wind from a quiet spot between the Sun and Earth. Then my team swung me past the Moon again and again and sent me through the tail of a comet: the first spacecraft ever to visit one. In 2014, strangers on the internet raised money, borrowed a giant radio dish and talked to me again.",
    story: "ISEE-3 was the first spacecraft to fly through a comet's tail. Decades later, a team of volunteers raised money online and managed to talk to it again.",
    deep: "ISEE-3 was the first spacecraft placed in a halo orbit around the Sun–Earth L1 point. In 1982–83 a series of lunar flybys redirected it, renamed the International Cometary Explorer, through the tail of Comet Giacobini–Zinner in September 1985, and it later observed Comet Halley from a distance. NASA ended the mission in 1997. In 2014, as its orbit brought it back near Earth, the crowdfunded ISEE-3 Reboot Project used the Arecibo radio telescope to command it. They could not fire its engines, because the nitrogen gas that pushed its fuel was gone, and contact was lost in September 2014.",
    discoveries: ["First direct measurements inside a comet's tail", "First spacecraft to watch the solar wind from the L1 point"],
    legacy: "Spacecraft such as SOHO and DSCOVR now watch the Sun from the same L1 point ISEE-3 pioneered.",
    fun: "It should swing back near Earth again in the 2030s.",
    media: [{ f: "201009100004HQ.jpg", id: "201009100004HQ", cap: "Robert Farquhar (left), who planned ISEE-3's route to the comet, at NASA's 25th-anniversary comet symposium in 2010." }],
    quiz: "I was the first spacecraft to visit a comet, and volunteers woke me up 30 years later."
  },
  {
    id: "kepler", world: "deep", type: "telescope", status: "silent",
    name: "Kepler", mission: "Kepler / K2", year: 2018, orbit: { au: 1.01, ang: 3.9, y: 0.5 },
    heading: "Trailing behind Earth around the Sun", fixedPlace: "Orbit around the Sun, drifting further behind Earth every year",
    dates: { launch: "7 Mar 2009", arrive: "Orbit around the Sun: Mar 2009", last: "15 Nov 2018 (final commands)" },
    planned: "Stare at one patch of sky for 3.5 years to find Earth-sized planets.",
    actual: "Found more than 2,600 confirmed planets over nine and a half years.",
    stats: [["Stars watched", "~150,000"], ["Planets confirmed", "2,600+"], ["Years working", "9.5"]],
    ghost: "I stared at the same patch of sky for years, watching thousands of stars at once. When a star dimmed a tiny bit, a planet was passing in front of it. That's how I found thousands of worlds. When my steering wheels broke, my team used the push of sunlight to balance me. I said goodnight in 2018.",
    story: "Kepler was a space telescope that hunted for planets around other stars. It found thousands of them and showed that most stars have planets.",
    deep: "Kepler used the transit method, measuring tiny drops in starlight as planets passed in front of their stars. After the failure of a second reaction wheel in 2013, engineers balanced it against solar radiation pressure for the extended K2 mission, observing new fields along the ecliptic. It ran out of fuel and was retired on 30 October 2018; its final commands were sent on 15 November 2018, the anniversary of Johannes Kepler's death.",
    discoveries: ["More than 2,600 confirmed planets around other stars", "Most stars have planets, so there are more planets than stars in our galaxy", "Many Earth-sized planets orbit in their star's 'habitable zone'"],
    legacy: "TESS now surveys almost the whole sky for planets, using Kepler's method.",
    fun: "Its final 'goodnight' commands were sent on the anniversary of the death of astronomer Johannes Kepler, its namesake.",
    media: [
      { f: "PIA11824.jpg", id: "PIA11824", cap: "Artist's concept of the Kepler space telescope." },
      { f: "PIA11188.jpg", id: "PIA11188", cap: "Kepler in a clean room at Ball Aerospace before launch." }
    ],
    quiz: "I stared at one patch of sky and found thousands of planets around other stars."
  },
  {
    id: "spitzer", world: "deep", type: "telescope", status: "silent",
    name: "Spitzer Space Telescope", nick: "Spitzer", mission: "Spitzer", year: 2020, orbit: { au: 1.02, ang: 2.0, y: -0.5 },
    heading: "Trailing behind Earth around the Sun", fixedPlace: "Orbit around the Sun, far behind Earth",
    dates: { launch: "25 Aug 2003", arrive: "Orbit around the Sun: Aug 2003", last: "30 Jan 2020 (switched off)" },
    planned: "Observe the universe in infrared light for at least 2.5 years.",
    actual: "Worked for more than 16 years, most of them after its coolant ran out.",
    stats: [["Planned", "2.5+ years"], ["Actual", "16+ years"], ["Coolant ran out", "2009"]],
    ghost: "I saw the universe by its warmth. Infrared light let me see newborn stars hidden in dust and the glow of planets around other suns. I helped discover seven Earth-sized planets around one small star. My coolant ran out, but I kept working for ten more years while I drifted further behind Earth.",
    story: "Spitzer was a space telescope that saw infrared light, the kind of light warm things give off. It helped discover a star with seven Earth-sized planets.",
    deep: "Spitzer was the infrared member of NASA's four Great Observatories. It followed Earth around the Sun rather than orbiting Earth, keeping it away from Earth's heat. In 2005 it made the first direct detection of light from planets outside the solar system, and in 2017 it helped reveal the seven Earth-sized planets of TRAPPIST-1. Its liquid-helium coolant ran out in 2009, but its shortest-wavelength cameras kept working in the 'warm mission' until January 2020.",
    discoveries: ["First direct detection of light from planets around other stars", "Helped find the seven planets of TRAPPIST-1", "Saw stars forming inside dusty clouds"],
    legacy: "The James Webb Space Telescope continues Spitzer's infrared work with a much larger mirror.",
    fun: "It drifted so far behind Earth that, by the end, talking to it meant tilting it more and more steeply towards home.",
    media: [
      { f: "PIA23643.jpg", id: "PIA23643", cap: "Artist's rendering of Spitzer, with the sky behind it shown in infrared light." },
      { f: "PIA11796.jpg", id: "PIA11796", cap: "The spiral galaxy Messier 101 as seen by Spitzer." }
    ],
    quiz: "I saw the universe in infrared light and helped find seven planets around one star."
  },
  {
    id: "stardust", world: "deep", type: "probe", status: "silent",
    name: "Stardust", mission: "Stardust / Stardust-NExT", year: 2011, orbit: { au: 2.0, ang: 3.0, y: 0.3 },
    heading: "Circling the Sun", fixedPlace: "Orbit around the Sun",
    dates: { launch: "7 Feb 1999", arrive: "Comet Wild 2: 2 Jan 2004", last: "24 Mar 2011 (final burn)" },
    planned: "Catch dust from a comet and bring it back to Earth.",
    actual: "Brought comet dust home in 2006, then flew on to visit a second comet.",
    stats: [["Comets visited", "2"], ["Sample landing", "Utah, 2006"], ["Catcher", "Aerogel"]],
    ghost: "I flew through the dust around a comet and caught tiny grains in a catcher made of aerogel, one of the lightest solids ever made. I sent my capsule down to the Utah desert with the first comet dust ever brought to Earth. Then I visited one more comet and burned my last drop of fuel.",
    story: "Stardust caught dust from a comet and sent it back to Earth in a capsule. Scientists found an ingredient of life in it.",
    deep: "Stardust flew through the coma of Comet Wild 2 on 2 January 2004, capturing particles in a tennis-racket-shaped grid of aerogel. Its capsule landed in Utah on 15 January 2006. The samples included minerals that formed at high temperatures near the young Sun, and in 2009 scientists reported the amino acid glycine. As Stardust-NExT it photographed Comet Tempel 1 in 2011, including the crater made by Deep Impact, then fired its engine until its fuel was gone.",
    discoveries: ["Comet dust contains glycine, a building block of proteins", "Comets contain material formed close to the young Sun", "Saw the crater Deep Impact made on Tempel 1"],
    legacy: "Its sample capsule paved the way for asteroid sample-return missions such as OSIRIS-REx.",
    fun: "Its aerogel catcher was more than 99% empty space, so fast-moving dust grains could slow down gently inside it instead of being smashed.",
    media: [
      { f: "PIA03188.jpg", id: "PIA03188", cap: "Stardust's dust collector, filled with blocks of aerogel." },
      { f: "PIA03669.jpg", id: "PIA03669", cap: "The sample capsule after landing in the Utah desert, January 2006." },
      { f: "PIA03182.jpg", id: "PIA03182", cap: "Artist's rendering of the Stardust spacecraft." }
    ],
    quiz: "I caught comet dust in aerogel and sent it back to Earth."
  }
];

/* Epitaphs: one line each, in the machine's own voice, like words carved on a memorial.
   Many are adapted from "The Silent Fleet" in Abandoned, But Not Forgotten (Chetan Kumar G).
   Machines that are still working get a "not yet" line instead. */
const EPITAPHS = {
  ranger7: "I was built to fall, and I took pictures all the way down.",
  surveyor1: "I proved the Moon could hold you up.",
  surveyor3: "Two and a half years later, someone came to visit.",
  apollo11: "Here men from the planet Earth first set foot upon the Moon.",
  apollo12: "We landed a short walk from a robot that had waited for us since 1967.",
  apollo14: "Somewhere near me, two golf balls are still waiting to be found.",
  apollo15: "The first car on the Moon, still parked at Hadley.",
  apollo16: "A family photo lies in the dust beside me.",
  apollo17: "The last car on the Moon, parked right where its drivers left it.",
  sivb16: "I hid my crater for 43 years.",
  lcross: "I watched my own rocket hit the Moon, then followed it down.",
  grail: "We flew in formation, right to the end.",
  ladee: "I tasted the Moon's thin air, then fell where I could harm no footprints.",
  prospector: "I carried a scientist's ashes to the Moon he never got to visit.",
  viking1: "Someone told me to point my antenna the wrong way.",
  viking2: "I saw frost on Mars.",
  pathfinder: "I bounced onto Mars wrapped in airbags, and opened the door for a rover.",
  sojourner: "The first wheels on another planet.",
  polarlander: "I thought I had already landed.",
  spirit: "Free Spirit.",
  opportunity: "Planned for 90 days. I stayed for fourteen years.",
  phoenix: "I tasted the ice. Then the winter buried me.",
  insight: "I listened to Mars shake, 1,319 times.",
  ingenuity: "Planned for five flights. I flew seventy-two.",
  backshell: "I carried Perseverance down, then let go.",
  curiosity: "Still climbing. Still talking. For now.",
  pioneer10: "I carry a picture of you, in case anyone asks.",
  pioneer11: "I showed you Saturn first.",
  voyager1: "The farthest you have ever reached, still saying hello.",
  voyager2: "Uranus and Neptune have had only one visitor. Me.",
  near: "I was never built to land, but I touched down on an asteroid anyway.",
  deepimpact: "I hit a comet on purpose, on the Fourth of July.",
  newhorizons: "I showed you Pluto's heart, and I'm still going.",
  messenger: "Out of fuel, I flew on the gas that was only meant to push it.",
  pioneervenus: "We weren't built to survive the landing. One of us did anyway.",
  galileo: "I fell into Jupiter so Europa would stay clean.",
  cassini: "I sent you data until the very last second.",
  dawn: "I orbited two worlds, and I'm still holding on to the second.",
  magellan: "I saw through the clouds, then became part of them.",
  mariner9: "I arrived in a storm, and waited for the sky to clear.",
  mco: "Pound-force or newtons? Nobody checked.",
  mgs: "One wrong command, and I turned my battery to the Sun.",
  vanguard1: "I was the size of a grapefruit. I'm still here.",
  mariner2: "I was the first to visit another planet.",
  mariner4: "I sent you 21 pictures of a cratered world.",
  isee3: "In 2014, strangers on the internet woke me up.",
  kepler: "I stared at one patch of sky and found thousands of worlds.",
  spitzer: "I saw the universe by its warmth.",
  stardust: "I brought a comet home."
};
ARTIFACTS.forEach(a => { a.epitaph = EPITAPHS[a.id] || ""; });

/* Ask the Archive: short answers to specific questions, mostly about Opportunity and her twin.
   Adapted from ASTRA's answers in Abandoned, But Not Forgotten (Chetan Kumar G), checked against
   NASA/JPL Mars Exploration Rover records. mer: true = only used when the question is about the
   Mars Exploration Rovers (by name, or "she/her" right after a question about Opportunity). */
const ASK_FAQ = [
  { q: "Why do we keep going to Mars?", mer: false, ids: ["opportunity", "curiosity"],
    re: /why (do we |does nasa |did nasa |)(keep )?(go(ing)? to|explor\w*|send\w* (robots|rovers|things|machines) to|study\w*) mars|why (is )?mars (so )?(important|interesting|special)/,
    a: "Mars once had rivers, lakes and maybe even seas. That's why we keep sending robots there: to find out whether it could ever have supported life. It's also the planet most like Earth that people might one day visit." },
  { q: "How far away is Mars?", mer: false, ids: ["opportunity", "ingenuity"],
    re: /how far (away )?is mars|distance (to|from earth to|between earth and) mars|how long .*(signal|message|radio|light).* mars|joystick/,
    a: "It depends on where both planets are in their orbits. At its closest, Mars is about **55 million km** from Earth; at its farthest, about **400 million km**. A radio message takes **3 to 22 minutes** to cross that gap, so nobody can drive a Mars rover with a joystick. Drivers plan each day's moves and send them in one go." },
  { q: "Did Opportunity really say “My battery is low and it's getting dark”?", mer: false, ids: ["opportunity"],
    re: /battery is low|getting dark|(opportunity|oppy).*(last (words|message)|final (words|message))/,
    a: "No. **“My battery is low and it's getting dark”** was a journalist's poetic summary of her final data. Her real last transmission, on 10 June 2018, was just numbers: very low power and a sky darkened by a planet-wide dust storm. The line still sums up what happened, but it isn't a quote." },
  { q: "How big was Opportunity?", mer: true, ids: ["opportunity"],
    re: /how (big|tall|heavy|large|wide)|how long was (she|it|opportunity|oppy)$|\bsize\b|weigh|\bmass\b/,
    a: "About the size of a golf cart: **1.6 m long, 2.3 m wide and 1.5 m tall**, with a mass of **185 kg**. Her twin Spirit was identical." },
  { q: "Who built Opportunity?", mer: true, ids: ["opportunity", "spirit"],
    re: /who (built|made|designed|drove|controlled|ran)|\bjpl\b|which (lab|team|company)|engineers/,
    a: "NASA's **Jet Propulsion Laboratory (JPL)** in Pasadena, California built both Mars Exploration Rovers, and a team there drove Opportunity from Earth for more than 14 years. Two of her science instruments came from teams in Germany." },
  { q: "How did Opportunity last so long?", mer: true, ids: ["opportunity"],
    re: /(last|survive|keep going|work\w*) (so|for so) long|how did (she|it|opportunity) (last|survive|keep)|dust devils?|clean\w* (her|the|its) (solar )?panels/,
    a: "Partly luck: Martian winds and **dust devils** kept blowing dust off her solar panels, giving her power back. The rest was her team. They drove carefully, saved power through winters and storms, and kept finding clever fixes as parts wore out. She was built for 90 sols and lasted 5,111." },
  { q: "Could Opportunity ever wake up?", mer: true, ids: ["opportunity"],
    re: /wake (up|her|it)|revive|come back|fix (her|it)|back to life|ever (work|talk|move) again|rescue/,
    a: "Probably not. NASA sent her more than 1,000 recovery commands over eight months before ending the mission on 13 February 2019. After years of extreme cold, her batteries and electronics are almost certainly damaged, and her panels are coated in dust. One day, astronauts might visit her." },
  { q: "What was Opportunity's “amnesia” problem?", mer: true, ids: ["opportunity"],
    re: /amnesia|flash (memory|storage)|forget|memory (wore|problem|fault)/,
    a: "After more than ten years, her flash memory started to wear out and cause resets. In 2015 her team switched her to **“amnesia” mode**: she kept each day's data only in her short-term memory (RAM) and sent it home before going to sleep, when it would be forgotten." },
  { q: "What was Opportunity's brain?", mer: true, ids: ["opportunity"],
    re: /brain|computer|processor|\bcpu\b|\bram\b|memory|think/,
    a: "A **RAD6000** computer, hardened against space radiation. It ran at just **20 MHz** with **128 MB** of memory and 256 MB of flash storage, thousands of times slower than a phone, and it was enough to drive across Mars for 14 years." },
  { q: "How did Opportunity stay warm?", mer: true, ids: ["opportunity"],
    re: /warm|cold|heat(er|ing)?\b|freez|temperature|at night/,
    a: "Mars nights can drop below **−100 °C**. Her electronics sat inside a gold-painted **Warm Electronics Box**, insulated with **aerogel**, one of the lightest solids ever made. Eight tiny heater units, each with a pellet of plutonium giving off about 1 watt of heat, kept vital parts from freezing, and electric heaters did the rest." },
  { q: "How did Opportunity talk to Earth?", mer: true, ids: ["opportunity"],
    re: /how did (she|it|opportunity|oppy) (talk|communicate|send|stay in touch)|communicat|antenna|radio|phone home|contact (with )?earth/,
    a: "Mostly through **orbiters**. She radioed her data to spacecraft like Mars Odyssey and later Mars Reconnaissance Orbiter as they passed overhead, and they relayed it home. She could also talk straight to NASA's **Deep Space Network** on Earth with her steerable dish antenna, and had a low-gain antenna as a backup." },
  { q: "Why did Opportunity use solar power, not nuclear?", mer: true, ids: ["opportunity", "curiosity"],
    re: /solar|nuclear|power|batter(y|ies)|energy|electric/,
    a: "Solar panels were lighter and cheaper for a rover her size, and her mission was only meant to last 90 days. Her panels covered about **1.3 m²**, and two lithium-ion batteries carried her through each night. Bigger rovers like **Curiosity** and Perseverance carry nuclear power sources instead, so dust storms can't switch them off." },
  { q: "What were Opportunity's wheels like?", mer: true, ids: ["opportunity"],
    re: /wheels?|suspension|rocker|bogie|how fast|speed|drive (over|on) rocks/,
    a: "She had **six aluminium wheels** about 25 cm across, each with its own motor, on a **rocker-bogie** suspension that kept all six on the ground over rocks. Her top speed was about **5 cm a second**, slower than a tortoise." },
  { q: "What cameras did Opportunity have?", mer: true, ids: ["opportunity"],
    re: /cameras?|pancam|navcam|hazcam|\beyes\b|panorama|photos? (did|could) (she|it)/,
    a: "She had nine cameras. **Pancam**, twin colour cameras on her mast about 1.5 m up, took her famous panoramas. **Navcam** helped drivers plan routes, and **Hazcams** front and back let her steer herself around obstacles. A **Microscopic Imager** on her arm worked like a geologist's hand lens." },
  { q: "What tools were on Opportunity's arm?", mer: true, ids: ["opportunity"],
    re: /\barm\b|rock abrasion|\brat\b|grind|drill|tools?|spectrometer|mini.?tes|how did (she|it|opportunity) (find|identify|study|tell)/,
    a: "Her robotic arm held four tools: the **Microscopic Imager**, two spectrometers that measured what rocks were made of (APXS and a Mössbauer spectrometer for iron minerals), and the **RAT**, a Rock Abrasion Tool that ground away the weathered surface to see inside. Inside her body, **Mini-TES** identified minerals from a distance by their infrared glow." },
  { q: "What rocket launched Opportunity?", mer: true, ids: ["opportunity"],
    re: /(what|which) rocket|rocket .*launch|delta|cape canaveral|lift.?off|launch pad/,
    a: "A **Delta II 7925H**, the “Heavy” version with nine bigger solid boosters around its core. She lifted off at night on **7 July 2003** (8 July in universal time) from Space Launch Complex 17B at Cape Canaveral, Florida." },
  { q: "How long did Opportunity's trip to Mars take?", mer: true, ids: ["opportunity"],
    re: /how long .*(trip|journey|get to mars|travel|fly|reach mars)|cruise/,
    a: "About **six and a half months**, from launch on 7 July 2003 to landing on 25 January 2004. She travelled roughly **456 million km** on a curved path around the Sun, not in a straight line." },
  { q: "Did Opportunity have a twin?", mer: false, ids: ["spirit", "opportunity"],
    re: /(opportunity|oppy).*(twin|sister|brother)|(twin|sister) of opportunity|twin rovers?/,
    a: "Yes: **Spirit**. The two rovers were identical. Spirit landed three weeks earlier, on 4 January 2004, in Gusev crater on the other side of Mars. She got stuck in soft sand in 2009 and went silent in March 2010. Opportunity kept going for eight more years." },
  { q: "What was the Martian marathon?", mer: false, ids: ["opportunity"],
    re: /marathon|longest (drive|distance)|lunokhod|how far did (she|it|opportunity|oppy) (drive|go|travel|roll)|total distance/,
    a: "On **24 March 2015**, Opportunity's total distance passed **42.195 km**: the first marathon on another world. The year before, she had beaten the Soviet Lunokhod 2 rover's 1973 record for the farthest drive on another world. Her team on Earth celebrated by running a relay marathon of their own. She finished with **45.16 km**." },
  { q: "Did Opportunity find a meteorite?", mer: false, ids: ["opportunity"],
    re: /meteorite|heat shield rock/,
    a: "Yes. In January 2005, right next to her own discarded heat shield, she found a basketball-sized iron meteorite nicknamed **Heat Shield Rock**: the first meteorite ever identified on another planet." },
  { q: "Did Opportunity ever get stuck?", mer: true, ids: ["opportunity"],
    re: /stuck|purgatory|sand (dune|ripple|trap)/,
    a: "Yes. In 2005 her wheels dug into a sand ripple nicknamed **Purgatory Dune**. Engineers practised escape moves on a test rover on Earth, and for about five weeks she inched out a few centimetres at a time. She got free. (Her twin Spirit wasn't so lucky in 2009.)" },
  { q: "How did Opportunity land?", mer: true, ids: ["opportunity", "pathfinder"],
    re: /how did (she|it|opportunity|oppy) (land|get down|touch down)|airbags?|bounce|hole.?in.?one|six minutes of terror/,
    a: "In about six minutes. Her heat shield slowed her from about **19,000 km/h**, a parachute opened, and small rockets fired. Then giant **airbags** inflated around her and she bounced across the ground before rolling into tiny **Eagle crater**. Scientists called it a hole-in-one. Open her dossier to watch it as an animation." }
];

/* Story chapters for "Ghost Logs" narrative mode. Each chapter features an artifact. */
const CHAPTERS = [
  { id: "ranger7",     title: "The one built to fall",            kicker: "1964 · The Moon" },
  { id: "surveyor3",   title: "The robot that had visitors",       kicker: "1967 · The Moon" },
  { id: "apollo11",    title: "The mirror that still answers",     kicker: "1969 · The Moon" },
  { id: "apollo17",    title: "The last car on the Moon",          kicker: "1972 · The Moon" },
  { id: "viking1",     title: "The first eyes on Mars",            kicker: "1976 · Mars" },
  { id: "voyager1",    title: "The farthest traveller",            kicker: "1977 → today · Deep space" },
  { id: "sojourner",   title: "The microwave-sized pioneer",       kicker: "1997 · Mars" },
  { id: "spirit",      title: "The rover with the broken wheel",   kicker: "2004 · Mars" },
  { id: "opportunity", title: "Fourteen years past its bedtime",   kicker: "2004 · Mars" },
  { id: "phoenix",     title: "The one that tasted ice",           kicker: "2008 · Mars" },
  { id: "insight",     title: "The planet's doctor",               kicker: "2018 · Mars" },
  { id: "ingenuity",   title: "Five flights planned. Seventy-two flown.", kicker: "2021 · Mars" }
];

/* Badges (art from the Fantasy RPG UI Kit asset pack). */
const BADGES = [
  { id: "moon3",   icon: "star",    name: "Moonwalker",          how: "Open 3 Moon dossiers" },
  { id: "mars3",   icon: "gem",     name: "Red Planet Ranger",   how: "Open 3 Mars dossiers" },
  { id: "deep2",   icon: "bolt",    name: "Interstellar Listener", how: "Open 2 Deep Space dossiers" },
  { id: "story",   icon: "book",    name: "Ghost Log Reader",    how: "Read 4 Ghost Log chapters" },
  { id: "voice",   icon: "speaker", name: "Mission Narrator",    how: "Use Read Aloud once" },
  { id: "quiz",    icon: "trophy",  name: "Archive Expert",      how: "Score 6+ in the Who Am I? quiz" },
  { id: "explore", icon: "map",     name: "Orbit Pilot",         how: "Visit the 3D Explore mode" },
  { id: "all",     icon: "shield",  name: "Keeper of the Archive", how: "Open every dossier" }
];

/* 3D models — NASA 3D Resources (github.com/nasa/NASA-3D-Resources), public domain.
   Some models show a twin or a sister craft; the note says so. */
const MODEL_SOURCE = "https://github.com/nasa/NASA-3D-Resources";
const MODELS = {
  apollo11:   { file: "apollo-lm.glb", title: "Apollo Lunar Module", note: "The whole lunar module. Only the gold-wrapped bottom half (the descent stage) stayed on the Moon — the top half carried the astronauts back to orbit." },
  apollo12:   { file: "apollo-lm.glb", title: "Apollo Lunar Module", note: "Apollo 12's lunar module Intrepid looked like this. Its descent stage is still at the site, next to the science station." },
  apollo14:   { file: "apollo-lm.glb", title: "Apollo Lunar Module", note: "Apollo 14's lunar module Antares looked like this. Its descent stage is still at Fra Mauro." },
  sivb16:     { file: "saturn-v.glb", title: "Saturn V rocket", note: "The S-IVB is the third stage — the section just below the spacecraft at the top. After sending Apollo 16 to the Moon, it was crashed into the surface." },
  viking1:    { file: "viking-lander.glb", title: "Viking Lander", note: "Viking 1 and Viking 2 were identical twins." },
  viking2:    { file: "viking-lander.glb", title: "Viking Lander", note: "Viking 1 and Viking 2 were identical twins." },
  spirit:     { file: "mer.glb", title: "Mars Exploration Rover", note: "A simple model of the Mars Exploration Rover. Spirit and Opportunity were identical twins." },
  opportunity:{ file: "mer.glb", title: "Mars Exploration Rover", note: "A simple model of the Mars Exploration Rover. Spirit and Opportunity were identical twins." },
  insight:    { file: "insight.glb", title: "InSight Lander", note: "InSight with its robotic arm and solar panels deployed, as it sat on Mars." },
  ingenuity:  { file: "ingenuity.glb", title: "Ingenuity Mars Helicopter", note: "Its two rotors spin in opposite directions, about 2,500 times a minute." },
  ladee:      { file: "ladee.glb", title: "LADEE", note: "The spacecraft that skimmed the Moon to study its thin atmosphere." },
  pioneer10:  { file: "pioneer.glb", title: "Pioneer 10", note: "The famous plaque is bolted to the struts that hold up the antenna." },
  pioneer11:  { file: "pioneer.glb", title: "Pioneer 10 / 11", note: "This model is Pioneer 10. Pioneer 11 was almost identical." },
  voyager1:   { file: "voyager.glb", title: "Voyager", note: "Voyager 1 and 2 are twins. The Golden Record is mounted on the side of the main body." },
  voyager2:   { file: "voyager.glb", title: "Voyager", note: "Voyager 1 and 2 are twins. The Golden Record is mounted on the side of the main body." },
  near:       { file: "near.glb", title: "NEAR Shoemaker", note: "It had no landing legs — it touched down on Eros on the edges of its solar panels and body." },
  deepimpact: { file: "deep-impact.glb", title: "Deep Impact", note: "The whole spacecraft. The impactor is the smaller part that separated and hit comet Tempel 1; the flyby craft watched." }
};
MODELS.curiosity = { file: "curiosity.glb", title: "Curiosity rover", note: "About the size of a small car. This model shows its camera mast folded down, the way it travelled to Mars. On Mars the mast stands up, making the rover about 2.2 m tall, and its laser can zap rocks up to 7 m away." };
MODELS.messenger = { file: "messenger.glb", title: "MESSENGER", note: "The big white shield is its sunshade, which kept the instruments near room temperature while Mercury's sunlight is about 11 times stronger than Earth's." };
MODELS.galileo = { file: "galileo.glb", title: "Galileo", note: "Its big umbrella-like antenna never fully opened in space, so the team sent everything home through a small backup antenna." };
MODELS.cassini = { file: "cassini.glb", title: "Cassini–Huygens", note: "The gold disc on its side is the Huygens probe, which separated and landed on Saturn's moon Titan in 2005." };
MODELS.dawn = { file: "dawn.glb", title: "Dawn", note: "Its solar panels stretch almost 20 m tip to tip, to power its ion engines far from the Sun." };

/* Then & now: a photo from the mission next to a later view of the same place. */
const THEN_NOW = [
  { id: "apollo11", title: "Tranquility Base", then: { f: "as11-40-5903.jpg", nid: "as11-40-5903", when: "July 1969", how: "on the ground" }, now: { f: "PIA12909.jpg", nid: "PIA12909", when: "2009", how: "from orbit" },
    note: "In 1969 Buzz Aldrin stood right here. Forty years later, NASA's Lunar Reconnaissance Orbiter photographed the same spot from above, and the lunar module's descent stage is still there." },
  { id: "apollo12", title: "Apollo 12 and Surveyor 3", then: { f: "AS12-48-7133.jpg", nid: "AS12-48-7133", when: "November 1969", how: "on the ground" }, now: { f: "PIA12903.jpg", nid: "PIA12903", when: "2009", how: "from orbit" },
    note: "Pete Conrad visits Surveyor 3, with the lunar module Intrepid behind him. From orbit in 2009, both spacecraft are still sitting where they were left." },
  { id: "surveyor1", title: "Surveyor 1", then: { f: "PIA02976.jpg", nid: "PIA02976", when: "1966", how: "its own shadow" }, now: { f: "PIA12910.jpg", nid: "PIA12910", when: "2009", how: "from orbit" },
    note: "In 1966 Surveyor 1 photographed its own shadow on the Moon. Over 40 years later the Lunar Reconnaissance Orbiter spotted it, still standing (look for the arrow)." },
  { id: "phoenix", title: "Phoenix", then: { f: "PIA10701.jpg", nid: "PIA10701", when: "2008", how: "from orbit" }, now: { f: "PIA22223.jpg", nid: "PIA22223", when: "2017", how: "from orbit" },
    note: "The same camera, the HiRISE camera on Mars Reconnaissance Orbiter, photographed Phoenix just after it landed and nearly a decade later. Arctic winters and dust have made it much harder to see." },
  { id: "insight", title: "InSight", then: { f: "PIA22956.jpg", nid: "PIA22956", when: "December 2018", how: "on the ground" }, now: { f: "PIA23376.jpg", nid: "PIA23376", when: "September 2019", how: "from orbit" },
    note: "InSight places its seismometer on Mars in 2018. Months later, HiRISE caught the whole lander from orbit, with dust-devil tracks criss-crossing the ground around it." }
];

/* Real sounds (the soundtrack of NASA videos, streamed from images.nasa.gov). */
const SOUNDS = [
  { id: "JPL-20210222-M2020f-0003a-M2020_Audio_A_002", title: "Wind on Mars", for: "backshell", icon: "🌬️",
    what: "Recorded by Perseverance's microphone on 20 February 2021, two days after it landed. You hear the rover's own hum, then a gust of Martian wind, among the first sounds ever recorded on Mars." },
  { id: "JPL-20210506-Listen to NASA’s Ingenuity Helicopter as it Flies on Mars-1080", title: "Ingenuity flying", for: "ingenuity", icon: "🚁",
    what: "On 30 April 2021, Perseverance's microphone heard Ingenuity's spinning blades hum from about 80 m away: the first time a spacecraft recorded the sound of another spacecraft on another planet." },
  { id: "JPL-20220401-M2020f-0001-Puff Whir Zap New Sounds from Mars", title: "Puff, whir, zap!", for: "backshell", icon: "⚡",
    what: "More Perseverance recordings: puffs from a rover tool, light Martian wind, Ingenuity whirring, and the clicks of Perseverance's laser zapping rocks." },
  { id: "JPL-20230516-M2020f-0002-Sounds of Mars NoVoiceOver", title: "How sound changes on Mars", for: "backshell", icon: "👂",
    what: "Mars's thin air makes sounds much quieter, and high-pitched sounds arrive a tiny bit before low ones. This compares the same sounds on Earth and on Mars." },
  { id: "JPL-20190423-INSIGHf-0001-First Likely Marsquake Heard by NASAs InSight", title: "A marsquake", for: "insight", icon: "🫨",
    what: "InSight's seismometer felt this quake in April 2019. The vibrations are too slow for our ears, so scientists sped them up so we can hear them." },
  { id: "JPL-20220919-INSIGHf-0001-InSight Captures Sound of a Meteoroid Striking Mars_1080", title: "A meteoroid hits Mars", for: "insight", icon: "☄️",
    what: "In September 2021 a space rock broke apart and hit Mars. InSight felt the impacts; the odd “bloop” comes from the way Mars's atmosphere carries the waves." },
  { id: "Apollo 15 Never Been on a Ride like this Before", title: "Astronauts driving on the Moon", for: "apollo15", icon: "🛞",
    what: "Dave Scott and Jim Irwin talk to Mission Control as they bounce across the Moon in the first Moon car, in 1971." }
];
