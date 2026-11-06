#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const ref = process.env.VERCEL_GIT_COMMIT_REF || "";
const env = process.env.VERCEL_ENV || "";

const relevantPatterns = [
  "api/",
  "public/",
  "src/",
  "index.html",
  "eslint.config",
  "package-lock.json",
  "package.json",
  "vite.config",
  "vercel-routing.test.js",
];

const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA;

if (env === "production" || ["main", "master", "production"].includes(ref)) {
  console.log(`Building ${env || "preview"} deployment for ${ref || "unknown ref"}.`);
  process.exit(1);
}

if (ref === "staging") {
  console.log("Building the automatic Staging deployment.");
  process.exit(1);
}

if (!previousSha) {
  console.log("No previous deployment SHA available; building.");
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

function isRelevant(file) {
  return relevantPatterns.some((pattern) => file === pattern || file.startsWith(pattern));
}

const files = changedFiles();
const relevant = files.filter(isRelevant);

if (relevant.length > 0) {
  console.log(`Building because relevant official-site files changed:\n${relevant.join("\n")}`);
  process.exit(1);
}

console.log(`Skipping Vercel build; changed files do not affect official site output:\n${files.join("\n")}`);
process.exit(0);
