import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import crypto from 'node:crypto';
import '../extension/dictionary-files.js';for(const f of SG_DICTIONARY_FILES)await import('../extension/'+f);await import('../extension/core.js');
const {SG,SG_DATA,SG_MORPHOLOGY}=globalThis;
test('source morphology shards match their checksums',()=>{
 const manifest=JSON.parse(fs.readFileSync('data/morphology-manifest.json'));
 for(const file of manifest.files)assert.equal(crypto.createHash('sha256').update(fs.readFileSync('extension/morphology/'+file.path)).digest('hex'),file.sha256);
 assert.equal(manifest.transforms,SG_MORPHOLOGY.rules.length);
});
test('source-listed extended forms resolve to their own entries across every transformation',()=>{
 const entries=new Map(SG_DATA.entries.map(e=>[e.id,e]));
 for(const [from,to,tags,positions] of SG_MORPHOLOGY.rules) {
  // Exercise both ends of every entry whitelist; not an independent accuracy claim.
  for(const position of new Set([positions[0],positions.at(-1)])) {
   const id=SG_MORPHOLOGY.entryIds[position], entry=entries.get(id);assert.ok(entry,id);
   const stem=entry.lemma.slice(0,-1).normalize('NFD');assert.ok(stem.endsWith(from));
   const form=(stem.slice(0,stem.length-from.length)+to).normalize('NFC');
   assert.ok(SG.lookup(form).some(r=>r.id===id&&r.kind==='listed extended conjugation'),`${entry.lemma} -> ${form}`);
  }
 }
});
test('pilot screenshot misses cover connective, modifier and nominalized forms',()=>{
 for(const [surface,lemma] of [['다루면서','다루다'],['중단하는','중단하다'],['드러내기','드러내다'],['있는','있다'],['있는지','있다'],['보고','보다'],['읽으면','읽다'],['먹어서','먹다'],['걸으면서','걷다'],['듣는데','듣다'],['중단하기를','중단하다']])assert.ok(SG.lookup(surface).some(r=>r.lemma===lemma),surface);
});
test('source whitelists preserve homonymous regular and irregular verb distinctions',()=>{
 const regular=SG.lookup('걷으면').filter(r=>r.lemma==='걷다');
 assert.ok(regular.length);assert.ok(regular.every(r=>!r.senses.some(s=>s.glosses.some(g=>/to walk/.test(g)))));
 assert.deepEqual(SG.lookup('미지원가짜동사면서'),[]);
});
test('compound and derived predicate fallbacks expose components without inventing whole-word definitions',()=>{
 const compound=SG.lookup('인기글');assert.deepEqual([...new Set(compound.map(r=>r.lemma))],['인기','글']);
 assert.ok(compound.every(r=>r.kind==='possible compound component' && r.source));
 const derived=SG.lookup('반영된');assert.ok(derived.some(r=>r.lemma==='반영'));assert.ok(derived.some(r=>r.lemma==='되다'));
 assert.ok(derived.every(r=>r.kind==='possible derived predicate component'));
 assert.deepEqual(SG.lookup('청원인은'),[]); // Genuine headword gap retained for the next data pass.
});
