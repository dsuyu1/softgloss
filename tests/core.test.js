import test from 'node:test';import assert from 'node:assert/strict';
import '../extension/data.js';import '../extension/core.js';
const {SG}=globalThis;
test('listed past tense resolves to the vocabulary lemma',()=>{const [r]=SG.lookup('먹었어요.');assert.equal(r.lemma,'먹다');assert.match(r.parts.join(' '),/past tense/);});
test('dictionary-backed particle analysis',()=>{assert.equal(SG.lookup('학교에서')[0].lemma,'학교');assert.equal(SG.lookup('한국어를')[0].lemma,'한국어');assert.deepEqual(SG.lookup('모르는말에서'),[]);});
test('unsupported forms do not invent definitions',()=>{assert.deepEqual(SG.lookup('지원하지않는단어'),[]);assert.deepEqual(SG.lookup(''),[]);});
test('coverage includes unsupported Korean tokens in denominator',()=>{assert.deepEqual(SG.coverage('책 책을 미지원',{책:'known'}),{total:3,supported:2,known:2,percent:67});});
test('Anki export keeps one row and escapes HTML',()=>{const s=SG.ankiTSV([{lemma:'책',meaning:'<b>book</b>',sentence:'a\tb\nc',url:'https://example.com'}]);assert.equal(s.split('\n').length,3);assert.match(s,/&lt;b&gt;/);assert.match(s,/a b c/);});
test('backup validates schema, statuses and field bounds',()=>{assert.throws(()=>SG.validateBackup({version:1,words:{책:'admin'},cards:[]}));assert.throws(()=>SG.validateBackup({version:1,words:{},cards:[{lemma:'책'}]}));const b={version:1,words:{책:'known'},cards:[]};assert.deepEqual(SG.validateBackup(b),b);});
test('manual search supports English glosses, Korean stems and listed forms',()=>{
 assert.equal(SG.search('BOOK')[0].lemma,'책');
 assert.equal(SG.search('먹었어요')[0].lemma,'먹다');
 assert.ok(SG.search('공부').some(x=>x.lemma==='공부하다'));
 assert.deepEqual(SG.search(' '),[]);
 assert.deepEqual(SG.search('a'.repeat(81)),[]);
});
test('token offsets refer to original text even after decomposed characters',()=>{
 const text='e\u0301 책을 읽어요';
 for(const t of SG.tokens(text))assert.equal(text.slice(t.index,t.index+t.word.length),t.word);
 assert.equal(SG.tokens(text)[0].index,3);
});
