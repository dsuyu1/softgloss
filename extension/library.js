let state;
const $ = id => document.getElementById(id);
function download(name, text, type) {
 const url = URL.createObjectURL(new Blob([text], {type}));
 const a = document.createElement('a'); a.href = url; a.download = name; a.click();
 setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function write(message, success) {
 try {await SGWrite(message); await render(); $('message').textContent = success;}
 catch (error) {$('message').textContent = 'Could not save: ' + error.message;}
}
async function render() {
 state = await chrome.storage.local.get({words: {}, cards: []});
 const counts = {unknown: 0, seen: 0, known: 0};
 Object.values(state.words).forEach(s => counts[s]++);
 $('stats').textContent = `${counts.known} known · ${counts.seen} seen · ${state.cards.length} saved sentences`;
 $('cards').replaceChildren();
 if (!state.cards.length) $('cards').textContent = 'No saved sentences yet. Enable SoftGloss on a Korean page to start.';
 for (const c of state.cards) {
  const article = document.createElement('article');
  for (const text of [c.lemma + ' · ' + c.meaning, c.sentence, c.url, ...(c.source ? ['English Wiktionary contributors · CC BY-SA 4.0 · ' + c.source] : [])]) {
   const p = document.createElement('p'); p.textContent = text; article.append(p);
  }
  const b = document.createElement('button'); b.textContent = 'Delete sentence';
  b.onclick = () => write({type: 'deleteCard', card: c}, 'Sentence deleted.');
  article.append(b); $('cards').append(article);
 }
 renderWords();
}
function renderWords() {
 $('words').replaceChildren();
 const query = $('word-filter').value.trim();
 const status = $('status-filter').value;
 const words = Object.entries(state.words).filter(([lemma, value]) => lemma.includes(query) && (!status || status === value));
 $('word-count').textContent = `${words.length} matching words`;
 // Bound DOM size; a filter lets the learner locate any saved word.
 for (const [lemma, value] of words.slice(0, 200)) {
  const row = document.createElement('p'); row.textContent = lemma + ' ';
  const select = document.createElement('select'); select.setAttribute('aria-label', 'Status for ' + lemma);
  for (const s of ['unknown', 'seen', 'known']) {
   const option = document.createElement('option'); option.value = s; option.textContent = s; select.append(option);
  }
  select.value = value;
  select.onchange = () => write({type: 'setWord', lemma, status: select.value}, 'Vocabulary updated.');
  row.append(select); $('words').append(row);
 }
 if (words.length > 200) $('word-count').textContent += ' · showing the first 200; filter to narrow the list';
}
$('word-filter').oninput = renderWords; $('status-filter').onchange = renderWords;
$('search-form').onsubmit = event => {
 event.preventDefault(); $('search-results').replaceChildren();
 const results = SG.search($('search').value);
 if (!results.length) $('search-results').textContent = 'No supported entry in the starter dictionary.';
 for (const r of results) {
  const article = document.createElement('article');
  const title = document.createElement('h3'); title.textContent = r.lemma; title.lang = 'ko'; article.append(title);
  const p = document.createElement('p'); p.textContent = r.parts.join(' · '); article.append(p);
  const list = document.createElement('ol');
  for (const sense of r.senses || [{glosses: [r.meaning], tags: []}]) {const li = document.createElement('li'); li.textContent = (sense.tags.length ? '[' + sense.tags.join(', ') + '] ' : '') + sense.glosses.join('; '); list.append(li);}
  article.append(list);
  if (r.hanja?.length) {const h = document.createElement('p'); h.textContent = 'Hanja spelling: ' + r.hanja.join(' · '); article.append(h);}
  if (r.source) {const a = document.createElement('a'); a.textContent = 'Wiktionary contributors · CC BY-SA 4.0'; a.href = r.source; a.target = '_blank'; a.rel = 'noopener noreferrer'; article.append(a);}
  for (const status of ['unknown', 'seen', 'known']) {
   const b = document.createElement('button'); b.textContent = 'Mark ' + status;
   b.onclick = () => write({type: 'setWord', lemma: r.lemma, status}, r.lemma + ' marked ' + status + '.'); article.append(b);
  }
  $('search-results').append(article);
 }
};
$('backup').onclick = async () => {await render(); download('softgloss-backup.json', JSON.stringify({version: 1, ...state}, null, 2), 'application/json');};
$('anki').onclick = async () => {await render(); download('softgloss-anki.tsv', SG.ankiTSV(state.cards), 'text/tab-separated-values');};
$('clear').onclick = () => {
 if (confirm('Delete all vocabulary and saved sentences from this browser? Export a backup first. This cannot be undone.')) write({type: 'clearLearning'}, 'Learning data deleted.');
};
$('restore').onchange = async event => {
 try {
  const file = event.target.files[0]; if (!file) return;
  if (file.size > 5000000) throw Error('Backup must be under 5 MB.');
  const backup = SG.validateBackup(JSON.parse(await file.text()));
  if (!confirm('Replace your vocabulary and sentences with this backup? Export a backup first if needed.')) return;
  await write({type: 'restore', backup}, 'Backup restored.');
 } catch (error) {$('message').textContent = 'Restore failed: ' + error.message;}
 finally {event.target.value = '';}
};
render();
