/* ===========================================================
   NASA Eyes page (eyes.html): our archive's machines, worlds and
   stories, shown inside NASA's Eyes on the Solar System.
   Deep links: eyes.html#voyager1 (a machine), #w=mars (a world),
   #s=voyager_grand_tour (a story), #d=1969-07-20 (a date).
   =========================================================== */
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const WORLD_NAMES = { moon: "The Moon", mars: "Mars", deep: "Elsewhere" };
  let frame = $("#eyFrame");
  const loading = $("#eyLoading");

  // ---- settings (remembered per browser) ----
  const KEY = "goe-eyes-settings";
  const defaults = () => Object.fromEntries(EYES_OPTIONS.map(o => [o.q, o.on]));
  let settings = defaults();
  try { Object.assign(settings, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { /* private mode */ }
  const saveSettings = () => { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignore */ } };

  // ---- what is showing ----
  // state: { kind: "machine"|"world"|"story"|"date"|"home", id, view, when }
  let state = { kind: "home", view: "", when: "moment" };

  function currentURL() {
    const o = { settings, view: state.view };
    if (state.kind === "machine") {
      const m = eyesPick(state.id);
      return eyesURL(m.t, { ...o, time: state.when === "moment" ? m.at : undefined });
    }
    if (state.kind === "world") return eyesURL(state.id, o);
    if (state.kind === "story") return eyesURL(null, { settings, story: state.id });
    if (state.kind === "date") return eyesURL(state.target || "earth", { ...o, time: state.id + "T12:00:00Z" });
    return eyesURL("home", { settings });
  }

  function render() {
    const url = currentURL();
    if (frame.src !== url) {
      // Eyes is a one-page app: changing only the #hash would keep the old view's state,
      // so swap in a fresh iframe each time.
      loading.hidden = false;
      const f = frame.cloneNode(false);
      f.removeAttribute("loading");
      f.addEventListener("load", () => setTimeout(() => { if (f === frame) loading.hidden = true; }, 1500));
      f.src = url;
      frame.replaceWith(f);
      frame = f;
    }
    $("#eyOpen").href = url.replace(/([?&])(locked|hideExternalLinks)=[^&]*/g, "$1").replace(/[?&]$/, "");
    describe();
    markActive();
    writeHash();
  }

  // Heading + note above the view
  function describe() {
    const kick = $("#eyKicker"), title = $("#eyTitle"), note = $("#eyNote");
    const whenBox = $("#eyWhen"), views = $("#eyViews");
    whenBox.hidden = true; views.hidden = state.kind === "story" || state.kind === "home";
    if (state.kind === "machine") {
      const a = ARTIFACTS.find(x => x.id === state.id), m = eyesPick(state.id);
      kick.textContent = `${WORLD_NAMES[a.world]} · ${a.year}`;
      title.textContent = a.name;
      const when = m.at && state.when === "moment" ? `${new Date(m.at).toUTCString().slice(5, 16)}. ` : "";
      note.innerHTML = `${esc(when)}${esc(state.when === "moment" || !m.at ? m.note : `${m.self ? a.name : "Its world"} as it is today.`)}
        ${m.self ? "" : ` <span class="ey-tag world">Eyes doesn't model this machine itself</span>`}
        <a href="index.html#${esc(a.id)}">Read its dossier →</a>
        ${EYES_MACHINES[a.id].c ? `<span class="ey-pick" role="group" aria-label="What to show">Show: <button data-pick="craft" aria-pressed="${m.craft}">the ${a.type === "rover" ? "rover" : "lander"} itself</button><button data-pick="classic" aria-pressed="${!m.craft}">its landing site (classic)</button></span>` : ""}`;
      whenBox.hidden = !m.at;
    } else if (state.kind === "world") {
      const w = EYES_WORLDS.find(x => x.t === state.id);
      kick.textContent = "World"; title.textContent = w ? w.n : state.id;
      const home = a => a.world === "deep" ? (a.body || "").toLowerCase() : a.world;
      const here = ARTIFACTS.filter(a => EYES_MACHINES[a.id] && (EYES_MACHINES[a.id].t === state.id || home(a) === state.id));
      note.innerHTML = here.length ? `Machines from our archive here: ${here.map(a => `<a href="#${a.id}" data-go="${a.id}">${esc(a.name)}</a>`).join(", ")}.` : "Click anything in the view to fly to it.";
    } else if (state.kind === "story") {
      const s = EYES_STORIES.find(x => x.id === state.id);
      kick.textContent = "Guided story by NASA/JPL"; title.textContent = s ? s.n : state.id;
      note.textContent = s ? s.d + " Use the arrows inside Eyes to move through the story." : "";
    } else if (state.kind === "date") {
      kick.textContent = "Time travel"; title.textContent = new Date(state.id + "T12:00:00Z").toUTCString().slice(5, 16);
      note.textContent = "Every planet and spacecraft where it was on this day. Press play in the time controls to watch it move.";
    }
    views.innerHTML = EYES_VIEWS.map(v => `<button data-view="${v.v}" aria-pressed="${state.view === v.v}" title="${esc(v.d)}">${esc(v.n)}</button>`).join("");
    whenBox.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.when === state.when)));
  }

  function markActive() {
    document.querySelectorAll("[data-go],[data-world],[data-story]").forEach(el => el.removeAttribute("aria-current"));
    const sel = state.kind === "machine" ? `#eyMachines [data-go="${state.id}"]` : state.kind === "world" ? `[data-world="${state.id}"]` : state.kind === "story" ? `[data-story="${state.id}"]` : null;
    if (sel) $(sel)?.setAttribute("aria-current", "true");
  }

  function writeHash() {
    const h = state.kind === "machine" ? state.id : state.kind === "world" ? "w=" + state.id : state.kind === "story" ? "s=" + state.id : state.kind === "date" ? "d=" + state.id : "";
    if (location.hash !== (h ? "#" + h : "")) history.replaceState(null, "", h ? "#" + h : location.pathname + location.search);
  }

  function readHash() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (EYES_MACHINES[h]) state = { kind: "machine", id: h, view: "", when: "moment" };
    else if (h.startsWith("w=")) state = { kind: "world", id: h.slice(2), view: "", when: "now" };
    else if (h.startsWith("s=")) state = { kind: "story", id: h.slice(2), view: "", when: "now" };
    else if (/^d=\d{4}-\d\d-\d\d$/.test(h)) state = { kind: "date", id: h.slice(2), view: "", when: "now" };
    else state = { kind: "home", view: "", when: "moment" };
  }

  // ---- lists ----
  function buildMachines() {
    const groups = ["moon", "mars", "deep"].map(w => {
      const items = ARTIFACTS.filter(a => a.world === w && EYES_MACHINES[a.id]).sort((a, b) => a.year - b.year);
      return `<section class="ey-group" data-world-group="${w}"><h2 class="ey-h"><span class="dot ${w}"></span>${WORLD_NAMES[w]}</h2><ul class="ey-list">${items.map(a => {
        const m = EYES_MACHINES[a.id];
        return `<li data-name="${esc((a.name + " " + a.mission + " " + a.year).toLowerCase())}"><button data-go="${a.id}">
          <span class="ey-li-name">${esc(a.name)}</span><span class="ey-li-meta">${a.year}${a.body ? " · " + esc(a.body) : ""}</span>
          <span class="ey-tag ${m.self ? "self" : "world"}">${m.self ? "In Eyes" : "World"}</span></button></li>`;
      }).join("")}</ul></section>`;
    }).join("");
    $("#eyMachines").innerHTML = groups;
  }
  function buildWorlds() {
    $("#eyWorlds").innerHTML = EYES_WORLDS.map(w => `<button data-world="${w.t}">${esc(w.n)}</button>`).join("");
  }
  function buildStories() {
    $("#eyStories").innerHTML = EYES_STORIES.map(s => `<li><button data-story="${s.id}"><b>${esc(s.n)}</b><span>${esc(s.d)}</span></button></li>`).join("");
  }
  function buildOptions() {
    $("#eyOpts").innerHTML = `<li><label><input type="checkbox" id="eyCraftOpt" ${eyesViewPref() === "craft" ? "checked" : ""}>
      <span><b>Show spacecraft, not landing sites</b><small>For Spirit, Opportunity and Phoenix, show Eyes' 3D model of the machine itself. Untick for the classic landing-site view.</small></span></label></li>` + EYES_OPTIONS.map(o => `<li><label><input type="checkbox" data-opt="${o.q}" ${settings[o.q] ? "checked" : ""}>
      <span><b>${esc(o.n)}</b><small>${esc(o.d)}</small></span></label></li>`).join("");
  }

  // ---- events ----
  document.addEventListener("click", e => {
    const go = e.target.closest("[data-go]"), wd = e.target.closest("[data-world]"), st = e.target.closest("[data-story]");
    const vw = e.target.closest("[data-view]"), wh = e.target.closest("[data-when]"), pk = e.target.closest("[data-pick]");
    if (pk) { setEyesViewPref(pk.dataset.pick); syncPickOpt(); render(); return; }
    if (go) { e.preventDefault(); state = { kind: "machine", id: go.dataset.go, view: "", when: "moment" }; render(); scrollToStage(); }
    else if (wd) { state = { kind: "world", id: wd.dataset.world, view: "", when: "now" }; render(); scrollToStage(); }
    else if (st) { state = { kind: "story", id: st.dataset.story, view: "", when: "now" }; render(); scrollToStage(); }
    else if (vw) { state.view = vw.dataset.view; render(); }
    else if (wh) { state.when = wh.dataset.when; render(); }
  });
  const scrollToStage = () => { if (matchMedia("(max-width: 959px)").matches) $(".ey-stage").scrollIntoView({ behavior: "smooth", block: "start" }); };

  const syncPickOpt = () => { const c = $("#eyCraftOpt"); if (c) c.checked = eyesViewPref() === "craft"; };
  $("#eyOpts").addEventListener("change", e => {
    if (e.target.id === "eyCraftOpt") { setEyesViewPref(e.target.checked ? "craft" : "classic"); render(); return; }
    const q = e.target.dataset.opt; if (!q) return;
    settings[q] = e.target.checked; saveSettings(); render();
  });
  $("#eyReset").addEventListener("click", () => { settings = defaults(); saveSettings(); setEyesViewPref("craft"); buildOptions(); render(); });

  $("#eyFilter").addEventListener("input", e => {
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll("#eyMachines li").forEach(li => { li.hidden = q && !li.dataset.name.includes(q); });
    document.querySelectorAll(".ey-group").forEach(g => { g.hidden = !g.querySelector("li:not([hidden])"); });
  });

  $("#eyDate").addEventListener("submit", e => {
    e.preventDefault();
    const v = $("#eyDateIn").value; if (!v) return;
    state = { kind: "date", id: v, view: "", when: "now", target: "earth" }; render(); scrollToStage();
  });

  // tabs
  const tabs = [...document.querySelectorAll(".ey-tabs [role=tab]")];
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectTab(t));
    t.addEventListener("keydown", e => {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (d) { const n = tabs[(i + d + tabs.length) % tabs.length]; selectTab(n); n.focus(); }
    });
  });
  function selectTab(t) {
    tabs.forEach(x => { const on = x === t; x.setAttribute("aria-selected", String(on)); x.tabIndex = on ? 0 : -1; $("#" + x.getAttribute("aria-controls")).hidden = !on; });
  }

  // mobile menu
  const nt = $(".nav-toggle"), ul = $("#navlist");
  nt?.addEventListener("click", () => { const open = nt.getAttribute("aria-expanded") !== "true"; nt.setAttribute("aria-expanded", String(open)); ul.classList.toggle("open", open); });

  const tabFor = () => selectTab(tabs[{ world: 1, date: 1, story: 2 }[state.kind] || 0]);
  window.addEventListener("hashchange", () => { readHash(); tabFor(); render(); });

  buildMachines(); buildWorlds(); buildStories(); buildOptions();
  readHash(); tabFor();
  render();
})();
