/* ===========================================================
   Land it yourself — a small landing game
   Real gravity for each world; numbers are simplified so a
   landing takes ~30 seconds. All units are metres and seconds.
   =========================================================== */
(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const store = {
    get(k, d) { try { const v = localStorage.getItem("goe:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("goe:" + k, JSON.stringify(v)); } catch { /* ignore */ } }
  };

  const LEVELS = [
    {
      id: "moon", name: "The Moon", sub: "Rockets only, like Apollo and Surveyor", globe: "moon",
      g: 1.62, alt: 350, vy: -14, vx: 4, thrust: 5.2, side: 1.2, fuel: 100, burn: 4, chute: false, wind: 0, pad: 60, rocks: false,
      sky: ["#02040a", "#05070d"], ground: ["#9aa0a8", "#6f747b"],
      intro: "There's no air on the Moon, so a parachute is useless. Use your rocket engine all the way down.",
      win: "That's how the Apollo lunar modules and Surveyor landers did it: slowing down with rocket power alone. Neil Armstrong flew Eagle past a field of boulders and landed with very little fuel to spare.",
      fast: "Lunar landers had crushable, shock-absorbing legs, but they were built for touchdowns of only a few metres per second.",
      sideMsg: "Moving sideways at touchdown can snag a footpad and tip a lander over. Apollo crews tried to land almost straight down.",
      rough: "Off the flat zone, your legs hit rocks and slopes. Armstrong had to steer Eagle away from a crater full of boulders to find a safe spot.",
      empty: "Out of fuel! Every kilogram of fuel had to be launched from Earth, so real landers carried only a little extra."
    },
    {
      id: "mars", name: "Mars", sub: "Parachute, then thrusters, like Phoenix and InSight", globe: "mars",
      g: 3.71, alt: 1000, vy: -55, vx: 0, thrust: 12, side: 2, fuel: 100, burn: 4.5, chute: true, chuteV: 55, wind: 0, pad: 70, rocks: false,
      sky: ["#8a5a3c", "#e2b48a"], ground: ["#b8693f", "#8a3e20"],
      intro: "You're hanging under a parachute, but Mars's air is too thin to slow you enough. Cut the parachute, then fire your thrusters.",
      win: "Phoenix and InSight landed exactly like this: a parachute did most of the braking, then the lander dropped free and fired its thrusters for the last stretch.",
      fast: "Phoenix and InSight touched down at about walking speed. Anything much faster could break the legs or the instruments.",
      sideMsg: "Sideways speed at touchdown can tip a three-legged lander over.",
      rough: "Off the flat zone, the legs hit rocks and slopes. Mission teams spend years choosing flat, rock-free landing sites.",
      empty: "Out of fuel! On Mars you need more thrust than on the Moon, because gravity is more than twice as strong.",
      never: "You never cut the parachute! On Mars a parachute alone still leaves you falling at around 200 km/h, far too fast to land."
    },
    {
      id: "jezero", name: "Jezero crater", sub: "Wind and rocks: a precision landing like Perseverance", globe: "mars",
      g: 3.71, alt: 450, vy: -25, vx: 0, thrust: 12, side: 2.6, fuel: 100, burn: 4.5, chute: false, wind: 1.3, pad: 34, rocks: true,
      sky: ["#7a4e34", "#d9a273"], ground: ["#a8522c", "#7d3a1e"],
      intro: "Gusty winds push you sideways, and rocks are everywhere except one small flat zone. Steer carefully!",
      win: "Perseverance landed in Jezero crater, a spot full of cliffs and boulders. A camera system called Terrain-Relative Navigation compared photos of the ground with a map and steered it to a safe spot automatically.",
      fast: "Even with a sky crane lowering it gently, Perseverance touched down at less than 1 m/s.",
      sideMsg: "With the wind pushing you, it's easy to touch down while sliding sideways. Steer against the wind!",
      rough: "You landed on rocks. Jezero has boulders bigger than a car, which is why Perseverance needed its own eyes to choose a safe spot.",
      empty: "Out of fuel! Fighting the wind burns extra fuel."
    }
  ];

  const best = store.get("landerBest", {});
  const menu = $("#lgMenu"), game = $("#lgGame"), result = $("#lgResult");
  const cvs = $("#lgCanvas"), ctx = cvs.getContext("2d");

  /* ---------------- menu ---------------- */
  function renderMenu() {
    $("#lgLevels").innerHTML = LEVELS.map((L, i) => `
      <button class="lg-level" data-i="${i}">
        <span class="lv-top"><span class="lv-globe" style="background-image:url(assets/maps/${L.globe}-sm.jpg)"></span><span><small>Level ${i + 1}</small><br><b>${L.name}</b></span></span>
        <p>${L.sub}</p><p>${L.intro}</p>
        <span class="lv-best" aria-label="Best: ${best[L.id] || 0} of 3 stars">${"★".repeat(best[L.id] || 0)}${"☆".repeat(3 - (best[L.id] || 0))}</span>
      </button>`).join("");
    document.querySelectorAll(".lg-level").forEach(b => b.addEventListener("click", () => start(+b.dataset.i)));
  }

  /* ---------------- terrain ---------------- */
  function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  const WORLD = 700, STEP = 7;
  function makeTerrain(L, seed) {
    const r = rng(seed), pts = [];
    const padX = WORLD / 2 + (r() < .5 ? -1 : 1) * (90 + r() * 70);
    let h = 14;
    for (let x = 0; x <= WORLD; x += STEP) {
      h += (r() - .5) * (L.rocks ? 9 : 6); h = Math.max(2, Math.min(34, h));
      pts.push(h);
    }
    // flatten the landing zone
    const i0 = Math.floor((padX - L.pad / 2) / STEP), i1 = Math.ceil((padX + L.pad / 2) / STEP), ph = pts[Math.round(padX / STEP)];
    for (let i = Math.max(0, i0 - 1); i <= Math.min(pts.length - 1, i1 + 1); i++) pts[i] = ph;
    const rocks = [];
    if (L.rocks) for (let k = 0; k < 70; k++) { const x = r() * WORLD; if (Math.abs(x - padX) > L.pad / 2 + 2) rocks.push({ x, r: 1 + r() * 2.6 }); }
    return { pts, padX, padY: ph, rocks };
  }
  function groundAt(T, x) {
    x = Math.max(0, Math.min(WORLD, x));
    const i = Math.floor(x / STEP), f = x / STEP - i;
    const a = T.pts[i], b = T.pts[Math.min(T.pts.length - 1, i + 1)];
    return a + (b - a) * f;
  }

  /* ---------------- state ---------------- */
  let L, Li, T, S, keys = {}, raf = 0, last = 0, paused = false, ended = false, particles = [], stars = [];
  function start(i) {
    Li = i; L = LEVELS[i];
    T = makeTerrain(L, 1234 + i * 77 + Math.floor(Math.random() * 999));
    const x0 = WORLD / 2;
    S = { x: x0, y: groundAt(T, x0) + L.alt, vx: L.vx * (T.padX > x0 ? 1 : -1) * -1, vy: L.vy, fuel: L.fuel, chute: L.chute, chuteY: 0, chuteGone: null, wind: 0, windT: 0, t: 0, thrusting: false };
    particles = []; ended = false; paused = false;
    stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * .7, r: Math.random() * 1.2 + .3 }));
    menu.hidden = true; result.hidden = true; game.hidden = false;
    $("#lgCut").disabled = !L.chute; $("#lgCut").hidden = !L.chute;
    $("#lgPause").textContent = "⏸";
    resize(); last = performance.now();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    say(`${L.name}. ${L.intro}`);
    game.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function resize() {
    const r = cvs.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    cvs.width = Math.round(r.width * dpr); cvs.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener("resize", () => { if (!game.hidden) resize(); });

  /* ---------------- physics ---------------- */
  function step(dt) {
    S.t += dt;
    const up = keys.up && S.fuel > 0, left = keys.left && S.fuel > 0, right = keys.right && S.fuel > 0;
    let ay = -L.g, ax = 0;
    if (S.chute) ay += (L.g / (L.chuteV * L.chuteV)) * S.vy * S.vy; // drag balances gravity at chuteV
    if (up) { ay += L.thrust; S.fuel -= L.burn * dt; }
    if (left) { ax -= L.side; S.fuel -= 1 * dt; }
    if (right) { ax += L.side; S.fuel -= 1 * dt; }
    if (L.wind) {
      S.windT -= dt;
      if (S.windT <= 0) { S.wind = (Math.random() * 2 - 1) * L.wind; S.windT = 1.5 + Math.random() * 1.5; }
      ax += S.wind;
    }
    S.fuel = Math.max(0, S.fuel);
    S.thrusting = up;
    S.vy += ay * dt; S.vx += ax * dt;
    S.x += S.vx * dt; S.y += S.vy * dt;
    if (S.x < 5) { S.x = 5; S.vx = Math.abs(S.vx) * .3; } if (S.x > WORLD - 5) { S.x = WORLD - 5; S.vx = -Math.abs(S.vx) * .3; }
    if (S.chuteGone) { S.chuteGone.y += 6 * dt; S.chuteGone.x += 3 * dt; S.chuteGone.a = Math.max(0, S.chuteGone.a - dt * .4); }

    const alt = S.y - groundAt(T, S.x);
    if (up && alt < 30) for (let k = 0; k < 2; k++) particles.push({ x: S.x + (Math.random() - .5) * 6, y: groundAt(T, S.x) + .5, vx: (Math.random() < .5 ? -1 : 1) * (6 + Math.random() * 10), vy: 1 + Math.random() * 3, life: 1 });
    particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= L.g * dt; p.life -= dt * 1.2; });
    particles = particles.filter(p => p.life > 0);

    if (alt <= 0) touchdown();
  }

  function touchdown() {
    ended = true;
    const onPad = Math.abs(S.x - T.padX) <= L.pad / 2 - 2;
    const vy = -S.vy, vx = Math.abs(S.vx);
    let ok = false, title, text;
    if (S.chute && L.chute) { title = "Crash!"; text = L.never; }
    else if (vy > 3) { title = "Crash!"; text = `You hit the ground at ${vy.toFixed(1)} m/s (${(vy * 3.6).toFixed(0)} km/h). ${L.fast}`; }
    else if (vx > 1.5) { title = "Tipped over!"; text = `You were sliding sideways at ${vx.toFixed(1)} m/s. ${L.sideMsg}`; }
    else if (!onPad) { title = "Tipped over!"; text = L.rough; }
    else { ok = true; title = "The Eagle has— er, YOU have landed!"; text = `Touchdown at ${vy.toFixed(1)} m/s with ${Math.round(S.fuel)}% fuel left.`; }
    if (ok && L.id !== "moon") title = "Touchdown! You've landed on Mars!";
    let st = 0;
    if (ok) { st = 1 + (S.fuel >= 25 ? 1 : 0) + (vy < 1.5 && vx < .7 ? 1 : 0); if (st > (best[L.id] || 0)) { best[L.id] = st; store.set("landerBest", best); } }
    if (!ok) for (let k = 0; k < 40; k++) particles.push({ x: S.x, y: groundAt(T, S.x) + 1, vx: (Math.random() - .5) * 30, vy: Math.random() * 14, life: 1.5 });
    S.crashed = !ok;
    setTimeout(() => showResult(ok, st, title, text, S.fuel <= 0 && !ok ? L.empty : null), ok ? 700 : 1100);
  }

  function showResult(ok, st, title, text, extra) {
    $("#rStars").textContent = ok ? "★".repeat(st) + "☆".repeat(3 - st) : "✕";
    $("#rTitle").textContent = title;
    $("#rText").textContent = text + (extra ? " " + extra : "");
    $("#rFact").innerHTML = `<b>${ok ? "Just like the real thing" : "What the real missions did"}:</b> ${ok ? L.win : (L.chute && S.chute ? "Phoenix cut loose from its parachute about 1 km up and fired 12 thrusters to slow down." : L.win)}`;
    $("#rNext").hidden = Li >= LEVELS.length - 1;
    result.hidden = false;
    $("#rAgain").focus();
    say(`${title} ${text}`);
  }

  /* ---------------- drawing ---------------- */
  function draw() {
    const W = cvs.clientWidth, H = cvs.clientHeight;
    const gl = groundAt(T, S.x), alt = Math.max(0, S.y - gl);
    const s = Math.max(.3, Math.min(5, (H * .56) / (alt + 40)));
    const gy = H * .86;
    const X = x => W / 2 + (x - S.x) * s, Y = y => gy - (y - gl) * s;

    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, L.sky[0]); g.addColorStop(1, L.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (L.id === "moon") { ctx.fillStyle = "#fff"; stars.forEach(p => { ctx.globalAlpha = .7; ctx.fillRect(p.x * W, p.y * H, p.r, p.r); }); ctx.globalAlpha = 1;
      ctx.fillStyle = "#3d7bd9"; ctx.beginPath(); ctx.arc(W * .86, H * (W < 600 ? .36 : .22), W < 600 ? 12 : 18, 0, 6.283); ctx.fill(); }

    // ground
    const gr = ctx.createLinearGradient(0, gy - 40, 0, H); gr.addColorStop(0, L.ground[0]); gr.addColorStop(1, L.ground[1]);
    ctx.fillStyle = gr; ctx.beginPath();
    const xa = S.x - W / 2 / s - STEP, xb = S.x + W / 2 / s + STEP;
    ctx.moveTo(X(xa), H + 2);
    for (let x = Math.floor(xa / STEP) * STEP; x <= xb; x += STEP) ctx.lineTo(X(x), Y(groundAt(T, x)));
    ctx.lineTo(X(xb), H + 2); ctx.closePath(); ctx.fill();
    // rocks
    ctx.fillStyle = L.ground[1];
    T.rocks.forEach(r => { const px = X(r.x); if (px < -20 || px > W + 20) return; ctx.beginPath(); ctx.ellipse(px, Y(groundAt(T, r.x)) - r.r * s * .3, r.r * s, r.r * s * .65, 0, 0, 6.283); ctx.fill(); });
    // landing zone lights
    const p0 = X(T.padX - L.pad / 2), p1 = X(T.padX + L.pad / 2), py = Y(T.padY);
    ctx.fillStyle = "rgba(94,230,168,.18)"; ctx.fillRect(p0, py - 3, p1 - p0, 4);
    const blink = (Math.sin(performance.now() / 250) + 1) / 2;
    ctx.fillStyle = `rgba(94,230,168,${.5 + .5 * blink})`;
    [p0, p1].forEach(px => { ctx.beginPath(); ctx.arc(px, py - 4, 4, 0, 6.283); ctx.fill(); });
    if (alt > 60) { // arrow pointing to the landing zone
      const dir = Math.sign(T.padX - S.x), dist = Math.abs(T.padX - S.x);
      if (dist > W / 2 / s - 10) { ctx.fillStyle = "#5ee6a8"; ctx.font = "700 14px Space Grotesk, sans-serif"; ctx.textAlign = dir > 0 ? "right" : "left";
        ctx.fillText(dir > 0 ? `landing zone ${dist.toFixed(0)} m →` : `← landing zone ${dist.toFixed(0)} m`, dir > 0 ? W - 12 : 12, H * .5); }
    }

    // particles
    particles.forEach(p => { ctx.globalAlpha = Math.max(0, p.life) * .7; ctx.fillStyle = L.id === "moon" ? "#d9d2c4" : "#d9a273"; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 2 + (1 - p.life) * 3, 0, 6.283); ctx.fill(); });
    ctx.globalAlpha = 1;

    // dropped parachute
    if (S.chuteGone && S.chuteGone.a > 0) drawChute(X(S.chuteGone.x), Y(S.chuteGone.y), S.chuteGone.a);

    // lander (fixed size on screen)
    const lx = W / 2, ly = Y(S.y);
    ctx.save(); ctx.translate(lx, ly);
    if (S.crashed) ctx.rotate(.5);
    if (S.chute) { ctx.strokeStyle = "#ddd"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-10, -26); ctx.lineTo(-20, -62); ctx.moveTo(10, -26); ctx.lineTo(20, -62); ctx.stroke(); drawChute(0, -62, 1, true); }
    if (S.thrusting && !ended) { const f = 14 + Math.random() * 10; ctx.fillStyle = "#ffb347"; ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(0, f); ctx.lineTo(6, -4); ctx.fill(); ctx.fillStyle = "#fff4c8"; ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(0, f * .6); ctx.lineTo(3, -4); ctx.fill(); }
    if ((keys.left || keys.right) && S.fuel > 0 && !ended) { ctx.fillStyle = "#ffd08a"; const sx = keys.left ? 16 : -16; ctx.beginPath(); ctx.arc(sx, -16, 3, 0, 6.283); ctx.fill(); }
    ctx.strokeStyle = "#c9ccd2"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(-18, 0); ctx.moveTo(10, -10); ctx.lineTo(18, 0); ctx.stroke();
    ctx.fillStyle = "#c9ccd2"; ctx.fillRect(-22, -1, 8, 2); ctx.fillRect(14, -1, 8, 2);
    ctx.fillStyle = L.id === "moon" ? "#d9a84a" : "#e2e5ea"; ctx.fillRect(-13, -20, 26, 12);
    ctx.fillStyle = L.id === "moon" ? "#c9ccd2" : "#2e3d66";
    if (L.id === "moon") { ctx.beginPath(); ctx.moveTo(-10, -20); ctx.lineTo(-8, -32); ctx.lineTo(8, -32); ctx.lineTo(10, -20); ctx.fill(); ctx.fillStyle = "#1b2433"; ctx.fillRect(-5, -29, 4, 4); ctx.fillRect(1, -29, 4, 4); }
    else { ctx.fillRect(-28, -18, 14, 6); ctx.fillRect(14, -18, 14, 6); }
    ctx.restore();

    // wind sock
    if (L.wind) { ctx.fillStyle = "rgba(6,10,19,.75)"; ctx.fillRect(W - 128, H - 44, 116, 32); ctx.fillStyle = "#e9eef7"; ctx.font = "12px Atkinson Hyperlegible, sans-serif"; ctx.textAlign = "left";
      ctx.fillText(`wind ${S.wind > 0 ? "→" : "←"} ${Math.abs(S.wind).toFixed(1)}`, W - 118, H - 23); }

    // HUD
    const vy = -S.vy, vx = Math.abs(S.vx);
    hud("#hAlt", `${alt.toFixed(0)} m`, null);
    hud("#hVy", `${vy.toFixed(1)} m/s`, vy <= 3 ? "ok" : "bad");
    hud("#hVx", `${S.vx >= 0 ? "→" : "←"} ${vx.toFixed(1)} m/s`, vx <= 1.5 ? "ok" : "bad");
    $("#hFuel").style.width = Math.max(0, S.fuel) + "%";
    let tip = "";
    if (!ended) {
      if (S.chute) tip = alt > 650 ? "Under the parachute… cut it (C / ✂) when you're below about 600 m" : "Cut the parachute now! (C / ✂)";
      else if (S.fuel <= 0) tip = "Out of fuel!";
      else if (S.fuel < 20) tip = "Low fuel!";
      else if (alt < 60 && vy > 6) tip = "Slow down! Hold the engine";
      else if (S.t < 4) tip = L.intro;
    }
    $("#lgTip").textContent = tip;
  }
  function drawChute(x, y, a, attached) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
    ctx.fillStyle = "#f2f2f2"; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.quadraticCurveTo(0, -34, 26, 0); ctx.quadraticCurveTo(0, -8, -26, 0); ctx.fill();
    ctx.fillStyle = "#e1612c"; ctx.beginPath(); ctx.moveTo(-12, -9); ctx.quadraticCurveTo(0, -26, 12, -9); ctx.quadraticCurveTo(0, -13, -12, -9); ctx.fill();
    if (!attached) { ctx.strokeStyle = "#ddd"; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(0, 30); ctx.lineTo(26, 0); ctx.stroke(); }
    ctx.restore();
  }
  let hudCache = {};
  function hud(sel, text, cls) { if (hudCache[sel] === text + cls) return; hudCache[sel] = text + cls; const el = $(sel); el.textContent = text; el.className = cls || ""; }

  /* ---------------- loop ---------------- */
  function loop(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!paused && !ended) { let left = dt; while (left > 0) { const h = Math.min(left, 1 / 120); step(h); left -= h; if (ended) break; } }
    else if (ended) { particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= L.g * dt; p.life -= dt; }); particles = particles.filter(p => p.life > 0); }
    draw();
    raf = requestAnimationFrame(loop);
  }

  /* ---------------- input ---------------- */
  function cut() { if (S && S.chute && !ended && !paused) { S.chute = false; S.chuteGone = { x: S.x, y: S.y + 12, a: 1 }; $("#lgCut").disabled = true; say("Parachute cut."); } }
  function togglePause() { if (!S || ended) return; paused = !paused; $("#lgPause").textContent = paused ? "▶" : "⏸"; $("#lgTip").textContent = paused ? "Paused" : ""; }
  const KEYMAP = { ArrowUp: "up", KeyW: "up", Space: "up", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" };
  addEventListener("keydown", e => {
    if (game.hidden || !result.hidden) return;
    if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; e.preventDefault(); }
    if (e.code === "KeyC") cut();
    if (e.code === "KeyP" || e.code === "Escape") togglePause();
    if (e.code === "KeyR") start(Li);
  });
  addEventListener("keyup", e => { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
  addEventListener("blur", () => (keys = {}));
  document.addEventListener("visibilitychange", () => { if (document.hidden && S && !ended && !paused) togglePause(); });
  document.querySelectorAll(".lg-btn[data-key]").forEach(b => {
    const k = b.dataset.key;
    if (k === "cut") { b.addEventListener("click", cut); return; }
    const on = e => { e.preventDefault(); keys[k] = true; b.classList.add("down"); try { b.setPointerCapture(e.pointerId); } catch { } };
    const off = () => { keys[k] = false; b.classList.remove("down"); };
    b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("lostpointercapture", off);
    b.addEventListener("contextmenu", e => e.preventDefault());
  });
  $("#lgPause").addEventListener("click", togglePause);
  $("#rAgain").addEventListener("click", () => start(Li));
  $("#rNext").addEventListener("click", () => start(Li + 1));
  $("#rMenu").addEventListener("click", () => { result.hidden = true; game.hidden = true; menu.hidden = false; cancelAnimationFrame(raf); renderMenu(); });
  const say = t => { $("#lgLive").textContent = t; };

  // nav toggle
  const t = document.querySelector(".nav-toggle"), ul = $("#navlist");
  t.addEventListener("click", () => { const o = ul.classList.toggle("open"); t.setAttribute("aria-expanded", o); });

  renderMenu();
  const q = new URLSearchParams(location.search).get("level");
  const qi = LEVELS.findIndex(l => l.id === q);
  if (qi >= 0) start(qi);
  // Small hook used for automated testing in the browser console.
  window.__lander = { get state() { return S; }, get padX() { return T && T.padX; }, alt: () => S.y - groundAt(T, S.x), get ended() { return ended; }, start, cut, setKey: (k, v) => (keys[k] = v), step: dt => { if (!ended) step(dt); } };
})();
