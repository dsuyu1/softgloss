import test from 'node:test';
import assert from 'node:assert/strict';
import '../extension/vendor/ts-fsrs-5.4.2.js';
import '../extension/srs.js';
import '../extension/lessons.js';
import '../extension/core.js';
import '../extension/mutations.js';
const card={id:'softgloss:책',entryId:'softgloss:책',lemma:'책',meaning:'book',sentence:'책을 읽어요.',url:'https://example.test/'};
function fixture(){let data={};let fail=false;return {store:SGStore.createStore({async get(defaults){return structuredClone({...defaults,...data});},async set(update){if(fail){fail=false;throw Error('Storage full');}data={...data,...structuredClone(update)};}}),read:()=>structuredClone(data),fail:()=>fail=true};}
test('lesson interchange preserves bilingual edits and attribution but assigns a fresh import identity',()=>{
 const source={...card,source:'https://en.wiktionary.org/wiki/책#Korean',license:'CC-BY-SA-4.0'};
 const d=SGLessons.fromCards([source]);d.items[0].english='I read a book.';
 const copy=SGLessons.importFile(JSON.parse(SGLessons.exportFile(d)));
 assert.notEqual(copy.id,d.id);assert.deepEqual(copy.items,d.items);assert.equal(copy.goal,'');
 assert.equal(copy.items[0].card.schedule,undefined);
});
test('malformed imports reject duplicate words, unsafe source URLs, excessive fields and unsupported versions',()=>{
 const d=SGLessons.fromCards([card]);
 for(const bad of [{...d,title:''},{...d,items:[]},{...d,items:Array(21).fill(d.items[0])},{...d,items:[...d.items,...d.items]},{...d,goal:'x'.repeat(1001)},{...d,items:[{...d.items[0],english:42}]},{...d,items:[{...d.items[0],card:{...card,source:'javascript:alert(1)',license:'CC-BY-SA-4.0'}}]}])assert.throws(()=>SGLessons.validate(bad));
 assert.throws(()=>SGLessons.importFile({format:'malnaru-lesson',version:2,draft:d}));
 assert.deepEqual(SGLessons.validate({...d,extra:'ignored'}),d);
});
test('concurrent lesson edits reject stale saves and deletion, and cannot alter review schedules',async()=>{
 const f=fixture(),d=SGLessons.fromCards([card]);await f.store.apply({type:'addReview',card});const deck=f.read().reviewCards;
 const first=await f.store.apply({type:'saveLesson',draft:d,expectedRevision:null});
 const results=await Promise.allSettled(['one','two'].map(title=>f.store.apply({type:'saveLesson',draft:{...d,title},expectedRevision:first.revision})));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 await assert.rejects(f.store.apply({type:'deleteLesson',id:d.id,expectedRevision:first.revision}),/changed/);
 assert.deepEqual(f.read().reviewCards,deck);
 const current=f.read().lessonDrafts[d.id];await f.store.apply({type:'deleteLesson',id:d.id,expectedRevision:current.revision});
 await assert.rejects(f.store.apply({type:'saveLesson',draft:d,expectedRevision:current.revision}),/deleted/);
});
test('v3 backups retain lesson drafts and invalidate open editors on restore; old backups clear lessons',async()=>{
 const f=fixture(),d=SGLessons.fromCards([card]);await f.store.apply({type:'saveLesson',draft:d,expectedRevision:null});
 const before=f.read().lessonDrafts,backup=SG.validateBackup({version:3,words:{},cards:[],reviewCards:{},lessonDrafts:before});
 await f.store.apply({type:'restore',backup});const restored=f.read().lessonDrafts[d.id];assert.deepEqual(restored.items,d.items);assert.notEqual(restored.revision,before[d.id].revision);
 await assert.rejects(f.store.apply({type:'saveLesson',draft:d,expectedRevision:before[d.id].revision}));
 const invalid=structuredClone(backup);invalid.lessonDrafts[d.id].items=[];await assert.rejects(f.store.apply({type:'restore',backup:invalid}));assert.equal(f.read().lessonDrafts[d.id].revision,restored.revision);
 for(const version of [1,2]){await f.store.apply({type:'restore',backup:{version,words:{},cards:[],reviewCards:{}}});assert.deepEqual(f.read().lessonDrafts,{});}
});
test('failed draft saves are retryable and complete deletion removes drafts',async()=>{
 const f=fixture(),d=SGLessons.fromCards([card]);f.fail();await assert.rejects(f.store.apply({type:'saveLesson',draft:d,expectedRevision:null}),/Storage full/);
 assert.equal(f.read().lessonDrafts,undefined);await f.store.apply({type:'saveLesson',draft:d,expectedRevision:null});await f.store.apply({type:'clearLearning'});assert.deepEqual(f.read().lessonDrafts,{});
});
test('lesson collection limits reject new drafts atomically while allowing existing edits',async()=>{
 const f=fixture();for(let i=0;i<50;i++)await f.store.apply({type:'saveLesson',draft:SGLessons.fromCards([card]),expectedRevision:null});
 await assert.rejects(f.store.apply({type:'saveLesson',draft:SGLessons.fromCards([card]),expectedRevision:null}),/full/);
 const d=Object.values(f.read().lessonDrafts)[0];await f.store.apply({type:'saveLesson',draft:{...d,title:'Updated'},expectedRevision:d.revision});assert.equal(Object.keys(f.read().lessonDrafts).length,50);
});
