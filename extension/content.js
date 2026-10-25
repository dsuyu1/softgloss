(async () => {
 if (globalThis.__softgloss) {globalThis.__softgloss.show(); return;}
 const {SG} = globalThis;
 const host = document.createElement('div'); host.id = 'softgloss-root';
 document.documentElement.append(host);
 const root = host.attachShadow({mode: 'closed'});
 const style = document.createElement('style');
 style.textContent = `:host{all:initial}*{box-sizing:border-box}section{position:fixed;z-index:2147483647;right:16px;top:16px;width:min(380px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;background:#fff;color:#232323;border:1px solid #e7e3e0;border-radius:12px;padding:16px;box-shadow:0 12px 48px #23232324;font:14px/1.55 system-ui}section[hidden]{display:none}header,.sg-actions{display:flex;align-items:center;gap:8px}header{justify-content:space-between;border-bottom:1px solid #eee9e6;padding-bottom:12px;margin-bottom:16px}header strong{font-size:18px;letter-spacing:-.5px}header small{font-size:11px}header button{margin:0;padding:5px 9px}summary{cursor:pointer;font-weight:600}details{margin:10px 0}h2{font-size:25px;line-height:1.3;letter-spacing:-.6px;margin:12px 0}h3{font-size:20px;line-height:1.4;margin:0}p{margin:8px 0;overflow-wrap:anywhere}button,input{font:inherit}button{cursor:pointer;border:1px solid #d8d1d1;border-radius:7px;background:#fff;color:#323232;padding:8px 11px;margin:4px 5px 4px 0}button:hover{background:#fcf7f4}button:disabled{cursor:default;opacity:.5}button[aria-pressed=true]{background:#f1f1f1;border-color:#59504c;box-shadow:inset 0 0 0 1px #59504c;font-weight:650}button:focus-visible,input:focus-visible,summary:focus-visible,a:focus-visible{outline:3px solid #a34227;outline-offset:3px}input[type=search]{width:100%;min-width:0;padding:10px 11px;border:1px solid #d8d1d1;border-radius:7px;background:#fff;color:#232323}form{display:grid;grid-template-columns:1fr auto;gap:8px}form label{grid-column:1/-1;font-size:12px;color:#645952}form button{margin:0;background:#b7482b;border-color:#b7482b;color:white;padding:8px 14px}form button:hover{background:#9b3c24}small{display:block;font-size:12px;color:#71645e}a{color:#914126;font-size:12px;overflow-wrap:anywhere}ol{padding-left:22px}li{margin:5px 0}.sg-card{border:1px solid #ebe6e3;border-radius:10px;padding:14px;margin:12px 0;background:#fff}.sg-card>p:first-of-type{font-size:16px}.sg-meta{font-size:12px;color:#71645e;margin:6px 0}.sg-chip{display:inline-block;border-radius:5px;padding:3px 7px;font-size:11px;font-weight:650;background:#f1f1f1;color:#514b47;margin:3px 5px 3px 0}.sg-noun{background:#eaf1fd;color:#24528a}.sg-predicate{background:#f2ecfc;color:#654099}.sg-grammar-chip{background:#fff1d9;color:#805600}.sg-construction{background:#e5f3f0;color:#245f55}.sg-phrase{background:#fcf7f4;border:1px solid #eeded4;border-radius:10px;padding:14px;margin:14px 0}.sg-phrase h3{font-size:16px}.sg-status{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px}.sg-status button{font-size:12px;margin:0;flex:1}.sg-settings{padding:10px 0;border-bottom:1px solid #eee9e6;margin:0 0 14px}.sg-settings summary{font-size:12px;color:#71645e}.sg-settings label{display:block;margin:10px 0}.sg-footer{border-top:1px solid #eee9e6;padding-top:10px}#notice{font-size:12px;color:#65544c}#notice:not(:empty){background:#fcf7f4;padding:8px;border-radius:7px}@media(max-width:400px){section{right:8px;top:8px;width:calc(100vw - 16px);max-height:calc(100dvh - 16px)}}`;
 root.append(style);
 const panel = document.createElement('section');
 panel.setAttribute('role', 'region'); panel.setAttribute('aria-label', 'SoftGloss Korean dictionary'); root.append(panel);
 let state = await chrome.storage.local.get({words: {}, preferences: {highlights: true}});
 let current = '', sentence = '', results = [], phraseResult = null, enabled = true, previousFocus = null, automatic = false;
 let hoverTimer, paintTimer, paintEpoch = 0;
 const skip = 'script,style,noscript,input,textarea,select,[contenteditable],[role=textbox]';
 function el(tag, text, parent = panel) {const e = document.createElement(tag); e.textContent = text; parent.append(e); return e;}
 function button(label, fn, parent = panel) {const e = el('button', label, parent); e.type = 'button'; e.addEventListener('click', fn); return e;}
 function notice(text) {root.getElementById('notice').textContent = text;}
 async function write(message, success) {
  try {await SGWrite(message); if (success) notice(success); return true;}
  catch (error) {notice(error.message); return false;}
 }
 function close() {panel.hidden = true; const focused = root.activeElement; focused?.blur(); if (focused) previousFocus?.focus?.();}
 function disable() {enabled=false;clearTimeout(hoverTimer);clearTimeout(paintTimer);paintEpoch++;observer.disconnect();clearHighlights();close();chrome.runtime.sendMessage({type:'pageDisabled'});}
 function render() {
  panel.replaceChildren();
  const header=el('header','');const brand=el('div','',header);el('strong','SoftGloss',brand);el('small','KOREAN · OFFLINE',brand);
  const actions=el('div','',header);button('My library',()=>chrome.runtime.sendMessage({type:'openLibrary'}),actions);button('Close',close,actions);
  const settings=el('details','');settings.className='sg-settings';el('summary','Reading settings',settings);
  const label=el('label','Highlight vocabulary ',settings),toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=state.preferences.highlights!==false;label.append(toggle);
  toggle.addEventListener('change',async()=>{if(!await write({type:'setHighlights',enabled:toggle.checked}))toggle.checked=state.preferences.highlights!==false;});
  el('small','On-page highlights: gray = unknown · amber = seen · green = known. Grammar colors below always have labels.',settings);
  button('Disable on this page',disable,settings);
  const form=el('form',''),searchLabel=el('label','Korean word, short phrase or English meaning',form);
  const input=document.createElement('input');input.type='search';input.maxLength=300;input.id='sg-search';input.placeholder='Try 보이지 않는다';searchLabel.htmlFor=input.id;input.value=current;form.append(input);
  const submit=el('button','Search',form);submit.type='submit';form.addEventListener('submit',e=>{e.preventDefault();display(input.value,'',true);root.getElementById('sg-search').focus();});
  el('h2',current||'Read a little further.').lang=current?'ko':'en';
  if(!current)el('p','Hover a Korean word or select up to 8 words for a phrase breakdown. Alt+Shift+K opens the selection or search.');
  else if(!results.length&&!phraseResult)el('p','No supported entry yet. Try a dictionary form or select a shorter phrase.');
  if(phraseResult) {
   const box=el('div','');box.className='sg-phrase';el('h3',phraseResult.constructions.length?'Phrase pattern':'Word-by-word breakdown',box);
   for(const c of phraseResult.constructions){if(c.surface!==current)el('p',c.surface,box).lang='ko';const chip=el('span',c.pattern,box);chip.className='sg-chip sg-construction';el('p',c.meaning,box);}
   el('small',phraseResult.constructions.length?'Pattern meaning; the full phrase may depend on other words.':'Whole-phrase meaning is not resolved. Component meanings may change in idioms.',box);
   const chips=el('div','',box);
   for(const component of phraseResult.components){const pos=component.results[0]?.pos;const role=['verb','adjective'].includes(pos)?'Predicate':['noun','pronoun'].includes(pos)?'Noun':pos||'No entry';const chip=el('span',component.surface+' · '+role,chips);chip.className='sg-chip'+(['verb','adjective'].includes(pos)?' sg-predicate':['noun','pronoun'].includes(pos)?' sg-noun':'');chip.lang='ko';}
  }
  const other=phraseResult?.components.filter(c=>c.alternatives?.length)||[];
  if(other.length){const details=el('details','');el('summary','Other word meanings',details);for(const c of other){el('p',c.surface,details);for(const r of new Map(c.alternatives.map(r=>[r.id||r.lemma,r])).values())el('p',r.lemma+' · '+r.pos+' · '+r.meaning,details);button('Look up '+c.surface,()=>display(c.surface,'',true),details);}}
  // Keep homonyms separate, but merge analyses of the same source entry.
  const groups=new Map();for(const r of results){const key=r.id||r.lemma;if(!groups.has(key))groups.set(key,{...r,parts:[],analyses:[],surfaces:[]});const g=groups.get(key);g.parts.push(...r.parts);g.analyses.push(r);g.surfaces.push(r.surface);}
  for(const r of groups.values()) {
   const card=el('article','');card.className='sg-card';
   const type=['verb','adjective'].includes(r.pos)?'predicate':['noun','pronoun'].includes(r.pos)?'noun':'';
   const chip=el('span',type==='predicate'?'Predicate · '+r.pos:r.pos,card);chip.className='sg-chip'+(type?' sg-'+type:'');
   el('h3',r.lemma,card).lang='ko';if(phraseResult)el('small','From: '+[...new Set(r.surfaces)].join(' · '),card);
   el('p',r.meaning,card);
   if(r.senses?.length>1){const details=el('details','',card);el('summary','All '+r.senses.length+' meanings',details);const senses=el('ol','',details);for(const sense of r.senses)el('li',(sense.tags.length?'['+sense.tags.join(', ')+'] ':'')+sense.glosses.join('; '),senses);}
   for(const part of new Set(r.parts)){const line=el('p',part,card);line.className='sg-meta';}
   if(r.parts.length){const chip=el('span','Grammar · possible analysis',card);chip.className='sg-chip sg-grammar-chip';}
   if(r.compoundParts)el('small','Component definition; the whole expression may have a different meaning.',card);
   if(r.hanja?.length)el('small','Hanja: '+r.hanja.join(' · '),card);
   for(const grammar of new Map(r.analyses.flatMap(a=>SG.grammarFor(a)).map(c=>[c.title,c])).values()) {
    const details=el('details','',card);details.className='sg-grammar';el('summary','Grammar hint · '+grammar.title,details);el('p',grammar.hint,details);
    const more=el('details','',details);el('summary','Explain and show an example',more);el('p',grammar.explanation,more);el('p',grammar.example,more);
    const link=el('a','Grammar source · Wiktionary contributors · CC BY-SA 4.0',more);link.href=grammar.source;link.target='_blank';link.rel='noopener noreferrer';
   }
   if(r.source){const link=el('a','Wiktionary contributors · CC BY-SA 4.0',card);link.href=r.source;link.target='_blank';link.rel='noopener noreferrer';}else el('small','Original starter gloss · limited coverage',card);
   const statusLine=el('small','',card);statusLine.dataset.lemma=r.lemma;
   const statuses=el('div','',card);statuses.className='sg-status';
   for(const status of ['unknown','seen','known']){const b=button(status,()=>write({type:'setWord',lemma:r.lemma,status},'Vocabulary updated.'),statuses);b.dataset.lemma=r.lemma;b.dataset.status=status;b.setAttribute('aria-label',`Mark ${r.lemma} ${status}`);}
   const save=button('Save sentence',()=>write({type:'saveCard',card:{lemma:r.lemma,meaning:r.meaning,...(r.source?{entryId:r.id,source:r.source,license:r.license}:{}),sentence:sentence.slice(0,2000),url:location.origin+location.pathname}},'Saved to your library.'),card);save.disabled=!sentence.trim();
  }
  const message=el('p','');message.id='notice';message.setAttribute('role','status');
  const footer=el('small',sentence?'Save sentence keeps this word with nearby text and the page address.':'Select page text to capture a sentence. Your vocabulary stays on this device.');footer.className='sg-footer';updateStatuses();
 }
 function updateStatuses() {
  for (const node of root.querySelectorAll('[data-lemma]')) {
   const status = state.words[node.dataset.lemma] || 'unknown';
   if (node.tagName === 'BUTTON') node.setAttribute('aria-pressed', String(status === node.dataset.status));
   else node.textContent = 'Status: ' + status;
  }
 }
 function display(word, context, manual = false) {
  if (!enabled) return;
  const value = word.trim();
  if (!manual && value === current && context === sentence && !panel.hidden) return;
  current = value.slice(0,300); phraseResult = SG.phrase(current); sentence = phraseResult && !context.includes(current) ? current : context; results = phraseResult ? phraseResult.components.flatMap(c=>c.results) : manual ? SG.search(current) : SG.lookup(current);
  panel.hidden = false; render();
 }
 function selected() {
  const selection = getSelection();
  if (selection?.anchorNode?.parentElement?.closest(skip) || selection?.focusNode?.parentElement?.closest(skip)) return null;
  const text = selection?.toString().trim();
  if (!text || !SG.selectionWords(text).length) return null;
  return {word: text, context: selection.anchorNode?.parentElement?.textContent || text};
 }
 document.addEventListener('pointermove', event => {
  clearTimeout(hoverTimer);
  if (!enabled || event.composedPath().includes(host) || root.activeElement?.matches('input[type=search],textarea')) return;
  hoverTimer = setTimeout(() => {
   if (!enabled || root.activeElement?.matches('input[type=search],textarea')) return;
   const p = document.caretRangeFromPoint?.(event.clientX, event.clientY);
   if (!p || p.startContainer.nodeType !== Node.TEXT_NODE) return;
   const node = p.startContainer;
   if (node.parentElement?.closest(skip)) return;
   const token = SG.tokens(node.textContent).find(t => t.index <= p.startOffset && p.startOffset < t.index + t.word.length);
   if (token) {
    const range = new Range(); range.setStart(node, token.index); range.setEnd(node, token.index + token.word.length);
    if ([...range.getClientRects()].some(r => event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom)) display(token.word, node.textContent.trim());
   }
  }, 280);
 });
 document.addEventListener('mouseup', event => {
  if (!enabled || event.composedPath().includes(host)) return;
  const value = selected(); if (value) display(value.word, value.context);
 });
 document.addEventListener('keydown', e => {if (enabled && e.key === 'Escape' && !panel.hidden) close();});
 function clearHighlights() {for (const key of ['unknown', 'seen', 'known']) globalThis.CSS?.highlights?.delete('softgloss-' + key);}
 function schedulePaint() {
  if (!enabled) return;
  clearTimeout(paintTimer); paintEpoch++;
  paintTimer = setTimeout(paint, 160);
 }
 function paint() {
  const epoch = ++paintEpoch; clearHighlights();
  if (!enabled || state.preferences.highlights === false || !globalThis.CSS?.highlights || !globalThis.Highlight || !document.body) return;
  const sets = {unknown: new Highlight(), seen: new Highlight(), known: new Highlight()};
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let nodes = 0, characters = 0;
  function chunk() {
   if (epoch !== paintEpoch || !enabled) return;
   let n, batch = 0; const started = performance.now();
   // Yield between text nodes as well as at the fixed scan limits.
   while (batch++ < 100 && (batch === 1 || performance.now() - started < 8) && nodes < 10000 && characters < 500000 && (n = walker.nextNode())) {
    nodes++;
    if (n.parentElement?.closest(skip)) continue;
    const text = n.textContent.slice(0, Math.min(10000, 500000 - characters)); characters += text.length;
    for (const t of SG.tokens(text)) {
     const a = SG.lookup(t.word); if (!a.length || new Set(a.map(r => r.lemma)).size !== 1) continue;
     const range = new Range(); range.setStart(n, t.index); range.setEnd(n, t.index + t.word.length);
     sets[state.words[a[0].lemma] || 'unknown'].add(range);
    }
   }
   for (const [key, value] of Object.entries(sets)) CSS.highlights.set('softgloss-' + key, value);
   if (n && nodes < 10000 && characters < 500000) paintTimer = setTimeout(chunk, 0);
  }
  chunk();
 }
 const colorStyle = document.createElement('style');
 colorStyle.textContent = '::highlight(softgloss-unknown){background-color:#eeedf0}::highlight(softgloss-seen){background-color:#eee8b8}::highlight(softgloss-known){background-color:#d8eadb}';
 (document.head || document.documentElement).append(colorStyle);
 const observer = new MutationObserver(schedulePaint);
 function observe() {if (document.body) observer.observe(document.body, {childList: true, subtree: true, characterData: true});}
 chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.autoLookup && changes.autoLookup.newValue === false && automatic) disable();
  if (changes.words) {state.words = changes.words.newValue || {}; updateStatuses();}
  if (changes.preferences) {
   state.preferences = changes.preferences.newValue || {highlights: true};
   const toggle = root.querySelector('input[type=checkbox]'); if (toggle) toggle.checked = state.preferences.highlights !== false;
  }
  if (changes.words || changes.preferences) schedulePaint();
 });
 globalThis.__softgloss = {
  show() {automatic = false; enabled = true; panel.hidden = false; observe(); render(); schedulePaint();},
  async autoLookup(word,context) {
   const {autoLookup}=await chrome.storage.local.get({autoLookup:false});
   if(!autoLookup){disable();return;}
   automatic=true;display(word,context);
  },
  isAutomatic() {return automatic && enabled;},
  stopAuto() {if(automatic)disable();},
  openSelection() {automatic=false;
   previousFocus = document.activeElement; enabled = true; observe();
   const value = selected();
   if (value) display(value.word, value.context); else {panel.hidden = false; render();}
   root.getElementById('sg-search').focus(); schedulePaint();
  }
 };
 render(); observe(); schedulePaint();
})();
