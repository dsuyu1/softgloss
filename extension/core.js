(() => {
const particles = [['에서','location of an action; starting point'],['에게','recipient'],['으로','direction; means'],['부터','starting point'],['까지','endpoint'],['은','topic / contrast'],['는','topic / contrast'],['이','subject'],['가','subject'],['을','object'],['를','object'],['에','location; time; destination'],['도','also'],['만','only'],['의','possession / relation'],['와','and; with'],['과','and; with'],['로','direction; means']];
const indexes = new WeakMap();
function index(data) {
 if (!indexes.has(data)) {
  const lemmas = new Map(), forms = new Map();
  for (const e of data.entries) {
   if (!lemmas.has(e.lemma)) lemmas.set(e.lemma, []);
   lemmas.get(e.lemma).push(e);
   for (const [surface, tags] of e.listedForms || []) {
    if (!forms.has(surface)) forms.set(surface, []);
    forms.get(surface).push({entry: e, tags});
   }
  }
  indexes.set(data, {lemmas, forms});
 }
 return indexes.get(data);
}
function lookup(input, data = globalThis.SG_DATA) {
 const word = String(input).normalize('NFC').replace(/^[^가-힣]+|[^가-힣]+$/gu,'');
 if (!word || word.length > 80) return [];
 const out = [], {lemmas, forms} = index(data);
 const add = (entry, parts, kind, details = {}) => out.push({...entry, surface: word, parts, kind, ...details});
 for (const entry of lemmas.get(word) || []) add(entry, [], 'dictionary');
 // Imported forms retain their own source entry, so homonyms do not borrow conjugations.
 for (const {entry, tags} of forms.get(word) || []) {
  const labels = tags.map(t => ({past:'past tense', 'non-past':'non-past', polite:'polite speech', informal:'informal style', formal:'formal style', indicative:'declarative table form'}[t] || t));
  add(entry, ['Listed conjugation: ' + labels.join(' · ')], 'listed conjugation');
 }
 const form = data.forms?.[word];
 if (form && !forms.has(word)) for (const entry of lemmas.get(form[0]) || []) add(entry, form.slice(1), 'listed form');
 for (const [suffix,note] of particles) {
  if (!word.endsWith(suffix)) continue;
  const stem = word.slice(0,-suffix.length);
  const final = stem ? (stem.charCodeAt(stem.length-1)-0xAC00)%28 : -1;
  const pairs = {은:true,는:false,이:true,가:false,을:true,를:false,과:true,와:false};
  if (suffix in pairs && Boolean(final) !== pairs[suffix]) continue;
  if (suffix === '으로' && (final === 0 || final === 8)) continue;
  if (suffix === '로' && final !== 0 && final !== 8) continue;
  for (const base of lemmas.get(stem) || []) {
   if (['noun','pronoun'].includes(base.pos)) add(base, [`-${suffix}: ${note}`], 'possible particle analysis', {particle:suffix});
  }
 }
 const unique = new Map();
 for (const result of out) {
  const key = (result.id || result.lemma) + '|' + result.parts.join('|');
  if (!unique.has(key)) unique.set(key, result);
 }
 return [...unique.values()];
}
function search(input, data = globalThis.SG_DATA) {
 const query = String(input).trim().normalize('NFC').toLowerCase();
 if (!query || query.length > 80) return [];
 const exact = lookup(query, data);
 const seen = new Set(exact.map(x => x.id || x.lemma));
 const matches = [];
 for (const entry of data.entries) {
  if (seen.has(entry.id || entry.lemma)) continue;
  const glosses = entry.senses?.flatMap(s => s.glosses) || [entry.meaning];
  const exactGloss = glosses.some(g => g.toLowerCase() === query);
  if (entry.lemma.includes(query) || glosses.some(g => g.toLowerCase().includes(query))) matches.push({entry, rank: exactGloss ? 0 : entry.lemma.startsWith(query) ? 1 : 2});
 }
 matches.sort((a,b) => a.rank - b.rank || a.entry.lemma.length - b.entry.lemma.length || (a.entry.lemma < b.entry.lemma ? -1 : a.entry.lemma > b.entry.lemma ? 1 : 0));
 return exact.concat(matches.map(({entry}) => ({...entry, surface: query, parts: [], kind: 'dictionary search'}))).slice(0, 20);
}
// Preserve offsets into the original DOM text; normalization can change its length.
function tokens(text) {return [...String(text).matchAll(/[가-힣]+/gu)].map(m=>({word:m[0],index:m.index}));}
function coverage(text, words) {
 let supported=0,known=0; const all=tokens(text);
 for(const {word} of all){const a=lookup(word);if(a.length){supported++;if(a.every(x=>words[x.lemma]==='known'))known++;}}
 return {total:all.length,supported,known,percent:all.length?Math.round(100*known/all.length):0};
}
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function ankiTSV(cards) {
 const clean=s=>escapeHtml(String(s ?? '').replace(/[\t\r\n]+/g,' '));
 return '#separator:Tab\n#html:true\n'+cards.map(c=>[c.lemma,c.meaning + (c.source ? ' [English Wiktionary contributors · CC BY-SA 4.0 · ' + c.source + ']' : ''),c.sentence,c.url].map(clean).join('\t')).join('\n');
}
function validateBackup(value) {
 if(!value || value.version!==1 || !value.words || typeof value.words!=='object' || Array.isArray(value.words) || !Array.isArray(value.cards) || value.cards.length>10000) throw Error('Unsupported backup.');
 const words={}; for(const [k,v] of Object.entries(value.words)){if(!/^[가-힣]{1,80}$/u.test(k)||!['unknown','seen','known'].includes(v))throw Error('Invalid vocabulary.');words[k]=v;}
 const cards=value.cards.map(c=>{if(!c||!['lemma','meaning','sentence','url'].every(k=>typeof c[k]==='string'&&c[k].length<=5000))throw Error('Invalid sentence card.');const card = Object.fromEntries(['lemma','meaning','sentence','url'].map(k=>[k,c[k]]));
 for (const k of ['entryId','source','license']) if (c[k] !== undefined) {if (typeof c[k] !== 'string' || c[k].length > 1000) throw Error('Invalid attribution.'); card[k] = c[k];}
 if (card.source && (!/^https:\/\/en\.wiktionary\.org\/wiki\//.test(card.source) || card.license !== 'CC-BY-SA-4.0')) throw Error('Invalid dictionary source.');
 return card;});
 return {version:1,words,cards};
}
function grammarFor(result) {return (globalThis.SG_GRAMMAR || []).filter(card => result.kind === 'possible particle analysis' && card.forms.includes(result.particle));}
globalThis.SG = {lookup,search,tokens,coverage,ankiTSV,validateBackup,grammarFor};
})();
