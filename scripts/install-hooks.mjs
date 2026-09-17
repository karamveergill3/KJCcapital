import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const hooksDir = resolve(repoRoot, ".githooks");

if (!existsSync(resolve(repoRoot, ".git")) && !existsSync(resolve(repoRoot, "../.git"))) {
  process.exit(0);
}

try {
  execSync("git config core.hooksPath .githooks", { cwd: repoRoot, stdio: "inherit" });
} catch {
  process.exit(0);
}
