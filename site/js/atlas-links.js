/* ===========================================================
   Links into "3D Worlds" (site/atlas/): Prasanna's walkable Moon and
   Mars landing sites, mission replays and Solar System, built from
   atlas/ (see atlas/README-GHOSTS.md). Each button switches the page
   to his app at one feature; his app shows "← Ghosts of Exploration"
   to come back to where you were.
   =========================================================== */
const ATLAS_SITES = {
  apollo11: "tranquility-base", apollo12: "apollo-12", apollo14: "apollo-14", apollo15: "apollo-15",
  apollo16: "apollo-16", apollo17: "apollo-17",
  viking1: "mars-viking-1", viking2: "mars-viking-2", pathfinder: "mars-pathfinder", sojourner: "mars-pathfinder",
  spirit: "mars-spirit", opportunity: "victoria-crater", phoenix: "mars-phoenix", curiosity: "mars-curiosity", insight: "mars-insight"
};
const ATLAS_RELIVE = { apollo11: "apollo-11", opportunity: "mer-opportunity" };

// go: site | relive | solar | tour | missions | journey (see atlas/src/embed/ghosts.ts)
function atlasURL(go, id) {
  const base = new URL(location.pathname.includes("/machines/") ? "../atlas/index.html" : "atlas/index.html", location.href);
  if (go) base.searchParams.set("go", go);
  if (id) base.searchParams.set("id", id);
  base.searchParams.set("from", location.pathname + location.search + location.hash);
  return base.href;
}

// <a data-atlas="site:tranquility-base">: fill in the address when clicked, so "from" is the current page
document.addEventListener("click", e => {
  const a = e.target.closest("a[data-atlas]");
  if (!a) return;
  const [go, id] = a.dataset.atlas.split(":");
  a.href = atlasURL(go, id);
});
