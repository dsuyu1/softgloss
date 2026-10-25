(async () => {
 if (globalThis.__softgloss) {globalThis.__softgloss.show(); return;}
 const {SG} = globalThis;
 const host = document.createElement('div'); host.id = 'softgloss-root';
 document.documentElement.append(host);
 const root = host.attachShadow({mode: 'closed'});
 const style = document.createElement('style');
 style.textContent = `:host{all:initial}section{position:fixed;z-index:2147483647;right:16px;top:16px;width:min(380px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto;box-sizing:border-box;background:#faf8f3;color:#253e34;border:1px solid #bfcfc2;border-radius:18px;padding:20px;box-shadow:0 8px 30px #0002;font:15px/1.6 system-ui}summary{cursor:pointer;font-weight:600}details{margin:10px 0}h2{font-size:22px;margin:6px 0}p{margin:8px 0;overflow-wrap:anywhere}button,input{font:inherit}button{cursor:pointer;border:1px solid #bfcfc2;border-radius:9px;background:#e7eee5;color:#253e34;padding:7px 11px;margin:4px 5px 4px 0}button[aria-pressed=true]{border:2px solid #253e34;font-weight:700}button:focus-visible,input:focus-visible{outline:3px solid #4c7656;outline-offset:2px}input[type=search]{width:100%;box-sizing:border-box;padding:8px;border:1px solid #8c9c8f;border-radius:8px;background:#fff;color:#253e34}small{display:block;color:#5c6d62}hr{border:0;border-top:1px solid #d9dfd6}#notice{min-height:1.5em}`;
 root.append(style);
 const panel = document.createElement('section');
 panel.setAttribute('role', 'region'); panel.setAttribute('aria-label', 'SoftGloss Korean dictionary'); root.append(panel);
 let state = await chrome.storage.local.get({words: {}, preferences: {highlights: true}});
 let current = '', sentence = '', results = [], enabled = true, previousFocus = null, automatic = false;
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
  panel.replaceChildren(); el('small', 'SOFTGLOSS · OFFLINE ALPHA');
  button('Close', close); button('My library', () => chrome.runtime.sendMessage({type: 'openLibrary'}));
  button('Disable on this page', () => {
   disable();
  });
  const label = el('label', 'Highlight vocabulary ');
  const toggle = document.createElement('input'); toggle.type = 'checkbox'; toggle.checked = state.preferences.highlights !== false; label.append(toggle);
  toggle.addEventListener('change', async () => {if (!await write({type: 'setHighlights', enabled: toggle.checked})) toggle.checked = state.preferences.highlights !== false;});
  const form = el('form', ''); const searchLabel = el('label', 'Korean word or English meaning', form);
  const input = document.createElement('input'); input.type = 'search'; input.maxLength = 80; input.id = 'sg-search';
  searchLabel.htmlFor = input.id; input.value = current; form.append(input);
  const submit = el('button', 'Search', form); submit.type = 'submit';
  form.addEventListener('submit', e => {e.preventDefault(); display(input.value, '', true); root.getElementById('sg-search').focus();});
  el('h2', current || 'A little help reading Korean.');
  el('small', 'Offline dictionary · Wiktionary + original fallback entries');
  if (!current) el('p', 'Hover or select a Korean word. Press Alt+Shift+K to look up a selection or focus search. Change the shortcut at chrome://extensions/shortcuts.');
  else if (!results.length) el('p', 'No supported entry yet. Try a dictionary form or an English meaning. Multiword idioms and unlisted endings may be unsupported.');
  for (const r of results) {
   el('hr', ''); el('h2', r.lemma).lang = 'ko';
   if (r.senses) {
    const senses = el('ol', '');
    for (const sense of r.senses) el('li', (sense.tags.length ? '[' + sense.tags.join(', ') + '] ' : '') + sense.glosses.join('; '), senses);
   } else el('p', r.meaning);
   el('small', r.pos + ' · ' + r.kind);
   if (r.hanja?.length) el('small', 'Hanja spelling: ' + r.hanja.join(' · '));
   if (r.source) {const link = el('a', 'Wiktionary contributors · CC BY-SA 4.0'); link.href = r.source; link.target = '_blank'; link.rel = 'noopener noreferrer';}
   if (results.length > 1) el('small', 'Several dictionary entries or analyses may fit; context decides.');
   r.parts.forEach(p => el('p', p));
   for (const card of SG.grammarFor(r)) {
    const details = el('details', ''); el('summary', 'Grammar hint · ' + card.title, details);
    el('p', card.hint, details);
    const more = el('details', '', details); el('summary', 'Explain and show an example', more);
    el('p', card.explanation, more); el('p', card.example, more);
    const link = el('a', 'Grammar source · Wiktionary contributors · CC BY-SA 4.0', more);
    link.href = card.source; link.target = '_blank'; link.rel = 'noopener noreferrer';
   }
   const statusLine = el('small', ''); statusLine.dataset.lemma = r.lemma;
   for (const status of ['unknown', 'seen', 'known']) {
    const b = button(status, () => write({type: 'setWord', lemma: r.lemma, status}, 'Vocabulary updated.'));
    b.dataset.lemma = r.lemma; b.dataset.status = status;
    b.setAttribute('aria-label', `Mark ${r.lemma} ${status}`);
   }
   const save = button('Save sentence', () => write({type: 'saveCard', card: {
    lemma: r.lemma, meaning: r.meaning, ...(r.source ? {entryId: r.id, source: r.source, license: r.license} : {}), sentence: sentence.slice(0, 2000), url: location.origin + location.pathname
   }}, 'Saved to your library.'));
   save.disabled = !sentence.trim();
  }
  const message = el('p', ''); message.id = 'notice'; message.setAttribute('role', 'status');
  el('small', sentence ? 'Saved cards include nearby text and the page address without query parameters.' : 'Select or hover page text to capture a sentence. Manual search does not save unrelated page text.');
  updateStatuses();
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
  current = value; sentence = context; results = manual ? SG.search(value) : SG.lookup(value);
  panel.hidden = false; render();
 }
 function selected() {
  const selection = getSelection();
  if (selection?.anchorNode?.parentElement?.closest(skip) || selection?.focusNode?.parentElement?.closest(skip)) return null;
  const text = selection?.toString().trim();
  if (!text || text.length > 80 || SG.tokens(text).length !== 1) return null;
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
 colorStyle.textContent = '::highlight(softgloss-unknown){background-color:#f5e2d5}::highlight(softgloss-seen){background-color:#eee8b8}::highlight(softgloss-known){background-color:#d8eadb}';
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
