import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { matchesGlob } from "node:path";
import { test } from "node:test";

for (const [name, script, config] of [
  ["official site", new URL("./vercel-ignore-build.mjs", import.meta.url), new URL("../vercel.json", import.meta.url)],
  ["legal site", new URL("../legal-site/scripts/vercel-ignore-build.mjs", import.meta.url), new URL("../legal-site/vercel.json", import.meta.url)],
  ["master router", new URL("../master-router/scripts/vercel-ignore-build.mjs", import.meta.url), new URL("../master-router/vercel.json", import.meta.url)],
]) {
  test(`${name} enables Git deployment only for staging`, () => {
    const deploymentEnabled = JSON.parse(readFileSync(config, "utf8")).git?.deploymentEnabled;

    assert.deepEqual(deploymentEnabled, { staging: true, "*": false, "**": false });
    // Vercel: unmatched defaults true; any matching true wins. '*' excludes '/'.
    // https://vercel.com/docs/project-configuration/git-configuration
    const deploys = (branch) => {
      const matches = Object.entries(deploymentEnabled).filter(([pattern]) => matchesGlob(branch, pattern));
      return matches.length === 0 || matches.some(([, enabled]) => enabled);
    };
    assert.equal(matchesGlob('codex/a/b', '*'), false);
    assert.equal(matchesGlob('codex/a/b', '**'), true);
    assert.equal(deploys('staging'), true);
    for (const branch of ['main', 'production', 'feature', 'codex/a', 'codex/a/b', 'release/2026/09', 'staging/nested']) {
      assert.equal(deploys(branch), false, `${branch} must not auto-deploy`);
    }
  });

  test(`${name} always builds the staging branch`, () => {
    const result = spawnSync(process.execPath, [script.pathname], {
      encoding: "utf8",
      env: {
        PATH: process.env.PATH,
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_REF: "staging",
      },
    });

    assert.equal(result.status, 1);
    assert.match(result.stdout, /automatic Staging deployment/);
  });
}
