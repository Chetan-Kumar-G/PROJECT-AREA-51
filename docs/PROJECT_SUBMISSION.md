# Space Apps 2026 project submission: Ghosts of Exploration

Copy each section into the matching field on the Space Apps project page. Fill in or confirm the parts marked ✏️.

---

## Project name
**Ghosts of Exploration: Abandoned but not Forgotten**

## Challenge
Abandoned but not Forgotten: Storytelling about NASA's Discarded Equipment on the Moon and Mars

## Team
✏️ Team name, members and roles.

## Links
- **Live project:** https://chetan-kumar-g.github.io/PROJECT-AREA-51/
- **Code:** https://github.com/Chetan-Kumar-G/PROJECT-AREA-51
- **Pitch deck (7 slides):** https://chetan-kumar-g.github.io/PROJECT-AREA-51/pitch.html (press → to advance; print to PDF if a file is required)
- **Demo video (30 s):** ✏️ add the link after recording it with `docs/DEMO_VIDEO_SCRIPT.md`

## High-level summary
*(Space Apps asks for a short summary. This one is about 150 words.)*

Ghosts of Exploration is a free, story-driven website that introduces 8–14-year-olds to 49 machines NASA left on the Moon, on Mars and across the solar system, from Vanguard 1 (1958) to Ingenuity's final airfield. Each machine "speaks" in a first-person ghost log built from real mission facts. Kids can:
- find the machines on a map at their true coordinates;
- watch step-by-step animations of how they landed;
- compare mission photos with how the sites look today;
- spin official NASA 3D models;
- listen to real sounds recorded on Mars;
- try to land a spacecraft themselves.

Every story connects the hardware to the science it made possible. The site has two reading levels, read-aloud and a dyslexia-friendly mode. It works offline in classrooms and includes a teacher pack with lesson plans and worksheets. It turns dense mission records into a personal connection with forgotten robotic explorers.

## Project details

### What it does
- **Ghost Map (2D):** Moon and Mars maps with every machine at its real latitude and longitude, plus zoom, filters, search and a list view.
- **Dossiers:** each machine's dossier includes:
  - a first-person "ghost log" and its story at two reading levels (ages 8–11 and 12+);
  - planned vs. what really happened, mission dates and discoveries;
  - what was left behind and why it matters today;
  - NASA photos and videos.
- **How it worked:** 11 step-by-step animations that explain *how* the engineering worked:
  - landings: rocket landings, airbags, the sky crane, parachute and legs, and Ingenuity's flights;
  - impactors crashed on purpose and plunges into giant planets;
  - the Apollo laser mirror, quakes on the Moon and Mars, and gravity assists.
- **Then & now:** sliders comparing a mission photo with a later view of the same site from orbit, such as Apollo 11 (1969) and the Lunar Reconnaissance Orbiter's view (2009).
- **Beyond the Moon and Mars:** MESSENGER on Mercury, the Pioneer Venus probes, Galileo in Jupiter, Cassini in Saturn, Dawn still circling Ceres, and the Pioneers and Voyagers heading out of the solar system. Live distance estimates and signal travel times are included.
- **3D Explore:** spinnable Moon and Mars globes and a solar-system view with clickable beacons.
- **NASA 3D models:** official NASA 3D models for 22 machines, viewable in augmented reality (AR) on phones.
- **Listen:** real recordings: Mars wind, Ingenuity's blades, a marsquake, a meteoroid impact, and Apollo 15 astronauts driving on the Moon.
- **Land it yourself:** a mini-game with real Moon and Mars gravity. Kids cut the parachute and fire thrusters like Phoenix. Every crash explains what real missions did differently.
- **Ask the Archive:** a chat page that answers questions from the archive, offline and without AI. An optional mode uses Google's Gemini (an AI model) restricted to the archive's facts.
- **Teacher pack:**
  - three 45-minute lesson plans linked to NGSS standards;
  - four printable worksheets generated from the same data, with an answer key;
  - a projector quiz with team scores.

### How it works
A static website: HTML, CSS and JavaScript with no build step, hosted on GitHub Pages. All content lives in one data file (`site/js/data.js`), so the map, timeline, quiz, worksheets, 3D views and chat stay consistent.
- **3D:** Three.js and Google's `<model-viewer>`.
- **Animations:** SVG scenes driven by a small step-based player.
- **Game:** an HTML canvas physics simulation.
- **Offline:** a service worker saves the site so it works without internet.
- **Optional AI mode:** a Cloudflare Worker keeps the API key secret and limits how many questions each visitor can ask per minute.

### Who it's for and why it matters
Kids usually hear only about active missions. This project gives the "retired" machines a voice, so learners see that today's discoveries stand on the shoulders of Surveyor, Viking, Spirit, Opportunity and many others. It also shows why missions end, sometimes on purpose: Cassini and Galileo were crashed to protect moons that might hold life.

### Accessibility
- Two reading levels, four text sizes and a dyslexia-friendly spacing option.
- Read-aloud for every story and animation caption.
- Full keyboard support and alt text.
- Respects the "reduce motion" setting.
- List alternatives to the map.
- Works on phones, and offline once loaded.
- No sign-up and no tracking.

### Accuracy
Facts come from NASA mission records and the NASA Image and Video Library. Each media item keeps its NASA ID. The site corrects common myths: for example, Opportunity's "My battery is low and it's getting dark" was a journalist's summary of its final data, not a real message. Estimates (such as deep-space distances) are labelled as estimates.

### Tools, languages and services
HTML, CSS, JavaScript, SVG, Canvas, Three.js 0.160, Google model-viewer 3.5, a service worker for offline use, Python (image processing), Blender 5.1 (converting NASA's Curiosity model), Node.js, GitHub Pages, and an optional Cloudflare Worker with Google's Gemini API.

## NASA data used
- **NASA Image and Video Library:** https://images.nasa.gov
  - 68 photos and 10 videos, for example `as11-40-5903`, `AS12-48-7133`, `PIA22222`, `PIA25287`, `PIA00452`, `PIA12909`, `PIA21895`;
  - the full list of IDs is in the project README.
- **NASA 3D Resources:** https://github.com/nasa/NASA-3D-Resources
  - 16 models, including the Apollo Lunar Module, Viking, InSight, Ingenuity, Voyager, Cassini, MESSENGER and Dawn;
  - plus Curiosity, which we converted from NASA's Blender file.
- **NASA Scientific Visualization Studio, CGI Moon Kit (LRO data):** https://svs.gsfc.nasa.gov/4720
- **NASA mission pages and facts** for Apollo, Surveyor, Ranger, Viking, Mars Pathfinder, the Mars Exploration Rovers, Phoenix, InSight, Mars 2020/Ingenuity, LCROSS, GRAIL, LADEE, Pioneer, Voyager, NEAR, Deep Impact, MESSENGER, Pioneer Venus, Galileo, Cassini, Dawn and New Horizons.

## Other data and resources
- Mars, star and Earth textures: Solar System Scope (CC BY 4.0), based on NASA data.
- Badge icons: Fantasy RPG UI Kit (asset pack supplied by the team).
- Fonts: Atkinson Hyperlegible and Space Grotesk (Google Fonts).

## Use of artificial intelligence
✏️ Review this wording and make sure it matches how your team worked.

- **Building the project:** we used Claude (Anthropic), through Claude Code, as a coding and writing assistant, directed by our team. It helped:
  - write the website code;
  - draft the stories and captions from NASA mission facts;
  - process and convert NASA images and 3D models;
  - prepare these submission materials.
  
  ✏️ *Our team reviewed the facts against NASA sources.* (Keep this sentence only if it's true.)
- **In the project:** the optional "AI guide" on the Ask page uses Google's Gemini API, restricted to answering from the site's archive. The default guide on that page uses no AI.
- **No AI-generated images, video or audio** are used: all media is real NASA material.

## References
- Challenge description: "Abandoned but not Forgotten" (NASA Space Apps Challenge 2026).
- NASA Image and Video Library: https://images.nasa.gov
- NASA 3D Resources: https://github.com/nasa/NASA-3D-Resources
- NASA SVS CGI Moon Kit: https://svs.gsfc.nasa.gov/4720
- NASA, "Recommendations to Space-Faring Entities: How to Protect and Preserve the Historic and Scientific Value of U.S. Government Lunar Artifacts" (2011).
