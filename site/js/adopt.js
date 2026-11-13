/* ===========================================================
   Adopt a Ghost (adopt.html): a printable adoption certificate for
   any machine in the archive, for one person or a whole class.
   Links: adopt.html#voyager1 opens with that machine picked.
   Names are only used to draw the certificate; they are never sent
   or stored.
   =========================================================== */
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const L = window.GOE_LANG || "en";

  // ---- words on the page and the certificate ----
  const T = {
    en: {
      pageTitle: "Adopt a Ghost — Ghosts of Exploration", brandSub: "Adopt a Ghost",
      navMap: "Ghost Map", navArchive: "Archive", navW3d: "3D Worlds", navTeacher: "Teacher pack", navAdopt: "Adopt a Ghost",
      eyebrow: "Keep a story alive", title: "Adopt a Ghost",
      lede: "Pick one of the 49 machines NASA left behind, add your name, and print its adoption certificate: its photo, its epitaph, where it rests and a fun fact.",
      tabOne: "Just me", tabClass: "My whole class", name: "Your name", namePh: "Your name", pick: "Your machine", surprise: "🎲 Surprise me",
      names: "Names, one per line (up to 49)", classHint: "Each name gets a different machine, picked at random. One certificate per page.",
      shuffle: "🎲 Shuffle the machines", print: "🖨 Print or save as PDF", dossier: "Read its dossier →",
      privacy: "Names stay on this device. Nothing is sent anywhere.", back: "← Back to the archive",
      credit: "Photos: NASA Image and Video Library (public domain; NASA does not endorse this project).",
      worlds: { moon: "The Moon", mars: "Mars", deep: "Elsewhere" },
      // certificate
      head: "Ghosts of Exploration", certTitle: "Certificate of Adoption", certifies: "This certifies that",
      adopted: (who, what) => `${who}<span class="cert-mid">has adopted</span>${what}`,
      promise: "and promises to keep its story alive.", someone: "An explorer",
      rests: "Where it rests", status: "Status", launched: "Launched", epitaph: "Its epitaph", fun: "Fun fact",
      keeper: "Keeper of the Archive", on: "Adopted on", seal: "ADOPTED", photo: "Photo: NASA"
    },
    es: {
      pageTitle: "Adopta un fantasma — Fantasmas de la Exploración", brandSub: "Adopta un fantasma",
      navMap: "Mapa", navArchive: "Archivo", navW3d: "Mundos 3D", navTeacher: "Material docente", navAdopt: "Adopta un fantasma",
      eyebrow: "Mantén viva una historia", title: "Adopta un fantasma",
      lede: "Elige una de las 49 máquinas que la NASA dejó atrás, escribe tu nombre e imprime su certificado de adopción: su foto, su epitafio, dónde descansa y un dato curioso.",
      tabOne: "Solo yo", tabClass: "Toda mi clase", name: "Tu nombre", namePh: "Tu nombre", pick: "Tu máquina", surprise: "🎲 Sorpréndeme",
      names: "Nombres, uno por línea (hasta 49)", classHint: "Cada nombre recibe una máquina distinta, elegida al azar. Un certificado por página.",
      shuffle: "🎲 Mezclar las máquinas", print: "🖨 Imprimir o guardar como PDF", dossier: "Leer su expediente →",
      privacy: "Los nombres se quedan en este dispositivo. No se envía nada.", back: "← Volver al archivo",
      credit: "Fotos: Biblioteca de Imágenes y Videos de la NASA (dominio público; la NASA no respalda este proyecto).",
      worlds: { moon: "La Luna", mars: "Marte", deep: "Más allá" },
      head: "Fantasmas de la Exploración", certTitle: "Certificado de adopción", certifies: "Se certifica que",
      adopted: (who, what) => `${who}<span class="cert-mid">ha adoptado a</span>${what}`,
      promise: "y promete mantener viva su historia.", someone: "Un explorador",
      rests: "Dónde descansa", status: "Estado", launched: "Lanzamiento", epitaph: "Su epitafio", fun: "Dato curioso",
      keeper: "Guardián del Archivo", on: "Adoptado el", seal: "ADOPTADO", photo: "Foto: NASA"
    },
    hi: {
      pageTitle: "एक भूत गोद लो — अन्वेषण के भूत", brandSub: "एक भूत गोद लो",
      navMap: "नक्शा", navArchive: "संग्रह", navW3d: "3D दुनिया", navTeacher: "शिक्षक सामग्री", navAdopt: "एक भूत गोद लो",
      eyebrow: "एक कहानी को ज़िंदा रखो", title: "एक भूत गोद लो",
      lede: "नासा की छोड़ी 49 मशीनों में से एक चुनो, अपना नाम लिखो और उसका गोद लेने का प्रमाणपत्र छापो: उसकी तस्वीर, उसका समाधि-लेख, वह कहाँ है और एक मज़ेदार बात।",
      tabOne: "सिर्फ़ मैं", tabClass: "मेरी पूरी कक्षा", name: "तुम्हारा नाम", namePh: "तुम्हारा नाम", pick: "तुम्हारी मशीन", surprise: "🎲 कोई भी चुनो",
      names: "नाम, हर पंक्ति में एक (49 तक)", classHint: "हर नाम को अलग मशीन मिलती है, बिना क्रम के। हर पन्ने पर एक प्रमाणपत्र।",
      shuffle: "🎲 मशीनें फिर से बाँटो", print: "🖨 छापो या PDF में सहेजो", dossier: "इसकी फ़ाइल पढ़ो →",
      privacy: "नाम इसी डिवाइस पर रहते हैं। कुछ भी कहीं नहीं भेजा जाता।", back: "← संग्रह पर वापस",
      credit: "तस्वीरें: नासा इमेज और वीडियो लाइब्रेरी (सार्वजनिक; नासा इस परियोजना का समर्थन नहीं करता)।",
      worlds: { moon: "चाँद", mars: "मंगल", deep: "और आगे" },
      head: "अन्वेषण के भूत", certTitle: "गोद लेने का प्रमाणपत्र", certifies: "यह प्रमाणित किया जाता है कि",
      adopted: (who, what) => `${who}<span class="cert-mid">ने</span>${what}<span class="cert-mid">को गोद लिया है</span>`,
      promise: "और इसकी कहानी को ज़िंदा रखने का वादा करते हैं।", someone: "एक खोजकर्ता",
      rests: "कहाँ है", status: "स्थिति", launched: "लॉन्च", epitaph: "समाधि-लेख", fun: "मज़ेदार बात",
      keeper: "संग्रह के रक्षक", on: "गोद लेने की तारीख़", seal: "गोद लिया", photo: "तस्वीर: NASA"
    }
  };
  const t = T[L] || T.en;

  // ---- static text ----
  document.querySelectorAll("[data-t]").forEach(el => { const v = t[el.dataset.t]; if (typeof v === "string") el.textContent = v; });
  $("#adName").placeholder = t.namePh;
  document.title = t.pageTitle;

  // ---- machines: grouped by world in the picker ----
  const byId = Object.fromEntries(ARTIFACTS.map(a => [a.id, a]));
  const ids = ARTIFACTS.map(a => a.id);
  const pick = $("#adPick");
  pick.innerHTML = ["moon", "mars", "deep"].map(w => `<optgroup label="${esc(t.worlds[w])}">${ARTIFACTS.filter(a => a.world === w).map(a => `<option value="${a.id}">${esc(a.name)} (${a.year})</option>`).join("")}</optgroup>`).join("");

  const randomId = (not = []) => { const pool = ids.filter(i => !not.includes(i)); return pool[Math.floor(Math.random() * pool.length)]; };
  const shuffled = () => { const a = ids.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const today = new Date().toLocaleDateString(L === "hi" ? "hi-IN" : L === "es" ? "es-ES" : "en-GB", { day: "numeric", month: "long", year: "numeric" });

  const seal = `<svg class="cert-seal" viewBox="0 0 100 100" aria-hidden="true">
    <defs><path id="sealPath" d="M50,50 m-36,0 a36,36 0 1,1 72,0 a36,36 0 1,1 -72,0"/></defs>
    <circle cx="50" cy="50" r="47" fill="#e9a93f"/><circle cx="50" cy="50" r="42" fill="none" stroke="#fbf6ea" stroke-width="1.5" stroke-dasharray="3 3"/>
    <circle cx="50" cy="50" r="27" fill="#13203a"/>
    <text font-family="Space Grotesk, sans-serif" font-size="8.5" font-weight="700" fill="#13203a" letter-spacing="1.5"><textPath href="#sealPath" startOffset="0">${esc(t.seal)} · ${esc(t.seal)} · ${esc(t.seal)} ·</textPath></text>
    <circle cx="44" cy="45" r="11" fill="#cfd8e3"/><circle cx="49" cy="41" r="11" fill="#13203a"/>
    <path d="M58 56 l2 5 5 .5 -4 3.5 1.2 5 -4.2 -2.7 -4.2 2.7 1.2 -5 -4 -3.5 5 -.5z" fill="#e9a93f"/>
  </svg>`;

  function certHTML(id, name) {
    const a = byId[id]; if (!a) return "";
    const m = a.media && a.media[0];
    const img = m ? `assets/nasa/${m.f}` : `assets/maps/${a.world === "mars" ? "mars-sm" : "moon-sm"}.jpg`;
    const where = a.place || a.fixedPlace || a.heading || "";
    const st = STATUS[a.status] || { label: a.status, color: "#9fb3c8" };
    const who = `<span class="cert-who">${esc(name || t.someone)}</span>`;
    const what = `<span class="cert-machine">${esc(a.name)}</span>`;
    return `<article class="cert" lang="${L}">
      <div class="cert-in">
        <div class="cert-head"><span class="cert-moon"></span>${esc(t.head)}<span class="cert-moon"></span></div>
        <div class="cert-title">
          <h2>${esc(t.certTitle)}</h2>
          <p>${esc(t.certifies)}</p>
          <div class="cert-adopt">${t.adopted(who, what)}</div>
          <p class="cert-mission">${esc(a.mission)} · ${esc(WORLDS[a.world]?.name || "")} · ${esc(t.promise)}</p>
        </div>
        <div class="cert-body">
          <div class="cert-photo"><img src="${esc(img)}" alt="${esc(m ? m.cap : a.name)}"><small>${esc(t.photo)}${m ? " · " + esc(m.id) : ""}</small></div>
          <dl class="cert-facts">
            <div><dt>${esc(t.epitaph)}</dt><dd class="cert-epitaph">“${esc(a.epitaph)}”</dd></div>
            <div class="cert-row">
              <div><dt>${esc(t.rests)}</dt><dd>${esc(where)}</dd></div>
              <div><dt>${esc(t.status)}</dt><dd><span class="cert-status" style="--c:${esc(st.color)}"><i></i>${esc(st.label)}</span> · ${esc(t.launched)} ${esc(a.dates?.launch || a.year)}</dd></div>
            </div>
            <div><dt>${esc(t.fun)}</dt><dd>${esc(a.fun)}</dd></div>
          </dl>
        </div>
        <div class="cert-foot">
          <div class="cert-sign"><b>${esc(t.keeper)}</b>Ghosts of Exploration</div>
          ${seal}
          <div class="cert-sign"><b>${esc(today)}</b>${esc(t.on)}</div>
          <div class="cert-url">chetan-kumar-g.github.io/PROJECT-AREA-51 · NASA Space Apps Challenge 2026</div>
        </div>
      </div>
    </article>`;
  }

  // ---- state and drawing ----
  let mode = "one";
  let classIds = shuffled();
  const names = () => $("#adNames").value.split(/\r?\n/).map(s => s.trim().slice(0, 40)).filter(Boolean).slice(0, 49);

  function render() {
    if (mode === "one") {
      const id = pick.value;
      $("#adCerts").innerHTML = certHTML(id, $("#adName").value.trim());
      $("#adDossier").href = `index.html#artifact=${id}`;
      $("#adDossier").hidden = false;
      if (location.hash.slice(1) !== id) history.replaceState(null, "", "#" + id);
    } else {
      const list = names();
      $("#adCerts").innerHTML = (list.length ? list : [""]).map((n, i) => certHTML(classIds[i % classIds.length], n)).join("");
      $("#adDossier").hidden = true;
    }
  }

  // first machine: from the link (#voyager1), else a random one
  const fromHash = decodeURIComponent(location.hash.slice(1));
  pick.value = byId[fromHash] ? fromHash : randomId();

  pick.addEventListener("change", render);
  $("#adName").addEventListener("input", render);
  $("#adNames").addEventListener("input", render);
  $("#adRandom").addEventListener("click", () => { pick.value = randomId([pick.value]); render(); });
  $("#adShuffle").addEventListener("click", () => { classIds = shuffled(); render(); });
  $("#adPrint").addEventListener("click", () => window.print());
  window.addEventListener("hashchange", () => { const h = decodeURIComponent(location.hash.slice(1)); if (byId[h] && h !== pick.value) { pick.value = h; render(); } });

  // tabs
  const tabs = [$("#tabOne"), $("#tabClass")];
  tabs.forEach((tb, i) => {
    tb.addEventListener("click", () => select(i));
    tb.addEventListener("keydown", e => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { const n = (i + 1) % 2; select(n); tabs[n].focus(); } });
  });
  function select(i) {
    tabs.forEach((tb, k) => { tb.setAttribute("aria-selected", String(k === i)); tb.tabIndex = k === i ? 0 : -1; $("#" + tb.getAttribute("aria-controls")).hidden = k !== i; });
    mode = i === 0 ? "one" : "class";
    render();
  }

  // mobile menu
  const nt = $(".nav-toggle"), ul = $("#navlist");
  nt?.addEventListener("click", () => { const o = ul.classList.toggle("open"); nt.setAttribute("aria-expanded", String(o)); });

  select(0);
})();
