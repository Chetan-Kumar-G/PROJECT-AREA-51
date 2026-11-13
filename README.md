# Ghosts of Exploration — *Abandoned but not Forgotten*

NASA Space Apps Challenge 2026 entry. It's an interactive story archive, for ages 8–14 and casual space fans, about the hardware NASA left on the Moon and Mars and the probes it sent into deep space.

## For the judges

- **Project description:** `docs/PROJECT_SUBMISSION.md` (ready to paste into the Space Apps project page).
- **Pitch deck:** `site/pitch.html`, live at `/pitch.html`, plus `docs/pitch-deck.pdf`.
- **30-second demo video script:** `docs/DEMO_VIDEO_SCRIPT.md`.
- **Screenshots:** `docs/screenshots/`.

## Run it

```bash
python serve.py
```
Then open http://localhost:5173. The server turns off browser caching.

**Before previewing locally**, build the language files and search-friendly pages, then the offline file list (GitHub Pages runs these automatically on every deploy). To include **3D Worlds**, also run `node scripts/build-atlas.mjs` once (needs Node 18+; the first run installs packages and downloads the ~100 MB Mars player):

```bash
node scripts/build-i18n.mjs && node scripts/build-pages.mjs && node scripts/build-sw.mjs
```

## Languages: English, Español, हिंदी

The main page has a language switcher (EN / ES / हिं). It remembers the choice and also works as a link: `index.html?lang=es` or `?lang=hi`.

- **What's translated:** menus, headings, buttons, the settings panel, every machine's story, ghost log, epitaph, fun fact and quiz clue, the Ghost Logs chapters, status labels and world names. Read-aloud uses a Spanish or Hindi voice, and the AI guide on the Ask page answers in the chosen language. The "Scientist" level text, instrument lists, dates and photo captions stay in English.
- **Editing translations:** change the JSON files in `i18n/es/` and `i18n/hi/` (`ui.json` for the interface, `m1–m3.json` for the machines), then run `node scripts/build-i18n.mjs`. It reports anything missing.
- **Review:** the Spanish and Hindi were drafted with AI help. Please have a fluent speaker check them before relying on them.

## Search engines (SEO)

The dossiers open with `#` links, which search engines barely index, so `scripts/build-pages.mjs` also writes a plain, fast page for every machine in all three languages: 147 pages in `site/machines/`, plus an index page per language ("All 49 machines", linked in the footer). Each page has its own title, description, canonical link, `hreflang` language alternates, Open Graph image (the machine's NASA photo) and schema.org structured data (Article, BreadcrumbList, educational audience, citations). The script also writes `sitemap.xml` (159 URLs with language alternates and images), `robots.txt`, and the home page's structured data (WebSite, LearningResource and an ItemList of all machines).

To get indexed faster, add the site to [Google Search Console](https://search.google.com/search-console) and submit `https://chetan-kumar-g.github.io/PROJECT-AREA-51/sitemap.xml`. (A project site's `robots.txt` is not at the domain root, so search engines find the sitemap through Search Console or the links between pages rather than through `robots.txt`.)

## Live site

https://chetan-kumar-g.github.io/PROJECT-AREA-51/

GitHub Pages publishes the `site/` folder automatically on every push to `main` that changes it, using `.github/workflows/pages.yml`. You can also re-run it by hand from the repo's **Actions** tab. `netlify.toml` is kept in case you ever want to host on Netlify instead.

## Turning on the AI guide (optional)

The Ask page works without this. The AI mode needs a tiny server to keep your Gemini API key secret, because anything inside a GitHub Pages site is public. `worker/` is that server: a free Cloudflare Worker that calls Google's Gemini API.

**What it costs:** nothing on the free tiers. A Cloudflare account is free, and Gemini API keys from Google AI Studio have a free tier with daily limits. If the limit is reached, or the AI can't be reached, the Ask page quietly answers with the built-in archive guide instead. Each visitor is limited to 10 questions a minute. Note: on Gemini's free tier, Google may use the questions it receives to improve its products, so the AI guide is told never to ask visitors for personal details.

1. Get a free API key at https://aistudio.google.com/apikey.
2. Deploy the worker:
   ```bash
   cd worker
   npm install
   npx wrangler login
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler deploy
   ```
   `wrangler secret put` asks you to paste the key; it is stored encrypted in Cloudflare, never in the repo.
3. Copy the address that `wrangler deploy` prints (like `https://ghosts-archive-guide.<you>.workers.dev`) into `site/js/ask-config.js`, then commit and push.

**Changing things:**
- Only the sites listed in `ALLOWED_ORIGINS` in `worker/wrangler.toml` can use the worker. Add your Netlify or custom domain there if you use one.
- Edited facts in `site/js/data.js`? Run `npx wrangler deploy` again. It rebuilds the AI's knowledge from `data.js` automatically, via `scripts/build-knowledge.mjs`.
- The Gemini model is `GEMINI_MODEL` in `worker/wrangler.toml` (default `gemini-flash-lite-latest`, Google's always-current Flash-Lite model, which is fast and rarely busy). If it is busy or over its free limit, the worker tries `GEMINI_FALLBACK_MODELS` next (default `gemini-flash-latest`). The answer rules are at the top of `worker/src/index.js`.

## What's inside

| Section | What it does |
|---|---|
| **Ghost Map** | Moon and Mars maps with every artifact at its real latitude and longitude. You can zoom with the + and − buttons, by double-clicking, with ctrl+scroll, or with the "Zoom to Apollo sites" and "Zoom to Jezero" presets. When zoomed in you can drag the map. Labels are spread out automatically so they don't overlap. A searchable, filterable list sits beside the map. |
| **Dossier** (slide-over) | Each machine has **Sources** (the NASA, NSSDCA, PDS and HiRISE documents its facts were checked against, linked), a **What was on board** list of instruments and parts for 16 landers, rovers and Apollo sites, **See it from orbit** links to HiRISE photos showing the hardware still on Mars, a one-line **epitaph** in its own voice (machines still working get a "not an epitaph yet" line), a first-person **Ghost Log**, a story at Explorer level (ages 8–11) or Scientist level (12+), a "planned vs. what happened" comparison, numbers, dates, discoveries, what was left behind, why it matters today, a fun fact, a NASA video, and links to the original NASA records. |
| **How it worked** (explainer animations) | 11 step-by-step animations: Apollo landing and liftoff (with each mission's own lunar module and crew), Surveyor's rocket landing (including Surveyor 3's bounces), airbag bouncing, the sky crane, parachute-and-legs landings (including what probably went wrong for Mars Polar Lander), Ingenuity's flights, crashing on purpose (Ranger, LCROSS, Deep Impact, GRAIL, the S-IVB, LADEE), laser ranging to the Moon, marsquakes and moonquakes, gravity assists, and plunges into Venus, Jupiter and Saturn (Pioneer Venus, Galileo, Cassini). Each has captions, play/pause/step controls, optional narration, and follows Reduce motion. They're in a gallery on the main page and in every matching dossier, and the Ask page uses their steps to answer "How did X land?". |
| **Ghost Logs** | 12 short story chapters you can step through with the ← → keys. Each one can be read aloud. |
| **Opportunity, up close** | A section of its own (separate from the How it worked animations): her life in 14 moments with an odometer that counts up to 45.16 km and her first-person memory of each moment, plus an Inside the rover diagram with 14 numbered parts and X-ray goggles that reveal the 6 hidden inside her body. Linked from Opportunity's and Spirit's dossiers. |
| **Timeline** | Artifacts grouped by decade from the 1960s to the 2020s, with a filter by world. |
| **Elsewhere** | Machines beyond the Moon and Mars surface: Vanguard 1 (still circling Earth), MESSENGER (Mercury), the Pioneer Venus probes and Magellan (Venus), the Mars orbiters Mariner 9, Mars Climate Orbiter and Mars Global Surveyor, Galileo (Jupiter), Cassini (Saturn), Dawn (still orbiting Ceres), NEAR (asteroid Eros), Deep Impact (comet Tempel 1), and machines circling the Sun on their own (Mariner 2 and 4, ISEE-3, Kepler, Spitzer, Stardust), plus a log-scale ruler of Pioneer 10/11, Voyager 1/2 and New Horizons at *estimated* distances for today's date. |
| **Then & now** | Drag a slider between a mission photo and a later view of the same place: Apollo 11, Apollo 12/Surveyor 3, Surveyor 1, Phoenix and InSight. Also shown in those dossiers. |
| **Listen** | 7 real recordings, streamed from NASA videos: Mars wind, Ingenuity's blades, Perseverance's "puff, whir, zap", how sound changes on Mars, a marsquake, a meteoroid impact and Apollo 15 astronauts driving. |
| **Land it yourself** (`lander.html`) | A landing game with three levels (Moon, Mars, Jezero crater) using each world's real gravity. Every crash explains what real missions did. Works with keyboard or touch. |
| **Teacher pack** (`teacher.html`) | Three 45-minute lesson plans linked to NGSS standards, four printable worksheets generated from the archive data, an answer key, and a projector quiz with team scores. |
| **Offline & install** | A service worker saves the site, so it works without internet once loaded, and it can be installed as an app. Videos and sounds still need internet. |
| **Who Am I? quiz** | 8 random clue questions. |
| **Archive** | All NASA photos with their NASA IDs, the "Listen" sounds and 6 NASA videos. |
| **Explorer Passport** | 8 badges, saved in localStorage. The badge art comes from your Fantasy RPG UI Kit. |
| **Ask the Archive** (`ask.html`) | A chat page for questions about any machine. It works straight away with a built-in "archive guide" that searches the site's own data, with no account and no cost. It also has 22 hand-written answers to common questions, mostly about Opportunity (her computer, cameras, how she stayed warm, the "battery is low" myth and more). If you deploy the optional AI worker, it switches to Claude, with streaming answers grounded in the same archive. Every dossier has an "Ask about…" button. |
| **NASA 3D models** | 22 machines have a "🧊 View 3D model" button, both in their dossier and in 3D Explore. You can spin and zoom the official NASA model, and phones get "View in your space" (AR). Models are listed below. |
| **3D Explore** (`explore.html`) | Moon and Mars globes you can spin, with clickable beacons. A Deep Space scene shows the Sun, the planet orbits, the heliopause and each probe's direction and distance. It works on phones too. The optional **🪐 NASA JPL** button (Elsewhere view) moves the planets to where they really are today, from NASA JPL's orbital elements, and loads detailed planet maps. It is off by default so the page loads fast. |
| **NASA Eyes** (`eyes.html`) | NASA/JPL's Eyes on the Solar System embedded: every machine at its key moment (or today), worlds, a date picker, 14 guided NASA/JPL stories and all of Eyes' embed options. Each dossier also has a tap-to-load "Fly there in NASA Eyes" view. |
| **3D Worlds** (`atlas/`, by GuruPrasannaa Manikandan) | Our teammate's app, built into the site: walk the six Apollo sites on measured terrain, explore eight Mars landing sites in a Unity player, relive Apollo 11 and Opportunity, and tour the Solar System. Buttons on the home page, in dossiers and in 3D Explore switch straight to one feature; "← Ghosts of Exploration" comes back. See `atlas/README-GHOSTS.md`. |
| **Adopt a Ghost** (`adopt.html`) | Pick any of the 49 machines, add a name, and print an A4 adoption certificate with its NASA photo, epitaph, resting place, status and a fun fact. "My whole class" takes a list of names and prints one certificate each, every student with a different machine. English, Spanish and Hindi; names never leave the browser. Each dossier has an "Adopt this ghost" button. |

**Accessibility:** Atkinson Hyperlegible font, 4 text sizes, a dyslexia-friendly spacing option, a reduce-motion toggle (it also follows the OS setting), read-aloud through the browser's speech synthesis, full keyboard support (Esc and Tab are trapped inside dialogs), and alt text and ARIA labels. A list view gives the same information as the map.

**Accuracy:** the ghost logs are written in the first person, but every fact comes from NASA mission records. Myths are corrected on the page. For example, Opportunity's "my battery is low" line is labelled as a journalist's paraphrase, and Surveyor 3's "bacteria" story is labelled as likely contamination.

## Files
```
site/
  index.html        2D site
  explore.html      3D mode
  css/style.css, css/explore.css
  js/data.js        ← ALL artifact content (edit facts/stories here)
  js/app.js         2D logic
  js/explore.js     3D logic (Three.js 0.160)
  assets/nasa/      54 NASA images (resized to ≤1400px), named by NASA ID
  assets/maps/      moon.jpg (NASA SVS), mars.jpg, stars.jpg, earth.jpg (Solar System Scope, CC BY 4.0)
  assets/ui/        badge icons cut out from Fantasy_Rpg_UI_Kit
  assets/models/    12 NASA GLB models (~19 MB), from NASA 3D Resources
  js/explainers.js  "How it worked" animations: the player and all 11 scenes (SVG). The FOR table maps each machine to its animations.
  lander.html, js/lander.js, css/lander.css   "Land it yourself" game
  teacher.html, js/teacher.js, css/teacher.css   teacher pack (worksheets print cleanly)
  pitch.html        7-slide pitch deck (← → keys; print to PDF)
  manifest.webmanifest, sw.js, js/pwa.js   install + offline (sw.js is generated by scripts/build-sw.mjs)
  js/models.js      shared 3D model viewer (Google <model-viewer> 3.5.0, loaded only on first use)
  ask.html, js/ask.js   Ask the Archive chat (offline guide + optional AI)
  js/ask-config.js  where the AI worker's address goes
worker/             optional Cloudflare Worker that talks to Gemini and keeps the API key secret
scripts/build-knowledge.mjs   turns site/js/data.js into the AI's knowledge file
scripts/build-sw.mjs        rebuilds the offline file list in site/sw.js
docs/                        judging materials: project description, demo script, pitch PDF, screenshots
```

## NASA 3D models (github.com/nasa/NASA-3D-Resources)

| File | Used for |
|---|---|
| apollo-lm.glb | Apollo 11, 12, 14 (the lunar module; only its descent stage stayed) |
| saturn-v.glb | Apollo 16 S-IVB stage |
| viking-lander.glb | Viking 1 and 2 |
| mer.glb | Spirit and Opportunity (a simple, low-detail model) |
| insight.glb | InSight (arm deployed) |
| ingenuity.glb | Ingenuity |
| ladee.glb | LADEE |
| pioneer.glb | Pioneer 10 and 11 |
| voyager.glb | Voyager 1 and 2 |
| near.glb | NEAR Shoemaker |
| deep-impact.glb | Deep Impact |
| curiosity.glb | Curiosity. I converted it from NASA's `.blend` file with Blender 5.1, removing the helper boxes, the floor plane and the camera-marker cubes. Its mast is shown folded down. |

NASA doesn't publish models of the Lunar Roving Vehicle, Surveyor, Ranger, Sojourner/Pathfinder, Phoenix, GRAIL or LCROSS. To add a model, put the `.glb` in `assets/models/` and add a line to `MODELS` in `js/data.js`.
To add an artifact, add an object to `ARTIFACTS` in `js/data.js`. The map, list, timeline, quiz, 3D view and badges all pick it up automatically.

## NASA media used (images.nasa.gov)

**Moon:** PIA02975 (Ranger 7), PIA12910 (Surveyor 1 from LRO), AS12-48-7133 (Surveyor 3 + Apollo 12), PIA12903, as11-40-5948 / 5903 / 5875 (Apollo 11), as14-66-9337 (golf ball), as15-86-11603 (LRV-1), as16-113-18339 (Apollo 16), as17-137-20979 / as17-147-22548 / as17-152-23272 (Apollo 17), GSFC_20171208_Archive_e000501 (S-IVB crater), ARC-2009-ACD09-0220-126 (LCROSS), PIA16493 (GRAIL).

**Mars:** PIA00563 / PIA00565 / PIA00567 (Viking 1), PIA00573 (Viking 2), PIA01121 / PIA01551 (Pathfinder and Sojourner), PIA04016 (Polar Lander), PIA12203 / PIA12337 / PIA05040 (Spirit), PIA22222 / PIA16120 / PIA22329 / PIA22908 (Opportunity), PIA10906 / PIA10701 / PIA22223 (Phoenix), PIA25287 / PIA22956 / PIA25680 (InSight), PIA26244 / PIA26236 / PIA26482 (Ingenuity), PIA25218 (backshell), PIA16239 (Curiosity).

**Deep space:** ARC-1972-AC72-2135 (Pioneer 10), ARC-1974-A74-9030-1 (Pioneer 11), PIA00452 (Pale Blue Dot), PIA14113 (Golden Record), PIA17049 (Voyager), PIA02473 (Eros), PIA02137 (Tempel 1), PIA20200 (Pluto).

**Videos (streamed):** Apollo 11 Restored Moonwalk; *Apollo 15: Never Been on a Ride like this Before*; *Mars Report: Ingenuity*; *First Likely Marsquake Heard by InSight*; *InSight Captures Sound of a Meteoroid*; *Voyager 1 Team Reacts to Receiving Engineering Data*.

## Credits
- Photos and videos: NASA Image and Video Library (public domain; NASA does not endorse this project).
- Moon texture: NASA Scientific Visualization Studio, CGI Moon Kit (LRO LROC).
- Mars, star, Earth, Sun and planet textures: Solar System Scope (CC BY 4.0), based on NASA mission data.
- Planet positions (NASA JPL mode): JPL Solar System Dynamics, *Approximate Positions of the Planets* (E. M. Standish).
- Badge art: Fantasy RPG UI Kit (supplied asset pack).
- 3D models: NASA 3D Resources (public domain).
- Opportunity, up close (`site/js/oppy-data.js`): her 14 milestones, memories and rover parts adapted from the mission history and X-ray view in Chetan Kumar G's project (below), checked against NASA/JPL records. The rover drawing is our own.
- Ask's 22 short answers about Opportunity and Mars: adapted from ASTRA's answers in Chetan Kumar G's project (below), checked against NASA/JPL Mars Exploration Rover records.
- Sources, instrument lists and HiRISE hardware locations (`site/js/records.js`, plus the **Sources** page `sources.html`): imported from the Cosmic-Atlas mission catalogue by GuruPrasannaa Manikandan, which cites NASA, NSSDCA, PDS, LROC and HiRISE documents.
- Stories for Vanguard 1, Lunar Prospector, Magellan, Mariner 2, 4 and 9, Mars Climate Orbiter, Mars Global Surveyor, ISEE-3, Kepler, Spitzer and Stardust: adapted from "The Silent Fleet" in [Abandoned, But Not Forgotten](https://agneay-community-hub.github.io/AbandonedNotForgotten/) by Chetan Kumar G, checked against NASA mission records.
- 3D: Three.js (MIT) and Google model-viewer (Apache 2.0).
- **3D Worlds** (`atlas/`): the frontend of [Abandoned but Not Forgotten](https://github.com/Agneay-Community-Hub/Abandoned-But-Not-Forgotten) by our teammate GuruPrasannaa Manikandan (MIT licence), copied from commit `129fcb6` with small changes so it runs inside this site (listed in `atlas/README-GHOSTS.md`).
- Live 3D solar system: NASA's Eyes on the Solar System (NASA/JPL-Caltech), embedded as NASA allows.
