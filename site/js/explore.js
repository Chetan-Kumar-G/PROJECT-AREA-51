/* ===========================================================
   Ghosts of Exploration — 3D Explore mode (Three.js)
   =========================================================== */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const byId = Object.fromEntries(ARTIFACTS.map(a => [a.id, a]));
const TYPE_EMOJI = { rover: "🚙", lander: "🛸", vehicle: "🛞", experiment: "📡", impactor: "☄️", probe: "🛰️", helicopter: "🚁", debris: "🪂", orbiter: "🛰️", telescope: "🔭" };
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const auNow = d => d.au2025 + d.rate * ((Date.now() - Date.UTC(2025, 0, 1)) / (365.25 * 864e5));
try { localStorage.setItem("goe:explored", "true"); } catch { /* ignore */ }

/* ---------- renderer / scene ---------- */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (e) {
  $("#xError").hidden = false; $("#xLoading").classList.add("done");
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
$("#scene").appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.01, 5000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
controls.rotateSpeed = 0.5;

const loader = new THREE.TextureLoader();
const tex = (url) => { const t = loader.load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

// starfield sky
const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 48, 24), new THREE.MeshBasicMaterial({ map: tex("assets/maps/stars.jpg"), side: THREE.BackSide, color: 0x8899aa }));
scene.add(sky);

// lights
const sun = new THREE.DirectionalLight(0xffffff, 2.6);
sun.position.set(5, 2, 4);
scene.add(sun, new THREE.AmbientLight(0x667799, 0.55));

/* ---------- glow sprite texture ---------- */
function glowTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.18, "rgba(255,255,255,.9)");
  grd.addColorStop(0.4, "rgba(255,255,255,.25)"); grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const GLOW = glowTexture();

/* ---------- worlds ---------- */
const groups = {};
const beacons = [];      // { a, mesh, sprite, world, pos(Vector3), label }
const planetLabels = []; // { el, obj }
const labelsEl = $("#labels");

function latLonToVec(lat, lon, r) {
  const phi = (lon + 180) * Math.PI / 180, theta = (90 - lat) * Math.PI / 180;
  return new THREE.Vector3(-Math.cos(phi) * Math.sin(theta) * r, Math.cos(theta) * r, Math.sin(phi) * Math.sin(theta) * r);
}
function makeLabel(text, cls = "") {
  const el = document.createElement("div"); el.className = "xl " + cls; el.textContent = text; labelsEl.appendChild(el); return el;
}
function addBeacon(a, world, pos, normal, size = 0.06) {
  const color = new THREE.Color(STATUS[a.status].color);
  const g = new THREE.Group();
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sprite.scale.setScalar(size * 3.2);
  const core = new THREE.Mesh(new THREE.SphereGeometry(size * 0.45, 12, 12), new THREE.MeshBasicMaterial({ color }));
  g.add(sprite, core);
  // beam pointing outward
  if (normal) {
    const len = size * 4;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.06, size * 0.06, len, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 }));
    beam.position.copy(normal.clone().multiplyScalar(len / 2));
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    g.add(beam);
    sprite.position.copy(normal.clone().multiplyScalar(len)); core.position.copy(sprite.position);
  }
  g.position.copy(pos);
  groups[world].add(g);
  // invisible larger hit target for easier tapping
  const hit = new THREE.Mesh(new THREE.SphereGeometry(size * 1.6, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.copy(sprite.position); g.add(hit);
  const b = { a, world, group: g, sprite, hit, normal, label: makeLabel(a.name), base: size * 3.2 };
  hit.userData.beacon = b;
  beacons.push(b);
  return b;
}

function buildGlobe(world, texUrl, radius) {
  const grp = new THREE.Group(); groups[world] = grp; scene.add(grp);
  const mat = new THREE.MeshStandardMaterial({ map: tex(texUrl), roughness: 1, metalness: 0 });
  const globe = new THREE.Mesh(new THREE.SphereGeometry(radius, 128, 64), mat);
  grp.add(globe);
  if (world === "mars") {
    const atm = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.025, 64, 32), new THREE.MeshBasicMaterial({ color: 0xff9a6a, transparent: true, opacity: 0.08, side: THREE.BackSide, blending: THREE.AdditiveBlending }));
    grp.add(atm);
  }
  ARTIFACTS.filter(a => a.world === world).forEach(a => {
    const n = latLonToVec(a.lat, a.lon, 1).normalize();
    addBeacon(a, world, n.clone().multiplyScalar(radius), n, 0.035);
  });
  grp.userData.globe = globe; grp.userData.radius = radius;
  return grp;
}

buildGlobe("moon", "assets/maps/moon.jpg", 1);
buildGlobe("mars", "assets/maps/mars.jpg", 1);

/* ---- deep space ---- */
const R = au => 4 + 13 * Math.log10(au / 0.25);   // log-scaled radius
const OBL = 23.44 * Math.PI / 180;
function raDecToVec(raH, decD, r) {
  const a = raH * 15 * Math.PI / 180, d = decD * Math.PI / 180;
  const xe = Math.cos(d) * Math.cos(a), ye = Math.cos(d) * Math.sin(a), ze = Math.sin(d);
  const x = xe, y = ye * Math.cos(OBL) + ze * Math.sin(OBL), z = -ye * Math.sin(OBL) + ze * Math.cos(OBL);
  return new THREE.Vector3(x, z, -y).normalize().multiplyScalar(r); // ecliptic plane = XZ
}
// Approximate sky positions (RA hours, Dec degrees) of each probe as seen from the Sun.
const DIRS = { voyager1: [17.2, 12], voyager2: [20.1, -58], pioneer10: [5.2, 26], pioneer11: [18.8, -8.5], newhorizons: [19.4, -21] };
// Handles kept so the optional "NASA JPL" mode can move things after loading.
const deep = { sun: null, planets: {}, attached: [], loose: [] };
(function buildDeep() {
  const grp = new THREE.Group(); groups.deep = grp; scene.add(grp);
  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(1.4, 48, 24), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xffb347, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sunGlow.scale.setScalar(9);
  grp.add(sunMesh, sunGlow); deep.sun = sunMesh;
  planetLabels.push({ el: makeLabel("Sun", "planet"), obj: sunMesh, world: "deep" });
  const planets = [["Mercury", .39, .25, 0xb8a99a], ["Venus", .72, .35, 0xe8c88a], ["Earth", 1, .38, 0x5aa9ff], ["Mars", 1.52, .3, 0xff8a5c], ["Jupiter", 5.2, .9, 0xd9b38c], ["Saturn", 9.54, .8, 0xe6d3a3], ["Uranus", 19.2, .6, 0x9fe3e8], ["Neptune", 30.1, .6, 0x5b7cff], ["Pluto", 39.5, .2, 0xcbbba6]];
  const bodyPos = {};
  // Ceres (dwarf planet in the asteroid belt), where Dawn still orbits
  { const r = R(2.77), ang = 5.3; const ceres = new THREE.Mesh(new THREE.SphereGeometry(.18, 24, 12), new THREE.MeshStandardMaterial({ color: 0x9a9690 })); ceres.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r); grp.add(ceres); bodyPos.Ceres = ceres.position.clone(); planetLabels.push({ el: makeLabel("Ceres", "planet"), obj: ceres, world: "deep" }); }
  planets.forEach(([n, au, s, c], i) => {
    const r = R(au);
    const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.03, r + 0.03, 160), new THREE.MeshBasicMaterial({ color: 0x334466, side: THREE.DoubleSide, transparent: true, opacity: .7 }));
    ring.rotation.x = -Math.PI / 2; grp.add(ring);
    const ang = i * 2.1 + 0.6;
    const mat = n === "Earth" ? new THREE.MeshStandardMaterial({ map: tex("assets/maps/earth.jpg") }) : new THREE.MeshStandardMaterial({ color: c, roughness: .9 });
    const p = new THREE.Mesh(new THREE.SphereGeometry(s, 32, 16), mat);
    p.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r); grp.add(p); bodyPos[n] = p.position.clone();
    deep.planets[n] = { mesh: p, r, ang, color: c };
    if (n === "Saturn") { const sr = new THREE.Mesh(new THREE.RingGeometry(s * 1.3, s * 2.1, 48), new THREE.MeshBasicMaterial({ color: 0xd9c38f, side: THREE.DoubleSide, transparent: true, opacity: .6 })); sr.rotation.x = -1.2; p.add(sr); }
    planetLabels.push({ el: makeLabel(n, "planet"), obj: p, world: "deep" });
  });
  // heliopause shell
  const hp = new THREE.Mesh(new THREE.SphereGeometry(R(120), 64, 32), new THREE.MeshBasicMaterial({ color: 0x8fb8ff, transparent: true, opacity: 0.05, side: THREE.BackSide, depthWrite: false }));
  const hpWire = new THREE.Mesh(new THREE.SphereGeometry(R(120), 36, 18), new THREE.MeshBasicMaterial({ color: 0x8fb8ff, wireframe: true, transparent: true, opacity: 0.06, depthWrite: false }));
  grp.add(hp, hpWire);
  const hpAnchor = new THREE.Object3D(); hpAnchor.position.set(0, R(120) * 0.72, 0); grp.add(hpAnchor);
  planetLabels.push({ el: makeLabel("Heliopause — edge of the Sun's bubble (~120 AU)", "planet"), obj: hpAnchor, world: "deep" });
  // probes
  const bodyCount = {};
  ARTIFACTS.filter(a => a.world === "deep").forEach(a => {
    let pos, attach = null;
    if (a.dist && DIRS[a.id]) {
      pos = raDecToVec(DIRS[a.id][0], DIRS[a.id][1], R(auNow(a.dist)));
      const pts = []; for (let t = 0; t <= 1.0001; t += 0.02) pts.push(pos.clone().multiplyScalar(t).setLength(Math.max(R(0.3), pos.length() * t)));
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: STATUS[a.status].color, dashSize: .6, gapSize: .4, transparent: true, opacity: .6 }));
      line.computeLineDistances(); grp.add(line);
    } else if (a.id === "near") {
      pos = new THREE.Vector3(Math.cos(4.2) * R(1.46), 0.3, Math.sin(4.2) * R(1.46));
    } else if (a.id === "deepimpact") {
      pos = new THREE.Vector3(Math.cos(2.4) * R(3.1), -0.3, Math.sin(2.4) * R(3.1));
    } else if (a.orbit) { // circling the Sun on its own (illustrative position)
      pos = new THREE.Vector3(Math.cos(a.orbit.ang) * R(a.orbit.au), a.orbit.y || 0, Math.sin(a.orbit.ang) * R(a.orbit.au));
    } else if (a.body && bodyPos[a.body]) {
      const k = (bodyCount[a.body] = (bodyCount[a.body] || 0) + 1) - 1; // several machines at one world sit side by side
      attach = new THREE.Vector3(k * 0.6, a.body === "Jupiter" || a.body === "Saturn" ? 1.3 : .7, 0);
      pos = bodyPos[a.body].clone().add(attach); // just above its world
    } else return;
    const b = addBeacon(a, "deep", pos, null, 0.6);
    if (attach && deep.planets[a.body]) deep.attached.push({ b, body: a.body, off: attach });
    if (a.orbit) deep.loose.push({ b, home: pos.clone() });
  });
})();

/* ---------- optional "NASA JPL" mode ----------
   Off by default so the page loads fast. When switched on, planets move to where they really
   are today, computed from NASA JPL's "Approximate Positions of the Planets" (J2000 Keplerian
   elements, good for 1800–2050), and detailed planet textures are downloaded.
   Directions are real; distances stay squeezed so everything fits on screen. */
// a (AU), e, inclination I (°), mean longitude L (°), longitude of perihelion ϖ (°), ascending node Ω (°), L rate (° per century)
const JPL_ELEMENTS = {
  Mercury: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593, 149472.67411175],
  Venus:   [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255, 58517.81538729],
  Earth:   [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0, 35999.37244981],
  Mars:    [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891, 19140.30268499],
  Jupiter: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909, 3034.74612775],
  Saturn:  [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448, 1222.49362201],
  Uranus:  [19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503, 428.48202785],
  Neptune: [30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574, 218.45945325],
  Pluto:   [39.48211675, 0.24882730, 17.14001206, 238.92903833, 224.06891629, 110.30393684, 145.20780515]
};
const D2R = Math.PI / 180;
function helio([a, e, I, L, W, O, Ld], date) { // heliocentric ecliptic x, y, z in AU
  const T = (date.getTime() / 864e5 + 2440587.5 - 2451545) / 36525;
  let M = ((L + Ld * T - W) % 360) * D2R, E = M + e * Math.sin(M);
  for (let k = 0; k < 8; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  const xp = a * (Math.cos(E) - e), yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const w = (W - O) * D2R, o = O * D2R, i = I * D2R;
  const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(o), sO = Math.sin(o), cI = Math.cos(i), sI = Math.sin(i);
  return [(cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
          (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
          (sw * sI) * xp + (cw * sI) * yp];
}
const HD_TEX = { Sun: "sun", Mercury: "mercury", Venus: "venus", Mars: "../mars", Jupiter: "jupiter", Saturn: "saturn", Uranus: "uranus", Neptune: "neptune" };
// Space telescopes that trail behind Earth: launch year and how many degrees they fall behind per year (approximate).
const TRAIL = { kepler: [2009.2, 7.0], spitzer: [2003.65, 7.9] };
let jplOn = false;
const hdCache = {};
function loadHD(name) {
  return hdCache[name] ||= new Promise(res => loader.load(`assets/maps/hd/${HD_TEX[name]}.jpg`, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }, undefined, () => res(null)));
}
function setJPL(on) {
  jplOn = on;
  const btn = $("#xJpl"), now = new Date();
  btn.setAttribute("aria-pressed", on);
  // planets: real direction for today, or back to the simple fixed layout
  for (const [n, p] of Object.entries(deep.planets)) {
    if (on && JPL_ELEMENTS[n]) {
      const [x, y, z] = helio(JPL_ELEMENTS[n], now);
      p.mesh.position.set(x, z, -y).setLength(p.r); // ecliptic plane = XZ, as elsewhere in this scene
    } else p.mesh.position.set(Math.cos(p.ang) * p.r, 0, Math.sin(p.ang) * p.r);
  }
  deep.attached.forEach(({ b, body, off }) => b.group.position.copy(deep.planets[body].mesh.position).add(off));
  // telescopes trailing Earth follow Earth's real position; other free-flying craft keep their illustrative spots
  const ep = deep.planets.Earth.mesh.position, earthLon = Math.atan2(-ep.z, ep.x), yr = now.getFullYear() + now.getMonth() / 12;
  deep.loose.forEach(({ b, home }) => {
    const tr = TRAIL[b.a.id];
    if (on && tr) {
      const lon = earthLon - Math.max(0, yr - tr[0]) * tr[1] * D2R, r = R(b.a.orbit.au);
      b.group.position.set(Math.cos(lon) * r, home.y, -Math.sin(lon) * r);
    } else b.group.position.copy(home);
  });
  // detailed textures, downloaded only the first time the mode is switched on
  const targets = { Sun: deep.sun, ...Object.fromEntries(Object.entries(deep.planets).map(([n, p]) => [n, p.mesh])) };
  if (on) {
    btn.classList.add("loading");
    Promise.all(Object.keys(HD_TEX).map(n => loadHD(n).then(t => {
      if (!t || !jplOn || !targets[n]) return;
      targets[n].material.map = t; targets[n].material.color.set(0xffffff); targets[n].material.needsUpdate = true;
    }))).then(() => btn.classList.remove("loading"));
  } else {
    Object.keys(HD_TEX).forEach(n => {
      const m = targets[n]?.material; if (!m) return;
      m.map = null; m.color.set(n === "Sun" ? 0xffd27a : deep.planets[n].color); m.needsUpdate = true;
    });
  }
  const note = $("#xJplNote");
  note.hidden = !on || current !== "deep";
  note.textContent = `Planets placed for ${now.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })} from NASA JPL orbital elements. Directions are real; distances are squeezed to fit.`;
  if (selected) flyTo(selected);
}

/* ---------- world switching & camera ---------- */
let current = null, selected = null, autoRotate = !reduceMotion, showLabels = true;
let tween = null;
const VIEWS = { moon: { dist: 3.2, min: 1.25, max: 8 }, mars: { dist: 3.2, min: 1.25, max: 8 }, deep: { dist: 95, min: 8, max: 260 } };

function setWorld(w, focusId) {
  current = w;
  Object.entries(groups).forEach(([k, g]) => (g.visible = k === w));
  $$(".x-tabs [role=tab]").forEach(t => t.setAttribute("aria-selected", t.dataset.w === w));
  const base = VIEWS[w], fit = camera.aspect < 1 ? 1 / Math.max(camera.aspect * 1.25, 0.5) : 1;
  const v = { dist: base.dist * fit, min: base.min, max: base.max * fit };
  controls.minDistance = v.min; controls.maxDistance = v.max;
  tween = null;
  if (w === "deep") { camera.position.set(40, 55, 75).setLength(v.dist); sun.intensity = 0; deepLight.visible = true; }
  else { camera.position.copy(latLonToVec(w === "mars" ? 10 : 12, w === "mars" ? 40 : 5, 1)).setLength(v.dist); sun.intensity = 2.6; deepLight.visible = false; }
  controls.target.set(0, 0, 0); controls.update();
  closeCard(); renderList();
  $("#xJpl").hidden = w !== "deep"; $("#xJplNote").hidden = !(jplOn && w === "deep");
  history.replaceState(null, "", "#" + w);
  if (focusId && byId[focusId]) select(beacons.find(b => b.a.id === focusId));
}
const deepLight = new THREE.PointLight(0xfff1d0, 3, 0, 0); scene.add(deepLight); deepLight.visible = false;

function flyTo(b) {
  const from = camera.position.clone();
  let to;
  if (b.world === "deep") {
    const wp = new THREE.Vector3(); b.sprite.getWorldPosition(wp);
    to = wp.clone().setLength(wp.length() + 22).add(new THREE.Vector3(0, 12, 0));
  } else {
    const n = b.normal.clone();
    to = n.multiplyScalar(Math.max(2.1, Math.min(camera.position.length(), 3)));
  }
  tween = { from, to, t: 0, dur: reduceMotion ? 1 : 1.2, deep: b.world === "deep" };
  autoRotateTemp = false;
}
let autoRotateTemp = true;

function select(b) {
  if (!b) return;
  selected = b;
  beacons.forEach(x => x.label.classList.toggle("sel", x === b));
  $$("#xItems button").forEach(x => x.setAttribute("aria-current", x.dataset.id === b.a.id));
  flyTo(b); openCard(b.a);
  history.replaceState(null, "", "#" + current + ":" + b.a.id);
}

/* ---------- UI ---------- */
function renderList() {
  const list = beacons.filter(b => b.world === current).sort((x, y) => x.a.year - y.a.year);
  $("#xCount").textContent = `(${list.length})`;
  $("#xItems").innerHTML = list.map(b => `<li><button data-id="${b.a.id}"><i style="background:${STATUS[b.a.status].color};color:${STATUS[b.a.status].color}"></i><span><b>${esc(b.a.name)}</b><small>${b.a.year} · ${esc(STATUS[b.a.status].label)}</small></span></button></li>`).join("");
  $$("#xItems button").forEach(btn => btn.addEventListener("click", () => {
    select(beacons.find(b => b.a.id === btn.dataset.id));
    if (innerWidth < 820) { $("#xList").classList.add("collapsed"); $("#xListToggle").setAttribute("aria-expanded", "false"); }
  }));
}
let speaking = false;
function openCard(a) {
  const m = a.media[0];
  const dist = a.dist ? `<div><small>Distance now (est.)</small>~${auNow(a.dist).toFixed(0)} AU</div>` : "";
  $("#xCard").innerHTML = `
    <button class="icon-btn close" id="xClose" aria-label="Close">✕</button>
    ${m ? `<img src="assets/nasa/${m.f}" alt="${esc(m.cap)}">` : `<div class="ph">${TYPE_EMOJI[a.type]}</div>`}
    <div class="in">
      <span class="pill" style="color:${STATUS[a.status].color}">${STATUS[a.status].label}</span>
      <h2>${esc(a.name)}</h2>
      <p class="sub">${esc(a.mission)} · ${esc(a.place || a.fixedPlace || a.heading || "")}</p>
      <blockquote>${esc(a.ghost)}</blockquote>
      <div class="mini"><div><small>Arrived</small>${esc(a.dates.arrive)}</div><div><small>Last word</small>${esc(a.dates.last)}</div>${dist}<div><small>Type</small>${esc(TYPES[a.type])}</div></div>
      <div class="row">
        <a class="btn btn-primary btn-small" href="index.html#artifact=${a.id}">Open full dossier</a>
        ${window.hasModel && hasModel(a.id) ? `<button class="btn btn-small" id="xModel">🧊 3D model</button>` : ""}
        ${typeof ATLAS_SITES !== "undefined" && ATLAS_SITES[a.id] ? `<a class="btn btn-small" data-atlas="site:${ATLAS_SITES[a.id]}" href="atlas/index.html?go=site&amp;id=${ATLAS_SITES[a.id]}">🚶 Walk there</a>` : ""}
        <button class="btn btn-small" id="xSpeak" aria-pressed="false">🔊 Read aloud</button>
      </div>
    </div>`;
  $("#xCard").hidden = false; document.body.classList.add("has-card");
  $("#xClose").addEventListener("click", closeCard);
  $("#xModel")?.addEventListener("click", () => openModel(a.id));
  $("#xSpeak").addEventListener("click", e => {
    if (!("speechSynthesis" in window)) return;
    if (speaking) { speechSynthesis.cancel(); speaking = false; e.currentTarget.setAttribute("aria-pressed", "false"); return; }
    const u = new SpeechSynthesisUtterance(a.ghost); u.rate = .95;
    const btn = e.currentTarget; u.onend = () => { speaking = false; btn.setAttribute("aria-pressed", "false"); };
    speechSynthesis.cancel(); speechSynthesis.speak(u); speaking = true; btn.setAttribute("aria-pressed", "true");
  });
}
function closeCard() {
  $("#xCard").hidden = true; selected = null; document.body.classList.remove("has-card");
  beacons.forEach(x => x.label.classList.remove("sel"));
  $$("#xItems button").forEach(x => x.setAttribute("aria-current", "false"));
  try { speechSynthesis.cancel(); } catch { } speaking = false;
}

$$(".x-tabs [role=tab]").forEach(t => t.addEventListener("click", () => setWorld(t.dataset.w)));
$("#xRotate").addEventListener("click", e => { autoRotate = !autoRotate; autoRotateTemp = true; e.currentTarget.setAttribute("aria-pressed", autoRotate); });
$("#xLabels").addEventListener("click", e => { showLabels = !showLabels; e.currentTarget.setAttribute("aria-pressed", showLabels); });
$("#xJpl").addEventListener("click", () => setJPL(!jplOn));
$("#xListToggle").addEventListener("click", e => { const c = $("#xList").classList.toggle("collapsed"); e.currentTarget.setAttribute("aria-expanded", !c); });
addEventListener("keydown", e => { if (e.key === "Escape" && !document.querySelector(".model-modal:not([hidden])")) closeCard(); });
if (reduceMotion) $("#xRotate").setAttribute("aria-pressed", "false");
if (innerWidth < 820) { $("#xList").classList.add("collapsed"); $("#xListToggle").setAttribute("aria-expanded", "false"); }

/* ---------- picking ---------- */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let down = null;
renderer.domElement.addEventListener("pointerdown", e => { down = { x: e.clientX, y: e.clientY }; autoRotateTemp = false; });
renderer.domElement.addEventListener("pointerup", e => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
  down = null;
  ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects(beacons.filter(b => b.world === current && b.facing !== false).map(b => b.hit), false);
  if (hits.length) select(hits[0].object.userData.beacon);
});
let hoverT = 0;
renderer.domElement.addEventListener("pointermove", e => {
  if (performance.now() - hoverT < 50) return; hoverT = performance.now();
  ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects(beacons.filter(b => b.world === current && b.facing !== false).map(b => b.hit), false);
  renderer.domElement.style.cursor = hits.length ? "pointer" : "grab";
});

/* ---------- loop ---------- */
const clock = new THREE.Clock();
const tmp = new THREE.Vector3(), camDir = new THREE.Vector3();
function updateLabels() {
  const W = innerWidth, H = innerHeight;
  camera.getWorldDirection(camDir);
  beacons.forEach(b => {
    if (b.world !== current || !showLabels) { b.label.style.display = "none"; return; }
    b.sprite.getWorldPosition(tmp);
    let visible = true;
    if (b.normal) { // hide when on the far side of the globe
      const toCam = camera.position.clone().sub(tmp).normalize();
      visible = b.normal.dot(toCam) > 0.12;
    }
    tmp.project(camera);
    if (tmp.z > 1) visible = false;
    b.label.style.display = "";
    b.sx = (tmp.x * .5 + .5) * W; b.sy = (-tmp.y * .5 + .5) * H;
    b.label.style.transform = `translate(${b.sx}px, ${b.sy}px) translate(-50%, -150%)`;
    b.facing = visible;
  });
  // declutter: selected label first, then by year; hide labels that would overlap
  const placed = [];
  beacons.filter(b => b.world === current && showLabels)
    .sort((x, y) => (y === selected) - (x === selected) || x.a.year - y.a.year)
    .forEach(b => {
      if (!b.facing) { b.label.classList.add("off"); return; }
      const w = (b.lw ||= b.label.offsetWidth || 90) + 4, h = 22;
      const r = { x1: b.sx - w / 2, x2: b.sx + w / 2, y1: b.sy - h * 1.5 - h / 2, y2: b.sy - h * 1.5 + h / 2 };
      const hit = placed.some(q => !(r.x2 < q.x1 || r.x1 > q.x2 || r.y2 < q.y1 || r.y1 > q.y2));
      b.label.classList.toggle("off", hit);
      if (!hit) placed.push(r);
    });
  planetLabels.forEach(p => {
    if (p.world !== current || !showLabels) { p.el.style.display = "none"; return; }
    p.obj.getWorldPosition(tmp); tmp.project(camera);
    p.el.style.display = tmp.z > 1 ? "none" : "";
    p.el.style.transform = `translate(${(tmp.x * .5 + .5) * W}px, ${(-tmp.y * .5 + .5) * H}px) translate(-50%, 60%)`;
  });
}
function animate() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (tween) {
    tween.t += dt / tween.dur;
    const k = tween.t >= 1 ? 1 : 1 - Math.pow(1 - tween.t, 3);
    if (tween.deep) camera.position.lerpVectors(tween.from, tween.to, k);
    else {
      const a = tween.from.clone().normalize(), b = tween.to.clone().normalize();
      const len = THREE.MathUtils.lerp(tween.from.length(), tween.to.length(), k);
      camera.position.copy(new THREE.Vector3().copy(a).lerp(b, k).normalize().multiplyScalar(len));
      if (a.dot(b) < -0.99) camera.position.add(new THREE.Vector3(0, Math.sin(k * Math.PI) * len, 0)).setLength(len);
    }
    if (tween.t >= 1) tween = null;
  }
  controls.autoRotate = autoRotate && autoRotateTemp && !tween && !selected;
  controls.autoRotateSpeed = current === "deep" ? 0.25 : 0.6;
  controls.update();
  // pulse beacons
  beacons.forEach((b, i) => {
    if (b.world !== current) return;
    const s = b.base * (1 + (reduceMotion ? 0 : 0.18 * Math.sin(t * 2.4 + i)) + (b === selected ? 0.6 : 0));
    b.sprite.scale.setScalar(s);
  });
  if (current !== "deep") {
    // light comes from over the viewer's shoulder so the side you look at is always lit
    sun.position.copy(camera.position).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.55).add(new THREE.Vector3(0, 1.2, 0));
  }
  sky.rotation.y += reduceMotion ? 0 : dt * 0.003;
  renderer.render(scene, camera);
  updateLabels();
  requestAnimationFrame(animate);
}

addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

/* ---------- boot ---------- */
const m = location.hash.slice(1).split(":");
setWorld(["moon", "mars", "deep"].includes(m[0]) ? m[0] : "moon", m[1]);
animate();
addEventListener("hashchange", () => {
  const [w, id] = location.hash.slice(1).split(":");
  if (["moon", "mars", "deep"].includes(w) && (w !== current || (id && (!selected || selected.a.id !== id)))) setWorld(w, id);
});
loader.manager.onLoad = () => $("#xLoading").classList.add("done");
setTimeout(() => $("#xLoading").classList.add("done"), 4000);
