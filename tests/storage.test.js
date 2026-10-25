import test from 'node:test';
import assert from 'node:assert/strict';
import '../extension/vendor/ts-fsrs-5.4.2.js';
import '../extension/srs.js';
import '../extension/core.js';
import '../extension/mutations.js';
function fixture() {
 let value = {};
 let fail = false;
 const storage = {
  async get(defaults) {await new Promise(r => setTimeout(r, 1)); return structuredClone({...defaults, ...value});},
  async set(update) {await new Promise(r => setTimeout(r, 1)); if (fail) {fail = false; throw Error('Storage full');} Object.assign(value, structuredClone(update));}
 };
 return {store: SGStore.createStore(storage), read: () => value, fail: () => {fail = true;}};
}
const card = {lemma: '책', meaning: 'book', sentence: '책을 읽어요.', url: 'https://example.test/article'};
test('parallel vocabulary writes preserve every tab update', async () => {
 const f = fixture();
 await Promise.all(['책', '학교', '밥'].map(lemma => f.store.apply({type: 'setWord', lemma, status: 'known'})));
 assert.deepEqual(f.read().words, {책: 'known', 학교: 'known', 밥: 'known'});
});
test('parallel sentence saves deduplicate and retain distinct cards', async () => {
 const f = fixture();
 await Promise.all([card, card, {...card, sentence: '책이 있어요.'}].map(card => f.store.apply({type: 'saveCard', card})));
 assert.equal(f.read().cards.length, 2);
});
test('a failed write does not poison subsequent writes', async () => {
 const f = fixture(); f.fail();
 await assert.rejects(f.store.apply({type: 'setWord', lemma: '책', status: 'known'}), /Storage full/);
 await f.store.apply({type: 'setWord', lemma: '학교', status: 'seen'});
 assert.deepEqual(f.read().words, {학교: 'seen'});
});
test('restore and subsequent writes have a defined order', async () => {
 const f = fixture();
 await Promise.all([
  f.store.apply({type: 'restore', backup: {version: 1, words: {책: 'seen'}, cards: [card]}}),
  f.store.apply({type: 'setWord', lemma: '학교', status: 'known'}),
  f.store.apply({type: 'deleteCard', card})
 ]);
 assert.deepEqual(f.read().words, {책: 'seen', 학교: 'known'});
 assert.deepEqual(f.read().cards, []);
});
test('invalid operations leave learning data intact', async () => {
 const f = fixture();
 await f.store.apply({type: 'saveCard', card});
 for (const message of [
  {type: 'saveCard', card: {...card, sentence: ''}},
  {type: 'setWord', lemma: '책', status: 'admin'},
  {type: 'restore', backup: {version: 99}},
  {type: 'setHighlights', enabled: 'false'}
 ]) await assert.rejects(f.store.apply(message));
 assert.deepEqual(f.read().cards, [card]);
});
test('data deletion preserves display preferences', async () => {
 const f = fixture();
 await f.store.apply({type: 'setHighlights', enabled: false});
 await f.store.apply({type: 'saveCard', card});
 await f.store.apply({type: 'clearLearning'});
 assert.deepEqual(f.read(), {words: {}, cards: [], reviewCards:{},reviewUndo:null,preferences: {highlights: false}});
});
