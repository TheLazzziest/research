import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const pkg = path.join(root, "node_modules", "skills");
const cli = path.join(pkg, "dist", "cli.mjs");

if (!existsSync(cli)) {
  console.log("apply-patches: 'skills' not installed; skip");
  process.exit(0);
}

if (readFileSync(cli, "utf8").includes("async function runSyncExternal")) {
  console.log("apply-patches: already applied; skip");
  process.exit(0);
}

// Bun hardlinks package files from its global cache. Break the link so we edit
// only the node_modules copy, not the shared cache.
const tmp = `${cli}.patchtmp`;
writeFileSync(tmp, readFileSync(cli));
renameSync(tmp, cli);

const dir = path.join(root, "patches", "skills");
const files = readdirSync(dir).filter((f) => f.endsWith(".patch")).sort();

for (const file of files) {
  execFileSync("patch", ["-p1", "-N", "-s", "-i", path.join(dir, file)], {
    cwd: pkg,
    stdio: "inherit",
  });
  console.log(`applied ${file}`);
}

console.log(`apply-patches: ${files.length} patch(es) applied`);
