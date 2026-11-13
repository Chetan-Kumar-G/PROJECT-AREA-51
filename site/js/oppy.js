/* ===========================================================
   "Opportunity, up close": her life in 14 moments (with an odometer and her
   memories), and an X-ray view of the rover's parts. Data: js/oppy-data.js.
   Separate from the "How it worked" animations (js/explainers.js).
   =========================================================== */
(() => {
  "use strict";
  if (typeof OPPY === "undefined" || !document.getElementById("upclose")) return;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const t = window.t || ((k, f) => f);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.body.classList.contains("reduce-motion");
  const M = OPPY.moments, MAX = 45.16;
  const num = n => n.toLocaleString(document.documentElement.lang || "en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ---------- tabs ---------- */
  const tabs = [$("#oppyTabLife"), $("#oppyTabBody")], panels = [$("#oppyLife"), $("#oppyBody")];
  const show = k => { tabs.forEach((b, i) => { b.setAttribute("aria-selected", i === k); b.tabIndex = i === k ? 0 : -1; panels[i].hidden = i !== k; }); stopSpeech(); };
  tabs.forEach((b, i) => {
    b.addEventListener("click", () => show(i));
    b.addEventListener("keydown", e => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { const n = (i + 1) % 2; show(n); tabs[n].focus(); } });
  });

  /* ---------- read aloud (in the page's language) ---------- */
  let speakBtn = null;
  function stopSpeech() { try { speechSynthesis.cancel(); } catch { } if (speakBtn) speakBtn.setAttribute("aria-pressed", "false"); speakBtn = null; }
  function speak(btn, text) {
    if (!("speechSynthesis" in window)) return;
    if (speakBtn === btn) return stopSpeech();
    stopSpeech();
    const u = new SpeechSynthesisUtterance(text), lang = (window.I18n && I18n.lang) || "en";
    u.lang = (window.I18n && I18n.speech) || "en-US"; u.rate = .92;
    const v = speechSynthesis.getVoices().find(x => new RegExp("^" + lang + "(-|_|$)", "i").test(x.lang)); if (v) u.voice = v;
    u.onend = u.onerror = () => { if (speakBtn === btn) stopSpeech(); };
    speechSynthesis.speak(u); speakBtn = btn; btn.setAttribute("aria-pressed", "true");
  }

  /* ---------- her life ---------- */
  $("#oppyLife").innerHTML = `
    <div class="oppy-steps" role="group" aria-label="${esc(t("oppy.moments", "Moments in her life"))}">
      ${M.map((m, k) => `<button type="button" data-k="${k}" aria-label="${m.year}: ${esc(m.title)}"><i></i><span>${m.year}</span></button>`).join("")}
    </div>
    <div class="oppy-card">
      <div class="oppy-text" aria-live="polite">
        <p class="eyebrow" id="oppyDate"></p>
        <h3 id="oppyH"></h3>
        <p id="oppyP"></p>
        <blockquote class="oppy-mem"><span class="oppy-mem-l">${esc(t("oppy.remembers", "Opportunity remembers"))}</span><span id="oppyMem"></span></blockquote>
        <div class="oppy-btns">
          <button class="icon-btn" id="oppyPrev" type="button" aria-label="${esc(t("oppy.prev", "Previous moment"))}">←</button>
          <span class="oppy-count" id="oppyCount"></span>
          <button class="icon-btn" id="oppyNext" type="button" aria-label="${esc(t("oppy.next", "Next moment"))}">→</button>
          <button class="btn btn-small speak" id="oppySpeak" type="button" aria-pressed="false"><span aria-hidden="true">🔊</span> ${esc(t("readAloud", "Read aloud"))}</button>
        </div>
      </div>
      <div class="oppy-odo">
        <p class="odo-num"><b id="oppyKm">0.00</b> km <small>${esc(t("oppy.driven", "driven on Mars so far"))}</small></p>
        <div class="odo-track" aria-hidden="true">
          <div class="odo-fill" id="oppyFill"></div>
          <span class="odo-rover" id="oppyRover">🚙</span>
          ${OPPY.stops.map((s, k) => `<span class="odo-stop ${k % 2 ? "low" : ""} ${k === OPPY.stops.length - 1 ? "end" : ""}" style="left:${(s.km / MAX * 100).toFixed(2)}%"><i></i><em>${esc(s.name)}</em></span>`).join("")}
        </div>
        <p class="odo-note">${esc(t("oppy.planned", "Her mission plan: 90 sols and about 600 m of driving. What she did: 5,111 sols and 45.16 km."))}</p>
      </div>
    </div>`;
  let cur = -1, kmShown = 0, raf = 0;
  function animateKm(to) {
    cancelAnimationFrame(raf);
    const from = kmShown, start = performance.now(), dur = still() ? 0 : 700;
    const step = now => {
      const p = dur ? Math.min(1, (now - start) / dur) : 1, v = from + (to - from) * (1 - Math.pow(1 - p, 3));
      kmShown = v; $("#oppyKm").textContent = num(v);
      const pct = v / MAX * 100; $("#oppyFill").style.width = pct + "%"; $("#oppyRover").style.left = pct + "%";
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  function go(k) {
    k = Math.max(0, Math.min(M.length - 1, k));
    if (k === cur) return;
    cur = k; stopSpeech();
    const m = M[k];
    $("#oppyDate").textContent = m.date;
    $("#oppyH").textContent = m.title;
    $("#oppyP").textContent = m.text;
    $("#oppyMem").textContent = "“" + m.memory + "”";
    $("#oppyCount").textContent = t("xOfY", "{x} of {y}").replace("{x}", k + 1).replace("{y}", M.length);
    $$(".oppy-steps button").forEach((b, i) => { b.classList.toggle("done", i < k); b.setAttribute("aria-current", i === k ? "step" : "false"); });
    $("#oppyPrev").disabled = k === 0; $("#oppyNext").disabled = k === M.length - 1;
    $(".oppy-card").classList.toggle("silent", k >= M.length - 2);
    animateKm(m.km);
  }
  $$(".oppy-steps button").forEach(b => b.addEventListener("click", () => go(+b.dataset.k)));
  $("#oppyPrev").addEventListener("click", () => go(cur - 1));
  $("#oppyNext").addEventListener("click", () => go(cur + 1));
  $("#oppySpeak").addEventListener("click", e => speak(e.currentTarget, `${M[cur].title}. ${M[cur].text} ${M[cur].memory}`));
  $("#oppyLife").addEventListener("keydown", e => { if (e.target.closest("input, textarea")) return; if (e.key === "ArrowRight") go(cur + 1); if (e.key === "ArrowLeft") go(cur - 1); });
  go(0);

  /* ---------- inside the rover ---------- */
  // Side view, facing right. Outer parts are drawn plainly; parts in .insides appear only with the X-ray goggles on.
  const ROVER = `
    <svg class="rover-svg" viewBox="0 0 800 420" role="img" aria-label="${esc(t("oppy.drawing", "Drawing of the Opportunity rover seen from the side, with numbered parts"))}">
      <defs>
        <linearGradient id="oppyGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9c46a"/><stop offset="1" stop-color="#a87b2c"/></linearGradient>
        <radialGradient id="oppyGlow"><stop offset="0" stop-color="#ffd27a" stop-opacity=".9"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
      </defs>
      <path class="r-ground" d="M10 388 Q200 380 400 388 T790 386"/>
      <g class="r-struts"><path d="M230 352 L300 302 L400 352 M300 302 L330 300 M570 352 L520 304 L470 300"/></g>
      <g class="r-wheels">
        ${[230, 400, 570].map(x => `<circle cx="${x}" cy="352" r="34"/><circle class="r-hub" cx="${x}" cy="352" r="9"/>${[0, 45, 90, 135].map(a => `<line x1="${x}" y1="352" x2="${(x + 34 * Math.cos(a * Math.PI / 90)).toFixed(1)}" y2="${(352 + 34 * Math.sin(a * Math.PI / 90)).toFixed(1)}"/>`).join("")}`).join("")}
      </g>
      <rect class="r-body" x="250" y="228" width="300" height="72" rx="6"/>
      <g class="insides">
        <circle cx="430" cy="264" r="120" fill="url(#oppyGlow)" opacity=".35"/>
        <rect class="r-in" x="331" y="270" width="58" height="24" rx="3"/><text x="360" y="286">Li-ion</text>
        <rect class="r-in" x="458" y="238" width="46" height="28" rx="3"/><text x="481" y="256">CPU</text>
        <rect class="r-in" x="386" y="238" width="28" height="22" rx="3"/>
        <rect class="r-in" x="296" y="238" width="48" height="20" rx="3"/>
        <circle class="r-rhu" cx="518" cy="270"  r="5"/><circle class="r-rhu" cx="532" cy="284" r="5"/><circle class="r-rhu" cx="540" cy="266" r="5"/><circle class="r-rhu" cx="524" cy="290" r="5"/>
        <path class="r-wire" d="M360 270 V262 H458 M481 266 V284 H518 M400 260 V276 H389"/>
      </g>
      <g class="r-solar"><path d="M140 222 H660 V212 H140 Z"/>${Array.from({ length: 13 }, (_, i) => `<line x1="${180 + i * 37}" y1="212" x2="${180 + i * 37}" y2="222"/>`).join("")}</g>
      <rect class="r-mast" x="331" y="96" width="9" height="116"/>
      <g class="r-head"><rect x="306" y="62" width="62" height="26" rx="5"/><circle cx="322" cy="75" r="6"/><circle cx="352" cy="75" r="6"/></g>
      <g class="r-hga"><line x1="476" y1="212" x2="476" y2="196"/><ellipse cx="476" cy="190" rx="30" ry="9" transform="rotate(-22 476 190)"/></g>
      <g class="r-rods"><line x1="578" y1="212" x2="578" y2="146"/><line x1="600" y1="212" x2="600" y2="180"/></g>
      <path class="r-arm" d="M552 286 L624 268 L688 302"/>
      <g class="r-turret"><circle cx="700" cy="316" r="14"/><rect x="694" y="328" width="12" height="16" rx="2"/></g>
      <rect class="r-hazcam" x="552" y="288" width="20" height="10" rx="2"/>
    </svg>`;
  const P = OPPY.parts;
  $("#oppyBody").innerHTML = `
    <div class="oppy-xbar">
      <label class="xray-switch"><input type="checkbox" id="oppyXray"><span class="track" aria-hidden="true"></span><b>🥽 ${esc(t("oppy.xray", "X-ray goggles"))}</b></label>
      <p id="oppyXhint">${esc(t("oppy.hintOut", "Tap a number to learn about a part. Put on the X-ray goggles to see inside her body."))}</p>
    </div>
    <div class="oppy-rover">
      <div class="rover-wrap" id="roverWrap">${ROVER}
        ${P.map((p, k) => `<button type="button" class="hot ${p.inside ? "in" : "out"}" data-p="${k}" style="left:${(p.x / 8).toFixed(2)}%;top:${(p.y / 4.2).toFixed(2)}%" aria-label="${k + 1}. ${esc(p.name)}"><span>${k + 1}</span></button>`).join("")}
      </div>
      <div class="part-card" id="partCard" aria-live="polite"></div>
    </div>
    <ol class="part-list" id="partList">${P.map((p, k) => `<li class="${p.inside ? "in" : "out"}"><button type="button" data-p="${k}"><span>${k + 1}</span>${esc(p.name)}${p.inside ? ` <small>${esc(t("oppy.insideTag", "inside"))}</small>` : ""}</button></li>`).join("")}</ol>`;
  let sel = 0;
  function pick(k) {
    sel = k;
    const p = P[k];
    $("#partCard").innerHTML = `<p class="eyebrow">${p.inside ? esc(t("oppy.inside", "Inside her body")) : esc(t("oppy.outside", "On the outside"))}</p><h3><span class="pc-n">${k + 1}</span>${esc(p.name)}</h3><p>${esc(p.text)}</p>`;
    $$("#oppyBody [data-p]").forEach(b => b.setAttribute("aria-pressed", +b.dataset.p === k));
    if (p.inside !== $("#oppyXray").checked) setXray(p.inside, false);
  }
  function setXray(on, pickFirst = true) {
    $("#oppyXray").checked = on;
    $("#roverWrap").classList.toggle("xray", on);
    $("#partList").classList.toggle("xray", on);
    $("#oppyXhint").textContent = on ? t("oppy.hintIn", "Blue lines show her outer shell. The glowing parts are hidden inside her body.") : t("oppy.hintOut", "Tap a number to learn about a part. Put on the X-ray goggles to see inside her body.");
    if (pickFirst) pick(P.findIndex(p => p.inside === on));
  }
  $$("#oppyBody [data-p]").forEach(b => b.addEventListener("click", () => pick(+b.dataset.p)));
  $("#oppyXray").addEventListener("change", e => setXray(e.target.checked));
  pick(0);
})();
