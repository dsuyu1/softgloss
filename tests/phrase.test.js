import test from 'node:test';
import assert from 'node:assert/strict';
import '../extension/dictionary-files.js';
for(const f of SG_DICTIONARY_FILES)await import('../extension/'+f);
await import('../extension/core.js');
const {SG}=globalThis;
test('second pilot misses resolve with explicit bounded explanations',()=>{
 for(const [word,lemma] of [['명품','명품'],['기업들의','기업'],['기업들','기업'],['보이지','보이다'],['끌어모으려는','끌어모으다'],['모으려는','모으다'],['성역이냐','성역'],['무슨성역이냐','성역']])assert.ok(SG.lookup(word).some(r=>r.lemma===lemma),word);
 assert.match(SG.lookup('기업들의').find(r=>r.lemma==='기업').parts.join(' '),/plural.*possession/);
 assert.match(SG.lookup('무슨성역이냐')[0].parts.join(' '),/Possible spacing/);
});
test('plural particles and copulas preserve their allomorph constraints',()=>{
 for(const w of ['기업들를','기업들는','성역냐','학교이냐','가짜없는단어들의','가짜없는동사지'])assert.deepEqual(SG.lookup(w),[],w);
 assert.ok(SG.lookup('학교냐').some(r=>r.lemma==='학교'));
});
test('phrases explain adjacent supported negation, ability and intention constructions',()=>{
 for(const [text,pattern] of [['보이지 않는다','-지 않다'],['먹지 않아요','-지 않다'],['할 수 있다','-(으)ㄹ 수 있다'],['일으킬 수 있다','-(으)ㄹ 수 있다'],['먹을 수 없어요','-(으)ㄹ 수 없다'],['먹으려고 해요','-(으)려고 하다']]){
  const result=SG.phrase(text);assert.equal(result.constructions[0]?.pattern,pattern,text);assert.equal(result.components.length,SG.tokens(text).length);
 }
});
test('partial and unknown phrases keep missing words visible without inventing a translation',()=>{
 const r=SG.phrase('보이지 가짜없는말');assert.equal(r.constructions.length,0);assert.deepEqual(r.components[1].results,[]);
 for(const text of ['책 수 있다','먹지. 않는다','먹을 수, 있다','먹지 책 않는다'])assert.equal(SG.phrase(text).constructions.length,0,text);
 assert.equal(SG.phrase('보이지 않는다 그리고 할 수 있다').constructions.length,2);
});
test('selection bounds reject mixed scripts, excessive words and long tokens consistently',()=>{
 for(const text of ['', 'book 책','책 '.repeat(9),'가'.repeat(81),'책 <script>','책\u0000읽다']){assert.deepEqual(SG.selectionWords(text),[],text);assert.equal(SG.phrase(text),null);}
 assert.deepEqual(SG.selectionWords('“책을 읽어요.”'),['책을','읽어요']);
 assert.equal(SG.phrase('책'),null);
});

test('matched constructions prefer relevant homonyms while retaining alternatives',()=>{
 const r=SG.phrase('할 수 있다');assert.ok(r.components[0].results.every(r=>r.lemma==='하다'));assert.equal(r.components[1].results.length,1);assert.match(r.components[1].results[0].meaning,/possibility/);assert.ok(r.components[1].alternatives.length>1);assert.ok(r.components[2].results.every(r=>r.pos==='adjective'));
 assert.equal(SG.phrase('먹지. 않는다 먹지 않는다').constructions.length,1);
});
