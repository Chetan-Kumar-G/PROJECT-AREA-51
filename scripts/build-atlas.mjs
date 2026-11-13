// Builds "3D Worlds" (Prasanna's app in atlas/) into site/atlas/.
// Run from the repo root:  node scripts/build-atlas.mjs
// First run installs its packages and downloads the ~100 MB Mars Unity player into atlas/unity-cache/ (both git-ignored).
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const atlas = join(dirname(fileURLToPath(import.meta.url)), "..", "atlas");
const run = cmd => execSync(cmd, { cwd: atlas, stdio: "inherit" });

if (!existsSync(join(atlas, "node_modules"))) run("npm ci --no-audit --no-fund");
run("npm run build"); // fetch the pinned Unity player if needed, type-check, then vite build → site/atlas/
console.log("Built 3D Worlds into site/atlas/");
