/* Teacher pack: worksheets and answer key generated from data.js, plus a projector quiz. */
(() => {
  "use strict";
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const byId = Object.fromEntries(ARTIFACTS.map(a => [a.id, a]));
  const line = (n = 1) => Array.from({ length: n }, () => `<span class="wl"></span>`).join("");
  const nameRow = `<div class="sheet-name"><span>Name: ${line()}</span><span>Date: ${line()}</span></div>`;

  /* ---- Worksheet 1: ghost hunt ---- */
  const HUNT = [
    ["Which robot found water ice just under the ground on Mars?", "Ghost Map → Mars", "Phoenix"],
    ["What was the first car driven on the Moon, and which mission brought it?", "Ghost Map → Moon", "Lunar Roving Vehicle 1, on Apollo 15 (1971)"],
    ["Apollo 11 left something that scientists still use today. What is it, and what does it measure?", "Tranquility Base dossier", "A laser retroreflector (mirror). It measures the distance to the Moon, which is drifting away about 3.8 cm a year."],
    ["How many marsquakes did InSight record?", "InSight dossier", `${byId.insight.stats.find(s => /quake/i.test(s[0]))[1]}`],
    ["Which spacecraft is the only one to have visited Uranus and Neptune?", "Elsewhere section", "Voyager 2"],
    ["How did Mars Pathfinder land? Describe it in one sentence.", "How it worked → Airbag bounce", "It used a parachute and rockets, then bounced across Mars inside giant airbags until it stopped."],
    ["Name one machine that was crashed on purpose, and say why.", "Timeline or Ghost Map (Impact site)", "e.g. LCROSS: to kick up material from a dark crater and look for water; Cassini: to protect Enceladus and Titan; GRAIL: its mission was over."],
    ["Which spacecraft is still circling the dwarf planet Ceres?", "Elsewhere section", "Dawn"],
    ["Opportunity was planned to last 90 days. How long did it actually work?", "Opportunity dossier", "More than 14 years (from 2004 until 2018)"],
    ["Which machine was the first aircraft to fly on another planet, and how many flights did it make?", "Ingenuity dossier", "Ingenuity, with 72 flights"]
  ];

  /* ---- Worksheet 3: planned vs actual (from the archive's mission records) ---- */
  const PVA = [
    ["Sojourner", "Mars days (sols)", 7, 83],
    ["Phoenix", "Mars days (sols)", 90, 157],
    ["Spirit", "Mars days (sols)", 90, 2208],
    ["Opportunity", "Mars days (sols)", 90, 5111],
    ["Viking 1 Lander", "days", 90, 2305],
    ["Ingenuity", "flights", 5, 72],
    ["InSight", "years", 2, 4],
    ["MESSENGER", "years in orbit", 1, 4],
    ["Galileo", "years at Jupiter", 2, 8],
    ["Cassini", "years at Saturn", 4, 13],
    ["Voyager 1", "years working", 5, 49]
  ];
  const times = r => (r[3] / r[2]);

  /* ---- Worksheet 4: landing methods ---- */
  const METHODS = [["A", "Rockets only (no air to use)"], ["B", "Parachute, then giant airbags"], ["C", "Parachute, then a “sky crane” lowers it on cables"], ["D", "Parachute, then rocket thrusters onto its legs"], ["E", "Rode down attached to a rover"]];
  const LANDERS = [["Apollo 11 lunar module", "A"], ["Surveyor 1", "A"], ["Mars Pathfinder", "B"], ["Opportunity", "B"], ["Viking 1", "D"], ["Phoenix", "D"], ["Curiosity", "C"], ["Ingenuity", "E"]];

  function sheets() {
    const hunt = `<div class="sheet" id="sheet-hunt">
      <div class="sheet-head"><h3>Worksheet 1: Ghost hunt</h3><button class="btn btn-small no-print" data-print="sheet-hunt">🖨 Print</button></div>
      ${nameRow}
      <p class="sheet-intro">Use the <b>Ghosts of Exploration</b> website to find the answers. The hint tells you where to look.</p>
      <ol class="q-list">${HUNT.map(q => `<li><p>${esc(q[0])} <span class="hint">(Hint: ${esc(q[1])})</span></p>${line(2)}</li>`).join("")}</ol>
      <div class="sheet-box"><b>Challenge:</b> Find a machine on the Ghost Map that is <i>not</i> on this sheet. Write its name and one thing it discovered. ${line(2)}</div>
    </div>`;

    const log = `<div class="sheet" id="sheet-log">
      <div class="sheet-head"><h3>Worksheet 2: Write a ghost log</h3><button class="btn btn-small no-print" data-print="sheet-log">🖨 Print</button></div>
      ${nameRow}
      <p class="sheet-intro">A <b>ghost log</b> is a story told by a machine itself, like the ones on the website. Choose any machine and research it in its dossier.</p>
      <table class="facts-table"><tr><th>My machine</th><td>${line()}</td></tr><tr><th>Where it is now</th><td>${line()}</td></tr><tr><th>What it was sent to do</th><td>${line()}</td></tr><tr><th>One thing it discovered</th><td>${line()}</td></tr><tr><th>How its mission ended</th><td>${line()}</td></tr></table>
      <p><b>Now write 5–6 sentences in the machine's voice</b> (“I was…”, “I found…”). Every fact must be true!</p>
      ${line(9)}
      <div class="sheet-box"><b>Check:</b> ☐ written as “I” &nbsp; ☐ at least 3 true facts &nbsp; ☐ says where it is now &nbsp; ☐ says why it mattered</div>
      <p class="hint">Ideas: ${["sojourner", "phoenix", "insight", "apollo17", "voyager2", "cassini", "dawn", "lcross"].map(id => esc(byId[id].name)).join(" · ")}</p>
    </div>`;

    const data = `<div class="sheet" id="sheet-data">
      <div class="sheet-head"><h3>Worksheet 3: Planned vs. what really happened</h3><button class="btn btn-small no-print" data-print="sheet-data">🖨 Print</button></div>
      ${nameRow}
      <p class="sheet-intro">Engineers plan a mission to last a certain time. Many lasted much longer! Divide <b>actual</b> by <b>planned</b> to find how many times longer each one lasted (round to a whole number).</p>
      <table class="data-table"><thead><tr><th>Machine</th><th>Unit</th><th>Planned</th><th>Actual</th><th>How many times longer?</th></tr></thead>
        <tbody>${PVA.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${r[2].toLocaleString()}</td><td>${r[3].toLocaleString()}</td><td class="blank"></td></tr>`).join("")}</tbody></table>
      <ol class="q-list">
        <li><p>Which machine beat its plan by the most?</p>${line()}</li>
        <li><p>Which machine lasted closest to its plan?</p>${line()}</li>
        <li><p>Make a bar chart of “how many times longer” for five machines on the grid below.</p></li>
      </ol>
      <div class="chart-grid" aria-hidden="true">${Array.from({ length: 5 }, () => `<div class="cg-row"><span class="cg-label"></span><span class="cg-bar"></span></div>`).join("")}</div>
      <ol class="q-list" start="4"><li><p>Why do you think engineers build spacecraft that can last longer than the plan?</p>${line(2)}</li></ol>
    </div>`;

    const land = `<div class="sheet" id="sheet-land">
      <div class="sheet-head"><h3>Worksheet 4: Landing methods</h3><button class="btn btn-small no-print" data-print="sheet-land">🖨 Print</button></div>
      ${nameRow}
      <p class="sheet-intro">Watch the <b>How it worked</b> animations, then write the letter of the landing method next to each machine.</p>
      <div class="two-col"><ul class="methods">${METHODS.map(m => `<li><b>${m[0]}</b> ${esc(m[1])}</li>`).join("")}</ul>
        <table class="data-table"><tbody>${LANDERS.map(l => `<tr><td>${esc(l[0])}</td><td class="blank small"></td></tr>`).join("")}</tbody></table></div>
      <table class="data-table"><thead><tr><th>World</th><th>Gravity (m/s²)</th><th>Air?</th></tr></thead><tbody>
        <tr><td>Earth</td><td>9.81</td><td>Thick</td></tr><tr><td>Mars</td><td>3.71</td><td>Very thin (about 1% of Earth's)</td></tr><tr><td>Moon</td><td>1.62</td><td>None</td></tr></tbody></table>
      <ol class="q-list">
        <li><p>Why did no Moon lander use a parachute?</p>${line()}</li>
        <li><p>Mars has air, so why couldn't a parachute alone land Phoenix safely?</p>${line(2)}</li>
        <li><p>Play <b>Land it yourself</b>. Your best landing speed on the Moon: ${line()} m/s. On Mars: ${line()} m/s.</p></li>
        <li><p>Why do you need more engine power to land on Mars than on the Moon?</p>${line(2)}</li>
      </ol>
    </div>`;
    $("#sheetsBox").innerHTML = hunt + log + data + land;
  }

  function key() {
    $("#keyBox").innerHTML = `
      <h3>Worksheet 1: Ghost hunt</h3><ol>${HUNT.map(q => `<li>${esc(q[2])}</li>`).join("")}</ol>
      <h3>Worksheet 3: Planned vs. actual</h3>
      <table class="data-table"><thead><tr><th>Machine</th><th>Times longer (rounded)</th></tr></thead><tbody>${PVA.map(r => `<tr><td>${esc(r[0])}</td><td>${Math.round(times(r))}×</td></tr>`).join("")}</tbody></table>
      <p>1. Opportunity (about ${Math.round(times(PVA.find(r => r[0] === "Opportunity")))}× longer). 2. Phoenix (about 2×). 4. Sample answer: space is harsh and you can't repair a spacecraft, so engineers build in safety margins. When things go better than the worst case, missions keep going.</p>
      <h3>Worksheet 4: Landing methods</h3>
      <p>${LANDERS.map(l => `${esc(l[0])}: <b>${l[1]}</b>`).join(" · ")}</p>
      <p>1. The Moon has no air, so a parachute has nothing to push against. 2. Mars's air is so thin that a parachute still leaves a lander falling far too fast (hundreds of km/h), so rockets are needed for the last part. 4. Mars's gravity (3.71 m/s²) is more than twice the Moon's (1.62 m/s²), so you need more thrust to slow down.</p>
      <h3>Worksheet 2</h3><p>Any machine is fine. Check that facts match its dossier and that it is written in the first person.</p>`;
  }

  /* ---- printing a single sheet ---- */
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-print]"); if (!b) return;
    document.body.dataset.print = b.dataset.print;
    $$(".sheet").forEach(s => s.classList.toggle("printing", s.id === b.dataset.print));
    window.print();
  });
  addEventListener("afterprint", () => { delete document.body.dataset.print; $$(".sheet").forEach(s => s.classList.remove("printing")); });

  /* ---- class quiz ---- */
  const POOL = ARTIFACTS.filter(a => a.quiz);
  let qs = [], qi = 0, revealed = false, teams = [];
  const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);
  function newGame() {
    qs = shuffle(POOL).slice(0, 10).map(a => ({ a, opts: shuffle([a, ...shuffle(POOL.filter(o => o.id !== a.id && o.world === a.world)).slice(0, 3)]) }));
    qi = 0; teams = [{ n: "Team A", s: 0 }, { n: "Team B", s: 0 }, { n: "Team C", s: 0 }];
    renderTeams(); renderQ();
  }
  function renderTeams() {
    $("#cqTeams").innerHTML = teams.map((t, i) => `<span class="cq-team"><b>${t.n}</b> <span class="cq-score">${t.s}</span><button class="btn btn-small" data-team="${i}" aria-label="+1 point for ${t.n}">+1</button></span>`).join("");
    $$("[data-team]").forEach(b => b.addEventListener("click", () => { teams[+b.dataset.team].s++; renderTeams(); }));
  }
  function renderQ() {
    const q = qs[qi]; revealed = false;
    $("#cqCount").textContent = `Question ${qi + 1} of ${qs.length}`;
    $("#cqClue").textContent = `“${q.a.quiz}”`;
    $("#cqOpts").innerHTML = q.opts.map((o, i) => `<div class="cq-opt" data-id="${o.id}"><span class="cq-letter">${"ABCD"[i]}</span>${o.media[0] ? `<img src="assets/nasa/${o.media[0].f}" alt="">` : ""}<b>${esc(o.name)}</b></div>`).join("");
    $("#cqAns").hidden = true;
    $("#cqNext").textContent = qi === qs.length - 1 ? "Final scores →" : "Next question →";
  }
  function reveal() {
    if (revealed) return; revealed = true;
    const q = qs[qi];
    $$(".cq-opt").forEach(o => o.classList.toggle(o.dataset.id === q.a.id ? "right" : "dim", true));
    $("#cqAns").innerHTML = `<b>${esc(q.a.name)}</b>: ${esc(q.a.fun)}`; $("#cqAns").hidden = false;
  }
  function next() {
    if (qi < qs.length - 1) { qi++; renderQ(); return; }
    const top = Math.max(...teams.map(t => t.s)), win = teams.filter(t => t.s === top).map(t => t.n);
    $("#cqCount").textContent = "Final scores";
    $("#cqClue").textContent = top ? `🏆 ${win.join(" & ")} win${win.length > 1 ? "" : "s"} with ${top} point${top === 1 ? "" : "s"}!` : "Game over!";
    $("#cqOpts").innerHTML = ""; $("#cqAns").hidden = true;
  }
  $("#cqReveal").addEventListener("click", reveal);
  $("#cqNext").addEventListener("click", next);
  $("#cqRestart").addEventListener("click", newGame);
  $("#cqFull").addEventListener("click", () => { const el = $("#cq"); (document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen?.())?.catch?.(() => { }); });
  addEventListener("keydown", e => {
    if (e.target.closest("input, textarea")) return;
    const r = $("#cq").getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    if (e.code === "Space") { e.preventDefault(); reveal(); }
    if (e.code === "ArrowRight") next();
    if (e.code === "KeyF") $("#cqFull").click();
  });

  // nav toggle
  const t = $(".nav-toggle"), ul = $("#navlist");
  t.addEventListener("click", () => { const o = ul.classList.toggle("open"); t.setAttribute("aria-expanded", o); });

  sheets(); key(); newGame();
})();
