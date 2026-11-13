/* Offline support + "Install app" button. Loaded on every page. */
(() => {
  "use strict";
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then(reg => {
      // Tell the user once everything has been saved for offline use.
      const done = () => { try { if (!localStorage.getItem("goe:offlineReady")) { localStorage.setItem("goe:offlineReady", "1"); note((window.t || ((k, f) => f))("pwa.saved", "Saved for offline use — this site now works without internet.")); } } catch { } };
      if (reg.active && !reg.installing) return;
      const w = reg.installing || reg.waiting;
      if (w) w.addEventListener("statechange", () => { if (w.state === "activated") done(); });
    }).catch(() => { /* offline support is optional */ });
  });

  // Install button: shown in the settings panel (main page) or as a small floating button elsewhere.
  let deferred = null;
  addEventListener("beforeinstallprompt", e => {
    e.preventDefault(); deferred = e;
    const btn = document.getElementById("installBtn") || floating();
    btn.hidden = false;
    btn.onclick = async () => { deferred.prompt(); await deferred.userChoice.catch(() => null); deferred = null; btn.hidden = true; };
  });
  function floating() {
    // Small, dismissible, and only offered once per visit.
    try { if (sessionStorage.getItem("goe:noInstall")) return document.createElement("button"); } catch { }
    const wrap = document.createElement("div"); wrap.className = "install-float";
    wrap.innerHTML = `<button class="btn btn-small" type="button">${(window.t || ((k, f) => f))("pwa.install", "📲 Install app")}</button><button class="install-x" type="button" aria-label="Dismiss">✕</button>`;
    const [b, x] = wrap.querySelectorAll("button");
    const close = () => { wrap.remove(); try { sessionStorage.setItem("goe:noInstall", "1"); } catch { } };
    x.addEventListener("click", close); setTimeout(close, 12000);
    document.body.appendChild(wrap); return b;
  }
  function note(text) {
    const t = document.createElement("div");
    t.className = "pwa-note"; t.setAttribute("role", "status"); t.textContent = text;
    document.body.appendChild(t); setTimeout(() => t.remove(), 5000);
  }
})();
