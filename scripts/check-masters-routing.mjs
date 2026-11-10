import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
for (const [source, destination] of [
  ['/masters', '/_masters/index.html'],
  ['/masters/', '/_masters/index.html'],
  ['/masters/assets/:path*', '/_masters/assets/:path*'],
  ['/masters/figures/:path*', '/_masters/figures/:path*'],
]) {
  const matches = config.rewrites.filter(route => route.source === source);
  assert.equal(matches.length, 1, source);
  assert.equal(matches[0].destination, destination, source);
  assert.ok(config.rewrites.indexOf(matches[0]) < config.rewrites.findIndex(route => route.source === '/:path*'), 'Masters must precede catch-all');
}
// main deploys only by hand (deploymentEnabled false); staging may auto-deploy itself and nothing else.
const deploys = config.git.deploymentEnabled;
assert.ok(deploys === false || (deploys && deploys['*'] === false && deploys['**'] === false && !deploys.main), 'Git pushes must never auto-deploy main');
assert.ok(config.rewrites.some(route => route.source === '/download' && route.destination === '/api/page-entry?page=download'));
assert.ok([...config.rewrites, ...(config.redirects ?? [])].some(route => route.source === '/download/android/latest.apk'), 'Android APK download path must stay reachable');
console.log('Masters route configuration passed. Does not prove source packaging or a deployed route.');
