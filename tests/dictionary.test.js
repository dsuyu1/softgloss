import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import '../extension/dictionary-files.js';
for (const file of SG_DICTIONARY_FILES) await import('../extension/' + file);
await import('../extension/core.js');
const manifest = JSON.parse(fs.readFileSync('extension/dictionary/dictionary-manifest.json'));
test('shipped data matches the locked checksums and has unique entry IDs', () => {
 assert.equal(SG_DATA.entries.filter(e => e.source).length, manifest.entries);
 assert.equal(new Set(SG_DATA.entries.map(e => e.id)).size, SG_DATA.entries.length);
 for (const file of manifest.files) {
  const bytes = fs.readFileSync('extension/dictionary/' + file.path);
  assert.equal(bytes.length, file.bytes);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), file.sha256);
 }
});
test('all imported senses retain source IDs, English definitions and labels', () => {
 let count = 0;
 for (const entry of SG_DATA.entries.filter(e => e.source)) {
  assert.ok(entry.source.startsWith('https://en.wiktionary.org/wiki/'));
  assert.equal(entry.license, 'CC-BY-SA-4.0');
  for (const sense of entry.senses) {count++; assert.ok(sense.id && sense.glosses.length && Array.isArray(sense.tags));}
 }
 assert.equal(count, manifest.senses);
});
test('broader vocabulary, hanja and ambiguous dictionary meanings are accessible', () => {
 assert.ok(SG.lookup('병원').some(e => /hospital/i.test(e.meaning)));
 assert.ok(SG.lookup('학교').some(e => e.hanja.includes('學校')));
 const senses = SG.lookup('배').flatMap(e => e.senses?.flatMap(s => s.glosses) || []);
 for (const meaning of ['pear','boat','stomach']) assert.ok(senses.some(g => g.includes(meaning)), meaning);
 assert.ok(SG.search('hospital').some(e => e.lemma === '병원'));
});
test('listed irregulars and contractions resolve without suffix guesses', () => {
 for (const [surface, lemma] of [
  ['걸었어요','걷다'], ['들었어요','듣다'], ['도왔어요','돕다'], ['몰랐어요','모르다'],
  ['아름다웠어요','아름답다'], ['예뻤어요','예쁘다'], ['추웠어요','춥다'], ['더웠어요','덥다'],
  ['달랐어요','다르다'], ['빨랐어요','빠르다'], ['살아요','살다'], ['불렀어요','부르다'],
  ['했어요','하다'], ['봤어요','보다'], ['마셨어요','마시다'], ['배웠어요','배우다'],
  ['썼어요','쓰다'], ['왔어요','오다'], ['갔어요','가다'], ['읽었습니다','읽다']
 ]) assert.ok(SG.lookup(surface).some(e => e.lemma === lemma), surface);
 assert.deepEqual(SG.lookup('소프트글로스미지원단어'), []);
});
test('homonymous verbs do not acquire one another\'s listed conjugations', () => {
 const walk = SG.lookup('걸었어요').filter(e => e.lemma === '걷다');
 assert.ok(walk.some(e => e.senses.some(s => s.glosses.some(g => /walk/i.test(g)))));
 const regular = SG.lookup('걷었어요').filter(e => e.lemma === '걷다');
 assert.ok(regular.length);
 assert.ok(regular.every(e => !e.senses.some(s => s.glosses.some(g => /to walk/.test(g)))));
});
test('legacy backups remain valid and new dictionary attribution survives export', () => {
 const entry = SG.lookup('병원')[0];
 const card = {lemma: entry.lemma, meaning: entry.meaning, sentence: '병원에 가요.', url: 'https://example.test/', entryId: entry.id, source: entry.source, license: entry.license};
 const data = {version: 1, words: {병원:'known'}, cards: [card]};
 assert.deepEqual(SG.validateBackup(data), data);
 const tsv = SG.ankiTSV([card]);
 assert.match(tsv, /Wiktionary contributors/); assert.match(tsv, /CC BY-SA 4.0/);
 assert.equal(tsv.split('\n').at(-1).split('\t').length, 4);
 assert.throws(() => SG.validateBackup({...data, cards: [{...card, source:'javascript:alert(1)'}]}));
});
