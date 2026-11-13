/* ===========================================================
   Ghosts of Exploration — main app
   =========================================================== */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const byId = Object.fromEntries(ARTIFACTS.map(a => [a.id, a]));
  const TYPE_EMOJI = {};
  const t = window.t || ((k, f) => f);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------------- persistent state (safe storage) ---------------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem("goe:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("goe:" + k, JSON.stringify(v)); } catch { /* ignore */ } }
  };
  const progress = Object.assign({ opened: [], chapters: [], voice: false, quizBest: 0, explore: false, badges: [] }, store.get("progress", {}));
  const saveProgress = () => store.set("progress", progress);
  const prefs = Object.assign({ level: "explorer", size: 1, motion: false, spacing: false }, store.get("prefs", {}));
  const savePrefs = () => store.set("prefs", prefs);

  /* ---------------- helpers ---------------- */
  const cover = a => a.media && a.media[0] ? "assets/nasa/" + a.media[0].f : null;
  const thumbHTML = (a, cls = "thumb") => cover(a)
    ? `<img class="${cls}" src="${cover(a)}" alt="" loading="lazy" decoding="async">`
    : `<span class="${cls} ph" aria-hidden="true">${TYPE_EMOJI[a.type] || "✦"}</span>`;
  const pill = s => `<span class="pill" style="color:${STATUS[s].color}">${STATUS[s].label}</span>`;
  const auNow = d => d.au2025 + d.rate * ((Date.now() - Date.UTC(2025, 0, 1)) / (365.25 * 864e5));
  const fmtKm = au => {
    const km = au * 1.496e8;
    return km >= 1e9 ? (km / 1e9).toFixed(1) + " " + t("u.bkm", "billion km") : (km / 1e6).toFixed(0) + " " + t("u.mkm", "million km");
  };
  const lightTime = au => { const h = au * 499 / 3600; return h >= 1 ? h.toFixed(1) + " " + t("u.lh", "light-hours") : (h * 60).toFixed(0) + " " + t("u.lm", "light-minutes"); };

  /* ---------------- settings ---------------- */
  function applyPrefs() {
    document.documentElement.style.setProperty("--fs", prefs.size);
    document.body.classList.toggle("reduce-motion", !!prefs.motion);
    document.body.classList.toggle("spacing", !!prefs.spacing);
    $$("[data-level]").forEach(b => b.setAttribute("aria-checked", b.dataset.level === prefs.level));
    $$("[data-size]").forEach(b => b.setAttribute("aria-checked", +b.dataset.size === +prefs.size));
    $("#reduceMotion").checked = !!prefs.motion;
    $("#spacing").checked = !!prefs.spacing;
  }
  function initSettings() {
    const btn = $("#settingsBtn"), panel = $("#settings");
    btn.addEventListener("click", e => {
      e.stopPropagation();
      panel.hidden = !panel.hidden; btn.setAttribute("aria-expanded", !panel.hidden);
    });
    document.addEventListener("click", e => { if (!panel.hidden && !panel.contains(e.target) && e.target !== btn) { panel.hidden = true; btn.setAttribute("aria-expanded", "false"); } });
    $$("[data-level]").forEach(b => b.addEventListener("click", () => { prefs.level = b.dataset.level; savePrefs(); applyPrefs(); rerenderLevel(); }));
    $$("[data-size]").forEach(b => b.addEventListener("click", () => { prefs.size = +b.dataset.size; savePrefs(); applyPrefs(); }));
    $("#reduceMotion").addEventListener("change", e => { prefs.motion = e.target.checked; savePrefs(); applyPrefs(); });
    $("#spacing").addEventListener("change", e => { prefs.spacing = e.target.checked; savePrefs(); applyPrefs(); });
    applyPrefs();
  }
  function rerenderLevel() {
    renderChapter();
    if (openId) renderDrawer(openId);
  }

  /* ---------------- nav ---------------- */
  function initNav() {
    const t = $(".nav-toggle"), ul = $("#navlist");
    t.addEventListener("click", () => { const o = ul.classList.toggle("open"); t.setAttribute("aria-expanded", o); });
    // If the full menu doesn't fit on one line (narrow window, browser zoom, longer Spanish/Hindi
    // labels), collapse it into the ☰ button instead of letting the page run off the screen.
    const bar = $(".topbar");
    const fit = () => {
      bar.classList.remove("nav-compact");
      if (bar.scrollWidth > bar.clientWidth + 1) bar.classList.add("nav-compact");
      if (!bar.classList.contains("nav-compact") && !matchMedia("(max-width: 1260px)").matches) { ul.classList.remove("open"); t.setAttribute("aria-expanded", "false"); }
    };
    let timer = 0;
    const refit = () => { clearTimeout(timer); timer = setTimeout(fit, 60); };
    fit();
    addEventListener("resize", refit);
    document.fonts?.ready.then(refit);
    addEventListener("load", refit);
    ul.addEventListener("click", e => { if (e.target.tagName === "A") { ul.classList.remove("open"); t.setAttribute("aria-expanded", "false"); } });
    const links = $$("#navlist a");
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) links.forEach(l => l.classList.toggle("active", l.getAttribute("href") === "#" + en.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["map", "logs", "how", "timeline", "deep", "quiz", "archive"].forEach(id => io.observe(document.getElementById(id)));
  }

  /* ---------------- starfield ---------------- */
  // The stars are painted once onto two layers. One layer fades in and out with a CSS
  // animation, which the graphics card runs by itself: nothing is redrawn frame by frame.
  function initStars() {
    const a = $("#stars"), b = a.cloneNode();
    b.id = "stars2"; b.classList.add("tw"); a.after(b);
    let lastW = 0;
    const paint = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5), w = a.offsetWidth, h = a.offsetHeight;
      if (!w || !h) return;
      lastW = w;
      [a, b].forEach((c, layer) => {
        const ctx = c.getContext("2d");
        c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.fillStyle = "#fff";
        for (let n = Math.round(w * h / (layer ? 5200 : 4200)); n--;) {
          ctx.globalAlpha = .3 + Math.random() * .7;
          ctx.beginPath(); ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 1.2 + .25, 0, 6.283); ctx.fill();
        }
      });
    };
    paint();
    let timer = 0;
    addEventListener("resize", () => { clearTimeout(timer); timer = setTimeout(() => { if (a.offsetWidth !== lastW) paint(); }, 200); });
  }

  /* ---------------- hero bits ---------------- */
  function initHero() {
    const counts = w => ARTIFACTS.filter(a => a.world === w).length;
    $("#worldCards").innerHTML = Object.entries(WORLDS).map(([k, v]) => `
      <button class="world-card" data-go="${k}">
        <span class="globe ${k}" aria-hidden="true"></span>
        <span><b>${v.name}</b><small>${counts(k)} ${t("machines", "machines")} · ${v.tagline.split("·")[0].trim()}</small></span>
      </button>`).join("");
    $$("#worldCards [data-go]").forEach(b => b.addEventListener("click", () => {
      const w = b.dataset.go;
      if (w === "deep") document.getElementById("deep").scrollIntoView();
      else { setWorld(w); document.getElementById("map").scrollIntoView(); }
    }));
    const v1 = byId.voyager1.dist;
    $("#v1dist").textContent = "~" + auNow(v1).toFixed(0) + " AU";
  }

  /* ---------------- MAP ---------------- */
  let world = "moon", typeFilter = "all", query = "";
  const MAPCREDIT = {
    moon: "Map: NASA Scientific Visualization Studio CGI Moon Kit (LRO LROC data). Centre = 0° longitude, the side facing Earth.",
    mars: "Map: Solar System Scope (CC BY 4.0), based on NASA data. Centre = 0° longitude."
  };
  const listFor = () => ARTIFACTS.filter(a => a.world === world)
    .filter(a => typeFilter === "all" || (typeFilter === "active" ? a.status === "active" || a.status === "retired" : a.type === typeFilter))
    .filter(a => !query || (a.name + " " + (a.nick || "") + " " + a.mission + " " + a.place + " " + a.story + " " + a.discoveries.join(" ") + " " + TYPES[a.type]).toLowerCase().includes(query));

  function setWorld(w) {
    world = w; typeFilter = "all";
    $$(".map-tabs [role=tab]").forEach(t => { const on = t.dataset.world === w; t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1; });
    const img = $("#mapImg"); img.style.opacity = 0;
    setTimeout(() => { img.src = "assets/maps/" + w + ".jpg"; img.onload = () => (img.style.opacity = 1); }, 150);
    $("#mapWrap").classList.toggle("mars", w === "mars");
    $("#mapCredit").textContent = MAPCREDIT[w];
    Z.s = 1; Z.tx = Z.ty = 0;
    renderChips(); renderMap(); applyZoom(false); updatePresetLabel();
  }
  function renderChips() {
    const types = [...new Set(ARTIFACTS.filter(a => a.world === world).map(a => a.type))];
    const chips = [["all", t("chip.all", "All")], ...types.map(k => [k, TYPES_PLURAL[k] || TYPES[k]]), ["active", t("chip.awake", "Still awake")]];
    $("#chips").innerHTML = chips.map(([k, l]) => `<button class="chip" aria-pressed="${k === typeFilter}" data-f="${k}">${l}</button>`).join("");
    $$("#chips .chip").forEach(c => c.addEventListener("click", () => { typeFilter = c.dataset.f; renderChips(); renderMap(); }));
  }
  function renderLegend() {
    $("#legend").innerHTML = Object.entries(STATUS).map(([k, s]) => `<li title="${esc(s.desc)}"><i style="background:${s.color};color:${s.color}"></i>${s.label}</li>`).join("");
  }
  function renderMap() {
    const shown = new Set(listFor().map(a => a.id));
    const all = ARTIFACTS.filter(a => a.world === world);
    const box = $("#mapMarkers");
    box.innerHTML = all.map((a, i) => {
      const x = (a.lon + 180) / 360 * 100, y = (90 - a.lat) / 180 * 100;
      const n = a.nudge || [0, 0];
      return `<button class="marker ${shown.has(a.id) ? "" : "dim"}" data-id="${a.id}" data-x="${x}" data-y="${y}" data-nx="${n[0] * 9}" data-ny="${n[1] * 9}"
        style="left:${x}%;top:${y}%;--c:${STATUS[a.status].color};--d:${(i % 5) * .5}s;transform:scale(var(--inv)) translate(${n[0] * 9}px,${n[1] * 9}px)"
        aria-label="${esc(a.name)}, ${esc(STATUS[a.status].label)}, ${a.year}" ${shown.has(a.id) ? "" : 'tabindex="-1"'}>
        <span class="marker-label">${esc(a.nick && a.type !== "vehicle" ? a.nick : a.name)}</span></button>`;
    }).join("");
    const tip = $("#mapTip");
    $$(".marker", box).forEach(m => {
      const a = byId[m.dataset.id];
      const show = () => {
        tip.innerHTML = `<b>${esc(a.name)}</b><span>${esc(a.place)} · ${a.year}</span><br>${pill(a.status)}`;
        const p = screenPos(m), W = $("#mapWrap").clientWidth;
        tip.style.left = Math.min(Math.max(p.x, 115), W - 115) + "px"; tip.style.top = p.y + "px"; tip.hidden = false;
        $$(".aitem").forEach(i => i.classList.toggle("on", i.dataset.id === a.id));
      };
      const hide = () => { tip.hidden = true; $$(".aitem").forEach(i => i.classList.remove("on")); };
      m.addEventListener("mouseenter", show); m.addEventListener("focus", show);
      m.addEventListener("mouseleave", hide); m.addEventListener("blur", hide);
      m.addEventListener("click", () => openDrawer(a.id, m));
    });
    declutter();
    const list = listFor().sort((a, b) => a.year - b.year);
    $("#alist").innerHTML = list.length ? list.map(a => `<li><button class="aitem" data-id="${a.id}">
        ${thumbHTML(a)}<span><b>${esc(a.name)}${hasModel(a.id) ? '<span class="tag3d" title="Has a 3D model">3D</span>' : ""}</b><small>${esc(TYPES[a.type])} · ${esc(a.place.split("(")[0])}</small><br>${pill(a.status)}</span><span class="yr">${a.year}</span></button></li>`).join("")
      : `<li class="empty">${t("map.none", "Nothing matches. Try another word!")}</li>`;
    $$("#alist .aitem").forEach(b => {
      b.addEventListener("click", () => openDrawer(b.dataset.id, b));
      b.addEventListener("mouseenter", () => $$(".marker", box).forEach(m => m.classList.toggle("on", m.dataset.id === b.dataset.id)));
      b.addEventListener("mouseleave", () => $$(".marker", box).forEach(m => m.classList.remove("on")));
    });
  }
  /* ---- zoom & pan ---- */
  const Z = { s: 1, tx: 0, ty: 0 };
  const PRESETS = {
    moon: { label: "Zoom to the Apollo sites", lon: 2, lat: 5, s: 3.2 },
    mars: { label: "Zoom to Jezero (Ingenuity)", lon: 77.4, lat: 18.4, s: 7 }
  };
  function screenPos(m) {
    const wrap = $("#mapWrap"), W = wrap.clientWidth, H = wrap.clientHeight;
    return { x: Z.tx + Z.s * (+m.dataset.x / 100) * W + +m.dataset.nx, y: Z.ty + Z.s * (+m.dataset.y / 100) * H + +m.dataset.ny };
  }
  function applyZoom(animate = true) {
    const wrap = $("#mapWrap"), st = $("#mapStage"), W = wrap.clientWidth, H = wrap.clientHeight;
    Z.s = Math.min(10, Math.max(1, Z.s));
    Z.tx = Math.min(0, Math.max(W - W * Z.s, Z.tx));
    Z.ty = Math.min(0, Math.max(H - H * Z.s, Z.ty));
    st.style.transition = animate ? "" : "none";
    st.style.transform = `translate(${Z.tx}px,${Z.ty}px) scale(${Z.s})`;
    st.style.setProperty("--inv", 1 / Z.s);
    wrap.classList.toggle("zoomed", Z.s > 1.01);
    $("#mapTip").hidden = true;
    declutter();
  }
  function zoomAt(ns, cx, cy, animate) {
    const wx = (cx - Z.tx) / Z.s, wy = (cy - Z.ty) / Z.s;
    Z.s = Math.min(10, Math.max(1, ns)); Z.tx = cx - wx * Z.s; Z.ty = cy - wy * Z.s; applyZoom(animate);
  }
  function zoomTo(lon, lat, s) {
    const wrap = $("#mapWrap"), W = wrap.clientWidth, H = wrap.clientHeight;
    Z.s = s; Z.tx = W / 2 - s * ((lon + 180) / 360) * W; Z.ty = H / 2 - s * ((90 - lat) / 180) * H; applyZoom();
  }
  function declutter() {
    const placed = [];
    const ms = $$("#mapMarkers .marker").filter(m => !m.classList.contains("dim"))
      .sort((a, b) => byId[a.dataset.id].year - byId[b.dataset.id].year);
    $$("#mapMarkers .marker-label").forEach(l => l.classList.add("hide"));
    const W = $("#mapWrap").clientWidth, small = W < 520;
    if (small && Z.s < 2) return;
    ms.forEach(m => {
      const l = $(".marker-label", m), p = screenPos(m);
      l.classList.remove("hide");
      const w = l.offsetWidth + 6, h = 18;
      const r = { x1: p.x - w / 2, x2: p.x + w / 2, y1: p.y + 12, y2: p.y + 12 + h };
      const hit = placed.some(q => !(r.x2 < q.x1 || r.x1 > q.x2 || r.y2 < q.y1 || r.y1 > q.y2)) || r.x1 < 0 || r.x2 > W;
      if (hit) l.classList.add("hide"); else placed.push(r, { x1: p.x - 8, x2: p.x + 8, y1: p.y - 8, y2: p.y + 8 });
    });
  }
  function initZoom() {
    const wrap = $("#mapWrap");
    const center = () => [wrap.clientWidth / 2, wrap.clientHeight / 2];
    $("#zIn").addEventListener("click", () => zoomAt(Z.s * 1.8, ...center()));
    $("#zOut").addEventListener("click", () => zoomAt(Z.s / 1.8, ...center()));
    $("#zReset").addEventListener("click", () => { Z.s = 1; Z.tx = Z.ty = 0; applyZoom(); });
    $("#zPreset").addEventListener("click", () => {
      if (Z.s > 1.01) { Z.s = 1; Z.tx = Z.ty = 0; applyZoom(); } else { const p = PRESETS[world]; zoomTo(p.lon, p.lat, p.s); }
      updatePresetLabel();
    });
    wrap.addEventListener("dblclick", e => { if (e.target.closest(".marker, button")) return; const r = wrap.getBoundingClientRect(); zoomAt(Z.s * 2, e.clientX - r.left, e.clientY - r.top); updatePresetLabel(); });
    wrap.addEventListener("wheel", e => { if (!e.ctrlKey) return; e.preventDefault(); const r = wrap.getBoundingClientRect(); zoomAt(Z.s * (e.deltaY < 0 ? 1.25 : 0.8), e.clientX - r.left, e.clientY - r.top, false); updatePresetLabel(); }, { passive: false });
    let drag = null;
    wrap.addEventListener("pointerdown", e => {
      if (Z.s <= 1.01 || e.target.closest(".marker, button")) return;
      drag = { x: e.clientX, y: e.clientY, tx: Z.tx, ty: Z.ty, moved: false }; wrap.setPointerCapture(e.pointerId);
    });
    wrap.addEventListener("pointermove", e => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) { drag.moved = true; wrap.classList.add("dragging"); }
      Z.tx = drag.tx + dx; Z.ty = drag.ty + dy; applyZoom(false);
    });
    const end = () => { drag = null; wrap.classList.remove("dragging"); };
    wrap.addEventListener("pointerup", end); wrap.addEventListener("pointercancel", end);
    addEventListener("resize", () => { Z.s = 1; Z.tx = Z.ty = 0; applyZoom(false); updatePresetLabel(); });
  }
  function updatePresetLabel() { $("#zPreset").textContent = Z.s > 1.01 ? "← Whole map" : PRESETS[world].label; }

  function initMap() {
    initZoom();
    const tabs = $$(".map-tabs [role=tab]");
    tabs.forEach(t => {
      t.addEventListener("click", () => setWorld(t.dataset.world));
      t.addEventListener("keydown", e => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") { const o = tabs[(tabs.indexOf(t) + 1) % tabs.length]; o.focus(); setWorld(o.dataset.world); }
      });
    });
    $("#search").addEventListener("input", e => { query = e.target.value.trim().toLowerCase(); renderMap(); });
    renderLegend(); setWorld("moon");
  }

  /* ---------------- DRAWER ---------------- */
  let openId = null, returnFocus = null;
  const ORDER = [...ARTIFACTS].sort((a, b) => ["moon", "mars", "deep"].indexOf(a.world) - ["moon", "mars", "deep"].indexOf(b.world) || a.year - b.year).map(a => a.id);

  function openDrawer(id, from) {
    returnFocus = from || document.activeElement;
    openId = id;
    renderDrawer(id);
    $("#scrim").hidden = false; $("#drawer").hidden = false;
    document.body.style.overflow = "hidden";
    $("#drawer").focus();
    history.replaceState(null, "", "#artifact=" + id);
    if (!progress.opened.includes(id)) { progress.opened.push(id); saveProgress(); checkBadges(); }
  }
  let dHow = null;
  function destroyHow() { if (dHow) { dHow.destroy(); dHow = null; } }
  function closeDrawer() {
    stopSpeech();
    destroyHow();
    if (soundPlaying) soundPlaying.pause();
    $("#scrim").hidden = true; $("#drawer").hidden = true; document.body.style.overflow = "";
    openId = null; history.replaceState(null, "", location.pathname);
    $$("#drawer video").forEach(v => v.pause());
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
  }
  function videoHTML(key) {
    const v = VIDEOS[key]; if (!v) return "";
    return `<div class="d-video"><video controls preload="none" poster="${v.poster}" playsinline><source src="${NASA_VIDEO(v.id)}" type="video/mp4">Your browser can't play this video.</video>
      <p>${esc(v.title)}${v.note ? " · " + esc(v.note) : ""} · <a href="${NASA_PAGE(v.id)}" target="_blank" rel="noopener">NASA source</a></p></div>`;
  }
  function renderDrawer(id) {
    const a = byId[id], idx = ORDER.indexOf(id);
    $("#dCount").textContent = `${WORLDS[a.world].short} · ${t("xOfY", "{x} of {y}").replace("{x}", idx + 1).replace("{y}", ORDER.length)}`;
    const m0 = a.media[0];
    const facts = a.stats.map(([k, v]) => {
      let val = v;
      if (v === "live" && a.dist) val = "~" + auNow(a.dist).toFixed(0) + " AU";
      return `<div class="fact"><small>${esc(k)}</small><b>${esc(val)}</b></div>`;
    }).join("");
    const isSci = prefs.level === "scientist";
    const howList = window.Explainers ? Explainers.forArtifact(a.id) : [];
    destroyHow();
    let distBlock = "";
    if (a.dist) {
      const au = auNow(a.dist);
      distBlock = `<div class="d-block"><h3>${t("d.whereNow", "Where is it now?")}</h3><ul class="dates">
        <li><span>${t("d.estDist", "Estimated distance from the Sun")}</span><b>~${au.toFixed(1)} AU (${fmtKm(au)})</b></li>
        <li><span>${t("d.signalTime", "Time for a radio signal to cross that distance")}</span><b>~${lightTime(au)}</b></li>
        <li><span>${t("d.heading", "Heading")}</span><b>${esc(a.heading)}</b></li></ul></div>`;
    }
    $("#drawerBody").innerHTML = `
      <div class="d-hero">${m0 ? `<img id="dImg" src="assets/nasa/${m0.f}" alt="${esc(m0.cap)}">` : `<div class="ph" aria-hidden="true">✦</div>`}${hasModel(a.id) ? `<button class="btn btn-small model-btn" data-model="${a.id}">${t("d.model", "View 3D model")}</button>` : ""}</div>
      ${a.media.length > 1 ? `<div class="d-thumbs" role="group" aria-label="More photos">${a.media.map((m, i) => `<button data-i="${i}" aria-current="${i === 0}" aria-label="Photo ${i + 1}"><img src="assets/nasa/${m.f}" alt=""></button>`).join("")}</div>` : ""}
      ${m0 ? `<p class="d-cap" id="dCap">${esc(m0.cap)} <a href="${NASA_PAGE(m0.id)}" target="_blank" rel="noopener">NASA · ${esc(m0.id)}</a></p>` : `<p class="d-cap">No close-up photo exists of this one — it crashed where no camera could see.</p>`}
      <div class="d-main">
        <div class="d-tags">${pill(a.status)}<span class="tag">${esc(WORLDS[a.world].short)}</span><span class="tag">${esc(TYPES[a.type])}</span><span class="tag">${esc(a.mission)}</span></div>
        <h2 id="dName">${esc(a.name)}</h2>
        <p class="d-sub">${a.nick && a.nick !== a.mission ? esc(a.nick) + " · " : ""}${esc(a.fixedPlace || a.place || a.heading)}${a.lat != null ? ` · ${Math.abs(a.lat).toFixed(2)}°${a.lat >= 0 ? "N" : "S"}, ${Math.abs(a.lon).toFixed(2)}°${a.lon >= 0 ? "E" : "W"}` : ""}</p>

        ${epitaphHTML(a)}
        <div class="ghost">
          <blockquote id="ghostText">${esc(a.ghost)}</blockquote>
          <div class="ghost-actions">
            <button class="btn btn-small speak" id="speakBtn" aria-pressed="false"><span aria-hidden="true"><svg class="ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M3 10v4h4l5 4V6L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg></span> ${t("readAloud", "Read aloud")}</button>
            <small style="color:var(--dim)">${t("d.voiceNote", "Written in {name}’s voice, from real mission facts.").replace("{name}", esc(a.name))}</small>
          </div>
        </div>

        <div class="d-block"><h3>${isSci ? t("d.sciStory", "The science story") : t("d.story", "The story")}</h3><p>${esc(isSci ? a.deep : a.story)}</p>
          ${!isSci ? `<button class="btn btn-small" id="moreBtn">${t("d.more", "Tell me more (Scientist level)")}</button>` : ""}</div>

        ${howList.length ? `<div class="d-block d-how"><h3>${t("d.how", "How it worked")}</h3>
          ${howList.length > 1 ? `<div class="ex-tabs" role="tablist" aria-label="Animations">${howList.map((h, i) => `<button role="tab" data-ex="${i}" aria-selected="${i === 0}">${esc(h.title)}</button>`).join("")}</div>` : ""}
          <div id="dHow"></div></div>` : ""}
        ${tnFor(a.id) ? `<div class="d-block"><h3>${t("d.thenNow", "Then &amp; now")}</h3>${tnHTML(tnFor(a.id))}</div>` : ""}
        ${typeof SOUNDS !== "undefined" && SOUNDS.some(s => s.for === a.id) ? `<div class="d-block d-sounds"><h3>${t("d.listen", "Listen")}</h3>${SOUNDS.filter(s => s.for === a.id).map(soundHTML).join("")}</div>` : ""}

        <div class="d-block"><h3>${t("d.pva", "Planned vs. what really happened")}</h3>
          <div class="pva"><div><small>${t("d.plan", "The plan")}</small>${esc(a.planned)}</div><div><small>${t("d.happened", "What happened")}</small>${esc(a.actual)}</div></div></div>

        <div class="d-block"><h3>${t("d.numbers", "By the numbers")}</h3><div class="facts">${facts}</div></div>

        <div class="d-block"><h3>${t("d.dates", "Mission dates")}</h3><ul class="dates">
          <li><span>${t("d.launched", "Launched")}</span><b>${esc(a.dates.launch)}</b></li>
          <li><span>${t("d.arrived", "Arrived")}</span><b>${esc(a.dates.arrive)}</b></li>
          <li><span>${t("d.last", "Last word / status")}</span><b>${esc(a.dates.last)}</b></li></ul></div>
        ${distBlock}

        <div class="d-block"><h3>${t("d.discovered", "What it discovered")}</h3><ul class="checks">${a.discoveries.map(d => `<li>${esc(d)}</li>`).join("")}</ul></div>
        ${a.left ? `<div class="d-block"><h3>${t("d.left", "What was left behind")}</h3><ul class="checks left">${a.left.map(d => `<li>${esc(d)}</li>`).join("")}</ul></div>` : ""}
        ${orbitHTML(a)}
        ${eyesHTML(a)}
        ${onboardHTML(a)}

        <div class="d-block"><h3>${t("d.matters", "Why it matters today")}</h3><p class="legacy">${esc(a.legacy)}</p></div>
        <div class="d-block"><div class="funbox"><img src="assets/ui/star.png" alt=""><div><b>${t("d.fun", "Fun fact")}</b><br>${esc(a.fun)}</div></div></div>
        ${a.video ? `<div class="d-block"><h3>${t("d.watch", "Watch")}</h3>${videoHTML(a.video)}${a.video2 ? "<br>" + videoHTML(a.video2) : ""}</div>` : ""}
        ${sourcesHTML(a)}
        <div class="d-links">
          ${hasModel(a.id) ? `<button class="btn btn-small" data-model="${a.id}">Spin the NASA 3D model</button>` : ""}
          ${a.world !== "deep" ? `<a class="btn btn-small" href="explore.html#${a.world}:${a.id}">See it on the 3D ${WORLDS[a.world].short} →</a>` : `<a class="btn btn-small" href="explore.html#deep:${a.id}">${t("d.see3dDeep", "See it in 3D deep space →")}</a>`}
          ${typeof ATLAS_SITES !== "undefined" && ATLAS_SITES[a.id] ? `<a class="btn btn-small btn-w3d" data-atlas="site:${ATLAS_SITES[a.id]}" href="atlas/index.html?go=site&amp;id=${ATLAS_SITES[a.id]}">${t("d.walk3d", "Walk there in 3D")}</a>` : ""}
          ${typeof ATLAS_RELIVE !== "undefined" && ATLAS_RELIVE[a.id] ? `<a class="btn btn-small btn-w3d" data-atlas="relive:${ATLAS_RELIVE[a.id]}" href="atlas/index.html?go=relive&amp;id=${ATLAS_RELIVE[a.id]}">▶ ${t("d.relive3d", "Relive the mission in 3D")}</a>` : ""}
          ${a.world !== "deep" && a.type !== "impactor" ? `<a class="btn btn-small" href="lander.html?level=${a.world === "moon" ? "moon" : ["curiosity", "backshell", "ingenuity"].includes(a.id) ? "jezero" : "mars"}">Try landing it yourself</a>` : ""}
          ${a.id === "opportunity" || a.id === "spirit" ? `<a class="btn btn-small btn-upclose" href="#upclose" data-upclose>${t("d.upclose", "Opportunity, up close: her life and insides")}</a>` : ""}
          <a class="btn btn-small" href="adopt.html#${a.id}">${t("d.adopt", "Adopt this ghost")}</a>
          <a class="btn btn-small" href="ask.html?q=${encodeURIComponent("Tell me about " + a.name)}">Ask about ${esc(a.name)}</a>
          ${m0 ? `<a class="btn btn-small" href="${NASA_PAGE(m0.id)}" target="_blank" rel="noopener">${t("d.nasaLib", "Open in NASA library ↗")}</a>` : ""}
        </div>
      </div>`;
    $("#drawerBody").scrollTop = 0;
    bindTn($("#drawerBody"));
    $("#drawerBody [data-upclose]")?.addEventListener("click", () => closeDrawer());
    if (typeof SOUNDS !== "undefined") bindSounds($("#drawerBody"));
    // "How it worked" animation(s)
    if (howList.length) {
      const show = i => { destroyHow(); dHow = Explainers.mount($("#dHow"), howList[i].scene, howList[i].variant); };
      show(0);
      $$("#drawerBody .ex-tabs [data-ex]").forEach(b => b.addEventListener("click", () => {
        $$("#drawerBody .ex-tabs [data-ex]").forEach(x => x.setAttribute("aria-selected", x === b)); show(+b.dataset.ex);
      }));
    }
    // thumbs
    $$(".d-thumbs button").forEach(b => b.addEventListener("click", () => {
      const m = a.media[+b.dataset.i];
      $("#dImg").src = "assets/nasa/" + m.f; $("#dImg").alt = m.cap;
      $("#dCap").innerHTML = `${esc(m.cap)} <a href="${NASA_PAGE(m.id)}" target="_blank" rel="noopener">NASA · ${esc(m.id)}</a>`;
      $$(".d-thumbs button").forEach(x => x.setAttribute("aria-current", x === b));
    }));
    $$("#drawerBody [data-model]").forEach(b => b.addEventListener("click", () => openModel(b.dataset.model)));
    const di = $("#dImg");
    if (di) di.addEventListener("click", () => openLightbox(di.getAttribute("src"), $("#dCap").textContent));
    $("#speakBtn").addEventListener("click", e => toggleSpeech(e.currentTarget, a.ghost + " " + (prefs.level === "scientist" ? a.deep : a.story)));
    const more = $("#moreBtn");
    if (more) more.addEventListener("click", () => { prefs.level = "scientist"; savePrefs(); applyPrefs(); rerenderLevel(); });
  }
  function initDrawer() {
    $("#dClose").addEventListener("click", closeDrawer);
    $("#scrim").addEventListener("click", closeDrawer);
    const step = d => { const i = ORDER.indexOf(openId); const n = ORDER[(i + d + ORDER.length) % ORDER.length]; stopSpeech(); openId = n; renderDrawer(n); if (!progress.opened.includes(n)) { progress.opened.push(n); saveProgress(); checkBadges(); } history.replaceState(null, "", "#artifact=" + n); };
    $("#dPrev").addEventListener("click", () => step(-1));
    $("#dNext").addEventListener("click", () => step(1));
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        if (!$("#lightbox").hidden) return closeLightbox();
        if (!$("#passport").hidden) return ($("#passport").hidden = true);
        if (!$("#drawer").hidden) return closeDrawer();
        if (!$("#settings").hidden) { $("#settings").hidden = true; $("#settingsBtn").setAttribute("aria-expanded", "false"); }
      }
      // focus trap
      if (e.key === "Tab" && !$("#drawer").hidden && $("#lightbox").hidden && !document.querySelector(".model-modal:not([hidden])")) {
        const f = $$("#drawer button, #drawer a, #drawer video, #drawer [tabindex]:not([tabindex='-1'])").filter(x => x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    const m = location.hash.match(/artifact=([\w-]+)/);
    if (m && byId[m[1]]) { const a = byId[m[1]]; if (a.world !== "deep") setWorld(a.world); setTimeout(() => openDrawer(a.id), 300); }
  }

  /* ---------------- speech ---------------- */
  let speakingBtn = null;
  function stopSpeech() { try { speechSynthesis.cancel(); } catch { } if (speakingBtn) { speakingBtn.setAttribute("aria-pressed", "false"); speakingBtn = null; } }
  function toggleSpeech(btn, text) {
    if (!("speechSynthesis" in window)) { toast("speaker", "Read aloud isn't supported in this browser."); return; }
    if (speakingBtn === btn) return stopSpeech();
    stopSpeech();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = prefs.level === "explorer" ? 0.92 : 1; u.pitch = 1;
    // speak in the page's language (English, Spanish or Hindi), preferring the more natural voices
    const lang = (window.I18n && I18n.lang) || "en", voices = speechSynthesis.getVoices(), re = new RegExp("^" + lang + "(-|_|$)", "i");
    u.lang = (window.I18n && I18n.speech) || "en-US";
    const voice = voices.find(v => re.test(v.lang) && /natural|google|samantha|aria|jenny|sabina|helena|madhur|swara|kalpana|hemant/i.test(v.name)) || voices.find(v => re.test(v.lang));
    if (voice) u.voice = voice;
    else if (lang !== "en") toast("speaker", t("noVoice", "Your device has no voice for this language, so it may sound odd. You can add one in your system's language settings."));
    u.onend = u.onerror = () => { if (speakingBtn === btn) stopSpeech(); };
    speechSynthesis.speak(u);
    speakingBtn = btn; btn.setAttribute("aria-pressed", "true");
    if (!progress.voice) { progress.voice = true; saveProgress(); checkBadges(); }
  }

  /* ---------------- GHOST LOGS (chapters) ---------------- */
  let chapter = 0;
  function initChapters() {
    $("#chapterNav").innerHTML = CHAPTERS.map((c, i) => {
      const a = byId[c.id];
      return `<button role="tab" data-i="${i}" aria-selected="${i === 0}" class="${progress.chapters.includes(c.id) ? "read" : ""}">${cover(a) ? `<img src="${cover(a)}" alt="" loading="lazy">` : ""}${i + 1}. ${esc(a.name)}</button>`;
    }).join("");
    $$("#chapterNav button").forEach(b => b.addEventListener("click", () => { chapter = +b.dataset.i; renderChapter(true); }));
    const sec = $("#logs");
    sec.addEventListener("keydown", e => {
      if (e.target.closest("input, textarea")) return;
      if (e.key === "ArrowRight") { chapter = Math.min(CHAPTERS.length - 1, chapter + 1); renderChapter(true); }
      if (e.key === "ArrowLeft") { chapter = Math.max(0, chapter - 1); renderChapter(true); }
    });
    renderChapter();
  }
  function renderChapter(markRead) {
    const c = CHAPTERS[chapter], a = byId[c.id];
    stopSpeech();
    const isSci = prefs.level === "scientist";
    $("#chapter").innerHTML = `
      <div class="ch-media">${cover(a) ? `<img src="${cover(a)}" alt="${esc(a.media[0].cap)}" decoding="async">` : ""}<span class="ch-num">${String(chapter + 1).padStart(2, "0")}</span></div>
      <div class="ch-text">
        <p class="eyebrow">${esc(c.kicker)} · ${esc(a.name)}</p>
        <h3>${esc(c.title)}</h3>
        ${epitaphHTML(a, "ch-epitaph")}
        <p class="ch-quote">${esc(a.ghost)}</p>
        <p class="ch-body">${esc(isSci ? a.deep : a.story)}</p>
        <div class="ch-foot">
          <button class="btn btn-small speak" id="chSpeak" aria-pressed="false"><span aria-hidden="true"><svg class="ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M3 10v4h4l5 4V6L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z"/></svg></span> ${t("readAloud", "Read aloud")}</button>
          <button class="btn btn-small" id="chOpen">${t("ch.open", "Open dossier")}</button>
          <span class="spacer"></span>
          <button class="icon-btn" id="chPrev" aria-label="Previous chapter" ${chapter === 0 ? "disabled" : ""}>←</button>
          <button class="icon-btn" id="chNext" aria-label="Next chapter" ${chapter === CHAPTERS.length - 1 ? "disabled" : ""}>→</button>
        </div>
      </div>`;
    $("#chSpeak").addEventListener("click", e => toggleSpeech(e.currentTarget, a.ghost + " " + (isSci ? a.deep : a.story)));
    $("#chOpen").addEventListener("click", e => openDrawer(a.id, e.currentTarget));
    $("#chPrev").addEventListener("click", () => { chapter--; renderChapter(true); });
    $("#chNext").addEventListener("click", () => { chapter++; renderChapter(true); });
    $$("#chapterNav button").forEach((b, i) => { b.setAttribute("aria-selected", i === chapter); if (i === chapter && markRead) b.scrollIntoView({ block: "nearest", inline: "center", behavior: prefs.motion ? "auto" : "smooth" }); });
    if (markRead || chapter === 0) {
      // count a chapter as read once it has been displayed for a few seconds
      clearTimeout(renderChapter.t);
      renderChapter.t = setTimeout(() => {
        if (!progress.chapters.includes(c.id)) { progress.chapters.push(c.id); saveProgress(); checkBadges(); }
        $$("#chapterNav button")[chapter]?.classList.add("read");
      }, 4000);
    }
  }

  /* ---------------- TIMELINE ---------------- */
  let tlFilter = "all";
  function renderTimeline() {
    const items = ARTIFACTS.filter(a => tlFilter === "all" || a.world === tlFilter).sort((a, b) => a.year - b.year);
    const decades = {};
    items.forEach(a => { const d = Math.floor(a.year / 10) * 10; (decades[d] ||= []).push(a); });
    $("#tl").innerHTML = Object.entries(decades).map(([d, list]) => `
      <div class="decade"><h3>${d}s</h3>
        ${list.map(a => `<button class="tl-item" data-id="${a.id}" style="--c:${WORLDS[a.world].color}">
          ${cover(a) ? `<img src="${cover(a)}" alt="" loading="lazy">` : `<span class="ph" aria-hidden="true">✦</span>`}
          <span><b>${esc(a.name)}</b><small>${a.year} · ${esc(WORLDS[a.world].short)} · ${esc(STATUS[a.status].label)}</small></span></button>`).join("")}
      </div>`).join("");
    $$("#tl .tl-item").forEach(b => b.addEventListener("click", () => openDrawer(b.dataset.id, b)));
  }
  function initTimeline() {
    $$("[data-tl]").forEach(b => b.addEventListener("click", () => {
      tlFilter = b.dataset.tl; $$("[data-tl]").forEach(x => x.setAttribute("aria-pressed", x === b)); renderTimeline();
    }));
    renderTimeline();
  }

  /* ---------------- DEEP SPACE ---------------- */
  function initDeep() {
    const min = Math.log10(0.3), max = Math.log10(300);
    const X = au => ((Math.log10(au) - min) / (max - min)) * 100;
    const bodies = [["Mercury", .39, 6, "#b8a99a"], ["Venus", .72, 9, "#e8c88a"], ["Earth", 1, 10, "#5aa9ff"], ["Mars", 1.52, 8, "#ff8a5c"], ["Jupiter", 5.2, 20, "#d9b38c"], ["Saturn", 9.54, 17, "#e6d3a3"], ["Uranus", 19.2, 13, "#9fe3e8"], ["Neptune", 30.1, 13, "#5b7cff"], ["Pluto", 39.5, 5, "#cbbba6"]];
    const ticks = [0.3, 1, 3, 10, 30, 100, 300];
    const probes = ARTIFACTS.filter(a => a.dist).map(a => ({ a, au: auNow(a.dist) })).sort((p, q) => p.au - q.au);
    const heights = [24, 40, 82, 124, 166, 200];
    $("#ruler").innerHTML = `
      <div class="zone" style="left:${X(94)}%;right:0;--b:26px"><span>Termination shock (~94 AU) →</span></div>
      <div class="zone" style="left:${X(120)}%;right:0;--b:4px"><span>Interstellar space begins (~120 AU) →</span></div>
      <div class="axis"></div>
      ${ticks.map(t => `<div class="tick" style="left:${X(t)}%"><span>${t} AU</span></div>`).join("")}
      <div class="body" style="left:0"><i style="width:22px;height:22px;background:radial-gradient(#fff6c8,#ffb347);box-shadow:0 0 18px #ffb347"></i><span>Sun →</span></div>
      ${bodies.map(([n, au, s, c], i) => `<div class="body" style="left:${X(au)}%"><i style="width:${s}px;height:${s}px;background:${c}"></i><span style="top:${i % 2 ? 34 : 18}px">${n}</span></div>`).join("")}
      ${probes.map((p, i) => `<button class="probe" style="left:${X(p.au)}%;--c:${STATUS[p.a.status].color};--h:${heights[i]}px;bottom:93px" data-id="${p.a.id}">
        <b>${esc(p.a.name)}</b><small>~${p.au.toFixed(0)} AU</small><span class="pdot"></span></button>`).join("")}`;
    $("#ruler").setAttribute("aria-label", "Distances from the Sun: " + probes.map(p => `${p.a.name} about ${p.au.toFixed(0)} AU`).join(", "));
    $$("#ruler .probe").forEach(b => b.addEventListener("click", () => openDrawer(b.dataset.id, b)));
    $("#deepCards").innerHTML = ARTIFACTS.filter(a => a.world === "deep").map(a => `
      <button class="card" data-id="${a.id}">
        ${cover(a) ? `<img src="${cover(a)}" alt="" loading="lazy">` : `<span class="ph">✦</span>`}
        <span class="card-body">${pill(a.status)}${hasModel(a.id) ? '<span class="tag3d">3D model</span>' : ""}<b>${esc(a.name)}</b>
          <p>${esc(a.dist ? "~" + fmtKm(auNow(a.dist)) + " from the Sun" : a.fixedPlace)}</p>
          <p class="live">${a.dist ? t("deep.signal", "Signal travel time: ~") + lightTime(auNow(a.dist)) : t("deep.launched", "Launched ") + a.dates.launch}</p></span>
      </button>`).join("");
    $$("#deepCards .card").forEach(b => b.addEventListener("click", () => openDrawer(b.dataset.id, b)));
  }

  /* ---- sourced records (site/js/records.js, from the Cosmic-Atlas catalogue) ---- */
  const rec = id => (typeof RECORDS !== "undefined" && RECORDS[id]) || null;
  // "What was on board": the instruments and parts, so readers see how the engineering made the science possible.
  function onboardHTML(a) {
    const r = rec(a.id);
    if (!r || !r.onboard) return "";
    return `<div class="d-block d-onboard"><h3>${t("d.onboard", "What was on board")}</h3>
      <p class="d-note">${t("d.onboardNote", "The hardware behind the discoveries. Tap a part to see what it did.")}</p>
      ${r.onboard.map(g => `<div class="ob-group">
        <h4>${esc(g.name.replace(/^Apollo \d+ /, ""))}</h4>
        ${g.design ? `<p>${esc(g.design)}</p>` : ""}
        ${g.status ? `<p class="ob-status"><b>${t("d.today", "Today:")}</b> ${esc(g.status)}</p>` : ""}
        ${g.items.length ? `<ul class="ob-list">${g.items.map(i => `<li><details><summary><b>${esc(i.name)}</b>${i.kind ? `<span class="ob-kind">${esc(i.kind)}</span>` : ""}</summary>
          <p>${i.full ? `<i>${esc(i.full)}.</i> ` : ""}${esc(i.what)}</p>
          ${i.found ? `<p class="ob-found"><b>${t("d.found", "What it found:")}</b> ${i.found.map(esc).join(" ")}</p>` : ""}
          ${i.specs ? `<p class="ob-specs">${i.specs.map(esc).join(" · ")}</p>` : ""}</details></li>`).join("")}</ul>` : ""}
      </div>`).join("")}</div>`;
  }
  // "See it from orbit": a real orbital photo showing the hardware still there today.
  function orbitHTML(a) {
    const o = rec(a.id)?.orbit;
    if (!o) return "";
    return `<div class="d-block d-orbit"><h3>${t("d.orbit", "See it from orbit")}</h3><p>${esc(o.cap)}</p>
      <a class="btn btn-small" href="${esc(o.url)}" target="_blank" rel="noopener">${t("d.hirise", "Open HiRISE image")} ${esc(o.img)} ↗</a></div>`;
  }
  // NASA Eyes block in the dossier: tap to load; "Show:" switches spacecraft ↔ classic landing site.
  function startEyes(b) {
    const f = document.createElement("iframe");
    f.src = b.dataset.eyesStart; f.title = t("d.eyesFrame", "NASA Eyes on the Solar System");
    f.allow = "fullscreen"; f.allowFullscreen = true; f.referrerPolicy = "strict-origin-when-cross-origin";
    b.replaceWith(f);
  }
  document.addEventListener("click", e => {
    const st = e.target.closest(".d-eyes [data-eyes-start]");
    if (st) { startEyes(st); return; }
    const pk = e.target.closest(".d-eyes [data-pick]");
    if (!pk) return;
    setEyesViewPref(pk.dataset.pick);
    const block = pk.closest(".d-eyes"), wasOpen = !!block.querySelector("iframe");
    const tmp = document.createElement("div");
    tmp.innerHTML = eyesHTML(ARTIFACTS.find(x => x.id === pk.dataset.for));
    const fresh = tmp.firstElementChild;
    block.replaceWith(fresh);
    if (wasOpen) startEyes(fresh.querySelector("[data-eyes-start]"));
    fresh.querySelector(`[data-pick="${pk.dataset.pick}"]`)?.focus();
  });
  // "Fly there in NASA Eyes": NASA/JPL's live 3D solar system, opened at this machine (or its world)
  // at the moment that matters. Loads only when tapped, since Eyes is a big download.
  function eyesHTML(a) {
    if (typeof EYES_MACHINES === "undefined" || !EYES_MACHINES[a.id]) return "";
    const m = eyesPick(a.id);
    const url = eyesForMachine(a.id, { settings: { featured: false, menu: false, shareButton: false, logo: true, detailPanel: false, search: false, timeControls: true, locked: true } });
    const when = m.at ? new Date(m.at).toUTCString().slice(5, 16) : t("d.eyesToday", "today");
    const pick = EYES_MACHINES[a.id].c ? `<p class="ey-pick" role="group" aria-label="${t("d.eyesShow", "Show")}">${t("d.eyesShow", "Show")}: <button data-pick="craft" data-for="${a.id}" aria-pressed="${m.craft}">${a.type === "rover" ? t("d.eyesRover", "the rover itself") : t("d.eyesLander", "the lander itself")}</button><button data-pick="classic" data-for="${a.id}" aria-pressed="${!m.craft}">${t("d.eyesClassic", "its landing site (classic)")}</button></p>` : "";
    return `<div class="d-block d-eyes"><h3>${t("d.eyes", "Fly there in NASA Eyes")}</h3>${pick}
      <p>${(window.I18n?.lang || "en") === "en" ? esc(m.note) : `${esc(a.name)} · ${esc(when)}`}${m.self ? "" : ` <span class="ey-tag world">${t("d.eyesWorld", "Eyes shows its world, not the machine itself")}</span>`}</p>
      <div class="ey-mini"><button class="ey-mini-start" data-eyes-start="${esc(url)}"><span class="ey-play" aria-hidden="true">▶</span>
        <b>${t("d.eyesStart", "Load NASA's live 3D view")}</b><span>${esc(when)} · ${t("d.eyesNeeds", "a big download, needs internet")}</span></button></div>
      <div class="d-eyes-links"><a class="btn btn-small" href="eyes.html#${a.id}">${t("d.eyesPage", "More in NASA Eyes →")}</a>
        <a class="btn btn-small" href="${esc(eyesForMachine(a.id))}" target="_blank" rel="noopener">${t("d.eyesFull", "Open full screen ↗")}</a></div></div>`;
  }
  // "Sources": the documents these facts were checked against.
  function sourcesHTML(a) {
    const list = (rec(a.id)?.sources || []).map(id => typeof SOURCE_LIST !== "undefined" && SOURCE_LIST[id]).filter(Boolean);
    const photos = a.media.length ? `${t("d.photos", "Photos:")} <a href="${NASA_PAGE(a.media[0].id)}" target="_blank" rel="noopener">NASA Image and Video Library</a>. ` : "";
    return `<div class="d-block d-sources"><details><summary>${t("d.sources", "Sources")}${list.length ? ` (${list.length})` : ""}</summary>
      ${list.length ? `<ul>${list.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a> <small>${esc(s.org)}${s.read ? ` · read ${esc(s.read)}` : ""}</small></li>`).join("")}</ul>` : ""}
      <p class="d-note">${photos}<a href="sources.html#${a.id}">${t("d.allSources", "Every source in the archive →")}</a></p></details></div>`;
  }

  // One-line epitaph, carved like a memorial. Machines still working get a "not yet" label.
  function epitaphHTML(a, extra = "") {
    if (!a.epitaph) return "";
    return `<p class="epitaph ${extra}"><span class="ep-label">${a.status === "active" ? t("d.notEpitaph", "Not an epitaph yet") : t("d.epitaph", "Epitaph")}</span><span class="ep-text">“${esc(a.epitaph)}”</span></p>`;
  }

  /* ---------------- QUIZ ---------------- */
  let quiz = null;
  function newQuiz() {
    const pool = ARTIFACTS.filter(a => a.quiz).sort(() => Math.random() - .5).slice(0, 8);
    quiz = { qs: pool.map(a => {
      const others = ARTIFACTS.filter(o => o.id !== a.id && o.quiz).sort((x, y) => (y.world === a.world) - (x.world === a.world) || Math.random() - .5).slice(0, 6).sort(() => Math.random() - .5).slice(0, 3);
      return { a, opts: [a, ...others].sort(() => Math.random() - .5) };
    }), i: 0, score: 0, answered: false };
    renderQuiz();
  }
  function renderQuiz() {
    const box = $("#quizBox");
    if (quiz.i >= quiz.qs.length) {
      const s = quiz.score, n = quiz.qs.length;
      if (s > progress.quizBest) { progress.quizBest = s; saveProgress(); checkBadges(); }
      box.innerHTML = `<div class="q-done"><img src="assets/ui/${s >= 6 ? "trophy" : "star"}.png" alt="">
        <h3>${t("q.scored", "You scored {s} out of {n}!").replace("{s}", s).replace("{n}", n)}</h3><p>${s >= 6 ? t("q.amazing", "Amazing — you’re an Archive Expert.") : t("q.nice", "Nice try! Open a few more dossiers and try again.")}</p>
        <button class="btn btn-primary" id="qAgain">${t("q.again", "Play again")}</button></div>`;
      $("#qAgain").addEventListener("click", newQuiz);
      return;
    }
    const q = quiz.qs[quiz.i];
    box.innerHTML = `
      <div class="q-top"><span class="tag">${t("q.questionXofY", "Question {x} of {y}").replace("{x}", quiz.i + 1).replace("{y}", quiz.qs.length)}</span><span class="q-progress" aria-hidden="true"><i style="width:${quiz.i / quiz.qs.length * 100}%"></i></span><span class="tag">${t("q.scoreLabel", "Score:")} ${quiz.score}</span></div>
      <p class="q-clue">${esc(q.a.quiz)}</p>
      <div class="q-opts">${q.opts.map(o => `<button class="q-opt" data-id="${o.id}">${thumbHTML(o, "")}<span><b>${esc(o.name)}</b><br><small style="color:var(--muted)">${esc(WORLDS[o.world].short)} · ${o.year}</small></span></button>`).join("")}</div>
      <div class="q-feedback" id="qFeed" aria-live="polite"></div>`;
    $$(".q-opt", box).forEach(b => b.addEventListener("click", () => {
      if (quiz.answered) return; quiz.answered = true;
      const ok = b.dataset.id === q.a.id;
      if (ok) quiz.score++;
      $$(".q-opt", box).forEach(x => { x.disabled = true; if (x.dataset.id === q.a.id) x.classList.add("right"); });
      if (!ok) b.classList.add("wrong");
      $("#qFeed").innerHTML = `<p>${ok ? "Correct!" : "Not quite — it was <b>" + esc(q.a.name) + "</b>."} ${esc(q.a.fun)}</p>
        <button class="btn btn-primary btn-small" id="qNext">${quiz.i === quiz.qs.length - 1 ? t("q.score", "See my score") : t("q.next", "Next question →")}</button>
        <button class="btn btn-small" id="qLearn">${t("q.openDossier", "Open its dossier")}</button>`;
      $("#qNext").addEventListener("click", () => { quiz.i++; quiz.answered = false; renderQuiz(); $("#quizBox").scrollIntoView({ block: "nearest" }); });
      $("#qLearn").addEventListener("click", e => openDrawer(q.a.id, e.currentTarget));
      $("#qNext").focus();
    }));
  }

  /* ---------------- ARCHIVE ---------------- */
  function initArchive() {
    const vids = [
      ["apollo11", "apollo11"], ["lrv", "apollo15"], ["ingenuity", "ingenuity"], ["marsquake", "insight"], ["meteoroid", "insight"], ["voyager", "voyager1"]
    ];
    $("#videos").innerHTML = vids.map(([k, aid]) => { const v = VIDEOS[k]; return `
      <div class="vcard"><button class="vthumb" data-v="${k}" aria-label="Play video: ${esc(v.title)}"><img src="${v.poster}" alt="" loading="lazy"></button>
      <p>${esc(v.title)}<small>${esc(byId[aid].name)}${v.note ? " · " + esc(v.note) : ""}</small></p></div>`; }).join("");
    $$("#videos .vthumb").forEach(b => b.addEventListener("click", () => {
      const v = VIDEOS[b.dataset.v];
      const vid = document.createElement("video");
      vid.controls = true; vid.autoplay = true; vid.playsInline = true; vid.poster = v.poster; vid.src = NASA_VIDEO(v.id);
      vid.setAttribute("aria-label", v.title);
      b.replaceWith(vid); vid.focus();
    }));
    renderGallery("all");
    $$("[data-arc]").forEach(b => b.addEventListener("click", () => { $$("[data-arc]").forEach(x => x.setAttribute("aria-pressed", x === b)); renderGallery(b.dataset.arc); }));
  }
  function renderGallery(w) {
    const seen = new Set(), items = [];
    ARTIFACTS.filter(a => w === "all" || a.world === w).forEach(a => a.media.forEach(m => { if (!seen.has(m.f)) { seen.add(m.f); items.push({ a, m }); } }));
    $("#gallery").innerHTML = items.map(({ a, m }) => `
      <figure><button data-src="assets/nasa/${m.f}" data-cap="${esc(m.cap + " — NASA · " + m.id)}"><img src="assets/nasa/${m.f}" alt="${esc(m.cap)}" loading="lazy"></button>
      <figcaption><b>${esc(a.name)}</b>${esc(m.cap)}<br><a href="${NASA_PAGE(m.id)}" target="_blank" rel="noopener">NASA · ${esc(m.id)}</a></figcaption></figure>`).join("");
    $$("#gallery button").forEach(b => b.addEventListener("click", () => openLightbox(b.dataset.src, b.dataset.cap)));
  }
  let lbReturn = null;
  function openLightbox(src, cap) {
    lbReturn = document.activeElement;
    $("#lbImg").src = src; $("#lbImg").alt = cap; $("#lbCap").textContent = cap;
    $("#lightbox").hidden = false; $("#lbClose").focus();
  }
  function closeLightbox() { $("#lightbox").hidden = true; lbReturn?.focus(); }

  /* ---------------- BADGES ---------------- */
  function earned() {
    const op = progress.opened.map(id => byId[id]).filter(Boolean);
    const c = w => op.filter(a => a.world === w).length;
    return {
      moon3: c("moon") >= 3, mars3: c("mars") >= 3, deep2: c("deep") >= 2,
      story: progress.chapters.length >= 4, voice: !!progress.voice, quiz: progress.quizBest >= 6,
      explore: !!progress.explore || !!store.get("explored", false), all: ARTIFACTS.every(a => progress.opened.includes(a.id))
    };
  }
  function checkBadges() {
    const e = earned();
    BADGES.forEach(b => {
      if (e[b.id] && !progress.badges.includes(b.id)) { progress.badges.push(b.id); saveProgress(); toast(b.icon, `Badge earned: <b>${esc(b.name)}</b>`); }
    });
    $("#badgeCount").textContent = progress.badges.length; $("#passportBtn").setAttribute("aria-label", `Open explorer passport, ${progress.badges.length} badges`);
    renderPassport();
  }
  function renderPassport() {
    $("#ppProgress").textContent = `${progress.badges.length} of ${BADGES.length} badges · ${progress.opened.length} of ${ARTIFACTS.length} dossiers opened`;
    $("#badges").innerHTML = BADGES.map(b => {
      const has = progress.badges.includes(b.id);
      return `<div class="bdg ${has ? "earned" : "locked"}"><img src="assets/ui/${has ? b.icon : "lock"}.png" alt=""><b>${esc(b.name)}</b><small>${has ? "Earned!" : esc(b.how)}</small></div>`;
    }).join("");
  }
  function initPassport() {
    const m = $("#passport");
    $("#passportBtn").addEventListener("click", () => { renderPassport(); m.hidden = false; $("[data-close]", m).focus(); });
    $("[data-close]", m).addEventListener("click", () => (m.hidden = true));
    m.addEventListener("click", e => { if (e.target === m) m.hidden = true; });
    $("#resetProgress").addEventListener("click", () => {
      if (!confirm("Reset all badges and progress?")) return;
      Object.assign(progress, { opened: [], chapters: [], voice: false, quizBest: 0, explore: false, badges: [] });
      store.set("explored", false); saveProgress(); checkBadges(); initChapters();
    });
    checkBadges();
  }
  let toastT;
  function toast(icon, html) {
    const t = $("#toast");
    t.innerHTML = `<img src="assets/ui/${icon}.png" alt=""><span>${html}</span>`; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 3800);
  }

  /* ---------------- boot ---------------- */
  /* ---------------- ASK THE ARCHIVE teaser ---------------- */
  function initAskTeaser() {
    if (!$("#askcLog")) return;
    const CHIPS = ["How did Curiosity land?", "Which machines are still working?", "Talk to me as Ingenuity", "What did Opportunity discover?", "Why did astronauts leave things on the Moon?", "How far away is Voyager 1?"];
    $("#askcChips").innerHTML = CHIPS.map(q => `<a class="askc-chip" href="ask.html?q=${encodeURIComponent(q)}">${esc(q)}</a>`).join("");
    $("#askcForm").addEventListener("submit", e => {
      const q = $("#askcInput").value.trim();
      e.preventDefault();
      location.href = q ? "ask.html?q=" + encodeURIComponent(q) : "ask.html";
    });
    // Example conversations (short versions of real answers from the archive guide)
    const v1 = byId.voyager1.dist ? auNow(byId.voyager1.dist).toFixed(0) : "170";
    const DEMO = [
      ["How did Curiosity land?", "A parachute slowed it down, then a rocket-powered <b>sky crane</b> lowered it on cables about 7.5 m long, and flew away to crash. ", "curiosity"],
      ["Talk to me as Ingenuity", "<i>“Nobody had ever flown on another planet. I was meant to fly five times. I flew 72.”</i> ", "ingenuity"],
      ["How far away is Voyager 1?", `About <b>${v1} AU</b> from the Sun: so far that its radio signal takes almost a whole day to reach us. `, "voyager1"],
      ["What did Opportunity discover?", "Tiny round “blueberries” of hematite that formed in water, proof that Mars was once wet. ", "opportunity"]
    ];
    const log = $("#askcLog");
    const still = () => prefs.motion || matchMedia("(prefers-reduced-motion: reduce)").matches;
    let i = 0, timer = 0, visible = false;
    const bubble = (cls, html) => { const d = document.createElement("div"); d.className = "askc-msg " + cls; d.innerHTML = html; log.appendChild(d); return d; };
    function play() {
      clearTimeout(timer);
      const [q, a, id] = DEMO[i % DEMO.length]; i++;
      log.innerHTML = "";
      bubble("user", esc(q));
      const typing = bubble("bot", `<span class="askc-dots"><i></i><i></i><i></i></span>`);
      timer = setTimeout(() => {
        const c = cover(byId[id]);
        typing.innerHTML = a + `<a class="askc-link" href="ask.html?q=${encodeURIComponent(q)}" tabindex="-1">${c ? `<img src="${c}" alt="">` : ""}${esc(byId[id].name)} →</a>`;
        if (visible && !still()) timer = setTimeout(play, 5200);
      }, still() ? 0 : 1100);
    }
    new IntersectionObserver(en => en.forEach(x => {
      visible = x.isIntersecting;
      if (visible && !timer) play();
      else if (visible) { clearTimeout(timer); play(); }
      else clearTimeout(timer);
    }), { threshold: .3 }).observe($("#ask"));
    play();
  }

  /* ---------------- SPACE SOUNDS ---------------- */
  let soundPlaying = null;
  function soundHTML(s) {
    return `<div class="snd" data-sid="${esc(s.id)}">
      <button class="snd-play" aria-label="Play: ${esc(s.title)}"><span class="snd-ic" aria-hidden="true">▶</span></button>
      <div class="snd-body"><b>${s.icon} ${esc(s.title)}</b><p>${esc(s.what)}</p>
        <div class="snd-meta"><span class="snd-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span class="snd-time">tap ▶ to listen</span>
        ${byId[s.for] ? ` · <a href="#artifact=${s.for}" data-open="${s.for}">${esc(byId[s.for].name)}</a>` : ""} · <a href="${NASA_PAGE(s.id)}" target="_blank" rel="noopener">NASA source</a></div></div>
    </div>`;
  }
  function bindSounds(root) {
    $$(".snd", root).forEach(card => {
      const s = SOUNDS.find(x => x.id === card.dataset.sid);
      const btn = $(".snd-play", card), time = $(".snd-time", card);
      let audio = null;
      const stopUI = () => { card.classList.remove("playing"); $(".snd-ic", card).textContent = "▶"; btn.setAttribute("aria-label", "Play: " + s.title); };
      btn.addEventListener("click", () => {
        if (!audio) {
          audio = new Audio(); audio.preload = "none"; audio.src = NASA_VIDEO(s.id);
          audio.addEventListener("timeupdate", () => { const t = audio.currentTime | 0; time.textContent = `${(t / 60) | 0}:${String(t % 60).padStart(2, "0")}${audio.duration ? " / " + ((audio.duration / 60) | 0) + ":" + String((audio.duration | 0) % 60).padStart(2, "0") : ""}`; });
          audio.addEventListener("ended", stopUI); audio.addEventListener("pause", stopUI);
          audio.addEventListener("waiting", () => (time.textContent = "loading…"));
          audio.addEventListener("error", () => { time.textContent = "couldn't load (needs internet)"; stopUI(); });
        }
        if (!audio.paused) { audio.pause(); return; }
        if (soundPlaying && soundPlaying !== audio) soundPlaying.pause();
        stopSpeech();
        audio.play().catch(() => (time.textContent = "couldn't play"));
        soundPlaying = audio;
        card.classList.add("playing"); $(".snd-ic", card).textContent = "❚❚"; btn.setAttribute("aria-label", "Pause: " + s.title);
      });
      $$("[data-open]", card).forEach(l => l.addEventListener("click", e => { e.preventDefault(); openDrawer(l.dataset.open, l); }));
    });
  }
  function initSounds() {
    if (typeof SOUNDS === "undefined" || !$("#sounds")) return;
    $("#sounds").innerHTML = SOUNDS.map(soundHTML).join("");
    bindSounds($("#sounds"));
  }

  /* ---------------- THEN & NOW sliders ---------------- */
  const tnFor = id => (typeof THEN_NOW !== "undefined" ? THEN_NOW.find(t => t.id === id) : null);
  function tnHTML(t) {
    return `<div class="tn" style="--p:50%">
        <img class="tn-now" src="assets/nasa/${t.now.f}" alt="${esc(t.title)}, ${esc(t.now.when)}, ${esc(t.now.how)}" loading="lazy">
        <div class="tn-then"><img src="assets/nasa/${t.then.f}" alt="${esc(t.title)}, ${esc(t.then.when)}, ${esc(t.then.how)}" loading="lazy"></div>
        <span class="tn-tag l">${esc(t.then.when)} · ${esc(t.then.how)}</span><span class="tn-tag r">${esc(t.now.when)} · ${esc(t.now.how)}</span>
        <span class="tn-handle" aria-hidden="true"><span>⟷</span></span>
        <input class="tn-range" type="range" min="0" max="100" value="50" aria-label="Slide between ${esc(t.then.when)} and ${esc(t.now.when)}">
      </div>
      <p class="tn-note">${esc(t.note)} <span class="nasa-id">NASA · ${esc(t.then.nid)} · ${esc(t.now.nid)}</span></p>`;
  }
  function bindTn(root) {
    $$(".tn", root).forEach(tn => {
      const r = $(".tn-range", tn);
      const set = () => tn.style.setProperty("--p", r.value + "%");
      r.addEventListener("input", set); set();
    });
  }
  function initThenNow() {
    if (typeof THEN_NOW === "undefined") return;
    const show = i => {
      $("#tnStage").innerHTML = tnHTML(THEN_NOW[i]) + `<a class="btn btn-small" href="#artifact=${THEN_NOW[i].id}" data-open="${THEN_NOW[i].id}">Open the ${esc(byId[THEN_NOW[i].id].name)} dossier →</a>`;
      bindTn($("#tnStage"));
      $("#tnStage [data-open]").addEventListener("click", e => { e.preventDefault(); openDrawer(e.currentTarget.dataset.open, e.currentTarget); });
      $$("#tnTabs button").forEach(b => b.setAttribute("aria-selected", +b.dataset.i === i));
    };
    $("#tnTabs").innerHTML = THEN_NOW.map((t, i) => `<button role="tab" data-i="${i}" aria-selected="${i === 0}">${esc(t.title)}</button>`).join("");
    $$("#tnTabs button").forEach(b => b.addEventListener("click", () => show(+b.dataset.i)));
    show(0);
  }

  /* ---------------- HOW IT WORKED gallery ---------------- */
  function initHow() {
    if (!window.Explainers) return;
    let player = null;
    const G = Explainers.GALLERY;
    $("#howList").innerHTML = G.map(([, , label], i) => `<button role="tab" data-i="${i}" aria-selected="${i === 0}"><span class="n">${i + 1}</span>${esc(label)}</button>`).join("");
    const users = scene => ARTIFACTS.filter(a => Explainers.forArtifact(a.id).some(h => h.scene === scene));
    const show = i => {
      const [scene, artId] = G[i];
      if (player) player.destroy();
      const variant = (Explainers.forArtifact(artId).find(h => h.scene === scene) || {}).variant;
      player = Explainers.mount($("#howPlayer"), scene, variant);
      $("#howTitle2").textContent = player.title;
      const who = users(scene);
      $("#howWho").innerHTML = "Used by: " + who.map(a => `<a href="#artifact=${a.id}" data-open="${a.id}">${esc(a.name)}</a>`).join(", ");
      $$("#howWho [data-open]").forEach(l => l.addEventListener("click", e => { e.preventDefault(); openDrawer(l.dataset.open, l); }));
      $$("#howList button").forEach(b => b.setAttribute("aria-selected", +b.dataset.i === i));
    };
    $$("#howList button").forEach(b => b.addEventListener("click", () => show(+b.dataset.i)));
    show(0);
  }

  // ?scrollto=section jumps straight to a section (used for links and screenshots).
  addEventListener("load", () => { const id = new URLSearchParams(location.search).get("scrollto"); const el = id && document.getElementById(id); if (el) setTimeout(() => el.scrollIntoView({ behavior: "instant", block: "start" }), 300); });
  window.GOE = { openDossier: (id, from) => openDrawer(id, from) }; // used by js/story.js
  initSettings(); initNav(); initStars(); initHero(); initMap(); initDrawer(); initChapters(); initHow(); initThenNow(); initSounds(); initAskTeaser(); initTimeline(); initDeep(); newQuiz(); initArchive(); initPassport();
  $("#lbClose").addEventListener("click", closeLightbox);
  $("#lightbox").addEventListener("click", e => { if (e.target.id === "lightbox") closeLightbox(); });
  if ("speechSynthesis" in window) speechSynthesis.getVoices();
})();
