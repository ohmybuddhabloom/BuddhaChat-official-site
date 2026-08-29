import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

for (const [name, script] of [
  ["official site", new URL("./vercel-ignore-build.mjs", import.meta.url)],
  ["legal site", new URL("../legal-site/scripts/vercel-ignore-build.mjs", import.meta.url)],
  ["master router", new URL("../master-router/scripts/vercel-ignore-build.mjs", import.meta.url)],
]) {
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
