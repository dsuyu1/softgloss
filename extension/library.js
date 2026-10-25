let state,activeReview=null,answerShown=false;
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
 state = await chrome.storage.local.get({words: {}, cards: [],reviewCards:{}});
 const counts = {unknown: 0, seen: 0, known: 0};
 Object.values(state.words).forEach(s => counts[s]++);
 $('stats').textContent = `${counts.known} known · ${counts.seen} seen · ${state.cards.length} saved sentences`;
 $('cards').replaceChildren();
 if (!state.cards.length) $('cards').textContent = 'No saved sentences yet. Enable Bungeoppang on a Korean page to start.';
 for (const c of state.cards) {
  const article = document.createElement('article');
  for (const text of [c.lemma + ' · ' + c.meaning, c.sentence, c.url, ...(c.source ? ['English Wiktionary contributors · CC BY-SA 4.0 · ' + c.source] : [])]) {
   const p = document.createElement('p'); p.textContent = text; article.append(p);
  }
  const b = document.createElement('button'); b.textContent = 'Delete sentence';
  b.onclick = () => write({type: 'deleteCard', card: c}, 'Sentence deleted.');
  article.append(b); $('cards').append(article);
 }
 renderWords();renderReviews();
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
  for (const card of SG.grammarFor(r)) {
   const details = document.createElement('details'); const title = document.createElement('summary'); title.textContent = 'Grammar hint · ' + card.title; details.append(title);
   for (const text of [card.hint, card.explanation, card.example]) {const p = document.createElement('p'); p.textContent = text; details.append(p);}
   const source = document.createElement('a'); source.textContent = 'Wiktionary contributors · CC BY-SA 4.0'; source.href = card.source; source.target = '_blank'; source.rel = 'noopener noreferrer'; details.append(source); article.append(details);
  }
  const list = document.createElement('ol');
  for (const sense of r.senses || [{glosses: [r.meaning], tags: []}]) {const li = document.createElement('li'); li.textContent = (sense.tags.length ? '[' + sense.tags.join(', ') + '] ' : '') + sense.glosses.join('; '); list.append(li);}
  article.append(list);
  if (r.hanja?.length) {const h = document.createElement('p'); h.textContent = 'Hanja spelling: ' + r.hanja.join(' · '); article.append(h);}
  if (r.source) {const a = document.createElement('a'); a.textContent = 'Wiktionary contributors · CC BY-SA 4.0'; a.href = r.source; a.target = '_blank'; a.rel = 'noopener noreferrer'; article.append(a);}
  for (const status of ['unknown', 'seen', 'known']) {
   const b = document.createElement('button'); b.textContent = 'Mark ' + status;
   b.onclick = () => write({type: 'setWord', lemma: r.lemma, status}, r.lemma + ' marked ' + status + '.'); article.append(b);
  }
  const add=document.createElement('button');add.textContent='Add to reviews';add.onclick=()=>write({type:'addReview',card:{id:r.id||'softgloss:'+r.lemma,entryId:r.id||'softgloss:'+r.lemma,lemma:r.lemma,meaning:r.meaning,sentence:'',url:'',...(r.source?{source:r.source,license:r.license}:{})}},'Added to your review deck.');article.append(add);
  for(const example of SG.examplesFor(r)){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Dictionary sentence example';details.append(summary);for(const text of [example.korean,example.english,'Sense: '+example.senseGloss]){const p=document.createElement('p');p.textContent=text;details.append(p);}article.append(details);}
  $('search-results').append(article);
 }
};
$('backup').onclick = async () => {await render(); download('softgloss-backup.json', JSON.stringify({version: 2, ...state}, null, 2), 'application/json');};
$('anki').onclick = async () => {await render(); download('softgloss-anki.tsv', SG.ankiTSV([...state.cards,...Object.values(state.reviewCards).filter(c=>!state.cards.some(s=>s.entryId===c.entryId&&s.sentence===c.sentence))]), 'text/tab-separated-values');};
$('clear').onclick = () => {
 if (confirm('Delete all vocabulary, saved sentences and review schedules from this browser? Export a backup first. This cannot be undone.')) write({type: 'clearLearning'}, 'Learning data deleted.');
};
$('restore').onchange = async event => {
 try {
  const file = event.target.files[0]; if (!file) return;
  if (file.size > 30000000) throw Error('Backup must be under 30 MB.');
  const backup = SG.validateBackup(JSON.parse(await file.text()));
  if (!confirm('Replace your vocabulary, sentences and review schedules with this backup? Export a backup first if needed.')) return;
  await write({type: 'restore', backup}, 'Backup restored.');
 } catch (error) {$('message').textContent = 'Restore failed: ' + error.message;}
 finally {event.target.value = '';}
};
render();

function reviewText(tag,text,parent){const node=document.createElement(tag);node.textContent=text;parent.append(node);return node;}
function reviewButton(text,action,parent){const b=reviewText('button',text,parent);b.type='button';b.onclick=action;return b;}
function renderReviews(){
 const deck=state.reviewCards,now=Date.now(),due=SGSRS.due(deck,now),all=Object.values(deck),box=$('review');
 $('review-stats').textContent=due.length+' due · '+all.filter(c=>c.schedule.state===0&&!c.suspended).length+' new · '+all.length+' cards';
 const next=due[0];
 if(!next||next.id!==activeReview?.id||next.revision!==activeReview?.revision){activeReview=next||null;answerShown=false;}
 box.replaceChildren();
 if(!next){
  const future=all.filter(c=>!c.suspended).sort((a,b)=>Date.parse(a.schedule.due)-Date.parse(b.schedule.due))[0];
  reviewText('p',future?'You’re done for now. Next review: '+new Date(future.schedule.due).toLocaleString()+'.':'Your review deck is empty. Add a word from a dictionary result to begin.',box);
 }else{
  reviewText('h3',next.lemma,box).lang='ko';
  if(!answerShown)reviewButton('Show answer',()=>{answerShown=true;renderReviews();},box);
  else{
   reviewText('p',next.meaning,box);
   if(next.sentence)reviewText('p',next.sentence,box).lang='ko';
   const entry=SG.lookup(next.lemma).find(e=>e.id===next.entryId);
   if(entry)for(const example of SG.examplesFor(entry)){reviewText('p',example.korean,box).lang='ko';reviewText('p',example.english,box);}
   const learning=globalThis.SG_LEARNING_EXAMPLES?.[next.lemma];if(learning?.[2]===next.entryId){reviewText('small','Original learning example',box);reviewText('p',learning[0],box).lang='ko';reviewText('p',learning[1],box);}
   if(next.source){const a=reviewText('a','Wiktionary contributors · CC BY-SA 4.0',box);a.href=next.source;a.target='_blank';a.rel='noopener noreferrer';}
   const ratings=reviewText('div','',box);ratings.className='review-ratings';const preview=SGSRS.preview(next,new Date(now));
   for(const [i,label] of ['Again','Hard','Good','Easy'].entries())reviewButton(label+' · '+SGSRS.interval(preview[i+1].card.due,now),async()=>{
    for(const b of ratings.querySelectorAll('button'))b.disabled=true;
    try{await SGWrite({type:'rateReview',id:next.id,rating:i+1,revision:next.revision});answerShown=false;await render();$('message').textContent='Review saved.';}
    catch(e){$('message').textContent=e.message;await render();}
   },ratings);
   reviewText('small','Again: forgot · Hard: recalled with effort · Good: recalled · Easy: effortless',box);
  }
 }
 renderReviewDeck();
}
function renderReviewDeck(){
 const box=$('review-deck');box.replaceChildren();const query=$('review-filter').value.trim();
 const cards=Object.values(state.reviewCards).filter(c=>c.lemma.includes(query));
 reviewText('p',cards.length+' cards · showing up to 100',box);
 for(const c of cards.slice(0,100)){
  const row=reviewText('div','',box);reviewText('span',c.lemma+' · '+(c.suspended?'Suspended':c.schedule.state===0?'New':new Date(c.schedule.due).toLocaleString()),row);
  reviewButton(c.suspended?'Resume':'Suspend',()=>write({type:'suspendReview',id:c.id,suspended:!c.suspended},'Review deck updated.'),row);
  reviewButton('Remove',()=>{if(confirm('Remove '+c.lemma+' and its review history?'))write({type:'removeReview',id:c.id},'Review card removed.');},row);
 }
}
$('review-filter').oninput=renderReviewDeck;
$('refresh-reviews').onclick=()=>render();
chrome.storage.onChanged.addListener((changes,area)=>{if(state&&area==='local'&&changes.reviewCards){state.reviewCards=changes.reviewCards.newValue||{};renderReviews();}});
