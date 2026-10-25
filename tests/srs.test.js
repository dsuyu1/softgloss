import test from 'node:test';import assert from 'node:assert/strict';
import '../extension/vendor/ts-fsrs-5.4.2.js';import '../extension/srs.js';import '../extension/core.js';import '../extension/mutations.js';
const now=new Date('2026-10-25T12:00:00.000Z');
const card={id:'softgloss:책',entryId:'softgloss:책',lemma:'책',meaning:'book',sentence:'책을 읽어요.',url:'https://example.test/article'};
function fixture(){let data={};let fail=false;return {store:SGStore.createStore({async get(defaults){return structuredClone({...defaults,...data});},async set(value){if(fail){fail=false;throw Error('Storage full');}Object.assign(data,structuredClone(value));}}),read:()=>structuredClone(data),fail:()=>{fail=true;}};}
test('FSRS gives short learning steps, a long easy interval and persisted memory state',()=>{
 const initial=SGSRS.create(card,now);const outcomes=[1,2,3,4].map(r=>SGSRS.rate(initial,r,0,now));
 assert.equal(Date.parse(outcomes[0].schedule.due)-now,60000);
 assert.equal(Date.parse(outcomes[2].schedule.due)-now,600000);
 assert.ok(Date.parse(outcomes[3].schedule.due)-now>=86400000);
 assert.equal(outcomes[3].schedule.state,2);
 for(const r of outcomes){assert.equal(r.schedule.reps,1);assert.ok(r.schedule.stability>0);assert.equal(r.revision,1);assert.equal(r.history.length,1);assert.deepEqual(SGSRS.validateDeck({[r.id]:r})[r.id],r);}
 let good=outcomes[2];good=SGSRS.rate(good,3,1,new Date(good.schedule.due));assert.equal(good.schedule.state,2);
 const lapse=SGSRS.rate(good,1,2,new Date(good.schedule.due));assert.equal(lapse.schedule.lapses,1);assert.equal(lapse.schedule.state,3);
});
test('queue excludes future and suspended cards; stale or premature ratings do not alter them',()=>{
 const initial=SGSRS.create(card,now),easy=SGSRS.rate(initial,4,0,now);
 assert.deepEqual(SGSRS.due({[easy.id]:easy},now.getTime()),[]);
 assert.throws(()=>SGSRS.rate(easy,3,1,now),/not due/);
 assert.throws(()=>SGSRS.rate(initial,3,9,now),/another tab/);
 assert.throws(()=>SGSRS.rate(initial,0,0,now),/rating/);
 assert.deepEqual(SGSRS.due({x:{...initial,suspended:true}},now.getTime()),[]);
});
test('serialized reviews deduplicate adds and reject simultaneous answers from two tabs',async()=>{
 const f=fixture();await Promise.all([1,2].map(()=>f.store.apply({type:'addReview',card})));
 assert.equal(Object.keys(f.read().reviewCards).length,1);
 const outcomes=await Promise.allSettled([1,2].map(()=>f.store.apply({type:'rateReview',id:card.id,rating:3,revision:0})));
 assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
 const rated=f.read().reviewCards[card.id];assert.equal(rated.schedule.reps,1);
 await f.store.apply({type:'addReview',card});assert.deepEqual(f.read().reviewCards[card.id],rated);
 await f.store.apply({type:'suspendReview',id:card.id,suspended:true});assert.ok(f.read().reviewCards[card.id].suspended);
});
test('review backup round-trip retains schedules, histories and attribution; legacy restore clears deck',async()=>{
 const f=fixture();await f.store.apply({type:'addReview',card:{...card,source:'https://en.wiktionary.org/wiki/책#Korean',license:'CC-BY-SA-4.0'}});
 await f.store.apply({type:'rateReview',id:card.id,rating:4,revision:0});
 const before=f.read();const backup=SG.validateBackup(JSON.parse(JSON.stringify({version:2,words:{책:'seen'},cards:[],reviewCards:before.reviewCards})));
 await f.store.apply({type:'clearLearning'});assert.deepEqual(f.read().reviewCards,{});
 await f.store.apply({type:'restore',backup});assert.deepEqual(f.read().reviewCards,before.reviewCards);
 const malformed=structuredClone(backup);malformed.reviewCards[card.id].schedule.difficulty=-1;
 await assert.rejects(f.store.apply({type:'restore',backup:malformed}),/schedule/);assert.deepEqual(f.read().reviewCards,before.reviewCards);
 await f.store.apply({type:'restore',backup:{version:1,words:{},cards:[]}});assert.deepEqual(f.read().reviewCards,{});
});
test('failed review storage is recoverable and invalid card payloads never enter deck',async()=>{
 const f=fixture();f.fail();await assert.rejects(f.store.apply({type:'addReview',card}),/Storage full/);
 assert.equal(f.read().reviewCards,undefined);await f.store.apply({type:'addReview',card});
 for(const invalid of [{...card,id:'__proto__',entryId:'__proto__'},{...card,url:'javascript:alert(1)'},{...card,source:'https://example.test',license:'CC-BY-SA-4.0'}])await assert.rejects(f.store.apply({type:'addReview',card:invalid}));
 assert.equal(Object.keys(f.read().reviewCards).length,1);
});
test('undo restores the prior schedule and history while invalidating old answer revisions',async()=>{
 const f=fixture();await f.store.apply({type:'addReview',card});const original=f.read().reviewCards[card.id];
 await f.store.apply({type:'rateReview',id:card.id,rating:4,revision:0});const rated=f.read().reviewCards[card.id];
 await f.store.apply({type:'undoReview',id:card.id,revision:rated.revision});const undone=f.read().reviewCards[card.id];
 assert.deepEqual(undone.schedule,original.schedule);assert.deepEqual(undone.history,original.history);assert.equal(undone.revision,2);assert.equal(f.read().reviewUndo,null);
 await assert.rejects(f.store.apply({type:'rateReview',id:card.id,rating:3,revision:0}),/another tab/);
 await assert.rejects(f.store.apply({type:'undoReview',id:card.id,revision:1}),/last rating changed/);
 await f.store.apply({type:'rateReview',id:card.id,rating:4,revision:2});assert.equal(f.read().reviewCards[card.id].schedule.reps,1);
});
test('undo refuses a stale last-card action across tabs and cannot be applied twice',async()=>{
 const f=fixture(),second={...card,id:'softgloss:학교',entryId:'softgloss:학교',lemma:'학교'};
 await f.store.apply({type:'addReview',card});await f.store.apply({type:'addReview',card:second});
 await f.store.apply({type:'rateReview',id:card.id,rating:4,revision:0});await f.store.apply({type:'rateReview',id:second.id,rating:4,revision:0});
 await assert.rejects(f.store.apply({type:'undoReview',id:card.id,revision:1}),/last rating changed/);
 const results=await Promise.allSettled([1,2].map(()=>f.store.apply({type:'undoReview',id:second.id,revision:1})));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(f.read().reviewCards[second.id].schedule.reps,0);assert.equal(f.read().reviewCards[card.id].schedule.reps,1);
});
test('undo is cleared by restore, deletion, suspension and complete data reset',async()=>{
 for(const operation of [{type:'suspendReview',id:card.id,suspended:true},{type:'removeReview',id:card.id},{type:'restore',backup:{version:1,words:{},cards:[]}},{type:'clearLearning'}]){
  const f=fixture();await f.store.apply({type:'addReview',card});await f.store.apply({type:'rateReview',id:card.id,rating:4,revision:0});await f.store.apply(operation);assert.equal(f.read().reviewUndo,null);
 }
});
test('failed undo writes leave the rated schedule intact and allow a later retry',async()=>{
 const f=fixture();await f.store.apply({type:'addReview',card});await f.store.apply({type:'rateReview',id:card.id,rating:4,revision:0});const before=f.read();f.fail();
 await assert.rejects(f.store.apply({type:'undoReview',id:card.id,revision:1}),/Storage full/);assert.deepEqual(f.read(),before);
 await f.store.apply({type:'undoReview',id:card.id,revision:1});assert.equal(f.read().reviewCards[card.id].schedule.reps,0);
});
