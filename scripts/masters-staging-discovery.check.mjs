import test from 'node:test';
import assert from 'node:assert/strict';
import { peopleForStagingPreview } from '../modules/masters-source/prototypes/masters-h5/src/staging-people.mjs';

const people = [
  { id: 'yuanhui', hidden: true, portrait: 'yuanhui.jpg' },
  { id: 'sheng-yen', portrait: 'shengyen.jpg' },
  { id: 'yin-shun', hidden: true, portrait: '' },
];
const url = 'https://bjswjgadnariutxibsfh.supabase.co';

test('designated staging preview exposes Yin Shun and preserves canonical/adjacent people', () => {
  const result = peopleForStagingPreview(people, 'true', url);
  assert.deepEqual(result.filter(person => !person.hidden).map(person => person.id), ['sheng-yen', 'yin-shun']);
  assert.equal(result[0], people[0]);
  assert.equal(result[1], people[1]);
  assert.equal(people[2].hidden, true);
  assert.equal(people[2].portrait, '');
  assert.match(result[2].portrait, /^\/masters\/figures\/yinshun\/portrait-[a-f0-9]{64}\.jpg$/);
});

test('production/default builds and wrong database targets retain hidden discovery', () => {
  for (const enabled of [undefined, 'false', '', true]) assert.equal(peopleForStagingPreview(people, enabled, url), people);
  for (const target of [undefined, '', 'not a url', 'https://xqibxlpzghveyqemprjr.supabase.co', 'http://bjswjgadnariutxibsfh.supabase.co', url + '.evil.example', url + '/rest/v1', url + '?next=staging', url + '#staging', 'https://user:pass@bjswjgadnariutxibsfh.supabase.co']) assert.equal(peopleForStagingPreview(people, 'true', target), people, target);
  assert.equal(peopleForStagingPreview(people, 'true', url + '/')[2].hidden, false);
});
