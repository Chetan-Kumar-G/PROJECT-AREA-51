/* ===========================================================
   Ask the Archive — chat page
   Two answer sources:
   1. Offline Archive Guide: searches ARTIFACTS (data.js) in the browser.
      Always available, free, and only says what the archive says.
   2. AI guide (optional): streams answers from Google Gemini through the
      Cloudflare Worker in /worker, when window.ASK_ENDPOINT is set.
   =========================================================== */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const byId = Object.fromEntries(ARTIFACTS.map(a => [a.id, a]));
  const TYPE_EMOJI = { rover: "🚙", lander: "🛸", vehicle: "🛞", experiment: "📡", impactor: "☄️", probe: "🛰️", helicopter: "🚁", debris: "🪂", orbiter: "🛰️", telescope: "🔭" };
  const ENDPOINT = (window.ASK_ENDPOINT || "").replace(/\/+$/, "");
  const store = {
    get(k, d) { try { const v = localStorage.getItem("goe:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("goe:" + k, JSON.stringify(v)); } catch { /* ignore */ } }
  };
  const level = () => (store.get("prefs", {}).level === "scientist" ? "scientist" : "explorer");
  const auNow = d => d.au2025 + d.rate * ((Date.now() - Date.UTC(2025, 0, 1)) / (365.25 * 864e5));
  const fmtKm = au => { const km = au * 1.496e8; return km >= 1e9 ? (km / 1e9).toFixed(1) + " billion km" : (km / 1e6).toFixed(0) + " million km"; };
  const lightTime = au => { const h = au * 499 / 3600; return h >= 1 ? h.toFixed(1) + " hours" : (h * 60).toFixed(0) + " minutes"; };
  const cover = a => (a.media && a.media[0] ? "assets/nasa/" + a.media[0].f : null);

  /* ================= OFFLINE ARCHIVE GUIDE ================= */
  const STOP = new Set("a an the is are was were be been of to in on at for and or but with by from about into it its this that these those what which who whom whose when where why how do does did can could would should will shall may might me my i you your we our us they them their he she his her tell show give know please there here than then so very much many any some all one ones thing things as if not no yes just also get got have has had".split(" "));
  const stem = w => (w.length > 4 && w.endsWith("ies") ? w.slice(0, -3) + "y" : w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w);
  const norm = s => String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "").replace(/[^a-z0-9\s-]/g, " ");
  const toks = s => norm(s).split(/[\s-]+/).filter(Boolean).map(stem).filter(t => !STOP.has(t));

  // Phrases that point straight at particular machines.
  const ALIASES = [
    [/\boppy\b|blueberr|marathon|hematite/, ["opportunity"]],
    [/twin rovers?|mars exploration rovers?/, ["spirit", "opportunity"]],
    [/moon (buggy|buggies|cars?)|lunar rov|\blrv\b|rover on the moon|car on the moon/, ["apollo15", "apollo16", "apollo17"]],
    [/first car|first rover on the moon/, ["apollo15"]],
    [/last (car|people|humans?|astronauts?|moon ?walk)|orange soil|duct tape|cernan|schmitt/, ["apollo17"]],
    [/\beagle\b|armstrong|aldrin|first (moon landing|people on the moon|humans? on the moon)|tranquill?ity|retroreflector|laser|mirror/, ["apollo11"]],
    [/golf|shepard|fra mauro|rickshaw/, ["apollo14"]],
    [/genesis rock|fallen astronaut|hadley/, ["apollo15"]],
    [/charlie duke|family photo|descartes|first telescope/, ["apollo16"]],
    [/conrad|alan bean|intrepid|rang like a bell|moonquake/, ["apollo12"]],
    [/visited by (astronauts|humans)|took (its|the) camera|bounced twice/, ["surveyor3"]],
    [/first soft landing|soft land/, ["surveyor1"]],
    [/built to crash|4,?308|first close-?up/, ["ranger7"]],
    [/s-?ivb|third stage|saturn v|booster/, ["sivb16"]],
    [/water ice on the moon|moon.*(ice|water)|cabeus|centaur/, ["lcross"]],
    [/ebb|flow\b|gravity map|sally ride/, ["grail"]],
    [/moon'?s? atmosphere|exosphere|dust cloud|neon/, ["ladee"]],
    [/first (colou?r )?(photo|picture|image) from mars|chryse|search(ed)? for life|life on mars/, ["viking1"]],
    [/frost|utopia/, ["viking2"]],
    [/airbag|carl sagan memorial|ares vallis/, ["pathfinder"]],
    [/first rover|microwave|sojourner truth|barnacle bill|yogi/, ["sojourner"]],
    [/disappear|vanished|lost during landing|missing lander|never heard/, ["polarlander"]],
    [/stuck|troy|broken wheel|hot spring|silica|gusev/, ["spirit"]],
    [/dust storm|battery is low|getting dark|endeavour/, ["opportunity"]],
    [/ice on mars|snow|tasted ice|perchlorate|arctic|visions of mars/, ["phoenix"]],
    [/marsquake|mars'?s? (core|insides?|interior)|seismometer on mars|\bmole\b|stethoscope/, ["insight"]],
    [/helicopter|ginny|fl(y|ew|ight)s? on (mars|another planet)|aircraft|wright/, ["ingenuity"]],
    [/backshell|parachute|perseverance|sky ?crane|dare mighty/, ["backshell"]],
    [/curiosity|gale crater|mount sharp/, ["curiosity"]],
    [/pale blue dot|golden record|farthest|furthest|interstellar|heliopause/, ["voyager1"]],
    [/uranus|neptune|triton|grand tour|interstellar shout|gravity assist|slingshot/, ["voyager2"]],
    [/asteroid belt|aldebaran|plaque|first .*(to|past) jupiter/, ["pioneer10"]],
    [/into jupiter|jupiter.?s (atmosphere|clouds)|europa|ganymede|galileo/, ["galileo"]],
    [/f ring|first .*(to|visit) saturn/, ["pioneer11"]],
    [/into saturn|grand finale|enceladus|titan|huygens|cassini/, ["cassini"]],
    [/mercury|messenger/, ["messenger"]],
    [/venus/, ["pioneervenus", "magellan"]],
    [/magellan|radar map|aerobrak/, ["magellan"]],
    [/mariner 9|olympus mons|valles marineris|first .*orbit (another|a) planet/, ["mariner9"]],
    [/climate orbiter|units|pounds?|newtons|metric/, ["mco"]],
    [/global surveyor|\bmgs\b|laser altimeter|mola/, ["mgs"]],
    [/mariners?\b(?! [249])/, ["mariner2", "mariner4", "mariner9"]],
    [/vanguard|grapefruit|oldest (satellite|object)|pear.?shaped/, ["vanguard1"]],
    [/mariner 2|first .*(visit|fly past|flyby).*planet|solar wind/, ["mariner2"]],
    [/mariner 4|hand.?colou?red|crayon|pastel|canals/, ["mariner4"]],
    [/isee|cometary explorer|giacobini|first .*comet|volunteers?|crowdfund/, ["isee3"]],
    [/kepler|exoplanets?|planets? (around|orbiting) other stars|planet hunt/, ["kepler", "spitzer"]],
    [/spitzer|infrared|trappist/, ["spitzer"]],
    [/stardust|wild 2|aerogel|comet dust|glycine/, ["stardust"]],
    [/lunar prospector|prospector|shoemaker|ashes/, ["prospector"]],
    [/ceres|vesta|ion engine/, ["dawn"]],
    [/asteroid|eros|valentine/, ["near"]],
    [/comet|tempel|independence day|4th of july|july 4/, ["deepimpact"]],
    [/pluto|arrokoth|kuiper|new horizons/, ["newhorizons"]]
  ];

  // Short explanations for words kids often ask about.
  const GLOSSARY = [
    [/\brtgs?\b|nuclear batter|radioisotope/, "RTG", "An **RTG** (radioisotope thermoelectric generator) is a nuclear battery. Heat from slowly decaying plutonium is turned into electricity. It works in the dark and the cold, which is why the Apollo science stations, Pioneer, Voyager and Curiosity use them. It slowly gets weaker over decades.", ["apollo12", "voyager1", "curiosity"]],
    [/retroreflector|laser mirror/, "Retroreflector", "A **retroreflector** is a panel of special mirrors (corner cubes) that bounce light straight back to where it came from. Scientists fire lasers from Earth at the ones left by Apollo 11, 14 and 15 and time the echo. That's how we know the Moon drifts about 3.8 cm farther from Earth every year.", ["apollo11"]],
    [/what (is|are) (an? )?\bau\b|astronomical unit/, "AU", "An **AU** (astronomical unit) is the average distance from Earth to the Sun: about 150 million km. Light takes about 8 minutes 20 seconds to travel 1 AU.", ["voyager1"]],
    [/heliopause|heliosphere|interstellar space/, "Heliopause", "The Sun blows out a wind of particles that makes a giant bubble around the solar system, called the heliosphere. Its edge is the **heliopause**. Beyond it is **interstellar space**, the space between the stars. Voyager 1 crossed it in 2012 and Voyager 2 in 2018, both at roughly 120 AU from the Sun.", ["voyager1", "voyager2"]],
    [/what (is|are) a \bsol\b|\bsols?\b.*mean|mars day/, "Sol", "A **sol** is one day on Mars. It lasts 24 hours, 39 minutes and 35 seconds, a little longer than an Earth day. Mission teams count rover lifetimes in sols.", ["opportunity"]],
    [/regolith/, "Regolith", "**Regolith** is the layer of loose dust and broken rock covering the Moon, Mars and asteroids. On the Moon it's sharp and sticky because there's no wind or water to smooth the grains.", ["surveyor1"]],
    [/what (is|are) (a |an )?seismometer|what.*seismometer do/, "Seismometer", "A **seismometer** measures tiny shakes in the ground. Apollo seismometers felt moonquakes, and InSight's heard more than 1,300 marsquakes, which revealed what's inside Mars.", ["apollo12", "insight"]],
    [/descent stage/, "Descent stage", "The Apollo lunar module had two parts. The bottom half, the **descent stage**, landed on the Moon and then became the launch pad for the top half, which flew the astronauts back. Six descent stages are still on the Moon.", ["apollo11"]],
    [/\balsep\b|science station/, "ALSEP", "An **ALSEP** (Apollo Lunar Surface Experiments Package) was a nuclear-powered science station that astronauts set up on Apollo 12, 14, 15, 16 and 17. They measured moonquakes, heat, the solar wind and more until NASA switched them off in 1977.", ["apollo12", "apollo17"]],
    [/(first|earliest) (rover|car)(?! on the moon)/, "First rover", "It depends where! The first rover NASA drove on the Moon was **Lunar Roving Vehicle 1**, with astronauts at the wheel in 1971. The first rover on another *planet* was tiny **Sojourner**, on Mars in 1997. (The very first rover on any world was the Soviet Union's Lunokhod 1, on the Moon in 1970.)", ["apollo15", "sojourner"]],
    [/what (is|are) an? rover|rover vs|difference between.*(rover|lander)/, "Rover vs lander", "A **rover** drives around to explore, like Sojourner, Spirit and Opportunity. A **lander** stays where it touched down, like Viking, Phoenix and InSight. An **impactor** is crashed on purpose so scientists can study the crash.", ["sojourner", "viking1", "ranger7"]],
    [/what (is|are) an? impactor/, "Impactor", "An **impactor** is a spacecraft crashed on purpose. The crash itself is the experiment: it can kick up material to study (LCROSS, Deep Impact) or send shakes through the ground for seismometers to measure (the Saturn V third stages).", ["lcross", "deepimpact", "sivb16"]],
    [/deep space network|\bdsn\b|giant antenna/, "Deep Space Network", "NASA's **Deep Space Network** is three sets of giant radio dishes in California, Spain and Australia. Together they can always face a spacecraft as Earth turns. They still listen to Voyager 1 and 2.", ["voyager2"]],
    [/why (did|do) (they|astronauts|nasa) (leave|leave behind)|why.*left (behind|on the moon)|why not bring.*back/, "Why leave things?", "Weight! Every kilogram carried back from the Moon needed extra fuel. So astronauts left behind things they no longer needed, like the lunar module's descent stage, Moon cars, backpacks, boots and tools, to make room for Moon rocks. Robots on Mars can't come home at all: it would need a rocket to launch them back.", ["apollo11", "apollo17"]],
    [/how much (stuff|junk|hardware|trash|material)|how many tonn|space junk/, "How much is out there?", "Estimates vary, but there are more than **180 tonnes** of human-made material on the Moon (rockets, landers, Moon cars, experiments and crash debris) and about **7 tonnes** on Mars, from rovers to parachutes.", ["apollo17", "backshell"]],
    [/protect|preserv|heritage|can (anyone|people|we) visit|tourist|touch the (flag|footprints)/, "Protecting the sites", "In 2011 NASA published guidelines asking future missions to keep their distance from the Apollo landing sites so the footprints and hardware are preserved. A 2020 U.S. law, the One Small Step to Protect Human Heritage in Space Act, makes companies working with NASA follow those guidelines.", ["apollo11"]],
    [/artemis|go back to the moon|return to the moon/, "Artemis", "NASA's **Artemis** program is working to send astronauts back to the Moon, aiming for the south pole region where LCROSS found water ice. Engineers designing new rovers and seismometers still learn from the Apollo hardware in this archive.", ["lcross", "apollo17"]]
  ];

  const INTENTS = [
    ["epitaph", /epitaph|gravestone|headstone|tombstone|memorial line|rest in peace|\brip\b|last words|famous last|sum (it|its life|their life) up in one/],
    ["ghost", /talk (to me )?(as|like)|pretend|your (story|ghost)|in (its|their|your) (own )?voice|ghost log|introduce yourself|who are you/],
    ["how", /how did .*(land|touch down|get down|fly|crash|take off|work|end|die|finish)|how (does|do|did) .*(land|fly)|\blanding\b|how .* landed|parachute|airbags?|sky ?crane|slingshot|gravity assist/],
    ["distance", /how far|distance|light.?(time|hours?|minutes?)|where is .* now|signal take/],
    ["status", /still (work|talk|alive|active|awake|run)|is .* (alive|dead|working|active)|status|switched off|died|stop(ped)? working/],
    ["dates", /\bwhen\b|what year|which year|\bdate\b|launch|land(ed)? on|arriv/],
    ["where", /\bwhere\b|location|coordinat|latitude|what crater|which crater/],
    ["discover", /discover|find|found|learn|teach us|science|result/],
    ["why", /why .*(important|matter)|matter|legacy|today|help (us|future)|important/],
    ["planned", /how long|lifespan|planned|supposed to|expected|\blasted\b|how many (days|years|sols)/],
    ["left", /left behind|what('s| is) (there|left)|leave behind|what did .* leave/],
    ["fun", /fun fact|cool|interesting|surpris|weird/],
    ["model", /3d|model/]
  ];

  // Build a weighted word index for each artifact.
  const FIELDS = [["name", 7], ["nick", 6], ["mission", 5], ["id", 5], ["place", 3], ["fixedPlace", 3], ["heading", 1], ["story", 1], ["deep", 1], ["ghost", 1], ["fun", 1], ["legacy", 1]];
  const index = ARTIFACTS.map(a => {
    const w = new Map();
    const add = (text, weight) => toks(text || "").forEach(t => w.set(t, Math.max(w.get(t) || 0, weight)));
    FIELDS.forEach(([f, wt]) => add(a[f], wt));
    add(TYPES[a.type], 3); add(WORLDS[a.world].short, 2);
    (a.discoveries || []).forEach(d => add(d, 1.5));
    (a.left || []).forEach(d => add(d, 1));
    return { a, w };
  });
  const df = new Map();
  index.forEach(({ w }) => w.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1)));
  const idf = t => Math.log(1 + ARTIFACTS.length / (df.get(t) || ARTIFACTS.length));

  function detectWorld(q) {
    if (/\bmoon|lunar|apollo/.test(q)) return "moon";
    if (/\bmars|martian|red planet/.test(q)) return "mars";
    if (/deep space|elsewhere|probe|interstellar|outer|solar system|beyond|mercury|venus|jupiter|saturn|ceres|asteroid|comet/.test(q)) return "deep";
    return null;
  }
  function detectType(q) {
    if (/helicopter/.test(q)) return ["helicopter"];
    if (/\brovers?\b/.test(q)) return /moon|lunar/.test(q) ? ["vehicle"] : ["rover", "vehicle"];
    if (/moon ?cars?|buggy|buggies/.test(q)) return ["vehicle"];
    if (/landers?/.test(q)) return ["lander"];
    if (/impactor|crash/.test(q)) return ["impactor"];
    if (/probes?|spacecraft/.test(q)) return ["probe"];
    if (/experiment|science station|seismometer/.test(q)) return ["experiment"];
    return null;
  }
  function detectStatus(q) {
    if (/still (work|talk|alive|active|awake|run)|active|working today|alive/.test(q)) return ["active", "retired"];
    if (/\blost\b|disappear/.test(q)) return ["lost"];
    if (/crash|impact/.test(q)) return ["impact"];
    if (/silent|dead|died|switched off/.test(q)) return ["silent"];
    return null;
  }

  function score(q) {
    const qn = norm(q), qt = toks(q);
    const scores = new Map(ARTIFACTS.map(a => [a.id, 0]));
    index.forEach(({ a, w }) => {
      let s = 0;
      qt.forEach(t => { if (w.has(t)) s += w.get(t) * idf(t); });
      const nm = norm(a.name);
      if (qn.includes(nm)) s += 40;
      if (a.nick && qn.includes(norm(a.nick))) s += 30;
      scores.set(a.id, s);
    });
    ALIASES.forEach(([re, ids]) => { if (re.test(qn)) ids.forEach(id => scores.set(id, scores.get(id) + 30)); });
    return [...scores.entries()].map(([id, s]) => ({ a: byId[id], s })).sort((x, y) => y.s - x.s);
  }

  let lastIds = []; // remembers what the conversation is about, for follow-ups like "when did it launch?"

  function offlineAnswer(question) {
    const q = norm(question);
    const intent = (INTENTS.find(([, re]) => re.test(q)) || ["about"])[0];
    const ranked = score(question);
    const top = ranked[0], second = ranked[1];
    const strong = top.s >= 15;
    const isList = /\b(how many|list|all the|every|name (some|all))\b|\b(are|were) (still |there |)(on|in|at|there|working|awake|active|alive|silent|lost)\b|\bwhich \w+ (are|were)\b|\bwhat(s| is| was)? (left )?(on|in) (the moon|mars|deep space)\b|\bwhats (left )?(on|in)\b/.test(q);
    const world = detectWorld(q), types = detectType(q), statuses = detectStatus(q);
    const superl = /\b(oldest|first|earliest|newest|latest|most recent|last one|farthest|furthest|longest)\b/.exec(q);

    // 0. Specific questions with hand-written answers (mostly about Opportunity and her twin).
    //    Rover-specific ones need the question to be about the Mars Exploration Rovers: by name,
    //    or "she/her/it" right after a question about Opportunity.
    if (typeof ASK_FAQ !== "undefined") {
      const aboutMER = /opportunity|oppy|mars exploration rovers?|\bmer\b|twin rovers?/.test(q)
        || (lastIds.length && lastIds[0] === "opportunity" && /\b(she|her|it|its)\b/.test(q) && !(strong && top.a.id !== "opportunity" && top.s >= 40));
      const faq = ASK_FAQ.find(f => (!f.mer || aboutMER) && f.re.test(q));
      if (faq) { lastIds = faq.ids.slice(0, 1); return { text: faq.a, ids: faq.ids }; }
    }

    // 1. Glossary / general questions (unless a specific machine is clearly named)
    const gloss = GLOSSARY.find(([re]) => re.test(q));
    if (gloss && (gloss[1] === "First rover" || !(strong && top.s >= 40 && !/what (is|are)/.test(q)))) {
      lastIds = gloss[3];
      return { text: gloss[2], ids: gloss[3] };
    }

    // 2. Lists, counts and superlatives
    if ((isList || (superl && !(strong && top.s >= 40))) && (world || types || statuses)) {
      let set = ARTIFACTS.filter(a => (!world || a.world === world) && (!types || types.includes(a.type)) && (!statuses || statuses.includes(a.status)));
      if (!set.length) return { text: "I couldn't find any machines like that in the archive. Try asking about rovers on Mars or probes in deep space!", ids: [] };
      if (superl) {
        const w = superl[1];
        let pick;
        if (/oldest|first|earliest/.test(w)) pick = [...set].sort((x, y) => x.year - y.year)[0];
        else if (/farthest|furthest/.test(w)) pick = [...set].filter(a => a.dist).sort((x, y) => auNow(y.dist) - auNow(x.dist))[0] || null;
        else if (/longest/.test(w)) pick = null;
        else pick = [...set].sort((x, y) => y.year - x.year)[0];
        if (pick) {
          lastIds = [pick.id];
          return { text: `The ${w} one in the archive is **${pick.name}** (${pick.year}). ${level() === "scientist" ? pick.deep : pick.story}`, ids: [pick.id] };
        }
      }
      const label = (types ? (types.includes("vehicle") && types.length === 1 ? "Moon cars" : types.includes("rover") ? (world === "moon" ? "Moon cars" : "rovers") : types.map(t => TYPES[t].toLowerCase() + "s").join(" and ")) : "machines")
        + (world ? (world === "deep" ? " elsewhere in the solar system" : ` on ${world === "moon" ? "the Moon" : "Mars"}`) : "")
        + (statuses ? (statuses.includes("active") ? " that are still (at least partly) awake" : ` with status “${STATUS[statuses[0]].label}”`) : "");
      set = set.sort((x, y) => x.year - y.year);
      lastIds = set.map(a => a.id);
      const head = /how many/.test(q) ? `There are **${set.length}** ${label} in the archive:` : `Here are the ${label} in the archive:`;
      return { text: head + "\n" + set.map(a => `- **${a.name}** (${a.year}): ${STATUS[a.status].label.toLowerCase()}`).join("\n"), ids: set.slice(0, 6).map(a => a.id) };
    }

    // 3. One machine
    let a = null;
    if (strong && (!second || top.s >= second.s * 1.25 || top.s >= 40)) a = top.a;
    else if (!strong && lastIds.length === 1 && intent !== "about") a = byId[lastIds[0]];           // follow-up question
    else if (strong && second && second.s >= top.s * 0.8 && second.a.mission === top.a.mission) {   // twins: answer, mention the sibling
      lastIds = [top.a.id, second.a.id];
      return { text: answerAbout(top.a, intent) + `\n\n*${second.a.name} was part of the same mission. Ask about it too!*`, ids: [top.a.id, second.a.id] };
    }
    else if (strong && second && second.s >= top.s * 0.8) {                                         // close tie: ask which
      const opts = ranked.filter(r => r.s >= top.s * 0.8).slice(0, 4).map(r => r.a);
      lastIds = opts.map(o => o.id);
      return { text: "That could be a few machines:\n" + opts.map(o => `- **${o.name}** (${WORLDS[o.world].short}, ${o.year})`).join("\n") + "\nWhich one do you mean?", ids: lastIds };
    }

    if (!a) {
      lastIds = [];
      return {
        text: `Hmm, I couldn't find that in the archive. I know about ${ARTIFACTS.length} machines on the Moon, on Mars and elsewhere in the solar system. Try asking about one of them, like **Opportunity**, **Voyager 1** or the **Apollo 11** landing site, or ask “Which landers are on Mars?”`,
        ids: ["opportunity", "voyager1", "apollo11"], unknown: true
      };
    }
    lastIds = [a.id];
    return { text: answerAbout(a, intent), ids: [a.id] };
  }

  function answerAbout(a, intent) {
    const sci = level() === "scientist";
    const name = `**${a.name}**`;
    switch (intent) {
      case "epitaph":
        if (!a.epitaph) return `${sci ? a.deep : a.story}`;
        return `${a.status === "active" ? `${name} is still working, so it doesn't have an epitaph yet. For now:` : `${name}'s epitaph:`}\n“${a.epitaph}”\n\n*Epitaphs in this archive are one-line memorials written in each machine's voice, built from real mission facts.*`
          + (a.id === "opportunity" ? `\n\nAbout her famous “last words”: “My battery is low and it's getting dark” was a journalist's summary of her final data, not a real message.` : "");
      case "ghost":
        return `*${a.name} speaking (a story voice, built from real mission facts):*\n“${a.ghost}”`;
      case "how": {
        const sum = window.Explainers && Explainers.summary(a.id);
        if (!sum) return `${sci ? a.deep : a.story}`;
        return `**${sum.title}:**\n` + sum.steps.map(t => `- ${t}`).join("\n") + `\n\n*Open the dossier below to watch it as an animation.*`;
      }
      case "dates":
        return `${name} launched on **${a.dates.launch}** and arrived on **${a.dates.arrive}**.\n- Last word / status: ${a.dates.last}.`;
      case "where": {
        const c = a.lat != null ? ` at ${Math.abs(a.lat).toFixed(2)}°${a.lat >= 0 ? "N" : "S"}, ${Math.abs(a.lon).toFixed(2)}°${a.lon >= 0 ? "E" : "W"}` : "";
        if (a.dist) return distanceText(a);
        return `${name} is ${a.world === "deep" ? "at" : "on " + (a.world === "moon" ? "the Moon" : "Mars") + ", in"} ${a.place || a.fixedPlace}${c}. Its status: **${STATUS[a.status].label.toLowerCase()}**.`;
      }
      case "distance":
        if (a.dist) return distanceText(a);
        return `${name} isn't travelling anymore: it's ${a.world === "deep" ? "at " + a.fixedPlace : "on " + (a.world === "moon" ? "the Moon, about 384,400 km from Earth" : "Mars, which is between 55 and 400 million km from Earth depending on where both planets are")}.`;
      case "status":
        return `${name}: **${STATUS[a.status].label}**. ${STATUS[a.status].desc}\n- Last word / status: ${a.dates.last}.`;
      case "discover":
        return `What ${name} discovered:\n` + a.discoveries.map(d => `- ${d}`).join("\n");
      case "why":
        return `Why ${name} matters today: ${a.legacy}`;
      case "planned":
        return `${name}\n- **The plan:** ${a.planned}\n- **What happened:** ${a.actual}`;
      case "left":
        return a.left ? `What was left behind at ${name}:\n` + a.left.map(d => `- ${d}`).join("\n") : `${sci ? a.deep : a.story}`;
      case "fun":
        return `Fun fact about ${name}: ${a.fun}`;
      case "model":
        return (typeof MODELS !== "undefined" && MODELS[a.id]) ? `Yes! ${name} has a NASA 3D model you can spin in its dossier: ${MODELS[a.id].note}` : `NASA hasn't published a 3D model of ${name}, but its dossier has photos from the NASA archive.`;
      default:
        return `${sci ? a.deep : a.story}\n\n**Fun fact:** ${a.fun}`;
    }
  }
  function distanceText(a) {
    const au = auNow(a.dist);
    return `**${a.name}** is about **${au.toFixed(0)} AU** from the Sun today (${fmtKm(au)}), heading ${a.heading.replace(/^Toward/, "toward")}. A radio signal takes about **${lightTime(au)}** to cross that distance. (This is an estimate based on its speed.)`;
  }

  /* ================= RENDERING ================= */
  function md(text) {
    const lines = esc(text).split(/\n/);
    let html = "", inList = false;
    const inline = s => s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<i>$2</i>");
    for (const raw of lines) {
      const l = raw.trim();
      if (/^[-•]\s+/.test(l)) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${inline(l.replace(/^[-•]\s+/, ""))}</li>`; continue; }
      if (inList) { html += "</ul>"; inList = false; }
      if (l) html += `<p>${inline(l)}</p>`;
    }
    if (inList) html += "</ul>";
    return html;
  }
  // Machines mentioned in an AI answer -> dossier links (longest names first).
  const NAME_INDEX = ARTIFACTS.flatMap(a => [[a.name, a.id], ...(a.nick ? [[a.nick, a.id]] : [])]).sort((x, y) => y[0].length - x[0].length);
  function mentioned(text) {
    const found = [];
    let t = " " + text.toLowerCase() + " ";
    for (const [n, id] of NAME_INDEX) {
      const key = n.toLowerCase();
      const i = t.indexOf(key);
      if (i >= 0 && !/[a-z0-9]/.test(t[i - 1]) && !/[a-z0-9]/.test(t[i + key.length])) {
        if (!found.includes(id)) found.push(id);
        t = t.slice(0, i) + " ".repeat(key.length) + t.slice(i + key.length);
      }
    }
    return found.slice(0, 5);
  }

  const log = $("#askLog");
  function addMsg(role, html) {
    const el = document.createElement("div");
    el.className = "msg " + role;
    el.innerHTML = role === "user"
      ? `<span class="avatar" aria-hidden="true">🧑‍🚀</span><div class="bubble">${html}</div>`
      : `<span class="avatar" aria-hidden="true"><img src="assets/ui/book.png" alt=""></span><div class="bubble">${html}</div>`;
    log.appendChild(el);
    el.scrollIntoView({ block: "end", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    return el;
  }
  function finishBot(el, text, ids, source) {
    const bubble = $(".bubble", el);
    bubble.innerHTML = `<span class="badge-src">${source === "ai" ? "✨ AI guide" : "📚 Archive guide"}</span>` + md(text);
    const tools = document.createElement("div");
    tools.className = "msg-tools";
    tools.innerHTML = (ids || []).filter(id => byId[id]).map(id => {
      const a = byId[id], c = cover(a);
      return `<a class="chip-link" href="index.html#artifact=${id}">${c ? `<img src="${c}" alt="">` : `<span class="ph">${TYPE_EMOJI[a.type]}</span>`}${esc(a.name)} →</a>`;
    }).join("") + `<button class="speak-btn" aria-pressed="false" type="button">🔊 Read aloud</button>`;
    bubble.appendChild(tools);
    $(".speak-btn", tools).addEventListener("click", e => speak(e.currentTarget, text.replace(/\*+/g, "").replace(/^- /gm, "")));
  }

  let speakingBtn = null;
  function speak(btn, text) {
    if (!("speechSynthesis" in window)) return;
    const stop = () => { speechSynthesis.cancel(); if (speakingBtn) speakingBtn.setAttribute("aria-pressed", "false"); speakingBtn = null; };
    if (speakingBtn === btn) return stop();
    stop();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = level() === "explorer" ? 0.92 : 1;
    u.onend = u.onerror = () => { if (speakingBtn === btn) stop(); };
    speechSynthesis.speak(u);
    speakingBtn = btn; btn.setAttribute("aria-pressed", "true");
  }

  /* ================= AI MODE ================= */
  let mode = ENDPOINT ? store.get("askMode", "ai") : "offline";
  const history = []; // {role, content} for the AI

  async function askAI(question, el) {
    history.push({ role: "user", content: question });
    const bubble = $(".bubble", el);
    let res;
    try {
      res = await fetch(ENDPOINT + "/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-12), lang: (() => { try { const l = new URLSearchParams(location.search).get("lang") || localStorage.getItem("goe:lang"); return l === "es" || l === "hi" ? l : "en"; } catch { return "en"; } })() })
      });
    } catch { history.pop(); return { failed: "network" }; }
    if (res.status === 429) { history.pop(); return { failed: "busy" }; }
    if (!res.ok || !res.body) { history.pop(); return { failed: "server" }; }

    const reader = res.body.getReader(), dec = new TextDecoder();
    let text = "", last = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      text += dec.decode(value, { stream: true });
      if (text.startsWith("\u0000ERROR")) { history.pop(); return { failed: "server" }; }
      if (performance.now() - last > 60) {
        last = performance.now();
        bubble.innerHTML = `<span class="badge-src">✨ AI guide</span>` + md(text);
        el.scrollIntoView({ block: "end" });
      }
    }
    text = text.trim();
    if (!text) { history.pop(); return { failed: "server" }; }
    history.push({ role: "assistant", content: text });
    return { text };
  }

  async function handle(question) {
    question = question.trim().slice(0, 800);
    if (!question) return;
    addMsg("user", esc(question));
    const el = addMsg("bot", `<span class="typing" aria-label="Thinking"><i></i><i></i><i></i></span>`);
    setBusy(true);
    try {
      if (mode === "ai" && ENDPOINT) {
        const r = await askAI(question, el);
        if (r.text) { finishBot(el, r.text, mentioned(r.text), "ai"); return; }
        const why = r.failed === "busy" ? "The AI guide is busy right now" : "The AI guide isn't reachable right now";
        const off = offlineAnswer(question);
        finishBot(el, off.text + `\n\n*${why}, so this answer comes from the archive guide.*`, off.ids, "offline");
        return;
      }
      await new Promise(r => setTimeout(r, 350)); // a short pause feels more natural
      const off = offlineAnswer(question);
      finishBot(el, off.text, off.ids, "offline");
    } finally {
      setBusy(false);
    }
  }

  /* ================= UI wiring ================= */
  const input = $("#askInput"), form = $("#askForm"), send = $("#askSend");
  function setBusy(b) { send.disabled = b; send.textContent = b ? "…" : "Ask"; }
  const autosize = () => { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 160) + "px"; };
  input.addEventListener("input", autosize);
  input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } });
  form.addEventListener("submit", e => { e.preventDefault(); if (send.disabled) return; const q = input.value; input.value = ""; autosize(); handle(q); });

  const SUGGESTIONS = [
    "Which machines are still working?",
    "What did Opportunity discover?",
    "Why did astronauts leave things on the Moon?",
    "How far away is Voyager 1 right now?",
    "How did Curiosity land?",
    "Which robot found ice on Mars?",
    "Talk to me as Ingenuity",
    "What is an RTG?",
    "Tell me about the last car on the Moon"
  ];
  $("#askSuggest").innerHTML = SUGGESTIONS.map(s => `<button type="button">${esc(s)}</button>`).join("");
  $$("#askSuggest button").forEach(b => b.addEventListener("click", () => { if (!send.disabled) handle(b.textContent); }));

  function renderMode() {
    const box = $("#askMode");
    if (!ENDPOINT) {
      $("#askStatus").textContent = "Answering from the site's archive (works offline, no account needed).";
      return;
    }
    box.hidden = false;
    $$("button", box).forEach(b => b.setAttribute("aria-pressed", b.dataset.mode === mode));
    $("#askStatus").textContent = mode === "ai"
      ? "The AI guide (Google Gemini) answers using this site's archive. It can make mistakes, so check the dossiers."
      : "Answering only from the site's archive, without AI.";
  }
  $$("#askMode button").forEach(b => b.addEventListener("click", () => { mode = b.dataset.mode; store.set("askMode", mode); renderMode(); }));
  renderMode();

  $("#askClear").addEventListener("click", () => {
    log.innerHTML = ""; history.length = 0; lastIds = [];
    try { speechSynthesis.cancel(); } catch { }
    greet(); input.focus();
  });

  function greet() {
    const el = addMsg("bot", "");
    finishBot(el, `Hi! I'm the Archive Guide. I know the stories of ${ARTIFACTS.length} machines that NASA left on the Moon, on Mars and across the solar system. What would you like to know?`, [], ENDPOINT && mode === "ai" ? "ai" : "offline");
  }
  greet();

  // Nav toggle (same behaviour as the main page)
  const t = $(".nav-toggle"), ul = $("#navlist");
  t.addEventListener("click", () => { const o = ul.classList.toggle("open"); t.setAttribute("aria-expanded", o); });

  // Allow ?q=... links (e.g. from a dossier) to ask a question straight away.
  const q0 = new URLSearchParams(location.search).get("q");
  if (q0) handle(q0);

  // Expose the offline engine for testing in the console.
  window.__askOffline = offlineAnswer;
})();
