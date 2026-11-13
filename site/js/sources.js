/* Sources page: lists, machine by machine, the documents and NASA photo records behind each dossier. */
(() => {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rec = id => (typeof RECORDS !== "undefined" && RECORDS[id]) || {};
  const SL = typeof SOURCE_LIST !== "undefined" ? SOURCE_LIST : {};

  const docs = new Set(), photos = new Set();
  const machine = a => {
    const srcs = (rec(a.id).sources || []).map(id => SL[id]).filter(Boolean);
    srcs.forEach(s => docs.add(s.url));
    a.media.forEach(m => photos.add(m.id));
    return `<article class="src-item" id="${a.id}">
      <h3><a href="index.html#artifact=${a.id}">${esc(a.name)}</a> <small>${esc(a.mission)} · ${a.year}</small></h3>
      ${srcs.length ? `<ul class="src-docs">${srcs.map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a> <small>${esc(s.org)}${s.read ? ` · read ${esc(s.read)}` : ""}</small></li>`).join("")}</ul>` : `<p class="src-none">Facts checked against the NASA photo records below.</p>`}
      ${a.media.length ? `<p class="src-photos"><b>NASA photo records:</b> ${a.media.map(m => `<a href="${NASA_PAGE(m.id)}" target="_blank" rel="noopener">${esc(m.id)}</a>`).join(", ")}</p>` : ""}
    </article>`;
  };
  const html = Object.entries(WORLDS).map(([w, W]) => {
    const list = ARTIFACTS.filter(a => a.world === w).sort((x, y) => x.year - y.year);
    return `<section class="src-sec" id="${w}"><h2>${esc(W.name)} <small>${list.length} machines</small></h2>${list.map(machine).join("")}</section>`;
  }).join("");
  document.getElementById("srcList").innerHTML = html;
  document.getElementById("srcStats").innerHTML =
    `<div><b>${ARTIFACTS.length}</b><span>machines</span></div><div><b>${docs.size}</b><span>mission documents</span></div><div><b>${photos.size}</b><span>NASA photo records</span></div>`;

  // phone menu
  const t = document.querySelector(".nav-toggle"), ul = document.getElementById("navlist");
  t.addEventListener("click", () => { const o = ul.classList.toggle("open"); t.setAttribute("aria-expanded", o); });
  ul.addEventListener("click", e => { if (e.target.closest("a")) { ul.classList.remove("open"); t.setAttribute("aria-expanded", "false"); } });

  // Arriving from a dossier (sources.html#opportunity): highlight that machine.
  const target = location.hash && document.getElementById(location.hash.slice(1));
  if (target && target.classList.contains("src-item")) { target.classList.add("hl"); target.scrollIntoView({ block: "start" }); }
})();
