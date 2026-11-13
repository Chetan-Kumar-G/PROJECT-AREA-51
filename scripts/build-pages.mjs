// Builds the crawlable, search-friendly pages: one static page per machine in English, Spanish and Hindi
// (site/machines/<id>[.es|.hi].html), machine index pages, sitemap.xml, robots.txt, and the home page's
// structured data. Run after build-i18n:  node scripts/build-i18n.mjs && node scripts/build-pages.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(root, "site");
const BASE = "https://chetan-kumar-g.github.io/PROJECT-AREA-51/";
const TODAY = new Date().toISOString().slice(0, 10);

// ---- load data, records and translations ----
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(SITE, "js/data.js"), "utf8") + ";this.__d = { ARTIFACTS, STATUS, TYPES, WORLDS };", ctx);
if (existsSync(join(SITE, "js/records.js"))) vm.runInContext(readFileSync(join(SITE, "js/records.js"), "utf8") + ";this.__r = { RECORDS, SOURCE_LIST };", ctx);
const { ARTIFACTS, STATUS, TYPES, WORLDS } = ctx.__d;
const { RECORDS = {}, SOURCE_LIST = {} } = ctx.__r || {};
const T = { en: null };
for (const l of ["es", "hi"]) {
  const c = { window: {} }; vm.createContext(c);
  vm.runInContext(readFileSync(join(SITE, `js/i18n/${l}.js`), "utf8"), c);
  T[l] = c.window.I18N;
}
const LANGS = ["en", "es", "hi"];
const LOCALE = { en: "en_US", es: "es_ES", hi: "hi_IN" };
const LABEL = { en: "English", es: "Español", hi: "हिंदी" };

// page words (the machine pages have their own short vocabulary)
const W = {
  en: { site: "Ghosts of Exploration", tagline: "Abandoned but not Forgotten", home: "Home", all: "All 49 machines", epitaph: "Epitaph", notEpitaph: "Not an epitaph yet",
        story: "The story", ghost: "Ghost log (in its own voice)", science: "The science story", disc: "What it discovered", matters: "Why it matters today", fun: "Fun fact",
        dates: "Mission dates", launched: "Launched", arrived: "Arrived", last: "Last word / status", onboard: "What was on board", orbit: "See it from orbit",
        sources: "Sources", open: "Open the interactive dossier", see3d: "See it in 3D", ask: "Ask about it", prev: "Previous", next: "Next", photo: "Photo",
        allIntro: "Every machine in the Ghosts of Exploration archive: the rovers, landers, Moon cars and probes NASA left on the Moon, on Mars and across the solar system, each with its story.",
        allTitle: "All 49 machines NASA left behind", machines: "machines", noteEn: "", made: "Made for the NASA Space Apps Challenge 2026. Photos: NASA Image and Video Library." },
  es: { site: "Fantasmas de la Exploración", tagline: "Abandonados, pero no olvidados", home: "Inicio", all: "Las 49 máquinas", epitaph: "Epitafio", notEpitaph: "Aún no es un epitafio",
        story: "La historia", ghost: "Diario fantasma (con su propia voz)", science: "", disc: "", matters: "", fun: "Dato curioso",
        dates: "Fechas de la misión", launched: "Lanzamiento", arrived: "Llegada", last: "Última señal / estado", onboard: "", orbit: "Míralo desde la órbita",
        sources: "Fuentes (en inglés)", open: "Abrir el expediente interactivo", see3d: "Verlo en 3D", ask: "Preguntar sobre esta máquina", prev: "Anterior", next: "Siguiente", photo: "Foto",
        allIntro: "Todas las máquinas del archivo Fantasmas de la Exploración: los róveres, módulos de aterrizaje, autos lunares y sondas que la NASA dejó en la Luna, en Marte y en todo el sistema solar, cada una con su historia.",
        allTitle: "Las 49 máquinas que la NASA dejó atrás", machines: "máquinas", noteEn: "Las fechas y algunos detalles técnicos se muestran en inglés.", made: "Hecho para el NASA Space Apps Challenge 2026. Fotos: Biblioteca de Imágenes y Videos de la NASA." },
  hi: { site: "अन्वेषण के भूत", tagline: "छोड़े गए, पर भुलाए नहीं गए", home: "मुख्य पेज", all: "सभी 49 मशीनें", epitaph: "समाधि-लेख", notEpitaph: "अभी समाधि-लेख नहीं",
        story: "कहानी", ghost: "भूत-डायरी (उसकी अपनी आवाज़ में)", science: "", disc: "", matters: "", fun: "मज़ेदार तथ्य",
        dates: "मिशन की तारीख़ें", launched: "प्रक्षेपण", arrived: "पहुँचा", last: "आख़िरी संदेश / स्थिति", onboard: "", orbit: "कक्षा से देखें",
        sources: "स्रोत (अंग्रेज़ी में)", open: "इंटरैक्टिव फ़ाइल खोलें", see3d: "3D में देखें", ask: "इसके बारे में पूछें", prev: "पिछली", next: "अगली", photo: "तस्वीर",
        allIntro: "अन्वेषण के भूत संग्रह की हर मशीन: वे रोवर, लैंडर, चाँद की गाड़ियाँ और यान जिन्हें नासा ने चाँद, मंगल और पूरे सौरमंडल में छोड़ा, हर एक अपनी कहानी के साथ।",
        allTitle: "नासा द्वारा पीछे छोड़ी गई सभी 49 मशीनें", machines: "मशीनें", noteEn: "तारीख़ें और कुछ तकनीकी जानकारी अंग्रेज़ी में दिखाई गई है।", made: "NASA Space Apps Challenge 2026 के लिए बनाया गया। तस्वीरें: नासा इमेज और वीडियो लाइब्रेरी।" }
};

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clip = (s, n) => { s = String(s).replace(/\s+/g, " ").trim(); return s.length <= n ? s : s.slice(0, s.lastIndexOf(" ", n - 1)) + "…"; };
const file = (id, l) => `${id}${l === "en" ? "" : "." + l}.html`;
const idx = l => `index${l === "en" ? "" : "." + l}.html`;
const loc = (a, l) => {   // the machine's text in language l
  const m = l === "en" ? null : T[l].m[a.id] || {};
  const pick = f => (m && m[f]) || a[f];
  const st = l === "en" ? STATUS[a.status] : Object.assign({}, STATUS[a.status], T[l].status?.[a.status]);
  const ty = l === "en" ? TYPES[a.type] : (T[l].types?.[a.type] || TYPES[a.type]);
  const wo = l === "en" ? WORLDS[a.world] : Object.assign({}, WORLDS[a.world], T[l].worlds?.[a.world]);
  return { story: pick("story"), ghost: pick("ghost"), epitaph: a.epitaph && pick("epitaph"), fun: pick("fun"), status: st.label, type: ty, world: wo };
};
const ORDER = ["moon", "mars", "deep"];
const LIST = ORDER.flatMap(w => ARTIFACTS.filter(a => a.world === w).sort((x, y) => x.year - y.year));

const head = ({ l, title, desc, path, alt, img, imgAlt, ld, type = "article" }) => `<!doctype html>
<html lang="${l}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="${BASE}${path}">
${LANGS.map(x => `  <link rel="alternate" hreflang="${x}" href="${BASE}${alt(x)}">`).join("\n")}
  <link rel="alternate" hreflang="x-default" href="${BASE}${alt("en")}">
  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="${esc(W[l].site)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${BASE}${path}">
  <meta property="og:locale" content="${LOCALE[l]}">
${LANGS.filter(x => x !== l).map(x => `  <meta property="og:locale:alternate" content="${LOCALE[x]}">`).join("\n")}
  <meta property="og:image" content="${img}">
  <meta property="og:image:alt" content="${esc(imgAlt)}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Space+Grotesk:wght@500;600;700${l === "hi" ? "&family=Noto+Sans+Devanagari:wght@400;600;700" : ""}&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/style.css">
  <link rel="stylesheet" href="../css/machine.css">
  <link rel="icon" href="../assets/ui/star.png">
  <meta name="theme-color" content="#060a13">
  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
</head>`;

const topbar = (l, alt) => `<body class="mpage">
  <header class="topbar">
    <a class="brand" href="../index.html?lang=${l}" aria-label="${esc(W[l].site)}"><span class="brand-mark" aria-hidden="true"></span><span class="brand-text"><strong>${esc(W[l].site)}</strong><small>${esc(W[l].tagline)}</small></span></a>
    <nav class="lang-switch" aria-label="Language / Idioma / भाषा">${LANGS.map(x => `<a href="${alt(x)}" hreflang="${x}" lang="${x}"${x === l ? ' aria-current="true"' : ""} title="${LABEL[x]}">${x === "hi" ? "हिं" : x.toUpperCase()}</a>`).join("")}</nav>
  </header>`;
const foot = l => `  <footer class="footer mfoot"><div><strong>${esc(W[l].site)}</strong><p>${esc(W[l].made)}</p><p><a href="${idx(l)}">${esc(W[l].all)}</a> · <a href="../sources.html">Sources</a> · <a href="../index.html?lang=${l}">${esc(W[l].home)}</a></p></div></footer>
</body>
</html>
`;

// ---- one page per machine per language ----
const outDir = join(SITE, "machines");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const urls = [];
LIST.forEach((a, i) => {
  const prev = LIST[(i - 1 + LIST.length) % LIST.length], next = LIST[(i + 1) % LIST.length];
  const m0 = a.media[0];
  const img = m0 ? `${BASE}assets/nasa/${m0.f}` : `${BASE}assets/share/og.jpg`;
  const rec = RECORDS[a.id] || {};
  const srcs = (rec.sources || []).map(s => SOURCE_LIST[s]).filter(Boolean);
  for (const l of LANGS) {
    const w = W[l], t = loc(a, l);
    const title = `${a.name}: ${t.epitaph || clip(t.story, 60)} | ${w.site}`;
    const desc = clip(`${t.story} ${t.epitaph ? "“" + t.epitaph + "”" : ""}`, 158);
    const path = `machines/${file(a.id, l)}`;
    const alt = x => file(a.id, x);
    const ld = { "@context": "https://schema.org", "@graph": [
      { "@type": "Article", "headline": `${a.name}: ${t.epitaph || a.mission}`.slice(0, 110), "description": desc, "inLanguage": l, "image": img,
        "url": BASE + path, "mainEntityOfPage": BASE + path, "datePublished": "2026-11-12", "dateModified": TODAY,
        "author": { "@type": "Organization", "name": "Ghosts of Exploration team (NASA Space Apps Challenge 2026)" },
        "publisher": { "@type": "Organization", "name": W.en.site, "url": BASE },
        "isPartOf": { "@type": "WebSite", "name": W.en.site, "url": BASE },
        "about": { "@type": "Thing", "name": a.name, "description": clip(t.story, 200) },
        "audience": { "@type": "EducationalAudience", "educationalRole": "student", "audienceType": "Students aged 8–14" },
        "educationalLevel": "Primary and middle school", "learningResourceType": "Story",
        ...(srcs.length ? { "citation": srcs.slice(0, 8).map(s => ({ "@type": "CreativeWork", "name": s.title, "url": s.url })) } : {}) },
      { "@type": "BreadcrumbList", "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": w.home, "item": `${BASE}?lang=${l}` },
        { "@type": "ListItem", "position": 2, "name": w.all, "item": `${BASE}machines/${idx(l)}` },
        { "@type": "ListItem", "position": 3, "name": a.name, "item": BASE + path }] }] };
    const dates = `<dl class="mdates"><div><dt>${esc(w.launched)}</dt><dd>${esc(a.dates.launch)}</dd></div><div><dt>${esc(w.arrived)}</dt><dd>${esc(a.dates.arrive)}</dd></div><div><dt>${esc(w.last)}</dt><dd>${esc(a.dates.last)}</dd></div></dl>`;
    const html = `${head({ l, title, desc, path, alt, img, imgAlt: m0 ? m0.cap : a.name, ld })}
${topbar(l, alt)}
  <main class="mwrap" id="main">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="../index.html?lang=${l}">${esc(w.home)}</a> › <a href="${idx(l)}">${esc(w.all)}</a> › <span aria-current="page">${esc(a.name)}</span></nav>
    <article>
      <p class="eyebrow">${esc(t.world.name)} · ${esc(t.type)} · ${esc(t.status)} · ${a.year}</p>
      <h1>${esc(a.name)}</h1>
      ${t.epitaph ? `<p class="epitaph"><span class="ep-label">${esc(a.status === "active" ? w.notEpitaph : w.epitaph)}</span><span class="ep-text">“${esc(t.epitaph)}”</span></p>` : ""}
      ${m0 ? `<figure class="mfig"><img src="../assets/nasa/${esc(m0.f)}" alt="${esc(m0.cap)}" loading="eager" decoding="async"><figcaption>${esc(m0.cap)} <a href="https://images.nasa.gov/details/${encodeURIComponent(m0.id)}" rel="noopener">NASA · ${esc(m0.id)}</a></figcaption></figure>` : ""}
      <h2>${esc(w.story)}</h2>
      <p class="mlead">${esc(t.story)}</p>
      <h2>${esc(w.ghost)}</h2>
      <blockquote class="mghost">${esc(t.ghost)}</blockquote>
      ${l === "en" ? `<h2>${esc(w.science)}</h2><p>${esc(a.deep)}</p>
      <h2>${esc(w.disc)}</h2><ul>${a.discoveries.map(d => `<li>${esc(d)}</li>`).join("")}</ul>
      <h2>${esc(w.matters)}</h2><p>${esc(a.legacy)}</p>` : ""}
      <h2>${esc(w.fun)}</h2>
      <p>${esc(t.fun)}</p>
      <h2>${esc(w.dates)}</h2>
      ${dates}
      ${w.noteEn ? `<p class="mnote">${esc(w.noteEn)}</p>` : ""}
      ${l === "en" && rec.onboard ? `<h2>${esc(w.onboard)}</h2>${rec.onboard.map(g => `<h3>${esc(g.name)}</h3>${g.items.length ? `<ul>${g.items.map(it => `<li><b>${esc(it.name)}</b>: ${esc(it.what)}</li>`).join("")}</ul>` : `<p>${esc(g.design)}</p>`}`).join("")}` : ""}
      ${rec.orbit ? `<h2>${esc(w.orbit)}</h2><p>${esc(rec.orbit.cap)}</p><p><a href="${esc(rec.orbit.url)}" rel="noopener">HiRISE ${esc(rec.orbit.img)} ↗</a></p>` : ""}
      ${srcs.length ? `<h2>${esc(w.sources)}</h2><ul class="msrc">${srcs.map(s => `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.title)}</a> <small>${esc(s.org)}</small></li>`).join("")}</ul>` : ""}
      <div class="mcta">
        <a class="btn btn-primary" href="../index.html?lang=${l}#artifact=${a.id}">${esc(w.open)} →</a>
        <a class="btn" href="../explore.html#${a.world}:${a.id}">${esc(w.see3d)}</a>
        <a class="btn" href="../ask.html?lang=${l}&amp;q=${encodeURIComponent(a.name)}">${esc(w.ask)}</a>
      </div>
    </article>
    <nav class="mpn" aria-label="${esc(w.all)}"><a href="${file(prev.id, l)}" rel="prev">← ${esc(w.prev)}: ${esc(prev.name)}</a><a href="${file(next.id, l)}" rel="next">${esc(w.next)}: ${esc(next.name)} →</a></nav>
  </main>
${foot(l)}`;
    writeFileSync(join(outDir, file(a.id, l)), html);
  }
  urls.push({ alts: Object.fromEntries(LANGS.map(x => [x, `machines/${file(a.id, x)}`])), img, title: a.name });
});

// ---- machine index pages ----
for (const l of LANGS) {
  const w = W[l];
  const path = `machines/${idx(l)}`;
  const ld = { "@context": "https://schema.org", "@type": "CollectionPage", "name": w.allTitle, "description": w.allIntro, "inLanguage": l, "url": BASE + path,
    "isPartOf": { "@type": "WebSite", "name": W.en.site, "url": BASE },
    "mainEntity": { "@type": "ItemList", "numberOfItems": LIST.length, "itemListElement": LIST.map((a, i) => ({ "@type": "ListItem", "position": i + 1, "name": a.name, "url": `${BASE}machines/${file(a.id, l)}` })) } };
  const groups = ORDER.map(wd => {
    const list = LIST.filter(a => a.world === wd);
    const wn = l === "en" ? WORLDS[wd].name : (T[l].worlds?.[wd]?.name || WORLDS[wd].name);
    return `<section><h2>${esc(wn)} <small>${list.length} ${esc(w.machines)}</small></h2><ul class="mlist">${list.map(a => {
      const t = loc(a, l);
      return `<li><a href="${file(a.id, l)}">${a.media[0] ? `<img src="../assets/nasa/${esc(a.media[0].f)}" alt="" loading="lazy" decoding="async">` : ""}<span><b>${esc(a.name)}</b><small>${a.year} · ${esc(t.status)}</small>${t.epitaph ? `<i>“${esc(t.epitaph)}”</i>` : ""}</span></a></li>`;
    }).join("")}</ul></section>`;
  }).join("");
  writeFileSync(join(outDir, idx(l)), `${head({ l, title: `${w.allTitle} | ${w.site}`, desc: clip(w.allIntro, 158), path, alt: x => idx(x), img: `${BASE}assets/share/og.jpg`, imgAlt: w.site, ld, type: "website" })}
${topbar(l, x => idx(x))}
  <main class="mwrap mwide" id="main">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="../index.html?lang=${l}">${esc(w.home)}</a> › <span aria-current="page">${esc(w.all)}</span></nav>
    <h1>${esc(w.allTitle)}</h1>
    <p class="mlead">${esc(w.allIntro)}</p>
    ${groups}
  </main>
${foot(l)}`);
}

// ---- sitemap and robots ----
const pages = [
  { alts: { en: "", es: "?lang=es", hi: "?lang=hi" }, pri: "1.0" },
  { alts: { en: "machines/index.html", es: "machines/index.es.html", hi: "machines/index.hi.html" }, pri: "0.9" },
  ...urls.map(u => ({ ...u, pri: "0.8" })),
  ...["explore.html", "eyes.html", "adopt.html", "ask.html", "lander.html", "teacher.html", "sources.html", "pitch.html"].map(p => ({ alts: { en: p }, pri: "0.6" }))
];
const xmlEsc = s => s.replace(/&/g, "&amp;");
const sm = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${pages.flatMap(p => Object.entries(p.alts).map(([l, u]) => `  <url>
    <loc>${xmlEsc(BASE + u)}</loc>
    <lastmod>${TODAY}</lastmod>
    <priority>${p.pri}</priority>
${Object.keys(p.alts).length > 1 ? Object.entries(p.alts).map(([x, v]) => `    <xhtml:link rel="alternate" hreflang="${x}" href="${xmlEsc(BASE + v)}"/>`).join("\n") + `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEsc(BASE + p.alts.en)}"/>\n` : ""}${p.img ? `    <image:image><image:loc>${xmlEsc(p.img)}</image:loc></image:image>\n` : ""}  </url>`)).join("\n")}
</urlset>
`;
writeFileSync(join(SITE, "sitemap.xml"), sm);
writeFileSync(join(SITE, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${BASE}sitemap.xml\n`);

// ---- home page structured data (kept stable so the file only changes when the data does) ----
const ldHome = { "@context": "https://schema.org", "@graph": [
  { "@type": "WebSite", "name": W.en.site, "alternateName": ["Abandoned but not Forgotten", W.es.site, W.hi.site], "url": BASE, "inLanguage": LANGS,
    "description": "An interactive story archive of the robots, rovers and hardware NASA left behind on the Moon, Mars and in deep space, for students aged 8–14.",
    "publisher": { "@type": "Organization", "name": "Ghosts of Exploration team (NASA Space Apps Challenge 2026)" } },
  { "@type": "LearningResource", "name": W.en.site, "url": BASE, "inLanguage": LANGS, "isAccessibleForFree": true,
    "educationalLevel": "Primary and middle school", "audience": { "@type": "EducationalAudience", "educationalRole": "student", "audienceType": "Students aged 8–14" },
    "learningResourceType": ["Interactive map", "Story", "Quiz", "Game"], "teaches": "The history and science of NASA hardware left on the Moon, Mars and in deep space",
    "about": ["Moon", "Mars", "NASA", "Space exploration", "Planetary science"].map(n => ({ "@type": "Thing", "name": n })) },
  { "@type": "ItemList", "name": W.en.allTitle, "numberOfItems": LIST.length,
    "itemListElement": LIST.map((a, i) => ({ "@type": "ListItem", "position": i + 1, "name": a.name, "url": `${BASE}machines/${file(a.id, "en")}` })) }] };
const indexPath = join(SITE, "index.html");
const indexHtml = readFileSync(indexPath, "utf8");
const updated = indexHtml.replace(/<script type="application\/ld\+json" id="ldSite">[\s\S]*?<\/script>/, `<script type="application/ld+json" id="ldSite">${JSON.stringify(ldHome).replace(/</g, "\\u003c")}</script>`);
if (updated !== indexHtml) writeFileSync(indexPath, updated);

console.log(`Wrote ${LIST.length * LANGS.length} machine pages, 3 index pages, sitemap.xml (${pages.reduce((n, p) => n + Object.keys(p.alts).length, 0)} URLs) and robots.txt`);
