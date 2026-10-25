import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdtemp, rm, mkdir, cp, readFile, writeFile} from 'node:fs/promises';
import os, {tmpdir} from 'node:os';
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
 const cdp = await context.newCDPSession(page); await cdp.send('Performance.enable');
 const heapBefore = (await cdp.send('Performance.getMetrics')).metrics.find(m=>m.name==='JSHeapUsedSize')?.value;
 const tabId = await worker.evaluate(async url => (await chrome.tabs.query({url}))[0].id, url);
 // Test-only reference to a closed shadow root, captured in the isolated world.
 await worker.evaluate(async tabId => chrome.scripting.executeScript({target: {tabId}, func: () => {
  const original = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function(options) {const root = original.call(this, options); if (this.id === 'softgloss-root') globalThis.__testRoot = root; return root;};
 }}), tabId);
 const coldStart = performance.now();
 await worker.evaluate(tabId => enable({id: tabId}, true), tabId);
 const injectionMilliseconds = performance.now()-coldStart;
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
    if (action === 'hasFocus') return Boolean(root.activeElement);
    if (action === 'searchValue') return root.querySelector('input[type=search]').value;
    if (action === 'hidden') return root.querySelector('section').hidden;
    if (action === 'grammarOpen') return [...root.querySelectorAll('.sg-grammar, .sg-grammar details')].map(d=>d.open);
    if (action === 'expandGrammar') root.querySelector('.sg-grammar summary')?.click();
    return root.querySelector('section').textContent;
   }, args: [action, value]});
   return result.result;
  }, {tabId, action, value});
 }
 await eventually(() => panel('focus'), 'sg-search');
 assert.match(await panel('search', '먹었어요'), /먹다/);
 assert.match(await panel('search', '걸었어요'), /걷다/);
 assert.match(await panel('search', '다루면서'), /다루다/);
 assert.match(await panel('search', '중단하는'), /중단하다/);
 assert.match(await panel('search', '인기글'), /Possible noun compound/);
 assert.match(await panel('search', '반영된'), /Possible derived predicate/);
 assert.match(await panel('search', '배'), /pear/);
 assert.match(await panel('search', '배'), /boat/);
 assert.match(await panel('search', '병원'), /Wiktionary contributors/);
 assert.match(await panel('search', '책을'), /Grammar hint/);
 assert.match(await panel('search', '책을'), /Explain and show an example/);
 assert.deepEqual(await panel('grammarOpen'), [false,false]);
 await panel('expandGrammar');
 assert.deepEqual(await panel('grammarOpen'), [true,false]);
 assert.match(await panel('search','기업들의'),/기업/);
 assert.match(await panel('search','끌어모으려는'),/끌어모으다/);
 assert.match(await panel('search','무슨성역이냐'),/성역/);
 assert.match(await panel('search','보이지 않는다'),/Negation/);
 assert.match(await panel('search','할 수 있다'),/Ability \/ possibility/);
 await mkdir('test-results',{recursive:true});
 await page.screenshot({path:'test-results/panel-phrase.png'});
 await page.setViewportSize({width:360,height:740});
 await page.screenshot({path:'test-results/panel-phrase-mobile.png'});
 await page.setViewportSize({width:1280,height:720});
 assert.match(await panel('search', 'BOOK'), /책/);
 await panel('click', 'known'); await eventually(() => panel('status'), 'true');
 await eventually(() => panel('highlight'), 1);
 await page.evaluate(()=>{document.body.style.background='#121212';document.body.style.color='#fff';});
 assert.equal(await page.evaluate(()=>getComputedStyle(document.body,'::highlight(softgloss-known)').color),'rgb(35, 35, 35)','vocabulary highlights must stay readable on dark pages');
 await panel('search','책을');await page.screenshot({path:'test-results/panel-dark-page.png'});
 await page.evaluate(()=>{document.body.style.background='';document.body.style.color='';});
 await page.evaluate(() => {const p = document.createElement('p'); p.textContent = '책'; document.body.append(p);});
 await eventually(() => panel('highlight'), 2);
 await panel('click', 'Disable on this page'); await eventually(() => panel('highlight'), 0);
 await worker.evaluate(tabId => enable({id: tabId}), tabId);
 await eventually(() => panel('highlight'), 2);
 assert.equal(await page.locator('#softgloss-root').count(), 1);

 // Real mouse coordinates and DOM selections exercise the reading entry points.
 await worker.evaluate(tabId => enable({id:tabId},true),tabId);
 await eventually(()=>panel('focus'),'sg-search');
 await panel('click', 'Close');
 assert.equal(await panel('hasFocus'), false);
 const point = await page.evaluate(() => {
  const text = document.getElementById('text').firstChild; const r=document.createRange(); r.setStart(text,0);r.setEnd(text,2);
  const b=r.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};
 });
 await page.mouse.move(point.x, point.y);
 await eventually(()=>panel('searchValue'),'책을');
 const stable=await panel('searchValue');
 await page.mouse.move(600,point.y); await page.waitForTimeout(350);
 assert.equal(await panel('searchValue'),stable,'blank space must not look up the nearest word');
 await panel('click','Close');
 await page.evaluate(()=>{
  const node=document.getElementById('text').firstChild;const r=document.createRange();r.setStart(node,3);r.setEnd(node,6);const s=getSelection();s.removeAllRanges();s.addRange(r);
  document.getElementById('text').dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
 });
 await eventually(()=>panel('searchValue'),'읽어요');
 await page.locator('#private').fill('학교');
 await page.mouse.move(10,10); await page.locator('#private').hover();await page.waitForTimeout(350);
 assert.equal(await panel('searchValue'),'읽어요','editable input must not trigger lookup');
 await page.evaluate(()=>{const p=document.createElement('p');p.id='phrase';p.append(Object.assign(document.createElement('span'),{textContent:'보이지'}),document.createTextNode(' '),Object.assign(document.createElement('span'),{textContent:'않는다'}));document.body.append(p);const range=document.createRange();range.setStart(p.firstChild.firstChild,0);range.setEnd(p.lastChild.firstChild,3);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);p.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));});
 await eventually(()=>panel('searchValue'),'보이지 않는다');
 assert.match(await panel('text'),/Negation/);
 await panel('click','Save sentence');
 await eventually(()=>worker.evaluate(async()=>{const {cards=[]}=await chrome.storage.local.get('cards');return cards.some(c=>c.lemma==='보이다'&&c.sentence==='보이지 않는다');}),true);
 await worker.evaluate(async()=>{const {cards=[]}=await chrome.storage.local.get('cards');for(const card of cards)await store.apply({type:'deleteCard',card});});
 await page.evaluate(()=>{getSelection().removeAllRanges();document.getElementById('phrase').remove();});
 await panel('click','Close');
 const heapAfter = (await cdp.send('Performance.getMetrics')).metrics.find(m=>m.name==='JSHeapUsedSize')?.value;
 await page.evaluate(()=>{
  window.__sgFrameGaps=[];window.__sgLongTasks=[];window.__sgProfileRunning=true;
  let previous=performance.now();function tick(now){if(!window.__sgProfileRunning)return;window.__sgFrameGaps.push(now-previous);previous=now;requestAnimationFrame(tick);}requestAnimationFrame(tick);
  window.__sgObserver=new PerformanceObserver(list=>window.__sgLongTasks.push(...list.getEntries().map(e=>e.duration)));
  window.__sgObserver.observe({type:'longtask',buffered:false});
  const container=document.createElement('div');container.id='long-reading';const fragment=document.createDocumentFragment();
  for(let i=0;i<2000;i++){const p=document.createElement('p');p.textContent='책 학교에서 읽어요.';fragment.append(p);}container.append(fragment);document.body.append(container);
 });
 const scanStart=performance.now();
 await eventually(()=>panel('highlight'),2002);
 const rescanMilliseconds=performance.now()-scanStart;
 await page.waitForTimeout(1500);
 const responsiveness=await page.evaluate(()=>{
  window.__sgProfileRunning=false;window.__sgObserver.disconnect();
  const frames=window.__sgFrameGaps.sort((a,b)=>a-b);
  return {frames:frames.length,p95FrameGapMilliseconds:frames[Math.floor(frames.length*.95)],maxFrameGapMilliseconds:frames.at(-1),longTasksMilliseconds:window.__sgLongTasks};
 });
 assert.ok(responsiveness.frames>=30,'enough animation frames for the responsiveness sample');
 assert.ok(responsiveness.p95FrameGapMilliseconds<100,'long-page frame-gap p95 must stay under 100 ms');
 const profileEvidence={runtime:process.version,cpu:os.cpus()[0]?.model,platform:os.platform(),browser:await context.browser()?.version(),injectionMilliseconds,rendererJSHeapBefore:heapBefore,rendererJSHeapAfter:heapAfter,heapScope:'whole page renderer, not isolated extension or total browser RSS; no forced GC',fixture:{paragraphs:2000,tokensPerParagraph:3},rescanMilliseconds,...responsiveness};
 await mkdir('test-results',{recursive:true});await writeFile('test-results/performance.json',JSON.stringify(profileEvidence,null,2));
 console.log('Reading performance:',JSON.stringify(profileEvidence));
 await page.evaluate(()=>document.getElementById('long-reading').remove());
 await eventually(()=>panel('highlight'),2);

 const library = await context.newPage(); await library.goto(`chrome-extension://${id}/library.html`);
 await library.locator('#search').fill('학교'); await library.locator('#search-form button').click();
 await library.locator('#search-results article').first().getByRole('button', {name: 'Mark seen', exact: true}).click();
 await eventually(() => library.locator('#stats').textContent(), '1 known · 1 seen · 0 saved sentences');
 // Real extension messaging from two library tabs tests the worker's single-writer path.
 const second = await context.newPage(); await second.goto(`chrome-extension://${id}/library.html`);
 const card = await library.evaluate(url => {const r = SG.lookup('책')[0]; return {lemma:r.lemma, meaning:r.meaning, sentence:'책을 읽어요.', url, entryId:r.id, source:r.source, license:r.license};}, url);
 await Promise.all([library, second].map(p => p.evaluate(card => SGWrite({type: 'saveCard', card}), card)));
 await library.reload(); await eventually(() => library.locator('#cards article').count(), 1);
 const backup = await library.evaluate(() => chrome.storage.local.get({words: {}, cards: []}));
 assert.equal(backup.cards[0].source, card.source); assert.equal(backup.cards[0].license, 'CC-BY-SA-4.0');
 const performanceEvidence = await library.evaluate(() => {
  const inputs = ['병원', '학교에서', '걸었어요', '배', '먹었어요'];
  const times=[]; for (let i=0;i<100;i++) {const start=performance.now(); for (let j=0;j<100;j++) SG.lookup(inputs[j%inputs.length]); times.push((performance.now()-start)/100);}
  times.sort((a,b)=>a-b); return {userAgent:navigator.userAgent, entries:SG_DATA.entries.length, batches:times.length, lookupsPerBatch:100, p95BatchMeanMilliseconds:times[95], maximumMilliseconds:times.at(-1)};
 });
 assert.ok(performanceEvidence.p95BatchMeanMilliseconds < 100);
 console.log('Warm browser lookup timing:', JSON.stringify(performanceEvidence));
 // Automatic registration uses only the temporary test copy's localhost grant.
 await worker.evaluate(async()=>{await chrome.storage.local.set({autoLookup:true});await syncAuto();});
 const automaticPage=await context.newPage();await automaticPage.goto(url+'automatic');
 assert.equal(await automaticPage.locator('#softgloss-root').count(),0,'auto mode must stay lazy before Korean interaction');
 const autoTab=await worker.evaluate(async url=>(await chrome.tabs.query({url}))[0].id,url+'automatic');
 await eventually(()=>worker.evaluate(async tabId=>{const [r]=await chrome.scripting.executeScript({target:{tabId},func:()=>Boolean(globalThis.__softglossBootstrap)});return r.result;},autoTab),true);
 await worker.evaluate(tabId=>chrome.scripting.executeScript({target:{tabId},func:()=>{const original=Element.prototype.attachShadow;Element.prototype.attachShadow=function(options){const root=original.call(this,options);if(this.id==='softgloss-root')globalThis.__autoTestRoot=root;return root;};}}),autoTab);
 await automaticPage.evaluate(()=>{
  const node=document.getElementById('text').firstChild;const r=document.createRange();r.setStart(node,0);r.setEnd(node,6);const s=getSelection();s.removeAllRanges();s.addRange(r);
  document.getElementById('text').dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
 });
 await automaticPage.locator('#softgloss-root').waitFor({state:'attached'});
 await eventually(()=>worker.evaluate(async tabId=>{const [r]=await chrome.scripting.executeScript({target:{tabId},func:()=>Boolean(globalThis.__softgloss?.isAutomatic())});return r.result;},autoTab),true);
 const autoResult=await worker.evaluate(async tabId=>{const [r]=await chrome.scripting.executeScript({target:{tabId},func:()=>({hidden:globalThis.__autoTestRoot.querySelector('section').hidden,word:globalThis.__autoTestRoot.querySelector('input[type=search]').value})});return r.result;},autoTab);
 assert.deepEqual(autoResult,{hidden:false,word:'책을 읽어요'});
 await worker.evaluate(async()=>{await chrome.storage.local.set({autoLookup:false});await syncAuto();});
 assert.equal((await worker.evaluate(()=>chrome.scripting.getRegisteredContentScripts({ids:['softgloss-auto']}))).length,0);
 await eventually(()=>worker.evaluate(async tabId=>{const [r]=await chrome.scripting.executeScript({target:{tabId},func:()=>Boolean(globalThis.__softgloss?.isAutomatic())});return r.result;},autoTab),false);
 const inactivePage=await context.newPage();await inactivePage.goto(url+'inactive');
 await inactivePage.evaluate(()=>{const node=document.getElementById('text').firstChild;const r=document.createRange();r.setStart(node,0);r.setEnd(node,2);getSelection().addRange(r);document.getElementById('text').dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));});
 await inactivePage.waitForTimeout(350);assert.equal(await inactivePage.locator('#softgloss-root').count(),0);
 const popup=await context.newPage();await popup.goto(`chrome-extension://${id}/popup.html`);
 assert.equal(await popup.locator('#enable').textContent(),'Enable on this page');
 assert.match(await popup.locator('main').textContent(),/No local server/);
 const inactiveTab=await worker.evaluate(async url=>(await chrome.tabs.query({url}))[0].id,url+'inactive');
 const activations=await popup.evaluate(tabId=>Promise.all([chrome.runtime.sendMessage({type:'enableCurrent',tabId}),chrome.runtime.sendMessage({type:'enableCurrent',tabId})]),inactiveTab);
 assert.ok(activations.every(r=>r.ok));assert.equal(await inactivePage.locator('#softgloss-root').count(),1);
 await popup.setViewportSize({width:350,height:700});await popup.screenshot({path:'test-results/popup.png',fullPage:true});
 await popup.close();await automaticPage.close();await inactivePage.close();await library.bringToFront();
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
