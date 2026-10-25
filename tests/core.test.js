import test from 'node:test';import assert from 'node:assert/strict';
import '../extension/data.js';import '../extension/core.js';
const {SG}=globalThis;
test('listed past tense resolves to the vocabulary lemma',()=>{const [r]=SG.lookup('먹었어요.');assert.equal(r.lemma,'먹다');assert.match(r.parts.join(' '),/past tense/);});
test('dictionary-backed particle analysis',()=>{assert.equal(SG.lookup('학교에서')[0].lemma,'학교');assert.equal(SG.lookup('한국어를')[0].lemma,'한국어');assert.deepEqual(SG.lookup('모르는말에서'),[]);});
test('unsupported forms do not invent definitions',()=>{assert.deepEqual(SG.lookup('지원하지않는단어'),[]);assert.deepEqual(SG.lookup(''),[]);});
test('coverage includes unsupported Korean tokens in denominator',()=>{assert.deepEqual(SG.coverage('책 책을 미지원',{책:'known'}),{total:3,supported:2,known:2,percent:67});});
test('Anki export keeps one row and escapes HTML',()=>{const s=SG.ankiTSV([{lemma:'책',meaning:'<b>book</b>',sentence:'a\tb\nc',url:'https://example.com'}]);assert.equal(s.split('\n').length,3);assert.match(s,/&lt;b&gt;/);assert.match(s,/a b c/);});
test('backup validates schema, statuses and field bounds',()=>{assert.throws(()=>SG.validateBackup({version:1,words:{책:'admin'},cards:[]}));assert.throws(()=>SG.validateBackup({version:1,words:{},cards:[{lemma:'책'}]}));const b={version:1,words:{책:'known'},cards:[]};assert.deepEqual(SG.validateBackup(b),b);});
