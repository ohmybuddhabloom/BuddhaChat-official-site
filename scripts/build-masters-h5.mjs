import { createHash } from 'node:crypto';
import { cp, mkdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'modules/masters-source');
const manifest = JSON.parse(await readFile(path.join(source, 'source-manifest.json'), 'utf8'));
for (const [relative, expected] of Object.entries(manifest.files)) {
  if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) throw new Error('Invalid source path');
  const actual = createHash('sha256').update(await readFile(path.join(source, relative))).digest('hex');
  if (actual !== expected) throw new Error(`Masters source hash mismatch: ${relative}`);
}
if (!Object.keys(manifest.files).length) throw new Error('Empty Masters source manifest');
console.log(`Verified ${Object.keys(manifest.files).length} Masters source files`);
if (!process.argv.includes('--verify-only')) {
  const cwd = path.join(source, 'prototypes/masters-h5');
  for (const args of [['ci'], ['run', 'build:public']]) {
    const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, { cwd, stdio: 'inherit', env: { ...process.env, VITE_MASTERS_APP_CONTENT_ENABLED: process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF === 'staging' ? 'true' : 'false' } });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Masters ${args.join(' ')} failed`);
  }
  const html = await readFile(path.join(cwd, 'dist-public/index.html'), 'utf8');
  if (!html.includes('/masters/assets/')) throw new Error('Masters resource base mismatch');
  await mkdir(path.join(root, 'dist'), { recursive: true });
  await cp(path.join(cwd, 'dist-public'), path.join(root, 'dist/_masters'), { recursive: true });
  console.log('Built Masters source into dist/_masters');
}
