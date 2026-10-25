import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdtemp, rm, mkdir, cp, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createServer} from 'node:http';
const temporary = await mkdtemp(path.join(tmpdir(), 'softgloss-browser-'));
const profile = path.join(temporary, 'profile');
const extension = path.join(temporary, 'extension');
await cp(path.resolve('extension'), extension, {recursive: true});
// Automation cannot grant activeTab through a toolbar gesture. Only the temporary
// test copy gets localhost access; the shipped manifest keeps activeTab-only access.
const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'));
manifest.host_permissions = ['http://127.0.0.1/*'];
await writeFile(path.join(extension, 'manifest.json'), JSON.stringify(manifest));
const server = createServer((req, res) => {res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end('<!doctype html><html><head><title>Reading fixture</title></head><body><p id="text">책을 읽어요. 학교에서 공부해요.</p><input id="private" value="책"><div contenteditable>먹었어요</div></body></html>');});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;
const errors = [], external = [];
let context;
async function launch() {
 context = await chromium.launchPersistentContext(profile, {channel: 'chromium', headless: true, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]});
 context.on('page', page => page.on('pageerror', e => errors.push(e.message)));
 context.on('request', req => {if (/^https?:/.test(req.url()) && !req.url().startsWith(url)) external.push(req.url());});
 let worker = context.serviceWorkers()[0];
 if (!worker) worker = await context.waitForEvent('serviceworker');
 return worker;
}
async function eventually(read, expected) {
 for (let i = 0; i < 100; i++) {
  const actual = await read();
  if (JSON.stringify(actual) === JSON.stringify(expected)) return;
  await new Promise(r => setTimeout(r, 50));
 }
 assert.deepEqual(await read(), expected);
}
try {
 let worker = await launch();
 const id = new URL(worker.url()).host;
 const page = await context.newPage(); await page.goto(url);
 const tabId = await worker.evaluate(async url => (await chrome.tabs.query({url}))[0].id, url);
 // Test-only reference to a closed shadow root, captured in the isolated world.
 await worker.evaluate(async tabId => chrome.scripting.executeScript({target: {tabId}, func: () => {
  const original = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function(options) {const root = original.call(this, options); if (this.id === 'softgloss-root') globalThis.__testRoot = root; return root;};
 }}), tabId);
 await worker.evaluate(tabId => enable({id: tabId}, true), tabId);
 async function panel(action, value = null) {
  return worker.evaluate(async ({tabId, action, value}) => {
   const [result] = await chrome.scripting.executeScript({target: {tabId}, func: (action, value) => {
    const root = globalThis.__testRoot;
    if (!root) return null;
    if (action === 'search') {root.querySelector('input[type=search]').value = value; root.querySelector('form').requestSubmit();}
    if (action === 'click') [...root.querySelectorAll('button')].find(b => b.textContent === value)?.click();
    if (action === 'status') return root.querySelector('button[data-status=known]')?.getAttribute('aria-pressed');
    if (action === 'highlight') return CSS.highlights.get('softgloss-known')?.size || 0;
    if (action === 'focus') return root.activeElement?.id;
    return root.querySelector('section').textContent;
   }, args: [action, value]});
   return result.result;
  }, {tabId, action, value});
 }
 await eventually(() => panel('focus'), 'sg-search');
 assert.match(await panel('search', '먹었어요'), /먹다/);
 assert.match(await panel('search', 'BOOK'), /책/);
 await panel('click', 'known'); await eventually(() => panel('status'), 'true');
 await eventually(() => panel('highlight'), 1);
 await page.evaluate(() => {const p = document.createElement('p'); p.textContent = '책'; document.body.append(p);});
 await eventually(() => panel('highlight'), 2);
 await panel('click', 'Disable on this page'); await eventually(() => panel('highlight'), 0);
 await worker.evaluate(tabId => enable({id: tabId}), tabId);
 await eventually(() => panel('highlight'), 2);
 assert.equal(await page.locator('#softgloss-root').count(), 1);
 const library = await context.newPage(); await library.goto(`chrome-extension://${id}/library.html`);
 await library.locator('#search').fill('학교'); await library.locator('#search-form button').click();
 await library.getByRole('button', {name: 'Mark seen', exact: true}).click();
 await eventually(() => library.locator('#stats').textContent(), '1 known · 1 seen · 0 saved sentences');
 // Real extension messaging from two library tabs tests the worker's single-writer path.
 const second = await context.newPage(); await second.goto(`chrome-extension://${id}/library.html`);
 const card = {lemma: '책', meaning: 'book', sentence: '책을 읽어요.', url};
 await Promise.all([library, second].map(p => p.evaluate(card => SGWrite({type: 'saveCard', card}), card)));
 await library.reload(); await eventually(() => library.locator('#cards article').count(), 1);
 const backup = await library.evaluate(() => chrome.storage.local.get({words: {}, cards: []}));
 const downloadPromise = library.waitForEvent('download'); await library.locator('#anki').click();
 const download = await downloadPromise; assert.equal(download.suggestedFilename(), 'softgloss-anki.tsv');
 library.once('dialog', d => d.accept()); await library.locator('#clear').click();
 await eventually(() => library.locator('#cards article').count(), 0);
 library.once('dialog', d => d.accept());
 await library.locator('#restore').setInputFiles({name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({version: 1, ...backup}))});
 await eventually(() => library.locator('#cards article').count(), 1);
 await library.locator('#restore').setInputFiles({name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"version":2}')});
 await eventually(() => library.locator('#message').textContent(), 'Restore failed: Unsupported backup.');
 assert.equal(await library.locator('#cards article').count(), 1);
 await library.setViewportSize({width: 360, height: 740});
 assert.equal(await library.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
 await mkdir('test-results', {recursive: true}); await library.screenshot({path: 'test-results/library-mobile.png', fullPage: true});
 assert.deepEqual(errors, []); assert.deepEqual(external, []);
 await context.close();
 worker = await launch();
 const restored = await context.newPage(); await restored.goto(`chrome-extension://${id}/library.html`);
 await eventually(() => restored.locator('#cards article').count(), 1);
 await eventually(() => restored.locator('#stats').textContent(), '1 known · 1 seen · 1 saved sentences');
 assert.deepEqual(errors, []); assert.deepEqual(external, []);
 console.log('PASS: unpacked extension, keyboard entry, search, status, dynamic highlights, disable/re-enable, multi-tab saves, export, backup/restore, invalid backup, narrow library and persistence. No external HTTP requests observed.');
} finally {await context?.close(); server.close(); await rm(temporary, {recursive: true, force: true});}
