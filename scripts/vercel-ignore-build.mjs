import { execFileSync } from "node:child_process";

const ref = process.env.VERCEL_GIT_COMMIT_REF || "";

if (process.env.VERCEL_ENV === "production" || ["main", "master", "production"].includes(ref)) {
  console.log("Build required for production/main deployment.");
  process.exit(1);
}

const watchedPaths = [
  "api/",
  "legal-site/",
  "master-router/",
  "public/",
  "scripts/",
  "src/",
  "index.html",
  "eslint.config",
  "package-lock.json",
  "package.json",
  "vite.config",
  "vercel-routing.test.js",
  "vercel.json",
];

const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA;

if (!previousSha) {
  console.log("No previous SHA available; building to stay safe.");
  process.exit(1);
}

function changedFiles() {
  try {
    return execFileSync("git", ["diff", "--name-only", "--diff-filter=ACMRTUXB", `${previousSha}...HEAD`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    console.log("Could not calculate changed files; building to stay safe.");
    process.exit(1);
  }
}

const changed = changedFiles();
const shouldBuild = changed.some((file) =>
  watchedPaths.some((path) => (path.endsWith("/") ? file.startsWith(path) : file === path || file.startsWith(path)))
);

if (shouldBuild) {
  console.log("Relevant project files changed; building.");
  process.exit(1);
}

console.log("No relevant project files changed; skipping Vercel build.");
process.exit(0);
