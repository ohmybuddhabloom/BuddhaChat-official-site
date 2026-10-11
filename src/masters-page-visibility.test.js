import { test } from 'vitest';
import assert from 'node:assert/strict';
import * as policy from '../modules/masters-source/shared/masters/pageVisibility';
import * as canonical from '../modules/masters-source/shared/masters/people';
import { peopleForStagingPreview } from '../modules/masters-source/prototypes/masters-h5/src/staging-people.mjs';
test('public Masters page excludes Yuanhui without deleting canonical content or other people', () => {
  assert.ok(canonical.people.some(p => p.id === 'yuanhui'));
  assert.ok(!policy.mastersPagePeople.some(p => p.id === 'yuanhui'));
  assert.deepEqual(policy.mastersPagePeople, canonical.people.filter(p => p.id !== 'yuanhui'));
  assert.equal(policy.mastersPageRoute({ kind: 'person', id: 'yuanhui' }).kind, 'home');
  const other = { kind: 'person', id: 'sheng-yen' };
  assert.equal(policy.mastersPageRoute(other), other);
});
test('existing Staging Yin Shun discovery overlay still operates after the page exclusion', () => {
  const staged = peopleForStagingPreview(policy.mastersPagePeople, 'true', 'https://bjswjgadnariutxibsfh.supabase.co');
  assert.ok(!staged.some(p => p.id === 'yuanhui'));
  assert.equal(staged.find(p => p.id === 'yin-shun').hidden, false);
  assert.ok(staged.some(p => p.id === 'lou-yulie'));
});
