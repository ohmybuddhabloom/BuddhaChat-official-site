#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const ref = process.env.VERCEL_GIT_COMMIT_REF || "";
const env = process.env.VERCEL_ENV || "";
const base = process.env.VERCEL_GIT_PREVIOUS_SHA || "HEAD^";

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

function changedFiles() {
  try {
    return execFileSync("git", ["diff", "--name-only", base, "HEAD"], {
      encoding: "utf8",
    })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    process.stderr.write("No previous deployment SHA available; building.\n");
    process.exit(1);
  }
}

function isRelevant(file) {
  return relevantPatterns.some((pattern) => file === pattern || file.startsWith(pattern));
}

if (env === "production" || ref === "main" || ref === "master") {
  process.stderr.write(`Building ${env || "preview"} deployment for ${ref || "unknown ref"}.\n`);
  process.exit(1);
}

const files = changedFiles();
const relevant = files.filter(isRelevant);

if (relevant.length > 0) {
  process.stderr.write(`Building because relevant files changed:\n${relevant.join("\n")}\n`);
  process.exit(1);
}

process.stderr.write(`Skipping Vercel build; changed files do not affect official site output:\n${files.join("\n")}\n`);
process.exit(0);
