import { rename, readFile } from 'node:fs/promises';
const output = new URL('../dist-public/', import.meta.url);
const source = new URL('public-web.html', output);
const html = await readFile(source, 'utf8');
if (!html.includes('/masters/assets/')) throw new Error('Public build must keep resources under /masters/assets/');
await rename(source, new URL('index.html', output));
console.log('Prepared dist-public/index.html for /masters/ hosting. No deployment performed.');
