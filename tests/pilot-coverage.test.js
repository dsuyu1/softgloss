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
