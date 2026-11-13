/* ===========================================================
   "The last goodbye": Opportunity's story in six scenes.
   A small scene player: photos cross-fade behind the words, a bar at the
   top shows progress, and it plays by itself once it scrolls into view
   (never with "Reduce motion" on). Speed comes from GOESpeed (1×, 2×, 3×).
   Every fact here is also in the Opportunity dossier (js/data.js).
   Translations: i18n/<lang>/story.json.
   =========================================================== */
(() => {
  "use strict";
  const stage = document.getElementById("storyStage");
  if (!stage) return;
  const t = window.t || ((k, f) => f);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const IMG = "assets/nasa/";
  const SCENES = [
    { img: IMG + "PIA22222.jpg", id: "PIA22222", pos: "50% 30%",
      k: "25 January 2004 · Sol 1", h: "Built for ninety days.",
      b: "Opportunity bounced onto Mars wrapped in airbags and rolled to a stop inside a small crater. Her plan was short: 90 Martian days and about 600 metres of driving. Nobody expected more.",
      c: "Opportunity's self-portrait, taken with her microscope camera in 2018." },
    { img: IMG + "PIA16120.jpg", id: "PIA16120", pos: "50% 60%",
      k: "2004 – 2018", h: "She stayed for fourteen years.",
      b: "She found proof that Mars once had water. She climbed crater rims, slept through freezing winters, and drove 45.16 km: farther than a marathon, on another world. Every morning, Earth called. Every morning, she answered.",
      c: "Her own shadow, stretching towards Endeavour crater." },
    { img: IMG + "PIA22329.jpg", id: "PIA22329", pos: "20% 50%",
      k: "June 2018", h: "Then the sky went dark.",
      b: "A dust storm grew until it wrapped the whole planet. Where Opportunity stood, noon became as dark as night. Her solar panels had no sunlight left to turn into power.",
      c: "How the 2018 dust storm darkened her sky, from a clear day to the storm (simulated views)." },
    { img: IMG + "PIA22329.jpg", id: "PIA22329", pos: "92% 50%", dark: true,
      k: "10 June 2018 · Sol 5,111", h: "Her last message.",
      b: "It was only numbers: very little power, and a very dark sky. A journalist later turned those numbers into words the whole world remembers: “My battery is low and it's getting dark.” She never said it. But it was true.",
      c: "The darkest view of her sky during the storm (simulated)." },
    { img: "assets/maps/stars.jpg", id: "", pos: "50% 50%",
      k: "June 2018 – February 2019", h: "They kept calling.",
      b: "For eight months, her team on Earth sent more than a thousand commands asking her to wake up. With the very last one, they played her a song: “I'll Be Seeing You.” Then they listened. Mars stayed quiet.",
      c: "" },
    { img: IMG + "PIA22908.jpg", id: "PIA22908", pan: true,
      k: "13 February 2019", h: "Mission complete.",
      b: "NASA said goodbye. Opportunity is still there, parked in Perseverance Valley, looking out over the plains she crossed. Abandoned, but not forgotten.",
      c: "The ‘Legacy’ panorama: among the last pictures she ever took.", end: true }
  ].map((s, n) => ({ ...s, k: t(`story.${n + 1}.k`, s.k), h: t(`story.${n + 1}.h`, s.h), b: t(`story.${n + 1}.b`, s.b), c: s.c && t(`story.${n + 1}.c`, s.c) }));
  const N = SCENES.length;
  const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.body.classList.contains("reduce-motion");

  stage.innerHTML = `
    <div class="st-frames" aria-hidden="true">${SCENES.map((s, n) => `<img ${n ? 'loading="lazy"' : ""} decoding="async" src="${s.img}" alt="" class="${s.pan ? "pan" : ""}" style="${s.pan ? "" : "object-position:" + s.pos}">`).join("")}</div>
    <div class="st-shade" aria-hidden="true"></div>
    <div class="st-prog" role="group" aria-label="${esc(t("story.scenes", "Scenes"))}">${SCENES.map((s, n) => `<button type="button" data-n="${n}" aria-label="${n + 1}: ${esc(s.h)}"><span><i></i></span></button>`).join("")}</div>
    <div class="st-text" aria-live="polite"></div>
    <div class="st-bar">
      <button class="st-btn" type="button" data-a="prev" aria-label="${esc(t("story.prev", "Previous scene"))}">←</button>
      <button class="st-btn st-play" type="button" data-a="play" aria-label="${esc(t("story.play", "Play"))}">▶</button>
      <button class="st-btn" type="button" data-a="next" aria-label="${esc(t("story.next", "Next scene"))}">→</button>
      <span class="st-count"></span>
      ${window.GOESpeed ? GOESpeed.html() : ""}
      <p class="st-credit"></p>
    </div>`;
  const $ = s => stage.querySelector(s);
  const frames = [...stage.querySelectorAll(".st-frames img")], segs = [...stage.querySelectorAll(".st-prog button")];
  const text = $(".st-text"), playBtn = $(".st-play"), prevBtn = $('[data-a="prev"]'), nextBtn = $('[data-a="next"]');
  let cur = -1, playing = false, anim = null, started = false;
  const speed = () => (window.GOESpeed ? GOESpeed.get() : 1);

  function stopBar() { if (anim) { anim.onfinish = null; anim.cancel(); anim = null; } }
  function runBar() {
    stopBar();
    const s = SCENES[cur], ms = Math.max(6500, (s.h.length + s.b.length) * 62); // reading time at 1×
    anim = segs[cur].querySelector("i").animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: ms, fill: "forwards" });
    anim.playbackRate = speed();
    anim.onfinish = () => { if (cur < N - 1) show(cur + 1); else { segs[cur].classList.add("done"); stopBar(); setPlaying(false); } };
  }
  function setPlaying(p) {
    playing = p;
    playBtn.textContent = p ? "⏸" : "▶";
    playBtn.setAttribute("aria-label", p ? t("story.pause", "Pause") : t("story.play", "Play"));
    if (p) { if (anim) anim.play(); else runBar(); } else if (anim) anim.pause();
  }
  function show(n) {
    cur = Math.max(0, Math.min(N - 1, n));
    const s = SCENES[cur];
    frames.forEach((f, k) => f.classList.toggle("on", k === cur));
    segs.forEach((b, k) => { b.classList.toggle("done", k < cur); b.setAttribute("aria-current", k === cur ? "step" : "false"); });
    stage.classList.toggle("dark", !!s.dark);
    text.classList.remove("swap"); void text.offsetWidth; text.classList.add("swap");
    text.innerHTML = `<p class="st-kick">${esc(s.k)}</p><h3>${esc(s.h)}</h3><p class="st-body">${esc(s.b)}</p>` + (s.end ? `
      <div class="st-end">
        <button class="btn btn-primary" type="button" data-a="dossier">${esc(t("story.dossier", "Open her dossier"))}</button>
        <a class="btn" href="#logs">${esc(t("story.logs", "Hear the other ghosts"))} →</a>
      </div>` : "");
    $(".st-count").textContent = `${cur + 1} / ${N}`;
    $(".st-credit").textContent = s.c ? `${s.c}${s.id ? " NASA · " + s.id : ""}` : "";
    prevBtn.disabled = cur === 0; nextBtn.disabled = cur === N - 1;
    stopBar();
    if (playing) runBar();
  }

  stage.addEventListener("click", e => {
    const seg = e.target.closest(".st-prog button");
    if (seg) { started = true; setPlaying(false); return show(+seg.dataset.n); }
    const b = e.target.closest("[data-a]"); if (!b) return;
    started = true;
    const a = b.dataset.a;
    if (a === "play") { if (!playing && cur === N - 1 && !anim) show(0); return setPlaying(!playing); }
    if (a === "prev") { setPlaying(false); return show(cur - 1); }
    if (a === "next") { setPlaying(false); return show(cur + 1); }
    if (a === "dossier" && window.GOE) GOE.openDossier("opportunity", b);
  });
  stage.addEventListener("keydown", e => {
    if (e.key === "ArrowRight" && cur < N - 1) { started = true; setPlaying(false); show(cur + 1); }
    if (e.key === "ArrowLeft" && cur > 0) { started = true; setPlaying(false); show(cur - 1); }
  });
  if (window.GOESpeed) GOESpeed.on(v => { if (anim) anim.playbackRate = v; });

  show(0);
  // Start by itself the first time it is properly on screen; always pause when it leaves.
  if ("IntersectionObserver" in window) new IntersectionObserver(en => en.forEach(x => {
    if (x.isIntersecting && !started && !still()) { started = true; setPlaying(true); }
    else if (!x.isIntersecting && playing) setPlaying(false);
  }), { threshold: .55 }).observe(stage);
})();
