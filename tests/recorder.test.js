import test from 'node:test';
import assert from 'node:assert/strict';
import '../extension/recorder.js';
function fixture(get){const states=[],revoked=[];let stopped=0,current;
 class Recorder{constructor(){current=this;this.state='inactive';this.mimeType='audio/webm';}start(){this.state='recording';}stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable({data:new Blob(['audio'])});this.onstop();});}}
 const stream={getTracks:()=>[{stop(){stopped++;}}]};const recorder=SGRecorder.create({media:{getUserMedia:get|| (async()=>stream)},Recorder,urls:{createObjectURL:()=> 'blob:local',revokeObjectURL:u=>revoked.push(u)},onState:s=>states.push(s),limit:10000});return {recorder,states,revoked,stream,stopped:()=>stopped,current:()=>current};}
test('recording stops tracks, produces a local replay and revokes it on discard',async()=>{const f=fixture();await f.recorder.start();assert.equal(f.states.at(-1).phase,'recording');f.recorder.stop();await Promise.resolve();assert.equal(f.states.at(-1).url,'blob:local');assert.ok(f.stopped());f.recorder.discard();assert.deepEqual(f.revoked,['blob:local']);});
test('late microphone approval after cancellation stops acquired tracks and never records',async()=>{let resolve;const f=fixture(()=>new Promise(r=>resolve=r));const start=f.recorder.start();f.recorder.discard();resolve(f.stream);await start;assert.equal(f.current(),undefined);assert.equal(f.stopped(),1);assert.equal(f.states.at(-1).phase,'idle');});
test('permission denial leaves practice available without a recording',async()=>{const f=fixture(async()=>{throw Object.assign(Error(),{name:'NotAllowedError'});});await f.recorder.start();assert.equal(f.states.at(-1).phase,'denied');});
test('discard during recording suppresses delayed audio events',async()=>{const f=fixture();await f.recorder.start();f.recorder.discard();await Promise.resolve();assert.equal(f.states.at(-1).phase,'idle');assert.equal(f.states.at(-1).url,'');});
