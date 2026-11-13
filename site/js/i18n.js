/* ===========================================================
   Language support: English (default), Spanish, Hindi.
   English lives in the pages and data.js. js/i18n/<lang>.js (built by
   scripts/build-i18n.mjs from i18n/<lang>/*.json) sets window.I18N with
   translations. Load order on a page: [head lang script] → data.js →
   records.js → i18n/<lang>.js (if any) → this file → app.js.
   =========================================================== */
(() => {
  const L = window.GOE_LANG || "en";
  const D = window.I18N && window.I18N.lang === L ? window.I18N : null;
  // t("key", "English text"): the translation if there is one, else the English.
  window.t = (key, fallback) => (D && D.ui && D.ui[key] != null ? D.ui[key] : fallback);
  window.I18n = { lang: L, active: !!D, speech: { en: "en-US", es: "es-ES", hi: "hi-IN" }[L] || "en-US" };
  if (!D) return;

  // ---- data: swap in translated labels and stories; keep the English under a._en ----
  if (D.status) for (const [k, v] of Object.entries(D.status)) if (STATUS[k]) Object.assign(STATUS[k], v);
  if (D.types) Object.assign(TYPES, D.types);
  if (D.typesPlural && typeof TYPES_PLURAL !== "undefined") Object.assign(TYPES_PLURAL, D.typesPlural);
  if (D.worlds) for (const [k, v] of Object.entries(D.worlds)) if (WORLDS[k]) Object.assign(WORLDS[k], v);
  if (D.chapters && typeof CHAPTERS !== "undefined") CHAPTERS.forEach(c => Object.assign(c, D.chapters[c.id] || {}));
  if (D.m) ARTIFACTS.forEach(a => {
    const m = D.m[a.id];
    if (!m) return;
    a._en = {};
    for (const f of ["story", "ghost", "epitaph", "fun", "quiz", "place", "fixedPlace", "planned", "actual"]) if (m[f]) { a._en[f] = a[f]; a[f] = m[f]; }
    if (m.discoveries) { a._en.discoveries = a.discoveries; a.discoveries = m.discoveries; }
  });

  // "Opportunity, up close" (js/oppy-data.js)
  if (D.oppy && typeof OPPY !== "undefined") {
    (D.oppy.moments || []).forEach((m, k) => { if (OPPY.moments[k]) Object.assign(OPPY.moments[k], m); });
    (D.oppy.stops || []).forEach((n, k) => { if (OPPY.stops[k]) OPPY.stops[k].name = n; });
    OPPY.parts.forEach(p => Object.assign(p, (D.oppy.parts || {})[p.id] || {}));
  }

  // ---- static page text: elements marked data-i / data-i-ph / data-i-al ----
  const apply = () => {
    document.querySelectorAll("[data-i]").forEach(el => { const v = D.ui[el.dataset.i]; if (v != null) el.innerHTML = v; });
    document.querySelectorAll("[data-i-ph]").forEach(el => { const v = D.ui[el.dataset.iPh]; if (v != null) el.placeholder = v; });
    document.querySelectorAll("[data-i-al]").forEach(el => { const v = D.ui[el.dataset.iAl]; if (v != null) el.setAttribute("aria-label", v); });
    if (D.ui["page.title"]) document.title = D.ui["page.title"];
    const md = document.querySelector('meta[name="description"]');
    if (md && D.ui["page.desc"]) md.content = D.ui["page.desc"];
  };
  apply();
  if (D.ui["d.ghostLabel"]) document.documentElement.style.setProperty("--ghost-label", JSON.stringify(D.ui["d.ghostLabel"]));
})();

/* Language switcher links keep the current page and add ?lang=. */
(() => {
  const L = (window.I18n && window.I18n.lang) || "en";
  document.querySelectorAll(".lang-switch a[data-lang]").forEach(a => {
    const u = new URL(location.href);
    u.searchParams.set("lang", a.dataset.lang);
    a.href = u.pathname.split("/").pop() + u.search + u.hash;
    if (a.dataset.lang === L) a.setAttribute("aria-current", "true");
  });
})();
