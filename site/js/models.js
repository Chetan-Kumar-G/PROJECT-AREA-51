/* ===========================================================
   Shared 3D model viewer (NASA 3D Resources GLB files)
   Uses Google's <model-viewer> web component, loaded only when
   someone first opens a model. Exposes window.openModel(id).
   =========================================================== */
// NASA's own embeddable 3D viewer (the one on NASA's mission pages). IDs found on
// science.nasa.gov mission pages and NASA's solarsystem.nasa.gov / mars.nasa.gov viewers.
const NASA_VIEWER = {
  spirit:      { u: "https://solarsystem.nasa.gov/gltf_embed/2370/", title: "Mars Exploration Rovers" },
  opportunity: { u: "https://solarsystem.nasa.gov/gltf_embed/2370/", title: "Mars Exploration Rovers" },
  insight:     { u: "https://solarsystem.nasa.gov/gltf_embed/2380/", title: "InSight" },
  curiosity:   { u: "https://solarsystem.nasa.gov/gltf_embed/2398/", title: "Curiosity" },
  ingenuity:   { u: "https://mars.nasa.gov/gltf_embed/25043/", title: "Mars Ingenuity Helicopter" },
  voyager1:    { u: "https://solarsystem.nasa.gov/gltf_embed/2340/", title: "Voyager" },
  voyager2:    { u: "https://solarsystem.nasa.gov/gltf_embed/2340/", title: "Voyager" },
  cassini:     { u: "https://solarsystem.nasa.gov/gltf_embed/2401/", title: "Cassini" },
  newhorizons: { u: "https://solarsystem.nasa.gov/gltf_embed/2363/", title: "New Horizons" },
  spitzer:     { u: "https://solarsystem.nasa.gov/gltf_embed/2353/", title: "Spitzer Space Telescope" }
};
(() => {
  "use strict";
  // Which viewer to use: NASA's (default) or this site's classic one. Remembered per browser.
  const PREF = "goe-model-viewer";
  const pref = () => { try { return localStorage.getItem(PREF) === "classic" ? "classic" : "nasa"; } catch { return "nasa"; } };
  const setPref = v => { try { if (v === "nasa") localStorage.removeItem(PREF); else localStorage.setItem(PREF, v); } catch { /* private mode */ } };
  let currentId = null;
  const LIB = "https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js";
  let libPromise = null, modal = null, lastFocus = null;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function loadLib() {
    if (customElements.get("model-viewer")) return Promise.resolve();
    if (!libPromise) {
      libPromise = new Promise((res, rej) => {
        const s = document.createElement("script");
        s.type = "module"; s.src = LIB;
        s.onload = () => customElements.whenDefined("model-viewer").then(res);
        s.onerror = () => { libPromise = null; rej(new Error("model-viewer failed to load")); };
        document.head.appendChild(s);
      });
    }
    return libPromise;
  }

  function build() {
    modal = document.createElement("div");
    modal.className = "modal model-modal"; modal.hidden = true;
    modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true"); modal.setAttribute("aria-labelledby", "mmTitle");
    modal.innerHTML = `
      <div class="modal-card model-card">
        <button class="icon-btn close" data-mclose aria-label="Close 3D model">✕</button>
        <p class="eyebrow">NASA 3D model</p>
        <h2 id="mmTitle"></h2>
        <div class="mm-switch" id="mmSwitch" role="group" aria-label="3D viewer">
          <button data-viewer="nasa" aria-pressed="true">NASA's viewer</button>
          <button data-viewer="classic" aria-pressed="false">Classic viewer</button>
        </div>
        <div class="mm-stage" id="mmStage"></div>
        <p class="mm-help" id="mmHelp"></p>
        <p class="mm-note" id="mmNote"></p>
        <p class="mm-credit" id="mmCredit"></p>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener("click", e => {
      if (e.target === modal || e.target.closest("[data-mclose]")) return close();
      const v = e.target.closest("[data-viewer]");
      if (v && currentId) { setPref(v.dataset.viewer); show(currentId); }
    });
    document.addEventListener("keydown", e => {
      if (modal.hidden) return;
      if (e.key === "Escape") { e.stopImmediatePropagation(); close(); }
    }, true);
  }

  function close() {
    modal.hidden = true;
    const mv = modal.querySelector("model-viewer"); if (mv) mv.remove(); // free GPU memory
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  function openModel(id) {
    if (!window.hasModel(id)) return;
    if (!modal) build();
    lastFocus = document.activeElement;
    modal.hidden = false;
    modal.querySelector("[data-mclose]").focus();
    show(id);
    try { localStorage.setItem("goe:model", "true"); } catch { /* ignore */ }
    document.dispatchEvent(new CustomEvent("goe:model-opened", { detail: { id } }));
  }

  // Draw the model in the chosen viewer, falling back to whichever viewer has this model.
  async function show(id) {
    currentId = id;
    const token = (show.token = (show.token || 0) + 1);
    const local = (typeof MODELS !== "undefined") && MODELS[id], nasa = NASA_VIEWER[id];
    const a = (typeof ARTIFACTS !== "undefined") && ARTIFACTS.find(x => x.id === id);
    const useNasa = !!nasa && (pref() === "nasa" || !local);
    const sw = modal.querySelector("#mmSwitch");
    sw.hidden = !(nasa && local);
    sw.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String((b.dataset.viewer === "nasa") === useNasa)));
    const old = modal.querySelector("model-viewer"); if (old) old.remove();
    const stage = modal.querySelector("#mmStage");
    const title = useNasa ? nasa.title : local.title;
    modal.querySelector("#mmTitle").textContent = a ? `${a.name} — ${title}` : title;
    const note = modal.querySelector("#mmNote");
    note.textContent = !useNasa && local ? local.note : "";
    note.hidden = !note.textContent;
    if (useNasa) {
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches || document.body.classList.contains("reduce-motion");
      stage.innerHTML = `<iframe class="mm-nasa" src="${esc(nasa.u)}?rotate=${!reduce}&amp;cc=true&amp;fs=true" title="NASA 3D model of ${esc(nasa.title)}" allow="fullscreen; xr-spatial-tracking" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
      modal.querySelector("#mmHelp").innerHTML = local ? `Drag to turn it · scroll or pinch to zoom · for “View in your space” (AR), switch to the <b>Classic viewer</b>.` : `Drag to turn it · scroll or pinch to zoom.`;
      modal.querySelector("#mmCredit").innerHTML = `Viewer and model: <a href="${esc(nasa.u)}" target="_blank" rel="noopener">NASA</a> (needs an internet connection). NASA does not endorse this project.`;
      return;
    }
    const m = local;
    modal.querySelector("#mmHelp").innerHTML = `Drag to turn it · scroll or pinch to zoom · on a phone, tap <b>View in your space</b> to place it in your room (AR).`;
    modal.querySelector("#mmCredit").innerHTML = `Model: <a href="https://github.com/nasa/NASA-3D-Resources" target="_blank" rel="noopener">NASA 3D Resources</a> (public domain). Shapes are simplified; not to scale with other models.`;
    stage.innerHTML = `<div class="mm-loading">Loading 3D model…</div>`;
    try { await loadLib(); }
    catch {
      if (token !== show.token) return;
      stage.innerHTML = `<div class="mm-loading">The 3D viewer couldn't load (it needs an internet connection). <a href="assets/models/${esc(m.file)}" download>Download the model file</a> instead.</div>`;
      return;
    }
    if (token !== show.token || modal.hidden) return; // switched viewer or closed while loading
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches || document.body.classList.contains("reduce-motion");
    stage.innerHTML = `
      <model-viewer src="assets/models/${esc(m.file)}" alt="3D model of ${esc(m.title)}"
        camera-controls touch-action="pan-y" ${reduce ? "" : "auto-rotate auto-rotate-delay=\"800\" rotation-per-second=\"18deg\""}
        ar ar-modes="webxr scene-viewer quick-look" shadow-intensity="0.8" exposure="1.05" environment-image="neutral" interaction-prompt="auto">
        <button slot="ar-button" class="btn btn-primary btn-small mm-ar">📱 View in your space</button>
        <div slot="progress-bar" class="mm-progress"><i></i></div>
      </model-viewer>`;
    const mv = stage.querySelector("model-viewer"), bar = stage.querySelector(".mm-progress i");
    mv.addEventListener("progress", e => { bar.style.width = (e.detail.totalProgress * 100) + "%"; if (e.detail.totalProgress >= 1) bar.parentElement.style.opacity = 0; });
    mv.addEventListener("error", () => { stage.innerHTML = `<div class="mm-loading">Sorry — this model couldn't be displayed on this device.</div>`; });
  }

  window.openModel = openModel;
  window.hasModel = id => !!NASA_VIEWER[id] || (typeof MODELS !== "undefined" && !!MODELS[id]);
})();
