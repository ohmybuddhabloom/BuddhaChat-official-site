import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
for (const [source, destination] of [
  ['/masters', '/_masters/index.html'],
  ['/masters/', '/_masters/index.html'],
  ['/masters/assets/:path*', '/_masters/assets/:path*'],
]) {
  const matches = config.rewrites.filter(route => route.source === source);
  assert.equal(matches.length, 1, source);
  assert.equal(matches[0].destination, destination, source);
  assert.ok(config.rewrites.indexOf(matches[0]) < config.rewrites.findIndex(route => route.source === '/:path*'), 'Masters must precede catch-all');
}
assert.equal(config.git.deploymentEnabled, false);
assert.ok(config.rewrites.some(route => route.source === '/download' && route.destination === '/api/page-entry?page=download'));
assert.ok(config.redirects.some(route => route.source === '/download/android/latest.apk' && route.destination === 'https://music.buddhachat.online/apk/BuddhaChat-latest.apk'));
console.log('Masters route configuration passed. Does not prove source packaging or a deployed route.');
