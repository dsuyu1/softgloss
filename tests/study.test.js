import test from 'node:test';import assert from 'node:assert/strict';
import '../extension/dictionary-files.js';for(const f of SG_DICTIONARY_FILES)await import('../extension/'+f);await import('../extension/core.js');await import('../extension/mutations.js');
test('graded CSV supports BOM, quoted fields, TSV, duplicate lowest level and rejects bad data',()=>{
 assert.deepEqual(SG.parseStudyCSV('\uFEFFKorean,pos,level\r\n책,"noun, common",2\r\n책,noun,1\r\n읽다,verb,3'),{책:1,읽다:3});assert.deepEqual(SG.parseStudyCSV('word\tlevel\n학교\t2'),{학교:2});
 for(const input of ['Korean,level\n책,7','Korean,level\nbook,1','Korean,level\n책,','Korean,level\n"책,1','Korean,level','책,1'])assert.throws(()=>SG.parseStudyCSV(input));
});
test('study threshold resolves inflected words, excludes higher/ungraded words and prefers exact entries',()=>{
 assert.equal(SG.highlightMatch('읽어요',{}, {읽다:2},1).study,false);assert.equal(SG.highlightMatch('읽어요',{}, {읽다:2},2).study,true);assert.equal(SG.highlightMatch('책',{}, {},6).study,false);
 assert.equal(SG.highlightMatch('앞으로',{앞으로:'known'}).status,'known');assert.equal(SG.highlightMatch('인기글').supported,true);assert.equal(SG.highlightMatch('인기글').status,'unknown');
 assert.ok(SG.lookup('편하려고').some(r=>r.lemma==='편하다'));assert.ok(SG.lookup('응답자의').some(r=>r.lemma==='응답자'));
});
test('study settings preserve highlights and learning data and failed import is atomic',async()=>{
 let value={words:{책:'known'},cards:[]};const storage={async get(defaults){return structuredClone({...defaults,...value});},async set(update){Object.assign(value,structuredClone(update));}};const store=SGStore.createStore(storage);
 await Promise.all([store.apply({type:'setStudyLevel',level:2}),store.apply({type:'setHighlights',enabled:false})]);assert.deepEqual(value.preferences,{highlights:false,studyLevel:2});
 await store.apply({type:'importStudyList',csv:'Korean,level\n책,1',name:'study.csv'});await assert.rejects(store.apply({type:'importStudyList',csv:'Korean,level\n책,8'}));assert.deepEqual(value.studyLevels,{책:1});
 await store.apply({type:'clearStudyList'});assert.deepEqual(value.words,{책:'known'});assert.deepEqual(value.studyLevels,{});await assert.rejects(store.apply({type:'setStudyLevel',level:7}));
});
