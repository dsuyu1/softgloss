(() => {
const particles = [['에서','location of an action; starting point'],['에게','recipient'],['으로','direction; means'],['부터','starting point'],['까지','endpoint'],['은','topic / contrast'],['는','topic / contrast'],['이','subject'],['가','subject'],['을','object'],['를','object'],['에','location; time; destination'],['도','also'],['만','only'],['의','possession / relation'],['와','and; with'],['과','and; with'],['로','direction; means']];
const indexes = new WeakMap();
function index(data) {
 if (!indexes.has(data)) indexes.set(data, new Map(data.entries.map(x => [x.lemma, x])));
 return indexes.get(data);
}
function lookup(input, data = globalThis.SG_DATA) {
 const word = String(input).normalize('NFC').replace(/^[^가-힣]+|[^가-힣]+$/gu,'');
 if (!word || word.length > 80) return [];
 const out = [], entries = index(data);
 if(entries.has(word)) out.push({...entries.get(word),surface:word,parts:[],kind:'dictionary'});
 const form = data.forms[word];
 if(form && entries.has(form[0])) out.push({...entries.get(form[0]),surface:word,parts:form.slice(1),kind:'listed form'});
 // Only dictionary-backed noun/pronoun bases; never treat arbitrary suffix stripping as a full parser.
 for(const [suffix,note] of particles) {
  if(!word.endsWith(suffix)) continue;
  const base = entries.get(word.slice(0,-suffix.length));
  if(base && ['noun','pronoun'].includes(base.pos)) out.push({...base,surface:word,parts:[`-${suffix}: ${note}`],kind:'possible particle analysis'});
 }
 return out;
}
function search(input, data = globalThis.SG_DATA) {
 const query = String(input).trim().normalize('NFC').toLowerCase();
 if (!query || query.length > 80) return [];
 const exact = lookup(query, data);
 const seen = new Set(exact.map(x => x.lemma));
 return exact.concat(data.entries.filter(x => !seen.has(x.lemma) && (x.lemma.includes(query) || x.meaning.toLowerCase().includes(query))).map(x => ({...x, surface: query, parts: [], kind: 'dictionary search'}))).slice(0, 20);
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
 return '#separator:Tab\n#html:true\n'+cards.map(c=>[c.lemma,c.meaning,c.sentence,c.url].map(clean).join('\t')).join('\n');
}
function validateBackup(value) {
 if(!value || value.version!==1 || !value.words || typeof value.words!=='object' || Array.isArray(value.words) || !Array.isArray(value.cards) || value.cards.length>10000) throw Error('Unsupported backup.');
 const words={}; for(const [k,v] of Object.entries(value.words)){if(!/^[가-힣]{1,80}$/u.test(k)||!['unknown','seen','known'].includes(v))throw Error('Invalid vocabulary.');words[k]=v;}
 const cards=value.cards.map(c=>{if(!c||!['lemma','meaning','sentence','url'].every(k=>typeof c[k]==='string'&&c[k].length<=5000))throw Error('Invalid sentence card.');return Object.fromEntries(['lemma','meaning','sentence','url'].map(k=>[k,c[k]]));});
 return {version:1,words,cards};
}
globalThis.SG = {lookup,search,tokens,coverage,ankiTSV,validateBackup};
})();
