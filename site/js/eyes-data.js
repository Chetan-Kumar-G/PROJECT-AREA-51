/* ===========================================================
   NASA Eyes on the Solar System links.
   Eyes (https://eyes.nasa.gov/apps/solar-system) is NASA/JPL's real-time
   3D model of the solar system, built from real spacecraft trajectory data.
   NASA allows it to be embedded; the options below are the ones its own
   "Share → Embed" builder offers.

   EYES_MACHINES maps each machine in this archive to the closest thing Eyes
   can show:
     t    – Eyes target id (a spacecraft, landing site, planet or moon)
     at   – a moment to travel to (UTC). Omit to show it as it is right now.
     self – true when Eyes models this exact spacecraft or landing site.
            false means Eyes shows the world it is on instead (e.g. it has no
            Viking 1 lander, so it opens Mars on the day Viking landed).
     note – one line telling the visitor what they are looking at.
     c    – optional: Eyes also has a 3D model of the spacecraft itself (the
            same view NASA's own mission pages embed). Shown by default;
            visitors can switch back to the classic landing-site view.
   =========================================================== */
const EYES_BASE = "https://eyes.nasa.gov/apps/solar-system/";

const EYES_MACHINES = {
  // ---- The Moon (Eyes has no Apollo, Ranger or Surveyor hardware, so these open the Moon on the day) ----
  ranger7:     { t: "moon", at: "1964-07-31T13:25:00Z", self: false, note: "The Moon at the moment Ranger 7 hit it." },
  surveyor1:   { t: "moon", at: "1966-06-02T06:17:00Z", self: false, note: "The Moon on the day Surveyor 1 landed." },
  surveyor3:   { t: "moon", at: "1967-04-20T00:04:00Z", self: false, note: "The Moon on the day Surveyor 3 landed." },
  apollo11:    { t: "moon", at: "1969-07-20T20:17:00Z", self: false, note: "The Moon at the minute the Eagle landed." },
  apollo12:    { t: "moon", at: "1969-11-19T06:54:00Z", self: false, note: "The Moon on the day Apollo 12 landed." },
  apollo14:    { t: "moon", at: "1971-02-05T09:18:00Z", self: false, note: "The Moon on the day Apollo 14 landed." },
  apollo15:    { t: "moon", at: "1971-07-30T22:16:00Z", self: false, note: "The Moon on the day the first rover arrived." },
  apollo16:    { t: "moon", at: "1972-04-21T02:23:00Z", self: false, note: "The Moon on the day Apollo 16 landed." },
  apollo17:    { t: "moon", at: "1972-12-11T19:54:00Z", self: false, note: "The Moon on the day Apollo 17 landed." },
  sivb16:      { t: "moon", at: "1972-04-19T21:02:00Z", self: false, note: "The Moon when the Apollo 16 rocket stage struck it." },
  prospector:  { t: "sc_lunar_prospector", at: "1999-07-31T09:30:00Z", self: true, note: "Lunar Prospector minutes before it crashed into a crater near the south pole." },
  lcross:      { t: "sc_lcross", at: "2009-10-09T11:20:00Z", self: true, note: "LCROSS diving toward Cabeus crater, about ten minutes before impact." },
  grail:       { t: "sc_grail_a", at: "2012-12-17T22:15:00Z", self: true, note: "Ebb (GRAIL-A) on its last orbit, minutes before hitting a lunar mountain." },
  ladee:       { t: "sc_ladee", at: "2014-04-17T12:00:00Z", self: true, note: "LADEE skimming the surface on its final day." },

  // ---- Mars ----
  viking1:     { t: "mars", at: "1976-07-20T11:53:00Z", self: false, note: "Mars at the moment Viking 1 touched down." },
  viking2:     { t: "mars", at: "1976-09-03T22:58:00Z", self: false, note: "Mars on the day Viking 2 landed." },
  pathfinder:  { t: "mars", at: "1997-07-04T16:57:00Z", self: false, note: "Mars on Pathfinder's bouncing landing day." },
  sojourner:   { t: "mars", at: "1997-07-04T16:57:00Z", self: false, note: "Mars on the day Sojourner arrived inside Pathfinder." },
  polarlander: { t: "mars", at: "1999-12-03T20:00:00Z", self: false, note: "Mars on the day Mars Polar Lander went silent." },
  spirit:      { t: "sc_mars_exploration_rover_2_landing_site", self: true, note: "Spirit's landing site in Gusev crater.",
                 c: { t: "sc_mars_exploration_rover_2", note: "Spirit herself, a 3D model of the rover on Mars." } },
  opportunity: { t: "sc_mars_exploration_rover_1_landing_site", self: true, note: "Opportunity's landing site at Meridiani Planum.",
                 c: { t: "sc_mars_exploration_rover_1", note: "Opportunity herself, a 3D model of the rover on Mars (the view NASA's own Opportunity page uses)." } },
  phoenix:     { t: "sc_phoenix_landing_site", self: true, note: "Phoenix's landing site in the Martian Arctic.",
                 c: { t: "sc_phoenix", note: "The Phoenix lander itself, in the Martian Arctic." } },
  insight:     { t: "sc_insight", self: true, note: "InSight on Elysium Planitia." },
  curiosity:   { t: "sc_mars_science_laboratory", self: true, note: "Curiosity, still driving up Mount Sharp right now." },
  ingenuity:   { t: "sc_mars_2020", self: true, note: "Perseverance, the rover that carried Ingenuity, in Jezero crater." },
  backshell:   { t: "sc_mars_2020_landing_site", self: true, note: "Perseverance's landing site; the backshell lies a short way off." },

  // ---- Elsewhere ----
  mariner2:     { t: "sc_mariner_2", at: "1962-12-14T19:00:00Z", self: true, note: "Mariner 2 flying past Venus, the first planet ever visited." },
  vanguard1:    { t: "earth", self: false, note: "Earth today. Vanguard 1 is still up there, the oldest human-made object in orbit." },
  mariner4:     { t: "mars", at: "1965-07-15T01:00:00Z", self: false, note: "Mars on the night Mariner 4 flew past and took the first close-up photos." },
  pioneer10:    { t: "sc_pioneer_10", self: true, note: "Where Pioneer 10 is right now, heading out of the solar system." },
  mariner9:     { t: "mars", at: "1971-11-14T00:00:00Z", self: false, note: "Mars on the day Mariner 9 became the first spacecraft to orbit another planet." },
  pioneer11:    { t: "sc_pioneer_11", self: true, note: "Where Pioneer 11 is right now." },
  voyager1:     { t: "sc_voyager_1", self: true, note: "Voyager 1 right now, the farthest human-made object." },
  voyager2:     { t: "sc_voyager_2", self: true, note: "Voyager 2 right now, in interstellar space." },
  pioneervenus: { t: "venus", at: "1978-12-09T19:00:00Z", self: false, note: "Venus on the day the four Pioneer Venus probes plunged in." },
  magellan:     { t: "sc_magellan", at: "1994-10-11T00:00:00Z", self: true, note: "Magellan on its final dive into Venus's atmosphere." },
  galileo:      { t: "sc_galileo", at: "2003-09-21T17:00:00Z", self: true, note: "Galileo an hour before it plunged into Jupiter." },
  mco:          { t: "mars", at: "1999-09-23T09:00:00Z", self: false, note: "Mars on the day Mars Climate Orbiter was lost." },
  near:         { t: "sc_near_shoemaker", at: "2001-02-12T19:30:00Z", self: true, note: "NEAR Shoemaker gently landing on asteroid Eros." },
  deepimpact:   { t: "sc_deep_impact_impactor", at: "2005-07-04T05:00:00Z", self: true, note: "The impactor about 45 minutes before it struck comet Tempel 1." },
  newhorizons:  { t: "sc_new_horizons", self: true, note: "New Horizons right now, beyond Pluto." },
  mgs:          { t: "sc_mars_global_surveyor", at: "2006-11-01T00:00:00Z", self: true, note: "Mars Global Surveyor in November 2006, the month it fell silent." },
  stardust:     { t: "sc_stardust", at: "2006-01-15T05:00:00Z", self: true, note: "Stardust as it dropped its comet-dust capsule back to Earth." },
  isee3:        { t: "sun", self: false, note: "Eyes doesn't model ISEE-3, which still circles the Sun close to Earth's path." },
  messenger:    { t: "sc_messenger", at: "2015-04-30T19:00:00Z", self: true, note: "MESSENGER on its last orbit, minutes before hitting Mercury." },
  cassini:      { t: "sc_cassini", at: "2017-09-15T10:00:00Z", self: true, note: "Cassini on the morning of its Grand Finale plunge into Saturn." },
  dawn:         { t: "sc_dawn", self: true, note: "Dawn, still silently orbiting the dwarf planet Ceres." },
  kepler:       { t: "sc_kepler_space_telescope", self: true, note: "Kepler, drifting around the Sun behind Earth." },
  spitzer:      { t: "sc_spitzer", self: true, note: "Spitzer, trailing Earth around the Sun." }
};

// Worlds you can jump to (all are Eyes target ids).
const EYES_WORLDS = [
  { t: "sun", n: "Sun" }, { t: "mercury", n: "Mercury" }, { t: "venus", n: "Venus" }, { t: "earth", n: "Earth" },
  { t: "moon", n: "The Moon" }, { t: "mars", n: "Mars" }, { t: "jupiter", n: "Jupiter" }, { t: "saturn", n: "Saturn" },
  { t: "uranus", n: "Uranus" }, { t: "neptune", n: "Neptune" }, { t: "134340_pluto", n: "Pluto" }, { t: "1_ceres", n: "Ceres" },
  { t: "4_vesta", n: "Vesta" }, { t: "433_eros", n: "Eros" }, { t: "9p_tempel_1", n: "Comet Tempel 1" }, { t: "81p_wild_2", n: "Comet Wild 2" },
  { t: "486958_arrokoth", n: "Arrokoth" }, { t: "67p_churyumov_gerasimenko", n: "Comet 67P" }
];

// Guided stories built by the Eyes team (route #/story/<id>).
const EYES_STORIES = [
  { id: "voyager_grand_tour", n: "Voyager's Grand Tour", d: "Ride along as the Voyagers swing past Jupiter, Saturn, Uranus and Neptune." },
  { id: "voyager_one_day_light_time", n: "Voyager 1: one light-day away", d: "How far is it when a radio signal takes a whole day to arrive?" },
  { id: "enceladus_discovery", n: "Discovery at Enceladus", d: "How Cassini found an ocean spraying out of a tiny moon." },
  { id: "experience_curiosity", n: "Experience Curiosity", d: "Drive along with Curiosity on Mars." },
  { id: "experience_insight", n: "Experience InSight", d: "Land with InSight and listen for marsquakes." },
  { id: "mars2020", n: "Entry, descent and landing", d: "Perseverance's seven minutes of terror, step by step." },
  { id: "asteroids_missions", n: "Asteroid and comet missions", d: "Every spacecraft that has chased a small world." },
  { id: "psp_perihelion", n: "Parker Solar Probe perihelion", d: "The fastest human-made object skims the Sun." },
  { id: "artemis", n: "Artemis I", d: "Orion's uncrewed trip around the Moon and back." },
  { id: "artemis2", n: "Artemis II", d: "The first crew to fly around the Moon since 1972." },
  { id: "dinkinesh", n: "Lucy's first asteroid flyby", d: "Lucy finds a surprise moon around asteroid Dinkinesh." },
  { id: "clipper_launch", n: "Europa Clipper launch", d: "Off to Jupiter's icy moon Europa." },
  { id: "psyche_launch", n: "Psyche launch", d: "Heading for a metal-rich asteroid." },
  { id: "total_solar_eclipse", n: "2024 total solar eclipse", d: "Watch the Moon's shadow race across North America." }
];

// Eyes views that work on any target (route #/<target>/<view>).
const EYES_VIEWS = [
  { v: "", n: "Fly to it", d: "Orbit it in 3D. Drag to spin, scroll to zoom." },
  { v: "compare", n: "Compare size", d: "Stand it next to a person, a bus or a building." },
  { v: "distance", n: "How far?", d: "Measure the distance to anything else in the solar system." },
  { v: "events", n: "Events", d: "Key moments of the mission you can jump to." }
];

// Display options, exactly as Eyes' own embed builder names them.
// on = our default; q = the URL setting; inv = the setting means the opposite of the label.
const EYES_OPTIONS = [
  { q: "detailPanel", n: "Info panel", d: "NASA's description and facts for whatever you select", on: true },
  { q: "search", n: "Search bar", d: "Search for any of the thousands of objects in Eyes", on: true },
  { q: "menu", n: "Eyes main menu", d: "Spacecraft list, asteroids, Earth satellites and more", on: true },
  { q: "featured", n: "Featured stories", d: "Eyes' featured stories panel on the home view", on: false },
  { q: "timeControls", n: "Time controls", d: "Travel to any date, play forward or backward, change speed", on: true },
  { q: "collapseSettingsOptions", n: "Expanded settings bar", d: "Labels, orbit lines, lighting and constellations", on: false, inv: true },
  { q: "locked", n: "Free navigation", d: "Let visitors fly away to other objects", on: true, inv: true },
  { q: "hd", n: "HD textures", d: "Sharper planet maps (more to download)", on: false },
  { q: "surfaceMapTiling", n: "Detailed surface zoom", d: "Load extra detail when zooming close to Earth, the Moon and Mars", on: false },
  { q: "logo", n: "NASA logo", d: "Show the NASA logo in the corner", on: true },
  { q: "shareButton", n: "Share button", d: "Eyes' own share and embed button", on: false },
  { q: "hideExternalLinks", n: "Links to NASA pages", d: "Allow links that leave Eyes for other NASA sites", on: true, inv: true }
];

// Build an Eyes address. opts: { view, time, rate, story, settings: { q: bool } }
function eyesURL(target, opts = {}) {
  const path = opts.story ? `story/${opts.story}` : [target || "home", opts.view].filter(Boolean).join("/");
  const p = new URLSearchParams();
  const set = opts.settings || Object.fromEntries(EYES_OPTIONS.map(o => [o.q, o.on]));
  EYES_OPTIONS.forEach(o => {
    const show = set[o.q] ?? o.on;
    const val = o.inv ? !show : show;
    // Only write a setting when it differs from Eyes' own default.
    const eyesDefault = ["detailPanel", "search", "menu", "featured", "timeControls", "logo", "shareButton"].includes(o.q);
    if (val !== eyesDefault) p.set(o.q, String(val));
  });
  if (opts.time) p.set("time", new Date(opts.time).toISOString());
  if (opts.rate != null) p.set("rate", String(opts.rate));
  const qs = p.toString();
  return `${EYES_BASE}#/${path}${qs ? "?" + qs : ""}`;
}

// Spacecraft view ("craft", the default) or the classic landing-site view ("classic").
// Remembered per browser; changed from a dossier or the NASA Eyes page.
const EYES_VIEW_KEY = "goe-eyes-view";
function eyesViewPref() { try { return localStorage.getItem(EYES_VIEW_KEY) === "classic" ? "classic" : "craft"; } catch { return "craft"; } }
function setEyesViewPref(v) { try { if (v === "craft") localStorage.removeItem(EYES_VIEW_KEY); else localStorage.setItem(EYES_VIEW_KEY, v); } catch { /* private mode */ } }

// What Eyes should show for a machine right now: { t, at, self, note, craft }
function eyesPick(id) {
  const m = EYES_MACHINES[id];
  if (!m) return null;
  return m.c && eyesViewPref() === "craft" ? { ...m, t: m.c.t, note: m.c.note, craft: true } : { ...m, craft: false };
}

// The Eyes address for one of our machines.
function eyesForMachine(id, opts = {}) {
  const m = eyesPick(id);
  return m ? eyesURL(m.t, { time: m.at, ...opts }) : null;
}
