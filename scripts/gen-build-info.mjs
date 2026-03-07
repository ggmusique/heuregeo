import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

function safe(cmd, fallback = "unknown") {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return fallback;
  }
}

const branch = safe("git rev-parse --abbrev-ref HEAD", "unknown");
const commit = safe("git rev-parse --short HEAD", "unknown");
// ✅ CORRECTION: Utiliser la date du dernier commit (stable) au lieu de Date.now()
const commitDate = safe("git log -1 --format=%cI", new Date().toISOString());

const info = `// AUTO-GENERATED. Do not edit by hand.
export const BUILD_INFO = {
  branch: ${JSON.stringify(branch)},
  commit: ${JSON.stringify(commit)},
  date: ${JSON.stringify(commitDate)},
};
`;

writeFileSync("src/buildInfo.js", info, "utf8");
console.log("✅ buildInfo generated:", { branch, commit, date: commitDate });