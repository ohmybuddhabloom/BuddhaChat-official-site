const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const moduleUrl = pathToFileURL(path.resolve(__dirname, '../modules/masters-source/prototypes/masters-h5/src/share-link.mjs')).href;

test('Stage public reader CTA targets Stage app for articles and home fallback', async () => {
  const { appUrlForPage } = await import(moduleUrl);
  for (const destination of ['masters?content=article%3Axy-artcle67', 'l/home']) {
    assert.equal(appUrlForPage('buddhachat://'+destination, 'https://staging.buddhachat.online/masters/?content=reader%3Axy-artcle67'), 'buddhachat-staging://'+destination);
  }
});

test('production and unrelated origins preserve existing app destinations', async () => {
  const { appUrlForPage } = await import(moduleUrl);
  const link = 'buddhachat://masters?content=article%3Axy-artcle67';
  for (const page of ['https://www.buddhachat.online/masters/', 'http://127.0.0.1:4178/masters/',
    'https://staging.buddhachat.online.evil.example/', 'http://staging.buddhachat.online/',
    'https://www.buddhachat.online/?next=https://staging.buddhachat.online', 'not a url']) {
    assert.equal(appUrlForPage(link,page),link,page);
  }
});

test('web link rewrite never changes non-app URLs or public/private route policy', async () => {
  const { appUrlForPage, contentUrl, routeFromUrl } = await import(moduleUrl);
  assert.equal(appUrlForPage('https://www.buddhachat.online/download','https://staging.buddhachat.online/'), 'https://www.buddhachat.online/download');
  for (const route of ['history','favorites','following','account:me']) {
    assert.equal(new URL(contentUrl('https://staging.buddhachat.online/masters/',route)).searchParams.get('content'),'home');
    assert.equal(routeFromUrl('https://staging.buddhachat.online/masters/?content='+encodeURIComponent(route),[route,'home']),'home');
  }
});
