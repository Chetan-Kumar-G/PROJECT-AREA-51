# 3D Worlds (atlas/)

This folder is the frontend of **Abandoned but Not Forgotten**, by our teammate **GuruPrasannaa Manikandan**
(https://github.com/Agneay-Community-Hub/Abandoned-But-Not-Forgotten, MIT licence, see `LICENSE`).
It was copied from commit `129fcb6` (12 Nov 2026) so both projects ship as one website.

It is built into `site/atlas/` and appears on the main site as **3D Worlds**: walk the six Apollo sites, explore eight
Mars landing sites, relive Apollo 11 and Opportunity, tour the Solar System.

## Build

```bash
node scripts/build-atlas.mjs
```

The first run installs packages and downloads the pinned Mars Unity player (~100 MB, from the
`Abandoned-But-Not-Forgotten-Assets` release) into `atlas/unity-cache/`. `site/atlas/`, `atlas/node_modules/` and
`atlas/unity-cache/` are git-ignored; GitHub Pages builds them on every deploy (`.github/workflows/pages.yml`).

The backend (`/api`, live JPL Horizons comparison) is not part of the static site. That one feature reports it is
unavailable; everything else works.

## What we changed

Only four things, so updates from the original repo are easy to bring in:

1. **`vite.config.ts`**: builds into `../site/atlas` with a relative base, keeps the Unity player in `unity-cache/`,
   and rewrites the source's root paths (`'/assets/…'`, `` `/unity/…` ``) at build time so it runs from a sub-folder.
2. **`unity-player.json`**: `dir` points at `unity-cache/`.
3. **`src/embed/ghosts.ts`** (new) and one import in **`src/main.tsx`**: links such as
   `atlas/index.html?go=site&id=tranquility-base` open one feature directly (using the same calls as the app's own
   Home buttons), and a "← Ghosts of Exploration" button returns to the page you came from.
4. **`src/mars/marsBridge.ts`** (one line in `startMars`): passes the Unity player the real address of `mars-sites/`,
   also for the Victoria scene (with an empty site id), because the player otherwise looks for it at the site root.

Deep-link values: `go=site&id=` any Moon or Mars site id (`tranquility-base`, `apollo-12` … `apollo-17`,
`victoria-crater`, `mars-viking-1`, `mars-viking-2`, `mars-pathfinder`, `mars-spirit`, `mars-phoenix`, `mars-curiosity`, `mars-insight`; the `mars-` prefix may be left out);
`go=relive&id=apollo-11|mer-opportunity`; `go=solar`; `go=tour`; `go=missions`; `go=journey&id=moon|mars`.
The main site's buttons are in `site/js/atlas-links.js`.

## Updating from the original repo

Copy the new `frontend/` files over this folder (not `node_modules` or `dist`), then re-apply the four changes above
(`git diff` shows them) and run the build.
