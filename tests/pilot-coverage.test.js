import test from 'node:test';import assert from 'node:assert/strict';
import '../extension/dictionary-files.js';for(const f of SG_DICTIONARY_FILES)await import('../extension/'+f);await import('../extension/core.js');
test('third-round screenshot gaps and earlier misses remain covered',()=>{
 for(const [surface,lemma] of [['지도부','지도부'],['하단에는','하단'],['전원주택은','전원주택'],['전원생활이','전원생활'],['청원인은','청원인'],['그렇다면','그렇다'],['성공하려면','성공하다'],['할까','하다'],['기업들의','기업'],['끌어모으려는','끌어모으다'],['무슨성역이냐','성역'],['보이지','보이다'],['신천지예수교증거장막성전','신천지예수교증거장막성전']])assert.ok(SG.lookup(surface).some(r=>r.lemma===lemma),surface);
 for(const w of ['지도부','전원주택','전원생활'])assert.ok(SG.lookup(w).every(r=>r.kind==='dictionary'),w);
});
test('stacked particles and ending candidates stay bounded to supported bases',()=>{
 for(const w of ['학교에서는','기업들에도','집으로는'])assert.ok(SG.lookup(w).some(r=>r.kind==='possible stacked particle analysis'),w);
 for(const w of ['가짜없는말에는','가짜없는말려면','가짜없는말까','책다면','집으로는는'])assert.deepEqual(SG.lookup(w),[],w);
 assert.ok(SG.phrase('그렇다면 전원생활이 성공하려면 무엇부터 준비해야 할까').components.every(c=>c.results.length));
});
test('cafe screenshot conversational endings and clothing terms resolve without guessed names',()=>{
 for(const [word,lemma] of [['놀랐네요','놀라다'],['상당하네요','상당하다'],['했는데','하다'],['같은데요','같다'],['떨어져도','떨어지다'],['깃털처럼','깃털'],['가격대나','가격대'],['베이지의','베이지'],['보온성은','보온성'],['피코트를','피코트'],['저렴한','저렴하다'],['컬러풀함에','컬러풀하다']])assert.ok(SG.lookup(word).some(r=>r.lemma===lemma),word);
 for(const w of ['가짜없는말네요','책네요','살네요','가짜없는말처럼','책이나나','집나','학교이나'])assert.deepEqual(SG.lookup(w),[],w);
 assert.ok(SG.lookup('집이나').some(r=>r.lemma==='집'));
 for(const word of ['베이지','저렴하다','피코트','헤링본','보온성','원픽','컬러풀하다']){const entry=SG.lookup(word).find(r=>r.kind==='dictionary');assert.equal(SG_LEARNING_EXAMPLES[word][2],entry.id);}
});
