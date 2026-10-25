import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
function worker(voices){const spoken=[];const event={addListener(){}};const context=vm.createContext({importScripts(){},SGStore:{createStore:()=>({})},chrome:{storage:{local:{}},action:{onClicked:event},commands:{onCommand:event},runtime:{onMessage:event,onInstalled:event,onStartup:event},permissions:{onRemoved:event},tts:{async getVoices(){return voices;},async speak(text,options){spoken.push({text,options});}}}});vm.runInContext(fs.readFileSync('extension/background.js','utf8'),context);return {speak:context.speak,spoken};}
test('device pronunciation skips remote and unspecified voices and pins the selected engine',async()=>{
 const f=worker([{lang:'ko-KR',voiceName:'Cloud',remote:true},{lang:'ko',voiceName:'Unspecified'},{lang:'en-US',voiceName:'English',remote:false},{lang:'ko-KR',voiceName:'Korean',remote:false,extensionId:'offline-engine'}]);
 const result=await f.speak('학교');assert.ok(result.ok);assert.equal(f.spoken.length,1);assert.equal(f.spoken[0].options.voiceName,'Korean');assert.equal(f.spoken[0].options.extensionId,'offline-engine');
});
test('unavailable or invalid pronunciation never sends text to a remote voice',async()=>{
 const f=worker([{lang:'ko-KR',voiceName:'Cloud',remote:true}]);assert.equal((await f.speak('학교')).ok,false);assert.match((await f.speak('학교')).error,/offline Korean voice/);
 for(const text of ['학교에 가요','hello','',null])assert.equal((await f.speak(text)).ok,false);
 assert.deepEqual(f.spoken,[]);
});
