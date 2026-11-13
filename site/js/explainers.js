/* ===========================================================
   Explainer animations: "How it worked"
   A tiny step-based animation player for SVG scenes, plus ten
   scenes based on how the real missions worked.

   Each scene is { title, world, svg(P), init, steps }.
   - Elements to animate carry data-k="name".
   - A state is { x, y, r, s, sx, sy, o, d, p } (offsets from where the
     element is drawn, rotation, scale, opacity, draw-progress of a path,
     progress along a motion path).
   - A step is { cap, dur, to: { name: state | [states...] }, on: [...],
     off: [...], count: {...} }. "on" adds class .on (used for fx like
     flames, which fade in and flicker).
   =========================================================== */
/* Playback speed (1×, 2×, 3×), shared by every animation and the story player, and remembered. */
window.GOESpeed = window.GOESpeed || (() => {
  const subs = new Set();
  let v = 1;
  try { const s = +localStorage.getItem("goe:speed"); if (s === 2 || s === 3) v = s; } catch { /* private mode */ }
  const paint = () => document.querySelectorAll(".speed button").forEach(b => b.setAttribute("aria-checked", +b.dataset.speed === v));
  function set(n) {
    v = n === 2 || n === 3 ? n : 1;
    try { localStorage.setItem("goe:speed", v); } catch { /* ignore */ }
    paint(); subs.forEach(f => f(v));
  }
  document.addEventListener("click", e => { const b = e.target.closest && e.target.closest(".speed button"); if (b) set(+b.dataset.speed); });
  const label = () => (window.t || ((k, f) => f))("speed.label", "Playback speed"); // looked up late: the language file loads after this one
  return {
    get: () => v, set,
    on(f) { subs.add(f); return () => subs.delete(f); },
    html: () => `<div class="speed" role="radiogroup" aria-label="${label()}">${[1, 2, 3].map(n => `<button type="button" role="radio" data-speed="${n}" aria-checked="${n === v}" aria-label="${n}×">${n}×</button>`).join("")}</div>`
  };
})();

(() => {
  "use strict";

  /* ---------------- helpers for drawing ---------------- */
  function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function stars(n, seed = 7, h = 450) {
    const r = rng(seed); let o = "";
    for (let i = 0; i < n; i++) o += `<circle cx="${(r() * 800).toFixed(1)}" cy="${(r() * h).toFixed(1)}" r="${(r() * 1.3 + .3).toFixed(2)}" fill="#fff" opacity="${(r() * .6 + .3).toFixed(2)}"/>`;
    return o;
  }
  const BG = {
    moon: P => `<rect width="800" height="450" fill="#04060c"/>${stars(70, 3, 360)}
      <path d="M0 380 Q160 368 330 377 T620 372 T800 378 V450 H0Z" fill="#8d939b"/>
      <ellipse cx="120" cy="410" rx="46" ry="9" fill="#767b83"/><ellipse cx="660" cy="420" rx="60" ry="10" fill="#767b83"/><ellipse cx="300" cy="432" rx="30" ry="6" fill="#7b8088"/>`,
    mars: P => `<defs><linearGradient id="${P}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a3c"/><stop offset=".7" stop-color="#d9a273"/><stop offset="1" stop-color="#ebc39b"/></linearGradient></defs>
      <rect width="800" height="450" fill="url(#${P}sky)"/>
      <path d="M0 352 Q120 330 230 348 T470 340 T800 350 V380 H0Z" fill="#b8693f" opacity=".7"/>
      <path d="M0 380 Q200 370 400 378 T800 374 V450 H0Z" fill="#a8522c"/>
      <ellipse cx="160" cy="402" rx="16" ry="6" fill="#7d3a1e"/><ellipse cx="700" cy="414" rx="12" ry="5" fill="#7d3a1e"/><ellipse cx="560" cy="428" rx="9" ry="4" fill="#7d3a1e"/>`,
    space: P => `<rect width="800" height="450" fill="#04060c"/>${stars(110, 11)}`
  };
  const flame = (k, x, y, len = 34, w = 12, cls = "") =>
    `<g data-k="${k}" class="fx flame ${cls}" ${/on/.test(cls) ? 'data-keep="1"' : ""} data-px="${x}" data-py="${y}"><path d="M${x - w} ${y} Q${x} ${y + len * 1.25} ${x + w} ${y} Z" fill="#ffb347"/><path d="M${x - w / 2} ${y} Q${x} ${y + len * .7} ${x + w / 2} ${y} Z" fill="#fff4c8"/></g>`;
  const dust = (k, x, y) =>
    `<g data-k="${k}" class="fx" data-px="${x}" data-py="${y}"><ellipse cx="${x - 40}" cy="${y}" rx="34" ry="9" fill="#d9d2c4" opacity=".55"/><ellipse cx="${x + 40}" cy="${y}" rx="34" ry="9" fill="#d9d2c4" opacity=".55"/><ellipse cx="${x}" cy="${y - 4}" rx="22" ry="7" fill="#efe9dc" opacity=".5"/></g>`;
  const puff = (k, x, y, c = "#e6c9a8") =>
    `<g data-k="${k}" class="fx" data-px="${x}" data-py="${y}"><circle cx="${x}" cy="${y - 12}" r="20" fill="${c}" opacity=".75"/><circle cx="${x - 20}" cy="${y - 4}" r="14" fill="${c}" opacity=".6"/><circle cx="${x + 22}" cy="${y - 6}" r="15" fill="${c}" opacity=".6"/></g>`;
  const label = (k, x, y, text, ax, ay) =>
    `<g data-k="${k}" class="fx"><line x1="${x}" y1="${y + 6}" x2="${ax}" y2="${ay}" stroke="#ffb347" stroke-width="2" stroke-dasharray="4 3"/><rect x="${x - text.length * 4.9 - 10}" y="${y - 19}" width="${text.length * 9.8 + 20}" height="30" rx="15" fill="#0b1120" stroke="#ffb347"/><text x="${x}" y="${y + 2}" text-anchor="middle" font-size="17" font-weight="700" fill="#ffd08a">${text}</text></g>`;
  // Mars entry capsule (backshell + heat shield + glow + parachute), centred at 400,120
  const capsule = (P, inner = "", chuteColor = "#f5f5f5") => `
    <g data-k="cap" data-px="400" data-py="115">
      <g data-k="chute" class="fx" data-px="400" data-py="96">
        <line x1="352" y1="38" x2="384" y2="96" stroke="#ddd" stroke-width="1.5"/><line x1="448" y1="38" x2="416" y2="96" stroke="#ddd" stroke-width="1.5"/><line x1="400" y1="18" x2="400" y2="96" stroke="#ddd" stroke-width="1.5"/>
        <path d="M344 42 Q400 -14 456 42 Q400 30 344 42Z" fill="${chuteColor}"/><path d="M372 30 Q400 -6 428 30 Q400 24 372 30Z" fill="#e1612c"/>
      </g>
      <polygon points="374,96 426,96 444,128 356,128" fill="#dfe3e8" stroke="#9aa3ad"/>
      <g data-k="hs" data-px="400" data-py="134"><path d="M352 128 Q400 152 448 128Z" fill="#7a5233"/></g>
      <g data-k="glow" class="fx flicker"><ellipse cx="400" cy="146" rx="64" ry="26" fill="url(#${P}glow)"/></g>
      ${inner}
    </g>
    <defs><radialGradient id="${P}glow"><stop offset="0" stop-color="#fff2b0"/><stop offset=".45" stop-color="#ff8a3d" stop-opacity=".85"/><stop offset="1" stop-color="#ff5a1f" stop-opacity="0"/></radialGradient></defs>`;

  /* ---------------- the scenes ---------------- */
  const S = {};

  // 1. Apollo lunar module: landing, exploring, liftoff (names, crews and experiments per mission)
  const APOLLO = {
    apollo11: { lm: "Eagle", crew: "Neil Armstrong and Buzz Aldrin", quote: "“The Eagle has landed.” ", kit: "a seismometer, a laser mirror and the flag", sci: "Laser mirror + seismometer", rover: false },
    apollo12: { lm: "Intrepid", crew: "Pete Conrad and Alan Bean", quote: "", kit: "a nuclear-powered science station and the flag, then walk over to visit Surveyor 3", sci: "Science station (ALSEP)", rover: false },
    apollo14: { lm: "Antares", crew: "Alan Shepard and Edgar Mitchell", quote: "", kit: "a science station, a laser mirror and the flag (and Shepard hits two golf balls!)", sci: "Laser mirror + science station", rover: false },
    apollo15: { lm: "Falcon", crew: "David Scott and James Irwin", quote: "", kit: "the first Moon car, a science station, a laser mirror and the flag", sci: "Laser mirror + science station", rover: true },
    apollo16: { lm: "Orion", crew: "John Young and Charlie Duke", quote: "", kit: "their Moon car, a science station and the flag", sci: "Science station (ALSEP)", rover: true },
    apollo17: { lm: "Challenger", crew: "Gene Cernan and Harrison Schmitt", quote: "", kit: "their Moon car, a science station and the flag", sci: "Science station (ALSEP)", rover: true }
  };
  S["apollo-lm"] = v => {
    const m = APOLLO[v] || APOLLO.apollo11;
    return {
    title: `How ${(v || "apollo11").replace("apollo", "Apollo ")} landed and took off again`, world: "moon",
    svg: P => `${BG.moon(P)}
      ${dust("dust", 400, 378)}
      <g data-k="seis" class="fx"><rect x="520" y="362" width="22" height="16" fill="#c9ccd2"/><rect x="514" y="356" width="34" height="5" fill="#2e3d66"/></g>
      <g data-k="mirror" class="fx"><polygon points="560,378 600,378 596,360 564,360" fill="#9aa3ad"/><rect x="566" y="350" width="28" height="12" fill="#3a3f48" transform="rotate(-12 580 356)"/></g>
      <g data-k="flag" class="fx"><line x1="300" y1="380" x2="300" y2="318" stroke="#ddd" stroke-width="2"/><rect x="300" y="318" width="34" height="22" fill="#e9eef7"/><rect x="300" y="318" width="14" height="11" fill="#2b4a9b"/><g stroke="#c0392b" stroke-width="2"><line x1="314" y1="321" x2="334" y2="321"/><line x1="314" y1="326" x2="334" y2="326"/><line x1="300" y1="333" x2="334" y2="333"/><line x1="300" y1="338" x2="334" y2="338"/></g></g>
      <g data-k="lm" data-px="400" data-py="330">
        <g data-k="lmD">
          <g stroke="#c9ccd2" stroke-width="3"><line x1="374" y1="342" x2="346" y2="378"/><line x1="426" y1="342" x2="454" y2="378"/><line x1="388" y1="346" x2="378" y2="378"/><line x1="412" y1="346" x2="422" y2="378"/></g>
          <ellipse cx="346" cy="379" rx="9" ry="3" fill="#c9ccd2"/><ellipse cx="454" cy="379" rx="9" ry="3" fill="#c9ccd2"/>
          <polygon points="370,320 430,320 438,334 430,348 370,348 362,334" fill="#d9a84a" stroke="#a87a26"/>
          <rect x="394" y="348" width="12" height="6" fill="#555"/>
          ${flame("lmFlame", 400, 354, 40, 9)}
        </g>
        <g data-k="lmA" data-px="400" data-py="300">
          <polygon points="378,320 422,320 428,300 414,282 386,282 372,300" fill="#c9ccd2" stroke="#8a929c"/>
          <polygon points="384,296 394,290 394,302" fill="#1b2433"/><polygon points="416,296 406,290 406,302" fill="#1b2433"/>
          <line x1="410" y1="282" x2="418" y2="268" stroke="#ccc" stroke-width="2"/><circle cx="420" cy="266" r="5" fill="none" stroke="#ccc" stroke-width="2"/>
          ${flame("asFlame", 400, 321, 30, 7)}
        </g>
      </g>
      <g data-k="astro" class="fx" data-px="440" data-py="368"><circle cx="440" cy="352" r="6" fill="#f2f2f2"/><rect x="434" y="358" width="12" height="13" rx="3" fill="#f2f2f2"/><rect x="430" y="359" width="5" height="10" fill="#d0d0d0"/><line x1="437" y1="371" x2="436" y2="379" stroke="#f2f2f2" stroke-width="3"/><line x1="443" y1="371" x2="445" y2="379" stroke="#f2f2f2" stroke-width="3"/><rect x="438" y="349" width="6" height="4" fill="#d4a64a"/></g>
      ${label("l1", 230, 240, "Descent stage: still there", 380, 330)}
      ${label("l2", 610, 290, m.sci, 560, 352)}
      ${label("l3", 210, 300, "Flag", 300, 322)}
      ${m.rover ? `<g data-k="lrv" class="fx"><rect x="640" y="364" width="54" height="7" fill="#c9ccd2"/><rect x="652" y="352" width="10" height="12" fill="#9aa3ad"/><circle cx="702" cy="350" r="7" fill="none" stroke="#ccc" stroke-width="2"/><line x1="694" y1="364" x2="700" y2="356" stroke="#ccc" stroke-width="2"/><g fill="#555"><circle cx="648" cy="374" r="6"/><circle cx="686" cy="374" r="6"/></g></g>${label("l4", 640, 230, "Moon car: still parked", 667, 360)}` : ""}`,
    init: { lm: { x: -330, y: -300, r: -25 } },
    steps: [
      { cap: `The lunar module ${m.lm}, carrying ${m.crew}, leaves the command module in orbit and heads down toward the Moon at about 6,000 km/h.`, dur: 2200, to: { lm: { x: -200, y: -200, r: -18 } } },
      { cap: "Its descent engine fires to slow down. There's no air on the Moon, so there's no parachute: only rocket power.", dur: 3600, on: ["lmFlame"], to: { lm: { x: 0, y: -70, r: 0 } } },
      { cap: `Touchdown on four legs! ${m.quote}The engine kicks up a cloud of Moon dust.`, dur: 2400, on: ["dust"], to: { lm: { x: 0, y: 0 } }, offEnd: ["lmFlame", "dust"] },
      { cap: `The astronauts climb down the ladder and set up ${m.kit}.`, dur: 3200, on: ["astro", "flag", "seis", "mirror", ...(m.rover ? ["lrv"] : [])], to: { astro: [{ x: 30 }, { x: 70 }, { x: 110 }] } },
      { cap: `Time to go home. Only the top half of ${m.lm}, the ascent stage, blasts off. The bottom half is its launch pad.`, dur: 3200, on: ["asFlame"], off: ["astro"], to: { lmA: [{ y: -20 }, { y: -140 }, { y: -400 }] } },
      { cap: `The descent stage, the flag${m.rover ? ", the Moon car" : ""} and the experiments stayed behind. They're still there today.`, dur: 1200, off: ["asFlame"], on: ["l1", "l2", "l3", ...(m.rover ? ["l4"] : [])] }
    ]
    };
  };

  // 2. Surveyor: rocket-only landing on the airless Moon
  S["retro-moon"] = v => {
    const bounce = v === "surveyor3";
    return {
      title: bounce ? "How Surveyor 3 landed (and bounced!)" : "How Surveyor landed on the Moon", world: "moon",
      svg: P => `${BG.moon(P)}
        ${dust("dust", 400, 378)}
        <g data-k="casing" data-px="400" data-py="322"><polygon points="386,306 414,306 418,334 382,334" fill="#5d6470"/><polygon points="390,334 410,334 406,342 394,342" fill="#3a3f48"/>${flame("bigFlame", 400, 342, 60, 14)}</g>
        <g data-k="sv" data-px="400" data-py="330">
          <g stroke="#c9ccd2" stroke-width="3"><line x1="384" y1="338" x2="352" y2="376"/><line x1="416" y1="338" x2="448" y2="376"/><line x1="400" y1="340" x2="400" y2="376"/></g>
          <ellipse cx="352" cy="377" rx="8" ry="3" fill="#c9ccd2"/><ellipse cx="448" cy="377" rx="8" ry="3" fill="#c9ccd2"/><ellipse cx="400" cy="377" rx="8" ry="3" fill="#c9ccd2"/>
          <polygon points="384,312 416,312 420,338 380,338" fill="#e2e5ea" stroke="#8a929c"/>
          <rect x="394" y="286" width="4" height="28" fill="#aab"/><rect x="380" y="280" width="34" height="10" fill="#2e3d66" stroke="#6a7fb5"/>
          <rect x="414" y="318" width="10" height="8" fill="#444"/>
          ${flame("vFlame", 384, 338, 18, 4, "small")}${flame("vFlame2", 416, 338, 18, 4, "small")}
        </g>
        <g data-k="cam" class="fx"><circle cx="419" cy="322" r="14" fill="none" stroke="#7fd4ff" stroke-width="2"/><circle cx="419" cy="322" r="24" fill="none" stroke="#7fd4ff" stroke-width="1.5" opacity=".6"/></g>
        ${label("l1", 570, 250, "Surveyor is still standing here", 430, 320)}`,
      init: { sv: { x: -320, y: -290, r: -20 }, casing: { x: -320, y: -290, r: -20 } },
      steps: [
        { cap: "There's no air on the Moon, so a parachute is useless. Surveyor heads straight down at about 9,000 km/h.", dur: 2400, to: { sv: { x: -210, y: -230, r: -12 }, casing: { x: -210, y: -230, r: -12 } } },
        { cap: "About 75 km up, a big solid rocket fires for about 40 seconds and does most of the braking.", dur: 3000, on: ["bigFlame"], to: { sv: { x: -40, y: -170, r: 0 }, casing: { x: -40, y: -170, r: 0 } } },
        { cap: "The empty rocket drops away. Three small engines take over to steer the lander down gently.", dur: 3000, off: ["bigFlame"], on: ["vFlame", "vFlame2"], to: { casing: [{ x: -10, y: -60, r: 40 }, { x: 60, y: 120, r: 160, o: 0 }], sv: { x: 0, y: -60 } } },
        bounce
          ? { cap: "Bright rocks confused Surveyor 3's radar, so its engines didn't switch off. It touched down… and bounced twice!", dur: 3600, on: ["dust"], to: { sv: [{ y: 0 }, { x: 10, y: -24 }, { x: 18, y: 0 }, { x: 24, y: -10 }, { x: 28, y: 0 }] }, offEnd: ["vFlame", "vFlame2", "dust"] }
          : { cap: "About 4 m above the ground the engines switch off, and it drops softly onto its three legs. The soil holds it up!", dur: 2000, offStart: ["vFlame", "vFlame2"], on: ["dust"], to: { sv: { y: 0 } }, offEnd: ["dust"] },
        { cap: bounce ? "Then it got to work: taking photos and digging the first trenches on another world." : "Then its camera got to work, sending thousands of photos of the surface back to Earth.", dur: 1400, on: ["cam", "l1"] }
      ]
    };
  };

  // 3. Airbag landing (Pathfinder, Spirit, Opportunity)
  S.airbags = v => ({
    title: "How the airbag landers bounced onto Mars", world: "mars",
    svg: P => `${BG.mars(P)}
      <g data-k="tet" class="fx"><polygon points="618,378 662,378 640,352" fill="#c9ccd2" stroke="#8a929c"/></g>
      <g data-k="petals" class="fx"><polygon points="600,378 680,378 664,370 616,370" fill="#9aa3ad"/><polygon points="616,370 664,370 640,350" fill="#c9ccd2"/><polygon points="586,380 616,370 600,378" fill="#2e3d66"/><polygon points="694,380 664,370 680,378" fill="#2e3d66"/></g>
      <g data-k="rov" class="fx" data-px="640" data-py="360"><rect x="626" y="352" width="28" height="10" fill="#d7dbe2" stroke="#8a929c"/><rect x="622" y="348" width="36" height="5" fill="#2e3d66"/><rect x="644" y="336" width="3" height="13" fill="#bbb"/><rect x="640" y="333" width="11" height="5" fill="#ddd"/><circle cx="630" cy="366" r="4" fill="#333"/><circle cx="640" cy="366" r="4" fill="#333"/><circle cx="650" cy="366" r="4" fill="#333"/></g>
      ${capsule(P, `<g data-k="bridle" class="fx" data-px="400" data-py="128"><line x1="400" y1="128" x2="400" y2="176" stroke="#ddd" stroke-width="1.5"/></g>
        <g data-k="rad" class="fx">${flame("radL", 366, 112, 22, 5, "small on")}${flame("radR", 434, 112, 22, 5, "small on")}</g>`)}
      <g data-k="ball" class="fx" data-px="400" data-py="352"><circle cx="400" cy="352" r="26" fill="#f1ede4" stroke="#c9c2b2" stroke-width="2"/><circle cx="386" cy="342" r="11" fill="#fbf8f2" stroke="#c9c2b2"/><circle cx="414" cy="342" r="11" fill="#fbf8f2" stroke="#c9c2b2"/><circle cx="400" cy="364" r="11" fill="#fbf8f2" stroke="#c9c2b2"/></g>
      ${dust("dust", 640, 378)}`,
    init: { cap: { x: -340, y: -230, r: -35 }, chute: { s: .2 }, ball: { y: -124, s: .3 }, bridle: { sy: 0 } },
    steps: [
      { cap: "The spacecraft hits the top of Mars's atmosphere at about 19,000 km/h. Friction makes the heat shield glow hotter than lava.", dur: 3200, on: ["glow"], to: { cap: { x: 0, y: 0, r: 0 } } },
      { cap: "About 9 km up, a parachute pops open and the heat shield falls away.", dur: 2400, off: ["glow"], on: ["chute"], to: { chute: { s: 1 }, hs: { y: 330, o: 0 }, cap: { y: 20 } } },
      { cap: "The lander slides down a 20 m tether below the backshell, and giant airbags inflate around it.", dur: 2400, on: ["bridle", "ball"], to: { bridle: { sy: 1.15 }, ball: { x: 0, y: -124, s: 1 } } },
      { cap: "Just above the ground, rockets on the backshell fire for a moment to stop the fall. Then the tether is cut!", dur: 1800, on: ["rad"], to: { cap: { y: 40 }, ball: { y: -104 } }, offEnd: ["rad", "bridle"] },
      { cap: "The airbag ball drops and bounces across Mars like a giant beach ball, again and again, until it rolls to a stop.", dur: 5200, to: { cap: { x: -420, y: -260, o: 0 }, ball: [{ x: 30, y: 0, r: 90 }, { x: 80, y: -90, r: 200 }, { x: 130, y: 0, r: 300 }, { x: 170, y: -52, r: 380 }, { x: 205, y: 0, r: 450 }, { x: 225, y: -22, r: 500 }, { x: 240, y: 0, r: 540 }] } },
      { cap: "The airbags deflate and are pulled in, revealing the lander inside.", dur: 1600, on: ["tet"], to: { ball: { o: 0, s: .7 } } },
      { cap: v === "pathfinder" ? "Its petals open like a flower, and little Sojourner rolls down a ramp onto Mars." : "Its petals open like a flower, and the rover unfolds and drives off onto Mars.", dur: 3200, off: ["tet"], on: ["petals", "rov"], to: { rov: [{ x: 0 }, { x: 40, y: 2 }, { x: 120, y: 2 }] } }
    ]
  });

  // 4. Sky crane (Curiosity, Perseverance)
  S.skycrane = v => {
    const perse = v === "backshell";
    const R = perse ? "Perseverance" : "Curiosity";
    return {
    title: `How the sky crane lowered ${R} onto Mars`, world: "mars",
    svg: P => `${BG.mars(P)}
      ${puff("crash", 760, 372)}
      <g data-k="cables" class="fx" data-px="400" data-py="252"><line x1="390" y1="252" x2="390" y2="338" stroke="#eee" stroke-width="1.5"/><line x1="410" y1="252" x2="410" y2="338" stroke="#eee" stroke-width="1.5"/></g>
      <g data-k="rov" class="fx" data-px="400" data-py="350"><rect x="370" y="334" width="60" height="18" rx="3" fill="#e8ebf0" stroke="#8a929c"/><rect x="372" y="330" width="56" height="5" fill="#c9ccd2"/><rect x="420" y="300" width="4" height="32" fill="#bbb"/><rect x="414" y="296" width="18" height="7" fill="#ddd"/><rect x="376" y="326" width="16" height="10" fill="#9aa3ad"/><g fill="#333"><circle cx="378" cy="362" r="7"/><circle cx="400" cy="362" r="7"/><circle cx="422" cy="362" r="7"/></g></g>
      <g data-k="ds" class="fx" data-px="400" data-py="240"><rect x="368" y="232" width="64" height="18" rx="4" fill="#c9ccd2" stroke="#8a929c"/><rect x="362" y="240" width="8" height="12" fill="#888"/><rect x="430" y="240" width="8" height="12" fill="#888"/>${flame("dsF1", 366, 252, 22, 5, "small")}${flame("dsF2", 434, 252, 22, 5, "small")}</g>
      ${capsule(P)}
      ${dust("dust", 400, 378)}
      ${label("l1", 560, 230, "The sky crane crashes far away", 740, 360)}`,
    init: { cap: { x: -340, y: -230, r: -35 }, chute: { s: .2 }, ds: { y: -110 }, rov: { y: -190, s: .9 }, cables: { sy: 0 } },
    steps: [
      { cap: `${R}'s capsule plunges into Mars at about 20,000 km/h${perse ? " in February 2021" : " in August 2012"}. The heat shield glows as it slows down.`, dur: 3200, on: ["glow"], to: { cap: { x: 0, y: 0, r: 0 } } },
      { cap: "A huge supersonic parachute opens, and the heat shield drops away so radar can see the ground.", dur: 2400, off: ["glow"], on: ["chute"], to: { chute: { s: 1 }, hs: { y: 330, o: 0 }, cap: { y: 20 } } },
      { cap: "The rover and its rocket “jetpack” drop out of the backshell. Eight rocket engines fire to slow them down.", dur: 3000, on: ["ds", "rov", "dsF1", "dsF2"], to: { cap: { x: 260, y: -260, o: 0 }, ds: [{ y: -80 }, { y: 0 }], rov: [{ y: -160, s: .95 }, { y: -80, s: 1 }] } },
      { cap: "Hovering about 20 m up, the sky crane lowers the rover on cables about 7.5 m long, like a crane on a building site.", dur: 3400, on: ["cables"], to: { rov: { y: 0 }, cables: { sy: 1 } } },
      { cap: "Wheels touch the ground! The cables are cut, and the sky crane flies away to crash a safe distance away.", dur: 3000, on: ["dust"], off: ["cables"], to: { ds: [{ x: 60, y: -60, r: 15 }, { x: 260, y: -120, r: 25 }, { x: 360, y: 120, r: 70, o: 0 }] }, onEnd: ["crash"], offEnd: ["dust", "dsF1", "dsF2"] },
      { cap: perse
          ? "The backshell and parachute crashed nearby. A year later, Ingenuity flew over and photographed them so engineers could study how they survived."
          : "The whole landing takes about seven minutes, too fast for anyone on Earth to help. Engineers call it “seven minutes of terror”.", dur: 1200, on: ["l1"] }
    ]
    };
  };

  // 5. Parachute + rocket legs (Viking, Phoenix, InSight, Mars Polar Lander)
  S["legs-mars"] = v => {
    const fail = v === "polarlander", panels = v === "phoenix" || v === "insight" || v === "polarlander";
    const who = { viking1: "Viking", viking2: "Viking", phoenix: "Phoenix", insight: "InSight", polarlander: "Mars Polar Lander" }[v] || "The lander";
    return {
      title: fail ? "What probably went wrong for Mars Polar Lander" : `How ${who} landed on its legs`, world: "mars",
      svg: P => `${BG.mars(P)}
        ${puff("crash", 400, 378, "#d8b08a")}
        <g data-k="ld" class="fx" data-px="400" data-py="340">
          <g stroke="#c9ccd2" stroke-width="3"><line x1="378" y1="350" x2="358" y2="378"/><line x1="422" y1="350" x2="442" y2="378"/><line x1="400" y1="352" x2="400" y2="378"/></g>
          <ellipse cx="358" cy="379" rx="8" ry="3" fill="#c9ccd2"/><ellipse cx="442" cy="379" rx="8" ry="3" fill="#c9ccd2"/><ellipse cx="400" cy="379" rx="8" ry="3" fill="#c9ccd2"/>
          <polygon points="372,330 428,330 436,342 428,354 372,354 364,342" fill="#e2e5ea" stroke="#8a929c"/>
          ${panels ? `<g data-k="pl" data-px="366" data-py="338"><polygon points="366,338 312,320 300,338 312,356" fill="#2e3d66" stroke="#6a7fb5"/></g><g data-k="pr" data-px="434" data-py="338"><polygon points="434,338 488,320 500,338 488,356" fill="#2e3d66" stroke="#6a7fb5"/></g>`
                   : `<g data-k="mast" data-px="410" data-py="330"><rect x="408" y="300" width="4" height="30" fill="#bbb"/><rect x="402" y="294" width="16" height="8" fill="#ddd"/></g>`}
          ${flame("thL", 376, 354, 24, 5, "small")}${flame("thR", 424, 354, 24, 5, "small")}
        </g>
        ${capsule(P)}
        ${dust("dust", 400, 378)}
        ${fail ? label("l1", 560, 210, "Engines off ~40 m up (probable cause)", 420, 255) : label("l1", 610, 240, `${who} is still here`, 440, 330)}`,
      init: { cap: { x: -340, y: -230, r: -35 }, chute: { s: .2 }, ld: { y: -210, s: .9 }, ...(panels ? { pl: { sx: 0 }, pr: { sx: 0 } } : { mast: { sy: .2 } }) },
      steps: [
        { cap: "The capsule enters Mars's atmosphere, and its heat shield glows as the air slows it down.", dur: 3000, on: ["glow"], to: { cap: { x: 0, y: 0, r: 0 } } },
        { cap: "A parachute opens and the heat shield falls away. The lander's legs swing down.", dur: 2400, off: ["glow"], on: ["chute"], to: { chute: { s: 1 }, hs: { y: 330, o: 0 }, cap: { y: 20 } } },
        { cap: "The lander drops out of the backshell and fires its rocket thrusters to slow down.", dur: 3000, on: ["ld", "thL", "thR"], to: { cap: { x: 260, y: -260, o: 0 }, ld: [{ y: -160, s: 1 }, { y: -120 }] } },
        fail
          ? { cap: "Investigators think a jolt from the legs swinging open was misread as touchdown, so the engines switched off about 40 m up.", dur: 2600, on: ["l1"], offStart: ["thL", "thR"], to: { ld: { y: -120 } } }
          : { cap: "The thrusters slow it to walking speed, and it touches down gently on three legs.", dur: 2600, on: ["dust"], to: { ld: { y: 0 } }, offEnd: ["thL", "thR", "dust"] },
        fail
          ? { cap: "It would have fallen the rest of the way. It was never heard from again, and the lessons helped Phoenix land safely in 2008.", dur: 1800, to: { ld: { y: 0, o: 0 } }, onEnd: ["crash"] }
          : { cap: panels ? "Its round solar panels unfold like fans, and it gets to work." : "Its camera mast rises and it sends the first pictures home.", dur: 2400, on: ["l1"], to: panels ? { pl: { sx: 1 }, pr: { sx: 1 } } : { mast: { sy: 1 } } }
      ]
    };
  };

  // 6. Impactors (Ranger, LCROSS, Deep Impact, GRAIL, S-IVB, LADEE)
  S.impactor = v => {
    const comet = v === "deepimpact", two = v === "lcross" || v === "grail";
    const T = {
      ranger7: ["How Ranger 7 photographed the Moon until it crashed", "Ranger 7 flies straight at the Moon. Its six cameras switch on 17 minutes before impact.", "It sends back 4,308 photos. Each one is closer and sharper than the last.", "Impact at about 2.6 km/s! The last photo showed craters smaller than a car."],
      lcross: ["How LCROSS found water on the Moon", "LCROSS and its empty Centaur rocket stage head for Cabeus, a crater near the south pole that never sees sunlight.", "The Centaur slams into the crater, throwing up a huge plume of dust and ice.", "LCROSS flies through the plume, sniffing it with its instruments, then crashes about 4 minutes later. It found water!"],
      deepimpact: ["How Deep Impact smashed into a comet", "The Deep Impact flyby spacecraft releases a 370 kg impactor in the comet's path.", "The impactor's camera watches comet Tempel 1 get closer, while the flyby craft swerves aside to watch.", "Crash at about 37,000 km/h! The flash and the cloud of fine powder showed what a comet is made of inside."],
      grail: ["How the GRAIL twins ended their mission", "Ebb and Flow, the GRAIL twins, finish mapping the Moon's gravity and fly together toward a mountain near the north pole.", "Ebb hits first.", "Flow follows about 30 seconds later. The site is named after astronaut Sally Ride."],
      sivb16: ["Why Apollo crashed its rockets into the Moon", "After sending Apollo 16 to the Moon, the empty third stage of the Saturn V is steered to crash on purpose.", "It hits at more than 2 km/s.", "The crash sends shakes through the Moon. Seismometers left by earlier crews measure them, revealing what's inside."],
      messenger: ["How MESSENGER ended its mission on Mercury", "Out of fuel after more than four years in orbit, MESSENGER sinks lower and lower over Mercury.", "Its last photos show Mercury's cratered surface closer than ever before.", "It hits at about 14,000 km/h on the side facing away from Earth, making a new crater about 16 m wide."],
      ladee: ["How LADEE ended its mission", "LADEE skims very low over the Moon, studying its thin atmosphere and dust.", "Running low on fuel, it's steered down to the far side.", "It hits the eastern rim of Sundman V crater, far from any historic Apollo site."]
    }[v] || ["How an impactor works", "A spacecraft flies straight at its target.", "It gets closer…", "Impact!"];
    const ground = comet
      ? `<path d="M240 450 Q260 330 380 320 Q470 300 560 340 Q640 360 620 450Z" fill="#5c534a"/><path d="M300 400 Q360 360 430 372" stroke="#463e36" stroke-width="5" fill="none"/>`
      : `<path d="M0 380 Q160 368 330 377 T620 372 T800 378 V450 H0Z" fill="#8d939b"/><ellipse cx="160" cy="410" rx="40" ry="8" fill="#767b83"/>`;
    const craft = (k, color) => `<g data-k="${k}" class="fx" data-px="430" data-py="330"><rect x="420" y="322" width="20" height="16" fill="${color}" stroke="#666"/><rect x="398" y="326" width="22" height="8" fill="#2e3d66"/><rect x="440" y="326" width="22" height="8" fill="#2e3d66"/></g>`;
    return {
      title: T[0], world: comet ? "space" : "moon",
      svg: P => `<rect width="800" height="450" fill="#04060c"/>${stars(80, 5, 360)}${ground}
        <circle cx="70" cy="70" r="26" fill="#3d7bd9"/><path d="M58 60 Q66 52 76 60 Q84 72 70 78 Q58 76 58 60Z" fill="#5fae5f"/><text x="70" y="114" text-anchor="middle" font-size="12" fill="#9eabc2">Earth</text>
        <g data-k="photos" class="fx flicker"><circle cx="300" cy="200" r="3" fill="#7fd4ff"/><circle cx="220" cy="160" r="3" fill="#7fd4ff"/><circle cx="140" cy="115" r="3" fill="#7fd4ff"/></g>
        <g data-k="plume" class="fx" data-px="440" data-py="372"><polygon points="440,372 360,230 520,230" fill="url(#${P}pl)"/><circle cx="440" cy="368" r="20" fill="#fff6d0"/></g>
        <g data-k="rings" class="fx" data-px="440" data-py="378"><ellipse cx="440" cy="378" rx="90" ry="14" fill="none" stroke="#ffb347" stroke-width="2"/><ellipse cx="440" cy="378" rx="170" ry="24" fill="none" stroke="#ffb347" stroke-width="1.5" opacity=".6"/><ellipse cx="440" cy="378" rx="260" ry="34" fill="none" stroke="#ffb347" stroke-width="1" opacity=".35"/></g>
        ${comet ? `<g data-k="mother" class="fx" data-px="560" data-py="140"><rect x="546" y="132" width="28" height="18" fill="#c9ccd2" stroke="#666"/><rect x="520" y="136" width="26" height="9" fill="#2e3d66"/><rect x="574" y="136" width="26" height="9" fill="#2e3d66"/></g>` : ""}
        ${craft("c1", v === "sivb16" ? "#e8e8e8" : "#d9a84a")}${two ? craft("c2", "#c9ccd2") : ""}
        <g data-k="crater" class="fx"><ellipse cx="440" cy="380" rx="34" ry="7" fill="#4a4f57"/></g>
        <defs><linearGradient id="${P}pl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff2c0" stop-opacity=".9"/><stop offset="1" stop-color="#d9c9a8" stop-opacity="0"/></linearGradient></defs>`,
      init: { c1: { x: -380, y: -300, r: 30 }, c2: { x: -470, y: -360, r: 30 }, plume: { s: .1, o: 0 }, rings: { s: .1 }, mother: { x: -360, y: -60 } },
      steps: [
        { cap: T[1], dur: 2800, on: ["c1", ...(two ? ["c2"] : []), ...(comet ? ["mother"] : [])], to: { c1: { x: -220, y: -190 }, c2: { x: -320, y: -250 }, mother: { x: -200, y: -30 } } },
        { cap: T[2], dur: 2800, on: v === "ranger7" || v === "messenger" ? ["photos"] : [], to: { c1: { x: -60, y: -60 }, c2: { x: -150, y: -130 }, mother: { x: 0, y: -40 } } },
        { cap: T[3], dur: 3000, offStart: ["photos"], on: ["plume", ...(v === "sivb16" ? ["rings"] : [])], to: { c1: { x: 10, y: 40, o: 0 }, plume: [{ s: 1, o: 1 }, { s: 1.15, o: .5 }], rings: { s: 1 }, c2: two ? [{ x: -60, y: -60 }, { x: 10, y: 40, o: 0 }] : {}, mother: { x: 280, y: -60 } }, onEnd: ["crater"] }
      ]
    };
  };

  // 7. Laser ranging to the Apollo retroreflector
  S.laser = () => ({
    title: "How a laser measures the distance to the Moon", world: "space",
    svg: P => `${BG.space(P)}
      <circle cx="120" cy="230" r="70" fill="#3d7bd9"/><path d="M80 200 Q110 170 150 205 Q170 240 130 262 Q95 258 80 200Z" fill="#5fae5f"/><text x="120" y="330" text-anchor="middle" font-size="14" fill="#9eabc2">Earth</text>
      <circle cx="690" cy="230" r="44" fill="#b9bec6"/><circle cx="676" cy="216" r="8" fill="#9aa0a8"/><circle cx="702" cy="246" r="6" fill="#9aa0a8"/><text x="690" y="300" text-anchor="middle" font-size="14" fill="#9eabc2">Moon</text>
      <rect x="182" y="222" width="18" height="10" fill="#ddd" transform="rotate(-8 190 227)"/>
      <g data-k="beam" class="fx" data-px="200" data-py="226"><line x1="200" y1="226" x2="646" y2="226" stroke="#ff3d3d" stroke-width="1.5" stroke-dasharray="3 9" opacity=".5"/></g>
      <g data-k="pulse"><circle cx="200" cy="226" r="6" fill="#ff4d4d"/><circle cx="200" cy="226" r="12" fill="#ff4d4d" opacity=".3"/></g>
      <g data-k="ret" class="fx"><rect x="640" y="218" width="12" height="12" fill="#ffd08a"/></g>
      <text x="400" y="120" text-anchor="middle" font-size="40" font-weight="700" fill="#ffd08a" font-family="Space Grotesk, sans-serif" data-k="timer">0.00 s</text>
      <text x="400" y="150" text-anchor="middle" font-size="13" fill="#9eabc2">time since the laser fired</text>`,
    init: {},
    steps: [
      { cap: "A telescope on Earth fires short, powerful laser pulses at the mirror Apollo 11 left on the Moon.", dur: 1200, on: ["beam", "ret"] },
      { cap: "Light is the fastest thing there is, but the Moon is far away: each pulse takes about 1.3 seconds to get there.", dur: 3200, to: { pulse: { x: 446 } }, count: { k: "timer", from: 0, to: 1.28 } },
      { cap: "The mirror's corner-cube prisms bounce the light straight back to where it came from. Only a few particles of light make it home!", dur: 3200, to: { pulse: { x: 0 } }, count: { k: "timer", from: 1.28, to: 2.56 } },
      { cap: "The round trip takes about 2.5 seconds. Timing it exactly tells scientists the distance to within millimetres. The Moon is drifting away about 3.8 cm a year.", dur: 1000 }
    ]
  });

  // 8. Gravity assist (Voyager, Pioneer, New Horizons)
  S.slingshot = v => ({
    title: "How a planet's gravity flings a probe faster (gravity assist)", world: "space",
    svg: P => `${BG.space(P)}
      <circle cx="-60" cy="225" r="110" fill="url(#${P}sun)"/><text x="30" y="380" font-size="13" fill="#9eabc2">toward the Sun</text>
      <path d="M140 450 Q420 120 800 210" fill="none" stroke="#334466" stroke-width="2" stroke-dasharray="6 6"/>
      <g data-k="planet" data-px="420" data-py="236"><circle cx="420" cy="236" r="44" fill="#d9b38c"/><path d="M378 226 Q420 216 462 226" stroke="#b98a5e" stroke-width="7" fill="none"/><path d="M380 250 Q420 242 460 250" stroke="#c99a6e" stroke-width="5" fill="none"/></g>
      <path data-k="trail" d="M130 420 Q330 336 432 322 Q508 310 498 250 Q486 192 548 166 Q636 122 790 40" fill="none" stroke="#7fd4ff" stroke-width="2" pathLength="1"/>
      <path data-k="route" d="M130 420 Q330 336 432 322 Q508 310 498 250 Q486 192 548 166 Q636 122 790 40" fill="none" stroke="none"/>
      <g data-k="probe" data-path="route"><circle cx="0" cy="0" r="6" fill="#fff"/><circle cx="0" cy="0" r="12" fill="#7fd4ff" opacity=".35"/></g>
      <text x="600" y="400" font-size="15" fill="#9eabc2">probe speed</text><text data-k="spd" x="600" y="430" font-size="26" font-weight="700" fill="#ffd08a" font-family="Space Grotesk, sans-serif">10 km/s</text>
      <defs><radialGradient id="${P}sun"><stop offset="0" stop-color="#fff6c8"/><stop offset=".6" stop-color="#ffb347"/><stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/></radialGradient></defs>`,
    init: { probe: { p: 0 }, trail: { d: 0 }, planet: { x: -80, y: 30 } },
    steps: [
      { cap: "The probe aims to pass just behind a giant planet as the planet travels around the Sun.", dur: 2600, to: { probe: { p: .3 }, trail: { d: .3 }, planet: { x: -40, y: 14 } } },
      { cap: "The planet's gravity grabs the probe and swings it around, like a ball on a string.", dur: 3000, to: { probe: { p: .62 }, trail: { d: .62 }, planet: { x: 0, y: 0 } }, count: { k: "spd", from: 10, to: 14, fmt: n => n.toFixed(0) + " km/s" } },
      { cap: "Because the planet is moving, the probe leaves faster than it arrived, stealing a tiny bit of the planet's energy.", dur: 3000, to: { probe: { p: 1 }, trail: { d: 1 }, planet: { x: 14, y: -5 } }, count: { k: "spd", from: 14, to: 20, fmt: n => n.toFixed(0) + " km/s" } },
      { cap: v === "dawn" ? "Dawn flew past Mars in 2009 for a gravity boost toward the asteroid belt. Then its gentle ion engines did the rest, carrying it to Vesta and Ceres." : v === "voyager2" ? "Voyager 2 did this at Jupiter, Saturn and Uranus to reach Neptune, using a planet line-up that happens only about every 175 years." : v === "newhorizons" ? "New Horizons used Jupiter's gravity in 2007 to cut years off its trip to Pluto." : "Pioneer and Voyager used Jupiter and Saturn like this to fling themselves out of the solar system. (Speeds here are just for illustration.)", dur: 1000 }
    ]
  });

  // 9. Ingenuity flight
  S.helicopter = () => ({
    title: "How Ingenuity flew on Mars", world: "mars",
    svg: P => `${BG.mars(P)}
      <g data-k="shadow"><ellipse cx="300" cy="380" rx="26" ry="5" fill="#000" opacity=".25"/></g>
      <g data-k="rov" data-px="300" data-py="340"><rect x="250" y="318" width="100" height="26" rx="4" fill="#e8ebf0" stroke="#8a929c"/><rect x="330" y="270" width="5" height="50" fill="#bbb"/><rect x="322" y="264" width="22" height="9" fill="#ddd"/><g fill="#333"><circle cx="262" cy="356" r="10"/><circle cx="300" cy="356" r="10"/><circle cx="338" cy="356" r="10"/></g></g>
      <g data-k="heli" data-px="300" data-py="352">
        <g stroke="#bbb" stroke-width="2"><line x1="292" y1="362" x2="282" y2="378"/><line x1="308" y1="362" x2="318" y2="378"/></g>
        <rect x="290" y="350" width="20" height="14" rx="2" fill="#d7dbe2" stroke="#8a929c"/>
        <rect x="299" y="328" width="2" height="22" fill="#999"/><rect x="290" y="324" width="20" height="5" fill="#2e3d66"/>
        <g data-k="rot1" class="fx-keep rotor"><rect class="blade" style="transform-origin:300px 335px" x="262" y="334" width="76" height="3" rx="1.5" fill="#333"/></g>
        <g data-k="rot2" class="fx-keep rotor rev"><rect class="blade" style="transform-origin:300px 341px" x="262" y="340" width="76" height="3" rx="1.5" fill="#333"/></g>
      </g>
      <text data-k="alt" x="640" y="70" font-size="24" font-weight="700" fill="#4a2410" font-family="Space Grotesk, sans-serif">0 m</text><text x="640" y="92" font-size="12" fill="#4a2410">height</text>`,
    init: { heli: { y: -2, s: .9 }, shadow: { o: 0 } },
    steps: [
      { cap: "Ingenuity rode to Mars folded up under Perseverance's belly. In April 2021 the rover gently set it down on the ground.", dur: 2400, to: { heli: { y: 14, s: 1 } } },
      { cap: "Then the rover drove away, so the little helicopter could charge its batteries with sunlight.", dur: 2600, to: { rov: { x: -420 } } },
      { cap: "Mars's air is only about 1% as thick as Earth's, so its two rotors spin in opposite directions about 2,500 times a minute.", dur: 2400, on: ["rot1", "rot2"] },
      { cap: "Lift-off! On 19 April 2021 it became the first aircraft to make a powered, controlled flight on another planet.", dur: 3000, to: { heli: { y: -110 }, shadow: { o: 1, s: .6 } }, count: { k: "alt", from: 0, to: 3, fmt: n => n.toFixed(0) + " m" } },
      { cap: "Over almost three years it flew 72 times, scouting routes for the rover from as high as 24 m.", dur: 3400, to: { heli: [{ x: 120, y: -150 }, { x: 260, y: -130 }, { x: 320, y: 14 }], shadow: [{ x: 120, s: .5 }, { x: 260, s: .55 }, { x: 320, s: 1 }] }, count: { k: "alt", from: 3, to: 0, fmt: n => n.toFixed(0) + " m" } },
      { cap: "On its 72nd flight a rotor blade was damaged. Ingenuity still stands at its final airfield, unable to fly.", dur: 1200, off: ["rot1", "rot2"] }
    ]
  });

  // 10. Seismometers: marsquakes and moonquakes
  S.quake = v => {
    const moon = v === "apollo12";
    return {
      title: moon ? "How a crash made the Moon ring like a bell" : "How InSight listened to marsquakes", world: "space",
      svg: P => `${BG.space(P)}
        <circle cx="300" cy="240" r="170" fill="${moon ? "#8d939b" : "#b5562e"}"/><circle cx="300" cy="240" r="140" fill="${moon ? "#6f747b" : "#8a3e20"}"/>
        <circle cx="300" cy="240" r="${moon ? 40 : 88}" fill="${moon ? "#a8714a" : "#d9893d"}"/><text x="300" y="245" text-anchor="middle" font-size="12" fill="#1b1203" font-weight="700">${moon ? "small core" : "liquid core"}</text>
        <text x="300" y="${moon ? 160 : 132}" text-anchor="middle" font-size="12" fill="#f0e2d0">mantle</text>
        <g data-k="src" class="fx"><polygon points="${moon ? "180,110 188,94 196,110 212,112 199,122 204,138 188,128 172,138 177,122 164,112" : "160,140 168,124 176,140 192,142 179,152 184,168 168,158 152,168 157,152 144,142"}" fill="#ffd08a"/></g>
        <g data-k="w1" class="fx" data-px="${moon ? 188 : 168}" data-py="${moon ? 116 : 146}"><circle cx="${moon ? 188 : 168}" cy="${moon ? 116 : 146}" r="60" fill="none" stroke="#ffd08a" stroke-width="3"/></g>
        <g data-k="w2" class="fx" data-px="${moon ? 188 : 168}" data-py="${moon ? 116 : 146}"><circle cx="${moon ? 188 : 168}" cy="${moon ? 116 : 146}" r="60" fill="none" stroke="#ffd08a" stroke-width="2" opacity=".6"/></g>
        <path data-k="ray" class="fx" d="${moon ? "M188 116 Q300 200 410 180" : "M168 146 Q300 330 428 300"}" fill="none" stroke="#7fd4ff" stroke-width="2.5" stroke-dasharray="6 5"/>
        <g><rect x="${moon ? 404 : 422}" y="${moon ? 166 : 286}" width="16" height="14" fill="#e2e5ea"/><text x="${moon ? 428 : 446}" y="${moon ? 178 : 298}" font-size="12" fill="#e9eef7">seismometer</text></g>
        <rect x="520" y="300" width="250" height="110" rx="10" fill="#0f1729" stroke="#2f4166"/><text x="534" y="322" font-size="12" fill="#9eabc2">seismometer reading</text>
        <path data-k="trace" d="M534 360 L560 360 L565 352 L570 368 L575 344 L580 376 L586 340 L592 380 L598 346 L604 372 L610 352 L616 366 L622 356 L628 364 L640 358 L660 362 L680 358 L700 361 L720 359 L756 360" fill="none" stroke="#ffd08a" stroke-width="2" pathLength="1"/>`,
      init: { w1: { s: .05 }, w2: { s: .05 }, trace: { d: 0 } },
      steps: [
        moon
          ? { cap: "After Apollo 12's astronauts left, the empty top half of their lunar module was crashed into the Moon on purpose.", dur: 1400, on: ["src"] }
          : { cap: "Deep inside Mars, rocks crack and slip. That's a marsquake!", dur: 1400, on: ["src"] },
        { cap: "Shaking spreads out through the planet as waves, like ripples in a pond.", dur: 2600, on: ["w1", "w2"], to: { w1: { s: 4.5, o: 0 }, w2: [{ s: .05 }, { s: 3, o: 0 }] } },
        { cap: moon ? "The seismometer the crew left behind felt the shaking…" : "Some waves travel straight through, and some bounce off the core before reaching InSight's seismometer.", dur: 2400, on: ["ray"], to: { trace: { d: .6 } } },
        { cap: moon ? "…and the Moon kept vibrating for nearly an hour! Its dry, cracked rock doesn't soak up the shaking the way Earth's does." : "Timing when each wave arrives revealed Mars's layers, including a big liquid metal core. InSight heard more than 1,300 marsquakes.", dur: 2400, to: { trace: { d: 1 } } }
      ]
    };
  };

  // 11. Plunging into a planet (Pioneer Venus, Galileo probe, Cassini)
  S.plunge = v => {
    const C = {
      pioneervenus: { title: "How the Pioneer Venus probes dropped into Venus", sky: ["#f3d58a", "#d9a64a", "#a8742a"], band: "#f7e3a8", par: true,
        caps: ["The carrier spacecraft releases four probes weeks before arrival, each aimed at a different part of Venus.",
               "Each probe hits the thick clouds behind a heat shield. The big probe opens a parachute; the small ones simply fall.",
               "For about an hour they measure temperature, pressure, winds and the sulfuric-acid clouds all the way down.",
               "They hit the scorching surface at about 35 km/h. Three went quiet, but the Day Probe kept talking for 67 minutes!"] },
      galileo: { title: "How Galileo's probe dived into Jupiter", sky: ["#e9cfa6", "#c48a5a", "#8a5232"], band: "#f3e2c4", par: true,
        caps: ["Five months after separating from Galileo, the probe hits Jupiter's atmosphere at about 170,000 km/h, the fastest entry ever.",
               "A heat shield takes the scorching heat of slowing down, then a parachute opens.",
               "For about 58 minutes it radios measurements up to the Galileo orbiter, which relays them home to Earth.",
               "About 150 km down, heat and crushing pressure silence it. It melted deep inside Jupiter, which has no solid ground to land on."] },
      cassini: { title: "How Cassini made its final plunge into Saturn", sky: ["#f1e2b8", "#d4b47a", "#a88850"], band: "#f8efd2", par: false,
        caps: ["Low on fuel, Cassini is steered into Saturn on purpose, so it can never crash onto Enceladus or Titan, moons that might hold life.",
               "It enters Saturn's atmosphere at about 120,000 km/h, firing its thrusters to keep its antenna pointed at Earth.",
               "For about a minute it sends brand-new measurements of Saturn's air, until it can't hold steady any more.",
               "Then it burns up like a shooting star. Its final signal took 83 minutes to reach Earth."] }
    }[v];
    const c = C || { title: "Plunge", sky: ["#ccc", "#999", "#666"], band: "#eee", par: false, caps: ["", "", "", ""] };
    const relay = v === "galileo" || v === "pioneervenus";
    const smalls = v === "pioneervenus"
      ? `<g data-k="p2" class="fx" data-px="250" data-py="150"><path d="M242 144 Q250 140 258 144 L257 154 Q250 158 243 154Z" fill="#9aa3ad"/></g><g data-k="p3" class="fx" data-px="560" data-py="150"><path d="M552 144 Q560 140 568 144 L567 154 Q560 158 553 154Z" fill="#9aa3ad"/></g><g data-k="p4" class="fx" data-px="160" data-py="150"><path d="M152 144 Q160 140 168 144 L167 154 Q160 158 153 154Z" fill="#9aa3ad"/></g><path d="M0 430 Q200 418 400 428 T800 424 V450 H0Z" fill="#6b4a2a"/>`
      : "";
    const body = v === "cassini"
      ? `<rect x="388" y="140" width="24" height="20" fill="#d9a84a"/><circle cx="400" cy="134" r="14" fill="#e8e8e8"/>`
      : `<path d="M384 140 Q400 132 416 140 L414 158 Q400 166 386 158Z" fill="#9aa3ad" stroke="#666"/>`;
    const sx = v === "cassini" ? [300, 200, 120] : [520, 580, 620];
    return {
      title: c.title, world: "space",
      svg: P => `<defs><linearGradient id="${P}atm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070d"/><stop offset=".28" stop-color="${c.sky[0]}"/><stop offset=".65" stop-color="${c.sky[1]}"/><stop offset="1" stop-color="${c.sky[2]}"/></linearGradient>
        <radialGradient id="${P}hot"><stop offset="0" stop-color="#fff2b0"/><stop offset="1" stop-color="#ff6a2a" stop-opacity="0"/></radialGradient></defs>
        <rect width="800" height="450" fill="url(#${P}atm)"/>${stars(30, 9, 110)}
        <g opacity=".45"><path d="M0 190 Q200 175 400 192 T800 186" stroke="${c.band}" stroke-width="16" fill="none"/><path d="M0 280 Q220 266 420 284 T800 276" stroke="${c.band}" stroke-width="22" fill="none"/><path d="M0 370 Q200 356 400 374 T800 366" stroke="${c.band}" stroke-width="18" fill="none"/></g>
        <circle cx="60" cy="48" r="16" fill="#3d7bd9"/><text x="60" y="80" text-anchor="middle" font-size="13" fill="#cfd8e6">Earth</text>
        ${relay ? `<g data-k="mother"><rect x="640" y="40" width="26" height="14" fill="#c9ccd2"/><rect x="618" y="44" width="22" height="6" fill="#2e3d66"/><rect x="666" y="44" width="22" height="6" fill="#2e3d66"/><text x="653" y="76" text-anchor="middle" font-size="13" fill="#cfd8e6">${v === "galileo" ? "Galileo orbiter" : "carrier"}</text></g>` : ""}
        <g data-k="sig" class="fx flicker"><circle cx="${sx[0]}" cy="150" r="4" fill="#7fd4ff"/><circle cx="${sx[1]}" cy="100" r="4" fill="#7fd4ff"/><circle cx="${sx[2]}" cy="64" r="4" fill="#7fd4ff"/></g>
        <g data-k="pr" data-px="400" data-py="150">
          <g data-k="chute" class="fx" data-px="400" data-py="118"><path d="M370 112 Q400 78 430 112Z" fill="#f2f2f2"/><line x1="372" y1="112" x2="394" y2="140" stroke="#ddd"/><line x1="428" y1="112" x2="406" y2="140" stroke="#ddd"/></g>
          ${body}
          <g data-k="hot" class="fx flicker"><ellipse cx="400" cy="168" rx="26" ry="12" fill="url(#${P}hot)"/></g>
        </g>
        ${smalls}
        <g data-k="end" class="fx"><circle cx="400" cy="380" r="10" fill="#fff6d0"/><circle cx="400" cy="380" r="22" fill="#ffb347" opacity=".4"/></g>`,
      init: { pr: { x: v === "cassini" ? -220 : 0, y: -190, s: .8 }, chute: { s: .3 }, p2: { y: -190 }, p3: { y: -190 }, p4: { y: -190 } },
      steps: [
        { cap: c.caps[0], dur: 2600, on: v === "pioneervenus" ? ["p2", "p3", "p4"] : [], to: { pr: { x: 0, y: -60, s: 1 }, p2: { y: -60 }, p3: { y: -60 }, p4: { y: -60 } } },
        { cap: c.caps[1], dur: 2800, on: ["hot", ...(c.par ? [] : ["sig"])], to: { pr: { y: 20 }, p2: { y: 30 }, p3: { y: 20 }, p4: { y: 40 } }, offEnd: ["hot"], onEnd: c.par ? ["chute"] : [] },
        { cap: c.caps[2], dur: 3200, on: ["sig"], to: { pr: { y: 120 }, chute: { s: 1 }, p2: { y: 160 }, p3: { y: 150 }, p4: { y: 170 } } },
        { cap: c.caps[3], dur: 2600, off: ["sig", "chute"], to: { pr: v === "pioneervenus" ? { y: 270 } : { y: 230, o: 0, s: .6 }, p2: { y: 275, o: .5 }, p3: { y: 270, o: .5 }, p4: { y: 275, o: .5 } }, onEnd: v === "pioneervenus" ? ["sig"] : ["end"] }
      ]
    };
  };

  /* ---------------- which machine gets which explainer ---------------- */
  const FOR = {
    apollo11: [["apollo-lm", "apollo11"], ["laser"]], apollo12: [["apollo-lm", "apollo12"], ["quake", "apollo12"]], apollo14: [["apollo-lm", "apollo14"]], apollo15: [["apollo-lm", "apollo15"]], apollo16: [["apollo-lm", "apollo16"]], apollo17: [["apollo-lm", "apollo17"]],
    surveyor1: [["retro-moon"]], surveyor3: [["retro-moon", "surveyor3"]],
    ranger7: [["impactor", "ranger7"]], lcross: [["impactor", "lcross"]], grail: [["impactor", "grail"]], sivb16: [["impactor", "sivb16"]], ladee: [["impactor", "ladee"]], deepimpact: [["impactor", "deepimpact"]], messenger: [["impactor", "messenger"]], pioneervenus: [["plunge", "pioneervenus"]], galileo: [["plunge", "galileo"]], cassini: [["plunge", "cassini"]], dawn: [["slingshot", "dawn"]],
    viking1: [["legs-mars", "viking1"]], viking2: [["legs-mars", "viking2"]], phoenix: [["legs-mars", "phoenix"]], insight: [["legs-mars", "insight"], ["quake", "insight"]], polarlander: [["legs-mars", "polarlander"]],
    pathfinder: [["airbags", "pathfinder"]], sojourner: [["airbags", "pathfinder"]], spirit: [["airbags", "spirit"]], opportunity: [["airbags", "opportunity"]],
    curiosity: [["skycrane", "curiosity"]], backshell: [["skycrane", "backshell"]], ingenuity: [["helicopter"]],
    voyager1: [["slingshot", "voyager1"]], voyager2: [["slingshot", "voyager2"]], pioneer10: [["slingshot", "pioneer10"]], pioneer11: [["slingshot", "pioneer11"]], newhorizons: [["slingshot", "newhorizons"]]
  };
  // The gallery on the main page: one of each kind.
  const GALLERY = [
    ["apollo-lm", "apollo11", "Apollo landing"], ["retro-moon", "surveyor1", "Rocket landing"], ["airbags", "opportunity", "Airbag bounce"],
    ["skycrane", "curiosity", "Sky crane"], ["legs-mars", "phoenix", "Parachute + legs"], ["helicopter", "ingenuity", "First flight on Mars"],
    ["impactor", "lcross", "Crashing on purpose"], ["laser", "apollo11", "Laser to the Moon"], ["quake", "insight", "Marsquakes"], ["slingshot", "voyager2", "Gravity assist"], ["plunge", "cassini", "Diving into a giant planet"]
  ];

  /* ---------------- the player ---------------- */
  const EASE = { inout: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, linear: t => t };
  const D = { x: 0, y: 0, r: 0, s: 1, sx: 1, sy: 1, o: 1 };
  let uid = 0;

  function mount(root, sceneId, variant, opts = {}) {
    const def = S[sceneId](variant);
    const P = "ex" + (++uid) + "-";
    const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.body.classList.contains("reduce-motion");
    root.classList.add("ex");
    root.innerHTML = `
      <div class="ex-stage">
        <svg viewBox="0 0 800 450" role="img" aria-label="${def.title}">${def.svg(P)}</svg>
        <button class="ex-big" type="button" aria-label="Play animation: ${def.title}"><span>▶</span></button>
      </div>
      <p class="ex-cap" aria-live="polite"></p>
      <div class="ex-bar">
        <button class="ex-btn" data-a="prev" aria-label="Previous step">⏮</button>
        <button class="ex-btn ex-play" data-a="play" aria-label="Play">▶</button>
        <button class="ex-btn" data-a="next" aria-label="Next step">⏭</button>
        <div class="ex-dots" role="group" aria-label="Steps"></div>
        ${GOESpeed.html()}
        <button class="ex-btn ex-narr" data-a="narr" aria-pressed="false" title="Read the captions aloud">🔊</button>
        <button class="ex-btn" data-a="replay" aria-label="Replay from the start">↻</button>
      </div>`;
    const svg = root.querySelector("svg"), cap = root.querySelector(".ex-cap"), dots = root.querySelector(".ex-dots");
    const playBtn = root.querySelector(".ex-play"), big = root.querySelector(".ex-big"), narrBtn = root.querySelector(".ex-narr");
    const els = {};
    svg.querySelectorAll("[data-k]").forEach(el => {
      const k = el.dataset.k;
      let px = parseFloat(el.dataset.px), py = parseFloat(el.dataset.py);
      if (isNaN(px) || isNaN(py)) { try { const b = el.getBBox(); px = b.x + b.width / 2; py = b.y + b.height / 2; } catch { px = py = 0; } }
      const e = { el, px, py };
      if (el.dataset.path) e.path = svg.querySelector(`[data-k="${el.dataset.path}"]`);
      if (el.getAttribute("pathLength") === "1") { el.style.strokeDasharray = "1 1"; e.dash = true; }
      els[k] = e;
    });
    dots.innerHTML = def.steps.map((s, i) => `<button class="ex-dot" data-i="${i}" aria-label="Step ${i + 1}"></button>`).join("");

    const apply = (k, st) => {
      const e = els[k]; if (!e) return;
      const s = { ...D, ...st };
      let x = s.x, y = s.y;
      if (e.path && s.p != null) {
        const L = e.len ?? (e.len = e.path.getTotalLength()), pt = e.path.getPointAtLength(Math.max(0, Math.min(1, s.p)) * L); // length measured once, not every frame
        x += pt.x; y += pt.y;
      }
      e.el.setAttribute("transform", `translate(${x} ${y}) translate(${e.px} ${e.py}) rotate(${s.r}) scale(${s.s * s.sx} ${s.s * s.sy}) translate(${-e.px} ${-e.py})`);
      e.el.style.opacity = s.o;
      if (e.dash && s.d != null) e.el.style.strokeDashoffset = 1 - s.d;
    };
    const setCount = (c, v) => { const e = els[c.k]; if (e) e.el.textContent = c.fmt ? c.fmt(v) : v.toFixed(2) + " s"; };
    const cls = (list, on) => (list || []).forEach(k => els[k] && els[k].el.classList.toggle("on", on));
    const frames = t => (Array.isArray(t) ? t : [t]);

    let cur = {}, step = -1, playing = false, frozen = false, raf = 0, timer = 0, tween = null, narrate = false, waitSpeech = false, destroyed = false;

    function stateBefore(i) {
      const st = {};
      Object.entries(def.init || {}).forEach(([k, v]) => (st[k] = { ...v }));
      Object.values(els).forEach(e => e.el.classList.toggle("on", e.el.dataset.keep === "1"));
      def.steps.slice().reverse().forEach(s => s.count && setCount(s.count, s.count.from));
      for (let j = 0; j < i; j++) {
        const s = def.steps[j];
        cls(s.offStart, false); cls(s.on, true); cls(s.off, false);
        Object.entries(s.to || {}).forEach(([k, v]) => frames(v).forEach(f => (st[k] = { ...(st[k] || {}), ...f })));
        cls(s.onEnd, true); cls(s.offEnd, false);
        if (s.count) setCount(s.count, s.count.to);
      }
      return st;
    }
    function render(st) { Object.keys(els).forEach(k => apply(k, st[k] || {})); }
    function setDots() { dots.querySelectorAll(".ex-dot").forEach((d, i) => { d.classList.toggle("done", i < step); d.setAttribute("aria-current", i === step); }); }
    function setPlay(p) { playing = p; playBtn.textContent = p ? "⏸" : "▶"; playBtn.setAttribute("aria-label", p ? "Pause" : "Play"); root.classList.toggle("playing", p); }

    function goTo(i, animate) {
      cancelAnimationFrame(raf); clearTimeout(timer); tween = null; frozen = false;
      if (i < 0) i = 0;
      if (i >= def.steps.length) { setPlay(false); return; }
      cur = stateBefore(i);
      render(cur);
      step = i; setDots();
      big.hidden = true;
      const s = def.steps[i];
      cap.textContent = s.cap;
      if (narrate) speak(s.cap);
      cls(s.offStart, false); cls(s.on, true); cls(s.off, false);
      const target = {};
      const keys = Object.keys(s.to || {});
      keys.forEach(k => (target[k] = frames(s.to[k]).reduce((acc, f) => { acc.push({ ...(acc.length ? acc[acc.length - 1] : cur[k] || {}), ...f }); return acc; }, [])));
      const base = animate && !reduce() ? (s.dur || 1500) * (opts.speed || 1) : 0, dur = base / GOESpeed.get();
      const start = keys.reduce((o, k) => ((o[k] = { ...D, ...(cur[k] || {}) }), o), {});
      tween = { t0: performance.now(), elapsed: 0, dur, base };
      const lerp = (a, b, t) => a + (b - a) * t;
      const frame = now => {
        if (!tween) return;
        if (!frozen) tween.elapsed = now - tween.t0;
        else { tween.t0 = now - tween.elapsed; raf = requestAnimationFrame(frame); return; }
        const t = tween.dur ? Math.min(1, tween.elapsed / tween.dur) : 1;
        keys.forEach(k => {
          const fs = target[k], n = fs.length, seg = Math.min(n - 1, Math.floor(t * n)), lt = EASE.inout(Math.min(1, t * n - seg));
          const a = seg === 0 ? start[k] : { ...D, ...fs[seg - 1] }, b = { ...D, ...fs[seg] };
          const st = {};
          ["x", "y", "r", "s", "sx", "sy", "o", "d", "p"].forEach(p => {
            const av = a[p] ?? (p === "d" || p === "p" ? (cur[k] && cur[k][p]) ?? 0 : D[p]), bv = b[p] ?? av;
            if (av != null) st[p] = lerp(av, bv, n === 1 ? EASE.inout(t) : lt);
          });
          apply(k, st);
        });
        if (s.count) setCount(s.count, lerp(s.count.from, s.count.to, EASE.inout(t)));
        if (t < 1) { raf = requestAnimationFrame(frame); return; }
        keys.forEach(k => (cur[k] = { ...(cur[k] || {}), ...fs_last(target[k]) }));
        cls(s.onEnd, true); cls(s.offEnd, false);
        tween = null;
        if (playing) scheduleNext();
      };
      const fs_last = fs => fs[fs.length - 1];
      if (dur === 0) frame(performance.now()); // instant steps (reduce motion) don't wait for a frame
      else raf = requestAnimationFrame(frame);
    }
    function scheduleNext() {
      const s = def.steps[step];
      const hold = Math.max(1400, s.cap.length * 32) / GOESpeed.get();
      const go = () => { if (!playing || destroyed) return; if (step + 1 < def.steps.length) goTo(step + 1, true); else setPlay(false); };
      if (narrate && "speechSynthesis" in window && speechSynthesis.speaking) { waitSpeech = true; return; }
      timer = setTimeout(go, reduce() ? hold + 800 : hold);
    }
    function speak(text) {
      if (!("speechSynthesis" in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.rate = [.95, 1.3, 1.6][GOESpeed.get() - 1];
      u.onend = () => { if (waitSpeech && playing && !destroyed) { waitSpeech = false; timer = setTimeout(() => { if (playing) (step + 1 < def.steps.length ? goTo(step + 1, true) : setPlay(false)); }, 400); } };
      speechSynthesis.speak(u);
    }

    function play() {
      if (step < 0 || (step >= def.steps.length - 1 && !tween)) { setPlay(true); goTo(0, true); return; }
      setPlay(true); frozen = false;
      if (!tween) scheduleNext();
    }
    function pause() { setPlay(false); if (tween) frozen = true; clearTimeout(timer); waitSpeech = false; try { speechSynthesis.cancel(); } catch { } }
    function stepTo(i) { setPlay(false); clearTimeout(timer); waitSpeech = false; try { speechSynthesis.cancel(); } catch { } goTo(i, true); }

    root.addEventListener("click", e => {
      const b = e.target.closest("[data-a], .ex-dot, .ex-big"); if (!b) return;
      if (b.classList.contains("ex-big")) return play();
      if (b.classList.contains("ex-dot")) return stepTo(+b.dataset.i);
      const a = b.dataset.a;
      if (a === "play") return playing ? pause() : play();
      if (a === "prev") return stepTo(Math.max(0, step - 1));
      if (a === "next") return stepTo(Math.min(def.steps.length - 1, step + 1));
      if (a === "replay") { setPlay(true); return goTo(0, true); }
      if (a === "narr") { narrate = !narrate; narrBtn.setAttribute("aria-pressed", narrate); if (narrate && step >= 0) speak(def.steps[step].cap); else try { speechSynthesis.cancel(); } catch { } }
    });

    // changing the speed takes effect straight away, even in the middle of a move
    const offSpeed = GOESpeed.on(v => {
      if (tween && tween.dur) {
        const now = performance.now();
        if (!frozen) tween.elapsed = now - tween.t0;
        const f = tween.elapsed / tween.dur;
        tween.dur = tween.base / v; tween.elapsed = f * tween.dur; tween.t0 = now - tween.elapsed;
      } else if (playing && !waitSpeech) { clearTimeout(timer); scheduleNext(); }
    });

    // initial poster frame: the start of step 1, waiting for Play
    cur = stateBefore(0); render(cur);
    cap.textContent = def.title + " — press play, or step through with ⏭.";
    // pause when scrolled out of view
    const io = new IntersectionObserver(en => en.forEach(x => { if (!x.isIntersecting && playing) pause(); }), { threshold: .1 });
    io.observe(root);
    if (opts.autoplay && !reduce()) play();

    return {
      title: def.title,
      destroy() { destroyed = true; pause(); cancelAnimationFrame(raf); io.disconnect(); offSpeed(); root.innerHTML = ""; root.classList.remove("ex", "playing"); }
    };
  }

  // Short text answers for the Ask page ("how did X land?")
  function summary(artifactId) {
    const list = FOR[artifactId]; if (!list) return null;
    const def = S[list[0][0]](list[0][1]);
    return { title: def.title, steps: def.steps.map(s => s.cap) };
  }

  window.Explainers = { mount, forArtifact: id => (FOR[id] || []).map(([s, v]) => ({ scene: s, variant: v, title: S[s](v).title })), GALLERY, summary, scenes: Object.keys(S) };
})();
