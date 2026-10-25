import test from 'node:test';import assert from 'node:assert/strict';
import '../extension/dictionary-files.js';for(const f of SG_DICTIONARY_FILES)await import('../extension/'+f);await import('../extension/core.js');await import('../extension/mutations.js');
test('graded CSV supports BOM, quoted fields, TSV, duplicate lowest level and rejects bad data',()=>{
 assert.deepEqual(SG.parseStudyCSV('\uFEFFKorean,pos,level\r\n책,"noun, common",2\r\n책,noun,1\r\n읽다,verb,3'),{책:1,읽다:3});assert.deepEqual(SG.parseStudyCSV('word\tlevel\n학교\t2'),{학교:2});
 for(const input of ['Korean,level\n책,7','Korean,level\nbook,1','Korean,level\n책,','Korean,level\n"책,1','Korean,level','책,1'])assert.throws(()=>SG.parseStudyCSV(input));
});
test('study threshold resolves inflected words, excludes higher/ungraded words and prefers exact entries',()=>{
 assert.equal(SG.highlightMatch('쀍쀍쀍쀍',{}, {쀍쀍쀍쀍:2},1).study,false);assert.equal(SG.highlightMatch('읽어요',{}, {읽다:2},2).study,true);assert.equal(SG.highlightMatch('쀍쀍쀍쀍',{}, {},6).study,false);
 assert.equal(SG.highlightMatch('앞으로',{앞으로:'known'}).status,'known');assert.equal(SG.highlightMatch('인기글').supported,true);assert.equal(SG.highlightMatch('인기글').status,'unknown');
 assert.ok(SG.lookup('편하려고').some(r=>r.lemma==='편하다'));assert.ok(SG.lookup('응답자의').some(r=>r.lemma==='응답자'));
});
test('study settings preserve highlights and learning data and failed import is atomic',async()=>{
 let value={words:{책:'known'},cards:[]};const storage={async get(defaults){return structuredClone({...defaults,...value});},async set(update){Object.assign(value,structuredClone(update));}};const store=SGStore.createStore(storage);
 await Promise.all([store.apply({type:'setStudyLevel',level:2}),store.apply({type:'setHighlights',enabled:false})]);assert.deepEqual(value.preferences,{highlights:false,studyLevel:2});
 await store.apply({type:'importStudyList',csv:'Korean,level\n책,1',name:'study.csv'});await assert.rejects(store.apply({type:'importStudyList',csv:'Korean,level\n책,8'}));assert.deepEqual(value.studyLevels,{책:1});
 await store.apply({type:'clearStudyList'});assert.deepEqual(value.words,{책:'known'});assert.deepEqual(value.studyLevels,{});await assert.rejects(store.apply({type:'setStudyLevel',level:7}));
});

test('official defaults and grammar catalog work without a custom import',()=>{
 assert.ok(Object.keys(SG_STUDY_DEFAULTS).length>9700);assert.equal(SG_STUDY_GRAMMAR.length,336);
 assert.equal(SG.highlightMatch('읽어요',{}, {},1).study,true);
 assert.ok(SG.studyGrammarMatches('먹지 않아요.',1).some(r=>r.id===41));
 assert.ok(SG.studyGrammarMatches('먹고 싶어요.',1).some(r=>r.id===38));
 assert.ok(SG.studyGrammarMatches('책을 읽어요.',1).some(r=>r.id===7));
 assert.ok(!SG.studyGrammarMatches('읽으면',1).some(r=>r.id===58));
 assert.ok(SG.studyGrammarMatches('읽으면',2).some(r=>r.id===58));
 assert.ok(!SG.studyGrammarMatches('읽으면',2).some(r=>r.id===63||r.id===64));
 assert.deepEqual(SG.studyGrammarMatches('가짜동사지 가짜동사않다',6),[]);
});
test('successive custom imports add words without deleting earlier imports or defaults',async()=>{
 let value={};const storage={async get(d){return {...d,...value};},async set(v){Object.assign(value,v);}};const store=SGStore.createStore(storage);
 await store.apply({type:'importStudyList',csv:'Korean,level\n가짜단어,3'});await store.apply({type:'importStudyList',csv:'Korean,level\n다른단어,2'});
 assert.deepEqual(value.studyLevels,{가짜단어:3,다른단어:2});assert.equal(SG.highlightMatch('읽어요',{},value.studyLevels,1).study,true);
 await store.apply({type:'clearStudyList'});assert.equal(SG.highlightMatch('읽어요',{},value.studyLevels,1).study,true);
});
test('sentence components expose particles and past forms without choosing a homonym sense',()=>{
 const parts=SG.sentenceAnalysis('책을 읽었어요.');assert.equal(parts[0].surface,'책을');assert.ok(parts[0].labels.some(l=>l.includes('object')));assert.ok(parts[1].labels.some(l=>l.includes('past')));
 assert.ok(SG.sentenceAnalysis('부르면')[0].labels.includes('verb'));assert.ok(SG.sentenceAnalysis('부르면')[0].labels.includes('adjective'));
 assert.equal(SG.sentenceAnalysis('가짜없는단어')[0].supported,false);assert.deepEqual(SG.sentenceAnalysis('가'.repeat(2001)),[]);
 assert.equal(SG.highlightMatch('읽어요',{}, {},1).level,1);
 assert.ok(SG.lookup('기자협회보').length);assert.equal(SG_LEARNING_EXAMPLES['부르다'][0],'택시를 불러 주세요.');
});

test('original examples attach to specific dictionary entries, including the call verb',()=>{
 for(const [word,example] of Object.entries(SG_LEARNING_EXAMPLES))assert.ok(SG.lookup(word).some(r=>r.id===example[2]),word);
 assert.ok(SG.lookup('부르다').some(r=>r.id===SG_LEARNING_EXAMPLES['부르다'][2]&&r.pos==='verb'));
});

test('dictionary examples retain sense links, bilingual text and attribution',()=>{
 const entries=SG_DATA.entries.filter(r=>SG.examplesFor(r).length);assert.ok(entries.length>2800);
 for(const r of entries)for(const e of SG.examplesFor(r)){assert.ok(e.korean&&e.english);assert.ok(r.senses.some(s=>s.id===e.senseId));assert.equal(e.license,'CC-BY-SA-4.0');assert.match(e.source,/^https:\/\/en.wiktionary.org\/wiki\//);}
});
test('ungraded dictionary words retain unknown grade and compounds paint per component',()=>{
 const match=SG.highlightMatch('어떻게',{}, {},6);assert.ok(match.supported);assert.equal(match.level,null);assert.equal(match.study,false);
 assert.equal(SG.highlightMatch('해결하시는지요',{}, {},6).level,null);
 const parts=SG.highlightSpans('단체관람안내',{}, {},6);assert.deepEqual(parts.map(p=>[p.offset,p.length,p.level]),[[0,2,3],[2,2,3],[4,2,1]]);
 assert.ok(parts.every(p=>p.study));assert.deepEqual(SG.highlightSpans('기아타이거즈의',{}, {},6).map(p=>p.level),[null]);
 assert.equal(SG.highlightSpans('단체관람안내',{}, {},1).filter(p=>p.study).length,1);
 assert.equal(SG.highlightMatch('어떻게',{}, {어떻게:2},2).level,2);
});
test('ungraded highlighting preference preserves target and vocabulary settings',async()=>{
 let value={words:{책:'known'},preferences:{highlights:true,studyLevel:2}};const storage={async get(d){return structuredClone({...d,...value});},async set(v){Object.assign(value,structuredClone(v));}};const store=SGStore.createStore(storage);
 await store.apply({type:'setUngradedHighlights',enabled:false});assert.deepEqual(value.preferences,{highlights:true,studyLevel:2,ungradedHighlights:false});
 await assert.rejects(store.apply({type:'setUngradedHighlights',enabled:'yes'}));assert.equal(value.preferences.ungradedHighlights,false);assert.equal(value.words.책,'known');
});
