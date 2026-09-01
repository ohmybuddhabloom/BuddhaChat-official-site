import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

for (const [name, script, output] of [
  ["official site", new URL("./vercel-ignore-build.mjs", import.meta.url), /backend-requested Staging deployment/],
  ["legal site", new URL("../legal-site/scripts/vercel-ignore-build.mjs", import.meta.url), /No previous SHA available/],
  ["master router", new URL("../master-router/scripts/vercel-ignore-build.mjs", import.meta.url), /No previous SHA available/],
]) {
  test(`${name} builds a backend-requested staging deployment`, () => {
    const result = spawnSync(process.execPath, [script.pathname], {
      encoding: "utf8",
      env: {
        PATH: process.env.PATH,
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_REF: "staging",
      },
    });

    assert.equal(result.status, 1);
    assert.match(result.stdout, output);
  });
}
