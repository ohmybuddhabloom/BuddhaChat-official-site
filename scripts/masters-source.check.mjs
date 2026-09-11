import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, copyFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('source verification accepts matching source and rejects corruption, empty manifests and traversal', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'masters-source-test-'));
  try {
    await mkdir(path.join(root, 'scripts'));
    const source = path.join(root, 'modules/masters-source');
    await mkdir(source, { recursive: true });
    const script = path.join(root, 'scripts/build-masters-h5.mjs');
    await copyFile(new URL('./build-masters-h5.mjs', import.meta.url), script);
    const bytes = 'verified source';
    await writeFile(path.join(source, 'entry.ts'), bytes);
    const hash = createHash('sha256').update(bytes).digest('hex');
    const manifest = files => writeFile(path.join(source, 'source-manifest.json'), JSON.stringify({ files }));
    const run = () => spawnSync(process.execPath, [script, '--verify-only'], { encoding: 'utf8' });
    await manifest({ 'entry.ts': hash });
    assert.equal(run().status, 0);
    await writeFile(path.join(source, 'entry.ts'), 'changed source');
    assert.match(run().stderr, /hash mismatch/);
    await manifest({});
    assert.match(run().stderr, /Empty Masters/);
    await manifest({ '../outside': hash });
    assert.match(run().stderr, /Invalid source path/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
