import test from 'node:test';
import assert from 'node:assert/strict';
import '../extension/data.js';import '../extension/grammar.js';import '../extension/core.js';
import {prepare,grade} from '../scripts/review-lib.mjs';
test('standard particle allomorphs reject incompatible bases',()=>{
 for(const [surface,lemma] of [['책이','책'],['학교가','학교'],['책은','책'],['학교는','학교'],['책을','책'],['학교를','학교'],['집으로','집'],['학교로','학교'],['물로','물']])assert.ok(SG.lookup(surface).some(r=>r.lemma===lemma),surface);
 for(const surface of ['책가','학교이','책는','학교은','책를','학교을','집로','학교으로','물으로'])assert.equal(SG.lookup(surface).filter(r=>r.kind==='possible particle analysis').length,0,surface);
});
test('grammar attaches only to a matching particle analysis',()=>{
 assert.equal(SG.grammarFor(SG.lookup('책을')[0])[0].id,'object');
 assert.deepEqual(SG.grammarFor(SG.lookup('책')[0]),[]);
 assert.deepEqual(SG.grammarFor(SG.lookup('읽어요')[0]),[]);
 for(const card of SG_GRAMMAR)assert.ok(card.source.startsWith('https://en.wiktionary.org/wiki/-'));
});
const cases=[{id:'one',surface:'책',context:'책을 읽어요.',source:'synthetic test only'},{id:'two',surface:'미지원말',context:'미지원말',source:'synthetic test only'}];
const lookup=x=>x==='책'?[{id:'book',lemma:'책',meaning:'book',parts:[]}]:[];
test('unknown and pending cases never inflate accuracy',()=>{
 const sheet=prepare(cases,lookup);let report=grade(sheet,lookup);
 assert.equal(report.unknownCases,1);assert.equal(report.pendingCases,2);assert.equal(report.correctSupportedPercent,null);assert.equal(report.accuracyTargetMet,false);
 sheet.cases[0].reviewer='test reviewer';sheet.cases[0].judgments[0].verdict='incorrect';
 report=grade(sheet,lookup);assert.equal(report.correctSupportedPercent,0);assert.equal(report.incorrectCandidates,1);
 sheet.cases[0].judgments[0].verdict='correct';report=grade(sheet,lookup);assert.equal(report.correctSupportedPercent,100);assert.equal(report.reviewedCases,1);assert.equal(report.accuracyTargetMet,false);
});
test('stale or dropped candidates invalidate the review sheet',()=>{
 const sheet=prepare(cases,lookup);
 assert.throws(()=>grade(sheet,()=>[]),/changed/);
 sheet.cases[0].judgments=[];assert.throws(()=>grade(sheet,lookup),/every candidate/);
 assert.throws(()=>prepare([cases[0],cases[0]],lookup),/unique/);
});

test('editing a displayed judgment meaning invalidates review',()=>{
 const sheet=prepare(cases,lookup);sheet.cases[0].judgments[0].meaning='altered';
 assert.throws(()=>grade(sheet,lookup),/every candidate/);
});
