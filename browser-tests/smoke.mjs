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
const server = createServer((req,res)=>{
 res.setHeader('Content-Type','text/html; charset=utf-8');
 const body=req.url?.startsWith('/frames')?'<p>학교에서 읽어요.</p><iframe title="Cafe article" src="/article"></iframe>':req.url?.startsWith('/article')?'<p id="frame-text"><a href="#next"><span>책을</span></a> 읽어요. 가격대나 보온성은 상당하네요.</p><p id="next">학교에서 공부해요.</p>':'<p id="text">책을 읽어요. 학교에서 공부해요.</p><input id="private" value="책"><div contenteditable>먹었어요</div>';
 res.end('<!doctype html><html><head><title>Reading fixture</title></head><body>'+body+'</body></html>');
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;
const errors = [], external = [];
let context;
async function launch() {
 context = await chromium.launchPersistentContext(profile, {channel: 'chromium', headless: true, args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]});
 context.on('page', page => page.on('pageerror', e => errors.push(e.message)));
 context.on('request', req => {if (/^https?:/.test(req.url()) && !req.url().startsWith(url) && !req.url().startsWith(url.replace('127.0.0.1','localhost'))) external.push(req.url());});
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
    if(action==='listenRect'){const r=root.querySelector('.sg-listen').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};}
    if (action === 'notice') return root.getElementById('notice')?.textContent;
    if(action==='studyImport'){const input=root.querySelector('input[type=file]'),dt=new DataTransfer();dt.items.add(new File([value],'study.csv',{type:'text/csv'}));input.files=dt.files;input.dispatchEvent(new Event('change'));}
    if(action==='studyLevel'){const select=root.querySelector('#sg-study-level');select.value=String(value);select.dispatchEvent(new Event('change'));}
    if(action==='ungradedToggle')root.querySelector('#sg-ungraded').click();
    if(action==='gapRanges'){const inside=key=>[...CSS.highlights.get('softgloss-'+key)||[]].filter(r=>r.startContainer.parentElement?.id==='coverage-gaps').map(r=>r.toString());return {graded:inside('study-word'),ungraded:inside('ungraded')};}
    if(action==='studyCounts')return [CSS.highlights.get('softgloss-study-word')?.size||0,CSS.highlights.get('softgloss-study-context')?.size||0];
    if(action==='levelColor')return getComputedStyle(document.body,'::highlight(softgloss-study-'+value+')').backgroundColor;
    if(action==='grammarCount')return CSS.highlights.get('softgloss-study-grammar')?.size||0;
    if(action==='studyContext')return [...CSS.highlights.get('softgloss-study-context')||[]].map(r=>r.toString());
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
 assert.match(await panel('text'),/v0.18.0/);
 assert.match(await panel('search', '책을'), /Grammar hint/);
 assert.match(await panel('search', '책을'), /Explain and show an example/);
 assert.deepEqual(await panel('grammarOpen'), [false,false]);
 await panel('expandGrammar');
 assert.deepEqual(await panel('grammarOpen'), [true,false]);
 for(const [word,definition] of [['지도부','leadership'],['전원주택은','countryside'],['하단에는','bottom section'],['성공하려면','intending'],['할까','wondering']])assert.ok((await panel('search',word)).includes(definition),word);
 const exampleWord=await worker.evaluate(async tabId=>{const [r]=await chrome.scripting.executeScript({target:{tabId},func:()=>SG_DATA.entries.find(e=>SG.examplesFor(e).length)?.lemma});return r.result;},tabId);
 assert.match(await panel('search',exampleWord),/Dictionary sentence example/);
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
 // Packaged pronunciation is injected on demand and decoded locally.
 assert.match(await panel('search', '학교'), /학교/);
 const listenPoint=await panel('listenRect');await page.mouse.click(listenPoint.x,listenPoint.y); await eventually(() => panel('notice'), 'Machine-generated voice · Supertonic 3');
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

 assert.match(await panel('search','부르면'),/Learning example/);
 assert.match(await panel('search','부르면'),/Please call a taxi/);
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
 await panel('click','Break down sentence');assert.match(await panel('text'),/Sentence components/);
 await panel('click','Save sentence');
 await eventually(()=>worker.evaluate(async()=>{const {cards=[]}=await chrome.storage.local.get('cards');return cards.some(c=>c.lemma==='보이다'&&c.sentence==='보이지 않는다');}),true);
 await worker.evaluate(async()=>{const {cards=[]}=await chrome.storage.local.get('cards');for(const card of cards)await store.apply({type:'deleteCard',card});});
 await page.evaluate(()=>{getSelection().removeAllRanges();document.getElementById('phrase').remove();});
 await panel('click','Close');
 await page.evaluate(()=>{const a=document.createElement('a');a.id='nested-link';a.href='#link-target';const span=document.createElement('span');span.textContent='기자협회보';a.append(span);document.body.append(a);});
 await page.locator('#nested-link span').hover();await eventually(()=>panel('searchValue'),'기자협회보');
 await page.locator('#nested-link').click();assert.ok(page.url().endsWith('#link-target'),'normal link navigation must remain intact');
 await page.evaluate(()=>{document.getElementById('nested-link').remove();history.replaceState(null,'',location.pathname);});
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

 // Study list import, cumulative target levels and softer sentence context.
 await page.evaluate(()=>{const p=document.createElement('p');p.id='study-inline';p.append('학교에서는 ',Object.assign(document.createElement('em'),{textContent:'읽어요'}),'.');document.body.append(p);});
 await page.evaluate(()=>{const p=document.createElement('p');p.id='study-advanced';p.textContent='고등학교';document.body.append(p);});
 await panel('studyImport','Korean,level\n책,1\n읽다,2');
 await eventually(()=>worker.evaluate(async()=>Object.keys((await chrome.storage.local.get('studyLevels')).studyLevels||{}).length),2);
 await panel('studyLevel',1);await eventually(()=>panel('studyCounts'),[6,4]);
 assert.ok(await panel('grammarCount')>0,'bundled grammar must highlight without requiring a custom grammar list');
 assert.ok((await panel('studyContext')).some(t=>t.includes('책을 읽어요.')));
 await panel('studyLevel',2);await eventually(()=>panel('studyCounts'),[7,5]);
 assert.ok((await panel('studyContext')).some(t=>t==='학교에서는 읽어요.'));
 await worker.evaluate(()=>store.apply({type:'setHighlights',enabled:false}));await eventually(()=>panel('studyCounts'),[0,0]);
 await worker.evaluate(()=>store.apply({type:'setHighlights',enabled:true}));await eventually(()=>panel('studyCounts'),[7,5]);
 const colors=await Promise.all([1,2,3,4,5,6].map(l=>panel('levelColor',l)));assert.equal(new Set(colors).size,6);
 await page.screenshot({path:'test-results/topik-study.png'});
 await panel('studyLevel',0);await eventually(()=>panel('highlight'),2);
 await panel('click','Remove custom lists');await page.evaluate(()=>document.getElementById('study-inline').remove());
 // Screenshot gaps: ungraded matches stay neutral; joined nouns use their own grades.
 await page.evaluate(()=>{const p=document.createElement('p');p.id='coverage-gaps';p.textContent='어떻게 해결하시는지요 단체관람안내 기아타이거즈의 층간소음.';document.body.append(p);});
 await panel('studyLevel',1);
 await eventually(()=>panel('gapRanges'),{graded:['안내'],ungraded:['어떻게','해결하시는지요','기아타이거즈의','층간소음']});
 await panel('ungradedToggle');await eventually(()=>panel('gapRanges'),{graded:['안내'],ungraded:[]});
 await panel('ungradedToggle');await panel('studyLevel',6);
 await eventually(()=>panel('gapRanges'),{graded:['단체','관람','안내'],ungraded:['어떻게','해결하시는지요','기아타이거즈의','층간소음']});
 assert.match(await panel('search','어떻게'),/Dictionary match · no bundled or imported study grade/);
 assert.match(await panel('text'),/Malnaru Read/);
 await page.locator('#coverage-gaps').scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/screenshot-gaps.png'});
 assert.match(await panel('search','해결하시는지요'),/해결하다/);
 assert.match(await panel('search','단체관람안내'),/not a whole-label translation/);
 assert.match(await panel('search','기아타이거즈의'),/KIA Tigers/);
 await panel('studyLevel',0);await page.evaluate(()=>document.getElementById('coverage-gaps').remove());
 async function libraryView(page,view){await page.locator('a[data-view="'+view+'"]').click();await eventually(()=>page.locator('[data-panel="'+view+'"]').isVisible(),true);}
 const library = await context.newPage(); await library.goto(`chrome-extension://${id}/library.html`);
 await libraryView(library,'dictionary');
 await library.locator('#search').fill('학교'); await library.locator('#search-form button').click();
 await library.locator('#search-results article').first().getByRole('button', {name: 'Mark seen', exact: true}).click();
 await eventually(() => library.locator('#stats').textContent(), '1 known · 1 seen · 0 saved sentences');
 await library.getByRole('button', {name: 'Listen to 학교'}).first().click(); await eventually(() => library.locator('#message').textContent(), 'Machine-generated voice · Supertonic 3');
 // Real extension messaging from two library tabs tests the worker's single-writer path.
 const second = await context.newPage(); await second.goto(`chrome-extension://${id}/library.html`);
 const card = await library.evaluate(url => {const r = SG.lookup('책')[0]; return {lemma:r.lemma, meaning:r.meaning, sentence:'책을 읽어요.', url, entryId:r.id, source:r.source, license:r.license};}, url);
 await Promise.all([library, second].map(p => p.evaluate(card => SGWrite({type: 'saveCard', card}), card)));
 await library.reload(); await eventually(() => library.locator('#cards article').count(), 1);
 await libraryView(library,'dictionary');
 await library.locator('#search').fill('학교');await library.locator('#search-form button').click();
 await library.bringToFront();
 // In-app FSRS: select an entry, reveal, answer, export and round-trip its schedule.
 await libraryView(library,'dictionary');
 await library.locator('#search-results article').first().getByRole('button',{name:'Add to reviews',exact:true}).click();
 await eventually(()=>library.locator('#review-stats').textContent(),'1 due · 1 new · 1 cards');
 assert.equal(await library.locator('#review').getByRole('button',{name:/^Good/}).count(),0,'rating requires answer reveal');
 // Shortcuts are scoped: typing in dictionary search cannot reveal or rate a card.
 await library.locator('#search').fill('');await library.locator('#search').pressSequentially('1234 pu');
 assert.equal(await library.locator('#review-show-answer').count(),1);
 assert.equal(await library.evaluate(async()=>Object.values((await chrome.storage.local.get('reviewCards')).reviewCards)[0].schedule.reps),0);
 await libraryView(library,'review');
 await library.locator('#start-review').click();assert.equal(await library.evaluate(()=>document.activeElement.id),'review-show-answer');
 await library.keyboard.press('1');assert.equal(await library.locator('#review-show-answer').count(),1);
 await library.screenshot({path:'test-results/review-front-desktop.png',fullPage:true});
 await library.keyboard.press('Space');await library.locator('#review-rate-4').waitFor();
 const ratingColors=await library.locator('.review-ratings button').evaluateAll(buttons=>buttons.map(b=>{const s=getComputedStyle(b);return {label:b.textContent,ink:s.color,bg:s.backgroundColor};}));
 assert.equal(new Set(ratingColors.map(c=>c.bg)).size,4,'each rating has its own color');
 for(const color of ratingColors){const luminance=rgb=>rgb.match(/\d+/g).slice(0,3).map(Number).map(n=>n/255).map(n=>n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);const a=luminance(color.ink),b=luminance(color.bg);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,'readable rating '+color.label);}

 assert.equal(await library.evaluate(()=>document.activeElement.id),'review');
 await library.keyboard.press('p');await eventually(()=>library.locator('#message').textContent(),'Machine-generated voice · Supertonic 3');
 await library.screenshot({path:'test-results/review-desktop.png',fullPage:true});
 // At a 200%-equivalent reduced CSS viewport, ratings and help reflow without overflow.
 await library.setViewportSize({width:640,height:360});assert.equal(await library.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await library.setViewportSize({width:360,height:740});assert.equal(await library.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await library.locator('#review').scrollIntoViewIfNeeded();await library.screenshot({path:'test-results/review-mobile.png'});
 await library.setViewportSize({width:1280,height:720});
 await library.keyboard.press('4');await eventually(()=>library.locator('#review-stats').textContent(),'0 due · 0 new · 1 cards');
 await library.keyboard.press('u');await eventually(()=>library.locator('#review-stats').textContent(),'1 due · 1 new · 1 cards');
 assert.equal(await library.evaluate(()=>document.activeElement.id),'review-show-answer');
 assert.equal(await library.evaluate(async()=>Object.values((await chrome.storage.local.get('reviewCards')).reviewCards)[0].schedule.reps),0);
 await library.keyboard.press('Space');await library.keyboard.press('4');
 await eventually(()=>library.locator('#review-stats').textContent(),'0 due · 0 new · 1 cards');
 // Idle queues wake themselves when a scheduled card becomes due, without taking focus.
 await libraryView(library,'dictionary');await library.locator('#search').focus();
 await library.evaluate(async()=>{const {reviewCards}=await chrome.storage.local.get('reviewCards');for(const c of Object.values(reviewCards))c.schedule.due=new Date(Date.now()+750).toISOString();await chrome.storage.local.set({reviewCards});});
 await eventually(()=>library.locator('#review-show-answer').count(),1);
 assert.equal(await library.evaluate(()=>document.activeElement.id),'search');
 await libraryView(library,'review');await library.locator('#start-review').click();await library.keyboard.press('Space');await library.keyboard.press('4');
 await eventually(()=>library.locator('#review-stats').textContent(),'0 due · 0 new · 1 cards');
 await libraryView(library,'dictionary');
 await library.locator('#search-results article').first().getByRole('button',{name:'Add to reviews',exact:true}).click();
 await eventually(()=>library.locator('#review-stats').textContent(),'0 due · 0 new · 1 cards');
 // Local lesson authoring/import/export stays separate from FSRS grading.
 const schedulesBeforeLessons=await library.evaluate(async()=> (await chrome.storage.local.get('reviewCards')).reviewCards);
 await libraryView(library,'lessons');await library.getByRole('checkbox',{name:'Select 학교',exact:true}).check();await library.locator('#lesson-create').click();
 await library.locator('#lesson-title').fill('School practice');await library.locator('#lesson-goal').fill('Talk about tomorrow');
 await library.locator('#lesson-korean-0').fill('내일 학교에 가요.');await library.locator('#lesson-english-0').fill('I am going to school tomorrow.');
 await library.locator('#lesson-form button[type=submit]').click();await eventually(()=>library.locator('#lesson-save-state').textContent(),'Saved on this device.');
 const lessonDownload=library.waitForEvent('download');await library.locator('#lesson-export').click();const lessonFile=JSON.parse(await readFile(await (await lessonDownload).path(),'utf8'));
 assert.equal(lessonFile.format,'malnaru-lesson');assert.equal(lessonFile.draft.items[0].english,'I am going to school tomorrow.');
 await library.reload();await library.locator('#lesson-list button').first().click();assert.equal(await library.locator('#lesson-goal').inputValue(),'Talk about tomorrow');
 await library.locator('#lesson-import').setInputFiles({name:'lesson.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(lessonFile))});
 await eventually(()=>library.locator('#lesson-save-state').textContent(),'Unsaved changes — save or export to keep them.');
 await library.locator('#lesson-title').fill('Imported copy');await library.locator('#lesson-form button[type=submit]').click();await eventually(()=>library.locator('#lesson-list button').count(),2);
 const savedLessons=await library.evaluate(async()=> (await chrome.storage.local.get('lessonDrafts')).lessonDrafts);assert.equal(Object.keys(savedLessons).length,2);
 await library.locator('#lesson-import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"format":"malnaru-lesson","version":99}')});
 await eventually(()=>library.locator('#message').textContent(),'Could not import lesson: Unsupported lesson file.');assert.equal(await library.locator('#lesson-list button').count(),2);
 library.once('dialog',d=>d.accept());await library.locator('#lesson-delete').click();await eventually(()=>library.locator('#lesson-list button').count(),1);
 assert.deepEqual(await library.evaluate(async()=> (await chrome.storage.local.get('reviewCards')).reviewCards),schedulesBeforeLessons,'lesson editing cannot grade cards');
 const backup = await library.evaluate(() => chrome.storage.local.get({words: {}, cards: [],reviewCards:{},lessonDrafts:{}}));
 assert.equal(Object.values(backup.reviewCards)[0].schedule.reps,2);
 await libraryView(library,'settings');const backupDownload=library.waitForEvent('download');await library.locator('#backup').click();const exported=JSON.parse(await readFile(await (await backupDownload).path(),'utf8'));
 assert.equal(exported.version,3);assert.equal(Object.hasOwn(exported,'reviewUndo'),false);assert.deepEqual(exported.reviewCards,backup.reviewCards);assert.deepEqual(exported.lessonDrafts,backup.lessonDrafts);
 // Frame fixture: child highlights and selection use the top panel, preserving link behavior.
 const framePage=await context.newPage();await framePage.goto(url+'frames');
 const frameTab=await worker.evaluate(async url=>(await chrome.tabs.query({url}))[0].id,url+'frames');
 await worker.evaluate(tabId=>chrome.scripting.executeScript({target:{tabId,allFrames:true},func:()=>{
  const original=Element.prototype.attachShadow;Element.prototype.attachShadow=function(options){const root=original.call(this,options);if(this.id==='softgloss-root')globalThis.__frameTestRoot=root;return root;};
 }}),frameTab);
 await worker.evaluate(tabId=>enable({id:tabId}),frameTab);
 async function frameState(){return worker.evaluate(async tabId=>(await chrome.scripting.executeScript({target:{tabId,allFrames:true},func:()=>({child:window!==top,enabled:globalThis.__softgloss?.isEnabled(),hidden:globalThis.__frameTestRoot?.querySelector('section')?.hidden,word:globalThis.__frameTestRoot?.querySelector('input[type=search]')?.value,highlights:CSS.highlights.get('softgloss-known')?.size||0})})).map(r=>r.result).filter(Boolean),frameTab);}
 await eventually(async()=>(await frameState()).some(r=>r.child&&r.enabled&&r.hidden&&r.highlights>0),true);
 const articleFrame=framePage.frames().find(f=>f.url()===url+'article');
 await articleFrame.locator('a').click();assert.match(articleFrame.url(),/#next$/);
 await articleFrame.evaluate(()=>{const n=document.querySelector('#frame-text a span').firstChild,r=new Range();r.selectNodeContents(n);getSelection().removeAllRanges();getSelection().addRange(r);n.parentElement.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));});
 await eventually(async()=>(await frameState()).some(r=>!r.child&&r.word==='책을'),true);
 assert.ok((await frameState()).every(r=>!r.child||r.hidden),'child frame panel stays hidden');
 // Save a review from the frame: source URL is the article, without query/fragment.
 await worker.evaluate(tabId=>chrome.scripting.executeScript({target:{tabId},func:()=>[...globalThis.__frameTestRoot.querySelectorAll('button')].find(b=>b.textContent==='Add to reviews').click()}),frameTab);
 await eventually(()=>worker.evaluate(async()=>Object.keys((await chrome.storage.local.get({reviewCards:{}})).reviewCards).length),2);
 const frameReview=await worker.evaluate(async()=>Object.values((await chrome.storage.local.get({reviewCards:{}})).reviewCards).find(c=>c.lemma==='책'));
 assert.equal(frameReview.url,url+'article');
 // An unrelated frame origin without a host grant must stay untouched.
 const deniedLoaded=framePage.waitForEvent('framenavigated',{predicate:f=>f.url().startsWith(url.replace('127.0.0.1','localhost')),timeout:10000});
 await framePage.evaluate(src=>{const iframe=document.createElement('iframe');iframe.title='No website permission';iframe.src=src;document.body.append(iframe);},url.replace('127.0.0.1','localhost')+'article');
 const deniedFrame=await deniedLoaded;
 await deniedFrame.locator('#frame-text').waitFor();assert.equal(await deniedFrame.locator('#softgloss-root').count(),0);
 await framePage.evaluate(()=>{const iframe=document.createElement('iframe');iframe.title='Late article';iframe.src='/article?late=1';document.body.append(iframe);});
 await eventually(async()=>(await frameState()).filter(r=>r.child&&r.enabled&&r.highlights>0).length,2);
 // Remove the extra test card before the baseline backup/restore checks.
 await worker.evaluate(id=>store.apply({type:'removeReview',id}),frameReview.id);
 await worker.evaluate(tabId=>chrome.scripting.executeScript({target:{tabId},func:()=>globalThis.__softgloss.disable()}),frameTab);
 await eventually(async()=>(await frameState()).every(r=>!r.enabled),true);
 await framePage.close();
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
 await libraryView(library,'settings');
 const downloadPromise = library.waitForEvent('download'); await library.locator('#anki').click();
 const download = await downloadPromise; assert.equal(download.suggestedFilename(), 'malnaru-read-anki.tsv');
 library.once('dialog', d => d.accept()); await library.locator('#clear').click();
 await eventually(() => library.locator('#cards article').count(), 0);assert.equal(Object.keys(await library.evaluate(async()=> (await chrome.storage.local.get('lessonDrafts')).lessonDrafts)).length,0);
 await eventually(()=>library.locator('#review-stats').textContent(),'0 due · 0 new · 0 cards');
 library.once('dialog', d => d.accept());
 await library.locator('#restore').setInputFiles({name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({version: 3, ...backup}))});
 await eventually(() => library.locator('#cards article').count(), 1);
 assert.deepEqual(await library.evaluate(async()=> (await chrome.storage.local.get('reviewCards')).reviewCards),backup.reviewCards);
 await library.locator('#restore').setInputFiles({name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"version":2}')});
 await eventually(() => library.locator('#message').textContent(), 'Restore failed: Unsupported backup.');
 assert.equal(await library.locator('#cards article').count(), 1);
 await libraryView(library,'library');
 assert.equal(await library.locator('[data-panel]:visible').count(),1);
 assert.equal(await library.locator('a[data-view][aria-current=page]').getAttribute('data-view'),'library');
 assert.equal(await library.locator('#overview-total').textContent(),'1');assert.equal(await library.locator('#collection-sentences').textContent(),'1 sentence');
 await library.screenshot({path:'test-results/library-overview-desktop.png',fullPage:true});
 await libraryView(library,'vocabulary');await library.goBack();await eventually(()=>library.locator('[data-panel=library]').isVisible(),true);
 await libraryView(library,'review');await library.reload();await eventually(()=>library.locator('[data-panel=review]').isVisible(),true);
 await libraryView(library,'library');
 await library.setViewportSize({width: 360, height: 740});
 assert.equal(await library.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
 for(const view of ['dictionary','vocabulary','sentences','lessons','settings','review']){await libraryView(library,view);assert.equal(await library.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,view+' mobile reflow');await library.screenshot({path:'test-results/library-'+view+'-mobile.png',fullPage:true});}
 await libraryView(library,'lessons');await library.locator('#lesson-list button').first().click();assert.equal(await library.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await library.screenshot({path:'test-results/lesson-editor-mobile.png',fullPage:true});
 await libraryView(library,'library');
 await mkdir('test-results', {recursive: true}); await library.screenshot({path: 'test-results/library-mobile.png', fullPage: true});
 assert.deepEqual(errors, []); assert.deepEqual(external, []);
 await context.close();
 worker = await launch();
 const restored = await context.newPage(); await restored.goto(`chrome-extension://${id}/library.html`);
 await eventually(() => restored.locator('#cards article').count(), 1);
 assert.deepEqual(await restored.evaluate(async()=> (await chrome.storage.local.get('reviewCards')).reviewCards),backup.reviewCards);
 assert.equal(Object.keys(await restored.evaluate(async()=> (await chrome.storage.local.get('lessonDrafts')).lessonDrafts)).length,1);
 await eventually(() => restored.locator('#stats').textContent(), '1 known · 1 seen · 1 saved sentences');
 assert.deepEqual(errors, []); assert.deepEqual(external, []);
 console.log('PASS: unpacked extension, keyboard entry, search, status, dynamic highlights, disable/re-enable, multi-tab saves, export, backup/restore, invalid backup, narrow library and persistence. No external HTTP requests observed.');
} finally {await context?.close(); server.close(); await rm(temporary, {recursive: true, force: true});}
